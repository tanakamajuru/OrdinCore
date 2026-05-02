import { v4 as uuidv4 } from 'uuid';

/**
 * Test data fixtures for Ordin Core E2E tests
 */

export const TEST_USERS = {
  TEAM_LEADER: {
    email: process.env.TEST_USER_TL_EMAIL!,
    password: process.env.TEST_USER_TL_PASSWORD!,
    id: 'taylor-rose-uuid',
    firstName: 'Taylor',
    lastName: 'Rose',
    role: 'team_leader'
  },
  REGISTERED_MANAGER: {
    email: process.env.TEST_USER_RM_EMAIL!,
    password: process.env.TEST_USER_RM_PASSWORD!,
    id: 'sam-rivers-uuid',
    firstName: 'Sam',
    lastName: 'Rivers',
    role: 'registered_manager'
  },
  RESPONSIBLE_INDIVIDUAL: {
    email: process.env.TEST_USER_RI_EMAIL!,
    password: process.env.TEST_USER_RI_PASSWORD!,
    id: 'chris-ordin-uuid',
    firstName: 'Chris',
    lastName: 'Ordin',
    role: 'responsible_individual'
  },
  DIRECTOR: {
    email: process.env.TEST_USER_DIRECTOR_EMAIL!,
    password: process.env.TEST_USER_DIRECTOR_PASSWORD!,
    id: 'pat-director-uuid',
    firstName: 'Pat',
    lastName: 'Director',
    role: 'director'
  },
  ADMIN: {
    email: process.env.TEST_USER_ADMIN_EMAIL!,
    password: process.env.TEST_USER_ADMIN_PASSWORD!,
    id: 'admin-uuid',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  }
};

export const TEST_SERVICES = {
  ROSE_HOUSE: {
    id: process.env.TEST_SERVICE_ROSE_HOUSE!,
    name: 'Rose House',
    type: 'residential'
  },
  LAKE_VIEW: {
    id: process.env.TEST_SERVICE_LAKE_VIEW!,
    name: 'Lake View',
    type: 'residential'
  }
};

export const TEST_COMPANY = {
  id: process.env.TEST_COMPANY_ID!,
  name: 'OrdinCore Test Company'
};

export const SAMPLE_SIGNALS = {
  BEHAVIOUR_INCIDENT: {
    entry_date: '2026-04-30',
    entry_time: '14:30',
    service_id: TEST_SERVICES.ROSE_HOUSE.id,
    signal_type: 'Incident',
    risk_domain: ['Behaviour'],
    description: 'Resident A shouted and refused medication',
    immediate_action: 'Staff calmed resident; medication offered later',
    severity: 'Moderate',
    has_happened_before: 'Yes',
    pattern_concern: 'Clear Repeat',
    escalation_required: 'Manager Review'
  },
  MEDICATION_ERROR: {
    entry_date: '2026-04-30',
    entry_time: '09:15',
    service_id: TEST_SERVICES.ROSE_HOUSE.id,
    signal_type: 'Medication Error',
    risk_domain: ['Medication'],
    description: 'Wrong dosage administered to Resident B',
    immediate_action: 'Doctor notified, resident monitored',
    severity: 'High',
    has_happened_before: 'No',
    pattern_concern: 'Isolated',
    escalation_required: 'Director Review'
  },
  SAFEGUARDING_CONCERN: {
    entry_date: '2026-04-30',
    entry_time: '16:45',
    service_id: TEST_SERVICES.LAKE_VIEW.id,
    signal_type: 'Safeguarding',
    risk_domain: ['Safeguarding'],
    description: 'Unexplained bruise observed on Resident C',
    immediate_action: 'Safeguarding lead notified, incident logged',
    severity: 'Critical',
    has_happened_before: 'No',
    pattern_concern: 'Isolated',
    escalation_required: 'Immediate RI Review'
  }
};

export const SAMPLE_ACTIONS = {
  BEHAVIOUR_PLAN_REVIEW: {
    title: 'Review behaviour support plan for Resident A',
    description: 'Comprehensive review of current behaviour support strategies',
    due_date: '2026-05-07',
    priority: 'High',
    assigned_to: TEST_USERS.TEAM_LEADER.id,
    linked_risk_domain: 'Behaviour'
  },
  MEDICATION_PROTOCOL_UPDATE: {
    title: 'Update medication administration protocol',
    description: 'Revise protocols to prevent dosage errors',
    due_date: '2026-05-03',
    priority: 'Critical',
    assigned_to: TEST_USERS.REGISTERED_MANAGER.id,
    linked_risk_domain: 'Medication'
  },
  STAFF_TRAINING: {
    title: 'Safeguarding refresher training',
    description: 'Mandatory safeguarding training for all staff',
    due_date: '2026-05-10',
    priority: 'Medium',
    assigned_to: TEST_USERS.REGISTERED_MANAGER.id,
    linked_risk_domain: 'Safeguarding'
  }
};

export const SAMPLE_RISKS = {
  ESCALATING_BEHAVIOUR: {
    title: 'Escalating behavioural risk - Resident A',
    description: 'Pattern of aggressive behaviour requiring intervention',
    risk_domain: 'Behaviour',
    severity: 'High',
    service_id: TEST_SERVICES.ROSE_HOUSE.id,
    status: 'Active'
  },
  MEDICATION_SAFETY: {
    title: 'Medication safety protocol gaps',
    description: 'Systematic issues in medication administration',
    risk_domain: 'Medication',
    severity: 'Critical',
    service_id: TEST_SERVICES.ROSE_HOUSE.id,
    status: 'Active'
  }
};

export const SAMPLE_INCIDENTS = {
  CRITICAL_BEHAVIOUR: {
    house_id: TEST_SERVICES.ROSE_HOUSE.id,
    incident_title: 'Physical aggression - Resident A',
    severity: 'Critical',
    incident_type: 'Behaviour',
    occurred_at: '2026-04-29T09:00:00Z',
    initial_summary: 'Resident A physically aggressive towards staff member',
    persons_involved: ['Resident A', 'Staff Member'],
    immediate_actions: ['Staff safety ensured', 'Resident calmed', 'Management notified']
  },
  SAFEGUARDING_BRUISING: {
    house_id: TEST_SERVICES.LAKE_VIEW.id,
    incident_title: 'Unexplained bruising - Resident C',
    severity: 'Critical',
    incident_type: 'Safeguarding',
    occurred_at: '2026-04-28T14:30:00Z',
    initial_summary: 'Multiple unexplained bruises found during routine care',
    persons_involved: ['Resident C'],
    immediate_actions: ['Safeguarding lead notified', 'Family informed', 'CQC referral made']
  }
};

/**
 * Helper function to generate test signal data with variations
 */
export function generateTestSignal(overrides: Partial<typeof SAMPLE_SIGNALS.BEHAVIOUR_INCIDENT> = {}) {
  return {
    ...SAMPLE_SIGNALS.BEHAVIOUR_INCIDENT,
    entry_date: new Date().toISOString().split('T')[0],
    entry_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    ...overrides
  };
}

/**
 * Helper function to generate multiple signals for pattern testing
 */
export function generateSignalPattern(count: number, daysApart: number = 1) {
  const signals = [];
  const baseDate = new Date();
  
  for (let i = 0; i < count; i++) {
    const signalDate = new Date(baseDate);
    signalDate.setDate(baseDate.getDate() - (i * daysApart));
    
    signals.push(generateTestSignal({
      entry_date: signalDate.toISOString().split('T')[0],
      description: `Behaviour incident ${i + 1} - Resident A showing aggression`
    }));
  }
  
  return signals;
}

/**
 * Test data validation helpers
 */
export function validateSignalData(signal: any) {
  const required = ['entry_date', 'service_id', 'signal_type', 'risk_domain', 'description', 'severity'];
  const missing = required.filter(field => !signal[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required signal fields: ${missing.join(', ')}`);
  }
  
  return true;
}

export function validateActionData(action: any) {
  const required = ['title', 'due_date', 'assigned_to'];
  const missing = required.filter(field => !action[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required action fields: ${missing.join(', ')}`);
  }
  
  return true;
}

/**
 * API response helpers
 */
export interface APIResponse<T> {
  data: T;
  message: string;
  status: number;
}

export interface SignalResponse {
  id: string;
  service_id: string;
  user_id: string;
  entry_date: string;
  signal_type: string;
  risk_domain: string[];
  description: string;
  severity: string;
  status: string;
  created_at: string;
}

export interface ActionResponse {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: string;
  assigned_to: string;
  status: string;
  effectiveness?: string;
  created_at: string;
}

export interface RiskResponse {
  id: string;
  title: string;
  description: string;
  risk_domain: string;
  severity: string;
  service_id: string;
  status: string;
  created_at: string;
}

export interface ClusterResponse {
  id: string;
  service_id: string;
  risk_domain: string;
  signal_count: number;
  cluster_status: string;
  created_at: string;
}
