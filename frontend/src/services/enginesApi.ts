// API service for computational engines
import { apiClient } from './apiClient';

export interface EngineStatus {
  isRunning: boolean;
  schedules: EngineSchedule[];
  systemHealth: SystemHealth;
  recentExecutions: EngineExecution[];
}

export interface EngineSchedule {
  engine: string;
  frequency: 'real-time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  duration?: number;
  error?: string;
}

export interface SystemHealth {
  totalEngines: number;
  activeEngines: number;
  failedEngines: number;
  lastExecution: string;
  averageExecutionTime: number;
  uptime: number;
}

export interface EngineExecution {
  engine: string;
  startTime: string;
  endTime: string;
  duration: number;
  success: boolean;
  result?: any;
  error?: string;
}

export interface EngineMetrics {
  schedule: EngineSchedule;
  executions: EngineExecution[];
  successRate: number;
  averageDuration: number;
  lastError?: string;
}

export interface EngineDashboard {
  overview: {
    totalEngines: number;
    activeEngines: number;
    failedEngines: number;
    isRunning: boolean;
    uptime: number;
  };
  performance: {
    averageExecutionTime: number;
    lastExecution: string;
    recentExecutions: EngineExecution[];
  };
  engines: EngineSchedule[];
}

export const enginesApi = {
  // Get scheduler status
  getStatus: async (): Promise<EngineStatus> => {
    const response = await apiClient.get('/engines/status');
    return response.data.data;
  },

  // Get system health
  getHealth: async (): Promise<SystemHealth> => {
    const response = await apiClient.get('/engines/health');
    return response.data.data;
  },

  // Get execution history
  getHistory: async (limit: number = 50): Promise<EngineExecution[]> => {
    const response = await apiClient.get('/engines/history', { params: { limit } });
    return response.data.data;
  },

  // Get specific engine metrics
  getMetrics: async (engineName: string): Promise<EngineMetrics> => {
    const response = await apiClient.get(`/engines/metrics/${engineName}`);
    return response.data.data;
  },

  // Force run an engine
  runEngine: async (engineName: string): Promise<EngineExecution> => {
    const response = await apiClient.post(`/engines/run/${engineName}`);
    return response.data.data;
  },

  // Update engine schedule
  updateSchedule: async (engineName: string, updates: Partial<EngineSchedule>): Promise<void> => {
    await apiClient.put(`/engines/schedule/${engineName}`, updates);
  },

  // Enable/disable engine
  toggleEngine: async (engineName: string, enabled: boolean): Promise<void> => {
    await apiClient.post(`/engines/toggle/${engineName}`, { enabled });
  },

  // Cleanup old execution history
  cleanupHistory: async (olderThanDays: number = 30): Promise<void> => {
    await apiClient.post('/engines/cleanup', { olderThanDays });
  },

  // Get engine-specific results
  getResults: async (engineName: string, limit: number = 10): Promise<{
    engine: string;
    results: Array<{
      executionId: string;
      timestamp: string;
      duration: number;
      result: any;
    }>;
    totalResults: number;
  }> => {
    const response = await apiClient.get(`/engines/results/${engineName}`, { params: { limit } });
    return response.data.data;
  },

  // Get dashboard summary
  getDashboard: async (): Promise<EngineDashboard> => {
    const response = await apiClient.get('/engines/dashboard');
    return response.data.data;
  }
};
