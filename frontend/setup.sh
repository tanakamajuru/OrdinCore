#!/bin/bash

# CareSignal Backend-Frontend Integration Setup Script
# This script automates the complete setup process

set -e

echo "🚀 CareSignal Backend-Frontend Integration Setup"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    print_success "Node.js $(node -v) found"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    print_success "npm $(npm -v) found"
    
    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL not found in PATH. Please ensure PostgreSQL is installed and accessible."
    else
        print_success "PostgreSQL found"
    fi
    
    # Check MongoDB
    if ! command -v mongod &> /dev/null; then
        print_warning "MongoDB not found in PATH. Please ensure MongoDB is installed and accessible."
    else
        print_success "MongoDB found"
    fi
}

# Setup database
setup_database() {
    print_status "Setting up PostgreSQL database..."
    
    # Check if caresignal_db exists
    if psql -lqt -h localhost -U postgres | cut -d \| -f 1 | grep -qw caresignal_db; then
        print_warning "Database 'caresignal_db' already exists. Skipping creation."
    else
        print_status "Creating database and user..."
        
        # Create database and user
        psql -h localhost -U postgres -d postgres -c "
            CREATE DATABASE caresignal_db;
            CREATE USER caresignal_user WITH PASSWORD 'caresignal_password';
            GRANT ALL PRIVILEGES ON DATABASE caresignal_db TO caresignal_user;
            GRANT ALL PRIVILEGES ON SCHEMA public TO caresignal_user;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO caresignal_user;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO caresignal_user;
        " || {
            print_error "Failed to create database. Please check PostgreSQL connection and permissions."
            exit 1
        }
        
        print_success "Database and user created"
    fi
    
    # Run schema and data scripts
    print_status "Creating database schema..."
    psql -h localhost -U caresignal_user -d caresignal_db -f backend/database/02_create_schema.sql || {
        print_error "Failed to create database schema."
        exit 1
    }
    print_success "Database schema created"
    
    print_status "Populating sample data..."
    psql -h localhost -U caresignal_user -d caresignal_db -f backend/database/03_populate_data.sql || {
        print_error "Failed to populate sample data."
        exit 1
    }
    print_success "Sample data populated"
}

# Setup backend
setup_backend() {
    print_status "Setting up backend..."
    
    cd backend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_status "Installing backend dependencies..."
        npm install || {
            print_error "Failed to install backend dependencies."
            exit 1
        }
        print_success "Backend dependencies installed"
    else
        print_warning "Backend node_modules already exists. Skipping installation."
    fi
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_status "Creating .env file..."
        cp .env.example .env
        
        # Update .env with default values
        sed -i 's/USE_POSTGRES=false/USE_POSTGRES=true/' .env
        sed -i 's/ENABLE_ENGINES=false/ENABLE_ENGINES=true/' .env
        sed -i 's|MONGODB_URI=.*|MONGODB_URI=mongodb://localhost:27017/caresignal_mongo|' .env
        sed -i 's|DB_HOST=.*|DB_HOST=localhost|' .env
        sed -i 's|DB_PORT=.*|DB_PORT=5432|' .env
        sed -i 's|DB_NAME=.*|DB_NAME=caresignal_db|' .env
        sed -i 's|DB_USER=.*|DB_USER=caresignal_user|' .env
        sed -i 's|DB_PASSWORD=.*|DB_PASSWORD=caresignal_password|' .env
        
        print_success ".env file created with default configuration"
    else
        print_warning ".env file already exists. Skipping creation."
    fi
    
    cd ..
    print_success "Backend setup completed"
}

# Setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    
    cd frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install || {
            print_error "Failed to install frontend dependencies."
            exit 1
        }
        print_success "Frontend dependencies installed"
    else
        print_warning "Frontend node_modules already exists. Skipping installation."
    fi
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_status "Creating frontend .env file..."
        cat > .env << EOF
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=http://localhost:3001
EOF
        print_success "Frontend .env file created"
    else
        print_warning "Frontend .env file already exists. Skipping creation."
    fi
    
    cd ..
    print_success "Frontend setup completed"
}

# Verify setup
verify_setup() {
    print_status "Verifying setup..."
    
    # Test database connection
    print_status "Testing PostgreSQL connection..."
    if psql -h localhost -U caresignal_user -d caresignal_db -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "PostgreSQL connection successful"
    else
        print_error "PostgreSQL connection failed"
        exit 1
    fi
    
    # Test backend build
    print_status "Testing backend build..."
    cd backend
    npm run build || {
        print_error "Backend build failed"
        exit 1
    }
    print_success "Backend build successful"
    cd ..
    
    # Test frontend build
    print_status "Testing frontend build..."
    cd frontend
    npm run build || {
        print_error "Frontend build failed"
        exit 1
    }
    print_success "Frontend build successful"
    cd ..
    
    print_success "Setup verification completed"
}

# Start services
start_services() {
    print_status "Starting services..."
    
    # Start backend in background
    print_status "Starting backend server..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to start
    sleep 5
    
    # Test backend health
    if curl -s http://localhost:3001/health > /dev/null; then
        print_success "Backend server started successfully"
    else
        print_error "Backend server failed to start"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    # Start frontend in background
    print_status "Starting frontend server..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    # Wait for frontend to start
    sleep 5
    
    print_success "Frontend server started successfully"
    
    echo ""
    print_success "🎉 CareSignal application is now running!"
    echo ""
    echo "📊 Backend API: http://localhost:3001"
    echo "🌐 Frontend: http://localhost:5173"
    echo "📖 API Docs: http://localhost:3001/api-docs"
    echo "💚 Health Check: http://localhost:3001/health"
    echo ""
    echo "Press Ctrl+C to stop both servers"
    
    # Wait for user interrupt
    trap 'echo ""; print_status "Stopping services..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; print_success "Services stopped"; exit 0' INT
    
    # Keep script running
    wait
}

# Main execution
main() {
    echo ""
    print_status "Starting CareSignal setup process..."
    echo ""
    
    # Check if we're in the right directory
    if [ ! -f "backend/package.json" ] || [ ! -f "frontend/package.json" ]; then
        print_error "Please run this script from the root directory of the CareSignal project."
        exit 1
    fi
    
    check_prerequisites
    echo ""
    
    setup_database
    echo ""
    
    setup_backend
    echo ""
    
    setup_frontend
    echo ""
    
    verify_setup
    echo ""
    
    # Ask if user wants to start services
    echo "Do you want to start the application now? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        start_services
    else
        print_success "Setup completed successfully!"
        echo ""
        echo "To start the application manually:"
        echo "1. Backend: cd backend && npm run dev"
        echo "2. Frontend: cd frontend && npm run dev"
    fi
}

# Run main function
main "$@"
