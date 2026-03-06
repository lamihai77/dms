# CONECTARE
$server = "ssi-prod-sqldb.intern.anre,1433"
$database = "dms_prod"
$user = "dms_readonly"
$password = "dmsRead2026"

$connString = "Server=$server;Database=$database;User Id=$user;Password=$password;TrustServerCertificate=True"

Write-Host "--- TEST CONEXIUNE READ-ONLY SPRE $server ---" -ForegroundColor Cyan

try {
    # Deschidem conexiunea
    $conn = New-Object System.Data.SqlClient.SqlConnection($connString)
    $conn.Open()
    Write-Host "[OK] Conectare reusita la server!" -ForegroundColor Green

    # DEFINIRE INTEROGARE (Doar citire, doar primele 3 randuri)
    $query = "SELECT TOP 3 EMAIL, NUME FROM DMS.UTILIZATORI WHERE EMAIL IS NOT NULL"
    Write-Host "[INFO] Executam: $query" -ForegroundColor Yellow

    # Executam
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $query
    $reader = $cmd.ExecuteReader()

    # Incarcam in tabel si afisam
    $dataTable = New-Object System.Data.DataTable
    $dataTable.Load($reader)

    if ($dataTable.Rows.Count -gt 0) {
        Write-Host "[OK] Gasit $($dataTable.Rows.Count) rezultate:" -ForegroundColor Green
        $dataTable | Format-Table -AutoSize
    }
    else {
        Write-Host "[INFO] Zero rezultate gasite." -ForegroundColor Yellow
    }

    # Inchidere conexiune
    $conn.Close()
}
catch {
    Write-Host "[FAIL] Eroare: $($_.Exception.Message)" -ForegroundColor Red
}
$server = 'ssi-prod-sqldb.intern.anre,1433'
$database = 'dms_prod'
$user = 'dms_readonly'
$password = 'dmsRead2026'

$connString = "Server=$server;Database=$database;User Id=$user;Password=$password;TrustServerCertificate=True"

Write-Host "[TEST] Conectare la $server | BD: $database | User: $user" -ForegroundColor Cyan

try {
    $conn = New-Object System.Data.SqlClient.SqlConnection($connString)
    $conn.Open()
    Write-Host "[TEST] ✅ Conectare cu succes!" -ForegroundColor Green

    $query = "SELECT TOP 3 EMAIL, NUME FROM UTILIZATORI WHERE EMAIL IS NOT NULL"
    Write-Host "[TEST] Rulare SELECT: $query" -ForegroundColor Yellow

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $query
    $reader = $cmd.ExecuteReader()

    $dataTable = New-Object System.Data.DataTable
    $dataTable.Load($reader)

    Write-Host "[TEST] ✅ S-au gasit $($dataTable.Rows.Count) linii:" -ForegroundColor Green
    $dataTable | Format-Table -AutoSize

    $conn.Close()
}
catch {
    Write-Host "[TEST] ❌ Eroare: $($_.Exception.Message)" -ForegroundColor Red
}
