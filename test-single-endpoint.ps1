# Test single endpoint
param(
    [Parameter(Mandatory=$true)]
    [string]$EndpointName,
    
    [Parameter(Mandatory=$true)]
    [string]$EndpointUrl
)

Write-Host "Testing $EndpointName endpoint..." -ForegroundColor Cyan

$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImlhdCI6MTc3MzA1NjcyMiwiZXhwIjoxNzczNjYxNTIyfQ.eGdeMMHn-QO7HzU66arWa4xmdzLex8CWeSoi7NI0H4c"

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

try {
    $response = Invoke-RestMethod -Uri $EndpointUrl -Method GET -Headers $headers
    Write-Host "✅ $EndpointName: SUCCESS" -ForegroundColor Green
    $data = $response | ConvertFrom-Json
    Write-Host "   Response structure:" -ForegroundColor White
    $data.PSObject.Properties | ForEach-Object { 
        Write-Host "   - $($_.Name): $(if ($data.$($_.Name) -is [array]) { "$($data.$($_.Name).Count) items" else { $data.$($_.Name) } }" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ $EndpointName: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
        $errorBody = $_.Exception.Response.GetResponseStream()
        $reader = [System.IO.StreamReader]::new($errorBody)
        $errorText = $reader.ReadToEnd()
        Write-Host "   Error Response:" -ForegroundColor Yellow
        $errorText
    }
}
