Deploy & Rollback Guide — DMS Admin

Overview
- This document describes how to deploy, auto-start, verify, tag, and roll back the DMS Admin Next.js app on the LAN host.

Pre-requisites
- Repo path: d:\Proiecte\dms
- Node.js installed (C:\Program Files\nodejs\node.exe)
- .env.local present in repo root (COOKIE_SECRET, DOMAIN_ADMINS, AD_URL, AD_DOMAIN, DB_*)
- Task Scheduler entry "DMS Admin Server" created (see below)

Auto-start at boot
- Recommended: scripts/register-dms-task.ps1 (Run as Administrator):
  powershell -ExecutionPolicy Bypass -File "d:\Proiecte\dms\scripts\register-dms-task.ps1"
  - Creates/updates the task "DMS Admin Server" (At startup, Highest privileges, SYSTEM by default)
  - Includes RestartOnFailure (3 attempts, 1 minute interval)
- Manual CLI alternative:
  schtasks /Create /TN "DMS Admin Server" /TR "cmd.exe /c d:\Proiecte\dms\start-server.bat" /SC ONSTART /RU "SYSTEM" /RL HIGHEST /F

Start/Stop manually
- Start: d:\Proiecte\dms\start-server.bat
- Stop/Start via Task:
  schtasks /end /tn "DMS Admin Server"
  schtasks /run /tn "DMS Admin Server"

Health and logs
- Health endpoint: http://127.0.0.1:3000/api/health (unauthenticated)
- LAN health: http://192.168.70.23:3000/api/health
- Logs on server:
  - d:\Proiecte\dms\logs\startup.log (who/when ran start script)
  - d:\Proiecte\dms\logs\server.log (Next.js output)

Standard deploy (with tagging)
- Run as Administrator:
  powershell -ExecutionPolicy Bypass -File "d:\Proiecte\dms\scripts\deploy-and-restart.ps1"
- What it does:
  1) Stops the task (if running)
  2) Kills any stray node/next processes using the repo
  3) git pull origin main
  4) npm ci (or npm install)
  5) npm run build
  6) Starts the app via Task Scheduler
  7) Healthcheck on /api/health
  8) On success: writes last-good.txt (SHA), creates release-YYYY.MM.DD-HHMM tag, updates prod-last-good tag and deploy/prod branch; pushes to origin
- Optional flag for antivirus lock issues during npm install:
  -DefenderExclusion
  Example:
  powershell -ExecutionPolicy Bypass -File "d:\Proiecte\dms\scripts\deploy-and-restart.ps1" -DefenderExclusion
  (Temporarily adds a Defender exclusion for d:\Proiecte\dms during install, then removes it.)

Rollback to last known good
- Run as Administrator:
  powershell -ExecutionPolicy Bypass -File "d:\Proiecte\dms\scripts\rollback.ps1"
- What it does:
  1) Reads target SHA from Git tag prod-last-good (preferred), else from last-good.txt
  2) Stops the task
  3) git reset --hard <target SHA>
  4) npm ci/install, npm run build
  5) Starts the task
  6) Healthcheck on /api/health

When to use rollback
- After a deploy, the app fails healthcheck or shows a critical regression
- Do not use rollback for infra issues (DB/LDAP down, wrong .env, firewall). Fix infra first
- If DB migrations changed schema irreversibly, coordinate rollback carefully (code+schema)

Git pointers and tags
- On each successful deploy:
  - release-YYYY.MM.DD-HHMM (immutable, annotated) is created and pushed
  - prod-last-good (mutable tag) is moved to the current commit and pushed (force)
  - deploy/prod (branch pointer) is moved to the current commit and pushed (force)
- Local marker: last-good.txt contains the current deployed SHA (fallback if remote not accessible)

Troubleshooting
- EPERM on next-swc.win32-x64-msvc.node during npm install
  - Ensure no Next.js process is running (script already kills typical processes)
  - Optionally add Defender exclusion (-DefenderExclusion flag)
  - Close editors with files open under the repo; retry
- Port 3000 is busy
  - Identify and stop the owning process: Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
  - Stop-Process -Id <PID> -Force
- Health 401/redirect on UI routes
  - /api/health is public; protected routes require valid session cookie and whitelist (DOMAIN_ADMINS)

Best practices
- Keep .env.local out of Git; rotate exposed credentials
- Use deploy-and-restart.ps1 for every deploy; it updates both prod-last-good and deploy/prod
- Use rollback.ps1 for quick revert to last known good
- Consider using feature flags/backward-compatible schema changes to reduce rollback risk
