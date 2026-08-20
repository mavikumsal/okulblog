import fs from 'node:fs';
for (const file of ['.manus-logs/networkRequests.log', '.manus-logs/browserConsole.log']) {
  console.log(`### ${file}`);
  const rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  for (const row of rows.slice(-300)) {
    const match = row.match(/^\[[^\]]+\]\s*(\{.*)$/s);
    if (!match) continue;
    try {
      const d = JSON.parse(match[1]);
      const status = Number(d.status ?? d.response?.status);
      if (status >= 400 || String(d.level).toLowerCase() === 'error') {
        console.log(JSON.stringify({timestamp:d.timestamp,url:d.url,method:d.method,status:d.status,response:d.response,error:d.error,args:d.args,stack:d.stack}, null, 2));
      }
    } catch {}
  }
}
