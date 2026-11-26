export type ConsentType = 'PHYSICAL_FORM_SIGNATURE' | 'OTP_VERIFIED' | 'VERBAL_WITH_WITNESS';

export type AssistedServiceType =
  | 'SCHEME_APPLICATION'
  | 'GRIEVANCE_FILING'
  | 'CERTIFICATE_ASSISTANCE'
  | 'STATUS_INQUIRY';

export interface AssistedAccessLogEntity {
  id: string;
  panchayat_id: string;
  operator_id: string;
  citizen_user_id?: string | null;
  citizen_name: string;
  citizen_phone: string;
  service_type: AssistedServiceType;
  reference_id?: string | null;
  consent_type: ConsentType;
  consent_proof_url?: string | null;
  offline_tracking_token: string;
  created_at: Date;
}

export interface ApplyAssistedSchemeDto {
  citizenName: string;
  citizenPhone: string;
  citizenUserId?: string;
  consentType: ConsentType;
  consentProofUrl?: string;
  applicantData: Record<string, any>;
  uploadedDocumentRefs?: Array<{ code: string; url: string; fileName: string }>;
  remarks?: string;
}

export interface AssistedReceiptSummary {
  offlineTrackingToken: string;
  citizenName: string;
  maskedPhone: string;
  serviceType: AssistedServiceType;
  panchayatId: string;
  operatorId: string;
  applicationNumber?: string;
  status: string;
  issuedAt: Date;
}
