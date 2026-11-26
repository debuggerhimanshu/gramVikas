import crypto from 'crypto';
import {
  developmentRepository,
  DevelopmentRepository,
} from './development.repository';
import {
  CreateProjectDto,
  CreateMilestoneDto,
  CreateVoucherDto,
  ProjectFilterQuery,
  DevelopmentProjectEntity,
  ProjectMilestoneEntity,
  ExpenditureVoucherEntity,
  ExpenditureSummaryResponse,
} from './development.types';
import { RequestContextManager } from '@core/context/request-context';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '@core/errors/app-error';
import { logger } from '@core/utils/logger';

export class DevelopmentService {
  constructor(private repo: DevelopmentRepository = developmentRepository) {}

  /**
   * Generate unique project code: PRJ-YYYY-XXXX
   */
  private generateProjectCode(): string {
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `PRJ-${year}-${randomHex}`;
  }

  /**
   * Generate unique voucher number: VCH-YYYYMM-XXXX
   */
  private generateVoucherNumber(): string {
    const date = new Date();
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `VCH-${yearMonth}-${randomHex}`;
  }

  /**
   * Sanction a new civil development work project.
   */
  async createProject(dto: CreateProjectDto): Promise<DevelopmentProjectEntity> {
    const panchayatId = RequestContextManager.getPanchayatId();
    const projectCode = this.generateProjectCode();

    const project = await this.repo.createProject(projectCode, dto, panchayatId);
    logger.info(`Sanctioned development project [${project.project_code}] - "${project.title}" (Budget: Rs. ${project.sanctioned_budget})`);
    return project;
  }

  /**
   * Get project details along with its milestone progression and expenditure vouchers.
   */
  async getProjectById(id: string): Promise<{
    project: DevelopmentProjectEntity;
    milestones: ProjectMilestoneEntity[];
    vouchers: ExpenditureVoucherEntity[];
  }> {
    const panchayatId = RequestContextManager.getPanchayatId();

    const project = await this.repo.findProjectById(id, panchayatId);
    if (!project) {
      throw new NotFoundError(`Development project with ID '${id}' not found in this Panchayat.`);
    }

    const milestones = await this.repo.findMilestonesByProjectId(id);
    const vouchers = await this.repo.findVouchersByProjectId(id);

    return { project, milestones, vouchers };
  }

  /**
   * List development projects with status/funding filters.
   */
  async listProjects(
    filter: ProjectFilterQuery
  ): Promise<{ projects: DevelopmentProjectEntity[]; total: number; page: number; limit: number }> {
    const panchayatId = RequestContextManager.getPanchayatId();
    const { projects, total } = await this.repo.listProjects(filter, panchayatId);

    return {
      projects,
      total,
      page: filter.page || 1,
      limit: filter.limit || 20,
    };
  }

  /**
   * Add a milestone checkpoint to a sanctioned project.
   */
  async addMilestone(projectId: string, dto: CreateMilestoneDto): Promise<ProjectMilestoneEntity> {
    const panchayatId = RequestContextManager.getPanchayatId();

    const project = await this.repo.findProjectById(projectId, panchayatId);
    if (!project) {
      throw new NotFoundError(`Development project with ID '${projectId}' not found.`);
    }

    const milestone = await this.repo.createMilestone(projectId, dto);
    logger.info(`Added milestone [Seq ${milestone.sequence_number}] to Project [${project.project_code}]`);
    return milestone;
  }

  /**
   * Record a dual-signatory expenditure voucher.
   * Enforces ledger balance: currentDisbursed + voucher.amount <= sanctioned_budget.
   */
  async recordVoucher(projectId: string, dto: CreateVoucherDto): Promise<ExpenditureVoucherEntity> {
    const panchayatId = RequestContextManager.getPanchayatId();
    const actor = RequestContextManager.getUser();

    if (!actor) {
      throw new ForbiddenError('Authentication required to record expenditure vouchers.');
    }

    const project = await this.repo.findProjectById(projectId, panchayatId);
    if (!project) {
      throw new NotFoundError(`Development project with ID '${projectId}' not found in this Panchayat.`);
    }

    // Ledger check: total disbursed + new voucher amount must not exceed sanctioned budget
    const currentDisbursed = await this.repo.getTotalDisbursedAmount(projectId);
    const newTotal = currentDisbursed + dto.amount;

    if (newTotal > Number(project.sanctioned_budget)) {
      throw new BadRequestError(
        `Disbursement exceeds budget! Current disbursed: Rs. ${currentDisbursed}, New voucher: Rs. ${dto.amount}. Total would be Rs. ${newTotal}, which exceeds sanctioned budget of Rs. ${project.sanctioned_budget}.`
      );
    }

    // Dual-signatory check: Sachiv acts as authorizer, Sarpanch must be co-signatory
    if (!dto.coSignedBySarpanchId) {
      throw new BadRequestError('Mandatory dual-signatory requirement: coSignedBySarpanchId is required.');
    }

    const voucherNumber = dto.voucherNumber || this.generateVoucherNumber();
    const voucher = await this.repo.createVoucher(
      projectId,
      panchayatId,
      voucherNumber,
      dto,
      actor.id
    );

    // If milestone linked, update milestone state to VERIFIED_COMPLETE
    if (dto.milestoneId) {
      await this.repo.updateMilestoneStatus(dto.milestoneId, 'VERIFIED_COMPLETE');
    }

    logger.info(
      `Recorded Voucher [${voucher.voucher_number}] of Rs. ${voucher.amount} for Project [${project.project_code}]. (Total disbursed: Rs. ${newTotal}/${project.sanctioned_budget})`
    );

    return voucher;
  }

  /**
   * Get Panchayat expenditure summary for the public transparency wall.
   */
  async getExpenditureSummary(): Promise<ExpenditureSummaryResponse> {
    const panchayatId = RequestContextManager.getPanchayatId();
    return this.repo.getExpenditureSummary(panchayatId);
  }
}

export const developmentService = new DevelopmentService();
