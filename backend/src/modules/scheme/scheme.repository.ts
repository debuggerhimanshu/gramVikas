import { query } from '@core/database/connection';
import {
  SchemeEntity,
  SchemeApplicationEntity,
  SchemeCategory,
  SchemeApplicationStatus,
} from './scheme.types';

export class SchemeRepository {
  async findAllSchemes(filter?: { category?: SchemeCategory; isActive?: boolean }): Promise<SchemeEntity[]> {
    let text = 'SELECT * FROM schemes WHERE 1=1';
    const params: any[] = [];

    if (filter?.isActive !== undefined) {
      params.push(filter.isActive);
      text += ` AND is_active = $${params.length}`;
    } else {
      text += ' AND is_active = TRUE';
    }

    if (filter?.category) {
      params.push(filter.category);
      text += ` AND category = $${params.length}`;
    }

    text += ' ORDER BY title ASC;';
    const res = await query<SchemeEntity>(text, params);
    return res.rows;
  }

  async findSchemeById(id: string): Promise<SchemeEntity | null> {
    const res = await query<SchemeEntity>('SELECT * FROM schemes WHERE id = $1 LIMIT 1;', [id]);
    return res.rows[0] || null;
  }

  async findSchemeByCode(schemeCode: string): Promise<SchemeEntity | null> {
    const res = await query<SchemeEntity>('SELECT * FROM schemes WHERE scheme_code = $1 LIMIT 1;', [schemeCode]);
    return res.rows[0] || null;
  }

  async createApplication(data: {
    applicationNumber: string;
    schemeId: string;
    panchayatId: string;
    citizenUserId: string;
    isAssisted?: boolean;
    assistedOperatorId?: string | null;
    applicantData: Record<string, any>;
    uploadedDocumentRefs?: Array<{ code: string; url: string; fileName: string }>;
    remarks?: string;
  }): Promise<SchemeApplicationEntity> {
    const text = `
      INSERT INTO scheme_applications (
        application_number, scheme_id, panchayat_id, citizen_user_id,
        is_assisted, assisted_operator_id, status, applicant_data,
        uploaded_document_refs, remarks, submitted_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'SUBMITTED', $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const values = [
      data.applicationNumber,
      data.schemeId,
      data.panchayatId,
      data.citizenUserId,
      data.isAssisted || false,
      data.assistedOperatorId || null,
      JSON.stringify(data.applicantData),
      JSON.stringify(data.uploadedDocumentRefs || []),
      data.remarks || null,
    ];
    const res = await query<SchemeApplicationEntity>(text, values);
    return res.rows[0];
  }

  async findApplicationById(id: string, panchayatId: string): Promise<SchemeApplicationEntity | null> {
    const text = `
      SELECT 
        a.*,
        s.title as scheme_title,
        s.scheme_code as scheme_code,
        u.full_name as citizen_name,
        u.mobile_number as citizen_phone
      FROM scheme_applications a
      JOIN schemes s ON a.scheme_id = s.id
      JOIN users u ON a.citizen_user_id = u.id
      WHERE a.id = $1 AND a.panchayat_id = $2
      LIMIT 1;
    `;
    const res = await query<SchemeApplicationEntity>(text, [id, panchayatId]);
    return res.rows[0] || null;
  }

  async findApplicationsByCitizen(
    citizenUserId: string,
    panchayatId: string
  ): Promise<SchemeApplicationEntity[]> {
    const text = `
      SELECT 
        a.*,
        s.title as scheme_title,
        s.scheme_code as scheme_code
      FROM scheme_applications a
      JOIN schemes s ON a.scheme_id = s.id
      WHERE a.citizen_user_id = $1 AND a.panchayat_id = $2
      ORDER BY a.created_at DESC;
    `;
    const res = await query<SchemeApplicationEntity>(text, [citizenUserId, panchayatId]);
    return res.rows;
  }

  async findApplicationsByPanchayat(
    panchayatId: string,
    status?: SchemeApplicationStatus
  ): Promise<SchemeApplicationEntity[]> {
    let text = `
      SELECT 
        a.*,
        s.title as scheme_title,
        s.scheme_code as scheme_code,
        u.full_name as citizen_name,
        u.mobile_number as citizen_phone
      FROM scheme_applications a
      JOIN schemes s ON a.scheme_id = s.id
      JOIN users u ON a.citizen_user_id = u.id
      WHERE a.panchayat_id = $1
    `;
    const params: any[] = [panchayatId];

    if (status) {
      params.push(status);
      text += ` AND a.status = $${params.length}`;
    }

    text += ' ORDER BY a.created_at DESC;';
    const res = await query<SchemeApplicationEntity>(text, params);
    return res.rows;
  }

  async updateApplicationStatus(
    id: string,
    panchayatId: string,
    status: SchemeApplicationStatus,
    remarks?: string
  ): Promise<SchemeApplicationEntity | null> {
    const isSanctioned = status === 'SANCTIONED';
    const text = `
      UPDATE scheme_applications
      SET 
        status = $1,
        remarks = COALESCE($2, remarks),
        sanctioned_at = CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE sanctioned_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND panchayat_id = $5
      RETURNING *;
    `;
    const values = [status, remarks || null, isSanctioned, id, panchayatId];
    const res = await query<SchemeApplicationEntity>(text, values);
    return res.rows[0] || null;
  }
}

export const schemeRepository = new SchemeRepository();
