-- Grievance tickets and lifecycle history

CREATE TABLE IF NOT EXISTS grievance_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(30) NOT NULL UNIQUE,
    panchayat_id UUID NOT NULL REFERENCES panchayats(id) ON DELETE RESTRICT,
    ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
    complainant_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_assisted BOOLEAN NOT NULL DEFAULT FALSE,
    proxy_operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL CHECK (
        category IN (
            'DRINKING_WATER',
            'SANITATION_WASTE',
            'ROADS_DRAINAGE',
            'STREETLIGHT_ELECTRIC',
            'PUBLIC_HEALTH',
            'ADMIN_CERTIFICATE',
            'OTHER'
        )
    ),
    sub_category VARCHAR(100),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    geo_latitude DECIMAL(10, 8),
    geo_longitude DECIMAL(11, 8),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (
        priority IN ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY')
    ),
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED' CHECK (
        status IN (
            'SUBMITTED',
            'TRIAGED',
            'ASSIGNED',
            'IN_PROGRESS',
            'RESOLVED',
            'CITIZEN_VERIFIED',
            'REOPENED'
        )
    ),
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sla_deadline TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolution_summary TEXT,
    resolution_photo_url VARCHAR(500),
    citizen_closure_rating INT CHECK (citizen_closure_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grievance_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grievance_id UUID NOT NULL REFERENCES grievance_tickets(id) ON DELETE CASCADE,
    from_status VARCHAR(30) NOT NULL,
    to_status VARCHAR(30) NOT NULL,
    transitioned_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grievances_panchayat_status ON grievance_tickets(panchayat_id, status);
CREATE INDEX IF NOT EXISTS idx_grievances_ward_status ON grievance_tickets(ward_id, status);
CREATE INDEX IF NOT EXISTS idx_grievances_complainant ON grievance_tickets(complainant_user_id);
CREATE INDEX IF NOT EXISTS idx_grievances_sla ON grievance_tickets(sla_deadline) WHERE status NOT IN ('RESOLVED', 'CITIZEN_VERIFIED');
CREATE INDEX IF NOT EXISTS idx_grievance_history_ticket ON grievance_status_history(grievance_id);
