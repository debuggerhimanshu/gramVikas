# Gram Vikas frontend

Citizen-first Gram Panchayat portal prototype built with React, Vite and Recharts. This is the first frontend milestone for the team project; it is designed to connect to the backend in the next phase.

## Run locally

```sh
npm install
npm run dev
```

The frontend runs in demo mode when `VITE_API_BASE_URL` is unset. Copy `.env.example` to `.env` when the backend is available. The `src/services/api.js` file is the transport boundary for connecting screens to REST endpoints.

## Current frontend scope

- Responsive public/citizen portal shell with Bhanpur demo Panchayat context.
- Overview dashboard with nine-theme scorecard, sample project progress, village updates and meeting highlights.
- Grievance list, search/status filtering, issue reporting form and complaint detail entry points.
- Public works cards with project progress, budget and source labels.
- Scheme directory with topic filters and saved schemes.
- Gram Sabha calendar, agenda suggestions, advisory poll and meeting outcomes.
- Development indicator dashboard and sample trends.
- Illustrative village map, public notices, settings and local opportunity entry point.
- Hindi/English display control, responsive layouts and accessible dialog controls.

All figures, records, locations, poll results and dates in this prototype are illustrative. The interface must not be used as an official public record until connected to verified sources.

## Backend integration contract

Base URL is configured with `VITE_API_BASE_URL` (for example `http://localhost:4000/api`). Keep the shared route prefix `/api` in that value.

| Frontend need | Suggested endpoint | Expected response shape |
| --- | --- | --- |
| Public Panchayat overview | `GET /panchayats/:id/dashboard` | `{ panchayat, stats, sdgThemes, projects, recentActivity, nextMeeting, dataSources }` |
| Grievance list/search/filter | `GET /grievances?status=&category=&q=&page=` | `{ items, total, page }` |
| Submit a grievance | `POST /grievances` | `{ id, reference, status, createdAt }` |
| Grievance details/timeline | `GET /grievances/:id` | `{ grievance, history, evidence }` |
| Add a citizen status verification | `POST /grievances/:id/verification` | `{ status, updatedAt }` |
| Public projects | `GET /projects?panchayatId=&status=&page=` | `{ items, total, summary }` |
| Project detail/evidence | `GET /projects/:id` | `{ project, funds, updates, evidence, source }` |
| Scheme directory | `GET /schemes?category=&language=` | `{ items, updatedAt, source }` |
| Gram Sabha meetings | `GET /gram-sabha?panchayatId=` | `{ meetings, outcomes }` |
| Public agenda suggestion | `POST /gram-sabha/suggestions` | `{ id, status, createdAt }` |
| Advisory poll response | `POST /gram-sabha/polls/responses` | `{ accepted, results }` |

### Integration notes for the team

- Public records and citizen submissions should have explicit `source` and `verificationStatus` fields. Do not display citizen content as verified official data.
- Scope every authorized write by the signed-in user's assigned Panchayat/jurisdiction on the server; never trust a client-supplied Panchayat ID for authorization.
- Sensitive complaint categories and personal details must not be returned by public list/map endpoints.
- Use upload URL flow or a documented multipart endpoint for evidence photos. Validate file type/size on the server.
- Scheme eligibility should return potential matches with source links and current-as-of date, never a guarantee of benefit.
- Gram Sabha polls/suggestions remain advisory and must be labelled separately from official proceedings.
- Keep API errors in `{ message, code, details? }` form. The current API client reads `message` for human-facing errors.

## Version control collaboration

The project lives in its own `GramVikas/` directory. Commit only files under this folder for this work so unrelated files in the enclosing repository stay untouched. Suggested shared sequence: agree on the API response fields above, merge frontend route work, then connect one module at a time behind `src/services/api.js`.
