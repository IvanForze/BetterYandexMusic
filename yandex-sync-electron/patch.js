const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

// Автоматическая сборка desktop-sync.js при запуске патчера
try {
  const { buildElectron } = require('../build.js');
  buildElectron();
} catch (e) {
  console.warn("[ВНИМАНИЕ] Не удалось выполнить автоматическую сборку desktop-sync.js:", e.message || e);
}

console.log("=== Автопатчер Yandex Music Sync (Electron Desktop) ===");

// 1. Поиск папки ресурсов Яндекс.Музыки
let possiblePaths = [];

if (process.platform === 'darwin') {
  const homeDir = process.env.HOME || '';
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

let resourcesDir = null;
for (const p of possiblePaths) {
  if (p && fs.existsSync(p)) {
    resourcesDir = p;
    break;
  }
}

if (!resourcesDir) {
  console.error("Ошибка: Папка ресурсов Яндекс Музыки не найдена.");
  if (process.platform === 'darwin') {
    console.error("Убедитесь, что приложение установлено в папку /Applications или ~/Applications.");
  } else {
    console.error("Убедитесь, что приложение установлено по стандартному пути в AppData.");
  }
  process.exit(1);
}

const asarPath = path.join(resourcesDir, 'app.asar');
const unpackedDir = path.join(resourcesDir, 'app-unpacked');

console.log(`Найден путь ресурсов: ${resourcesDir}`);
if (!fs.existsSync(asarPath)) {
  console.error(`Ошибка: Файл app.asar не найден по пути: ${asarPath}`);
  process.exit(1);
}

// Проверка блокировки файла (запущено ли приложение)
try {
  fs.accessSync(asarPath, fs.constants.W_OK);
} catch (err) {
  console.error("\n[ВНИМАНИЕ] Файл app.asar заблокирован!");
  console.error("Пожалуйста, полностью закройте приложение Яндекс.Музыка перед запуском патча.\n");
  process.exit(1);
}

// 2. Распаковка архива app.asar
console.log("Распаковка архива app.asar...");
try {
  // Пробуем использовать npx asar
  execSync(`npx -y @electron/asar extract "${asarPath}" "${unpackedDir}"`, { stdio: 'inherit' });
} catch (e) {
  console.log("Ошибка npx @electron/asar, пробуем глобальный/локальный asar...");
  try {
    execSync(`asar extract "${asarPath}" "${unpackedDir}"`, { stdio: 'inherit' });
  } catch (e2) {
    console.error("Ошибка распаковки: убедитесь, что пакет asar установлен (npm install -g asar)");
    console.error(e2);
    process.exit(1);
  }
}

// 2.5 Очистка DevTools автооткрытия в index.js (для продакшн-сборки)
const indexJSPath = path.join(unpackedDir, 'index.js');
if (fs.existsSync(indexJSPath)) {
  let indexContent = fs.readFileSync(indexJSPath, 'utf8');
  if (indexContent.includes('window.webContents.openDevTools();')) {
    console.log("Найден автозапуск DevTools в index.js. Отключаем его для продакшн-сборки...");
    indexContent = indexContent.replace(/\r?\n\s*window\.webContents\.openDevTools\(\);/g, '');
    fs.writeFileSync(indexJSPath, indexContent, 'utf8');
  }
}

// 3. Рекурсивный поиск preload-скрипта в распакованной папке
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

console.log("Поиск preload-скрипта приложения...");
const preloadPath = findPreloadScript(unpackedDir);
if (!preloadPath) {
  console.error("Ошибка: preload-скрипт не найден в распакованном архиве.");
  // Чистим за собой
  cleanUpUnpacked();
  process.exit(1);
}

console.log(`Найден preload-скрипт: ${preloadPath}`);
const preloadDir = path.dirname(preloadPath);

// 4. Подготовка инжектируемого скрипта (склеиваем socket.io.js и desktop-sync.js)
console.log("Склеивание библиотек и кода синхронизации...");
const socketIoPath = path.join(__dirname, 'socket.io.js');
const desktopSyncPath = path.join(__dirname, 'desktop-sync.js');

if (!fs.existsSync(socketIoPath) || !fs.existsSync(desktopSyncPath)) {
  console.error("Ошибка: Файлы socket.io.js или desktop-sync.js не найдены в текущей директории патчера.");
  cleanUpUnpacked();
  process.exit(1);
}

const socketIoCode = fs.readFileSync(socketIoPath, 'utf8');
const syncCode = fs.readFileSync(desktopSyncPath, 'utf8');
const combinedInjectedCode = `
// ==========================================
// Socket.io Client Library
// ==========================================
${socketIoCode}

// ==========================================
// Yandex Music Sync Core Script
// ==========================================
${syncCode}
`;

// Записываем объединенный файл в папку preload-скрипта внутри распакованного asar
const targetInjectedPath = path.join(preloadDir, 'desktop-sync-injected.js');
fs.writeFileSync(targetInjectedPath, combinedInjectedCode, 'utf8');
console.log(`Создан файл инжекции: ${targetInjectedPath}`);

// Копируем серверный бандл
const serverBundlePath = path.join(__dirname, '..', 'dist', 'server-bundle', 'index.js');
if (fs.existsSync(serverBundlePath)) {
  const targetServerPath = path.join(preloadDir, 'sync-server.bundle.js');
  fs.copyFileSync(serverBundlePath, targetServerPath);
  console.log(`Создан файл локального сервера: ${targetServerPath}`);
} else {
  console.warn(`ВНИМАНИЕ: Серверный бандл не найден по пути ${serverBundlePath}. Локальный сервер не будет работать.`);
}

// 5. Внедрение хука в оригинальный preload-скрипт
const injectionMarker = '// --- YANDEX MUSIC SYNC INJECTION ---';
const injectionLoader = `
${injectionMarker}
(function() {
  try {
    const fs = require('fs');
    const path = require('path');
    const targetPath = path.join(__dirname, 'desktop-sync-injected.js');
    if (fs.existsSync(targetPath)) {
      // 1. Запуск Node.js/preload части
      try {
        require(targetPath);
      } catch (preloadErr) {
        console.error('[SYNC] Ошибка запуска preload Node.js части:', preloadErr);
      }

      // 2. Внедрение в веб-страницу
      const syncCode = fs.readFileSync(targetPath, 'utf8');
      if (typeof window !== 'undefined' && window.document) {
        window.document.addEventListener('DOMContentLoaded', () => {
          if (window.document.getElementById('ym-sync-desktop-injected')) return;
          const script = window.document.createElement('script');
          script.id = 'ym-sync-desktop-injected';
          script.textContent = syncCode;
          window.document.documentElement.appendChild(script);
          console.log('[SYNC] Внедрение кода синхронизации прошло успешно!');
        });
      }
    } else {
      console.error('[SYNC] Файл desktop-sync-injected.js не найден по пути:', targetPath);
    }
  } catch (err) {
    console.error('[SYNC] Ошибка инициализации preload инжектора:', err);
  }
})();
`;

let preloadContent = fs.readFileSync(preloadPath, 'utf8');
const badMarker = '\${injectionMarker}';
let cleaned = false;

if (preloadContent.includes(badMarker)) {
  console.log("Найден сломанный лоадер в preload.js. Очищаем...");
  const index = preloadContent.indexOf(badMarker);
  preloadContent = preloadContent.substring(0, index).trim() + '\n';
  cleaned = true;
}

if (preloadContent.includes(injectionMarker)) {
  console.log("Найден старый лоадер в preload.js. Удаляем его для обновления...");
  const markerIndex = preloadContent.indexOf(injectionMarker);
  preloadContent = preloadContent.substring(0, markerIndex).trim() + '\n';
  cleaned = true;
}

if (cleaned) {
  fs.writeFileSync(preloadPath, preloadContent, 'utf8');
}

console.log("Добавление лоадера синхронизации в preload.js...");
fs.appendFileSync(preloadPath, '\n' + injectionLoader);

// 6. Запаковка архива app.asar обратно
console.log("Запаковка модифицированного архива в app.asar...");
try {
  execSync(`npx -y @electron/asar pack "${unpackedDir}" "${asarPath}"`, { stdio: 'inherit' });
} catch (e) {
  try {
    execSync(`asar pack "${unpackedDir}" "${asarPath}"`, { stdio: 'inherit' });
  } catch (e2) {
    console.error("Ошибка запаковки: не удалось упаковать app.asar.");
    process.exit(1);
  }
}

// 6.5 Отключение проверки целостности asar в исполняемом файле (fuses)
console.log("Отключение проверки целостности asar в исполняемом файле приложения...");
try {
  let exePath = null;
  if (process.platform === 'darwin') {
    const macOsDir = path.join(path.dirname(resourcesDir), 'MacOS');
    if (fs.existsSync(macOsDir)) {
      const files = fs.readdirSync(macOsDir);
      const exeFile = files.find(f => !f.startsWith('.') && fs.statSync(path.join(macOsDir, f)).isFile());
      if (exeFile) {
        exePath = path.join(macOsDir, exeFile);
      }
    }
  } else {
    const parentDir = path.dirname(resourcesDir);
    const parentFiles = fs.readdirSync(parentDir);
    const exeFile = parentFiles.find(f => f.endsWith('.exe') && !f.toLowerCase().includes('uninstall'));
    if (exeFile) {
      exePath = path.join(parentDir, exeFile);
    }
  }

  if (exePath) {
    console.log(`Найден исполняемый файл приложения: ${exePath}`);
    console.log("Отключение Fuse: EnableEmbeddedAsarIntegrityValidation...");
    execSync(`npx -y @electron/fuses write --app "${exePath}" EnableEmbeddedAsarIntegrityValidation=off`, { stdio: 'inherit' });
  } else {
    console.warn("Предупреждение: Исполняемый файл приложения не найден, пропуск отключения asar integrity.");
  }
} catch (fuseErr) {
  console.warn("Предупреждение: Не удалось отключить asar integrity через @electron/fuses.");
  console.warn(fuseErr.message || fuseErr);
}

// 6.7 Переподпись приложения для macOS (исправление вылетов из-за нарушения целостности/подписи кода)
if (process.platform === 'darwin') {
  const appPath = path.dirname(path.dirname(resourcesDir));
  console.log(`\nОбнаружена macOS. Переподписываем приложение (ad-hoc)...`);
  console.log(`Путь к приложению: ${appPath}`);
  try {
    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
    console.log("Приложение успешно переподписано!");
  } catch (codesignErr) {
    console.warn("\n[ПРЕДУПРЕЖДЕНИЕ] Не удалось автоматически переподписать приложение.");
    console.warn("Возможно, требуются права администратора (sudo). Попробуйте выполнить команду вручную:");
    console.warn(`sudo codesign --force --deep --sign - "${appPath}"\n`);
  }
}

// 7. Очистка временных файлов
cleanUpUnpacked();

console.log("\n=======================================================");
console.log("ПАТЧ УСПЕШНО УСТАНОВЛЕН!");
console.log("Вы можете запускать приложение Яндекс.Музыка как обычно.");
console.log("=======================================================\n");

function cleanUpUnpacked() {
  console.log("Очистка временных файлов распаковки...");
  if (fs.existsSync(unpackedDir)) {
    try {
      // Удаляем рекурсивно (Node 14+)
      fs.rmSync(unpackedDir, { recursive: true, force: true });
    } catch (err) {
      try {
        fs.rmdirSync(unpackedDir, { recursive: true });
      } catch (err2) {
        console.warn("Предупреждение: Не удалось автоматически удалить временную папку:", unpackedDir);
      }
    }
  }
}
