// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string;
  assignedHouse?: string;
  organization?: string;
  isActive: boolean;
  pulseDays?: string[];
  pulse_days?: string[];
  assigned_house_id?: string;
  assigned_house_name?: string;
  profilePicture?: string;
  profile_picture?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'super-admin' | 'admin' | 'registered-manager' | 'responsible-individual' | 'director';

// Company types
export interface Company {
  id: string;
  name: string;
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
}

// House types
export interface House {
  id: string;
  companyId: string;
  name: string;
  address?: string;
  capacity?: number;
  currentOccupancy?: number;
  managerId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Risk types
export interface Risk {
  id: string;
  houseId: string;
  companyId: string;
  title: string;
  description?: string;
  severity: RiskSeverity;
  status: RiskStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type RiskSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type RiskStatus = 'Open' | 'In Progress' | 'Mitigated' | 'Closed';

// Risk Event types
export interface RiskEvent {
  id: string;
  riskId: string;
  eventType: RiskEventType;
  description: string;
  createdAt: string;
}

export type RiskEventType = 'created' | 'updated' | 'escalated' | 'mitigated' | 'reviewed' | 'closed';

// Incident types
export interface Incident {
  id: string;
  houseId: string;
  companyId: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type IncidentSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type IncidentStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

// Escalation types
export interface Escalation {
  id: string;
  riskId: string;
  escalatedBy: string;
  status: EscalationStatus;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export type EscalationStatus = 'Open' | 'Under Review' | 'Resolved' | 'Closed';

// Governance Pulse types
export interface GovernancePulse {
  id: string;
  houseId: string;
  companyId: string;
  pulseDate: string;
  weekStart?: string;
  assignedUserId?: string;
  submittedBy?: string;
  status: PulseStatus;
  completedAt?: string;
  responses?: Record<string, any>;
  staffingAdequate?: boolean;
  medicationManagement?: boolean;
  safeguardingConcerns?: boolean;
  maintenanceIssues?: boolean;
  overallStatus?: 'good' | 'concerns' | 'serious';
  emergingRisk?: boolean;
  riskMovement?: boolean;
  safeguardingSignals?: boolean;
  escalationRequired?: boolean;
  additionalObservations?: string;
  riskAreasIdentified?: string[];
  createdAt: string;
  updatedAt: string;
}

export type PulseStatus = 'DRAFT' | 'SUBMITTED' | 'LOCKED' | 'pending' | 'submitted' | 'completed' | 'overdue' | 'missed';

// User House junction types
export interface UserHouse {
  id: string;
  userId: string;
  houseId: string;
  assignedAt: string;
}

// Audit Log types
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  companyId?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  user: User;
}

// Dashboard types
export interface DashboardStats {
  totalRisks: number;
  openRisks: number;
  criticalRisks: number;
  totalIncidents: number;
  openIncidents: number;
  pendingPulses: number;
  overduePulses: number;
  openEscalations: number;
}

export interface RiskTrend {
  date: string;
  count: number;
  severity: RiskSeverity;
}

export interface IncidentTrend {
  date: string;
  count: number;
  severity: IncidentSeverity;
}

// Report types
export interface RiskRegisterReport {
  risks: Risk[];
  summary: {
    total: number;
    bySeverity: Record<RiskSeverity, number>;
    byStatus: Record<RiskStatus, number>;
  };
  generatedAt: string;
}

export interface IncidentReport {
  incidents: Incident[];
  summary: {
    total: number;
    bySeverity: Record<IncidentSeverity, number>;
    byStatus: Record<IncidentStatus, number>;
  };
  generatedAt: string;
}

export interface EscalationReport {
  escalations: Escalation[];
  summary: {
    total: number;
    byStatus: Record<EscalationStatus, number>;
  };
  generatedAt: string;
}

export interface GovernanceReport {
  pulses: GovernancePulse[];
  summary: {
    total: number;
    submitted: number;
    missed: number;
    overdue: number;
    escalationRequired: number;
  };
  generatedAt: string;
}

export interface TrendsReport {
  riskTrends: RiskTrend[];
  incidentTrends: IncidentTrend[];
  period: {
    start: string;
    end: string;
  };
  generatedAt: string;
}
