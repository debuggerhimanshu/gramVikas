-- Seed data for core welfare schemes

INSERT INTO schemes (
    id,
    scheme_code,
    title,
    ministry,
    category,
    description,
    benefits_summary,
    application_url,
    eligibility_rules,
    required_documents,
    is_active
) VALUES 
(
    'e0000000-0000-0000-0000-000000000001',
    'SCH-PMAYG',
    'Pradhan Mantri Awas Yojana - Gramin',
    'Ministry of Rural Development',
    'HOUSING',
    'Financial assistance for construction of pucca houses with basic amenities for rural families living in kutcha dwellings.',
    'Grant of Rs. 1,20,000 (plains) / Rs. 1,30,000 (hilly/difficult), plus 90 days MGNREGS labor and Rs. 12,000 toilet support.',
    'https://pmayg.nic.in',
    '{
        "minAge": 18,
        "maxAge": 100,
        "maxAnnualIncome": 150000,
        "maxLandholdingAcres": 5.0,
        "requiresBpl": true,
        "eligibleCategories": ["SC", "ST", "OBC", "GENERAL"],
        "gender": "ANY"
    }'::jsonb,
    '[
        {"code": "AADHAAR", "name": "Aadhaar Card", "isMandatory": true},
        {"code": "BPL_CARD", "name": "BPL Ration Card / SECC Data Reference", "isMandatory": true},
        {"code": "BANK_PASSBOOK", "name": "Bank Passbook with Aadhaar Seeding", "isMandatory": true},
        {"code": "LAND_DWELLING_PHOTO", "name": "Geo-tagged photo of existing kutcha dwelling", "isMandatory": true}
    ]'::jsonb,
    TRUE
),
(
    'e0000000-0000-0000-0000-000000000002',
    'SCH-PMKISAN',
    'Pradhan Mantri Kisan Samman Nidhi',
    'Ministry of Agriculture and Farmers Welfare',
    'AGRICULTURE',
    'Income support for landholding farmer families across the country.',
    'Rs. 6,000 per year directly transferred to bank accounts in 3 installments of Rs. 2,000.',
    'https://pmkisan.gov.in',
    '{
        "minAge": 18,
        "maxAge": 100,
        "maxLandholdingAcres": 5.0,
        "requiresLandRecord": true,
        "requiresBpl": false,
        "eligibleCategories": ["SC", "ST", "OBC", "GENERAL"],
        "gender": "ANY"
    }'::jsonb,
    '[
        {"code": "AADHAAR", "name": "Aadhaar Card", "isMandatory": true},
        {"code": "LAND_RECORD_712", "name": "Land Ownership Record (7/12 Extract or RoR)", "isMandatory": true},
        {"code": "BANK_PASSBOOK", "name": "Bank Account Details", "isMandatory": true}
    ]'::jsonb,
    TRUE
),
(
    'e0000000-0000-0000-0000-000000000003',
    'SCH-JJM-TAP',
    'Jal Jeevan Mission - Household Tap Connection',
    'Ministry of Jal Shakti',
    'WATER_SANITATION',
    'Program delivering functional household tap connections with potable drinking water to rural homes.',
    'Piped drinking water tap installation to rural residences with regular water quality monitoring.',
    'https://jaljeevanmission.gov.in',
    '{
        "minAge": 18,
        "maxAge": 100,
        "eligibleCategories": ["SC", "ST", "OBC", "GENERAL"],
        "gender": "ANY"
    }'::jsonb,
    '[
        {"code": "AADHAAR", "name": "Aadhaar Card of Head of Family", "isMandatory": true},
        {"code": "HOUSE_ASSESSMENT", "name": "Gram Panchayat House Tax Receipt or Electricity Bill", "isMandatory": true}
    ]'::jsonb,
    TRUE
)
ON CONFLICT (scheme_code) DO NOTHING;
