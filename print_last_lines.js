const fs = require('fs');
const readline = require('readline');

async function main() {
  const fileStream = fs.createReadStream('C:\\Users\\tanaka.majuru\\.gemini\\antigravity-ide\\brain\\a6ed297d-5d74-44d6-b05d-219206a8aa98\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const lines = [];
  for await (const line of rl) {
    lines.push(line);
  }

  console.log(`Total lines: ${lines.length}`);
  const lastN = 100;
  const startIdx = Math.max(0, lines.length - lastN);
  for (let i = startIdx; i < lines.length; i++) {
    try {
      const obj = JSON.parse(lines[i]);
      console.log(`Line ${i+1}: type=${obj.type}, source=${obj.source}`);
      if (obj.content && obj.content.length < 500) {
        console.log(`  Content: ${obj.content}`);
      }
      if (obj.tool_calls) {
        console.log(`  Tool Calls: ${JSON.stringify(obj.tool_calls)}`);
      }
    } catch (e) {
      console.log(`Line ${i+1} parse error: ${e.message}`);
    }
  }
}

main();
