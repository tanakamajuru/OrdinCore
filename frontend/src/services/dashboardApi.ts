import { apiClient, ApiResponse } from './apiClient';

export interface DashboardData {
  overview: {
    totalRisks: number;
    activeRisks: number;
    highPriorityRisks: number;
    totalIncidents: number;
    seriousIncidents: number;
    totalEscalations: number;
    pendingEscalations: number;
    complianceRate: number;
  };
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    severity: string;
    house: string;
  }>;
  riskTrends: Array<{
    date: string;
    count: number;
    severity: string;
  }>;
  incidentTrends: Array<{
    date: string;
    count: number;
    severity: string;
  }>;
  escalationMetrics: {
    total: number;
    resolved: number;
    pending: number;
    overdue: number;
    averageResponseTime: number;
  };
  pulseStatus: {
    totalSites: number;
    completedPulses: number;
    missedPulses: number;
    overduePulses: number;
    overallCompliance: number;
  };
}

export interface RiskTimeline {
  riskId: string;
  risk: {
    id: string;
    title: string;
    description: string;
    category: string;
    severity: string;
    status: string;
    houseId: string;
    houseName: string;
    createdAt: string;
    createdBy: string;
  };
  timeline: Array<{
    id: string;
    date: string;
    type: string;
    title: string;
    description: string;
    performedBy: {
      id: string;
      name: string;
      role: string;
    };
    severity: string;
  }>;
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    escalationCount: number;
    incidentLinks: number;
    lastActivity: string;
  };
}

export interface GovernancePulseStatus {
  totalSites: number;
  completedPulses: number;
  pendingPulses: number;
  missedPulses: number;
  overduePulses: number;
  overallCompliance: number;
  siteStatuses: Array<{
    houseId: string;
    houseName: string;
    currentPeriod: {
      startDate: string;
      endDate: string;
      requiredDate: string;
    };
    status: 'completed' | 'pending' | 'missed' | 'overdue';
    lastSubmitted?: string;
    daysSinceRequired?: number;
    assignedManager?: string;
    complianceRate: number;
  }>;
}

// Mock data function for when backend is not available
function getMockDashboardData(role: string): DashboardData {
  return {
    overview: {
      totalRisks: 15,
      activeRisks: 8,
      highPriorityRisks: 3,
      totalIncidents: 12,
      seriousIncidents: 2,
      totalEscalations: 5,
      pendingEscalations: 2,
      complianceRate: 85
    },
    recentActivities: [
      {
        id: '1',
        type: 'risk',
        description: 'Medication administration errors - Potential adverse health outcomes for residents',
        timestamp: new Date().toISOString(),
        severity: 'high',
        house: 'Oakwood'
      },
      {
        id: '2',
        type: 'incident',
        description: 'Resident fall incident - Fall prevention measures needed',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        severity: 'medium',
        house: 'Riverside'
      },
      {
        id: '3',
        type: 'escalation',
        description: 'Staffing shortage - Emergency staffing activated',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        severity: 'high',
        house: 'Maple Grove'
      }
    ],
    riskTrends: [
      { date: '2024-01-01', count: 8, severity: 'high' },
      { date: '2024-01-08', count: 10, severity: 'high' },
      { date: '2024-01-15', count: 9, severity: 'high' },
      { date: '2024-01-22', count: 11, severity: 'high' },
      { date: '2024-01-29', count: 13, severity: 'high' },
      { date: '2024-02-05', count: 12, severity: 'high' }
    ],
    incidentTrends: [
      { date: '2024-01-01', count: 2, severity: 'medium' },
      { date: '2024-01-08', count: 3, severity: 'medium' },
      { date: '2024-01-15', count: 1, severity: 'low' },
      { date: '2024-01-22', count: 4, severity: 'high' },
      { date: '2024-01-29', count: 2, severity: 'medium' },
      { date: '2024-02-05', count: 3, severity: 'medium' }
    ],
    escalationMetrics: {
      total: 5,
      resolved: 3,
      pending: 2,
      overdue: 0,
      averageResponseTime: 2.5
    },
    pulseStatus: {
      totalSites: 5,
      completedPulses: 4,
      missedPulses: 1,
      overduePulses: 0,
      overallCompliance: 80
    }
  };
}

export const dashboardApi = {
  // Get dashboard data for specific role
  async getDashboardData(role: string): Promise<DashboardData> {
    try {
      const response = await apiClient.get<ApiResponse<DashboardData>>(`/dashboard/${role}`);
      return response.data.data || getMockDashboardData(role);
    } catch (error) {
      console.warn('Backend not available, using mock data:', error);
      return getMockDashboardData(role);
    }
  },

  // Get risk timeline for a specific risk
  getRiskTimeline: async (riskId: string): Promise<RiskTimeline> => {
    const response = await apiClient.get<ApiResponse<RiskTimeline>>(`/risks/timeline/${riskId}`);
    return response.data.data!;
  },

  // Get governance pulse status
  getPulseStatus: async (): Promise<GovernancePulseStatus> => {
    try {
      const response = await apiClient.get<ApiResponse<GovernancePulseStatus>>('/governance-pulse/status');
      return response.data.data || {
        totalSites: 5,
        completedPulses: 4,
        missedPulses: 1,
        overduePulses: 0,
        pendingPulses: 0,
        overallCompliance: 80,
        siteStatuses: []
      };
    } catch (error) {
      console.warn('Backend not available, using mock pulse status:', error);
      return {
        totalSites: 5,
        completedPulses: 4,
        missedPulses: 1,
        overduePulses: 0,
        pendingPulses: 0,
        overallCompliance: 80,
        siteStatuses: []
      };
    }
  },

  // Get upcoming pulse requirements
  getUpcomingPulseRequirements: async () => {
    const response = await apiClient.get('/governance-pulse/upcoming');
    return response.data.data;
  },

  // Submit governance pulse
  submitPulse: async (pulseData: any) => {
    const response = await apiClient.post('/governance-pulse', pulseData);
    return response.data.data;
  },

  // Get pulse history for a site
  getPulseHistory: async (houseId: string, limit: number = 10) => {
    const response = await apiClient.get(`/governance-pulse/history/${houseId}`, { params: { limit } });
    return response.data.data;
  },

  // Get risk statistics
  getRiskStats: async (houseId?: string) => {
    const params = houseId ? { houseId } : {};
    const response = await apiClient.get('/risks/stats', { params });
    return response.data.data;
  },

  // Get incident statistics
  getIncidentStats: async (houseId?: string) => {
    const params = houseId ? { houseId } : {};
    const response = await apiClient.get('/incidents/stats', { params });
    return response.data.data;
  },

  // Get escalation statistics
  getEscalationStats: async (houseId?: string) => {
    const params = houseId ? { houseId } : {};
    const response = await apiClient.get('/escalations/stats', { params });
    return response.data.data;
  },

  // Get trend analysis data
  getTrendAnalysis: async (type: 'risk' | 'incident' | 'escalation', period: string = '30d') => {
    const response = await apiClient.get(`/trends/${type}`, { params: { period } });
    return response.data.data;
  },

  // Get pattern detection results
  getPatternDetections: async (houseId?: string, severity?: string) => {
    const params: any = {};
    if (houseId) params.houseId = houseId;
    if (severity) params.severity = severity;
    
    const response = await apiClient.get('/trends/patterns', { params });
    return response.data.data;
  },

  // Get weekly review summary
  getWeeklyReviewSummary: async (houseId?: string) => {
    const params = houseId ? { houseId } : {};
    const response = await apiClient.get('/reports/weekly-summary', { params });
    return response.data.data;
  },

  // Get compliance metrics
  getComplianceMetrics: async (period: string = '30d') => {
    const response = await apiClient.get('/dashboard/compliance', { params: { period } });
    return response.data.data;
  }
};
