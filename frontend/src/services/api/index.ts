import { ApiResponse, PaginatedResponse, User, Company, House, Risk, Incident, Escalation, GovernancePulse, LoginRequest, LoginResponse, DashboardStats } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Generic API helper
class ApiClient {
  public baseURL: string;

  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    // Always read the freshest token from localStorage
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/logout')) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        throw new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  // Public generic HTTP helpers to support consolidation
  public async get<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public async post<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: data ? JSON.stringify(data) : options.body 
    });
  }

  public async patch<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: data ? JSON.stringify(data) : options.body 
    });
  }

  public async delete<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // ─── Auth endpoints ────────────────────────────────────────────────────────
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('userRole', response.data.user.role);
      }
    }

    return response;
  }

  async logout(): Promise<ApiResponse<null>> {
    try {
      const response = await this.request<null>('/auth/logout', { method: 'POST' });
      return response;
    } finally {
      this.clearToken();
    }
  }

  async me(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me');
  }

  async refreshToken(): Promise<ApiResponse<LoginResponse>> {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await this.request<LoginResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    return this.request<null>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // ─── Company endpoints ─────────────────────────────────────────────────────
  async getCompanies(): Promise<ApiResponse<Company[]>> {
    return this.request<Company[]>('/companies');
  }

  async getCompany(id: string): Promise<ApiResponse<Company>> {
    return this.request<Company>(`/companies/${id}`);
  }

  async createCompany(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Company>> {
    return this.request<Company>('/companies', {
      method: 'POST',
      body: JSON.stringify(company),
    });
  }

  async updateCompany(id: string, company: Partial<Company>): Promise<ApiResponse<Company>> {
    return this.request<Company>(`/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(company),
    });
  }

  async deleteCompany(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/companies/${id}`, { method: 'DELETE' });
  }

  // ─── User endpoints ────────────────────────────────────────────────────────
  async getUsers(page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<User>>> {
    return this.request<PaginatedResponse<User>>(`/users?page=${page}&limit=${limit}`);
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`);
  }

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin'>): Promise<ApiResponse<User>> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async updateUser(id: string, user: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(user),
    });
  }

  async deleteUser(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/users/${id}`, { method: 'DELETE' });
  }

  async searchUsers(query: string): Promise<ApiResponse<User[]>> {
    return this.request<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
  }

  async suspendUser(id: string): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}/suspend`, { method: 'PATCH' });
  }

  async activateUser(id: string): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}/activate`, { method: 'PATCH' });
  }

  // ─── House endpoints ────────────────────────────────────────────────────────
  async getHouses(): Promise<ApiResponse<House[]>> {
    return this.request<House[]>('/houses');
  }

  async getHouse(id: string): Promise<ApiResponse<House>> {
    return this.request<House>(`/houses/${id}`);
  }

  async createHouse(house: Omit<House, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<House>> {
    return this.request<House>('/houses', {
      method: 'POST',
      body: JSON.stringify(house),
    });
  }

  async updateHouse(id: string, house: Partial<House>): Promise<ApiResponse<House>> {
    return this.request<House>(`/houses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(house),
    });
  }

  async deleteHouse(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/houses/${id}`, { method: 'DELETE' });
  }

  async getHouseRisks(id: string): Promise<ApiResponse<Risk[]>> {
    return this.request<Risk[]>(`/houses/${id}/risks`);
  }

  async getHouseIncidents(id: string): Promise<ApiResponse<Incident[]>> {
    return this.request<Incident[]>(`/houses/${id}/incidents`);
  }

  async getHouseGovernancePulses(id: string): Promise<ApiResponse<GovernancePulse[]>> {
    return this.request<GovernancePulse[]>(`/houses/${id}/governance-pulses`);
  }

  // ─── Risk endpoints ────────────────────────────────────────────────────────
  async getRisks(page = 1, limit = 20): Promise<ApiResponse<Risk[]>> {
    return this.request<Risk[]>(`/risks?page=${page}&limit=${limit}`);
  }

  async getRisk(id: string): Promise<ApiResponse<Risk>> {
    return this.request<Risk>(`/risks/${id}`);
  }

  async createRisk(risk: Omit<Risk, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Risk>> {
    return this.request<Risk>('/risks', {
      method: 'POST',
      body: JSON.stringify(risk),
    });
  }

  async updateRisk(id: string, risk: Partial<Risk>): Promise<ApiResponse<Risk>> {
    return this.request<Risk>(`/risks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(risk),
    });
  }

  async deleteRisk(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/risks/${id}`, { method: 'DELETE' });
  }

  async getRiskTimeline(riskId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/risks/${riskId}/timeline`);
  }

  async addRiskEvent(riskId: string, event: { type: string; description: string }): Promise<ApiResponse<any>> {
    return this.request<any>(`/risks/${riskId}/event`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async escalateRisk(riskId: string, data: { reason: string; escalated_to: string }): Promise<ApiResponse<any>> {
    return this.request<any>(`/risks/${riskId}/escalate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRisksActions(filters: Record<string, string> = {}): Promise<ApiResponse<any[]>> {
    const query = new URLSearchParams(filters).toString();
    return this.request<any[]>(`/risks/actions${query ? `?${query}` : ''}`);
  }


  // ─── Action endpoints ──────────────────────────────────────────────────────
  async completeAction(id: string, data: { completion_note?: string; completion_outcome: string; completion_rationale: string }): Promise<ApiResponse<any>> {
    return this.request<any>(`/actions/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async rmReviewAction(id: string, data: { rm_decision: string; rm_comment?: string }): Promise<ApiResponse<any>> {
    return this.request<any>(`/actions/${id}/rm-review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── Weekly Review endpoints ────────────────────────────────────────────────
  async finaliseWeeklyReview(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/weekly-reviews/${id}/finalise`, {
      method: 'POST',
    });
  }

  async validateWeeklyReview(id: string, data: { validation_status: string; validation_comment: string }): Promise<ApiResponse<any>> {
    return this.request<any>(`/weekly-reviews/${id}/validate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── Incident endpoints ──────────────────────────────────────────────────
  async getIncidents(page = 1, limit = 20): Promise<ApiResponse<Incident[]>> {
    return this.request<Incident[]>(`/incidents?page=${page}&limit=${limit}`);
  }

  async getIncident(id: string): Promise<ApiResponse<Incident>> {
    return this.request<Incident>(`/incidents/${id}`);
  }

  async createIncident(incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Incident>> {
    return this.request<Incident>('/incidents', {
      method: 'POST',
      body: JSON.stringify(incident),
    });
  }

  async updateIncident(id: string, incident: Partial<Incident>): Promise<ApiResponse<Incident>> {
    return this.request<Incident>(`/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(incident),
    });
  }

  async deleteIncident(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/incidents/${id}`, { method: 'DELETE' });
  }

  async resolveIncident(id: string, resolutionNotes: string): Promise<ApiResponse<Incident>> {
    return this.request<Incident>(`/incidents/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolution_notes: resolutionNotes }),
    });
  }

  async getIncidentTimeline(id: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/incidents/${id}/timeline`);
  }

  // ─── Escalation endpoints ─────────────────────────────────────────────────
  async getEscalations(page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<Escalation>>> {
    return this.request<PaginatedResponse<Escalation>>(`/escalations?page=${page}&limit=${limit}`);
  }

  async getEscalation(id: string): Promise<ApiResponse<Escalation>> {
    return this.request<Escalation>(`/escalations/${id}`);
  }

  async resolveEscalation(id: string, resolutionNotes: string): Promise<ApiResponse<Escalation>> {
    return this.request<Escalation>(`/escalations/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_notes: resolutionNotes }),
    });
  }

  async addEscalationAction(id: string, action: { action: string; notes: string }): Promise<ApiResponse<any>> {
    return this.request<any>(`/escalations/${id}/actions`, {
      method: 'POST',
      body: JSON.stringify(action),
    });
  }

  // ─── Governance Pulse endpoints ──────────────────────────────────────────
  async getGovernancePulses(page = 1, limit = 20, assignedUserId?: string): Promise<ApiResponse<GovernancePulse[]>> {
    const query = `?page=${page}&limit=${limit}${assignedUserId ? `&assigned_user_id=${assignedUserId}` : ''}`;
    return this.request<GovernancePulse[]>(`/governance/pulses${query}`);
  }

  async getGovernancePulse(id: string): Promise<ApiResponse<GovernancePulse>> {
    return this.request<GovernancePulse>(`/governance/pulses/${id}`);
  }

  async createGovernancePulse(pulse: Omit<GovernancePulse, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<GovernancePulse>> {
    return this.request<GovernancePulse>('/governance/pulse', {
      method: 'POST',
      body: JSON.stringify(pulse),
    });
  }

  async getGovernancePulsesForHouse(houseId: string): Promise<ApiResponse<GovernancePulse[]>> {
    return this.request<GovernancePulse[]>(`/houses/${houseId}/governance-pulses`);
  }

  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('/analytics/dashboard');
  }

  // ─── Analytics endpoints ─────────────────────────────────────────────────
  async getRiskTrends(params?: Record<string, string>): Promise<ApiResponse<any>> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/analytics/risk-trends${query}`);
  }

  async getSitePerformance(): Promise<ApiResponse<any>> {
    return this.request<any>('/analytics/site-performance');
  }

  async getGovernanceCompliance(): Promise<ApiResponse<any>> {
    return this.request<any>('/analytics/governance-compliance');
  }

  async getEscalationRate(): Promise<ApiResponse<any>> {
    return this.request<any>('/analytics/escalation-rate');
  }

  // ─── Notifications endpoints ──────────────────────────────────────────────
  async getNotifications(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/notifications');
  }

  async markNotificationRead(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead(): Promise<ApiResponse<any>> {
    return this.request<any>('/notifications/read-all', { method: 'PATCH' });
  }

  // ─── Reports endpoints ────────────────────────────────────────────────────
  async requestReport(type: string, filters?: Record<string, any>): Promise<ApiResponse<any>> {
    return this.request<any>('/reports/request', {
      method: 'POST',
      body: JSON.stringify({ type, filters }),
    });
  }

  async getReports(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/reports');
  }

  async getReport(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/reports/${id}`);
  }

  async downloadReport(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/reports/${id}/download`);
  }

  // ─── Admin Stats endpoints ──────────────────────────────────────────────
  async getAdminUserStats(): Promise<ApiResponse<{ total: number; active: number }>> {
    return this.request<{ total: number; active: number }>('/admin/users/stats/summary');
  }

  async getAdminHouseStats(): Promise<ApiResponse<{ total: number; active: number; occupancyRate: number }>> {
    return this.request<{ total: number; active: number; occupancyRate: number }>('/admin/houses/stats/summary');
  }

  async getAdminPulseStats(): Promise<ApiResponse<{ total: number; pending: number }>> {
    return this.request<{ total: number; pending: number }>('/admin/pulses/stats/summary');
  }

  async getAdminRiskStats(): Promise<ApiResponse<{ total: number; active: number }>> {
    return this.request<{ total: number; active: number }>('/admin/risks/stats/summary');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
