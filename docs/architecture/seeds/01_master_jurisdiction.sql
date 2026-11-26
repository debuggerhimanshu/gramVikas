-- Master reference jurisdiction: District and Block

INSERT INTO districts (id, code, name, state_name)
VALUES (
    'd1000000-0000-0000-0000-000000000001',
    'DIST-MH-PUN',
    'Pune District',
    'Maharashtra'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO blocks (id, district_id, code, name)
VALUES (
    'e1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    'BLK-MH-HAV',
    'Haveli Block'
) ON CONFLICT (id) DO NOTHING;
