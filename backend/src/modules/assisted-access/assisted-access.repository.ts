import { query } from '@core/database/connection';
import {
  AssistedAccessLogEntity,
  AssistedServiceType,
  ConsentType,
} from './assisted-access.types';

export class AssistedAccessRepository {
  async createLog(data: {
    panchayatId: string;
    operatorId: string;
    citizenUserId?: string | null;
    citizenName: string;
    citizenPhone: string;
    serviceType: AssistedServiceType;
    referenceId?: string | null;
    consentType: ConsentType;
    consentProofUrl?: string | null;
    offlineTrackingToken: string;
  }): Promise<AssistedAccessLogEntity> {
    const text = `
      INSERT INTO assisted_access_logs (
        panchayat_id, operator_id, citizen_user_id, citizen_name,
        citizen_phone, service_type, reference_id, consent_type,
        consent_proof_url, offline_tracking_token
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const values = [
      data.panchayatId,
      data.operatorId,
      data.citizenUserId || null,
      data.citizenName,
      data.citizenPhone,
      data.serviceType,
      data.referenceId || null,
      data.consentType,
      data.consentProofUrl || null,
      data.offlineTrackingToken,
    ];
    const res = await query<AssistedAccessLogEntity>(text, values);
    return res.rows[0];
  }

  async findLogByToken(token: string): Promise<AssistedAccessLogEntity | null> {
    const res = await query<AssistedAccessLogEntity>(
      'SELECT * FROM assisted_access_logs WHERE offline_tracking_token = $1 LIMIT 1;',
      [token]
    );
    return res.rows[0] || null;
  }

  async findLogsByPanchayat(panchayatId: string): Promise<AssistedAccessLogEntity[]> {
    const text = `
      SELECT * FROM assisted_access_logs
      WHERE panchayat_id = $1
      ORDER BY created_at DESC;
    `;
    const res = await query<AssistedAccessLogEntity>(text, [panchayatId]);
    return res.rows;
  }

  async findLogsByOperator(operatorId: string, panchayatId: string): Promise<AssistedAccessLogEntity[]> {
    const text = `
      SELECT * FROM assisted_access_logs
      WHERE operator_id = $1 AND panchayat_id = $2
      ORDER BY created_at DESC;
    `;
    const res = await query<AssistedAccessLogEntity>(text, [operatorId, panchayatId]);
    return res.rows;
  }
}

export const assistedAccessRepository = new AssistedAccessRepository();
