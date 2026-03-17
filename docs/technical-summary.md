# Technical Summary — DMS Admin (Local Dev Session)

Scope
- Capture the key configuration and security decisions so the app can be started safely on a LAN host and revisited later.

Core Configuration
- Framework: Next.js (App Router) with React + TypeScript.
- Next config: Using App Router conventions; API routes that require Node crypto explicitly set runtime = 'nodejs'.
- TypeScript paths: tsconfig uses the path alias '@/*' for imports within src.
- Build status: Build validated successfully after fixes (auth import/export, cache clear, runtime = 'nodejs').

Authentication & Authorization
- Session uses an HMAC-signed cookie (`dms_admin_auth`).
- Login validates username/password against AD domain (`AD_DOMAIN`) and then enforces whitelist (`DOMAIN_ADMINS`).
- Users outside `DOMAIN_ADMINS` receive explicit "Nu aveți dreptul..." error in UI.

Database & Security
- SQL Server via mssql; default local dev server localhost, port 1433.
- Important: Credentials were present in repository test files. We removed/hardened those test utilities and .gitignored them. Action required: ROTATE any potentially exposed SQL credentials.

Idempotency & API Notes
- Update routes perform pre-checks and only write when state changes; cleanup/execute returns processed/idempotent flags.

Remote Access & Firewall
- Local server binding example: 192.168.70.23:3000
- Windows firewall allow rule (PowerShell):
  New-NetFirewallRule -DisplayName "DMS Admin Dev 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Domain,Private

Operational Tips
- Start (dev): npm run dev (use -- -p 3001 if 3000 is busy).
- Start (prod): start-server.bat pornește Next cu node direct și verifică /api/health; Task Scheduler pornește app la boot (DMS Admin Server).
- Ensure COOKIE_SECRET, AD_DOMAIN and DOMAIN_ADMINS are set in .env.local.
- Verify AD connectivity from host if allowed users cannot authenticate.

Deployment & Rollback (Server)
- Deploy/Restart automat: scripts/deploy-and-restart.ps1 (vezi și docs/deploy-rollback-guide.md și docs/ops-cheat-sheet.md)
  - Oprește task-ul, git pull origin main, npm ci/install, npm run build, pornește aplicația, healthcheck /api/health.
  - La succes: scrie last-good.txt (SHA), creează tag release-YYYY.MM.DD-HHMM (imuabil) și actualizează pointerii de mediu: tag mutabil prod-last-good și branch deploy/prod (push -f).
  - Opțional: -DefenderExclusion adaugă temporar excludere Windows Defender pentru calea repo-ului pe durata npm install, apoi o elimină.
- Rollback rapid: scripts/rollback.ps1
  - Ia SHA din prod-last-good (din Git) sau last-good.txt (fallback local), face git reset --hard, npm ci/install, npm run build, pornește app, healthcheck.

Auto-start & Monitoring
- Task Scheduler: "DMS Admin Server" (At startup, Highest, SYSTEM sau cont de serviciu). Recomandat să fie creat prin scripts/register-dms-task.ps1 (include RestartOnFailure).
- Health endpoint: GET /api/health (exempt în middleware) pentru monitorizare.
- Loguri: logs/startup.log și logs/server.log pe server.

Housekeeping
- .env.local must not be committed.
- Add/keep secret scanning in CI; protect branches.

With these settings, the app runs with signed cookie sessions, AD-backed login, DOMAIN_ADMINS whitelist enforcement, the tsconfig alias '@/*', and runtime='nodejs' where needed. Exposed test credentials have been removed/hardened; rotate any potentially exposed passwords immediately.
