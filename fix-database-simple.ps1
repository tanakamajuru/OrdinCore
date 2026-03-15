# Simple database fix script
Write-Host "Fixing database schema..." -ForegroundColor Yellow

# Set environment variables
$env:PGPASSWORD = "Chemz@25"

try {
    # Add organization column
    Write-Host "Adding organization column..." -ForegroundColor Cyan
    psql -h localhost -p 5432 -U postgres -d uniacco -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS organization VARCHAR(255) DEFAULT 'CareSignal';"
    
    # Update role constraint
    Write-Host "Updating role constraint..." -ForegroundColor Cyan
    psql -h localhost -p 5432 -U postgres -d uniacco -c "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;"
    psql -h localhost -p 5432 -U postgres -d uniacco -c "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'registered-manager', 'responsible-individual', 'director'));"
    
    # Show table structure
    Write-Host "Updated table structure:" -ForegroundColor Green
    psql -h localhost -p 5432 -U postgres -d uniacco -c "\d users"
    
    Write-Host "Database fix completed!" -ForegroundColor Green
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
}
