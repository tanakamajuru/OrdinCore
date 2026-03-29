# Test Plan & Test Cases Document
# Ordin Core Governance SaaS Platform

## Document Information

| **Document Version** | 1.0 |
|---------------------|------|
| **Date** | January 15, 2024 |
| **Author** | Tanaka Majuru |
| **Approved By** | QA Lead |
| **Status** | Final |

## Table of Contents

1. [Test Plan Overview](#1-test-plan-overview)
2. [Test Strategy](#2-test-strategy)
3. [Test Environment Setup](#3-test-environment-setup)
4. [Unit Testing](#4-unit-testing)
5. [Integration Testing](#5-integration-testing)
6. [End-to-End Testing](#6-end-to-end-testing)
7. [Performance Testing](#7-performance-testing)
8. [Security Testing](#8-security-testing)
9. [Accessibility Testing](#9-accessibility-testing)
10. [Test Cases](#10-test-cases)

---

## 1. Test Plan Overview

### 1.1 Test Objectives

#### Primary Objectives
- **Verify functional requirements** are implemented correctly
- **Ensure system reliability** under various conditions
- **Validate performance** meets specified requirements
- **Confirm security** measures are effective
- **Ensure accessibility** compliance with WCAG 2.1 AA
- **Validate user experience** meets expectations

#### Success Criteria
- **100%** of critical test cases pass
- **95%** of important test cases pass
- **80%** unit test coverage achieved
- **< 3 seconds** average page load time
- **Zero** critical security vulnerabilities
- **WCAG 2.1 AA** compliance verified

### 1.2 Test Scope

#### In Scope
- **All 10 core screens** functionality
- **Authentication and authorization** system
- **Data management** (CRUD operations)
- **Form validation** and submission
- **Reporting and analytics** features
- **File upload** and storage
- **Email notifications**
- **Responsive design** across devices

#### Out of Scope
- **Third-party service** reliability (email providers, AWS)
- **Browser compatibility** for unsupported browsers
- **Hardware performance** on specific devices
- **Network reliability** under extreme conditions
- **User training** effectiveness

### 1.3 Test Deliverables

#### Test Artifacts
- **Test Plan Document** (this document)
- **Test Cases** with detailed steps and expected results
- **Test Data** for various scenarios
- **Test Scripts** for automated testing
- **Test Reports** with results and analysis
- **Bug Reports** with detailed reproduction steps

#### Documentation
- **Test Environment Setup** guide
- **Test Execution** logs
- **Defect Tracking** reports
- **Test Summary** reports
- **Performance Benchmark** results

---

## 2. Test Strategy

### 2.1 Test Levels

#### Unit Testing
- **Purpose**: Verify individual components work correctly
- **Tools**: Jest, React Testing Library, Supertest
- **Coverage Target**: 80% minimum
- **Automation**: 100% automated

#### Integration Testing
- **Purpose**: Verify component interactions work correctly
- **Tools**: Jest, Test Containers, Postman
- **Coverage**: All API endpoints and database operations
- **Automation**: 100% automated

#### System Testing
- **Purpose**: Verify complete system functionality
- **Tools**: Cypress, Selenium, BrowserStack
- **Coverage**: All user workflows and business processes
- **Automation**: 90% automated

#### User Acceptance Testing
- **Purpose**: Verify system meets user requirements
- **Tools**: Manual testing, user feedback forms
- **Coverage**: Critical business processes
- **Automation**: 0% (manual)

### 2.2 Test Types

#### Functional Testing
- **Happy path** scenarios
- **Edge cases** and boundary conditions
- **Error handling** and validation
- **Business rules** verification
- **Data integrity** checks

#### Non-Functional Testing
- **Performance testing** (load, stress, endurance)
- **Security testing** (vulnerability scanning, penetration testing)
- **Accessibility testing** (screen readers, keyboard navigation)
- **Usability testing** (user experience, interface design)
- **Compatibility testing** (browsers, devices, operating systems)

---

## 3. Test Environment Setup

### 3.1 Environment Configuration

#### Development Environment
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=test
      - DATABASE_URL=postgresql://test:test@postgres:5432/caresignal_test
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=caresignal_test
      - POSTGRES_USER=test
      - POSTGRES_PASSWORD=test
    ports:
      - "5432:5432"

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
```

#### Test Data Setup
```sql
-- Test data seed script
INSERT INTO providers (id, name, settings) VALUES 
('test-provider-1', 'Test Care Home', '{"timezone": "UTC"}');

INSERT INTO users (id, provider_id, email, password_hash, name, role) VALUES 
('test-user-1', 'test-provider-1', 'manager@test.com', '$2b$10$...', 'Test Manager', 'manager'),
('test-user-2', 'test-provider-1', 'staff@test.com', '$2b$10$...', 'Test Staff', 'user');

INSERT INTO risks (id, provider_id, title, description, category, likelihood, impact, status) VALUES 
('test-risk-1', 'test-provider-1', 'Test Risk', 'Test risk description', 'Staffing', 'High', 'High', 'Open');
```

### 3.2 Test Tools Configuration

#### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

#### Cypress Configuration
```javascript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});
```

---

## 4. Unit Testing

### 4.1 Frontend Unit Tests

#### Component Testing Example
```typescript
// src/components/__tests__/Login.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from '../Login';

describe('Login Component', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    render(<Login onLogin={mockLogin} />);
  });

  test('renders login form correctly', () => {
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    const user = userEvent.setup();
    
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  test('submits form with valid data', async () => {
    const user = userEvent.setup();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  test('shows error message on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    const user = userEvent.setup();
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
```

#### Hook Testing Example
```typescript
// src/hooks/__tests__/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { AuthProvider } from '../AuthContext';

describe('useAuth Hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  test('initial state is correct', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  test('login updates state correctly', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    
    expect(result.current.user).toEqual({
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  test('logout clears state correctly', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    
    await act(async () => {
      result.current.logout();
    });
    
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

### 4.2 Backend Unit Tests

#### Service Testing Example
```typescript
// src/services/__tests__/authService.test.ts
import { authService } from '../authService';
import { prisma } from '../database';

jest.mock('../database');
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    test('returns user token for valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2b$10$hashedpassword',
        name: 'Test User',
        role: 'manager',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.login('test@example.com', 'password');

      expect(result).toHaveProperty('token');
      expect(result.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'manager',
      });
    });

    test('throws error for invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login('invalid@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials');
    });

    test('throws error for inactive user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        isActive: false,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(authService.login('test@example.com', 'password'))
        .rejects.toThrow('Account is inactive');
    });
  });
});
```

#### Controller Testing Example
```typescript
// src/controllers/__tests__/authController.test.ts
import request from 'supertest';
import { app } from '../app';
import { authService } from '../services/authService';

jest.mock('../services/authService');
const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    test('returns token for valid credentials', async () => {
      mockAuthService.login.mockResolvedValue({
        token: 'mock-token',
        user: { id: 'user-1', email: 'test@example.com' },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          token: 'mock-token',
          user: { id: 'user-1', email: 'test@example.com' },
        },
      });
    });

    test('returns error for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials',
        },
      });
    });
  });
});
```

---

## 5. Integration Testing

### 5.1 API Integration Tests

#### Endpoint Testing Example
```typescript
// tests/integration/auth.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/auth/login', () => {
    test('authenticates user with valid credentials', async () => {
      // Create test user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    test('rejects invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    test('returns user profile with valid token', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe('test@example.com');
    });

    test('rejects request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
    });
  });
});
```

#### Database Integration Tests
```typescript
// tests/integration/database.test.ts
import { prisma } from '../../src/database';
import { RiskService } from '../../src/services/riskService';

describe('Database Integration Tests', () => {
  beforeEach(async () => {
    await prisma.risk.deleteMany();
    await prisma.user.deleteMany();
    await prisma.provider.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('RiskService', () => {
    test('creates risk with valid data', async () => {
      const provider = await prisma.provider.create({
        data: {
          name: 'Test Provider',
        },
      });

      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          name: 'Test User',
          providerId: provider.id,
        },
      });

      const riskData = {
        title: 'Test Risk',
        description: 'Test risk description',
        category: 'Staffing',
        likelihood: 'High',
        impact: 'High',
        providerId: provider.id,
        createdById: user.id,
      };

      const risk = await RiskService.createRisk(riskData);

      expect(risk.id).toBeDefined();
      expect(risk.title).toBe('Test Risk');
      expect(risk.status).toBe('Open');
    });

    test('retrieves risks by provider', async () => {
      const provider = await prisma.provider.create({
        data: {
          name: 'Test Provider',
        },
      });

      await RiskService.createRisk({
        title: 'Risk 1',
        description: 'Description 1',
        category: 'Staffing',
        likelihood: 'High',
        impact: 'High',
        providerId: provider.id,
        createdById: 'user-1',
      });

      await RiskService.createRisk({
        title: 'Risk 2',
        description: 'Description 2',
        category: 'Clinical',
        likelihood: 'Medium',
        impact: 'High',
        providerId: provider.id,
        createdById: 'user-1',
      });

      const risks = await RiskService.getRisksByProvider(provider.id);

      expect(risks).toHaveLength(2);
      expect(risks[0].title).toBe('Risk 1');
      expect(risks[1].title).toBe('Risk 2');
    });
  });
});
```

---

## 6. End-to-End Testing

### 6.1 User Journey Tests

#### Login Flow E2E Test
```typescript
// cypress/e2e/login.cy.ts
describe('Login Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('displays login form', () => {
    cy.get('[data-testid="login-form"]').should('be.visible');
    cy.get('[data-testid="email-input"]').should('be.visible');
    cy.get('[data-testid="password-input"]').should('be.visible');
    cy.get('[data-testid="login-button"]').should('be.visible');
  });

  it('shows validation errors for empty fields', () => {
    cy.get('[data-testid="login-button"]').click();
    
    cy.get('[data-testid="email-error"]').should('contain', 'Email is required');
    cy.get('[data-testid="password-error"]').should('contain', 'Password is required');
  });

  it('logs in with valid credentials', () => {
    cy.get('[data-testid="email-input"]').type('manager@test.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-menu"]').should('contain', 'Test Manager');
  });

  it('shows error for invalid credentials', () => {
    cy.get('[data-testid="email-input"]').type('invalid@test.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="login-button"]').click();
    
    cy.get('[data-testid="error-message"]').should('contain', 'Invalid credentials');
    cy.url().should('include', '/login');
  });
});
```

#### Governance Pulse E2E Test
```typescript
// cypress/e2e/governance-pulse.cy.ts
describe('Governance Pulse', () => {
  beforeEach(() => {
    cy.login('manager@test.com', 'password123');
    cy.visit('/governance-pulse');
  });

  it('displays correct form based on day', () => {
    // Mock current day to be Monday
    cy.clock(new Date('2024-01-15'));
    cy.visit('/governance-pulse');
    
    cy.get('[data-testid="pulse-title"]').should('contain', 'Monday Governance Pulse');
    cy.get('[data-testid="stability-checks"]').should('be.visible');
    cy.get('[data-testid="house-snapshot"]').should('be.visible');
    cy.get('[data-testid="reflection"]').should('be.visible');
  });

  it('validates required fields', () => {
    cy.get('[data-testid="submit-button"]').click();
    
    cy.get('[data-testid="validation-error"]').should('be.visible');
    cy.get('[data-testid="reflection-error"]').should('contain', 'Reflection is required');
  });

  it('submits form with valid data', () => {
    cy.get('[data-testid="overnight-stability"]').check();
    cy.get('[data-testid="weekend-oversight"]').check();
    cy.get('[data-testid="staffing-adequacy"]').check();
    cy.get('[data-testid="critical-incidents"]').uncheck();
    cy.get('[data-testid="safeguarding-concerns"]').uncheck();
    cy.get('[data-testid="medication-administration"]').check();
    
    cy.get('[data-testid="house-occupancy"]').type('20');
    cy.get('[data-testid="house-staff"]').type('4');
    cy.get('[data-testid="house-overnight-staff"]').type('2');
    
    cy.get('[data-testid="reflection"]').type('Overall stable weekend with adequate staffing levels.');
    
    cy.get('[data-testid="submit-button"]').click();
    
    cy.get('[data-testid="success-message"]').should('contain', 'Pulse submitted successfully');
    cy.url().should('include', '/dashboard');
  });

  it('saves draft automatically', () => {
    cy.get('[data-testid="overnight-stability"]').check();
    cy.get('[data-testid="reflection"]').type('Draft content');
    
    // Wait for auto-save (2 seconds)
    cy.wait(2000);
    
    // Reload page to check if draft is saved
    cy.reload();
    
    cy.get('[data-testid="overnight-stability"]').should('be.checked');
    cy.get('[data-testid="reflection"]').should('contain', 'Draft content');
  });
});
```

#### Risk Management E2E Test
```typescript
// cypress/e2e/risk-management.cy.ts
describe('Risk Management', () => {
  beforeEach(() => {
    cy.login('manager@test.com', 'password123');
    cy.visit('/risk-register');
  });

  it('displays risk register', () => {
    cy.get('[data-testid="risk-table"]').should('be.visible');
    cy.get('[data-testid="risk-row"]').should('have.length.greaterThan', 0);
  });

  it('adds new risk', () => {
    cy.get('[data-testid="add-risk-button"]').click();
    
    cy.get('[data-testid="risk-title"]').type('Test Risk Title');
    cy.get('[data-testid="risk-description"]').type('Test risk description');
    cy.get('[data-testid="risk-category"]').select('Staffing');
    cy.get('[data-testid="risk-likelihood"]').select('High');
    cy.get('[data-testid="risk-impact"]').select('High');
    cy.get('[data-testid="risk-assignee"]').select('Test User');
    
    cy.get('[data-testid="save-risk-button"]').click();
    
    cy.get('[data-testid="success-message"]').should('contain', 'Risk created successfully');
    cy.get('[data-testid="risk-table"]').should('contain', 'Test Risk Title');
  });

  it('filters risks by status', () => {
    cy.get('[data-testid="status-filter"]').select('Open');
    cy.get('[data-testid="risk-row"]').should('have.length.greaterThan', 0);
    
    cy.get('[data-testid="status-filter"]').select('Closed');
    cy.get('[data-testid="risk-row"]').should('have.length', 0);
  });

  it('searches risks', () => {
    cy.get('[data-testid="search-input"]').type('Staffing');
    cy.get('[data-testid="risk-row"]').each(($row) => {
      cy.wrap($row).should('contain', 'Staffing');
    });
  });
});
```

---

## 7. Performance Testing

### 7.1 Load Testing

#### Load Test Script
```typescript
// tests/performance/load-test.ts
import { check } from 'k6';
import http from 'k6/http';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failed requests
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  // Test login endpoint
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Test dashboard endpoint
  const dashboardResponse = http.get(`${BASE_URL}/api/dashboard`, {
    headers: { 'Authorization': `Bearer ${loginResponse.json('data.token')}` },
  });

  check(dashboardResponse, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard response time < 300ms': (r) => r.timings.duration < 300,
  });
}
```

#### Performance Benchmarks
```typescript
// tests/performance/benchmarks.ts
describe('Performance Benchmarks', () => {
  test('page load times', async () => {
    const pages = [
      { path: '/login', expectedTime: 2000 },
      { path: '/dashboard', expectedTime: 3000 },
      { path: '/governance-pulse', expectedTime: 2500 },
      { path: '/risk-register', expectedTime: 2500 },
      { path: '/weekly-review', expectedTime: 3000 },
    ];

    for (const page of pages) {
      const startTime = Date.now();
      await page.goto(page.path);
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(page.expectedTime);
    }
  });

  test('API response times', async () => {
    const endpoints = [
      { path: '/api/auth/login', expectedTime: 1000 },
      { path: '/api/dashboard', expectedTime: 500 },
      { path: '/api/risks', expectedTime: 1000 },
      { path: '/api/pulses', expectedTime: 800 },
    ];

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      const response = await fetch(endpoint);
      const responseTime = Date.now() - startTime;
      
      expect(response.ok).toBe(true);
      expect(responseTime).toBeLessThan(endpoint.expectedTime);
    }
  });
});
```

### 7.2 Stress Testing

#### Stress Test Configuration
```yaml
# k6-stress-test.yml
apiVersion: k6.io/v1alpha1
kind: TestRun
metadata:
  name: caresignal-stress-test
spec:
  script: |
    import http from 'k6/http';
    import { check, sleep } from 'k6';

    export let options = {
      stages: [
        { duration: '1m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 200 },
        { duration: '1m', target: 300 },
        { duration: '1m', target: 400 },
        { duration: '5m', target: 400 },
        { duration: '1m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.05'],
      },
    };

    export default function () {
      const responses = http.batch([
        ['GET', 'http://localhost:3000/api/dashboard'],
        ['GET', 'http://localhost:3000/api/risks'],
        ['GET', 'http://localhost:3000/api/pulses'],
      ]);

      responses.forEach((response, index) => {
        check(response, {
          [`request ${index} status is 200`]: (r) => r.status === 200,
          [`request ${index} response time < 2s`]: (r) => r.timings.duration < 2000,
        });
      });

      sleep(1);
    }
```

---

## 8. Security Testing

### 8.1 Vulnerability Scanning

#### OWASP ZAP Configuration
```bash
#!/bin/bash
# security/vulnerability-scan.sh

# Start ZAP daemon
docker run -t --rm -d -p 8080:8080 owasp/zap2docker-stable zap.sh -daemon -host 0.0.0.0 -port 8080

# Wait for ZAP to start
sleep 30

# Run authenticated scan
docker run -t --rm --network host owasp/zap2docker-stable zap.sh \
  -quickurl http://localhost:3000 \
  -quickauthurl http://localhost:3000/login \
  -quickauthusername test@example.com \
  -quickauthpassword password123 \
  -quickauthformdata username=test@example.com&password=password123

# Generate report
docker run -t --rm --network host owasp/zap2docker-stable zap.sh \
  -cmd "-quickurl http://localhost:3000 -quickoutformat html -quickoutpath /zap/wrk/report.html"

# Stop ZAP
docker stop $(docker ps -q --filter "ancestor=owasp/zap2docker-stable")
```

#### Security Test Cases
```typescript
// tests/security/security.test.ts
describe('Security Tests', () => {
  test('prevents SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: maliciousInput,
        password: 'password',
      });

    expect(response.status).toBe(401);
    expect(response.body.error.message).not.toContain('SQL');
  });

  test('prevents XSS attacks', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    
    const response = await request(app)
      .post('/api/risks')
      .set('Authorization', 'Bearer valid-token')
      .send({
        title: xssPayload,
        description: 'Test description',
        category: 'Staffing',
        likelihood: 'High',
        impact: 'High',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('Invalid input');
  });

  test('implements rate limiting', async () => {
    const requests = Array(10).fill(null).map(() =>
      request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
    );

    const responses = await Promise.all(requests);
    
    // First few requests should work
    expect(responses[0].status).toBe(401);
    expect(responses[1].status).toBe(401);
    
    // Later requests should be rate limited
    expect(responses[9].status).toBe(429);
  });

  test('validates JWT tokens', async () => {
    const response = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });
});
```

### 8.2 Penetration Testing

#### Penetration Test Checklist
```markdown
## Authentication Security
- [ ] Password complexity requirements enforced
- [ ] Account lockout after failed attempts
- [ ] Session timeout implemented
- [ ] Secure password reset process
- [ ] Multi-factor authentication available

## Authorization Security
- [ ] Role-based access control enforced
- [ ] Privilege escalation prevented
- [ ] Horizontal access control implemented
- [ ] Vertical access control implemented
- [ ] API endpoint protection

## Data Security
- [ ] Input validation implemented
- [ ] Output encoding applied
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection

## Infrastructure Security
- [ ] HTTPS enforced
- [ ] Security headers implemented
- [ ] File upload restrictions
- [ ] Database encryption
- [ ] Backup encryption
```

---

## 9. Accessibility Testing

### 9.1 Automated Accessibility Tests

#### Axe Configuration
```typescript
// tests/accessibility/axe.test.ts
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';
import { Login } from '../../src/components/Login';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  test('Login component has no accessibility violations', async () => {
    const { container } = render(<Login />);
    const results = await axe(container);
    
    expect(results).toHaveNoViolations();
  });

  test('Dashboard component has no accessibility violations', async () => {
    const { container } = render(<Dashboard />);
    const results = await axe(container);
    
    expect(results).toHaveNoViolations();
  });
});
```

#### Cypress Accessibility Tests
```typescript
// cypress/e2e/accessibility.cy.ts
import { injectAxe, checkA11y } from 'cypress-axe';

describe('Accessibility Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    injectAxe();
  });

  it('has no accessibility violations on load', () => {
    checkA11y();
  });

  it('has no accessibility violations after login', () => {
    cy.get('[data-testid="email-input"]').type('manager@test.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    
    cy.url().should('include', '/dashboard');
    checkA11y();
  });

  it('navigates with keyboard', () => {
    cy.get('body').tab();
    cy.focused().should('have.attr', 'data-testid', 'email-input');
    
    cy.focused().tab();
    cy.focused().should('have.attr', 'data-testid', 'password-input');
    
    cy.focused().tab();
    cy.focused().should('have.attr', 'data-testid', 'login-button');
  });
});
```

### 9.2 Manual Accessibility Testing

#### Screen Reader Testing
```markdown
## Screen Reader Test Cases
- [ ] All images have alt text
- [ ] Form fields have proper labels
- [ ] Links describe their destination
- [ ] Tables have proper headers
- [ ] Dynamic content announcements
- [ ] Focus management works correctly
- [ ] Skip links available
- [ ] Heading structure logical
```

#### Keyboard Navigation Testing
```markdown
## Keyboard Navigation Test Cases
- [ ] Tab order logical and predictable
- [ ] All interactive elements reachable
- [ ] Focus indicators visible
- [ ] Modal focus trapped correctly
- [ ] Escape key closes modals
- [ ] Enter/Space activate controls
- [ ] Arrow keys navigate appropriately
- [ ] No keyboard traps
```

---

## 10. Test Cases

### 10.1 Functional Test Cases

#### Authentication Test Cases
| Test ID | Test Case | Priority | Pre-conditions | Steps | Expected Result |
|---------|-----------|-----------|----------------|--------|----------------|
| AUTH-001 | Valid login | Critical | User exists, valid credentials | 1. Enter valid email<br>2. Enter valid password<br>3. Click login | User authenticated, redirected to dashboard |
| AUTH-002 | Invalid email | Critical | User exists | 1. Enter invalid email<br>2. Enter valid password<br>3. Click login | Error message "Invalid credentials" |
| AUTH-003 | Invalid password | Critical | User exists | 1. Enter valid email<br>2. Enter invalid password<br>3. Click login | Error message "Invalid credentials" |
| AUTH-004 | Empty fields | Critical | - | 1. Click login with empty fields | Validation errors for both fields |
| AUTH-005 | Account locked | Critical | Account locked after 5 failed attempts | 1. Enter valid credentials<br>2. Click login | Error message "Account locked" |
| AUTH-006 | Password reset | High | User exists | 1. Click "Forgot password"<br>2. Enter email<br>3. Submit | Reset email sent |
| AUTH-007 | Logout | High | User logged in | 1. Click user menu<br>2. Click logout | Session cleared, redirected to login |

#### Governance Pulse Test Cases
| Test ID | Test Case | Priority | Pre-conditions | Steps | Expected Result |
|---------|-----------|-----------|----------------|--------|----------------|
| PULSE-001 | Monday pulse display | Critical | Monday, user authenticated | 1. Navigate to governance pulse | Monday form displayed |
| PULSE-002 | Wednesday pulse display | Critical | Wednesday, user authenticated | 1. Navigate to governance pulse | Wednesday form displayed |
| PULSE-003 | Friday pulse display | Critical | Friday, user authenticated | 1. Navigate to governance pulse | Friday form displayed |
| PULSE-004 | Form validation | Critical | Any day form displayed | 1. Submit form without required fields | Validation errors shown |
| PULSE-005 | Auto-save functionality | High | Form partially filled | 1. Fill some fields<br>2. Wait 2 minutes | Draft saved automatically |
| PULSE-006 | Form submission | Critical | Form fully filled | 1. Click submit button | Success message, data saved |
| PULSE-007 | Draft recovery | High | Existing draft | 1. Navigate to pulse form | Prompt to restore draft |
| PULSE-008 | House snapshot | High | Pulse form displayed | 1. Enter house data<br>2. Save | House data saved correctly |

#### Risk Management Test Cases
| Test ID | Test Case | Priority | Pre-conditions | Steps | Expected Result |
|---------|-----------|-----------|----------------|--------|----------------|
| RISK-001 | Add risk | Critical | User authenticated | 1. Click "Add Risk"<br>2. Fill form<br>3. Submit | Risk created successfully |
| RISK-002 | Edit risk | High | Risk exists | 1. Click edit on risk<br>2. Modify fields<br>3. Save | Risk updated successfully |
| RISK-003 | Delete risk | High | Risk exists | 1. Click delete on risk<br>2. Confirm deletion | Risk deleted successfully |
| RISK-004 | Filter risks | High | Multiple risks exist | 1. Select filter criteria<br>2. Apply filter | Filtered results displayed |
| RISK-005 | Search risks | High | Multiple risks exist | 1. Enter search term<br>2. Click search | Matching risks displayed |
| RISK-006 | Risk assessment | Critical | Risk form displayed | 1. Select likelihood<br>2. Select impact<br>3. Save | Risk score calculated |
| RISK-007 | Risk actions | High | Risk exists | 1. Add action<br>2. Assign to user<br>3. Set due date | Action created successfully |

#### Weekly Review Test Cases
| Test ID | Test Case | Priority | Pre-conditions | Steps | Expected Result |
|---------|-----------|-----------|----------------|--------|----------------|
| WEEKLY-001 | Auto-population | Critical | Daily pulses completed | 1. Navigate to weekly review | Data auto-populated from pulses |
| WEEKLY-002 | Risk register review | Critical | Active risks exist | 1. Review risk section<br>2. Update status | Risk status updated |
| WEEKLY-003 | Safeguarding activity | High | Safeguarding incidents | 1. Enter safeguarding data<br>2. Add details | Data saved correctly |
| WEEKLY-004 | Incident reflection | Critical | Incidents occurred | 1. Check incident types<br>2. Add details | Incident data recorded |
| WEEKLY-005 | Staffing assurance | High | Staffing data available | 1. Enter staffing hours<br>2. Calculate variance | Variance calculated |
| WEEKLY-006 | Learning actions | High | Actions identified | 1. Add action<br>2. Assign owner<br>3. Set due date | Action created |
| WEEKLY-007 | Digital signature | Critical | Review completed | 1. Enter signature<br>2. Confirm accuracy | Review locked |
| WEEKLY-008 | Edit unlocked review | High | Review unlocked | 1. Navigate to review<br>2. Modify sections | Changes saved |
| WEEKLY-009 | Prevent edit locked review | Critical | Review locked | 1. Navigate to locked review<br>2. Attempt edit | Edit prevented, message shown |

### 10.2 Performance Test Cases

| Test ID | Test Case | Priority | Expected Result |
|---------|-----------|-----------|-----------------|
| PERF-001 | Page load time | Critical | < 3 seconds for all pages |
| PERF-002 | API response time | Critical | < 500ms for 95% of requests |
| PERF-003 | Concurrent users | Critical | Support 100 concurrent users |
| PERF-004 | Database query time | High | < 200ms for all queries |
| PERF-005 | File upload time | High | < 10 seconds for 10MB file |
| PERF-006 | Report generation | High | < 30 seconds for monthly report |

### 10.3 Security Test Cases

| Test ID | Test Case | Priority | Expected Result |
|---------|-----------|-----------|-----------------|
| SEC-001 | SQL injection | Critical | No database errors, input rejected |
| SEC-002 | XSS prevention | Critical | No script execution, input sanitized |
| SEC-003 | CSRF protection | Critical | Invalid CSRF token rejected |
| SEC-004 | Authentication bypass | Critical | Unauthenticated access blocked |
| SEC-005 | Authorization bypass | Critical | Unauthorized access blocked |
| SEC-006 | Rate limiting | High | Excessive requests blocked |
| SEC-007 | Data encryption | High | Sensitive data encrypted at rest |
| SEC-008 | Secure headers | High | Security headers present |

### 10.4 Accessibility Test Cases

| Test ID | Test Case | Priority | Expected Result |
|---------|-----------|-----------|-----------------|
| A11Y-001 | Keyboard navigation | Critical | All functions accessible via keyboard |
| A11Y-002 | Screen reader support | Critical | Content readable by screen readers |
| A11Y-003 | Color contrast | Critical | WCAG AA contrast ratios met |
| A11Y-004 | Focus management | Critical | Focus visible and logical |
| A11Y-005 | Alt text | High | All images have descriptive alt text |
| A11Y-006 | Form labels | Critical | All form fields have labels |
| A11Y-007 | Heading structure | High | Logical heading hierarchy |
| A11Y-008 | Link descriptions | High | Links describe destination |

### 10.5 Error Handling Test Cases

| Test ID | Test Case | Priority | Expected Result |
|---------|-----------|-----------|-----------------|
| ERROR-001 | Network error | Critical | User-friendly error message |
| ERROR-002 | Server error | Critical | Error page with retry option |
| ERROR-003 | Validation error | Critical | Clear error messages |
| ERROR-004 | 404 error | High | Custom 404 page |
| ERROR-005 | Timeout error | High | Timeout message displayed |
| ERROR-006 | File upload error | High | Upload error message |
| ERROR-007 | Permission denied | Critical | Access denied message |

---

## Test Execution Plan

### Test Schedule
- **Week 13**: Unit and integration tests
- **Week 14**: End-to-end and performance tests
- **Week 15**: Security and accessibility tests
- **Week 16**: Regression tests and final validation

### Test Environment Rotation
- **Development**: Continuous testing during development
- **Staging**: Pre-production validation
- **Production**: Smoke tests after deployment

### Defect Management
- **Severity Levels**: Critical, High, Medium, Low
- **Priority Levels**: P1 (Immediate), P2 (24h), P3 (72h), P4 (1 week)
- **Resolution Targets**: Critical: 24h, High: 72h, Medium: 1 week, Low: 2 weeks

This Test Plan & Test Cases Document provides comprehensive coverage for ensuring the Ordin Core Governance SaaS Platform meets all quality, performance, security, and accessibility requirements.
