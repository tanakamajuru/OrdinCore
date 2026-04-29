import apiClient from "./apiClient";

export const directorApi = {
  getEffectivenessSummary: (start?: string, end?: string) => 
    apiClient.get(`/director-governance/effectiveness-summary`, { params: { start, end } }).then(res => res.data.data),
  
  getControlFailures: () => 
    apiClient.get(`/director-governance/control-failures`).then(res => res.data.data),
  
  resolveControlFailure: (id: string, note: string) => 
    apiClient.post(`/director-governance/control-failures/${id}/resolve`, { note }).then(res => res.data.data),
  
  getMonthlyReportDraft: (periodStart: string, periodEnd: string) => 
    apiClient.get(`/director-governance/monthly-report/draft`, { params: { periodStart, periodEnd } }).then(res => res.data.data),
  
  finaliseMonthlyReport: (id: string, final_narrative: string) => 
    apiClient.post(`/director-governance/monthly-report/${id}/finalise`, { final_narrative }).then(res => res.data.data),
  
  getUnacknowledgedIncidents: () => 
    apiClient.get(`/director-governance/unacknowledged-incidents`).then(res => res.data.data),
  
  createIntervention: (data: { service_id: string; intervention_type: string; message: string; target_user_id?: string }) => 
    apiClient.post(`/director-governance/interventions`, data).then(res => res.data.data),
};
