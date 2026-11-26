import crypto from 'crypto';
import { grievanceRepository, GrievanceRepository } from './grievance.repository';
import {
  CreateGrievanceDto,
  UpdateGrievanceStatusDto,
  VerifyGrievanceDto,
  GrievanceFilterQuery,
  GrievanceTicketEntity,
  GrievanceStatusHistoryEntity,
  GrievanceStatus,
} from './grievance.types';
import { calculateSlaDeadline } from './grievance.validator';
import { RequestContextManager, RequestUser } from '@core/context/request-context';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '@core/errors/app-error';
import { logger } from '@core/utils/logger';

export class GrievanceService {
  constructor(private repo: GrievanceRepository = grievanceRepository) {}

  /**
   * Generate human-readable ticket number: TKT-YYYYMM-XXXX
   */
  private generateTicketNumber(): string {
    const date = new Date();
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `TKT-${yearMonth}-${randomHex}`;
  }

  /**
   * Applies privacy masking to complainant PII for unauthorized viewers.
   */
  private maskComplainantData(
    ticket: GrievanceTicketEntity,
    viewer?: RequestUser
  ): GrievanceTicketEntity {
    // If user is admin, secretary, sarpanch, or the complainant themselves, do not mask
    if (
      viewer &&
      (viewer.role === 'SYSTEM_ADMIN' ||
        viewer.role === 'BLOCK_OFFICER' ||
        viewer.role === 'PANCHAYAT_SECRETARY' ||
        viewer.role === 'SARPANCH' ||
        (viewer.role === 'WARD_MEMBER' && viewer.wardId === ticket.ward_id) ||
        viewer.id === ticket.complainant_user_id)
    ) {
      return ticket;
    }

    // Mask for other citizens or public viewers
    return {
      ...ticket,
      complainant_name: ticket.complainant_name ? 'Village Resident' : null,
      complainant_mobile: ticket.complainant_mobile
        ? ticket.complainant_mobile.replace(/(\d{3})\d{4}(\d{3})/, '$1-XXXX-$2')
        : null,
    };
  }

  /**
   * Submit a new grievance ticket.
   */
  async createGrievance(dto: CreateGrievanceDto): Promise<GrievanceTicketEntity> {
    const panchayatId = RequestContextManager.getPanchayatId();
    const user = RequestContextManager.getUser();

    // If complainantUserId not explicitly provided, use the authenticated user
    const complainantUserId = dto.complainantUserId || (dto.isAssisted ? undefined : user?.id);
    const proxyOperatorId = dto.isAssisted ? (dto.proxyOperatorId || user?.id) : undefined;

    const ticketNumber = this.generateTicketNumber();
    const slaDeadline = calculateSlaDeadline(dto.priority, dto.category);

    const ticket = await this.repo.createTicket(
      ticketNumber,
      {
        ...dto,
        complainantUserId,
        proxyOperatorId,
      },
      slaDeadline,
      panchayatId
    );

    // Initial audit history
    await this.repo.createStatusHistory(
      ticket.id,
      'SUBMITTED',
      'SUBMITTED',
      user?.id || ticket.complainant_user_id || 'system-init',
      'Grievance ticket created and lodged into queue.'
    );

    logger.info(`Created Grievance ticket [${ticket.ticket_number}] for Panchayat [${panchayatId}]`);
    return ticket;
  }

  /**
   * Get grievance by ID with timeline and privacy masking.
   */
  async getGrievanceById(
    id: string
  ): Promise<{ ticket: GrievanceTicketEntity; timeline: GrievanceStatusHistoryEntity[] }> {
    const panchayatId = RequestContextManager.getPanchayatId();
    const viewer = RequestContextManager.getUser();

    const ticket = await this.repo.findTicketById(id, panchayatId);
    if (!ticket) {
      throw new NotFoundError(`Grievance ticket with ID '${id}' not found in this Panchayat.`);
    }

    const timeline = await this.repo.getTicketHistory(id);
    return {
      ticket: this.maskComplainantData(ticket, viewer),
      timeline,
    };
  }

  /**
   * List grievances with role-based visibility and privacy masking.
   */
  async listGrievances(
    filter: GrievanceFilterQuery
  ): Promise<{ tickets: GrievanceTicketEntity[]; total: number; page: number; limit: number }> {
    const panchayatId = RequestContextManager.getPanchayatId();
    const viewer = RequestContextManager.getUser();

    // If viewer is citizen, restrict default list to own submissions unless explicitly searching
    const effectiveFilter: GrievanceFilterQuery = { ...filter };
    if (viewer && viewer.role === 'CITIZEN' && !filter.complainantUserId) {
      effectiveFilter.complainantUserId = viewer.id;
    }

    // If viewer is ward member without explicit ward filter, scope to their ward
    if (viewer && viewer.role === 'WARD_MEMBER' && viewer.wardId && !filter.wardId) {
      effectiveFilter.wardId = viewer.wardId;
    }

    const { tickets, total } = await this.repo.listTickets(effectiveFilter, panchayatId);

    const masked = tickets.map((t) => this.maskComplainantData(t, viewer));
    return {
      tickets: masked,
      total,
      page: filter.page || 1,
      limit: filter.limit || 20,
    };
  }

  /**
   * Validate and transition grievance status.
   */
  async updateStatus(id: string, dto: UpdateGrievanceStatusDto): Promise<GrievanceTicketEntity> {
    const panchayatId = RequestContextManager.getPanchayatId();
    const actor = RequestContextManager.getUser();

    if (!actor) {
      throw new ForbiddenError('Authentication required to modify grievance status.');
    }

    const ticket = await this.repo.findTicketById(id, panchayatId);
    if (!ticket) {
      throw new NotFoundError(`Grievance ticket with ID '${id}' not found.`);
    }

    const currentStatus = ticket.status;
    const targetStatus = dto.status;

    // State machine validation
    this.validateStateTransition(currentStatus, targetStatus, actor);

    // If resolving, require resolution summary
    if (targetStatus === 'RESOLVED' && !dto.resolutionSummary) {
      throw new BadRequestError("A resolution summary is required when marking a ticket as 'RESOLVED'.");
    }

    const updated = await this.repo.updateTicketStatus(id, panchayatId, targetStatus, {
      assignedToUserId: dto.assignedToUserId,
      resolutionSummary: dto.resolutionSummary,
      resolutionPhotoUrl: dto.resolutionPhotoUrl,
    });

    if (!updated) {
      throw new NotFoundError(`Failed to update grievance ticket '${id}'.`);
    }

    // Insert history record
    await this.repo.createStatusHistory(
      id,
      currentStatus,
      targetStatus,
      actor.id,
      dto.notes || `Status transitioned from ${currentStatus} to ${targetStatus}`
    );

    logger.info(`Grievance [${ticket.ticket_number}] status updated: ${currentStatus} -> ${targetStatus}`);
    return updated;
  }

  /**
   * Citizen verification: Accept or Reopen a resolved grievance.
   */
  async verifyGrievance(id: string, dto: VerifyGrievanceDto): Promise<GrievanceTicketEntity> {
    const panchayatId = RequestContextManager.getPanchayatId();
    const actor = RequestContextManager.getUser();

    const ticket = await this.repo.findTicketById(id, panchayatId);
    if (!ticket) {
      throw new NotFoundError(`Grievance ticket with ID '${id}' not found.`);
    }

    if (ticket.status !== 'RESOLVED') {
      throw new BadRequestError(
        `Cannot verify ticket in status '${ticket.status}'. Ticket must be 'RESOLVED' first.`
      );
    }

    // Only complainant, assisted operator, or admin can verify
    const isOwner = actor && actor.id === ticket.complainant_user_id;
    const isOperator = actor && actor.role === 'ASSISTED_OPERATOR';
    const isAdmin = actor && (actor.role === 'SYSTEM_ADMIN' || actor.role === 'PANCHAYAT_SECRETARY');

    if (!isOwner && !isOperator && !isAdmin) {
      throw new ForbiddenError('Only the original complainant or assisted operator can verify resolution.');
    }

    const newStatus: GrievanceStatus = dto.decision === 'ACCEPT' ? 'CITIZEN_VERIFIED' : 'REOPENED';

    const updated = await this.repo.updateTicketStatus(id, panchayatId, newStatus, {
      citizenClosureRating: dto.decision === 'ACCEPT' ? dto.rating : undefined,
    });

    if (!updated) {
      throw new NotFoundError(`Failed to update verification for ticket '${id}'.`);
    }

    const note =
      dto.decision === 'ACCEPT'
        ? `Citizen verified and closed ticket with rating ${dto.rating || 5}/5.`
        : `Citizen rejected resolution and reopened ticket: ${dto.rejectionReason}`;

    await this.repo.createStatusHistory(id, 'RESOLVED', newStatus, actor?.id || 'citizen-actor', note);

    logger.info(`Grievance [${ticket.ticket_number}] verification complete: ${newStatus}`);
    return updated;
  }

  /**
   * Strict state machine validation rules.
   */
  private validateStateTransition(
    current: GrievanceStatus,
    target: GrievanceStatus,
    actor: RequestUser
  ): void {
    if (current === target) {
      return;
    }

    // Closed tickets cannot be altered unless reopened via verify
    if (current === 'CITIZEN_VERIFIED') {
      throw new BadRequestError('Cannot modify ticket that is already closed and verified by citizen.');
    }

    const allowedTransitions: Record<GrievanceStatus, GrievanceStatus[]> = {
      SUBMITTED: ['TRIAGED', 'ASSIGNED'],
      TRIAGED: ['ASSIGNED', 'IN_PROGRESS'],
      ASSIGNED: ['IN_PROGRESS'],
      IN_PROGRESS: ['RESOLVED'],
      RESOLVED: ['CITIZEN_VERIFIED', 'REOPENED'],
      REOPENED: ['TRIAGED', 'ASSIGNED', 'IN_PROGRESS'],
      CITIZEN_VERIFIED: [],
    };

    const validTargets = allowedTransitions[current] || [];
    if (!validTargets.includes(target)) {
      throw new BadRequestError(
        `Invalid status transition from '${current}' to '${target}'. Allowed transitions: [${validTargets.join(', ')}]`
      );
    }
  }
}

export const grievanceService = new GrievanceService();
