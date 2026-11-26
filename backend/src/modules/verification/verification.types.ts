export type VerificationSource =
  | 'CITIZEN_SOCIAL_AUDIT'
  | 'WARD_COMMITTEE'
  | 'TECHNICAL_AUDITOR_BDO';

export type VerificationRating =
  | 'SATISFACTORY'
  | 'DEFECTIVE'
  | 'INCOMPLETE'
  | 'FRAUD_SUSPECTED';

export type VerificationStatus =
  | 'SUBMITTED'
  | 'VERIFIED_ACCEPTED'
  | 'FLAGGED_FOR_INSPECTION'
  | 'BDO_ESCALATED';

export interface DevelopmentVerificationEntity {
  id: string;
  project_id: string;
  milestone_id?: string | null;
  panchayat_id: string;
  verified_by_user_id: string;
  verified_by_name?: string | null;
  verification_source: VerificationSource;
  geo_latitude: number;
  geo_longitude: number;
  distance_from_project_meters: number;
  photo_urls: string[];
  observations: string;
  rating: VerificationRating;
  audit_variance_flag: boolean;
  status: VerificationStatus;
  created_at: Date;
}

export interface SubmitVerificationDto {
  projectId: string;
  milestoneId?: string;
  verificationSource?: VerificationSource;
  geoLatitude: number;
  geoLongitude: number;
  distanceFromProjectMeters?: number;
  photoUrls: string[];
  observations: string;
  rating: VerificationRating;
}

export interface VerificationFilterQuery {
  page?: number;
  limit?: number;
  varianceOnly?: boolean;
}
