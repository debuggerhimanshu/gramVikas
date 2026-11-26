import { eventBus } from '@core/events/event-bus';
import { developmentRepository } from './development.repository';
import { logger } from '@core/utils/logger';

/**
 * Registers domain event subscribers for Project & Development monitoring.
 */
export const registerDevelopmentSubscribers = (): void => {
  eventBus.subscribe('CITIZEN_VERIFICATION_SUBMITTED', async (event) => {
    const { projectId, milestoneId, rating, auditVarianceFlag, observations } = event.payload;
    const panchayatId = event.panchayatId;

    logger.info(
      `[DEV_SUBSCRIBER] Received CITIZEN_VERIFICATION_SUBMITTED for Project [${projectId}] in Panchayat [${panchayatId}]. Rating: ${rating}, Variance: ${auditVarianceFlag}`
    );

    try {
      // 1. If audit variance was flagged, set flag on project to freeze or mandate audit review
      if (auditVarianceFlag) {
        await developmentRepository.setAuditVarianceFlag(projectId, panchayatId, true);

        // If a specific milestone is referenced and defective/fraud suspected, freeze milestone
        if (milestoneId && (rating === 'DEFECTIVE' || rating === 'FRAUD_SUSPECTED')) {
          await developmentRepository.updateMilestoneStatus(milestoneId, 'FROZEN_VARIANCE');
          logger.warn(
            `[DEV_SUBSCRIBER] Milestone [${milestoneId}] on Project [${projectId}] FROZEN due to audit variance: "${observations}"`
          );
        }
      } else if (milestoneId && rating === 'SATISFACTORY') {
        // 2. If verification is satisfactory, mark milestone verified complete
        await developmentRepository.updateMilestoneStatus(milestoneId, 'VERIFIED_COMPLETE');
        logger.info(
          `[DEV_SUBSCRIBER] Milestone [${milestoneId}] marked VERIFIED_COMPLETE via satisfactory citizen audit.`
        );
      }
    } catch (err) {
      logger.error(`[DEV_SUBSCRIBER] Failed to process CITIZEN_VERIFICATION_SUBMITTED for Project [${projectId}]`, {
        error: (err as Error).message,
      });
      throw err;
    }
  });

  logger.info('Registered Development Event Subscribers (CITIZEN_VERIFICATION_SUBMITTED -> Project/Milestone Update)');
};
