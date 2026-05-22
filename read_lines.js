const fs = require('fs');
const readline = require('readline');

async function main() {
  const fileStream = fs.createReadStream('C:\\Users\\tanaka.majuru\\.gemini\\antigravity-ide\\brain\\a6ed297d-5d74-44d6-b05d-219206a8aa98\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (lineCount >= 1700 && lineCount <= 1860) {
      try {
        const obj = JSON.parse(line);
        console.log(`Line ${lineCount}: type=${obj.type}, source=${obj.source}`);
        if (obj.content) {
          console.log(`  Content: ${obj.content.substring(0, 500)}`);
        }
        if (obj.tool_calls) {
          console.log(`  Tool Calls: ${JSON.stringify(obj.tool_calls, null, 2)}`);
        }
        if (obj.output) {
          console.log(`  Output: ${obj.output.substring(0, 500)}`);
        }
        console.log('----------------------------------------------------');
      } catch (e) {
        console.log(`Line ${lineCount} error: ${e.message}`);
      }
    }
  }
}

main();
