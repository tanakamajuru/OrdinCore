# Simple endpoint test
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImlhdCI6MTc3MzA1NjcyMiwiZXhwIjoxNzczNjYxNTIyfQ.eGdeMMHn-QO7HzU66arWa4xmdzLex8CWeSoi7NI0H4c"

$headers = @{
    'Authorization' = "Bearer $token"
}

Write-Host "Testing Governance Pulses endpoint..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/governance-pulse?page=1&limit=5" -Method GET -Headers $headers
    Write-Host "SUCCESS: Response received" -ForegroundColor Green
    $response | ConvertTo-Json | ConvertTo-Json -Depth 5
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}
