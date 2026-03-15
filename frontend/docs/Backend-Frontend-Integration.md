# CareSignal Backend-Frontend Integration Guide

This guide provides complete instructions for implementing and integrating the CareSignal backend with the frontend, including the computational engines system.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- MongoDB 5.0+
- pgAdmin 4 (for database setup)

### Installation Steps

1. **Database Setup**
   ```bash
   # Follow the database setup guide in backend/database/README.md
   # Execute the three SQL scripts in order:
   # 1. 01_create_database.sql
   # 2. 02_create_schema.sql  
   # 3. 03_populate_data.sql
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Update .env with your database credentials
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   # Update API endpoints if needed
   npm run dev
   ```

## 📁 Backend Implementation

### Core Components

#### 1. Server Configuration (`backend/src/server.ts`)
- **Express.js** server with middleware
- **CORS** configuration for frontend
- **Security** with Helmet and rate limiting
- **Database** connections (MongoDB + PostgreSQL)
- **Engine Scheduler** initialization
- **Graceful shutdown** handling

#### 2. Database Configuration
- **PostgreSQL**: `backend/src/config/postgresql.ts`
- **MongoDB**: `backend/src/config/database.ts`
- **Hybrid architecture**: Structured data in PostgreSQL, documents in MongoDB

#### 3. Computational Engines (`backend/src/engines/`)
- **Governance Pulse Engine**: Weekly check-in management
- **Escalation Trigger Engine**: Rule-based automation
- **Risk Timeline Builder**: Chronological risk history
- **Serious Incident Linkage Engine**: Incident-risk correlation
- **Governance Timeline Reconstruction Engine**: Regulatory support
- **Engine Scheduler**: Orchestration and monitoring

#### 4. API Routes
- **Authentication**: `/api/auth`
- **Users**: `/api/users`
- **Governance Pulse**: `/api/governance-pulse`
- **Dashboard**: `/api/dashboard`
- **Engines**: `/api/engines` (new)

### Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database Configuration
USE_POSTGRES=true
ENABLE_ENGINES=true

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=caresignal_db
DB_USER=caresignal_user
DB_PASSWORD=caresignal_password
DB_SSL=false
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/caresignal_mongo

# Security
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🎨 Frontend Integration

### API Service Layer

#### 1. Base API Client (`src/services/apiClient.ts`)
```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

#### 2. Engines API (`src/services/enginesApi.ts`)
- **Status monitoring**: Get engine health and status
- **Manual execution**: Force run engines
- **Configuration**: Enable/disable engines
- **Metrics**: Performance monitoring
- **History**: Execution tracking

### React Components

#### 1. Engine Dashboard (`src/components/EngineDashboard.tsx`)
- **Real-time monitoring**: Live engine status
- **Performance metrics**: Execution times and success rates
- **Manual controls**: Run/stop engines
- **Historical data**: Execution history and trends
- **Role-based access**: Director-only controls

#### 2. Integration Points
- **Dashboard integration**: Add EngineDashboard to main dashboard
- **Navigation**: Add engines menu item for directors
- **Real-time updates**: WebSocket integration for live updates
- **Error handling**: Toast notifications for engine operations

### Component Integration

```typescript
// App.tsx - Add Engine Dashboard route
import EngineDashboard from './components/EngineDashboard';

// In your routing setup:
{user?.role === 'director' && (
  <Route path="/engines" element={<EngineDashboard />} />
)}

// Dashboard component - Add engines overview
import { enginesApi } from './services/enginesApi';

const DashboardOverview = () => {
  const [engineStatus, setEngineStatus] = useState(null);
  
  useEffect(() => {
    enginesApi.getStatus().then(setEngineStatus);
  }, []);
  
  return (
    // Include engine status cards in dashboard
  );
};
```

## 🔧 API Endpoints

### Engine Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/engines/status` | Get scheduler status | All authenticated |
| GET | `/api/engines/health` | Get system health | All authenticated |
| GET | `/api/engines/history` | Get execution history | All authenticated |
| GET | `/api/engines/metrics/:engine` | Get engine metrics | All authenticated |
| POST | `/api/engines/run/:engine` | Force run engine | Director only |
| PUT | `/api/engines/schedule/:engine` | Update schedule | Director only |
| POST | `/api/engines/toggle/:engine` | Enable/disable engine | Director only |
| GET | `/api/engines/results/:engine` | Get engine results | All authenticated |
| GET | `/api/engines/dashboard` | Get dashboard data | All authenticated |

### Data Integration

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/governance-pulse/status` | Get pulse compliance | Role-based |
| POST | `/api/governance-pulse` | Submit pulse | Manager only |
| GET | `/api/dashboard/:role` | Get dashboard data | Role-based |
| GET | `/api/risks/timeline/:id` | Get risk timeline | Role-based |

## 🔄 Real-time Features

### WebSocket Integration

```typescript
// Backend - Socket.IO setup
io.on('connection', (socket) => {
  socket.on('join-house', (houseId) => {
    socket.join(`house-${houseId}`);
  });
  
  socket.on('join-role', (role) => {
    socket.join(`role-${role}`);
  });
});

// Frontend - WebSocket client
import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL);

socket.on('engine-update', (data) => {
  // Update engine status in real-time
});

socket.on('pulse-alert', (data) => {
  // Show pulse compliance alerts
});
```

### Real-time Events

- **Engine Status Updates**: When engines start/stop/complete
- **Pulse Compliance**: Missed or overdue pulses
- **Escalation Alerts**: New escalations triggered
- **Risk Updates**: Risk status changes
- **Dashboard Updates**: Real-time metric updates

## 🛡️ Security & Authentication

### Role-Based Access Control

| Role | Access Level | Features |
|------|-------------|----------|
| Registered Manager | Single house | Submit pulses, view house data |
| Responsible Individual | Cross-site | View all houses, review escalations |
| Director | Full access | Engine controls, system configuration |

### API Security

- **JWT Authentication**: All API endpoints protected
- **Role Validation**: Middleware for role-based access
- **Rate Limiting**: Prevent API abuse
- **CORS**: Cross-origin request protection
- **Input Validation**: Request data validation

## 📊 Monitoring & Logging

### Backend Monitoring

```typescript
// Engine execution logging
logger.info(`Engine ${engineName} completed`, {
  duration: result.duration,
  success: result.success,
  recordsProcessed: result.result?.processed
});

// Error handling
logger.error(`Engine ${engineName} failed`, {
  error: result.error,
  executionId: executionId
});
```

### Frontend Monitoring

- **Error Boundaries**: Catch and display errors
- **Performance Metrics**: Track API response times
- **User Analytics**: Monitor feature usage
- **Toast Notifications**: User feedback for actions

## 🧪 Testing Integration

### Backend Tests

```bash
# Run engine tests
npm test -- engines

# Run integration tests
npm test -- integration

# Run API tests
npm test -- api
```

### Frontend Tests

```bash
# Run component tests
npm test EngineDashboard

# Run API integration tests
npm test -- integration

# Run E2E tests
npm run test:e2e
```

## 🚀 Deployment

### Development Environment

```bash
# Backend
cd backend && npm run dev

# Frontend  
cd frontend && npm run dev

# Database
# Ensure PostgreSQL and MongoDB are running
```

### Production Environment

```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build

# Database
# Run database migrations and setup scripts
```

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify PostgreSQL and MongoDB are running
   - Check connection strings in .env
   - Ensure database user has correct permissions

2. **Engine Failures**
   - Check engine logs for specific errors
   - Verify database schemas are created
   - Ensure all dependencies are installed

3. **Frontend API Errors**
   - Verify API URL configuration
   - Check authentication tokens
   - Ensure CORS is properly configured

4. **Real-time Updates Not Working**
   - Verify WebSocket connection
   - Check Socket.IO configuration
   - Ensure client joins correct rooms

### Debug Tools

- **Backend Logs**: Winston logger output
- **Database Queries**: PostgreSQL and MongoDB logs
- **API Testing**: Postman collections or Swagger UI
- **Frontend DevTools**: React DevTools, Network tab

## 📚 Additional Resources

- [API Documentation](../docs/API-Documentation.md)
- [Computational Engines](../docs/Computational-Engines.md)
- [Database Setup](../backend/database/README.md)
- [Frontend Components](../src/components/README.md)

## 🤝 Support

For integration issues:

1. Check the troubleshooting section above
2. Review the API documentation
3. Check the GitHub issues for known problems
4. Contact the development team with specific error details

The integration is now complete with full backend-frontend connectivity, real-time features, and comprehensive monitoring capabilities!
