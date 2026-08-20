const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

console.log("=== Дебаг-патчер Яндекс Музыки (Включение DevTools) ===");

let possiblePaths = [];
if (process.platform === 'darwin') {
  const homeDir = process.env.HOME || '';
  possiblePaths = [
    '/Applications/Yandex Music.app/Contents/Resources',
    '/Applications/Яндекс Музыка.app/Contents/Resources',
    path.join(homeDir, 'Applications', 'Yandex Music.app', 'Contents', 'Resources'),
    path.join(homeDir, 'Applications', 'Яндекс Музыка.app', 'Contents', 'Resources')
  ];
} else if (process.platform === 'linux') {
  const homeDir = process.env.HOME || '';
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
    path.join(homeDir, '.var', 'app', 'ru.yandex.music', 'data', 'yandex-music', 'resources'),
    path.join(homeDir, '.var', 'app', 'ru.yandex.music', 'data', 'Яндекс Музыка', 'resources'),
    '/var/lib/flatpak/app/ru.yandex.music/current/active/files/extra/resources',
    path.join(homeDir, 'Applications', 'Яндекс Музыка', 'resources'),
    path.join(homeDir, 'Applications', 'yandex-music', 'resources'),
    path.join(homeDir, 'Applications', 'yandex-music'),
    path.join(homeDir, '.local', 'share', 'Яндекс Музыка', 'resources'),
    path.join(homeDir, '.local', 'share', 'yandex-music', 'resources'),
    path.join(homeDir, 'yandex-music', 'resources'),
    path.join(homeDir, 'Яндекс Музыка', 'resources')
  ];

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
      path.join(localAppData, 'Programs', 'YandexMusic', 'resources')
    ];
  }
}

let resourcesDir = null;
for (const p of possiblePaths) {
  if (!p) continue;
  try {
    if (fs.existsSync(path.join(p, 'app.asar'))) {
      resourcesDir = p;
      break;
    }
    if (fs.existsSync(path.join(p, 'resources', 'app.asar'))) {
      resourcesDir = path.join(p, 'resources');
      break;
    }
  } catch(e) {}
}

if (!resourcesDir) {
  console.error("Ошибка: Папка ресурсов не найдена.");
  process.exit(1);
}

const asarPath = path.join(resourcesDir, 'app.asar');
const unpackedDir = path.join(resourcesDir, 'app-unpacked');

console.log(`Папка ресурсов: ${resourcesDir}`);

// Распаковка
try {
  execSync(`npx -y @electron/asar extract "${asarPath}" "${unpackedDir}"`, { stdio: 'inherit' });
} catch (e) {
  console.error("Не удалось распаковать asar:", e);
  process.exit(1);
}

// Модификация index.js
const indexJSPath = path.join(unpackedDir, 'index.js');
if (fs.existsSync(indexJSPath)) {
  let content = fs.readFileSync(indexJSPath, 'utf8');
  
  // Ищем создание BrowserWindow и добавляем принудительное открытие DevTools
  const searchStr = 'webPreferences\n  });';
  if (content.includes(searchStr)) {
    console.log("Внедряем команду автооткрытия DevTools...");
    content = content.replace(searchStr, 'webPreferences\n  });\n  window.webContents.openDevTools();');
  } else {
    // Пробуем другой вариант
    const searchStr2 = 'webPreferences\n  });';
    const index = content.indexOf('new electron.BrowserWindow');
    if (index !== -1) {
      console.log("Найдено создание окна, внедряем автооткрытие DevTools...");
      // Находим закрывающую скобку BrowserWindow
      const endOfConstructor = content.indexOf('});', index);
      if (endOfConstructor !== -1) {
        content = content.substring(0, endOfConstructor + 3) + '\n  window.webContents.openDevTools();' + content.substring(endOfConstructor + 3);
      }
    } else {
      console.warn("Предупреждение: Не удалось найти место создания BrowserWindow в index.js");
    }
  }

  // Внедряем IPC-обработчики в главный процесс index.js
  if (content.includes('// --- YM SYNC EXPORT PATCH ---')) {
    content = content.replace(/\/\/ --- YM SYNC EXPORT PATCH ---[\s\S]*?\/\/ --- END YM SYNC EXPORT PATCH ---/g, '');
  }

  if (!content.includes('ym-sync-net-fetch')) {
    console.log("Внедряем IPC-обработчики (save dialog и net.fetch) в index.js...");
    content += `
// --- YM SYNC EXPORT PATCH ---
try {
  const { ipcMain, dialog, net } = require('electron');
  
  try {
    ipcMain.removeHandler('ym-sync-show-save-dialog');
  } catch(e) {}
  ipcMain.handle('ym-sync-show-save-dialog', async (event, options) => {
    const parentWindow = event.sender ? require('electron').BrowserWindow.fromWebContents(event.sender) : null;
    if (parentWindow) {
      return await dialog.showSaveDialog(parentWindow, options);
    } else {
      return await dialog.showSaveDialog(options);
    }
  });

  try {
    ipcMain.removeHandler('ym-sync-net-fetch');
  } catch(e) {}
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
  fs.writeFileSync(indexJSPath, content, 'utf8');
}

// Запаковка
try {
  execSync(`npx -y @electron/asar pack "${unpackedDir}" "${asarPath}"`, { stdio: 'inherit' });
  console.log("Архив app.asar перепакован.");
} catch (e) {
  console.error("Ошибка запаковки asar:", e);
  process.exit(1);
}

// Отключение Fuses
try {
  let exePath = null;
  if (process.platform === 'darwin') {
    const macOsDir = path.join(path.dirname(resourcesDir), 'MacOS');
    if (fs.existsSync(macOsDir)) {
      const files = fs.readdirSync(macOsDir);
      const exeFile = files.find(f => !f.startsWith('.') && fs.statSync(path.join(macOsDir, f)).isFile());
      if (exeFile) exePath = path.join(macOsDir, exeFile);
    }
  }
  if (exePath) {
    execSync(`npx -y @electron/fuses write --app "${exePath}" EnableEmbeddedAsarIntegrityValidation=off`, { stdio: 'inherit' });
  }
} catch (e) {
  console.warn("Предупреждение по Fuses:", e.message);
}

// Подпись
if (process.platform === 'darwin') {
  const appPath = path.dirname(path.dirname(resourcesDir));
  try {
    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
    console.log("Приложение успешно переподписано!");
  } catch (e) {
    console.warn("Не удалось подписать:", e.message);
  }
}

// Очистка
if (fs.existsSync(unpackedDir)) {
  try {
    fs.rmSync(unpackedDir, { recursive: true, force: true });
  } catch (err) {
    try {
      fs.rmdirSync(unpackedDir, { recursive: true });
    } catch (e) {
      console.warn("Предупреждение: Не удалось автоматически удалить временную папку:", unpackedDir);
    }
  }
}

console.log("\nДебаг-патч успешно установлен! Запустите Яндекс Музыку — DevTools откроется автоматически.");
