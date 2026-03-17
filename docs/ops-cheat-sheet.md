# DMS Admin — Operations Cheat Sheet

Daily deploy (with tagging)
- Run as Administrator:
  powershell -ExecutionPolicy Bypass -File "d:\Proiecte\dms\scripts\deploy-and-restart.ps1"
- Optional (if antivirus locks npm install):
  powershell -ExecutionPolicy Bypass -File "d:\Proiecte\dms\scripts\deploy-and-restart.ps1" -DefenderExclusion

Start/Stop app
- Start manually: d:\Proiecte\dms\start-server.bat
- Via Task Scheduler:
  - Start: schtasks /run /tn "DMS Admin Server"
  - Stop:  schtasks /end /tn "DMS Admin Server"

Auto-start at boot (one-time setup)
- Recommended (with RestartOnFailure):
  powershell -ExecutionPolicy Bypass -File "d:\Proiecte\dms\scripts\register-dms-task.ps1"

Health checks
- Local: Invoke-WebRequest http://127.0.0.1:3000/api/health -UseBasicParsing
- LAN:   curl -I http://192.168.70.23:3000/api/health

Logs (on server)
- Runtime: d:\Proiecte\dms\logs\server.log
- Startup: d:\Proiecte\dms\logs\startup.log
- Tail example:
  Get-Content -LiteralPath "d:\Proiecte\dms\logs\server.log" -Tail 100

Rollback (to last known good)
- Run as Administrator:
  powershell -ExecutionPolicy Bypass -File "d:\Proiecte\dms\scripts\rollback.ps1"

Git pointers and tags (verify)
- cd /d d:\Proiecte\dms
- git tag --list "release-*"
- git rev-parse prod-last-good 2>$null
- git rev-parse origin/deploy/prod 2>$null

Quick troubleshooting
- Port 3000 busy:
  $p = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($p) { Stop-Process -Id $p.OwningProcess -Force }
- Kill stray Next processes:
  Get-CimInstance Win32_Process | ? { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'next\s+start' } | % { Stop-Process -Id $_.ProcessId -Force }
- EPERM during npm install:
  - Use -DefenderExclusion flag during deploy
  - Close editors/Explorer, retry

Env and config
- .env.local must exist in d:\Proiecte\dms (not in Git)
- COOKIE_SECRET must be set; DOMAIN_ADMINS controls access
- AD_DOMAIN must be set; login validates username/password against AD
- Next runtime for crypto: export const runtime = 'nodejs' in auth/login route

Auth behavior (current)
- Login form uses `username` + `password`.
- User not in DOMAIN_ADMINS => explicit access denied message ("adresați-vă departamentului IT").
- User in DOMAIN_ADMINS but wrong password => "Parolă incorectă".
- TEMP_LOGIN_PASSWORD is not used.
- TypeScript path alias: imports under src use '@/...'
