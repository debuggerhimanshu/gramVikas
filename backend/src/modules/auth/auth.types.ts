import { UserRole } from '@core/context/request-context';

export type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';

export interface PanchayatEntity {
  id: string;
  district_id?: string | null;
  block_id?: string | null;
  code: string;
  lgd_code: string;
  name: string;
  block_name?: string | null;
  district_name?: string | null;
  state_name?: string;
  office_address?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WardEntity {
  id: string;
  panchayat_id: string;
  ward_number: number;
  ward_name?: string | null;
  representative_user_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserEntity {
  id: string;
  mobile_number: string;
  email?: string | null;
  password_hash: string;
  full_name: string;
  designation?: string | null;
  role: UserRole;
  account_status: AccountStatus;
  panchayat_id?: string | null;
  ward_id?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LeaderDetailsDto {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  designation?: string;
}

export interface RegisterPanchayatDto {
  districtId: string;
  blockId: string;
  name: string;
  lgdCode: string;
  code?: string;
  officeAddress?: string;
  leader: LeaderDetailsDto;
}

export interface RegisterCitizenDto {
  panchayatId: string;
  wardId: string;
  fullName: string;
  phone: string;
  password: string;
}

export interface LoginDto {
  identifier: string; // phone or email
  password: string;
}

export interface AuthUserResponse {
  id: string;
  fullName: string;
  mobileNumber: string;
  email?: string | null;
  role: UserRole;
  designation?: string | null;
  accountStatus: AccountStatus;
  panchayatId?: string | null;
  wardId?: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUserResponse;
  panchayat?: PanchayatEntity;
}
