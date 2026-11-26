import { eventBus } from '@core/events/event-bus';
import { grievanceRepository } from './grievance.repository';
import { GrievanceCategory } from './grievance.types';
import { calculateSlaDeadline } from './grievance.validator';
import { query } from '@core/database/connection';
import { logger } from '@core/utils/logger';
import crypto from 'crypto';

/**
 * Maps asset categories to appropriate grievance department categories.
 */
const mapAssetCategoryToGrievanceCategory = (assetCategory: string): GrievanceCategory => {
  switch (assetCategory) {
    case 'TUBE_WELL_BOREWELL':
    case 'OVERHEAD_TANK_WATER':
    case 'WATER_PURIFICATION_RO':
    case 'WATER_PIPELINE':
      return 'DRINKING_WATER';
    case 'TRANSFORMER_POWER':
    case 'STREETLIGHT':
      return 'STREETLIGHT_ELECTRIC';
    case 'ROAD_SEGMENT':
    case 'VILLAGE_ROAD':
    case 'DRAINAGE_CHANNEL':
      return 'ROADS_DRAINAGE';
    case 'COMMUNITY_TOILET':
      return 'SANITATION_WASTE';
    case 'ANGNWADI_CENTRE':
    case 'PANCHAYAT_BHAWAN':
      return 'PUBLIC_HEALTH';
    default:
      return 'OTHER';
  }
};

/**
 * Initializes cross-module event listener for ASSET_DAMAGED events.
 */
export const registerGrievanceSubscribers = (): void => {
  eventBus.subscribe('ASSET_DAMAGED', async (event) => {
    const { assetId, assetUid, assetCategory, wardId, reportedByUserId, description, geoCoordinates } =
      event.payload;
    const panchayatId = event.panchayatId;

    logger.info(`[GRIEVANCE_SUBSCRIBER] Ingesting ASSET_DAMAGED for ${assetUid} in Panchayat ${panchayatId}`);

    try {
      const category = mapAssetCategoryToGrievanceCategory(assetCategory);
      const priority = 'HIGH'; // Asset breakdowns are automatically HIGH priority
      const slaDeadline = calculateSlaDeadline(priority, category);

      const date = new Date();
      const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
      const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
      const ticketNumber = `TKT-${yearMonth}-AST-${randomHex}`;

      const title = `Automated Asset Repair: ${assetUid} (${assetCategory})`;
      const fullDescription = `Automated fault ticket created for asset ${assetUid}.\n\nFault Description: ${description}\nReported by User: ${reportedByUserId}`;

      const ticket = await grievanceRepository.createTicket(
        ticketNumber,
        {
          wardId,
          category,
          title,
          description: fullDescription,
          geoLatitude: geoCoordinates.latitude,
          geoLongitude: geoCoordinates.longitude,
          priority,
          isAssisted: false,
          complainantUserId: reportedByUserId,
        },
        slaDeadline,
        panchayatId
      );

      // Record timeline audit
      await grievanceRepository.createStatusHistory(
        ticket.id,
        'SUBMITTED',
        'SUBMITTED',
        reportedByUserId || 'system-event-bus',
        `Auto-generated grievance ticket lodged from infrastructure asset fault breakdown (${assetUid}).`
      );

      // Link newly created ticket to the latest open maintenance event for this asset
      await query(
        `
        UPDATE asset_maintenance_events
        SET dispatched_grievance_id = $1
        WHERE asset_id = $2 AND status = 'OPEN' AND dispatched_grievance_id IS NULL;
        `,
        [ticket.id, assetId]
      );

      logger.info(
        `[GRIEVANCE_SUBSCRIBER] Successfully generated Grievance Ticket [${ticket.ticket_number}] for Asset [${assetUid}]`
      );
    } catch (err) {
      logger.error(`[GRIEVANCE_SUBSCRIBER] Failed to spawn grievance ticket for damaged asset [${assetUid}]`, {
        error: (err as Error).message,
        stack: (err as Error).stack,
      });
      throw err;
    }
  });

  logger.info("Registered Grievance Event Subscribers (ASSET_DAMAGED -> Grievance Ticket)");
};
