param(
  [string]$RepoPath = 'd:\Proiecte\dms',
  [string]$TaskName = 'DMS Admin Server',
  [string]$PointerTag = 'prod-last-good',
  [string]$LocalMarker = 'last-good.txt',
  [int]$Port = 3000,
  [string]$HealthPath = '/api/health',
  [int]$Retries = 30,
  [int]$DelaySec = 2
)

$ErrorActionPreference = 'Stop'

function Test-IsAdmin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
  $self = $MyInvocation.MyCommand.Path
  $argList = @(
    '-ExecutionPolicy', 'Bypass',
    '-File', "`"$self`"",
    '-RepoPath', "`"$RepoPath`"",
    '-TaskName', "`"$TaskName`"",
    '-PointerTag', "`"$PointerTag`"",
    '-LocalMarker', "`"$LocalMarker`"",
    '-Port', "$Port",
    '-HealthPath', "`"$HealthPath`"",
    '-Retries', "$Retries",
    '-DelaySec', "$DelaySec"
  )
  Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $argList | Out-Null
  Write-Host "Script relansat cu privilegii de administrator." -ForegroundColor Yellow
  exit 0
}

function Write-Header($text) { Write-Host "`n=== $text ===" -ForegroundColor Yellow }

function Test-TaskExists($name) {
  $null = schtasks /query /tn "$name" 2>$null
  return ($LASTEXITCODE -eq 0)
}

function Invoke-Healthcheck($url, $retries, $delay) {
  for ($i = 1; $i -le $retries; $i++) {
    try {
      $r = Invoke-WebRequest -UseBasicParsing -Uri $url -Method Head -TimeoutSec 3
      if ($r.StatusCode -in 200,301,302) { return $true }
    } catch { }
    Start-Sleep -Seconds $delay
  }
  return $false
}

if (-not (Test-Path -LiteralPath $RepoPath)) { throw "RepoPath nu exista: $RepoPath" }
Push-Location $RepoPath

Write-Header "ROLLBACK: Determinare commit tinta"
$targetSha = $null

# 1) Incearca pointerul din Git (tag-ul mutabil prod-last-good)
try {
  git fetch --tags origin | Out-Null
  $ref = (git rev-parse "$PointerTag^{commit}" 2>$null)
  if ($LASTEXITCODE -eq 0 -and $ref) { $targetSha = $ref.Trim() }
} catch { }

# 2) Daca nu exista sau nu e accesibil, foloseste markerul local
if (-not $targetSha) {
  $markerPath = Join-Path $RepoPath $LocalMarker
  if (-not (Test-Path -LiteralPath $markerPath)) {
    throw "Nu gasesc nici tag-ul '$PointerTag' in Git, nici markerul local $LocalMarker. Opreste-te si alege manual un commit."
  }
  $targetSha = (Get-Content -LiteralPath $markerPath -TotalCount 1).Trim()
}

if (-not $targetSha) { throw "Nu am un SHA tinta pentru rollback." }
Write-Host "Target SHA: $targetSha"

Write-Header "ROLLBACK: Oprire aplicatie"
if (Test-TaskExists $TaskName) { try { schtasks /end /tn "$TaskName" 2>$null | Out-Null } catch { } }

Write-Header "ROLLBACK: Reset la commit tinta"
# Asigura-te ca e repo Git
try { git rev-parse --is-inside-work-tree | Out-Null } catch { throw "Directorul nu pare repo Git: $RepoPath" }

# Curata si reseteaza
& git reset --hard $targetSha
if ($LASTEXITCODE -ne 0) { throw "git reset --hard a esuat (cod $LASTEXITCODE)" }

Write-Header "ROLLBACK: Reinstalare deps + build"
$npm = (Get-Command npm -ErrorAction SilentlyContinue).Path
if (-not $npm) { throw "npm nu este in PATH. Instaleaza Node.js sau ruleaza sub un user cu npm in PATH." }

if (Test-Path -LiteralPath (Join-Path $RepoPath 'package-lock.json')) { & $npm ci } else { & $npm install }
if ($LASTEXITCODE -ne 0) { throw "npm ci/install a esuat (cod $LASTEXITCODE)" }

& $npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build a esuat (cod $LASTEXITCODE)" }

Write-Header "ROLLBACK: Pornire aplicatie"
if (Test-TaskExists $TaskName) { schtasks /run /tn "$TaskName" | Out-Null } else {
  $startScript = Join-Path $RepoPath 'start-server.bat'
  if (-not (Test-Path -LiteralPath $startScript)) { throw "Nu gasesc $startScript" }
  Start-Process -FilePath "$startScript" -WorkingDirectory $RepoPath | Out-Null
}

Write-Header "HEALTHCHECK: http://127.0.0.1:$Port$HealthPath"
$ok = Invoke-Healthcheck -url "http://127.0.0.1:$Port$HealthPath" -retries $Retries -delay $DelaySec
if ($ok) {
  Write-Host "[OK] Rollback reusit. Aplicatia raspunde." -ForegroundColor Green
} else {
  Write-Warning "[WARN] Dupa rollback, aplicatia nu raspunde. Verifica logurile."
  $log = Join-Path $RepoPath 'logs\server.log'
  if (Test-Path -LiteralPath $log) {
    Write-Host "Ultimele 200 linii din $log:" -ForegroundColor Yellow
    Get-Content -LiteralPath $log -Tail 200
  }
  exit 1
}

Pop-Location
Write-Header "GATA: Rollback finalizat"
