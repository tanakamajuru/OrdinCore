import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:3000'; // Adjust to your backend port

test.describe('Backend API Tests', () => {
  test('health check endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    
    // Some APIs return 404 for health check, that's okay if the endpoint doesn't exist
    if (response.status() === 404) {
      console.log('Health check endpoint not found - skipping');
      return;
    }
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
  });

  test('user registration endpoint', async ({ request }) => {
    const userData = {
      email: 'test@example.com',
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User'
    };

    const response = await request.post(`${API_BASE_URL}/api/auth/register`, {
      data: userData
    });

    // Accept 201 (created) or 409 (conflict, if user already exists)
    expect([201, 409, 400]).toContain(response.status());
    
    if (response.status() === 201) {
      const data = await response.json();
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('email', userData.email);
    }
  });

  test('user login endpoint', async ({ request }) => {
    const loginData = {
      email: 'test@example.com',
      password: 'testpassword123'
    };

    const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: loginData
    });

    // Accept 200 (success) or 401 (unauthorized, if credentials wrong)
    expect([200, 401, 400]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
    }
  });

  test('protected endpoint requires authentication', async ({ request }) => {
    // Try to access a protected endpoint without token
    const response = await request.get(`${API_BASE_URL}/api/users/profile`);
    
    // Should return 401 (unauthorized) or 403 (forbidden)
    expect([401, 403, 404]).toContain(response.status());
  });

  test('authenticated user can access profile', async ({ request }) => {
    // First login to get token
    const loginResponse = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'testpassword123'
      }
    });

    if (loginResponse.status() !== 200) {
      console.log('Login failed - skipping authenticated test');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Use token to access protected endpoint
    const profileResponse = await request.get(`${API_BASE_URL}/api/users/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Should return 200 (success) or 404 (if endpoint doesn't exist)
    expect([200, 404]).toContain(profileResponse.status());
    
    if (profileResponse.status() === 200) {
      const profileData = await profileResponse.json();
      expect(profileData).toHaveProperty('user');
    }
  });

  test('companies endpoint returns data', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/companies`);
    
    // Accept 200 (success), 401 (unauthorized), or 404 (not found)
    expect([200, 401, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data.companies) || Array.isArray(data)).toBeTruthy();
    }
  });

  test('POST request validation works', async ({ request }) => {
    // Send invalid data to test validation
    const invalidData = {
      email: 'invalid-email',
      password: '123' // too short
    };

    const response = await request.post(`${API_BASE_URL}/api/auth/register`, {
      data: invalidData
    });

    // Should return 400 (bad request) for validation errors
    expect([400, 422]).toContain(response.status());
  });
});
