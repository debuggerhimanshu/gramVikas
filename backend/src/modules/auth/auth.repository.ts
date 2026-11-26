import { query } from '@core/database/connection';
import { PanchayatEntity, WardEntity, UserEntity, AccountStatus } from './auth.types';
import { UserRole } from '@core/context/request-context';

export class AuthRepository {
  /**
   * Find a Panchayat by ID
   */
  async findPanchayatById(id: string): Promise<PanchayatEntity | null> {
    const text = 'SELECT * FROM panchayats WHERE id = $1 LIMIT 1;';
    const res = await query<PanchayatEntity>(text, [id]);
    return res.rows[0] || null;
  }

  /**
   * Find a Panchayat by LGD Code
   */
  async findPanchayatByLgdCode(lgdCode: string): Promise<PanchayatEntity | null> {
    const text = 'SELECT * FROM panchayats WHERE lgd_code = $1 LIMIT 1;';
    const res = await query<PanchayatEntity>(text, [lgdCode]);
    return res.rows[0] || null;
  }

  /**
   * Create a new Panchayat
   */
  async createPanchayat(data: {
    districtId: string;
    blockId: string;
    code: string;
    lgdCode: string;
    name: string;
    officeAddress?: string;
  }): Promise<PanchayatEntity> {
    const text = `
      INSERT INTO panchayats (
        district_id, block_id, code, lgd_code, name, office_address
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [
      data.districtId,
      data.blockId,
      data.code,
      data.lgdCode,
      data.name,
      data.officeAddress || null,
    ];
    const res = await query<PanchayatEntity>(text, values);
    return res.rows[0];
  }

  /**
   * Create a default ward for a newly registered Panchayat
   */
  async createWard(data: {
    panchayatId: string;
    wardNumber: number;
    wardName: string;
  }): Promise<WardEntity> {
    const text = `
      INSERT INTO wards (panchayat_id, ward_number, ward_name)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const res = await query<WardEntity>(text, [data.panchayatId, data.wardNumber, data.wardName]);
    return res.rows[0];
  }

  /**
   * Find a ward by ID, optionally verifying it belongs to a specific Panchayat
   */
  async findWardById(id: string, panchayatId?: string): Promise<WardEntity | null> {
    let text = 'SELECT * FROM wards WHERE id = $1';
    const params: any[] = [id];
    if (panchayatId) {
      text += ' AND panchayat_id = $2';
      params.push(panchayatId);
    }
    text += ' LIMIT 1;';
    const res = await query<WardEntity>(text, params);
    return res.rows[0] || null;
  }

  /**
   * Find a user by phone or email
   */
  async findUserByIdentifier(identifier: string): Promise<UserEntity | null> {
    const text = `
      SELECT * FROM users
      WHERE mobile_number = $1 OR email = $1
      LIMIT 1;
    `;
    const res = await query<UserEntity>(text, [identifier]);
    return res.rows[0] || null;
  }

  /**
   * Find a user by mobile number
   */
  async findUserByMobile(mobileNumber: string): Promise<UserEntity | null> {
    const text = 'SELECT * FROM users WHERE mobile_number = $1 LIMIT 1;';
    const res = await query<UserEntity>(text, [mobileNumber]);
    return res.rows[0] || null;
  }

  /**
   * Find a user by ID
   */
  async findUserById(id: string): Promise<UserEntity | null> {
    const text = 'SELECT * FROM users WHERE id = $1 LIMIT 1;';
    const res = await query<UserEntity>(text, [id]);
    return res.rows[0] || null;
  }

  /**
   * Create a new user
   */
  async createUser(data: {
    mobileNumber: string;
    email?: string;
    passwordHash: string;
    fullName: string;
    designation?: string;
    role: UserRole;
    accountStatus?: AccountStatus;
    panchayatId?: string | null;
    wardId?: string | null;
  }): Promise<UserEntity> {
    const text = `
      INSERT INTO users (
        mobile_number, email, password_hash, full_name, designation,
        role, account_status, panchayat_id, ward_id, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
      RETURNING *;
    `;
    const values = [
      data.mobileNumber,
      data.email || null,
      data.passwordHash,
      data.fullName,
      data.designation || null,
      data.role,
      data.accountStatus || 'ACTIVE',
      data.panchayatId || null,
      data.wardId || null,
    ];
    const res = await query<UserEntity>(text, values);
    return res.rows[0];
  }
}

export const authRepository = new AuthRepository();
