const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

function buildElectron() {
  console.log('Building Electron desktop-sync.js...');
  const electronSrcDir = path.join(rootDir, 'yandex-sync-electron', 'src');
  
  if (!fs.existsSync(electronSrcDir)) {
    console.error('Error: yandex-sync-electron/src does not exist');
    return false;
  }

  // Preload Context Files
  const preloadFiles = [
    'preload/variables.js',
    'preload/discord.js',
    'preload/api-server.js',
    'preload/bridge.js'
  ];

  // Page Context Files
  const pageFiles = [
    'shared/styles.js',
    'page/variables.js',
    'shared/themes.js',
    'shared/navbar-sync.js',
    'shared/sync-popover.js',
    'shared/theme-popover.js',
    'shared/quality-indicator.js',
    'shared/lyrics/lrclib-client.js',
    'shared/lyrics/lyrics-sidebar.js',
    'shared/lyrics/lyrics-highlight.js',
    'shared/fullscreen/fullscreen-utils.js',
    'shared/fullscreen/fullscreen-lyrics.js',
    'shared/translation/translation.js',
    'page/socket-client.js',
    'page/player-monitor.js',
    'shared/soundcloud-api.js',
    'shared/custom-audio.js',
    'shared/player-faker.js',
    'shared/soundcloud-search.js',
    'page/index.js'
  ];

  let preloadCode = '';
  for (const file of preloadFiles) {
    const filePath = path.join(electronSrcDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: Preload component file ${file} not found at ${filePath}`);
      return false;
    }
    preloadCode += `// --- Component: ${file} ---\n` + fs.readFileSync(filePath, 'utf8') + '\n\n';
  }

  let pageCode = '';
  for (const file of pageFiles) {
    const filePath = file.startsWith('shared/') ? path.join(rootDir, file) : path.join(electronSrcDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: Page component file ${file} not found at ${filePath}`);
      return false;
    }
    pageCode += `// --- Component: ${file} ---\n` + fs.readFileSync(filePath, 'utf8') + '\n\n';
  }

  const combinedCode = `(function() {
  console.log("[SYNC] Yandex Music Sync (Electron Desktop) запущен!");

  if (typeof require !== 'undefined') {
    // ==========================================
    // PRELOAD NODE CONTEXT (Discord RPC & HTTP Server)
    // ==========================================
${preloadCode.split('\n').map(line => '    ' + line).join('\n')}
    return;
  }

  // ==========================================
  // WEB PAGE CONTEXT (Browser logic)
  // ==========================================
${pageCode}
})();
`;

  const destPath = path.join(rootDir, 'yandex-sync-electron', 'desktop-sync.js');
  fs.writeFileSync(destPath, combinedCode, 'utf8');
  console.log(`Successfully built Electron desktop-sync.js -> ${destPath}`);
  return true;
}

function buildExtension() {
  console.log('Building Extension scripts...');
  const extSrcDir = path.join(rootDir, 'yandex-sync-extension', 'src');

  if (!fs.existsSync(extSrcDir)) {
    console.error('Error: yandex-sync-extension/src does not exist');
    return false;
  }

  // Isolated Context Files
  const isolatedFiles = [
    'shared/styles.js',
    'isolated/variables.js',
    'shared/themes.js',
    'shared/navbar-sync.js',
    'shared/sync-popover.js',
    'shared/theme-popover.js',
    'shared/quality-indicator.js',
    'shared/lyrics/lrclib-client.js',
    'shared/lyrics/lyrics-sidebar.js',
    'shared/lyrics/lyrics-highlight.js',
    'shared/fullscreen/fullscreen-utils.js',
    'shared/fullscreen/fullscreen-lyrics.js',
    'shared/translation/translation.js',
    'isolated/socket-client.js',
    'isolated/index.js'
  ];

  // Main Context Files
  const mainFiles = [
    'main/variables.js',
    'main/player-monitor.js',
    'shared/soundcloud-api.js',
    'shared/custom-audio.js',
    'shared/player-faker.js',
    'shared/soundcloud-search.js',
    'main/index.js'
  ];

  let isolatedCode = '';
  for (const file of isolatedFiles) {
    const filePath = file.startsWith('shared/') ? path.join(rootDir, file) : path.join(extSrcDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: Isolated component file ${file} not found at ${filePath}`);
      return false;
    }
    isolatedCode += `// --- Component: ${file} ---\n` + fs.readFileSync(filePath, 'utf8') + '\n\n';
  }

  let mainCode = '';
  for (const file of mainFiles) {
    const filePath = file.startsWith('shared/') ? path.join(rootDir, file) : path.join(extSrcDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: Main component file ${file} not found at ${filePath}`);
      return false;
    }
    mainCode += `// --- Component: ${file} ---\n` + fs.readFileSync(filePath, 'utf8') + '\n\n';
  }

  const destIsolated = path.join(rootDir, 'yandex-sync-extension', 'isolated.js');
  fs.writeFileSync(destIsolated, isolatedCode, 'utf8');
  console.log(`Successfully built Extension isolated.js -> ${destIsolated}`);

  // Copy soundcloud-bridge.js as standalone isolated script
  const bridgeSrc = path.join(extSrcDir, 'isolated', 'soundcloud-bridge.js');
  const bridgeDest = path.join(rootDir, 'yandex-sync-extension', 'soundcloud-bridge.js');
  if (fs.existsSync(bridgeSrc)) {
    fs.copyFileSync(bridgeSrc, bridgeDest);
    console.log(`Successfully copied soundcloud-bridge.js -> ${bridgeDest}`);
  }

  const destMain = path.join(rootDir, 'yandex-sync-extension', 'main.js');
  fs.writeFileSync(destMain, mainCode, 'utf8');
  console.log(`Successfully built Extension main.js -> ${destMain}`);

  return true;
}

function main() {
  const args = process.argv.slice(2);
  let buildEl = true;
  let buildExt = true;

  if (args.includes('--electron')) {
    buildExt = false;
  } else if (args.includes('--extension')) {
    buildEl = false;
  }

  let success = true;
  if (buildEl) {
    success = buildElectron() && success;
  }
  if (buildExt) {
    success = buildExtension() && success;
  }

  if (!success) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildElectron,
  buildExtension
};
