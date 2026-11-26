import { query } from '@core/database/connection';
import { RequestContextManager } from '@core/context/request-context';
import {
  GrievanceTicketEntity,
  GrievanceStatusHistoryEntity,
  CreateGrievanceDto,
  GrievanceFilterQuery,
  GrievanceStatus,
} from './grievance.types';

export class GrievanceRepository {
  /**
   * Insert a new grievance ticket scoped to the active panchayat.
   */
  async createTicket(
    ticketNumber: string,
    dto: CreateGrievanceDto,
    slaDeadline: Date,
    panchayatId: string
  ): Promise<GrievanceTicketEntity> {
    const text = `
      INSERT INTO grievance_tickets (
        ticket_number, panchayat_id, ward_id, complainant_user_id,
        is_assisted, proxy_operator_id, category, sub_category,
        title, description, geo_latitude, geo_longitude, priority,
        status, sla_deadline
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'SUBMITTED', $14)
      RETURNING *;
    `;
    const values = [
      ticketNumber,
      panchayatId,
      dto.wardId,
      dto.complainantUserId || null,
      dto.isAssisted || false,
      dto.proxyOperatorId || null,
      dto.category,
      dto.subCategory || null,
      dto.title,
      dto.description,
      dto.geoLatitude || null,
      dto.geoLongitude || null,
      dto.priority || 'MEDIUM',
      slaDeadline,
    ];

    const res = await query<GrievanceTicketEntity>(text, values);
    return res.rows[0];
  }

  /**
   * Find a grievance ticket by its ID within the active tenant.
   */
  async findTicketById(id: string, panchayatId: string): Promise<GrievanceTicketEntity | null> {
    const text = `
      SELECT 
        g.*,
        u.full_name as complainant_name,
        u.mobile_number as complainant_mobile,
        w.ward_name,
        staff.full_name as assigned_to_name
      FROM grievance_tickets g
      LEFT JOIN users u ON g.complainant_user_id = u.id
      LEFT JOIN wards w ON g.ward_id = w.id
      LEFT JOIN users staff ON g.assigned_to_user_id = staff.id
      WHERE g.id = $1 AND g.panchayat_id = $2;
    `;
    const res = await query<GrievanceTicketEntity>(text, [id, panchayatId]);
    return res.rows[0] || null;
  }

  /**
   * Find a grievance ticket by its human-readable ticket number.
   */
  async findTicketByNumber(ticketNumber: string, panchayatId: string): Promise<GrievanceTicketEntity | null> {
    const text = `
      SELECT g.*, u.full_name as complainant_name, u.mobile_number as complainant_mobile
      FROM grievance_tickets g
      LEFT JOIN users u ON g.complainant_user_id = u.id
      WHERE g.ticket_number = $1 AND g.panchayat_id = $2;
    `;
    const res = await query<GrievanceTicketEntity>(text, [ticketNumber, panchayatId]);
    return res.rows[0] || null;
  }

  /**
   * List grievance tickets with pagination and filtering.
   */
  async listTickets(
    filter: GrievanceFilterQuery,
    panchayatId: string
  ): Promise<{ tickets: GrievanceTicketEntity[]; total: number }> {
    const conditions: string[] = ['g.panchayat_id = $1'];
    const values: any[] = [panchayatId];
    let idx = 2;

    if (filter.status) {
      conditions.push(`g.status = $${idx++}`);
      values.push(filter.status);
    }
    if (filter.category) {
      conditions.push(`g.category = $${idx++}`);
      values.push(filter.category);
    }
    if (filter.wardId) {
      conditions.push(`g.ward_id = $${idx++}`);
      values.push(filter.wardId);
    }
    if (filter.priority) {
      conditions.push(`g.priority = $${idx++}`);
      values.push(filter.priority);
    }
    if (filter.complainantUserId) {
      conditions.push(`g.complainant_user_id = $${idx++}`);
      values.push(filter.complainantUserId);
    }

    const whereClause = conditions.join(' AND ');

    // Count total query
    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM grievance_tickets g WHERE ${whereClause};`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    // Paginated fetch
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const offset = (page - 1) * limit;

    const dataText = `
      SELECT 
        g.*,
        u.full_name as complainant_name,
        u.mobile_number as complainant_mobile,
        w.ward_name,
        staff.full_name as assigned_to_name
      FROM grievance_tickets g
      LEFT JOIN users u ON g.complainant_user_id = u.id
      LEFT JOIN wards w ON g.ward_id = w.id
      LEFT JOIN users staff ON g.assigned_to_user_id = staff.id
      WHERE ${whereClause}
      ORDER BY g.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    values.push(limit, offset);

    const dataRes = await query<GrievanceTicketEntity>(dataText, values);
    return { tickets: dataRes.rows, total };
  }

  /**
   * Update grievance ticket status and optional fields.
   */
  async updateTicketStatus(
    id: string,
    panchayatId: string,
    status: GrievanceStatus,
    fields: {
      assignedToUserId?: string;
      resolutionSummary?: string;
      resolutionPhotoUrl?: string;
      citizenClosureRating?: number;
    }
  ): Promise<GrievanceTicketEntity | null> {
    const isResolved = status === 'RESOLVED';
    const isVerified = status === 'CITIZEN_VERIFIED';

    const text = `
      UPDATE grievance_tickets
      SET 
        status = $1,
        assigned_to_user_id = COALESCE($2, assigned_to_user_id),
        resolution_summary = COALESCE($3, resolution_summary),
        resolution_photo_url = COALESCE($4, resolution_photo_url),
        resolved_at = CASE WHEN $5 THEN CURRENT_TIMESTAMP ELSE resolved_at END,
        citizen_closure_rating = COALESCE($6, citizen_closure_rating),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND panchayat_id = $8
      RETURNING *;
    `;
    const values = [
      status,
      fields.assignedToUserId || null,
      fields.resolutionSummary || null,
      fields.resolutionPhotoUrl || null,
      isResolved || isVerified,
      fields.citizenClosureRating || null,
      id,
      panchayatId,
    ];

    const res = await query<GrievanceTicketEntity>(text, values);
    return res.rows[0] || null;
  }

  /**
   * Create an audit timeline record for status transitions.
   */
  async createStatusHistory(
    grievanceId: string,
    fromStatus: GrievanceStatus,
    toStatus: GrievanceStatus,
    transitionedByUserId: string,
    notes?: string
  ): Promise<GrievanceStatusHistoryEntity> {
    const text = `
      INSERT INTO grievance_status_history (
        grievance_id, from_status, to_status, transitioned_by_user_id, notes
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const res = await query<GrievanceStatusHistoryEntity>(text, [
      grievanceId,
      fromStatus,
      toStatus,
      transitionedByUserId,
      notes || null,
    ]);
    return res.rows[0];
  }

  /**
   * Retrieve the complete audit timeline for a grievance.
   */
  async getTicketHistory(grievanceId: string): Promise<GrievanceStatusHistoryEntity[]> {
    const text = `
      SELECT h.*, u.full_name as transitioned_by_name
      FROM grievance_status_history h
      LEFT JOIN users u ON h.transitioned_by_user_id = u.id
      WHERE h.grievance_id = $1
      ORDER BY h.created_at ASC;
    `;
    const res = await query<GrievanceStatusHistoryEntity>(text, [grievanceId]);
    return res.rows;
  }
}

export const grievanceRepository = new GrievanceRepository();
