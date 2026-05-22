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
    const lower = line.toLowerCase();
    if (lower.includes('chrome_devtools') || lower.includes('subagent') || lower.includes('agentapi') || lower.includes('browser') || lower.includes('eval')) {
      try {
        const obj = JSON.parse(line);
        matches.push({
          line: lineCount,
          type: obj.type,
          source: obj.source,
          content: obj.content ? obj.content.substring(0, 300) : undefined,
          tool_calls: obj.tool_calls
        });
      } catch (e) {
        matches.push({ line: lineCount, error: e.message });
      }
    }
  }

  fs.writeFileSync('search_results.json', JSON.stringify(matches, null, 2));
  console.log(`Found ${matches.length} matches. Saved to search_results.json`);
}

main();
