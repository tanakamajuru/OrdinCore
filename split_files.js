const fs = require('fs');
const path = require('path');

function splitFile(filename, out1, out2) {
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) {
        console.log(`${filename} does not exist.`);
        return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const midpoint = Math.floor(lines.length / 2);
    
    const part1 = lines.slice(0, midpoint).join('\n');
    const part2 = lines.slice(midpoint).join('\n');
    
    fs.writeFileSync(path.join(__dirname, out1), part1);
    fs.writeFileSync(path.join(__dirname, out2), part2);
    
    console.log(`Split ${filename} into ${out1} (lines 1-${midpoint}) and ${out2} (lines ${midpoint + 1}-${lines.length}).`);
}

splitFile('BE.txt', 'BE 1.txt', 'BE 2.txt');
splitFile('FE.txt', 'FE 1.txt', 'FE 2.txt');
