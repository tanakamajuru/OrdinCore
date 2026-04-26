const fs = require('fs');
const path = require('path');

function walkDir(dir, filterExt) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            // Exclude node_modules, dist, build
            if (!file.includes('node_modules') && !file.includes('dist') && !file.includes('build')) {
                results = results.concat(walkDir(file, filterExt));
            }
        } else {
            const ext = path.extname(file);
            if (filterExt.includes(ext)) {
                results.push(file);
            }
        }
    });
    return results;
}

function concatenate(srcDir, outputFile, extensions) {
    const files = walkDir(srcDir, extensions);
    let content = '';
    files.forEach(file => {
        const relPath = path.relative(__dirname, file);
        content += `\n\n--- FILE: ${relPath} ---\n\n`;
        content += fs.readFileSync(file, 'utf8');
    });
    fs.writeFileSync(outputFile, content);
    console.log(`Generated ${outputFile} with ${files.length} files.`);
}

concatenate(path.join(__dirname, 'backend/src'), path.join(__dirname, 'BE.txt'), ['.ts']);
concatenate(path.join(__dirname, 'frontend/src'), path.join(__dirname, 'FE.txt'), ['.ts', '.tsx', '.js', '.jsx']);
