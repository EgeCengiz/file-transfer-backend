const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '..', '..', 'file-transfer-frontend', 'dist');
const target = path.resolve(__dirname, '..', 'public');

if (!fs.existsSync(path.join(source, 'index.html'))) {
  console.error('Frontend dist yok. Once file-transfer-frontend icinde: npm run build');
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });
console.log(`Frontend kopyalandi: ${source} -> ${target}`);
