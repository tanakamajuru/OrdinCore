const bcrypt = require('bcryptjs');

async function test() {
    const pass = 'Password123!';
    const hash = await bcrypt.hash(pass, 10);
    const valid = await bcrypt.compare(pass, hash);
    console.log('Hash:', hash);
    console.log('Valid:', valid);
}
test();
