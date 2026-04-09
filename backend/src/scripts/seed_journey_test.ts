import 'dotenv/config';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { companyService } from '../services/company.service';
import { usersService } from '../services/users.service';
import { housesService } from '../services/houses.service';

async function seed() {
    console.log('--- SEEDING JOURNEY TEST DATA ---');
    const passwordHash = await bcrypt.hash('Password123!', 12);
    const companyName = 'Journey Test Co V2';
    
    try {
        // 1. Create Company
        console.log('1. Creating Company...');
        const company = await companyService.create({ name: companyName, plan: 'starter' });
        console.log('   Success:', company.id);
        
        // 2. Create Director
        console.log('2. Creating Director...');
        const dir = await usersService.create(company.id, {
            email: 'dir_test_v2@example.com',
            password: 'Password123!',
            first_name: 'Jane',
            last_name: 'Director',
            role: 'DIR'
        });
        console.log('   Success:', dir.id);
        
        // 3. Create House (Site)
        console.log('3. Creating House...');
        const house = await housesService.create(company.id, {
            name: 'Site Alpha',
            address: '456 Alpha Way',
            city: 'Beta City',
            postcode: 'AL1 1PH'
        });
        console.log('   Success:', house.id);
        
        // 4. Create Registered Manager
        console.log('4. Creating Registered Manager...');
        const rm = await usersService.create(company.id, {
            email: 'rm_test_v2@example.com',
            password: 'Password123!',
            first_name: 'Robert',
            last_name: 'Manager',
            role: 'REGISTERED_MANAGER',
            house_ids: [house.id]
        });
        console.log('   Success:', rm.id);
        
        // 5. Create Team Leader
        console.log('5. Creating Team Leader...');
        const tl = await usersService.create(company.id, {
            email: 'tl_test_v2@example.com',
            password: 'Password123!',
            first_name: 'Thomas',
            last_name: 'Leader',
            role: 'TEAM_LEADER',
            house_ids: [house.id],
            pulse_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        });
        console.log('   Success:', tl.id);
        
        console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
        console.log('DIR: dir_test_v2@example.com / Password123!');
        console.log('RM:  rm_test_v2@example.com / Password123!');
        console.log('TL:  tl_test_v2@example.com / Password123!');
        
    } catch (err) {
        console.error('--- SEEDING FAILED ---');
        console.error(err);
        process.exit(1);
    }
}

seed();
