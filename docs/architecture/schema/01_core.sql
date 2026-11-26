-- Core jurisdiction, tenancy, users, and audit logs

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    state_name VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Root tenant boundary
CREATE TABLE IF NOT EXISTS panchayats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID REFERENCES districts(id) ON DELETE RESTRICT,
    block_id UUID REFERENCES blocks(id) ON DELETE RESTRICT,
    code VARCHAR(20) NOT NULL UNIQUE,
    lgd_code VARCHAR(15) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    block_name VARCHAR(100),
    district_name VARCHAR(100),
    state_name VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    office_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panchayat_id UUID NOT NULL REFERENCES panchayats(id) ON DELETE CASCADE,
    ward_number INT NOT NULL,
    ward_name VARCHAR(100),
    representative_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ward_panchayat_number UNIQUE (panchayat_id, ward_number)
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile_number VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(150) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    designation VARCHAR(100),
    role VARCHAR(30) NOT NULL CHECK (
        role IN (
            'CITIZEN',
            'ASSISTED_OPERATOR',
            'WARD_MEMBER',
            'PANCHAYAT_SECRETARY',
            'SARPANCH',
            'BLOCK_OFFICER',
            'SYSTEM_ADMIN'
        )
    ),
    account_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (
        account_status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED')
    ),
    panchayat_id UUID REFERENCES panchayats(id) ON DELETE SET NULL,
    ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ward_representative'
    ) THEN
        ALTER TABLE wards
            ADD CONSTRAINT fk_ward_representative
            FOREIGN KEY (representative_user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(30) NOT NULL,
    panchayat_id UUID REFERENCES panchayats(id) ON DELETE CASCADE,
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    delta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_districts_code ON districts(code);
CREATE INDEX IF NOT EXISTS idx_blocks_district_id ON blocks(district_id);
CREATE INDEX IF NOT EXISTS idx_panchayats_code ON panchayats(code);
CREATE INDEX IF NOT EXISTS idx_panchayats_lgd ON panchayats(lgd_code);
CREATE INDEX IF NOT EXISTS idx_panchayats_block_id ON panchayats(block_id);
CREATE INDEX IF NOT EXISTS idx_wards_panchayat_id ON wards(panchayat_id);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile_number);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_panchayat_role ON users(panchayat_id, role);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_audit_panchayat_entity ON audit_logs(panchayat_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id, created_at);
