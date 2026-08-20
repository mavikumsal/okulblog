import fs from 'node:fs';

const files = ['.manus-logs/devserver.log', '.manus-logs/browserConsole.log', '.manus-logs/networkRequests.log'];
for (const file of files) {
  console.log(`### ${file}`);
  if (!fs.existsSync(file)) { console.log('missing'); continue; }
  const rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  let parsed = 0;
  const issues = [];
  for (const row of rows.slice(-2000)) {
    const match = row.match(/^\[[^\]]+\]\s*(\{.*)$/s);
    if (!match) continue;
    try {
      const data = JSON.parse(match[1]);
      parsed++;
      const status = Number(data.status ?? data.statusCode ?? data.response?.status);
      const level = String(data.level ?? data.type ?? '').toLowerCase();
      const message = String(data.message ?? data.error ?? data.exception ?? data.response?.error ?? '').slice(0, 220);
      if ((Number.isFinite(status) && status >= 400) || ['error', 'exception', 'failed'].some((word) => level.includes(word))) {
        issues.push({ status: Number.isFinite(status) ? status : undefined, level, method: data.method, url: data.url ?? data.path ?? data.request?.url, procedure: data.procedure, message, keys: Object.keys(data).slice(0, 20) });
      }
    } catch { /* non-JSON log line */ }
  }
  console.log(JSON.stringify({ rows: rows.length, parsed, issueCount: issues.length, issues: issues.slice(-20) }, null, 2));
}
