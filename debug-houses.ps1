# Debug houses endpoint
Write-Host "Debugging houses endpoint..." -ForegroundColor Yellow

$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImlhdCI6MTc3MzA1NjcyMiwiZXhwIjoxNzczNjYxNTIyfQ.eGdeMMHn-QO7HzU66arWa4xmdzLex8CWeSoi7NI0H4c"

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/houses?page=1&limit=5" -Method GET -Headers $headers
    Write-Host "✅ Raw response received:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Format-List
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
        $errorBody = $_.Exception.Response.GetResponseStream()
        $reader = [System.IO.StreamReader]::new($errorBody)
        $errorText = $reader.ReadToEnd()
        Write-Host "Error Response:" -ForegroundColor Yellow
        $errorText | ConvertFrom-Json | Format-List
    }
}
