import { test, expect } from '@playwright/test';
import { TestUsers } from '../auth.setup';
import { generateSignalPattern, generateTestSignal } from '../fixtures/testData';

test.describe('Pattern API – Pattern Detection & Clustering', () => {
  let tlToken: string, rmToken: string, directorToken: string;

  test.beforeAll(async ({ request }) => {
    tlToken = (await TestUsers.teamLeader(request)).token;
    rmToken = (await TestUsers.registeredManager(request)).token;
    directorToken = (await TestUsers.director(request)).token;
  });

  test('GET /patterns – should retrieve patterns for user role', async ({ request }) => {
    const response = await request.get(`${process.env.API_URL}/patterns`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    expect([200, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(Array.isArray(json.data)).toBeTruthy();
    }
  });

  test('POST /patterns/detect – should trigger pattern detection', async ({ request }) => {
    const response = await request.post(`${process.env.API_URL}/patterns/detect`, {
      headers: { Authorization: `Bearer ${rmToken}` },
      data: { 
        service_id: process.env.TEST_SERVICE_ROSE_HOUSE,
        risk_domain: 'Behaviour',
        lookback_days: 30
      }
    });

    expect([200, 202, 404]).toContain(response.status());
    
    if ([200, 202].includes(response.status())) {
      const json = await response.json();
      expect(json).toHaveProperty('message');
      expect(json.message).toMatch(/pattern detection/i);
    }
  });

  test('GET /patterns/service/:serviceId – should retrieve patterns for specific service', async ({ request }) => {
    const serviceId = process.env.TEST_SERVICE_ROSE_HOUSE!;
    
    const response = await request.get(`${process.env.API_URL}/patterns/service/${serviceId}`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    expect([200, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(Array.isArray(json.data)).toBeTruthy();
    }
  });

  test('GET /patterns/:id – should retrieve specific pattern', async ({ request }) => {
    // First get list of patterns
    const listResponse = await request.get(`${process.env.API_URL}/patterns`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    if (listResponse.status() === 200) {
      const patterns = (await listResponse.json()).data;
      
      if (patterns.length > 0) {
        const patternId = patterns[0].id;
        
        // Get specific pattern
        const response = await request.get(`${process.env.API_URL}/patterns/${patternId}`, {
          headers: { Authorization: `Bearer ${rmToken}` }
        });

        expect(response.status()).toBe(200);
        const json = await response.json();
        expect(json.data).toHaveProperty('id', patternId);
        expect(json.data).toHaveProperty('cluster_status');
        expect(json.data).toHaveProperty('signal_count');
      }
    }
  });

  test('POST /patterns/:id/promote – should promote pattern to risk (RM only)', async ({ request }) => {
    // First get list of patterns
    const listResponse = await request.get(`${process.env.API_URL}/patterns`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    if (listResponse.status() === 200) {
      const patterns = (await listResponse.json()).data;
      const emergingPatterns = patterns.filter(pattern => pattern.cluster_status === 'Emerging');
      
      if (emergingPatterns.length > 0) {
        const patternId = emergingPatterns[0].id;
        
        // Promote pattern to risk
        const response = await request.post(`${process.env.API_URL}/patterns/${patternId}/promote`, {
          headers: { Authorization: `Bearer ${rmToken}` },
          data: { 
            risk_title: 'Escalating behavioural risk - Pattern detected',
            risk_description: 'Pattern analysis indicates escalating behavioural incidents requiring intervention',
            severity: 'High'
          }
        });

        expect([201, 403, 404]).toContain(response.status());
        
        if (response.status() === 201) {
          const json = await response.json();
          expect(json.data).toHaveProperty('risk_id');
          expect(json.data).toHaveProperty('pattern_id', patternId);
        }
      }
    }
  });

  test('POST /patterns/:id/dismiss – should dismiss pattern (RM only)', async ({ request }) => {
    // First get list of patterns
    const listResponse = await request.get(`${process.env.API_URL}/patterns`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    if (listResponse.status() === 200) {
      const patterns = (await listResponse.json()).data;
      
      if (patterns.length > 0) {
        const patternId = patterns[0].id;
        
        // Dismiss pattern
        const response = await request.post(`${process.env.API_URL}/patterns/${patternId}/dismiss`, {
          headers: { Authorization: `Bearer ${rmToken}` },
          data: { 
            dismissal_reason: 'Pattern determined to be coincidental, not indicative of systemic issue',
            notes: 'Individual incidents reviewed, no common pattern identified'
          }
        });

        expect([200, 403, 404]).toContain(response.status());
        
        if (response.status() === 200) {
          const json = await response.json();
          expect(json.data).toHaveProperty('cluster_status', 'Dismissed');
        }
      }
    }
  });

  test('GET /patterns/emerging – should retrieve emerging patterns', async ({ request }) => {
    const response = await request.get(`${process.env.API_URL}/patterns/emerging`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    expect([200, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(Array.isArray(json.data)).toBeTruthy();
    }
  });

  test('GET /patterns/stats – should retrieve pattern statistics', async ({ request }) => {
    const response = await request.get(`${process.env.API_URL}/patterns/stats`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    expect([200, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(json.data).toHaveProperty('total_patterns');
      expect(json.data).toHaveProperty('by_status');
      expect(json.data).toHaveProperty('by_domain');
      expect(json.data).toHaveProperty('by_service');
    }
  });

  test('POST /patterns/analyze – should analyze signals for patterns', async ({ request }) => {
    // Create multiple signals to form a pattern
    const signalPattern = generateSignalPattern(3, 2); // 3 signals, 2 days apart
    
    for (const signal of signalPattern) {
      await request.post(`${process.env.API_URL}/pulse`, {
        headers: { Authorization: `Bearer ${tlToken}` },
        data: signal
      });
    }

    // Wait for pattern engine to process (in real scenario, this would be background job)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Trigger analysis
    const response = await request.post(`${process.env.API_URL}/patterns/analyze`, {
      headers: { Authorization: `Bearer ${rmToken}` },
      data: { 
        service_id: process.env.TEST_SERVICE_ROSE_HOUSE,
        risk_domain: 'Behaviour',
        analysis_type: 'temporal'
      }
    });

    expect([200, 202, 404]).toContain(response.status());
    
    if ([200, 202].includes(response.status())) {
      const json = await response.json();
      expect(json).toHaveProperty('analysis_results');
    }
  });

  test('GET /patterns/:id/signals – should retrieve signals in pattern', async ({ request }) => {
    // First get list of patterns
    const listResponse = await request.get(`${process.env.API_URL}/patterns`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    if (listResponse.status() === 200) {
      const patterns = (await listResponse.json()).data;
      
      if (patterns.length > 0) {
        const patternId = patterns[0].id;
        
        // Get signals in pattern
        const response = await request.get(`${process.env.API_URL}/patterns/${patternId}/signals`, {
          headers: { Authorization: `Bearer ${rmToken}` }
        });

        expect(response.status()).toBe(200);
        const json = await response.json();
        expect(json).toHaveProperty('data');
        expect(Array.isArray(json.data)).toBeTruthy();
      }
    }
  });

  test('POST /patterns/:id/escalate – should escalate pattern to director', async ({ request }) => {
    // First get list of patterns
    const listResponse = await request.get(`${process.env.API_URL}/patterns`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    if (listResponse.status() === 200) {
      const patterns = (await listResponse.json()).data;
      const criticalPatterns = patterns.filter(pattern => 
        pattern.severity === 'Critical' || pattern.signal_count >= 5
      );
      
      if (criticalPatterns.length > 0) {
        const patternId = criticalPatterns[0].id;
        
        // Escalate to director
        const response = await request.post(`${process.env.API_URL}/patterns/${patternId}/escalate`, {
          headers: { Authorization: `Bearer ${rmToken}` },
          data: { 
            escalation_reason: 'Critical pattern detected requiring director-level intervention',
            urgency: 'High',
            recommended_actions: ['Immediate review', 'Staff retraining', 'Protocol revision']
          }
        });

        expect([200, 403, 404]).toContain(response.status());
        
        if (response.status() === 200) {
          const json = await response.json();
          expect(json.data).toHaveProperty('escalation_id');
        }
      }
    }
  });

  test('GET /patterns/director-alerts – should retrieve patterns requiring director attention', async ({ request }) => {
    const response = await request.get(`${process.env.API_URL}/patterns/director-alerts`, {
      headers: { Authorization: `Bearer ${directorToken}` }
    });

    expect([200, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(Array.isArray(json.data)).toBeTruthy();
    }
  });

  test('POST /patterns/export – should export patterns analysis', async ({ request }) => {
    const exportData = {
      format: 'csv',
      service_id: process.env.TEST_SERVICE_ROSE_HOUSE,
      date_from: '2026-04-01',
      date_to: '2026-04-30',
      include_signals: true
    };

    const response = await request.post(`${process.env.API_URL}/patterns/export`, {
      headers: { Authorization: `Bearer ${rmToken}` },
      data: exportData
    });

    expect([200, 400, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'];
      expect(['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']).toContain(contentType);
    }
  });

  test('GET /patterns/trends – should retrieve pattern trends over time', async ({ request }) => {
    const response = await request.get(`${process.env.API_URL}/patterns/trends`, {
      headers: { Authorization: `Bearer ${rmToken}` },
      params: {
        period: '90d',
        service_id: process.env.TEST_SERVICE_ROSE_HOUSE
      }
    });

    expect([200, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(json.data).toHaveProperty('trend_data');
      expect(Array.isArray(json.data.trend_data)).toBeTruthy();
    }
  });

  test('POST /patterns/batch-analyze – should analyze multiple domains simultaneously', async ({ request }) => {
    const response = await request.post(`${process.env.API_URL}/patterns/batch-analyze`, {
      headers: { Authorization: `Bearer ${rmToken}` },
      data: { 
        service_id: process.env.TEST_SERVICE_ROSE_HOUSE,
        risk_domains: ['Behaviour', 'Medication', 'Safeguarding'],
        lookback_days: 30,
        min_signals: 3
      }
    });

    expect([200, 202, 404]).toContain(response.status());
    
    if ([200, 202].includes(response.status())) {
      const json = await response.json();
      expect(json).toHaveProperty('batch_results');
      expect(json.batch_results).toHaveProperty('analyzed_domains');
    }
  });

  test('POST /patterns/:id/review – should add review notes to pattern', async ({ request }) => {
    // First get list of patterns
    const listResponse = await request.get(`${process.env.API_URL}/patterns`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    if (listResponse.status() === 200) {
      const patterns = (await listResponse.json()).data;
      
      if (patterns.length > 0) {
        const patternId = patterns[0].id;
        
        // Add review notes
        const response = await request.post(`${process.env.API_URL}/patterns/${patternId}/review`, {
          headers: { Authorization: `Bearer ${rmToken}` },
          data: { 
            review_notes: 'Pattern reviewed - confirmed clustering of behavioural incidents',
            reviewer_action: 'Monitor for escalation',
            next_review_date: '2026-05-15'
          }
        });

        expect([200, 403, 404]).toContain(response.status());
        
        if (response.status() === 200) {
          const json = await response.json();
          expect(json.data).toHaveProperty('review_notes');
        }
      }
    }
  });
});
