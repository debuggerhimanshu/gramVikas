-- Clearly illustrative project records for local development and presentations.
-- These are not official Panchayat works, budgets, or expenditure records.

INSERT INTO districts (id, code, name, state_name)
VALUES (
    'd2000000-0000-0000-0000-000000000001',
    'DEMO-DIST',
    'Illustrative District',
    'DEMO ONLY'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO blocks (id, district_id, code, name)
VALUES (
    'e2000000-0000-0000-0000-000000000001',
    'd2000000-0000-0000-0000-000000000001',
    'DEMO-BLOCK',
    'Illustrative Block'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO panchayats (
    id, district_id, block_id, code, lgd_code, name,
    block_name, district_name, state_name
)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'd2000000-0000-0000-0000-000000000001',
    'e2000000-0000-0000-0000-000000000001',
    'DEMO-GP',
    'DEMO-LGD-0001',
    'Bhanpur Gram Panchayat (DEMO ONLY)',
    'Illustrative Block',
    'Illustrative District',
    'DEMO ONLY'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO wards (id, panchayat_id, ward_number, ward_name)
VALUES (
    'a1000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    3,
    'Ward 3 (demo)'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO development_projects (
    id, project_code, panchayat_id, ward_id, title, work_type,
    funding_source, sanction_order_number, sanction_date, sanctioned_budget,
    contractor_name, target_start_date, target_completion_date, status
)
VALUES
(
    'a2000000-0000-0000-0000-000000000001',
    'DEMO-2026-001',
    'a0000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000003',
    'DEMO ONLY — Drinking water pipeline',
    'WATER_SUPPLY_NETWORK',
    'JAL_JEEVAN_MISSION',
    'DEMO-SANCTION-001',
    '2026-09-10',
    1200000,
    'Demo record — no real contractor',
    '2026-09-15',
    '2026-12-15',
    'IN_PROGRESS'
),
(
    'a2000000-0000-0000-0000-000000000002',
    'DEMO-2026-002',
    'a0000000-0000-0000-0000-000000000001',
    NULL,
    'DEMO ONLY — Road improvement near primary school',
    'ROAD_CONCRETING',
    'FIFTEENTH_FINANCE_COMMISSION',
    'DEMO-SANCTION-002',
    '2026-11-01',
    650000,
    'Demo record — no real contractor',
    '2026-12-01',
    '2027-03-31',
    'SANCTIONED'
)
ON CONFLICT (project_code) DO NOTHING;
