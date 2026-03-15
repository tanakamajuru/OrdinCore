# Manual API Testing Guide

## 🔧 **Quick Testing Commands**

### **1. Health Check**
```powershell
# Open PowerShell and run:
Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
```
**Expected**: Status "OK" with timestamp

---

### **2. Admin Login**
```powershell
$body = @{
    email = "admin@caresignal.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $body
$token = $loginResponse.token
Write-Host "Token: $token"
```
**Expected**: JWT token and user data

---

### **3. Get Users (Admin Only)**
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$users = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/users" -Method GET -Headers $headers
$users.data | Format-Table
```
**Expected**: List of all users with pagination

---

### **4. Get Dashboard Stats**
```powershell
$stats = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/dashboard/stats" -Method GET -Headers $headers
$stats.data
```
**Expected**: User statistics and system metrics

---

### **5. Create New User**
```powershell
$newUser = @{
    email = "test.user@example.com"
    name = "Test User"
    password = "testpassword123"
    role = "registered-manager"
    organization = "CareSignal Test"
} | ConvertTo-Json

$createdUser = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/users" -Method POST -ContentType "application/json" -Body $newUser -Headers $headers
$createdUser
```
**Expected**: Created user data with ID

---

### **6. Update User**
```powershell
$updateBody = @{
    name = "Test User Updated"
    role = "director"
    isActive = $true
} | ConvertTo-Json

$updatedUser = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/users/550e8400-e29b-41d4-a716-446655440001" -Method PUT -ContentType "application/json" -Body $updateBody -Headers $headers
$updatedUser
```
**Expected**: Updated user data

---

### **7. Delete User**
```powershell
$deleteResult = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/users/550e8400-e29b-41d4-a716-446655440006" -Method DELETE -Headers $headers
$deleteResult
```
**Expected**: Success message

---

### **8. Test Invalid Login**
```powershell
$invalidBody = @{
    email = "invalid@example.com"
    password = "wrongpassword"
} | ConvertTo-Json

try {
    $invalidLogin = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $invalidBody
} catch {
    Write-Host "Expected error: $($_.Exception.Message)"
}
```
**Expected**: 401 Unauthorized error

---

## 🌐 **Browser Testing**

### **Swagger UI Testing**
1. Open: `http://localhost:3001/api-docs`
2. Click "Authorize" button
3. Enter: `Bearer <your-token-here>`
4. Test endpoints directly in browser

### **Frontend Testing**
1. Start frontend: `cd frontend && pnpm dev`
2. Navigate to: `http://localhost:5173`
3. Login with: `admin@caresignal.com` / `admin123`
4. Access admin dashboard

---

## 📊 **Expected Results Summary**

| Test | Expected Status | Expected Result |
|------|-----------------|----------------|
| Health Check | 200 | `{status: "OK"}` |
| Admin Login | 200 | JWT token + user data |
| Get Users | 200 | Paginated users list |
| Dashboard Stats | 200 | System statistics |
| Create User | 201 | New user data |
| Update User | 200 | Updated user data |
| Delete User | 200 | Success message |
| Invalid Login | 401 | Error message |

---

## 🔍 **Troubleshooting**

### **Common Issues**

**"Connection refused"**
- Backend not running
- Wrong port (should be 3001)
- Firewall blocking

**"401 Unauthorized"**
- Invalid credentials
- Token expired
- Wrong token format

**"403 Forbidden"**
- Non-admin user trying admin endpoints
- Token valid but insufficient permissions

**"404 Not Found"**
- Wrong endpoint URL
- User ID doesn't exist

**"500 Server Error"**
- Database connection issues
- Missing environment variables
- Code errors

### **Debug Steps**

1. **Check Backend Status**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
   ```

2. **Verify Database Connection**
   - Check PostgreSQL is running
   - Verify .env database settings

3. **Check Logs**
   - Look at backend console output
   - Check for error messages

4. **Test Token Validity**
   ```powershell
   # Decode JWT token (first part only)
   $tokenParts = $token -split '\.'
   $decoded = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($tokenParts[1]))
   $decoded | ConvertFrom-Json
   ```

---

## 📋 **Testing Checklist**

### **Authentication Tests**
- [ ] Admin login works
- [ ] Invalid credentials rejected
- [ ] Token generated correctly
- [ ] Token format valid

### **Admin Endpoint Tests**
- [ ] Get users list
- [ ] Create new user
- [ ] Update existing user
- [ ] Delete user
- [ ] Get dashboard stats

### **Security Tests**
- [ ] Admin-only protection
- [ ] Token validation
- [ ] Role-based access
- [ ] Input validation

### **Error Handling Tests**
- [ ] 401 Unauthorized
- [ ] 403 Forbidden
- [ ] 404 Not Found
- [ ] 400 Validation errors

---

## 🚀 **Quick Test Script**

Copy and paste this into PowerShell:

```powershell
# Quick API Test
Write-Host "Testing CareSignal API..." -ForegroundColor Green

# Test 1: Health
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
    Write-Host "✅ Health: $($health.status)" -ForegroundColor Green
} catch { Write-Host "❌ Health failed" -ForegroundColor Red }

# Test 2: Login
try {
    $loginBody = @{email="admin@caresignal.com"; password="admin123"} | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    Write-Host "✅ Login: $($login.user.name)" -ForegroundColor Green
    $token = $login.token
    
    # Test 3: Users
    $headers = @{Authorization="Bearer $token"; ContentType="application/json"}
    $users = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/users" -Method GET -Headers $headers
    Write-Host "✅ Users: $($users.data.Count) found" -ForegroundColor Green
    
    # Test 4: Stats
    $stats = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/dashboard/stats" -Method GET -Headers $headers
    Write-Host "✅ Stats: $($stats.data.totalUsers) users, $($stats.data.totalHouses) houses" -ForegroundColor Green
    
} catch { Write-Host "❌ API tests failed: $($_.Exception.Message)" -ForegroundColor Red }

Write-Host "Done!" -ForegroundColor Cyan
```

Run this script to quickly verify all endpoints are working! 🎯
