export type GrievanceCategory =
  | 'DRINKING_WATER'
  | 'SANITATION_WASTE'
  | 'ROADS_DRAINAGE'
  | 'STREETLIGHT_ELECTRIC'
  | 'PUBLIC_HEALTH'
  | 'ADMIN_CERTIFICATE'
  | 'OTHER';

export type GrievancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export type GrievanceStatus =
  | 'SUBMITTED'
  | 'TRIAGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CITIZEN_VERIFIED'
  | 'REOPENED';

export interface GrievanceTicketEntity {
  id: string;
  ticket_number: string;
  panchayat_id: string;
  ward_id: string;
  complainant_user_id?: string | null;
  complainant_name?: string | null;
  complainant_mobile?: string | null;
  is_assisted: boolean;
  proxy_operator_id?: string | null;
  category: GrievanceCategory;
  sub_category?: string | null;
  title: string;
  description: string;
  geo_latitude?: number | null;
  geo_longitude?: number | null;
  priority: GrievancePriority;
  status: GrievanceStatus;
  assigned_to_user_id?: string | null;
  assigned_to_name?: string | null;
  sla_deadline: Date;
  resolved_at?: Date | null;
  resolution_summary?: string | null;
  resolution_photo_url?: string | null;
  citizen_closure_rating?: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface GrievanceStatusHistoryEntity {
  id: string;
  grievance_id: string;
  from_status: GrievanceStatus;
  to_status: GrievanceStatus;
  transitioned_by_user_id: string;
  transitioned_by_name?: string | null;
  notes?: string | null;
  created_at: Date;
}

export interface CreateGrievanceDto {
  wardId: string;
  category: GrievanceCategory;
  subCategory?: string;
  title: string;
  description: string;
  geoLatitude?: number;
  geoLongitude?: number;
  priority?: GrievancePriority;
  isAssisted?: boolean;
  proxyOperatorId?: string;
  complainantUserId?: string;
}

export interface UpdateGrievanceStatusDto {
  status: GrievanceStatus;
  assignedToUserId?: string;
  resolutionSummary?: string;
  resolutionPhotoUrl?: string;
  notes?: string;
}

export interface VerifyGrievanceDto {
  decision: 'ACCEPT' | 'REOPEN';
  rating?: number;
  rejectionReason?: string;
}

export interface GrievanceFilterQuery {
  page?: number;
  limit?: number;
  status?: GrievanceStatus;
  category?: GrievanceCategory;
  wardId?: string;
  priority?: GrievancePriority;
  complainantUserId?: string;
}
