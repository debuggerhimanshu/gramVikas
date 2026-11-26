# Gram Vikas — Phase 0: Module Specifications

**Document Reference:** `docs/phase-0/02_MODULE_SPECIFICATIONS.md`  
**Project:** Gram Panchayat – Gram Vikas  
**Phase:** Phase 0 (Domain Modeling & Requirements Engineering)  
**Status:** Approved for Architecture Design  

---

## Overview

This document specifies the functional requirements, operational state machines, data inputs/outputs, and edge cases for all **10 core modules** of the Gram Vikas platform. 

The architecture is designed as a **Modular Monolith** optimized for a 2–3 member development team to build and maintain over a 6-week cycle, avoiding unnecessary microservice overhead while enforcing clean domain separation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GRAM VIKAS PLATFORM MODULE MAP                        │
├───────────────────────────────┬───────────────────────────────┬─────────────┤
│      CIVIC REDRESSAL          │     FINANCIAL & WORKS         │  DEMOCRACY  │
├───────────────────────────────┼───────────────────────────────┼─────────────┤
│ Mod 1: Grievance Management   │ Mod 3: Dev & Expenditure      │ Mod 4: Sabha│
│ Mod 5: Service Quality Mon.   │ Mod 6: Dev Verification       │ Mod 9: Comm.│
│ Mod 7: Infra & Water Assets   │                               │             │
├───────────────────────────────┴───────────────────────────────┴─────────────┤
│      LIVELIHOOD & WELFARE             INCLUSION & ACCESS CORE               │
├───────────────────────────────┬─────────────────────────────────────────────┤
│ Mod 2: Scheme Intelligence    │ Mod 10: Assisted Digital Access (VLE/CSC)   │
│ Mod 8: Opportunity Exchange   │                                             │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

---

## Module 1: Grievance Management

### 1.1 Purpose & Domain Scope
Empowers citizens to register civic grievances (water leaks, broken streetlights, road damages, waste accumulation, administrative delays) with formal tracking, time-bound SLAs, automated escalation, and citizen-controlled closure verification.

### 1.2 Functional Requirements
- **FR-1.1 Grievance Ingestion:** Multi-channel registration (direct citizen app, SMS/IVR mock, or assisted via VLE/Operator in Module 10).
- **FR-1.2 Categorization & Geo-Tagging:** Mandatory categorization (Drinking Water, Sanitation, Roads, Electricity, Social Welfare, Other) and GPS location / Ward selection.
- **FR-1.3 Automated Triage & Assignment:** System assigns tickets to the relevant line department or ward official (e.g., Pump Operator, Line Man, Sweeper Supervisor, Sachiv).
- **FR-1.4 SLA Monitoring & Auto-Escalation:** Configurable resolution windows (e.g., Water: 48h, Streetlight: 72h, Road: 14 days). Overdue tickets escalate to Sarpanch and BDO.
- **FR-1.5 Verification Loop:** An issue is NOT closed when an official marks it "Resolved". It moves to `RESOLVED` and requires citizen confirmation (`CITIZEN_VERIFIED`) or auto-closes after 7 days without dispute. If dissatisfied, the citizen can trigger `REOPENED`.

### 1.3 State Machine

```
               ┌─────────────┐
               │  SUBMITTED  │
               └──────┬──────┘
                      │ Triage & Validation
                      ▼
               ┌─────────────┐
        ┌─────►│   TRIAGED   │
        │      └──────┬──────┘
        │             │ Staff Assigned
        │             ▼
        │      ┌─────────────┐
        │      │  ASSIGNED   │
        │      └──────┬──────┘
        │             │ Action Initiated
        │             ▼
        │      ┌─────────────┐
        │      │ IN_PROGRESS │
        │      └──────┬──────┘
        │             │ Official Fix Submitted (Photo + Notes)
        │             ▼
        │      ┌─────────────┐
        │      │  RESOLVED   │
        │      └───┬─────┬───┘
        │ Citizen  │     │ Citizen Approves /
        │ Rejects  │     │ 7-Day Auto-Acceptance
        │          │     ▼
        └──────────┴─ ┌──────────────────┐
                      │ CITIZEN_VERIFIED │
                      └──────────────────┘
```

| Current State | Event / Trigger | Target State | Permitted Actor | Conditions / Validations |
| :--- | :--- | :--- | :--- | :--- |
| `SUBMITTED` | Review & Categorize | `TRIAGED` | Sachiv, Assisted Op | Valid category & ward confirmed |
| `TRIAGED` | Assign Staff/Vendor | `ASSIGNED` | Sachiv, Sarpanch | Assignee ID specified |
| `ASSIGNED` | Worker Starts Work | `IN_PROGRESS` | Assigned Worker/Sachiv | Work commencement note logged |
| `IN_PROGRESS` | Submit Resolution | `RESOLVED` | Assigned Worker/Sachiv | Mandatory photo evidence & resolution note |
| `RESOLVED` | Citizen Agrees / Timeout | `CITIZEN_VERIFIED` | Citizen / System Timer | Rating (1-5) captured |
| `RESOLVED` | Citizen Rejects | `REOPENED` | Citizen | Rejection reason required; resets SLA counter |

### 1.4 Inputs and Outputs
- **Inputs:** `citizen_id` (or proxy flag), `category`, `sub_category`, `ward_id`, `description`, `photo_urls[]`, `geo_latitude`, `geo_longitude`, `urgency_level`.
- **Outputs:** `tracking_ticket_number` (e.g., `GRV-2026-0042`), `sla_deadline`, `assigned_officer_name`, `status_history[]`.

---

## Module 2: Scheme Intelligence

### 2.1 Purpose & Domain Scope
Centralizes information on central, state, and local welfare schemes, providing a rules-driven eligibility checker, document checklist generator, and application pipeline tracker.

### 2.2 Functional Requirements
- **FR-2.1 Scheme Repository:** Structured catalog with eligibility rules (age, gender, caste, annual income, landholding, BPL card status, disability).
- **FR-2.2 Multi-Criteria Eligibility Engine:** Citizen profile (or anonymous survey inputs) matches against active schemes and returns an Eligibility Confidence Score (Eligible, Likely Eligible, Ineligible with reasons).
- **FR-2.3 Document Checklist Generator:** Outputs an explicit list of required certifications (e.g., "Aadhaar Card", "Income Certificate < 1.5L", "Land Record 7/12").
- **FR-2.4 Application Pipeline Tracker:** Tracks application milestones (Draft -> Documents Uploaded -> Submitted to Dept -> Field Verification -> Sanctioned / Disbursed).

### 2.3 Operational State Machine (Scheme Application)
- States: `DRAFT` -> `DOCS_PENDING` -> `SUBMITTED_TO_PANCHAYAT` -> `FORWARDED_TO_BLOCK` -> `FIELD_VERIFICATION` -> `SANCTIONED` / `REJECTED`.

### 2.4 Inputs and Outputs
- **Inputs:** Citizen demographic & socio-economic profile (age, gender, caste category, land in acres, BPL status, annual household income).
- **Outputs:** Matched `scheme_id[]`, required `document_checklist[]`, `application_status`.

---

## Module 3: Development & Expenditure Tracking

### 3.1 Purpose & Domain Scope
Acts as the financial and physical monitoring ledger for all village civil and social works funded through 15th Finance Commission, MGNREGS, Swachh Bharat Mission (SBM), and Gram Panchayat Own Source Revenue (OSR).

### 3.2 Functional Requirements
- **FR-3.1 Work Sanction Recording:** Logs Administrative Sanctions (AS) and Technical Sanctions (TS), sanction order numbers, sanctioned cost, and funding stream.
- **FR-3.2 Milestone-Based Progress Tracking:** Defines physical milestones (e.g., Foundation, Plinth, Superstructure, Finishing) with financial disbursements mapped to each stage.
- **FR-3.3 Line-Item Expenditure Ledger:** Every voucher, material payment, and labour muster-roll disbursement is recorded against a project code.
- **FR-3.4 Public Financial Dashboard:** Real-time budget allocation vs. expenditure utilization displayed openly at the Panchayat level.

### 3.3 State Machine (Development Project)

```
[SANCTIONED] ──► [TENDERING_OR_VENDOR_ALLOTMENT] ──► [IN_PROGRESS]
                                                          │
                                     Milestone Check ─────┼───► [DELAYED_ALERT]
                                                          │
                                                          ▼
[AUDITED_AND_CLOSED] ◄── [COMPLETED_PENDING_AUDIT] ◄── [PHYSICALLY_COMPLETED]
```

### 3.4 Inputs and Outputs
- **Inputs:** `project_title`, `work_type`, `sanction_order_ref`, `sanction_date`, `allocated_budget`, `funding_source_enum`, `contractor_details`, `target_completion_date`, `milestones[]`.
- **Outputs:** `project_code` (e.g., `PRJ-2026-011`), `cumulative_expenditure`, `burn_rate_percent`, `physical_progress_percent`, `audit_status`.

---

## Module 4: Gram Sabha Participation

### 4.1 Purpose & Domain Scope
Digitally coordinates Gram Sabha meetings (constitutionally mandated assembly of all adult villagers), publishes agendas in advance, captures citizen priorities via advisory polls, and publicly documents approved minutes and actionable resolutions.

### 4.2 Functional Requirements
- **FR-4.1 Meeting Schedule & Notification:** Broadcasts meeting dates, times, venue, and required quorum 7 to 15 days in advance via Module 9.
- **FR-4.2 Citizen Pre-Sabha Suggestions:** Allows citizens to submit agenda topics or community issues for discussion up to 48 hours prior to the meeting.
- **FR-4.3 Non-Statutory Advisory Polls:** Publishes priority polls (e.g., "Priority selection for 15th FC untied funds"). System clearly marks these as **advisory sentiment only, not a legal vote**.
- **FR-4.4 Resolution & Action Item Tracking:** Digitizes approved meeting resolutions, extracts action tasks, assigns them to officials, and maps them to Module 3 (Works) or Module 1 (Grievances).

### 4.3 State Machine (Gram Sabha Meeting)
- `SCHEDULED` -> `AGENDA_CIRCULATED` -> `CONVENED_IN_SESSION` -> `RESOLUTIONS_DRAFTED` -> `MINUTES_PUBLISHED` -> `RESOLUTIONS_IN_EXECUTION` -> `COMPLETED`.

### 4.4 Inputs and Outputs
- **Inputs:** `meeting_date`, `venue`, `agenda_topics[]`, `citizen_suggestion_id[]`, `signed_minutes_scan_url`, `passed_resolutions[]`.
- **Outputs:** `meeting_notice_id`, `advisory_poll_results_aggregate`, `resolution_action_items[]`.

---

## Module 5: Service Quality Monitoring

### 5.1 Purpose & Domain Scope
Continuously monitors the reliability and quality of essential civic utilities: Drinking Water, Sanitation/Garbage collection, Street Lighting, and Health Sub-Centre doctor/auxiliary nurse midwife (ANM) attendance.

### 5.2 Functional Requirements
- **FR-5.1 Daily/Weekly Service Logs:** Daily tracking of drinking water pumping hours, chlorine test results, garbage van route completion, and functioning streetlights per ward.
- **FR-5.2 Degradation & Outage Threshold Detection:** If water supply is reported absent in a ward for 48 consecutive hours or >3 recurring complaints emerge in Module 1, status flips to `HEALTH_DEGRADED` and alerts the Sachiv.
- **FR-5.3 Citizen Quality Ratings:** Periodic micro-surveys (1–5 star satisfaction on drinking water clarity, pressure, and road cleanliness).

### 5.3 State Machine (Ward Service Health Status)
- `OPTIMAL` -> `MINOR_DISRUPTION` -> `HEALTH_DEGRADED` -> `CRITICAL_OUTAGE` -> `RESTORED_PENDING_CONFIRMATION` -> `OPTIMAL`.

### 5.4 Inputs and Outputs
- **Inputs:** `ward_id`, `service_type`, `daily_supply_hours`, `water_quality_metric`, `waste_collected_flag`, `active_fault_count`.
- **Outputs:** `ward_service_health_index`, `outage_incident_alert[]`.

---

## Module 6: Development Verification

### 6.1 Purpose & Domain Scope
Provides an independent verification layer for physical works through citizen audit, geotagged & timestamped photographic evidence, and official technical inspection reports to prevent paper-only completions.

### 6.2 Functional Requirements
- **FR-6.1 Geotagged Photo Ingestion:** Citizens and field inspectors capture on-site photos of public works with automated GPS coordinates and EXIF tamper validation.
- **FR-6.2 Cross-Milestone Comparison:** System presents side-by-side comparisons of "Before", "During Milestone", and "Completion" photos against project engineering plans.
- **FR-6.3 Audit Variance Flagging:** If citizen reports indicate an unpaved road or incomplete drainage while official project state is marked "100% Completed", an `AUDIT_VARIANCE_FLAG` is automatically raised and forwarded to the Block Development Officer (BDO).
- **FR-6.4 Social Audit Integration:** Aggregates verification reports into the mandatory half-yearly Social Audit dossier.

### 6.3 State Machine (Verification Record)
- `SUBMITTED` -> `EXIF_VALIDATED` -> `REVIEWED_BY_SECRETARY` -> `VERIFIED_ACCEPTED` / `FLAGGED_FOR_INSPECTION` -> `BDO_ESCALATED`.

### 6.4 Inputs and Outputs
- **Inputs:** `project_id`, `milestone_id`, `photo_urls[]`, `geo_lat`, `geo_long`, `verification_type` (Citizen, Technical Auditor, Ward Committee), `observations`.
- **Outputs:** `verification_id`, `variance_detected_flag`, `audit_dossier_entry`.

---

## Module 7: Infrastructure & Water Asset Monitoring

### 7.1 Purpose & Domain Scope
Maintains a definitive GIS-enabled inventory of all public assets owned or maintained by the Gram Panchayat (roads, tube wells, overhead storage tanks, community halls, solar lamps, transformers, drains).

### 7.2 Functional Requirements
- **FR-7.1 Asset Registry & Geocoding:** Detailed register containing Asset ID, asset category, installation date, contractor, warranty period, location coordinates, and installation cost.
- **FR-7.2 Asset Condition & Lifecycle Tracking:** Operational status (Operational, Partially Degraded, Non-Functional, Decommissioned).
- **FR-7.3 Incident & Downtime Tracking:** Records breakdown date, estimated repair cost, maintenance history, and auto-dispatches a repair ticket to Module 1.
- **FR-7.4 QR-Code Physical Tagging (Concept):** Generates unique identifier tokens for physical stamping on community assets (e.g., tube wells) allowing instant scanning by villagers.

### 7.3 State Machine (Asset Health)
- `OPERATIONAL` -> `MAINTENANCE_REQUIRED` -> `OUT_OF_SERVICE` -> `UNDER_REPAIR` -> `INSPECTED_AND_RESTORED` -> `OPERATIONAL` (or `DECOMMISSIONED`).

### 7.4 Inputs and Outputs
- **Inputs:** `asset_name`, `asset_category`, `ward_no`, `gps_coordinates`, `installation_date`, `scheme_funded_by`, `status`.
- **Outputs:** `asset_uid` (e.g., `AST-W2-BW-004`), `asset_uptime_ratio`, `cumulative_maintenance_cost`.

---

## Module 8: Village Opportunity Exchange

### 8.1 Purpose & Domain Scope
Acts as a hyper-local economic noticeboard connecting Self-Help Groups (SHGs), local artisans, farmers, and daily wage workers with opportunities, skill development programs, and market linkages.

### 8.2 Functional Requirements
- **FR-8.1 SHG Product Showcase:** Profiles local SHG produce (pickles, organic grains, handicrafts, tailoring services) with contact details, pricing, and availability.
- **FR-8.2 Local Work & Wage Openings:** Posts for agricultural harvesting labor, local construction work, Panchayat temporary requirements, and MGNREGS muster roll openings.
- **FR-8.3 Vocational Training Notices:** Publishes announcements from RSETI, PMKVY, and District Skill Development Agencies.
- **FR-8.4 Moderation & Safety:** Simple moderation by Panchayat Secretary to prevent deceptive marketing or exploitative recruitment postings.

### 8.3 State Machine (Listing Status)
- `SUBMITTED` -> `APPROVED_BY_PANCHAYAT` -> `ACTIVE_PUBLISHED` -> `EXPIRED` / `ARCHIVED`.

### 8.4 Inputs and Outputs
- **Inputs:** `creator_id`, `category` (SHG_Product, Work_Opportunity, Training_Notice), `title`, `description`, `price_or_wage`, `contact_channel`.
- **Outputs:** `listing_id`, `view_count`, `active_status`.

---

## Module 9: Village Communication

### 9.1 Purpose & Domain Scope
Serves as the village's official digital broadcasting and transparency channel. Disseminates critical weather/crop alerts, administrative notices, scheme deadlines, and the digital "Wall of Transparency".

### 9.2 Functional Requirements
- **FR-9.1 Official Broadcast Notices:** Announcements regarding ration distribution dates, vaccination drives, school admissions, power outages, and water tank cleaning.
- **FR-9.2 Emergency & Early Warning Alerts:** Urgent SMS/audio broadcasts for flood warnings, unseasonal rainfall/frost warnings, heatwave precautions, or disease outbreaks.
- **FR-9.3 Digital "Wall of Transparency" (Soochna Patta):** Continuous digital mirror of the Panchayat notice board, presenting financial summaries, Gram Sabha dates, and ongoing project status in accessible vernacular terms.
- **FR-9.4 Multi-Language & Audio Readout Ready:** Text notices designed with short, simple sentence structures to facilitate text-to-speech (TTS) audio readouts for illiterate citizens.

### 9.3 State Machine (Broadcast Notice)
- `DRAFT` -> `PUBLISHED` -> `BROADCAST_SENT` -> `EXPIRED` / `REVOKED`.

### 9.4 Inputs and Outputs
- **Inputs:** `title`, `body_text`, `urgency_level` (Routine, Important, Emergency), `target_audience` (All, Specific Ward, Farmers, SHGs), `expiry_date`.
- **Outputs:** `notice_id`, `dissemination_timestamp`, `reach_metrics`.

---

## Module 10: Assisted Digital Access

### 10.1 Purpose & Domain Scope
Enables Village Level Entrepreneurs (VLEs), Common Service Centre (CSC) operators, and Panchayat Sahayaks to submit grievances, scheme applications, and status inquiries on behalf of elderly, illiterate, or unequipped citizens while enforcing strict proxy accountability.

### 10.2 Functional Requirements
- **FR-10.1 Operator Identification & Session Binding:** Every assisted action is tied to the authenticated operator's license/ID and physical terminal.
- **FR-10.2 Citizen Informed Consent Protocol:** Dual-mode consent verification:
  - *Digital Mode:* Single-Use OTP sent to the citizen's mobile.
  - *Offline / No-Phone Mode:* Physical signed/thumbprinted Paper Consent Slip scanned and uploaded by the operator.
- **FR-10.3 Paper-to-Digital Logging:** Digitizes paper petitions received at the Panchayat office with physical slip cross-referencing.
- **FR-10.4 Printed Acknowledgment Slip:** Generates an immediate printable or SMS receipt with a short tracking code and QR code for the citizen.
- **FR-10.5 Anti-Exploitation Audit Trail:** Tracks operator fee compliance (zero-fee government services flagged if extortion is suspected) and transaction volumes per VLE to detect predatory bulk submissions.

### 10.3 State Machine (Assisted Session / Submission)
- `CITIZEN_IDENTIFIED` -> `CONSENT_VERIFIED` (OTP or Slip Upload) -> `DATA_CAPTURED` -> `SUBMITTED_TO_PIPELINE` -> `RECEIPT_ISSUED`.

### 10.4 Inputs and Outputs
- **Inputs:** `operator_id`, `citizen_identifier` (Mobile / Aadhaar-token / Name & Ward), `consent_method_enum`, `consent_artifact_url`, `target_module_code`, `payload_data`.
- **Outputs:** `assisted_transaction_id`, `proxy_audit_trail_record`, `printed_receipt_payload`.
