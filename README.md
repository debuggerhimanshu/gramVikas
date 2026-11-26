# Gram Vikas

Citizen-first Gram Panchayat portal. The current deliverable is a React frontend prototype with illustrative Bhanpur data. The backend tree below is a proposed next phase; those backend files and services do not exist yet.

## Run the current frontend

```sh
npm install
npm run dev
```

Vite prints the local URL to open in a browser. Do not open `index.html` directly: React JSX must be served and compiled by Vite.

The frontend uses demo data when `VITE_API_BASE_URL` is empty. When the backend is ready, copy `.env.example` to `.env`, set the API base URL, then restart Vite:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

## Current project structure

```text
GramVikas/
├── .env.example                 # Local API URL example; no secrets
├── .gitignore                   # Ignores dependencies, build output and local env
├── index.html                   # Vite HTML entry point
├── package.json                 # Frontend scripts and dependencies
├── package-lock.json            # Locked frontend dependency versions
├── README.md                    # Project setup, current structure and backend plan
└── src/
    ├── App.jsx                  # App shell, navigation, pages, forms and demo flows
    ├── data.js                  # Illustrative sample records used by the prototype
    ├── main.jsx                 # React application entry point
    ├── styles.css               # Shared responsive layout and component styles
    ├── components/
    │   └── DevelopmentChart.jsx # Lazy-loaded sample chart for the SDG dashboard
    └── services/
        └── api.js               # Shared fetch client and starter endpoint functions
```

### What the current files do

- `src/App.jsx` contains the navigation and the Overview, Grievances, Projects, Schemes, Gram Sabha, Development, Map, Notices, Settings and Opportunities screens. It also contains the demo forms and modal interactions.
- `src/data.js` supplies mock grievances, projects, schemes, Gram Sabha meetings, activity and nine SDG themes. Replace these imports with API-backed state as endpoints become available.
- `src/services/api.js` centralizes the base URL, JSON requests, error handling and starter calls such as `createGrievance()` and `fetchProjects()`.
- `src/components/DevelopmentChart.jsx` isolates the Recharts visualization and is loaded only when needed.
- `src/styles.css` contains the design system, component styles and mobile layouts.

The interface has entry points for grievance reporting/tracking, public projects and spending, scheme discovery, Gram Sabha participation, village development indicators, notices, local opportunities and a map. Forms and page navigation work as a frontend prototype. Most lists, account features and map data are still illustrative or placeholder content.

All figures, records, locations, poll results and dates currently displayed are demo values, not verified Panchayat records. The Hindi control currently explains that full Hindi content is planned; it does not translate the interface yet.

## Proposed future backend structure

This is a suggested structure for the next phase, not a description of files already present. It uses a modular Express + TypeScript API, PostgreSQL, and an ORM or query layer selected by the backend team. The exact framework can change as long as the frontend API contract stays consistent.

```text
backend/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
├── migrations/                  # Versioned database schema changes
├── seeds/                       # Explicit demo/development data only
├── src/
│   ├── server.ts                # Starts the HTTP server
│   ├── app.ts                   # Express setup, CORS, routes and error handling
│   ├── config/
│   │   ├── env.ts               # Validates environment configuration
│   │   └── database.ts           # Creates the PostgreSQL connection
│   ├── middleware/
│   │   ├── authenticate.ts      # Verifies session/token
│   │   ├── authorize.ts         # Checks role and Panchayat jurisdiction
│   │   ├── validate.ts          # Validates request parameters and bodies
│   │   ├── rate-limit.ts        # Limits abusive requests
│   │   └── error-handler.ts     # Consistent API error responses
│   ├── modules/
│   │   ├── auth/                # Registration, login, session and recovery
│   │   ├── users/               # Citizen and official profiles and roles
│   │   ├── panchayats/          # Panchayat profile, wards and public dashboard
│   │   ├── grievances/          # Reports, assignment, status history and verification
│   │   ├── projects/            # Public works, progress, budgets and evidence
│   │   ├── schemes/             # Scheme directory, sources and discovery guidance
│   │   ├── gram-sabha/          # Meetings, agendas, suggestions, polls and outcomes
│   │   ├── assets/              # Facilities, map locations and maintenance records
│   │   ├── sdg/                 # Theme definitions, indicators and measurements
│   │   ├── notices/             # Public announcements and alerts
│   │   ├── opportunities/       # Jobs, training, SHGs and local services
│   │   └── notifications/       # In-app notices and future SMS/email adapters
│   ├── services/
│   │   ├── file-storage.ts      # Private/public evidence storage adapter
│   │   ├── audit-log.ts         # Records important administrative changes
│   │   └── notifications.ts     # Provider-independent notification interface
│   ├── shared/
│   │   ├── http.ts              # Shared response/error types
│   │   └── permissions.ts       # Roles and permission definitions
│   └── tests/                   # Module and API integration tests
└── uploads/                     # Local development only; production uses object storage
```

### Backend module responsibilities

- **`auth` and `users`:** register/authenticate users and attach roles and jurisdiction. Never trust a Panchayat ID from the browser to decide access.
- **`panchayats`:** serve public Panchayat and ward information and aggregate dashboard data from approved sources.
- **`grievances`:** accept citizen reports, issue unique references, assign work, append status history and collect resolution verification.
- **`projects` and `assets`:** expose public works, budgets, progress evidence, facility locations and maintenance history.
- **`schemes`:** maintain scheme summaries with official source links and a reviewed/updated date. Eligibility responses should say “potential match” and direct citizens to official confirmation.
- **`gram-sabha`:** manage meeting schedules, public suggestions, advisory polls and official proceedings as distinct record types.
- **`sdg`:** define indicators with their source, period, unit and verification status; calculate only scores with documented methodology.
- **`notices`, `opportunities` and `notifications`:** provide public announcements, locally reviewed opportunity listings and delivery integrations.
- **`middleware`, `services` and `shared`:** keep security, file storage, audit logs, notifications and consistent API behavior reusable across modules.

## Frontend/backend connection

The frontend calls the API through `src/services/api.js`. Configure the backend origin in `VITE_API_BASE_URL`; keep `/api` in that value. For local development, the backend should allow the Vite origin through CORS.

Suggested first integration sequence:

1. Agree on the route paths, JSON fields, error shape and authentication approach.
2. Implement `GET /api/grievances` and `POST /api/grievances` in the backend.
3. Connect the grievance form to `createGrievance()` and show the server-returned reference.
4. Connect the grievance list to `fetchGrievances()` and display server status/history.
5. Repeat for projects, schemes and Gram Sabha, one module at a time.

### Starter API contract

These routes align with helper functions and integration notes in `src/services/api.js`. The backend team should confirm the details before implementing them.

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

The frontend and future backend should be committed in the same project repository under separate directories. Use feature branches and small module-focused changes so the frontend and backend can be developed in parallel. Keep local `.env` files and uploaded evidence out of Git; commit `.env.example` files with placeholder values only.
