const fs = require('fs');
const readline = require('readline');

async function search() {
  const fileStream = fs.createReadStream('C:\\Users\\tanaka.majuru\\.gemini\\antigravity-ide\\brain\\a6ed297d-5d74-44d6-b05d-219206a8aa98\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    const lower = line.toLowerCase();
    if (lower.includes('browser') || lower.includes('subagent') || lower.includes('devtools') || lower.includes('mcp') || lower.includes('launch') || lower.includes('playwright')) {
      try {
        const obj = JSON.parse(line);
        console.log(`Line ${lineCount}: type=${obj.type}, source=${obj.source}`);
        if (obj.content && obj.content.length < 500) {
          console.log(`  Content: ${obj.content}`);
        }
        if (obj.tool_calls) {
          console.log(`  Tool Calls: ${JSON.stringify(obj.tool_calls)}`);
        }
      } catch (e) {
        console.log(`Line ${lineCount} parse error: ${e.message}`);
      }
    }
  }
}

search();
