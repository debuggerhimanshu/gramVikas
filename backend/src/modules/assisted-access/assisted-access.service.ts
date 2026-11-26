import {
  assistedAccessRepository,
  AssistedAccessRepository,
} from './assisted-access.repository';
import { schemeService, SchemeService } from '../scheme/scheme.service';
import { schemeRepository, SchemeRepository } from '../scheme/scheme.repository';
import {
  ApplyAssistedSchemeDto,
  AssistedAccessLogEntity,
  AssistedReceiptSummary,
} from './assisted-access.types';
import { NotFoundError } from '@core/errors/app-error';

export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return '******';
  return '******' + phone.slice(-4);
}

export function generateOfflineTrackingToken(): string {
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `VLE-${digits}`;
}

export class AssistedAccessService {
  constructor(
    private readonly repo: AssistedAccessRepository = assistedAccessRepository,
    private readonly schemeSvc: SchemeService = schemeService,
    private readonly schemeRepo: SchemeRepository = schemeRepository
  ) {}

  async applySchemeAssisted(
    schemeId: string,
    dto: ApplyAssistedSchemeDto,
    operatorId: string,
    panchayatId: string
  ): Promise<{
    application: any;
    log: AssistedAccessLogEntity;
    receipt: AssistedReceiptSummary;
  }> {
    const application = await this.schemeSvc.applyForScheme(
      schemeId,
      {
        applicantData: dto.applicantData,
        uploadedDocumentRefs: dto.uploadedDocumentRefs,
        remarks: dto.remarks,
        isAssisted: true,
        assistedOperatorId: operatorId,
        citizenUserId: dto.citizenUserId || operatorId,
      },
      operatorId,
      panchayatId
    );

    const offlineTrackingToken = generateOfflineTrackingToken();

    const log = await this.repo.createLog({
      panchayatId,
      operatorId,
      citizenUserId: dto.citizenUserId || null,
      citizenName: dto.citizenName,
      citizenPhone: dto.citizenPhone,
      serviceType: 'SCHEME_APPLICATION',
      referenceId: application.id,
      consentType: dto.consentType,
      consentProofUrl: dto.consentProofUrl,
      offlineTrackingToken,
    });

    const receipt: AssistedReceiptSummary = {
      offlineTrackingToken,
      citizenName: dto.citizenName,
      maskedPhone: maskPhoneNumber(dto.citizenPhone),
      serviceType: 'SCHEME_APPLICATION',
      panchayatId,
      operatorId,
      applicationNumber: application.application_number,
      status: application.status,
      issuedAt: log.created_at,
    };

    return { application, log, receipt };
  }

  async trackByToken(token: string): Promise<AssistedReceiptSummary & { details: any }> {
    const log = await this.repo.findLogByToken(token);
    if (!log) {
      throw new NotFoundError(`No record found matching tracking token '${token}'.`);
    }

    let details: any = null;
    let status = 'SUBMITTED';

    if (log.service_type === 'SCHEME_APPLICATION' && log.reference_id) {
      const app = await this.schemeRepo.findApplicationById(log.reference_id, log.panchayat_id);
      if (app) {
        details = {
          applicationNumber: app.application_number,
          schemeTitle: app.scheme_title,
          schemeCode: app.scheme_code,
          submittedAt: app.submitted_at,
          sanctionedAt: app.sanctioned_at,
        };
        status = app.status;
      }
    }

    return {
      offlineTrackingToken: log.offline_tracking_token,
      citizenName: log.citizen_name,
      maskedPhone: maskPhoneNumber(log.citizen_phone),
      serviceType: log.service_type,
      panchayatId: log.panchayat_id,
      operatorId: log.operator_id,
      applicationNumber: details?.applicationNumber,
      status,
      issuedAt: log.created_at,
      details,
    };
  }

  async getLogs(panchayatId: string, operatorId?: string): Promise<AssistedAccessLogEntity[]> {
    if (operatorId) {
      return this.repo.findLogsByOperator(operatorId, panchayatId);
    }
    return this.repo.findLogsByPanchayat(panchayatId);
  }
}

export const assistedAccessService = new AssistedAccessService();
