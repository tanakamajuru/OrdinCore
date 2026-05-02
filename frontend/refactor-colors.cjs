const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src'));

const replacements = [
    { regex: /\bbg-white\b/g, replacement: 'bg-card' },
    { regex: /\bmin-h-screen\s+bg-card\b/g, replacement: 'min-h-screen bg-background' },
    { regex: /\bbg-gray-50\b/g, replacement: 'bg-muted' },
    { regex: /\bbg-gray-100\b/g, replacement: 'bg-muted' },
    { regex: /\bbg-black\b/g, replacement: 'bg-primary' },
    { regex: /\btext-black\b/g, replacement: 'text-foreground' },
    { regex: /\btext-gray-900\b/g, replacement: 'text-foreground' },
    { regex: /\btext-gray-800\b/g, replacement: 'text-foreground' },
    { regex: /\btext-gray-700\b/g, replacement: 'text-muted-foreground' },
    { regex: /\btext-gray-600\b/g, replacement: 'text-muted-foreground' },
    { regex: /\btext-gray-500\b/g, replacement: 'text-muted-foreground' },
    { regex: /\btext-white\b/g, replacement: 'text-primary-foreground' },
    { regex: /\bborder-black\b/g, replacement: 'border-border' },
    { regex: /\bborder-gray-200\b/g, replacement: 'border-border' },
    { regex: /\bborder-gray-300\b/g, replacement: 'border-border' },
    { regex: /\bhover:bg-gray-50\b/g, replacement: 'hover:bg-muted/50' },
    { regex: /\bhover:bg-gray-100\b/g, replacement: 'hover:bg-muted/50' },
    { regex: /\bhover:bg-gray-800\b/g, replacement: 'hover:bg-[#008394]' },
    { regex: /\bhover:text-gray-600\b/g, replacement: 'hover:text-muted-foreground' }
];

let updatedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    replacements.forEach(r => {
        content = content.replace(r.regex, r.replacement);
    });
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${path.basename(file)}`);
        updatedCount++;
    }
});

console.log(`Total files updated: ${updatedCount}`);
