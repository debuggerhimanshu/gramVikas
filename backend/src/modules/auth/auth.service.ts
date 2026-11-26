import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '@config/env';
import { authRepository, AuthRepository } from './auth.repository';
import {
  RegisterPanchayatDto,
  RegisterCitizenDto,
  LoginDto,
  AuthResponse,
  AuthUserResponse,
  UserEntity,
} from './auth.types';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  BadRequestError,
} from '@core/errors/app-error';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  // Reject unsupported legacy bcrypt hashes instead of accepting them without verification.
  // This service currently creates scrypt hashes; add a real bcrypt verifier before migration support.
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);
}

export class AuthService {
  constructor(private readonly repo: AuthRepository = authRepository) {}

  /**
   * Generates a signed JWT token containing userId (sub), role, and tenant IDs
   */
  generateToken(user: UserEntity): string {
    return jwt.sign(
      {
        sub: user.id,
        role: user.role,
        panchayatId: user.panchayat_id,
        wardId: user.ward_id,
      },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Maps a database UserEntity to a sanitized public AuthUserResponse
   */
  mapUserResponse(user: UserEntity): AuthUserResponse {
    return {
      id: user.id,
      fullName: user.full_name,
      mobileNumber: user.mobile_number,
      email: user.email,
      role: user.role,
      designation: user.designation,
      accountStatus: user.account_status,
      panchayatId: user.panchayat_id,
      wardId: user.ward_id,
    };
  }

  /**
   * Dynamic Panchayat Registration & Leader (Sarpanch) Onboarding
   */
  async registerPanchayat(dto: RegisterPanchayatDto): Promise<AuthResponse & { defaultWard: { id: string; wardNumber: number } }> {
    // 1. Check if LGD Code already registered
    const existingPanchayat = await this.repo.findPanchayatByLgdCode(dto.lgdCode);
    if (existingPanchayat) {
      throw new ConflictError(`Panchayat with LGD Code '${dto.lgdCode}' is already registered.`);
    }

    // 2. Check if leader phone number is already registered
    const existingUser = await this.repo.findUserByMobile(dto.leader.phone);
    if (existingUser) {
      throw new ConflictError(`User with mobile number '${dto.leader.phone}' already exists.`);
    }

    // 3. Create Panchayat record
    const panchayatCode = dto.code || `GP-${dto.lgdCode}`;
    const panchayat = await this.repo.createPanchayat({
      districtId: dto.districtId,
      blockId: dto.blockId,
      code: panchayatCode,
      lgdCode: dto.lgdCode,
      name: dto.name,
      officeAddress: dto.officeAddress,
    });

    // 4. Create default Ward 1 for the newly onboarded Panchayat
    const defaultWard = await this.repo.createWard({
      panchayatId: panchayat.id,
      wardNumber: 1,
      wardName: 'Ward 1 - Central',
    });

    // 5. Hash leader password & create Sarpanch User
    const passwordHash = hashPassword(dto.leader.password);
    const leaderUser = await this.repo.createUser({
      mobileNumber: dto.leader.phone,
      email: dto.leader.email,
      passwordHash,
      fullName: dto.leader.fullName,
      designation: dto.leader.designation || 'Sarpanch',
      role: 'SARPANCH',
      accountStatus: 'ACTIVE',
      panchayatId: panchayat.id,
      wardId: defaultWard.id,
    });

    // 6. Generate JWT token
    const token = this.generateToken(leaderUser);

    return {
      token,
      user: this.mapUserResponse(leaderUser),
      panchayat,
      defaultWard: {
        id: defaultWard.id,
        wardNumber: defaultWard.ward_number,
      },
    };
  }

  /**
   * Citizen Self-Service Onboarding
   */
  async registerCitizen(dto: RegisterCitizenDto): Promise<AuthResponse> {
    // 1. Verify target Panchayat exists
    const panchayat = await this.repo.findPanchayatById(dto.panchayatId);
    if (!panchayat) {
      throw new NotFoundError(`Panchayat with ID '${dto.panchayatId}' not found.`);
    }

    // 2. Verify target Ward exists and belongs to target Panchayat
    const ward = await this.repo.findWardById(dto.wardId, dto.panchayatId);
    if (!ward) {
      throw new BadRequestError(`Ward '${dto.wardId}' does not belong to Panchayat '${dto.panchayatId}'.`);
    }

    // 3. Verify mobile number is not already taken
    const existingUser = await this.repo.findUserByMobile(dto.phone);
    if (existingUser) {
      throw new ConflictError(`Mobile number '${dto.phone}' is already registered.`);
    }

    // 4. Hash password & create Citizen user
    const passwordHash = hashPassword(dto.password);
    const citizenUser = await this.repo.createUser({
      mobileNumber: dto.phone,
      passwordHash,
      fullName: dto.fullName,
      role: 'CITIZEN',
      accountStatus: 'ACTIVE',
      panchayatId: dto.panchayatId,
      wardId: dto.wardId,
    });

    // 5. Generate JWT token
    const token = this.generateToken(citizenUser);

    return {
      token,
      user: this.mapUserResponse(citizenUser),
      panchayat,
    };
  }

  /**
   * Universal Login (Phone or Email)
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.repo.findUserByIdentifier(dto.identifier);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials. User not found.');
    }

    if (user.account_status === 'SUSPENDED') {
      throw new UnauthorizedError('Account has been suspended. Please contact your Panchayat administrator.');
    }

    const isPasswordValid = verifyPassword(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials. Password mismatch.');
    }

    const token = this.generateToken(user);
    const panchayat = user.panchayat_id ? await this.repo.findPanchayatById(user.panchayat_id) : undefined;

    return {
      token,
      user: this.mapUserResponse(user),
      panchayat: panchayat || undefined,
    };
  }
}

export const authService = new AuthService();
