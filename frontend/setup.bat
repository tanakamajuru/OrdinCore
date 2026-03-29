@echo off
REM Ordin Core Backend-Frontend Integration Setup Script for Windows
REM This script automates the complete setup process

setlocal enabledelayedexpansion

echo.
echo ========================================
echo OrdinCore Backend-Frontend Integration Setup
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "backend\package.json" (
    echo [ERROR] Please run this script from the root directory of the OrdinCore project.
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo [ERROR] Please run this script from the root directory of the OrdinCore project.
    pause
    exit /b 1
)

REM Check prerequisites
echo [INFO] Checking prerequisites...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "tokens=1 delims=." %%i in ("%NODE_VERSION%") do set NODE_MAJOR=%%i

if %NODE_MAJOR% lss 18 (
    echo [ERROR] Node.js version 18+ is required. Current version: !NODE_VERSION!
    pause
    exit /b 1
)

echo [SUCCESS] Node.js !NODE_VERSION! found

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed.
    pause
    exit /b 1
)

echo [SUCCESS] npm found

REM Check PostgreSQL
psql --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] PostgreSQL not found in PATH. Please ensure PostgreSQL is installed and accessible.
) else (
    echo [SUCCESS] PostgreSQL found
)

REM Check MongoDB
mongod --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] MongoDB not found in PATH. Please ensure MongoDB is installed and accessible.
) else (
    echo [SUCCESS] MongoDB found
)

echo.
echo [INFO] Prerequisites check completed
echo.

REM Setup database
echo [INFO] Setting up PostgreSQL database...

REM Check if database exists
psql -h localhost -U postgres -d postgres -c "SELECT 1 FROM pg_database WHERE datname='caresignal_db';" 2>nul | findstr "1" >nul
if errorlevel 1 (
    echo [INFO] Creating database and user...
    
    REM Create database and user
    psql -h localhost -U postgres -d postgres -c "CREATE DATABASE caresignal_db;" 2>nul
    if errorlevel 1 (
        echo [ERROR] Failed to create database. Please check PostgreSQL connection and permissions.
        pause
        exit /b 1
    )
    
    psql -h localhost -U postgres -d postgres -c "CREATE USER caresignal_user WITH PASSWORD 'caresignal_password';" 2>nul
    psql -h localhost -U postgres -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE caresignal_db TO caresignal_user;" 2>nul
    psql -h localhost -U postgres -d postgres -c "GRANT ALL PRIVILEGES ON SCHEMA public TO caresignal_user;" 2>nul
    psql -h localhost -U postgres -d postgres -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO caresignal_user;" 2>nul
    psql -h localhost -U postgres -d postgres -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO caresignal_user;" 2>nul
    
    echo [SUCCESS] Database and user created
) else (
    echo [WARNING] Database 'caresignal_db' already exists. Skipping creation.
)

REM Run schema and data scripts
echo [INFO] Creating database schema...
psql -h localhost -U caresignal_user -d caresignal_db -f backend\database\02_create_schema.sql >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to create database schema.
    pause
    exit /b 1
)
echo [SUCCESS] Database schema created

echo [INFO] Populating sample data...
psql -h localhost -U caresignal_user -d caresignal_db -f backend\database\03_populate_data.sql >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to populate sample data.
    pause
    exit /b 1
)
echo [SUCCESS] Sample data populated

echo.
echo [INFO] Database setup completed
echo.

REM Setup backend
echo [INFO] Setting up backend...
cd backend

if not exist "node_modules" (
    echo [INFO] Installing backend dependencies...
    npm install >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Failed to install backend dependencies.
        cd ..
        pause
        exit /b 1
    )
    echo [SUCCESS] Backend dependencies installed
) else (
    echo [WARNING] Backend node_modules already exists. Skipping installation.
)

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo [INFO] Creating .env file...
    copy .env.example .env >nul
    
    REM Update .env with default values
    powershell -Command "(Get-Content .env) -replace 'USE_POSTGRES=false', 'USE_POSTGRES=true' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'ENABLE_ENGINES=false', 'ENABLE_ENGINES=true' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'MONGODB_URI=.*', 'MONGODB_URI=mongodb://localhost:27017/caresignal_mongo' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'DB_HOST=.*', 'DB_HOST=localhost' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'DB_PORT=.*', 'DB_PORT=5432' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'DB_NAME=.*', 'DB_NAME=caresignal_db' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'DB_USER=.*', 'DB_USER=caresignal_user' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'DB_PASSWORD=.*', 'DB_PASSWORD=caresignal_password' | Set-Content .env"
    
    echo [SUCCESS] .env file created with default configuration
) else (
    echo [WARNING] .env file already exists. Skipping creation.
)

cd ..
echo [SUCCESS] Backend setup completed

echo.
echo [INFO] Setting up frontend...
cd frontend

if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    npm install >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies.
        cd ..
        pause
        exit /b 1
    )
    echo [SUCCESS] Frontend dependencies installed
) else (
    echo [WARNING] Frontend node_modules already exists. Skipping installation.
)

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo [INFO] Creating frontend .env file...
    echo REACT_APP_API_URL=http://localhost:3001/api > .env
    echo REACT_APP_WS_URL=http://localhost:3001 >> .env
    echo [SUCCESS] Frontend .env file created
) else (
    echo [WARNING] Frontend .env file already exists. Skipping creation.
)

cd ..
echo [SUCCESS] Frontend setup completed

echo.
echo [INFO] Verifying setup...

REM Test database connection
echo [INFO] Testing PostgreSQL connection...
psql -h localhost -U caresignal_user -d caresignal_db -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PostgreSQL connection failed
    pause
    exit /b 1
)
echo [SUCCESS] PostgreSQL connection successful

REM Test backend build
echo [INFO] Testing backend build...
cd backend
npm run build >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Backend build failed
    cd ..
    pause
    exit /b 1
)
echo [SUCCESS] Backend build successful
cd ..

REM Test frontend build
echo [INFO] Testing frontend build...
cd frontend
npm run build >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Frontend build failed
    cd ..
    pause
    exit /b 1
)
echo [SUCCESS] Frontend build successful
cd ..

echo [SUCCESS] Setup verification completed

echo.
echo [SUCCESS] 🎉 Ordin Core setup completed successfully!
echo.
echo 📊 Backend API: http://localhost:3001
echo 🌐 Frontend: http://localhost:5173
echo 📖 API Docs: http://localhost:3001/api-docs
echo 💚 Health Check: http://localhost:3001/health
echo.
echo To start the application manually:
echo 1. Backend: cd backend && npm run dev
echo 2. Frontend: cd frontend && npm run dev
echo.
echo Or run the start-services.bat script to start both automatically.
echo.
pause
