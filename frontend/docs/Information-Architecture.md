# Information Architecture Specification
# Ordin Core Governance SaaS Platform

## Document Information

| **Document Version** | 1.0 |
|---------------------|------|
| **Date** | March 5, 2026 |
| **Author** | Tanaka Majuru |
| **Approved By** | Technical Lead |
| **Status** | Final |

## Table of Contents

1. [Data Objects & Relationships](#1-data-objects--relationships)
2. [Database Schema Design](#2-database-schema-design)
3. [API Data Contracts](#3-api-data-contracts)
4. [State Management Architecture](#4-state-management-architecture)
5. [Data Flow Patterns](#5-data-flow-patterns)
6. [Governance Record Integrity](#6-governance-record-integrity)

---

## 1. Data Objects & Relationships

### Core Entity Model

#### Organization Structure
```typescript
interface Organisation {
  id: string;
  name: string;
  region: string;
  timezone: string;
  settings: OrganisationSettings;
  createdAt: Date;
  updatedAt: Date;
}

interface House {
  id: string;
  organisationId: string;
  name: string;
  serviceType: string;
  location?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### User & Role Management
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  status: 'invited' | 'active' | 'disabled';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface RoleAssignment {
  id: string;
  userId: string;
  role: 'RM' | 'RI' | 'DIR' | 'QA' | 'SYSADMIN';
  scope: {
    type: 'all' | 'houses';
    houseIds?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### Governance Schedule
```typescript
interface GovernanceSchedule {
  id: string;
  organisationId: string;
  pulseDays: ('monday' | 'wednesday' | 'friday')[];
  pulseCutoffTime: string; // "17:00"
  weeklyReviewDay: 'sunday';
  monthlyCloseDay: number; // 1-31
  escalationPolicy: EscalationPolicy;
  createdAt: Date;
  updatedAt: Date;
}

interface EscalationPolicy {
  defaultReviewSLAHours: number;
  roleRouting: {
    riskCategory: string;
    minSeverity: string;
    assignedRole: string;
  }[];
}
```

### Governance Data Objects

#### Pulse (Core Signal)
```typescript
interface Pulse {
  id: string;
  houseId: string;
  createdByUserId: string;
  pulseDate: Date;
  submittedAt?: Date;
  status: 'draft' | 'submitted';
  
  // Signal flags
  signalFlags: {
    emergingRisks: boolean;
    riskMovement: boolean;
    safeguardingSignals: boolean;
    operationalPressure: 'none' | 'staffing' | 'behavioural' | 'medication' | 'environmental';
    escalationRequired: boolean;
  };
  
  // Text fields
  emergingRiskDescription?: string;
  riskMovementRiskId?: string;
  safeguardingDescription?: string;
  escalationReason?: string;
  additionalObservations?: string;
  
  // Linked entities
  linkedRiskIds: string[];
  createdEscalationIds: string[];
  
  createdAt: Date;
  updatedAt: Date;
}
```

#### Risk Register
```typescript
interface Risk {
  id: string;
  houseId: string;
  category: 'clinical' | 'operational' | 'financial' | 'regulatory' | 'staffing';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'closed';
  
  // Ownership and tracking
  ownerRole: 'RM' | 'RI' | 'DIR' | 'QA';
  openedAt: Date;
  closedAt?: Date;
  lastReviewedAt?: Date;
  nextReviewDueAt?: Date;
  
  // Oversight tracking
  escalationCount: number;
  lastEscalationAt?: Date;
  oversightScore: number; // Calculated from oversight activities
  
  createdAt: Date;
  updatedAt: Date;
}

interface RiskEventLog {
  id: string;
  riskId: string;
  timestamp: Date;
  eventType: 'created' | 'updated' | 'severity_changed' | 'escalated' | 'reviewed' | 'closed' | 'addendum';
  actorUserId: string;
  actorRole: string;
  
  // Event-specific data
  payload: {
    previousValue?: any;
    newValue?: any;
    reason?: string;
    details?: string;
  };
  
  // Immutable record
  createdAt: Date;
}
```

#### Escalation System
```typescript
interface Escalation {
  id: string;
  houseId: string;
  riskId?: string;
  pulseId?: string;
  createdByUserId: string;
  
  // Assignment
  assignedRole: 'RI' | 'DIR' | 'QA';
  assignedToUserIds: string[]; // Current users in role
  
  // Timing
  createdAt: Date;
  dueAt: Date;
  reviewedAt?: Date;
  
  // Status tracking
  status: 'pending' | 'reviewed' | 'overdue';
  overdueNotifiedAt?: Date;
  
  // Content
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  createdAt: Date;
  updatedAt: Date;
}

interface EscalationReview {
  id: string;
  escalationId: string;
  reviewedByUserId: string;
  reviewedByRole: string;
  reviewedAt: Date;
  
  // Review content
  acknowledgement: string;
  decisionSummary: string;
  requiredFollowUp: string;
  nextReviewDate?: Date;
  
  // Immutable record
  createdAt: Date;
}
```

#### Weekly & Monthly Reviews
```typescript
interface WeeklyReview {
  id: string;
  weekId: string; // ISO week format: "2026-W10"
  organisationId: string;
  
  // Auto-compiled data
  draftData: {
    pulseSummary: {
      scheduled: number;
      completed: number;
      missed: number;
      housesMissed: string[];
    };
    riskMovement: {
      newRisks: number;
      closedRisks: number;
      severityIncreases: number;
      housesAffected: string[];
    };
    escalationSummary: {
      triggered: number;
      reviewed: number;
      averageReviewTime: number;
      overdueCount: number;
    };
    crossHouseTrajectory: {
      [houseId: string]: {
        riskTrajectory: 'increasing' | 'stable' | 'improving';
        oversightActivity: 'active' | 'weak' | 'minimal';
        riskSignals: number;
        oversightSignals: number;
      };
    };
    governanceDrift: {
      detected: boolean;
      affectedHouses: string[];
      recommendations: string[];
    };
  };
  
  // Leadership input
  reflectionText: string;
  leadershipObservations: string;
  leadershipActions: string[];
  
  // Status and locking
  lockState: 'draft' | 'locked';
  finalisedAt?: Date;
  finalisedByUserId?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

interface MonthlyReport {
  id: string;
  monthId: string; // "2026-03"
  organisationId: string;
  
  // Auto-compiled from weekly reviews
  draftData: {
    weeklyRollup: {
      [weekId: string]: {
        riskTrajectory: string;
        oversightActivity: string;
        keyInsights: string[];
      };
    };
    riskTrajectoryBasic: {
      increasingRiskHouses: string[];
      stableRiskHouses: string[];
      improvingRiskHouses: string[];
      overallTrend: string;
    };
    escalationDisciplineSummary: {
      totalEscalations: number;
      averageResponseTime: number;
      overdueRate: number;
      responseTrend: string;
    };
    rhythmAdherenceMonthly: {
      overallCompliance: number;
      weeklyCompliance: number[];
      nonCompliantWeeks: string[];
    };
  };
  
  // Leadership narrative
  narrativeText: string;
  riskTrajectoryObservations: string;
  governanceReflections: string;
  improvementActions: string[];
  
  // Status
  lockState: 'draft' | 'locked';
  finalisedAt?: Date;
  finalisedByUserId?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Incident Reconstruction Objects
```typescript
interface IncidentCase {
  id: string;
  houseId: string;
  incidentDate: Date;
  incidentType: string;
  createdByUserId: string;
  
  // External references
  externalReferences: {
    type: 'la_referral' | 'cqc_notification' | 'police_report' | 'other';
    referenceNumber: string;
    date: Date;
  }[];
  
  // Linked governance data
  linkedRiskIds: string[];
  linkedEscalationIds: string[];
  linkedWeeklyReviewIds: string[];
  linkedPulseIds: string[];
  
  // Reconstruction status
  reconstructionStatus: 'in_progress' | 'completed';
  completedAt?: Date;
  completedByUserId?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

interface GovernanceTimelineEvent {
  id: string;
  incidentCaseId: string;
  timestamp: Date;
  sourceType: 'pulse' | 'risk' | 'escalation' | 'weekly_review' | 'monthly_report';
  sourceId: string;
  
  // Event display
  label: string;
  detail: string;
  actorUserId?: string;
  actorRole?: string;
  
  // Analysis flags
  gapFlag?: {
    type: 'missed_review' | 'overdue_escalation' | 'risk_not_escalated';
    severity: 'low' | 'medium' | 'high';
    description: string;
  };
  
  intervalToNextEvent?: number; // hours
  responseInterval?: number; // hours for escalations
  
  // Immutable output
  createdAt: Date;
}
```

---

## 2. Database Schema Design

### Core Tables

#### Organisation & Structure
```sql
-- Organisations
CREATE TABLE organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    region VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Houses/Services
CREATE TABLE houses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100),
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'invited',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role Assignments
CREATE TABLE role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('RM', 'RI', 'DIR', 'QA', 'SYSADMIN')),
    scope_type VARCHAR(10) NOT NULL CHECK (scope_type IN ('all', 'houses')),
    house_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);
```

#### Governance Configuration
```sql
-- Governance Schedules
CREATE TABLE governance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    pulse_days VARCHAR(20)[] NOT NULL, -- ['monday', 'wednesday', 'friday']
    pulse_cutoff_time VARCHAR(5) NOT NULL DEFAULT '17:00',
    weekly_review_day VARCHAR(10) NOT NULL DEFAULT 'sunday',
    monthly_close_day INTEGER NOT NULL DEFAULT 1,
    escalation_policy JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Governance Data
```sql
-- Pulses (Core Signals)
CREATE TABLE pulses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES houses(id),
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    pulse_date DATE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    
    -- Signal flags
    emerging_risks BOOLEAN DEFAULT false,
    risk_movement BOOLEAN DEFAULT false,
    safeguarding_signals BOOLEAN DEFAULT false,
    operational_pressure VARCHAR(20) DEFAULT 'none',
    escalation_required BOOLEAN DEFAULT false,
    
    -- Text fields
    emerging_risk_description TEXT,
    risk_movement_risk_id UUID,
    safeguarding_description TEXT,
    escalation_reason TEXT,
    additional_observations TEXT,
    
    -- Linked entities
    linked_risk_ids UUID[] DEFAULT '{}',
    created_escalation_ids UUID[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(house_id, pulse_date)
);

-- Risk Register
CREATE TABLE risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES houses(id),
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    
    -- Ownership and tracking
    owner_role VARCHAR(20) NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_due_at TIMESTAMP WITH TIME ZONE,
    
    -- Oversight tracking
    escalation_count INTEGER DEFAULT 0,
    last_escalation_at TIMESTAMP WITH TIME ZONE,
    oversight_score INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk Event Log (Append-only)
CREATE TABLE risk_event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id UUID NOT NULL REFERENCES risks(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    event_type VARCHAR(50) NOT NULL,
    actor_user_id UUID NOT NULL REFERENCES users(id),
    actor_role VARCHAR(20) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Escalations
CREATE TABLE escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES houses(id),
    risk_id UUID REFERENCES risks(id),
    pulse_id UUID REFERENCES pulses(id),
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    
    -- Assignment
    assigned_role VARCHAR(20) NOT NULL,
    assigned_to_user_ids UUID[] DEFAULT '{}',
    
    -- Timing
    due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'overdue')),
    overdue_notified_at TIMESTAMP WITH TIME ZONE,
    
    -- Content
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    severity VARCHAR(20) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Escalation Reviews (Immutable)
CREATE TABLE escalation_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escalation_id UUID NOT NULL REFERENCES escalations(id),
    reviewed_by_user_id UUID NOT NULL REFERENCES users(id),
    reviewed_by_role VARCHAR(20) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    acknowledgement TEXT NOT NULL,
    decision_summary TEXT NOT NULL,
    required_follow_up TEXT,
    next_review_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Review & Archive Tables
```sql
-- Weekly Reviews
CREATE TABLE weekly_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id VARCHAR(10) NOT NULL, -- "2026-W10"
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    
    -- Auto-compiled data
    draft_data JSONB NOT NULL DEFAULT '{}',
    
    -- Leadership input
    reflection_text TEXT,
    leadership_observations TEXT,
    leadership_actions TEXT[] DEFAULT '{}',
    
    -- Status
    lock_state VARCHAR(20) DEFAULT 'draft' CHECK (lock_state IN ('draft', 'locked')),
    finalised_at TIMESTAMP WITH TIME ZONE,
    finalised_by_user_id UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(week_id, organisation_id)
);

-- Monthly Reports
CREATE TABLE monthly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_id VARCHAR(10) NOT NULL, -- "2026-03"
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    
    -- Auto-compiled data
    draft_data JSONB NOT NULL DEFAULT '{}',
    
    -- Leadership narrative
    narrative_text TEXT,
    risk_trajectory_observations TEXT,
    governance_reflections TEXT,
    improvement_actions TEXT[] DEFAULT '{}',
    
    -- Status
    lock_state VARCHAR(20) DEFAULT 'draft' CHECK (lock_state IN ('draft', 'locked')),
    finalised_at TIMESTAMP WITH TIME ZONE,
    finalised_by_user_id UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(month_id, organisation_id)
);
```

#### Incident Reconstruction Tables
```sql
-- Incident Cases
CREATE TABLE incident_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES houses(id),
    incident_date DATE NOT NULL,
    incident_type VARCHAR(100) NOT NULL,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    
    -- External references
    external_references JSONB DEFAULT '[]',
    
    -- Linked governance data
    linked_risk_ids UUID[] DEFAULT '{}',
    linked_escalation_ids UUID[] DEFAULT '{}',
    linked_weekly_review_ids UUID[] DEFAULT '{}',
    linked_pulse_ids UUID[] DEFAULT '{}',
    
    -- Reconstruction status
    reconstruction_status VARCHAR(20) DEFAULT 'in_progress',
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by_user_id UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Governance Timeline Events (Derived, Immutable)
CREATE TABLE governance_timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_case_id UUID NOT NULL REFERENCES incident_cases(id),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_id UUID NOT NULL,
    
    -- Event display
    label VARCHAR(255) NOT NULL,
    detail TEXT,
    actor_user_id UUID REFERENCES users(id),
    actor_role VARCHAR(20),
    
    -- Analysis flags
    gap_flag JSONB,
    interval_to_next_event INTEGER, -- hours
    response_interval INTEGER, -- hours for escalations
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes for Performance

```sql
-- Performance indexes
CREATE INDEX idx_pulses_house_date ON pulses(house_id, pulse_date);
CREATE INDEX idx_pulses_status ON pulses(status);
CREATE INDEX idx_pulses_house_status ON pulses(house_id, status);

CREATE INDEX idx_risks_house_status ON risks(house_id, status);
CREATE INDEX idx_risks_severity ON risks(severity);
CREATE INDEX idx_risks_owner_role ON risks(owner_role);

CREATE INDEX idx_escalations_assigned_role ON escalations(assigned_role, status);
CREATE INDEX idx_escalations_due_at ON escalations(due_at, status);
CREATE INDEX idx_escalations_house_status ON escalations(house_id, status);

CREATE INDEX idx_risk_event_logs_risk_timestamp ON risk_event_logs(risk_id, timestamp);
CREATE INDEX idx_weekly_reviews_org_week ON weekly_reviews(organisation_id, week_id);
CREATE INDEX idx_monthly_reports_org_month ON monthly_reports(organisation_id, month_id);

-- Full-text search indexes
CREATE INDEX idx_risks_search ON risks USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_pulses_search ON pulses USING gin(to_tsvector('english', COALESCE(emerging_risk_description, '') || ' ' || COALESCE(additional_observations, '')));
```

---

## 3. API Data Contracts

### Request/Response Schemas

#### Authentication Endpoints
```typescript
// POST /api/auth/login
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      scope: {
        type: 'all' | 'houses';
        houseIds?: string[];
      };
    };
  };
}
```

#### Pulse Endpoints
```typescript
// POST /api/pulses
interface CreatePulseRequest {
  houseId: string;
  pulseDate: string;
  signalFlags: {
    emergingRisks: boolean;
    riskMovement: boolean;
    safeguardingSignals: boolean;
    operationalPressure: string;
    escalationRequired: boolean;
  };
  emergingRiskDescription?: string;
  riskMovementRiskId?: string;
  safeguardingDescription?: string;
  escalationReason?: string;
  additionalObservations?: string;
}

interface PulseResponse {
  id: string;
  houseId: string;
  pulseDate: string;
  status: 'draft' | 'submitted';
  signalFlags: Pulse['signalFlags'];
  submittedAt?: string;
  createdAt: string;
}

// GET /api/houses/:houseId/pulses
interface ListPulsesResponse {
  success: boolean;
  data: PulseResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

#### Risk Register Endpoints
```typescript
// POST /api/risks
interface CreateRiskRequest {
  houseId: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  ownerRole: string;
}

interface RiskResponse {
  id: string;
  houseId: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  status: 'active' | 'closed';
  ownerRole: string;
  openedAt: string;
  lastReviewedAt?: string;
  escalationCount: number;
  oversightScore: number;
  createdAt: string;
}

// GET /api/risks
interface ListRisksRequest {
  houseIds?: string[];
  category?: string;
  severity?: string;
  status?: string;
  page?: number;
  limit?: number;
}

interface ListRisksResponse {
  success: boolean;
  data: RiskResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  filters: {
    availableCategories: string[];
    availableSeverities: string[];
    availableStatuses: string[];
  };
}
```

#### Escalation Endpoints
```typescript
// POST /api/escalations
interface CreateEscalationRequest {
  houseId: string;
  riskId?: string;
  pulseId?: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  assignedRole: string;
}

interface EscalationResponse {
  id: string;
  houseId: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  assignedRole: string;
  status: 'pending' | 'reviewed' | 'overdue';
  createdAt: string;
  dueAt: string;
  reviewedAt?: string;
}

// POST /api/escalations/:id/review
interface ReviewEscalationRequest {
  acknowledgement: string;
  decisionSummary: string;
  requiredFollowUp?: string;
  nextReviewDate?: string;
}
```

#### Weekly Review Endpoints
```typescript
// GET /api/weekly-reviews/:weekId/draft
interface WeeklyReviewDraftResponse {
  success: boolean;
  data: {
    weekId: string;
    draftData: WeeklyReview['draftData'];
    reflectionText?: string;
    leadershipObservations?: string;
    leadershipActions: string[];
    lockState: 'draft' | 'locked';
  };
}

// POST /api/weekly-reviews/:weekId/finalise
interface FinaliseWeeklyReviewRequest {
  reflectionText: string;
  leadershipObservations: string;
  leadershipActions: string[];
}
```

### Error Response Schema
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// Common error codes
const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  LOCKED_RESOURCE: 'LOCKED_RESOURCE',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;
```

---

## 4. State Management Architecture

### Frontend State Structure

#### Global State Context
```typescript
interface AppState {
  // Authentication
  auth: {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  };
  
  // Organization context
  organization: {
    id: string;
    name: string;
    houses: House[];
    governanceSchedule: GovernanceSchedule;
    userRole: string;
    userScope: string[];
  };
  
  // Real-time data
  realTime: {
    pulseStatus: {
      [houseId: string]: {
        nextPulseDue: Date;
        lastPulseCompleted: Date;
        overdue: boolean;
      };
    };
    escalationCounts: {
      [role: string]: number;
      overdue: number;
    };
    weeklyReviewStatus: {
      currentWeek: {
        due: boolean;
        finalized: boolean;
      };
    };
  };
  
  // UI State
  ui: {
    sidebarOpen: boolean;
    currentScreen: string;
    notifications: Notification[];
    loading: {
      [key: string]: boolean;
    };
  };
}
```

#### Screen-Level State
```typescript
// Pulse Form State
interface PulseFormState {
  formData: Partial<CreatePulseRequest>;
  validation: {
    [field: string]: string | null;
  };
  isSubmitting: boolean;
  isDraft: boolean;
  lastSaved: Date | null;
}

// Risk Register State
interface RiskRegisterState {
  risks: RiskResponse[];
  filters: {
    houseIds: string[];
    category: string;
    severity: string;
    status: string;
    search: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
}

// Weekly Review State
interface WeeklyReviewState {
  review: WeeklyReviewDraftResponse['data'] | null;
  isEditing: boolean;
  isFinalizing: boolean;
  autoSaveStatus: 'saved' | 'saving' | 'error';
}
```

### State Management Pattern

#### Context Providers
```typescript
// Auth Context
const AuthContext = createContext<{
  state: AppState['auth'];
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}>();

// Organization Context
const OrganizationContext = createContext<{
  state: AppState['organization'];
  refreshHouses: () => Promise<void>;
  updateGovernanceSchedule: (schedule: Partial<GovernanceSchedule>) => Promise<void>;
}>();

// Real-time Context
const RealTimeContext = createContext<{
  state: AppState['realTime'];
  subscribeToUpdates: () => void;
  unsubscribeFromUpdates: () => void;
}>();
```

#### Data Fetching Hooks
```typescript
// Custom hooks for data fetching
const usePulses = (houseId: string) => {
  const [state, setState] = useState<PulseRegisterState>({
    pulses: [],
    loading: false,
    error: null
  });
  
  const fetchPulses = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const response = await api.get(`/houses/${houseId}/pulses`);
      setState(prev => ({ 
        ...prev, 
        pulses: response.data.data,
        loading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error.message,
        loading: false 
      }));
    }
  }, [houseId]);
  
  useEffect(() => {
    fetchPulses();
  }, [fetchPulses]);
  
  return { ...state, refetch: fetchPulses };
};

const useRiskRegister = () => {
  const [state, setState] = useState<RiskRegisterState>({
    risks: [],
    filters: {
      houseIds: [],
      category: '',
      severity: '',
      status: '',
      search: ''
    },
    pagination: { page: 1, limit: 20, total: 0 },
    loading: false,
    error: null
  });
  
  const fetchRisks = useCallback(async (filters?: Partial<RiskRegisterState['filters']>) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const response = await api.get('/risks', { 
        params: { ...state.filters, ...filters } 
      });
      setState(prev => ({ 
        ...prev, 
        risks: response.data.data,
        pagination: response.data.pagination,
        loading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error.message,
        loading: false 
      }));
    }
  }, [state.filters]);
  
  return { ...state, fetchRisks, updateFilters: setState };
};
```

---

## 5. Data Flow Patterns

### Governance Signal Flow

#### Pulse Submission Flow
```
User completes pulse form
    ↓
Frontend validation
    ↓
API request to POST /api/pulses
    ↓
Backend validation and processing
    ↓
Calculate risk signals
    ↓
Update risk trajectories
    ↓
Create escalation if required
    ↓
Update real-time dashboards
    ↓
Send notifications
```

#### Risk Trajectory Calculation
```typescript
// Weekly calculation job
const calculateRiskTrajectories = async (organisationId: string, weekId: string) => {
  // 1. Get current week signals
  const currentSignals = await getWeeklyRiskSignals(organisationId, weekId);
  
  // 2. Get previous week signals
  const previousWeekId = getPreviousWeekId(weekId);
  const previousSignals = await getWeeklyRiskSignals(organisationId, previousWeekId);
  
  // 3. Calculate trajectories for each house
  const trajectories = {};
  
  for (const house of houses) {
    const currentRisk = currentSignals[house.id] || 0;
    const previousRisk = previousSignals[house.id] || 0;
    
    let trajectory: 'increasing' | 'stable' | 'improving';
    
    if (currentRisk > previousRisk + 1) {
      trajectory = 'increasing';
    } else if (currentRisk < previousRisk - 1) {
      trajectory = 'improving';
    } else {
      trajectory = 'stable';
    }
    
    trajectories[house.id] = {
      trajectory,
      currentSignals: currentRisk,
      previousSignals: previousRisk,
      change: currentRisk - previousRisk
    };
  }
  
  // 4. Store trajectories
  await storeRiskTrajectories(organisationId, weekId, trajectories);
  
  // 5. Check for governance drift
  await checkGovernanceDrift(organisationId, weekId, trajectories);
};
```

#### Weekly Review Auto-Compilation
```typescript
const compileWeeklyReview = async (organisationId: string, weekId: string) => {
  // 1. Get pulse summary
  const pulseSummary = await getPulseSummary(organisationId, weekId);
  
  // 2. Get risk movement data
  const riskMovement = await getRiskMovement(organisationId, weekId);
  
  // 3. Get escalation summary
  const escalationSummary = await getEscalationSummary(organisationId, weekId);
  
  // 4. Get cross-house trajectories
  const crossHouseTrajectory = await getCrossHouseTrajectory(organisationId, weekId);
  
  // 5. Check for governance drift
  const governanceDrift = await detectGovernanceDrift(organisationId, weekId);
  
  // 6. Compile draft data
  const draftData = {
    pulseSummary,
    riskMovement,
    escalationSummary,
    crossHouseTrajectory,
    governanceDrift
  };
  
  // 7. Create or update weekly review
  await upsertWeeklyReview(organisationId, weekId, draftData);
};
```

### Real-Time Data Synchronization

#### WebSocket Events
```typescript
// Real-time event types
interface RealTimeEvents {
  'pulse:submitted': {
    houseId: string;
    pulseId: string;
    userId: string;
  };
  
  'risk:updated': {
    riskId: string;
    houseId: string;
    change: string;
    userId: string;
  };
  
  'escalation:created': {
    escalationId: string;
    houseId: string;
    assignedRole: string;
    dueAt: string;
  };
  
  'escalation:reviewed': {
    escalationId: string;
    reviewedBy: string;
    reviewedAt: string;
  };
  
  'weekly_review:finalized': {
    weekId: string;
    finalizedBy: string;
    finalizedAt: string;
  };
}

// WebSocket client
const useWebSocket = () => {
  const { socket, isConnected } = useWebSocket(WS_URL);
  
  useEffect(() => {
    if (!socket) return;
    
    // Subscribe to events based on user role
    socket.emit('subscribe', {
      organisationId: user.organisationId,
      role: user.role,
      houseIds: user.houseIds
    });
    
    // Handle events
    socket.on('pulse:submitted', (data) => {
      // Update pulse status
      updatePulseStatus(data.houseId);
      
      // Update real-time dashboard
      refreshDashboard();
    });
    
    socket.on('escalation:created', (data) => {
      // Update escalation inbox
      updateEscalationInbox(data.assignedRole);
      
      // Send notification
      if (data.assignedRole === user.role) {
        showNotification({
          type: 'escalation',
          title: 'New Escalation',
          message: `Escalation created for ${data.houseId}`,
          action: `/escalations/${data.escalationId}`
        });
      }
    });
    
    return () => {
      socket.off('pulse:submitted');
      socket.off('escalation:created');
    };
  }, [socket, user]);
};
```

---

## 6. Governance Record Integrity

### Immutability Rules

#### Locked Records
```typescript
// Records that become immutable once finalized
interface LockedRecord {
  // Pulses become read-only after submission
  pulse: {
    immutableFields: ['signalFlags', 'linkedRiskIds', 'submittedAt'];
    allowedOperations: ['addAddendum'];
  };
  
  // Weekly reviews become locked after finalization
  weeklyReview: {
    immutableFields: ['draftData', 'reflectionText', 'leadershipActions'];
    allowedOperations: ['view', 'export'];
  };
  
  // Monthly reports become locked after finalization
  monthlyReport: {
    immutableFields: ['draftData', 'narrativeText', 'improvementActions'];
    allowedOperations: ['view', 'export'];
  };
  
  // Escalation reviews become immutable after submission
  escalationReview: {
    immutableFields: ['acknowledgement', 'decisionSummary', 'requiredFollowUp'];
    allowedOperations: ['view'];
  };
}
```

#### Audit Trail Implementation
```typescript
// Audit trail for all governance actions
interface AuditLog {
  id: string;
  entityType: 'pulse' | 'risk' | 'escalation' | 'weekly_review' | 'monthly_report';
  entityId: string;
  action: 'created' | 'updated' | 'locked' | 'unlocked' | 'exported';
  actorUserId: string;
  actorRole: string;
  timestamp: Date;
  
  // Change tracking
  changes?: {
    field: string;
    oldValue?: any;
    newValue?: any;
  }[];
  
  // System context
  ipAddress: string;
  userAgent: string;
  sessionId: string;
}

// Audit middleware
const auditMiddleware = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log the action if it's a governance operation
    if (isGovernanceOperation(req)) {
      auditLog.log({
        entityType: getEntityType(req),
        entityId: getEntityId(req),
        action: getAction(req),
        actorUserId: req.user.id,
        actorRole: req.user.role,
        changes: getChanges(req, data)
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};
```

### Data Validation Rules

#### Business Logic Validation
```typescript
// Pulse validation rules
const validatePulse = (pulseData: CreatePulseRequest): ValidationResult => {
  const errors: string[] = [];
  
  // Business rule: If escalation required, reason must be provided
  if (pulseData.signalFlags.escalationRequired && !pulseData.escalationReason) {
    errors.push('Escalation reason is required when escalation is flagged');
  }
  
  // Business rule: Risk movement requires risk selection
  if (pulseData.signalFlags.riskMovement && !pulseData.riskMovementRiskId) {
    errors.push('Risk selection is required when risk movement is flagged');
  }
  
  // Business rule: Only one pulse per house per day
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Risk validation rules
const validateRisk = (riskData: CreateRiskRequest, existingRisk?: Risk): ValidationResult => {
  const errors: string[] = [];
  
  // Business rule: Risk title must be unique within house
  if (existingRisk && existingRisk.title === riskData.title) {
    errors.push('Risk with this title already exists for this house');
  }
  
  // Business rule: Critical risks require escalation
  if (riskData.severity === 'critical') {
    // Check if escalation exists or will be created
    errors.push('Critical risks must have associated escalation');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

### Data Export & Archival

#### Export Formats
```typescript
// Weekly review export
const exportWeeklyReview = async (weekId: string, format: 'pdf' | 'word'): Promise<Buffer> => {
  const review = await getWeeklyReview(weekId);
  
  if (format === 'pdf') {
    return generatePDF({
      title: `Weekly Governance Review - ${weekId}`,
      content: renderWeeklyReviewTemplate(review),
      metadata: {
        organisationId: review.organisationId,
        weekId,
        exportedAt: new Date(),
        exportedBy: getCurrentUser().id
      }
    });
  } else {
    return generateWord({
      title: `Weekly Governance Review - ${weekId}`,
      content: renderWeeklyReviewTemplate(review),
      metadata: {
        organisationId: review.organisationId,
        weekId,
        exportedAt: new Date(),
        exportedBy: getCurrentUser().id
      }
    });
  }
};

// Incident reconstruction export
const exportIncidentReconstruction = async (incidentId: string): Promise<Buffer> => {
  const incident = await getIncidentCase(incidentId);
  const timeline = await generateGovernanceTimeline(incidentId);
  
  return generatePDF({
    title: `Governance Reconstruction Report - ${incident.houseName}`,
    content: renderIncidentTemplate(incident, timeline),
    metadata: {
      incidentId,
      exportedAt: new Date(),
      exportedBy: getCurrentUser().id,
      version: '1.0'
    }
  });
};
```

This Information Architecture provides a comprehensive foundation for implementing Ordin Core's governance-focused data model, ensuring data integrity, supporting the dual trajectory model, and maintaining the audit trail required for regulatory compliance and incident reconstruction.
