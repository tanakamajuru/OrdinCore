import { request, APIRequestContext, Page } from '@playwright/test';

export interface AuthTokens {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Authenticate as a user and return JWT token and user info
 */
export async function authenticateAs(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<AuthTokens> {
  const response = await request.post(`${process.env.API_URL}/auth/login`, {
    data: { email, password },
  });

  if (response.status() !== 200) {
    throw new Error(`Authentication failed for ${email}: ${response.status()}`);
  }

  const result = await response.json();
  return {
    token: result.data.token,
    user: result.data.user
  };
}

/**
 * Login via UI and store authentication in browser context
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto(`${process.env.BASE_URL}/login`);
  
  // Fill login form
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL(`${process.env.BASE_URL}/dashboard`);
  
  // Wait for dashboard to load
  await page.waitForSelector('[data-testid="dashboard"], main, .dashboard');
}

/**
 * Pre-configured authentication for test users
 */
export class TestUsers {
  static async teamLeader(request: APIRequestContext): Promise<AuthTokens> {
    return await authenticateAs(
      request,
      process.env.TEST_USER_TL_EMAIL!,
      process.env.TEST_USER_TL_PASSWORD!
    );
  }

  static async registeredManager(request: APIRequestContext): Promise<AuthTokens> {
    return await authenticateAs(
      request,
      process.env.TEST_USER_RM_EMAIL!,
      process.env.TEST_USER_RM_PASSWORD!
    );
  }

  static async responsibleIndividual(request: APIRequestContext): Promise<AuthTokens> {
    return await authenticateAs(
      request,
      process.env.TEST_USER_RI_EMAIL!,
      process.env.TEST_USER_RI_PASSWORD!
    );
  }

  static async director(request: APIRequestContext): Promise<AuthTokens> {
    return await authenticateAs(
      request,
      process.env.TEST_USER_DIRECTOR_EMAIL!,
      process.env.TEST_USER_DIRECTOR_PASSWORD!
    );
  }

  static async admin(request: APIRequestContext): Promise<AuthTokens> {
    return await authenticateAs(
      request,
      process.env.TEST_USER_ADMIN_EMAIL!,
      process.env.TEST_USER_ADMIN_PASSWORD!
    );
  }
}

/**
 * UI login helpers for test users
 */
export class UITestUsers {
  static async teamLeader(page: Page): Promise<void> {
    await loginViaUI(
      page,
      process.env.TEST_USER_TL_EMAIL!,
      process.env.TEST_USER_TL_PASSWORD!
    );
  }

  static async registeredManager(page: Page): Promise<void> {
    await loginViaUI(
      page,
      process.env.TEST_USER_RM_EMAIL!,
      process.env.TEST_USER_RM_PASSWORD!
    );
  }

  static async responsibleIndividual(page: Page): Promise<void> {
    await loginViaUI(
      page,
      process.env.TEST_USER_RI_EMAIL!,
      process.env.TEST_USER_RI_PASSWORD!
    );
  }

  static async director(page: Page): Promise<void> {
    await loginViaUI(
      page,
      process.env.TEST_USER_DIRECTOR_EMAIL!,
      process.env.TEST_USER_DIRECTOR_PASSWORD!
    );
  }

  static async admin(page: Page): Promise<void> {
    await loginViaUI(
      page,
      process.env.TEST_USER_ADMIN_EMAIL!,
      process.env.TEST_USER_ADMIN_PASSWORD!
    );
  }
}

/**
 * Create authenticated API request context with default headers
 */
export function createAuthenticatedRequest(
  request: APIRequestContext,
  token: string
): APIRequestContext {
  return {
    ...request,
    defaults: {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  } as APIRequestContext;
}
