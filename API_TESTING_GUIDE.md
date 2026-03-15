# API Testing Guide

## 🔧 **Setup for Testing**

### **Base URL**
```
http://localhost:3001
```

### **Authentication**
Most endpoints require JWT token. First login to get token:

```bash
# Login as Admin
POST /api/auth/login
{
  "email": "admin@caresignal.com",
  "password": "admin123"
}
```

Copy the `token` from response and use it in Authorization header:
```
Authorization: Bearer <your-token-here>
```

---

## 🚀 **Endpoint Testing**

### **1. Authentication Endpoints**

#### **POST /api/auth/login**
```bash
# Request
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@caresignal.com",
  "password": "admin123"
}

# Expected Response (200)
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@caresignal.com",
    "name": "System Administrator",
    "role": "admin",
    "organization": "CareSignal",
    "is_active": true
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### **POST /api/auth/login (Invalid)**
```bash
# Request
POST /api/auth/login
{
  "email": "wrong@caresignal.com",
  "password": "wrongpassword"
}

# Expected Response (401)
{
  "success": false,
  "error": "Invalid email or password"
}
```

---

### **2. Admin Endpoints (Admin Only)**

#### **GET /api/admin/users**
```bash
# Request
GET /api/admin/users
Authorization: Bearer <admin-token>

# Expected Response (200)
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@caresignal.com",
      "name": "System Administrator",
      "role": "admin",
      "organization": "CareSignal",
      "is_active": true,
      "created_at": "2024-03-09T12:00:00.000Z"
    },
    // ... more users
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

#### **POST /api/admin/users (Create User)**
```bash
# Request
POST /api/admin/users
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "test.user@caresignal.com",
  "name": "Test User",
  "password": "testpassword123",
  "role": "registered-manager",
  "organization": "CareSignal",
  "assignedHouse": "550e8400-e29b-41d4-a716-446655440101"
}

# Expected Response (201)
{
  "success": true,
  "data": {
    "id": "new-uuid-here",
    "email": "test.user@caresignal.com",
    "name": "Test User",
    "role": "registered-manager",
    "organization": "CareSignal",
    "assigned_house": "550e8400-e29b-41d4-a716-446655440101",
    "is_active": true,
    "created_at": "2024-03-09T12:30:00.000Z"
  },
  "message": "User created successfully"
}
```

#### **PUT /api/admin/users/:id (Update User)**
```bash
# Request
PUT /api/admin/users/550e8400-e29b-41d4-a716-446655440001
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "John Smith Updated",
  "role": "director",
  "isActive": true
}

# Expected Response (200)
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "john.smith@caresignal.com",
    "name": "John Smith Updated",
    "role": "director",
    "organization": "CareSignal",
    "is_active": true,
    "updated_at": "2024-03-09T12:35:00.000Z"
  },
  "message": "User updated successfully"
}
```

#### **DELETE /api/admin/users/:id**
```bash
# Request
DELETE /api/admin/users/550e8400-e29b-41d4-a716-446655440006
Authorization: Bearer <admin-token>

# Expected Response (200)
{
  "success": true,
  "message": "User deleted successfully"
}
```

#### **GET /api/admin/dashboard/stats**
```bash
# Request
GET /api/admin/dashboard/stats
Authorization: Bearer <admin-token>

# Expected Response (200)
{
  "success": true,
  "data": {
    "totalUsers": 10,
    "activeUsers": 10,
    "usersByRole": [
      { "role": "admin", "count": "1" },
      { "role": "registered-manager", "count": "5" },
      { "role": "responsible-individual", "count": "2" },
      { "role": "director", "count": "2" }
    ],
    "totalHouses": 5,
    "recentPulses": 15
  }
}
```

---

### **3. Health Check Endpoint**

#### **GET /health**
```bash
# Request
GET /health

# Expected Response (200)
{
  "status": "OK",
  "timestamp": "2024-03-09T12:40:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

---

### **4. Error Testing**

#### **401 Unauthorized (No Token)**
```bash
# Request
GET /api/admin/users
# No Authorization header

# Expected Response (401)
{
  "success": false,
  "error": "Access denied. User not authenticated."
}
```

#### **403 Forbidden (Wrong Role)**
```bash
# Request with non-admin user token
GET /api/admin/users
Authorization: Bearer <non-admin-token>

# Expected Response (403)
{
  "success": false,
  "error": "Access denied. Insufficient permissions."
}
```

#### **404 Not Found**
```bash
# Request
GET /api/admin/users/non-existent-id
Authorization: Bearer <admin-token>

# Expected Response (404)
{
  "success": false,
  "error": "User not found"
}
```

#### **400 Validation Error**
```bash
# Request
POST /api/admin/users
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "invalid-email",
  "name": "",
  "password": "123" // too short
}

# Expected Response (400)
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "msg": "Valid email is required",
      "param": "email",
      "location": "body"
    },
    {
      "msg": "Name must be between 2 and 100 characters",
      "param": "name",
      "location": "body"
    },
    {
      "msg": "Password must be at least 6 characters long",
      "param": "password",
      "location": "body"
    }
  ]
}
```

---

## 🔍 **Testing Checklist**

### **Authentication Tests**
- [ ] Admin login success
- [ ] Invalid credentials rejection
- [ ] JWT token generation
- [ ] Token format validation

### **Admin Endpoint Tests**
- [ ] Get users list (with pagination)
- [ ] Create new user (all roles)
- [ ] Update existing user
- [ ] Delete user
- [ ] Get dashboard statistics

### **Security Tests**
- [ ] Admin-only protection
- [ ] Token validation
- [ ] Role-based access control
- [ ] Input validation

### **Error Handling Tests**
- [ ] 401 Unauthorized
- [ ] 403 Forbidden
- [ ] 404 Not Found
- [ ] 400 Validation errors
- [ ] 500 Server errors

---

## 🛠 **Testing Tools**

### **Postman Collection**
```json
{
  "info": {
    "name": "CareSignal API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3001"
    },
    {
      "key": "token",
      "value": ""
    }
  ]
}
```

### **cURL Commands**
```bash
# Store token
TOKEN=$(curl -s -X POST "{{baseUrl}}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@caresignal.com","password":"admin123"}' | \
  jq -r '.token')

# Use token in requests
curl -X GET "{{baseUrl}}/api/admin/users" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 **Expected Results Summary**

| Endpoint | Method | Auth Required | Expected Status | Success Response |
|----------|--------|---------------|-----------------|------------------|
| /api/auth/login | POST | No | 200 | JWT token + user data |
| /api/admin/users | GET | Admin | 200 | Paginated users list |
| /api/admin/users | POST | Admin | 201 | Created user data |
| /api/admin/users/:id | PUT | Admin | 200 | Updated user data |
| /api/admin/users/:id | DELETE | Admin | 200 | Success message |
| /api/admin/dashboard/stats | GET | Admin | 200 | Dashboard statistics |
| /health | GET | No | 200 | Health status |

Run through this checklist to ensure all endpoints are working correctly! 🚀
