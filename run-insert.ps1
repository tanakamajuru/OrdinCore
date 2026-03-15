# Run the simple data insertion
Write-Host "Running data insertion..." -ForegroundColor Yellow

$env:PGPASSWORD = "Chemz@25"
$query = Get-Content "c:\Users\tanaka.majuru\Downloads\SAAS DOCS\Governance SaaS Application\backend\database\insert-simple-data.sql" | Out-String

try {
    $result = psql -h localhost -p 5432 -U postgres -d uniacco -c $query
    Write-Host "Data insertion result: $result" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
