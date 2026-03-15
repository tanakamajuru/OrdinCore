# Test login endpoint
Write-Host "Testing login endpoint..." -ForegroundColor Yellow

$body = @{
    email = "admin@caresignal.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $body
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Login failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status Code:" $_.Exception.Response.StatusCode -ForegroundColor Yellow
        $errorBody = $_.Exception.Response.GetResponseStream()
        $reader = [System.IO.StreamReader]::new($errorBody)
        $errorText = $reader.ReadToEnd()
        Write-Host "Error Response:" $errorText -ForegroundColor Yellow
    }
}
