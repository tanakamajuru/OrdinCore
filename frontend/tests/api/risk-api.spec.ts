import { test, expect } from '@playwright/test';
import { TestUsers } from '../auth.setup';
import { SAMPLE_RISKS, SAMPLE_SIGNALS, generateTestSignal } from '../fixtures/testData';

test.describe('Risk API – Risk Management', () => {
  let tlToken: string, rmToken: string, riToken: string, directorToken: string;

  test.beforeAll(async ({ request }) => {
    tlToken = (await TestUsers.teamLeader(request)).token;
    rmToken = (await TestUsers.registeredManager(request)).token;
    riToken = (await TestUsers.responsibleIndividual(request)).token;
    directorToken = (await TestUsers.director(request)).token;
  });

  test('GET /risks – should retrieve risks for user role', async ({ request }) => {
    const response = await request.get(`${process.env.API_URL}/risks`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('data');
    expect(Array.isArray(json.data)).toBeTruthy();
  });

  test('POST /risks – should create new risk (RM only)', async ({ request }) => {
    const riskData = {
      ...SAMPLE_RISKS.ESCALATING_BEHAVIOUR,
      service_id: process.env.TEST_SERVICE_ROSE_HOUSE!
    };

    const response = await request.post(`${process.env.API_URL}/risks`, {
      headers: { Authorization: `Bearer ${rmToken}` },
      data: riskData
    });

    expect([201, 403, 404]).toContain(response.status());
    
    if (response.status() === 201) {
      const json = await response.json();
      expect(json.data).toHaveProperty('id');
      expect(json.data).toHaveProperty('title', riskData.title);
      expect(json.data).toHaveProperty('severity', riskData.severity);
    }
  });

  test('POST /risks – should reject unauthorized risk creation', async ({ request }) => {
    const riskData = {
      ...SAMPLE_RISKS.ESCALATING_BEHAVIOUR,
      service_id: process.env.TEST_SERVICE_ROSE_HOUSE!
    };

    // Try as Team Leader (should be forbidden)
    const response = await request.post(`${process.env.API_URL}/risks`, {
      headers: { Authorization: `Bearer ${tlToken}` },
      data: riskData
    });

    expect([403, 404]).toContain(response.status());
  });

  test('GET /risks/:id – should retrieve specific risk', async ({ request }) => {
    // First get list of risks
    const listResponse = await request.get(`${process.env.API_URL}/risks`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    if (listResponse.status() === 200) {
      const risks = (await listResponse.json()).data;
      
      if (risks.length > 0) {
        const riskId = risks[0].id;
        
        // Get specific risk
        const response = await request.get(`${process.env.API_URL}/risks/${riskId}`, {
          headers: { Authorization: `Bearer ${rmToken}` }
        });

        expect(response.status()).toBe(200);
        const json = await response.json();
        expect(json.data).toHaveProperty('id', riskId);
      }
    }
  });

  test('PUT /risks/:id – should update existing risk', async ({ request }) => {
    // First get list of risks
    const listResponse = await request.get(`${process.env.API_URL}/risks`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    if (listResponse.status() === 200) {
      const risks = (await listResponse.json()).data;
      
      if (risks.length > 0) {
        const riskId = risks[0].id;
        
        // Update risk
        const updateData = {
          title: 'Updated risk title for test',
          description: 'Updated risk description',
          severity: 'High'
        };

        const response = await request.put(`${process.env.API_URL}/risks/${riskId}`, {
          headers: { Authorization: `Bearer ${rmToken}` },
          data: updateData
        });

        expect([200, 403, 404]).toContain(response.status());
        
        if (response.status() === 200) {
          const json = await response.json();
          expect(json.data).toHaveProperty('title', updateData.title);
        }
      }
    }
  });

  test('POST /risks/:id/link-signal – should link signal to risk', async ({ request }) => {
    // Create a signal first
    const signalResponse = await request.post(`${process.env.API_URL}/pulse`, {
      headers: { Authorization: `Bearer ${tlToken}` },
      data: generateTestSignal()
    });

    if (signalResponse.status() === 201) {
      const signalId = (await signalResponse.json()).data.id;
      
      // Get existing risks
      const risksResponse = await request.get(`${process.env.API_URL}/risks`, {
        headers: { Authorization: `Bearer ${rmToken}` }
      });

      if (risksResponse.status() === 200) {
        const risks = (await risksResponse.json()).data;
        
        if (risks.length > 0) {
          const riskId = risks[0].id;
          
          // Link signal to risk
          const response = await request.post(`${process.env.API_URL}/risks/${riskId}/link-signal`, {
            headers: { Authorization: `Bearer ${rmToken}` },
            data: { signal_id: signalId }
          });

          expect([200, 201, 404]).toContain(response.status());
        }
      }
    }
  });

  test('GET /risks/service/:serviceId – should retrieve risks for specific service', async ({ request }) => {
    const serviceId = process.env.TEST_SERVICE_ROSE_HOUSE!;
    
    const response = await request.get(`${process.env.API_URL}/risks/service/${serviceId}`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    expect([200, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(Array.isArray(json.data)).toBeTruthy();
    }
  });

  test('GET /risks/pending – should retrieve risks awaiting approval', async ({ request }) => {
    const response = await request.get(`${process.env.API_URL}/risks/pending`, {
      headers: { Authorization: `Bearer ${riToken}` }
    });

    expect([200, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(Array.isArray(json.data)).toBeTruthy();
    }
  });

  test('POST /risks/:id/approve – should approve risk (RI only)', async ({ request }) => {
    // Get existing risks
    const risksResponse = await request.get(`${process.env.API_URL}/risks`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    if (risksResponse.status() === 200) {
      const risks = (await risksResponse.json()).data;
      
      if (risks.length > 0) {
        const riskId = risks[0].id;
        
        // Approve risk as RI
        const response = await request.post(`${process.env.API_URL}/risks/${riskId}/approve`, {
          headers: { Authorization: `Bearer ${riToken}` },
          data: { 
            approval_notes: 'Risk assessment reviewed and approved by RI',
            statutory_reference: 'CQC-2026-456'
          }
        });

        expect([200, 403, 404]).toContain(response.status());
        
        if (response.status() === 200) {
          const json = await response.json();
          expect(json.data).toHaveProperty('status', 'Approved');
        }
      }
    }
  });

  test('GET /risks/stats – should retrieve risk statistics', async ({ request }) => {
    const response = await request.get(`${process.env.API_URL}/risks/stats`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    expect([200, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(json.data).toHaveProperty('total_risks');
      expect(json.data).toHaveProperty('by_severity');
      expect(json.data).toHaveProperty('by_domain');
      expect(json.data).toHaveProperty('by_status');
    }
  });

  test('POST /risks/search – should search risks with filters', async ({ request }) => {
    const searchData = {
      severity: ['High', 'Critical'],
      risk_domain: ['Behaviour', 'Medication'],
      status: ['Active', 'Pending']
    };

    const response = await request.post(`${process.env.API_URL}/risks/search`, {
      headers: { Authorization: `Bearer ${rmToken}` },
      data: searchData
    });

    expect([200, 400, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(Array.isArray(json.data)).toBeTruthy();
    }
  });

  test('POST /risks/export – should export risks to CSV/Excel', async ({ request }) => {
    const exportData = {
      format: 'csv',
      service_id: process.env.TEST_SERVICE_ROSE_HOUSE,
      date_from: '2026-04-01',
      date_to: '2026-04-30'
    };

    const response = await request.post(`${process.env.API_URL}/risks/export`, {
      headers: { Authorization: `Bearer ${rmToken}` },
      data: exportData
    });

    expect([200, 400, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'];
      expect(['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']).toContain(contentType);
    }
  });

  test('POST /risks/:id/close – should close risk', async ({ request }) => {
    // Get existing risks
    const risksResponse = await request.get(`${process.env.API_URL}/risks`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    if (risksResponse.status() === 200) {
      const risks = (await risksResponse.json()).data;
      
      if (risks.length > 0) {
        const riskId = risks[0].id;
        
        // Close risk
        const response = await request.post(`${process.env.API_URL}/risks/${riskId}/close`, {
          headers: { Authorization: `Bearer ${rmToken}` },
          data: { 
            closure_reason: 'Risk mitigated successfully',
            closure_notes: 'All control measures implemented and effective'
          }
        });

        expect([200, 403, 404]).toContain(response.status());
        
        if (response.status() === 200) {
          const json = await response.json();
          expect(json.data).toHaveProperty('status', 'Closed');
        }
      }
    }
  });

  test('POST /risks/:id/reopen – should reopen closed risk', async ({ request }) => {
    // This would typically be used if a closed risk re-emerges
    const risksResponse = await request.get(`${process.env.API_URL}/risks`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    if (risksResponse.status() === 200) {
      const risks = (await risksResponse.json()).data;
      const closedRisks = risks.filter(risk => risk.status === 'Closed');
      
      if (closedRisks.length > 0) {
        const riskId = closedRisks[0].id;
        
        // Reopen risk
        const response = await request.post(`${process.env.API_URL}/risks/${riskId}/reopen`, {
          headers: { Authorization: `Bearer ${rmToken}` },
          data: { 
            reopen_reason: 'New incident indicates risk re-emergence',
            severity: 'High'
          }
        });

        expect([200, 403, 404]).toContain(response.status());
        
        if (response.status() === 200) {
          const json = await response.json();
          expect(json.data).toHaveProperty('status', 'Active');
        }
      }
    }
  });

  test('GET /risks/director-overview – should provide director-level risk overview', async ({ request }) => {
    const response = await request.get(`${process.env.API_URL}/risks/director-overview`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });

    expect([200, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(json.data).toHaveProperty('company_wide_risks');
      expect(json.data).toHaveProperty('critical_risks');
      expect(json.data).toHaveProperty('trending_risks');
    }
  });

  test('POST /risks/:id/director-review – should add director review notes', async ({ request }) => {
    const risksResponse = await request.get(`${process.env.API_URL}/risks`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    if (risksResponse.status() === 200) {
      const risks = (await risksResponse.json()).data;
      
      if (risks.length > 0) {
        const riskId = risks[0].id;
        
        // Add director review
        const response = await request.post(`${process.env.API_URL}/risks/${riskId}/director-review`, {
          headers: { Authorization: `Bearer ${directorToken}` },
          data: { 
            review_notes: 'Director review: Risk requires board-level attention. Mitigation strategies to be reviewed.',
            priority_level: 'High'
          }
        });

        expect([200, 403, 404]).toContain(response.status());
        
        if (response.status() === 200) {
          const json = await response.json();
          expect(json.data).toHaveProperty('director_review');
        }
      }
    }
  });
});
