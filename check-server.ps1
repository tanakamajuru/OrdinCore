# Check if server is running
Write-Host "Checking if backend server is running..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -Method GET -TimeoutSec 5
    Write-Host "Server Status: $($response.StatusCode)" -ForegroundColor Green
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend server is running!" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend server is not responding!" -ForegroundColor Red
    }
} catch {
    Write-Host "Server Check Error: $($_.Exception.Message)" -ForegroundColor Red
}
