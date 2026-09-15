import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const assetsServerDir = path.resolve(rootDir, 'android/app/src/main/assets/server');
const assetsPublicDir = path.resolve(assetsServerDir, 'public');

console.log('🚀 [1/3] Building React client bundle...');
execSync('npm run build:client', { cwd: rootDir, stdio: 'inherit' });

console.log('📦 [2/3] Bundling Server into standalone module...');
fs.mkdirSync(assetsServerDir, { recursive: true });
fs.mkdirSync(assetsPublicDir, { recursive: true });

// Bundle server using esbuild with properly quoted paths
const entryPath = path.resolve(rootDir, 'server/src/index.ts');
const outPath = path.resolve(assetsServerDir, 'bundle.mjs');
const bannerStr = "import { createRequire } from 'module'; const require = createRequire(import.meta.url);";

const esbuildCmd = `npx -y esbuild "${entryPath}" --bundle --platform=node --format=esm --banner:js="${bannerStr}" --outfile="${outPath}"`;

execSync(esbuildCmd, { cwd: rootDir, stdio: 'inherit' });

// Create package.json with type=module so Node recognizes .mjs and ES module imports
fs.writeFileSync(
  path.resolve(assetsServerDir, 'package.json'),
  JSON.stringify({ name: 'mafia-android-server', type: 'module', main: 'bundle.mjs' }, null, 2)
);

// Create entry script main.js
fs.writeFileSync(
  path.resolve(assetsServerDir, 'main.js'),
  `import './bundle.mjs';\n`
);

console.log('📂 [3/3] Copying built client files to Android assets/server/public...');
const clientDistDir = path.resolve(rootDir, 'client/dist');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(clientDistDir, assetsPublicDir);

console.log('✅ Android assets successfully prepared in:');
console.log('   ' + assetsServerDir);
