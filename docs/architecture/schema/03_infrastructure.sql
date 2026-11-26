-- Village physical assets and repair maintenance logs

CREATE TABLE IF NOT EXISTS village_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_uid VARCHAR(40) NOT NULL UNIQUE,
    panchayat_id UUID NOT NULL REFERENCES panchayats(id) ON DELETE RESTRICT,
    ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
    asset_category VARCHAR(40) NOT NULL CHECK (
        asset_category IN (
            'TUBE_WELL_BOREWELL',
            'OVERHEAD_TANK_WATER',
            'WATER_PURIFICATION_RO',
            'ROAD_SEGMENT',
            'DRAINAGE_CHANNEL',
            'TRANSFORMER_POWER',
            'COMMUNITY_TOILET',
            'PANCHAYAT_BHAWAN',
            'ANGNWADI_CENTRE'
        )
    ),
    name VARCHAR(150) NOT NULL,
    geo_latitude DECIMAL(10, 8) NOT NULL,
    geo_longitude DECIMAL(11, 8) NOT NULL,
    installation_date DATE,
    installed_cost NUMERIC(12, 2) CHECK (installed_cost >= 0),
    installed_by_contractor VARCHAR(150),
    funding_scheme VARCHAR(100),
    health_status VARCHAR(30) NOT NULL DEFAULT 'OPERATIONAL' CHECK (
        health_status IN (
            'OPERATIONAL',
            'MAINTENANCE_REQUIRED',
            'OUT_OF_SERVICE',
            'UNDER_REPAIR',
            'DECOMMISSIONED'
        )
    ),
    last_inspected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_maintenance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES village_assets(id) ON DELETE CASCADE,
    panchayat_id UUID NOT NULL REFERENCES panchayats(id) ON DELETE RESTRICT,
    issue_description TEXT NOT NULL,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dispatched_grievance_id UUID REFERENCES grievance_tickets(id) ON DELETE SET NULL,
    repair_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (repair_cost >= 0),
    restored_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (
        status IN ('OPEN', 'IN_REPAIR', 'RESTORED', 'ABANDONED')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assets_panchayat_cat ON village_assets(panchayat_id, asset_category);
CREATE INDEX IF NOT EXISTS idx_assets_health ON village_assets(panchayat_id, health_status);
CREATE INDEX IF NOT EXISTS idx_asset_maint_asset ON asset_maintenance_events(asset_id);
