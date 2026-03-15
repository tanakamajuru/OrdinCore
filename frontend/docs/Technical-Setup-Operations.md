# Technical Setup & Operations Document
# CareSignal Governance SaaS Platform

## Document Information

| **Document Version** | 1.0 |
|---------------------|------|
| **Date** | January 15, 2024 |
| **Author** | Tanaka Majuru |
| **Approved By** | DevOps Lead |
| **Status** | Final |

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [Development Environment](#2-development-environment)
3. [Version Control & Branching Strategy](#3-version-control--branching-strategy)
4. [CI/CD Pipeline](#4-cicd-pipeline)
5. [Infrastructure Setup](#5-infrastructure-setup)
6. [Third-Party Integrations](#6-third-party-integrations)
7. [Monitoring & Logging](#7-monitoring--logging)
8. [Security Configuration](#8-security-configuration)
9. [Backup & Disaster Recovery](#9-backup--disaster-recovery)

---

## 1. Environment Setup

### 1.1 Prerequisites

#### System Requirements
- **Operating System**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **Node.js**: Version 18.0.0 or higher
- **Package Manager**: pnpm 8.0.0+ (recommended) or npm 9.0.0+
- **Git**: Version 2.30.0 or higher
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

#### Development Tools
- **IDE**: Visual Studio Code (recommended)
- **Extensions**: 
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint
  - GitLens
  - Thunder Client (for API testing)

#### Database Requirements
- **PostgreSQL**: Version 14.0 or higher
- **Redis**: Version 6.0 or higher (for caching)
- **pgAdmin**: Version 4.0 or higher (database management)

### 1.2 Local Development Setup

#### Step 1: Repository Setup
```bash
# Clone the repository
git clone https://github.com/caresignal/governance-saas.git
cd governance-saas

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Configure environment variables
# Edit .env.local with your local settings
```

#### Step 2: Environment Configuration
```bash
# .env.local configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_APP_NAME=CareSignal Governance
VITE_APP_VERSION=1.0.0
VITE_ENABLE_MOCK_API=true
VITE_LOG_LEVEL=debug
```

#### Step 3: Database Setup
```bash
# Start PostgreSQL service
brew services start postgresql  # macOS
# or
sudo systemctl start postgresql  # Linux

# Create database
createdb caresignal_dev

# Run migrations
pnpm run db:migrate

# Seed database (optional)
pnpm run db:seed
```

#### Step 4: Development Server
```bash
# Start frontend development server
pnpm dev

# Start backend server (in separate terminal)
cd backend
pnpm dev
```

### 1.3 Environment Variables

#### Frontend Environment Variables
```bash
# Application Configuration
VITE_APP_NAME=CareSignal Governance
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=Governance SaaS Platform

# API Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_API_TIMEOUT=30000
VITE_API_RETRY_ATTEMPTS=3

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG_MODE=false
VITE_ENABLE_MOCK_API=false

# Authentication
VITE_AUTH_TOKEN_KEY=caresignal_token
VITE_AUTH_REFRESH_TOKEN_KEY=caresignal_refresh_token

# External Services
VITE_SENTRY_DSN=your_sentry_dsn
VITE_GOOGLE_ANALYTICS_ID=your_ga_id
```

#### Backend Environment Variables
```bash
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/caresignal_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# File Storage
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=caresignal-uploads
```

---

## 2. Development Environment

### 2.1 Project Structure

```
governance-saas/
├── docs/                          # Documentation
│   ├── SRS.md
│   ├── HLD.md
│   ├── LLD.md
│   ├── API-Specification.md
│   └── Database-Schema.md
├── src/
│   ├── app/
│   │   ├── components/             # React components
│   │   │   ├── ui/              # Reusable UI components
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── ...
│   │   ├── hooks/                # Custom React hooks
│   │   ├── services/             # API services
│   │   ├── utils/                # Utility functions
│   │   └── types/                # TypeScript types
│   ├── styles/                   # Global styles
│   └── main.tsx                 # Application entry point
├── backend/
│   ├── src/
│   │   ├── controllers/          # API controllers
│   │   ├── models/               # Database models
│   │   ├── routes/               # API routes
│   │   ├── middleware/           # Express middleware
│   │   ├── services/             # Business logic
│   │   └── utils/                # Utility functions
│   ├── migrations/               # Database migrations
│   └── seeds/                   # Database seeds
├── tests/                        # Test files
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── e2e/                     # End-to-end tests
├── scripts/                      # Build and deployment scripts
├── .github/                      # GitHub workflows
├── docker-compose.yml             # Docker configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 2.2 Development Scripts

#### Package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "db:migrate": "pnpm run --filter backend db:migrate",
    "db:seed": "pnpm run --filter backend db:seed",
    "db:reset": "pnpm run --filter backend db:reset"
  }
}
```

### 2.3 Code Quality Tools

#### ESLint Configuration
```javascript
// .eslintrc.js
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': 'error',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
  },
}
```

#### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

---

## 3. Version Control & Branching Strategy

### 3.1 Git Workflow

#### Branch Naming Conventions
- **Main Branch**: `main` (production-ready code)
- **Development Branch**: `develop` (integration branch)
- **Feature Branches**: `feature/feature-name`
- **Bugfix Branches**: `bugfix/bug-description`
- **Hotfix Branches**: `hotfix/urgent-fix`
- **Release Branches**: `release/v1.0.0`

#### Branch Protection Rules
```yaml
# .github/branch-protection.yml
main:
  required_reviews: 2
  dismiss_stale_reviews: true
  require_code_owner_reviews: true
  required_status_checks:
    - build-and-test
    - lint-check
    - security-scan
  enforce_admins: true

develop:
  required_reviews: 1
  required_status_checks:
    - build-and-test
    - lint-check
```

### 3.2 Commit Message Standards

#### Conventional Commits
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

#### Examples
```
feat(auth): add password reset functionality

- Add password reset endpoint
- Implement email verification
- Update UI with reset form

Closes #123

fix(risk): resolve risk status update bug

Risk status was not updating correctly in the database
due to missing transaction handling.

chore(deps): update react to v18.2.0
```

### 3.3 Pull Request Process

#### PR Template
```markdown
## Description
Brief description of changes and purpose.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Cross-browser testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Accessibility tested
- [ ] Security considerations addressed

## Screenshots
(if applicable)

## Related Issues
Closes #issue_number
```

#### Review Process
1. **Create PR**: From feature branch to `develop`
2. **Automated Checks**: CI/CD pipeline runs
3. **Code Review**: At least 2 reviewers required
4. **Testing**: Manual testing by reviewer
5. **Approval**: Merge after approval and checks pass
6. **Cleanup**: Delete feature branch after merge

---

## 4. CI/CD Pipeline

### 4.1 GitHub Actions Workflow

#### Main Workflow File
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run linting
        run: pnpm run lint

      - name: Run type checking
        run: pnpm run type-check

      - name: Run unit tests
        run: pnpm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run security audit
        run: pnpm audit --audit-level moderate

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  build:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build application
        run: pnpm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: dist/

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-files
          path: dist/

      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment"
          # Add deployment commands here

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-files
          path: dist/

      - name: Deploy to production
        run: |
          echo "Deploying to production environment"
          # Add deployment commands here
```

### 4.2 Environment Configuration

#### Staging Environment
```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  workflow_run:
    workflows: ["CI/CD Pipeline"]
    types:
      - completed
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          # Deployment script for staging
```

#### Production Environment
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  workflow_run:
    workflows: ["CI/CD Pipeline"]
    types:
      - completed
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        run: |
          # Deployment script for production
```

---

## 5. Infrastructure Setup

### 5.1 Cloud Infrastructure

#### AWS Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    CloudFront CDN                        │
├─────────────────────────────────────────────────────────────┤
│                Application Load Balancer                   │
├─────────────────────────────────────────────────────────────┤
│  Auto Scaling Group (EC2 Instances)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   App 1     │  │   App 2     │  │   App 3     │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                RDS PostgreSQL (Multi-AZ)                 │
├─────────────────────────────────────────────────────────────┤
│                    ElastiCache Redis                     │
├─────────────────────────────────────────────────────────────┤
│                    S3 File Storage                       │
└─────────────────────────────────────────────────────────────┘
```

#### Infrastructure as Code (Terraform)
```hcl
# infrastructure/main.tf
provider "aws" {
  region = var.aws_region
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "caresignal-vpc"
  }
}

# Subnets
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "caresignal-public-${count.index + 1}"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "caresignal-private-${count.index + 1}"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier     = "caresignal-db"
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type        = "gp2"
  storage_encrypted   = true
  
  db_name  = "caresignal"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "caresignal-final-snapshot"
  
  tags = {
    Name = "caresignal-postgres"
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "caresignal-cache-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "caresignal-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis6.x"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  
  tags = {
    Name = "caresignal-redis"
  }
}
```

### 5.2 Docker Configuration

#### Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm run build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - VITE_API_BASE_URL=http://backend:3001
    networks:
      - caresignal-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/caresignal
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    networks:
      - caresignal-network

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=caresignal
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - caresignal-network

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data
    networks:
      - caresignal-network

volumes:
  postgres_data:
  redis_data:

networks:
  caresignal-network:
    driver: bridge
```

---

## 6. Third-Party Integrations

### 6.1 Email Service Integration

#### SendGrid Configuration
```javascript
// services/emailService.js
const sendgrid = require('@sendgrid/mail');
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {
  async sendEmail(to, subject, html, text) {
    const msg = {
      to,
      from: process.env.FROM_EMAIL,
      subject,
      html,
      text,
    };

    try {
      await sendgrid.send(msg);
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendPasswordReset(email, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset - CareSignal';
    const html = `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
    `;

    return this.sendEmail(email, subject, html);
  }

  async sendEscalationNotification(escalation) {
    const subject = `New Escalation: ${escalation.type}`;
    const html = `
      <h2>New Escalation Alert</h2>
      <p><strong>Type:</strong> ${escalation.type}</p>
      <p><strong>Description:</strong> ${escalation.description}</p>
      <p><strong>Urgency:</strong> ${escalation.urgency}</p>
      <a href="${process.env.FRONTEND_URL}/escalations/${escalation.id}">View Escalation</a>
    `;

    return this.sendEmail(escalation.escalated_to, subject, html);
  }
}

module.exports = new EmailService();
```

### 6.2 File Storage Integration

#### AWS S3 Configuration
```javascript
// services/fileService.js
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

class FileService {
  async uploadFile(file, folder = 'uploads') {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private',
    };

    try {
      const result = await s3.upload(params).promise();
      return {
        url: result.Location,
        key: result.Key,
        etag: result.ETag,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async getSignedUrl(key, expiresIn = 3600) {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Expires: expiresIn,
    };

    return s3.getSignedUrl('getObject', params);
  }

  async deleteFile(key) {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    };

    try {
      await s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
}

module.exports = new FileService();
```

### 6.3 Monitoring Integration

#### Sentry Configuration
```javascript
// services/sentryService.js
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  integrations: [new BrowserTracing()],
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});

export const captureException = (error, context) => {
  Sentry.captureException(error, {
    contexts: context,
  });
};

export const captureMessage = (message, level = 'info') => {
  Sentry.captureMessage(message, level);
};
```

---

## 7. Monitoring & Logging

### 7.1 Application Monitoring

#### Health Check Endpoint
```javascript
// routes/health.js
const express = require('express');
const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = await checkDatabase();
    
    // Check Redis connection
    const redisStatus = await checkRedis();
    
    // Check external services
    const emailStatus = await checkEmailService();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
        email: emailStatus,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    const isHealthy = Object.values(health.services).every(
      service => service.status === 'healthy'
    );

    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

async function checkDatabase() {
  try {
    await db.query('SELECT 1');
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkRedis() {
  try {
    await redis.ping();
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkEmailService() {
  try {
    // Test email service connectivity
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

module.exports = router;
```

### 7.2 Logging Configuration

#### Winston Logger Setup
```javascript
// utils/logger.js
const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'caresignal-api' },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write error logs to error.log
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

module.exports = logger;
```

### 7.3 Performance Monitoring

#### New Relic Integration
```javascript
// newrelic.js
require('newrelic');

const newrelic = require('newrelic');

// Custom metrics
newrelic.setTransactionName('CareSignal API');

// Error tracking
newrelic.noticeError = function(error, customAttributes) {
  newrelic.recordMetric('Custom/ErrorCount', 1);
  newrelic.addCustomAttribute('errorType', error.name);
  newrelic.addCustomAttribute('errorMessage', error.message);
};

// Performance metrics
newrelic.recordMetric = function(name, value) {
  newrelic.recordMetric(`Custom/${name}`, value);
};
```

---

## 8. Security Configuration

### 8.1 Security Headers

#### Helmet Configuration
```javascript
// middleware/security.js
const helmet = require('helmet');

const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.sendgrid.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
});

module.exports = securityMiddleware;
```

### 8.2 Rate Limiting

#### Express Rate Limiter
```javascript
// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different limits for different endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many login attempts, please try again later'
);

const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many requests from this IP, please try again later'
);

const uploadLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // 10 uploads
  'Too many upload attempts, please try again later'
);

module.exports = {
  authLimiter,
  apiLimiter,
  uploadLimiter,
};
```

### 8.3 Input Validation

#### Joi Validation Schema
```javascript
// validation/schemas.js
const Joi = require('joi');

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  name: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid('admin', 'manager', 'user').required(),
});

const riskSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  category: Joi.string().valid('Clinical', 'Operational', 'Financial', 'Regulatory', 'Staffing').required(),
  likelihood: Joi.string().valid('Low', 'Medium', 'High').required(),
  impact: Joi.string().valid('Low', 'Medium', 'High').required(),
  assignedTo: Joi.string().uuid().required(),
});

const pulseSchema = Joi.object({
  date: Joi.date().required(),
  dayType: Joi.string().valid('monday', 'wednesday', 'friday').required(),
  data: Joi.object().required(),
});

module.exports = {
  userSchema,
  riskSchema,
  pulseSchema,
};
```

---

## 9. Backup & Disaster Recovery

### 9.1 Database Backup Strategy

#### Automated Backup Script
```bash
#!/bin/bash
# scripts/backup-database.sh

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="caresignal"
DB_USER="postgres"
BACKUP_DIR="/backups/database"
S3_BUCKET="caresignal-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="caresignal_backup_${DATE}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_DIR/${BACKUP_FILE}.gz" "s3://$S3_BUCKET/database/"

# Clean up local files older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# Log backup
echo "$(date): Database backup completed - $BACKUP_FILE.gz" >> /var/log/caresignal-backup.log
```

#### Backup Schedule (Cron)
```bash
# crontab -e
# Daily database backup at 2 AM
0 2 * * * /path/to/scripts/backup-database.sh

# Weekly full backup on Sunday at 3 AM
0 3 * * 0 /path/to/scripts/full-backup.sh

# Monthly backup verification on 1st at 4 AM
0 4 1 * * /path/to/scripts/verify-backups.sh
```

### 9.2 Disaster Recovery Plan

#### Recovery Procedures
```bash
#!/bin/bash
# scripts/disaster-recovery.sh

echo "Starting disaster recovery process..."

# Step 1: Assess damage
echo "Assessing system damage..."
# Check service status
# Identify affected components

# Step 2: Restore database
echo "Restoring database from backup..."
LATEST_BACKUP=$(aws s3 ls s3://caresignal-backups/database/ --recursive | sort | tail -n 1 | awk '{print $4}')
aws s3 cp "s3://caresignal-backups/database/$LATEST_BACKUP" /tmp/
gunzip "/tmp/$LATEST_BACKUP"
psql -h localhost -U postgres -d caresignal < "/tmp/${LATEST_BACKUP%.gz}"

# Step 3: Restore application
echo "Restoring application..."
# Deploy latest stable version
# Restore configuration
# Restart services

# Step 4: Verify recovery
echo "Verifying recovery..."
# Run health checks
# Test critical functionality
# Verify data integrity

# Step 5: Notify stakeholders
echo "Notifying stakeholders..."
# Send recovery notification
# Update status dashboard

echo "Disaster recovery completed"
```

### 9.3 Monitoring and Alerting

#### CloudWatch Alarms
```yaml
# cloudwatch-alarms.yml
Resources:
  HighCPUAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: "High CPU Utilization"
      AlarmDescription: "CPU utilization is above 80%"
      MetricName: CPUUtilization
      Namespace: AWS/EC2
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref SNSTopicArn

  DatabaseConnectionsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: "High Database Connections"
      AlarmDescription: "Database connections are above threshold"
      MetricName: DatabaseConnections
      Namespace: AWS/RDS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref SNSTopicArn
```

This Technical Setup & Operations Document provides comprehensive guidance for establishing and maintaining the CareSignal Governance SaaS Platform infrastructure and development environment.
