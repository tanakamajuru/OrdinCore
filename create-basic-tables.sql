-- Create basic tables needed for login
-- Run this in pgAdmin or psql

-- Create houses table first
CREATE TABLE IF NOT EXISTS houses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    house_code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    county VARCHAR(100),
    postcode VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    capacity INTEGER,
    current_occupancy INTEGER DEFAULT 0,
    manager_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'registered-manager', 'responsible-individual', 'director')),
    assigned_house UUID REFERENCES houses(id),
    organization VARCHAR(255) DEFAULT 'CareSignal',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample houses
INSERT INTO houses (id, name, house_code, address, city, county, postcode, phone, email, capacity, current_occupancy, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440101', 'Oakwood Care Home', 'OAK001', '123 Oak Street', 'Manchester', 'Greater Manchester', 'M1 1AA', '0161-123-4567', 'oakwood@caresignal.com', 45, 38, true),
('550e8400-e29b-41d4-a716-446655440102', 'Riverside Manor', 'RIV002', '456 River Road', 'Birmingham', 'West Midlands', 'B1 2BB', '0121-234-5678', 'riverside@caresignal.com', 52, 47, true),
('550e8400-e29b-41d4-a716-446655440103', 'Maple Grove Residence', 'MAP003', '789 Maple Avenue', 'Leeds', 'West Yorkshire', 'LS1 3CC', '0113-345-6789', 'maplegrove@caresignal.com', 38, 32, true),
('550e8400-e29b-41d4-a716-446655440104', 'Sunset Villa', 'SUN004', '321 Sunset Boulevard', 'Bristol', 'Bristol', 'BS1 4DD', '0117-456-7890', 'sunset@caresignal.com', 40, 35, true),
('550e8400-e29b-41d4-a716-446655440105', 'Birchwood House', 'BIR005', '654 Birch Lane', 'Liverpool', 'Merseyside', 'L1 5EE', '0151-567-8901', 'birchwood@caresignal.com', 48, 42, true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample users
INSERT INTO users (id, email, password_hash, name, role, assigned_house, organization, is_active, created_at, updated_at) VALUES
-- Admin user (password: admin123)
('550e8400-e29b-41d4-a716-446655440000', 'admin@caresignal.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'System Administrator', 'admin', NULL, 'CareSignal', true, NOW(), NOW()),
-- Registered Managers (password: password123)
('550e8400-e29b-41d4-a716-446655440001', 'john.smith@caresignal.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'John Smith', 'registered-manager', '550e8400-e29b-41d4-a716-446655440101', 'CareSignal', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'sarah.jones@caresignal.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'Sarah Jones', 'registered-manager', '550e8400-e29b-41d4-a716-446655440102', 'CareSignal', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'michael.brown@caresignal.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'Michael Brown', 'registered-manager', '550e8400-e29b-41d4-a716-446655440103', 'CareSignal', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'emily.davis@caresignal.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'Emily Davis', 'registered-manager', '550e8400-e29b-41d4-a716-446655440104', 'CareSignal', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'david.wilson@caresignal.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'David Wilson', 'registered-manager', '550e8400-e29b-41d4-a716-446655440105', 'CareSignal', true, NOW(), NOW()),
-- Responsible Individuals (password: password123)
('550e8400-e29b-41d4-a716-446655440006', 'jennifer.miller@caresignal.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'Jennifer Miller', 'responsible-individual', NULL, 'CareSignal', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440007', 'robert.taylor@caresignal.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'Robert Taylor', 'responsible-individual', NULL, 'CareSignal', true, NOW(), NOW()),
-- Directors (password: password123)
('550e8400-e29b-41d4-a716-446655440008', 'lisa.anderson@caresignal.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'Lisa Anderson', 'director', NULL, 'CareSignal', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440009', 'james.thomas@caresignal.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'James Thomas', 'director', NULL, 'CareSignal', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Show the table structures
\d houses;
\d users;

-- Check the data
SELECT id, email, name, role, organization, is_active FROM users WHERE email = 'admin@caresignal.com';
