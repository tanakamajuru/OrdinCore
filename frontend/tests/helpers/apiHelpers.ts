import { APIRequestContext } from '@playwright/test';

export async function getToken(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${process.env.API_URL}/auth/login`, {
    data: { email, password },
  });
  const json = await res.json();
  return json.data.token;
}

export async function createSignal(
  request: APIRequestContext,
  token: string,
  data: {
    service_id?: string;
    house_id?: string;
    signal_type?: string;
    risk_domain?: string[];
    description?: string;
    severity?: string;
    pattern_concern?: string;
    escalation_required?: string;
    related_person?: string;
    entry_date?: string;
    medication_error_type?: string;
  }
) {
  const houseId = data.house_id || data.service_id;
  if (!houseId) {
    throw new Error('Must provide service_id or house_id in createSignal payload');
  }

  const payload = {
    entry_date: data.entry_date || new Date().toISOString().slice(0, 10),
    entry_time: '10:00',
    house_id: houseId,
    signal_type: data.signal_type || 'Incident',
    risk_domain: data.risk_domain || ['Behaviour'],
    description: data.description || 'Test signal for pattern detection',
    immediate_action: 'De-escalated',
    severity: data.severity || 'High',
    has_happened_before: 'Yes',
    pattern_concern: data.pattern_concern || 'Clear',
    escalation_required: data.escalation_required || 'Manager Review',
    related_person: data.related_person || null,
    medication_error_type: data.medication_error_type || null,
  };

  const res = await request.post(`${process.env.API_URL}/pulses`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });
  return res;
}

export async function waitForCluster(
  request: APIRequestContext,
  token: string,
  serviceId: string,
  riskDomain: string,
  minSignalCount: number = 3,
  timeoutMs: number = 120000,
  linkedPerson?: string
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request.get(`${process.env.API_URL}/governance/clusters?house_id=${serviceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const clusters = (await res.json()).data || [];
    const cluster = clusters.find((c: any) => 
      c.risk_domain === riskDomain && 
      c.signal_count >= minSignalCount && 
      (linkedPerson === undefined || c.linked_person === linkedPerson)
    );
    if (cluster) return cluster;
    await new Promise(r => setTimeout(r, 4000));
  }
  throw new Error(`Cluster not found for ${riskDomain}${linkedPerson ? ` (${linkedPerson})` : ''} in house ${serviceId} after ${timeoutMs}ms`);
}
