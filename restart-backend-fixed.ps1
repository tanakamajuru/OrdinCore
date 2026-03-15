# Restart backend server
Write-Host "Restarting backend server..." -ForegroundColor Yellow

try {
    # Kill any existing Node processes on port 3001
    $processes = Get-Process | Where-Object { $_.ProcessName -eq "node" -and $_.MainWindowTitle -like "*3001*" }
    if ($processes) {
        $processes | Stop-Process -Force
        Write-Host "✅ Stopped existing Node processes" -ForegroundColor Green
    }
    Start-Sleep -Seconds 2
    
    Write-Host "✅ Backend server stopped" -ForegroundColor Green
    Write-Host "🚀 Starting backend server..." -ForegroundColor Green
    
    # Start the backend server
    Start-Process -WorkingDirectory "c:\Users\tanaka.majuru\Downloads\SAAS DOCS\Governance SaaS Application\backend" -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow -PassThru
    
    Write-Host "✅ Backend server restarted!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error restarting backend: $($_.Exception.Message)" -ForegroundColor Red
}
