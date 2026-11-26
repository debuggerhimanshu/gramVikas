-- Development verifications and social audits

CREATE TABLE IF NOT EXISTS development_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES development_projects(id) ON DELETE RESTRICT,
    milestone_id UUID REFERENCES project_milestones(id) ON DELETE SET NULL,
    panchayat_id UUID NOT NULL REFERENCES panchayats(id) ON DELETE RESTRICT,
    verified_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    verification_source VARCHAR(40) NOT NULL CHECK (
        verification_source IN (
            'CITIZEN_SOCIAL_AUDIT',
            'WARD_COMMITTEE',
            'TECHNICAL_AUDITOR_BDO'
        )
    ),
    geo_latitude DECIMAL(10, 8) NOT NULL,
    geo_longitude DECIMAL(11, 8) NOT NULL,
    distance_from_project_meters NUMERIC(8, 2) NOT NULL CHECK (distance_from_project_meters >= 0),
    photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    observations TEXT NOT NULL,
    rating VARCHAR(30) NOT NULL CHECK (
        rating IN ('SATISFACTORY', 'DEFECTIVE', 'INCOMPLETE', 'FRAUD_SUSPECTED')
    ),
    audit_variance_flag BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED' CHECK (
        status IN (
            'SUBMITTED',
            'VERIFIED_ACCEPTED',
            'FLAGGED_FOR_INSPECTION',
            'BDO_ESCALATED'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verifications_project ON development_verifications(project_id);
CREATE INDEX IF NOT EXISTS idx_verifications_panchayat_variance ON development_verifications(panchayat_id, audit_variance_flag);
