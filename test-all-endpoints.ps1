# Test all key endpoints
Write-Host "Testing all CareSignal API endpoints..." -ForegroundColor Yellow

# Use the admin token
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImlhdCI6MTc3MzA1NjcyMiwiZXhwIjoxNzczNjYxNTIyfQ.eGdeMMHn-QO7HzU66arWa4xmdzLex8CWeSoi7NI0H4c"

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

# Test endpoints
$endpoints = @(
    @{Name="Houses"; Url="http://localhost:3001/api/houses?page=1&limit=5"},
    @{Name="Governance Pulses"; Url="http://localhost:3001/api/governance-pulse?page=1&limit=5"},
    @{Name="Incidents"; Url="http://localhost:3001/api/incidents?page=1&limit=5"},
    @{Name="Risks"; Url="http://localhost:3001/api/risks?page=1&limit=5"},
    @{Name="Trends"; Url="http://localhost:3001/api/trends?page=1&limit=5"}
)

foreach ($endpoint in $endpoints) {
    Write-Host "`nTesting $($endpoint.Name) endpoint..." -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri $endpoint.Url -Method GET -Headers $headers
        Write-Host "✅ $($endpoint.Name): SUCCESS" -ForegroundColor Green
        $data = $response | ConvertFrom-Json
        Write-Host "   Found $($data.data.count) items" -ForegroundColor White
    } catch {
        Write-Host "❌ $($endpoint.Name): FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
        if ($_.Exception.Response) {
            Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n🎊 Endpoint testing complete!" -ForegroundColor Magenta
