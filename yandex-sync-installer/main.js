const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const asar = require('@electron/asar');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');
const { execSync } = require('child_process');

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
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#111',
    resizable: false
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function findResourcesDir() {
  let possiblePaths = [];
  if (process.platform === 'darwin') {
    const homeDir = app.getPath('home');
    possiblePaths = [
      '/Applications/Yandex Music.app/Contents/Resources',
      '/Applications/Яндекс Музыка.app/Contents/Resources',
      path.join(homeDir, 'Applications', 'Yandex Music.app', 'Contents', 'Resources'),
      path.join(homeDir, 'Applications', 'Яндекс Музыка.app', 'Contents', 'Resources')
    ];
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
    if (p && fs.existsSync(p)) return p;
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

ipcMain.handle('install-mod', async (event) => {
  const log = (msg) => { console.log(msg); event.sender.send('install-log', msg); };
  
  // ОТКЛЮЧАЕМ ВНУТРЕННИЙ ПЕРЕХВАТ ASAR ЭЛЕКТРОНОМ
  // Иначе он думает, что app.asar — это папка, и fs.accessSync выдает ошибку!
  const originalNoAsar = process.noAsar;
  process.noAsar = true;

  try {
    log("Закрываем приложение Яндекс Музыки (если оно открыто)...");
    if (process.platform === 'darwin') {
      try { execSync('pkill -f "Yandex Music"'); } catch(e) {}
      try { execSync('pkill -f "Яндекс Музыка"'); } catch(e) {}
    } else if (process.platform === 'win32') {
      try { execSync('taskkill /F /IM "YandexMusic.exe" /T', { stdio: 'ignore' }); } catch(e) {}
      try { execSync('taskkill /F /IM "yandex-music-app.exe" /T', { stdio: 'ignore' }); } catch(e) {}
    }
    
    // Ждем полторы секунды, чтобы ОС успела завершить процесс и снять блокировку с app.asar
    await new Promise(resolve => setTimeout(resolve, 1500));

    log("Ищем установленную Яндекс Музыку...");
    const resourcesDir = findResourcesDir();
    if (!resourcesDir) throw new Error("Папка с приложением Яндекс Музыки не найдена.");

    const asarPath = path.join(resourcesDir, 'app.asar');
    if (!fs.existsSync(asarPath)) throw new Error("Файл app.asar не найден.");

    try { fs.accessSync(asarPath, fs.constants.W_OK); } 
    catch (err) { throw new Error("Файл app.asar заблокирован. Закройте Яндекс Музыку!"); }

    const unpackedDir = path.join(resourcesDir, 'app-unpacked');
    
    log("Распаковываем ресурсы приложения...");
    asar.extractAll(asarPath, unpackedDir);

    // Удаляем DevTools из index.js
    const indexJSPath = path.join(unpackedDir, 'index.js');
    if (fs.existsSync(indexJSPath)) {
      let indexContent = fs.readFileSync(indexJSPath, 'utf8');
      indexContent = indexContent.replace(/\r?\n\s*window\.webContents\.openDevTools\(\);/g, '');
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
      await flipFuses(exePath, {
        version: FuseVersion.V1,
        [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false
      });
    }

    if (process.platform === 'darwin') {
      log("Переподписываем приложение (macOS)...");
      try {
        execSync(`codesign --force --deep --sign - "${path.dirname(path.dirname(resourcesDir))}"`);
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
  const log = (msg) => { console.log(msg); event.sender.send('install-log', msg); };
  
  const originalNoAsar = process.noAsar;
  process.noAsar = true;

  try {
    log("Закрываем приложение Яндекс Музыки (если оно открыто)...");
    if (process.platform === 'darwin') {
      try { execSync('pkill -f "Yandex Music"'); } catch(e) {}
      try { execSync('pkill -f "Яндекс Музыка"'); } catch(e) {}
    } else if (process.platform === 'win32') {
      try { execSync('taskkill /F /IM "YandexMusic.exe" /T', { stdio: 'ignore' }); } catch(e) {}
      try { execSync('taskkill /F /IM "yandex-music-app.exe" /T', { stdio: 'ignore' }); } catch(e) {}
    }
    await new Promise(resolve => setTimeout(resolve, 1500));

    log("Ищем установленную Яндекс Музыку...");
    const resourcesDir = findResourcesDir();
    if (!resourcesDir) throw new Error("Папка с приложением не найдена.");

    const asarPath = path.join(resourcesDir, 'app.asar');
    if (!fs.existsSync(asarPath)) throw new Error("Файл app.asar не найден.");
    try { fs.accessSync(asarPath, fs.constants.W_OK); } catch(e) { throw new Error("Файл app.asar заблокирован."); }

    const unpackedDir = path.join(resourcesDir, 'app-unpacked');
    log("Распаковываем архив...");
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
    }

    log("Упаковываем чистый архив обратно...");
    await asar.createPackage(unpackedDir, asarPath);

    if (process.platform === 'darwin') {
      log("Переподписываем приложение (macOS)...");
      try { execSync(`codesign --force --deep --sign - "${path.dirname(path.dirname(resourcesDir))}"`); } catch (e) {}
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
