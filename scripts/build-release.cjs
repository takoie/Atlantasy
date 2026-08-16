const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = pkg.version;
const tag = `v${version}`;

console.log(`\n🚀 Starter signert bygg for Atlantasy Desktop ${tag}...\n`);

// 1. Bygg frontend
console.log('📦 1/3 Bygger frontend...');
execSync('npm run build', { stdio: 'inherit' });

// 2. Les privatnøkkel og bygg Tauri med signering
console.log('\n🔒 2/3 Kompilerer og signerer Tauri-pakker...');
const keyPath = path.join(__dirname, '../src-tauri/atlantasy.key');
if (!fs.existsSync(keyPath)) {
  throw new Error(`Fant ikke signeringsnøkkel på ${keyPath}`);
}
const privateKey = fs.readFileSync(keyPath, 'utf8').trim();

const env = {
  ...process.env,
  TAURI_SIGNING_PRIVATE_KEY: privateKey,
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD: '',
  CI: 'true',
};

execSync('npx tauri build', { stdio: 'inherit', env });

// 3. Generer latest.json for Tauri in-app auto-updater
console.log('\n📄 3/3 Genererer latest.json manifest...');
const nsisSetupName = `Atlantasy_${version}_x64-setup.exe`;
const sigPath = path.join(__dirname, `../src-tauri/target/release/bundle/nsis/${nsisSetupName}.sig`);

let signature = '';
if (fs.existsSync(sigPath)) {
  signature = fs.readFileSync(sigPath, 'utf8').trim();
} else {
  console.warn(`⚠️ Fant ikke signaturfil på ${sigPath}`);
}

const latestJson = {
  version: tag,
  notes: `Atlantasy Desktop ${tag}`,
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      signature: signature,
      url: `https://github.com/takoie/Atlantasy/releases/download/${tag}/${nsisSetupName}`,
    },
  },
};

const latestJsonPath = path.join(__dirname, '../latest.json');
fs.writeFileSync(latestJsonPath, JSON.stringify(latestJson, null, 2), 'utf8');

console.log(`\n✅ Bygg fullført! Manifest lagret i latest.json.`);
console.log(`   Klar til å publisere ${tag} til GitHub Releases med latest.json!\n`);
