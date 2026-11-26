-- Development projects, physical milestones, and expenditure vouchers

CREATE TABLE IF NOT EXISTS development_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code VARCHAR(40) NOT NULL UNIQUE,
    panchayat_id UUID NOT NULL REFERENCES panchayats(id) ON DELETE RESTRICT,
    ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
    title VARCHAR(250) NOT NULL,
    work_type VARCHAR(50) NOT NULL CHECK (
        work_type IN (
            'ROAD_CONCRETING',
            'DRAINAGE_CONSTRUCTION',
            'WATER_SUPPLY_NETWORK',
            'COMMUNITY_BUILDING',
            'SOLAR_LIGHTING',
            'SANITATION_FACILITY',
            'OTHER'
        )
    ),
    funding_source VARCHAR(50) NOT NULL CHECK (
        funding_source IN (
            'FIFTEENTH_FINANCE_COMMISSION',
            'STATE_FINANCE_COMMISSION',
            'MGNREGS',
            'SWACHH_BHARAT_MISSION',
            'JAL_JEEVAN_MISSION',
            'OWN_SOURCE_REVENUE'
        )
    ),
    sanction_order_number VARCHAR(100) NOT NULL,
    sanction_date DATE NOT NULL,
    sanctioned_budget NUMERIC(14, 2) NOT NULL CHECK (sanctioned_budget > 0),
    contractor_name VARCHAR(150) NOT NULL,
    contractor_phone VARCHAR(15),
    target_start_date DATE,
    target_completion_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'SANCTIONED' CHECK (
        status IN (
            'SANCTIONED',
            'TENDERING',
            'IN_PROGRESS',
            'PHYSICALLY_COMPLETED',
            'COMPLETED_PENDING_AUDIT',
            'AUDITED_AND_CLOSED',
            'DELAYED_ALERT'
        )
    ),
    has_audit_variance_flag BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES development_projects(id) ON DELETE CASCADE,
    sequence_number INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    target_date DATE,
    allocated_amount NUMERIC(14, 2) NOT NULL CHECK (allocated_amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'IN_PROGRESS', 'VERIFIED_COMPLETE', 'FROZEN_VARIANCE')
    ),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_milestone_seq UNIQUE (project_id, sequence_number)
);

CREATE TABLE IF NOT EXISTS expenditure_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES development_projects(id) ON DELETE RESTRICT,
    milestone_id UUID REFERENCES project_milestones(id) ON DELETE SET NULL,
    panchayat_id UUID NOT NULL REFERENCES panchayats(id) ON DELETE RESTRICT,
    voucher_number VARCHAR(50) NOT NULL UNIQUE,
    voucher_date DATE NOT NULL,
    payee_name VARCHAR(150) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    payment_mode VARCHAR(30) NOT NULL CHECK (
        payment_mode IN ('PFMS_DIRECT_TRANSFER', 'CHEQUE', 'BANK_NEFT_RTGS')
    ),
    invoice_scan_url VARCHAR(500),
    authorized_by_sachiv_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    co_signed_by_sarpanch_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_panchayat_status ON development_projects(panchayat_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_funding ON development_projects(panchayat_id, funding_source);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_project ON expenditure_vouchers(project_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_panchayat ON expenditure_vouchers(panchayat_id);
