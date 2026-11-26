# Gram Vikas — Phase 0: Problem and Domain Analysis

**Document Reference:** `docs/phase-0/01_PROBLEM_AND_DOMAIN_ANALYSIS.md`  
**Project:** Gram Panchayat – Gram Vikas (Rural Governance & Civic Intelligence Platform)  
**Phase:** Phase 0 (Domain Modeling & Requirements Engineering)  
**Status:** Approved for Architecture Design  

---

## 1. Executive Summary & Domain Context

Gram Panchayats (GPs) form the bedrock of the 3-tier Panchayati Raj System in India, instituted by the 73rd Constitutional Amendment Act, 1992. As institutions of local self-government, Panchayats are mandated with the planning and implementation of schemes for economic development and social justice across 29 subjects listed in the Eleventh Schedule of the Constitution.

Despite substantial devolution of funds (via Central Finance Commissions, State Finance Commissions, MGNREGS, Swachh Bharat Mission, and Jal Jeevan Mission), rural citizens encounter severe operational friction in accessing basic governance services, monitoring public funds, and claiming welfare entitlements. The **Gram Vikas** platform bridges the gulf between rural citizens and Panchayat administration by creating an integrated, transparent, and accountable digital governance operating model tailored to the operational realities of Indian villages.

---

## 2. Real-World Pain Points of Village Citizens

Field assessments and rural governance studies reveal four structural bottlenecks that impede civic trust and administrative efficiency:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CORE VILLAGE GOVERNANCE CHOKEPOINTS                   │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                         │
          ▼                                         ▼
┌───────────────────────────────┐         ┌───────────────────────────────┐
│     1. Information Opaque     │         │   2. Opaque Grievance Redress │
│  - Sanctioned works hidden    │         │  - Verbal/untracked petitions │
│  - Fund diversion untracked   │         │  - No SLA, status, or closure │
│  - Citizens unaware of grants │         │  - Reprisal fear by elites    │
└───────────────────────────────┘         └───────────────────────────────┘
          │                                         │
          ▼                                         ▼
┌───────────────────────────────┐         ┌───────────────────────────────┐
│   3. Middleman Dependency     │         │   4. Welfare Inaccessibility  │
│  - Bribe & commission culture │         │  - Fragmented scheme portals  │
│  - "Dalal" captive access     │         │  - Criteria opacity           │
│  - Digital divide exploitation│         │  - Document rejection churn   │
└───────────────────────────────┘         └───────────────────────────────┘
```

### 2.1 Lack of Visibility into Panchayat Works & Expenditure
- **Unpublished Sanctions:** Sanctioned developmental works (e.g., CC road concreting, drainage, overhead tank maintenance) are rarely displayed on village notice boards in an accessible, understandable format.
- **Fund Allocation Disconnect:** Citizens cannot verify whether funds allocated under the 15th Finance Commission or State Finance Commission were expended on approved items or diverted.
- **Delayed Physical Verification:** Works are routinely recorded as "100% completed" on paper while ground realities reveal sub-standard materials, uncompleted stretches, or dry borewells.

### 2.2 Opaque Grievance Redressal
- **Verbal and Untracked Petitions:** Most village complaints are submitted verbally to the Sarpanch or written on loose sheets handed to the Panchayat Secretary (Sachiv). There is no reference number, receipt, or audit trail.
- **Absence of Accountability & SLAs:** Complaints languish for months without assigned accountability. Citizens must repeatedly visit the Panchayat office (often losing daily wages) to inquire about basic issues such as broken streetlights or leaking water pipelines.
- **Vulnerability to Retaliation:** Complainants from marginalized communities often face social ostracism or administrative neglect if their grievances target influential local figures.

### 2.3 Middleman (Dalal) Dependency & Digital Exclusion
- **Captive Access:** Citizens frequently depend on intermediaries (unauthorized brokers, local political fixers) who charge exorbitant "speed money" or service cuts to process government applications.
- **Digital Literacy Barrier:** While smartphones are increasingly common, complex multi-step government web portals, language barriers, and non-intuitive UI exclude elder and illiterate villagers.
- **Device & Connectivity Gaps:** Sporadic electricity, low network bandwidth (2G/3G speeds or frequent outages), and shared family devices make individual portal registrations cumbersome.

### 2.4 Inaccessible Scheme Eligibility & Application Blindness
- **Information Silos:** Information on central, state, and district welfare schemes (PMAY-G, PM-Kisan, Old Age Pension, Sukanya Samriddhi, Ration Card transfers) is scattered across disconnected departmental portals.
- **Eligibility Confusion:** Citizens do not know whether they qualify based on landholding caps, caste category criteria, or BPL survey status.
- **Document Rejection Churn:** Applications are rejected due to missing certificates (caste, income, land patta) without prior guidance, requiring endless rounds between Tehsil/Taluk and Panchayat offices.

---

## 3. Statutory vs. Digital Advisory Boundaries

A critical requirement in civic technology engineering is maintaining strict adherence to constitutional and statutory frameworks. The Gram Vikas platform does not supersede statutory bodies; it empowers and informs them.

| Governance Dimension | Statutory / Legal Framework (Panchayati Raj Act) | Gram Vikas Digital Platform Boundary |
| :--- | :--- | :--- |
| **Gram Sabha Authority** | Sole legal body under Article 243A of the Constitution; passes binding resolutions, approves budgets, and conducts mandatory Social Audits. | **Pre-Sabha Agenda Dissemination & Citizen Suggestions:** Publishes official agendas in advance, collects citizen inputs, and records outcomes. |
| **Voting & Decision Making** | In-person voting/show of hands by registered electors present at the officially notified Gram Sabha meeting with requisite quorum. | **Digital Advisory Polls (Non-Binding):** Gauges civic sentiment on community priorities (e.g., "Which road needs urgent paving?"). Explicitly flagged as **"Advisory Sentiment Only — Not a Constitutional Vote"**. |
| **Administrative Approvals** | Official administrative & financial sanctions (AS/FS) issued exclusively by Block Development Officer (BDO), District Panchayat Officer (DPO), and Sachiv/Sarpanch joint signatures. | **Tracking & Visibility Engine:** Captures metadata, sanction orders, milestone progression, and geotagged photographic verification for public scrutiny. |
| **Statutory Record Keeping** | Physical Gram Sabha Register signed by attendees, official cash book, and e-GramSwaraj statutory accounting entries. | **Digital Public Mirror & Verification Log:** Mirrors resolution texts, extracts action items, tracks implementation milestones, and alerts citizens of progress. |

### 3.1 Non-Statutory Advisory Polls Policy
- Digital polls conducted via the platform serve solely as **Civic Decision Support Systems (CDSS)** for Ward Members and the Sarpanch.
- Every digital survey/poll displayed in the UI must display a mandatory statutory disclaimer:
  > *"This digital poll is an advisory consultative tool to record community priorities. In accordance with State Panchayati Raj Rules, all formal sanctions, resource allocations, and statutory resolutions must be deliberated and passed in the official physical Gram Sabha meeting."*

---

## 4. Privacy Boundaries: Public Auditability vs. Citizen Confidentiality

The platform operates on a **Bifurcated Transparency Architecture**: public data must be radically transparent to eliminate corruption, while personal data must be strictly secured to protect citizen dignity and safety.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 BIFURCATED TRANSPARENCY ARCHITECTURE                        │
├─────────────────────────────────────────┬───────────────────────────────────┤
│    PUBLIC AUDITABLE DATA (OPEN)         │  CONFIDENTIAL CITIZEN DATA (SECURE│
├─────────────────────────────────────────┼───────────────────────────────────┤
│ • Panchayat Annual Budgets & Outlays    │ • Citizen Grievance Narratives    │
│ • Sanctioned Works & Contractor Bids    │ • Complainant Identity & Mobile   │
│ • Line-Item Expenditure & Vouchers      │ • Scheme Application Details      │
│ • Village Asset Health (Borewells, etc.)│ • Income, Caste, Landholding Docs │
│ • Service Quality Indices & Outages     │ • Assisted Operator Consent Logs  │
│ • Approved Gram Sabha Meeting Minutes   │ • Internal Audit Disciplinary Logs│
└─────────────────────────────────────────┴───────────────────────────────────┘
```

### 4.1 Public Auditable Data (Unrestricted Village Ledger)
All community infrastructure and public finance data must be viewable by any resident without authentication barriers:
1. **Public Works & Sanction Ledger:** Project name, sanction order number, sanctioning authority, sanctioned budget amount, funding source (15th FC, SBM, MGNREGS), contractor name, start date, target completion date.
2. **Line-Item Expenditures:** Work milestone disbursements, vendor payments, materials procurement summaries, and public verification photo logs.
3. **Village Asset & Service Health:** Geo-locations of public borewells, water purification plants (RO plants), street transformers, community toilets, and current operational uptime/downtime status.
4. **Gram Sabha Notifications & Minutes:** Dates of upcoming meetings, published agendas, quorum requirements, and final signed resolutions approved in the physical meeting.

### 4.2 Confidential Citizen Data (Role-Restricted & Masked)
To safeguard citizens against retaliation, economic fraud, and stigmatization, the following data must never appear in public registries:
1. **Grievance Particulars:** Detailed grievance description, supporting audio/documents, complainant name, mobile number, and specific house location. Public views display only aggregated metrics (e.g., *"Ward 3: 4 Water Supply Complaints Pending"*).
2. **Welfare Scheme Submissions:** Beneficiary income declarations, caste certificates, landholding (Khata/Patta) records, bank account details (IFSC, Account Number), and Aadhaar/Identity tokens.
3. **Whistleblower & Audit Evidence:** Submissions highlighting corruption, fund embezzlement, or material quality fraud are restricted exclusively to the Block Development Officer (BDO) and designated audit teams.
4. **Data Masking Rules:** 
   - Phone numbers must be masked in administrative views except for the designated investigating officer (e.g., `+91-XXXXX-12345`).
   - Personally Identifiable Information (PII) is encrypted at rest and excluded from search indexes.

---

## 5. Village Operating Constraints & Engineering Assumptions

1. **Intermittent Connectivity (Offline-First Expectation):** Remote hamlets experience frequent cellular dead zones. The mobile and assisted interfaces must cache forms and sync transactions upon signal recovery.
2. **Shared Family Hardware:** Multiple family members often share a single smartphone. Identity architectures must support multi-profile access or OTP-based delegated access.
3. **Intermediary Assistance (VLE / Panchayat Sahayak):** Between 40% to 60% of village elders and marginalized citizens will interact with the system via a village-level operator (CSC operator or Panchayat Assistant). The system must preserve clear operator accountability and citizen consent.
4. **Multi-Panchayat Scaling on a Shared Core:** The platform is designed as a **Multi-Tenant Modular Monolith**, allowing a Block or District to host dozens of Panchayats with strict cryptographic and database tenant isolation.

---

## 6. Document Sign-Off & Phase 0 Alignment
This analysis provides the formal domain foundation for:
- Module functional decomposition (`docs/phase-0/02_MODULE_SPECIFICATIONS.md`)
- Cross-system data choreography (`docs/phase-0/03_INTER_MODULE_WORKFLOWS.md`)
- Multi-tier RBAC rules (`docs/phase-0/04_ACTOR_ROLES_AND_RBAC_MATRIX.md`)
- Relational schema foundations (`docs/phase-0/05_DOMAIN_ENTITY_DICTIONARY.md`)
