# Test governance pulse with curl
Write-Host "Testing governance pulses with curl..." -ForegroundColor Yellow

$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImlhdCI6MTc3MzA1NjcyMiwiZXhwIjoxNzczNjYxNTIyfQ.eGdeMMHn-QO7HzU66arWa4xmdzLex8CWeSoi7NI0H4c"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = curl -X GET "http://localhost:3001/api/governance-pulse?page=1&limit=5" -Headers $headers -s
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertFrom-Json | Format-List
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
