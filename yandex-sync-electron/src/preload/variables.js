const net = require('net');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
let contextBridge = null;
try {
  contextBridge = require('electron').contextBridge;
} catch (e) {
  console.warn('[SYNC] Не удалось импортировать electron:', e.message);
}

let stateChangeListener = null;
let settingsChangeListener = null;

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
      translateText: (text, targetLang) => translateTextNode(text, targetLang)
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
      translateText: (text, targetLang) => translateTextNode(text, targetLang)
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
        translateText: (text, targetLang) => translateTextNodeFallback(text, targetLang)
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
