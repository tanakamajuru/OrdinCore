require('dotenv').config();
const { query } = require('./config/database');
const { usersRepo } = require('./repositories/users.repo');

async function run() {
    try {
        const userEmail = 'taylor.rose@ordincore.com';
        const user = await usersRepo.findByEmail(userEmail);
        if (!user) {
            console.log('User not found');
            return;
        }
        
        const fullUser = await usersRepo.findById(user.id);
        console.log('User data from Repo.findById:');
        console.log(JSON.stringify(fullUser, null, 2));
        
        const userHouses = await query(`
            SELECT h.id, h.name 
            FROM user_houses uh 
            JOIN houses h ON h.id = uh.house_id 
            WHERE uh.user_id = $1
        `, [user.id]);
        console.log('User houses from user_houses table:');
        console.table(userHouses.rows);
        
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

run();
