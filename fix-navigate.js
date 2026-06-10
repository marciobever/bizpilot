import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.join(__dirname, 'app');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.tsx')) {
      const content = fs.readFileSync(p, 'utf8');
      const newContent = content.replace(/navigate\(/g, 'navigate.push(');
      if (content !== newContent) {
        fs.writeFileSync(p, newContent);
        console.log(`Fixed navigate in ${p}`);
      }
    }
  }
}
walk(appDir);
