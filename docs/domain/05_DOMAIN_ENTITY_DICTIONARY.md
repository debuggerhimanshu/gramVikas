# Gram Vikas — Phase 0: Domain Entity Dictionary

**Document Reference:** `docs/phase-0/05_DOMAIN_ENTITY_DICTIONARY.md`  
**Project:** Gram Panchayat – Gram Vikas  
**Phase:** Phase 0 (Domain Modeling & Requirements Engineering)  
**Status:** Approved for Architecture Design  

---

## 1. Domain Modeling Principles

The entities below form the conceptual and relational foundation for the Gram Vikas platform. Designed for a **Modular Monolith**, each entity encapsulates clear ownership by its parent module while exposing foreign key relationships for cross-module workflows.

### Global Data Types & Conventions
- **Identifiers (`id`):** 36-character UUID strings (`uuidv4`) for distributed uniqueness.
- **Human-Readable Identifiers:** Prefixed alphanumeric codes for citizen and official communication (e.g. `GRV-2026-0042`, `PRJ-011`, `AST-W2-BW-004`).
- **Timestamps:** ISO 8601 UTC (`created_at`, `updated_at`).
- **Geographic Points:** Latitude (`decimal(10,8)`) and Longitude (`decimal(11,8)`).
- **Monetary Values:** `decimal(14,2)` in Indian National Rupees (INR ₹).

---

## 2. Core Administrative Entities (Panchayat Core)

### 2.1 `Panchayat`
Represents the local governing unit (Gram Panchayat).
- `id` (UUID, Primary Key)
- `code` (VARCHAR(20), Unique) — e.g., `GP-MH-PUN-0042`
- `lgd_code` (VARCHAR(15), Unique) — Local Government Directory (LGD) code issued by Ministry of Panchayati Raj.
- `name` (VARCHAR(100), Not Null)
- `block_name` (VARCHAR(100), Not Null)
- `district_name` (VARCHAR(100), Not Null)
- `state_name` (VARCHAR(100), Not Null)
- `office_address` (TEXT)
- `created_at` (TIMESTAMP)

### 2.2 `Ward`
Sub-constituency of a Gram Panchayat.
- `id` (UUID, Primary Key)
- `panchayat_id` (UUID, Foreign Key -> `Panchayat.id`, Not Null)
- `ward_number` (INT, Not Null) — e.g. 1, 2, 3...
- `ward_name` (VARCHAR(100))
- `representative_user_id` (UUID, Foreign Key -> `User.id`, Nullable)
- `created_at` (TIMESTAMP)

### 2.3 `User`
All human actors accessing the platform.
- `id` (UUID, Primary Key)
- `mobile_number` (VARCHAR(15), Unique, Not Null)
- `password_hash` (VARCHAR(255), Not Null)
- `full_name` (VARCHAR(150), Not Null)
- `role` (ENUM: `CITIZEN`, `ASSISTED_OPERATOR`, `WARD_MEMBER`, `PANCHAYAT_SECRETARY`, `SARPANCH`, `BLOCK_OFFICER`, `SYSTEM_ADMIN`)
- `panchayat_id` (UUID, Foreign Key -> `Panchayat.id`, Nullable for Block/Admin)
- `ward_id` (UUID, Foreign Key -> `Ward.id`, Nullable)
- `is_active` (BOOLEAN, Default: TRUE)
- `created_at` (TIMESTAMP)

---

## 3. Module 1: Grievance Management Entities

### 3.1 `GrievanceTicket`
Core civic complaint and service issue record.
- `id` (UUID, Primary Key)
- `ticket_number` (VARCHAR(30), Unique, Not Null) — e.g. `GRV-2026-0042`
- `panchayat_id` (UUID, Foreign Key -> `Panchayat.id`, Not Null)
- `ward_id` (UUID, Foreign Key -> `Ward.id`, Not Null)
- `complainant_user_id` (UUID, Foreign Key -> `User.id`, Nullable for anonymous/offline)
- `is_assisted` (BOOLEAN, Default: FALSE)
- `proxy_operator_id` (UUID, Foreign Key -> `User.id`, Nullable)
- `category` (ENUM: `DRINKING_WATER`, `SANITATION_WASTE`, `ROADS_DRAINAGE`, `STREETLIGHT_ELECTRIC`, `PUBLIC_HEALTH`, `ADMIN_CERTIFICATE`, `OTHER`)
- `sub_category` (VARCHAR(100))
- `title` (VARCHAR(200), Not Null)
- `description` (TEXT, Not Null)
- `geo_latitude` (DECIMAL(10,8), Nullable)
- `geo_longitude` (DECIMAL(11,8), Nullable)
- `priority` (ENUM: `LOW`, `MEDIUM`, `HIGH`, `EMERGENCY`, Default: `MEDIUM`)
- `status` (ENUM: `SUBMITTED`, `TRIAGED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CITIZEN_VERIFIED`, `REOPENED`)
- `assigned_to_user_id` (UUID, Foreign Key -> `User.id`, Nullable)
- `sla_deadline` (TIMESTAMP, Not Null)
- `resolved_at` (TIMESTAMP, Nullable)
- `resolution_summary` (TEXT, Nullable)
- `resolution_photo_url` (VARCHAR(500), Nullable)
- `citizen_closure_rating` (INT, 1-5, Nullable)
- `created_at` (TIMESTAMP)

### 3.2 `GrievanceStatusHistory`
Audit record of every status transition.
- `id` (UUID, Primary Key)
- `grievance_id` (UUID, Foreign Key -> `GrievanceTicket.id`, Not Null)
- `from_status` (ENUM)
- `to_status` (ENUM)
- `transitioned_by_user_id` (UUID, Foreign Key -> `User.id`, Not Null)
- `notes` (TEXT)
- `created_at` (TIMESTAMP)

---

## 4. Module 2: Scheme Intelligence Entities

### 4.1 `WelfareScheme`
Master repository of welfare programs.
- `id` (UUID, Primary Key)
- `scheme_code` (VARCHAR(50), Unique, Not Null) — e.g., `PMAY-G`, `PM-KISAN`
- `title` (VARCHAR(250), Not Null)
- `sponsor_level` (ENUM: `CENTRAL_GOVERNMENT`, `STATE_GOVERNMENT`, `PANCHAYAT_LOCAL`)
- `department` (VARCHAR(150), Not Null)
- `description` (TEXT, Not Null)
- `benefit_summary` (TEXT, Not Null)
- `application_mode` (ENUM: `ONLINE_PORTAL`, `OFFLINE_PANCHAYAT`, `HYBRID`)
- `external_portal_url` (VARCHAR(500), Nullable)
- `is_active` (BOOLEAN, Default: TRUE)

### 4.2 `SchemeEligibilityRule`
Declarative rules for multi-criteria matching.
- `id` (UUID, Primary Key)
- `scheme_id` (UUID, Foreign Key -> `WelfareScheme.id`, Not Null)
- `min_age` (INT, Nullable)
- `max_age` (INT, Nullable)
- `gender_restriction` (ENUM: `ANY`, `MALE_ONLY`, `FEMALE_ONLY`, `TRANSGENDER_ONLY`)
- `eligible_caste_categories` (VARCHAR(100)[], Nullable) — `['SC', 'ST', 'OBC', 'GENERAL']`
- `max_annual_income` (DECIMAL(12,2), Nullable)
- `max_landholding_acres` (DECIMAL(6,2), Nullable)
- `requires_bpl_card` (BOOLEAN, Default: FALSE)
- `required_documents_list` (JSONB, Not Null) — Array of document titles & descriptions

### 4.3 `SchemeApplication`
Pipeline tracking for citizen welfare applications.
- `id` (UUID, Primary Key)
- `application_number` (VARCHAR(40), Unique, Not Null)
- `scheme_id` (UUID, Foreign Key -> `WelfareScheme.id`, Not Null)
- `applicant_user_id` (UUID, Foreign Key -> `User.id`, Not Null)
- `panchayat_id` (UUID, Foreign Key -> `Panchayat.id`, Not Null)
- `is_assisted` (BOOLEAN, Default: FALSE)
- `assisted_operator_id` (UUID, Foreign Key -> `User.id`, Nullable)
- `status` (ENUM: `DRAFT`, `DOCS_PENDING`, `SUBMITTED_TO_PANCHAYAT`, `FORWARDED_TO_BLOCK`, `FIELD_VERIFICATION`, `SANCTIONED`, `REJECTED`)
- `submitted_at` (TIMESTAMP, Nullable)
- `sanctioned_at` (TIMESTAMP, Nullable)

---

## 5. Module 3: Development & Expenditure Tracking Entities

### 5.1 `DevelopmentProject`
Public works and civic infrastructure projects.
- `id` (UUID, Primary Key)
- `project_code` (VARCHAR(40), Unique, Not Null) — e.g. `PRJ-2026-0042`
- `panchayat_id` (UUID, Foreign Key -> `Panchayat.id`, Not Null)
- `ward_id` (UUID, Foreign Key -> `Ward.id`, Nullable)
- `title` (VARCHAR(250), Not Null)
- `work_type` (ENUM: `ROAD_CONCRETING`, `DRAINAGE_CONSTRUCTION`, `WATER_SUPPLY_NETWORK`, `COMMUNITY_BUILDING`, `SOLAR_LIGHTING`, `SANITATION_FACILITY`, `OTHER`)
- `funding_source` (ENUM: `FIFTEENTH_FINANCE_COMMISSION`, `STATE_FINANCE_COMMISSION`, `MGNREGS`, `SWACHH_BHARAT_MISSION`, `JAL_JEEVAN_MISSION`, `OWN_SOURCE_REVENUE`)
- `sanction_order_number` (VARCHAR(100), Not Null)
- `sanction_date` (DATE, Not Null)
- `sanctioned_budget` (DECIMAL(14,2), Not Null)
- `contractor_name` (VARCHAR(150), Not Null)
- `contractor_phone` (VARCHAR(15))
- `target_start_date` (DATE)
- `target_completion_date` (DATE)
- `status` (ENUM: `SANCTIONED`, `TENDERING`, `IN_PROGRESS`, `PHYSICALLY_COMPLETED`, `COMPLETED_PENDING_AUDIT`, `AUDITED_AND_CLOSED`, `DELAYED_ALERT`)
- `has_audit_variance_flag` (BOOLEAN, Default: FALSE)
- `created_at` (TIMESTAMP)

### 5.2 `ProjectMilestone`
Structured phase checkpoints for works.
- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key -> `DevelopmentProject.id`, Not Null)
- `sequence_number` (INT, Not Null)
- `title` (VARCHAR(150), Not Null) — e.g., "Sub-base preparation & gravel laying"
- `target_date` (DATE)
- `allocated_amount` (DECIMAL(14,2), Not Null)
- `status` (ENUM: `PENDING`, `IN_PROGRESS`, `VERIFIED_COMPLETE`, `FROZEN_VARIANCE`)
- `completed_at` (TIMESTAMP, Nullable)

### 5.3 `ExpenditureVoucher`
Granular financial expenditure entries.
- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key -> `DevelopmentProject.id`, Not Null)
- `milestone_id` (UUID, Foreign Key -> `ProjectMilestone.id`, Nullable)
- `voucher_number` (VARCHAR(50), Not Null)
- `voucher_date` (DATE, Not Null)
- `payee_name` (VARCHAR(150), Not Null)
- `amount` (DECIMAL(14,2), Not Null)
- `payment_mode` (ENUM: `PFMS_DIRECT_TRANSFER`, `CHEQUE`, `BANK_NEFT_RTGS`)
- `invoice_scan_url` (VARCHAR(500), Nullable)
- `authorized_by_sachiv_id` (UUID, Foreign Key -> `User.id`, Not Null)
- `co_signed_by_sarpanch_id` (UUID, Foreign Key -> `User.id`, Not Null)
- `created_at` (TIMESTAMP)

---

## 6. Module 4: Gram Sabha Participation Entities

### 6.1 `GramSabhaMeeting`
Official assembly schedule and record.
- `id` (UUID, Primary Key)
- `meeting_code` (VARCHAR(30), Unique, Not Null) — e.g. `GS-2026-Q3-01`
- `panchayat_id` (UUID, Foreign Key -> `Panchayat.id`, Not Null)
- `meeting_date` (TIMESTAMP, Not Null)
- `venue` (VARCHAR(200), Not Null)
- `meeting_type` (ENUM: `ORDINARY_STATUTORY`, `SPECIAL_URGENT`, `SOCIAL_AUDIT_SABHA`, `BUDGET_APPROVAL_SABHA`)
- `quorum_required_count` (INT, Not Null)
- `attendee_count` (INT, Nullable)
- `status` (ENUM: `SCHEDULED`, `AGENDA_CIRCULATED`, `IN_SESSION`, `RESOLUTIONS_DRAFTED`, `MINUTES_PUBLISHED`, `COMPLETED`)
- `signed_minutes_scan_url` (VARCHAR(500), Nullable)
- `created_at` (TIMESTAMP)

### 6.2 `CitizenSuggestion`
Pre-meeting civic input.
- `id` (UUID, Primary Key)
- `panchayat_id` (UUID, Foreign Key -> `Panchayat.id`, Not Null)
- `ward_id` (UUID, Foreign Key -> `Ward.id`, Not Null)
- `citizen_user_id` (UUID, Foreign Key -> `User.id`, Not Null)
- `title` (VARCHAR(200), Not Null)
- `description` (TEXT, Not Null)
- `status` (ENUM: `SUBMITTED`, `ENDORSED_BY_WARD`, `TABLED_TO_AGENDA`, `DISMISSED`)
- `created_at` (TIMESTAMP)

### 6.3 `GramSabhaResolution`
Officially adopted resolutions in the assembly.
- `id` (UUID, Primary Key)
- `meeting_id` (UUID, Foreign Key -> `GramSabhaMeeting.id`, Not Null)
- `resolution_number` (VARCHAR(50), Not Null) — e.g. `RES-2026/04`
- `title` (VARCHAR(250), Not Null)
- `resolution_text` (TEXT, Not Null)
- `resolution_type` (ENUM: `NEW_CIVIL_WORK`, `MAINTENANCE_CIVIC_ACTION`, `WELFARE_BENEFICIARY_APPROVAL`, `BUDGET_RATIFICATION`, `POLICY_DIRECTIVE`)
- `estimated_budget` (DECIMAL(14,2), Nullable)
- `funding_stream` (VARCHAR(100), Nullable)
- `status` (ENUM: `PASSED`, `IN_IMPLEMENTATION`, `COMPLETED`, `SHELVED`)
- `mapped_project_id` (UUID, Foreign Key -> `DevelopmentProject.id`, Nullable)
- `mapped_grievance_id` (UUID, Foreign Key -> `GrievanceTicket.id`, Nullable)

### 6.4 `AdvisoryPoll` & `AdvisoryPollVote`
Non-binding civic sentiment surveys.
- `AdvisoryPoll`: `id`, `meeting_id`, `panchayat_id`, `question_text`, `options_json` (e.g. `["Road in Ward 2", "Borewell in Ward 5"]`), `closes_at`, `is_active`.
- `AdvisoryPollVote`: `id`, `poll_id`, `citizen_user_id`, `selected_option_index`, `cast_at`. *(Unique constraint on `[poll_id, citizen_user_id]` prevents multi-voting).*

---

## 7. Module 5: Service Quality Monitoring Entities

### 7.1 `ServiceQualityLog`
Daily/periodic utility operational check.
- `id` (UUID, Primary Key)
- `panchayat_id` (UUID, Foreign Key -> `Panchayat.id`, Not Null)
- `ward_id` (UUID, Foreign Key -> `Ward.id`, Not Null)
- `service_type` (ENUM: `DRINKING_WATER`, `SOLID_WASTE_COLLECTION`, `STREET_LIGHTING`, `HEALTH_SUB_CENTRE`)
- `log_date` (DATE, Not Null)
- `metric_numeric_1` (DECIMAL(6,2), Nullable) — e.g., Water supply hours (e.g. 2.5 hrs)
- `metric_boolean_1` (BOOLEAN, Nullable) — e.g., Waste collected today (TRUE/FALSE)
- `active_reported_faults` (INT, Default: 0)
- `recorded_by_user_id` (UUID, Foreign Key -> `User.id`, Not Null)

### 7.2 `WardServiceHealth`
Aggregated health status tracker.
- `id` (UUID, Primary Key)
- `panchayat_id` (UUID, Foreign Key -> `Panchayat.id`, Not Null)
- `ward_id` (UUID, Foreign Key -> `Ward.id`, Not Null)
- `service_type` (ENUM)
- `current_status` (ENUM: `OPTIMAL`, `MINOR_DISRUPTION`, `HEALTH_DEGRADED`, `CRITICAL_OUTAGE`)
- `consecutive_outage_hours` (INT, Default: 0)
- `last_degraded_at` (TIMESTAMP, Nullable)

---

## 8. Module 6: Development Verification Entities

### 8.1 `DevelopmentVerification`
On-ground physical photographic audits.
- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key -> `DevelopmentProject.id`, Not Null)
- `milestone_id` (UUID, Foreign Key -> `ProjectMilestone.id`, Nullable)
- `verified_by_user_id` (UUID, Foreign Key -> `User.id`, Not Null)
- `verification_source` (ENUM: `CITIZEN_SOCIAL_AUDIT`, `WARD_COMMITTEE`, `TECHNICAL_AUDITOR_BDO`)
- `geo_latitude` (DECIMAL(10,8), Not Null)
- `geo_longitude` (DECIMAL(11,8), Not Null)
- `distance_from_project_meters` (DECIMAL(8,2), Not Null)
- `photo_urls` (VARCHAR(500)[], Not Null)
- `observations` (TEXT, Not Null)
- `rating` (ENUM: `SATISFACTORY`, `DEFECTIVE`, `INCOMPLETE`, `FRAUD_SUSPECTED`)
- `audit_variance_flag` (BOOLEAN, Default: FALSE)
- `status` (ENUM: `SUBMITTED`, `VERIFIED_ACCEPTED`, `FLAGGED_FOR_INSPECTION`, `BDO_ESCALATED`)
- `created_at` (TIMESTAMP)

---

## 9. Module 7: Infrastructure & Water Asset Entities

### 9.1 `VillageAsset`
Master inventory of physical public assets.
- `id` (UUID, Primary Key)
- `asset_uid` (VARCHAR(40), Unique, Not Null) — e.g. `AST-W3-BW-012`
- `panchayat_id` (UUID, Foreign Key -> `Panchayat.id`, Not Null)
- `ward_id` (UUID, Foreign Key -> `Ward.id`, Not Null)
- `asset_category` (ENUM: `TUBE_WELL_BOREWELL`, `OVERHEAD_TANK_WATER`, `WATER_PURIFICATION_RO`, `ROAD_SEGMENT`, `DRAINAGE_CHANNEL`, `TRANSFORMER_POWER`, `COMMUNITY_TOILET`, `PANCHAYAT_BHAWAN`, `ANGNWADI_CENTRE`)
- `name` (VARCHAR(150), Not Null)
- `geo_latitude` (DECIMAL(10,8), Not Null)
- `geo_longitude` (DECIMAL(11,8), Not Null)
- `installation_date` (DATE)
- `installed_cost` (DECIMAL(12,2))
- `installed_by_contractor` (VARCHAR(150))
- `funding_scheme` (VARCHAR(100))
- `health_status` (ENUM: `OPERATIONAL`, `MAINTENANCE_REQUIRED`, `OUT_OF_SERVICE`, `UNDER_REPAIR`, `DECOMMISSIONED`)
- `last_inspected_at` (TIMESTAMP, Nullable)

### 9.2 `AssetMaintenanceEvent`
Maintenance and repair log.
- `id` (UUID, Primary Key)
- `asset_id` (UUID, Foreign Key -> `VillageAsset.id`, Not Null)
- `issue_description` (TEXT, Not Null)
- `reported_at` (TIMESTAMP, Not Null)
- `dispatched_grievance_id` (UUID, Foreign Key -> `GrievanceTicket.id`, Nullable)
- `repair_cost` (DECIMAL(12,2), Default: 0.00)
- `restored_at` (TIMESTAMP, Nullable)

---

## 10. Module 8: Village Opportunity Exchange Entities

### 10.1 `OpportunityListing`
Local livelihood, training, and SHG showcase notices.
- `id` (UUID, Primary Key)
- `panchayat_id` (UUID, Foreign Key -> `Panchayat.id`, Not Null)
- `poster_user_id` (UUID, Foreign Key -> `User.id`, Not Null)
- `listing_type` (ENUM: `SHG_PRODUCT_SHOWCASE`, `LOCAL_WAGE_WORK`, `VOCATIONAL_SKILL_TRAINING`, `AGRICULTURAL_EQUIPMENT_SHARING`)
- `title` (VARCHAR(200), Not Null)
- `description` (TEXT, Not Null)
- `price_or_wage_description` (VARCHAR(100))
- `contact_person` (VARCHAR(100), Not Null)
- `contact_phone` (VARCHAR(15), Not Null)
- `status` (ENUM: `SUBMITTED`, `APPROVED_BY_PANCHAYAT`, `ACTIVE_PUBLISHED`, `EXPIRED`, `ARCHIVED`)
- `expires_at` (TIMESTAMP, Not Null)
- `created_at` (TIMESTAMP)

---

## 11. Module 9: Village Communication Entities

### 11.1 `BroadcastNotice`
Official announcements and emergency bulletins.
- `id` (UUID, Primary Key)
- `panchayat_id` (UUID, Foreign Key -> `Panchayat.id`, Not Null)
- `target_ward_id` (UUID, Foreign Key -> `Ward.id`, Nullable — Null indicates entire Panchayat)
- `title` (VARCHAR(250), Not Null)
- `body_text` (TEXT, Not Null)
- `urgency_level` (ENUM: `ROUTINE_ADMINISTRATIVE`, `IMPORTANT_ADVISORY`, `EMERGENCY_WEATHER_HEALTH`)
- `notice_category` (ENUM: `GRAM_SABHA_NOTICE`, `RATION_DISTRIBUTION`, `WEATHER_CROP_ALERT`, `HEALTH_CAMP`, `POWER_WATER_SHUTDOWN`, `GENERAL`)
- `audio_readout_url` (VARCHAR(500), Nullable)
- `status` (ENUM: `DRAFT`, `PUBLISHED`, `EXPIRED`, `REVOKED`)
- `published_by_user_id` (UUID, Foreign Key -> `User.id`, Not Null)
- `published_at` (TIMESTAMP, Nullable)
- `expires_at` (TIMESTAMP, Nullable)

---

## 12. Module 10: Assisted Digital Access Entities

### 12.1 `AssistedSessionLog`
Audit trails for VLE and Panchayat Sahayak assisted submissions.
- `id` (UUID, Primary Key)
- `operator_user_id` (UUID, Foreign Key -> `User.id`, Not Null)
- `panchayat_id` (UUID, Foreign Key -> `Panchayat.id`, Not Null)
- `citizen_name` (VARCHAR(150), Not Null)
- `citizen_mobile` (VARCHAR(15), Nullable)
- `citizen_ward_id` (UUID, Foreign Key -> `Ward.id`, Not Null)
- `consent_method` (ENUM: `SMS_OTP_TOKEN`, `PHYSICAL_SIGNED_SLIP_UPLOAD`, `VERBAL_RECORDED`)
- `consent_artifact_url` (VARCHAR(500), Nullable) — Link to scan of physical consent slip
- `target_module` (ENUM: `MODULE_1_GRIEVANCE`, `MODULE_2_SCHEME_APPLICATION`, `MODULE_4_SUGGESTION`)
- `target_record_id` (UUID, Not Null) — Foreign UUID of created Grievance/Application
- `service_fee_charged` (DECIMAL(6,2), Default: 0.00)
- `receipt_tracking_token` (VARCHAR(20), Unique, Not Null) — Short token printed for citizen
- `created_at` (TIMESTAMP)

---

## 13. Entity Relationship Summary Matrix

```
[Panchayat] 1 ──── N [Ward]
[Panchayat] 1 ──── N [User]
[Panchayat] 1 ──── N [DevelopmentProject] 1 ──── N [ProjectMilestone] 1 ──── N [ExpenditureVoucher]
[Panchayat] 1 ──── N [VillageAsset] 1 ──── N [AssetMaintenanceEvent]
[Panchayat] 1 ──── N [GramSabhaMeeting] 1 ──── N [GramSabhaResolution]
[Panchayat] 1 ──── N [GramSabhaMeeting] 1 ──── N [AdvisoryPoll] 1 ──── N [AdvisoryPollVote]
[Panchayat] 1 ──── N [GrievanceTicket] 1 ──── N [GrievanceStatusHistory]
[Panchayat] 1 ──── N [BroadcastNotice]
[Panchayat] 1 ──── N [OpportunityListing]
[Panchayat] 1 ──── N [ServiceQualityLog]
[User (Citizen)] 1 ──── N [GrievanceTicket]
[User (Citizen)] 1 ──── N [SchemeApplication]
[User (Operator)] 1 ──── N [AssistedSessionLog] 1 ──── 1 [GrievanceTicket / SchemeApplication]
[DevelopmentProject] 1 ──── N [DevelopmentVerification] (From Citizen / Auditor)
[VillageAsset] 1 ──── 0..N [GrievanceTicket] (Auto-dispatched fault tickets)
[GramSabhaResolution] 1 ──── 0..1 [DevelopmentProject] (Initiated from meeting)
```
