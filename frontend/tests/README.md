# Ordin Core Playwright Testing Suite

Comprehensive end-to-end testing for the Ordin Core governance platform, covering the complete **Signal → Pattern → Risk → Action → Effectiveness → Oversight** closed-loop flow across all roles.

## 🎯 Testing Philosophy

This test suite validates the **entire governance doctrine** of Ordin Core:
- **Team Leader** signal capture and daily pulse submission
- **Registered Manager** oversight, triage, and risk management  
- **Responsible Individual** statutory compliance and incident review
- **Director** strategic oversight and control failure intervention
- **End-to-end closed-loop** verification of governance effectiveness

## 🚀 Quick Start

### Prerequisites
- Node.js installed
- Backend server running on port 3000
- Frontend dev server on port 5173 (auto-started by Playwright)
- PostgreSQL test database accessible
- Redis for BullMQ (if using background jobs)

### Environment Setup
```bash
# Copy test environment configuration
cp .env.test .env.local

# Seed test data
cd ../backend && NODE_ENV=test npx ts-node seeds/seedTestData.ts

# Install dependencies
pnpm install
```

### Running Tests

```bash
# Run all E2E tests (Chrome only)
npm run test:e2e

# Run with visual UI mode
npm run test:e2e:ui

# Run all browsers
npm run test:e2e:all

# Run specific role tests
npm run test:team-leader
npm run test:registered-manager
npm run test:responsible-individual
npm run test:director

# Run API tests only
npm run test:api

# Run closed-loop test (most important)
npm run test:closed-loop

# Debug with browser dev tools
npm run test:debug

# View HTML report
npm run test:report
```

## 📁 Test Structure

```
tests/
├── auth.setup.ts              # Authentication helpers
├── fixtures/
│   └── testData.ts            # Test data fixtures and generators
├── 01-team-leader.spec.ts     # TL daily pulse and signal management
├── 02-registered-manager.spec.ts # RM oversight and risk management
├── 03-responsible-individual.spec.ts # RI statutory compliance
├── 04-director.spec.ts        # Director strategic oversight
├── 05-closed-loop.spec.ts     # Complete governance flow validation
├── ui.spec.ts                 # Basic UI tests
├── api.spec.ts                # Basic API tests
└── api/
    ├── pulse-api.spec.ts      # Signal management API tests
    ├── risk-api.spec.ts       # Risk management API tests
    └── pattern-api.spec.ts    # Pattern detection API tests
```

## 🔧 Configuration

### Environment Variables (.env.test)
```env
BASE_URL=http://localhost:5173
API_URL=http://localhost:3000/api/v1

# Test Users
TEST_USER_TL_EMAIL=taylor.rose@ordincore.com
TEST_USER_RM_EMAIL=sam.rivers@ordincore.com
TEST_USER_RI_EMAIL=chris@ordincore.com
TEST_USER_DIRECTOR_EMAIL=pat@ordincore.com

# Test Services
TEST_SERVICE_ROSE_HOUSE=11111111-2222-3333-4444-555555555555
TEST_COMPANY_ID=11111111-1111-1111-1111-111111111111

# Test Settings
NODE_ENV=test
PATTERN_ENGINE_INTERVAL_MS=1000
ACTION_EFFECTIVENESS_MIN_HOURS=2
```

### Playwright Config (playwright.config.ts)
- **Browsers**: Chrome, Firefox, Safari
- **Auto-start**: Frontend dev server
- **Timeouts**: Optimized for test environment
- **Retries**: CI only
- **Reporting**: HTML reports with traces

## 🎭 Role-Based Testing

### Team Leader Tests (01-team-leader.spec.ts)
- ✅ Daily pulse form submission (12-field sequence)
- ✅ Signal validation and error handling
- ✅ Signal editing and history
- ✅ Action assignment and completion
- ✅ Pattern alerts visibility
- ✅ Session management

### Registered Manager Tests (02-registered-manager.spec.ts)
- ✅ Daily oversight board triage
- ✅ High-priority signal review
- ✅ Risk register management
- ✅ Pattern promotion to risks
- ✅ Action creation and tracking
- ✅ Effectiveness rating
- ✅ Incident escalation
- ✅ Staff oversight
- ✅ Analytics and reporting

### Responsible Individual Tests (03-responsible-individual.spec.ts)
- ✅ Critical incident acknowledgment
- ✅ Safeguarding referral review
- ✅ Compliance monitoring
- ✅ Risk assessment approval
- ✅ Statutory audit conduction
- ✅ Regulatory communications
- ✅ Emergency protocols
- ✅ Performance metrics review

### Director Tests (04-director.spec.ts)
- ✅ Control failure identification
- ✅ Intervention creation
- ✅ Company metrics monitoring
- ✅ Strategic initiative approval
- ✅ Regulatory relationships
- ✅ Board-level reporting
- ✅ Risk governance oversight
- ✅ Financial governance
- ✅ Stakeholder management

## 🔄 Closed-Loop Testing (05-closed-loop.spec.ts)

The most critical test validates the complete governance flow:

1. **Signal Generation**: TL submits 3 behavioural signals
2. **Pattern Detection**: System identifies emerging patterns
3. **Risk Promotion**: RM promotes pattern to formal risk
4. **Action Management**: RM creates action, TL completes it
5. **Effectiveness Rating**: RM rates action effectiveness
6. **Incident Response**: RI acknowledges critical incident
7. **Director Intervention**: Director addresses control failures
8. **Cross-Role Verification**: Data consistency across roles
9. **KPI Tracking**: Performance metrics validation
10. **Audit Trail**: Complete audit verification
11. **Regulatory Compliance**: Statutory requirement validation

## 🧪 API Testing

### Pulse API (api/pulse-api.spec.ts)
- ✅ Signal CRUD operations
- ✅ Validation and error handling
- ✅ Authorization testing
- ✅ Batch operations
- ✅ Search and filtering
- ✅ Export functionality
- ✅ Statistics and analytics

### Risk API (api/risk-api.spec.ts)
- ✅ Risk lifecycle management
- ✅ Signal linking
- ✅ Approval workflows
- ✅ Search and export
- ✅ Director oversight
- ✅ Closure and reopening

### Pattern API (api/pattern-api.spec.ts)
- ✅ Pattern detection triggers
- ✅ Cluster management
- ✅ Risk promotion
- ✅ Escalation workflows
- ✅ Trend analysis
- ✅ Batch analysis

## 📊 Test Data Management

### Fixtures (fixtures/testData.ts)
- **User Credentials**: Pre-configured test users for each role
- **Service Data**: Test services (Rose House, Lake View)
- **Sample Signals**: Behaviour, medication, safeguarding scenarios
- **Sample Actions**: Common action templates
- **Sample Risks**: Risk assessment examples
- **Data Generators**: Dynamic test data creation

### Database Seeding (backend/seeds/seedTestData.ts)
- Creates test company and services
- Sets up role-based user accounts
- Generates initial signal patterns
- Configures test environment

## 🎯 Best Practices

### Test Design
1. **Role-Based Testing**: Each role has dedicated test file
2. **Data-Driven Tests**: Use fixtures for consistent test data
3. **Error Scenarios**: Test both success and failure paths
4. **Cross-Role Validation**: Verify data consistency
5. **Closed Loop**: Test complete governance flows

### Element Selection
```typescript
// Use data-testid attributes for reliability
await page.click('[data-testid="daily-pulse-button"]');
await page.fill('[data-testid="signal-description"], textarea[name="description"]');

// Fallback to semantic selectors
await page.click('button:has-text("Submit")');
await expect(page.locator('h1')).toContainText('Dashboard');
```

### Authentication
```typescript
// Use helper functions for consistent auth
const token = await TestUsers.teamLeader(request);
await UITestUsers.registeredManager(page);
```

### Error Handling
```typescript
// Graceful handling of missing test data
if (await signalRows.isVisible()) {
  // Test with existing data
} else {
  // Skip or create test data
}
```

## 🔍 Debugging & Troubleshooting

### Common Issues
1. **Database Connection**: Ensure test database is accessible
2. **Environment Variables**: Check .env.test configuration
3. **API Endpoints**: Verify backend routes match test expectations
4. **Time Delays**: Adjust wait times for background jobs
5. **Authentication**: Confirm test users exist in database

### Debug Tools
```bash
# Run with UI mode for visual debugging
npm run test:ui

# Debug specific test
npm run test:debug -- tests/05-closed-loop.spec.ts

# Generate detailed traces
npx playwright test --trace on

# Run with slow motion for observation
npx playwright test --headed --slowmo=1000
```

### Test Reports
- **HTML Report**: `playwright-report/index.html`
- **Screenshots**: Auto-captured on failure
- **Videos**: Recorded for headed test runs
- **Traces**: Detailed interaction logs
- **Coverage**: API endpoint coverage statistics

## 🚀 CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: npm run pretest:e2e
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Docker Integration
```dockerfile
FROM mcr.microsoft.com/playwright:v1.44.0-focal
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx playwright install --with-deps
CMD ["npm", "run", "test:e2e"]
```

## � Performance Considerations

### Test Optimization
- **Parallel Execution**: Enabled by default
- **Resource Sharing**: Reuse authentication tokens
- **Selective Testing**: Run specific suites when needed
- **Background Jobs**: Reduced intervals for testing
- **Database Cleanup**: Efficient test data management

### Monitoring
- **Test Duration**: Track execution times
- **Flakiness Detection**: Retry failed tests
- **Resource Usage**: Monitor memory/CPU consumption
- **Network Latency**: Optimize API call timing

## �️ Security Testing

### Authorization Testing
- ✅ Role-based access control
- ✅ API endpoint protection
- ✅ Cross-role data isolation
- ✅ Session management
- ✅ Token validation

### Data Protection
- ✅ Test data isolation
- ✅ PII handling in tests
- ✅ Secure credential storage
- ✅ Audit trail validation

## 📋 Maintenance

### Regular Tasks
1. **Update Test Data**: Refresh fixtures with new scenarios
2. **Review Test Coverage**: Add missing edge cases
3. **Optimize Performance**: Improve test execution speed
4. **Update Documentation**: Keep README current
5. **Monitor Flakiness**: Address unstable tests

### Test Evolution
- **New Features**: Add tests for new functionality
- **Bug Fixes**: Create regression tests
- **API Changes**: Update endpoint tests
- **UI Updates**: Modify selector strategies
- **Role Changes**: Adjust permission testing

## 🎉 Success Metrics

A healthy test suite should achieve:
- **Coverage**: >90% of critical user journeys
- **Reliability**: <5% flaky test rate
- **Performance**: <10 minutes full suite execution
- **Maintainability**: Clear test structure and documentation
- **CI Integration**: Automated testing on all PRs

This comprehensive testing suite ensures Ordin Core maintains its governance integrity and provides confidence in the closed-loop system's reliability and compliance.
