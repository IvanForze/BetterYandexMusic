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
  if (p && fs.existsSync(p)) {
    resourcesDir = p;
    break;
  }
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
    fs.writeFileSync(indexJSPath, content, 'utf8');
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
        fs.writeFileSync(indexJSPath, content, 'utf8');
      }
    } else {
      console.warn("Предупреждение: Не удалось найти место создания BrowserWindow в index.js");
    }
  }
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
