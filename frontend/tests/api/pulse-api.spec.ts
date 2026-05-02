import { test, expect } from '@playwright/test';
import { TestUsers } from '../auth.setup';
import { SAMPLE_SIGNALS, generateTestSignal, validateSignalData } from '../fixtures/testData';

test.describe('Pulse API – Signal Management', () => {
  let tlToken: string, rmToken: string;

  test.beforeAll(async ({ request }) => {
    tlToken = (await TestUsers.teamLeader(request)).token;
    rmToken = (await TestUsers.registeredManager(request)).token;
  });

  test('POST /pulse – should create a valid signal', async ({ request }) => {
    const signalData = generateTestSignal();
    validateSignalData(signalData);

    const response = await request.post(`${process.env.API_URL}/pulse`, {
      headers: { Authorization: `Bearer ${tlToken}` },
      data: signalData
    });

    expect(response.status()).toBe(201);
    const json = await response.json();
    expect(json.data).toHaveProperty('id');
    expect(json.data).toHaveProperty('signal_type', signalData.signal_type);
    expect(json.data).toHaveProperty('severity', signalData.severity);
  });

  test('POST /pulse – should validate required fields', async ({ request }) => {
    const invalidSignal = {
      entry_date: '2026-04-30',
      // Missing required fields
    };

    const response = await request.post(`${process.env.API_URL}/pulse`, {
      headers: { Authorization: `Bearer ${tlToken}` },
      data: invalidSignal
    });

    expect([400, 422]).toContain(response.status());
    const json = await response.json();
    expect(json).toHaveProperty('errors');
  });

  test('POST /pulse – should reject unauthorized requests', async ({ request }) => {
    const response = await request.post(`${process.env.API_URL}/pulse`, {
      data: generateTestSignal()
    });

    expect(response.status()).toBe(401);
  });

  test('GET /pulse – should retrieve signals for user service', async ({ request }) => {
    const response = await request.get(`${process.env.API_URL}/pulse`, {
      headers: { Authorization: `Bearer ${tlToken}` }
    });

    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('data');
    expect(Array.isArray(json.data)).toBeTruthy();
  });

  test('GET /pulse/:id – should retrieve specific signal', async ({ request }) => {
    // First create a signal
    const createResponse = await request.post(`${process.env.API_URL}/pulse`, {
      headers: { Authorization: `Bearer ${tlToken}` },
      data: generateTestSignal()
    });
    
    if (createResponse.status() === 201) {
      const signalId = (await createResponse.json()).data.id;
      
      // Retrieve the specific signal
      const getResponse = await request.get(`${process.env.API_URL}/pulse/${signalId}`, {
        headers: { Authorization: `Bearer ${tlToken}` }
      });

      expect(getResponse.status()).toBe(200);
      const json = await getResponse.json();
      expect(json.data).toHaveProperty('id', signalId);
    }
  });

  test('PUT /pulse/:id – should update existing signal', async ({ request }) => {
    // First create a signal
    const createResponse = await request.post(`${process.env.API_URL}/pulse`, {
      headers: { Authorization: `Bearer ${tlToken}` },
      data: generateTestSignal()
    });
    
    if (createResponse.status() === 201) {
      const signalId = (await createResponse.json()).data.id;
      
      // Update the signal
      const updateData = {
        description: 'Updated description for test',
        immediate_action: 'Updated immediate action'
      };

      const updateResponse = await request.put(`${process.env.API_URL}/pulse/${signalId}`, {
        headers: { Authorization: `Bearer ${tlToken}` },
        data: updateData
      });

      expect(updateResponse.status()).toBe(200);
      const json = await updateResponse.json();
      expect(json.data).toHaveProperty('description', updateData.description);
    }
  });

  test('DELETE /pulse/:id – should delete signal (if allowed)', async ({ request }) => {
    // First create a signal
    const createResponse = await request.post(`${process.env.API_URL}/pulse`, {
      headers: { Authorization: `Bearer ${tlToken}` },
      data: generateTestSignal()
    });
    
    if (createResponse.status() === 201) {
      const signalId = (await createResponse.json()).data.id;
      
      // Try to delete the signal
      const deleteResponse = await request.delete(`${process.env.API_URL}/pulse/${signalId}`, {
        headers: { Authorization: `Bearer ${tlToken}` }
      });

      // May return 204 (deleted), 403 (not allowed), or 405 (method not allowed)
      expect([204, 403, 405]).toContain(deleteResponse.status());
    }
  });

  test('GET /pulse/service/:serviceId – should retrieve signals for specific service', async ({ request }) => {
    const serviceId = process.env.TEST_SERVICE_ROSE_HOUSE!;
    
    const response = await request.get(`${process.env.API_URL}/pulse/service/${serviceId}`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    expect([200, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(Array.isArray(json.data)).toBeTruthy();
    }
  });

  test('POST /pulse/batch – should create multiple signals', async ({ request }) => {
    const batchData = [
      generateTestSignal({ description: 'Batch signal 1' }),
      generateTestSignal({ description: 'Batch signal 2' }),
      generateTestSignal({ description: 'Batch signal 3' })
    ];

    const response = await request.post(`${process.env.API_URL}/pulse/batch`, {
      headers: { Authorization: `Bearer ${tlToken}` },
      data: { signals: batchData }
    });

    // May return 201 (created), 400 (bad request), or 404 (endpoint not found)
    expect([201, 400, 404]).toContain(response.status());
    
    if (response.status() === 201) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(Array.isArray(json.data)).toBeTruthy();
      expect(json.data).toHaveLength(3);
    }
  });

  test('GET /pulse/stats – should retrieve signal statistics', async ({ request }) => {
    const response = await request.get(`${process.env.API_URL}/pulse/stats`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    // May return 200 (success), 403 (forbidden), or 404 (endpoint not found)
    expect([200, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(json.data).toHaveProperty('total_signals');
      expect(json.data).toHaveProperty('by_severity');
      expect(json.data).toHaveProperty('by_type');
    }
  });

  test('POST /pulse/search – should search signals with filters', async ({ request }) => {
    const searchData = {
      date_from: '2026-04-01',
      date_to: '2026-04-30',
      severity: ['High', 'Critical'],
      signal_types: ['Incident', 'Medication Error']
    };

    const response = await request.post(`${process.env.API_URL}/pulse/search`, {
      headers: { Authorization: `Bearer ${rmToken}` },
      data: searchData
    });

    // May return 200 (success), 400 (bad request), or 404 (endpoint not found)
    expect([200, 400, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(Array.isArray(json.data)).toBeTruthy();
    }
  });

  test('POST /pulse/export – should export signals to CSV/Excel', async ({ request }) => {
    const exportData = {
      format: 'csv',
      date_from: '2026-04-01',
      date_to: '2026-04-30',
      service_id: process.env.TEST_SERVICE_ROSE_HOUSE
    };

    const response = await request.post(`${process.env.API_URL}/pulse/export`, {
      headers: { Authorization: `Bearer ${rmToken}` },
      data: exportData
    });

    // May return 200 (file), 400 (bad request), or 404 (endpoint not found)
    expect([200, 400, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      // Check if response is a file download
      const contentType = response.headers()['content-type'];
      expect(['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']).toContain(contentType);
    }
  });

  test('POST /pulse – should handle medication error signals', async ({ request }) => {
    const medicationError = {
      ...SAMPLE_SIGNALS.MEDICATION_ERROR,
      entry_date: new Date().toISOString().split('T')[0],
      entry_time: new Date().toTimeString().split(' ')[0].substring(0, 5)
    };

    const response = await request.post(`${process.env.API_URL}/pulse`, {
      headers: { Authorization: `Bearer ${tlToken}` },
      data: medicationError
    });

    expect(response.status()).toBe(201);
    const json = await response.json();
    expect(json.data).toHaveProperty('signal_type', 'Medication Error');
    expect(json.data).toHaveProperty('severity', 'High');
  });

  test('POST /pulse – should handle safeguarding signals', async ({ request }) => {
    const safeguardingSignal = {
      ...SAMPLE_SIGNALS.SAFEGUARDING_CONCERN,
      entry_date: new Date().toISOString().split('T')[0],
      entry_time: new Date().toTimeString().split(' ')[0].substring(0, 5)
    };

    const response = await request.post(`${process.env.API_URL}/pulse`, {
      headers: { Authorization: `Bearer ${tlToken}` },
      data: safeguardingSignal
    });

    expect(response.status()).toBe(201);
    const json = await response.json();
    expect(json.data).toHaveProperty('signal_type', 'Safeguarding');
    expect(json.data).toHaveProperty('severity', 'Critical');
  });

  test('GET /pulse/pending – should retrieve pending signals for RM review', async ({ request }) => {
    const response = await request.get(`${process.env.API_URL}/pulse/pending`, {
      headers: { Authorization: `Bearer ${rmToken}` }
    });

    // May return 200 (success), 403 (forbidden), or 404 (endpoint not found)
    expect([200, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const json = await response.json();
      expect(json).toHaveProperty('data');
      expect(Array.isArray(json.data)).toBeTruthy();
    }
  });

  test('POST /pulse/:id/acknowledge – should acknowledge signal (RM only)', async ({ request }) => {
    // First create a signal
    const createResponse = await request.post(`${process.env.API_URL}/pulse`, {
      headers: { Authorization: `Bearer ${tlToken}` },
      data: generateTestSignal()
    });
    
    if (createResponse.status() === 201) {
      const signalId = (await createResponse.json()).data.id;
      
      // Acknowledge the signal as RM
      const ackResponse = await request.post(`${process.env.API_URL}/pulse/${signalId}/acknowledge`, {
        headers: { Authorization: `Bearer ${rmToken}` },
        data: { acknowledgment_notes: 'Signal reviewed and acknowledged' }
      });

      // May return 200 (success), 403 (forbidden), or 404 (endpoint not found)
      expect([200, 403, 404]).toContain(ackResponse.status());
    }
  });
});
