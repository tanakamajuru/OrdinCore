# Debug login response
Write-Host "Testing login response format..." -ForegroundColor Yellow

$body = @{
    email = "admin@caresignal.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $body
    Write-Host "Response Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response Headers:" -ForegroundColor Cyan
    $response.Headers | ForEach-Object { Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor Gray }
    
    Write-Host "Response Body:" -ForegroundColor Yellow
    $responseContent = $response.Content.ReadAsStringAsync().Result
    Write-Host $responseContent -ForegroundColor White
    
    # Try to parse as JSON to check format
    try {
        $jsonData = $responseContent | ConvertFrom-Json
        Write-Host "JSON Parse: SUCCESS" -ForegroundColor Green
        $jsonData | ConvertTo-Json -Depth 10
    } catch {
        Write-Host "JSON Parse: FAILED - $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Raw response that failed parsing:" -ForegroundColor Yellow
        Write-Host $responseContent -ForegroundColor Red
    }
} catch {
    Write-Host "Request Error: $($_.Exception.Message)" -ForegroundColor Red
}
