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
    'shared/md5.js',
    'shared/rzt-api.js',
    'shared/scrobbler.js',
    'preload/api-server.js',
    'shared/soundcloud-import.js',
    'preload/bridge.js'
  ];

  // Page Context Files
  const pageFiles = [
    'shared/styles.js',
    'shared/rzt-api.js',
    'shared/genius-api.js',
    'page/variables.js',
    'shared/themes.js',
    'shared/navbar-sync.js',
    'shared/sync-popover.js',
    'shared/theme-popover.js',
    'shared/sleep-timer.js',
    'shared/settings-injector.js',
    'shared/wrapped/wrapped-ui.js',
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
    const filePath = file.startsWith('shared/') ? path.join(rootDir, file) : path.join(electronSrcDir, file);
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

  // Also copy to installer assets
  const installerAssetsDir = path.join(rootDir, 'yandex-sync-installer', 'assets');
  if (fs.existsSync(installerAssetsDir)) {
    const installerDestPath = path.join(installerAssetsDir, 'desktop-sync.js');
    fs.writeFileSync(installerDestPath, combinedCode, 'utf8');
    console.log(`Successfully copied desktop-sync.js -> ${installerDestPath}`);
  }
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
    'shared/md5.js',
    'shared/rzt-api.js',
    'shared/genius-api.js',
    'shared/scrobbler.js',
    'isolated/scrobbler-init.js',
    'isolated/variables.js',
    'shared/themes.js',
    'shared/navbar-sync.js',
    'shared/sync-popover.js',
    'shared/theme-popover.js',
    'shared/sleep-timer.js',
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
    'shared/settings-injector.js',
    'shared/wrapped/wrapped-ui.js',
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

  // Bundle soundcloud-bridge.js as standalone isolated script with shared/soundcloud-import.js
  const bridgeSrc = path.join(extSrcDir, 'isolated', 'soundcloud-bridge.js');
  const sharedImport = path.join(rootDir, 'shared', 'soundcloud-import.js');
  const bridgeDest = path.join(rootDir, 'yandex-sync-extension', 'soundcloud-bridge.js');
  if (fs.existsSync(bridgeSrc) && fs.existsSync(sharedImport)) {
    const combined = fs.readFileSync(sharedImport, 'utf8') + '\n\n' + fs.readFileSync(bridgeSrc, 'utf8');
    fs.writeFileSync(bridgeDest, combined, 'utf8');
    console.log(`Successfully built bundled soundcloud-bridge.js -> ${bridgeDest}`);
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

  // Сборка сервера через ncc
  console.log('Building Standalone Server with ncc...');
  try {
    const { execSync } = require('child_process');
    execSync('npx ncc build server.js -o dist/server-bundle -m', { stdio: 'inherit', cwd: rootDir });
    console.log('Successfully built Standalone Server -> dist/server-bundle/index.js');
    
    // Copy it to installer assets
    const installerAssetsDir = path.join(rootDir, 'yandex-sync-installer', 'assets');
    if (fs.existsSync(installerAssetsDir)) {
      const destPath = path.join(installerAssetsDir, 'sync-server.bundle.js');
      fs.copyFileSync(path.join(rootDir, 'dist', 'server-bundle', 'index.js'), destPath);
      console.log(`Successfully copied sync-server.bundle.js -> ${destPath}`);
    }
  } catch (err) {
    console.error('Error building standalone server:', err.message);
    success = false;
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
