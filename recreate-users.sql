-- Recreate users table properly
-- Run this in pgAdmin or psql

-- Drop the broken users table
DROP TABLE IF EXISTS users CASCADE;

-- Recreate users table with all required columns
CREATE TABLE users (
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

-- Insert sample data
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
('550e8400-e29b-41d4-a716-446655440009', 'james.thomas@caresignal.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LrUpm', 'James Thomas', 'director', NULL, 'CareSignal', true, NOW(), NOW());

-- Show the table structure
\d users;

-- Check the data
SELECT id, email, name, role, organization, is_active FROM users;
