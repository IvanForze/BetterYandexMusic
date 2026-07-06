const net = require('net');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
let contextBridge = null;
let serverNodeProcess = null;
let tunnelNodeProcess = null;
let serverStatusCallback = null;
let lastServerStatus = { status: 'stopped' };

const setServerStatus = (statusData) => {
  lastServerStatus = statusData;
  if (serverStatusCallback) {
    try {
      serverStatusCallback(statusData);
    } catch (e) {
      console.error('[SYNC] Ошибка обратного вызова статуса сервера:', e);
    }
  }
};
try {
  contextBridge = require('electron').contextBridge;
} catch (e) {
  console.warn('[SYNC] Не удалось импортировать electron:', e.message);
}

let stateChangeListener = null;
let settingsChangeListener = null;

const startLocalServerNode = () => {
  if (serverNodeProcess || tunnelNodeProcess) return;

  const scriptPath = path.join(__dirname, 'sync-server.bundle.js');
  if (!fs.existsSync(scriptPath)) {
    setServerStatus({ status: 'error', error: 'Сервер не установлен' });
    return;
  }

  // Запускаем сам сервер (node)
  console.log('[SYNC] Оригинальный путь сервера:', scriptPath);
  let runPath = scriptPath;
  if (scriptPath.includes('.asar')) {
    runPath = path.join(os.tmpdir(), 'yandex-sync-server.bundle.js');
    console.log('[SYNC] Сервер находится в asar-архиве. Извлекаем во временную папку:', runPath);
    try {
      const scriptCode = fs.readFileSync(scriptPath, 'utf8');
      fs.writeFileSync(runPath, scriptCode, 'utf8');
    } catch (err) {
      console.error('[SYNC] Ошибка извлечения сервера:', err);
      setServerStatus({ status: 'error', error: 'Не удалось извлечь сервер: ' + err.message });
      return;
    }
  }
  
  let envPaths = process.env.PATH || '';
  if (process.platform === 'darwin' || process.platform === 'linux') {
    envPaths = '/usr/local/bin:/opt/homebrew/bin:/opt/local/bin:' + envPaths;
    if (os.homedir()) {
      const nvmDir = path.join(os.homedir(), '.nvm', 'versions', 'node');
      if (fs.existsSync(nvmDir)) {
        try {
          const versions = fs.readdirSync(nvmDir);
          for (const ver of versions) {
            envPaths += `:${path.join(nvmDir, ver, 'bin')}`;
          }
        } catch(e) {}
      }
    }
  }
  const customEnv = { ...process.env, PATH: envPaths, PORT: '19091' };

  // Освобождаем порт 19091 перед запуском (убиваем зависшие процессы)
  try {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      const { execSync } = require('child_process');
      execSync('lsof -ti:19091 | xargs kill -9', { stdio: 'ignore' });
    }
  } catch (e) {}

  // Поиск исполняемого файла
  const findExe = (name) => {
    const paths = envPaths.split(path.delimiter);
    for (const p of paths) {
      const fullPath = path.join(p, name);
      if (fs.existsSync(fullPath)) return fullPath;
    }
    return name;
  };

  const nodeExe = process.platform === 'win32' ? 'node.exe' : findExe('node');
  const npxExe = process.platform === 'win32' ? 'npx.cmd' : findExe('npx');

  serverNodeProcess = spawn(nodeExe, [runPath], {
    env: customEnv,
    shell: false
  });

  serverNodeProcess.stdout.on('data', (data) => console.log('[SYNC SERVER STDOUT]', data.toString()));
  serverNodeProcess.stderr.on('data', (data) => console.error('[SYNC SERVER STDERR]', data.toString()));

  serverNodeProcess.on('error', (err) => {
    console.error('[SYNC SERVER ERROR]', err);
    setServerStatus({ status: 'error', error: 'Node.js сервер: ' + err.message });
  });

  serverNodeProcess.on('exit', (code) => {
    console.log('[SYNC SERVER EXIT] Код:', code);
    serverNodeProcess = null;
    stopLocalServerNode();
  });

  // Запускаем cloudflared
  setServerStatus({ status: 'starting' });
  console.log('[SYNC] Попытка запуска cloudflared туннеля...');

  tunnelNodeProcess = spawn(npxExe, ['cloudflared', 'tunnel', '--url', 'http://localhost:19091'], {
    env: customEnv,
    shell: process.platform === 'win32'
  });
  
  tunnelNodeProcess.stdout.on('data', (data) => console.log('[SYNC TUNNEL STDOUT]', data.toString()));
  tunnelNodeProcess.stderr.on('data', (data) => {
    const output = data.toString();
    console.log('[SYNC TUNNEL STDERR]', output);
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
      console.log('[SYNC] Найден URL туннеля:', match[0]);
      setServerStatus({ status: 'running', url: match[0] });
    }
  });

  tunnelNodeProcess.on('error', (err) => {
    console.error('[SYNC TUNNEL ERROR]', err);
    setServerStatus({ status: 'error', error: 'npx cloudflared: ' + err.message });
  });

  tunnelNodeProcess.on('exit', (code) => {
    console.log('[SYNC TUNNEL EXIT] Код:', code);
    tunnelNodeProcess = null;
    stopLocalServerNode();
  });
};

const stopLocalServerNode = () => {
  if (serverNodeProcess) {
    try {
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        exec(`taskkill /pid ${serverNodeProcess.pid} /T /F`);
      } else {
        serverNodeProcess.kill();
      }
    } catch (e) {}
    serverNodeProcess = null;
  }
  if (tunnelNodeProcess) {
    try {
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        exec(`taskkill /pid ${tunnelNodeProcess.pid} /T /F`);
      } else {
        tunnelNodeProcess.kill();
      }
    } catch (e) {}
    tunnelNodeProcess = null;
  }
  setServerStatus({ status: 'stopped' });
};

// При закрытии или перезагрузке окна (Electron) - убиваем процессы
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', stopLocalServerNode);
}

try {
  const fetchLyricsNode = (url) => {
    return new Promise((resolve, reject) => {
      const https = require('https');
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('JSON parse error'));
            }
          } else {
            reject(new Error('HTTP ' + res.statusCode));
          }
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  };

  const translateTextNode = (text, targetLang) => {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data);
              let translated = '';
              if (parsed && parsed[0]) {
                translated = parsed[0].map(item => item[0]).join('');
              }
              resolve(translated);
            } catch (e) {
              reject(new Error('JSON parse error'));
            }
          } else {
            reject(new Error('HTTP ' + res.statusCode));
          }
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  };

  if (contextBridge && typeof contextBridge.exposeInMainWorld === 'function') {
    contextBridge.exposeInMainWorld('__ymSyncBridge', {
      sendState: (state) => {
        if (stateChangeListener) stateChangeListener(state);
      },
      sendSettings: (settings) => {
        if (settingsChangeListener) settingsChangeListener(settings);
      },
      onJoinRoom: (callback) => {
        window.__ymSyncJoinRoomCallback = callback;
      },
      fetchLyrics: (url) => fetchLyricsNode(url),
      translateText: (text, targetLang) => translateTextNode(text, targetLang),
      lastFmGetToken: (apiKey, secret) => global.ScrobblerService.lastFmGetToken(apiKey, secret),
      lastFmGetSession: (token, apiKey, secret) => global.ScrobblerService.lastFmGetSession(token, apiKey, secret),
      listenBrainzValidateToken: (token) => global.ScrobblerService.listenBrainzValidateToken(token),
      sendScrobblerSettings: (settings) => {
        if (global.ScrobbleManager) global.ScrobbleManager.updateConfig(settings);
      },
      startLocalServer: (callback) => startLocalServerNode(callback),
      stopLocalServer: () => stopLocalServerNode(),
      onServerStatus: (callback) => {
        serverStatusCallback = callback;
        if (callback && lastServerStatus) {
          try { callback(lastServerStatus); } catch (e) {}
        }
      }
    });
  } else if (typeof window !== 'undefined') {
    window.__ymSyncBridge = {
      sendState: (state) => {
        if (stateChangeListener) stateChangeListener(state);
      },
      sendSettings: (settings) => {
        if (settingsChangeListener) settingsChangeListener(settings);
      },
      onJoinRoom: (callback) => {
        window.__ymSyncJoinRoomCallback = callback;
      },
      fetchLyrics: (url) => fetchLyricsNode(url),
      translateText: (text, targetLang) => translateTextNode(text, targetLang),
      lastFmGetToken: (apiKey, secret) => global.ScrobblerService.lastFmGetToken(apiKey, secret),
      lastFmGetSession: (token, apiKey, secret) => global.ScrobblerService.lastFmGetSession(token, apiKey, secret),
      listenBrainzValidateToken: (token) => global.ScrobblerService.listenBrainzValidateToken(token),
      sendScrobblerSettings: (settings) => {
        if (global.ScrobbleManager) global.ScrobbleManager.updateConfig(settings);
      },
      startLocalServer: (callback) => startLocalServerNode(callback),
      stopLocalServer: () => stopLocalServerNode(),
      onServerStatus: (callback) => {
        serverStatusCallback = callback;
        if (callback && lastServerStatus) {
          try { callback(lastServerStatus); } catch (e) {}
        }
      }
    };
  }
} catch (e) {
  console.warn('[SYNC] Не удалось зарегистрировать contextBridge:', e.message || e);
  try {
    if (typeof window !== 'undefined') {
      const translateTextNodeFallback = (text, targetLang) => {
        return new Promise((resolve, reject) => {
          const https = require('https');
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
          https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const parsed = JSON.parse(data);
                  let translated = '';
                  if (parsed && parsed[0]) {
                    translated = parsed[0].map(item => item[0]).join('');
                  }
                  resolve(translated);
                } catch (e) {
                  reject(new Error('JSON parse error'));
                }
              } else {
                reject(new Error('HTTP ' + res.statusCode));
              }
            });
          }).on('error', (err) => {
            reject(err);
          });
        });
      };

      window.__ymSyncBridge = {
        sendState: (state) => {
          if (stateChangeListener) stateChangeListener(state);
        },
        sendSettings: (settings) => {
          if (settingsChangeListener) settingsChangeListener(settings);
        },
        onJoinRoom: (callback) => {
          window.__ymSyncJoinRoomCallback = callback;
        },
        fetchLyrics: (url) => {
          return new Promise((resolve, reject) => {
            const https = require('https');
            https.get(url, (res) => {
              let data = '';
              res.on('data', (chunk) => { data += chunk; });
              res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                  try {
                    resolve(JSON.parse(data));
                  } catch (e) {
                    reject(new Error('JSON parse error'));
                  }
                } else {
                  reject(new Error('HTTP ' + res.statusCode));
                }
              });
            }).on('error', (err) => {
              reject(err);
            });
          });
        },
        translateText: (text, targetLang) => translateTextNodeFallback(text, targetLang),
        lastFmGetToken: (apiKey, secret) => global.ScrobblerService.lastFmGetToken(apiKey, secret),
        lastFmGetSession: (token, apiKey, secret) => global.ScrobblerService.lastFmGetSession(token, apiKey, secret),
        listenBrainzValidateToken: (token) => global.ScrobblerService.listenBrainzValidateToken(token),
        sendScrobblerSettings: (settings) => {
          if (global.ScrobbleManager) global.ScrobbleManager.updateConfig(settings);
        },
        startLocalServer: (callback) => startLocalServerNode(callback),
        stopLocalServer: () => stopLocalServerNode(),
        onServerStatus: (callback) => {
          serverStatusCallback = callback;
          if (callback && lastServerStatus) {
            try { callback(lastServerStatus); } catch (e) {}
          }
        }
      };
    }
  } catch (e2) {}
}

const DISCORD_CLIENT_ID = '1217562797999784007';
let discordRPC = null;
let discordRpcEnabled = true;
try {
  if (typeof localStorage !== 'undefined') {
    discordRpcEnabled = localStorage.getItem('ymDiscordRpcEnabled') !== 'false';
  }
} catch (e) {
  console.warn('[SYNC] Не удалось получить доступ к localStorage в preload:', e);
}
let lastDiscordTrackId = null;
let lastDiscordIsPause = null;
let lastDiscordPosition = 0;
let lastDiscordTimestamp = 0;
let lastDiscordRoom = null;
let lastDiscordQuality = null;
let lastDiscordCodec = null;
let localApiServer = null;
let currentRoom = null;
let currentServerUrl = null;
