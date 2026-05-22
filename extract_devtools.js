const fs = require('fs');
const readline = require('readline');

async function main() {
  const fileStream = fs.createReadStream('C:\\Users\\tanaka.majuru\\.gemini\\antigravity-ide\\brain\\a6ed297d-5d74-44d6-b05d-219206a8aa98\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const matches = [];
  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (line.includes('chrome_devtools')) {
      matches.push({ line: lineCount, content: line });
    }
  }

  console.log(`Found ${matches.length} chrome_devtools occurrences`);
  for (const m of matches) {
    console.log(`Line ${m.line}: ${m.content.substring(0, 500)}`);
  }
}

main();
