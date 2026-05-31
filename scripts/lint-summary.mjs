import fs from 'fs';
import { execSync } from 'child_process';

execSync('npx eslint src --max-warnings 9999 --format json -o lint-all.json', {
  stdio: 'inherit',
  cwd: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
});

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const data = JSON.parse(fs.readFileSync(`${root}/lint-all.json`, 'utf8'));
const byFile = {};
let total = 0;
for (const file of data) {
  if (!file.messages.length) continue;
  const rel = file.filePath.replace(/\\/g, '/').split('/src/').pop();
  byFile[`src/${rel}`] = file.messages.length;
  total += file.messages.length;
}
console.log('Total:', total);
for (const [file, count] of Object.entries(byFile).sort((a, b) => b[1] - a[1])) {
  console.log(`${count}\t${file}`);
}
