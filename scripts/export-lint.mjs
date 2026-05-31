import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
execSync('npx eslint src --max-warnings 9999 --format json -o lint-all.json', { cwd: root, stdio: 'inherit' });
const data = JSON.parse(fs.readFileSync(path.join(root, 'lint-all.json'), 'utf8'));
for (const file of data) {
  if (!file.messages.length) continue;
  const rel = file.filePath.replace(/\\/g, '/').split('/src/').pop();
  for (const m of file.messages) {
    console.log(`${rel}:${m.line}:${m.ruleId}:${m.message.replace(/\s+/g, ' ')}`);
  }
}
