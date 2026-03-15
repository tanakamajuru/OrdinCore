import { ApiResponse, PaginatedResponse, User, Company, House, Risk, RiskEvent, Incident, Escalation, GovernancePulse, DashboardStats, LoginRequest, LoginResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Generic API helper
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async logout(): Promise<ApiResponse<null>> {
    const response = await this.request<null>('/auth/logout', {
      method: 'POST',
    });

    this.clearToken();
    return response;
  }

  async refreshToken(): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<LoginResponse>('/auth/refresh', {
      method: 'POST',
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  // Company endpoints
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
      method: 'PUT',
      body: JSON.stringify(company),
    });
  }

  async deleteCompany(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/companies/${id}`, {
      method: 'DELETE',
    });
  }

  // User endpoints
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
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  async deleteUser(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // House endpoints
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
      method: 'PUT',
      body: JSON.stringify(house),
    });
  }

  async deleteHouse(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/houses/${id}`, {
      method: 'DELETE',
    });
  }

  // Risk endpoints
  async getRisks(): Promise<ApiResponse<Risk[]>> {
    return this.request<Risk[]>('/risks');
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
      method: 'PUT',
      body: JSON.stringify(risk),
    });
  }

  async deleteRisk(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/risks/${id}`, {
      method: 'DELETE',
    });
  }

  // Risk Event endpoints
  async getRiskEvents(riskId: string): Promise<ApiResponse<RiskEvent[]>> {
    return this.request<RiskEvent[]>(`/risk-events/${riskId}`);
  }

  async createRiskEvent(event: Omit<RiskEvent, 'id' | 'createdAt'>): Promise<ApiResponse<RiskEvent>> {
    return this.request<RiskEvent>('/risk-events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  // Incident endpoints
  async getIncidents(): Promise<ApiResponse<Incident[]>> {
    return this.request<Incident[]>('/incidents');
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

  // Escalation endpoints
  async getEscalations(): Promise<ApiResponse<Escalation[]>> {
    return this.request<Escalation[]>('/escalations');
  }

  async getEscalation(id: string): Promise<ApiResponse<Escalation>> {
    return this.request<Escalation>(`/escalations/${id}`);
  }

  async createEscalation(escalation: Omit<Escalation, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Escalation>> {
    return this.request<Escalation>('/escalations', {
      method: 'POST',
      body: JSON.stringify(escalation),
    });
  }

  async updateEscalation(id: string, escalation: Partial<Escalation>): Promise<ApiResponse<Escalation>> {
    return this.request<Escalation>(`/escalations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(escalation),
    });
  }

  // Governance Pulse endpoints
  async getGovernancePulses(): Promise<ApiResponse<GovernancePulse[]>> {
    return this.request<GovernancePulse[]>('/governance-pulses');
  }

  async getGovernancePulsesForHouse(houseId: string): Promise<ApiResponse<GovernancePulse[]>> {
    return this.request<GovernancePulse[]>(`/governance-pulses/${houseId}`);
  }

  async createGovernancePulse(pulse: Omit<GovernancePulse, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<GovernancePulse>> {
    return this.request<GovernancePulse>('/governance-pulses', {
      method: 'POST',
      body: JSON.stringify(pulse),
    });
  }

  // Dashboard endpoints
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('/dashboard/stats');
  }

  // Report endpoints
  async getRiskRegisterReport(): Promise<ApiResponse<any>> {
    return this.request<any>('/reports/risk-register');
  }

  async getIncidentsReport(): Promise<ApiResponse<any>> {
    return this.request<any>('/reports/incidents');
  }

  async getEscalationsReport(): Promise<ApiResponse<any>> {
    return this.request<any>('/reports/escalations');
  }

  async getGovernanceReport(): Promise<ApiResponse<any>> {
    return this.request<any>('/reports/governance');
  }

  async getTrendsReport(): Promise<ApiResponse<any>> {
    return this.request<any>('/reports/trends');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
