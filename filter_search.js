const fs = require('fs');

const data = JSON.parse(fs.readFileSync('search_results.json', 'utf8'));

for (const entry of data) {
  const isMatch = entry.content && (entry.content.includes('subagent') || entry.content.includes('chrome_devtools') || entry.content.includes('evaluate_script'));
  const hasToolCalls = entry.tool_calls && JSON.stringify(entry.tool_calls).includes('chrome_devtools');
  if (isMatch || hasToolCalls) {
    console.log(`Line ${entry.line}: type=${entry.type}, source=${entry.source}`);
    if (entry.content) console.log(`  Content: ${entry.content}`);
    if (entry.tool_calls) console.log(`  Tool Calls: ${JSON.stringify(entry.tool_calls, null, 2)}`);
    console.log('---');
  }
}
