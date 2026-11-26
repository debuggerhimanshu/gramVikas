import { schemeRepository, SchemeRepository } from './scheme.repository';
import {
  SchemeEntity,
  SchemeApplicationEntity,
  CitizenEligibilityInputDto,
  EligibilityEvaluationResult,
  CreateSchemeApplicationDto,
  UpdateSchemeApplicationStatusDto,
  SchemeCategory,
} from './scheme.types';
import { NotFoundError, BadRequestError } from '@core/errors/app-error';

export const STATUTORY_ELIGIBILITY_DISCLAIMER =
  'Eligibility assessment is advisory and does not guarantee official sanction under government guidelines.';

export class SchemeService {
  constructor(private readonly repo: SchemeRepository = schemeRepository) {}

  async listSchemes(category?: SchemeCategory): Promise<SchemeEntity[]> {
    return this.repo.findAllSchemes({ category, isActive: true });
  }

  async getSchemeById(id: string): Promise<SchemeEntity> {
    const scheme = await this.repo.findSchemeById(id);
    if (!scheme) {
      throw new NotFoundError(`Welfare scheme with ID '${id}' not found.`);
    }
    return scheme;
  }

  // Evaluates applicant inputs against scheme rules defined in JSONB
  evaluateEligibility(scheme: SchemeEntity, profile: CitizenEligibilityInputDto): EligibilityEvaluationResult {
    const rules = scheme.eligibility_rules || {};
    const matchedCriteria: string[] = [];
    const unmetCriteria: string[] = [];

    // Age boundaries
    if (rules.minAge !== undefined) {
      if (profile.age >= rules.minAge) {
        matchedCriteria.push(`Meets minimum age requirement of ${rules.minAge} years (provided: ${profile.age}).`);
      } else {
        unmetCriteria.push(`Does not meet minimum age of ${rules.minAge} years (provided: ${profile.age}).`);
      }
    }
    if (rules.maxAge !== undefined) {
      if (profile.age <= rules.maxAge) {
        matchedCriteria.push(`Meets maximum age ceiling of ${rules.maxAge} years (provided: ${profile.age}).`);
      } else {
        unmetCriteria.push(`Exceeds maximum age ceiling of ${rules.maxAge} years (provided: ${profile.age}).`);
      }
    }

    // Income ceiling
    if (rules.maxAnnualIncome !== undefined) {
      if (profile.annualIncome !== undefined) {
        if (profile.annualIncome <= rules.maxAnnualIncome) {
          matchedCriteria.push(
            `Annual income Rs. ${profile.annualIncome} is within ceiling of Rs. ${rules.maxAnnualIncome}.`
          );
        } else {
          unmetCriteria.push(
            `Annual income Rs. ${profile.annualIncome} exceeds ceiling of Rs. ${rules.maxAnnualIncome}.`
          );
        }
      } else {
        unmetCriteria.push('Annual household income is required to evaluate eligibility for this scheme.');
      }
    }

    // Landholding limit
    if (rules.maxLandholdingAcres !== undefined) {
      if (profile.landholdingAcres !== undefined) {
        if (profile.landholdingAcres <= rules.maxLandholdingAcres) {
          matchedCriteria.push(
            `Landholding of ${profile.landholdingAcres} acres is within limit of ${rules.maxLandholdingAcres} acres.`
          );
        } else {
          unmetCriteria.push(
            `Landholding of ${profile.landholdingAcres} acres exceeds limit of ${rules.maxLandholdingAcres} acres.`
          );
        }
      } else if (rules.requiresLandRecord) {
        unmetCriteria.push('Landholding record details are required for this scheme.');
      }
    }

    // BPL card requirement
    if (rules.requiresBpl) {
      if (profile.hasBplCard === true) {
        matchedCriteria.push('Applicant possesses verified BPL / SECC qualifying status.');
      } else {
        unmetCriteria.push('Scheme strictly requires BPL (Below Poverty Line) or SECC registered status.');
      }
    }

    // Land ownership record
    if (rules.requiresLandRecord) {
      if (profile.hasLandRecord === true) {
        matchedCriteria.push('Applicant possesses cultivable agricultural land title (7/12 extract / RoR).');
      } else {
        unmetCriteria.push('Scheme requires verified agricultural landholding record.');
      }
    }

    // Caste quota
    if (rules.eligibleCategories && rules.eligibleCategories.length > 0) {
      if (profile.casteCategory) {
        if (rules.eligibleCategories.includes(profile.casteCategory)) {
          matchedCriteria.push(
            `Social category '${profile.casteCategory}' is eligible under scheme provisions.`
          );
        } else {
          unmetCriteria.push(
            `Social category '${profile.casteCategory}' is not covered under scheme quota (Eligible: ${rules.eligibleCategories.join(
              ', '
            )}).`
          );
        }
      } else if (!rules.eligibleCategories.includes('GENERAL')) {
        unmetCriteria.push('Caste / social category is required for this reserved welfare scheme.');
      }
    }

    // Gender filter
    if (rules.gender && rules.gender !== 'ANY') {
      if (profile.gender) {
        const normalized = profile.gender.toUpperCase();
        if (rules.gender === 'FEMALE_ONLY' && normalized !== 'FEMALE') {
          unmetCriteria.push('Scheme is exclusively reserved for female applicants.');
        } else if (rules.gender === 'MALE_ONLY' && normalized !== 'MALE') {
          unmetCriteria.push('Scheme is exclusively reserved for male applicants.');
        } else {
          matchedCriteria.push('Gender requirement matched.');
        }
      }
    }

    const isEligible = unmetCriteria.length === 0;

    return {
      isEligible,
      schemeId: scheme.id,
      schemeCode: scheme.scheme_code,
      title: scheme.title,
      matchedCriteria,
      unmetCriteria,
      missingDocuments: scheme.required_documents || [],
      disclaimer: STATUTORY_ELIGIBILITY_DISCLAIMER,
    };
  }

  async checkEligibility(schemeId: string, profile: CitizenEligibilityInputDto): Promise<EligibilityEvaluationResult> {
    const scheme = await this.getSchemeById(schemeId);
    return this.evaluateEligibility(scheme, profile);
  }

  async applyForScheme(
    schemeId: string,
    dto: CreateSchemeApplicationDto,
    citizenUserId: string,
    panchayatId: string
  ): Promise<SchemeApplicationEntity> {
    const scheme = await this.getSchemeById(schemeId);
    if (!scheme.is_active) {
      throw new BadRequestError(`Scheme '${scheme.title}' is currently inactive and not accepting applications.`);
    }

    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const applicationNumber = `APP-${yearMonth}-${randomSuffix}`;

    return this.repo.createApplication({
      applicationNumber,
      schemeId,
      panchayatId,
      citizenUserId: dto.citizenUserId || citizenUserId,
      isAssisted: dto.isAssisted || false,
      assistedOperatorId: dto.assistedOperatorId || null,
      applicantData: dto.applicantData,
      uploadedDocumentRefs: dto.uploadedDocumentRefs || [],
      remarks: dto.remarks,
    });
  }

  async getMyApplications(citizenUserId: string, panchayatId: string): Promise<SchemeApplicationEntity[]> {
    return this.repo.findApplicationsByCitizen(citizenUserId, panchayatId);
  }

  async updateApplicationStatus(
    id: string,
    panchayatId: string,
    dto: UpdateSchemeApplicationStatusDto
  ): Promise<SchemeApplicationEntity> {
    const existing = await this.repo.findApplicationById(id, panchayatId);
    if (!existing) {
      throw new NotFoundError(`Application with ID '${id}' not found in active Panchayat.`);
    }

    const validTransitions: Record<string, string[]> = {
      SUBMITTED: ['VERIFIED_BY_PANCHAYAT', 'REJECTED'],
      VERIFIED_BY_PANCHAYAT: ['FORWARDED_TO_BLOCK', 'REJECTED'],
      FORWARDED_TO_BLOCK: ['SANCTIONED', 'REJECTED'],
      SANCTIONED: [],
      REJECTED: ['SUBMITTED'],
    };

    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestError(
        `Invalid status transition from '${existing.status}' to '${dto.status}'. Allowed transitions: [${allowed.join(
          ', '
        )}]`
      );
    }

    const updated = await this.repo.updateApplicationStatus(id, panchayatId, dto.status, dto.remarks);
    if (!updated) {
      throw new NotFoundError(`Application with ID '${id}' not found.`);
    }
    return updated;
  }
}

export const schemeService = new SchemeService();
