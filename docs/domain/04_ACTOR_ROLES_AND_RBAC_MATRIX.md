# Gram Vikas — Phase 0: Actor Roles, Jurisdiction & RBAC Matrix

**Document Reference:** `docs/phase-0/04_ACTOR_ROLES_AND_RBAC_MATRIX.md`  
**Project:** Gram Panchayat – Gram Vikas  
**Phase:** Phase 0 (Domain Modeling & Requirements Engineering)  
**Status:** Approved for Architecture Design  

---

## 1. Actor Role Hierarchy & Scope

The platform models the authentic institutional hierarchy of the Indian rural governance structure. Seven distinct actors operate across four jurisdiction levels:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GOVERNANCE JURISDICTION HIERARCHY                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
  [SYSTEM_ADMIN]           ──► System-Wide (Multi-District / State-Wide)
                                       │
                                       ▼
  [BLOCK_OFFICER (BDO)]    ──► Block / Taluk Level (Multiple Panchayats)
                                       │
                                       ▼
  [SARPANCH / SACHIV]      ──► Gram Panchayat Level (Single Panchayat)
                                       │
                                       ▼
  [WARD_MEMBER]            ──► Ward Level (Single Ward in a Panchayat)
                                       │
                                       ▼
  [CITIZEN / ASSISTED_OP]  ──► Citizen / Household Level (Ward Bound)
```

### 1.1 Detailed Actor Definitions

1. **`CITIZEN`**
   - **Description:** A verified or anonymous resident of a Gram Panchayat ward.
   - **Primary Actions:** Submit grievances, check scheme eligibility, review public expenditures, view asset health, submit Gram Sabha suggestions, participate in advisory polls, upload photographic development verification, view broadcast notices.
   - **Data Scope:** Read access to all public ledgers; Write/Read access restricted exclusively to own personal submissions.

2. **`ASSISTED_OPERATOR` (VLE / CSC Operator / Panchayat Sahayak)**
   - **Description:** Authorized village intermediary operating a digital access point for illiterate, elderly, or offline citizens.
   - **Primary Actions:** Ingest grievances, perform scheme checks, draft applications, upload consent tokens (OTP or physical slip), print receipts.
   - **Data Scope:** Access to own assisted transaction sessions and assigned ward/panchayat intake. Cannot access private administrative discussions or other operators' fee logs.

3. **`WARD_MEMBER`**
   - **Description:** Elected representative of a specific electoral ward within the Gram Panchayat.
   - **Primary Actions:** Review all grievances within their assigned ward, monitor ward assets and service quality, submit ward infrastructure priorities, mobilize citizens for Gram Sabha meetings.
   - **Data Scope:** Read/Write within assigned `ward_id` and general read on Panchayat-wide public ledgers.

4. **`PANCHAYAT_SECRETARY` (Sachiv)**
   - **Description:** Executive government official appointed by the State Panchayati Raj Department; administrative custodian of Panchayat records, accounts, and sanctions.
   - **Primary Actions:** Triage and assign grievances, record project sanctions and milestone payments, draft Gram Sabha agendas and minutes, publish official notices, manage village asset registry.
   - **Data Scope:** Full CRUD across all operational records within their assigned `panchayat_id`.

5. **`SARPANCH`**
   - **Description:** Elected political executive head (President) of the Gram Panchayat.
   - **Primary Actions:** Co-sign work sanctions and milestone approvals, review escalated grievances, chair Gram Sabha sessions, review village service health, authorize public emergency broadcasts.
   - **Data Scope:** Executive oversight and approval authority across their assigned `panchayat_id`.

6. **`BLOCK_OFFICER` (Block Development Officer - BDO / District Auditor)**
   - **Description:** Sub-district administrative authority supervising 20–60 Gram Panchayats.
   - **Primary Actions:** Review escalated SLA-breached grievances, inspect project audit variance flags raised by citizens, review fund utilization across Panchayats, initiate formal administrative audits.
   - **Data Scope:** Cross-Panchayat supervisory read/audit access scoped strictly within their assigned `block_id`.

7. **`SYSTEM_ADMIN`**
   - **Description:** Technical platform administrator (State/NIC/District IT cell).
   - **Primary Actions:** Provision new Panchayats/Blocks, manage role assignments, maintain master scheme rules, configure system SLA timers, inspect system audit logs.
   - **Data Scope:** System-wide infrastructure operations; zero direct access to private citizen grievance narratives without audit justification.

---

## 2. Multi-Panchayat & Ward Jurisdiction Rules

To prevent data leaks, unauthorized approvals, and inter-village conflict, strict multi-tenancy rules are enforced at every request boundary:

### Rule 2.1: Multi-Tenancy Scoping (Panchayat Isolation)
- Every transaction, record, and query (with the exception of global scheme rules) is scoped by `panchayat_id`.
- **Enforcement Principle:** The Panchayat Secretary or Sarpanch of Panchayat A (`GP-001`) has zero read or write authority over Panchayat B (`GP-002`). Any cross-panchayat data access request produces an immediate HTTP 403 Forbidden and triggers an unauthorized access security audit log.

### Rule 2.2: Ward Sub-Scoping
- A `WARD_MEMBER` is strictly scoped by `ward_id`. They can triage or review grievances and asset states located in Ward 3, but cannot alter assignments or status of tickets in Ward 4.

### Rule 2.3: Block Officer Hierarchy
- A `BLOCK_OFFICER` possesses read and audit privileges over all Panchayats where `panchayat.block_id == officer.block_id`. They cannot approve internal Panchayat payment vouchers, preserving local self-government autonomy.

---

## 3. Comprehensive RBAC CRUD Matrix

**Legend:**
- **C:** Create
- **R:** Read (Public = anyone; Own = creator only; Ward = within ward; GP = within panchayat; Block = within block)
- **U:** Update / Edit
- **D:** Delete / Soft Delete / Archive
- **S:** Change Operational State (e.g. Approve, Sanction, Escalate, Reopen)
- **-:** No Access

| Module & Domain Entity | CITIZEN | ASSISTED_OP | WARD_MEMBER | SACHIV | SARPANCH | BLOCK_OFFICER | SYS_ADMIN |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Mod 1: Grievance Ticket** | C, R(Own), S(Reopen/Verify) | C(Proxy), R(Assisted) | R(Ward), U(Notes) | C, R(GP), U, S(Triage/Assign/Resolve) | R(GP), S(Escalate/Review) | R(Block), S(AuditEscalate) | R(AuditOnly) |
| **Mod 2: Scheme Eligibility** | R(Public), C(Draft) | C(Assisted), R(Public) | R(Public) | R(GP), C(LocalScheme) | R(GP) | R(Block) | C, R, U, D(Global) |
| **Mod 2: Scheme Application** | C, R(Own), U(OwnDraft) | C(Proxy), R(Assisted) | R(WardAggregates) | R(GP), U(Verify), S | R(GP), S(Endorse) | R(Block), S(Sanction) | R(AuditOnly) |
| **Mod 3: Work Sanction & Budget** | R(Public) | R(Public) | R(GP), C(Proposal) | C, R(GP), U, S(Draft) | R(GP), S(Approve/Sanction)| R(Block), S(Review) | R(AuditOnly) |
| **Mod 3: Expenditure Voucher** | R(Public) | R(Public) | R(GP) | C, R(GP), U, S(Disburse)| R(GP), S(Co-sign) | R(Block), S(AuditFlag) | R(AuditOnly) |
| **Mod 4: Gram Sabha Meeting** | R(Public) | R(Public) | R(GP), C(AgendaItem) | C, R(GP), U, S(Schedule)| R(GP), S(Convene/Sign) | R(Block) | R(AuditOnly) |
| **Mod 4: Citizen Suggestion** | C, R(Own), U(Draft) | C(Proxy), R(Assisted) | R(Ward), S(Endorse) | R(GP), S(TableToAgenda)| R(GP), S(Review) | R(Block) | R(AuditOnly) |
| **Mod 4: Advisory Poll** | R(Public), S(Vote) | R(Public), S(ProxyVote)| R(GP), S(Vote) | C, R(GP), S(Launch/Close)| R(GP), S(Authorize) | R(Block) | R(AuditOnly) |
| **Mod 5: Service Quality Log** | R(Public), C(Feedback)| R(Public) | C, R(Ward), U | C, R(GP), U | R(GP) | R(Block) | R(AuditOnly) |
| **Mod 6: Dev Verification Photo**| C, R(Public) | C(Proxy), R(Public) | C, R(Ward) | R(GP), S(VerifyAccept) | R(GP) | R(Block), S(FlagVariance)| R(AuditOnly) |
| **Mod 7: Infrastructure Asset** | R(Public), C(ReportFault)| R(Public) | R(Ward), C(Report) | C, R(GP), U, S(Status) | R(GP), S(ApproveMaint) | R(Block) | R(AuditOnly) |
| **Mod 8: Opportunity Listing** | C(Own), R(Public), U(Own)| C(Proxy), R(Public) | R(Public) | R(GP), S(Moderate/Approve)| R(GP) | R(Block) | R(AuditOnly) |
| **Mod 9: Broadcast Notice** | R(Public) | R(Public) | R(GP), C(Draft) | C, R(GP), U, S(Publish) | R(GP), S(AuthorizeEmergency)| C, R(Block), S | R(AuditOnly) |
| **Mod 10: Assisted Session Log**| - | C, R(Own), S(Consent) | - | R(GP) | - | R(BlockAudit) | R(AuditOnly) |

---

## 4. Privacy Boundaries & Field-Level Masking Rules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FIELD-LEVEL PRIVACY SCATTERGRAM                       │
├──────────────────────────┬──────────────────────────────────────────────────┤
│ Public Read Level        │ Project Name, Sanction Cost, Contractor Name,   │
│                          │ Asset GPS Coordinates, Gram Sabha Minutes,       │
│                          │ Service Outage Aggregates, SHG Catalog           │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ Administrative Only      │ Complainant Name, Full Phone Number,            │
│                          │ Contractor Bank IFSC, VLE Commission Logs        │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ Confidential / Masked    │ Citizen Aadhaar Token, Bank Account Number,      │
│                          │ Annual Household Income, Caste Certificate Scan, │
│                          │ Whistleblower Identity / Protected Evidence      │
└──────────────────────────┴──────────────────────────────────────────────────┘
```

1. **Aadhaar / National ID Storage Ban:** The system NEVER stores raw 12-digit Aadhaar numbers. If required by government scheme guidelines, only the last 4 digits (`XXXX-XXXX-1234`) and a secure cryptographic hash/token are held.
2. **Citizen Phone Masking:** In all open or semi-public administrative dashboards, citizen contact numbers are masked (e.g., `+91-98765-XXXXX`). Unmasking is restricted to the specific officer assigned to resolve the grievance.
3. **Whistleblower Protection:** Any citizen submitting corruption evidence in Module 6 can flag the submission as `CONFIDENTIAL_AUDIT_EVIDENCE`. In this state, the complainant’s identity is visible only to the `BLOCK_OFFICER` and completely masked from the Sarpanch and Sachiv.

---

## 5. Security & Session Integrity Controls

1. **Role-Based Token Claims:** User sessions are verified via JSON Web Tokens (JWT) containing cryptographically signed claims for `user_id`, `role`, `panchayat_id`, and `ward_id`.
2. **Re-Authentication for Financial Triggers:** When a Sachiv or Sarpanch authorizes a financial milestone voucher disbursement in Module 3, a secondary one-time verification password or SMS OTP is mandatory.
3. **Immutable Audit Trail:** All state transitions (e.g., changing a grievance from `IN_PROGRESS` to `RESOLVED`, or publishing a Gram Sabha resolution) record the actor ID, IP address, timestamp, and previous-to-current delta in an append-only audit log.
