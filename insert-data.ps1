# Insert governance sample data
Write-Host "Inserting governance sample data..." -ForegroundColor Yellow

$env:PGPASSWORD = "Chemz@25"
$query = Get-Content "c:\Users\tanaka.majuru\Downloads\SAAS DOCS\Governance SaaS Application\backend\database\insert-governance-data.sql" | Out-String

try {
    $result = psql -h localhost -p 5432 -U postgres -d uniacco -c $query
    Write-Host "Data insertion completed!" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
