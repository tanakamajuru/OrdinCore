# API Specification - CareSignal Governance SaaS Platform

## Overview

This document defines the RESTful API specification for the CareSignal Governance SaaS Platform backend integration. The API follows REST principles with JSON payloads and standard HTTP status codes.

## Base URL

```
Production: https://api.caresignal.com/v1
Development: https://dev-api.caresignal.com/v1
```

## Authentication

### Authentication Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Provider-ID: <provider_id>
```

### JWT Token Structure
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "admin",
  "provider_id": "provider_123",
  "permissions": ["dashboard:view", "risk:create"],
  "exp": 1640995200,
  "iat": 1640908800
}
```

## API Endpoints

### 1. Authentication

#### POST /auth/login
Login user and return JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin",
      "provider_id": "provider_123",
      "permissions": ["dashboard:view", "risk:create"]
    },
    "expires_in": 3600
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

#### POST /auth/refresh
Refresh JWT token.

**Request Headers:**
```http
Authorization: Bearer <refresh_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

#### POST /auth/logout
Logout user and invalidate token.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

### 2. User Management

#### GET /users/profile
Get current user profile.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin",
    "provider_id": "provider_123",
    "permissions": ["dashboard:view", "risk:create"],
    "last_login": "2024-01-15T10:30:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT /users/profile
Update user profile.

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "john.smith@example.com",
    "name": "John Smith",
    "role": "admin",
    "provider_id": "provider_123",
    "permissions": ["dashboard:view", "risk:create"],
    "last_login": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

#### POST /users/change-password
Change user password.

**Request Body:**
```json
{
  "current_password": "oldpassword123",
  "new_password": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### 3. Dashboard

#### GET /dashboard/stats
Get dashboard statistics.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "today_pulse": {
      "id": "pulse_123",
      "status": "submitted",
      "submitted_at": "2024-01-15T09:00:00Z"
    },
    "weekly_stats": {
      "total_risks": 15,
      "high_risks": 3,
      "open_escalations": 2,
      "completed_actions": 8
    },
    "active_risks": [
      {
        "id": "risk_123",
        "title": "Staffing Shortages",
        "status": "Open",
        "likelihood": "High",
        "impact": "High",
        "created_at": "2024-01-10T00:00:00Z"
      }
    ],
    "recent_escalations": [
      {
        "id": "escalation_123",
        "type": "Clinical",
        "description": "Medication error incident",
        "escalated_at": "2024-01-14T15:30:00Z",
        "status": "Under Review"
      }
    ]
  }
}
```

### 4. Governance Pulse

#### GET /governance-pulse/today
Get today's governance pulse data.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "pulse_123",
    "date": "2024-01-15",
    "day_type": "monday",
    "status": "draft",
    "data": {
      "stability_checks": {
        "overnight_stability": true,
        "weekend_oversight": true,
        "staffing_adequacy": false,
        "critical_incidents": false,
        "safeguarding_concerns": false,
        "medication_administration": true
      },
      "escalation_review": {
        "new_escalations": false,
        "escalation_resolution": true,
        "provider_response": true,
        "mitigation_effectiveness": true,
        "follow_up_required": false
      },
      "house_snapshot": [
        {
          "house_name": "House A",
          "occupancy": 20,
          "staff_on_duty": 4,
          "overnight_staff": 2,
          "issues": "None"
        }
      ],
      "reflection": "Overall stable weekend with adequate staffing levels."
    },
    "created_at": "2024-01-15T08:00:00Z",
    "updated_at": "2024-01-15T08:00:00Z"
  }
}
```

#### POST /governance-pulse
Create new governance pulse entry.

**Request Body:**
```json
{
  "date": "2024-01-15",
  "day_type": "monday",
  "data": {
    "stability_checks": {
      "overnight_stability": true,
      "weekend_oversight": true,
      "staffing_adequacy": false,
      "critical_incidents": false,
      "safeguarding_concerns": false,
      "medication_administration": true
    },
    "escalation_review": {
      "new_escalations": false,
      "escalation_resolution": true,
      "provider_response": true,
      "mitigation_effectiveness": true,
      "follow_up_required": false
    },
    "house_snapshot": [
      {
        "house_name": "House A",
        "occupancy": 20,
        "staff_on_duty": 4,
        "overnight_staff": 2,
        "issues": "None"
      }
    ],
    "reflection": "Overall stable weekend with adequate staffing levels."
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "pulse_123",
    "date": "2024-01-15",
    "day_type": "monday",
    "status": "submitted",
    "submitted_by": "user_123",
    "submitted_at": "2024-01-15T09:00:00Z",
    "created_at": "2024-01-15T08:00:00Z"
  }
}
```

#### PUT /governance-pulse/:id
Update existing governance pulse.

**Request Body:**
```json
{
  "data": {
    "stability_checks": {
      "overnight_stability": true,
      "weekend_oversight": true,
      "staffing_adequacy": true,
      "critical_incidents": false,
      "safeguarding_concerns": false,
      "medication_administration": true
    },
    "reflection": "Updated reflection with corrected staffing information."
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "pulse_123",
    "date": "2024-01-15",
    "day_type": "monday",
    "status": "draft",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

### 5. Weekly Review

#### GET /weekly-review/current
Get current week's review data.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "weekly_123",
    "week_start": "2024-01-15",
    "week_end": "2024-01-21",
    "status": "draft",
    "data": {
      "executive_overview": "This week showed stable operations with 2 new risks identified...",
      "risk_register_review": [
        {
          "id": "risk_123",
          "title": "Staffing Shortages",
          "status": "Open",
          "review_notes": "Continued monitoring required"
        }
      ],
      "safeguarding_activity": {
        "concerns_raised": 1,
        "investigations_completed": 1,
        "outcomes": "All concerns resolved satisfactorily"
      },
      "incident_reflection": {
        "medication_errors": false,
        "falls": true,
        "safeguarding_concerns": false,
        "complaints": false,
        "infections": false,
        "critical_incidents": false,
        "staffing_issues": true,
        "maintenance_issues": false,
        "other_incidents": false
      },
      "staffing_assurance": {
        "commissioned_hours": 560,
        "actual_hours": 540,
        "variance": -20,
        "notes": "Shortage due to unexpected sick leave"
      },
      "escalation_oversight": {
        "provider_escalations": 2,
        "resolution_times": ["2 days", "1 day"],
        "outcomes": "Both resolved satisfactorily"
      },
      "learning_actions": [
        {
          "id": "action_123",
          "description": "Review staffing contingency plans",
          "assigned_to": "user_456",
          "due_date": "2024-01-30",
          "status": "Open"
        }
      ],
      "reflective_statement": "Overall governance remains strong with areas for improvement in staffing..."
    },
    "created_at": "2024-01-15T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z"
  }
}
```

#### POST /weekly-review
Create new weekly review.

**Request Body:**
```json
{
  "week_start": "2024-01-15",
  "week_end": "2024-01-21",
  "data": {
    "executive_overview": "This week showed stable operations...",
    "risk_register_review": [],
    "safeguarding_activity": {
      "concerns_raised": 0,
      "investigations_completed": 0,
      "outcomes": "No concerns to report"
    },
    "incident_reflection": {
      "medication_errors": false,
      "falls": false,
      "safeguarding_concerns": false,
      "complaints": false,
      "infections": false,
      "critical_incidents": false,
      "staffing_issues": false,
      "maintenance_issues": false,
      "other_incidents": false
    },
    "staffing_assurance": {
      "commissioned_hours": 560,
      "actual_hours": 560,
      "variance": 0,
      "notes": "Staffing levels met requirements"
    },
    "escalation_oversight": {
      "provider_escalations": 0,
      "resolution_times": [],
      "outcomes": "No escalations this week"
    },
    "learning_actions": [],
    "reflective_statement": "Good week with no major issues..."
  }
}
```

#### PUT /weekly-review/:id/lock
Lock and submit weekly review.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "weekly_123",
    "status": "locked",
    "submitted_by": "user_123",
    "submitted_at": "2024-01-21T17:00:00Z",
    "locked_at": "2024-01-21T17:00:00Z"
  }
}
```

### 6. Risk Management

#### GET /risks
Get risk register with filtering.

**Query Parameters:**
- `status`: Filter by status (Open, Under Review, Escalated, Closed)
- `category`: Filter by category
- `likelihood`: Filter by likelihood
- `impact`: Filter by impact
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "risks": [
      {
        "id": "risk_123",
        "title": "Staffing Shortages",
        "description": "Ongoing staffing issues affecting care quality",
        "category": "Staffing",
        "likelihood": "High",
        "impact": "High",
        "status": "Open",
        "assigned_to": "user_456",
        "created_by": "user_123",
        "created_at": "2024-01-10T00:00:00Z",
        "updated_at": "2024-01-15T10:00:00Z",
        "actions_count": 3,
        "overdue_actions": 1
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "total_pages": 1
    }
  }
}
```

#### GET /risks/:id
Get specific risk details.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "risk_123",
    "title": "Staffing Shortages",
    "description": "Ongoing staffing issues affecting care quality due to recruitment difficulties and unexpected sick leave.",
    "category": "Staffing",
    "likelihood": "High",
    "impact": "High",
    "status": "Open",
    "assigned_to": "user_456",
    "created_by": "user_123",
    "created_at": "2024-01-10T00:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z",
    "actions": [
      {
        "id": "action_123",
        "description": "Review recruitment strategies",
        "assigned_to": "user_456",
        "due_date": "2024-01-30",
        "status": "Open",
        "created_at": "2024-01-10T00:00:00Z"
      }
    ],
    "timeline": [
      {
        "id": "timeline_123",
        "type": "risk_created",
        "description": "Risk identified and logged",
        "created_by": "user_123",
        "created_at": "2024-01-10T00:00:00Z"
      }
    ],
    "escalation_history": [
      {
        "id": "escalation_123",
        "escalated_to": "Regional Manager",
        "escalated_by": "user_123",
        "escalated_at": "2024-01-12T14:00:00Z",
        "status": "Resolved",
        "resolution": "Additional funding approved for temporary staff"
      }
    ]
  }
}
```

#### POST /risks
Create new risk.

**Request Body:**
```json
{
  "title": "New Risk Title",
  "description": "Detailed description of the risk",
  "category": "Clinical",
  "likelihood": "Medium",
  "impact": "High",
  "assigned_to": "user_456"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "risk_124",
    "title": "New Risk Title",
    "description": "Detailed description of the risk",
    "category": "Clinical",
    "likelihood": "Medium",
    "impact": "High",
    "status": "Open",
    "assigned_to": "user_456",
    "created_by": "user_123",
    "created_at": "2024-01-15T11:00:00Z"
  }
}
```

#### PUT /risks/:id
Update existing risk.

**Request Body:**
```json
{
  "title": "Updated Risk Title",
  "description": "Updated description",
  "status": "Under Review",
  "assigned_to": "user_789"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "risk_123",
    "title": "Updated Risk Title",
    "description": "Updated description",
    "status": "Under Review",
    "assigned_to": "user_789",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

#### POST /risks/:id/actions
Add action to risk.

**Request Body:**
```json
{
  "description": "Implement new staffing procedures",
  "assigned_to": "user_456",
  "due_date": "2024-02-01"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "action_124",
    "risk_id": "risk_123",
    "description": "Implement new staffing procedures",
    "assigned_to": "user_456",
    "due_date": "2024-02-01",
    "status": "Open",
    "created_at": "2024-01-15T13:00:00Z"
  }
}
```

### 7. Escalation Log

#### GET /escalations
Get escalation log (read-only).

**Query Parameters:**
- `status`: Filter by status
- `type`: Filter by escalation type
- `date_from`: Start date filter
- `date_to`: End date filter
- `page`: Page number
- `limit`: Items per page

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "escalations": [
      {
        "id": "escalation_123",
        "risk_id": "risk_123",
        "type": "Clinical",
        "description": "Medication error requiring immediate attention",
        "escalated_to": "Clinical Lead",
        "escalated_by": "user_123",
        "escalated_at": "2024-01-14T15:30:00Z",
        "status": "Resolved",
        "resolution": "Additional training provided",
        "resolved_at": "2024-01-15T09:00:00Z",
        "resolved_by": "user_456"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "total_pages": 2
    }
  }
}
```

#### POST /escalations
Create new escalation (immutable record).

**Request Body:**
```json
{
  "risk_id": "risk_123",
  "type": "Clinical",
  "description": "Critical medication error identified",
  "escalated_to": "Clinical Lead",
  "urgency": "High"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "escalation_124",
    "risk_id": "risk_123",
    "type": "Clinical",
    "description": "Critical medication error identified",
    "escalated_to": "Clinical Lead",
    "escalated_by": "user_123",
    "escalated_at": "2024-01-15T14:00:00Z",
    "status": "Open",
    "created_at": "2024-01-15T14:00:00Z"
  }
}
```

### 8. Trends and Analytics

#### GET /trends/summary
Get trends dashboard data.

**Query Parameters:**
- `weeks`: Number of weeks to include (default: 6)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "six_week_data": [
      {
        "week_start": "2024-01-01",
        "week_end": "2024-01-07",
        "high_risk_count": 2,
        "safeguarding_count": 1,
        "escalation_count": 3,
        "staffing_stability": 95
      }
    ],
    "high_risk_frequency": [
      {
        "week": "Week 1",
        "value": 2
      },
      {
        "week": "Week 2",
        "value": 3
      }
    ],
    "safeguarding_frequency": [
      {
        "week": "Week 1",
        "value": 1
      },
      {
        "week": "Week 2",
        "value": 0
      }
    ],
    "escalation_count": [
      {
        "week": "Week 1",
        "value": 3
      },
      {
        "week": "Week 2",
        "value": 2
      }
    ],
    "staffing_stability": {
      "current_week": 94,
      "average": 93,
      "trend": "up"
    }
  }
}
```

### 9. Reports

#### GET /reports/monthly
Generate monthly report.

**Query Parameters:**
- `month`: Month (1-12)
- `year`: Year

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "month": "January",
    "year": 2024,
    "executive_summary": "January showed stable governance with...",
    "weekly_reviews": [
      {
        "id": "weekly_123",
        "week_start": "2024-01-01",
        "status": "locked",
        "submitted_at": "2024-01-07T17:00:00Z"
      }
    ],
    "risk_analysis": {
      "total_risks": 15,
      "new_risks": 5,
      "closed_risks": 3,
      "high_risk_trend": "stable"
    },
    "escalation_summary": {
      "total_escalations": 8,
      "resolved_escalations": 6,
      "average_resolution_time": "2.5 days"
    },
    "staffing_metrics": {
      "average_stability": 93,
      "total_variance": -40,
      "critical_shortages": 2
    },
    "recommendations": [
      "Review staffing contingency plans",
      "Implement additional medication safety checks"
    ]
  }
}
```

#### GET /reports/export
Export reports in various formats.

**Query Parameters:**
- `type`: Report type (monthly, weekly, risks)
- `format`: Export format (pdf, excel, csv)
- `month`: Month (for monthly reports)
- `year`: Year
- `week_start`: Week start date (for weekly reports)

**Response (200 OK):**
```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="monthly-report-january-2024.pdf"

[PDF binary data]
```

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    }
  }
}
```

### Common Error Codes
- `UNAUTHORIZED`: Invalid or missing authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Request validation failed
- `CONFLICT`: Resource conflict (e.g., duplicate)
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

### HTTP Status Codes
- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **Authentication endpoints**: 5 requests per minute
- **Standard endpoints**: 100 requests per minute
- **Report generation**: 10 requests per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination with these parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

Pagination response format:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

## Webhooks

### Supported Webhook Events
- `risk.created`: New risk created
- `risk.escalated`: Risk escalated
- `weekly_review.submitted`: Weekly review submitted
- `escalation.resolved`: Escalation resolved

### Webhook Configuration
Webhook URLs can be configured in the provider settings. Webhooks are sent with these headers:
```http
X-CareSignal-Signature: <hmac_signature>
X-CareSignal-Event: <event_type>
Content-Type: application/json
```

Webhook payload example:
```json
{
  "event": "risk.created",
  "data": {
    "risk_id": "risk_123",
    "provider_id": "provider_123",
    "timestamp": "2024-01-15T14:00:00Z"
  }
}
```

This API specification provides comprehensive endpoints for all CareSignal platform functionality, ensuring secure, scalable, and maintainable backend integration.
