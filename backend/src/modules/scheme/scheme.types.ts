export type SchemeCategory =
  | 'HOUSING'
  | 'AGRICULTURE'
  | 'HEALTH_INSURANCE'
  | 'EDUCATION'
  | 'SOCIAL_WELFARE'
  | 'PENSION'
  | 'WATER_SANITATION'
  | 'SKILL_EMPLOYMENT';

export type SchemeApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'VERIFIED_BY_PANCHAYAT'
  | 'FORWARDED_TO_BLOCK'
  | 'SANCTIONED'
  | 'REJECTED';

export type GenderRestriction = 'ANY' | 'MALE_ONLY' | 'FEMALE_ONLY' | 'TRANSGENDER_ONLY';

export interface RequiredDocument {
  code: string;
  name: string;
  isMandatory: boolean;
}

export interface EligibilityCriteria {
  minAge?: number;
  maxAge?: number;
  maxAnnualIncome?: number;
  maxLandholdingAcres?: number;
  requiresBpl?: boolean;
  requiresLandRecord?: boolean;
  eligibleCategories?: string[];
  gender?: GenderRestriction;
}

export interface SchemeEntity {
  id: string;
  scheme_code: string;
  title: string;
  ministry: string;
  category: SchemeCategory;
  description: string;
  benefits_summary: string;
  application_url?: string | null;
  eligibility_rules: EligibilityCriteria;
  required_documents: RequiredDocument[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CitizenEligibilityInputDto {
  age: number;
  annualIncome?: number;
  landholdingAcres?: number;
  hasBplCard?: boolean;
  hasLandRecord?: boolean;
  casteCategory?: string;
  gender?: string;
}

export interface EligibilityEvaluationResult {
  isEligible: boolean;
  schemeId: string;
  schemeCode: string;
  title: string;
  matchedCriteria: string[];
  unmetCriteria: string[];
  missingDocuments: RequiredDocument[];
  disclaimer: string;
}

export interface CreateSchemeApplicationDto {
  applicantData: Record<string, any>;
  uploadedDocumentRefs?: Array<{ code: string; url: string; fileName: string }>;
  remarks?: string;
  isAssisted?: boolean;
  assistedOperatorId?: string;
  citizenUserId?: string;
}

export interface UpdateSchemeApplicationStatusDto {
  status: SchemeApplicationStatus;
  remarks?: string;
}

export interface SchemeApplicationEntity {
  id: string;
  application_number: string;
  scheme_id: string;
  panchayat_id: string;
  citizen_user_id: string;
  is_assisted: boolean;
  assisted_operator_id?: string | null;
  status: SchemeApplicationStatus;
  applicant_data: Record<string, any>;
  uploaded_document_refs: Array<{ code: string; url: string; fileName: string }>;
  remarks?: string | null;
  submitted_at?: Date | null;
  sanctioned_at?: Date | null;
  created_at: Date;
  updated_at: Date;
  scheme_title?: string;
  scheme_code?: string;
  citizen_name?: string;
  citizen_phone?: string;
}
