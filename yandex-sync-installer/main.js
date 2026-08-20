const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const asar = require('@electron/asar');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// Подавление асинхронных ошибок закрытого потока вывода (write EIO / EPIPE) при запуске AppImage / GUI
if (process.stdout && process.stdout.on) {
  process.stdout.on('error', (err) => {
    if (err.code === 'EPIPE' || err.code === 'EIO') return;
  });
}
if (process.stderr && process.stderr.on) {
  process.stderr.on('error', (err) => {
    if (err.code === 'EPIPE' || err.code === 'EIO') return;
  });
}
process.on('uncaughtException', (err) => {
  if (err && (err.code === 'EIO' || err.code === 'EPIPE' || err.message?.includes('write EIO') || err.message?.includes('write EPIPE'))) {
    return;
  }
  console.error('Неперехваченная ошибка:', err);
});

// Автоматическое отключение песочницы Chromium при запуске от имени root (sudo) на Linux
if (process.platform === 'linux' && process.getuid && process.getuid() === 0) {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 450,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#111',
    resizable: false,
    icon: path.join(__dirname, 'public', process.platform === 'darwin' ? 'Icon-iOS-Default-1024x1024@1x.png' : 'Icon.png')
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function findResourcesDir() {
  let possiblePaths = [];
  const homeDir = app.getPath('home');

  if (process.platform === 'darwin') {
    possiblePaths = [
      '/Applications/Yandex Music.app/Contents/Resources',
      '/Applications/Яндекс Музыка.app/Contents/Resources',
      path.join(homeDir, 'Applications', 'Yandex Music.app', 'Contents', 'Resources'),
      path.join(homeDir, 'Applications', 'Яндекс Музыка.app', 'Contents', 'Resources')
    ];
  } else if (process.platform === 'linux') {
    // 1. Стандартные системные пути (/opt, /usr)
    possiblePaths = [
      '/opt/Яндекс Музыка/resources',
      '/opt/Яндекс Музыка',
      '/opt/Яндекс.Музыка/resources',
      '/opt/Яндекс.Музыка',
      '/opt/ЯндексМузыка/resources',
      '/opt/ЯндексМузыка',
      '/opt/yandex-music/resources',
      '/opt/yandex-music',
      '/opt/yandex-music-app/resources',
      '/opt/yandex-music-app',
      '/opt/YandexMusic/resources',
      '/opt/YandexMusic',
      '/opt/Yandex Music/resources',
      '/opt/Yandex Music',
      '/opt/yandex/music/resources',
      '/opt/yandex/music',
      '/usr/lib/yandex-music/resources',
      '/usr/lib/yandex-music',
      '/usr/lib/Яндекс Музыка/resources',
      '/usr/lib/Яндекс Музыка',
      '/usr/share/yandex-music/resources',
      '/usr/share/yandex-music',
      '/usr/share/Яндекс Музыка/resources',
      '/usr/share/Яндекс Музыка',
      // Flatpak
      path.join(homeDir, '.var', 'app', 'ru.yandex.music', 'data', 'yandex-music', 'resources'),
      path.join(homeDir, '.var', 'app', 'ru.yandex.music', 'data', 'Яндекс Музыка', 'resources'),
      '/var/lib/flatpak/app/ru.yandex.music/current/active/files/extra/resources',
      // Пользовательские директории (AppImage / .local)
      path.join(homeDir, 'Applications', 'Яндекс Музыка', 'resources'),
      path.join(homeDir, 'Applications', 'yandex-music', 'resources'),
      path.join(homeDir, 'Applications', 'yandex-music'),
      path.join(homeDir, '.local', 'share', 'Яндекс Музыка', 'resources'),
      path.join(homeDir, '.local', 'share', 'yandex-music', 'resources'),
      path.join(homeDir, 'yandex-music', 'resources'),
      path.join(homeDir, 'Яндекс Музыка', 'resources')
    ];

    // Динамический поиск в /opt, /usr/lib, ~/.local/share, ~/Applications
    const searchBases = [
      '/opt',
      '/usr/lib',
      '/usr/share',
      path.join(homeDir, 'Applications'),
      path.join(homeDir, '.local', 'share')
    ];

    for (const base of searchBases) {
      try {
        if (fs.existsSync(base)) {
          const entries = fs.readdirSync(base);
          for (const entry of entries) {
            const lower = entry.toLowerCase();
            if (lower.includes('yandex') || lower.includes('яндекс') || lower.includes('music') || lower.includes('музыка')) {
              possiblePaths.push(path.join(base, entry, 'resources'));
              possiblePaths.push(path.join(base, entry));
            }
          }
        }
      } catch (e) {}
    }
  } else {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      possiblePaths = [
        path.join(localAppData, 'Programs', 'yandex-music-app', 'resources'),
        path.join(localAppData, 'Programs', 'YandexMusic', 'resources'),
        path.join(localAppData, 'YandexMusic', 'resources'),
        path.join('C:', 'Users', process.env.USERNAME, 'AppData', 'Local', 'Programs', 'yandex-music-app', 'resources')
      ];
    }
  }

  for (const p of possiblePaths) {
    if (!p) continue;
    try {
      if (fs.existsSync(path.join(p, 'app.asar'))) {
        return p;
      }
      if (fs.existsSync(path.join(p, 'resources', 'app.asar'))) {
        return path.join(p, 'resources');
      }
    } catch (e) {}
  }
  return null;
}

function findPreloadScript(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        const found = findPreloadScript(fullPath);
        if (found) return found;
      }
    } else if (file === 'preload.js' || (file === 'index.js' && fullPath.toLowerCase().includes('preload'))) {
      return fullPath;
    }
  }
  return null;
}

ipcMain.handle('open-url', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('get-version', () => {
  return app.getVersion();
});

ipcMain.on('close-app', () => {
  app.quit();
});

ipcMain.handle('install-mod', async (event) => {
  const log = (msg) => {
    if (process.stdout && process.stdout.isTTY) {
      try { console.log(msg); } catch(e) {}
    }
    try {
      if (event?.sender && !event.sender.isDestroyed()) {
        event.sender.send('install-log', msg);
      }
    } catch(e) {}
  };
  
  // ОТКЛЮЧАЕМ ВНУТРЕННИЙ ПЕРЕХВАТ ASAR ЭЛЕКТРОНОМ
  // Иначе он думает, что app.asar — это папка, и fs.accessSync выдает ошибку!
  const originalNoAsar = process.noAsar;
  process.noAsar = true;

  try {
    log("Ищем установленную Яндекс Музыку...");
    const resourcesDir = findResourcesDir();
    if (!resourcesDir) throw new Error("Папка с приложением Яндекс Музыки не найдена.");

    const asarPath = path.join(resourcesDir, 'app.asar');
    if (!fs.existsSync(asarPath)) throw new Error("Файл app.asar не найден.");

    log("Закрываем приложение Яндекс Музыки (если оно открыто)...");
    if (process.platform === 'darwin') {
      try { await exec('osascript -e \'quit app "Yandex Music"\''); } catch(e) {}
      try { await exec('osascript -e \'quit app "Яндекс Музыка"\''); } catch(e) {}
      try { await exec('pkill -f "Yandex Music"'); } catch(e) {}
      try { await exec('pkill -f "Яндекс Музыка"'); } catch(e) {}
    } else if (process.platform === 'linux') {
      try { await exec('pkill -f "yandex-music"'); } catch(e) {}
      try { await exec('pkill -f "Яндекс Музыка"'); } catch(e) {}
      try { await exec('pkill -f "Яндекс.Музыка"'); } catch(e) {}
      try { await exec('pkill -f "YandexMusic"'); } catch(e) {}
      try { await exec('pkill -f "yandex_music"'); } catch(e) {}
    } else if (process.platform === 'win32') {
      try { await exec('taskkill /F /IM "YandexMusic.exe" /T'); } catch(e) {}
      try { await exec('taskkill /F /IM "yandex-music-app.exe" /T'); } catch(e) {}
      try { await exec('taskkill /F /IM "Яндекс Музыка.exe" /T'); } catch(e) {}
      try { await exec('taskkill /F /IM "Yandex Music.exe" /T'); } catch(e) {}
    }
    
    if (process.platform === 'win32') {
      log("Ожидаем снятия блокировки с файлов...");
      let isLocked = true;
      for (let i = 0; i < 25; i++) {
        try { 
          const fd = fs.openSync(asarPath, 'r+');
          fs.closeSync(fd);
          isLocked = false;
          break; 
        } catch (err) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      if (isLocked) {
        throw new Error("Файл app.asar заблокирован. Закройте Яндекс Музыку вручную!");
      }
    } else if (process.platform === 'darwin') {
      log("Проверяем закрытие приложения...");
      let isRunning = true;
      for (let i = 0; i < 25; i++) {
        try {
          const { stdout } = await exec('pgrep -f "Yandex Music|Яндекс Музыка"');
          if (!stdout || stdout.trim() === '') {
            isRunning = false;
            break;
          }
        } catch (e) {
          isRunning = false;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (isRunning) {
        throw new Error("Яндекс Музыка всё ещё запущена. Пожалуйста, закройте приложение (Cmd+Q)!");
      }
    } else {
      // Linux: проверка прав записи
      try {
        fs.accessSync(asarPath, fs.constants.W_OK);
      } catch (accessErr) {
        if (accessErr.code === 'EACCES') {
          throw new Error("Нет прав на запись в /opt. Запустите установщик с sudo:\nsudo ./BetterYandexMusic.Installer... --no-sandbox");
        }
      }
    }

    const unpackedDir = path.join(resourcesDir, 'app-unpacked');
    
    log("Распаковываем ресурсы приложения...");
    asar.uncacheAll();
    asar.extractAll(asarPath, unpackedDir);

    // Удаляем DevTools из index.js и внедряем IPC-обработчики
    const indexJSPath = path.join(unpackedDir, 'index.js');
    if (fs.existsSync(indexJSPath)) {
      let indexContent = fs.readFileSync(indexJSPath, 'utf8');
      indexContent = indexContent.replace(/\r?\n\s*window\.webContents\.openDevTools\(\);/g, '');
      
      if (indexContent.includes('// --- YM SYNC EXPORT PATCH ---')) {
        indexContent = indexContent.replace(/\/\/ --- YM SYNC EXPORT PATCH ---[\s\S]*?\/\/ --- END YM SYNC EXPORT PATCH ---/g, '');
      }

      if (!indexContent.includes('ym-sync-net-fetch')) {
        indexContent += `
// --- YM SYNC EXPORT PATCH ---
try {
  const { ipcMain, dialog, net } = require('electron');
  try { ipcMain.removeHandler('ym-sync-show-save-dialog'); } catch(e) {}
  ipcMain.handle('ym-sync-show-save-dialog', async (event, options) => {
    const parentWindow = event.sender ? require('electron').BrowserWindow.fromWebContents(event.sender) : null;
    if (parentWindow) {
      return await dialog.showSaveDialog(parentWindow, options);
    } else {
      return await dialog.showSaveDialog(options);
    }
  });

  try { ipcMain.removeHandler('ym-sync-net-fetch'); } catch(e) {}
  ipcMain.handle('ym-sync-net-fetch', async (event, { url, options }) => {
    try {
      const res = await net.fetch(url, options || {});
      const text = await res.text();
      return { ok: true, status: res.status, text };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
} catch(e) {
  console.error('[SYNC] Failed to inject ym-sync IPC handlers:', e);
}
// --- END YM SYNC EXPORT PATCH ---
`;
      }
      fs.writeFileSync(indexJSPath, indexContent, 'utf8');
    }

    log("Ищем скрипт загрузчика...");
    const preloadPath = findPreloadScript(unpackedDir);
    if (!preloadPath) throw new Error("preload-скрипт не найден.");

    log("Копируем и объединяем файлы мода...");
    const assetsDir = path.join(process.resourcesPath, 'assets');
    const localAssetsDir = path.join(__dirname, 'assets');
    const workingAssetsDir = fs.existsSync(assetsDir) ? assetsDir : localAssetsDir;

    const socketIoCode = fs.readFileSync(path.join(workingAssetsDir, 'socket.io.js'), 'utf8');
    const syncCode = fs.readFileSync(path.join(workingAssetsDir, 'desktop-sync.js'), 'utf8');
    
    const combinedInjectedCode = `\n${socketIoCode}\n\n${syncCode}\n`;
    const targetInjectedPath = path.join(path.dirname(preloadPath), 'desktop-sync-injected.js');
    fs.writeFileSync(targetInjectedPath, combinedInjectedCode, 'utf8');

    const serverBundleCode = fs.readFileSync(path.join(workingAssetsDir, 'sync-server.bundle.js'), 'utf8');
    const targetServerPath = path.join(path.dirname(preloadPath), 'sync-server.bundle.js');
    fs.writeFileSync(targetServerPath, serverBundleCode, 'utf8');

    log("Внедряем код мода в приложение...");
    const injectionMarker = '// --- YANDEX MUSIC SYNC INJECTION ---';
    const injectionLoader = `\n${injectionMarker}\n(function() {
      try {
        const fs = require('fs'); const path = require('path');
        const targetPath = path.join(__dirname, 'desktop-sync-injected.js');
        if (fs.existsSync(targetPath)) {
          try { require(targetPath); } catch(e) {}
          const syncCode = fs.readFileSync(targetPath, 'utf8');
          if (typeof window !== 'undefined' && window.document) {
            window.document.addEventListener('DOMContentLoaded', () => {
              if (window.document.getElementById('ym-sync-desktop-injected')) return;
              const script = window.document.createElement('script');
              script.id = 'ym-sync-desktop-injected';
              script.textContent = syncCode;
              window.document.documentElement.appendChild(script);
            });
          }
        }
      } catch (err) {}
    })();\n`;

    let preloadContent = fs.readFileSync(preloadPath, 'utf8');
    if (preloadContent.includes(injectionMarker)) {
      preloadContent = preloadContent.substring(0, preloadContent.indexOf(injectionMarker)).trim() + '\n';
    }
    fs.writeFileSync(preloadPath, preloadContent + injectionLoader, 'utf8');

    log("Упаковываем ресурсы обратно...");
    await asar.createPackage(unpackedDir, asarPath);
    asar.uncacheAll();

    if (process.platform !== 'linux') {
      log("Отключаем проверку целостности (asar integrity)...");
      let exePath = null;
      if (process.platform === 'darwin') {
        const macOsDir = path.join(path.dirname(resourcesDir), 'MacOS');
        const exeFile = fs.readdirSync(macOsDir).find(f => !f.startsWith('.'));
        if (exeFile) exePath = path.join(macOsDir, exeFile);
      } else {
        const parentDir = path.dirname(resourcesDir);
        const exeFile = fs.readdirSync(parentDir).find(f => f.endsWith('.exe') && !f.toLowerCase().includes('uninstall'));
        if (exeFile) exePath = path.join(parentDir, exeFile);
      }

      if (exePath) {
        try {
          await flipFuses(exePath, {
            version: FuseVersion.V1,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false
          });
        } catch (fuseErr) {}
      }
    }

    if (process.platform === 'darwin') {
      log("Переподписываем приложение (macOS)...");
      try {
        await exec(`codesign --force --deep --sign - "${path.dirname(path.dirname(resourcesDir))}"`);
      } catch (e) { log("Внимание: ошибка авто-подписи macOS, может потребоваться sudo codesign."); }
    }

    log("Очищаем временные файлы...");
    fs.rmSync(unpackedDir, { recursive: true, force: true });

    log("Установка успешно завершена!");
    return { success: true };
  } catch (error) {
    log(`Ошибка: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    process.noAsar = originalNoAsar; // Возвращаем как было
  }
});

ipcMain.handle('uninstall-mod', async (event) => {
  const log = (msg) => {
    if (process.stdout && process.stdout.isTTY) {
      try { console.log(msg); } catch(e) {}
    }
    try {
      if (event?.sender && !event.sender.isDestroyed()) {
        event.sender.send('install-log', msg);
      }
    } catch(e) {}
  };
  
  const originalNoAsar = process.noAsar;
  process.noAsar = true;

  try {
    log("Ищем установленную Яндекс Музыку...");
    const resourcesDir = findResourcesDir();
    if (!resourcesDir) throw new Error("Папка с приложением Яндекс Музыки не найдена.");

    const asarPath = path.join(resourcesDir, 'app.asar');
    if (!fs.existsSync(asarPath)) throw new Error("Файл app.asar не найден.");

    log("Закрываем приложение Яндекс Музыки (если оно открыто)...");
    if (process.platform === 'darwin') {
      try { await exec('osascript -e \'quit app "Yandex Music"\''); } catch(e) {}
      try { await exec('osascript -e \'quit app "Яндекс Музыка"\''); } catch(e) {}
      try { await exec('pkill -f "Yandex Music"'); } catch(e) {}
      try { await exec('pkill -f "Яндекс Музыка"'); } catch(e) {}
    } else if (process.platform === 'linux') {
      try { await exec('pkill -f "yandex-music"'); } catch(e) {}
      try { await exec('pkill -f "Яндекс Музыка"'); } catch(e) {}
      try { await exec('pkill -f "Яндекс.Музыка"'); } catch(e) {}
      try { await exec('pkill -f "YandexMusic"'); } catch(e) {}
      try { await exec('pkill -f "yandex_music"'); } catch(e) {}
    } else if (process.platform === 'win32') {
      try { await exec('taskkill /F /IM "YandexMusic.exe" /T'); } catch(e) {}
      try { await exec('taskkill /F /IM "yandex-music-app.exe" /T'); } catch(e) {}
      try { await exec('taskkill /F /IM "Яндекс Музыка.exe" /T'); } catch(e) {}
      try { await exec('taskkill /F /IM "Yandex Music.exe" /T'); } catch(e) {}
    }
    
    if (process.platform === 'win32') {
      log("Ожидаем снятия блокировки с файлов...");
      let isLocked = true;
      for (let i = 0; i < 25; i++) {
        try { 
          const fd = fs.openSync(asarPath, 'r+');
          fs.closeSync(fd);
          isLocked = false;
          break; 
        } catch (err) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      if (isLocked) {
        throw new Error("Файл app.asar заблокирован. Закройте Яндекс Музыку вручную!");
      }
    } else if (process.platform === 'darwin') {
      log("Проверяем закрытие приложения...");
      let isRunning = true;
      for (let i = 0; i < 25; i++) {
        try {
          const { stdout } = await exec('pgrep -f "Yandex Music|Яндекс Музыка"');
          if (!stdout || stdout.trim() === '') {
            isRunning = false;
            break;
          }
        } catch (e) {
          isRunning = false;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (isRunning) {
        throw new Error("Яндекс Музыка всё ещё запущена. Пожалуйста, закройте приложение (Cmd+Q)!");
      }
    } else {
      // Linux: проверка прав записи
      try {
        fs.accessSync(asarPath, fs.constants.W_OK);
      } catch (accessErr) {
        if (accessErr.code === 'EACCES') {
          throw new Error("Нет прав на запись в /opt. Запустите установщик с sudo:\nsudo ./BetterYandexMusic.Installer... --no-sandbox");
        }
      }
    }

    const unpackedDir = path.join(resourcesDir, 'app-unpacked');
    log("Распаковываем архив...");
    asar.uncacheAll();
    asar.extractAll(asarPath, unpackedDir);

    const preloadPath = findPreloadScript(unpackedDir);
    if (preloadPath) {
      log("Удаляем инжектор из скриптов загрузки...");
      let preloadContent = fs.readFileSync(preloadPath, 'utf8');
      const injectionMarker = '// --- YANDEX MUSIC SYNC INJECTION ---';
      if (preloadContent.includes(injectionMarker)) {
        preloadContent = preloadContent.substring(0, preloadContent.indexOf(injectionMarker)).trim() + '\n';
        fs.writeFileSync(preloadPath, preloadContent, 'utf8');
      }

      const injectedFile = path.join(path.dirname(preloadPath), 'desktop-sync-injected.js');
      if (fs.existsSync(injectedFile)) fs.unlinkSync(injectedFile);

      const serverFile = path.join(path.dirname(preloadPath), 'sync-server.bundle.js');
      if (fs.existsSync(serverFile)) fs.unlinkSync(serverFile);
    }

    log("Упаковываем чистый архив обратно...");
    await asar.createPackage(unpackedDir, asarPath);
    asar.uncacheAll();

    if (process.platform === 'darwin') {
      log("Переподписываем приложение (macOS)...");
      try { await exec(`codesign --force --deep --sign - "${path.dirname(path.dirname(resourcesDir))}"`); } catch (e) {}
    }

    log("Очищаем временные файлы...");
    fs.rmSync(unpackedDir, { recursive: true, force: true });

    log("Мод успешно удален!");
    return { success: true };
  } catch (error) {
    log(`Ошибка удаления: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    process.noAsar = originalNoAsar;
  }
});
