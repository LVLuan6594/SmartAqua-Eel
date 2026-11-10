import fs from 'node:fs';
import path from 'node:path';

const dataFile = path.join(process.cwd(), 'data', 'runtime', 'data.json');
const exportDir = path.join(process.cwd(), 'data', 'exports');
const outPath = path.join(exportDir, `smart-aqua-runtime-${Date.now()}.json`);

fs.mkdirSync(exportDir, { recursive: true });

if (!fs.existsSync(dataFile)) {
  console.error('Runtime data file not found. Start the backend once to initialize it.');
  process.exit(1);
}

const source = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
fs.writeFileSync(outPath, JSON.stringify(source, null, 2), 'utf8');
console.log(`Exported runtime data to ${outPath}`);
