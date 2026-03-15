# Simple backend restart
Write-Host "Restarting backend..." -ForegroundColor Yellow

try {
    # Stop Node processes
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    
    # Start Node server
    Start-Process -WorkingDirectory "c:\Users\tanaka.majuru\Downloads\SAAS DOCS\Governance SaaS Application\backend" -FilePath "cmd.exe" -ArgumentList "/c", "cmd", "/c", "cd", "c:\Users\tanaka.majuru\Downloads\SAAS DOCS\Governance SaaS Application\backend", "&", "npm", "run", "dev" -NoNewWindow
    
    Write-Host "✅ Backend restarted!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
