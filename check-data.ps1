# Check governance data
Write-Host "Checking governance data..." -ForegroundColor Yellow

$env:PGPASSWORD = "Chemz@25"
$query = "SELECT COUNT(*) FROM governance_pulses"

try {
    $result = psql -h localhost -p 5432 -U postgres -d uniacco -c $query
    Write-Host "Governance pulses count: $($result)"
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
