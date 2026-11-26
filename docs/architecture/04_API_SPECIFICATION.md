# Gram Vikas — Phase 1: REST API Specification

**Document Reference:** `docs/phase-1/04_API_SPECIFICATION.md`  
**Project:** Gram Panchayat – Gram Vikas (Rural Governance & Civic Intelligence Platform)  
**Phase:** Phase 1 (System Architecture & Database Design)  
**Status:** Approved for Implementation Design  

---

## 1. Global API Conventions & Standards

### 1.1 Base URL & Versioning
- All endpoints are versioned under: `/api/v1/`
- Payload serialization format: `application/json`

### 1.2 Global Request Headers

| Header Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | String | Conditional | Bearer JWT token (`Bearer <token>`). Required for all protected routes. |
| `X-Panchayat-ID`| UUID | Yes (Except Auth) | The target Gram Panchayat UUID scope. Enforces tenant isolation. |
| `Content-Type`  | String | Yes (for POST/PUT/PATCH) | `application/json` or `multipart/form-data` (file uploads). |

### 1.3 Standard Response Format

#### Success Envelope (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142
  }
}
```

#### Error Envelope (`400`, `401`, `403`, `404`, `409`, `422`, `500`)
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Grievance ticket with ID 'd0000000-...' does not exist.",
    "details": []
  }
}
```

---

## 2. Module 1: Grievance Redressal Endpoints

### 2.1 `POST /api/v1/grievances`
Submit a new civic grievance ticket.
- **RBAC Roles Allowed:** `CITIZEN`, `ASSISTED_OPERATOR`, `WARD_MEMBER`, `PANCHAYAT_SECRETARY`
- **Request Body:**
  ```json
  {
    "wardId": "b0000000-0000-0000-0000-000000000001",
    "category": "DRINKING_WATER",
    "subCategory": "Pipeline Leak",
    "title": "Broken pipe flooding the main village square",
    "description": "Continuous freshwater leakage for 24 hours.",
    "geoLatitude": 18.35412,
    "geoLongitude": 73.86124,
    "priority": "HIGH",
    "isAssisted": false
  }
  ```
- **Responses:**
  - `201 Created`: Returns created `GrievanceTicket` object with generated `ticketNumber` and `slaDeadline`.
  - `400 Bad Request`: Validation failure (e.g., invalid category enum).
  - `403 Forbidden`: Mismatched `X-Panchayat-ID` or invalid citizen ward.

### 2.2 `GET /api/v1/grievances`
List grievances within the Panchayat with filtering and pagination.
- **RBAC Roles Allowed:** `CITIZEN` (Own only), `ASSISTED_OPERATOR` (Assisted only), `WARD_MEMBER` (Assigned ward only), `PANCHAYAT_SECRETARY`, `SARPANCH`, `BLOCK_OFFICER`, `SYSTEM_ADMIN`
- **Query Parameters:** `page=1`, `limit=20`, `status=IN_PROGRESS`, `wardId=<uuid>`, `category=DRINKING_WATER`
- **Responses:**
  - `200 OK`: Array of grievance summary records.

### 2.3 `PATCH /api/v1/grievances/{id}/triage`
Triage ticket, adjust priority, and assign to a field worker.
- **RBAC Roles Allowed:** `PANCHAYAT_SECRETARY`, `SARPANCH`
- **Request Body:**
  ```json
  {
    "assignedToUserId": "c0000000-0000-0000-0000-000000000004",
    "priority": "HIGH",
    "notes": "Assigned to Ward Member Anand Rao to coordinate with pump technician."
  }
  ```
- **Responses:**
  - `200 OK`: Updated ticket state (`ASSIGNED`).
  - `404 Not Found`: Ticket does not exist.

### 2.4 `PATCH /api/v1/grievances/{id}/resolve`
Submit official resolution notes and photo evidence of completed work.
- **RBAC Roles Allowed:** `PANCHAYAT_SECRETARY`, `SARPANCH`, `WARD_MEMBER`
- **Request Body:**
  ```json
  {
    "resolutionSummary": "Replaced cracked 3-inch PVC coupler and pressure tested pipeline.",
    "resolutionPhotoUrl": "https://storage.gramvikas.in/evidence/grv001-fix.jpg"
  }
  ```
- **Responses:**
  - `200 OK`: State transitions to `RESOLVED`. Triggers citizen verification notification timer.

### 2.5 `POST /api/v1/grievances/{id}/verify`
Citizen approves resolution or reopens disputed ticket.
- **RBAC Roles Allowed:** `CITIZEN` (Complainant), `ASSISTED_OPERATOR` (On behalf of citizen)
- **Request Body:**
  ```json
  {
    "decision": "ACCEPT", // or "REOPEN"
    "rating": 5, // Optional (1-5) if ACCEPT
    "rejectionReason": "" // Required if REOPEN
  }
  ```
- **Responses:**
  - `200 OK`: State transitions to `CITIZEN_VERIFIED` or `REOPENED`.

---

## 3. Module 2: Scheme Intelligence Endpoints

### 3.1 `GET /api/v1/schemes`
Retrieve the welfare scheme catalog.
- **RBAC Roles Allowed:** Public (Anyone)
- **Query Parameters:** `sponsorLevel=CENTRAL_GOVERNMENT`, `search=housing`
- **Responses:**
  - `200 OK`: List of active schemes with summary benefits.

### 3.2 `POST /api/v1/schemes/check-eligibility`
Evaluate citizen demographic profile against all active scheme rules.
- **RBAC Roles Allowed:** Public / Any Authenticated User
- **Request Body:**
  ```json
  {
    "age": 42,
    "gender": "FEMALE",
    "casteCategory": "OBC",
    "annualHouseholdIncome": 120000,
    "landholdingAcres": 1.5,
    "hasBplCard": true
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "eligibleSchemes": [
        {
          "schemeId": "e0000000-0000-0000-0000-000000000001",
          "schemeCode": "PMAY-G",
          "title": "Pradhan Mantri Awaas Yojana - Gramin",
          "matchStatus": "FULLY_ELIGIBLE",
          "requiredDocuments": ["Aadhaar Card", "Bank Passbook Copy", "BPL Certificate"]
        }
      ]
    }
    ```

### 3.3 `POST /api/v1/schemes/{id}/apply`
Submit a welfare scheme application.
- **RBAC Roles Allowed:** `CITIZEN`, `ASSISTED_OPERATOR`
- **Request Body:**
  ```json
  {
    "isAssisted": true,
    "assistedOperatorId": "c0000000-0000-0000-0000-000000000005"
  }
  ```
- **Responses:**
  - `201 Created`: Returns `SchemeApplication` with `applicationNumber` and status `SUBMITTED_TO_PANCHAYAT`.

---

## 4. Module 3: Development & Expenditure Tracking Endpoints

### 4.1 `GET /api/v1/projects`
List public works projects and budget allocations.
- **RBAC Roles Allowed:** Public (Anyone)
- **Query Parameters:** `status=IN_PROGRESS`, `fundingSource=FIFTEENTH_FINANCE_COMMISSION`
- **Responses:**
  - `200 OK`: Array of `DevelopmentProject` records with cumulative expenditure aggregates.

### 4.2 `POST /api/v1/projects`
Record a new administrative sanction for a civil development project.
- **RBAC Roles Allowed:** `PANCHAYAT_SECRETARY`, `SARPANCH`
- **Request Body:**
  ```json
  {
    "wardId": "b0000000-0000-0000-0000-000000000002",
    "title": "Construction of Concrete Drain in Ward 2",
    "workType": "DRAINAGE_CONSTRUCTION",
    "fundingSource": "FIFTEENTH_FINANCE_COMMISSION",
    "sanctionOrderNumber": "SAN/15FC/HAV/2026/102",
    "sanctionDate": "2026-02-10",
    "sanctionedBudget": 250000.00,
    "contractorName": "Sai Krupa Builders",
    "contractorPhone": "9822334455",
    "targetStartDate": "2026-03-01",
    "targetCompletionDate": "2026-05-31"
  }
  ```
- **Responses:**
  - `201 Created`: Project initialized in `SANCTIONED` status.

### 4.3 `POST /api/v1/projects/{id}/vouchers`
Record an expenditure voucher against a project milestone.
- **RBAC Roles Allowed:** `PANCHAYAT_SECRETARY` (with Sarpanch co-signature)
- **Request Body:**
  ```json
  {
    "milestoneId": "f1000000-0000-0000-0000-000000000001",
    "voucherNumber": "VCH-2026-0104",
    "voucherDate": "2026-03-05",
    "payeeName": "Sai Krupa Builders",
    "amount": 75000.00,
    "paymentMode": "PFMS_DIRECT_TRANSFER",
    "invoiceScanUrl": "https://storage.gramvikas.in/vouchers/vch104.pdf",
    "coSignedBySarpanchId": "c0000000-0000-0000-0000-000000000002"
  }
  ```
- **Responses:**
  - `201 Created`: Voucher recorded. Emits `EXPENDITURE_VOUCHER_LOGGED` event.

### 4.4 `GET /api/v1/expenditure/summary`
Public dashboard summary of fund utilization across funding streams.
- **RBAC Roles Allowed:** Public (Anyone)
- **Responses:**
  - `200 OK`:
    ```json
    {
      "panchayatId": "a0000000-0000-0000-0000-000000000001",
      "totalSanctionedBudget": 750000.00,
      "totalDisbursedAmount": 195000.00,
      "utilizationRatePercent": 26.0,
      "fundingBreakdown": [
        {
          "source": "FIFTEENTH_FINANCE_COMMISSION",
          "allocated": 750000.00,
          "disbursed": 195000.00
        }
      ]
    }
    ```

---

## 5. Module 4: Gram Sabha Participation Endpoints

### 5.1 `GET /api/v1/gram-sabha/meetings`
List scheduled and completed Gram Sabha meetings.
- **RBAC Roles Allowed:** Public (Anyone)
- **Responses:**
  - `200 OK`: Array of `GramSabhaMeeting` objects.

### 5.2 `POST /api/v1/gram-sabha/suggestions`
Submit a citizen suggestion for an upcoming Gram Sabha agenda.
- **RBAC Roles Allowed:** `CITIZEN`, `ASSISTED_OPERATOR`
- **Request Body:**
  ```json
  {
    "wardId": "b0000000-0000-0000-0000-000000000001",
    "title": "Need Solar Streetlights on Shindewadi Road",
    "description": "Wild boar attacks reported at night; need lighting for safety."
  }
  ```
- **Responses:**
  - `201 Created`: Suggestion created in `SUBMITTED` status.

### 5.3 `GET /api/v1/gram-sabha/polls`
List active advisory sentiment polls.
- **RBAC Roles Allowed:** Public (Anyone)
- **Responses:**
  - `200 OK`: Active polls with disclaimer (*"Advisory sentiment only — Not a statutory vote"*).

### 5.4 `POST /api/v1/gram-sabha/polls/{id}/vote`
Cast a citizen advisory vote on a community priority.
- **RBAC Roles Allowed:** `CITIZEN`
- **Request Body:**
  ```json
  {
    "selectedOptionIndex": 0
  }
  ```
- **Responses:**
  - `200 OK`: Vote recorded.
  - `409 Conflict`: Citizen has already voted in this poll.

---

## 6. Module 5: Service Quality Monitoring Endpoints

### 6.1 `GET /api/v1/service-quality/health`
Get live utility operational health per ward (Drinking Water, Sanitation, Lights).
- **RBAC Roles Allowed:** Public (Anyone)
- **Responses:**
  - `200 OK`: Array of ward status indicators (`OPTIMAL`, `HEALTH_DEGRADED`, `CRITICAL_OUTAGE`).

### 6.2 `POST /api/v1/service-quality/logs`
Submit daily utility operational log.
- **RBAC Roles Allowed:** `PANCHAYAT_SECRETARY`, `WARD_MEMBER`
- **Request Body:**
  ```json
  {
    "wardId": "b0000000-0000-0000-0000-000000000001",
    "serviceType": "DRINKING_WATER",
    "logDate": "2026-03-02",
    "metricNumeric1": 2.5,
    "metricBoolean1": true,
    "activeReportedFaults": 1
  }
  ```
- **Responses:**
  - `201 Created`: Log registered. If threshold exceeded, triggers `COMPLAINT_CLUSTERED`.

---

## 7. Module 6: Development Verification Endpoints

### 7.1 `POST /api/v1/verification/submit`
Submit photographic audit evidence for a project milestone.
- **RBAC Roles Allowed:** `CITIZEN`, `WARD_MEMBER`, `BLOCK_OFFICER`
- **Request Body:**
  ```json
  {
    "projectId": "f0000000-0000-0000-0000-000000000001",
    "milestoneId": "f1000000-0000-0000-0000-000000000002",
    "geoLatitude": 18.35410,
    "geoLongitude": 73.86120,
    "photoUrls": ["https://storage.gramvikas.in/evidence/photo1.jpg"],
    "observations": "Concrete surface cracking visible after 2 days; no water curing applied.",
    "rating": "DEFECTIVE",
    "auditVarianceFlag": true
  }
  ```
- **Responses:**
  - `201 Created`: Verification recorded. If `auditVarianceFlag == true`, emits `CITIZEN_VERIFICATION_SUBMITTED` to freeze disbursement and notify the Block Officer.

---

## 8. Module 7: Infrastructure & Water Asset Endpoints

### 8.1 `GET /api/v1/assets`
List village infrastructure assets with health status and GPS coordinates.
- **RBAC Roles Allowed:** Public (Anyone)
- **Query Parameters:** `category=TUBE_WELL_BOREWELL`, `healthStatus=OPERATIONAL`
- **Responses:**
  - `200 OK`: Array of `VillageAsset` records.

### 8.2 `POST /api/v1/assets/{id}/report-damage`
Report a breakdown on an infrastructure asset.
- **RBAC Roles Allowed:** `CITIZEN`, `WARD_MEMBER`, `PANCHAYAT_SECRETARY`
- **Request Body:**
  ```json
  {
    "issueDescription": "Submersible motor burned out; zero discharge from delivery pipe.",
    "photoUrl": "https://storage.gramvikas.in/evidence/borewell-smoke.jpg"
  }
  ```
- **Responses:**
  - `201 Created`: Asset health transitions to `OUT_OF_SERVICE`. Emits `ASSET_DAMAGED` event to auto-create high-priority grievance in Module 1.

---

## 9. Module 8: Village Opportunity Exchange Endpoints

### 9.1 `GET /api/v1/opportunities`
List active local work, SHG showcases, and training notices.
- **RBAC Roles Allowed:** Public (Anyone)
- **Query Parameters:** `listingType=SHG_PRODUCT_SHOWCASE`
- **Responses:**
  - `200 OK`: Active opportunity listings.

### 9.2 `POST /api/v1/opportunities`
Post a local product or work vacancy listing.
- **RBAC Roles Allowed:** `CITIZEN`, `WARD_MEMBER`, `PANCHAYAT_SECRETARY`
- **Request Body:**
  ```json
  {
    "listingType": "SHG_PRODUCT_SHOWCASE",
    "title": "Bhimashankar Honey & Amla Candy",
    "description": "Pure forest honey collected by tribal SHG members.",
    "priceOrWageDescription": "Rs. 350 per 500g bottle",
    "contactPerson": "Asha Kamble",
    "contactPhone": "9822445566",
    "expiresInDays": 30
  }
  ```
- **Responses:**
  - `201 Created`: Listing submitted.

---

## 10. Module 9: Village Communication Endpoints

### 10.1 `GET /api/v1/notices`
Public stream of official announcements, notices, and weather alerts.
- **RBAC Roles Allowed:** Public (Anyone)
- **Query Parameters:** `urgencyLevel=EMERGENCY_WEATHER_HEALTH`
- **Responses:**
  - `200 OK`: Array of `BroadcastNotice` items.

### 10.2 `POST /api/v1/notices`
Publish an official Panchayat notification.
- **RBAC Roles Allowed:** `PANCHAYAT_SECRETARY`, `SARPANCH`, `BLOCK_OFFICER`
- **Request Body:**
  ```json
  {
    "targetWardId": null,
    "title": "Pulse Polio Immunization Booth at Primary Health Sub-Centre",
    "bodyText": "All parents with children aged 0-5 years are requested to bring them for polio drops this Sunday between 8 AM and 4 PM.",
    "urgencyLevel": "IMPORTANT_ADVISORY",
    "noticeCategory": "HEALTH_CAMP",
    "expiresAt": "2026-03-15T18:00:00Z"
  }
  ```
- **Responses:**
  - `201 Created`: Notice published to public feed.

---

## 11. Module 10: Assisted Digital Access Endpoints

### 11.1 `POST /api/v1/assisted/sessions`
Initiate an assisted proxy session and record citizen consent.
- **RBAC Roles Allowed:** `ASSISTED_OPERATOR` (VLE / CSC)
- **Request Body:**
  ```json
  {
    "citizenName": "Kashinath Dnyandeo Patil",
    "citizenMobile": "9822881122",
    "citizenWardId": "b0000000-0000-0000-0000-000000000001",
    "consentMethod": "PHYSICAL_SIGNED_SLIP_UPLOAD",
    "consentArtifactUrl": "https://storage.gramvikas.in/consent/slip-kpatil.pdf",
    "targetModule": "MODULE_1_GRIEVANCE",
    "targetRecordId": "d0000000-0000-0000-0000-000000000001",
    "serviceFeeCharged": 0.00
  }
  ```
- **Responses:**
  - `201 Created`:
    ```json
    {
      "sessionId": "m0000000-0000-0000-0000-000000000001",
      "receiptTrackingToken": "TK-2026-SHV-0042",
      "printReceiptPayload": {
        "panchayatName": "Shivapur Gram Panchayat",
        "citizenName": "Kashinath Dnyandeo Patil",
        "trackingToken": "TK-2026-SHV-0042",
        "timestamp": "2026-03-02T10:30:00Z"
      }
    }
    ```

### 11.2 `GET /api/v1/assisted/track/{token}`
Public lookup for an assisted submission status using physical receipt token.
- **RBAC Roles Allowed:** Public (Anyone with token)
- **Responses:**
  - `200 OK`: Returns current stage, assigned officer, and SLA status without exposing private PII.

---

## 12. Cross-Cutting Audit Endpoints

### 12.1 `GET /api/v1/audit/logs`
Retrieve system audit trail records for compliance and vigilance.
- **RBAC Roles Allowed:** `BLOCK_OFFICER`, `SYSTEM_ADMIN`
- **Query Parameters:** `entityType=DevelopmentProject`, `page=1`, `limit=50`
- **Responses:**
  - `200 OK`: Array of audit records containing actor, role, delta, and IP address.
