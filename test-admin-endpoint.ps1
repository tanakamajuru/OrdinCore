# Test admin users endpoint
Write-Host "Testing admin users endpoint..." -ForegroundColor Yellow

# Use the token from the previous login
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImlhdCI6MTc3MzA1NjcyMiwiZXhwIjoxNzczNjYxNTIyfQ.eGdeMMHn-QO7HzU66arWa4xmdzLex8CWeSoi7NI0H4c"

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/users?page=1&limit=10" -Method GET -Headers $headers
    Write-Host "✅ Admin users endpoint successful!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Admin users endpoint failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status Code:" $_.Exception.Response.StatusCode -ForegroundColor Yellow
        $errorBody = $_.Exception.Response.GetResponseStream()
        $reader = [System.IO.StreamReader]::new($errorBody)
        $errorText = $reader.ReadToEnd()
        Write-Host "Error Response:" $errorText -ForegroundColor Yellow
    }
}
