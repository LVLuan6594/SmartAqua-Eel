import fs from 'node:fs';
import path from 'node:path';
import {assertEelDataset} from '../server/validateDataset.mjs';

const importArg = process.argv[2];
const runtimeFile = path.join(process.cwd(), 'data', 'runtime', 'data.json');
const seedFile = path.join(process.cwd(), 'data', 'seeds', 'data.json');

if (!importArg) {
  console.error('Usage: node scripts/restore-demo-data.mjs <path-to-json>');
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), importArg);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
assertEelDataset(data);
if (!data || !data.metadata) {
  console.error('Invalid SmartAqua JSON: missing metadata');
  process.exit(1);
}

fs.writeFileSync(runtimeFile, JSON.stringify(data, null, 2), 'utf8');
console.log(`Restored runtime data from ${filePath}`);
console.log(`Seed remains intact at ${seedFile}`);
