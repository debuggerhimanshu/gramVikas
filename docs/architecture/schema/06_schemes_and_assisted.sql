-- Welfare schemes catalog, application tracking, and assisted access logs

CREATE TABLE IF NOT EXISTS schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    ministry VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (
        category IN (
            'HOUSING',
            'AGRICULTURE',
            'HEALTH_INSURANCE',
            'EDUCATION',
            'SOCIAL_WELFARE',
            'PENSION',
            'WATER_SANITATION',
            'SKILL_EMPLOYMENT'
        )
    ),
    description TEXT NOT NULL,
    benefits_summary TEXT NOT NULL,
    application_url VARCHAR(500),
    eligibility_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    required_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scheme_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_number VARCHAR(30) NOT NULL UNIQUE,
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE RESTRICT,
    panchayat_id UUID NOT NULL REFERENCES panchayats(id) ON DELETE RESTRICT,
    citizen_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_assisted BOOLEAN NOT NULL DEFAULT FALSE,
    assisted_operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (
        status IN (
            'DRAFT',
            'SUBMITTED',
            'VERIFIED_BY_PANCHAYAT',
            'FORWARDED_TO_BLOCK',
            'SANCTIONED',
            'REJECTED'
        )
    ),
    applicant_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    uploaded_document_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    remarks TEXT,
    submitted_at TIMESTAMPTZ,
    sanctioned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assisted_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panchayat_id UUID NOT NULL REFERENCES panchayats(id) ON DELETE RESTRICT,
    operator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    citizen_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    citizen_name VARCHAR(150) NOT NULL,
    citizen_phone VARCHAR(15) NOT NULL,
    service_type VARCHAR(50) NOT NULL CHECK (
        service_type IN (
            'SCHEME_APPLICATION',
            'GRIEVANCE_FILING',
            'CERTIFICATE_ASSISTANCE',
            'STATUS_INQUIRY'
        )
    ),
    reference_id UUID,
    consent_type VARCHAR(30) NOT NULL CHECK (
        consent_type IN (
            'PHYSICAL_FORM_SIGNATURE',
            'OTP_VERIFIED',
            'VERBAL_WITH_WITNESS'
        )
    ),
    consent_proof_url VARCHAR(500),
    offline_tracking_token VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schemes_code ON schemes(scheme_code);
CREATE INDEX IF NOT EXISTS idx_schemes_category ON schemes(category);
CREATE INDEX IF NOT EXISTS idx_schemes_active ON schemes(is_active);
CREATE INDEX IF NOT EXISTS idx_scheme_apps_panchayat_status ON scheme_applications(panchayat_id, status);
CREATE INDEX IF NOT EXISTS idx_scheme_apps_user ON scheme_applications(citizen_user_id);
CREATE INDEX IF NOT EXISTS idx_scheme_apps_scheme ON scheme_applications(scheme_id);
CREATE INDEX IF NOT EXISTS idx_assisted_panchayat ON assisted_access_logs(panchayat_id);
CREATE INDEX IF NOT EXISTS idx_assisted_operator ON assisted_access_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_assisted_token ON assisted_access_logs(offline_tracking_token);
