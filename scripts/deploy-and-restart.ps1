param(
  [string]$RepoPath = 'd:\Proiecte\dms',
  [string]$TaskName = 'DMS Admin Server',
  [string]$Branch   = 'main',
  [int]$Port        = 3000,
  [string]$HealthPath = '/api/health',
  [int]$Retries     = 30,
  [int]$DelaySec    = 2,
  [switch]$DefenderExclusion
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
    '-Branch', "`"$Branch`"",
    '-Port', "$Port",
    '-HealthPath', "`"$HealthPath`"",
    '-Retries', "$Retries",
    '-DelaySec', "$DelaySec"
  )
  if ($DefenderExclusion) { $argList += '-DefenderExclusion' }
  Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $argList | Out-Null
  Write-Host "Script relansat cu privilegii de administrator." -ForegroundColor Yellow
  exit 0
}

# Cleanup Defender exclusion on any terminating error
$script:exclusionAdded = $false
trap {
  if ($DefenderExclusion -and $script:exclusionAdded) {
    try { Remove-MpPreference -ExclusionPath $RepoPath } catch { }
  }
  throw
}

function Write-Header($text) {
  Write-Host "`n=== $text ===" -ForegroundColor Cyan
}

function Test-TaskExists($name) {
  $null = schtasks /query /tn "$name" 2>$null
  return ($LASTEXITCODE -eq 0)
}

function Invoke-Healthcheck($url, $retries, $delay) {
  for ($i = 1; $i -le $retries; $i++) {
    try {
      # Foloseste GET pentru robustete (HEAD poate fi blocat/neasociat in unele rute)
      $r = Invoke-WebRequest -UseBasicParsing -Uri $url -Method Get -TimeoutSec 3
      if ($r.StatusCode -eq 200) { return $true }
    } catch { }
    Start-Sleep -Seconds $delay
  }
  return $false
}

function Test-FrontendAssets($baseUrl) {
  try {
    $home = Invoke-WebRequest -UseBasicParsing -Uri "$baseUrl/" -Method Get -TimeoutSec 5
    if (-not $home.Content) { return $false }
    $m = [regex]::Match($home.Content, '/_next/static/chunks/[^"''\s]+\.css')
    if (-not $m.Success) { return $false }
    $assetUrl = "$baseUrl$($m.Value)"
    $asset = Invoke-WebRequest -UseBasicParsing -Uri $assetUrl -Method Get -TimeoutSec 5
    return ($asset.StatusCode -eq 200)
  } catch {
    return $false
  }
}

Write-Header "DEPLOY: Stop task (if running)"
if (Test-TaskExists $TaskName) {
  try { schtasks /end /tn "$TaskName" 2>$null | Out-Null } catch { }
} else {
  Write-Host "(Info) Task '$TaskName' nu exista inca. Continui fara stop." -ForegroundColor Yellow
}

Write-Header "PROCESS CLEANUP: Kill stray node/next processes"
# 1) Inchide orice proces node/cmd care ruleaza din repo-ul tinta (de ex. pornit manual cu start-server.bat)
try {
  $procs = Get-CimInstance Win32_Process |
    Where-Object { $_.Name -in @('node.exe','cmd.exe') -and $_.CommandLine -match [regex]::Escape($RepoPath) }
  if ($procs) {
    $procs | ForEach-Object {
      try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch { }
    }
  }
} catch { }

# 2) Inchide orice proces node care ruleaza "next start"
try {
  $procs2 = Get-CimInstance Win32_Process |
    Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'next\s+start' }
  if ($procs2) {
    $procs2 | ForEach-Object {
      try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch { }
    }
  }
} catch { }

# 3) Inchide procesul care asculta pe portul $Port (de regula procesul Next)
try {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn -and $conn.OwningProcess) {
    try { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction Stop } catch { }
  }
} catch { }

Start-Sleep -Seconds 1

Write-Header "DEPLOY: Pull from Git ($Branch)"
if (-not (Test-Path -LiteralPath $RepoPath)) { throw "RepoPath nu exista: $RepoPath" }
Push-Location $RepoPath

# Ensure we're on the expected branch
try { git rev-parse --is-inside-work-tree | Out-Null } catch { throw "Directorul nu pare a fi un repo Git: $RepoPath" }

# Optional: fetch and checkout branch (in case nu e curentul)
try { git fetch origin $Branch | Out-Null } catch { }
try { git checkout $Branch | Out-Null } catch { }

# Pull latest
git pull origin $Branch
if ($LASTEXITCODE -ne 0) { throw "git pull a esuat (cod $LASTEXITCODE)" }

# Optional: add temporary Windows Defender exclusion to avoid EPERM locks on native modules during install
if ($DefenderExclusion) {
  Write-Header "DEFENDER: Add temporary exclusion for $RepoPath"
  if (Get-Command Add-MpPreference -ErrorAction SilentlyContinue) {
    try { Add-MpPreference -ExclusionPath $RepoPath; $script:exclusionAdded = $true }
    catch { Write-Warning "Nu am putut adauga excluderea Defender: $($_.Exception.Message)" }
  } else {
    Write-Warning "Cmdlet-urile Windows Defender nu sunt disponibile pe acest sistem."
  }
}

Write-Header "DEPLOY: Install deps (npm ci/install)"
$npm = (Get-Command npm -ErrorAction SilentlyContinue).Path
if (-not $npm) { throw "npm nu este in PATH pentru acest utilizator. Instaleaza Node.js sau adauga npm in PATH si reincearca." }

function Invoke-NpmInstall {
  param([string]$Repo)
  $hasLock = Test-Path -LiteralPath (Join-Path $Repo 'package-lock.json')
  $verb = if ($hasLock) { 'ci' } else { 'install' }
  # Ruleaza prin cmd.exe pentru compatibilitate cu npm.cmd; foloseste ArgumentList ca array
  $proc = Start-Process -FilePath "cmd.exe" -ArgumentList @('/c','npm', $verb) -WorkingDirectory $Repo -NoNewWindow -Wait -PassThru
  return [int]$proc.ExitCode
}

# Prima incercare
$code = Invoke-NpmInstall -Repo $RepoPath
if ($code -ne 0) {
  Write-Warning "npm ci/install a esuat (cod $code). Incerc remediere rapida pentru lock EPERM..."
  # Incearca sa deblochezi fisierele SWC daca sunt blocate
  $swcDir  = Join-Path $RepoPath 'node_modules\@next\swc-win32-x64-msvc'
  $swcFile = Join-Path $swcDir 'next-swc.win32-x64-msvc.node'
  try {
    if (Test-Path -LiteralPath $swcFile) {
      attrib -R "$swcFile" 2>$null | Out-Null
      # incearca redenumire dir (va esua daca e blocat de un proces/antivirus)
      if (Test-Path -LiteralPath $swcDir) {
        $swcOld = "$swcDir.old-$(Get-Date -Format yyyyMMddHHmmss)"
        try { Rename-Item -LiteralPath $swcDir -NewName $swcOld -ErrorAction Stop } catch { }
      }
    }
  } catch { }
  Start-Sleep -Seconds 1
  # A doua incercare
  $code = Invoke-NpmInstall -Repo $RepoPath
}
if ($code -ne 0) {
  throw "npm ci/install a esuat (cod $code). Daca vezi EPERM/UNLINK pe next-swc.win32-x64-msvc.node:"
}

Write-Header "DEPLOY: Build (npm run build)"
$buildProc = Start-Process -FilePath "cmd.exe" -ArgumentList @('/c','npm','run','build') -WorkingDirectory $RepoPath -NoNewWindow -Wait -PassThru
if ([int]$buildProc.ExitCode -ne 0) { throw "npm run build a esuat (cod $([int]$buildProc.ExitCode))" }

Write-Header "START: Task Scheduler"
if (Test-TaskExists $TaskName) {
  schtasks /run /tn "$TaskName" | Out-Null
} else {
  Write-Host "(Info) Task '$TaskName' nu exista. Pornesc manual start-server.bat" -ForegroundColor Yellow
  $startScript = Join-Path $RepoPath 'start-server.bat'
  if (-not (Test-Path -LiteralPath $startScript)) { throw "Nu gasesc $startScript" }
  # Ruleaza in background pentru a permite healthcheck-ul
  Start-Process -FilePath "$startScript" -WorkingDirectory $RepoPath | Out-Null
}

Start-Sleep -Seconds 2
Write-Header "HEALTHCHECK: http://127.0.0.1:$Port$HealthPath"
$ok = Invoke-Healthcheck -url "http://127.0.0.1:$Port$HealthPath" -retries $Retries -delay $DelaySec
if ($ok) {
  Write-Host "[OK] Aplicatia raspunde pe http://127.0.0.1:$Port$HealthPath" -ForegroundColor Green
  Write-Header "ASSET CHECK: frontend CSS/JS"
  $assetsOk = Test-FrontendAssets -baseUrl "http://127.0.0.1:$Port"
  if (-not $assetsOk) {
    throw "Aplicatia raspunde la healthcheck, dar assetele frontend (_next/static) nu sunt servite corect."
  }
  Write-Host "[OK] Assetele frontend sunt servite corect." -ForegroundColor Green
  Write-Header "TAGGING: release + prod-last-good + last-good.txt"
  try {
    $sha = (git rev-parse HEAD).Trim()
    # Marker local
    Set-Content -LiteralPath (Join-Path $RepoPath 'last-good.txt') -Value $sha -Encoding ASCII

    # Tag annotated per release (imuabil)
    $ts = Get-Date -Format 'yyyy.MM.dd-HHmm'
    $relTag = "release-$ts"
    try {
      git tag -a $relTag -m "Deploy $ts on $env:COMPUTERNAME" $sha | Out-Null
      git push origin $relTag | Out-Null
    } catch {
      Write-Warning "Nu am putut crea/trimite tag-ul ${relTag}: $($_.Exception.Message)"
    }

    # Pointer de mediu: tag mutabil prod-last-good
    try {
      git tag -f prod-last-good $sha | Out-Null
      git push -f origin prod-last-good | Out-Null
    } catch {
      Write-Warning "Nu am putut actualiza tag-ul prod-last-good: $($_.Exception.Message)"
    }

    # Optional: pointer de mediu ca branch (deploy/prod)
    try {
      git branch -f deploy/prod $sha | Out-Null
      git push -f origin deploy/prod | Out-Null
    } catch {
      Write-Warning "Nu am putut actualiza branch-ul deploy/prod: $($_.Exception.Message)"
    }
  } catch {
    Write-Warning "Tagging/last-good a esuat: $($_.Exception.Message)"
  }
} else {
  Write-Warning "[WARN] Aplicatia nu a raspuns in intervalul alocat. Verifica logurile."
  $log = Join-Path $RepoPath 'logs\\server.log'
  if (Test-Path -LiteralPath $log) {
    Write-Host "Ultimele 100 linii din ${log}:" -ForegroundColor Yellow
    Get-Content -LiteralPath $log -Tail 100
  } else {
    Write-Host "(Info) Log inexistent: $log" -ForegroundColor Yellow
  }
  exit 1
}

# Remove Defender exclusion if we added it
if ($DefenderExclusion -and $script:exclusionAdded) {
  Write-Header "DEFENDER: Remove temporary exclusion"
  try { Remove-MpPreference -ExclusionPath $RepoPath }
  catch { Write-Warning "Nu am putut elimina excluderea Defender: $($_.Exception.Message)" }
}

Pop-Location
Write-Header "GATA: Deploy + Restart finalizat"
