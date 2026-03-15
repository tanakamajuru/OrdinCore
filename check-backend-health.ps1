# Check backend health
Write-Host "Checking backend health..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
    Write-Host "Health Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Health Response:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Health Check Error: $($_.Exception.Message)" -ForegroundColor Red
}
