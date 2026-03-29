# Ordin Core Governance SaaS API Documentation

## Overview
This API provides a comprehensive governance management system for care homes with role-based access control, real-time risk monitoring, incident tracking, and strategic oversight capabilities.

## Base URL
```
http://localhost:3001/api
```

## Authentication
All protected endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## User Roles
- **registered-manager**: House-specific access to their assigned house
- **responsible-individual**: Cross-site oversight across all houses
- **director**: Strategic organizational visibility and oversight

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh JWT token
- `GET /auth/me` - Get current user profile

### Dashboard (Role-based)
- `GET /dashboard` - Get dashboard data for user's role
- `GET /dashboard/risk-timeline/:riskId` - Get complete risk timeline with activities
- `GET /dashboard/trends` - Get trend analysis data
- `GET /dashboard/patterns` - Get detected patterns

### Governance Pulse
- `GET /governance-pulse` - Get all governance pulses (filtered by role)
- `GET /governance-pulse/:id` - Get specific governance pulse
- `POST /governance-pulse` - Create new governance pulse
- `GET /governance-pulse/stats/overview` - Get pulse statistics
- `GET /governance-pulse/recent` - Get recent pulses for dashboard

### Risk Management
- `GET /risks` - Get risks (filtered by role and house)
- `GET /risks/:id` - Get specific risk details
- `POST /risks` - Create new risk
- `PUT /risks/:id` - Update risk
- `DELETE /risks/:id` - Delete risk
- `GET /risks/stats` - Get risk statistics

### Incident Management
- `GET /incidents` - Get incidents (filtered by role and house)
- `GET /incidents/:id` - Get specific incident details
- `POST /incidents` - Create new incident
- `PUT /incidents/:id` - Update incident
- `GET /incidents/:id/timeline` - Get incident governance timeline
- `GET /incidents/:id/report` - Get reconstruction report

### Escalation Management
- `GET /escalations` - Get escalations (filtered by role)
- `GET /escalations/:id` - Get specific escalation
- `POST /escalations` - Create new escalation
- `PUT /escalations/:id` - Update escalation
- `GET /escalations/stats` - Get escalation statistics

### Reports
- `GET /reports` - Get reports (filtered by type and user)
- `GET /reports/:id` - Get specific report
- `POST /reports` - Generate new report
- `GET /reports/types` - Get available report types

### Users
- `GET /users` - Get users (admin only)
- `GET /users/:id` - Get user profile
- `PUT /users/:id` - Update user profile
- `GET /users/stats` - Get user statistics

## Role-Based Data Access

### Registered Manager
- **Scope**: Single assigned house only
- **Dashboard**: House-specific metrics, weekly snapshot, active risks, incidents
- **Features**: 
  - Complete governance pulse for their house
  - Risk management for their house
  - Incident management for their house
  - House-specific reports

### Responsible Individual
- **Scope**: All houses (cross-site oversight)
- **Dashboard**: Cross-site metrics, site summaries, pending escalations
- **Features**:
  - Review governance pulses across all houses
  - Risk register oversight across all sites
  - Escalation management
  - Cross-site reports and trend analysis

### Director
- **Scope**: Strategic organizational view
- **Dashboard**: Organizational metrics, serious incident alerts, strategic insights
- **Features**:
  - Strategic oversight across entire organization
  - Pattern detection and trend monitoring
  - Serious incident management
  - Monthly and strategic reports

## Data Models

### Governance Pulse
```typescript
interface IGovernancePulse {
  pulseId: string;
  houseId: string;
  pulseDate: Date;
  submittedBy: string;
  emergingRisk: boolean;
  emergingRiskDescription?: string;
  riskMovement: boolean;
  riskMovementDescription?: string;
  safeguardingSignals: boolean;
  safeguardingDescription?: string;
  operationalPressure: 'staffing' | 'behavioural' | 'medication' | 'environmental' | 'none';
  escalationRequired: boolean;
  escalationReason?: string;
  additionalObservations?: string;
  status: 'pending' | 'completed' | 'skipped';
  generatedRisks: string[];
}
```

### Risk
```typescript
interface IRisk {
  id: string;
  houseId: string;
  title: string;
  description: string;
  category: 'clinical' | 'operational' | 'environmental' | 'safety' | 'administrative';
  severity: 'high' | 'medium' | 'low';
  likelihood: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  status: 'open' | 'under-review' | 'escalated' | 'closed';
  mitigations: string[];
  escalationThreshold: string;
  nextReview: Date;
  createdBy: string;
}
```

### Risk Activity (Timeline)
```typescript
interface IRiskActivity {
  activityId: string;
  riskId: string;
  activityType: 'created' | 'updated' | 'escalated' | 'mitigated' | 'reviewed' | 'closed';
  description: string;
  performedBy: string;
  performedAt: Date;
  oldValue?: string;
  newValue?: string;
}
```

### Incident
```typescript
interface IIncident {
  id: string;
  houseId: string;
  incidentDate: Date;
  incidentType: 'safeguarding' | 'medication' | 'behavioral' | 'environmental' | 'staff' | 'injury';
  severityLevel: 'critical' | 'serious' | 'moderate' | 'low';
  status: 'under-review' | 'closed' | 'archived';
  description: string;
  immediateActions: string;
  linkedRisks: string[];
  linkedEscalations: string[];
  createdBy: string;
}
```

### Dashboard Data (Role-specific)
```typescript
interface IDashboardData {
  role: 'registered-manager' | 'responsible-individual' | 'director';
  houseId?: string;
  totalRisks: number;
  activeIncidents: number;
  pendingEscalations: number;
  complianceRate: number;
  
  // Role-specific data
  houseData?: {
    highRiskDays: number;
    safeguardingDays: number;
    escalations: number;
    staffingAvg: string;
    activeIncidents: number;
  };
  
  crossSiteData?: {
    totalSites: number;
    activeHighRisks: number;
    pendingEscalations: number;
    activeIncidents: number;
    siteSummaries: Array<{
      house: string;
      highRisks: number;
      escalations: number;
      lastPulse: string;
    }>;
  };
  
  strategicData?: {
    totalSites: number;
    activeHighRisks: number;
    monthlyIncidents: number;
    complianceRate: number;
    riskCategories: Array<{
      category: string;
      count: number;
      trend: string;
    }>;
    sitePerformance: Array<{
      site: string;
      performance: number;
      risks: number;
      incidents: number;
    }>;
    strategicInsights: Array<{
      type: string;
      detail: string;
      priority: string;
    }>;
    seriousIncidentAlerts: Array<{
      id: string;
      house: string;
      incidentDate: string;
      riskSignalsLogged: number;
      escalationsTriggered: number;
      leadershipReviews: number;
      lastOversightReviewDays: number;
      status: string;
    }>;
  };
}
```

## Error Handling
All endpoints return consistent error responses:
```json
{
  "success": false,
  "error": "Error message",
  "details": [] // Validation errors if applicable
}
```

## Rate Limiting
- 100 requests per 15 minutes per IP
- Applied to all `/api/*` endpoints

## Pagination
List endpoints support pagination:
```
GET /risks?page=1&limit=20&sort=createdAt&order=desc
```

## Filtering
Most list endpoints support filtering:
```
GET /risks?house=oakwood&severity=high&status=open
```

## Real-time Features
- Risk activities are automatically logged when risks are updated
- Governance pulses can auto-generate risks based on responses
- Dashboard data reflects real-time changes across the system

## Database Structure
The system uses both MongoDB (for document storage) and PostgreSQL (for relational data):

### MongoDB Collections
- users - User accounts and profiles
- risks - Risk records with full document structure
- incidents - Incident reports with linked data
- escalations - Escalation records
- reports - Generated reports

### PostgreSQL Tables
- governance_pulses - Structured pulse data
- risk_activities - Risk timeline activities
- trend_analyses - Analysis results
- pattern_detections - Detected patterns
- weekly_reviews - Weekly review records

## Security Features
- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- Rate limiting
- CORS protection
- Helmet security headers

## Frontend Integration
The API is designed to work seamlessly with the React frontend:
- Role-based navigation and data filtering
- Real-time dashboard updates
- Automatic risk creation from governance pulses
- Complete risk timeline tracking
- Cross-site pattern detection

This comprehensive system ensures that all user roles see appropriate, real-time data that is coherent across the entire platform, with proper access controls and audit trails for all activities.
