# Gram Vikas — Phase 1: System Architecture

**Document Reference:** `docs/phase-1/01_SYSTEM_ARCHITECTURE.md`  
**Project:** Gram Panchayat – Gram Vikas (Rural Governance & Civic Intelligence Platform)  
**Phase:** Phase 1 (System Architecture & Database Design)  
**Status:** Approved for Implementation Design  

---

## 1. Architectural Philosophy: The Modular Monolith

Gram Vikas is architected as a **Modular Monolith** implemented in **Node.js + Express + TypeScript**. 

### 1.1 Rationale for Modular Monolith over Microservices
1. **Team Size & Velocity:** Designed for a 2–3 developer team delivering the platform within 6 weeks. A modular monolith provides strong compile-time type boundaries without the operational overhead of microservices (distributed tracing, network partitions, multi-repo CI/CD, Kubernetes).
2. **ACID Transaction Guarantees:** Cross-module operations (such as approving a Gram Sabha resolution while initiating a development project and dispatching an administrative task) can be executed inside PostgreSQL ACID transactions, eliminating distributed 2-phase commit complexity.
3. **Low Infrastructure Overhead:** A single containerized Node.js process with a PostgreSQL instance can run cost-effectively on entry-level cloud infrastructure or on-premise District e-Governance servers.
4. **Clean Boundary Enforcement:** Modules encapsulate their domain models, repositories, and business logic. Cross-module communication occurs strictly via defined service interfaces or through an in-process typed Domain Event Bus.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GRAM VIKAS MODULAR MONOLITH                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                           HTTP / REST API Gateway                           │
│  [Tenant Middleware] ──► [Auth / RBAC Middleware] ──► [Audit Logger]        │
├─────────────────────────────────────────────────────────────────────────────┤
│                             DOMAIN MODULES                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                   │
│  │ Module 1: Grievance     │  │ Module 2: Schemes       │                   │
│  ├─────────────────────────┤  ├─────────────────────────┤                   │
│  │ Module 3: Expenditure   │  │ Module 4: Gram Sabha    │                   │
│  ├─────────────────────────┤  ├─────────────────────────┤                   │
│  │ Module 5: Service Qual  │  │ Module 6: Dev Verify    │                   │
│  ├─────────────────────────┤  ├─────────────────────────┤                   │
│  │ Module 7: Infra Assets  │  │ Module 8: Opportunity   │                   │
│  ├─────────────────────────┤  ├─────────────────────────┤                   │
│  │ Module 9: Communication │  │ Module 10: Assisted     │                   │
│  └─────────────────────────┘  └─────────────────────────┘                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                      IN-PROCESS DOMAIN EVENT BUS                            │
│           [Typed Events: ASSET_DAMAGED, MILESTONE_VERIFIED, etc.]           │
├─────────────────────────────────────────────────────────────────────────────┤
│                        SHARED INFRASTRUCTURE LAYER                          │
│  [PostgreSQL Pool]  [Tenant Context Scoper]  [Storage Abstraction]          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Codebase & Directory Structure

The backend directory structure enforces strict separation of concerns, isolating domain logic into self-contained modules while sharing common infrastructural components.

```
src/
├── app.ts                         # Express application bootstrapping & global middleware
├── server.ts                      # Server lifecycle & graceful shutdown
├── config/                        # Strongly typed environment configuration
│   ├── env.ts                     # Zod/Joi validated environment variables
│   └── database.ts                # PostgreSQL pool configuration
├── core/                          # Cross-cutting foundational infrastructure
│   ├── context/                   # AsyncLocalStorage request context
│   │   └── request-context.ts     # Holds tenant_id, user, correlation_id
│   ├── database/                  # Database client & transaction helpers
│   │   ├── connection.ts          # pg-pool instance
│   │   └── transaction.ts         # withTransaction() wrapper
│   ├── errors/                    # Domain and HTTP error hierarchy
│   │   ├── app-error.ts           # Base error class
│   │   ├── bad-request-error.ts
│   │   ├── unauthorized-error.ts
│   │   ├── forbidden-error.ts
│   │   ├── not-found-error.ts
│   │   └── conflict-error.ts
│   ├── events/                    # In-process Domain Event Bus
│   │   ├── event-bus.ts           # Typed in-memory event dispatcher
│   │   ├── domain-event.ts        # Base DomainEvent interface
│   │   └── event-registry.ts      # Mapping of event names to payload types
│   ├── middleware/                # Global Express middleware
│   │   ├── tenant-context.ts      # Multi-Panchayat tenant resolution
│   │   ├── authenticate.ts        # JWT verification & User extraction
│   │   ├── authorize.ts           # RBAC role validation
│   │   ├── audit-logger.ts        # Append-only audit logging
│   │   ├── request-validator.ts   # Zod body/query/params validation
│   │   └── error-handler.ts       # Centralized error mapping
│   ├── storage/                   # File storage abstraction (Local Disk / S3)
│   │   ├── storage-service.ts     # Storage interface (upload, signedUrl)
│   │   └── local-storage.ts       # Local disk implementation for dev/staging
│   └── utils/                     # Generic utility functions (hash, crypto, pagination)
└── modules/                       # 10 Independent Domain Modules
    ├── 01-grievances/
    │   ├── grievance.controller.ts
    │   ├── grievance.service.ts
    │   ├── grievance.repository.ts
    │   ├── grievance.validator.ts
    │   ├── grievance.events.ts    # Subscribed & emitted events
    │   ├── grievance.types.ts
    │   └── index.ts               # Public module API export
    ├── 02-schemes/
    ├── 03-expenditure/
    ├── 04-gram-sabha/
    ├── 05-service-quality/
    ├── 06-dev-verification/
    ├── 07-infra-assets/
    ├── 08-opportunity-exchange/
    ├── 09-communication/
    └── 10-assisted-access/
```

### Module Boundary Rules
1. **No Cross-Module Database Direct Access:** A controller or service in `modules/01-grievances` must NEVER import `modules/07-infra-assets/infra-asset.repository.ts`.
2. **Interface Inversion / Event Publishing:** Cross-module updates must occur via:
   - **Typed Events:** Module 7 emits `ASSET_DAMAGED`, which Module 1's event handler subscribes to.
   - **Public Service Interfaces:** If synchronous data is required, Module 1 invokes a method exposed on `InfraAssetService` via dependency injection, never by querying Module 7's raw tables.

---

## 3. In-Process Domain Event Bus Specification

To decouple cross-module workflows (such as asset breakdown creating a grievance ticket, or citizen photo evidence raising an audit variance flag) without microservice brokers like Kafka or RabbitMQ, Gram Vikas uses an in-memory, strongly typed Domain Event Bus.

### 3.1 Event Bus Architecture & Lifecycle
- **Sync/Async Execution:** Event dispatching is asynchronous and non-blocking for the primary HTTP request flow, executed via Node's event loop microtasks.
- **Transactional Consistency:** For critical flows, events are staged inside the PostgreSQL transaction context and dispatched only upon successful transaction commit (Outbox Pattern in memory).

### 3.2 TypeScript Event Bus Interface Definition

```typescript
// src/core/events/domain-event.ts
export interface DomainEvent<T = unknown> {
  readonly eventId: string;
  readonly eventName: string;
  readonly occurredAt: Date;
  readonly panchayatId: string;
  readonly correlationId: string;
  readonly payload: T;
}

// src/core/events/event-registry.ts
export interface EventPayloadMap {
  'ASSET_DAMAGED': {
    assetId: string;
    assetUid: string;
    assetCategory: string;
    wardId: string;
    reportedByUserId: string;
    description: string;
    geoCoordinates: { latitude: number; longitude: number };
    photoUrl?: string;
  };
  'CITIZEN_VERIFICATION_SUBMITTED': {
    verificationId: string;
    projectId: string;
    milestoneId?: string;
    verifiedByUserId: string;
    rating: 'SATISFACTORY' | 'DEFECTIVE' | 'INCOMPLETE' | 'FRAUD_SUSPECTED';
    auditVarianceFlag: boolean;
    photoUrls: string[];
    observations: string;
  };
  'GRAM_SABHA_RESOLUTION_PASSED': {
    meetingId: string;
    resolutionId: string;
    resolutionNumber: string;
    resolutionType: 'NEW_CIVIL_WORK' | 'MAINTENANCE_CIVIC_ACTION' | 'WELFARE_APPROVAL';
    title: string;
    estimatedBudget?: number;
    fundingStream?: string;
  };
  'COMPLAINT_CLUSTERED': {
    serviceType: 'DRINKING_WATER' | 'STREET_LIGHTING' | 'SANITATION_WASTE';
    wardId: string;
    clusterWindowHours: number;
    complaintCount: number;
    ticketIds: string[];
  };
  'ASSISTED_SUBMISSION_COMPLETED': {
    sessionId: string;
    operatorUserId: string;
    citizenName: string;
    targetModule: string;
    targetRecordId: string;
    trackingToken: string;
  };
}

// src/core/events/event-bus.ts
export type EventHandler<K extends keyof EventPayloadMap> = (
  event: DomainEvent<EventPayloadMap[K]>
) => Promise<void>;

export interface IEventBus {
  publish<K extends keyof EventPayloadMap>(
    eventName: K,
    panchayatId: string,
    payload: EventPayloadMap[K]
  ): Promise<void>;

  subscribe<K extends keyof EventPayloadMap>(
    eventName: K,
    handler: EventHandler<K>
  ): void;
}
```

---

## 4. Cross-Cutting Concerns

### 4.1 Multi-Panchayat Tenancy Enforcement
Multi-tenancy isolation is enforced at two layers: **Request Middleware** and **Repository Scoping**.

```
HTTP Request ──► [TenantContextMiddleware]
                     │ Extracts X-Panchayat-ID header & verifies JWT claim
                     ▼
                 [AsyncLocalStorage Store] (panchayatId, userId, role)
                     │
                     ▼
                 [Repository Layer] ──► Automatically injects `WHERE panchayat_id = $1`
```

1. **Header & Claim Resolution:**
   - Client sends header: `X-Panchayat-ID: <uuid>`.
   - `TenantContextMiddleware` extracts this ID and verifies it against the authenticated user's JWT.
   - For `CITIZEN`, `WARD_MEMBER`, `SACHIV`, and `SARPANCH`, the header MUST match their assigned `user.panchayat_id`. A mismatch immediately yields `HTTP 403 Forbidden`.
   - For `BLOCK_OFFICER`, the middleware verifies that the requested `panchayat_id` belongs to the officer's authorized `block_id`.
   - For `SYSTEM_ADMIN`, access across any `panchayat_id` is permitted with audit logging.
2. **Context Propagation:**
   - The resolved `panchayatId` is stored in Node's `AsyncLocalStorage`, making tenant context globally accessible to all downstream repositories without manually piping parameters through every controller method.
3. **Repository Defense-in-Depth:**
   - Every database query modifying or querying tenant-scoped tables must include `panchayat_id` in the `WHERE` clause.

### 4.2 Role-Based Access Control (RBAC) Architecture
RBAC middleware enforces the 7 canonical roles defined in Phase 0:

```typescript
// src/core/middleware/authorize.ts
export type Role = 
  | 'CITIZEN'
  | 'ASSISTED_OPERATOR'
  | 'WARD_MEMBER'
  | 'PANCHAYAT_SECRETARY'
  | 'SARPANCH'
  | 'BLOCK_OFFICER'
  | 'SYSTEM_ADMIN';

export const authorize = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.context?.user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new ForbiddenError(
        `Access denied. Role '${userRole}' lacks permission for this action.`
      );
    }
    next();
  };
};
```

### 4.3 Immutable Audit Logging Middleware
Every mutating state operation (POST, PUT, PATCH, DELETE) automatically logs an immutable record into the `audit_logs` table:
- **Captured Data Points:**
  - `actor_id` (User UUID)
  - `actor_role` (Role at invocation)
  - `panchayat_id`
  - `ip_address` & `user_agent`
  - `action` (e.g., `GRIEVANCE_RESOLVED`, `VOUCHER_AUTHORIZED`, `POLL_CLOSED`)
  - `entity_type` (e.g., `DevelopmentProject`)
  - `entity_id` (Target UUID)
  - `delta` (JSONB showing before and after field values for critical updates)
  - `timestamp` (UTC)

### 4.4 Media & Geotagged Evidence Storage Abstraction
Village photo evidence (citizen audit pictures, work milestone progress photos, broken asset photos) must be validated before persisting:
1. **EXIF Inspection & Sanitization:** Server inspects EXIF data to extract GPS metadata and timestamp, validating that photos were taken on-site within expected project geofence limits.
2. **Storage Abstraction Interface (`IStorageService`):**
   ```typescript
   export interface IStorageService {
     upload(file: Express.Multer.File, path: string): Promise<{ url: string; key: string }>;
     getSignedUrl(key: string, expirySeconds?: number): Promise<string>;
     delete(key: string): Promise<void>;
   }
   ```
   - Development uses `LocalStorageService` (writing to a structured local static assets directory).
   - Production can plug in S3/MinIO compatible object stores without modifying domain controllers.

---

## 5. Technology Stack Summary

| Layer | Selected Technology | Architecture Role |
| :--- | :--- | :--- |
| **Language & Runtime** | TypeScript 5.x on Node.js 20 LTS | Strong static typing, modern async/await, native ESM |
| **Web Framework** | Express 4.x | Fast, unopinionated routing & robust middleware ecosystem |
| **Database** | PostgreSQL 15+ | ACID transactions, native JSONB, spatial geo-types, robust constraints |
| **Database Access** | Node `pg` (Pool) with Typed Repositories | Raw SQL performance, transparent tenant scoping, zero ORM bloat |
| **Validation** | Zod 3.x | End-to-end schema validation for DTOs, params, and env configs |
| **Authentication** | JWT (JSON Web Tokens) + Argon2 / Bcrypt | Stateless authentication with signed role & tenant claims |
