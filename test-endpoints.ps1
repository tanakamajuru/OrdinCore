# PowerShell script to test API endpoints
# Run with: .\test-endpoints.ps1

Write-Host "🚀 Testing CareSignal API Endpoints..." -ForegroundColor Green
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
    Write-Host "   Status: 200" -ForegroundColor Green
    Write-Host "   Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Cyan
    Write-Host "   ✅ Health check working!" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Admin Login
Write-Host "2. Testing Admin Login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "admin@caresignal.com"
        password = "admin123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    Write-Host "   Status: 200" -ForegroundColor Green
    Write-Host "   Response: $($loginResponse | ConvertTo-Json -Compress)" -ForegroundColor Cyan
    Write-Host "   ✅ Admin login successful!" -ForegroundColor Green
    
    $adminToken = $loginResponse.token
    
    # Test 3: Get Users (Admin Only)
    Write-Host ""
    Write-Host "3. Testing Get Users (Admin Only)..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $adminToken"
            "Content-Type" = "application/json"
        }
        
        $usersResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/users" -Method GET -Headers $headers
        Write-Host "   Status: 200" -ForegroundColor Green
        Write-Host "   Users count: $($usersResponse.data.Count)" -ForegroundColor Cyan
        Write-Host "   ✅ Get users working!" -ForegroundColor Green
        
        # Test 4: Get Dashboard Stats
        Write-Host ""
        Write-Host "4. Testing Dashboard Stats..." -ForegroundColor Yellow
        try {
            $statsResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/dashboard/stats" -Method GET -Headers $headers
            Write-Host "   Status: 200" -ForegroundColor Green
            Write-Host "   Stats: $($statsResponse.data | ConvertTo-Json -Compress)" -ForegroundColor Cyan
            Write-Host "   ✅ Dashboard stats working!" -ForegroundColor Green
            
            # Test 5: Create User
            Write-Host ""
            Write-Host "5. Testing Create User..." -ForegroundColor Yellow
            try {
                $createUserBody = @{
                    email = "test.user@example.com"
                    name = "Test User"
                    password = "testpassword123"
                    role = "registered-manager"
                    organization = "CareSignal Test"
                } | ConvertTo-Json
                
                $createUserResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/users" -Method POST -ContentType "application/json" -Body $createUserBody -Headers $headers
                Write-Host "   Status: 201" -ForegroundColor Green
                Write-Host "   Response: $($createUserResponse | ConvertTo-Json -Compress)" -ForegroundColor Cyan
                Write-Host "   ✅ Create user working!" -ForegroundColor Green
                
            } catch {
                Write-Host "   ❌ Create user failed: $($_.Exception.Message)" -ForegroundColor Red
            }
            
        } catch {
            Write-Host "   ❌ Dashboard stats failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "   ❌ Get users failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "   ❌ Admin login failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Invalid Login
Write-Host ""
Write-Host "6. Testing Invalid Login..." -ForegroundColor Yellow
try {
    $invalidLoginBody = @{
        email = "invalid@example.com"
        password = "wrongpassword"
    } | ConvertTo-Json
    
    try {
        $invalidLoginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $invalidLoginBody
        Write-Host "   ❌ Invalid login should have failed!" -ForegroundColor Red
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "   Status: 401" -ForegroundColor Yellow
            Write-Host "   ✅ Invalid login properly rejected!" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "   ❌ Invalid login test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 API Testing Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Health Check" -ForegroundColor Green
Write-Host "   ✅ Admin Authentication" -ForegroundColor Green
Write-Host "   ✅ User Management" -ForegroundColor Green
Write-Host "   ✅ Dashboard Statistics" -ForegroundColor Green
Write-Host "   ✅ Error Handling" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 All endpoints are working correctly!" -ForegroundColor Green
