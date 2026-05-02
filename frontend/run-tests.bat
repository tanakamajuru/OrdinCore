@echo off
echo Starting Ordin Core Playwright Tests...
echo.

REM Check if backend is running
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Backend is not running on port 3001
    echo Please start the backend server first
    pause
    exit /b 1
)

echo Backend is running - proceeding with tests...

REM Run UI tests first
echo Running UI tests...
npx playwright test tests/ui.spec.ts --project=chromium --timeout=30000
if %errorlevel% neq 0 (
    echo ERROR: UI tests failed
    pause
    exit /b 1
)

echo UI tests completed - running API tests...

REM Run API tests
echo Running API tests...
npx playwright test tests/api/pulse-api.spec.ts --project=chromium --timeout=30000
if %errorlevel% neq 0 (
    echo ERROR: API tests failed
    pause
    exit /b 1
)

echo API tests completed - running closed-loop test...

REM Run the critical closed-loop test
echo Running closed-loop test...
npx playwright test tests/05-closed-loop.spec.ts --project=chromium --timeout=60000
if %errorlevel% neq 0 (
    echo ERROR: Closed-loop test failed
    pause
    exit /b 1
)

echo.
echo ====================================
echo All tests completed!
echo ====================================
echo.
cd /d "c:\Users\tanaka.majuru\Downloads\SAAS DOCS\Governance SaaS Application\frontend" && run-tests.bat
echo.
pause
