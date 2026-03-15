# Replace the broken auth middleware
Write-Host "Replacing auth-postgres.ts with fixed version..." -ForegroundColor Yellow

$sourcePath = "c:\Users\tanaka.majuru\Downloads\SAAS DOCS\Governance SaaS Application\backend\src\middleware\auth-fixed.ts"
$destPath = "c:\Users\tanaka.majuru\Downloads\SAAS DOCS\Governance SaaS Application\backend\src\middleware\auth-postgres.ts"

try {
    Copy-Item -Path $sourcePath -Destination $destPath -Force
    Write-Host "✅ Auth middleware replaced successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error replacing file: $($_.Exception.Message)" -ForegroundColor Red
}
