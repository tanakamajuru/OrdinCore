# OrdinCore Frontend

This is the frontend component of the OrdinCore Governance SaaS Platform.

### **Step 1: Install Frontend Dependencies**

```bash
# Navigate to frontend directory
cd "c:\Users\tanaka.majuru\Downloads\SAAS DOCS\Governance SaaS Application"

# Install all dependencies including the new axios package
npm install
```

Or if you prefer pnpm:
```bash
pnpm install
```

### **Step 2: Backend Setup (if not already done)**

```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install

# Copy environment file
cp .env.example .env

# Start backend server
npm run dev
```

### **Step 3: Start Frontend**

```bash
# From root directory
npm run dev

# Or from frontend directory
cd frontend && npm run dev
```

## 📦 New Dependencies Added

### **Frontend**
- **axios**: HTTP client for API calls
- **Environment variables**: `.env` file for API configuration

### **Backend** (already included in package.json)
- **express**: Web server framework
- **cors**: Cross-origin resource sharing
- **helmet**: Security middleware
- **mongoose**: MongoDB ODM
- **pg**: PostgreSQL client
- **socket.io**: Real-time communication
- **winston**: Logging

## 🔧 Configuration Files

### **Frontend Environment (.env)**
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=http://localhost:3001
```

### **Backend Environment (.env)**
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
USE_POSTGRES=true
ENABLE_ENGINES=true
DB_HOST=localhost
DB_PORT=5432
DB_NAME=caresignal_db
DB_USER=caresignal_user
DB_PASSWORD=caresignal_password

# MongoDB
MONGODB_URI=mongodb://localhost:27017/caresignal_mongo

# Security
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
```

## 🌐 Access Points

After starting both servers:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Engine Dashboard**: http://localhost:5173/engines (Director only)
- **API Documentation**: http://localhost:3001/api-docs

## 🐛 Troubleshooting

### **"Failed to resolve import axios"**
- Run `npm install` in the frontend directory
- Ensure axios is in package.json dependencies

### **"Cannot connect to backend"**
- Ensure backend server is running on port 3001
- Check environment variables in .env files
- Verify CORS configuration in backend

### **"Authentication errors"**
- Check JWT_SECRET in backend .env
- Ensure user exists in database
- Verify login credentials

### **"Database connection failed"**
- Ensure PostgreSQL and MongoDB are running
- Check database credentials in .env
- Run database setup scripts if needed

## 📋 Database Setup (if not done)

### **PostgreSQL Setup**
```bash
# Run these SQL scripts in pgAdmin:
# 1. backend/database/01_create_database.sql
# 2. backend/database/02_create_schema.sql  
# 3. backend/database/03_populate_data.sql
```

### **Quick Setup Script**
```bash
# Run the automated setup script
setup.bat  # Windows
# or
./setup.sh  # Linux/macOS
```

## 🎯 Next Steps

1. **Install dependencies**: `npm install`
2. **Start backend**: `cd backend && npm run dev`
3. **Start frontend**: `npm run dev`
4. **Login with test user**: Check database for sample users
5. **Explore real-time dashboards** with live data

The system is now ready for full backend-frontend integration testing!
