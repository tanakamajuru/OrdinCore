# PowerShell script to fix database schema issues
# This script adds the missing organization column to the users table

Write-Host "🔧 Fixing database schema..." -ForegroundColor Yellow

# Database connection parameters
$dbHost = "localhost"
$dbPort = "5432"
$dbName = "uniacco"
$dbUser = "postgres"
$dbPassword = "Chemz@25"

# Set PGPASSWORD environment variable for psql
$env:PGPASSWORD = $dbPassword

try {
    # Run the fix schema script
    Write-Host "📝 Adding missing organization column..." -ForegroundColor Cyan
    
    $sqlScript = @"
-- Add organization column if it doesn't exist
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='organization') THEN
        ALTER TABLE users ADD COLUMN organization VARCHAR(255) DEFAULT 'CareSignal';
        RAISE NOTICE 'Added organization column to users table';
    ELSE
        RAISE NOTICE 'Organization column already exists';
    END IF;
END \$\$;

-- Update role constraint to include admin
DO \$\$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name='users_role_check') THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
        RAISE NOTICE 'Dropped old role constraint';
    END IF;
    
    ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('admin', 'registered-manager', 'responsible-individual', 'director'));
    RAISE NOTICE 'Added new role constraint with admin role';
END \$\$;

-- Show updated table structure
\d users;
"@
    
    # Save SQL to temp file and execute
    $tempFile = New-TemporaryFile
    $sqlScript | Out-File -FilePath $tempFile.FullName -Encoding utf8
    
    Write-Host "🚀 Executing SQL commands..." -ForegroundColor Green
    $result = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $tempFile.FullName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database schema fixed successfully!" -ForegroundColor Green
        Write-Host "📊 Updated users table structure:" -ForegroundColor Cyan
        $result
    } else {
        Write-Host "❌ Error executing SQL commands" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
    
    # Clean up temp file
    Remove-Item $tempFile.FullName -Force
    
} catch {
    Write-Host "❌ Database connection error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Please ensure:" -ForegroundColor Yellow
    Write-Host "   1. PostgreSQL is running" -ForegroundColor Yellow
    Write-Host "   2. Database 'uniacco' exists" -ForegroundColor Yellow
    Write-Host "   3. Connection details are correct" -ForegroundColor Yellow
} finally {
    # Clear environment variable
    Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "🎯 Now try the login again!" -ForegroundColor Magenta
