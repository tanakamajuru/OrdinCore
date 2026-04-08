import 'dotenv/config';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { companyService } from '../services/company.service';
import { usersService } from '../services/users.service';
import { housesService } from '../services/houses.service';
import { governanceService } from '../services/governance.service';

async function verify() {
    console.log('--- STARTING FULL JOURNEY VERIFICATION ---');
    
    const testId = uuidv4().substring(0, 8);
    const companyName = `Test Company ${testId}`;
    const adminEmail = `admin_${testId}@test.com`;
    const tlEmail = `tl_${testId}@test.com`;
    
    try {
        // 1. Create Company
        console.log('1. Creating Company...');
        const company = await companyService.create({ name: companyName, plan: 'starter' });
        console.log('   Success:', company.id);
        
        // 2. Create Company Admin
        console.log('2. Creating Company Admin...');
        const admin = await usersService.create(company.id, {
            email: adminEmail,
            password: 'Password123!',
            first_name: 'Company',
            last_name: 'Admin',
            role: 'ADMIN'
        });
        console.log('   Success:', admin.id);
        
        // 3. Create House (Site)
        console.log('3. Creating House...');
        const house = await housesService.create(company.id, {
            name: 'Test House',
            address: '123 Test St',
            city: 'Test City',
            postcode: 'TE1 1ST'
        });
        console.log('   Success:', house.id);
        
        // 4. Create Team Leader & Assign Pulse Days
        console.log('4. Creating Team Leader...');
        const tl = await usersService.create(company.id, {
            email: tlEmail,
            password: 'Password123!',
            first_name: 'Team',
            last_name: 'Leader',
            role: 'TEAM_LEADER',
            house_ids: [house.id],
            pulse_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        });
        console.log('   Success:', tl.id);
        console.log('   Pulse Days Assigned:', tl.pulse_days);
        
        // 5. Check if Pulse Template exists (Governance Rhythm)
        console.log('5. Ensuring Governance Template exists...');
        let templates = await governanceService.getTemplates(company.id);
        if (templates.length === 0) {
            console.log('   No templates found. Creating standard template...');
            await governanceService.createTemplate(company.id, admin.id, {
                name: 'Standard Governance Pulse',
                description: 'Daily governance check',
                frequency: 'daily',
                questions: [
                    { question: 'Is everything okay?', question_type: 'yes_no', required: true }
                ]
            });
            templates = await governanceService.getTemplates(company.id);
        }
        console.log('   Template ID:', templates[0].id);
        
        // 6. Generate Pulse
        console.log('6. Generating Missing Pulses...');
        await governanceService.generateMissingPulses(company.id, house.id, tl.id);
        
        const pulses = await governanceService.findAllPulses(company.id, { house_id: house.id, assigned_user_id: tl.id });
        console.log('   Pulses found:', pulses.total);
        if (pulses.total === 0) {
            throw new Error('Pulse generation failed');
        }
        
        // 7. Submit Pulse
        console.log('7. Submitting Pulse Answers...');
        const pulseId = pulses.pulses[0].id;
        const qRes = await governanceService.getTemplateQuestions(pulses.pulses[0].template_id, company.id);
        const answers = qRes.map(q => ({
            question_id: q.id,
            answer: 'yes',
            flagged: false
        }));
        
        const submission = await governanceService.submitAnswers(pulseId, company.id, tl.id, answers);
        console.log('   Submission Result:', submission.message);
        
        console.log('--- VERIFICATION SUCCESSFUL ---');
        
    } catch (err) {
        console.error('--- VERIFICATION FAILED ---');
        console.error(err);
        process.exit(1);
    }
}

verify();
