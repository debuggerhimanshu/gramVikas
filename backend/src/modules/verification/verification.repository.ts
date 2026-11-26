import { query } from '@core/database/connection';
import {
  DevelopmentVerificationEntity,
  SubmitVerificationDto,
  VerificationFilterQuery,
} from './verification.types';

export class VerificationRepository {
  /**
   * Insert a new on-ground project verification record.
   */
  async createVerification(
    dto: SubmitVerificationDto,
    panchayatId: string,
    verifiedByUserId: string,
    auditVarianceFlag: boolean
  ): Promise<DevelopmentVerificationEntity> {
    const text = `
      INSERT INTO development_verifications (
        project_id, milestone_id, panchayat_id, verified_by_user_id,
        verification_source, geo_latitude, geo_longitude,
        distance_from_project_meters, photo_urls, observations,
        rating, audit_variance_flag, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'SUBMITTED')
      RETURNING *;
    `;
    const values = [
      dto.projectId,
      dto.milestoneId || null,
      panchayatId,
      verifiedByUserId,
      dto.verificationSource || 'CITIZEN_SOCIAL_AUDIT',
      dto.geoLatitude,
      dto.geoLongitude,
      dto.distanceFromProjectMeters || 0,
      JSON.stringify(dto.photoUrls),
      dto.observations,
      dto.rating,
      auditVarianceFlag,
    ];

    const res = await query<DevelopmentVerificationEntity>(text, values);
    return res.rows[0];
  }

  /**
   * Find a verification record by ID.
   */
  async findVerificationById(
    id: string,
    panchayatId: string
  ): Promise<DevelopmentVerificationEntity | null> {
    const text = `
      SELECT v.*, u.full_name as verified_by_name
      FROM development_verifications v
      LEFT JOIN users u ON v.verified_by_user_id = u.id
      WHERE v.id = $1 AND v.panchayat_id = $2;
    `;
    const res = await query<DevelopmentVerificationEntity>(text, [id, panchayatId]);
    return res.rows[0] || null;
  }

  /**
   * List all verifications submitted for a specific development project.
   */
  async listVerificationsByProject(
    projectId: string,
    panchayatId: string,
    filter: VerificationFilterQuery
  ): Promise<{ verifications: DevelopmentVerificationEntity[]; total: number }> {
    const conditions: string[] = ['v.project_id = $1', 'v.panchayat_id = $2'];
    const values: any[] = [projectId, panchayatId];
    let idx = 3;

    if (filter.varianceOnly) {
      conditions.push('v.audit_variance_flag = TRUE');
    }

    const whereClause = conditions.join(' AND ');

    // Total count
    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM development_verifications v WHERE ${whereClause};`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const offset = (page - 1) * limit;

    const dataText = `
      SELECT v.*, u.full_name as verified_by_name
      FROM development_verifications v
      LEFT JOIN users u ON v.verified_by_user_id = u.id
      WHERE ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    values.push(limit, offset);

    const dataRes = await query<DevelopmentVerificationEntity>(dataText, values);
    return { verifications: dataRes.rows, total };
  }
}

export const verificationRepository = new VerificationRepository();
