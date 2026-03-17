#requires -RunAsAdministrator
param(
  [string]$TaskName = 'DMS Admin Server',
  [string]$StartScript = 'd:\Proiecte\dms\start-server.bat',
  [string]$WorkingDir = 'd:\Proiecte\dms',
  [string]$RunAsUser = 'SYSTEM',
  [string]$Delay = '00:00:10' # poate fi ignorat pe unele versiuni Windows
)

Write-Host "Creating/Updating scheduled task '$TaskName' to run at startup..."

# Build action, trigger, settings
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$StartScript`"" -WorkingDirectory $WorkingDir

# Creeaza trigger la startup; unele versiuni nu suporta -Delay
try {
  $trigger = New-ScheduledTaskTrigger -AtStartup -Delay $Delay
} catch {
  Write-Warning "New-ScheduledTaskTrigger -Delay nu este suportat pe acest sistem. Continui fara intarziere."
  $trigger = New-ScheduledTaskTrigger -AtStartup
}

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

# If task exists, remove it first (force replace)
$exists = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($exists) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
}

# Register task
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -User $RunAsUser -RunLevel Highest -Force | Out-Null

Write-Host "Task '$TaskName' created. Starting it now..."
try {
  Start-ScheduledTask -TaskName $TaskName
} catch {
  Write-Warning "Nu am putut porni task-ul imediat: $($_.Exception.Message)"
}

Start-Sleep -Seconds 2

# Show brief status
schtasks /query /tn "$TaskName" /v /fo LIST
