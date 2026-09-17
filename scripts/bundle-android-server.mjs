import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const assetsServerDir = path.resolve(rootDir, 'android/app/src/main/assets/server');
const assetsPublicDir = path.resolve(assetsServerDir, 'public');
const clientDistDir = path.resolve(rootDir, 'client/dist');
const serverDistDir = path.resolve(rootDir, 'server/dist');

const buildTimestamp = Date.now();
const buildIso = new Date(buildTimestamp).toISOString();
const buildId = `build_${buildTimestamp}_${Math.random().toString(36).substring(2, 8)}`;

console.log(`\n🧹 [1/5] Cleaning stale build artifacts and assets...`);
if (fs.existsSync(clientDistDir)) {
  fs.rmSync(clientDistDir, { recursive: true, force: true });
}
if (fs.existsSync(serverDistDir)) {
  fs.rmSync(serverDistDir, { recursive: true, force: true });
}
if (fs.existsSync(assetsServerDir)) {
  fs.rmSync(assetsServerDir, { recursive: true, force: true });
}

console.log('🚀 [2/5] Building fresh React client bundle...');
execSync('npm run build:client', { cwd: rootDir, stdio: 'inherit' });

console.log('🛠️ [3/5] Verifying server TypeScript compilation...');
execSync('npm run build:server', { cwd: rootDir, stdio: 'inherit' });

console.log('📦 [4/5] Bundling Server into standalone module with esbuild...');
fs.mkdirSync(assetsServerDir, { recursive: true });
fs.mkdirSync(assetsPublicDir, { recursive: true });

// Bundle server using esbuild with properly quoted paths
const entryPath = path.resolve(rootDir, 'server/src/index.ts');
const outPath = path.resolve(assetsServerDir, 'bundle.mjs');
const bannerStr = "import { createRequire } from 'module'; const require = createRequire(import.meta.url);";

const esbuildCmd = `npx -y esbuild "${entryPath}" --bundle --platform=node --format=esm --minify --banner:js="${bannerStr}" --outfile="${outPath}"`;
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

console.log('📂 [5/5] Copying fresh client build to Android assets/server/public...');
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

// Write build metadata for runtime freshness verification
const buildInfo = {
  buildId,
  buildTimestamp,
  buildIso
};

fs.writeFileSync(
  path.resolve(assetsServerDir, 'build_info.json'),
  JSON.stringify(buildInfo, null, 2)
);
fs.writeFileSync(
  path.resolve(assetsPublicDir, 'build_info.json'),
  JSON.stringify(buildInfo, null, 2)
);

console.log('✅ Android assets successfully prepared!');
console.log(`   Build ID: ${buildId} (${buildIso})`);
console.log('   Destination: ' + assetsServerDir);
