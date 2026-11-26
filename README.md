# Gram Vikas

Citizen-first Gram Panchayat portal with a React frontend and an Express + TypeScript backend backed by PostgreSQL. The current presentation build connects the public scheme catalogue and development-project register; other sections remain clearly identified demo experiences.

## Run the current frontend

```sh
npm install
npm run dev
```

Vite prints the local URL to open in a browser. Do not open `index.html` directly: React JSX must be served and compiled by Vite.

The frontend now attempts to connect to the implemented backend at `http://localhost:5001/api/v1`. It keeps the matching demo records if the API is unavailable, returns no records, or needs configuration. To configure a local backend, copy `.env.example` to `.env`, set the API URL and the Panchayat UUID, then restart Vite:

```env
VITE_API_BASE_URL=http://localhost:5001/api/v1
VITE_PANCHAYAT_ID=a0000000-0000-0000-0000-000000000001
```

The scheme catalogue is public and can load without a Panchayat ID. The project API is public at the route level, but the backend tenant middleware still requires `X-Panchayat-ID`; the frontend sends it from `VITE_PANCHAYAT_ID`. The development seed creates a clearly labelled demo Panchayat and demo projects at this UUID. Its `DEMO-` project codes, budgets and status are illustrative only. Replace the UUID and use verified source records for real Panchayats. The frontend reads the backend's `{ success, data }` response envelope, maps records into project cards, and keeps frontend demo data as a fallback if the request fails or returns no records.

**Connected in this presentation build:** scheme catalogue (`GET /api/v1/schemes`) and public development projects (`GET /api/v1/projects`, with a configured Panchayat UUID).

**Kept in demo mode for now:** grievance list/submission (requires authentication and a valid ward ID, while the current UI has no sign-in/ward selection); Gram Sabha suggestions and polls (the backend app does not mount those routes); dashboard scores, notices, opportunities, maps and other sample metrics (no corresponding connected public API is currently mounted).

## Current project structure

```text
GramVikas/
├── .env.example                 # Local API URL example; no secrets
├── .gitignore                   # Ignores dependencies, build output and local env
├── index.html                   # Vite HTML entry point
├── package.json                 # Frontend scripts and dependencies
├── package-lock.json            # Locked frontend dependency versions
├── README.md                    # Setup, current structure and integration notes
└── src/
    ├── App.jsx                  # App shell, navigation, pages, forms and demo flows
    ├── data.js                  # Illustrative sample records used by the prototype
    ├── main.jsx                 # React application entry point
    ├── styles.css               # Shared responsive layout and component styles
    ├── components/
    │   └── DevelopmentChart.jsx # Lazy-loaded sample chart for the SDG dashboard
    └── services/
        ├── api.js               # Shared fetch client, envelope handling and endpoint functions
        └── adapters.js          # Maps backend scheme/project records to the current UI model

backend/
├── package.json                 # Express + TypeScript scripts and dependencies
├── .env.example                 # Local server/database configuration template
├── scripts/                     # Applies SQL schemas and seed data from docs/
├── src/
│   ├── server.ts, app.ts         # HTTP server, middleware and mounted API routes
│   ├── config/                   # Environment validation
│   ├── core/                     # Database, request context, errors, events and middleware
│   └── modules/                  # Auth, grievances, development, infrastructure, schemes, verification, assisted access
└── tests/                        # Backend unit and API integration tests

docs/
├── architecture/schema/          # PostgreSQL schema files
├── architecture/seeds/           # Jurisdiction, scheme and explicitly illustrative project seed data
├── architecture/                 # System architecture and API specification
└── domain/                       # Domain, module, workflow, RBAC and entity documentation
```

### What the current files do

- `src/App.jsx` contains the navigation and the Overview, Grievances, Projects, Schemes, Gram Sabha, Development, Map, Notices, Settings and Opportunities screens. It also contains the demo forms and modal interactions.
- `src/data.js` supplies mock grievances, projects, schemes, Gram Sabha meetings, activity and nine SDG themes. The connected scheme and project views use API-backed state when records are returned; other sections still use these samples.
- `src/services/api.js` centralizes the base URL, tenant/auth headers, JSON requests, response-envelope handling and endpoint calls.
- `src/services/adapters.js` translates backend scheme and project field names/status codes to the existing frontend card shape.
- `src/components/DevelopmentChart.jsx` isolates the Recharts visualization and is loaded only when needed.
- `src/styles.css` contains the design system, component styles and mobile layouts.

The interface has entry points for grievance reporting/tracking, public projects and spending, scheme discovery, Gram Sabha participation, village development indicators, notices, local opportunities and a map. Forms and page navigation work as a frontend prototype. Most lists, account features and map data are still illustrative or placeholder content.

The Overview, grievance, Gram Sabha, dashboard, notice, opportunity and map examples remain illustrative. Backend scheme records are seeded catalogue entries; backend project rows with `DEMO-` codes are illustrative seed data, not verified Panchayat records. The Hindi control currently explains that full Hindi content is planned; it does not translate the interface yet.

## Current backend implementation

The backend is an implemented modular Express + TypeScript API using PostgreSQL and the `pg` query layer. SQL schemas and seed scripts live under `docs/architecture/`; `npm run migrate` and `npm run seed` in `backend/` load them. The project seed records use `DEMO-` codes and are illustrative, not official Panchayat records.

```text
backend/
├── package.json, tsconfig.json, vitest.config.ts
├── scripts/
│   ├── migrate.ts               # Applies docs/architecture/schema/*.sql
│   └── seed.ts                  # Applies docs/architecture/seeds/*.sql
├── src/
│   ├── server.ts, app.ts        # Server startup, middleware, health and API routes
│   ├── config/env.ts            # Environment validation
│   ├── core/                    # Database, request context, errors, events and middleware
│   └── modules/
│       ├── auth/                # Registration and login
│       ├── grievance/           # Grievance lifecycle
│       ├── development/         # Projects, milestones, vouchers and summaries
│       ├── infrastructure/      # Public asset register and maintenance
│       ├── scheme/              # Public catalogue, eligibility and applications
│       ├── verification/        # Citizen project verification
│       └── assisted-access/     # Assisted service applications and tracking
└── tests/                       # Unit and integration tests
```

```text
docs/
├── architecture/schema/         # Six PostgreSQL schema files
├── architecture/seeds/          # Jurisdiction, schemes and demo development projects
├── architecture/                # System architecture and API specification
└── domain/                      # Domain and module documentation
```

### Implemented backend modules

- **Implemented and mounted:** `auth`, `grievance`, `development`, `infrastructure`, `scheme`, `verification` and `assisted-access`.
- **Development:** public project reads, expenditure summary, milestone and voucher operations; write operations require authorized staff.
- **Infrastructure:** public asset reads and restricted asset/fault operations.
- **Not yet implemented as mounted API modules:** Gram Sabha, notices, opportunities and SDG dashboards. Their frontend views remain demo content.

## Frontend/backend connection

The frontend calls the API through `src/services/api.js`. Configure `VITE_API_BASE_URL` and `VITE_PANCHAYAT_ID` in `.env`; keep the `/api/v1` prefix in the URL. The backend currently enables CORS for the Vite origin. Connected GET requests fall back to the sample data if the backend is offline, has no seeded records, or is missing tenant configuration.

Current integration status:

1. `GET /api/v1/schemes` is connected as a public read.
2. `GET /api/v1/projects` is connected as a public read and requires `X-Panchayat-ID`; the local seed provides a demo tenant and two explicitly illustrative projects. The projects page supports status filters and expandable backend record details.
3. Grievance APIs exist, but the current form/list remain demo-only until the frontend has authentication and a real ward UUID to satisfy backend validation.
4. Gram Sabha routes are described in planning material but are not mounted in the current backend app, so those interactions remain demo-only.
5. Dashboard, notices, opportunities and map data remain demo-only until corresponding backend endpoints/data are available.

For a later grievance integration, the frontend will need to send the backend's required `wardId`, `title`, canonical category enum and description, attach the authenticated bearer token, and display the returned tracking reference. Do not send sensitive complaints to public map/list views.

### API notes

The following table records future frontend integration ideas. Routes marked here are not all mounted in the current backend; check `backend/src/app.ts` and `backend/src/modules/*/*.routes.ts` before relying on them.

| Frontend need | Suggested endpoint | Example response |
| --- | --- | --- |
| Panchayat overview | `GET /panchayats/:id/dashboard` | `{ panchayat, stats, sdgThemes, projects, recentActivity, nextMeeting, dataSources }` |
| Grievance list/search/filter | `GET /grievances?status=&category=&q=&page=` | `{ items, total, page }` |
| Submit grievance | `POST /grievances` | `{ id, reference, status, createdAt }` |
| Grievance detail/history | `GET /grievances/:id` | `{ grievance, history, evidence }` |
| Citizen resolution verification | `POST /grievances/:id/verification` | `{ status, updatedAt }` |
| Projects | `GET /projects?panchayatId=&status=&page=` | `{ items, total, summary }` |
| Project detail/evidence | `GET /projects/:id` | `{ project, funds, updates, evidence, source }` |
| Scheme directory | `GET /schemes?category=&language=` | `{ items, updatedAt, source }` |
| Gram Sabha meetings/outcomes | `GET /gram-sabha?panchayatId=` | `{ meetings, outcomes }` |
| Public agenda suggestion | `POST /gram-sabha/suggestions` | `{ id, status, createdAt }` |
| Advisory poll response | `POST /gram-sabha/polls/responses` | `{ accepted, results }` |

Keep public records and citizen submissions labelled with `source` and `verificationStatus`. Do not expose private contact details, identity documents or sensitive complaints through public list/map routes. Use a documented upload flow for evidence photos and validate files on the server. Suggested errors use `{ message, code, details? }`; the frontend currently displays the `message` field.

## Version control collaboration

The frontend, backend and architecture docs are committed in the same project repository under separate directories. Use feature branches and small module-focused changes so the frontend and backend can be developed in parallel. Keep local `.env` files and uploaded evidence out of Git; commit `.env.example` files with placeholder values only.
