import {
  verificationRepository,
  VerificationRepository,
} from './verification.repository';
import {
  SubmitVerificationDto,
  VerificationFilterQuery,
  DevelopmentVerificationEntity,
} from './verification.types';
import { developmentRepository } from '../development/development.repository';
import { RequestContextManager } from '@core/context/request-context';
import { eventBus } from '@core/events/event-bus';
import { NotFoundError, ForbiddenError } from '@core/errors/app-error';
import { logger } from '@core/utils/logger';

export class VerificationService {
  constructor(
    private repo: VerificationRepository = verificationRepository,
    private devRepo = developmentRepository
  ) {}

  /**
   * Submit on-ground verification with photo evidence and compute variance flags.
   */
  async submitVerification(dto: SubmitVerificationDto): Promise<DevelopmentVerificationEntity> {
    const panchayatId = RequestContextManager.getPanchayatId();
    const actor = RequestContextManager.getUser();

    if (!actor) {
      throw new ForbiddenError('Authentication required to submit project verification.');
    }

    const project = await this.devRepo.findProjectById(dto.projectId, panchayatId);
    if (!project) {
      throw new NotFoundError(`Development project with ID '${dto.projectId}' not found in this Panchayat.`);
    }

    // Physical-vs-financial variance computation
    let auditVarianceFlag = false;

    // Direct defect or fraud report
    if (dto.rating === 'DEFECTIVE' || dto.rating === 'FRAUD_SUSPECTED') {
      auditVarianceFlag = true;
    } else {
      // Check financial disbursements vs physical progress
      const totalDisbursed = await this.devRepo.getTotalDisbursedAmount(dto.projectId);
      const budget = Number(project.sanctioned_budget);
      const disbursementRatio = budget > 0 ? totalDisbursed / budget : 0;

      // If funds disbursed > 75% but citizen inspection reports work as incomplete
      if (disbursementRatio >= 0.75 && dto.rating === 'INCOMPLETE') {
        auditVarianceFlag = true;
        logger.warn(
          `[VARIANCE_ALERT] Financial-vs-Physical variance detected on Project [${project.project_code}]: Funds disbursed at ${(disbursementRatio * 100).toFixed(1)}% but field audit reported as INCOMPLETE.`
        );
      }
    }

    // Insert verification record
    const verification = await this.repo.createVerification(
      dto,
      panchayatId,
      actor.id,
      auditVarianceFlag
    );

    logger.info(
      `Recorded Verification [${verification.id}] for Project [${project.project_code}] - Rating: ${dto.rating}, Variance Flag: ${auditVarianceFlag}`
    );

    // Publish CITIZEN_VERIFICATION_SUBMITTED domain event for downstream updates
    await eventBus.publish('CITIZEN_VERIFICATION_SUBMITTED', panchayatId, {
      verificationId: verification.id,
      projectId: verification.project_id,
      milestoneId: verification.milestone_id || undefined,
      verifiedByUserId: actor.id,
      rating: verification.rating,
      auditVarianceFlag,
      photoUrls: dto.photoUrls,
      observations: dto.observations,
    });

    return verification;
  }

  /**
   * List all verifications for a project.
   */
  async listVerificationsByProject(
    projectId: string,
    filter: VerificationFilterQuery
  ): Promise<{ verifications: DevelopmentVerificationEntity[]; total: number; page: number; limit: number }> {
    const panchayatId = RequestContextManager.getPanchayatId();

    const project = await this.devRepo.findProjectById(projectId, panchayatId);
    if (!project) {
      throw new NotFoundError(`Development project with ID '${projectId}' not found.`);
    }

    const { verifications, total } = await this.repo.listVerificationsByProject(
      projectId,
      panchayatId,
      filter
    );

    return {
      verifications,
      total,
      page: filter.page || 1,
      limit: filter.limit || 20,
    };
  }
}

export const verificationService = new VerificationService();
