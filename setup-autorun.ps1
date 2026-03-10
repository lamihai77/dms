$Path = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\Start_DMS_Dev.lnk"
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($Path)
$Shortcut.TargetPath = "d:\Proiecte\dms\start-dev.bat"
$Shortcut.WorkingDirectory = "d:\Proiecte\dms"
$Shortcut.Description = "Starts DMS Development Server"
$Shortcut.Save()
Write-Host "Scurtătura a fost creată cu succes la: $Path"
