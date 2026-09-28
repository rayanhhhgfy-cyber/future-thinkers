# منصة مفكري المستقبل — Future Thinkers Platform

منصة معرفية وطنية أردنية لجميع الطلاب: كتب، حوار، شطرنج، برمجة، علوم، قراءة، ابتكار، مناظرات، أدب، ريادة أعمال، فعاليات، مسابقات، وقوائم صدارة وطنية.

## Architecture
- **Frontend:** React 19 + React Router + TailwindCSS + shadcn/ui + Recharts + chess.js (Arabic RTL).
- **Backend:** FastAPI (modular routers) + MongoDB (motor). JWT auth + RBAC permissions.
- **Storage:** MongoDB GridFS for uploaded files; database stores application data and file content.

### Backend modules (`backend/routes/`)
auth, geo (Kingdom→Governorate→Directorate→School), books (+reader/reviews/approval),
community (clubs+dialogue forum), chess (challenges/games/ELO), events+competitions,
leaderboard+gamification (XP/levels/badges/achievements/streak), social (notifications/search/profile/dashboard),
content (news/activities/reports moderation), admin (users/RBAC/analytics/CMS/points/audit/broadcast).

## Setup
```
cd backend && pip install -r requirements.txt
cd frontend && yarn install
```
Services run via supervisor (backend :8001, frontend :3000). Data auto-seeds on startup.

## Environment variables (backend/.env)
See `.env.example`. Never commit real secrets.
MONGO_URL, DB_NAME, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD.

## Deployment
- Deploy the repository as one Vercel project with the Root Directory set to the repository root and Services enabled for the project. `vercel.json` defines a React frontend service and a FastAPI backend service, then routes `/api/*` to FastAPI and all other paths to React.
- Add `MONGO_URL`, `DB_NAME` (`future_thinkers`), `JWT_SECRET`, and `ADMIN_PASSWORD` in the Vercel project's Environment Variables. Services share project environment variables. Set strong, unique secrets. `ADMIN_EMAIL` is optional and defaults to `admin@futurethinkers.jo`. The backend service installs its production packages from `backend/vercel-requirements.txt`.
- The frontend uses same-origin `/api` requests; leave `REACT_APP_BACKEND_URL` unset. Verify the API at `https://YOUR-PROJECT.vercel.app/api/health` and then test login and data-backed pages.
- The backend uses MongoDB through Motor and stores uploads in MongoDB GridFS. A Turso/libSQL URL cannot be used as `MONGO_URL` without migrating the database and API code. Revoke any database token or password pasted into chat and store credentials only in Vercel Environment Variables.
- Files previously stored in Emergent Object Storage are not copied automatically; re-upload them or migrate them into MongoDB GridFS.
- This uses Vercel Services with a FastAPI backend; WebSocket routes are not supported by the serverless deployment, so live updates rely on the app's polling fallback.

## Roles & Permissions
student, teacher, school_admin, directorate_admin, moderator, admin, super_admin — granular permissions enforced server-side via `require_permission`.

## Security
bcrypt hashing, JWT access+refresh, brute-force lockout, pydantic validation, file MIME/size checks, server-side authorization, global error handler, audit logs.

## API docs
FastAPI OpenAPI docs at `/docs`.
