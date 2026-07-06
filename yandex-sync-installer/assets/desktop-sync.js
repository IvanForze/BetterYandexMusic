(function() {
  console.log("[SYNC] Yandex Music Sync (Electron Desktop) запущен!");

  if (typeof require !== 'undefined') {
    // ==========================================
    // PRELOAD NODE CONTEXT (Discord RPC & HTTP Server)
    // ==========================================
    // --- Component: preload/variables.js ---
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
        if (serverStatusCallback) serverStatusCallback({ status: 'error', error: 'Сервер не установлен' });
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
          if (serverStatusCallback) serverStatusCallback({ status: 'error', error: 'Не удалось извлечь сервер: ' + err.message });
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
        if (serverStatusCallback) serverStatusCallback({ status: 'error', error: 'Node.js сервер: ' + err.message });
      });
    
      serverNodeProcess.on('exit', (code) => {
        console.log('[SYNC SERVER EXIT] Код:', code);
        serverNodeProcess = null;
        stopLocalServerNode();
      });
    
      // Запускаем cloudflared
      if (serverStatusCallback) serverStatusCallback({ status: 'starting' });
      console.log('[SYNC] Попытка запуска cloudflared туннеля...');
    
      tunnelNodeProcess = spawn(npxExe, ['cloudflared', 'tunnel', '--url', 'http://localhost:19091'], {
        env: customEnv,
        shell: false
      });
      
      tunnelNodeProcess.stdout.on('data', (data) => console.log('[SYNC TUNNEL STDOUT]', data.toString()));
      tunnelNodeProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log('[SYNC TUNNEL STDERR]', output);
        const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match) {
          console.log('[SYNC] Найден URL туннеля:', match[0]);
          if (serverStatusCallback) serverStatusCallback({ status: 'running', url: match[0] });
        }
      });
    
      tunnelNodeProcess.on('error', (err) => {
        console.error('[SYNC TUNNEL ERROR]', err);
        if (serverStatusCallback) serverStatusCallback({ status: 'error', error: 'npx cloudflared: ' + err.message });
      });
    
      tunnelNodeProcess.on('exit', (code) => {
        console.log('[SYNC TUNNEL EXIT] Код:', code);
        tunnelNodeProcess = null;
        stopLocalServerNode();
      });
    };
    
    const stopLocalServerNode = () => {
      if (serverNodeProcess) {
        try { serverNodeProcess.kill(); } catch (e) {}
        serverNodeProcess = null;
      }
      if (tunnelNodeProcess) {
        try { tunnelNodeProcess.kill(); } catch (e) {}
        tunnelNodeProcess = null;
      }
      if (serverStatusCallback) serverStatusCallback({ status: 'stopped' });
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
          onServerStatus: (callback) => { serverStatusCallback = callback; }
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
          onServerStatus: (callback) => { serverStatusCallback = callback; }
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
            onServerStatus: (callback) => { serverStatusCallback = callback; }
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
    
    
    // --- Component: preload/discord.js ---
    function getDiscordIpcPath() {
      if (process.platform === 'win32') {
        return '\\\\.\\pipe\\discord-ipc-0';
      }
      const prefixes = [
        process.env.XDG_RUNTIME_DIR,
        process.env.TMPDIR,
        process.env.TMP,
        process.env.TEMP,
        '/tmp'
      ];
      for (const prefix of prefixes) {
        if (!prefix) continue;
        for (let i = 0; i < 10; i++) {
          const fullPath = path.join(prefix, `discord-ipc-${i}`);
          if (fs.existsSync(fullPath)) {
            return fullPath;
          }
        }
      }
      return null;
    }
    
    class DiscordRPC {
      constructor(clientId) {
        this.clientId = clientId;
        this.socket = null;
        this.isReady = false;
        this.reconnectTimer = null;
        this.currentActivity = null;
      }
    
      connect() {
        if (this.socket) {
          try { this.socket.destroy(); } catch (e) {}
          this.socket = null;
        }
        this.isReady = false;
    
        const ipcPath = getDiscordIpcPath();
        if (!ipcPath) {
          this.scheduleReconnect();
          return;
        }
    
        console.log(`[SYNC] Попытка подключения к Discord IPC по пути: ${ipcPath}`);
        this.socket = net.createConnection(ipcPath);
    
        this.socket.on('connect', () => {
          console.log('[SYNC] Подключено к Discord IPC!');
          this.sendHandshake();
        });
    
        this.socket.on('data', (data) => {
          this.handleData(data);
        });
    
        this.socket.on('error', (err) => {
          console.warn('[SYNC] Ошибка Discord IPC:', err.message);
        });
    
        this.socket.on('close', () => {
          console.log('[SYNC] Соединение с Discord IPC закрыто.');
          this.isReady = false;
          this.socket = null;
          this.scheduleReconnect();
        });
      }
    
      scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          if (discordRpcEnabled) {
            this.connect();
          }
        }, 15000);
      }
    
      sendFrame(op, payload) {
        if (!this.socket || this.socket.destroyed) return;
        
        const payloadStr = JSON.stringify(payload);
        const payloadLen = Buffer.byteLength(payloadStr);
        console.log(`[SYNC] Discord IPC: Отправляем фрейм. OP = ${op}, Payload =`, payload);
        
        const header = Buffer.alloc(8);
        header.writeInt32LE(op, 0);
        header.writeInt32LE(payloadLen, 4);
        
        try {
          this.socket.write(header);
          this.socket.write(payloadStr);
        } catch (err) {
          console.error('[SYNC] Ошибка отправки фрейма Discord IPC:', err);
        }
      }
    
      sendHandshake() {
        this.sendFrame(0, {
          v: 1,
          client_id: this.clientId
        });
      }
    
      handleData(data) {
        try {
          if (data.length < 8) return;
          const op = data.readInt32LE(0);
          const len = data.readInt32LE(4);
          const payloadStr = data.toString('utf8', 8, 8 + len);
          const payload = JSON.parse(payloadStr);
          console.log(`[SYNC] Discord IPC: Получен фрейм. OP = ${op}, Payload =`, payload);
    
          if (op === 1) {
            if (payload.evt === 'READY') {
              console.log('[SYNC] Discord RPC авторизован и готов!');
              this.isReady = true;
              if (this.currentActivity) {
                this.setActivity(this.currentActivity);
              }
            }
          }
        } catch (e) {
          console.error('[SYNC] Ошибка парсинга фрейма от Discord:', e);
        }
      }
    
      setActivity(activity) {
        console.log('[SYNC] Discord IPC: Запрос на установку активности:', activity);
        this.currentActivity = activity;
        if (!this.isReady) return;
    
        const payload = {
          cmd: 'SET_ACTIVITY',
          args: {
            pid: process.pid,
            activity: activity
          },
          nonce: Math.random().toString()
        };
    
        this.sendFrame(1, payload);
      }
    
      clearActivity() {
        this.currentActivity = null;
        if (!this.isReady) return;
        
        const payload = {
          cmd: 'SET_ACTIVITY',
          args: {
            pid: process.pid,
            activity: null
          },
          nonce: Math.random().toString()
        };
        
        this.sendFrame(1, payload);
      }
    
      destroy() {
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        if (this.socket) {
          try { this.socket.destroy(); } catch (e) {}
          this.socket = null;
        }
        this.isReady = false;
      }
    }
    
    function initDiscordRPC() {
      if (!discordRpcEnabled) {
        if (discordRPC) {
          discordRPC.destroy();
          discordRPC = null;
        }
        return;
      }
      if (!discordRPC) {
        discordRPC = new DiscordRPC(DISCORD_CLIENT_ID);
        discordRPC.connect();
      }
    }
    
    function updateDiscordPresencePreload(trackId, isPause, position, metadata) {
      if (!discordRpcEnabled) return;
      if (!discordRPC) {
        initDiscordRPC();
      }
      
      const now = Date.now();
      
      const trackChanged = trackId !== lastDiscordTrackId;
      const pauseChanged = isPause !== lastDiscordIsPause;
      const roomChanged = currentRoom !== lastDiscordRoom;
      const qualityChanged = metadata?.quality !== lastDiscordQuality;
      const codecChanged = metadata?.codec !== lastDiscordCodec;
      
      let seeked = false;
      if (!trackChanged && !isPause) {
        const elapsed = (now - lastDiscordTimestamp) / 1000;
        const expectedPos = lastDiscordPosition + elapsed;
        if (Math.abs(position - expectedPos) > 2.5) {
          seeked = true;
        }
      }
    
      if (!trackChanged && !pauseChanged && !seeked && !roomChanged && !qualityChanged && !codecChanged && discordRPC && discordRPC.currentActivity) {
        return;
      }
    
      lastDiscordTrackId = trackId;
      lastDiscordIsPause = isPause;
      lastDiscordPosition = position;
      lastDiscordTimestamp = now;
      lastDiscordRoom = currentRoom;
      lastDiscordQuality = metadata?.quality || null;
      lastDiscordCodec = metadata?.codec || null;
    
      if (!metadata) {
        if (discordRPC) discordRPC.clearActivity();
        return;
      }
    
      let qualityInfo = '';
      if (metadata.codec) {
        let codecStr = '';
        const codecLower = metadata.codec.toLowerCase();
        if (codecLower === 'flac' || codecLower === 'flac-mp4' || metadata.quality === 'lossless') {
          codecStr = 'FLAC';
        } else if (codecLower.includes('aac')) {
          codecStr = 'AAC';
        } else if (codecLower.includes('mp3')) {
          codecStr = 'MP3';
        } else {
          codecStr = metadata.codec.toUpperCase();
        }
    
        let bitrateStr = '';
        if (metadata.bitrate) {
          bitrateStr = ` (${metadata.bitrate} kbps)`;
        } else if (metadata.quality === 'lossless') {
          bitrateStr = ' (Lossless)';
        } else if (metadata.quality === 'hq') {
          bitrateStr = ' (HQ)';
        }
    
        qualityInfo = `${codecStr}${bitrateStr}`;
      }
    
      let stateText = qualityInfo ? `от ${metadata.artist} • ${qualityInfo}` : `от ${metadata.artist}`;
      if (isPause) {
        stateText = `[Пауза] ${stateText}`;
      }
    
      const activity = {
        details: metadata.title,
        state: stateText,
        type: 2, // 2 = Listening (Слушает)
        assets: {
          large_image: metadata.coverUrl,
          large_text: qualityInfo ? `${metadata.title} — ${metadata.artist} [${qualityInfo}]` : `${metadata.title} — ${metadata.artist}`
        }
      };
    
      if (currentRoom) {
        activity.assets.small_image = 'https://img.icons8.com/fluency/48/synchronize.png';
        activity.assets.small_text = `В синхронизации: ${currentRoom}`;
      }
    
      if (!isPause && metadata.durationMs > 0) {
        const startSec = Math.floor((now - Math.round(position * 1000)) / 1000);
        const endSec = Math.floor((now - Math.round(position * 1000) + metadata.durationMs) / 1000);
        activity.timestamps = {
          start: startSec,
          end: endSec
        };
      }
    
      const buttons = [];
      const defaultDomain = 'http://localhost:3000';
      let serverUrl = currentServerUrl || defaultDomain;
      
      if (!/^https?:\/\//i.test(serverUrl)) {
        serverUrl = 'http://' + serverUrl;
      }
      
      let baseDomain = serverUrl;
      if (!baseDomain.endsWith('/')) {
        baseDomain += '/';
      }
    
      if (currentRoom) {
        buttons.push({
          label: 'Слушать вместе',
          url: `${baseDomain}join?room=${currentRoom}&server=${encodeURIComponent(serverUrl)}`
        });
      } else {
        buttons.push({
          label: 'Хочу синхронизацию',
          url: baseDomain
        });
      }
      
      activity.buttons = buttons;
    
      if (discordRPC) discordRPC.setActivity(activity);
    }
    
    
    // --- Component: shared/md5.js ---
    /*
     * JavaScript MD5
     * https://github.com/blueimp/JavaScript-MD5
     *
     * Copyright 2011, Sebastian Tschan
     * https://blueimp.net
     *
     * Licensed under the MIT license:
     * https://opensource.org/licenses/MIT
     *
     * Based on
     * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
     * Digest Algorithm, as defined in RFC 1321.
     * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
     * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
     * Distributed under the BSD License
     * See http://pajhome.org.uk/crypt/md5 for more info.
     */
    
    /* global define */
    
    /* eslint-disable strict */
    
    ;(function ($) {
      'use strict'
    
      /**
       * Add integers, wrapping at 2^32.
       * This uses 16-bit operations internally to work around bugs in interpreters.
       *
       * @param {number} x First integer
       * @param {number} y Second integer
       * @returns {number} Sum
       */
      function safeAdd(x, y) {
        var lsw = (x & 0xffff) + (y & 0xffff)
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16)
        return (msw << 16) | (lsw & 0xffff)
      }
    
      /**
       * Bitwise rotate a 32-bit number to the left.
       *
       * @param {number} num 32-bit number
       * @param {number} cnt Rotation count
       * @returns {number} Rotated number
       */
      function bitRotateLeft(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt))
      }
    
      /**
       * Basic operation the algorithm uses.
       *
       * @param {number} q q
       * @param {number} a a
       * @param {number} b b
       * @param {number} x x
       * @param {number} s s
       * @param {number} t t
       * @returns {number} Result
       */
      function md5cmn(q, a, b, x, s, t) {
        return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b)
      }
      /**
       * Basic operation the algorithm uses.
       *
       * @param {number} a a
       * @param {number} b b
       * @param {number} c c
       * @param {number} d d
       * @param {number} x x
       * @param {number} s s
       * @param {number} t t
       * @returns {number} Result
       */
      function md5ff(a, b, c, d, x, s, t) {
        return md5cmn((b & c) | (~b & d), a, b, x, s, t)
      }
      /**
       * Basic operation the algorithm uses.
       *
       * @param {number} a a
       * @param {number} b b
       * @param {number} c c
       * @param {number} d d
       * @param {number} x x
       * @param {number} s s
       * @param {number} t t
       * @returns {number} Result
       */
      function md5gg(a, b, c, d, x, s, t) {
        return md5cmn((b & d) | (c & ~d), a, b, x, s, t)
      }
      /**
       * Basic operation the algorithm uses.
       *
       * @param {number} a a
       * @param {number} b b
       * @param {number} c c
       * @param {number} d d
       * @param {number} x x
       * @param {number} s s
       * @param {number} t t
       * @returns {number} Result
       */
      function md5hh(a, b, c, d, x, s, t) {
        return md5cmn(b ^ c ^ d, a, b, x, s, t)
      }
      /**
       * Basic operation the algorithm uses.
       *
       * @param {number} a a
       * @param {number} b b
       * @param {number} c c
       * @param {number} d d
       * @param {number} x x
       * @param {number} s s
       * @param {number} t t
       * @returns {number} Result
       */
      function md5ii(a, b, c, d, x, s, t) {
        return md5cmn(c ^ (b | ~d), a, b, x, s, t)
      }
    
      /**
       * Calculate the MD5 of an array of little-endian words, and a bit length.
       *
       * @param {Array} x Array of little-endian words
       * @param {number} len Bit length
       * @returns {Array<number>} MD5 Array
       */
      function binlMD5(x, len) {
        /* append padding */
        x[len >> 5] |= 0x80 << len % 32
        x[(((len + 64) >>> 9) << 4) + 14] = len
    
        var i
        var olda
        var oldb
        var oldc
        var oldd
        var a = 1732584193
        var b = -271733879
        var c = -1732584194
        var d = 271733878
    
        for (i = 0; i < x.length; i += 16) {
          olda = a
          oldb = b
          oldc = c
          oldd = d
    
          a = md5ff(a, b, c, d, x[i], 7, -680876936)
          d = md5ff(d, a, b, c, x[i + 1], 12, -389564586)
          c = md5ff(c, d, a, b, x[i + 2], 17, 606105819)
          b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330)
          a = md5ff(a, b, c, d, x[i + 4], 7, -176418897)
          d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426)
          c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341)
          b = md5ff(b, c, d, a, x[i + 7], 22, -45705983)
          a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416)
          d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417)
          c = md5ff(c, d, a, b, x[i + 10], 17, -42063)
          b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162)
          a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682)
          d = md5ff(d, a, b, c, x[i + 13], 12, -40341101)
          c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290)
          b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329)
    
          a = md5gg(a, b, c, d, x[i + 1], 5, -165796510)
          d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632)
          c = md5gg(c, d, a, b, x[i + 11], 14, 643717713)
          b = md5gg(b, c, d, a, x[i], 20, -373897302)
          a = md5gg(a, b, c, d, x[i + 5], 5, -701558691)
          d = md5gg(d, a, b, c, x[i + 10], 9, 38016083)
          c = md5gg(c, d, a, b, x[i + 15], 14, -660478335)
          b = md5gg(b, c, d, a, x[i + 4], 20, -405537848)
          a = md5gg(a, b, c, d, x[i + 9], 5, 568446438)
          d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690)
          c = md5gg(c, d, a, b, x[i + 3], 14, -187363961)
          b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501)
          a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467)
          d = md5gg(d, a, b, c, x[i + 2], 9, -51403784)
          c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473)
          b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734)
    
          a = md5hh(a, b, c, d, x[i + 5], 4, -378558)
          d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463)
          c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562)
          b = md5hh(b, c, d, a, x[i + 14], 23, -35309556)
          a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060)
          d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353)
          c = md5hh(c, d, a, b, x[i + 7], 16, -155497632)
          b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640)
          a = md5hh(a, b, c, d, x[i + 13], 4, 681279174)
          d = md5hh(d, a, b, c, x[i], 11, -358537222)
          c = md5hh(c, d, a, b, x[i + 3], 16, -722521979)
          b = md5hh(b, c, d, a, x[i + 6], 23, 76029189)
          a = md5hh(a, b, c, d, x[i + 9], 4, -640364487)
          d = md5hh(d, a, b, c, x[i + 12], 11, -421815835)
          c = md5hh(c, d, a, b, x[i + 15], 16, 530742520)
          b = md5hh(b, c, d, a, x[i + 2], 23, -995338651)
    
          a = md5ii(a, b, c, d, x[i], 6, -198630844)
          d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415)
          c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905)
          b = md5ii(b, c, d, a, x[i + 5], 21, -57434055)
          a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571)
          d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606)
          c = md5ii(c, d, a, b, x[i + 10], 15, -1051523)
          b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799)
          a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359)
          d = md5ii(d, a, b, c, x[i + 15], 10, -30611744)
          c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380)
          b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649)
          a = md5ii(a, b, c, d, x[i + 4], 6, -145523070)
          d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379)
          c = md5ii(c, d, a, b, x[i + 2], 15, 718787259)
          b = md5ii(b, c, d, a, x[i + 9], 21, -343485551)
    
          a = safeAdd(a, olda)
          b = safeAdd(b, oldb)
          c = safeAdd(c, oldc)
          d = safeAdd(d, oldd)
        }
        return [a, b, c, d]
      }
    
      /**
       * Convert an array of little-endian words to a string
       *
       * @param {Array<number>} input MD5 Array
       * @returns {string} MD5 string
       */
      function binl2rstr(input) {
        var i
        var output = ''
        var length32 = input.length * 32
        for (i = 0; i < length32; i += 8) {
          output += String.fromCharCode((input[i >> 5] >>> i % 32) & 0xff)
        }
        return output
      }
    
      /**
       * Convert a raw string to an array of little-endian words
       * Characters >255 have their high-byte silently ignored.
       *
       * @param {string} input Raw input string
       * @returns {Array<number>} Array of little-endian words
       */
      function rstr2binl(input) {
        var i
        var output = []
        output[(input.length >> 2) - 1] = undefined
        for (i = 0; i < output.length; i += 1) {
          output[i] = 0
        }
        var length8 = input.length * 8
        for (i = 0; i < length8; i += 8) {
          output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << i % 32
        }
        return output
      }
    
      /**
       * Calculate the MD5 of a raw string
       *
       * @param {string} s Input string
       * @returns {string} Raw MD5 string
       */
      function rstrMD5(s) {
        return binl2rstr(binlMD5(rstr2binl(s), s.length * 8))
      }
    
      /**
       * Calculates the HMAC-MD5 of a key and some data (raw strings)
       *
       * @param {string} key HMAC key
       * @param {string} data Raw input string
       * @returns {string} Raw MD5 string
       */
      function rstrHMACMD5(key, data) {
        var i
        var bkey = rstr2binl(key)
        var ipad = []
        var opad = []
        var hash
        ipad[15] = opad[15] = undefined
        if (bkey.length > 16) {
          bkey = binlMD5(bkey, key.length * 8)
        }
        for (i = 0; i < 16; i += 1) {
          ipad[i] = bkey[i] ^ 0x36363636
          opad[i] = bkey[i] ^ 0x5c5c5c5c
        }
        hash = binlMD5(ipad.concat(rstr2binl(data)), 512 + data.length * 8)
        return binl2rstr(binlMD5(opad.concat(hash), 512 + 128))
      }
    
      /**
       * Convert a raw string to a hex string
       *
       * @param {string} input Raw input string
       * @returns {string} Hex encoded string
       */
      function rstr2hex(input) {
        var hexTab = '0123456789abcdef'
        var output = ''
        var x
        var i
        for (i = 0; i < input.length; i += 1) {
          x = input.charCodeAt(i)
          output += hexTab.charAt((x >>> 4) & 0x0f) + hexTab.charAt(x & 0x0f)
        }
        return output
      }
    
      /**
       * Encode a string as UTF-8
       *
       * @param {string} input Input string
       * @returns {string} UTF8 string
       */
      function str2rstrUTF8(input) {
        return unescape(encodeURIComponent(input))
      }
    
      /**
       * Encodes input string as raw MD5 string
       *
       * @param {string} s Input string
       * @returns {string} Raw MD5 string
       */
      function rawMD5(s) {
        return rstrMD5(str2rstrUTF8(s))
      }
      /**
       * Encodes input string as Hex encoded string
       *
       * @param {string} s Input string
       * @returns {string} Hex encoded string
       */
      function hexMD5(s) {
        return rstr2hex(rawMD5(s))
      }
      /**
       * Calculates the raw HMAC-MD5 for the given key and data
       *
       * @param {string} k HMAC key
       * @param {string} d Input string
       * @returns {string} Raw MD5 string
       */
      function rawHMACMD5(k, d) {
        return rstrHMACMD5(str2rstrUTF8(k), str2rstrUTF8(d))
      }
      /**
       * Calculates the Hex encoded HMAC-MD5 for the given key and data
       *
       * @param {string} k HMAC key
       * @param {string} d Input string
       * @returns {string} Raw MD5 string
       */
      function hexHMACMD5(k, d) {
        return rstr2hex(rawHMACMD5(k, d))
      }
    
      /**
       * Calculates MD5 value for a given string.
       * If a key is provided, calculates the HMAC-MD5 value.
       * Returns a Hex encoded string unless the raw argument is given.
       *
       * @param {string} string Input string
       * @param {string} [key] HMAC key
       * @param {boolean} [raw] Raw output switch
       * @returns {string} MD5 output
       */
      function md5(string, key, raw) {
        if (!key) {
          if (!raw) {
            return hexMD5(string)
          }
          return rawMD5(string)
        }
        if (!raw) {
          return hexHMACMD5(key, string)
        }
        return rawHMACMD5(key, string)
      }
    
      if (typeof define === 'function' && define.amd) {
        define(function () {
          return md5
        })
      } else if (typeof module === 'object' && module.exports) {
        module.exports = md5
      } else {
        $.md5 = md5
      }
      if (typeof window !== 'undefined') window.md5 = md5;
      if (typeof global !== 'undefined') global.md5 = md5;
    })(this)
    
    
    // --- Component: shared/rzt-api.js ---
    // ==========================================
    // RISA ZA TVORCHESTVO (RZT) API
    // ==========================================
    
    const RztAPI = {
      _pendingRequests: {},
      _initialized: false,
    
      _init() {
        if (this._initialized) return;
        this._initialized = true;
    
        if (typeof window !== 'undefined') {
          window.addEventListener('message', (event) => {
            if (!event.data || !event.data.__ym_sc_bridge_response) return;
            const { requestId, response } = event.data;
            const pending = this._pendingRequests[requestId];
            if (pending) {
              delete this._pendingRequests[requestId];
              if (response && response.ok) {
                pending.resolve(response.data || response.result); // supports data or result keys
              } else {
                pending.reject(new Error(response && response.error ? response.error : 'Unknown bridge error'));
              }
            }
          });
        }
      },
    
      _sendToBridge(type, payload) {
        this._init();
        return new Promise((resolve, reject) => {
          const requestId = `rzt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          this._pendingRequests[requestId] = { resolve, reject };
    
          // Timeout safety
          setTimeout(() => {
            if (this._pendingRequests[requestId]) {
              delete this._pendingRequests[requestId];
              reject(new Error('RZT bridge request timed out'));
            }
          }, 15000);
    
          window.postMessage({
            __ym_sc_bridge: true,
            requestId,
            type,
            payload
          }, '*');
        });
      },
    
      normalizeText(text) {
        if (!text) return '';
        return text.toLowerCase()
          .replace(/[\u200b-\u200d\uFEFF]/g, '') // Strip zero-width spaces/BOM
          .replace(/[^a-zа-я0-9\s-_]/gi, '')   // Keep only letters, digits, spaces, hyphens, underscores
          .replace(/\s+/g, ' ')
          .trim();
      },
    
      hasArtistMatch(chunk, artistName) {
        if (!artistName) return true;
        const cleanArtist = this.normalizeText(artistName);
        const cleanChunk = this.normalizeText(chunk);
        
        if (cleanChunk.includes(cleanArtist)) return true;
        
        // Split by common artist separators and check each one
        const artists = artistName.split(/(?:feat\.?|feat|&|,|\bи\b)/i).map(a => this.normalizeText(a)).filter(Boolean);
        for (const a of artists) {
          if (cleanChunk.includes(a)) return true;
        }
        
        return false;
      },
    
      parseScoresFromHtml(html, trackTitle, artistName) {
        if (!html) return null;
        const titleClean = this.normalizeText(trackTitle);
        
        // 1. Gather all occurrence positions of the track title
        const indices = [];
        let idx = html.toLowerCase().indexOf(titleClean);
        while (idx !== -1) {
          indices.push(idx);
          idx = html.toLowerCase().indexOf(titleClean, idx + 1);
        }
        
        // Fallback 1: try title without bracketed info if no matches found
        if (indices.length === 0) {
          const simpleTitle = this.normalizeText(trackTitle.split(/[(\[]/)[0]);
          if (simpleTitle && simpleTitle !== titleClean) {
            let idx2 = html.toLowerCase().indexOf(simpleTitle);
            while (idx2 !== -1) {
              indices.push(idx2);
              idx2 = html.toLowerCase().indexOf(simpleTitle, idx2 + 1);
            }
          }
        }
    
        // 2. Scan occurrences and look for the one matching the artist
        for (const pos of indices) {
          const chunk = html.slice(pos, pos + 3000);
          if (this.hasArtistMatch(chunk, artistName)) {
            const regex = /class=\\?"[^"]*inline-flex size-7[^"]*rounded-full[^"]*\\?"[^>]*>([0-9]+)<\/div>/g;
            const matches = [...chunk.matchAll(regex)].map(m => parseInt(m[1], 10));
            if (matches.length > 0) {
              return {
                flomaster: matches[2] || null,
                withReviews: matches[0] || null,
                withoutReviews: matches[1] || null
              };
            }
          }
        }
    
        // Fallback 2: if no matches had the artist, parse ratings from the first track title match
        if (indices.length > 0) {
          const chunk = html.slice(indices[0], indices[0] + 3000);
          const regex = /class=\\?"[^"]*inline-flex size-7[^"]*rounded-full[^"]*\\?"[^>]*>([0-9]+)<\/div>/g;
          const matches = [...chunk.matchAll(regex)].map(m => parseInt(m[1], 10));
          if (matches.length > 0) {
            return {
              flomaster: matches[2] || null,
              withReviews: matches[0] || null,
              withoutReviews: matches[1] || null
            };
          }
        }
    
        // Fallback 3: try the first track link in the entire search results page
        const fallbackRegex = /href=\\?"\/track\/([^"]+)\\?"|href=\\?"\/release\/([^"]+)\\?"/i;
        const match = html.match(fallbackRegex);
        if (match) {
          const pos = html.indexOf(match[0]);
          const chunk = html.slice(pos, pos + 3000);
          const regex = /class=\\?"[^"]*inline-flex size-7[^"]*rounded-full[^"]*\\?"[^>]*>([0-9]+)<\/div>/g;
          const matches = [...chunk.matchAll(regex)].map(m => parseInt(m[1], 10));
          if (matches.length > 0) {
            return {
              flomaster: matches[2] || null,
              withReviews: matches[0] || null,
              withoutReviews: matches[1] || null
            };
          }
        }
    
        return null;
      },
    
      async getTrackRatings(artist, title) {
        try {
          return await this._sendToBridge('RZT_GET_RATINGS', { artist, title });
        } catch (err) {
          console.error('[RZT] Error getting track ratings:', err);
          return null;
        }
      }
    };
    
    if (typeof window !== 'undefined') {
      window.RztAPI = RztAPI;
    }
    if (typeof module !== 'undefined') {
      module.exports = RztAPI;
    }
    
    
    // --- Component: shared/scrobbler.js ---
    // Дефолтные ключи Last.fm (могут быть переопределены пользователем в настройках)
    const LASTFM_DEFAULT_API_KEY = '4d12b2b376510476bfdae3e2c62c96c4';
    const LASTFM_DEFAULT_SECRET = '78e24c2a5e985b67484df24cd76bf349';
    
    function md5Hash(str) {
      if (typeof window !== 'undefined' && window.md5) return window.md5(str);
      if (typeof global !== 'undefined' && global.md5) return global.md5(str);
      throw new Error('MD5 function not found. Ensure md5.js is loaded.');
    }
    
    async function makeHttpRequest(url, options = {}, body = null) {
      const reqOptions = {
        method: options.method || 'GET',
        headers: options.headers || {}
      };
    
      if (body) {
        reqOptions.body = body;
      }
    
      const response = await fetch(url, reqOptions);
      const text = await response.text();
    
      if (response.ok) {
        try {
          return JSON.parse(text);
        } catch (e) {
          return text;
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
    }
    
    // Генерирует подпись api_sig для Last.fm
    function generateLastFmSignature(params, secret) {
      const sortedKeys = Object.keys(params).sort();
      let signatureStr = '';
      for (const key of sortedKeys) {
        if (key !== 'format') {
          signatureStr += key + params[key];
        }
      }
      signatureStr += secret;
      return md5Hash(signatureStr);
    }
    
    class ScrobblerService {
      static getSettings() {
        let settings = {
          lastfmEnabled: false,
          lastfmApiKey: '',
          lastfmSecret: '',
          lastfmSessionKey: '',
          lastfmUsername: '',
          listenbrainzEnabled: false,
          listenbrainzToken: '',
          listenbrainzUsername: ''
        };
        return settings;
      }
    
      // Получить авторизационный токен Last.fm
      static async lastFmGetToken(customApiKey, customSecret) {
        const apiKey = customApiKey || LASTFM_DEFAULT_API_KEY;
        const secret = customSecret || LASTFM_DEFAULT_SECRET;
    
        const params = {
          api_key: apiKey,
          method: 'auth.getToken'
        };
        const apiSig = generateLastFmSignature(params, secret);
        const url = `https://ws.audioscrobbler.com/2.0/?method=auth.getToken&api_key=${apiKey}&api_sig=${apiSig}&format=json`;
        const data = await makeHttpRequest(url);
        return data.token;
      }
    
      // Получить Session Key по токену Last.fm
      static async lastFmGetSession(token, customApiKey, customSecret) {
        const apiKey = customApiKey || LASTFM_DEFAULT_API_KEY;
        const secret = customSecret || LASTFM_DEFAULT_SECRET;
        
        const params = {
          api_key: apiKey,
          method: 'auth.getSession',
          token: token
        };
        const apiSig = generateLastFmSignature(params, secret);
        
        const url = `https://ws.audioscrobbler.com/2.0/?method=auth.getSession&api_key=${apiKey}&token=${token}&api_sig=${apiSig}&format=json`;
        const data = await makeHttpRequest(url);
        if (data.session) {
          return {
            sessionKey: data.session.key,
            username: data.session.name
          };
        }
        throw new Error('Не удалось получить сессию Last.fm');
      }
    
      // Обновить "Now Playing" в Last.fm
      static async lastFmNowPlaying(trackData, config) {
        if (!config.lastfmEnabled || !config.lastfmSessionKey) return;
        
        const apiKey = config.lastfmApiKey || LASTFM_DEFAULT_API_KEY;
        const secret = config.lastfmSecret || LASTFM_DEFAULT_SECRET;
    
        const params = {
          api_key: apiKey,
          artist: trackData.artist,
          track: trackData.title,
          method: 'track.updateNowPlaying',
          sk: config.lastfmSessionKey
        };
        if (trackData.album) params.album = trackData.album;
        if (trackData.durationMs) params.duration = Math.round(trackData.durationMs / 1000);
    
        const apiSig = generateLastFmSignature(params, secret);
        params.api_sig = apiSig;
        params.format = 'json';
    
        const body = new URLSearchParams(params).toString();
        const url = 'https://ws.audioscrobbler.com/2.0/';
        
        return makeHttpRequest(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }, body);
      }
    
      // Заскроблить в Last.fm
      static async lastFmScrobble(trackData, config) {
        if (!config.lastfmEnabled || !config.lastfmSessionKey) return;
    
        const apiKey = config.lastfmApiKey || LASTFM_DEFAULT_API_KEY;
        const secret = config.lastfmSecret || LASTFM_DEFAULT_SECRET;
        const timestamp = Math.floor(Date.now() / 1000);
    
        const params = {
          api_key: apiKey,
          artist: trackData.artist,
          track: trackData.title,
          timestamp: timestamp,
          method: 'track.scrobble',
          sk: config.lastfmSessionKey
        };
        if (trackData.album) params.album = trackData.album;
        if (trackData.durationMs) params.duration = Math.round(trackData.durationMs / 1000);
    
        const apiSig = generateLastFmSignature(params, secret);
        params.api_sig = apiSig;
        params.format = 'json';
    
        const body = new URLSearchParams(params).toString();
        const url = 'https://ws.audioscrobbler.com/2.0/';
    
        return makeHttpRequest(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }, body);
      }
    
      // Отправка Now Playing / Scrobble в ListenBrainz
      static async listenBrainzSubmit(trackData, config, listenType) {
        if (!config.listenbrainzEnabled || !config.listenbrainzToken) return;
    
        const timestamp = Math.floor(Date.now() / 1000);
        const payload = [
          {
            listened_at: listenType === 'scrobble' ? timestamp : undefined,
            track_metadata: {
              artist_name: trackData.artist,
              track_name: trackData.title,
              release_name: trackData.album || undefined,
              additional_info: {
                media_player: 'Yandex Music Sync Client',
                duration_ms: trackData.durationMs || undefined
              }
            }
          }
        ];
    
        console.log(`[LISTENBRAINZ] Отправка статуса '${listenType}' для: ${trackData.artist} - ${trackData.title}`);
    
        const body = JSON.stringify({
          listen_type: listenType, // 'playing_now' или 'single' (для скроблинга)
          payload: payload
        });
    
        const url = 'https://api.listenbrainz.org/1/submit-listens';
        
        return makeHttpRequest(url, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${config.listenbrainzToken}`,
            'Content-Type': 'application/json'
          }
        }, body).then(res => {
          console.log(`[LISTENBRAINZ] Успешно отправлен статус '${listenType}'`);
          return res;
        });
      }
    
      // Проверить токен ListenBrainz и получить имя пользователя
      static async listenBrainzValidateToken(token) {
        const url = 'https://api.listenbrainz.org/1/validate-token';
        const data = await makeHttpRequest(url, {
          headers: {
            'Authorization': `Token ${token}`
          }
        });
        if (data.valid === true) {
          return data.user_name;
        }
        throw new Error('Недействительный токен ListenBrainz');
      }
    }
    
    // Экспортируем в preload контекст
    window.ScrobblerService = ScrobblerService;
    
    class ScrobbleManager {
      constructor() {
        this.currentTrackId = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.playtimeMs = 0;
        this.lastTimestamp = 0;
        this.nowPlayingSent = false;
        this.scrobbled = false;
        
        // Дефолтные настройки
        this.config = {
          lastfmEnabled: false,
          lastfmApiKey: '',
          lastfmSecret: '',
          lastfmSessionKey: '',
          lastfmUsername: '',
          listenbrainzEnabled: false,
          listenbrainzToken: '',
          listenbrainzUsername: ''
        };
      }
    
      updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('[SCROBBLER] Конфигурация обновлена:', {
          lastfmEnabled: this.config.lastfmEnabled,
          lastfmUsername: this.config.lastfmUsername,
          listenbrainzEnabled: this.config.listenbrainzEnabled,
          listenbrainzUsername: this.config.listenbrainzUsername
        });
      }
    
      onStateChange(trackId, isPause, position, metadata) {
        if (!trackId || !metadata) {
          this.reset();
          return;
        }
    
        const trackChanged = trackId !== this.currentTrackId;
    
        if (trackChanged) {
          // Пытаемся заскроблить предыдущий трек перед переключением, если порог был достигнут
          this.checkAndScrobble();
    
          console.log('[SCROBBLER] Обнаружена смена трека:', metadata.artist, '-', metadata.title);
          
          const apiObj = typeof RztAPI !== 'undefined' ? RztAPI : (typeof window !== 'undefined' ? window.RztAPI : null);
          if (apiObj) {
            apiObj.getTrackRatings(metadata.artist, metadata.title)
              .then(ratings => {
                if (ratings) {
                  console.log(`[RZT] Оценки для "${metadata.artist} - ${metadata.title}": ` +
                    `Фломастер (РЗТ): ${ratings.flomaster !== null ? ratings.flomaster : '—'} | ` +
                    `Сайт (с рецензиями): ${ratings.withReviews !== null ? ratings.withReviews : '—'} | ` +
                    `Сайт (без рецензий): ${ratings.withoutReviews !== null ? ratings.withoutReviews : '—'}`
                  );
                } else {
                  console.log(`[RZT] Оценки для "${metadata.artist} - ${metadata.title}" не найдены (возможно, релиз не оценен)`);
                }
              })
              .catch(err => {
                console.error('[RZT] Ошибка получения оценок:', err.message);
              });
          }
    
          this.currentTrackId = trackId;
          this.currentTrack = {
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album || '',
            durationMs: metadata.durationMs || 0
          };
          this.isPlaying = !isPause;
          this.playtimeMs = 0;
          this.lastTimestamp = Date.now();
          this.nowPlayingSent = false;
          this.scrobbled = false;
        } else {
          const now = Date.now();
          if (this.isPlaying) {
            const delta = now - this.lastTimestamp;
            // Предохранитель от больших скачков во времени
            if (delta > 0 && delta < 5000) {
              this.playtimeMs += delta;
            }
          }
          this.isPlaying = !isPause;
          this.lastTimestamp = now;
        }
    
        // Отправляем "Слушает сейчас" после 2 секунд чистого воспроизведения
        if (!this.nowPlayingSent && this.playtimeMs > 2000) {
          this.sendNowPlaying();
        }
    
        // Проверяем условия для скроблинга
        this.checkAndScrobble();
      }
    
      reset() {
        this.checkAndScrobble();
        this.currentTrackId = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.playtimeMs = 0;
        this.lastTimestamp = 0;
        this.nowPlayingSent = false;
        this.scrobbled = false;
      }
    
      sendNowPlaying() {
        if (!this.currentTrack) return;
        this.nowPlayingSent = true;
    
        console.log('[SCROBBLER] Отправка статуса Now Playing для:', this.currentTrack.artist, '-', this.currentTrack.title);
    
        if (this.config.lastfmEnabled && this.config.lastfmSessionKey) {
          ScrobblerService.lastFmNowPlaying(this.currentTrack, this.config).catch(err => {
            console.error('[SCROBBLER] Ошибка Last.fm Now Playing:', err.message);
          });
        }
    
        if (this.config.listenbrainzEnabled && this.config.listenbrainzToken) {
          ScrobblerService.listenBrainzSubmit(this.currentTrack, this.config, 'playing_now').catch(err => {
            console.error('[SCROBBLER] Ошибка ListenBrainz Now Playing:', err.message);
          });
        }
      }
    
      checkAndScrobble() {
        if (!this.currentTrack || this.scrobbled) return;
    
        // Условия скробблинга Last.fm / ListenBrainz:
        // 1. Трек играл не менее 30 секунд.
        // 2. Прослушано 50% длины трека ИЛИ 4 минуты (240 секунд).
        const durationMs = this.currentTrack.durationMs || 180000; // По умолчанию 3 минуты, если неизвестно
        const playtimeSec = this.playtimeMs / 1000;
        const durationSec = durationMs / 1000;
        const thresholdSec = Math.min(durationSec / 2, 240);
    
        if (playtimeSec >= 30 && playtimeSec >= thresholdSec) {
          this.scrobbled = true;
          console.log(`[SCROBBLER] Условия скроблинга выполнены (время: ${Math.round(playtimeSec)}с, порог: ${Math.round(thresholdSec)}с). Отправляем скробл.`);
    
          if (this.config.lastfmEnabled && this.config.lastfmSessionKey) {
            ScrobblerService.lastFmScrobble(this.currentTrack, this.config).then(() => {
              console.log('[SCROBBLER] Last.fm Scrobble выполнен успешно');
            }).catch(err => {
              console.error('[SCROBBLER] Ошибка Last.fm Scrobble:', err.message);
            });
          }
    
          if (this.config.listenbrainzEnabled && this.config.listenbrainzToken) {
            ScrobblerService.listenBrainzSubmit(this.currentTrack, this.config, 'scrobble').then(() => {
              console.log('[SCROBBLER] ListenBrainz Scrobble выполнен успешно');
            }).catch(err => {
              console.error('[SCROBBLER] Ошибка ListenBrainz Scrobble:', err.message);
            });
          }
        }
      }
    }
    
    window.ScrobbleManager = new ScrobbleManager();
    
    if (typeof module !== 'undefined') {
      module.exports = {
        ScrobblerService,
        ScrobbleManager: window.ScrobbleManager
      };
    }
    
    
    
    // --- Component: preload/api-server.js ---
    function startLocalApiServer() {
      if (localApiServer) return;
      
      try {
        localApiServer = http.createServer((req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
          if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
          }
    
          const urlObj = new URL(req.url, `http://${req.headers.host}`);
          if (urlObj.pathname === '/join') {
            const room = urlObj.searchParams.get('room');
            let server = urlObj.searchParams.get('server') || 'http://localhost:3000';
    
            const isRoomValid = typeof room === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(room);
            const isServerValid = typeof server === 'string' && /^https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9@:%._\+~#=]{1,256}(\:[0-9]{1,5})?(\/.*)?$/.test(server);
    
            if (!isRoomValid || !isServerValid) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Неверные параметры комнаты или сервера' }));
              return;
            }
    
            console.log(`[SYNC] Получена внешняя команда на подключение: комната=${room}, сервер=${server}`);
            
            if (window.__ymSyncJoinRoomCallback) {
              window.__ymSyncJoinRoomCallback({ room, server });
            } else if (typeof window !== 'undefined') {
              window.postMessage({
                type: 'YM_SYNC_JOIN_ROOM',
                room: room,
                server: server
              }, '*');
            }
    
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: `Подключение к комнате ${room} запущено` }));
            return;
          }
    
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Не найдено' }));
        });
    
        localApiServer.listen(19090, '127.0.0.1', () => {
          console.log('[SYNC] Локальный API сервер запущен на http://127.0.0.1:19090');
        });
    
        localApiServer.on('error', (err) => {
          console.error('[SYNC] Ошибка запуска локального API сервера:', err.message || err);
          localApiServer = null;
        });
      } catch (err) {
        console.error('[SYNC] Не удалось запустить локальный API сервер:', err);
      }
    }
    
    
    // --- Component: shared/soundcloud-import.js ---
    // ==========================================
    // SOUNDCLOUD IMPORT UTILITIES
    // Shareable functions for downloading tracks and uploading to Yandex Music loader
    // ==========================================
    
    // --- ID3v2.3 TAG WRITER HELPERS ---
    
    function stringToUtf16leWithBom(str) {
      const buf = new ArrayBuffer(2 + str.length * 2);
      const uint8 = new Uint8Array(buf);
      uint8[0] = 0xFF;
      uint8[1] = 0xFE;
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        uint8[2 + i * 2] = code & 0xFF;
        uint8[2 + i * 2 + 1] = (code >> 8) & 0xFF;
      }
      return uint8;
    }
    
    function encodeUint32(val) {
      return [
        (val >> 24) & 0xFF,
        (val >> 16) & 0xFF,
        (val >> 8) & 0xFF,
        val & 0xFF
      ];
    }
    
    function encodeSynchsafe(size) {
      return [
        (size >> 21) & 0x7F,
        (size >> 14) & 0x7F,
        (size >> 7) & 0x7F,
        size & 0x7F
      ];
    }
    
    function makeTextFrame(id, text) {
      const utf16Data = stringToUtf16leWithBom(text);
      const content = new Uint8Array(1 + utf16Data.length);
      content[0] = 1; // UTF-16 with BOM
      content.set(utf16Data, 1);
    
      const header = new Uint8Array(10);
      for (let i = 0; i < 4; i++) {
        header[i] = id.charCodeAt(i);
      }
      header.set(encodeUint32(content.length), 4);
      header[8] = 0;
      header[9] = 0;
    
      const frame = new Uint8Array(header.length + content.length);
      frame.set(header, 0);
      frame.set(content, header.length);
      return frame;
    }
    
    function makeApicFrame(imageBytes, mimeType = 'image/jpeg') {
      const mimeBytes = new TextEncoder().encode(mimeType);
      const contentHeaderSize = 1 + mimeBytes.length + 1 + 1 + 1; // encoding + mime + null + type + desc_null
      const contentSize = contentHeaderSize + imageBytes.length;
    
      const content = new Uint8Array(contentSize);
      let offset = 0;
      content[offset++] = 0; // ISO-8859-1 encoding for MIME/Description
      content.set(mimeBytes, offset);
      offset += mimeBytes.length;
      content[offset++] = 0; // null termination for MIME
      content[offset++] = 3; // Front cover
      content[offset++] = 0; // Empty description, null-terminated
    
      content.set(imageBytes, offset);
    
      const header = new Uint8Array(10);
      const id = 'APIC';
      for (let i = 0; i < 4; i++) {
        header[i] = id.charCodeAt(i);
      }
      header.set(encodeUint32(content.length), 4);
      header[8] = 0;
      header[9] = 0;
    
      const frame = new Uint8Array(header.length + content.length);
      frame.set(header, 0);
      frame.set(content, header.length);
      return frame;
    }
    
    function generateId3v23Tag(title, artist, imageBytes, mimeType) {
      const frames = [];
      if (title) frames.push(makeTextFrame('TIT2', title));
      if (artist) frames.push(makeTextFrame('TPE1', artist));
      if (imageBytes && imageBytes.length > 0) {
        frames.push(makeApicFrame(imageBytes, mimeType));
      }
    
      let totalSize = 0;
      for (const frame of frames) {
        totalSize += frame.length;
      }
    
      const header = new Uint8Array(10);
      header[0] = 0x49; // 'I'
      header[1] = 0x44; // 'D'
      header[2] = 0x33; // '3'
      header[3] = 3;    // version 2.3
      header[4] = 0;    // revision 0
      header[5] = 0;    // flags
    
      header.set(encodeSynchsafe(totalSize), 6);
    
      const tag = new Uint8Array(10 + totalSize);
      tag.set(header, 0);
      let offset = 10;
      for (const frame of frames) {
        tag.set(frame, offset);
        offset += frame.length;
      }
      return tag;
    }
    
    // --- SHAREABLE UPLOAD FUNCTION ---
    
    async function handleSoundCloudUpload(payload) {
      console.log('[SOUNDCLOUD IMPORT] Starting SoundCloud to Yandex upload. Target:', payload.postTarget);
      
      const response = await fetch(payload.streamUrl, { credentials: 'omit' });
      if (!response.ok) throw new Error(`Failed to download SC stream: ${response.status}`);
      const rawBlob = await response.blob();
      
      // Fetch cover art image if URL is provided
      let imageBytes = null;
      let mimeType = 'image/jpeg';
      if (payload.artworkUrl) {
        try {
          const rawArtUrl = payload.artworkUrl;
          // Prefer high-quality artwork URL (500x500)
          const artUrl = rawArtUrl.replace('-large', '-t500x500');
          console.log('[SOUNDCLOUD IMPORT] Downloading cover art from:', artUrl);
          const imgRes = await fetch(artUrl, { credentials: 'omit' });
          if (imgRes.ok) {
            const blob = await imgRes.blob();
            imageBytes = new Uint8Array(await blob.arrayBuffer());
            mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
            console.log('[SOUNDCLOUD IMPORT] Downloaded cover art. Size:', imageBytes.length, 'MIME:', mimeType);
          }
        } catch (imgErr) {
          console.warn('[SOUNDCLOUD IMPORT] Failed to download cover art:', imgErr);
        }
      }
    
      // Generate ID3v2.3 tag and prepend it to the downloaded MP3 bytes
      const rawArrayBuffer = await rawBlob.arrayBuffer();
      const rawBytes = new Uint8Array(rawArrayBuffer);
      const id3Tag = generateId3v23Tag(payload.title, payload.artist, imageBytes, mimeType);
    
      const combinedBytes = new Uint8Array(id3Tag.length + rawBytes.length);
      combinedBytes.set(id3Tag, 0);
      combinedBytes.set(rawBytes, id3Tag.length);
    
      const mp3Blob = new Blob([combinedBytes], { type: 'audio/mpeg' });
      console.log('[SOUNDCLOUD IMPORT] Prepended ID3v2.3 tag. Total audio size:', mp3Blob.size);
    
      const cleanPostTarget = payload.postTarget.replace(':443/', '/');
      const formData = new FormData();
      const file = new File([mp3Blob], payload.filename, { type: 'audio/mpeg' });
      formData.append('file', file);
    
      let uploadResult = null;
      let uploadError = null;
      const maxRetries = 3;
    
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[SOUNDCLOUD IMPORT] Upload attempt ${attempt} of ${maxRetries} to:`, cleanPostTarget);
          const uploadRes = await fetch(cleanPostTarget, {
            method: 'POST',
            body: formData,
            credentials: 'omit'
          });
    
          if (uploadRes.status !== 200 && uploadRes.status !== 201) {
            throw new Error(`Yandex upload returned HTTP ${uploadRes.status}`);
          }
    
          let parsed = { result: 'CREATED' };
          try {
            const text = await uploadRes.text();
            if (text) {
              const obj = JSON.parse(text);
              if (obj && typeof obj === 'object') {
                parsed = { ...parsed, ...obj };
              }
            }
          } catch (e) {
            console.warn('[SOUNDCLOUD IMPORT] Failed to parse upload response as JSON:', e);
          }
    
          uploadResult = parsed;
          uploadError = null;
          break; // Success, exit retry loop
        } catch (err) {
          uploadError = err;
          console.warn(`[SOUNDCLOUD IMPORT] Upload attempt ${attempt} failed:`, err);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    
      if (uploadError) {
        console.warn('[SOUNDCLOUD IMPORT] All upload attempts failed or connection reset, proceeding to check if registration works:', uploadError);
        uploadResult = { result: 'CREATED' };
      }
      console.log('[SOUNDCLOUD IMPORT] Yandex upload complete/ignored. Result:', uploadResult);
      return uploadResult;
    }
    
    
    // --- Component: preload/bridge.js ---
    // ==========================================
    // SOUNDCLOUD PROXY BRIDGE (Node Preload Context)
    // ==========================================
    
    function nodeHttpsRequest(url, options = {}) {
      return new Promise((resolve, reject) => {
        const https = require('https');
        const { URL } = require('url');
        
        function makeRequest(targetUrl) {
          const parsedUrl = new URL(targetUrl);
          const reqOptions = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: options.headers || {}
          };
          
          https.get(reqOptions, (res) => {
            // Follow redirects (needed for SoundCloud stream URLs)
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              let redirectUrl = res.headers.location;
              if (!redirectUrl.startsWith('http')) {
                redirectUrl = new URL(redirectUrl, targetUrl).href;
              }
              makeRequest(redirectUrl);
              return;
            }
            
            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(new Error(`HTTP status ${res.statusCode} for ${targetUrl}`));
              return;
            }
            
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
              const buffer = Buffer.concat(chunks);
              if (options.binary) {
                resolve(buffer);
              } else {
                resolve(buffer.toString('utf8'));
              }
            });
          }).on('error', (err) => {
            reject(err);
          });
        }
        
        makeRequest(url);
      });
    }
    
    let cachedClientId = null;
    
    async function getSoundCloudClientId() {
      if (cachedClientId) return cachedClientId;
    
      try {
        const html = await nodeHttpsRequest('https://soundcloud.com/');
        const scriptMatches = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
    
        for (const url of scriptMatches.reverse()) {
          try {
            const scriptText = await nodeHttpsRequest(url);
            const match = scriptText.match(/client_id:"([a-zA-Z0-9]{32})"/);
            if (match && match[1]) {
              cachedClientId = match[1];
              console.log('[PRELOAD-SC] SoundCloud client_id found:', cachedClientId);
              return cachedClientId;
            }
          } catch (e) {
            // skip this script
          }
        }
        throw new Error('client_id not found in any script');
      } catch (err) {
        console.error('[PRELOAD-SC] Failed to get SoundCloud client_id:', err);
        throw err;
      }
    }
    
    async function soundCloudSearch(query, limit = 10) {
      const clientId = await getSoundCloudClientId();
      const url = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=${limit}&app_locale=ru`;
      const jsonStr = await nodeHttpsRequest(url);
      const data = JSON.parse(jsonStr);
      return data.collection || [];
    }
    
    async function soundCloudGetStream(track) {
      const clientId = await getSoundCloudClientId();
      
      let transcodingUrl = null;
      if (track.media && track.media.transcodings && track.media.transcodings.length > 0) {
        const progressive = track.media.transcodings.find(t => t.format && t.format.protocol === 'progressive');
        const hls = track.media.transcodings.find(t => t.format && t.format.protocol === 'hls');
        const chosen = progressive || hls || track.media.transcodings[0];
        transcodingUrl = chosen.url;
      }
    
      if (!transcodingUrl) throw new Error('No transcodings available for track');
    
      const streamJsonStr = await nodeHttpsRequest(`${transcodingUrl}?client_id=${clientId}`);
      const streamData = JSON.parse(streamJsonStr);
      return streamData.url;
    }
    
    async function soundCloudGetTrack(trackId) {
      const clientId = await getSoundCloudClientId();
      const url = `https://api-v2.soundcloud.com/tracks/${trackId}?client_id=${clientId}`;
      const jsonStr = await nodeHttpsRequest(url);
      return JSON.parse(jsonStr);
    }
    
    async function soundCloudFetchAudio(streamUrl) {
      const buffer = await nodeHttpsRequest(streamUrl, { binary: true });
      // Convert Node buffer to browser Blob and Blob URL
      const blob = new window.Blob([new Uint8Array(buffer)], { type: 'audio/mpeg' });
      const blobUrl = window.URL.createObjectURL(blob);
      return blobUrl;
    }
    
    stateChangeListener = (state) => {
      const { trackId, isPause, position, metadata, currentRoomId, serverUrl } = state;
      currentRoom = currentRoomId;
      currentServerUrl = serverUrl;
      updateDiscordPresencePreload(trackId, isPause, position, metadata);
      if (global.ScrobbleManager) {
        global.ScrobbleManager.onStateChange(trackId, isPause, position, metadata);
      }
    };
    
    settingsChangeListener = (settings) => {
      discordRpcEnabled = settings.enabled;
      if (discordRpcEnabled) {
        initDiscordRPC();
      } else {
        if (discordRPC) {
          discordRPC.clearActivity();
          discordRPC.destroy();
          discordRPC = null;
        }
        lastDiscordTrackId = null;
        lastDiscordIsPause = null;
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'YM_SYNC_STATE_CHANGED') {
          stateChangeListener(event.data.state);
        }
        
        if (event.data && event.data.type === 'YM_SYNC_SETTINGS_CHANGED') {
          settingsChangeListener({ enabled: event.data.enabled });
        }
    
        if (event.data && event.data.type === 'YM_SCROBBLER_SETTINGS_CHANGED') {
          if (global.ScrobbleManager) {
            global.ScrobbleManager.updateConfig(event.data.settings);
          }
        }
    
        if (event.data && event.data.__ym_sc_bridge === true) {
          const { requestId, type, payload } = event.data;
          
          if (type === 'SC_SEARCH') {
            soundCloudSearch(payload.query, payload.limit || 10)
              .then(tracks => {
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: true, tracks }
                }, '*');
              })
              .catch(err => {
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: false, error: err.message }
                }, '*');
              });
          } else if (type === 'SC_GET_STREAM') {
            soundCloudGetStream(payload.track)
              .then(url => {
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: true, url }
                }, '*');
              })
              .catch(err => {
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: false, error: err.message }
                }, '*');
              });
          } else if (type === 'SC_FETCH_AUDIO') {
            soundCloudFetchAudio(payload.url)
              .then(url => {
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: true, url }
                }, '*');
              })
              .catch(err => {
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: false, error: err.message }
                }, '*');
              });
          } else if (type === 'SC_GET_TRACK') {
            soundCloudGetTrack(payload.trackId)
              .then(track => {
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: true, track }
                }, '*');
              })
              .catch(err => {
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: false, error: err.message }
                }, '*');
              });
          } else if (type === 'YM_UPLOAD_TRACK') {
            handleSoundCloudUpload(payload)
              .then(result => {
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: true, result }
                }, '*');
              })
              .catch(err => {
                console.error('[PRELOAD-SC] Yandex upload error:', err);
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: false, error: err.message }
                }, '*');
              });
          } else if (type === 'RZT_GET_RATINGS') {
            const query = payload.title;
            const url = `https://risazatvorchestvo.com/search?query=${encodeURIComponent(query)}&type=releases`;
            nodeHttpsRequest(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
              }
            })
            .then(html => {
              const apiObj = typeof RztAPI !== 'undefined' ? RztAPI : (window.RztAPI || null);
              if (apiObj) {
                const ratings = apiObj.parseScoresFromHtml(html, payload.title, payload.artist);
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: true, data: ratings }
                }, '*');
              } else {
                throw new Error('RztAPI is not defined in preload context');
              }
            })
            .catch(err => {
              window.postMessage({
                __ym_sc_bridge_response: true,
                requestId,
                response: { ok: false, error: err.message }
              }, '*');
            });
          } else if (type === 'GENIUS_SEARCH') {
            const query = `${payload.artist} - ${payload.title}`;
            const url = `https://genius.com/api/search/multi?q=${encodeURIComponent(query)}`;
            nodeHttpsRequest(url)
              .then(jsonStr => {
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: true, data: JSON.parse(jsonStr) }
                }, '*');
              })
              .catch(err => {
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: false, error: err.message }
                }, '*');
              });
          } else if (type === 'GENIUS_REFERENTS') {
            const fetchAll = async () => {
              let page = 1;
              let referents = [];
              while (true) {
                const url = `https://genius.com/api/referents?song_id=${payload.songId}&text_format=html&per_page=50&page=${page}`;
                const jsonStr = await nodeHttpsRequest(url);
                const data = JSON.parse(jsonStr);
                if (!data || !data.response || !data.response.referents) {
                  break;
                }
                const pageRefs = data.response.referents;
                referents.push(...pageRefs);
                if (pageRefs.length < 50) {
                  break;
                }
                page++;
                if (page > 5) break;
              }
              return { response: { referents } };
            };
    
            fetchAll()
              .then(data => {
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: true, data }
                }, '*');
              })
              .catch(err => {
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: false, error: err.message }
                }, '*');
              });
          } else if (type === 'GENIUS_HTML') {
            nodeHttpsRequest(payload.url)
              .then(html => {
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: true, data: html }
                }, '*');
              })
              .catch(err => {
                window.postMessage({
                  __ym_sc_bridge_response: true,
                  requestId,
                  response: { ok: false, error: err.message }
                }, '*');
              });
          }
        }
      });
    }
    
    initDiscordRPC();
    startLocalApiServer();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (discordRPC) {
          discordRPC.destroy();
          discordRPC = null;
        }
        if (localApiServer) {
          try { localApiServer.close(); } catch(e) {}
          localApiServer = null;
        }
      });
    }
    
    
    
    return;
  }

  // ==========================================
  // WEB PAGE CONTEXT (Browser logic)
  // ==========================================
// --- Component: shared/styles.js ---
function injectStyles() {
  if (document.getElementById('ym-sync-styles')) return;
  const style = document.createElement('style');
  style.id = 'ym-sync-styles';
  style.textContent = `
    .ym-sync-status-indicator {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: #808080;
      border: 1.5px solid #18181c;
      transition: all 0.3s ease;
      z-index: 10;
    }

    .ym-sync-status-indicator.connecting {
      background-color: #f59e0b;
      box-shadow: 0 0 8px #f59e0b;
      animation: ym-pulse 1.2s infinite;
    }

    .ym-sync-status-indicator.connected {
      background-color: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: ym-pulse 1.5s infinite;
    }

    .ym-sync-status-indicator.error {
      background-color: #ef4444;
      box-shadow: 0 0 8px #ef4444;
    }

    .ym-sync-navbar-item.ym-collapsed .nxMXCBiVfgH4oxds3f2y {
      display: none !important;
    }

    @keyframes ym-pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.6; }
      100% { transform: scale(1); opacity: 1; }
    }

    .ym-sync-popover,
    .ym-theme-popover,
    .ym-lyrics-popover,
    .ym-fullscreen-translate-popover {
      --ym-popover-bg: rgba(28, 28, 32, 0.75);
      --ym-popover-border: rgba(255, 255, 255, 0.08);
      --ym-popover-text: #ffffff;
      --ym-popover-text-muted: rgba(255, 255, 255, 0.6);
      --ym-popover-text-label: rgba(255, 255, 255, 0.65);
      --ym-popover-item-bg: rgba(255, 255, 255, 0.03);
      --ym-popover-item-border: rgba(255, 255, 255, 0.05);
      --ym-popover-item-hover-bg: rgba(255, 255, 255, 0.08);
      --ym-popover-item-hover-border: rgba(255, 255, 255, 0.1);
      --ym-popover-input-bg: rgba(255, 255, 255, 0.06);
      --ym-popover-input-border: rgba(255, 255, 255, 0.08);
      --ym-popover-close-btn: #a0a0a5;
      --ym-popover-close-btn-hover: #ffffff;
      --ym-popover-shadow: rgba(0, 0, 0, 0.5);
      --ym-popover-active: #ffdb4d;
    }

    .ym-sync-popover {
      position: fixed;
      width: 290px;
      background: var(--ym-popover-bg) !important;
      backdrop-filter: blur(40px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(40px) saturate(180%) !important;
      border: 1px solid var(--ym-popover-border) !important;
      border-radius: 20px !important;
      box-shadow: 0 16px 48px var(--ym-popover-shadow) !important;
      padding: 8px !important;
      color: var(--ym-popover-text) !important;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif !important;
      font-weight: 500;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: opacity 0.2s ease, transform 0.2s ease;
      transform: translateY(5px);
      opacity: 0;
      pointer-events: none;
      box-sizing: border-box;
    }

    .ym-sync-popover.show {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .ym-sync-popover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px 4px 12px;
    }

    .ym-sync-popover-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      color: var(--ym-popover-text);
    }

    .ym-sync-close-btn {
      background: none;
      border: none;
      color: var(--ym-popover-close-btn);
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      transition: color 0.2s;
    }

    .ym-sync-close-btn:hover {
      color: var(--ym-popover-close-btn-hover);
    }

    .ym-sync-popover-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 0 8px 8px 8px;
    }

    .ym-sync-input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ym-sync-input-group label {
      font-size: 10px;
      font-weight: 500;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      color: var(--ym-popover-text-label);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .ym-sync-input-group input {
      background: var(--ym-popover-input-bg);
      border: 1px solid var(--ym-popover-input-border);
      border-radius: 12px;
      color: var(--ym-popover-text);
      padding: 10px 14px;
      font-size: 13px;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-weight: 500;
      outline: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
      width: 100%;
    }

    .ym-sync-input-group input::placeholder {
      color: var(--ym-popover-text-muted);
    }

    .ym-sync-input-group input:focus {
      border-color: var(--ym-popover-active);
      background: var(--ym-popover-input-bg);
      box-shadow: 0 0 0 3px rgba(255, 219, 77, 0.15);
    }

    .ym-sync-room-input-container {
      display: flex;
      gap: 8px;
      width: 100%;
    }

    .ym-sync-room-input-container input {
      flex-grow: 1;
    }

    .ym-sync-icon-only-btn {
      background: var(--ym-popover-item-bg);
      border: 1px solid var(--ym-popover-item-border);
      color: var(--ym-popover-close-btn);
      border-radius: 12px;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
      box-sizing: border-box;
      padding: 0;
    }

    .ym-sync-icon-only-btn:hover {
      background: var(--ym-popover-item-hover-bg);
      color: var(--ym-popover-close-btn-hover);
      border-color: var(--ym-popover-item-hover-border);
    }

    .ym-sync-primary-btn {
      background: #ffdb4d;
      border: none;
      border-radius: 12px;
      color: #000000;
      padding: 12px;
      font-size: 13px;
      font-weight: 600;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(255, 219, 77, 0.15);
      width: 100%;
      box-sizing: border-box;
    }

    .ym-sync-primary-btn:hover:not(:disabled) {
      background: #ffe170;
      box-shadow: 0 6px 16px rgba(255, 219, 77, 0.25);
    }

    .ym-sync-primary-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      color: rgba(0, 0, 0, 0.6);
    }

    .ym-sync-danger-btn {
      background: #ef4444;
      border: none;
      border-radius: 12px;
      color: #ffffff;
      padding: 12px;
      font-size: 13px;
      font-weight: 600;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
      width: 100%;
      box-sizing: border-box;
    }

    .ym-sync-danger-btn:hover {
      background: #dc2626;
      box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
    }

    .ym-sync-status-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--ym-popover-item-bg);
      border: 1px solid var(--ym-popover-item-border);
      border-radius: 12px;
      padding: 10px 14px;
      box-sizing: border-box;
      width: 100%;
    }

    .ym-sync-status-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ym-sync-pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
      animation: ym-pulse 1.5s infinite;
      flex-shrink: 0;
    }

    .ym-sync-status-info span {
      font-size: 12px;
      color: var(--ym-popover-text);
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-weight: 500;
    }

    .ym-sync-status-info strong {
      color: #10b981;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-weight: 500;
      word-break: break-all;
    }

    .ym-theme-popover {
      position: fixed;
      width: 290px;
      background: var(--ym-popover-bg) !important;
      backdrop-filter: blur(40px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(40px) saturate(180%) !important;
      border: 1px solid var(--ym-popover-border) !important;
      border-radius: 20px !important;
      box-shadow: 0 16px 48px var(--ym-popover-shadow) !important;
      padding: 8px !important;
      color: var(--ym-popover-text) !important;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif !important;
      font-weight: 500;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: opacity 0.2s ease, transform 0.2s ease;
      transform: translateY(5px);
      opacity: 0;
      pointer-events: none;
      box-sizing: border-box;
    }

    .ym-theme-popover.show {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .ym-theme-popover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px 4px 12px;
    }

    .ym-theme-popover-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      color: var(--ym-popover-text);
    }

    .ym-theme-close-btn {
      background: none;
      border: none;
      color: var(--ym-popover-close-btn);
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      transition: color 0.2s;
    }

    .ym-theme-close-btn:hover {
      color: var(--ym-popover-close-btn-hover);
    }

    .ym-theme-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 0 8px 8px 8px;
    }

    .ym-theme-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: var(--ym-popover-item-bg);
      border: 1px solid var(--ym-popover-item-border);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 13px;
      color: var(--ym-popover-text);
      opacity: 0.85;
    }

    .ym-theme-option:hover {
      background: var(--ym-popover-item-hover-bg);
      border-color: var(--ym-popover-item-hover-border);
      color: var(--ym-popover-text);
      opacity: 1;
    }

    .ym-theme-option.active {
      border-color: var(--ym-popover-active);
      background: rgba(255, 219, 77, 0.1);
      color: var(--ym-popover-active);
      opacity: 1;
    }

    .ym-theme-preview {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
    }

    .ym-theme-preview-default {
      background: #18181c;
    }

    .ym-theme-preview-oled {
      background: #000000;
      border-color: #ffffff33;
    }

    .ym-theme-preview-cyberpunk {
      background: #0f081d;
      border-color: #ff007f;
    }

    .ym-theme-preview-nord {
      background: #2e3440;
      border-color: #88c0d0;
    }

    .ym-theme-preview-sakura {
      background: #fff0f5;
      border-color: #ff69b4;
    }

    .ym-theme-preview-custom {
      background: linear-gradient(135deg, #ff007f 0%, #00ffff 50%, #ffdb4d 100%);
      border-color: rgba(255, 255, 255, 0.4);
    }
    .ym-navbar-item-injected.ym-collapsed .nxMXCBiVfgH4oxds3f2y {
      display: none !important;
    }

    .ym-quality-tooltip {
      position: fixed;
      background: rgba(24, 24, 30, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 8px 12px;
      color: rgba(255, 255, 255, 0.8);
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      font-weight: 500;
      z-index: 999999;
      pointer-events: none;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      transition: opacity 0.15s ease, transform 0.15s ease;
      opacity: 0;
      transform: translateY(4px);
      box-sizing: border-box;
      text-align: left;
    }
    .ym-quality-tooltip.show {
      opacity: 1;
      transform: translateY(0);
    }

    .ym-lyrics-popover {
      position: fixed;
      width: 320px;
      height: 480px;
      background: var(--ym-popover-bg) !important;
      backdrop-filter: blur(40px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(40px) saturate(180%) !important;
      border: 1px solid var(--ym-popover-border) !important;
      border-radius: 20px !important;
      box-shadow: 0 16px 48px var(--ym-popover-shadow) !important;
      padding: 8px !important;
      color: var(--ym-popover-text) !important;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif !important;
      font-weight: 500;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: opacity 0.2s ease, transform 0.2s ease;
      transform: translateY(5px);
      opacity: 0;
      pointer-events: none;
      box-sizing: border-box;
    }

    .ym-lyrics-popover.show {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .ym-lyrics-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--ym-popover-border);
      padding: 8px 12px 8px 12px;
    }

    .ym-lyrics-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--ym-popover-text);
    }

    .ym-lyrics-close-btn {
      background: none;
      border: none;
      color: var(--ym-popover-close-btn);
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      transition: color 0.2s;
    }

    .ym-lyrics-close-btn:hover {
      color: var(--ym-popover-close-btn-hover);
    }

    .ym-lyrics-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      padding: 0 8px 8px 8px;
    }

    .ym-lyrics-track-info {
      font-size: 12px;
      color: var(--ym-popover-text-muted);
      margin-bottom: 8px;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ym-lyrics-track-info strong {
      color: var(--ym-popover-text);
    }

    .ym-lyric-lines-container {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 200px 10px;
      scroll-behavior: smooth;
    }

    .ym-lyric-lines-container::-webkit-scrollbar {
      width: 4px;
    }

    .ym-lyric-lines-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .ym-lyric-lines-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }

    .ym-lyric-line {
      font-size: 14px;
      color: var(--ym-popover-text-muted);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      text-align: center;
      line-height: 1.4;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
    }

    .ym-lyric-line:hover {
      color: var(--ym-popover-text);
      background: var(--ym-popover-item-bg);
    }

    .ym-lyric-line.active {
      color: var(--ym-popover-active);
      font-size: 18px;
      font-weight: 800;
      text-shadow: 0 0 12px rgba(255, 219, 77, 0.5);
      transform: scale(1.04);
      background: rgba(255, 219, 77, 0.03);
    }

    .ym-lyrics-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: var(--ym-popover-text-muted);
      font-size: 13px;
      gap: 12px;
      padding: 10px;
    }

    .ym-lyrics-search-box {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
    }

    .ym-lyrics-search-results {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 200px;
      overflow-y: auto;
      width: 100%;
      margin-top: 8px;
    }

    .ym-lyrics-search-results::-webkit-scrollbar {
      width: 4px;
    }

    .ym-lyrics-search-results::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }

    .ym-lyrics-search-item {
      padding: 8px 12px;
      background: var(--ym-popover-item-bg);
      border: 1px solid var(--ym-popover-item-border);
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
    }

    .ym-lyrics-search-item:hover {
      background: var(--ym-popover-item-hover-bg);
      border-color: var(--ym-popover-active);
    }

    .ym-lyrics-search-item div {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ym-lyrics-search-item .title {
      font-weight: 600;
      color: var(--ym-popover-text);
    }

    .ym-lyrics-search-item .artist {
      color: var(--ym-popover-text-muted);
      margin-top: 2px;
    }

    /* Style for patched native lyrics button */
    [data-ym-sync-patched="true"] {
      opacity: 1 !important;
      pointer-events: auto !important;
      cursor: pointer !important;
    }
    
    [data-ym-sync-patched="true"] svg {
      color: #ffdb4d !important;
      fill: currentColor !important;
    }

    /* Fullscreen player custom lyrics styles */
    .ym-fullscreen-lyrics-container {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 80vh;
      max-height: 600px;
      overflow-y: auto;
      padding: min(40vh, 300px) 12%;
      scroll-behavior: smooth;
      box-sizing: border-box;
      mask-image: linear-gradient(to bottom, transparent 0%, white 15%, white 85%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, transparent 0%, white 15%, white 85%, transparent 100%);
      transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease;
    }

    /* Hide custom lyrics and panels when Play Queue is active */
    [class*="FullscreenPlayerDesktop_root"]:has([class*="FullscreenPlayerDesktopControls_playQueueButton"][aria-pressed="true"]) .ym-fullscreen-lyrics-container,
    [class*="FullscreenPlayerDesktop_root"]:has([class*="FullscreenPlayerDesktopControls_playQueueButton"][aria-pressed="true"]) .ym-fullscreen-genius-content,
    [class*="FullscreenPlayerDesktop_root"]:has([class*="FullscreenPlayerDesktopControls_playQueueButton"][aria-pressed="true"]) .ym-genius-annotation-panel,
    [class*="FullscreenPlayerDesktop_root"]:has([class*="FullscreenPlayerDesktopControls_playQueueButton"][aria-pressed="true"]) .ym-translate-controls {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transform: translateX(-20px) !important;
    }

    .ym-fullscreen-lyric-original {
      font-family: inherit;
      font-weight: inherit;
      font-size: inherit;
      transition: font-weight 0.2s ease, font-size 0.2s ease;
    }

    .ym-fullscreen-lyrics-container.ym-has-translation .ym-fullscreen-lyric-original {
      font-weight: 500 !important;
      font-size: 0.9em !important;
    }

    .ym-fullscreen-lyrics-container::-webkit-scrollbar {
      display: none;
    }

    .ym-fullscreen-lyric-line {
      font-family: "YSMusic Headline", sans-serif !important;
      font-style: normal !important;
      font-weight: 700 !important;
      font-size: 28px;
      line-height: 1.4;
      color: rgb(230, 230, 230) !important;
      opacity: 0.35 !important;
      margin-bottom: 32px;
      text-align: center !important;
      transform: scale(1);
      transform-origin: center center;
      transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: opacity, transform;
      cursor: pointer;
      user-select: none;
    }

    .ym-fullscreen-lyric-line:hover {
      opacity: 0.85 !important;
    }

    .ym-fullscreen-lyric-line.active {
      font-family: "YSMusic Headline", sans-serif !important;
      font-style: normal !important;
      font-weight: 700 !important;
      color: rgb(230, 230, 230) !important;
      opacity: 1 !important;
      transform: scale(1.18) !important;
    }

    /* Style for the next line following the active one */
    .ym-fullscreen-lyric-line.active + .ym-fullscreen-lyric-line {
      font-family: "YSMusic Headline", sans-serif !important;
      font-style: normal !important;
      font-weight: 700 !important;
      color: rgb(230, 230, 230) !important;
      opacity: 0.6 !important;
    }

    /* Genius mode header labels [Verse 1], [Chorus], etc. */
    .ym-genius-header-label {
      display: block !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.12em !important;
      opacity: 0.45 !important;
      margin-top: 28px !important;
      margin-bottom: 20px !important;
      cursor: default !important;
      transform: none !important;
    }
    .ym-genius-header-label:hover {
      opacity: 0.45 !important;
      transform: none !important;
    }

    /* Genius mode static fallback lyric lines */
    .ym-fullscreen-lyric-line.static {
      opacity: 0.85 !important;
      cursor: default;
    }
    .ym-fullscreen-lyric-line.static:hover {
      opacity: 1 !important;
    }
    a.ym-lyric-annotated .ym-fullscreen-lyric-line.static {
      cursor: pointer !important;
    }

    .ym-fullscreen-lyrics-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: rgba(255, 255, 255, 0.5);
      font-size: 24px;
      font-weight: 600;
      text-align: center;
    }

    /* Split mode layout override when custom lyrics are injected */
    [class*="FullscreenPlayerDesktopContent_root"].ym-force-split {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 60px !important;
      width: 100% !important;
      max-width: 1200px !important;
      margin: 0 auto !important;
      padding: 0 40px !important;
      box-sizing: border-box !important;
      align-items: center !important;
      justify-content: center !important;
      position: relative !important;
      transform: none !important;
      left: 0 !important;
      top: 0 !important;
    }

    [class*="FullscreenPlayerDesktopContent_fullscreenContent"].ym-force-split {
      width: 100% !important;
      max-width: 400px !important;
      margin: 0 auto !important; /* Center alignment */
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      position: relative !important;
      transform: none !important;
      left: 0 !important;
      top: 0 !important;
      height: auto !important;
    }

    [class*="FullscreenPlayerDesktopContent_additionalContent"].ym-force-split {
      width: 100% !important;
      max-width: 600px !important;
      margin: 0 auto !important; /* Center alignment */
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      opacity: 1 !important;
      visibility: visible !important;
      height: 80vh !important;
      position: relative !important;
      transform: none !important;
      left: 0 !important;
    }

    [class*="FullscreenPlayerDesktopContent_additionalContent"].ym-force-split > :not(.ym-fullscreen-lyrics-container) {
      display: none !important;
    }

    /* Adjust poster cover size in split mode */
    .ym-force-split [class*="FullscreenPlayerDesktopPoster_root"] {
      width: 100% !important;
      max-width: 400px !important;
      margin: 0 auto !important;
      position: relative !important;
    }

    .ym-force-split [class*="FullscreenPlayerDesktopPoster_cover"] {
      width: 100% !important;
      height: auto !important;
      aspect-ratio: 1/1 !important;
      border-radius: 12px !important;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4) !important;
    }

    /* Metadata and controls container under the cover art */
    [class*="FullscreenPlayerDesktopContent_info"].ym-force-split {
      width: 100% !important;
      max-width: 400px !important;
      margin: 20px auto 0 auto !important;
      padding: 0 !important;
      text-align: left !important;
    }

    /* Force slider to align and match the 400px cover art width in split mode, and position timecodes under it */
    .ym-force-split [class*="FullscreenPlayerDesktopContent_sliderContainer"] {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      grid-template-rows: auto auto !important;
      width: 100% !important;
      max-width: 400px !important;
      margin: 12px 0 0 0 !important;
      height: 42px !important;
    }

    .ym-force-split [class*="FullscreenPlayerDesktopContent_sliderContainer"] input {
      grid-column: 1 / span 2 !important;
      grid-row: 1 !important;
      width: 100% !important;
      margin: 0 !important;
    }

    .ym-force-split [class*="FullscreenPlayerDesktopContent_sliderContainer"] [class*="Timecode_root_start"] {
      grid-column: 1 !important;
      grid-row: 2 !important;
      justify-self: start !important;
      margin-top: 4px !important;
    }

    .ym-force-split [class*="FullscreenPlayerDesktopContent_sliderContainer"] [class*="Timecode_root_end"] {
      grid-column: 2 !important;
      grid-row: 2 !important;
      justify-self: end !important;
      margin-top: 4px !important;
    }

    /* Align title and artist text to the left in split mode, just like Yandex does natively */
    .ym-force-split [class*="Meta_root"] {
      align-items: flex-start !important;
      text-align: left !important;
    }

    /* Translate button: positioned inside FullscreenPlayerDesktopControls_root */
    .ym-fullscreen-translate-btn {
      position: absolute !important;
      top: 16px !important;
      left: 16px !important;
      width: 64px !important;
      height: 64px !important;
      border-radius: 50% !important;
      background: rgba(26, 26, 26, 0.9) !important;
      border: none !important;
      color: #fff !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      z-index: 100000 !important;
      transition: all 0.2s ease !important;
      outline: none !important;
      padding: 0 !important;
    }
    
    .ym-fullscreen-translate-btn:hover:not(.active) {
      background: rgba(40, 40, 40, 0.9) !important;
      transform: scale(1.05) !important;
    }

    .ym-fullscreen-translate-btn.active:hover {
      transform: scale(1.05) !important;
    }
    
    .ym-fullscreen-translate-btn.active {
      background: #ffdb4d !important;
      color: #000000 !important;
      box-shadow: 0 0 12px rgba(255, 219, 77, 0.4) !important;
    }

    /* RZT Ratings Container and Circles */
    .ym-fullscreen-rzt-ratings {
      position: absolute !important;
      top: 30px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      display: flex !important;
      flex-direction: row !important;
      gap: 12px !important;
      z-index: 100000 !important;
      pointer-events: auto !important;
    }

    .ym-rzt-rating-circle {
      width: 36px !important;
      height: 36px !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: "YSMusic Headline", "YS Text", "Yandex Sans", sans-serif !important;
      font-size: 15px !important;
      font-weight: 700 !important;
      color: #ffffff !important;
      position: relative !important;
      cursor: pointer !important;
      box-sizing: border-box !important;
      transition: transform 0.2s ease, opacity 0.2s ease !important;
    }

    .ym-rzt-rating-circle:hover {
      transform: scale(1.1) !important;
    }

    /* Tooltip styling */
    .ym-rzt-rating-circle::after {
      content: attr(data-tooltip);
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(6px);
      background: rgba(28, 28, 32, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-family: "YS Text", "Yandex Sans", sans-serif;
      font-weight: 500;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease, transform 0.2s ease;
      z-index: 100002;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .ym-rzt-rating-circle:hover::after {
      opacity: 1;
      transform: translateX(-50%) translateY(2px);
    }

    .ym-rzt-rating-circle.rzt-blue-solid {
      background-color: #2563eb !important;
      border: none !important;
    }

    .ym-rzt-rating-circle.rzt-blue-outline {
      background-color: transparent !important;
      border: 2px solid #2563eb !important;
    }

    .ym-rzt-rating-circle.rzt-grey-solid {
      background-color: rgba(255, 255, 255, 0.15) !important;
      border: none !important;
    }

    /* --- Light Theme Support --- */
    html.theme-light .ym-sync-popover,
    body.theme-light .ym-sync-popover,
    .theme-light .ym-sync-popover,
    html[data-theme="light"] .ym-sync-popover,
    [data-theme="light"] .ym-sync-popover,
    html.theme-light .ym-theme-popover,
    body.theme-light .ym-theme-popover,
    .theme-light .ym-theme-popover,
    html[data-theme="light"] .ym-theme-popover,
    [data-theme="light"] .ym-theme-popover,
    html.theme-light .ym-lyrics-popover,
    body.theme-light .ym-lyrics-popover,
    .theme-light .ym-lyrics-popover,
    html[data-theme="light"] .ym-lyrics-popover,
    [data-theme="light"] .ym-lyrics-popover,
    html.theme-light .ym-fullscreen-translate-popover,
    body.theme-light .ym-fullscreen-translate-popover,
    .theme-light .ym-fullscreen-translate-popover,
    html[data-theme="light"] .ym-fullscreen-translate-popover,
    [data-theme="light"] .ym-fullscreen-translate-popover {
      --ym-popover-bg: rgba(255, 255, 255, 0.75);
      --ym-popover-border: rgba(0, 0, 0, 0.08);
      --ym-popover-text: #000000;
      --ym-popover-text-muted: rgba(0, 0, 0, 0.55);
      --ym-popover-text-label: rgba(0, 0, 0, 0.55);
      --ym-popover-item-bg: rgba(0, 0, 0, 0.03);
      --ym-popover-item-border: rgba(0, 0, 0, 0.05);
      --ym-popover-item-hover-bg: rgba(0, 0, 0, 0.06);
      --ym-popover-item-hover-border: rgba(0, 0, 0, 0.08);
      --ym-popover-input-bg: rgba(0, 0, 0, 0.03);
      --ym-popover-input-border: rgba(0, 0, 0, 0.05);
      --ym-popover-close-btn: rgba(0, 0, 0, 0.45);
      --ym-popover-close-btn-hover: #000000;
      --ym-popover-shadow: rgba(0, 0, 0, 0.12);
      --ym-popover-active: #ccaa00;
    }

    /* --- Genius Mode Layout Swaps --- */
    .ym-genius-active [class*="FullscreenPlayerDesktopContent_root"].ym-force-split {
      grid-template-columns: 1.2fr 1fr !important;
      align-items: center !important;
      justify-content: center !important;
    }
    
    .ym-genius-active [class*="FullscreenPlayerDesktopContent_additionalContent"].ym-force-split {
      grid-column: 1 !important;
      grid-row: 1 !important;
      max-width: 650px !important;
    }

    .ym-genius-active [class*="FullscreenPlayerDesktopContent_fullscreenContent"].ym-force-split {
      grid-column: 2 !important;
      grid-row: 1 !important;
      max-width: 550px !important;
      width: 100% !important;
      height: 80vh !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: stretch !important;
      position: relative !important;
    }

    /* Hide standard details in Genius mode */
    .ym-genius-active [class*="FullscreenPlayerDesktopPoster_root"],
    .ym-genius-active [class*="FullscreenPlayerDesktopContent_info"].ym-force-split {
      display: none !important;
    }

    /* Genius Toggle Button styling */
    .ym-fullscreen-genius-btn {
      position: absolute !important;
      top: 108px !important;
      right: 48px !important;
      width: 40px !important;
      height: 40px !important;
      border-radius: 50% !important;
      background: rgba(26, 26, 26, 0.9) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: #fff !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      z-index: 100000 !important;
      transition: all 0.2s ease !important;
      outline: none !important;
      padding: 0 !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
    }
    .ym-fullscreen-genius-btn svg {
      fill: currentColor !important;
      stroke: none !important;
      width: 20px !important;
      height: 20px !important;
      display: block !important;
    }
    .ym-fullscreen-genius-btn:hover {
      background: rgba(40, 40, 40, 0.9) !important;
      transform: scale(1.05) !important;
      border-color: rgba(255, 255, 255, 0.25) !important;
    }
    .ym-fullscreen-genius-btn.active,
    .ym-fullscreen-genius-btn[aria-pressed="true"] {
      background: #ffdb4d !important;
      border-color: #ffdb4d !important;
      color: #000000 !important;
      box-shadow: 0 0 12px rgba(255, 219, 77, 0.5) !important;
    }
    .ym-fullscreen-genius-btn svg {
      display: block !important;
    }

    /* Custom Sync Lyrics Toggle Button */
    .ym-custom-sync-lyrics-btn {
      display: inline-flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      cursor: pointer !important;
    }
    .ym-custom-sync-lyrics-btn svg {
      display: block !important;
    }

    /* Genius Panel Exit Button */
    .ym-genius-panel-exit-btn {
      background: rgba(255, 255, 255, 0.08) !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      border-radius: 20px !important;
      color: #fff !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      padding: 6px 14px !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      font-family: "YS Text", sans-serif !important;
      outline: none !important;
    }
    .ym-genius-panel-exit-btn:hover {
      background: rgba(255, 255, 255, 0.15) !important;
      border-color: rgba(255, 255, 255, 0.3) !important;
      transform: scale(1.02) !important;
    }
    .ym-genius-panel-exit-btn:active {
      transform: scale(0.98) !important;
    }

    /* Annotated Lyrics Line styles */
    .ym-genius-active .ym-fullscreen-lyric-line.ym-lyric-annotated {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 10px 18px;
      box-sizing: border-box;
      display: inline-block;
      margin-left: auto;
      margin-right: auto;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(255, 255, 255, 0.03);
    }
    .ym-genius-active .ym-fullscreen-lyric-line.ym-lyric-annotated:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.08);
      transform: translateY(-1px);
    }
    .ym-genius-active .ym-fullscreen-lyric-line.ym-lyric-annotated.active {
      background: rgba(255, 219, 77, 0.1);
      border-color: rgba(255, 219, 77, 0.2);
    }
    .ym-genius-active .ym-fullscreen-lyric-line.ym-genius-annotation-selected {
      background: rgba(255, 219, 77, 0.2) !important;
      border-color: #ffdb4d !important;
      color: #ffffff !important;
      opacity: 1 !important;
      box-shadow: 0 4px 20px rgba(255, 219, 77, 0.15) !important;
      transform: scale(1.05) !important;
    }

    .ym-genius-lyric-line {
      display: block !important;
      margin-bottom: 28px !important;
    }

    /* Inline Genius lyrics anchors (base styles) */
    a.ym-lyric-annotated {
      color: #fff !important;
      text-decoration: none !important;
      transition: all 0.2s ease !important;
      cursor: pointer !important;
    }

    /* Normal inline highlights (when there is no nested block line inside the anchor) */
    a.ym-lyric-annotated:not(:has(.ym-genius-lyric-line)) {
      background: rgba(255, 219, 77, 0.15) !important;
      border-bottom: 2px solid rgba(255, 219, 77, 0.4) !important;
      padding: 2px 4px !important;
      border-radius: 4px !important;
      display: inline !important;
    }
    a.ym-lyric-annotated:not(:has(.ym-genius-lyric-line)):hover {
      background: rgba(255, 219, 77, 0.3) !important;
      border-color: #ffdb4d !important;
    }

    /* Block highlights (when the anchor wraps whole lines of lyrics) */
    a.ym-lyric-annotated:has(.ym-genius-lyric-line) {
      display: contents !important; /* Prevents inline tag border-bottom collapse/artifacts */
    }

    /* The actual visual frame for block-level annotated lines */
    a.ym-lyric-annotated .ym-genius-lyric-line {
      background: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.03) !important;
      border-radius: 12px;
      padding: 10px 18px !important;
      box-sizing: border-box;
      display: inline-block !important;
      margin-left: auto;
      margin-right: auto;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    a.ym-lyric-annotated:hover .ym-genius-lyric-line {
      background: rgba(255, 255, 255, 0.12) !important;
      border-color: rgba(255, 255, 255, 0.08) !important;
      transform: translateY(-1px);
    }

    /* Highlight matching active state and selection states on block frames */
    a.ym-lyric-annotated .ym-genius-lyric-line.active {
      background: rgba(255, 219, 77, 0.1) !important;
      border-color: rgba(255, 219, 77, 0.2) !important;
    }
    a.ym-lyric-annotated .ym-genius-lyric-line.ym-genius-annotation-selected {
      background: rgba(255, 219, 77, 0.2) !important;
      border-color: #ffdb4d !important;
      box-shadow: 0 4px 20px rgba(255, 219, 77, 0.15) !important;
      transform: scale(1.05) !important;
    }
    a.ym-lyric-annotated.ym-genius-annotation-selected {
      background: rgba(255, 219, 77, 0.45) !important;
      border-color: #ffdb4d !important;
      box-shadow: 0 0 10px rgba(255, 219, 77, 0.3) !important;
      color: #ffffff !important;
    }

    /* Glassmorphic Annotation Panel */
    .ym-genius-annotation-panel {
      display: flex;
      flex-direction: column;
      height: 80vh;
      max-height: 600px;
      position: relative !important;
      z-index: 10000 !important;
      background: rgba(20, 20, 20, 0.35);
      backdrop-filter: blur(25px) saturate(180%);
      -webkit-backdrop-filter: blur(25px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 28px;
      box-sizing: border-box;
      overflow-y: auto;
      color: #ffffff;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
      text-align: left;
    }
    .ym-genius-annotation-panel::-webkit-scrollbar {
      width: 6px;
    }
    .ym-genius-annotation-panel::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
    }

    .ym-genius-annotation-welcome {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      text-align: center;
      opacity: 0.85;
    }

    .ym-genius-annotation-body {
      font-size: 15px;
      line-height: 1.6;
      font-family: "YS Text", sans-serif;
      color: rgba(255, 255, 255, 0.85);
    }
    .ym-genius-annotation-body p {
      margin: 0 0 16px 0;
    }
    .ym-genius-annotation-body p:last-child {
      margin-bottom: 0;
    }
    .ym-genius-annotation-body a {
      color: #ffdb4d;
      text-decoration: none;
      border-bottom: 1px dashed rgba(255, 219, 77, 0.4);
      transition: all 0.2s ease;
    }
    .ym-genius-annotation-body a:hover {
      color: #ffe880;
      border-bottom-color: #ffe880;
    }
    .ym-genius-annotation-body blockquote {
      border-left: 3px solid #ffdb4d;
      margin: 0 0 16px 0;
      padding: 4px 0 4px 16px;
      font-style: italic;
      color: rgba(255, 255, 255, 0.7);
      background: rgba(255, 255, 255, 0.02);
      border-radius: 0 8px 8px 0;
    }
    .ym-genius-annotation-body img {
      max-width: 100%;
      height: auto;
      border-radius: 12px;
      margin: 14px 0;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .ym-hidden {
      display: none !important;
    }

    /* ==========================================
       WRAPPED UI (Локальная статистика)
       ========================================== */
    .ym-wrapped-profile-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: calc(100% - 32px);
      margin: 8px 16px 16px 16px;
      padding: 10px 16px;
      background: rgba(255, 219, 77, 0.1);
      color: #ffdb4d;
      border: 1px solid rgba(255, 219, 77, 0.2);
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: "YS Text", "Yandex Sans Text", sans-serif;
      box-sizing: border-box;
    }
    .ym-wrapped-profile-btn:hover {
      background: rgba(255, 219, 77, 0.2);
      transform: scale(0.98);
    }
    
    #ym-wrapped-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999;
      background: rgba(18, 18, 20, 0.85);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      display: flex;
      justify-content: center;
      align-items: center;
      transition: opacity 0.4s ease, visibility 0.4s ease;
    }
    
    .ym-wrapped-overlay-hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
    
    .ym-wrapped-overlay-visible {
      opacity: 1;
      visibility: visible;
      pointer-events: all;
    }

    .ym-wrapped-content {
      position: relative;
      width: 90%;
      max-width: 900px;
      height: 85vh;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
      padding: 40px;
      display: flex;
      flex-direction: column;
      transform: translateY(20px) scale(0.95);
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      overflow: hidden;
    }
    
    .ym-wrapped-overlay-visible .ym-wrapped-content {
      transform: translateY(0) scale(1);
    }

    .ym-wrapped-close {
      position: absolute;
      top: 24px;
      right: 24px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      cursor: pointer;
      transition: all 0.2s ease;
      z-index: 10;
    }
    .ym-wrapped-close:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1) rotate(90deg);
    }
    
    .ym-wrapped-header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .ym-wrapped-header h1 {
      font-size: 42px;
      font-weight: 800;
      margin: 0 0 8px 0;
      background: linear-gradient(135deg, #ffdb4d, #ff8c00);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -1px;
    }
    
    .ym-wrapped-header p {
      font-size: 16px;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .ym-wrapped-body {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
  `;
  document.head.appendChild(style);
}

// --- Component: shared/rzt-api.js ---
// ==========================================
// RISA ZA TVORCHESTVO (RZT) API
// ==========================================

const RztAPI = {
  _pendingRequests: {},
  _initialized: false,

  _init() {
    if (this._initialized) return;
    this._initialized = true;

    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (!event.data || !event.data.__ym_sc_bridge_response) return;
        const { requestId, response } = event.data;
        const pending = this._pendingRequests[requestId];
        if (pending) {
          delete this._pendingRequests[requestId];
          if (response && response.ok) {
            pending.resolve(response.data || response.result); // supports data or result keys
          } else {
            pending.reject(new Error(response && response.error ? response.error : 'Unknown bridge error'));
          }
        }
      });
    }
  },

  _sendToBridge(type, payload) {
    this._init();
    return new Promise((resolve, reject) => {
      const requestId = `rzt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      this._pendingRequests[requestId] = { resolve, reject };

      // Timeout safety
      setTimeout(() => {
        if (this._pendingRequests[requestId]) {
          delete this._pendingRequests[requestId];
          reject(new Error('RZT bridge request timed out'));
        }
      }, 15000);

      window.postMessage({
        __ym_sc_bridge: true,
        requestId,
        type,
        payload
      }, '*');
    });
  },

  normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase()
      .replace(/[\u200b-\u200d\uFEFF]/g, '') // Strip zero-width spaces/BOM
      .replace(/[^a-zа-я0-9\s-_]/gi, '')   // Keep only letters, digits, spaces, hyphens, underscores
      .replace(/\s+/g, ' ')
      .trim();
  },

  hasArtistMatch(chunk, artistName) {
    if (!artistName) return true;
    const cleanArtist = this.normalizeText(artistName);
    const cleanChunk = this.normalizeText(chunk);
    
    if (cleanChunk.includes(cleanArtist)) return true;
    
    // Split by common artist separators and check each one
    const artists = artistName.split(/(?:feat\.?|feat|&|,|\bи\b)/i).map(a => this.normalizeText(a)).filter(Boolean);
    for (const a of artists) {
      if (cleanChunk.includes(a)) return true;
    }
    
    return false;
  },

  parseScoresFromHtml(html, trackTitle, artistName) {
    if (!html) return null;
    const titleClean = this.normalizeText(trackTitle);
    
    // 1. Gather all occurrence positions of the track title
    const indices = [];
    let idx = html.toLowerCase().indexOf(titleClean);
    while (idx !== -1) {
      indices.push(idx);
      idx = html.toLowerCase().indexOf(titleClean, idx + 1);
    }
    
    // Fallback 1: try title without bracketed info if no matches found
    if (indices.length === 0) {
      const simpleTitle = this.normalizeText(trackTitle.split(/[(\[]/)[0]);
      if (simpleTitle && simpleTitle !== titleClean) {
        let idx2 = html.toLowerCase().indexOf(simpleTitle);
        while (idx2 !== -1) {
          indices.push(idx2);
          idx2 = html.toLowerCase().indexOf(simpleTitle, idx2 + 1);
        }
      }
    }

    // 2. Scan occurrences and look for the one matching the artist
    for (const pos of indices) {
      const chunk = html.slice(pos, pos + 3000);
      if (this.hasArtistMatch(chunk, artistName)) {
        const regex = /class=\\?"[^"]*inline-flex size-7[^"]*rounded-full[^"]*\\?"[^>]*>([0-9]+)<\/div>/g;
        const matches = [...chunk.matchAll(regex)].map(m => parseInt(m[1], 10));
        if (matches.length > 0) {
          return {
            flomaster: matches[2] || null,
            withReviews: matches[0] || null,
            withoutReviews: matches[1] || null
          };
        }
      }
    }

    // Fallback 2: if no matches had the artist, parse ratings from the first track title match
    if (indices.length > 0) {
      const chunk = html.slice(indices[0], indices[0] + 3000);
      const regex = /class=\\?"[^"]*inline-flex size-7[^"]*rounded-full[^"]*\\?"[^>]*>([0-9]+)<\/div>/g;
      const matches = [...chunk.matchAll(regex)].map(m => parseInt(m[1], 10));
      if (matches.length > 0) {
        return {
          flomaster: matches[2] || null,
          withReviews: matches[0] || null,
          withoutReviews: matches[1] || null
        };
      }
    }

    // Fallback 3: try the first track link in the entire search results page
    const fallbackRegex = /href=\\?"\/track\/([^"]+)\\?"|href=\\?"\/release\/([^"]+)\\?"/i;
    const match = html.match(fallbackRegex);
    if (match) {
      const pos = html.indexOf(match[0]);
      const chunk = html.slice(pos, pos + 3000);
      const regex = /class=\\?"[^"]*inline-flex size-7[^"]*rounded-full[^"]*\\?"[^>]*>([0-9]+)<\/div>/g;
      const matches = [...chunk.matchAll(regex)].map(m => parseInt(m[1], 10));
      if (matches.length > 0) {
        return {
          flomaster: matches[2] || null,
          withReviews: matches[0] || null,
          withoutReviews: matches[1] || null
        };
      }
    }

    return null;
  },

  async getTrackRatings(artist, title) {
    try {
      return await this._sendToBridge('RZT_GET_RATINGS', { artist, title });
    } catch (err) {
      console.error('[RZT] Error getting track ratings:', err);
      return null;
    }
  }
};

if (typeof window !== 'undefined') {
  window.RztAPI = RztAPI;
}
if (typeof module !== 'undefined') {
  module.exports = RztAPI;
}


// --- Component: shared/genius-api.js ---
// ==========================================
// GENIUS API & SECURE LYRICS ANNOTATIONS LAYER
// ==========================================

const GeniusAPI = {
  _pendingRequests: {},
  _initialized: false,

  _init() {
    if (this._initialized) return;
    this._initialized = true;

    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (!event.data || !event.data.__ym_sc_bridge_response) return;
        const { requestId, response } = event.data;
        const pending = this._pendingRequests[requestId];
        if (pending) {
          delete this._pendingRequests[requestId];
          if (response && response.ok) {
            pending.resolve(response.data || response.result || response.html);
          } else {
            pending.reject(new Error(response && response.error ? response.error : 'Unknown bridge error'));
          }
        }
      });
    }
  },

  _sendToBridge(type, payload) {
    this._init();
    return new Promise((resolve, reject) => {
      const requestId = `genius_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      this._pendingRequests[requestId] = { resolve, reject };

      // Timeout safety
      setTimeout(() => {
        if (this._pendingRequests[requestId]) {
          delete this._pendingRequests[requestId];
          reject(new Error('Genius bridge request timed out'));
        }
      }, 15000);

      window.postMessage({
        __ym_sc_bridge: true,
        requestId,
        type,
        payload
      }, '*');
    });
  },

  async searchSong(title, artist) {
    try {
      return await this._sendToBridge('GENIUS_SEARCH', { title, artist });
    } catch (err) {
      console.error('[GENIUS-API] Error searching song:', err);
      return null;
    }
  },

  async getReferents(songId) {
    try {
      return await this._sendToBridge('GENIUS_REFERENTS', { songId });
    } catch (err) {
      console.error('[GENIUS-API] Error fetching referents:', err);
      return null;
    }
  },

  async getSongHtml(url) {
    try {
      return await this._sendToBridge('GENIUS_HTML', { url });
    } catch (err) {
      console.error('[GENIUS-API] Error fetching song html:', err);
      return null;
    }
  }
};

// Text normalization helper to match lyrics lines with Genius annotations
function normalizeLyricsText(text) {
  if (!text) return '';
  let normalized = text.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents (combining diacritical marks)
    .toLowerCase();

  // Map Belarusian/Ukrainian characters to Russian equivalents
  const charMap = {
    'э': 'е',
    'ў': 'у',
    'і': 'и',
    'є': 'е',
    'ї': 'и',
    'ґ': 'г'
  };
  normalized = normalized.replace(/[эўієїґ]/g, m => charMap[m]);

  return normalized
    .replace(/[\s\p{P}]/gu, '') // strip all spaces and punctuation (unicode-aware)
    .replace(/[ё]/g, 'е')
    .replace(/[й]/g, 'и')
    .trim();
}

// Secure HTML Sanitizer/Renderer utilizing DOMParser and document.createElement (no innerHTML)
function renderSafeHtmlInto(container, htmlString) {
  container.replaceChildren(); // Safe equivalent to innerHTML = ''

  if (!htmlString) return;

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  function sanitizeAndAppend(srcNode, destParent) {
    for (const child of srcNode.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        destParent.appendChild(document.createTextNode(child.textContent));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tagName = child.tagName.toLowerCase();
        
        // Whitelist of allowed HTML formatting tags
        const allowedTags = ['p', 'a', 'b', 'i', 'strong', 'em', 'br', 'blockquote', 'img', 'hr', 'div', 'span'];
        if (allowedTags.includes(tagName)) {
          const newEl = document.createElement(tagName);
          
          // Whitelist and sanitize safe attributes
          if (tagName === 'a') {
            let href = child.getAttribute('href') || '';
            let refId = null;
            
            // Match relative or absolute Genius referent URLs (e.g. /36301397/Maybe-baby-instasamka-not-like-us)
            const refMatch = href.match(/^\/(\d+)(?:\/|$)/) || href.match(/^https:\/\/genius\.com\/(\d+)(?:\/|$)/);
            if (refMatch) {
              refId = refMatch[1];
            }
            
            if (refId) {
              newEl.setAttribute('data-id', refId);
              newEl.className = 'ym-lyric-annotated';
              newEl.setAttribute('href', href.startsWith('http') ? href : 'https://genius.com' + href);
            } else if (href) {
              if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
                newEl.setAttribute('href', href);
              } else if (href.startsWith('/')) {
                newEl.setAttribute('href', 'https://genius.com' + href);
              }
            }
            
            const dataId = child.getAttribute('data-id');
            if (dataId) {
              newEl.setAttribute('data-id', dataId);
              newEl.className = 'ym-lyric-annotated';
            }
            
            newEl.setAttribute('target', '_blank');
            newEl.setAttribute('rel', 'noopener noreferrer');
          } else if (tagName === 'img') {
            const src = child.getAttribute('src');
            if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
              newEl.setAttribute('src', src);
            }
            const alt = child.getAttribute('alt');
            if (alt) newEl.setAttribute('alt', alt);
            const width = child.getAttribute('width');
            if (width) newEl.setAttribute('width', width);
            const height = child.getAttribute('height');
            if (height) newEl.setAttribute('height', height);
          } else if (tagName === 'span' || tagName === 'div') {
            const className = child.getAttribute('class');
            if (className) {
              const allowedClasses = className.split(' ').filter(c => c.startsWith('ym-'));
              if (allowedClasses.length > 0) {
                newEl.className = allowedClasses.join(' ');
              }
            }
            const dataIdx = child.getAttribute('data-idx');
            if (dataIdx) {
              newEl.setAttribute('data-idx', dataIdx);
            }
          }
          
          sanitizeAndAppend(child, newEl);
          destParent.appendChild(newEl);
        } else {
          // Skip the tag but process its child nodes recursively
          sanitizeAndAppend(child, destParent);
        }
      }
    }
  }

  sanitizeAndAppend(doc.body, container);
}

if (typeof window !== 'undefined') {
  window.GeniusAPI = GeniusAPI;
  window.normalizeLyricsText = normalizeLyricsText;
  window.renderSafeHtmlInto = renderSafeHtmlInto;
}
if (typeof module !== 'undefined') {
  module.exports = { GeniusAPI, normalizeLyricsText, renderSafeHtmlInto };
}


// --- Component: page/variables.js ---
// Переменные состояния соединения
let socket = null;
let currentRoom = null;
let currentServerUrl = null;
let currentStatus = "disconnected"; // "disconnected", "connecting", "connected", "error"

// Переменные локального состояния плеера
let lastSentTrackId = null;
let lastSentIsPause = null;
let lastSentTime = 0;
let lastSentTimestamp = 0;
let lastSentQuality = null;
let lastSentCodec = null;
let isSyncingFromServer = false;
let targetTrackIdToSync = null;
let targetServerStateToSync = null;
let lastPlayerFound = false;
let hasLoggedActivePlayer = false;

// Переменные для текста песен
let currentLyricsTrackId = null;
let currentLyricsLines = null; // массив [{time, text}]
let currentLyricsPlain = null; // простой текст
let isLyricsLoading = false;
let isSyncedLyrics = false;
let lastLyricsActiveIndex = -1;
let lastFsUserInteractionTime = 0;
let lastSidebarUserInteractionTime = 0;

let ymLyricsTranslationCache = {};
let ymIsTranslating = false;
let currentTrackMetadata = null;



// --- Component: shared/themes.js ---
const THEME_CSS = {
  default: "",
  oled: `
    html, body, .ym-dark-theme, .ym-light-theme, [class*="CommonLayout_root"] {
      --color-bg-primary: #000000 !important;
      --color-bg-secondary: #0a0a0a !important;
      --color-bg-tertiary: #111111 !important;
      --yp-color-bg-primary: #000000 !important;
      --yp-color-bg-secondary: #0a0a0a !important;
      --yp-color-bg-tertiary: #111111 !important;
      --background-primary: #000000 !important;
      --background-secondary: #0a0a0a !important;
      --color-border-primary: #151515 !important;
      --yp-color-border-primary: #151515 !important;
      --color-text-primary: #ffffff !important;
      --yp-color-text-primary: #ffffff !important;
      --yp-color-text-secondary: rgba(255, 255, 255, 0.65) !important;
      --yp-color-text-tertiary: rgba(255, 255, 255, 0.4) !important;
      --player-average-color-background: #000000 !important;
      --ym-background-color-primary-enabled-basic: #000000 !important;
      --ym-background-color-primary-enabled-content: #000000 !important;
      --ym-background-color-primary-enabled-player: #000000 !important;
      --ym-background-color-primary-enabled-popover: #0a0a0a !important;
    }
    body, html, #root, #__next, 
    .deco-pane, .deco-pane-left, .deco-player-bg,
    [class*="page-root"], [class*="sidebar"], [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      background-color: #000000 !important;
      background: #000000 !important;
    }
    [class*="NavbarDesktop_navigationGroup"] {
      background-color: #000000 !important;
    }
    [class*="SidebarDesktop"] {
      background-color: #000000 !important;
    }
    [class*="FullscreenPlayerDesktop_root"],
    [class*="FullscreenPlayerDesktop_modalContent"],
    [class*="FullscreenPlayerDesktopContent_root"],
    [class*="FullscreenPlayerDesktopContent_fullscreenContent"],
    [class*="FullscreenPlayerDesktopContent_additionalContent"] {
      background-color: #000000 !important;
      background: #000000 !important;
    }
    [class*="CommonLayout_root"], [class*="DefaultLayout_root"],
    [class*="Content_root"], [class*="Content_main"], [class*="VibePage_root"] {
      --vibe-gradient-stop-0: #000000 !important;
      --vibe-gradient-stop-1: #000000 !important;
      --vibe-gradient-stop-2: #000000 !important;
      --vibe-gradient-stop-3: #000000 !important;
      --vibe-gradient-stop-4: #000000 !important;
      --vibe-gradient-stop-5: #000000 !important;
      --vibe-gradient-stop-6: #000000 !important;
      --vibe-gradient-stop-7: #000000 !important;
      --vibe-gradient-stop-8: #000000 !important;
      --vibe-gradient-stop-9: #000000 !important;
      --vibe-gradient-stop-10: #000000 !important;
      --vibe-gradient-stop-11: #000000 !important;
      --vibe-gradient-stop-12: #000000 !important;
      --vibe-gradient-stop-13: #000000 !important;
      --vibe-gradient-stop-14: #000000 !important;
      --vibe-gradient-stop-15: #000000 !important;
      background-color: #000000 !important;
      background: #000000 !important;
    }
    [class*="NavbarDesktop_logo__"] div:first-child svg {
      color: #ffffff !important;
      fill: #ffffff !important;
      --ym-logo-text-color: #ffffff !important;
      --ym-logo-color-primary-text: #ffffff !important;
      --ym-logo-color-primary-enabled: #ffffff !important;
    }
  `,
  cyberpunk: `
    html, body, .ym-dark-theme, .ym-light-theme, [class*="CommonLayout_root"] {
      --color-bg-primary: #0f081d !important;
      --color-bg-secondary: #180d2b !important;
      --color-bg-tertiary: #24143f !important;
      --yp-color-bg-primary: #0f081d !important;
      --yp-color-bg-secondary: #180d2b !important;
      --yp-color-bg-tertiary: #24143f !important;
      --yp-color-brand: #ff007f !important;
      --yp-color-brand-hover: #ff3399 !important;
      --color-text-primary: #00ffff !important;
      --yp-color-text-primary: #00ffff !important;
      --yp-color-text-secondary: #ff007f !important;
      --yp-color-text-tertiary: rgba(0, 255, 255, 0.5) !important;
      --yp-color-border-primary: #ff007f33 !important;
      --player-average-color-background: #0f081d !important;
      --ym-background-color-primary-enabled-basic: #0f081d !important;
      --ym-background-color-primary-enabled-content: #0f081d !important;
      --ym-background-color-primary-enabled-player: #0f081d !important;
      --ym-background-color-primary-enabled-popover: #180d2b !important;
      --ym-slider-color-primary-enabled: #ff007f !important;
      --ym-slider-color-primary-hovered: #ff3399 !important;
      --ym-slider-color-primary-pressed: #ff66b2 !important;
      --ym-controls-color-primary-default-enabled: #ff007f !important;
      --ym-controls-color-primary-default-hovered: #ff3399 !important;
      --ym-controls-color-primary-default-pressed: #ff66b2 !important;
    }
    body, html, #root, #__next,
    .deco-pane, .deco-pane-left, .deco-player-bg,
    [class*="page-root"], [class*="sidebar"], [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      background-color: #0f081d !important;
      color: #00ffff !important;
    }
    span, a, p, h1, h2, h3 {
      color: #00ffff !important;
    }
    svg, [class*="UwnL5AJBMMAp6NwMDdZk"], ._YzsXZGNK8KeaUFC4Ja1 svg {
      color: #ff007f !important;
    }
    [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      border-color: rgba(255, 0, 127, 0.4) !important;
      box-shadow: 0 0 15px rgba(255, 0, 127, 0.2) !important;
    }
    .ym-sync-popover, .ym-theme-popover {
      border-color: #ff007f !important;
      box-shadow: 0 0 20px rgba(255, 0, 127, 0.3) !important;
    }
    [class*="FullscreenPlayerDesktop_root"],
    [class*="FullscreenPlayerDesktop_modalContent"],
    [class*="FullscreenPlayerDesktopContent_root"],
    [class*="FullscreenPlayerDesktopContent_fullscreenContent"],
    [class*="FullscreenPlayerDesktopContent_additionalContent"] {
      background-color: #0f081d !important;
      background: #0f081d !important;
    }
    [class*="CommonLayout_root"], [class*="DefaultLayout_root"],
    [class*="Content_root"], [class*="Content_main"], [class*="VibePage_root"] {
      --vibe-gradient-stop-0: #0f081d !important;
      --vibe-gradient-stop-1: #0f081d !important;
      --vibe-gradient-stop-2: #0f081d !important;
      --vibe-gradient-stop-3: #0f081d !important;
      --vibe-gradient-stop-4: #0f081d !important;
      --vibe-gradient-stop-5: #0f081d !important;
      --vibe-gradient-stop-6: #0f081d !important;
      --vibe-gradient-stop-7: #0f081d !important;
      --vibe-gradient-stop-8: #0f081d !important;
      --vibe-gradient-stop-9: #0f081d !important;
      --vibe-gradient-stop-10: #0f081d !important;
      --vibe-gradient-stop-11: #0f081d !important;
      --vibe-gradient-stop-12: #0f081d !important;
      --vibe-gradient-stop-13: #0f081d !important;
      --vibe-gradient-stop-14: #0f081d !important;
      --vibe-gradient-stop-15: #0f081d !important;
      background-color: #0f081d !important;
      background: #0f081d !important;
    }
    [class*="NavbarDesktop_logo__"] div:first-child svg {
      color: #00ffff !important;
      fill: #00ffff !important;
      --ym-logo-text-color: #00ffff !important;
      --ym-logo-color-primary-text: #00ffff !important;
      --ym-logo-color-primary-enabled: #00ffff !important;
    }
  `,
  nord: `
    html, body, .ym-dark-theme, .ym-light-theme, [class*="CommonLayout_root"] {
      --color-bg-primary: #2e3440 !important;
      --color-bg-secondary: #3b4252 !important;
      --color-bg-tertiary: #434c5e !important;
      --yp-color-bg-primary: #2e3440 !important;
      --yp-color-bg-secondary: #3b4252 !important;
      --yp-color-bg-tertiary: #434c5e !important;
      --yp-color-brand: #88c0d0 !important;
      --yp-color-brand-hover: #8fbcbb !important;
      --color-text-primary: #d8dee9 !important;
      --yp-color-text-primary: #d8dee9 !important;
      --yp-color-text-secondary: #e5e9f0 !important;
      --yp-color-text-tertiary: #4c566a !important;
      --yp-color-border-primary: #4c566a !important;
      --player-average-color-background: #2e3440 !important;
      --ym-background-color-primary-enabled-basic: #2e3440 !important;
      --ym-background-color-primary-enabled-content: #2e3440 !important;
      --ym-background-color-primary-enabled-player: #2e3440 !important;
      --ym-background-color-primary-enabled-popover: #3b4252 !important;
      --ym-slider-color-primary-enabled: #88c0d0 !important;
      --ym-slider-color-primary-hovered: #8fbcbb !important;
      --ym-slider-color-primary-pressed: #81a1c1 !important;
      --ym-controls-color-primary-default-enabled: #88c0d0 !important;
      --ym-controls-color-primary-default-hovered: #8fbcbb !important;
      --ym-controls-color-primary-default-pressed: #81a1c1 !important;
    }
    body, html, #root, #__next,
    .deco-pane, .deco-pane-left, .deco-player-bg,
    [class*="page-root"], [class*="sidebar"], [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      background-color: #2e3440 !important;
      color: #d8dee9 !important;
    }
    span, a, p, h1, h2, h3 {
      color: #d8dee9 !important;
    }
    svg, [class*="UwnL5AJBMMAp6NwMDdZk"], ._YzsXZGNK8KeaUFC4Ja1 svg {
      color: #88c0d0 !important;
    }
    [class*="FullscreenPlayerDesktop_root"],
    [class*="FullscreenPlayerDesktop_modalContent"],
    [class*="FullscreenPlayerDesktopContent_root"],
    [class*="FullscreenPlayerDesktopContent_fullscreenContent"],
    [class*="FullscreenPlayerDesktopContent_additionalContent"] {
      background-color: #2e3440 !important;
      background: #2e3440 !important;
    }
    [class*="CommonLayout_root"], [class*="DefaultLayout_root"],
    [class*="Content_root"], [class*="Content_main"], [class*="VibePage_root"] {
      --vibe-gradient-stop-0: #2e3440 !important;
      --vibe-gradient-stop-1: #2e3440 !important;
      --vibe-gradient-stop-2: #2e3440 !important;
      --vibe-gradient-stop-3: #2e3440 !important;
      --vibe-gradient-stop-4: #2e3440 !important;
      --vibe-gradient-stop-5: #2e3440 !important;
      --vibe-gradient-stop-6: #2e3440 !important;
      --vibe-gradient-stop-7: #2e3440 !important;
      --vibe-gradient-stop-8: #2e3440 !important;
      --vibe-gradient-stop-9: #2e3440 !important;
      --vibe-gradient-stop-10: #2e3440 !important;
      --vibe-gradient-stop-11: #2e3440 !important;
      --vibe-gradient-stop-12: #2e3440 !important;
      --vibe-gradient-stop-13: #2e3440 !important;
      --vibe-gradient-stop-14: #2e3440 !important;
      --vibe-gradient-stop-15: #2e3440 !important;
      background-color: #2e3440 !important;
      background: #2e3440 !important;
    }
    [class*="NavbarDesktop_logo__"] div:first-child svg {
      color: #d8dee9 !important;
      fill: #d8dee9 !important;
      --ym-logo-text-color: #d8dee9 !important;
      --ym-logo-color-primary-text: #d8dee9 !important;
      --ym-logo-color-primary-enabled: #d8dee9 !important;
    }
  `,
  sakura: `
    html, body, .ym-dark-theme, .ym-light-theme, [class*="CommonLayout_root"] {
      --color-bg-primary: #fff0f5 !important;
      --color-bg-secondary: #ffe4e1 !important;
      --color-bg-tertiary: #ffdbdb !important;
      --yp-color-bg-primary: #fff0f5 !important;
      --yp-color-bg-secondary: #ffe4e1 !important;
      --yp-color-bg-tertiary: #ffdbdb !important;
      --yp-color-brand: #ff69b4 !important;
      --yp-color-brand-hover: #ff1493 !important;
      --yp-color-text-primary: #4a3b3c !important;
      --yp-color-text-secondary: #6e5c5d !important;
      --yp-color-border-primary: #ffd1d1 !important;
      --player-average-color-background: #fff0f5 !important;
      --ym-background-color-primary-enabled-basic: #fff0f5 !important;
      --ym-background-color-primary-enabled-content: #fff0f5 !important;
      --ym-background-color-primary-enabled-player: #fff0f5 !important;
      --ym-background-color-primary-enabled-popover: #ffe4e1 !important;
      --ym-slider-color-primary-enabled: #ff69b4 !important;
      --ym-slider-color-primary-hovered: #ff1493 !important;
      --ym-slider-color-primary-pressed: #db2777 !important;
      --ym-controls-color-primary-default-enabled: #ff69b4 !important;
      --ym-controls-color-primary-default-hovered: #ff1493 !important;
      --ym-controls-color-primary-default-pressed: #db2777 !important;
    }
    body, html, #root, #__next,
    .deco-pane, .deco-pane-left, .deco-player-bg,
    [class*="page-root"], [class*="sidebar"], [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      background-color: #fff0f5 !important;
      color: #4a3b3c !important;
    }
    [class*="FullscreenPlayerDesktop_root"],
    [class*="FullscreenPlayerDesktop_modalContent"],
    [class*="FullscreenPlayerDesktopContent_root"],
    [class*="FullscreenPlayerDesktopContent_fullscreenContent"],
    [class*="FullscreenPlayerDesktopContent_additionalContent"] {
      background-color: #fff0f5 !important;
      background: #fff0f5 !important;
    }
    span, a, p, h1, h2, h3 {
      color: #4a3b3c !important;
    }
    svg, [class*="UwnL5AJBMMAp6NwMDdZk"], ._YzsXZGNK8KeaUFC4Ja1 svg {
      color: #4a3b3c !important;
    }
    [class*="CommonLayout_root"], [class*="DefaultLayout_root"],
    [class*="Content_root"], [class*="Content_main"], [class*="VibePage_root"] {
      --vibe-gradient-stop-0: #fff0f5 !important;
      --vibe-gradient-stop-1: #fff0f5 !important;
      --vibe-gradient-stop-2: #fff0f5 !important;
      --vibe-gradient-stop-3: #fff0f5 !important;
      --vibe-gradient-stop-4: #fff0f5 !important;
      --vibe-gradient-stop-5: #fff0f5 !important;
      --vibe-gradient-stop-6: #fff0f5 !important;
      --vibe-gradient-stop-7: #fff0f5 !important;
      --vibe-gradient-stop-8: #fff0f5 !important;
      --vibe-gradient-stop-9: #fff0f5 !important;
      --vibe-gradient-stop-10: #fff0f5 !important;
      --vibe-gradient-stop-11: #fff0f5 !important;
      --vibe-gradient-stop-12: #fff0f5 !important;
      --vibe-gradient-stop-13: #fff0f5 !important;
      --vibe-gradient-stop-14: #fff0f5 !important;
      --vibe-gradient-stop-15: #fff0f5 !important;
      background-color: #fff0f5 !important;
      background: #fff0f5 !important;
    }
    [class*="NavbarDesktop_logo__"] div:first-child svg {
      color: #4a3b3c !important;
      fill: #4a3b3c !important;
      --ym-logo-text-color: #4a3b3c !important;
      --ym-logo-color-primary-text: #4a3b3c !important;
      --ym-logo-color-primary-enabled: #4a3b3c !important;
    }
  `
};

function isValidHexColor(color) {
  return typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color);
}

function adjustColorBrightness(hex, percent) {
  if (!isValidHexColor(hex)) return '#000000';
  let R = parseInt(hex.substring(1, 3), 16);
  let G = parseInt(hex.substring(3, 5), 16);
  let B = parseInt(hex.substring(5, 7), 16);

  R = parseInt(R * (100 + percent) / 100);
  G = parseInt(G * (100 + percent) / 100);
  B = parseInt(B * (100 + percent) / 100);

  R = (R < 255) ? R : 255;
  G = (G < 255) ? G : 255;
  B = (B < 255) ? B : 255;

  R = (R > 0) ? R : 0;
  G = (G > 0) ? G : 0;
  B = (B > 0) ? B : 0;

  const rHex = R.toString(16).padStart(2, '0');
  const gHex = G.toString(16).padStart(2, '0');
  const bHex = B.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

function generateCustomThemeCSS(colors) {
  const bg = isValidHexColor(colors.bg) ? colors.bg : '#000000';
  const accent = isValidHexColor(colors.accent) ? colors.accent : '#ffdb4d';
  const text = isValidHexColor(colors.text) ? colors.text : '#ffffff';

  const bgDarker = adjustColorBrightness(bg, -20);
  const borderCol = adjustColorBrightness(bg, 15);

  return `
    html, body, .ym-dark-theme, .ym-light-theme, [class*="CommonLayout_root"] {
      --color-bg-primary: ${bg} !important;
      --color-bg-secondary: ${bgDarker} !important;
      --color-bg-tertiary: ${bgDarker} !important;
      --yp-color-bg-primary: ${bg} !important;
      --yp-color-bg-secondary: ${bgDarker} !important;
      --yp-color-bg-tertiary: ${bgDarker} !important;
      --yp-color-brand: ${accent} !important;
      --yp-color-brand-hover: ${accent} !important;
      --color-text-primary: ${text} !important;
      --yp-color-text-primary: ${text} !important;
      --yp-color-text-secondary: ${text}b3 !important;
      --yp-color-text-tertiary: ${text}80 !important;
      --yp-color-border-primary: ${borderCol} !important;
      --player-average-color-background: ${bg} !important;
      --ym-background-color-primary-enabled-basic: ${bg} !important;
      --ym-background-color-primary-enabled-content: ${bg} !important;
      --ym-background-color-primary-enabled-player: ${bg} !important;
      --ym-background-color-primary-enabled-popover: ${bgDarker} !important;
      --ym-slider-color-primary-enabled: ${accent} !important;
      --ym-slider-color-primary-hovered: ${accent} !important;
      --ym-slider-color-primary-pressed: ${accent} !important;
      --ym-controls-color-primary-default-enabled: ${accent} !important;
      --ym-controls-color-primary-default-hovered: ${accent} !important;
      --ym-controls-color-primary-default-pressed: ${accent} !important;
    }
    body, html, #root, #__next,
    .deco-pane, .deco-pane-left, .deco-player-bg,
    [class*="page-root"], [class*="sidebar"], [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      background-color: ${bg} !important;
      color: ${text} !important;
    }
    [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      border-color: ${borderCol} !important;
    }
    [class*="CommonLayout_root"], [class*="DefaultLayout_root"],
    [class*="Content_root"], [class*="Content_main"], [class*="VibePage_root"] {
      --vibe-gradient-stop-0: ${bg} !important;
      --vibe-gradient-stop-1: ${bg} !important;
      --vibe-gradient-stop-2: ${bg} !important;
      --vibe-gradient-stop-3: ${bg} !important;
      --vibe-gradient-stop-4: ${bg} !important;
      --vibe-gradient-stop-5: ${bg} !important;
      --vibe-gradient-stop-6: ${bg} !important;
      --vibe-gradient-stop-7: ${bg} !important;
      --vibe-gradient-stop-8: ${bg} !important;
      --vibe-gradient-stop-9: ${bg} !important;
      --vibe-gradient-stop-10: ${bg} !important;
      --vibe-gradient-stop-11: ${bg} !important;
      --vibe-gradient-stop-12: ${bg} !important;
      --vibe-gradient-stop-13: ${bg} !important;
      --vibe-gradient-stop-14: ${bg} !important;
      --vibe-gradient-stop-15: ${bg} !important;
      background-color: ${bg} !important;
      background: ${bg} !important;
    }
    [class*="FullscreenPlayerDesktop_root"],
    [class*="FullscreenPlayerDesktop_modalContent"],
    [class*="FullscreenPlayerDesktopContent_root"],
    [class*="FullscreenPlayerDesktopContent_fullscreenContent"],
    [class*="FullscreenPlayerDesktopContent_additionalContent"] {
      background-color: ${bg} !important;
      background: ${bg} !important;
    }
    span, a, p, h1, h2, h3, div {
      color: ${text};
    }
    svg, [class*="UwnL5AJBMMAp6NwMDdZk"], ._YzsXZGNK8KeaUFC4Ja1 svg {
      color: ${text} !important;
    }
    [class*="NavbarDesktop_logo__"] div:first-child svg {
      color: ${text} !important;
      fill: ${text} !important;
      --ym-logo-text-color: ${text} !important;
      --ym-logo-color-primary-text: ${text} !important;
      --ym-logo-color-primary-enabled: ${text} !important;
    }
  `;
}

function applyThemeCSS(themeName, customColors) {
  const allowedThemes = ["default", "oled", "cyberpunk", "nord", "sakura", "custom"];
  if (!allowedThemes.includes(themeName)) {
    themeName = "default";
  }

  let styleEl = document.getElementById('ym-theme-styles');
  if (themeName === 'default') {
    if (styleEl) {
      styleEl.remove();
    }
    return;
  }

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'ym-theme-styles';
    document.head.appendChild(styleEl);
  }

  let cssText = '';
  if (themeName === 'custom') {
    const colors = customColors || { bg: '#000000', accent: '#ffdb4d', text: '#ffffff' };
    cssText = generateCustomThemeCSS(colors);
  } else {
    cssText = THEME_CSS[themeName] || '';
  }

  cssText += `
    [class*="VibePlayerBar_root"] {
      background-color: revert !important;
      background: revert !important;
      border-color: revert !important;
      box-shadow: revert !important;
    }

    /* Fix: нативный градиент-фейд SyncLyrics использует цвет фона из темы.
       Переопределяем ::before/::after чтобы он всегда совпадал с нашей темой. */
    [class*="SyncLyrics_content"] {
      position: relative;
    }
    [class*="SyncLyrics_content"]::before,
    [class*="SyncLyrics_content"]::after {
      background: none !important;
    }
    [class*="SyncLyrics_content"]::before {
      content: "" !important;
      display: block !important;
      position: absolute !important;
      left: 0; right: 0; top: 0;
      height: 120px !important;
      background: linear-gradient(
        to bottom,
        var(--yp-color-bg-primary) 0%,
        transparent 100%
      ) !important;
      pointer-events: none !important;
      z-index: 10 !important;
    }
    [class*="SyncLyrics_content"]::after {
      content: "" !important;
      display: block !important;
      position: absolute !important;
      left: 0; right: 0; bottom: 0;
      height: 120px !important;
      background: linear-gradient(
        to top,
        var(--yp-color-bg-primary) 0%,
        transparent 100%
      ) !important;
      pointer-events: none !important;
      z-index: 10 !important;
    }
  `;

  styleEl.textContent = cssText;
}


// --- Component: shared/navbar-sync.js ---
function syncButtonCollapsedState(btnId) {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (!container) return;
  const refItem = container.querySelector('li:not(.ym-navbar-item-injected)');
  const btn = document.getElementById(btnId);
  if (!refItem || !btn) return;

  // 1. Копируем классы списка
  const refItemClasses = Array.from(refItem.classList);
  btn.className = refItemClasses.join(' ') + ' ym-navbar-item-injected';

  // 2. Копируем классы ссылки
  const refLink = refItem.querySelector('a');
  const link = btn.querySelector('a');
  if (refLink && link) {
    link.className = refLink.className;
  }

  // 3. Синхронизируем класс скрытия текста на спане
  const refSpan = refLink ? refLink.querySelector('span') : null;
  const span = link ? link.querySelector('.nxMXCBiVfgH4oxds3f2y span') : null;
  if (refSpan && span) {
    const collapsedClass = Array.from(refSpan.classList).find(c => c.includes('title_collapsed') || c.includes('_title_collapsed'));

    // Удалим старые collapsed-классы с нашего спана
    const oldCollapsedClasses = Array.from(span.classList).filter(c => c.includes('title_collapsed') || c.includes('_title_collapsed'));
    oldCollapsedClasses.forEach(c => span.classList.remove(c));
    if (collapsedClass) {
      span.classList.add(collapsedClass);
      btn.classList.add('ym-collapsed');
    } else {
      btn.classList.remove('ym-collapsed');
    }
  }
}

// --- Component: shared/sync-popover.js ---
function injectSyncButton() {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (!container) return;
  const existingBtn = document.getElementById('ym-sync-button');
  if (existingBtn) {
    if (container.contains(existingBtn)) {
      return; // Уже добавлена в нужный контейнер
    } else {
      existingBtn.remove(); // Удаляем устаревшую кнопку
    }
  }
  injectStyles();
  const btn = document.createElement('li');
  btn.id = 'ym-sync-button';
  btn.className = 'HcfYy4VfnRHqgXzIdL7w kRmUIkcHKD5AgtpPo8wT ym-navbar-item-injected';
  btn.setAttribute('title', 'Синхронизация прослушивания');
  btn.innerHTML = `
    <a class="buOTZq_TKQOVyjMLrXvB ZfF8mQ3Iftpwu0aZgDtG yWJHrpNsBvchs9Jjyokk" style="cursor: pointer;">
      <div class="_YzsXZGNK8KeaUFC4Ja1" style="position: relative;">
        <svg class="UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span class="ym-sync-status-indicator ${currentStatus}"></span>
      </div>
      <div class="nxMXCBiVfgH4oxds3f2y">
        <span title="Синхронизация" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA _3_Mxw7Si7j2g4kWjlpR" style="-webkit-line-clamp: 1;">Синхронизация</span>
      </div>
    </a>
  `;
  container.appendChild(btn);
  btn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    togglePopover();
  });
  injectPopover();

  // Добавляем отслеживание скролла сайдбара, чтобы поповер перемещался вместе с кнопкой
  const scrollableSidebar = document.querySelector('[class*="NavbarDesktop_scrollableContent"]');
  if (scrollableSidebar) {
    scrollableSidebar.addEventListener('scroll', () => {
      const popover = document.getElementById('ym-sync-popover');
      if (popover && popover.classList.contains('show')) {
        positionPopover();
      }
    });

    // Настраиваем ResizeObserver для мгновенной синхронизации при сжатии
    if (!window.ymSyncSidebarObserver) {
      const observer = new ResizeObserver(entries => {
        syncButtonCollapsedState('ym-sync-button');
        syncButtonCollapsedState('ym-theme-button');
      });
      observer.observe(scrollableSidebar);
      window.ymSyncSidebarObserver = observer;
    }
  }
}

function injectPopover() {
  if (document.getElementById('ym-sync-popover')) return;
  const popover = document.createElement('div');
  popover.id = 'ym-sync-popover';
  popover.className = 'ym-sync-popover';
  popover.innerHTML = `
    <div class="ym-sync-popover-header">
      <h3>Синхронизация</h3>
      <button class="ym-sync-close-btn" id="ym-close-btn">&times;</button>
    </div>
    <div class="ym-sync-popover-body">
      <div class="ym-sync-input-group">
        <label for="ym-serverUrl">Адрес сервера</label>
        <input type="text" id="ym-serverUrl" placeholder="Например: http://localhost:3000" />
      </div>
      <div class="ym-sync-input-group">
        <label for="ym-roomId">Идентификатор комнаты</label>
        <div class="ym-sync-room-input-container">
          <input type="text" id="ym-roomId" placeholder="Например: room-404" />
          <button id="ym-generate-room-btn" class="ym-sync-icon-only-btn" title="Сгенерировать случайную комнату">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
              <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5Z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div id="ym-status-card" class="ym-sync-status-card" style="display: none;">
        <div class="ym-sync-status-info">
          <span class="ym-sync-pulse-dot"></span>
          <span id="ym-status-text">Подключено: <strong id="ym-active-room">-</strong></span>
        </div>
        <div class="ym-sync-status-actions" style="display: flex; gap: 6px;">
          <button id="ym-copy-btn" class="ym-sync-icon-only-btn" title="Копировать ID комнаты">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button id="ym-share-btn" class="ym-sync-icon-only-btn" title="Копировать ссылку-приглашение">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
        </div>
      </div>
      
      <button id="ym-connectBtn" class="ym-sync-primary-btn">Подключиться</button>
      <button id="ym-disconnectBtn" class="ym-sync-danger-btn" style="display: none;">Отключиться</button>

      <div class="ym-sync-settings-section" id="ym-discord-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.12); ${window.__ymSyncBridge ? '' : 'display: none;'}">
        <div class="ym-sync-input-group" style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 0;">
          <label for="ym-discord-rpc-toggle" style="font-size: 11px; color: rgba(255,255,255,0.7); cursor: pointer; user-select: none;">Статус в Discord (Rich Presence)</label>
          <input type="checkbox" id="ym-discord-rpc-toggle" style="cursor: pointer; width: 14px; height: 14px; margin: 0;" />
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(popover);
  setupPopoverListeners();

  // Синхронизация при первом создании
  const storedRoomId = localStorage.getItem('currentRoomId');
  const storedServerUrl = localStorage.getItem('serverUrl') || 'http://localhost:3000';
  const serverInput = document.getElementById('ym-serverUrl');
  const roomInput = document.getElementById('ym-roomId');
  if (serverInput) {
    serverInput.value = storedServerUrl;
  }
  if (roomInput) {
    roomInput.value = storedRoomId || '';
  }
  updatePopoverUI(storedRoomId, currentStatus);
}

function setupPopoverListeners() {
  const popover = document.getElementById('ym-sync-popover');
  const closeBtn = document.getElementById('ym-close-btn');
  const connectBtn = document.getElementById('ym-connectBtn');
  const disconnectBtn = document.getElementById('ym-disconnectBtn');
  const generateBtn = document.getElementById('ym-generate-room-btn');
  const copyBtn = document.getElementById('ym-copy-btn');
  const shareBtn = document.getElementById('ym-share-btn');
  const roomInput = document.getElementById('ym-roomId');
  const serverInput = document.getElementById('ym-serverUrl');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      popover.classList.remove('show');
    });
  }
  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      if (roomInput) {
        const randId = 'sync-' + Math.random().toString(36).substring(2, 8);
        roomInput.value = randId;
      }
    });
  }
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (roomInput && roomInput.value) {
        navigator.clipboard.writeText(roomInput.value).then(() => {
          const originalHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;
          setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
          }, 1500);
        }).catch(err => {
          console.error('Failed to copy room ID: ', err);
        });
      }
    });
  }
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (roomInput && roomInput.value) {
        const roomId = roomInput.value;
        const activeUrl = new URL(window.location.href);
        activeUrl.searchParams.delete('sync_code');
        activeUrl.searchParams.set('sync_code', roomId);
        navigator.clipboard.writeText(activeUrl.toString()).then(() => {
          const originalHTML = shareBtn.innerHTML;
          shareBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;
          setTimeout(() => {
            shareBtn.innerHTML = originalHTML;
          }, 1500);
        }).catch(err => {
          console.error('Failed to copy share link: ', err);
        });
      }
    });
  }
  if (connectBtn) {
    connectBtn.addEventListener('click', () => {
      const roomId = roomInput ? roomInput.value.trim() : '';
      let serverUrl = serverInput ? serverInput.value.trim() : '';
      if (!roomId) return;
      if (!serverUrl) {
        serverUrl = 'http://localhost:3000';
      }
      if (!/^https?:\/\//i.test(serverUrl)) {
        serverUrl = 'http://' + serverUrl;
      }
      if (serverInput) serverInput.value = serverUrl;
      currentRoom = roomId;

      // Сохраняем в localStorage и запускаем соединение
      localStorage.setItem('currentRoomId', roomId);
      localStorage.setItem('serverUrl', serverUrl);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ currentRoomId: roomId, serverUrl: serverUrl });
      }
      connectToServer(serverUrl);
      if (typeof sendStateToPreload === 'function') {
        sendStateToPreload();
      }
    });
  }
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      localStorage.removeItem('currentRoomId');
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(['currentRoomId']);
      }
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      currentRoom = null;
      currentServerUrl = null;
      currentStatus = "disconnected";
      updatePopoverUI(null, currentStatus);
      if (typeof sendStateToPreload === 'function') {
        sendStateToPreload();
      }
    });
  }
  const discordToggle = document.getElementById('ym-discord-rpc-toggle');
  if (discordToggle) {
    const browserRpcEnabled = localStorage.getItem('ymDiscordRpcEnabled') !== 'false';
    discordToggle.checked = browserRpcEnabled;
    discordToggle.addEventListener('change', e => {
      const enabled = e.target.checked;
      localStorage.setItem('ymDiscordRpcEnabled', enabled ? 'true' : 'false');
      if (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendSettings === 'function') {
        window.__ymSyncBridge.sendSettings({
          enabled: enabled
        });
      } else {
        window.postMessage({
          type: 'YM_SYNC_SETTINGS_CHANGED',
          enabled: enabled
        }, '*');
      }
    });
  }
}

function togglePopover() {
  const popover = document.getElementById('ym-sync-popover');
  if (!popover) return;
  const isShowing = popover.classList.contains('show');
  if (isShowing) {
    popover.classList.remove('show');
  } else {
    const themePopover = document.getElementById('ym-theme-popover');
    if (themePopover) themePopover.classList.remove('show');
    const storedRoomId = localStorage.getItem('currentRoomId');
    const storedServerUrl = localStorage.getItem('serverUrl') || 'http://localhost:3000';
    const serverInput = document.getElementById('ym-serverUrl');
    const roomInput = document.getElementById('ym-roomId');
    if (serverInput && !serverInput.disabled) {
      serverInput.value = storedServerUrl;
    }
    if (roomInput && !roomInput.disabled) {
      roomInput.value = storedRoomId || '';
    }
    positionPopover();
    popover.classList.add('show');
  }
}

function positionPopover() {
  const btn = document.getElementById('ym-sync-button');
  const popover = document.getElementById('ym-sync-popover');
  if (!btn || !popover) return;
  const rect = btn.getBoundingClientRect();
  const popoverWidth = popover.offsetWidth || 280;
  const popoverHeight = popover.offsetHeight || 190;
  let left = rect.right + 12;
  let top = rect.top + rect.height / 2 - popoverHeight / 2;
  if (top < 10) top = 10;
  if (top + popoverHeight > window.innerHeight - 10) {
    top = window.innerHeight - popoverHeight - 10;
  }
  if (left + popoverWidth > window.innerWidth - 10) {
    left = window.innerWidth - popoverWidth - 10;
  }
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

// Дополнительные функции для тем оформления

function updatePopoverUI(roomId, status) {
  const popover = document.getElementById('ym-sync-popover');
  if (!popover) return;
  const connectBtn = document.getElementById('ym-connectBtn');
  const disconnectBtn = document.getElementById('ym-disconnectBtn');
  const statusCard = document.getElementById('ym-status-card');
  const activeRoom = document.getElementById('ym-active-room');
  const statusText = document.getElementById('ym-status-text');
  const indicator = document.querySelector('.ym-sync-status-indicator');
  const serverInput = document.getElementById('ym-serverUrl');
  const roomInput = document.getElementById('ym-roomId');
  if (indicator) {
    indicator.className = 'ym-sync-status-indicator ' + status;
  }
  if (status === 'connected') {
    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = 'block';
    if (statusCard) statusCard.style.display = 'flex';
    if (activeRoom) activeRoom.textContent = roomId;
    if (statusText) statusText.innerHTML = `Подключено: <strong id="ym-active-room">${roomId}</strong>`;
    if (serverInput) serverInput.disabled = true;
    if (roomInput) roomInput.disabled = true;
  } else if (status === 'connecting') {
    if (connectBtn) {
      connectBtn.style.display = 'block';
      connectBtn.textContent = 'Подключение...';
      connectBtn.disabled = true;
    }
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    if (statusCard) statusCard.style.display = 'none';
    if (serverInput) serverInput.disabled = true;
    if (roomInput) roomInput.disabled = true;
  } else {
    if (connectBtn) {
      connectBtn.style.display = 'block';
      connectBtn.textContent = 'Подключиться';
      connectBtn.disabled = false;
    }
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    if (statusCard) statusCard.style.display = 'none';
    if (serverInput) serverInput.disabled = false;
    if (roomInput) roomInput.disabled = false;
  }
  if (popover.classList.contains('show')) {
    setTimeout(positionPopover, 0);
  }
}

// Закрытие при клике вовне

// Закрытие при клике вовне
document.addEventListener('click', e => {
  const syncPopover = document.getElementById('ym-sync-popover');
  const syncBtn = document.getElementById('ym-sync-button');
  if (syncPopover && syncBtn && syncPopover.classList.contains('show')) {
    if (!syncPopover.contains(e.target) && !syncBtn.contains(e.target)) {
      syncPopover.classList.remove('show');
    }
  }
  const themePopover = document.getElementById('ym-theme-popover');
  const themeBtn = document.getElementById('ym-theme-button');
  if (themePopover && themeBtn && themePopover.classList.contains('show')) {
    if (!themePopover.contains(e.target) && !themeBtn.contains(e.target)) {
      themePopover.classList.remove('show');
    }
  }
  const lyricsPopover = document.getElementById('ym-lyrics-popover');
  const lyricsBtn = findLyricsButton();
  if (lyricsPopover && lyricsBtn && lyricsPopover.classList.contains('show')) {
    if (!lyricsPopover.contains(e.target) && !lyricsBtn.contains(e.target)) {
      lyricsPopover.classList.remove('show');
    }
  }
});

// Корректировка позиции при ресайзе

// Корректировка позиции при ресайзе
window.addEventListener('resize', () => {
  const syncPopover = document.getElementById('ym-sync-popover');
  if (syncPopover && syncPopover.classList.contains('show')) {
    positionPopover();
  }
  const themePopover = document.getElementById('ym-theme-popover');
  if (themePopover && themePopover.classList.contains('show')) {
    positionThemePopover();
  }
  const lyricsPopover = document.getElementById('ym-lyrics-popover');
  if (lyricsPopover && lyricsPopover.classList.contains('show')) {
    positionLyricsPopover();
  }
});

// Функции для текста песен (LRCLIB)

// --- Component: shared/theme-popover.js ---
// Дополнительные функции для тем оформления
function injectThemeButton() {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (!container) return;
  const existingBtn = document.getElementById('ym-theme-button');
  if (existingBtn) {
    if (container.contains(existingBtn)) {
      return;
    } else {
      existingBtn.remove();
    }
  }
  injectStyles();
  const btn = document.createElement('li');
  btn.id = 'ym-theme-button';
  btn.className = 'HcfYy4VfnRHqgXzIdL7w kRmUIkcHKD5AgtpPo8wT ym-navbar-item-injected';
  btn.setAttribute('title', 'Темы оформления');
  const link = document.createElement('a');
  link.className = 'buOTZq_TKQOVyjMLrXvB ZfF8mQ3Iftpwu0aZgDtG yWJHrpNsBvchs9Jjyokk';
  link.style.cursor = 'pointer';
  const iconWrapper = document.createElement('div');
  iconWrapper.className = '_YzsXZGNK8KeaUFC4Ja1';
  iconWrapper.style.position = 'relative';
  const svgDoc = new DOMParser().parseFromString(`
    <svg xmlns="http://www.w3.org/2000/svg" class="UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.35249 19.5 5.21553 20.3546 4.73752 20.803C4.26943 21.2421 3.59374 21.464 3.01828 21.2801C2.5188 21.1205 2.08722 20.8122 1.83401 20.3551"/>
      <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor"/>
      <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor"/>
      <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor"/>
      <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor"/>
    </svg>
  `, 'image/svg+xml');
  iconWrapper.appendChild(svgDoc.documentElement);
  const textWrapper = document.createElement('div');
  textWrapper.className = 'nxMXCBiVfgH4oxds3f2y';
  const textSpan = document.createElement('span');
  textSpan.className = '_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA _3_Mxw7Si7j2g4kWjlpR';
  textSpan.style.webkitLineClamp = '1';
  textSpan.textContent = 'Темы';
  textSpan.setAttribute('title', 'Темы оформления');
  textWrapper.appendChild(textSpan);
  link.appendChild(iconWrapper);
  link.appendChild(textWrapper);
  btn.appendChild(link);
  const syncBtn = document.getElementById('ym-sync-button');
  if (syncBtn && syncBtn.nextSibling) {
    container.insertBefore(btn, syncBtn.nextSibling);
  } else {
    container.appendChild(btn);
  }
  btn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    toggleThemePopover();
  });
  injectThemePopover();
}

function injectThemePopover() {
  if (document.getElementById('ym-theme-popover')) return;
  const popover = document.createElement('div');
  popover.id = 'ym-theme-popover';
  popover.className = 'ym-theme-popover';
  const header = document.createElement('div');
  header.className = 'ym-theme-popover-header';
  const title = document.createElement('h3');
  title.textContent = 'Темы оформления';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'ym-theme-close-btn';
  closeBtn.id = 'ym-theme-close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => {
    popover.classList.remove('show');
  });
  header.appendChild(title);
  header.appendChild(closeBtn);
  popover.appendChild(header);
  const body = document.createElement('div');
  body.className = 'ym-theme-popover-body';
  const themeList = document.createElement('div');
  themeList.className = 'ym-theme-list';
  const themes = [{
    id: 'default',
    name: 'Стандартная (Тёмная)'
  }, {
    id: 'oled',
    name: 'OLED Black (Глубокий чёрный)'
  }, {
    id: 'cyberpunk',
    name: 'Neon Cyber (Киберпанк)'
  }, {
    id: 'nord',
    name: 'Nord Frost (Арктический синий)'
  }, {
    id: 'sakura',
    name: 'Sakura Pastel (Пастельный розовый)'
  }, {
    id: 'custom',
    name: 'Своя тема'
  }];
  const customSettings = document.createElement('div');
  customSettings.id = 'ym-custom-theme-settings';
  customSettings.style.display = 'none';
  customSettings.style.flexDirection = 'column';
  customSettings.style.gap = '6px';
  customSettings.style.marginTop = '8px';
  customSettings.style.padding = '8px 8px 8px 8px';
  customSettings.style.borderTop = '1px solid rgba(255, 255, 255, 0.08)';
  const fields = [{
    id: 'ym-custom-bg-color',
    label: 'Цвет фона',
    key: 'bg',
    defaultVal: '#000000'
  }, {
    id: 'ym-custom-accent-color',
    label: 'Цвет акцента',
    key: 'accent',
    defaultVal: '#ffdb4d'
  }, {
    id: 'ym-custom-text-color',
    label: 'Цвет текста',
    key: 'text',
    defaultVal: '#ffffff'
  }];
  const colorInputs = {};
  fields.forEach(field => {
    const group = document.createElement('div');
    group.style.display = 'flex';
    group.style.flexDirection = 'row';
    group.style.justifyContent = 'space-between';
    group.style.alignItems = 'center';
    group.style.padding = '10px 14px';
    group.style.background = 'var(--ym-popover-item-bg)';
    group.style.border = '1px solid var(--ym-popover-item-border)';
    group.style.borderRadius = '12px';
    
    const lbl = document.createElement('label');
    lbl.setAttribute('for', field.id);
    lbl.textContent = field.label;
    lbl.style.fontSize = '13px';
    lbl.style.color = 'var(--ym-popover-text)';
    lbl.style.fontFamily = 'inherit';
    
    const input = document.createElement('input');
    input.setAttribute('type', 'color');
    input.id = field.id;
    input.style.width = '40px';
    input.style.height = '24px';
    input.style.padding = '0';
    input.style.border = 'none';
    input.style.background = 'none';
    input.style.cursor = 'pointer';
    input.value = field.defaultVal;
    
    group.appendChild(lbl);
    group.appendChild(input);
    customSettings.appendChild(group);
    colorInputs[field.key] = input;

    // Реакция на изменение цвета
    input.addEventListener('input', () => {
      const colors = {
        bg: colorInputs.bg.value,
        accent: colorInputs.accent.value,
        text: colorInputs.text.value
      };
      localStorage.setItem('ymCustomThemeColors', JSON.stringify(colors));
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ ymCustomThemeColors: JSON.stringify(colors) });
      }
      applyThemeCSS('custom', colors);
    });
  });
  themes.forEach(theme => {
    const opt = document.createElement('div');
    opt.className = 'ym-theme-option';
    opt.dataset.themeId = theme.id;
    const preview = document.createElement('span');
    preview.className = `ym-theme-preview ym-theme-preview-${theme.id}`;
    opt.appendChild(preview);
    const label = document.createElement('span');
    label.className = 'ym-theme-label';
    label.textContent = theme.name;
    opt.appendChild(label);
    opt.addEventListener('click', () => {
      localStorage.setItem('ymActiveTheme', theme.id);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ ymActiveTheme: theme.id });
      }
      if (theme.id === 'custom') {
        const colors = {
          bg: colorInputs.bg.value,
          accent: colorInputs.accent.value,
          text: colorInputs.text.value
        };
        const storedColors = localStorage.getItem('ymCustomThemeColors');
        let currentColors = colors;
        try {
          if (storedColors) currentColors = JSON.parse(storedColors);
        } catch (e) {}
        applyThemeCSS('custom', currentColors);
        updateThemePopoverUI('custom');
      } else {
        applyThemeCSS(theme.id);
        updateThemePopoverUI(theme.id);
      }
    });
    themeList.appendChild(opt);
  });
  body.appendChild(themeList);
  body.appendChild(customSettings);
  popover.appendChild(body);
  document.body.appendChild(popover);

  // Инициализация значений при создании
  const activeTheme = localStorage.getItem('ymActiveTheme') || 'default';
  updateThemePopoverUI(activeTheme);
  const storedColors = localStorage.getItem('ymCustomThemeColors');
  if (storedColors) {
    try {
      const parsed = JSON.parse(storedColors);
      if (parsed) {
        if (isValidHexColor(parsed.bg)) colorInputs.bg.value = parsed.bg;
        if (isValidHexColor(parsed.accent)) colorInputs.accent.value = parsed.accent;
        if (isValidHexColor(parsed.text)) colorInputs.text.value = parsed.text;
      }
    } catch (e) {}
  }
}

function toggleThemePopover() {
  const popover = document.getElementById('ym-theme-popover');
  if (!popover) return;
  const isShowing = popover.classList.contains('show');
  if (isShowing) {
    popover.classList.remove('show');
  } else {
    const syncPopover = document.getElementById('ym-sync-popover');
    if (syncPopover) syncPopover.classList.remove('show');
    const activeTheme = localStorage.getItem('ymActiveTheme') || 'default';
    updateThemePopoverUI(activeTheme);
    positionThemePopover();
    popover.classList.add('show');
  }
}

function positionThemePopover() {
  const btn = document.getElementById('ym-theme-button');
  const popover = document.getElementById('ym-theme-popover');
  if (!btn || !popover) return;
  const rect = btn.getBoundingClientRect();
  const popoverWidth = popover.offsetWidth || 280;
  const popoverHeight = popover.offsetHeight || 230;
  let left = rect.right + 12;
  let top = rect.top + rect.height / 2 - popoverHeight / 2;
  if (top < 10) top = 10;
  if (top + popoverHeight > window.innerHeight - 10) {
    top = window.innerHeight - popoverHeight - 10;
  }
  if (left + popoverWidth > window.innerWidth - 10) {
    left = window.innerWidth - popoverWidth - 10;
  }
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function updateThemePopoverUI(themeName) {
  const popover = document.getElementById('ym-theme-popover');
  if (!popover) return;
  const options = popover.querySelectorAll('.ym-theme-option');
  options.forEach(opt => {
    if (opt.dataset.themeId === themeName) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });
  const customPanel = document.getElementById('ym-custom-theme-settings');
  if (customPanel) {
    if (themeName === 'custom') {
      customPanel.style.display = 'flex';
    } else {
      customPanel.style.display = 'none';
    }
  }
}

// --- Component: shared/sleep-timer.js ---
// --- sleep-timer.js ---
function injectSleepTimerButton() {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (!container) return;
  const existingBtn = document.getElementById('ym-sleep-timer-button');
  if (existingBtn) {
    if (container.contains(existingBtn)) {
      return;
    } else {
      existingBtn.remove();
    }
  }

  const btn = document.createElement('li');
  btn.id = 'ym-sleep-timer-button';
  btn.className = 'HcfYy4VfnRHqgXzIdL7w kRmUIkcHKD5AgtpPo8wT ym-navbar-item-injected';
  btn.setAttribute('title', 'Таймер сна');

  const link = document.createElement('a');
  link.className = 'buOTZq_TKQOVyjMLrXvB ZfF8mQ3Iftpwu0aZgDtG yWJHrpNsBvchs9Jjyokk';
  link.style.cursor = 'pointer';

  const iconWrapper = document.createElement('div');
  iconWrapper.className = '_YzsXZGNK8KeaUFC4Ja1';
  iconWrapper.style.position = 'relative';

  // Иконка таймера сна (луна / часы)
  const svgDoc = new DOMParser().parseFromString(`
    <svg xmlns="http://www.w3.org/2000/svg" class="UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  `, 'image/svg+xml');
  iconWrapper.appendChild(svgDoc.documentElement);

  const textWrapper = document.createElement('div');
  textWrapper.className = 'nxMXCBiVfgH4oxds3f2y';
  
  const textSpan = document.createElement('span');
  textSpan.id = 'ym-sleep-timer-nav-text';
  textSpan.className = '_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA _3_Mxw7Si7j2g4kWjlpR';
  textSpan.style.webkitLineClamp = '1';
  textSpan.textContent = 'Сон';
  textSpan.setAttribute('title', 'Таймер сна');
  
  textWrapper.appendChild(textSpan);
  link.appendChild(iconWrapper);
  link.appendChild(textWrapper);
  btn.appendChild(link);

  const syncBtn = document.getElementById('ym-sync-button');
  const themeBtn = document.getElementById('ym-theme-button');
  
  if (themeBtn && themeBtn.nextSibling) {
    container.insertBefore(btn, themeBtn.nextSibling);
  } else if (syncBtn && syncBtn.nextSibling) {
    container.insertBefore(btn, syncBtn.nextSibling);
  } else {
    container.appendChild(btn);
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    toggleSleepTimerPopover();
  });

  injectSleepTimerPopover();
}

function injectSleepTimerPopover() {
  if (document.getElementById('ym-sleep-timer-popover')) return;

  const popover = document.createElement('div');
  popover.id = 'ym-sleep-timer-popover';
  popover.className = 'ym-theme-popover'; // Переиспользуем стили поповера тем
  popover.style.display = 'none'; // Будем использовать свой toggle
  
  const header = document.createElement('div');
  header.className = 'ym-theme-popover-header';
  const title = document.createElement('h3');
  title.textContent = 'Таймер сна';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'ym-theme-close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => {
    popover.classList.remove('show');
    popover.style.display = 'none';
  });
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  popover.appendChild(header);

  const body = document.createElement('div');
  body.className = 'ym-theme-popover-body';
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '10px';
  body.style.padding = '12px';

  const statusLabel = document.createElement('div');
  statusLabel.id = 'ym-sleep-timer-status';
  statusLabel.style.fontSize = '14px';
  statusLabel.style.color = 'var(--ym-popover-text, #fff)';
  statusLabel.style.textAlign = 'center';
  statusLabel.style.marginBottom = '10px';
  statusLabel.style.fontWeight = 'bold';
  statusLabel.textContent = 'Таймер выключен';
  body.appendChild(statusLabel);

  const optionsContainer = document.createElement('div');
  optionsContainer.style.display = 'grid';
  optionsContainer.style.gridTemplateColumns = '1fr 1fr';
  optionsContainer.style.gap = '8px';

  const createPresetBtn = (minutes, label) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.padding = '8px';
    btn.style.background = 'var(--ym-popover-item-bg, rgba(255, 255, 255, 0.05))';
    btn.style.border = '1px solid var(--ym-popover-item-border, rgba(255, 255, 255, 0.1))';
    btn.style.color = 'var(--ym-popover-text, #fff)';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(255, 255, 255, 0.1)');
    btn.addEventListener('mouseleave', () => btn.style.background = 'var(--ym-popover-item-bg, rgba(255, 255, 255, 0.05))');
    btn.addEventListener('click', () => startSleepTimer(minutes));
    return btn;
  };

  optionsContainer.appendChild(createPresetBtn(15, '15 мин'));
  optionsContainer.appendChild(createPresetBtn(30, '30 мин'));
  optionsContainer.appendChild(createPresetBtn(45, '45 мин'));
  optionsContainer.appendChild(createPresetBtn(60, '1 час'));

  body.appendChild(optionsContainer);

  const customContainer = document.createElement('div');
  customContainer.style.display = 'flex';
  customContainer.style.gap = '8px';
  customContainer.style.marginTop = '8px';

  const customInput = document.createElement('input');
  customInput.type = 'number';
  customInput.min = '1';
  customInput.max = '720';
  customInput.placeholder = 'Минуты...';
  customInput.style.flex = '1';
  customInput.style.padding = '8px';
  customInput.style.background = 'rgba(0,0,0,0.2)';
  customInput.style.border = '1px solid rgba(255,255,255,0.1)';
  customInput.style.color = '#fff';
  customInput.style.borderRadius = '8px';

  const customBtn = document.createElement('button');
  customBtn.textContent = 'Ок';
  customBtn.style.padding = '8px 12px';
  customBtn.style.background = 'var(--ym-accent-color, #ffdb4d)';
  customBtn.style.color = '#000';
  customBtn.style.border = 'none';
  customBtn.style.borderRadius = '8px';
  customBtn.style.fontWeight = 'bold';
  customBtn.style.cursor = 'pointer';
  customBtn.addEventListener('click', () => {
    const val = parseInt(customInput.value);
    if (!isNaN(val) && val > 0) {
      startSleepTimer(val);
    }
  });

  customContainer.appendChild(customInput);
  customContainer.appendChild(customBtn);
  body.appendChild(customContainer);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Отключить таймер';
  cancelBtn.id = 'ym-sleep-timer-cancel';
  cancelBtn.style.marginTop = '12px';
  cancelBtn.style.padding = '10px';
  cancelBtn.style.background = 'rgba(255, 60, 60, 0.2)';
  cancelBtn.style.color = '#ff6b6b';
  cancelBtn.style.border = '1px solid rgba(255, 60, 60, 0.3)';
  cancelBtn.style.borderRadius = '8px';
  cancelBtn.style.cursor = 'pointer';
  cancelBtn.style.display = 'none';
  cancelBtn.addEventListener('click', stopSleepTimer);
  body.appendChild(cancelBtn);

  popover.appendChild(body);
  document.body.appendChild(popover);
}

function toggleSleepTimerPopover() {
  const popover = document.getElementById('ym-sleep-timer-popover');
  if (!popover) return;

  const isShowing = popover.classList.contains('show');
  if (isShowing) {
    popover.classList.remove('show');
    popover.style.display = 'none';
  } else {
    // Hide others
    const themePopover = document.getElementById('ym-theme-popover');
    if (themePopover) themePopover.classList.remove('show');
    const syncPopover = document.getElementById('ym-sync-popover');
    if (syncPopover) syncPopover.classList.remove('show');

    positionSleepTimerPopover();
    popover.classList.add('show');
    popover.style.display = 'block';
    updateSleepTimerUI();
  }
}

function positionSleepTimerPopover() {
  const btn = document.getElementById('ym-sleep-timer-button');
  const popover = document.getElementById('ym-sleep-timer-popover');
  if (!btn || !popover) return;
  const rect = btn.getBoundingClientRect();
  const popoverWidth = 280;
  const popoverHeight = 320;
  let left = rect.right + 12;
  let top = rect.top + rect.height / 2 - popoverHeight / 2;
  if (top < 10) top = 10;
  if (top + popoverHeight > window.innerHeight - 10) {
    top = window.innerHeight - popoverHeight - 10;
  }
  if (left + popoverWidth > window.innerWidth - 10) {
    left = window.innerWidth - popoverWidth - 10;
  }
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

// Global state
let ymSleepTimerInterval = null;
let ymSleepTimerOriginalVolume = null;

function startSleepTimer(minutes) {
  const endTime = Date.now() + minutes * 60 * 1000;
  localStorage.setItem('ymSleepTimerEnd', endTime.toString());
  updateSleepTimerUI();
  initSleepTimerLoop();
}

function stopSleepTimer() {
  localStorage.removeItem('ymSleepTimerEnd');
  if (ymSleepTimerInterval) {
    clearInterval(ymSleepTimerInterval);
    ymSleepTimerInterval = null;
  }
  updateSleepTimerUI();
}

function updateSleepTimerUI() {
  const statusLabel = document.getElementById('ym-sleep-timer-status');
  const cancelBtn = document.getElementById('ym-sleep-timer-cancel');
  const navText = document.getElementById('ym-sleep-timer-nav-text');

  const endTimeStr = localStorage.getItem('ymSleepTimerEnd');
  if (endTimeStr) {
    const remaining = parseInt(endTimeStr) - Date.now();
    if (remaining > 0) {
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      
      if (statusLabel) statusLabel.textContent = `Осталось: ${minutes}м ${seconds}с`;
      if (cancelBtn) cancelBtn.style.display = 'block';
      if (navText) {
        const formattedMins = minutes.toString().padStart(2, '0');
        const formattedSecs = seconds.toString().padStart(2, '0');
        navText.textContent = `${formattedMins}:${formattedSecs}`;
      }
      return;
    }
  }
  
  if (statusLabel) statusLabel.textContent = 'Таймер выключен';
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (navText) navText.textContent = 'Сон';
}

function initSleepTimerLoop() {
  if (ymSleepTimerInterval) clearInterval(ymSleepTimerInterval);
  
  ymSleepTimerInterval = setInterval(() => {
    updateSleepTimerUI();
    const endTimeStr = localStorage.getItem('ymSleepTimerEnd');
    if (!endTimeStr) {
      clearInterval(ymSleepTimerInterval);
      ymSleepTimerInterval = null;
      return;
    }
    
    const remaining = parseInt(endTimeStr) - Date.now();
    
    if (remaining <= 10000 && remaining > 0) {
      const progress = remaining / 10000; // от 1 до 0
      
      // Инициализируем громкость локально для Electron
      if (ymSleepTimerOriginalVolume === null) {
        ymSleepTimerOriginalVolume = typeof window.getNativeVolume === 'function' ? window.getNativeVolume() : 0.5;
      }
      
      const newVol = ymSleepTimerOriginalVolume * progress;
      if (typeof window.setNativeVolume === 'function') {
        window.setNativeVolume(newVol);
      }
      if (window.CustomAudioController && typeof window.CustomAudioController.setVolume === 'function') {
        window.CustomAudioController.setVolume(newVol);
      }
      
      // Send to main context for extension
      window.postMessage({
        type: 'FROM_ISOLATED',
        action: 'SLEEP_TIMER_ACTION',
        command: 'FADE_VOLUME',
        progress: progress
      }, '*');
    } 
    // Конец таймера
    else if (remaining <= 0) {
      stopSleepTimer();
      
      // Ставим на паузу локально (для Electron)
      let paused = false;
      const activePlayer = window.getActivePlayer ? window.getActivePlayer() : null;
      
      if (activePlayer && typeof activePlayer.pause === 'function') {
        activePlayer.pause();
        paused = true;
      } else if (window.getSonataCore) {
        const core = window.getSonataCore();
        if (core?.playbackController && typeof core.playbackController.pause === 'function') {
          core.playbackController.pause();
          paused = true;
        }
      }
      
      if (!paused && window.externalAPI && typeof window.externalAPI.pause === 'function') {
        window.externalAPI.pause();
        paused = true;
      }
      
      if (!paused) {
        const pauseBtn = document.querySelector('[class*="BaseSonataControlsDesktop_playButton"], [aria-label="Пауза"], [aria-label="Pause"]');
        if (pauseBtn && (pauseBtn.getAttribute('aria-label') === 'Пауза' || pauseBtn.getAttribute('aria-label') === 'Pause' || pauseBtn.innerHTML.includes('pause'))) {
          pauseBtn.click();
        }
      }
      
      if (window.CustomAudioController && typeof window.CustomAudioController.stop === 'function') {
        window.CustomAudioController.stop();
      }
      
      // Send pause to main context (для Расширения)
      window.postMessage({
        type: 'FROM_ISOLATED',
        action: 'SLEEP_TIMER_ACTION',
        command: 'PAUSE'
      }, '*');
      
      // Отключаемся от комнаты синхронизации, чтобы нас не разбудили
      const disconnectBtn = document.getElementById('ym-disconnectBtn');
      if (disconnectBtn && disconnectBtn.style.display !== 'none') {
        disconnectBtn.click();
      }
      
      // Возвращаем исходную громкость
      setTimeout(() => {
        if (ymSleepTimerOriginalVolume !== null) {
          if (typeof window.setNativeVolume === 'function') window.setNativeVolume(ymSleepTimerOriginalVolume);
          if (window.CustomAudioController && typeof window.CustomAudioController.setVolume === 'function') {
            window.CustomAudioController.setVolume(ymSleepTimerOriginalVolume);
          }
          ymSleepTimerOriginalVolume = null;
        }
        
        window.postMessage({
          type: 'FROM_ISOLATED',
          action: 'SLEEP_TIMER_ACTION',
          command: 'RESTORE_VOLUME'
        }, '*');
      }, 500); // Небольшая задержка, чтобы пауза успела сработать
    }
  }, 1000);
}

// Инициализация при загрузке страницы, если таймер уже был установлен
setTimeout(() => {
  if (localStorage.getItem('ymSleepTimerEnd')) {
    initSleepTimerLoop();
  }
}, 2000);


// --- Component: shared/settings-injector.js ---
// ==========================================
// SCROBBLER SETTINGS UI INJECTOR (Polished & Resilient)
// ==========================================

// Имитация contextBridge для браузерного расширения через window.postMessage
if (!window.__ymSyncBridge && typeof window.ScrobblerService === 'undefined') {
  function callScrobblerApi(method, args) {
    return new Promise((resolve, reject) => {
      const nonce = Math.random().toString();
      const handler = (event) => {
        if (event.source !== window || !event.data || event.data.type !== 'YM_SCROBBLER_API_RESPONSE' || event.data.nonce !== nonce) return;
        window.removeEventListener('message', handler);
        if (event.data.error) reject(new Error(event.data.error));
        else resolve(event.data.result);
      };
      window.addEventListener('message', handler);
      window.postMessage({ type: 'YM_SCROBBLER_API_CALL', method, args, nonce }, '*');
    });
  }

  window.__ymSyncBridge = {
    sendScrobblerSettings: (settings) => window.postMessage({ type: 'YM_SCROBBLER_SETTINGS_CHANGED', settings }, '*'),
    lastFmGetToken: (k, s) => callScrobblerApi('lastFmGetToken', [k, s]),
    lastFmGetSession: (t, k, s) => callScrobblerApi('lastFmGetSession', [t, k, s]),
    listenBrainzValidateToken: (t) => callScrobblerApi('listenBrainzValidateToken', [t])
  };
}

let lastFmPendingToken = null;

function syncSettingsToPreload() {
  const settings = {
    lastfmEnabled: localStorage.getItem('ymScrobblerLastfmEnabled') === 'true',
    lastfmSessionKey: localStorage.getItem('ymScrobblerLastfmSessionKey') || '',
    lastfmUsername: localStorage.getItem('ymScrobblerLastfmUsername') || '',
    lastfmApiKey: localStorage.getItem('ymScrobblerLastfmApiKey') || '',
    lastfmSecret: localStorage.getItem('ymScrobblerLastfmSecret') || '',
    listenbrainzEnabled: localStorage.getItem('ymScrobblerListenbrainzEnabled') === 'true',
    listenbrainzToken: localStorage.getItem('ymScrobblerListenbrainzToken') || '',
    listenbrainzUsername: localStorage.getItem('ymScrobblerListenbrainzUsername') || ''
  };
  
  if (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendScrobblerSettings === 'function') {
    window.__ymSyncBridge.sendScrobblerSettings(settings);
  } else {
    window.postMessage({
      type: 'YM_SCROBBLER_SETTINGS_CHANGED',
      settings: settings
    }, '*');
  }
}

// Первичная синхронизация при загрузке
setTimeout(syncSettingsToPreload, 2000);


function checkAndInjectSettings() {
  if (!window.location.pathname.includes('/settings')) {
    return;
  }
  
  // Проверяем, не внедрено ли уже в DOM
  if (document.getElementById('ym-scrobbler-settings-block')) {
    return;
  }
  
  // Ищем список настроек по data-test-id (надежный способ)
  let listContainer = document.querySelector('[data-test-id="SETTINGS_LIST"]');
  
  if (!listContainer) {
    // Резервный способ: ищем по тексту элементов
    const divs = Array.from(document.querySelectorAll('div, span, p, h2, h3'));
    const targetTextElement = divs.find(el => {
      if (el.children.length > 0) return false;
      const text = el.textContent || '';
      return text.includes('Офлайн-режим') || text.includes('Плавные переходы') || text.includes('О приложении') || text.includes('Внешний вид') || text.includes('Язык') || text.includes('Качество звука');
    });

    if (!targetTextElement) return;

    let itemNode = targetTextElement;
    while (itemNode && itemNode.parentElement && itemNode.parentElement.tagName !== 'UL' && itemNode.parentElement.children.length < 3) {
      itemNode = itemNode.parentElement;
    }

    listContainer = itemNode ? itemNode.parentElement : null;
  }

  if (!listContainer) return;

  // Создаем блок настроек скроблинга
  const block = document.createElement('div');
  block.id = 'ym-scrobbler-settings-block';
  block.className = 'ym-settings-section';
  block.style.width = '100%';
  block.style.boxSizing = 'border-box';
  block.style.fontFamily = 'Yandex Sans Text, Arial, sans-serif';

  // Загружаем сохраненные значения
  const lastfmEnabled = localStorage.getItem('ymScrobblerLastfmEnabled') === 'true';
  const lastfmUsername = localStorage.getItem('ymScrobblerLastfmUsername') || '';
  const lastfmSessionKey = localStorage.getItem('ymScrobblerLastfmSessionKey') || '';
  const lastfmApiKey = localStorage.getItem('ymScrobblerLastfmApiKey') || '';
  const lastfmSecret = localStorage.getItem('ymScrobblerLastfmSecret') || '';
  
  const listenbrainzEnabled = localStorage.getItem('ymScrobblerListenbrainzEnabled') === 'true';
  const listenbrainzToken = localStorage.getItem('ymScrobblerListenbrainzToken') || '';
  const listenbrainzUsername = localStorage.getItem('ymScrobblerListenbrainzUsername') || '';

  // Читаем настройку кастомных текстов
  const customLyricsMode = localStorage.getItem('ymCustomLyricsMode') || 'fallback';

  block.innerHTML = `
    <!-- Заголовок секции BetterYandexMusic -->
    <div class="ym-settings-section-title" style="font-size: 17px; font-weight: 700; padding: 24px 0 8px 0; letter-spacing: -0.2px;">BetterYandexMusic</div>
    
    <!-- Секция Текст Песен -->
    <div class="ym-settings-item" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 0; min-height: 52px; box-sizing: border-box;">
      <div style="flex: 1; padding-right: 16px;">
        <div class="ym-settings-item-title" style="font-size: 15px; font-weight: 600; margin-bottom: 3px;">Текст песен (LRCLib / Genius)</div>
        <div class="ym-settings-item-status" style="font-size: 13px; line-height: 17px; margin-bottom: 8px;">
          Замещение официальных текстов песен альтернативными источниками
        </div>
        <div style="max-width: 420px; margin-top: 8px;">
          <select id="ym-custom-lyrics-mode" class="ym-select">
            <option value="disabled" ${customLyricsMode === 'disabled' ? 'selected' : ''}>Выключить</option>
            <option value="fallback" ${customLyricsMode === 'fallback' ? 'selected' : ''}>Только если нет текста от Яндекса</option>
            <option value="always" ${customLyricsMode === 'always' ? 'selected' : ''}>Всегда заменять текст на свой</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Секция Локальный Сервер (только для Electron) -->
    <div id="ym-local-server-section" style="display: none;">
      <div class="ym-settings-item" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 0; min-height: 52px; box-sizing: border-box;">
        <div style="flex: 1; padding-right: 16px;">
          <div class="ym-settings-item-title" style="font-size: 15px; font-weight: 600; margin-bottom: 3px;">Сервер синхронизации</div>
          <div id="ym-local-server-status" class="ym-settings-item-status" style="font-size: 13px; line-height: 17px; margin-bottom: 8px;">
            Остановлен
          </div>
          <div style="max-width: 420px; margin-top: 8px; display: flex; align-items: center; gap: 8px;">
            <button id="ym-local-server-btn" class="ym-btn-secondary" style="white-space: nowrap; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background-color 0.2s, transform 0.1s;">Запустить сервер</button>
            <input id="ym-local-server-url" type="text" class="ym-input" readonly placeholder="Здесь появится ссылка" style="flex: 1; padding: 6px 12px; border-radius: 8px; font-size: 13px; outline: none; box-sizing: border-box; display: none;">
          </div>
          <div id="ym-local-server-error" style="color: #ff4d4d; font-size: 12px; margin-top: 6px; display: none;"></div>
        </div>
      </div>
    </div>

    <!-- Заголовок секции Скробблинг -->
    <div class="ym-settings-section-title" style="font-size: 17px; font-weight: 700; padding: 8px 0 8px 0; letter-spacing: -0.2px;">Скроблинг</div>
    
    <!-- Секция Last.fm -->
    <div class="ym-settings-item" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 0; min-height: 52px; box-sizing: border-box;">
      <div style="flex: 1; padding-right: 16px;">
        <div class="ym-settings-item-title" style="font-size: 15px; font-weight: 600; margin-bottom: 3px;">Last.fm</div>
        <div id="ym-lastfm-status" class="ym-settings-item-status" style="font-size: 13px; line-height: 17px; margin-bottom: 8px;">
          ${lastfmSessionKey ? `Подключено как: <strong class="ym-settings-strong">${lastfmUsername}</strong>` : 'Не авторизован'}
        </div>
        
        <!-- Поля ввода собственных ключей Last.fm -->
        <div id="ym-lastfm-keys-container" style="max-width: 420px; margin-bottom: 12px; display: ${lastfmSessionKey ? 'none' : 'block'};">
          <div class="ym-settings-item-subtext" style="font-size:11px; margin-bottom: 6px;">
            Создайте приложение на <a href="https://www.last.fm/api/account/create" target="_blank" style="color: #ffdb4d; text-decoration: underline;">last.fm/api/account/create</a> и укажите ключи ниже:
          </div>
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <input type="text" id="ym-lastfm-apikey" value="${lastfmApiKey}" placeholder="API Key" class="ym-input" style="flex: 1; min-width: 0;">
            <input type="password" id="ym-lastfm-secret" value="${lastfmSecret}" placeholder="Shared Secret" class="ym-input" style="flex: 1; min-width: 0;">
          </div>
        </div>

        <div id="ym-lastfm-actions">
          ${lastfmSessionKey ? 
            `<button id="ym-lastfm-logout-btn" class="ym-btn-secondary">Выйти</button>` :
            `<button id="ym-lastfm-login-btn" class="ym-btn-primary">Войти через Last.fm</button>
             <button id="ym-lastfm-confirm-btn" class="ym-btn-secondary" style="display:none; margin-left: 8px;">Я подтвердил авторизацию</button>`
          }
        </div>
      </div>
      <div style="padding-top: 2px;">
        <label class="ym-switch">
          <input type="checkbox" id="ym-lastfm-toggle" ${lastfmEnabled ? 'checked' : ''}>
          <span class="ym-slider"></span>
        </label>
      </div>
    </div>

    <!-- Секция ListenBrainz -->
    <div class="ym-settings-item" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 0; min-height: 52px; box-sizing: border-box;">
      <div style="flex: 1; padding-right: 16px;">
        <div class="ym-settings-item-title" style="font-size: 15px; font-weight: 600; margin-bottom: 3px;">ListenBrainz</div>
        <div id="ym-listenbrainz-status" class="ym-settings-item-status" style="font-size: 13px; line-height: 17px; margin-bottom: 8px;">
          ${listenbrainzUsername ? `Подключено как: <strong class="ym-settings-strong">${listenbrainzUsername}</strong>` : 'Не подключено'}
        </div>
        
        <div style="max-width: 420px; margin-top: 8px;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="password" id="ym-listenbrainz-token" value="${listenbrainzToken}" placeholder="Токен пользователя (User Token)" class="ym-input" style="flex: 1; min-width: 0;">
            <button id="ym-listenbrainz-save-btn" class="ym-btn-secondary">Сохранить</button>
          </div>
        </div>
      </div>
      <div style="padding-top: 2px;">
        <label class="ym-switch">
          <input type="checkbox" id="ym-listenbrainz-toggle" ${listenbrainzEnabled ? 'checked' : ''}>
          <span class="ym-slider"></span>
        </label>
      </div>
    </div>

    </div>

    <style>
      /* Использование CSS-переменных Яндекс Музыки для автоматической адаптации к любой теме (темной, светлой, кастомным) */
      .ym-settings-section-title {
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
      }
      .ym-settings-item-title {
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
      }
      .ym-settings-item-status {
        color: var(--yp-color-text-secondary, rgba(255, 255, 255, 0.45)) !important;
      }
      .ym-settings-strong {
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
        font-weight: 600;
      }
      .ym-settings-item-subtext {
        color: var(--yp-color-text-tertiary, rgba(255, 255, 255, 0.4)) !important;
      }
      .ym-settings-item {
        border-bottom: 1px solid var(--yp-color-border-primary, rgba(255, 255, 255, 0.06)) !important;
      }
      .ym-settings-divider {
        background: var(--yp-color-border-primary, rgba(255, 255, 255, 0.06)) !important;
      }

      /* Кнопки в стиле Яндекс Музыки */
      .ym-btn-primary {
        background: var(--yp-color-brand, #ffdb4d) !important;
        color: #000000 !important;
        border: none;
        padding: 6px 16px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: transform 0.1s, opacity 0.15s;
        font-family: inherit;
      }
      .ym-btn-primary:hover {
        opacity: 0.9;
      }
      .ym-btn-primary:active {
        transform: scale(0.97);
      }
      
      .ym-btn-secondary {
        background: var(--yp-color-bg-secondary, rgba(255, 255, 255, 0.08)) !important;
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
        border: 1px solid var(--yp-color-border-primary, rgba(255, 255, 255, 0.12)) !important;
        padding: 6px 16px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: transform 0.1s, background 0.15s;
        font-family: inherit;
      }
      .ym-btn-secondary:hover {
        background: var(--yp-color-bg-tertiary, rgba(255, 255, 255, 0.14)) !important;
      }
      .ym-btn-secondary:active {
        transform: scale(0.97);
      }

      /* Инпуты */
      .ym-input {
        background: var(--yp-color-bg-secondary, rgba(255, 255, 255, 0.06)) !important;
        border: 1px solid var(--yp-color-border-primary, rgba(255, 255, 255, 0.12)) !important;
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
        padding: 7px 14px;
        border-radius: 20px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s, background 0.2s;
        font-family: inherit;
        box-sizing: border-box;
        width: 100%;
      }
      .ym-input:focus {
        border-color: var(--yp-color-brand, #ffdb4d) !important;
        background: var(--yp-color-bg-tertiary, rgba(255, 255, 255, 0.09)) !important;
      }
      .ym-input::placeholder {
        color: var(--yp-color-text-tertiary, rgba(255, 255, 255, 0.3)) !important;
      }

      /* Свичи (Тумблеры) в стиле Яндекс Музыки (Желтые при включении) */
      .ym-switch {
        position: relative;
        display: inline-block;
        width: 38px;
        height: 20px;
      }
      .ym-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .ym-slider {
        position: absolute;
        cursor: pointer;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: rgba(128, 128, 128, 0.25) !important;
        transition: background-color 0.2s;
        border-radius: 20px;
      }
      .ym-slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 3px;
        bottom: 3px;
        background-color: #ffffff;
        transition: transform 0.2s, background-color 0.2s;
        border-radius: 50%;
      }
      .ym-switch input:checked + .ym-slider {
        background-color: var(--yp-color-brand, #ffdb4d) !important;
      }
      .ym-switch input:checked + .ym-slider:before {
        transform: translateX(18px);
        background-color: #000000;
      }

      /* Селект */
      .ym-select {
        background-color: var(--yp-color-bg-secondary, rgba(255, 255, 255, 0.06)) !important;
        border: 1px solid var(--yp-color-border-primary, rgba(255, 255, 255, 0.12)) !important;
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
        padding: 7px 14px;
        border-radius: 8px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s, background 0.2s;
        font-family: inherit;
        box-sizing: border-box;
        width: 100%;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlsaW5lIHBvaW50cz0iNiA5IDEyIDE1IDE4IDkiPjwvcG9seWxpbmU+PC9zdmc+");
        background-repeat: no-repeat;
        background-position: right 14px center;
        background-size: 16px;
      }
      .ym-select:focus {
        border-color: var(--yp-color-brand, #ffdb4d) !important;
        background-color: var(--yp-color-bg-tertiary, rgba(255, 255, 255, 0.09)) !important;
      }
      .ym-select option {
        background: #202020;
        color: #fff;
      }

      /* Светлая тема Яндекс Музыки (класс .ym-light-theme, как в themes.js) */
      .ym-light-theme .ym-settings-section-title {
        color: #000000 !important;
      }
      .ym-light-theme .ym-settings-item-title {
        color: #000000 !important;
      }
      .ym-light-theme .ym-settings-item-status {
        color: rgba(0, 0, 0, 0.6) !important;
      }
      .ym-light-theme .ym-settings-strong {
        color: #000000 !important;
      }
      .ym-light-theme .ym-settings-item-subtext {
        color: rgba(0, 0, 0, 0.5) !important;
      }
      .ym-light-theme .ym-settings-item {
        border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
      }
      .ym-light-theme .ym-settings-divider {
        background: rgba(0, 0, 0, 0.08) !important;
      }
      .ym-light-theme .ym-btn-secondary {
        background: rgba(0, 0, 0, 0.04) !important;
        color: #000000 !important;
        border: 1px solid rgba(0, 0, 0, 0.15) !important;
      }
      .ym-light-theme .ym-btn-secondary:hover {
        background: rgba(0, 0, 0, 0.09) !important;
      }
      .ym-light-theme .ym-input {
        background: rgba(0, 0, 0, 0.04) !important;
        border: 1px solid rgba(0, 0, 0, 0.15) !important;
        color: #000000 !important;
      }
      .ym-light-theme .ym-input:focus {
        border-color: rgba(0, 0, 0, 0.4) !important;
        background: rgba(0, 0, 0, 0.07) !important;
      }
      .ym-light-theme .ym-input::placeholder {
        color: rgba(0, 0, 0, 0.4) !important;
      }
      .ym-light-theme .ym-select {
        background-color: rgba(0, 0, 0, 0.04) !important;
        border: 1px solid rgba(0, 0, 0, 0.15) !important;
        color: #000000 !important;
        background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlsaW5lIHBvaW50cz0iNiA5IDEyIDE1IDE4IDkiPjwvcG9seWxpbmU+PC9zdmc+");
      }
      .ym-light-theme .ym-select:focus {
        border-color: rgba(0, 0, 0, 0.4) !important;
        background-color: rgba(0, 0, 0, 0.07) !important;
      }
      .ym-light-theme .ym-select option {
        background: #ffffff;
        color: #000000;
      }
      .ym-light-theme .ym-slider {
        background-color: rgba(0, 0, 0, 0.15) !important;
      }
    </style>
  `;

  // Находим самый первый элемент настроек в списке (обычно это ряд содержащий "Офлайн-режим" или первый дочерний элемент списка)
  // Вставляем НАШ блок строго ПЕРЕД первым элементом настроек, но ПОСЛЕ заголовка/хедера.
  // Это гарантирует, что блок попадет в прокручиваемый список настроек, не налезая на шапку «Настройки».
  const firstSettingsItem = listContainer.querySelector('div, li');
  if (firstSettingsItem) {
    listContainer.insertBefore(block, firstSettingsItem);
  } else {
    listContainer.appendChild(block);
  }

  const lyricsModeSelect = document.getElementById('ym-custom-lyrics-mode');
  if (lyricsModeSelect) {
    lyricsModeSelect.addEventListener('change', (e) => {
      localStorage.setItem('ymCustomLyricsMode', e.target.value);
    });
  }

  // === Обработчики Локального Сервера (Только для Electron) ===
  const localServerSection = document.getElementById('ym-local-server-section');
  if (window.__ymSyncBridge && window.__ymSyncBridge.startLocalServer) {
    localServerSection.style.display = 'block';
    
    const serverBtn = document.getElementById('ym-local-server-btn');
    const serverStatus = document.getElementById('ym-local-server-status');
    const serverUrl = document.getElementById('ym-local-server-url');
    const serverError = document.getElementById('ym-local-server-error');
    let isServerRunning = false;

    window.__ymSyncBridge.onServerStatus((statusData) => {
      if (statusData === true || statusData === false) return; // ignore old boolean statuses if any
      serverError.style.display = 'none';

      if (statusData.status === 'starting') {
        serverStatus.textContent = 'Запускается туннель...';
        serverBtn.textContent = 'Остановить';
        serverBtn.style.opacity = '0.5';
        serverBtn.style.pointerEvents = 'none';
        isServerRunning = true;
      } else if (statusData.status === 'running') {
        serverStatus.innerHTML = '<strong style="color: #4caf50;">Туннель открыт!</strong>';
        serverBtn.textContent = 'Остановить';
        serverBtn.style.opacity = '1';
        serverBtn.style.pointerEvents = 'auto';
        serverUrl.style.display = 'block';
        serverUrl.value = statusData.url;
        // Копируем в буфер
        navigator.clipboard.writeText(statusData.url).catch(console.error);
        isServerRunning = true;
      } else if (statusData.status === 'stopped') {
        serverStatus.textContent = 'Остановлен';
        serverBtn.textContent = 'Запустить сервер';
        serverBtn.style.opacity = '1';
        serverBtn.style.pointerEvents = 'auto';
        serverUrl.style.display = 'none';
        serverUrl.value = '';
        isServerRunning = false;
      } else if (statusData.status === 'error') {
        serverStatus.textContent = 'Ошибка запуска';
        serverBtn.textContent = 'Запустить сервер';
        serverBtn.style.opacity = '1';
        serverBtn.style.pointerEvents = 'auto';
        serverUrl.style.display = 'none';
        serverError.style.display = 'block';
        serverError.textContent = statusData.error;
        isServerRunning = false;
      }
    });

    serverBtn.addEventListener('click', () => {
      if (isServerRunning) {
        window.__ymSyncBridge.stopLocalServer();
      } else {
        serverError.style.display = 'none';
        serverStatus.textContent = 'Подготовка...';
        serverBtn.style.opacity = '0.5';
        serverBtn.style.pointerEvents = 'none';
        window.__ymSyncBridge.startLocalServer();
      }
    });
  }

  // === Обработчики Last.fm ===
  const lastfmToggle = document.getElementById('ym-lastfm-toggle');

  if (lastfmToggle) {
    lastfmToggle.addEventListener('change', (e) => {
      localStorage.setItem('ymScrobblerLastfmEnabled', e.target.checked ? 'true' : 'false');
      syncSettingsToPreload();
    });
  }

  const setupLastFmEvents = () => {
    const loginBtn = document.getElementById('ym-lastfm-login-btn');
    const confirmBtn = document.getElementById('ym-lastfm-confirm-btn');
    const logoutBtn = document.getElementById('ym-lastfm-logout-btn');

    if (loginBtn) {
      loginBtn.addEventListener('click', async () => {
        try {
          const userApiKey = document.getElementById('ym-lastfm-apikey').value.trim();
          const userSecret = document.getElementById('ym-lastfm-secret').value.trim();
          
          if (!userApiKey || !userSecret) {
            alert('Пожалуйста, введите API Key и Shared Secret от Last.fm перед авторизацией.');
            return;
          }

          loginBtn.textContent = 'Получение ссылки...';
          loginBtn.disabled = true;

          // Сохраняем ключи в localStorage
          localStorage.setItem('ymScrobblerLastfmApiKey', userApiKey);
          localStorage.setItem('ymScrobblerLastfmSecret', userSecret);
          syncSettingsToPreload();

          const bridge = window.__ymSyncBridge;
          if (!bridge || typeof bridge.lastFmGetToken !== 'function') {
            throw new Error('Функции моста недоступны');
          }

          const token = await bridge.lastFmGetToken(userApiKey, userSecret);
          lastFmPendingToken = token;

          // Открываем браузер на страницу авторизации с валидным ключом
          window.open(`https://www.last.fm/api/auth/?api_key=${userApiKey}&token=${token}`);

          loginBtn.style.display = 'none';
          confirmBtn.style.display = 'inline-block';
        } catch (err) {
          console.error(err);
          alert('Ошибка авторизации Last.fm: ' + err.message);
          loginBtn.textContent = 'Войти через Last.fm';
          loginBtn.disabled = false;
        }
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        try {
          confirmBtn.textContent = 'Проверка...';
          confirmBtn.disabled = true;

          const bridge = window.__ymSyncBridge;
          const userApiKey = localStorage.getItem('ymScrobblerLastfmApiKey');
          const userSecret = localStorage.getItem('ymScrobblerLastfmSecret');
          const session = await bridge.lastFmGetSession(lastFmPendingToken, userApiKey, userSecret);

          localStorage.setItem('ymScrobblerLastfmSessionKey', session.sessionKey);
          localStorage.setItem('ymScrobblerLastfmUsername', session.username);
          localStorage.setItem('ymScrobblerLastfmEnabled', 'true');

          // Обновляем UI
          document.getElementById('ym-lastfm-status').innerHTML = `Подключено как: <strong class="ym-settings-strong">${session.username}</strong>`;
          document.getElementById('ym-lastfm-actions').innerHTML = `<button id="ym-lastfm-logout-btn" class="ym-btn-secondary">Выйти</button>`;
          const keysContainer = document.getElementById('ym-lastfm-keys-container');
          if (keysContainer) keysContainer.style.display = 'none';
          if (lastfmToggle) lastfmToggle.checked = true;

          syncSettingsToPreload();
          setupLastFmEvents();
        } catch (err) {
          console.error(err);
          alert('Не удалось подтвердить авторизацию. Убедитесь, что вы нажали "Разрешить доступ" на открывшейся веб-странице Last.fm.');
          confirmBtn.textContent = 'Я подтвердил авторизацию';
          confirmBtn.disabled = false;
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('ymScrobblerLastfmSessionKey');
        localStorage.removeItem('ymScrobblerLastfmUsername');
        localStorage.removeItem('ymScrobblerLastfmApiKey');
        localStorage.removeItem('ymScrobblerLastfmSecret');
        localStorage.setItem('ymScrobblerLastfmEnabled', 'false');

        document.getElementById('ym-lastfm-status').textContent = 'Не авторизован';
        document.getElementById('ym-lastfm-actions').innerHTML = `<button id="ym-lastfm-login-btn" class="ym-btn-primary">Войти через Last.fm</button>
           <button id="ym-lastfm-confirm-btn" class="ym-btn-secondary" style="display:none;">Я подтвердил авторизацию</button>`;
        
        const keysContainer = document.getElementById('ym-lastfm-keys-container');
        if (keysContainer) keysContainer.style.display = 'block';
        
        const keyInput = document.getElementById('ym-lastfm-apikey');
        const secInput = document.getElementById('ym-lastfm-secret');
        if (keyInput) keyInput.value = '';
        if (secInput) secInput.value = '';

        if (lastfmToggle) lastfmToggle.checked = false;

        syncSettingsToPreload();
        setupLastFmEvents();
      });
    }
  };

  setupLastFmEvents();

  // Настройка слушателей ListenBrainz
  const listenbrainzToggle = document.getElementById('ym-listenbrainz-toggle');
  if (listenbrainzToggle) {
    listenbrainzToggle.addEventListener('change', (e) => {
      localStorage.setItem('ymScrobblerListenbrainzEnabled', e.target.checked ? 'true' : 'false');
      syncSettingsToPreload();
    });
  }

  const saveBtn = document.getElementById('ym-listenbrainz-save-btn');
  const tokenInput = document.getElementById('ym-listenbrainz-token');
  const lbStatus = document.getElementById('ym-listenbrainz-status');

  if (saveBtn && tokenInput) {
    saveBtn.addEventListener('click', async () => {
      const token = tokenInput.value.trim();
      if (!token) {
        localStorage.removeItem('ymScrobblerListenbrainzToken');
        localStorage.removeItem('ymScrobblerListenbrainzUsername');
        localStorage.setItem('ymScrobblerListenbrainzEnabled', 'false');
        lbStatus.textContent = 'Не подключено';
        if (listenbrainzToggle) listenbrainzToggle.checked = false;
        syncSettingsToPreload();
        return;
      }

      try {
        saveBtn.textContent = 'Проверка...';
        saveBtn.disabled = true;

        const bridge = window.__ymSyncBridge;
        if (!bridge || typeof bridge.listenBrainzValidateToken !== 'function') {
          throw new Error('Функции моста недоступны');
        }

        const username = await bridge.listenBrainzValidateToken(token);
        
        localStorage.setItem('ymScrobblerListenbrainzToken', token);
        localStorage.setItem('ymScrobblerListenbrainzUsername', username);
        localStorage.setItem('ymScrobblerListenbrainzEnabled', 'true');

        lbStatus.innerHTML = `Подключено как: <strong class="ym-settings-strong">${username}</strong>`;
        if (listenbrainzToggle) listenbrainzToggle.checked = true;

        syncSettingsToPreload();
        alert('Токен ListenBrainz успешно сохранен и проверен!');
      } catch (err) {
        console.error(err);
        alert('Ошибка валидации токена ListenBrainz: ' + err.message);
      } finally {
        saveBtn.textContent = 'Сохранить';
        saveBtn.disabled = false;
      }
    });
  }
}

// Регулярно сканируем DOM на предмет нахождения на странице настроек
setInterval(checkAndInjectSettings, 1000);


// --- Component: shared/wrapped/chart.js ---
/*!
 * Chart.js v4.5.1
 * https://www.chartjs.org
 * (c) 2025 Chart.js Contributors
 * Released under the MIT License
 */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).Chart=e()}(this,(function(){"use strict";var t=Object.freeze({__proto__:null,get Colors(){return Jo},get Decimation(){return ta},get Filler(){return ba},get Legend(){return Ma},get SubTitle(){return Pa},get Title(){return ka},get Tooltip(){return Na}});function e(){}const i=(()=>{let t=0;return()=>t++})();function s(t){return null==t}function n(t){if(Array.isArray&&Array.isArray(t))return!0;const e=Object.prototype.toString.call(t);return"[object"===e.slice(0,7)&&"Array]"===e.slice(-6)}function o(t){return null!==t&&"[object Object]"===Object.prototype.toString.call(t)}function a(t){return("number"==typeof t||t instanceof Number)&&isFinite(+t)}function r(t,e){return a(t)?t:e}function l(t,e){return void 0===t?e:t}const h=(t,e)=>"string"==typeof t&&t.endsWith("%")?parseFloat(t)/100:+t/e,c=(t,e)=>"string"==typeof t&&t.endsWith("%")?parseFloat(t)/100*e:+t;function d(t,e,i){if(t&&"function"==typeof t.call)return t.apply(i,e)}function u(t,e,i,s){let a,r,l;if(n(t))if(r=t.length,s)for(a=r-1;a>=0;a--)e.call(i,t[a],a);else for(a=0;a<r;a++)e.call(i,t[a],a);else if(o(t))for(l=Object.keys(t),r=l.length,a=0;a<r;a++)e.call(i,t[l[a]],l[a])}function f(t,e){let i,s,n,o;if(!t||!e||t.length!==e.length)return!1;for(i=0,s=t.length;i<s;++i)if(n=t[i],o=e[i],n.datasetIndex!==o.datasetIndex||n.index!==o.index)return!1;return!0}function g(t){if(n(t))return t.map(g);if(o(t)){const e=Object.create(null),i=Object.keys(t),s=i.length;let n=0;for(;n<s;++n)e[i[n]]=g(t[i[n]]);return e}return t}function p(t){return-1===["__proto__","prototype","constructor"].indexOf(t)}function m(t,e,i,s){if(!p(t))return;const n=e[t],a=i[t];o(n)&&o(a)?x(n,a,s):e[t]=g(a)}function x(t,e,i){const s=n(e)?e:[e],a=s.length;if(!o(t))return t;const r=(i=i||{}).merger||m;let l;for(let e=0;e<a;++e){if(l=s[e],!o(l))continue;const n=Object.keys(l);for(let e=0,s=n.length;e<s;++e)r(n[e],t,l,i)}return t}function b(t,e){return x(t,e,{merger:_})}function _(t,e,i){if(!p(t))return;const s=e[t],n=i[t];o(s)&&o(n)?b(s,n):Object.prototype.hasOwnProperty.call(e,t)||(e[t]=g(n))}const y={"":t=>t,x:t=>t.x,y:t=>t.y};function v(t){const e=t.split("."),i=[];let s="";for(const t of e)s+=t,s.endsWith("\\")?s=s.slice(0,-1)+".":(i.push(s),s="");return i}function M(t,e){const i=y[e]||(y[e]=function(t){const e=v(t);return t=>{for(const i of e){if(""===i)break;t=t&&t[i]}return t}}(e));return i(t)}function w(t){return t.charAt(0).toUpperCase()+t.slice(1)}const k=t=>void 0!==t,S=t=>"function"==typeof t,P=(t,e)=>{if(t.size!==e.size)return!1;for(const i of t)if(!e.has(i))return!1;return!0};function D(t){return"mouseup"===t.type||"click"===t.type||"contextmenu"===t.type}const C=Math.PI,O=2*C,A=O+C,T=Number.POSITIVE_INFINITY,L=C/180,E=C/2,R=C/4,I=2*C/3,z=Math.log10,F=Math.sign;function V(t,e,i){return Math.abs(t-e)<i}function B(t){const e=Math.round(t);t=V(t,e,t/1e3)?e:t;const i=Math.pow(10,Math.floor(z(t))),s=t/i;return(s<=1?1:s<=2?2:s<=5?5:10)*i}function W(t){const e=[],i=Math.sqrt(t);let s;for(s=1;s<i;s++)t%s==0&&(e.push(s),e.push(t/s));return i===(0|i)&&e.push(i),e.sort(((t,e)=>t-e)).pop(),e}function N(t){return!function(t){return"symbol"==typeof t||"object"==typeof t&&null!==t&&!(Symbol.toPrimitive in t||"toString"in t||"valueOf"in t)}(t)&&!isNaN(parseFloat(t))&&isFinite(t)}function H(t,e){const i=Math.round(t);return i-e<=t&&i+e>=t}function j(t,e,i){let s,n,o;for(s=0,n=t.length;s<n;s++)o=t[s][i],isNaN(o)||(e.min=Math.min(e.min,o),e.max=Math.max(e.max,o))}function $(t){return t*(C/180)}function Y(t){return t*(180/C)}function U(t){if(!a(t))return;let e=1,i=0;for(;Math.round(t*e)/e!==t;)e*=10,i++;return i}function X(t,e){const i=e.x-t.x,s=e.y-t.y,n=Math.sqrt(i*i+s*s);let o=Math.atan2(s,i);return o<-.5*C&&(o+=O),{angle:o,distance:n}}function q(t,e){return Math.sqrt(Math.pow(e.x-t.x,2)+Math.pow(e.y-t.y,2))}function K(t,e){return(t-e+A)%O-C}function G(t){return(t%O+O)%O}function J(t,e,i,s){const n=G(t),o=G(e),a=G(i),r=G(o-n),l=G(a-n),h=G(n-o),c=G(n-a);return n===o||n===a||s&&o===a||r>l&&h<c}function Z(t,e,i){return Math.max(e,Math.min(i,t))}function Q(t){return Z(t,-32768,32767)}function tt(t,e,i,s=1e-6){return t>=Math.min(e,i)-s&&t<=Math.max(e,i)+s}function et(t,e,i){i=i||(i=>t[i]<e);let s,n=t.length-1,o=0;for(;n-o>1;)s=o+n>>1,i(s)?o=s:n=s;return{lo:o,hi:n}}const it=(t,e,i,s)=>et(t,i,s?s=>{const n=t[s][e];return n<i||n===i&&t[s+1][e]===i}:s=>t[s][e]<i),st=(t,e,i)=>et(t,i,(s=>t[s][e]>=i));function nt(t,e,i){let s=0,n=t.length;for(;s<n&&t[s]<e;)s++;for(;n>s&&t[n-1]>i;)n--;return s>0||n<t.length?t.slice(s,n):t}const ot=["push","pop","shift","splice","unshift"];function at(t,e){t._chartjs?t._chartjs.listeners.push(e):(Object.defineProperty(t,"_chartjs",{configurable:!0,enumerable:!1,value:{listeners:[e]}}),ot.forEach((e=>{const i="_onData"+w(e),s=t[e];Object.defineProperty(t,e,{configurable:!0,enumerable:!1,value(...e){const n=s.apply(this,e);return t._chartjs.listeners.forEach((t=>{"function"==typeof t[i]&&t[i](...e)})),n}})})))}function rt(t,e){const i=t._chartjs;if(!i)return;const s=i.listeners,n=s.indexOf(e);-1!==n&&s.splice(n,1),s.length>0||(ot.forEach((e=>{delete t[e]})),delete t._chartjs)}function lt(t){const e=new Set(t);return e.size===t.length?t:Array.from(e)}const ht="undefined"==typeof window?function(t){return t()}:window.requestAnimationFrame;function ct(t,e){let i=[],s=!1;return function(...n){i=n,s||(s=!0,ht.call(window,(()=>{s=!1,t.apply(e,i)})))}}function dt(t,e){let i;return function(...s){return e?(clearTimeout(i),i=setTimeout(t,e,s)):t.apply(this,s),e}}const ut=t=>"start"===t?"left":"end"===t?"right":"center",ft=(t,e,i)=>"start"===t?e:"end"===t?i:(e+i)/2,gt=(t,e,i,s)=>t===(s?"left":"right")?i:"center"===t?(e+i)/2:e;function pt(t,e,i){const n=e.length;let o=0,a=n;if(t._sorted){const{iScale:r,vScale:l,_parsed:h}=t,c=t.dataset&&t.dataset.options?t.dataset.options.spanGaps:null,d=r.axis,{min:u,max:f,minDefined:g,maxDefined:p}=r.getUserBounds();if(g){if(o=Math.min(it(h,d,u).lo,i?n:it(e,d,r.getPixelForValue(u)).lo),c){const t=h.slice(0,o+1).reverse().findIndex((t=>!s(t[l.axis])));o-=Math.max(0,t)}o=Z(o,0,n-1)}if(p){let t=Math.max(it(h,r.axis,f,!0).hi+1,i?0:it(e,d,r.getPixelForValue(f),!0).hi+1);if(c){const e=h.slice(t-1).findIndex((t=>!s(t[l.axis])));t+=Math.max(0,e)}a=Z(t,o,n)-o}else a=n-o}return{start:o,count:a}}function mt(t){const{xScale:e,yScale:i,_scaleRanges:s}=t,n={xmin:e.min,xmax:e.max,ymin:i.min,ymax:i.max};if(!s)return t._scaleRanges=n,!0;const o=s.xmin!==e.min||s.xmax!==e.max||s.ymin!==i.min||s.ymax!==i.max;return Object.assign(s,n),o}class xt{constructor(){this._request=null,this._charts=new Map,this._running=!1,this._lastDate=void 0}_notify(t,e,i,s){const n=e.listeners[s],o=e.duration;n.forEach((s=>s({chart:t,initial:e.initial,numSteps:o,currentStep:Math.min(i-e.start,o)})))}_refresh(){this._request||(this._running=!0,this._request=ht.call(window,(()=>{this._update(),this._request=null,this._running&&this._refresh()})))}_update(t=Date.now()){let e=0;this._charts.forEach(((i,s)=>{if(!i.running||!i.items.length)return;const n=i.items;let o,a=n.length-1,r=!1;for(;a>=0;--a)o=n[a],o._active?(o._total>i.duration&&(i.duration=o._total),o.tick(t),r=!0):(n[a]=n[n.length-1],n.pop());r&&(s.draw(),this._notify(s,i,t,"progress")),n.length||(i.running=!1,this._notify(s,i,t,"complete"),i.initial=!1),e+=n.length})),this._lastDate=t,0===e&&(this._running=!1)}_getAnims(t){const e=this._charts;let i=e.get(t);return i||(i={running:!1,initial:!0,items:[],listeners:{complete:[],progress:[]}},e.set(t,i)),i}listen(t,e,i){this._getAnims(t).listeners[e].push(i)}add(t,e){e&&e.length&&this._getAnims(t).items.push(...e)}has(t){return this._getAnims(t).items.length>0}start(t){const e=this._charts.get(t);e&&(e.running=!0,e.start=Date.now(),e.duration=e.items.reduce(((t,e)=>Math.max(t,e._duration)),0),this._refresh())}running(t){if(!this._running)return!1;const e=this._charts.get(t);return!!(e&&e.running&&e.items.length)}stop(t){const e=this._charts.get(t);if(!e||!e.items.length)return;const i=e.items;let s=i.length-1;for(;s>=0;--s)i[s].cancel();e.items=[],this._notify(t,e,Date.now(),"complete")}remove(t){return this._charts.delete(t)}}var bt=new xt;
/*!
 * @kurkle/color v0.3.2
 * https://github.com/kurkle/color#readme
 * (c) 2023 Jukka Kurkela
 * Released under the MIT License
 */function _t(t){return t+.5|0}const yt=(t,e,i)=>Math.max(Math.min(t,i),e);function vt(t){return yt(_t(2.55*t),0,255)}function Mt(t){return yt(_t(255*t),0,255)}function wt(t){return yt(_t(t/2.55)/100,0,1)}function kt(t){return yt(_t(100*t),0,100)}const St={0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,A:10,B:11,C:12,D:13,E:14,F:15,a:10,b:11,c:12,d:13,e:14,f:15},Pt=[..."0123456789ABCDEF"],Dt=t=>Pt[15&t],Ct=t=>Pt[(240&t)>>4]+Pt[15&t],Ot=t=>(240&t)>>4==(15&t);function At(t){var e=(t=>Ot(t.r)&&Ot(t.g)&&Ot(t.b)&&Ot(t.a))(t)?Dt:Ct;return t?"#"+e(t.r)+e(t.g)+e(t.b)+((t,e)=>t<255?e(t):"")(t.a,e):void 0}const Tt=/^(hsla?|hwb|hsv)\(\s*([-+.e\d]+)(?:deg)?[\s,]+([-+.e\d]+)%[\s,]+([-+.e\d]+)%(?:[\s,]+([-+.e\d]+)(%)?)?\s*\)$/;function Lt(t,e,i){const s=e*Math.min(i,1-i),n=(e,n=(e+t/30)%12)=>i-s*Math.max(Math.min(n-3,9-n,1),-1);return[n(0),n(8),n(4)]}function Et(t,e,i){const s=(s,n=(s+t/60)%6)=>i-i*e*Math.max(Math.min(n,4-n,1),0);return[s(5),s(3),s(1)]}function Rt(t,e,i){const s=Lt(t,1,.5);let n;for(e+i>1&&(n=1/(e+i),e*=n,i*=n),n=0;n<3;n++)s[n]*=1-e-i,s[n]+=e;return s}function It(t){const e=t.r/255,i=t.g/255,s=t.b/255,n=Math.max(e,i,s),o=Math.min(e,i,s),a=(n+o)/2;let r,l,h;return n!==o&&(h=n-o,l=a>.5?h/(2-n-o):h/(n+o),r=function(t,e,i,s,n){return t===n?(e-i)/s+(e<i?6:0):e===n?(i-t)/s+2:(t-e)/s+4}(e,i,s,h,n),r=60*r+.5),[0|r,l||0,a]}function zt(t,e,i,s){return(Array.isArray(e)?t(e[0],e[1],e[2]):t(e,i,s)).map(Mt)}function Ft(t,e,i){return zt(Lt,t,e,i)}function Vt(t){return(t%360+360)%360}function Bt(t){const e=Tt.exec(t);let i,s=255;if(!e)return;e[5]!==i&&(s=e[6]?vt(+e[5]):Mt(+e[5]));const n=Vt(+e[2]),o=+e[3]/100,a=+e[4]/100;return i="hwb"===e[1]?function(t,e,i){return zt(Rt,t,e,i)}(n,o,a):"hsv"===e[1]?function(t,e,i){return zt(Et,t,e,i)}(n,o,a):Ft(n,o,a),{r:i[0],g:i[1],b:i[2],a:s}}const Wt={x:"dark",Z:"light",Y:"re",X:"blu",W:"gr",V:"medium",U:"slate",A:"ee",T:"ol",S:"or",B:"ra",C:"lateg",D:"ights",R:"in",Q:"turquois",E:"hi",P:"ro",O:"al",N:"le",M:"de",L:"yello",F:"en",K:"ch",G:"arks",H:"ea",I:"ightg",J:"wh"},Nt={OiceXe:"f0f8ff",antiquewEte:"faebd7",aqua:"ffff",aquamarRe:"7fffd4",azuY:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"0",blanKedOmond:"ffebcd",Xe:"ff",XeviTet:"8a2be2",bPwn:"a52a2a",burlywood:"deb887",caMtXe:"5f9ea0",KartYuse:"7fff00",KocTate:"d2691e",cSO:"ff7f50",cSnflowerXe:"6495ed",cSnsilk:"fff8dc",crimson:"dc143c",cyan:"ffff",xXe:"8b",xcyan:"8b8b",xgTMnPd:"b8860b",xWay:"a9a9a9",xgYF:"6400",xgYy:"a9a9a9",xkhaki:"bdb76b",xmagFta:"8b008b",xTivegYF:"556b2f",xSange:"ff8c00",xScEd:"9932cc",xYd:"8b0000",xsOmon:"e9967a",xsHgYF:"8fbc8f",xUXe:"483d8b",xUWay:"2f4f4f",xUgYy:"2f4f4f",xQe:"ced1",xviTet:"9400d3",dAppRk:"ff1493",dApskyXe:"bfff",dimWay:"696969",dimgYy:"696969",dodgerXe:"1e90ff",fiYbrick:"b22222",flSOwEte:"fffaf0",foYstWAn:"228b22",fuKsia:"ff00ff",gaRsbSo:"dcdcdc",ghostwEte:"f8f8ff",gTd:"ffd700",gTMnPd:"daa520",Way:"808080",gYF:"8000",gYFLw:"adff2f",gYy:"808080",honeyMw:"f0fff0",hotpRk:"ff69b4",RdianYd:"cd5c5c",Rdigo:"4b0082",ivSy:"fffff0",khaki:"f0e68c",lavFMr:"e6e6fa",lavFMrXsh:"fff0f5",lawngYF:"7cfc00",NmoncEffon:"fffacd",ZXe:"add8e6",ZcSO:"f08080",Zcyan:"e0ffff",ZgTMnPdLw:"fafad2",ZWay:"d3d3d3",ZgYF:"90ee90",ZgYy:"d3d3d3",ZpRk:"ffb6c1",ZsOmon:"ffa07a",ZsHgYF:"20b2aa",ZskyXe:"87cefa",ZUWay:"778899",ZUgYy:"778899",ZstAlXe:"b0c4de",ZLw:"ffffe0",lime:"ff00",limegYF:"32cd32",lRF:"faf0e6",magFta:"ff00ff",maPon:"800000",VaquamarRe:"66cdaa",VXe:"cd",VScEd:"ba55d3",VpurpN:"9370db",VsHgYF:"3cb371",VUXe:"7b68ee",VsprRggYF:"fa9a",VQe:"48d1cc",VviTetYd:"c71585",midnightXe:"191970",mRtcYam:"f5fffa",mistyPse:"ffe4e1",moccasR:"ffe4b5",navajowEte:"ffdead",navy:"80",Tdlace:"fdf5e6",Tive:"808000",TivedBb:"6b8e23",Sange:"ffa500",SangeYd:"ff4500",ScEd:"da70d6",pOegTMnPd:"eee8aa",pOegYF:"98fb98",pOeQe:"afeeee",pOeviTetYd:"db7093",papayawEp:"ffefd5",pHKpuff:"ffdab9",peru:"cd853f",pRk:"ffc0cb",plum:"dda0dd",powMrXe:"b0e0e6",purpN:"800080",YbeccapurpN:"663399",Yd:"ff0000",Psybrown:"bc8f8f",PyOXe:"4169e1",saddNbPwn:"8b4513",sOmon:"fa8072",sandybPwn:"f4a460",sHgYF:"2e8b57",sHshell:"fff5ee",siFna:"a0522d",silver:"c0c0c0",skyXe:"87ceeb",UXe:"6a5acd",UWay:"708090",UgYy:"708090",snow:"fffafa",sprRggYF:"ff7f",stAlXe:"4682b4",tan:"d2b48c",teO:"8080",tEstN:"d8bfd8",tomato:"ff6347",Qe:"40e0d0",viTet:"ee82ee",JHt:"f5deb3",wEte:"ffffff",wEtesmoke:"f5f5f5",Lw:"ffff00",LwgYF:"9acd32"};let Ht;function jt(t){Ht||(Ht=function(){const t={},e=Object.keys(Nt),i=Object.keys(Wt);let s,n,o,a,r;for(s=0;s<e.length;s++){for(a=r=e[s],n=0;n<i.length;n++)o=i[n],r=r.replace(o,Wt[o]);o=parseInt(Nt[a],16),t[r]=[o>>16&255,o>>8&255,255&o]}return t}(),Ht.transparent=[0,0,0,0]);const e=Ht[t.toLowerCase()];return e&&{r:e[0],g:e[1],b:e[2],a:4===e.length?e[3]:255}}const $t=/^rgba?\(\s*([-+.\d]+)(%)?[\s,]+([-+.e\d]+)(%)?[\s,]+([-+.e\d]+)(%)?(?:[\s,/]+([-+.e\d]+)(%)?)?\s*\)$/;const Yt=t=>t<=.0031308?12.92*t:1.055*Math.pow(t,1/2.4)-.055,Ut=t=>t<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4);function Xt(t,e,i){if(t){let s=It(t);s[e]=Math.max(0,Math.min(s[e]+s[e]*i,0===e?360:1)),s=Ft(s),t.r=s[0],t.g=s[1],t.b=s[2]}}function qt(t,e){return t?Object.assign(e||{},t):t}function Kt(t){var e={r:0,g:0,b:0,a:255};return Array.isArray(t)?t.length>=3&&(e={r:t[0],g:t[1],b:t[2],a:255},t.length>3&&(e.a=Mt(t[3]))):(e=qt(t,{r:0,g:0,b:0,a:1})).a=Mt(e.a),e}function Gt(t){return"r"===t.charAt(0)?function(t){const e=$t.exec(t);let i,s,n,o=255;if(e){if(e[7]!==i){const t=+e[7];o=e[8]?vt(t):yt(255*t,0,255)}return i=+e[1],s=+e[3],n=+e[5],i=255&(e[2]?vt(i):yt(i,0,255)),s=255&(e[4]?vt(s):yt(s,0,255)),n=255&(e[6]?vt(n):yt(n,0,255)),{r:i,g:s,b:n,a:o}}}(t):Bt(t)}class Jt{constructor(t){if(t instanceof Jt)return t;const e=typeof t;let i;var s,n,o;"object"===e?i=Kt(t):"string"===e&&(o=(s=t).length,"#"===s[0]&&(4===o||5===o?n={r:255&17*St[s[1]],g:255&17*St[s[2]],b:255&17*St[s[3]],a:5===o?17*St[s[4]]:255}:7!==o&&9!==o||(n={r:St[s[1]]<<4|St[s[2]],g:St[s[3]]<<4|St[s[4]],b:St[s[5]]<<4|St[s[6]],a:9===o?St[s[7]]<<4|St[s[8]]:255})),i=n||jt(t)||Gt(t)),this._rgb=i,this._valid=!!i}get valid(){return this._valid}get rgb(){var t=qt(this._rgb);return t&&(t.a=wt(t.a)),t}set rgb(t){this._rgb=Kt(t)}rgbString(){return this._valid?(t=this._rgb)&&(t.a<255?`rgba(${t.r}, ${t.g}, ${t.b}, ${wt(t.a)})`:`rgb(${t.r}, ${t.g}, ${t.b})`):void 0;var t}hexString(){return this._valid?At(this._rgb):void 0}hslString(){return this._valid?function(t){if(!t)return;const e=It(t),i=e[0],s=kt(e[1]),n=kt(e[2]);return t.a<255?`hsla(${i}, ${s}%, ${n}%, ${wt(t.a)})`:`hsl(${i}, ${s}%, ${n}%)`}(this._rgb):void 0}mix(t,e){if(t){const i=this.rgb,s=t.rgb;let n;const o=e===n?.5:e,a=2*o-1,r=i.a-s.a,l=((a*r==-1?a:(a+r)/(1+a*r))+1)/2;n=1-l,i.r=255&l*i.r+n*s.r+.5,i.g=255&l*i.g+n*s.g+.5,i.b=255&l*i.b+n*s.b+.5,i.a=o*i.a+(1-o)*s.a,this.rgb=i}return this}interpolate(t,e){return t&&(this._rgb=function(t,e,i){const s=Ut(wt(t.r)),n=Ut(wt(t.g)),o=Ut(wt(t.b));return{r:Mt(Yt(s+i*(Ut(wt(e.r))-s))),g:Mt(Yt(n+i*(Ut(wt(e.g))-n))),b:Mt(Yt(o+i*(Ut(wt(e.b))-o))),a:t.a+i*(e.a-t.a)}}(this._rgb,t._rgb,e)),this}clone(){return new Jt(this.rgb)}alpha(t){return this._rgb.a=Mt(t),this}clearer(t){return this._rgb.a*=1-t,this}greyscale(){const t=this._rgb,e=_t(.3*t.r+.59*t.g+.11*t.b);return t.r=t.g=t.b=e,this}opaquer(t){return this._rgb.a*=1+t,this}negate(){const t=this._rgb;return t.r=255-t.r,t.g=255-t.g,t.b=255-t.b,this}lighten(t){return Xt(this._rgb,2,t),this}darken(t){return Xt(this._rgb,2,-t),this}saturate(t){return Xt(this._rgb,1,t),this}desaturate(t){return Xt(this._rgb,1,-t),this}rotate(t){return function(t,e){var i=It(t);i[0]=Vt(i[0]+e),i=Ft(i),t.r=i[0],t.g=i[1],t.b=i[2]}(this._rgb,t),this}}function Zt(t){if(t&&"object"==typeof t){const e=t.toString();return"[object CanvasPattern]"===e||"[object CanvasGradient]"===e}return!1}function Qt(t){return Zt(t)?t:new Jt(t)}function te(t){return Zt(t)?t:new Jt(t).saturate(.5).darken(.1).hexString()}const ee=["x","y","borderWidth","radius","tension"],ie=["color","borderColor","backgroundColor"];const se=new Map;function ne(t,e,i){return function(t,e){e=e||{};const i=t+JSON.stringify(e);let s=se.get(i);return s||(s=new Intl.NumberFormat(t,e),se.set(i,s)),s}(e,i).format(t)}const oe={values:t=>n(t)?t:""+t,numeric(t,e,i){if(0===t)return"0";const s=this.chart.options.locale;let n,o=t;if(i.length>1){const e=Math.max(Math.abs(i[0].value),Math.abs(i[i.length-1].value));(e<1e-4||e>1e15)&&(n="scientific"),o=function(t,e){let i=e.length>3?e[2].value-e[1].value:e[1].value-e[0].value;Math.abs(i)>=1&&t!==Math.floor(t)&&(i=t-Math.floor(t));return i}(t,i)}const a=z(Math.abs(o)),r=isNaN(a)?1:Math.max(Math.min(-1*Math.floor(a),20),0),l={notation:n,minimumFractionDigits:r,maximumFractionDigits:r};return Object.assign(l,this.options.ticks.format),ne(t,s,l)},logarithmic(t,e,i){if(0===t)return"0";const s=i[e].significand||t/Math.pow(10,Math.floor(z(t)));return[1,2,3,5,10,15].includes(s)||e>.8*i.length?oe.numeric.call(this,t,e,i):""}};var ae={formatters:oe};const re=Object.create(null),le=Object.create(null);function he(t,e){if(!e)return t;const i=e.split(".");for(let e=0,s=i.length;e<s;++e){const s=i[e];t=t[s]||(t[s]=Object.create(null))}return t}function ce(t,e,i){return"string"==typeof e?x(he(t,e),i):x(he(t,""),e)}class de{constructor(t,e){this.animation=void 0,this.backgroundColor="rgba(0,0,0,0.1)",this.borderColor="rgba(0,0,0,0.1)",this.color="#666",this.datasets={},this.devicePixelRatio=t=>t.chart.platform.getDevicePixelRatio(),this.elements={},this.events=["mousemove","mouseout","click","touchstart","touchmove"],this.font={family:"'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",size:12,style:"normal",lineHeight:1.2,weight:null},this.hover={},this.hoverBackgroundColor=(t,e)=>te(e.backgroundColor),this.hoverBorderColor=(t,e)=>te(e.borderColor),this.hoverColor=(t,e)=>te(e.color),this.indexAxis="x",this.interaction={mode:"nearest",intersect:!0,includeInvisible:!1},this.maintainAspectRatio=!0,this.onHover=null,this.onClick=null,this.parsing=!0,this.plugins={},this.responsive=!0,this.scale=void 0,this.scales={},this.showLine=!0,this.drawActiveElementsOnTop=!0,this.describe(t),this.apply(e)}set(t,e){return ce(this,t,e)}get(t){return he(this,t)}describe(t,e){return ce(le,t,e)}override(t,e){return ce(re,t,e)}route(t,e,i,s){const n=he(this,t),a=he(this,i),r="_"+e;Object.defineProperties(n,{[r]:{value:n[e],writable:!0},[e]:{enumerable:!0,get(){const t=this[r],e=a[s];return o(t)?Object.assign({},e,t):l(t,e)},set(t){this[r]=t}}})}apply(t){t.forEach((t=>t(this)))}}var ue=new de({_scriptable:t=>!t.startsWith("on"),_indexable:t=>"events"!==t,hover:{_fallback:"interaction"},interaction:{_scriptable:!1,_indexable:!1}},[function(t){t.set("animation",{delay:void 0,duration:1e3,easing:"easeOutQuart",fn:void 0,from:void 0,loop:void 0,to:void 0,type:void 0}),t.describe("animation",{_fallback:!1,_indexable:!1,_scriptable:t=>"onProgress"!==t&&"onComplete"!==t&&"fn"!==t}),t.set("animations",{colors:{type:"color",properties:ie},numbers:{type:"number",properties:ee}}),t.describe("animations",{_fallback:"animation"}),t.set("transitions",{active:{animation:{duration:400}},resize:{animation:{duration:0}},show:{animations:{colors:{from:"transparent"},visible:{type:"boolean",duration:0}}},hide:{animations:{colors:{to:"transparent"},visible:{type:"boolean",easing:"linear",fn:t=>0|t}}}})},function(t){t.set("layout",{autoPadding:!0,padding:{top:0,right:0,bottom:0,left:0}})},function(t){t.set("scale",{display:!0,offset:!1,reverse:!1,beginAtZero:!1,bounds:"ticks",clip:!0,grace:0,grid:{display:!0,lineWidth:1,drawOnChartArea:!0,drawTicks:!0,tickLength:8,tickWidth:(t,e)=>e.lineWidth,tickColor:(t,e)=>e.color,offset:!1},border:{display:!0,dash:[],dashOffset:0,width:1},title:{display:!1,text:"",padding:{top:4,bottom:4}},ticks:{minRotation:0,maxRotation:50,mirror:!1,textStrokeWidth:0,textStrokeColor:"",padding:3,display:!0,autoSkip:!0,autoSkipPadding:3,labelOffset:0,callback:ae.formatters.values,minor:{},major:{},align:"center",crossAlign:"near",showLabelBackdrop:!1,backdropColor:"rgba(255, 255, 255, 0.75)",backdropPadding:2}}),t.route("scale.ticks","color","","color"),t.route("scale.grid","color","","borderColor"),t.route("scale.border","color","","borderColor"),t.route("scale.title","color","","color"),t.describe("scale",{_fallback:!1,_scriptable:t=>!t.startsWith("before")&&!t.startsWith("after")&&"callback"!==t&&"parser"!==t,_indexable:t=>"borderDash"!==t&&"tickBorderDash"!==t&&"dash"!==t}),t.describe("scales",{_fallback:"scale"}),t.describe("scale.ticks",{_scriptable:t=>"backdropPadding"!==t&&"callback"!==t,_indexable:t=>"backdropPadding"!==t})}]);function fe(){return"undefined"!=typeof window&&"undefined"!=typeof document}function ge(t){let e=t.parentNode;return e&&"[object ShadowRoot]"===e.toString()&&(e=e.host),e}function pe(t,e,i){let s;return"string"==typeof t?(s=parseInt(t,10),-1!==t.indexOf("%")&&(s=s/100*e.parentNode[i])):s=t,s}const me=t=>t.ownerDocument.defaultView.getComputedStyle(t,null);function xe(t,e){return me(t).getPropertyValue(e)}const be=["top","right","bottom","left"];function _e(t,e,i){const s={};i=i?"-"+i:"";for(let n=0;n<4;n++){const o=be[n];s[o]=parseFloat(t[e+"-"+o+i])||0}return s.width=s.left+s.right,s.height=s.top+s.bottom,s}const ye=(t,e,i)=>(t>0||e>0)&&(!i||!i.shadowRoot);function ve(t,e){if("native"in t)return t;const{canvas:i,currentDevicePixelRatio:s}=e,n=me(i),o="border-box"===n.boxSizing,a=_e(n,"padding"),r=_e(n,"border","width"),{x:l,y:h,box:c}=function(t,e){const i=t.touches,s=i&&i.length?i[0]:t,{offsetX:n,offsetY:o}=s;let a,r,l=!1;if(ye(n,o,t.target))a=n,r=o;else{const t=e.getBoundingClientRect();a=s.clientX-t.left,r=s.clientY-t.top,l=!0}return{x:a,y:r,box:l}}(t,i),d=a.left+(c&&r.left),u=a.top+(c&&r.top);let{width:f,height:g}=e;return o&&(f-=a.width+r.width,g-=a.height+r.height),{x:Math.round((l-d)/f*i.width/s),y:Math.round((h-u)/g*i.height/s)}}const Me=t=>Math.round(10*t)/10;function we(t,e,i,s){const n=me(t),o=_e(n,"margin"),a=pe(n.maxWidth,t,"clientWidth")||T,r=pe(n.maxHeight,t,"clientHeight")||T,l=function(t,e,i){let s,n;if(void 0===e||void 0===i){const o=t&&ge(t);if(o){const t=o.getBoundingClientRect(),a=me(o),r=_e(a,"border","width"),l=_e(a,"padding");e=t.width-l.width-r.width,i=t.height-l.height-r.height,s=pe(a.maxWidth,o,"clientWidth"),n=pe(a.maxHeight,o,"clientHeight")}else e=t.clientWidth,i=t.clientHeight}return{width:e,height:i,maxWidth:s||T,maxHeight:n||T}}(t,e,i);let{width:h,height:c}=l;if("content-box"===n.boxSizing){const t=_e(n,"border","width"),e=_e(n,"padding");h-=e.width+t.width,c-=e.height+t.height}h=Math.max(0,h-o.width),c=Math.max(0,s?h/s:c-o.height),h=Me(Math.min(h,a,l.maxWidth)),c=Me(Math.min(c,r,l.maxHeight)),h&&!c&&(c=Me(h/2));return(void 0!==e||void 0!==i)&&s&&l.height&&c>l.height&&(c=l.height,h=Me(Math.floor(c*s))),{width:h,height:c}}function ke(t,e,i){const s=e||1,n=Me(t.height*s),o=Me(t.width*s);t.height=Me(t.height),t.width=Me(t.width);const a=t.canvas;return a.style&&(i||!a.style.height&&!a.style.width)&&(a.style.height=`${t.height}px`,a.style.width=`${t.width}px`),(t.currentDevicePixelRatio!==s||a.height!==n||a.width!==o)&&(t.currentDevicePixelRatio=s,a.height=n,a.width=o,t.ctx.setTransform(s,0,0,s,0,0),!0)}const Se=function(){let t=!1;try{const e={get passive(){return t=!0,!1}};fe()&&(window.addEventListener("test",null,e),window.removeEventListener("test",null,e))}catch(t){}return t}();function Pe(t,e){const i=xe(t,e),s=i&&i.match(/^(\d+)(\.\d+)?px$/);return s?+s[1]:void 0}function De(t){return!t||s(t.size)||s(t.family)?null:(t.style?t.style+" ":"")+(t.weight?t.weight+" ":"")+t.size+"px "+t.family}function Ce(t,e,i,s,n){let o=e[n];return o||(o=e[n]=t.measureText(n).width,i.push(n)),o>s&&(s=o),s}function Oe(t,e,i,s){let o=(s=s||{}).data=s.data||{},a=s.garbageCollect=s.garbageCollect||[];s.font!==e&&(o=s.data={},a=s.garbageCollect=[],s.font=e),t.save(),t.font=e;let r=0;const l=i.length;let h,c,d,u,f;for(h=0;h<l;h++)if(u=i[h],null==u||n(u)){if(n(u))for(c=0,d=u.length;c<d;c++)f=u[c],null==f||n(f)||(r=Ce(t,o,a,r,f))}else r=Ce(t,o,a,r,u);t.restore();const g=a.length/2;if(g>i.length){for(h=0;h<g;h++)delete o[a[h]];a.splice(0,g)}return r}function Ae(t,e,i){const s=t.currentDevicePixelRatio,n=0!==i?Math.max(i/2,.5):0;return Math.round((e-n)*s)/s+n}function Te(t,e){(e||t)&&((e=e||t.getContext("2d")).save(),e.resetTransform(),e.clearRect(0,0,t.width,t.height),e.restore())}function Le(t,e,i,s){Ee(t,e,i,s,null)}function Ee(t,e,i,s,n){let o,a,r,l,h,c,d,u;const f=e.pointStyle,g=e.rotation,p=e.radius;let m=(g||0)*L;if(f&&"object"==typeof f&&(o=f.toString(),"[object HTMLImageElement]"===o||"[object HTMLCanvasElement]"===o))return t.save(),t.translate(i,s),t.rotate(m),t.drawImage(f,-f.width/2,-f.height/2,f.width,f.height),void t.restore();if(!(isNaN(p)||p<=0)){switch(t.beginPath(),f){default:n?t.ellipse(i,s,n/2,p,0,0,O):t.arc(i,s,p,0,O),t.closePath();break;case"triangle":c=n?n/2:p,t.moveTo(i+Math.sin(m)*c,s-Math.cos(m)*p),m+=I,t.lineTo(i+Math.sin(m)*c,s-Math.cos(m)*p),m+=I,t.lineTo(i+Math.sin(m)*c,s-Math.cos(m)*p),t.closePath();break;case"rectRounded":h=.516*p,l=p-h,a=Math.cos(m+R)*l,d=Math.cos(m+R)*(n?n/2-h:l),r=Math.sin(m+R)*l,u=Math.sin(m+R)*(n?n/2-h:l),t.arc(i-d,s-r,h,m-C,m-E),t.arc(i+u,s-a,h,m-E,m),t.arc(i+d,s+r,h,m,m+E),t.arc(i-u,s+a,h,m+E,m+C),t.closePath();break;case"rect":if(!g){l=Math.SQRT1_2*p,c=n?n/2:l,t.rect(i-c,s-l,2*c,2*l);break}m+=R;case"rectRot":d=Math.cos(m)*(n?n/2:p),a=Math.cos(m)*p,r=Math.sin(m)*p,u=Math.sin(m)*(n?n/2:p),t.moveTo(i-d,s-r),t.lineTo(i+u,s-a),t.lineTo(i+d,s+r),t.lineTo(i-u,s+a),t.closePath();break;case"crossRot":m+=R;case"cross":d=Math.cos(m)*(n?n/2:p),a=Math.cos(m)*p,r=Math.sin(m)*p,u=Math.sin(m)*(n?n/2:p),t.moveTo(i-d,s-r),t.lineTo(i+d,s+r),t.moveTo(i+u,s-a),t.lineTo(i-u,s+a);break;case"star":d=Math.cos(m)*(n?n/2:p),a=Math.cos(m)*p,r=Math.sin(m)*p,u=Math.sin(m)*(n?n/2:p),t.moveTo(i-d,s-r),t.lineTo(i+d,s+r),t.moveTo(i+u,s-a),t.lineTo(i-u,s+a),m+=R,d=Math.cos(m)*(n?n/2:p),a=Math.cos(m)*p,r=Math.sin(m)*p,u=Math.sin(m)*(n?n/2:p),t.moveTo(i-d,s-r),t.lineTo(i+d,s+r),t.moveTo(i+u,s-a),t.lineTo(i-u,s+a);break;case"line":a=n?n/2:Math.cos(m)*p,r=Math.sin(m)*p,t.moveTo(i-a,s-r),t.lineTo(i+a,s+r);break;case"dash":t.moveTo(i,s),t.lineTo(i+Math.cos(m)*(n?n/2:p),s+Math.sin(m)*p);break;case!1:t.closePath()}t.fill(),e.borderWidth>0&&t.stroke()}}function Re(t,e,i){return i=i||.5,!e||t&&t.x>e.left-i&&t.x<e.right+i&&t.y>e.top-i&&t.y<e.bottom+i}function Ie(t,e){t.save(),t.beginPath(),t.rect(e.left,e.top,e.right-e.left,e.bottom-e.top),t.clip()}function ze(t){t.restore()}function Fe(t,e,i,s,n){if(!e)return t.lineTo(i.x,i.y);if("middle"===n){const s=(e.x+i.x)/2;t.lineTo(s,e.y),t.lineTo(s,i.y)}else"after"===n!=!!s?t.lineTo(e.x,i.y):t.lineTo(i.x,e.y);t.lineTo(i.x,i.y)}function Ve(t,e,i,s){if(!e)return t.lineTo(i.x,i.y);t.bezierCurveTo(s?e.cp1x:e.cp2x,s?e.cp1y:e.cp2y,s?i.cp2x:i.cp1x,s?i.cp2y:i.cp1y,i.x,i.y)}function Be(t,e,i,s,n){if(n.strikethrough||n.underline){const o=t.measureText(s),a=e-o.actualBoundingBoxLeft,r=e+o.actualBoundingBoxRight,l=i-o.actualBoundingBoxAscent,h=i+o.actualBoundingBoxDescent,c=n.strikethrough?(l+h)/2:h;t.strokeStyle=t.fillStyle,t.beginPath(),t.lineWidth=n.decorationWidth||2,t.moveTo(a,c),t.lineTo(r,c),t.stroke()}}function We(t,e){const i=t.fillStyle;t.fillStyle=e.color,t.fillRect(e.left,e.top,e.width,e.height),t.fillStyle=i}function Ne(t,e,i,o,a,r={}){const l=n(e)?e:[e],h=r.strokeWidth>0&&""!==r.strokeColor;let c,d;for(t.save(),t.font=a.string,function(t,e){e.translation&&t.translate(e.translation[0],e.translation[1]),s(e.rotation)||t.rotate(e.rotation),e.color&&(t.fillStyle=e.color),e.textAlign&&(t.textAlign=e.textAlign),e.textBaseline&&(t.textBaseline=e.textBaseline)}(t,r),c=0;c<l.length;++c)d=l[c],r.backdrop&&We(t,r.backdrop),h&&(r.strokeColor&&(t.strokeStyle=r.strokeColor),s(r.strokeWidth)||(t.lineWidth=r.strokeWidth),t.strokeText(d,i,o,r.maxWidth)),t.fillText(d,i,o,r.maxWidth),Be(t,i,o,d,r),o+=Number(a.lineHeight);t.restore()}function He(t,e){const{x:i,y:s,w:n,h:o,radius:a}=e;t.arc(i+a.topLeft,s+a.topLeft,a.topLeft,1.5*C,C,!0),t.lineTo(i,s+o-a.bottomLeft),t.arc(i+a.bottomLeft,s+o-a.bottomLeft,a.bottomLeft,C,E,!0),t.lineTo(i+n-a.bottomRight,s+o),t.arc(i+n-a.bottomRight,s+o-a.bottomRight,a.bottomRight,E,0,!0),t.lineTo(i+n,s+a.topRight),t.arc(i+n-a.topRight,s+a.topRight,a.topRight,0,-E,!0),t.lineTo(i+a.topLeft,s)}function je(t,e=[""],i,s,n=(()=>t[0])){const o=i||t;void 0===s&&(s=ti("_fallback",t));const a={[Symbol.toStringTag]:"Object",_cacheable:!0,_scopes:t,_rootScopes:o,_fallback:s,_getTarget:n,override:i=>je([i,...t],e,o,s)};return new Proxy(a,{deleteProperty:(e,i)=>(delete e[i],delete e._keys,delete t[0][i],!0),get:(i,s)=>qe(i,s,(()=>function(t,e,i,s){let n;for(const o of e)if(n=ti(Ue(o,t),i),void 0!==n)return Xe(t,n)?Ze(i,s,t,n):n}(s,e,t,i))),getOwnPropertyDescriptor:(t,e)=>Reflect.getOwnPropertyDescriptor(t._scopes[0],e),getPrototypeOf:()=>Reflect.getPrototypeOf(t[0]),has:(t,e)=>ei(t).includes(e),ownKeys:t=>ei(t),set(t,e,i){const s=t._storage||(t._storage=n());return t[e]=s[e]=i,delete t._keys,!0}})}function $e(t,e,i,s){const a={_cacheable:!1,_proxy:t,_context:e,_subProxy:i,_stack:new Set,_descriptors:Ye(t,s),setContext:e=>$e(t,e,i,s),override:n=>$e(t.override(n),e,i,s)};return new Proxy(a,{deleteProperty:(e,i)=>(delete e[i],delete t[i],!0),get:(t,e,i)=>qe(t,e,(()=>function(t,e,i){const{_proxy:s,_context:a,_subProxy:r,_descriptors:l}=t;let h=s[e];S(h)&&l.isScriptable(e)&&(h=function(t,e,i,s){const{_proxy:n,_context:o,_subProxy:a,_stack:r}=i;if(r.has(t))throw new Error("Recursion detected: "+Array.from(r).join("->")+"->"+t);r.add(t);let l=e(o,a||s);r.delete(t),Xe(t,l)&&(l=Ze(n._scopes,n,t,l));return l}(e,h,t,i));n(h)&&h.length&&(h=function(t,e,i,s){const{_proxy:n,_context:a,_subProxy:r,_descriptors:l}=i;if(void 0!==a.index&&s(t))return e[a.index%e.length];if(o(e[0])){const i=e,s=n._scopes.filter((t=>t!==i));e=[];for(const o of i){const i=Ze(s,n,t,o);e.push($e(i,a,r&&r[t],l))}}return e}(e,h,t,l.isIndexable));Xe(e,h)&&(h=$e(h,a,r&&r[e],l));return h}(t,e,i))),getOwnPropertyDescriptor:(e,i)=>e._descriptors.allKeys?Reflect.has(t,i)?{enumerable:!0,configurable:!0}:void 0:Reflect.getOwnPropertyDescriptor(t,i),getPrototypeOf:()=>Reflect.getPrototypeOf(t),has:(e,i)=>Reflect.has(t,i),ownKeys:()=>Reflect.ownKeys(t),set:(e,i,s)=>(t[i]=s,delete e[i],!0)})}function Ye(t,e={scriptable:!0,indexable:!0}){const{_scriptable:i=e.scriptable,_indexable:s=e.indexable,_allKeys:n=e.allKeys}=t;return{allKeys:n,scriptable:i,indexable:s,isScriptable:S(i)?i:()=>i,isIndexable:S(s)?s:()=>s}}const Ue=(t,e)=>t?t+w(e):e,Xe=(t,e)=>o(e)&&"adapters"!==t&&(null===Object.getPrototypeOf(e)||e.constructor===Object);function qe(t,e,i){if(Object.prototype.hasOwnProperty.call(t,e)||"constructor"===e)return t[e];const s=i();return t[e]=s,s}function Ke(t,e,i){return S(t)?t(e,i):t}const Ge=(t,e)=>!0===t?e:"string"==typeof t?M(e,t):void 0;function Je(t,e,i,s,n){for(const o of e){const e=Ge(i,o);if(e){t.add(e);const o=Ke(e._fallback,i,n);if(void 0!==o&&o!==i&&o!==s)return o}else if(!1===e&&void 0!==s&&i!==s)return null}return!1}function Ze(t,e,i,s){const a=e._rootScopes,r=Ke(e._fallback,i,s),l=[...t,...a],h=new Set;h.add(s);let c=Qe(h,l,i,r||i,s);return null!==c&&((void 0===r||r===i||(c=Qe(h,l,r,c,s),null!==c))&&je(Array.from(h),[""],a,r,(()=>function(t,e,i){const s=t._getTarget();e in s||(s[e]={});const a=s[e];if(n(a)&&o(i))return i;return a||{}}(e,i,s))))}function Qe(t,e,i,s,n){for(;i;)i=Je(t,e,i,s,n);return i}function ti(t,e){for(const i of e){if(!i)continue;const e=i[t];if(void 0!==e)return e}}function ei(t){let e=t._keys;return e||(e=t._keys=function(t){const e=new Set;for(const i of t)for(const t of Object.keys(i).filter((t=>!t.startsWith("_"))))e.add(t);return Array.from(e)}(t._scopes)),e}function ii(t,e,i,s){const{iScale:n}=t,{key:o="r"}=this._parsing,a=new Array(s);let r,l,h,c;for(r=0,l=s;r<l;++r)h=r+i,c=e[h],a[r]={r:n.parse(M(c,o),h)};return a}const si=Number.EPSILON||1e-14,ni=(t,e)=>e<t.length&&!t[e].skip&&t[e],oi=t=>"x"===t?"y":"x";function ai(t,e,i,s){const n=t.skip?e:t,o=e,a=i.skip?e:i,r=q(o,n),l=q(a,o);let h=r/(r+l),c=l/(r+l);h=isNaN(h)?0:h,c=isNaN(c)?0:c;const d=s*h,u=s*c;return{previous:{x:o.x-d*(a.x-n.x),y:o.y-d*(a.y-n.y)},next:{x:o.x+u*(a.x-n.x),y:o.y+u*(a.y-n.y)}}}function ri(t,e="x"){const i=oi(e),s=t.length,n=Array(s).fill(0),o=Array(s);let a,r,l,h=ni(t,0);for(a=0;a<s;++a)if(r=l,l=h,h=ni(t,a+1),l){if(h){const t=h[e]-l[e];n[a]=0!==t?(h[i]-l[i])/t:0}o[a]=r?h?F(n[a-1])!==F(n[a])?0:(n[a-1]+n[a])/2:n[a-1]:n[a]}!function(t,e,i){const s=t.length;let n,o,a,r,l,h=ni(t,0);for(let c=0;c<s-1;++c)l=h,h=ni(t,c+1),l&&h&&(V(e[c],0,si)?i[c]=i[c+1]=0:(n=i[c]/e[c],o=i[c+1]/e[c],r=Math.pow(n,2)+Math.pow(o,2),r<=9||(a=3/Math.sqrt(r),i[c]=n*a*e[c],i[c+1]=o*a*e[c])))}(t,n,o),function(t,e,i="x"){const s=oi(i),n=t.length;let o,a,r,l=ni(t,0);for(let h=0;h<n;++h){if(a=r,r=l,l=ni(t,h+1),!r)continue;const n=r[i],c=r[s];a&&(o=(n-a[i])/3,r[`cp1${i}`]=n-o,r[`cp1${s}`]=c-o*e[h]),l&&(o=(l[i]-n)/3,r[`cp2${i}`]=n+o,r[`cp2${s}`]=c+o*e[h])}}(t,o,e)}function li(t,e,i){return Math.max(Math.min(t,i),e)}function hi(t,e,i,s,n){let o,a,r,l;if(e.spanGaps&&(t=t.filter((t=>!t.skip))),"monotone"===e.cubicInterpolationMode)ri(t,n);else{let i=s?t[t.length-1]:t[0];for(o=0,a=t.length;o<a;++o)r=t[o],l=ai(i,r,t[Math.min(o+1,a-(s?0:1))%a],e.tension),r.cp1x=l.previous.x,r.cp1y=l.previous.y,r.cp2x=l.next.x,r.cp2y=l.next.y,i=r}e.capBezierPoints&&function(t,e){let i,s,n,o,a,r=Re(t[0],e);for(i=0,s=t.length;i<s;++i)a=o,o=r,r=i<s-1&&Re(t[i+1],e),o&&(n=t[i],a&&(n.cp1x=li(n.cp1x,e.left,e.right),n.cp1y=li(n.cp1y,e.top,e.bottom)),r&&(n.cp2x=li(n.cp2x,e.left,e.right),n.cp2y=li(n.cp2y,e.top,e.bottom)))}(t,i)}const ci=t=>0===t||1===t,di=(t,e,i)=>-Math.pow(2,10*(t-=1))*Math.sin((t-e)*O/i),ui=(t,e,i)=>Math.pow(2,-10*t)*Math.sin((t-e)*O/i)+1,fi={linear:t=>t,easeInQuad:t=>t*t,easeOutQuad:t=>-t*(t-2),easeInOutQuad:t=>(t/=.5)<1?.5*t*t:-.5*(--t*(t-2)-1),easeInCubic:t=>t*t*t,easeOutCubic:t=>(t-=1)*t*t+1,easeInOutCubic:t=>(t/=.5)<1?.5*t*t*t:.5*((t-=2)*t*t+2),easeInQuart:t=>t*t*t*t,easeOutQuart:t=>-((t-=1)*t*t*t-1),easeInOutQuart:t=>(t/=.5)<1?.5*t*t*t*t:-.5*((t-=2)*t*t*t-2),easeInQuint:t=>t*t*t*t*t,easeOutQuint:t=>(t-=1)*t*t*t*t+1,easeInOutQuint:t=>(t/=.5)<1?.5*t*t*t*t*t:.5*((t-=2)*t*t*t*t+2),easeInSine:t=>1-Math.cos(t*E),easeOutSine:t=>Math.sin(t*E),easeInOutSine:t=>-.5*(Math.cos(C*t)-1),easeInExpo:t=>0===t?0:Math.pow(2,10*(t-1)),easeOutExpo:t=>1===t?1:1-Math.pow(2,-10*t),easeInOutExpo:t=>ci(t)?t:t<.5?.5*Math.pow(2,10*(2*t-1)):.5*(2-Math.pow(2,-10*(2*t-1))),easeInCirc:t=>t>=1?t:-(Math.sqrt(1-t*t)-1),easeOutCirc:t=>Math.sqrt(1-(t-=1)*t),easeInOutCirc:t=>(t/=.5)<1?-.5*(Math.sqrt(1-t*t)-1):.5*(Math.sqrt(1-(t-=2)*t)+1),easeInElastic:t=>ci(t)?t:di(t,.075,.3),easeOutElastic:t=>ci(t)?t:ui(t,.075,.3),easeInOutElastic(t){const e=.1125;return ci(t)?t:t<.5?.5*di(2*t,e,.45):.5+.5*ui(2*t-1,e,.45)},easeInBack(t){const e=1.70158;return t*t*((e+1)*t-e)},easeOutBack(t){const e=1.70158;return(t-=1)*t*((e+1)*t+e)+1},easeInOutBack(t){let e=1.70158;return(t/=.5)<1?t*t*((1+(e*=1.525))*t-e)*.5:.5*((t-=2)*t*((1+(e*=1.525))*t+e)+2)},easeInBounce:t=>1-fi.easeOutBounce(1-t),easeOutBounce(t){const e=7.5625,i=2.75;return t<1/i?e*t*t:t<2/i?e*(t-=1.5/i)*t+.75:t<2.5/i?e*(t-=2.25/i)*t+.9375:e*(t-=2.625/i)*t+.984375},easeInOutBounce:t=>t<.5?.5*fi.easeInBounce(2*t):.5*fi.easeOutBounce(2*t-1)+.5};function gi(t,e,i,s){return{x:t.x+i*(e.x-t.x),y:t.y+i*(e.y-t.y)}}function pi(t,e,i,s){return{x:t.x+i*(e.x-t.x),y:"middle"===s?i<.5?t.y:e.y:"after"===s?i<1?t.y:e.y:i>0?e.y:t.y}}function mi(t,e,i,s){const n={x:t.cp2x,y:t.cp2y},o={x:e.cp1x,y:e.cp1y},a=gi(t,n,i),r=gi(n,o,i),l=gi(o,e,i),h=gi(a,r,i),c=gi(r,l,i);return gi(h,c,i)}const xi=/^(normal|(\d+(?:\.\d+)?)(px|em|%)?)$/,bi=/^(normal|italic|initial|inherit|unset|(oblique( -?[0-9]?[0-9]deg)?))$/;function _i(t,e){const i=(""+t).match(xi);if(!i||"normal"===i[1])return 1.2*e;switch(t=+i[2],i[3]){case"px":return t;case"%":t/=100}return e*t}const yi=t=>+t||0;function vi(t,e){const i={},s=o(e),n=s?Object.keys(e):e,a=o(t)?s?i=>l(t[i],t[e[i]]):e=>t[e]:()=>t;for(const t of n)i[t]=yi(a(t));return i}function Mi(t){return vi(t,{top:"y",right:"x",bottom:"y",left:"x"})}function wi(t){return vi(t,["topLeft","topRight","bottomLeft","bottomRight"])}function ki(t){const e=Mi(t);return e.width=e.left+e.right,e.height=e.top+e.bottom,e}function Si(t,e){t=t||{},e=e||ue.font;let i=l(t.size,e.size);"string"==typeof i&&(i=parseInt(i,10));let s=l(t.style,e.style);s&&!(""+s).match(bi)&&(console.warn('Invalid font style specified: "'+s+'"'),s=void 0);const n={family:l(t.family,e.family),lineHeight:_i(l(t.lineHeight,e.lineHeight),i),size:i,style:s,weight:l(t.weight,e.weight),string:""};return n.string=De(n),n}function Pi(t,e,i,s){let o,a,r,l=!0;for(o=0,a=t.length;o<a;++o)if(r=t[o],void 0!==r&&(void 0!==e&&"function"==typeof r&&(r=r(e),l=!1),void 0!==i&&n(r)&&(r=r[i%r.length],l=!1),void 0!==r))return s&&!l&&(s.cacheable=!1),r}function Di(t,e,i){const{min:s,max:n}=t,o=c(e,(n-s)/2),a=(t,e)=>i&&0===t?0:t+e;return{min:a(s,-Math.abs(o)),max:a(n,o)}}function Ci(t,e){return Object.assign(Object.create(t),e)}function Oi(t,e,i){return t?function(t,e){return{x:i=>t+t+e-i,setWidth(t){e=t},textAlign:t=>"center"===t?t:"right"===t?"left":"right",xPlus:(t,e)=>t-e,leftForLtr:(t,e)=>t-e}}(e,i):{x:t=>t,setWidth(t){},textAlign:t=>t,xPlus:(t,e)=>t+e,leftForLtr:(t,e)=>t}}function Ai(t,e){let i,s;"ltr"!==e&&"rtl"!==e||(i=t.canvas.style,s=[i.getPropertyValue("direction"),i.getPropertyPriority("direction")],i.setProperty("direction",e,"important"),t.prevTextDirection=s)}function Ti(t,e){void 0!==e&&(delete t.prevTextDirection,t.canvas.style.setProperty("direction",e[0],e[1]))}function Li(t){return"angle"===t?{between:J,compare:K,normalize:G}:{between:tt,compare:(t,e)=>t-e,normalize:t=>t}}function Ei({start:t,end:e,count:i,loop:s,style:n}){return{start:t%i,end:e%i,loop:s&&(e-t+1)%i==0,style:n}}function Ri(t,e,i){if(!i)return[t];const{property:s,start:n,end:o}=i,a=e.length,{compare:r,between:l,normalize:h}=Li(s),{start:c,end:d,loop:u,style:f}=function(t,e,i){const{property:s,start:n,end:o}=i,{between:a,normalize:r}=Li(s),l=e.length;let h,c,{start:d,end:u,loop:f}=t;if(f){for(d+=l,u+=l,h=0,c=l;h<c&&a(r(e[d%l][s]),n,o);++h)d--,u--;d%=l,u%=l}return u<d&&(u+=l),{start:d,end:u,loop:f,style:t.style}}(t,e,i),g=[];let p,m,x,b=!1,_=null;const y=()=>b||l(n,x,p)&&0!==r(n,x),v=()=>!b||0===r(o,p)||l(o,x,p);for(let t=c,i=c;t<=d;++t)m=e[t%a],m.skip||(p=h(m[s]),p!==x&&(b=l(p,n,o),null===_&&y()&&(_=0===r(p,n)?t:i),null!==_&&v()&&(g.push(Ei({start:_,end:t,loop:u,count:a,style:f})),_=null),i=t,x=p));return null!==_&&g.push(Ei({start:_,end:d,loop:u,count:a,style:f})),g}function Ii(t,e){const i=[],s=t.segments;for(let n=0;n<s.length;n++){const o=Ri(s[n],t.points,e);o.length&&i.push(...o)}return i}function zi(t,e){const i=t.points,s=t.options.spanGaps,n=i.length;if(!n)return[];const o=!!t._loop,{start:a,end:r}=function(t,e,i,s){let n=0,o=e-1;if(i&&!s)for(;n<e&&!t[n].skip;)n++;for(;n<e&&t[n].skip;)n++;for(n%=e,i&&(o+=n);o>n&&t[o%e].skip;)o--;return o%=e,{start:n,end:o}}(i,n,o,s);if(!0===s)return Fi(t,[{start:a,end:r,loop:o}],i,e);return Fi(t,function(t,e,i,s){const n=t.length,o=[];let a,r=e,l=t[e];for(a=e+1;a<=i;++a){const i=t[a%n];i.skip||i.stop?l.skip||(s=!1,o.push({start:e%n,end:(a-1)%n,loop:s}),e=r=i.stop?a:null):(r=a,l.skip&&(e=a)),l=i}return null!==r&&o.push({start:e%n,end:r%n,loop:s}),o}(i,a,r<a?r+n:r,!!t._fullLoop&&0===a&&r===n-1),i,e)}function Fi(t,e,i,s){return s&&s.setContext&&i?function(t,e,i,s){const n=t._chart.getContext(),o=Vi(t.options),{_datasetIndex:a,options:{spanGaps:r}}=t,l=i.length,h=[];let c=o,d=e[0].start,u=d;function f(t,e,s,n){const o=r?-1:1;if(t!==e){for(t+=l;i[t%l].skip;)t-=o;for(;i[e%l].skip;)e+=o;t%l!=e%l&&(h.push({start:t%l,end:e%l,loop:s,style:n}),c=n,d=e%l)}}for(const t of e){d=r?d:t.start;let e,o=i[d%l];for(u=d+1;u<=t.end;u++){const r=i[u%l];e=Vi(s.setContext(Ci(n,{type:"segment",p0:o,p1:r,p0DataIndex:(u-1)%l,p1DataIndex:u%l,datasetIndex:a}))),Bi(e,c)&&f(d,u-1,t.loop,c),o=r,c=e}d<u-1&&f(d,u-1,t.loop,c)}return h}(t,e,i,s):e}function Vi(t){return{backgroundColor:t.backgroundColor,borderCapStyle:t.borderCapStyle,borderDash:t.borderDash,borderDashOffset:t.borderDashOffset,borderJoinStyle:t.borderJoinStyle,borderWidth:t.borderWidth,borderColor:t.borderColor}}function Bi(t,e){if(!e)return!1;const i=[],s=function(t,e){return Zt(e)?(i.includes(e)||i.push(e),i.indexOf(e)):e};return JSON.stringify(t,s)!==JSON.stringify(e,s)}function Wi(t,e,i){return t.options.clip?t[i]:e[i]}function Ni(t,e){const i=e._clip;if(i.disabled)return!1;const s=function(t,e){const{xScale:i,yScale:s}=t;return i&&s?{left:Wi(i,e,"left"),right:Wi(i,e,"right"),top:Wi(s,e,"top"),bottom:Wi(s,e,"bottom")}:e}(e,t.chartArea);return{left:!1===i.left?0:s.left-(!0===i.left?0:i.left),right:!1===i.right?t.width:s.right+(!0===i.right?0:i.right),top:!1===i.top?0:s.top-(!0===i.top?0:i.top),bottom:!1===i.bottom?t.height:s.bottom+(!0===i.bottom?0:i.bottom)}}var Hi=Object.freeze({__proto__:null,HALF_PI:E,INFINITY:T,PI:C,PITAU:A,QUARTER_PI:R,RAD_PER_DEG:L,TAU:O,TWO_THIRDS_PI:I,_addGrace:Di,_alignPixel:Ae,_alignStartEnd:ft,_angleBetween:J,_angleDiff:K,_arrayUnique:lt,_attachContext:$e,_bezierCurveTo:Ve,_bezierInterpolation:mi,_boundSegment:Ri,_boundSegments:Ii,_capitalize:w,_computeSegments:zi,_createResolver:je,_decimalPlaces:U,_deprecated:function(t,e,i,s){void 0!==e&&console.warn(t+': "'+i+'" is deprecated. Please use "'+s+'" instead')},_descriptors:Ye,_elementsEqual:f,_factorize:W,_filterBetween:nt,_getParentNode:ge,_getStartAndCountOfVisiblePoints:pt,_int16Range:Q,_isBetween:tt,_isClickEvent:D,_isDomSupported:fe,_isPointInArea:Re,_limitValue:Z,_longestText:Oe,_lookup:et,_lookupByKey:it,_measureText:Ce,_merger:m,_mergerIf:_,_normalizeAngle:G,_parseObjectDataRadialScale:ii,_pointInLine:gi,_readValueToProps:vi,_rlookupByKey:st,_scaleRangesChanged:mt,_setMinAndMaxByKey:j,_splitKey:v,_steppedInterpolation:pi,_steppedLineTo:Fe,_textX:gt,_toLeftRightCenter:ut,_updateBezierControlPoints:hi,addRoundedRectPath:He,almostEquals:V,almostWhole:H,callback:d,clearCanvas:Te,clipArea:Ie,clone:g,color:Qt,createContext:Ci,debounce:dt,defined:k,distanceBetweenPoints:q,drawPoint:Le,drawPointLegend:Ee,each:u,easingEffects:fi,finiteOrDefault:r,fontString:function(t,e,i){return e+" "+t+"px "+i},formatNumber:ne,getAngleFromPoint:X,getDatasetClipArea:Ni,getHoverColor:te,getMaximumSize:we,getRelativePosition:ve,getRtlAdapter:Oi,getStyle:xe,isArray:n,isFinite:a,isFunction:S,isNullOrUndef:s,isNumber:N,isObject:o,isPatternOrGradient:Zt,listenArrayEvents:at,log10:z,merge:x,mergeIf:b,niceNum:B,noop:e,overrideTextDirection:Ai,readUsedSize:Pe,renderText:Ne,requestAnimFrame:ht,resolve:Pi,resolveObjectKey:M,restoreTextDirection:Ti,retinaScale:ke,setsEqual:P,sign:F,splineCurve:ai,splineCurveMonotone:ri,supportsEventListenerOptions:Se,throttled:ct,toDegrees:Y,toDimension:c,toFont:Si,toFontString:De,toLineHeight:_i,toPadding:ki,toPercentage:h,toRadians:$,toTRBL:Mi,toTRBLCorners:wi,uid:i,unclipArea:ze,unlistenArrayEvents:rt,valueOrDefault:l});function ji(t,e,i,n){const{controller:o,data:a,_sorted:r}=t,l=o._cachedMeta.iScale,h=t.dataset&&t.dataset.options?t.dataset.options.spanGaps:null;if(l&&e===l.axis&&"r"!==e&&r&&a.length){const r=l._reversePixels?st:it;if(!n){const n=r(a,e,i);if(h){const{vScale:e}=o._cachedMeta,{_parsed:i}=t,a=i.slice(0,n.lo+1).reverse().findIndex((t=>!s(t[e.axis])));n.lo-=Math.max(0,a);const r=i.slice(n.hi).findIndex((t=>!s(t[e.axis])));n.hi+=Math.max(0,r)}return n}if(o._sharedOptions){const t=a[0],s="function"==typeof t.getRange&&t.getRange(e);if(s){const t=r(a,e,i-s),n=r(a,e,i+s);return{lo:t.lo,hi:n.hi}}}}return{lo:0,hi:a.length-1}}function $i(t,e,i,s,n){const o=t.getSortedVisibleDatasetMetas(),a=i[e];for(let t=0,i=o.length;t<i;++t){const{index:i,data:r}=o[t],{lo:l,hi:h}=ji(o[t],e,a,n);for(let t=l;t<=h;++t){const e=r[t];e.skip||s(e,i,t)}}}function Yi(t,e,i,s,n){const o=[];if(!n&&!t.isPointInArea(e))return o;return $i(t,i,e,(function(i,a,r){(n||Re(i,t.chartArea,0))&&i.inRange(e.x,e.y,s)&&o.push({element:i,datasetIndex:a,index:r})}),!0),o}function Ui(t,e,i,s,n,o){let a=[];const r=function(t){const e=-1!==t.indexOf("x"),i=-1!==t.indexOf("y");return function(t,s){const n=e?Math.abs(t.x-s.x):0,o=i?Math.abs(t.y-s.y):0;return Math.sqrt(Math.pow(n,2)+Math.pow(o,2))}}(i);let l=Number.POSITIVE_INFINITY;return $i(t,i,e,(function(i,h,c){const d=i.inRange(e.x,e.y,n);if(s&&!d)return;const u=i.getCenterPoint(n);if(!(!!o||t.isPointInArea(u))&&!d)return;const f=r(e,u);f<l?(a=[{element:i,datasetIndex:h,index:c}],l=f):f===l&&a.push({element:i,datasetIndex:h,index:c})})),a}function Xi(t,e,i,s,n,o){return o||t.isPointInArea(e)?"r"!==i||s?Ui(t,e,i,s,n,o):function(t,e,i,s){let n=[];return $i(t,i,e,(function(t,i,o){const{startAngle:a,endAngle:r}=t.getProps(["startAngle","endAngle"],s),{angle:l}=X(t,{x:e.x,y:e.y});J(l,a,r)&&n.push({element:t,datasetIndex:i,index:o})})),n}(t,e,i,n):[]}function qi(t,e,i,s,n){const o=[],a="x"===i?"inXRange":"inYRange";let r=!1;return $i(t,i,e,((t,s,l)=>{t[a]&&t[a](e[i],n)&&(o.push({element:t,datasetIndex:s,index:l}),r=r||t.inRange(e.x,e.y,n))})),s&&!r?[]:o}var Ki={evaluateInteractionItems:$i,modes:{index(t,e,i,s){const n=ve(e,t),o=i.axis||"x",a=i.includeInvisible||!1,r=i.intersect?Yi(t,n,o,s,a):Xi(t,n,o,!1,s,a),l=[];return r.length?(t.getSortedVisibleDatasetMetas().forEach((t=>{const e=r[0].index,i=t.data[e];i&&!i.skip&&l.push({element:i,datasetIndex:t.index,index:e})})),l):[]},dataset(t,e,i,s){const n=ve(e,t),o=i.axis||"xy",a=i.includeInvisible||!1;let r=i.intersect?Yi(t,n,o,s,a):Xi(t,n,o,!1,s,a);if(r.length>0){const e=r[0].datasetIndex,i=t.getDatasetMeta(e).data;r=[];for(let t=0;t<i.length;++t)r.push({element:i[t],datasetIndex:e,index:t})}return r},point:(t,e,i,s)=>Yi(t,ve(e,t),i.axis||"xy",s,i.includeInvisible||!1),nearest(t,e,i,s){const n=ve(e,t),o=i.axis||"xy",a=i.includeInvisible||!1;return Xi(t,n,o,i.intersect,s,a)},x:(t,e,i,s)=>qi(t,ve(e,t),"x",i.intersect,s),y:(t,e,i,s)=>qi(t,ve(e,t),"y",i.intersect,s)}};const Gi=["left","top","right","bottom"];function Ji(t,e){return t.filter((t=>t.pos===e))}function Zi(t,e){return t.filter((t=>-1===Gi.indexOf(t.pos)&&t.box.axis===e))}function Qi(t,e){return t.sort(((t,i)=>{const s=e?i:t,n=e?t:i;return s.weight===n.weight?s.index-n.index:s.weight-n.weight}))}function ts(t,e){const i=function(t){const e={};for(const i of t){const{stack:t,pos:s,stackWeight:n}=i;if(!t||!Gi.includes(s))continue;const o=e[t]||(e[t]={count:0,placed:0,weight:0,size:0});o.count++,o.weight+=n}return e}(t),{vBoxMaxWidth:s,hBoxMaxHeight:n}=e;let o,a,r;for(o=0,a=t.length;o<a;++o){r=t[o];const{fullSize:a}=r.box,l=i[r.stack],h=l&&r.stackWeight/l.weight;r.horizontal?(r.width=h?h*s:a&&e.availableWidth,r.height=n):(r.width=s,r.height=h?h*n:a&&e.availableHeight)}return i}function es(t,e,i,s){return Math.max(t[i],e[i])+Math.max(t[s],e[s])}function is(t,e){t.top=Math.max(t.top,e.top),t.left=Math.max(t.left,e.left),t.bottom=Math.max(t.bottom,e.bottom),t.right=Math.max(t.right,e.right)}function ss(t,e,i,s){const{pos:n,box:a}=i,r=t.maxPadding;if(!o(n)){i.size&&(t[n]-=i.size);const e=s[i.stack]||{size:0,count:1};e.size=Math.max(e.size,i.horizontal?a.height:a.width),i.size=e.size/e.count,t[n]+=i.size}a.getPadding&&is(r,a.getPadding());const l=Math.max(0,e.outerWidth-es(r,t,"left","right")),h=Math.max(0,e.outerHeight-es(r,t,"top","bottom")),c=l!==t.w,d=h!==t.h;return t.w=l,t.h=h,i.horizontal?{same:c,other:d}:{same:d,other:c}}function ns(t,e){const i=e.maxPadding;function s(t){const s={left:0,top:0,right:0,bottom:0};return t.forEach((t=>{s[t]=Math.max(e[t],i[t])})),s}return s(t?["left","right"]:["top","bottom"])}function os(t,e,i,s){const n=[];let o,a,r,l,h,c;for(o=0,a=t.length,h=0;o<a;++o){r=t[o],l=r.box,l.update(r.width||e.w,r.height||e.h,ns(r.horizontal,e));const{same:a,other:d}=ss(e,i,r,s);h|=a&&n.length,c=c||d,l.fullSize||n.push(r)}return h&&os(n,e,i,s)||c}function as(t,e,i,s,n){t.top=i,t.left=e,t.right=e+s,t.bottom=i+n,t.width=s,t.height=n}function rs(t,e,i,s){const n=i.padding;let{x:o,y:a}=e;for(const r of t){const t=r.box,l=s[r.stack]||{count:1,placed:0,weight:1},h=r.stackWeight/l.weight||1;if(r.horizontal){const s=e.w*h,o=l.size||t.height;k(l.start)&&(a=l.start),t.fullSize?as(t,n.left,a,i.outerWidth-n.right-n.left,o):as(t,e.left+l.placed,a,s,o),l.start=a,l.placed+=s,a=t.bottom}else{const s=e.h*h,a=l.size||t.width;k(l.start)&&(o=l.start),t.fullSize?as(t,o,n.top,a,i.outerHeight-n.bottom-n.top):as(t,o,e.top+l.placed,a,s),l.start=o,l.placed+=s,o=t.right}}e.x=o,e.y=a}var ls={addBox(t,e){t.boxes||(t.boxes=[]),e.fullSize=e.fullSize||!1,e.position=e.position||"top",e.weight=e.weight||0,e._layers=e._layers||function(){return[{z:0,draw(t){e.draw(t)}}]},t.boxes.push(e)},removeBox(t,e){const i=t.boxes?t.boxes.indexOf(e):-1;-1!==i&&t.boxes.splice(i,1)},configure(t,e,i){e.fullSize=i.fullSize,e.position=i.position,e.weight=i.weight},update(t,e,i,s){if(!t)return;const n=ki(t.options.layout.padding),o=Math.max(e-n.width,0),a=Math.max(i-n.height,0),r=function(t){const e=function(t){const e=[];let i,s,n,o,a,r;for(i=0,s=(t||[]).length;i<s;++i)n=t[i],({position:o,options:{stack:a,stackWeight:r=1}}=n),e.push({index:i,box:n,pos:o,horizontal:n.isHorizontal(),weight:n.weight,stack:a&&o+a,stackWeight:r});return e}(t),i=Qi(e.filter((t=>t.box.fullSize)),!0),s=Qi(Ji(e,"left"),!0),n=Qi(Ji(e,"right")),o=Qi(Ji(e,"top"),!0),a=Qi(Ji(e,"bottom")),r=Zi(e,"x"),l=Zi(e,"y");return{fullSize:i,leftAndTop:s.concat(o),rightAndBottom:n.concat(l).concat(a).concat(r),chartArea:Ji(e,"chartArea"),vertical:s.concat(n).concat(l),horizontal:o.concat(a).concat(r)}}(t.boxes),l=r.vertical,h=r.horizontal;u(t.boxes,(t=>{"function"==typeof t.beforeLayout&&t.beforeLayout()}));const c=l.reduce(((t,e)=>e.box.options&&!1===e.box.options.display?t:t+1),0)||1,d=Object.freeze({outerWidth:e,outerHeight:i,padding:n,availableWidth:o,availableHeight:a,vBoxMaxWidth:o/2/c,hBoxMaxHeight:a/2}),f=Object.assign({},n);is(f,ki(s));const g=Object.assign({maxPadding:f,w:o,h:a,x:n.left,y:n.top},n),p=ts(l.concat(h),d);os(r.fullSize,g,d,p),os(l,g,d,p),os(h,g,d,p)&&os(l,g,d,p),function(t){const e=t.maxPadding;function i(i){const s=Math.max(e[i]-t[i],0);return t[i]+=s,s}t.y+=i("top"),t.x+=i("left"),i("right"),i("bottom")}(g),rs(r.leftAndTop,g,d,p),g.x+=g.w,g.y+=g.h,rs(r.rightAndBottom,g,d,p),t.chartArea={left:g.left,top:g.top,right:g.left+g.w,bottom:g.top+g.h,height:g.h,width:g.w},u(r.chartArea,(e=>{const i=e.box;Object.assign(i,t.chartArea),i.update(g.w,g.h,{left:0,top:0,right:0,bottom:0})}))}};class hs{acquireContext(t,e){}releaseContext(t){return!1}addEventListener(t,e,i){}removeEventListener(t,e,i){}getDevicePixelRatio(){return 1}getMaximumSize(t,e,i,s){return e=Math.max(0,e||t.width),i=i||t.height,{width:e,height:Math.max(0,s?Math.floor(e/s):i)}}isAttached(t){return!0}updateConfig(t){}}class cs extends hs{acquireContext(t){return t&&t.getContext&&t.getContext("2d")||null}updateConfig(t){t.options.animation=!1}}const ds="$chartjs",us={touchstart:"mousedown",touchmove:"mousemove",touchend:"mouseup",pointerenter:"mouseenter",pointerdown:"mousedown",pointermove:"mousemove",pointerup:"mouseup",pointerleave:"mouseout",pointerout:"mouseout"},fs=t=>null===t||""===t;const gs=!!Se&&{passive:!0};function ps(t,e,i){t&&t.canvas&&t.canvas.removeEventListener(e,i,gs)}function ms(t,e){for(const i of t)if(i===e||i.contains(e))return!0}function xs(t,e,i){const s=t.canvas,n=new MutationObserver((t=>{let e=!1;for(const i of t)e=e||ms(i.addedNodes,s),e=e&&!ms(i.removedNodes,s);e&&i()}));return n.observe(document,{childList:!0,subtree:!0}),n}function bs(t,e,i){const s=t.canvas,n=new MutationObserver((t=>{let e=!1;for(const i of t)e=e||ms(i.removedNodes,s),e=e&&!ms(i.addedNodes,s);e&&i()}));return n.observe(document,{childList:!0,subtree:!0}),n}const _s=new Map;let ys=0;function vs(){const t=window.devicePixelRatio;t!==ys&&(ys=t,_s.forEach(((e,i)=>{i.currentDevicePixelRatio!==t&&e()})))}function Ms(t,e,i){const s=t.canvas,n=s&&ge(s);if(!n)return;const o=ct(((t,e)=>{const s=n.clientWidth;i(t,e),s<n.clientWidth&&i()}),window),a=new ResizeObserver((t=>{const e=t[0],i=e.contentRect.width,s=e.contentRect.height;0===i&&0===s||o(i,s)}));return a.observe(n),function(t,e){_s.size||window.addEventListener("resize",vs),_s.set(t,e)}(t,o),a}function ws(t,e,i){i&&i.disconnect(),"resize"===e&&function(t){_s.delete(t),_s.size||window.removeEventListener("resize",vs)}(t)}function ks(t,e,i){const s=t.canvas,n=ct((e=>{null!==t.ctx&&i(function(t,e){const i=us[t.type]||t.type,{x:s,y:n}=ve(t,e);return{type:i,chart:e,native:t,x:void 0!==s?s:null,y:void 0!==n?n:null}}(e,t))}),t);return function(t,e,i){t&&t.addEventListener(e,i,gs)}(s,e,n),n}class Ss extends hs{acquireContext(t,e){const i=t&&t.getContext&&t.getContext("2d");return i&&i.canvas===t?(function(t,e){const i=t.style,s=t.getAttribute("height"),n=t.getAttribute("width");if(t[ds]={initial:{height:s,width:n,style:{display:i.display,height:i.height,width:i.width}}},i.display=i.display||"block",i.boxSizing=i.boxSizing||"border-box",fs(n)){const e=Pe(t,"width");void 0!==e&&(t.width=e)}if(fs(s))if(""===t.style.height)t.height=t.width/(e||2);else{const e=Pe(t,"height");void 0!==e&&(t.height=e)}}(t,e),i):null}releaseContext(t){const e=t.canvas;if(!e[ds])return!1;const i=e[ds].initial;["height","width"].forEach((t=>{const n=i[t];s(n)?e.removeAttribute(t):e.setAttribute(t,n)}));const n=i.style||{};return Object.keys(n).forEach((t=>{e.style[t]=n[t]})),e.width=e.width,delete e[ds],!0}addEventListener(t,e,i){this.removeEventListener(t,e);const s=t.$proxies||(t.$proxies={}),n={attach:xs,detach:bs,resize:Ms}[e]||ks;s[e]=n(t,e,i)}removeEventListener(t,e){const i=t.$proxies||(t.$proxies={}),s=i[e];if(!s)return;({attach:ws,detach:ws,resize:ws}[e]||ps)(t,e,s),i[e]=void 0}getDevicePixelRatio(){return window.devicePixelRatio}getMaximumSize(t,e,i,s){return we(t,e,i,s)}isAttached(t){const e=t&&ge(t);return!(!e||!e.isConnected)}}function Ps(t){return!fe()||"undefined"!=typeof OffscreenCanvas&&t instanceof OffscreenCanvas?cs:Ss}var Ds=Object.freeze({__proto__:null,BasePlatform:hs,BasicPlatform:cs,DomPlatform:Ss,_detectPlatform:Ps});const Cs="transparent",Os={boolean:(t,e,i)=>i>.5?e:t,color(t,e,i){const s=Qt(t||Cs),n=s.valid&&Qt(e||Cs);return n&&n.valid?n.mix(s,i).hexString():e},number:(t,e,i)=>t+(e-t)*i};class As{constructor(t,e,i,s){const n=e[i];s=Pi([t.to,s,n,t.from]);const o=Pi([t.from,n,s]);this._active=!0,this._fn=t.fn||Os[t.type||typeof o],this._easing=fi[t.easing]||fi.linear,this._start=Math.floor(Date.now()+(t.delay||0)),this._duration=this._total=Math.floor(t.duration),this._loop=!!t.loop,this._target=e,this._prop=i,this._from=o,this._to=s,this._promises=void 0}active(){return this._active}update(t,e,i){if(this._active){this._notify(!1);const s=this._target[this._prop],n=i-this._start,o=this._duration-n;this._start=i,this._duration=Math.floor(Math.max(o,t.duration)),this._total+=n,this._loop=!!t.loop,this._to=Pi([t.to,e,s,t.from]),this._from=Pi([t.from,s,e])}}cancel(){this._active&&(this.tick(Date.now()),this._active=!1,this._notify(!1))}tick(t){const e=t-this._start,i=this._duration,s=this._prop,n=this._from,o=this._loop,a=this._to;let r;if(this._active=n!==a&&(o||e<i),!this._active)return this._target[s]=a,void this._notify(!0);e<0?this._target[s]=n:(r=e/i%2,r=o&&r>1?2-r:r,r=this._easing(Math.min(1,Math.max(0,r))),this._target[s]=this._fn(n,a,r))}wait(){const t=this._promises||(this._promises=[]);return new Promise(((e,i)=>{t.push({res:e,rej:i})}))}_notify(t){const e=t?"res":"rej",i=this._promises||[];for(let t=0;t<i.length;t++)i[t][e]()}}class Ts{constructor(t,e){this._chart=t,this._properties=new Map,this.configure(e)}configure(t){if(!o(t))return;const e=Object.keys(ue.animation),i=this._properties;Object.getOwnPropertyNames(t).forEach((s=>{const a=t[s];if(!o(a))return;const r={};for(const t of e)r[t]=a[t];(n(a.properties)&&a.properties||[s]).forEach((t=>{t!==s&&i.has(t)||i.set(t,r)}))}))}_animateOptions(t,e){const i=e.options,s=function(t,e){if(!e)return;let i=t.options;if(!i)return void(t.options=e);i.$shared&&(t.options=i=Object.assign({},i,{$shared:!1,$animations:{}}));return i}(t,i);if(!s)return[];const n=this._createAnimations(s,i);return i.$shared&&function(t,e){const i=[],s=Object.keys(e);for(let e=0;e<s.length;e++){const n=t[s[e]];n&&n.active()&&i.push(n.wait())}return Promise.all(i)}(t.options.$animations,i).then((()=>{t.options=i}),(()=>{})),n}_createAnimations(t,e){const i=this._properties,s=[],n=t.$animations||(t.$animations={}),o=Object.keys(e),a=Date.now();let r;for(r=o.length-1;r>=0;--r){const l=o[r];if("$"===l.charAt(0))continue;if("options"===l){s.push(...this._animateOptions(t,e));continue}const h=e[l];let c=n[l];const d=i.get(l);if(c){if(d&&c.active()){c.update(d,h,a);continue}c.cancel()}d&&d.duration?(n[l]=c=new As(d,t,l,h),s.push(c)):t[l]=h}return s}update(t,e){if(0===this._properties.size)return void Object.assign(t,e);const i=this._createAnimations(t,e);return i.length?(bt.add(this._chart,i),!0):void 0}}function Ls(t,e){const i=t&&t.options||{},s=i.reverse,n=void 0===i.min?e:0,o=void 0===i.max?e:0;return{start:s?o:n,end:s?n:o}}function Es(t,e){const i=[],s=t._getSortedDatasetMetas(e);let n,o;for(n=0,o=s.length;n<o;++n)i.push(s[n].index);return i}function Rs(t,e,i,s={}){const n=t.keys,o="single"===s.mode;let r,l,h,c;if(null===e)return;let d=!1;for(r=0,l=n.length;r<l;++r){if(h=+n[r],h===i){if(d=!0,s.all)continue;break}c=t.values[h],a(c)&&(o||0===e||F(e)===F(c))&&(e+=c)}return d||s.all?e:0}function Is(t,e){const i=t&&t.options.stacked;return i||void 0===i&&void 0!==e.stack}function zs(t,e,i){const s=t[e]||(t[e]={});return s[i]||(s[i]={})}function Fs(t,e,i,s){for(const n of e.getMatchingVisibleMetas(s).reverse()){const e=t[n.index];if(i&&e>0||!i&&e<0)return n.index}return null}function Vs(t,e){const{chart:i,_cachedMeta:s}=t,n=i._stacks||(i._stacks={}),{iScale:o,vScale:a,index:r}=s,l=o.axis,h=a.axis,c=function(t,e,i){return`${t.id}.${e.id}.${i.stack||i.type}`}(o,a,s),d=e.length;let u;for(let t=0;t<d;++t){const i=e[t],{[l]:o,[h]:d}=i;u=(i._stacks||(i._stacks={}))[h]=zs(n,c,o),u[r]=d,u._top=Fs(u,a,!0,s.type),u._bottom=Fs(u,a,!1,s.type);(u._visualValues||(u._visualValues={}))[r]=d}}function Bs(t,e){const i=t.scales;return Object.keys(i).filter((t=>i[t].axis===e)).shift()}function Ws(t,e){const i=t.controller.index,s=t.vScale&&t.vScale.axis;if(s){e=e||t._parsed;for(const t of e){const e=t._stacks;if(!e||void 0===e[s]||void 0===e[s][i])return;delete e[s][i],void 0!==e[s]._visualValues&&void 0!==e[s]._visualValues[i]&&delete e[s]._visualValues[i]}}}const Ns=t=>"reset"===t||"none"===t,Hs=(t,e)=>e?t:Object.assign({},t);class js{static defaults={};static datasetElementType=null;static dataElementType=null;constructor(t,e){this.chart=t,this._ctx=t.ctx,this.index=e,this._cachedDataOpts={},this._cachedMeta=this.getMeta(),this._type=this._cachedMeta.type,this.options=void 0,this._parsing=!1,this._data=void 0,this._objectData=void 0,this._sharedOptions=void 0,this._drawStart=void 0,this._drawCount=void 0,this.enableOptionSharing=!1,this.supportsDecimation=!1,this.$context=void 0,this._syncList=[],this.datasetElementType=new.target.datasetElementType,this.dataElementType=new.target.dataElementType,this.initialize()}initialize(){const t=this._cachedMeta;this.configure(),this.linkScales(),t._stacked=Is(t.vScale,t),this.addElements(),this.options.fill&&!this.chart.isPluginEnabled("filler")&&console.warn("Tried to use the 'fill' option without the 'Filler' plugin enabled. Please import and register the 'Filler' plugin and make sure it is not disabled in the options")}updateIndex(t){this.index!==t&&Ws(this._cachedMeta),this.index=t}linkScales(){const t=this.chart,e=this._cachedMeta,i=this.getDataset(),s=(t,e,i,s)=>"x"===t?e:"r"===t?s:i,n=e.xAxisID=l(i.xAxisID,Bs(t,"x")),o=e.yAxisID=l(i.yAxisID,Bs(t,"y")),a=e.rAxisID=l(i.rAxisID,Bs(t,"r")),r=e.indexAxis,h=e.iAxisID=s(r,n,o,a),c=e.vAxisID=s(r,o,n,a);e.xScale=this.getScaleForId(n),e.yScale=this.getScaleForId(o),e.rScale=this.getScaleForId(a),e.iScale=this.getScaleForId(h),e.vScale=this.getScaleForId(c)}getDataset(){return this.chart.data.datasets[this.index]}getMeta(){return this.chart.getDatasetMeta(this.index)}getScaleForId(t){return this.chart.scales[t]}_getOtherScale(t){const e=this._cachedMeta;return t===e.iScale?e.vScale:e.iScale}reset(){this._update("reset")}_destroy(){const t=this._cachedMeta;this._data&&rt(this._data,this),t._stacked&&Ws(t)}_dataCheck(){const t=this.getDataset(),e=t.data||(t.data=[]),i=this._data;if(o(e)){const t=this._cachedMeta;this._data=function(t,e){const{iScale:i,vScale:s}=e,n="x"===i.axis?"x":"y",o="x"===s.axis?"x":"y",a=Object.keys(t),r=new Array(a.length);let l,h,c;for(l=0,h=a.length;l<h;++l)c=a[l],r[l]={[n]:c,[o]:t[c]};return r}(e,t)}else if(i!==e){if(i){rt(i,this);const t=this._cachedMeta;Ws(t),t._parsed=[]}e&&Object.isExtensible(e)&&at(e,this),this._syncList=[],this._data=e}}addElements(){const t=this._cachedMeta;this._dataCheck(),this.datasetElementType&&(t.dataset=new this.datasetElementType)}buildOrUpdateElements(t){const e=this._cachedMeta,i=this.getDataset();let s=!1;this._dataCheck();const n=e._stacked;e._stacked=Is(e.vScale,e),e.stack!==i.stack&&(s=!0,Ws(e),e.stack=i.stack),this._resyncElements(t),(s||n!==e._stacked)&&(Vs(this,e._parsed),e._stacked=Is(e.vScale,e))}configure(){const t=this.chart.config,e=t.datasetScopeKeys(this._type),i=t.getOptionScopes(this.getDataset(),e,!0);this.options=t.createResolver(i,this.getContext()),this._parsing=this.options.parsing,this._cachedDataOpts={}}parse(t,e){const{_cachedMeta:i,_data:s}=this,{iScale:a,_stacked:r}=i,l=a.axis;let h,c,d,u=0===t&&e===s.length||i._sorted,f=t>0&&i._parsed[t-1];if(!1===this._parsing)i._parsed=s,i._sorted=!0,d=s;else{d=n(s[t])?this.parseArrayData(i,s,t,e):o(s[t])?this.parseObjectData(i,s,t,e):this.parsePrimitiveData(i,s,t,e);const a=()=>null===c[l]||f&&c[l]<f[l];for(h=0;h<e;++h)i._parsed[h+t]=c=d[h],u&&(a()&&(u=!1),f=c);i._sorted=u}r&&Vs(this,d)}parsePrimitiveData(t,e,i,s){const{iScale:n,vScale:o}=t,a=n.axis,r=o.axis,l=n.getLabels(),h=n===o,c=new Array(s);let d,u,f;for(d=0,u=s;d<u;++d)f=d+i,c[d]={[a]:h||n.parse(l[f],f),[r]:o.parse(e[f],f)};return c}parseArrayData(t,e,i,s){const{xScale:n,yScale:o}=t,a=new Array(s);let r,l,h,c;for(r=0,l=s;r<l;++r)h=r+i,c=e[h],a[r]={x:n.parse(c[0],h),y:o.parse(c[1],h)};return a}parseObjectData(t,e,i,s){const{xScale:n,yScale:o}=t,{xAxisKey:a="x",yAxisKey:r="y"}=this._parsing,l=new Array(s);let h,c,d,u;for(h=0,c=s;h<c;++h)d=h+i,u=e[d],l[h]={x:n.parse(M(u,a),d),y:o.parse(M(u,r),d)};return l}getParsed(t){return this._cachedMeta._parsed[t]}getDataElement(t){return this._cachedMeta.data[t]}applyStack(t,e,i){const s=this.chart,n=this._cachedMeta,o=e[t.axis];return Rs({keys:Es(s,!0),values:e._stacks[t.axis]._visualValues},o,n.index,{mode:i})}updateRangeFromParsed(t,e,i,s){const n=i[e.axis];let o=null===n?NaN:n;const a=s&&i._stacks[e.axis];s&&a&&(s.values=a,o=Rs(s,n,this._cachedMeta.index)),t.min=Math.min(t.min,o),t.max=Math.max(t.max,o)}getMinMax(t,e){const i=this._cachedMeta,s=i._parsed,n=i._sorted&&t===i.iScale,o=s.length,r=this._getOtherScale(t),l=((t,e,i)=>t&&!e.hidden&&e._stacked&&{keys:Es(i,!0),values:null})(e,i,this.chart),h={min:Number.POSITIVE_INFINITY,max:Number.NEGATIVE_INFINITY},{min:c,max:d}=function(t){const{min:e,max:i,minDefined:s,maxDefined:n}=t.getUserBounds();return{min:s?e:Number.NEGATIVE_INFINITY,max:n?i:Number.POSITIVE_INFINITY}}(r);let u,f;function g(){f=s[u];const e=f[r.axis];return!a(f[t.axis])||c>e||d<e}for(u=0;u<o&&(g()||(this.updateRangeFromParsed(h,t,f,l),!n));++u);if(n)for(u=o-1;u>=0;--u)if(!g()){this.updateRangeFromParsed(h,t,f,l);break}return h}getAllParsedValues(t){const e=this._cachedMeta._parsed,i=[];let s,n,o;for(s=0,n=e.length;s<n;++s)o=e[s][t.axis],a(o)&&i.push(o);return i}getMaxOverflow(){return!1}getLabelAndValue(t){const e=this._cachedMeta,i=e.iScale,s=e.vScale,n=this.getParsed(t);return{label:i?""+i.getLabelForValue(n[i.axis]):"",value:s?""+s.getLabelForValue(n[s.axis]):""}}_update(t){const e=this._cachedMeta;this.update(t||"default"),e._clip=function(t){let e,i,s,n;return o(t)?(e=t.top,i=t.right,s=t.bottom,n=t.left):e=i=s=n=t,{top:e,right:i,bottom:s,left:n,disabled:!1===t}}(l(this.options.clip,function(t,e,i){if(!1===i)return!1;const s=Ls(t,i),n=Ls(e,i);return{top:n.end,right:s.end,bottom:n.start,left:s.start}}(e.xScale,e.yScale,this.getMaxOverflow())))}update(t){}draw(){const t=this._ctx,e=this.chart,i=this._cachedMeta,s=i.data||[],n=e.chartArea,o=[],a=this._drawStart||0,r=this._drawCount||s.length-a,l=this.options.drawActiveElementsOnTop;let h;for(i.dataset&&i.dataset.draw(t,n,a,r),h=a;h<a+r;++h){const e=s[h];e.hidden||(e.active&&l?o.push(e):e.draw(t,n))}for(h=0;h<o.length;++h)o[h].draw(t,n)}getStyle(t,e){const i=e?"active":"default";return void 0===t&&this._cachedMeta.dataset?this.resolveDatasetElementOptions(i):this.resolveDataElementOptions(t||0,i)}getContext(t,e,i){const s=this.getDataset();let n;if(t>=0&&t<this._cachedMeta.data.length){const e=this._cachedMeta.data[t];n=e.$context||(e.$context=function(t,e,i){return Ci(t,{active:!1,dataIndex:e,parsed:void 0,raw:void 0,element:i,index:e,mode:"default",type:"data"})}(this.getContext(),t,e)),n.parsed=this.getParsed(t),n.raw=s.data[t],n.index=n.dataIndex=t}else n=this.$context||(this.$context=function(t,e){return Ci(t,{active:!1,dataset:void 0,datasetIndex:e,index:e,mode:"default",type:"dataset"})}(this.chart.getContext(),this.index)),n.dataset=s,n.index=n.datasetIndex=this.index;return n.active=!!e,n.mode=i,n}resolveDatasetElementOptions(t){return this._resolveElementOptions(this.datasetElementType.id,t)}resolveDataElementOptions(t,e){return this._resolveElementOptions(this.dataElementType.id,e,t)}_resolveElementOptions(t,e="default",i){const s="active"===e,n=this._cachedDataOpts,o=t+"-"+e,a=n[o],r=this.enableOptionSharing&&k(i);if(a)return Hs(a,r);const l=this.chart.config,h=l.datasetElementScopeKeys(this._type,t),c=s?[`${t}Hover`,"hover",t,""]:[t,""],d=l.getOptionScopes(this.getDataset(),h),u=Object.keys(ue.elements[t]),f=l.resolveNamedOptions(d,u,(()=>this.getContext(i,s,e)),c);return f.$shared&&(f.$shared=r,n[o]=Object.freeze(Hs(f,r))),f}_resolveAnimations(t,e,i){const s=this.chart,n=this._cachedDataOpts,o=`animation-${e}`,a=n[o];if(a)return a;let r;if(!1!==s.options.animation){const s=this.chart.config,n=s.datasetAnimationScopeKeys(this._type,e),o=s.getOptionScopes(this.getDataset(),n);r=s.createResolver(o,this.getContext(t,i,e))}const l=new Ts(s,r&&r.animations);return r&&r._cacheable&&(n[o]=Object.freeze(l)),l}getSharedOptions(t){if(t.$shared)return this._sharedOptions||(this._sharedOptions=Object.assign({},t))}includeOptions(t,e){return!e||Ns(t)||this.chart._animationsDisabled}_getSharedOptions(t,e){const i=this.resolveDataElementOptions(t,e),s=this._sharedOptions,n=this.getSharedOptions(i),o=this.includeOptions(e,n)||n!==s;return this.updateSharedOptions(n,e,i),{sharedOptions:n,includeOptions:o}}updateElement(t,e,i,s){Ns(s)?Object.assign(t,i):this._resolveAnimations(e,s).update(t,i)}updateSharedOptions(t,e,i){t&&!Ns(e)&&this._resolveAnimations(void 0,e).update(t,i)}_setStyle(t,e,i,s){t.active=s;const n=this.getStyle(e,s);this._resolveAnimations(e,i,s).update(t,{options:!s&&this.getSharedOptions(n)||n})}removeHoverStyle(t,e,i){this._setStyle(t,i,"active",!1)}setHoverStyle(t,e,i){this._setStyle(t,i,"active",!0)}_removeDatasetHoverStyle(){const t=this._cachedMeta.dataset;t&&this._setStyle(t,void 0,"active",!1)}_setDatasetHoverStyle(){const t=this._cachedMeta.dataset;t&&this._setStyle(t,void 0,"active",!0)}_resyncElements(t){const e=this._data,i=this._cachedMeta.data;for(const[t,e,i]of this._syncList)this[t](e,i);this._syncList=[];const s=i.length,n=e.length,o=Math.min(n,s);o&&this.parse(0,o),n>s?this._insertElements(s,n-s,t):n<s&&this._removeElements(n,s-n)}_insertElements(t,e,i=!0){const s=this._cachedMeta,n=s.data,o=t+e;let a;const r=t=>{for(t.length+=e,a=t.length-1;a>=o;a--)t[a]=t[a-e]};for(r(n),a=t;a<o;++a)n[a]=new this.dataElementType;this._parsing&&r(s._parsed),this.parse(t,e),i&&this.updateElements(n,t,e,"reset")}updateElements(t,e,i,s){}_removeElements(t,e){const i=this._cachedMeta;if(this._parsing){const s=i._parsed.splice(t,e);i._stacked&&Ws(i,s)}i.data.splice(t,e)}_sync(t){if(this._parsing)this._syncList.push(t);else{const[e,i,s]=t;this[e](i,s)}this.chart._dataChanges.push([this.index,...t])}_onDataPush(){const t=arguments.length;this._sync(["_insertElements",this.getDataset().data.length-t,t])}_onDataPop(){this._sync(["_removeElements",this._cachedMeta.data.length-1,1])}_onDataShift(){this._sync(["_removeElements",0,1])}_onDataSplice(t,e){e&&this._sync(["_removeElements",t,e]);const i=arguments.length-2;i&&this._sync(["_insertElements",t,i])}_onDataUnshift(){this._sync(["_insertElements",0,arguments.length])}}class $s{static defaults={};static defaultRoutes=void 0;x;y;active=!1;options;$animations;tooltipPosition(t){const{x:e,y:i}=this.getProps(["x","y"],t);return{x:e,y:i}}hasValue(){return N(this.x)&&N(this.y)}getProps(t,e){const i=this.$animations;if(!e||!i)return this;const s={};return t.forEach((t=>{s[t]=i[t]&&i[t].active()?i[t]._to:this[t]})),s}}function Ys(t,e){const i=t.options.ticks,n=function(t){const e=t.options.offset,i=t._tickSize(),s=t._length/i+(e?0:1),n=t._maxLength/i;return Math.floor(Math.min(s,n))}(t),o=Math.min(i.maxTicksLimit||n,n),a=i.major.enabled?function(t){const e=[];let i,s;for(i=0,s=t.length;i<s;i++)t[i].major&&e.push(i);return e}(e):[],r=a.length,l=a[0],h=a[r-1],c=[];if(r>o)return function(t,e,i,s){let n,o=0,a=i[0];for(s=Math.ceil(s),n=0;n<t.length;n++)n===a&&(e.push(t[n]),o++,a=i[o*s])}(e,c,a,r/o),c;const d=function(t,e,i){const s=function(t){const e=t.length;let i,s;if(e<2)return!1;for(s=t[0],i=1;i<e;++i)if(t[i]-t[i-1]!==s)return!1;return s}(t),n=e.length/i;if(!s)return Math.max(n,1);const o=W(s);for(let t=0,e=o.length-1;t<e;t++){const e=o[t];if(e>n)return e}return Math.max(n,1)}(a,e,o);if(r>0){let t,i;const n=r>1?Math.round((h-l)/(r-1)):null;for(Us(e,c,d,s(n)?0:l-n,l),t=0,i=r-1;t<i;t++)Us(e,c,d,a[t],a[t+1]);return Us(e,c,d,h,s(n)?e.length:h+n),c}return Us(e,c,d),c}function Us(t,e,i,s,n){const o=l(s,0),a=Math.min(l(n,t.length),t.length);let r,h,c,d=0;for(i=Math.ceil(i),n&&(r=n-s,i=r/Math.floor(r/i)),c=o;c<0;)d++,c=Math.round(o+d*i);for(h=Math.max(o,0);h<a;h++)h===c&&(e.push(t[h]),d++,c=Math.round(o+d*i))}const Xs=(t,e,i)=>"top"===e||"left"===e?t[e]+i:t[e]-i,qs=(t,e)=>Math.min(e||t,t);function Ks(t,e){const i=[],s=t.length/e,n=t.length;let o=0;for(;o<n;o+=s)i.push(t[Math.floor(o)]);return i}function Gs(t,e,i){const s=t.ticks.length,n=Math.min(e,s-1),o=t._startPixel,a=t._endPixel,r=1e-6;let l,h=t.getPixelForTick(n);if(!(i&&(l=1===s?Math.max(h-o,a-h):0===e?(t.getPixelForTick(1)-h)/2:(h-t.getPixelForTick(n-1))/2,h+=n<e?l:-l,h<o-r||h>a+r)))return h}function Js(t){return t.drawTicks?t.tickLength:0}function Zs(t,e){if(!t.display)return 0;const i=Si(t.font,e),s=ki(t.padding);return(n(t.text)?t.text.length:1)*i.lineHeight+s.height}function Qs(t,e,i){let s=ut(t);return(i&&"right"!==e||!i&&"right"===e)&&(s=(t=>"left"===t?"right":"right"===t?"left":t)(s)),s}class tn extends $s{constructor(t){super(),this.id=t.id,this.type=t.type,this.options=void 0,this.ctx=t.ctx,this.chart=t.chart,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.width=void 0,this.height=void 0,this._margins={left:0,right:0,top:0,bottom:0},this.maxWidth=void 0,this.maxHeight=void 0,this.paddingTop=void 0,this.paddingBottom=void 0,this.paddingLeft=void 0,this.paddingRight=void 0,this.axis=void 0,this.labelRotation=void 0,this.min=void 0,this.max=void 0,this._range=void 0,this.ticks=[],this._gridLineItems=null,this._labelItems=null,this._labelSizes=null,this._length=0,this._maxLength=0,this._longestTextCache={},this._startPixel=void 0,this._endPixel=void 0,this._reversePixels=!1,this._userMax=void 0,this._userMin=void 0,this._suggestedMax=void 0,this._suggestedMin=void 0,this._ticksLength=0,this._borderValue=0,this._cache={},this._dataLimitsCached=!1,this.$context=void 0}init(t){this.options=t.setContext(this.getContext()),this.axis=t.axis,this._userMin=this.parse(t.min),this._userMax=this.parse(t.max),this._suggestedMin=this.parse(t.suggestedMin),this._suggestedMax=this.parse(t.suggestedMax)}parse(t,e){return t}getUserBounds(){let{_userMin:t,_userMax:e,_suggestedMin:i,_suggestedMax:s}=this;return t=r(t,Number.POSITIVE_INFINITY),e=r(e,Number.NEGATIVE_INFINITY),i=r(i,Number.POSITIVE_INFINITY),s=r(s,Number.NEGATIVE_INFINITY),{min:r(t,i),max:r(e,s),minDefined:a(t),maxDefined:a(e)}}getMinMax(t){let e,{min:i,max:s,minDefined:n,maxDefined:o}=this.getUserBounds();if(n&&o)return{min:i,max:s};const a=this.getMatchingVisibleMetas();for(let r=0,l=a.length;r<l;++r)e=a[r].controller.getMinMax(this,t),n||(i=Math.min(i,e.min)),o||(s=Math.max(s,e.max));return i=o&&i>s?s:i,s=n&&i>s?i:s,{min:r(i,r(s,i)),max:r(s,r(i,s))}}getPadding(){return{left:this.paddingLeft||0,top:this.paddingTop||0,right:this.paddingRight||0,bottom:this.paddingBottom||0}}getTicks(){return this.ticks}getLabels(){const t=this.chart.data;return this.options.labels||(this.isHorizontal()?t.xLabels:t.yLabels)||t.labels||[]}getLabelItems(t=this.chart.chartArea){return this._labelItems||(this._labelItems=this._computeLabelItems(t))}beforeLayout(){this._cache={},this._dataLimitsCached=!1}beforeUpdate(){d(this.options.beforeUpdate,[this])}update(t,e,i){const{beginAtZero:s,grace:n,ticks:o}=this.options,a=o.sampleSize;this.beforeUpdate(),this.maxWidth=t,this.maxHeight=e,this._margins=i=Object.assign({left:0,right:0,top:0,bottom:0},i),this.ticks=null,this._labelSizes=null,this._gridLineItems=null,this._labelItems=null,this.beforeSetDimensions(),this.setDimensions(),this.afterSetDimensions(),this._maxLength=this.isHorizontal()?this.width+i.left+i.right:this.height+i.top+i.bottom,this._dataLimitsCached||(this.beforeDataLimits(),this.determineDataLimits(),this.afterDataLimits(),this._range=Di(this,n,s),this._dataLimitsCached=!0),this.beforeBuildTicks(),this.ticks=this.buildTicks()||[],this.afterBuildTicks();const r=a<this.ticks.length;this._convertTicksToLabels(r?Ks(this.ticks,a):this.ticks),this.configure(),this.beforeCalculateLabelRotation(),this.calculateLabelRotation(),this.afterCalculateLabelRotation(),o.display&&(o.autoSkip||"auto"===o.source)&&(this.ticks=Ys(this,this.ticks),this._labelSizes=null,this.afterAutoSkip()),r&&this._convertTicksToLabels(this.ticks),this.beforeFit(),this.fit(),this.afterFit(),this.afterUpdate()}configure(){let t,e,i=this.options.reverse;this.isHorizontal()?(t=this.left,e=this.right):(t=this.top,e=this.bottom,i=!i),this._startPixel=t,this._endPixel=e,this._reversePixels=i,this._length=e-t,this._alignToPixels=this.options.alignToPixels}afterUpdate(){d(this.options.afterUpdate,[this])}beforeSetDimensions(){d(this.options.beforeSetDimensions,[this])}setDimensions(){this.isHorizontal()?(this.width=this.maxWidth,this.left=0,this.right=this.width):(this.height=this.maxHeight,this.top=0,this.bottom=this.height),this.paddingLeft=0,this.paddingTop=0,this.paddingRight=0,this.paddingBottom=0}afterSetDimensions(){d(this.options.afterSetDimensions,[this])}_callHooks(t){this.chart.notifyPlugins(t,this.getContext()),d(this.options[t],[this])}beforeDataLimits(){this._callHooks("beforeDataLimits")}determineDataLimits(){}afterDataLimits(){this._callHooks("afterDataLimits")}beforeBuildTicks(){this._callHooks("beforeBuildTicks")}buildTicks(){return[]}afterBuildTicks(){this._callHooks("afterBuildTicks")}beforeTickToLabelConversion(){d(this.options.beforeTickToLabelConversion,[this])}generateTickLabels(t){const e=this.options.ticks;let i,s,n;for(i=0,s=t.length;i<s;i++)n=t[i],n.label=d(e.callback,[n.value,i,t],this)}afterTickToLabelConversion(){d(this.options.afterTickToLabelConversion,[this])}beforeCalculateLabelRotation(){d(this.options.beforeCalculateLabelRotation,[this])}calculateLabelRotation(){const t=this.options,e=t.ticks,i=qs(this.ticks.length,t.ticks.maxTicksLimit),s=e.minRotation||0,n=e.maxRotation;let o,a,r,l=s;if(!this._isVisible()||!e.display||s>=n||i<=1||!this.isHorizontal())return void(this.labelRotation=s);const h=this._getLabelSizes(),c=h.widest.width,d=h.highest.height,u=Z(this.chart.width-c,0,this.maxWidth);o=t.offset?this.maxWidth/i:u/(i-1),c+6>o&&(o=u/(i-(t.offset?.5:1)),a=this.maxHeight-Js(t.grid)-e.padding-Zs(t.title,this.chart.options.font),r=Math.sqrt(c*c+d*d),l=Y(Math.min(Math.asin(Z((h.highest.height+6)/o,-1,1)),Math.asin(Z(a/r,-1,1))-Math.asin(Z(d/r,-1,1)))),l=Math.max(s,Math.min(n,l))),this.labelRotation=l}afterCalculateLabelRotation(){d(this.options.afterCalculateLabelRotation,[this])}afterAutoSkip(){}beforeFit(){d(this.options.beforeFit,[this])}fit(){const t={width:0,height:0},{chart:e,options:{ticks:i,title:s,grid:n}}=this,o=this._isVisible(),a=this.isHorizontal();if(o){const o=Zs(s,e.options.font);if(a?(t.width=this.maxWidth,t.height=Js(n)+o):(t.height=this.maxHeight,t.width=Js(n)+o),i.display&&this.ticks.length){const{first:e,last:s,widest:n,highest:o}=this._getLabelSizes(),r=2*i.padding,l=$(this.labelRotation),h=Math.cos(l),c=Math.sin(l);if(a){const e=i.mirror?0:c*n.width+h*o.height;t.height=Math.min(this.maxHeight,t.height+e+r)}else{const e=i.mirror?0:h*n.width+c*o.height;t.width=Math.min(this.maxWidth,t.width+e+r)}this._calculatePadding(e,s,c,h)}}this._handleMargins(),a?(this.width=this._length=e.width-this._margins.left-this._margins.right,this.height=t.height):(this.width=t.width,this.height=this._length=e.height-this._margins.top-this._margins.bottom)}_calculatePadding(t,e,i,s){const{ticks:{align:n,padding:o},position:a}=this.options,r=0!==this.labelRotation,l="top"!==a&&"x"===this.axis;if(this.isHorizontal()){const a=this.getPixelForTick(0)-this.left,h=this.right-this.getPixelForTick(this.ticks.length-1);let c=0,d=0;r?l?(c=s*t.width,d=i*e.height):(c=i*t.height,d=s*e.width):"start"===n?d=e.width:"end"===n?c=t.width:"inner"!==n&&(c=t.width/2,d=e.width/2),this.paddingLeft=Math.max((c-a+o)*this.width/(this.width-a),0),this.paddingRight=Math.max((d-h+o)*this.width/(this.width-h),0)}else{let i=e.height/2,s=t.height/2;"start"===n?(i=0,s=t.height):"end"===n&&(i=e.height,s=0),this.paddingTop=i+o,this.paddingBottom=s+o}}_handleMargins(){this._margins&&(this._margins.left=Math.max(this.paddingLeft,this._margins.left),this._margins.top=Math.max(this.paddingTop,this._margins.top),this._margins.right=Math.max(this.paddingRight,this._margins.right),this._margins.bottom=Math.max(this.paddingBottom,this._margins.bottom))}afterFit(){d(this.options.afterFit,[this])}isHorizontal(){const{axis:t,position:e}=this.options;return"top"===e||"bottom"===e||"x"===t}isFullSize(){return this.options.fullSize}_convertTicksToLabels(t){let e,i;for(this.beforeTickToLabelConversion(),this.generateTickLabels(t),e=0,i=t.length;e<i;e++)s(t[e].label)&&(t.splice(e,1),i--,e--);this.afterTickToLabelConversion()}_getLabelSizes(){let t=this._labelSizes;if(!t){const e=this.options.ticks.sampleSize;let i=this.ticks;e<i.length&&(i=Ks(i,e)),this._labelSizes=t=this._computeLabelSizes(i,i.length,this.options.ticks.maxTicksLimit)}return t}_computeLabelSizes(t,e,i){const{ctx:o,_longestTextCache:a}=this,r=[],l=[],h=Math.floor(e/qs(e,i));let c,d,f,g,p,m,x,b,_,y,v,M=0,w=0;for(c=0;c<e;c+=h){if(g=t[c].label,p=this._resolveTickFontOptions(c),o.font=m=p.string,x=a[m]=a[m]||{data:{},gc:[]},b=p.lineHeight,_=y=0,s(g)||n(g)){if(n(g))for(d=0,f=g.length;d<f;++d)v=g[d],s(v)||n(v)||(_=Ce(o,x.data,x.gc,_,v),y+=b)}else _=Ce(o,x.data,x.gc,_,g),y=b;r.push(_),l.push(y),M=Math.max(_,M),w=Math.max(y,w)}!function(t,e){u(t,(t=>{const i=t.gc,s=i.length/2;let n;if(s>e){for(n=0;n<s;++n)delete t.data[i[n]];i.splice(0,s)}}))}(a,e);const k=r.indexOf(M),S=l.indexOf(w),P=t=>({width:r[t]||0,height:l[t]||0});return{first:P(0),last:P(e-1),widest:P(k),highest:P(S),widths:r,heights:l}}getLabelForValue(t){return t}getPixelForValue(t,e){return NaN}getValueForPixel(t){}getPixelForTick(t){const e=this.ticks;return t<0||t>e.length-1?null:this.getPixelForValue(e[t].value)}getPixelForDecimal(t){this._reversePixels&&(t=1-t);const e=this._startPixel+t*this._length;return Q(this._alignToPixels?Ae(this.chart,e,0):e)}getDecimalForPixel(t){const e=(t-this._startPixel)/this._length;return this._reversePixels?1-e:e}getBasePixel(){return this.getPixelForValue(this.getBaseValue())}getBaseValue(){const{min:t,max:e}=this;return t<0&&e<0?e:t>0&&e>0?t:0}getContext(t){const e=this.ticks||[];if(t>=0&&t<e.length){const i=e[t];return i.$context||(i.$context=function(t,e,i){return Ci(t,{tick:i,index:e,type:"tick"})}(this.getContext(),t,i))}return this.$context||(this.$context=Ci(this.chart.getContext(),{scale:this,type:"scale"}))}_tickSize(){const t=this.options.ticks,e=$(this.labelRotation),i=Math.abs(Math.cos(e)),s=Math.abs(Math.sin(e)),n=this._getLabelSizes(),o=t.autoSkipPadding||0,a=n?n.widest.width+o:0,r=n?n.highest.height+o:0;return this.isHorizontal()?r*i>a*s?a/i:r/s:r*s<a*i?r/i:a/s}_isVisible(){const t=this.options.display;return"auto"!==t?!!t:this.getMatchingVisibleMetas().length>0}_computeGridLineItems(t){const e=this.axis,i=this.chart,s=this.options,{grid:n,position:a,border:r}=s,h=n.offset,c=this.isHorizontal(),d=this.ticks.length+(h?1:0),u=Js(n),f=[],g=r.setContext(this.getContext()),p=g.display?g.width:0,m=p/2,x=function(t){return Ae(i,t,p)};let b,_,y,v,M,w,k,S,P,D,C,O;if("top"===a)b=x(this.bottom),w=this.bottom-u,S=b-m,D=x(t.top)+m,O=t.bottom;else if("bottom"===a)b=x(this.top),D=t.top,O=x(t.bottom)-m,w=b+m,S=this.top+u;else if("left"===a)b=x(this.right),M=this.right-u,k=b-m,P=x(t.left)+m,C=t.right;else if("right"===a)b=x(this.left),P=t.left,C=x(t.right)-m,M=b+m,k=this.left+u;else if("x"===e){if("center"===a)b=x((t.top+t.bottom)/2+.5);else if(o(a)){const t=Object.keys(a)[0],e=a[t];b=x(this.chart.scales[t].getPixelForValue(e))}D=t.top,O=t.bottom,w=b+m,S=w+u}else if("y"===e){if("center"===a)b=x((t.left+t.right)/2);else if(o(a)){const t=Object.keys(a)[0],e=a[t];b=x(this.chart.scales[t].getPixelForValue(e))}M=b-m,k=M-u,P=t.left,C=t.right}const A=l(s.ticks.maxTicksLimit,d),T=Math.max(1,Math.ceil(d/A));for(_=0;_<d;_+=T){const t=this.getContext(_),e=n.setContext(t),s=r.setContext(t),o=e.lineWidth,a=e.color,l=s.dash||[],d=s.dashOffset,u=e.tickWidth,g=e.tickColor,p=e.tickBorderDash||[],m=e.tickBorderDashOffset;y=Gs(this,_,h),void 0!==y&&(v=Ae(i,y,o),c?M=k=P=C=v:w=S=D=O=v,f.push({tx1:M,ty1:w,tx2:k,ty2:S,x1:P,y1:D,x2:C,y2:O,width:o,color:a,borderDash:l,borderDashOffset:d,tickWidth:u,tickColor:g,tickBorderDash:p,tickBorderDashOffset:m}))}return this._ticksLength=d,this._borderValue=b,f}_computeLabelItems(t){const e=this.axis,i=this.options,{position:s,ticks:a}=i,r=this.isHorizontal(),l=this.ticks,{align:h,crossAlign:c,padding:d,mirror:u}=a,f=Js(i.grid),g=f+d,p=u?-d:g,m=-$(this.labelRotation),x=[];let b,_,y,v,M,w,k,S,P,D,C,O,A="middle";if("top"===s)w=this.bottom-p,k=this._getXAxisLabelAlignment();else if("bottom"===s)w=this.top+p,k=this._getXAxisLabelAlignment();else if("left"===s){const t=this._getYAxisLabelAlignment(f);k=t.textAlign,M=t.x}else if("right"===s){const t=this._getYAxisLabelAlignment(f);k=t.textAlign,M=t.x}else if("x"===e){if("center"===s)w=(t.top+t.bottom)/2+g;else if(o(s)){const t=Object.keys(s)[0],e=s[t];w=this.chart.scales[t].getPixelForValue(e)+g}k=this._getXAxisLabelAlignment()}else if("y"===e){if("center"===s)M=(t.left+t.right)/2-g;else if(o(s)){const t=Object.keys(s)[0],e=s[t];M=this.chart.scales[t].getPixelForValue(e)}k=this._getYAxisLabelAlignment(f).textAlign}"y"===e&&("start"===h?A="top":"end"===h&&(A="bottom"));const T=this._getLabelSizes();for(b=0,_=l.length;b<_;++b){y=l[b],v=y.label;const t=a.setContext(this.getContext(b));S=this.getPixelForTick(b)+a.labelOffset,P=this._resolveTickFontOptions(b),D=P.lineHeight,C=n(v)?v.length:1;const e=C/2,i=t.color,o=t.textStrokeColor,h=t.textStrokeWidth;let d,f=k;if(r?(M=S,"inner"===k&&(f=b===_-1?this.options.reverse?"left":"right":0===b?this.options.reverse?"right":"left":"center"),O="top"===s?"near"===c||0!==m?-C*D+D/2:"center"===c?-T.highest.height/2-e*D+D:-T.highest.height+D/2:"near"===c||0!==m?D/2:"center"===c?T.highest.height/2-e*D:T.highest.height-C*D,u&&(O*=-1),0===m||t.showLabelBackdrop||(M+=D/2*Math.sin(m))):(w=S,O=(1-C)*D/2),t.showLabelBackdrop){const e=ki(t.backdropPadding),i=T.heights[b],s=T.widths[b];let n=O-e.top,o=0-e.left;switch(A){case"middle":n-=i/2;break;case"bottom":n-=i}switch(k){case"center":o-=s/2;break;case"right":o-=s;break;case"inner":b===_-1?o-=s:b>0&&(o-=s/2)}d={left:o,top:n,width:s+e.width,height:i+e.height,color:t.backdropColor}}x.push({label:v,font:P,textOffset:O,options:{rotation:m,color:i,strokeColor:o,strokeWidth:h,textAlign:f,textBaseline:A,translation:[M,w],backdrop:d}})}return x}_getXAxisLabelAlignment(){const{position:t,ticks:e}=this.options;if(-$(this.labelRotation))return"top"===t?"left":"right";let i="center";return"start"===e.align?i="left":"end"===e.align?i="right":"inner"===e.align&&(i="inner"),i}_getYAxisLabelAlignment(t){const{position:e,ticks:{crossAlign:i,mirror:s,padding:n}}=this.options,o=t+n,a=this._getLabelSizes().widest.width;let r,l;return"left"===e?s?(l=this.right+n,"near"===i?r="left":"center"===i?(r="center",l+=a/2):(r="right",l+=a)):(l=this.right-o,"near"===i?r="right":"center"===i?(r="center",l-=a/2):(r="left",l=this.left)):"right"===e?s?(l=this.left+n,"near"===i?r="right":"center"===i?(r="center",l-=a/2):(r="left",l-=a)):(l=this.left+o,"near"===i?r="left":"center"===i?(r="center",l+=a/2):(r="right",l=this.right)):r="right",{textAlign:r,x:l}}_computeLabelArea(){if(this.options.ticks.mirror)return;const t=this.chart,e=this.options.position;return"left"===e||"right"===e?{top:0,left:this.left,bottom:t.height,right:this.right}:"top"===e||"bottom"===e?{top:this.top,left:0,bottom:this.bottom,right:t.width}:void 0}drawBackground(){const{ctx:t,options:{backgroundColor:e},left:i,top:s,width:n,height:o}=this;e&&(t.save(),t.fillStyle=e,t.fillRect(i,s,n,o),t.restore())}getLineWidthForValue(t){const e=this.options.grid;if(!this._isVisible()||!e.display)return 0;const i=this.ticks.findIndex((e=>e.value===t));if(i>=0){return e.setContext(this.getContext(i)).lineWidth}return 0}drawGrid(t){const e=this.options.grid,i=this.ctx,s=this._gridLineItems||(this._gridLineItems=this._computeGridLineItems(t));let n,o;const a=(t,e,s)=>{s.width&&s.color&&(i.save(),i.lineWidth=s.width,i.strokeStyle=s.color,i.setLineDash(s.borderDash||[]),i.lineDashOffset=s.borderDashOffset,i.beginPath(),i.moveTo(t.x,t.y),i.lineTo(e.x,e.y),i.stroke(),i.restore())};if(e.display)for(n=0,o=s.length;n<o;++n){const t=s[n];e.drawOnChartArea&&a({x:t.x1,y:t.y1},{x:t.x2,y:t.y2},t),e.drawTicks&&a({x:t.tx1,y:t.ty1},{x:t.tx2,y:t.ty2},{color:t.tickColor,width:t.tickWidth,borderDash:t.tickBorderDash,borderDashOffset:t.tickBorderDashOffset})}}drawBorder(){const{chart:t,ctx:e,options:{border:i,grid:s}}=this,n=i.setContext(this.getContext()),o=i.display?n.width:0;if(!o)return;const a=s.setContext(this.getContext(0)).lineWidth,r=this._borderValue;let l,h,c,d;this.isHorizontal()?(l=Ae(t,this.left,o)-o/2,h=Ae(t,this.right,a)+a/2,c=d=r):(c=Ae(t,this.top,o)-o/2,d=Ae(t,this.bottom,a)+a/2,l=h=r),e.save(),e.lineWidth=n.width,e.strokeStyle=n.color,e.beginPath(),e.moveTo(l,c),e.lineTo(h,d),e.stroke(),e.restore()}drawLabels(t){if(!this.options.ticks.display)return;const e=this.ctx,i=this._computeLabelArea();i&&Ie(e,i);const s=this.getLabelItems(t);for(const t of s){const i=t.options,s=t.font;Ne(e,t.label,0,t.textOffset,s,i)}i&&ze(e)}drawTitle(){const{ctx:t,options:{position:e,title:i,reverse:s}}=this;if(!i.display)return;const a=Si(i.font),r=ki(i.padding),l=i.align;let h=a.lineHeight/2;"bottom"===e||"center"===e||o(e)?(h+=r.bottom,n(i.text)&&(h+=a.lineHeight*(i.text.length-1))):h+=r.top;const{titleX:c,titleY:d,maxWidth:u,rotation:f}=function(t,e,i,s){const{top:n,left:a,bottom:r,right:l,chart:h}=t,{chartArea:c,scales:d}=h;let u,f,g,p=0;const m=r-n,x=l-a;if(t.isHorizontal()){if(f=ft(s,a,l),o(i)){const t=Object.keys(i)[0],s=i[t];g=d[t].getPixelForValue(s)+m-e}else g="center"===i?(c.bottom+c.top)/2+m-e:Xs(t,i,e);u=l-a}else{if(o(i)){const t=Object.keys(i)[0],s=i[t];f=d[t].getPixelForValue(s)-x+e}else f="center"===i?(c.left+c.right)/2-x+e:Xs(t,i,e);g=ft(s,r,n),p="left"===i?-E:E}return{titleX:f,titleY:g,maxWidth:u,rotation:p}}(this,h,e,l);Ne(t,i.text,0,0,a,{color:i.color,maxWidth:u,rotation:f,textAlign:Qs(l,e,s),textBaseline:"middle",translation:[c,d]})}draw(t){this._isVisible()&&(this.drawBackground(),this.drawGrid(t),this.drawBorder(),this.drawTitle(),this.drawLabels(t))}_layers(){const t=this.options,e=t.ticks&&t.ticks.z||0,i=l(t.grid&&t.grid.z,-1),s=l(t.border&&t.border.z,0);return this._isVisible()&&this.draw===tn.prototype.draw?[{z:i,draw:t=>{this.drawBackground(),this.drawGrid(t),this.drawTitle()}},{z:s,draw:()=>{this.drawBorder()}},{z:e,draw:t=>{this.drawLabels(t)}}]:[{z:e,draw:t=>{this.draw(t)}}]}getMatchingVisibleMetas(t){const e=this.chart.getSortedVisibleDatasetMetas(),i=this.axis+"AxisID",s=[];let n,o;for(n=0,o=e.length;n<o;++n){const o=e[n];o[i]!==this.id||t&&o.type!==t||s.push(o)}return s}_resolveTickFontOptions(t){return Si(this.options.ticks.setContext(this.getContext(t)).font)}_maxDigits(){const t=this._resolveTickFontOptions(0).lineHeight;return(this.isHorizontal()?this.width:this.height)/t}}class en{constructor(t,e,i){this.type=t,this.scope=e,this.override=i,this.items=Object.create(null)}isForType(t){return Object.prototype.isPrototypeOf.call(this.type.prototype,t.prototype)}register(t){const e=Object.getPrototypeOf(t);let i;(function(t){return"id"in t&&"defaults"in t})(e)&&(i=this.register(e));const s=this.items,n=t.id,o=this.scope+"."+n;if(!n)throw new Error("class does not have id: "+t);return n in s||(s[n]=t,function(t,e,i){const s=x(Object.create(null),[i?ue.get(i):{},ue.get(e),t.defaults]);ue.set(e,s),t.defaultRoutes&&function(t,e){Object.keys(e).forEach((i=>{const s=i.split("."),n=s.pop(),o=[t].concat(s).join("."),a=e[i].split("."),r=a.pop(),l=a.join(".");ue.route(o,n,l,r)}))}(e,t.defaultRoutes);t.descriptors&&ue.describe(e,t.descriptors)}(t,o,i),this.override&&ue.override(t.id,t.overrides)),o}get(t){return this.items[t]}unregister(t){const e=this.items,i=t.id,s=this.scope;i in e&&delete e[i],s&&i in ue[s]&&(delete ue[s][i],this.override&&delete re[i])}}class sn{constructor(){this.controllers=new en(js,"datasets",!0),this.elements=new en($s,"elements"),this.plugins=new en(Object,"plugins"),this.scales=new en(tn,"scales"),this._typedRegistries=[this.controllers,this.scales,this.elements]}add(...t){this._each("register",t)}remove(...t){this._each("unregister",t)}addControllers(...t){this._each("register",t,this.controllers)}addElements(...t){this._each("register",t,this.elements)}addPlugins(...t){this._each("register",t,this.plugins)}addScales(...t){this._each("register",t,this.scales)}getController(t){return this._get(t,this.controllers,"controller")}getElement(t){return this._get(t,this.elements,"element")}getPlugin(t){return this._get(t,this.plugins,"plugin")}getScale(t){return this._get(t,this.scales,"scale")}removeControllers(...t){this._each("unregister",t,this.controllers)}removeElements(...t){this._each("unregister",t,this.elements)}removePlugins(...t){this._each("unregister",t,this.plugins)}removeScales(...t){this._each("unregister",t,this.scales)}_each(t,e,i){[...e].forEach((e=>{const s=i||this._getRegistryForType(e);i||s.isForType(e)||s===this.plugins&&e.id?this._exec(t,s,e):u(e,(e=>{const s=i||this._getRegistryForType(e);this._exec(t,s,e)}))}))}_exec(t,e,i){const s=w(t);d(i["before"+s],[],i),e[t](i),d(i["after"+s],[],i)}_getRegistryForType(t){for(let e=0;e<this._typedRegistries.length;e++){const i=this._typedRegistries[e];if(i.isForType(t))return i}return this.plugins}_get(t,e,i){const s=e.get(t);if(void 0===s)throw new Error('"'+t+'" is not a registered '+i+".");return s}}var nn=new sn;class on{constructor(){this._init=void 0}notify(t,e,i,s){if("beforeInit"===e&&(this._init=this._createDescriptors(t,!0),this._notify(this._init,t,"install")),void 0===this._init)return;const n=s?this._descriptors(t).filter(s):this._descriptors(t),o=this._notify(n,t,e,i);return"afterDestroy"===e&&(this._notify(n,t,"stop"),this._notify(this._init,t,"uninstall"),this._init=void 0),o}_notify(t,e,i,s){s=s||{};for(const n of t){const t=n.plugin;if(!1===d(t[i],[e,s,n.options],t)&&s.cancelable)return!1}return!0}invalidate(){s(this._cache)||(this._oldCache=this._cache,this._cache=void 0)}_descriptors(t){if(this._cache)return this._cache;const e=this._cache=this._createDescriptors(t);return this._notifyStateChanges(t),e}_createDescriptors(t,e){const i=t&&t.config,s=l(i.options&&i.options.plugins,{}),n=function(t){const e={},i=[],s=Object.keys(nn.plugins.items);for(let t=0;t<s.length;t++)i.push(nn.getPlugin(s[t]));const n=t.plugins||[];for(let t=0;t<n.length;t++){const s=n[t];-1===i.indexOf(s)&&(i.push(s),e[s.id]=!0)}return{plugins:i,localIds:e}}(i);return!1!==s||e?function(t,{plugins:e,localIds:i},s,n){const o=[],a=t.getContext();for(const r of e){const e=r.id,l=an(s[e],n);null!==l&&o.push({plugin:r,options:rn(t.config,{plugin:r,local:i[e]},l,a)})}return o}(t,n,s,e):[]}_notifyStateChanges(t){const e=this._oldCache||[],i=this._cache,s=(t,e)=>t.filter((t=>!e.some((e=>t.plugin.id===e.plugin.id))));this._notify(s(e,i),t,"stop"),this._notify(s(i,e),t,"start")}}function an(t,e){return e||!1!==t?!0===t?{}:t:null}function rn(t,{plugin:e,local:i},s,n){const o=t.pluginScopeKeys(e),a=t.getOptionScopes(s,o);return i&&e.defaults&&a.push(e.defaults),t.createResolver(a,n,[""],{scriptable:!1,indexable:!1,allKeys:!0})}function ln(t,e){const i=ue.datasets[t]||{};return((e.datasets||{})[t]||{}).indexAxis||e.indexAxis||i.indexAxis||"x"}function hn(t){if("x"===t||"y"===t||"r"===t)return t}function cn(t,...e){if(hn(t))return t;for(const s of e){const e=s.axis||("top"===(i=s.position)||"bottom"===i?"x":"left"===i||"right"===i?"y":void 0)||t.length>1&&hn(t[0].toLowerCase());if(e)return e}var i;throw new Error(`Cannot determine type of '${t}' axis. Please provide 'axis' or 'position' option.`)}function dn(t,e,i){if(i[e+"AxisID"]===t)return{axis:e}}function un(t,e){const i=re[t.type]||{scales:{}},s=e.scales||{},n=ln(t.type,e),a=Object.create(null);return Object.keys(s).forEach((e=>{const r=s[e];if(!o(r))return console.error(`Invalid scale configuration for scale: ${e}`);if(r._proxy)return console.warn(`Ignoring resolver passed as options for scale: ${e}`);const l=cn(e,r,function(t,e){if(e.data&&e.data.datasets){const i=e.data.datasets.filter((e=>e.xAxisID===t||e.yAxisID===t));if(i.length)return dn(t,"x",i[0])||dn(t,"y",i[0])}return{}}(e,t),ue.scales[r.type]),h=function(t,e){return t===e?"_index_":"_value_"}(l,n),c=i.scales||{};a[e]=b(Object.create(null),[{axis:l},r,c[l],c[h]])})),t.data.datasets.forEach((i=>{const n=i.type||t.type,o=i.indexAxis||ln(n,e),r=(re[n]||{}).scales||{};Object.keys(r).forEach((t=>{const e=function(t,e){let i=t;return"_index_"===t?i=e:"_value_"===t&&(i="x"===e?"y":"x"),i}(t,o),n=i[e+"AxisID"]||e;a[n]=a[n]||Object.create(null),b(a[n],[{axis:e},s[n],r[t]])}))})),Object.keys(a).forEach((t=>{const e=a[t];b(e,[ue.scales[e.type],ue.scale])})),a}function fn(t){const e=t.options||(t.options={});e.plugins=l(e.plugins,{}),e.scales=un(t,e)}function gn(t){return(t=t||{}).datasets=t.datasets||[],t.labels=t.labels||[],t}const pn=new Map,mn=new Set;function xn(t,e){let i=pn.get(t);return i||(i=e(),pn.set(t,i),mn.add(i)),i}const bn=(t,e,i)=>{const s=M(e,i);void 0!==s&&t.add(s)};class _n{constructor(t){this._config=function(t){return(t=t||{}).data=gn(t.data),fn(t),t}(t),this._scopeCache=new Map,this._resolverCache=new Map}get platform(){return this._config.platform}get type(){return this._config.type}set type(t){this._config.type=t}get data(){return this._config.data}set data(t){this._config.data=gn(t)}get options(){return this._config.options}set options(t){this._config.options=t}get plugins(){return this._config.plugins}update(){const t=this._config;this.clearCache(),fn(t)}clearCache(){this._scopeCache.clear(),this._resolverCache.clear()}datasetScopeKeys(t){return xn(t,(()=>[[`datasets.${t}`,""]]))}datasetAnimationScopeKeys(t,e){return xn(`${t}.transition.${e}`,(()=>[[`datasets.${t}.transitions.${e}`,`transitions.${e}`],[`datasets.${t}`,""]]))}datasetElementScopeKeys(t,e){return xn(`${t}-${e}`,(()=>[[`datasets.${t}.elements.${e}`,`datasets.${t}`,`elements.${e}`,""]]))}pluginScopeKeys(t){const e=t.id;return xn(`${this.type}-plugin-${e}`,(()=>[[`plugins.${e}`,...t.additionalOptionScopes||[]]]))}_cachedScopes(t,e){const i=this._scopeCache;let s=i.get(t);return s&&!e||(s=new Map,i.set(t,s)),s}getOptionScopes(t,e,i){const{options:s,type:n}=this,o=this._cachedScopes(t,i),a=o.get(e);if(a)return a;const r=new Set;e.forEach((e=>{t&&(r.add(t),e.forEach((e=>bn(r,t,e)))),e.forEach((t=>bn(r,s,t))),e.forEach((t=>bn(r,re[n]||{},t))),e.forEach((t=>bn(r,ue,t))),e.forEach((t=>bn(r,le,t)))}));const l=Array.from(r);return 0===l.length&&l.push(Object.create(null)),mn.has(e)&&o.set(e,l),l}chartOptionScopes(){const{options:t,type:e}=this;return[t,re[e]||{},ue.datasets[e]||{},{type:e},ue,le]}resolveNamedOptions(t,e,i,s=[""]){const o={$shared:!0},{resolver:a,subPrefixes:r}=yn(this._resolverCache,t,s);let l=a;if(function(t,e){const{isScriptable:i,isIndexable:s}=Ye(t);for(const o of e){const e=i(o),a=s(o),r=(a||e)&&t[o];if(e&&(S(r)||vn(r))||a&&n(r))return!0}return!1}(a,e)){o.$shared=!1;l=$e(a,i=S(i)?i():i,this.createResolver(t,i,r))}for(const t of e)o[t]=l[t];return o}createResolver(t,e,i=[""],s){const{resolver:n}=yn(this._resolverCache,t,i);return o(e)?$e(n,e,void 0,s):n}}function yn(t,e,i){let s=t.get(e);s||(s=new Map,t.set(e,s));const n=i.join();let o=s.get(n);if(!o){o={resolver:je(e,i),subPrefixes:i.filter((t=>!t.toLowerCase().includes("hover")))},s.set(n,o)}return o}const vn=t=>o(t)&&Object.getOwnPropertyNames(t).some((e=>S(t[e])));const Mn=["top","bottom","left","right","chartArea"];function wn(t,e){return"top"===t||"bottom"===t||-1===Mn.indexOf(t)&&"x"===e}function kn(t,e){return function(i,s){return i[t]===s[t]?i[e]-s[e]:i[t]-s[t]}}function Sn(t){const e=t.chart,i=e.options.animation;e.notifyPlugins("afterRender"),d(i&&i.onComplete,[t],e)}function Pn(t){const e=t.chart,i=e.options.animation;d(i&&i.onProgress,[t],e)}function Dn(t){return fe()&&"string"==typeof t?t=document.getElementById(t):t&&t.length&&(t=t[0]),t&&t.canvas&&(t=t.canvas),t}const Cn={},On=t=>{const e=Dn(t);return Object.values(Cn).filter((t=>t.canvas===e)).pop()};function An(t,e,i){const s=Object.keys(t);for(const n of s){const s=+n;if(s>=e){const o=t[n];delete t[n],(i>0||s>e)&&(t[s+i]=o)}}}class Tn{static defaults=ue;static instances=Cn;static overrides=re;static registry=nn;static version="4.5.1";static getChart=On;static register(...t){nn.add(...t),Ln()}static unregister(...t){nn.remove(...t),Ln()}constructor(t,e){const s=this.config=new _n(e),n=Dn(t),o=On(n);if(o)throw new Error("Canvas is already in use. Chart with ID '"+o.id+"' must be destroyed before the canvas with ID '"+o.canvas.id+"' can be reused.");const a=s.createResolver(s.chartOptionScopes(),this.getContext());this.platform=new(s.platform||Ps(n)),this.platform.updateConfig(s);const r=this.platform.acquireContext(n,a.aspectRatio),l=r&&r.canvas,h=l&&l.height,c=l&&l.width;this.id=i(),this.ctx=r,this.canvas=l,this.width=c,this.height=h,this._options=a,this._aspectRatio=this.aspectRatio,this._layers=[],this._metasets=[],this._stacks=void 0,this.boxes=[],this.currentDevicePixelRatio=void 0,this.chartArea=void 0,this._active=[],this._lastEvent=void 0,this._listeners={},this._responsiveListeners=void 0,this._sortedMetasets=[],this.scales={},this._plugins=new on,this.$proxies={},this._hiddenIndices={},this.attached=!1,this._animationsDisabled=void 0,this.$context=void 0,this._doResize=dt((t=>this.update(t)),a.resizeDelay||0),this._dataChanges=[],Cn[this.id]=this,r&&l?(bt.listen(this,"complete",Sn),bt.listen(this,"progress",Pn),this._initialize(),this.attached&&this.update()):console.error("Failed to create chart: can't acquire context from the given item")}get aspectRatio(){const{options:{aspectRatio:t,maintainAspectRatio:e},width:i,height:n,_aspectRatio:o}=this;return s(t)?e&&o?o:n?i/n:null:t}get data(){return this.config.data}set data(t){this.config.data=t}get options(){return this._options}set options(t){this.config.options=t}get registry(){return nn}_initialize(){return this.notifyPlugins("beforeInit"),this.options.responsive?this.resize():ke(this,this.options.devicePixelRatio),this.bindEvents(),this.notifyPlugins("afterInit"),this}clear(){return Te(this.canvas,this.ctx),this}stop(){return bt.stop(this),this}resize(t,e){bt.running(this)?this._resizeBeforeDraw={width:t,height:e}:this._resize(t,e)}_resize(t,e){const i=this.options,s=this.canvas,n=i.maintainAspectRatio&&this.aspectRatio,o=this.platform.getMaximumSize(s,t,e,n),a=i.devicePixelRatio||this.platform.getDevicePixelRatio(),r=this.width?"resize":"attach";this.width=o.width,this.height=o.height,this._aspectRatio=this.aspectRatio,ke(this,a,!0)&&(this.notifyPlugins("resize",{size:o}),d(i.onResize,[this,o],this),this.attached&&this._doResize(r)&&this.render())}ensureScalesHaveIDs(){u(this.options.scales||{},((t,e)=>{t.id=e}))}buildOrUpdateScales(){const t=this.options,e=t.scales,i=this.scales,s=Object.keys(i).reduce(((t,e)=>(t[e]=!1,t)),{});let n=[];e&&(n=n.concat(Object.keys(e).map((t=>{const i=e[t],s=cn(t,i),n="r"===s,o="x"===s;return{options:i,dposition:n?"chartArea":o?"bottom":"left",dtype:n?"radialLinear":o?"category":"linear"}})))),u(n,(e=>{const n=e.options,o=n.id,a=cn(o,n),r=l(n.type,e.dtype);void 0!==n.position&&wn(n.position,a)===wn(e.dposition)||(n.position=e.dposition),s[o]=!0;let h=null;if(o in i&&i[o].type===r)h=i[o];else{h=new(nn.getScale(r))({id:o,type:r,ctx:this.ctx,chart:this}),i[h.id]=h}h.init(n,t)})),u(s,((t,e)=>{t||delete i[e]})),u(i,(t=>{ls.configure(this,t,t.options),ls.addBox(this,t)}))}_updateMetasets(){const t=this._metasets,e=this.data.datasets.length,i=t.length;if(t.sort(((t,e)=>t.index-e.index)),i>e){for(let t=e;t<i;++t)this._destroyDatasetMeta(t);t.splice(e,i-e)}this._sortedMetasets=t.slice(0).sort(kn("order","index"))}_removeUnreferencedMetasets(){const{_metasets:t,data:{datasets:e}}=this;t.length>e.length&&delete this._stacks,t.forEach(((t,i)=>{0===e.filter((e=>e===t._dataset)).length&&this._destroyDatasetMeta(i)}))}buildOrUpdateControllers(){const t=[],e=this.data.datasets;let i,s;for(this._removeUnreferencedMetasets(),i=0,s=e.length;i<s;i++){const s=e[i];let n=this.getDatasetMeta(i);const o=s.type||this.config.type;if(n.type&&n.type!==o&&(this._destroyDatasetMeta(i),n=this.getDatasetMeta(i)),n.type=o,n.indexAxis=s.indexAxis||ln(o,this.options),n.order=s.order||0,n.index=i,n.label=""+s.label,n.visible=this.isDatasetVisible(i),n.controller)n.controller.updateIndex(i),n.controller.linkScales();else{const e=nn.getController(o),{datasetElementType:s,dataElementType:a}=ue.datasets[o];Object.assign(e,{dataElementType:nn.getElement(a),datasetElementType:s&&nn.getElement(s)}),n.controller=new e(this,i),t.push(n.controller)}}return this._updateMetasets(),t}_resetElements(){u(this.data.datasets,((t,e)=>{this.getDatasetMeta(e).controller.reset()}),this)}reset(){this._resetElements(),this.notifyPlugins("reset")}update(t){const e=this.config;e.update();const i=this._options=e.createResolver(e.chartOptionScopes(),this.getContext()),s=this._animationsDisabled=!i.animation;if(this._updateScales(),this._checkEventBindings(),this._updateHiddenIndices(),this._plugins.invalidate(),!1===this.notifyPlugins("beforeUpdate",{mode:t,cancelable:!0}))return;const n=this.buildOrUpdateControllers();this.notifyPlugins("beforeElementsUpdate");let o=0;for(let t=0,e=this.data.datasets.length;t<e;t++){const{controller:e}=this.getDatasetMeta(t),i=!s&&-1===n.indexOf(e);e.buildOrUpdateElements(i),o=Math.max(+e.getMaxOverflow(),o)}o=this._minPadding=i.layout.autoPadding?o:0,this._updateLayout(o),s||u(n,(t=>{t.reset()})),this._updateDatasets(t),this.notifyPlugins("afterUpdate",{mode:t}),this._layers.sort(kn("z","_idx"));const{_active:a,_lastEvent:r}=this;r?this._eventHandler(r,!0):a.length&&this._updateHoverStyles(a,a,!0),this.render()}_updateScales(){u(this.scales,(t=>{ls.removeBox(this,t)})),this.ensureScalesHaveIDs(),this.buildOrUpdateScales()}_checkEventBindings(){const t=this.options,e=new Set(Object.keys(this._listeners)),i=new Set(t.events);P(e,i)&&!!this._responsiveListeners===t.responsive||(this.unbindEvents(),this.bindEvents())}_updateHiddenIndices(){const{_hiddenIndices:t}=this,e=this._getUniformDataChanges()||[];for(const{method:i,start:s,count:n}of e){An(t,s,"_removeElements"===i?-n:n)}}_getUniformDataChanges(){const t=this._dataChanges;if(!t||!t.length)return;this._dataChanges=[];const e=this.data.datasets.length,i=e=>new Set(t.filter((t=>t[0]===e)).map(((t,e)=>e+","+t.splice(1).join(",")))),s=i(0);for(let t=1;t<e;t++)if(!P(s,i(t)))return;return Array.from(s).map((t=>t.split(","))).map((t=>({method:t[1],start:+t[2],count:+t[3]})))}_updateLayout(t){if(!1===this.notifyPlugins("beforeLayout",{cancelable:!0}))return;ls.update(this,this.width,this.height,t);const e=this.chartArea,i=e.width<=0||e.height<=0;this._layers=[],u(this.boxes,(t=>{i&&"chartArea"===t.position||(t.configure&&t.configure(),this._layers.push(...t._layers()))}),this),this._layers.forEach(((t,e)=>{t._idx=e})),this.notifyPlugins("afterLayout")}_updateDatasets(t){if(!1!==this.notifyPlugins("beforeDatasetsUpdate",{mode:t,cancelable:!0})){for(let t=0,e=this.data.datasets.length;t<e;++t)this.getDatasetMeta(t).controller.configure();for(let e=0,i=this.data.datasets.length;e<i;++e)this._updateDataset(e,S(t)?t({datasetIndex:e}):t);this.notifyPlugins("afterDatasetsUpdate",{mode:t})}}_updateDataset(t,e){const i=this.getDatasetMeta(t),s={meta:i,index:t,mode:e,cancelable:!0};!1!==this.notifyPlugins("beforeDatasetUpdate",s)&&(i.controller._update(e),s.cancelable=!1,this.notifyPlugins("afterDatasetUpdate",s))}render(){!1!==this.notifyPlugins("beforeRender",{cancelable:!0})&&(bt.has(this)?this.attached&&!bt.running(this)&&bt.start(this):(this.draw(),Sn({chart:this})))}draw(){let t;if(this._resizeBeforeDraw){const{width:t,height:e}=this._resizeBeforeDraw;this._resizeBeforeDraw=null,this._resize(t,e)}if(this.clear(),this.width<=0||this.height<=0)return;if(!1===this.notifyPlugins("beforeDraw",{cancelable:!0}))return;const e=this._layers;for(t=0;t<e.length&&e[t].z<=0;++t)e[t].draw(this.chartArea);for(this._drawDatasets();t<e.length;++t)e[t].draw(this.chartArea);this.notifyPlugins("afterDraw")}_getSortedDatasetMetas(t){const e=this._sortedMetasets,i=[];let s,n;for(s=0,n=e.length;s<n;++s){const n=e[s];t&&!n.visible||i.push(n)}return i}getSortedVisibleDatasetMetas(){return this._getSortedDatasetMetas(!0)}_drawDatasets(){if(!1===this.notifyPlugins("beforeDatasetsDraw",{cancelable:!0}))return;const t=this.getSortedVisibleDatasetMetas();for(let e=t.length-1;e>=0;--e)this._drawDataset(t[e]);this.notifyPlugins("afterDatasetsDraw")}_drawDataset(t){const e=this.ctx,i={meta:t,index:t.index,cancelable:!0},s=Ni(this,t);!1!==this.notifyPlugins("beforeDatasetDraw",i)&&(s&&Ie(e,s),t.controller.draw(),s&&ze(e),i.cancelable=!1,this.notifyPlugins("afterDatasetDraw",i))}isPointInArea(t){return Re(t,this.chartArea,this._minPadding)}getElementsAtEventForMode(t,e,i,s){const n=Ki.modes[e];return"function"==typeof n?n(this,t,i,s):[]}getDatasetMeta(t){const e=this.data.datasets[t],i=this._metasets;let s=i.filter((t=>t&&t._dataset===e)).pop();return s||(s={type:null,data:[],dataset:null,controller:null,hidden:null,xAxisID:null,yAxisID:null,order:e&&e.order||0,index:t,_dataset:e,_parsed:[],_sorted:!1},i.push(s)),s}getContext(){return this.$context||(this.$context=Ci(null,{chart:this,type:"chart"}))}getVisibleDatasetCount(){return this.getSortedVisibleDatasetMetas().length}isDatasetVisible(t){const e=this.data.datasets[t];if(!e)return!1;const i=this.getDatasetMeta(t);return"boolean"==typeof i.hidden?!i.hidden:!e.hidden}setDatasetVisibility(t,e){this.getDatasetMeta(t).hidden=!e}toggleDataVisibility(t){this._hiddenIndices[t]=!this._hiddenIndices[t]}getDataVisibility(t){return!this._hiddenIndices[t]}_updateVisibility(t,e,i){const s=i?"show":"hide",n=this.getDatasetMeta(t),o=n.controller._resolveAnimations(void 0,s);k(e)?(n.data[e].hidden=!i,this.update()):(this.setDatasetVisibility(t,i),o.update(n,{visible:i}),this.update((e=>e.datasetIndex===t?s:void 0)))}hide(t,e){this._updateVisibility(t,e,!1)}show(t,e){this._updateVisibility(t,e,!0)}_destroyDatasetMeta(t){const e=this._metasets[t];e&&e.controller&&e.controller._destroy(),delete this._metasets[t]}_stop(){let t,e;for(this.stop(),bt.remove(this),t=0,e=this.data.datasets.length;t<e;++t)this._destroyDatasetMeta(t)}destroy(){this.notifyPlugins("beforeDestroy");const{canvas:t,ctx:e}=this;this._stop(),this.config.clearCache(),t&&(this.unbindEvents(),Te(t,e),this.platform.releaseContext(e),this.canvas=null,this.ctx=null),delete Cn[this.id],this.notifyPlugins("afterDestroy")}toBase64Image(...t){return this.canvas.toDataURL(...t)}bindEvents(){this.bindUserEvents(),this.options.responsive?this.bindResponsiveEvents():this.attached=!0}bindUserEvents(){const t=this._listeners,e=this.platform,i=(i,s)=>{e.addEventListener(this,i,s),t[i]=s},s=(t,e,i)=>{t.offsetX=e,t.offsetY=i,this._eventHandler(t)};u(this.options.events,(t=>i(t,s)))}bindResponsiveEvents(){this._responsiveListeners||(this._responsiveListeners={});const t=this._responsiveListeners,e=this.platform,i=(i,s)=>{e.addEventListener(this,i,s),t[i]=s},s=(i,s)=>{t[i]&&(e.removeEventListener(this,i,s),delete t[i])},n=(t,e)=>{this.canvas&&this.resize(t,e)};let o;const a=()=>{s("attach",a),this.attached=!0,this.resize(),i("resize",n),i("detach",o)};o=()=>{this.attached=!1,s("resize",n),this._stop(),this._resize(0,0),i("attach",a)},e.isAttached(this.canvas)?a():o()}unbindEvents(){u(this._listeners,((t,e)=>{this.platform.removeEventListener(this,e,t)})),this._listeners={},u(this._responsiveListeners,((t,e)=>{this.platform.removeEventListener(this,e,t)})),this._responsiveListeners=void 0}updateHoverStyle(t,e,i){const s=i?"set":"remove";let n,o,a,r;for("dataset"===e&&(n=this.getDatasetMeta(t[0].datasetIndex),n.controller["_"+s+"DatasetHoverStyle"]()),a=0,r=t.length;a<r;++a){o=t[a];const e=o&&this.getDatasetMeta(o.datasetIndex).controller;e&&e[s+"HoverStyle"](o.element,o.datasetIndex,o.index)}}getActiveElements(){return this._active||[]}setActiveElements(t){const e=this._active||[],i=t.map((({datasetIndex:t,index:e})=>{const i=this.getDatasetMeta(t);if(!i)throw new Error("No dataset found at index "+t);return{datasetIndex:t,element:i.data[e],index:e}}));!f(i,e)&&(this._active=i,this._lastEvent=null,this._updateHoverStyles(i,e))}notifyPlugins(t,e,i){return this._plugins.notify(this,t,e,i)}isPluginEnabled(t){return 1===this._plugins._cache.filter((e=>e.plugin.id===t)).length}_updateHoverStyles(t,e,i){const s=this.options.hover,n=(t,e)=>t.filter((t=>!e.some((e=>t.datasetIndex===e.datasetIndex&&t.index===e.index)))),o=n(e,t),a=i?t:n(t,e);o.length&&this.updateHoverStyle(o,s.mode,!1),a.length&&s.mode&&this.updateHoverStyle(a,s.mode,!0)}_eventHandler(t,e){const i={event:t,replay:e,cancelable:!0,inChartArea:this.isPointInArea(t)},s=e=>(e.options.events||this.options.events).includes(t.native.type);if(!1===this.notifyPlugins("beforeEvent",i,s))return;const n=this._handleEvent(t,e,i.inChartArea);return i.cancelable=!1,this.notifyPlugins("afterEvent",i,s),(n||i.changed)&&this.render(),this}_handleEvent(t,e,i){const{_active:s=[],options:n}=this,o=e,a=this._getActiveElements(t,s,i,o),r=D(t),l=function(t,e,i,s){return i&&"mouseout"!==t.type?s?e:t:null}(t,this._lastEvent,i,r);i&&(this._lastEvent=null,d(n.onHover,[t,a,this],this),r&&d(n.onClick,[t,a,this],this));const h=!f(a,s);return(h||e)&&(this._active=a,this._updateHoverStyles(a,s,e)),this._lastEvent=l,h}_getActiveElements(t,e,i,s){if("mouseout"===t.type)return[];if(!i)return e;const n=this.options.hover;return this.getElementsAtEventForMode(t,n.mode,n,s)}}function Ln(){return u(Tn.instances,(t=>t._plugins.invalidate()))}function En(){throw new Error("This method is not implemented: Check that a complete date adapter is provided.")}class Rn{static override(t){Object.assign(Rn.prototype,t)}options;constructor(t){this.options=t||{}}init(){}formats(){return En()}parse(){return En()}format(){return En()}add(){return En()}diff(){return En()}startOf(){return En()}endOf(){return En()}}var In={_date:Rn};function zn(t){const e=t.iScale,i=function(t,e){if(!t._cache.$bar){const i=t.getMatchingVisibleMetas(e);let s=[];for(let e=0,n=i.length;e<n;e++)s=s.concat(i[e].controller.getAllParsedValues(t));t._cache.$bar=lt(s.sort(((t,e)=>t-e)))}return t._cache.$bar}(e,t.type);let s,n,o,a,r=e._length;const l=()=>{32767!==o&&-32768!==o&&(k(a)&&(r=Math.min(r,Math.abs(o-a)||r)),a=o)};for(s=0,n=i.length;s<n;++s)o=e.getPixelForValue(i[s]),l();for(a=void 0,s=0,n=e.ticks.length;s<n;++s)o=e.getPixelForTick(s),l();return r}function Fn(t,e,i,s){return n(t)?function(t,e,i,s){const n=i.parse(t[0],s),o=i.parse(t[1],s),a=Math.min(n,o),r=Math.max(n,o);let l=a,h=r;Math.abs(a)>Math.abs(r)&&(l=r,h=a),e[i.axis]=h,e._custom={barStart:l,barEnd:h,start:n,end:o,min:a,max:r}}(t,e,i,s):e[i.axis]=i.parse(t,s),e}function Vn(t,e,i,s){const n=t.iScale,o=t.vScale,a=n.getLabels(),r=n===o,l=[];let h,c,d,u;for(h=i,c=i+s;h<c;++h)u=e[h],d={},d[n.axis]=r||n.parse(a[h],h),l.push(Fn(u,d,o,h));return l}function Bn(t){return t&&void 0!==t.barStart&&void 0!==t.barEnd}function Wn(t,e,i,s){let n=e.borderSkipped;const o={};if(!n)return void(t.borderSkipped=o);if(!0===n)return void(t.borderSkipped={top:!0,right:!0,bottom:!0,left:!0});const{start:a,end:r,reverse:l,top:h,bottom:c}=function(t){let e,i,s,n,o;return t.horizontal?(e=t.base>t.x,i="left",s="right"):(e=t.base<t.y,i="bottom",s="top"),e?(n="end",o="start"):(n="start",o="end"),{start:i,end:s,reverse:e,top:n,bottom:o}}(t);"middle"===n&&i&&(t.enableBorderRadius=!0,(i._top||0)===s?n=h:(i._bottom||0)===s?n=c:(o[Nn(c,a,r,l)]=!0,n=h)),o[Nn(n,a,r,l)]=!0,t.borderSkipped=o}function Nn(t,e,i,s){var n,o,a;return s?(a=i,t=Hn(t=(n=t)===(o=e)?a:n===a?o:n,i,e)):t=Hn(t,e,i),t}function Hn(t,e,i){return"start"===t?e:"end"===t?i:t}function jn(t,{inflateAmount:e},i){t.inflateAmount="auto"===e?1===i?.33:0:e}class $n extends js{static id="doughnut";static defaults={datasetElementType:!1,dataElementType:"arc",animation:{animateRotate:!0,animateScale:!1},animations:{numbers:{type:"number",properties:["circumference","endAngle","innerRadius","outerRadius","startAngle","x","y","offset","borderWidth","spacing"]}},cutout:"50%",rotation:0,circumference:360,radius:"100%",spacing:0,indexAxis:"r"};static descriptors={_scriptable:t=>"spacing"!==t,_indexable:t=>"spacing"!==t&&!t.startsWith("borderDash")&&!t.startsWith("hoverBorderDash")};static overrides={aspectRatio:1,plugins:{legend:{labels:{generateLabels(t){const e=t.data,{labels:{pointStyle:i,textAlign:s,color:n,useBorderRadius:o,borderRadius:a}}=t.legend.options;return e.labels.length&&e.datasets.length?e.labels.map(((e,r)=>{const l=t.getDatasetMeta(0).controller.getStyle(r);return{text:e,fillStyle:l.backgroundColor,fontColor:n,hidden:!t.getDataVisibility(r),lineDash:l.borderDash,lineDashOffset:l.borderDashOffset,lineJoin:l.borderJoinStyle,lineWidth:l.borderWidth,strokeStyle:l.borderColor,textAlign:s,pointStyle:i,borderRadius:o&&(a||l.borderRadius),index:r}})):[]}},onClick(t,e,i){i.chart.toggleDataVisibility(e.index),i.chart.update()}}}};constructor(t,e){super(t,e),this.enableOptionSharing=!0,this.innerRadius=void 0,this.outerRadius=void 0,this.offsetX=void 0,this.offsetY=void 0}linkScales(){}parse(t,e){const i=this.getDataset().data,s=this._cachedMeta;if(!1===this._parsing)s._parsed=i;else{let n,a,r=t=>+i[t];if(o(i[t])){const{key:t="value"}=this._parsing;r=e=>+M(i[e],t)}for(n=t,a=t+e;n<a;++n)s._parsed[n]=r(n)}}_getRotation(){return $(this.options.rotation-90)}_getCircumference(){return $(this.options.circumference)}_getRotationExtents(){let t=O,e=-O;for(let i=0;i<this.chart.data.datasets.length;++i)if(this.chart.isDatasetVisible(i)&&this.chart.getDatasetMeta(i).type===this._type){const s=this.chart.getDatasetMeta(i).controller,n=s._getRotation(),o=s._getCircumference();t=Math.min(t,n),e=Math.max(e,n+o)}return{rotation:t,circumference:e-t}}update(t){const e=this.chart,{chartArea:i}=e,s=this._cachedMeta,n=s.data,o=this.getMaxBorderWidth()+this.getMaxOffset(n)+this.options.spacing,a=Math.max((Math.min(i.width,i.height)-o)/2,0),r=Math.min(h(this.options.cutout,a),1),l=this._getRingWeight(this.index),{circumference:d,rotation:u}=this._getRotationExtents(),{ratioX:f,ratioY:g,offsetX:p,offsetY:m}=function(t,e,i){let s=1,n=1,o=0,a=0;if(e<O){const r=t,l=r+e,h=Math.cos(r),c=Math.sin(r),d=Math.cos(l),u=Math.sin(l),f=(t,e,s)=>J(t,r,l,!0)?1:Math.max(e,e*i,s,s*i),g=(t,e,s)=>J(t,r,l,!0)?-1:Math.min(e,e*i,s,s*i),p=f(0,h,d),m=f(E,c,u),x=g(C,h,d),b=g(C+E,c,u);s=(p-x)/2,n=(m-b)/2,o=-(p+x)/2,a=-(m+b)/2}return{ratioX:s,ratioY:n,offsetX:o,offsetY:a}}(u,d,r),x=(i.width-o)/f,b=(i.height-o)/g,_=Math.max(Math.min(x,b)/2,0),y=c(this.options.radius,_),v=(y-Math.max(y*r,0))/this._getVisibleDatasetWeightTotal();this.offsetX=p*y,this.offsetY=m*y,s.total=this.calculateTotal(),this.outerRadius=y-v*this._getRingWeightOffset(this.index),this.innerRadius=Math.max(this.outerRadius-v*l,0),this.updateElements(n,0,n.length,t)}_circumference(t,e){const i=this.options,s=this._cachedMeta,n=this._getCircumference();return e&&i.animation.animateRotate||!this.chart.getDataVisibility(t)||null===s._parsed[t]||s.data[t].hidden?0:this.calculateCircumference(s._parsed[t]*n/O)}updateElements(t,e,i,s){const n="reset"===s,o=this.chart,a=o.chartArea,r=o.options.animation,l=(a.left+a.right)/2,h=(a.top+a.bottom)/2,c=n&&r.animateScale,d=c?0:this.innerRadius,u=c?0:this.outerRadius,{sharedOptions:f,includeOptions:g}=this._getSharedOptions(e,s);let p,m=this._getRotation();for(p=0;p<e;++p)m+=this._circumference(p,n);for(p=e;p<e+i;++p){const e=this._circumference(p,n),i=t[p],o={x:l+this.offsetX,y:h+this.offsetY,startAngle:m,endAngle:m+e,circumference:e,outerRadius:u,innerRadius:d};g&&(o.options=f||this.resolveDataElementOptions(p,i.active?"active":s)),m+=e,this.updateElement(i,p,o,s)}}calculateTotal(){const t=this._cachedMeta,e=t.data;let i,s=0;for(i=0;i<e.length;i++){const n=t._parsed[i];null===n||isNaN(n)||!this.chart.getDataVisibility(i)||e[i].hidden||(s+=Math.abs(n))}return s}calculateCircumference(t){const e=this._cachedMeta.total;return e>0&&!isNaN(t)?O*(Math.abs(t)/e):0}getLabelAndValue(t){const e=this._cachedMeta,i=this.chart,s=i.data.labels||[],n=ne(e._parsed[t],i.options.locale);return{label:s[t]||"",value:n}}getMaxBorderWidth(t){let e=0;const i=this.chart;let s,n,o,a,r;if(!t)for(s=0,n=i.data.datasets.length;s<n;++s)if(i.isDatasetVisible(s)){o=i.getDatasetMeta(s),t=o.data,a=o.controller;break}if(!t)return 0;for(s=0,n=t.length;s<n;++s)r=a.resolveDataElementOptions(s),"inner"!==r.borderAlign&&(e=Math.max(e,r.borderWidth||0,r.hoverBorderWidth||0));return e}getMaxOffset(t){let e=0;for(let i=0,s=t.length;i<s;++i){const t=this.resolveDataElementOptions(i);e=Math.max(e,t.offset||0,t.hoverOffset||0)}return e}_getRingWeightOffset(t){let e=0;for(let i=0;i<t;++i)this.chart.isDatasetVisible(i)&&(e+=this._getRingWeight(i));return e}_getRingWeight(t){return Math.max(l(this.chart.data.datasets[t].weight,1),0)}_getVisibleDatasetWeightTotal(){return this._getRingWeightOffset(this.chart.data.datasets.length)||1}}class Yn extends js{static id="polarArea";static defaults={dataElementType:"arc",animation:{animateRotate:!0,animateScale:!0},animations:{numbers:{type:"number",properties:["x","y","startAngle","endAngle","innerRadius","outerRadius"]}},indexAxis:"r",startAngle:0};static overrides={aspectRatio:1,plugins:{legend:{labels:{generateLabels(t){const e=t.data;if(e.labels.length&&e.datasets.length){const{labels:{pointStyle:i,color:s}}=t.legend.options;return e.labels.map(((e,n)=>{const o=t.getDatasetMeta(0).controller.getStyle(n);return{text:e,fillStyle:o.backgroundColor,strokeStyle:o.borderColor,fontColor:s,lineWidth:o.borderWidth,pointStyle:i,hidden:!t.getDataVisibility(n),index:n}}))}return[]}},onClick(t,e,i){i.chart.toggleDataVisibility(e.index),i.chart.update()}}},scales:{r:{type:"radialLinear",angleLines:{display:!1},beginAtZero:!0,grid:{circular:!0},pointLabels:{display:!1},startAngle:0}}};constructor(t,e){super(t,e),this.innerRadius=void 0,this.outerRadius=void 0}getLabelAndValue(t){const e=this._cachedMeta,i=this.chart,s=i.data.labels||[],n=ne(e._parsed[t].r,i.options.locale);return{label:s[t]||"",value:n}}parseObjectData(t,e,i,s){return ii.bind(this)(t,e,i,s)}update(t){const e=this._cachedMeta.data;this._updateRadius(),this.updateElements(e,0,e.length,t)}getMinMax(){const t=this._cachedMeta,e={min:Number.POSITIVE_INFINITY,max:Number.NEGATIVE_INFINITY};return t.data.forEach(((t,i)=>{const s=this.getParsed(i).r;!isNaN(s)&&this.chart.getDataVisibility(i)&&(s<e.min&&(e.min=s),s>e.max&&(e.max=s))})),e}_updateRadius(){const t=this.chart,e=t.chartArea,i=t.options,s=Math.min(e.right-e.left,e.bottom-e.top),n=Math.max(s/2,0),o=(n-Math.max(i.cutoutPercentage?n/100*i.cutoutPercentage:1,0))/t.getVisibleDatasetCount();this.outerRadius=n-o*this.index,this.innerRadius=this.outerRadius-o}updateElements(t,e,i,s){const n="reset"===s,o=this.chart,a=o.options.animation,r=this._cachedMeta.rScale,l=r.xCenter,h=r.yCenter,c=r.getIndexAngle(0)-.5*C;let d,u=c;const f=360/this.countVisibleElements();for(d=0;d<e;++d)u+=this._computeAngle(d,s,f);for(d=e;d<e+i;d++){const e=t[d];let i=u,g=u+this._computeAngle(d,s,f),p=o.getDataVisibility(d)?r.getDistanceFromCenterForValue(this.getParsed(d).r):0;u=g,n&&(a.animateScale&&(p=0),a.animateRotate&&(i=g=c));const m={x:l,y:h,innerRadius:0,outerRadius:p,startAngle:i,endAngle:g,options:this.resolveDataElementOptions(d,e.active?"active":s)};this.updateElement(e,d,m,s)}}countVisibleElements(){const t=this._cachedMeta;let e=0;return t.data.forEach(((t,i)=>{!isNaN(this.getParsed(i).r)&&this.chart.getDataVisibility(i)&&e++})),e}_computeAngle(t,e,i){return this.chart.getDataVisibility(t)?$(this.resolveDataElementOptions(t,e).angle||i):0}}var Un=Object.freeze({__proto__:null,BarController:class extends js{static id="bar";static defaults={datasetElementType:!1,dataElementType:"bar",categoryPercentage:.8,barPercentage:.9,grouped:!0,animations:{numbers:{type:"number",properties:["x","y","base","width","height"]}}};static overrides={scales:{_index_:{type:"category",offset:!0,grid:{offset:!0}},_value_:{type:"linear",beginAtZero:!0}}};parsePrimitiveData(t,e,i,s){return Vn(t,e,i,s)}parseArrayData(t,e,i,s){return Vn(t,e,i,s)}parseObjectData(t,e,i,s){const{iScale:n,vScale:o}=t,{xAxisKey:a="x",yAxisKey:r="y"}=this._parsing,l="x"===n.axis?a:r,h="x"===o.axis?a:r,c=[];let d,u,f,g;for(d=i,u=i+s;d<u;++d)g=e[d],f={},f[n.axis]=n.parse(M(g,l),d),c.push(Fn(M(g,h),f,o,d));return c}updateRangeFromParsed(t,e,i,s){super.updateRangeFromParsed(t,e,i,s);const n=i._custom;n&&e===this._cachedMeta.vScale&&(t.min=Math.min(t.min,n.min),t.max=Math.max(t.max,n.max))}getMaxOverflow(){return 0}getLabelAndValue(t){const e=this._cachedMeta,{iScale:i,vScale:s}=e,n=this.getParsed(t),o=n._custom,a=Bn(o)?"["+o.start+", "+o.end+"]":""+s.getLabelForValue(n[s.axis]);return{label:""+i.getLabelForValue(n[i.axis]),value:a}}initialize(){this.enableOptionSharing=!0,super.initialize();this._cachedMeta.stack=this.getDataset().stack}update(t){const e=this._cachedMeta;this.updateElements(e.data,0,e.data.length,t)}updateElements(t,e,i,n){const o="reset"===n,{index:a,_cachedMeta:{vScale:r}}=this,l=r.getBasePixel(),h=r.isHorizontal(),c=this._getRuler(),{sharedOptions:d,includeOptions:u}=this._getSharedOptions(e,n);for(let f=e;f<e+i;f++){const e=this.getParsed(f),i=o||s(e[r.axis])?{base:l,head:l}:this._calculateBarValuePixels(f),g=this._calculateBarIndexPixels(f,c),p=(e._stacks||{})[r.axis],m={horizontal:h,base:i.base,enableBorderRadius:!p||Bn(e._custom)||a===p._top||a===p._bottom,x:h?i.head:g.center,y:h?g.center:i.head,height:h?g.size:Math.abs(i.size),width:h?Math.abs(i.size):g.size};u&&(m.options=d||this.resolveDataElementOptions(f,t[f].active?"active":n));const x=m.options||t[f].options;Wn(m,x,p,a),jn(m,x,c.ratio),this.updateElement(t[f],f,m,n)}}_getStacks(t,e){const{iScale:i}=this._cachedMeta,n=i.getMatchingVisibleMetas(this._type).filter((t=>t.controller.options.grouped)),o=i.options.stacked,a=[],r=this._cachedMeta.controller.getParsed(e),l=r&&r[i.axis],h=t=>{const e=t._parsed.find((t=>t[i.axis]===l)),n=e&&e[t.vScale.axis];if(s(n)||isNaN(n))return!0};for(const i of n)if((void 0===e||!h(i))&&((!1===o||-1===a.indexOf(i.stack)||void 0===o&&void 0===i.stack)&&a.push(i.stack),i.index===t))break;return a.length||a.push(void 0),a}_getStackCount(t){return this._getStacks(void 0,t).length}_getAxisCount(){return this._getAxis().length}getFirstScaleIdForIndexAxis(){const t=this.chart.scales,e=this.chart.options.indexAxis;return Object.keys(t).filter((i=>t[i].axis===e)).shift()}_getAxis(){const t={},e=this.getFirstScaleIdForIndexAxis();for(const i of this.chart.data.datasets)t[l("x"===this.chart.options.indexAxis?i.xAxisID:i.yAxisID,e)]=!0;return Object.keys(t)}_getStackIndex(t,e,i){const s=this._getStacks(t,i),n=void 0!==e?s.indexOf(e):-1;return-1===n?s.length-1:n}_getRuler(){const t=this.options,e=this._cachedMeta,i=e.iScale,s=[];let n,o;for(n=0,o=e.data.length;n<o;++n)s.push(i.getPixelForValue(this.getParsed(n)[i.axis],n));const a=t.barThickness;return{min:a||zn(e),pixels:s,start:i._startPixel,end:i._endPixel,stackCount:this._getStackCount(),scale:i,grouped:t.grouped,ratio:a?1:t.categoryPercentage*t.barPercentage}}_calculateBarValuePixels(t){const{_cachedMeta:{vScale:e,_stacked:i,index:n},options:{base:o,minBarLength:a}}=this,r=o||0,l=this.getParsed(t),h=l._custom,c=Bn(h);let d,u,f=l[e.axis],g=0,p=i?this.applyStack(e,l,i):f;p!==f&&(g=p-f,p=f),c&&(f=h.barStart,p=h.barEnd-h.barStart,0!==f&&F(f)!==F(h.barEnd)&&(g=0),g+=f);const m=s(o)||c?g:o;let x=e.getPixelForValue(m);if(d=this.chart.getDataVisibility(t)?e.getPixelForValue(g+p):x,u=d-x,Math.abs(u)<a){u=function(t,e,i){return 0!==t?F(t):(e.isHorizontal()?1:-1)*(e.min>=i?1:-1)}(u,e,r)*a,f===r&&(x-=u/2);const t=e.getPixelForDecimal(0),s=e.getPixelForDecimal(1),o=Math.min(t,s),h=Math.max(t,s);x=Math.max(Math.min(x,h),o),d=x+u,i&&!c&&(l._stacks[e.axis]._visualValues[n]=e.getValueForPixel(d)-e.getValueForPixel(x))}if(x===e.getPixelForValue(r)){const t=F(u)*e.getLineWidthForValue(r)/2;x+=t,u-=t}return{size:u,base:x,head:d,center:d+u/2}}_calculateBarIndexPixels(t,e){const i=e.scale,n=this.options,o=n.skipNull,a=l(n.maxBarThickness,1/0);let r,h;const c=this._getAxisCount();if(e.grouped){const i=o?this._getStackCount(t):e.stackCount,d="flex"===n.barThickness?function(t,e,i,s){const n=e.pixels,o=n[t];let a=t>0?n[t-1]:null,r=t<n.length-1?n[t+1]:null;const l=i.categoryPercentage;null===a&&(a=o-(null===r?e.end-e.start:r-o)),null===r&&(r=o+o-a);const h=o-(o-Math.min(a,r))/2*l;return{chunk:Math.abs(r-a)/2*l/s,ratio:i.barPercentage,start:h}}(t,e,n,i*c):function(t,e,i,n){const o=i.barThickness;let a,r;return s(o)?(a=e.min*i.categoryPercentage,r=i.barPercentage):(a=o*n,r=1),{chunk:a/n,ratio:r,start:e.pixels[t]-a/2}}(t,e,n,i*c),u="x"===this.chart.options.indexAxis?this.getDataset().xAxisID:this.getDataset().yAxisID,f=this._getAxis().indexOf(l(u,this.getFirstScaleIdForIndexAxis())),g=this._getStackIndex(this.index,this._cachedMeta.stack,o?t:void 0)+f;r=d.start+d.chunk*g+d.chunk/2,h=Math.min(a,d.chunk*d.ratio)}else r=i.getPixelForValue(this.getParsed(t)[i.axis],t),h=Math.min(a,e.min*e.ratio);return{base:r-h/2,head:r+h/2,center:r,size:h}}draw(){const t=this._cachedMeta,e=t.vScale,i=t.data,s=i.length;let n=0;for(;n<s;++n)null===this.getParsed(n)[e.axis]||i[n].hidden||i[n].draw(this._ctx)}},BubbleController:class extends js{static id="bubble";static defaults={datasetElementType:!1,dataElementType:"point",animations:{numbers:{type:"number",properties:["x","y","borderWidth","radius"]}}};static overrides={scales:{x:{type:"linear"},y:{type:"linear"}}};initialize(){this.enableOptionSharing=!0,super.initialize()}parsePrimitiveData(t,e,i,s){const n=super.parsePrimitiveData(t,e,i,s);for(let t=0;t<n.length;t++)n[t]._custom=this.resolveDataElementOptions(t+i).radius;return n}parseArrayData(t,e,i,s){const n=super.parseArrayData(t,e,i,s);for(let t=0;t<n.length;t++){const s=e[i+t];n[t]._custom=l(s[2],this.resolveDataElementOptions(t+i).radius)}return n}parseObjectData(t,e,i,s){const n=super.parseObjectData(t,e,i,s);for(let t=0;t<n.length;t++){const s=e[i+t];n[t]._custom=l(s&&s.r&&+s.r,this.resolveDataElementOptions(t+i).radius)}return n}getMaxOverflow(){const t=this._cachedMeta.data;let e=0;for(let i=t.length-1;i>=0;--i)e=Math.max(e,t[i].size(this.resolveDataElementOptions(i))/2);return e>0&&e}getLabelAndValue(t){const e=this._cachedMeta,i=this.chart.data.labels||[],{xScale:s,yScale:n}=e,o=this.getParsed(t),a=s.getLabelForValue(o.x),r=n.getLabelForValue(o.y),l=o._custom;return{label:i[t]||"",value:"("+a+", "+r+(l?", "+l:"")+")"}}update(t){const e=this._cachedMeta.data;this.updateElements(e,0,e.length,t)}updateElements(t,e,i,s){const n="reset"===s,{iScale:o,vScale:a}=this._cachedMeta,{sharedOptions:r,includeOptions:l}=this._getSharedOptions(e,s),h=o.axis,c=a.axis;for(let d=e;d<e+i;d++){const e=t[d],i=!n&&this.getParsed(d),u={},f=u[h]=n?o.getPixelForDecimal(.5):o.getPixelForValue(i[h]),g=u[c]=n?a.getBasePixel():a.getPixelForValue(i[c]);u.skip=isNaN(f)||isNaN(g),l&&(u.options=r||this.resolveDataElementOptions(d,e.active?"active":s),n&&(u.options.radius=0)),this.updateElement(e,d,u,s)}}resolveDataElementOptions(t,e){const i=this.getParsed(t);let s=super.resolveDataElementOptions(t,e);s.$shared&&(s=Object.assign({},s,{$shared:!1}));const n=s.radius;return"active"!==e&&(s.radius=0),s.radius+=l(i&&i._custom,n),s}},DoughnutController:$n,LineController:class extends js{static id="line";static defaults={datasetElementType:"line",dataElementType:"point",showLine:!0,spanGaps:!1};static overrides={scales:{_index_:{type:"category"},_value_:{type:"linear"}}};initialize(){this.enableOptionSharing=!0,this.supportsDecimation=!0,super.initialize()}update(t){const e=this._cachedMeta,{dataset:i,data:s=[],_dataset:n}=e,o=this.chart._animationsDisabled;let{start:a,count:r}=pt(e,s,o);this._drawStart=a,this._drawCount=r,mt(e)&&(a=0,r=s.length),i._chart=this.chart,i._datasetIndex=this.index,i._decimated=!!n._decimated,i.points=s;const l=this.resolveDatasetElementOptions(t);this.options.showLine||(l.borderWidth=0),l.segment=this.options.segment,this.updateElement(i,void 0,{animated:!o,options:l},t),this.updateElements(s,a,r,t)}updateElements(t,e,i,n){const o="reset"===n,{iScale:a,vScale:r,_stacked:l,_dataset:h}=this._cachedMeta,{sharedOptions:c,includeOptions:d}=this._getSharedOptions(e,n),u=a.axis,f=r.axis,{spanGaps:g,segment:p}=this.options,m=N(g)?g:Number.POSITIVE_INFINITY,x=this.chart._animationsDisabled||o||"none"===n,b=e+i,_=t.length;let y=e>0&&this.getParsed(e-1);for(let i=0;i<_;++i){const g=t[i],_=x?g:{};if(i<e||i>=b){_.skip=!0;continue}const v=this.getParsed(i),M=s(v[f]),w=_[u]=a.getPixelForValue(v[u],i),k=_[f]=o||M?r.getBasePixel():r.getPixelForValue(l?this.applyStack(r,v,l):v[f],i);_.skip=isNaN(w)||isNaN(k)||M,_.stop=i>0&&Math.abs(v[u]-y[u])>m,p&&(_.parsed=v,_.raw=h.data[i]),d&&(_.options=c||this.resolveDataElementOptions(i,g.active?"active":n)),x||this.updateElement(g,i,_,n),y=v}}getMaxOverflow(){const t=this._cachedMeta,e=t.dataset,i=e.options&&e.options.borderWidth||0,s=t.data||[];if(!s.length)return i;const n=s[0].size(this.resolveDataElementOptions(0)),o=s[s.length-1].size(this.resolveDataElementOptions(s.length-1));return Math.max(i,n,o)/2}draw(){const t=this._cachedMeta;t.dataset.updateControlPoints(this.chart.chartArea,t.iScale.axis),super.draw()}},PieController:class extends $n{static id="pie";static defaults={cutout:0,rotation:0,circumference:360,radius:"100%"}},PolarAreaController:Yn,RadarController:class extends js{static id="radar";static defaults={datasetElementType:"line",dataElementType:"point",indexAxis:"r",showLine:!0,elements:{line:{fill:"start"}}};static overrides={aspectRatio:1,scales:{r:{type:"radialLinear"}}};getLabelAndValue(t){const e=this._cachedMeta.vScale,i=this.getParsed(t);return{label:e.getLabels()[t],value:""+e.getLabelForValue(i[e.axis])}}parseObjectData(t,e,i,s){return ii.bind(this)(t,e,i,s)}update(t){const e=this._cachedMeta,i=e.dataset,s=e.data||[],n=e.iScale.getLabels();if(i.points=s,"resize"!==t){const e=this.resolveDatasetElementOptions(t);this.options.showLine||(e.borderWidth=0);const o={_loop:!0,_fullLoop:n.length===s.length,options:e};this.updateElement(i,void 0,o,t)}this.updateElements(s,0,s.length,t)}updateElements(t,e,i,s){const n=this._cachedMeta.rScale,o="reset"===s;for(let a=e;a<e+i;a++){const e=t[a],i=this.resolveDataElementOptions(a,e.active?"active":s),r=n.getPointPositionForValue(a,this.getParsed(a).r),l=o?n.xCenter:r.x,h=o?n.yCenter:r.y,c={x:l,y:h,angle:r.angle,skip:isNaN(l)||isNaN(h),options:i};this.updateElement(e,a,c,s)}}},ScatterController:class extends js{static id="scatter";static defaults={datasetElementType:!1,dataElementType:"point",showLine:!1,fill:!1};static overrides={interaction:{mode:"point"},scales:{x:{type:"linear"},y:{type:"linear"}}};getLabelAndValue(t){const e=this._cachedMeta,i=this.chart.data.labels||[],{xScale:s,yScale:n}=e,o=this.getParsed(t),a=s.getLabelForValue(o.x),r=n.getLabelForValue(o.y);return{label:i[t]||"",value:"("+a+", "+r+")"}}update(t){const e=this._cachedMeta,{data:i=[]}=e,s=this.chart._animationsDisabled;let{start:n,count:o}=pt(e,i,s);if(this._drawStart=n,this._drawCount=o,mt(e)&&(n=0,o=i.length),this.options.showLine){this.datasetElementType||this.addElements();const{dataset:n,_dataset:o}=e;n._chart=this.chart,n._datasetIndex=this.index,n._decimated=!!o._decimated,n.points=i;const a=this.resolveDatasetElementOptions(t);a.segment=this.options.segment,this.updateElement(n,void 0,{animated:!s,options:a},t)}else this.datasetElementType&&(delete e.dataset,this.datasetElementType=!1);this.updateElements(i,n,o,t)}addElements(){const{showLine:t}=this.options;!this.datasetElementType&&t&&(this.datasetElementType=this.chart.registry.getElement("line")),super.addElements()}updateElements(t,e,i,n){const o="reset"===n,{iScale:a,vScale:r,_stacked:l,_dataset:h}=this._cachedMeta,c=this.resolveDataElementOptions(e,n),d=this.getSharedOptions(c),u=this.includeOptions(n,d),f=a.axis,g=r.axis,{spanGaps:p,segment:m}=this.options,x=N(p)?p:Number.POSITIVE_INFINITY,b=this.chart._animationsDisabled||o||"none"===n;let _=e>0&&this.getParsed(e-1);for(let c=e;c<e+i;++c){const e=t[c],i=this.getParsed(c),p=b?e:{},y=s(i[g]),v=p[f]=a.getPixelForValue(i[f],c),M=p[g]=o||y?r.getBasePixel():r.getPixelForValue(l?this.applyStack(r,i,l):i[g],c);p.skip=isNaN(v)||isNaN(M)||y,p.stop=c>0&&Math.abs(i[f]-_[f])>x,m&&(p.parsed=i,p.raw=h.data[c]),u&&(p.options=d||this.resolveDataElementOptions(c,e.active?"active":n)),b||this.updateElement(e,c,p,n),_=i}this.updateSharedOptions(d,n,c)}getMaxOverflow(){const t=this._cachedMeta,e=t.data||[];if(!this.options.showLine){let t=0;for(let i=e.length-1;i>=0;--i)t=Math.max(t,e[i].size(this.resolveDataElementOptions(i))/2);return t>0&&t}const i=t.dataset,s=i.options&&i.options.borderWidth||0;if(!e.length)return s;const n=e[0].size(this.resolveDataElementOptions(0)),o=e[e.length-1].size(this.resolveDataElementOptions(e.length-1));return Math.max(s,n,o)/2}}});function Xn(t,e,i,s){const n=vi(t.options.borderRadius,["outerStart","outerEnd","innerStart","innerEnd"]);const o=(i-e)/2,a=Math.min(o,s*e/2),r=t=>{const e=(i-Math.min(o,t))*s/2;return Z(t,0,Math.min(o,e))};return{outerStart:r(n.outerStart),outerEnd:r(n.outerEnd),innerStart:Z(n.innerStart,0,a),innerEnd:Z(n.innerEnd,0,a)}}function qn(t,e,i,s){return{x:i+t*Math.cos(e),y:s+t*Math.sin(e)}}function Kn(t,e,i,s,n,o){const{x:a,y:r,startAngle:l,pixelMargin:h,innerRadius:c}=e,d=Math.max(e.outerRadius+s+i-h,0),u=c>0?c+s+i+h:0;let f=0;const g=n-l;if(s){const t=((c>0?c-s:0)+(d>0?d-s:0))/2;f=(g-(0!==t?g*t/(t+s):g))/2}const p=(g-Math.max(.001,g*d-i/C)/d)/2,m=l+p+f,x=n-p-f,{outerStart:b,outerEnd:_,innerStart:y,innerEnd:v}=Xn(e,u,d,x-m),M=d-b,w=d-_,k=m+b/M,S=x-_/w,P=u+y,D=u+v,O=m+y/P,A=x-v/D;if(t.beginPath(),o){const e=(k+S)/2;if(t.arc(a,r,d,k,e),t.arc(a,r,d,e,S),_>0){const e=qn(w,S,a,r);t.arc(e.x,e.y,_,S,x+E)}const i=qn(D,x,a,r);if(t.lineTo(i.x,i.y),v>0){const e=qn(D,A,a,r);t.arc(e.x,e.y,v,x+E,A+Math.PI)}const s=(x-v/u+(m+y/u))/2;if(t.arc(a,r,u,x-v/u,s,!0),t.arc(a,r,u,s,m+y/u,!0),y>0){const e=qn(P,O,a,r);t.arc(e.x,e.y,y,O+Math.PI,m-E)}const n=qn(M,m,a,r);if(t.lineTo(n.x,n.y),b>0){const e=qn(M,k,a,r);t.arc(e.x,e.y,b,m-E,k)}}else{t.moveTo(a,r);const e=Math.cos(k)*d+a,i=Math.sin(k)*d+r;t.lineTo(e,i);const s=Math.cos(S)*d+a,n=Math.sin(S)*d+r;t.lineTo(s,n)}t.closePath()}function Gn(t,e,i,s,n){const{fullCircles:o,startAngle:a,circumference:r,options:l}=e,{borderWidth:h,borderJoinStyle:c,borderDash:d,borderDashOffset:u,borderRadius:f}=l,g="inner"===l.borderAlign;if(!h)return;t.setLineDash(d||[]),t.lineDashOffset=u,g?(t.lineWidth=2*h,t.lineJoin=c||"round"):(t.lineWidth=h,t.lineJoin=c||"bevel");let p=e.endAngle;if(o){Kn(t,e,i,s,p,n);for(let e=0;e<o;++e)t.stroke();isNaN(r)||(p=a+(r%O||O))}g&&function(t,e,i){const{startAngle:s,pixelMargin:n,x:o,y:a,outerRadius:r,innerRadius:l}=e;let h=n/r;t.beginPath(),t.arc(o,a,r,s-h,i+h),l>n?(h=n/l,t.arc(o,a,l,i+h,s-h,!0)):t.arc(o,a,n,i+E,s-E),t.closePath(),t.clip()}(t,e,p),l.selfJoin&&p-a>=C&&0===f&&"miter"!==c&&function(t,e,i){const{startAngle:s,x:n,y:o,outerRadius:a,innerRadius:r,options:l}=e,{borderWidth:h,borderJoinStyle:c}=l,d=Math.min(h/a,G(s-i));if(t.beginPath(),t.arc(n,o,a-h/2,s+d/2,i-d/2),r>0){const e=Math.min(h/r,G(s-i));t.arc(n,o,r+h/2,i-e/2,s+e/2,!0)}else{const e=Math.min(h/2,a*G(s-i));if("round"===c)t.arc(n,o,e,i-C/2,s+C/2,!0);else if("bevel"===c){const a=2*e*e,r=-a*Math.cos(i+C/2)+n,l=-a*Math.sin(i+C/2)+o,h=a*Math.cos(s+C/2)+n,c=a*Math.sin(s+C/2)+o;t.lineTo(r,l),t.lineTo(h,c)}}t.closePath(),t.moveTo(0,0),t.rect(0,0,t.canvas.width,t.canvas.height),t.clip("evenodd")}(t,e,p),o||(Kn(t,e,i,s,p,n),t.stroke())}function Jn(t,e,i=e){t.lineCap=l(i.borderCapStyle,e.borderCapStyle),t.setLineDash(l(i.borderDash,e.borderDash)),t.lineDashOffset=l(i.borderDashOffset,e.borderDashOffset),t.lineJoin=l(i.borderJoinStyle,e.borderJoinStyle),t.lineWidth=l(i.borderWidth,e.borderWidth),t.strokeStyle=l(i.borderColor,e.borderColor)}function Zn(t,e,i){t.lineTo(i.x,i.y)}function Qn(t,e,i={}){const s=t.length,{start:n=0,end:o=s-1}=i,{start:a,end:r}=e,l=Math.max(n,a),h=Math.min(o,r),c=n<a&&o<a||n>r&&o>r;return{count:s,start:l,loop:e.loop,ilen:h<l&&!c?s+h-l:h-l}}function to(t,e,i,s){const{points:n,options:o}=e,{count:a,start:r,loop:l,ilen:h}=Qn(n,i,s),c=function(t){return t.stepped?Fe:t.tension||"monotone"===t.cubicInterpolationMode?Ve:Zn}(o);let d,u,f,{move:g=!0,reverse:p}=s||{};for(d=0;d<=h;++d)u=n[(r+(p?h-d:d))%a],u.skip||(g?(t.moveTo(u.x,u.y),g=!1):c(t,f,u,p,o.stepped),f=u);return l&&(u=n[(r+(p?h:0))%a],c(t,f,u,p,o.stepped)),!!l}function eo(t,e,i,s){const n=e.points,{count:o,start:a,ilen:r}=Qn(n,i,s),{move:l=!0,reverse:h}=s||{};let c,d,u,f,g,p,m=0,x=0;const b=t=>(a+(h?r-t:t))%o,_=()=>{f!==g&&(t.lineTo(m,g),t.lineTo(m,f),t.lineTo(m,p))};for(l&&(d=n[b(0)],t.moveTo(d.x,d.y)),c=0;c<=r;++c){if(d=n[b(c)],d.skip)continue;const e=d.x,i=d.y,s=0|e;s===u?(i<f?f=i:i>g&&(g=i),m=(x*m+e)/++x):(_(),t.lineTo(e,i),u=s,x=0,f=g=i),p=i}_()}function io(t){const e=t.options,i=e.borderDash&&e.borderDash.length;return!(t._decimated||t._loop||e.tension||"monotone"===e.cubicInterpolationMode||e.stepped||i)?eo:to}const so="function"==typeof Path2D;function no(t,e,i,s){so&&!e.options.segment?function(t,e,i,s){let n=e._path;n||(n=e._path=new Path2D,e.path(n,i,s)&&n.closePath()),Jn(t,e.options),t.stroke(n)}(t,e,i,s):function(t,e,i,s){const{segments:n,options:o}=e,a=io(e);for(const r of n)Jn(t,o,r.style),t.beginPath(),a(t,e,r,{start:i,end:i+s-1})&&t.closePath(),t.stroke()}(t,e,i,s)}class oo extends $s{static id="line";static defaults={borderCapStyle:"butt",borderDash:[],borderDashOffset:0,borderJoinStyle:"miter",borderWidth:3,capBezierPoints:!0,cubicInterpolationMode:"default",fill:!1,spanGaps:!1,stepped:!1,tension:0};static defaultRoutes={backgroundColor:"backgroundColor",borderColor:"borderColor"};static descriptors={_scriptable:!0,_indexable:t=>"borderDash"!==t&&"fill"!==t};constructor(t){super(),this.animated=!0,this.options=void 0,this._chart=void 0,this._loop=void 0,this._fullLoop=void 0,this._path=void 0,this._points=void 0,this._segments=void 0,this._decimated=!1,this._pointsUpdated=!1,this._datasetIndex=void 0,t&&Object.assign(this,t)}updateControlPoints(t,e){const i=this.options;if((i.tension||"monotone"===i.cubicInterpolationMode)&&!i.stepped&&!this._pointsUpdated){const s=i.spanGaps?this._loop:this._fullLoop;hi(this._points,i,t,s,e),this._pointsUpdated=!0}}set points(t){this._points=t,delete this._segments,delete this._path,this._pointsUpdated=!1}get points(){return this._points}get segments(){return this._segments||(this._segments=zi(this,this.options.segment))}first(){const t=this.segments,e=this.points;return t.length&&e[t[0].start]}last(){const t=this.segments,e=this.points,i=t.length;return i&&e[t[i-1].end]}interpolate(t,e){const i=this.options,s=t[e],n=this.points,o=Ii(this,{property:e,start:s,end:s});if(!o.length)return;const a=[],r=function(t){return t.stepped?pi:t.tension||"monotone"===t.cubicInterpolationMode?mi:gi}(i);let l,h;for(l=0,h=o.length;l<h;++l){const{start:h,end:c}=o[l],d=n[h],u=n[c];if(d===u){a.push(d);continue}const f=r(d,u,Math.abs((s-d[e])/(u[e]-d[e])),i.stepped);f[e]=t[e],a.push(f)}return 1===a.length?a[0]:a}pathSegment(t,e,i){return io(this)(t,this,e,i)}path(t,e,i){const s=this.segments,n=io(this);let o=this._loop;e=e||0,i=i||this.points.length-e;for(const a of s)o&=n(t,this,a,{start:e,end:e+i-1});return!!o}draw(t,e,i,s){const n=this.options||{};(this.points||[]).length&&n.borderWidth&&(t.save(),no(t,this,i,s),t.restore()),this.animated&&(this._pointsUpdated=!1,this._path=void 0)}}function ao(t,e,i,s){const n=t.options,{[i]:o}=t.getProps([i],s);return Math.abs(e-o)<n.radius+n.hitRadius}function ro(t,e){const{x:i,y:s,base:n,width:o,height:a}=t.getProps(["x","y","base","width","height"],e);let r,l,h,c,d;return t.horizontal?(d=a/2,r=Math.min(i,n),l=Math.max(i,n),h=s-d,c=s+d):(d=o/2,r=i-d,l=i+d,h=Math.min(s,n),c=Math.max(s,n)),{left:r,top:h,right:l,bottom:c}}function lo(t,e,i,s){return t?0:Z(e,i,s)}function ho(t){const e=ro(t),i=e.right-e.left,s=e.bottom-e.top,n=function(t,e,i){const s=t.options.borderWidth,n=t.borderSkipped,o=Mi(s);return{t:lo(n.top,o.top,0,i),r:lo(n.right,o.right,0,e),b:lo(n.bottom,o.bottom,0,i),l:lo(n.left,o.left,0,e)}}(t,i/2,s/2),a=function(t,e,i){const{enableBorderRadius:s}=t.getProps(["enableBorderRadius"]),n=t.options.borderRadius,a=wi(n),r=Math.min(e,i),l=t.borderSkipped,h=s||o(n);return{topLeft:lo(!h||l.top||l.left,a.topLeft,0,r),topRight:lo(!h||l.top||l.right,a.topRight,0,r),bottomLeft:lo(!h||l.bottom||l.left,a.bottomLeft,0,r),bottomRight:lo(!h||l.bottom||l.right,a.bottomRight,0,r)}}(t,i/2,s/2);return{outer:{x:e.left,y:e.top,w:i,h:s,radius:a},inner:{x:e.left+n.l,y:e.top+n.t,w:i-n.l-n.r,h:s-n.t-n.b,radius:{topLeft:Math.max(0,a.topLeft-Math.max(n.t,n.l)),topRight:Math.max(0,a.topRight-Math.max(n.t,n.r)),bottomLeft:Math.max(0,a.bottomLeft-Math.max(n.b,n.l)),bottomRight:Math.max(0,a.bottomRight-Math.max(n.b,n.r))}}}}function co(t,e,i,s){const n=null===e,o=null===i,a=t&&!(n&&o)&&ro(t,s);return a&&(n||tt(e,a.left,a.right))&&(o||tt(i,a.top,a.bottom))}function uo(t,e){t.rect(e.x,e.y,e.w,e.h)}function fo(t,e,i={}){const s=t.x!==i.x?-e:0,n=t.y!==i.y?-e:0,o=(t.x+t.w!==i.x+i.w?e:0)-s,a=(t.y+t.h!==i.y+i.h?e:0)-n;return{x:t.x+s,y:t.y+n,w:t.w+o,h:t.h+a,radius:t.radius}}var go=Object.freeze({__proto__:null,ArcElement:class extends $s{static id="arc";static defaults={borderAlign:"center",borderColor:"#fff",borderDash:[],borderDashOffset:0,borderJoinStyle:void 0,borderRadius:0,borderWidth:2,offset:0,spacing:0,angle:void 0,circular:!0,selfJoin:!1};static defaultRoutes={backgroundColor:"backgroundColor"};static descriptors={_scriptable:!0,_indexable:t=>"borderDash"!==t};circumference;endAngle;fullCircles;innerRadius;outerRadius;pixelMargin;startAngle;constructor(t){super(),this.options=void 0,this.circumference=void 0,this.startAngle=void 0,this.endAngle=void 0,this.innerRadius=void 0,this.outerRadius=void 0,this.pixelMargin=0,this.fullCircles=0,t&&Object.assign(this,t)}inRange(t,e,i){const s=this.getProps(["x","y"],i),{angle:n,distance:o}=X(s,{x:t,y:e}),{startAngle:a,endAngle:r,innerRadius:h,outerRadius:c,circumference:d}=this.getProps(["startAngle","endAngle","innerRadius","outerRadius","circumference"],i),u=(this.options.spacing+this.options.borderWidth)/2,f=l(d,r-a),g=J(n,a,r)&&a!==r,p=f>=O||g,m=tt(o,h+u,c+u);return p&&m}getCenterPoint(t){const{x:e,y:i,startAngle:s,endAngle:n,innerRadius:o,outerRadius:a}=this.getProps(["x","y","startAngle","endAngle","innerRadius","outerRadius"],t),{offset:r,spacing:l}=this.options,h=(s+n)/2,c=(o+a+l+r)/2;return{x:e+Math.cos(h)*c,y:i+Math.sin(h)*c}}tooltipPosition(t){return this.getCenterPoint(t)}draw(t){const{options:e,circumference:i}=this,s=(e.offset||0)/4,n=(e.spacing||0)/2,o=e.circular;if(this.pixelMargin="inner"===e.borderAlign?.33:0,this.fullCircles=i>O?Math.floor(i/O):0,0===i||this.innerRadius<0||this.outerRadius<0)return;t.save();const a=(this.startAngle+this.endAngle)/2;t.translate(Math.cos(a)*s,Math.sin(a)*s);const r=s*(1-Math.sin(Math.min(C,i||0)));t.fillStyle=e.backgroundColor,t.strokeStyle=e.borderColor,function(t,e,i,s,n){const{fullCircles:o,startAngle:a,circumference:r}=e;let l=e.endAngle;if(o){Kn(t,e,i,s,l,n);for(let e=0;e<o;++e)t.fill();isNaN(r)||(l=a+(r%O||O))}Kn(t,e,i,s,l,n),t.fill()}(t,this,r,n,o),Gn(t,this,r,n,o),t.restore()}},BarElement:class extends $s{static id="bar";static defaults={borderSkipped:"start",borderWidth:0,borderRadius:0,inflateAmount:"auto",pointStyle:void 0};static defaultRoutes={backgroundColor:"backgroundColor",borderColor:"borderColor"};constructor(t){super(),this.options=void 0,this.horizontal=void 0,this.base=void 0,this.width=void 0,this.height=void 0,this.inflateAmount=void 0,t&&Object.assign(this,t)}draw(t){const{inflateAmount:e,options:{borderColor:i,backgroundColor:s}}=this,{inner:n,outer:o}=ho(this),a=(r=o.radius).topLeft||r.topRight||r.bottomLeft||r.bottomRight?He:uo;var r;t.save(),o.w===n.w&&o.h===n.h||(t.beginPath(),a(t,fo(o,e,n)),t.clip(),a(t,fo(n,-e,o)),t.fillStyle=i,t.fill("evenodd")),t.beginPath(),a(t,fo(n,e)),t.fillStyle=s,t.fill(),t.restore()}inRange(t,e,i){return co(this,t,e,i)}inXRange(t,e){return co(this,t,null,e)}inYRange(t,e){return co(this,null,t,e)}getCenterPoint(t){const{x:e,y:i,base:s,horizontal:n}=this.getProps(["x","y","base","horizontal"],t);return{x:n?(e+s)/2:e,y:n?i:(i+s)/2}}getRange(t){return"x"===t?this.width/2:this.height/2}},LineElement:oo,PointElement:class extends $s{static id="point";parsed;skip;stop;static defaults={borderWidth:1,hitRadius:1,hoverBorderWidth:1,hoverRadius:4,pointStyle:"circle",radius:3,rotation:0};static defaultRoutes={backgroundColor:"backgroundColor",borderColor:"borderColor"};constructor(t){super(),this.options=void 0,this.parsed=void 0,this.skip=void 0,this.stop=void 0,t&&Object.assign(this,t)}inRange(t,e,i){const s=this.options,{x:n,y:o}=this.getProps(["x","y"],i);return Math.pow(t-n,2)+Math.pow(e-o,2)<Math.pow(s.hitRadius+s.radius,2)}inXRange(t,e){return ao(this,t,"x",e)}inYRange(t,e){return ao(this,t,"y",e)}getCenterPoint(t){const{x:e,y:i}=this.getProps(["x","y"],t);return{x:e,y:i}}size(t){let e=(t=t||this.options||{}).radius||0;e=Math.max(e,e&&t.hoverRadius||0);return 2*(e+(e&&t.borderWidth||0))}draw(t,e){const i=this.options;this.skip||i.radius<.1||!Re(this,e,this.size(i)/2)||(t.strokeStyle=i.borderColor,t.lineWidth=i.borderWidth,t.fillStyle=i.backgroundColor,Le(t,i,this.x,this.y))}getRange(){const t=this.options||{};return t.radius+t.hitRadius}}});function po(t,e,i,s){const n=t.indexOf(e);if(-1===n)return((t,e,i,s)=>("string"==typeof e?(i=t.push(e)-1,s.unshift({index:i,label:e})):isNaN(e)&&(i=null),i))(t,e,i,s);return n!==t.lastIndexOf(e)?i:n}function mo(t){const e=this.getLabels();return t>=0&&t<e.length?e[t]:t}function xo(t,e,{horizontal:i,minRotation:s}){const n=$(s),o=(i?Math.sin(n):Math.cos(n))||.001,a=.75*e*(""+t).length;return Math.min(e/o,a)}class bo extends tn{constructor(t){super(t),this.start=void 0,this.end=void 0,this._startValue=void 0,this._endValue=void 0,this._valueRange=0}parse(t,e){return s(t)||("number"==typeof t||t instanceof Number)&&!isFinite(+t)?null:+t}handleTickRangeOptions(){const{beginAtZero:t}=this.options,{minDefined:e,maxDefined:i}=this.getUserBounds();let{min:s,max:n}=this;const o=t=>s=e?s:t,a=t=>n=i?n:t;if(t){const t=F(s),e=F(n);t<0&&e<0?a(0):t>0&&e>0&&o(0)}if(s===n){let e=0===n?1:Math.abs(.05*n);a(n+e),t||o(s-e)}this.min=s,this.max=n}getTickLimit(){const t=this.options.ticks;let e,{maxTicksLimit:i,stepSize:s}=t;return s?(e=Math.ceil(this.max/s)-Math.floor(this.min/s)+1,e>1e3&&(console.warn(`scales.${this.id}.ticks.stepSize: ${s} would result generating up to ${e} ticks. Limiting to 1000.`),e=1e3)):(e=this.computeTickLimit(),i=i||11),i&&(e=Math.min(i,e)),e}computeTickLimit(){return Number.POSITIVE_INFINITY}buildTicks(){const t=this.options,e=t.ticks;let i=this.getTickLimit();i=Math.max(2,i);const n=function(t,e){const i=[],{bounds:n,step:o,min:a,max:r,precision:l,count:h,maxTicks:c,maxDigits:d,includeBounds:u}=t,f=o||1,g=c-1,{min:p,max:m}=e,x=!s(a),b=!s(r),_=!s(h),y=(m-p)/(d+1);let v,M,w,k,S=B((m-p)/g/f)*f;if(S<1e-14&&!x&&!b)return[{value:p},{value:m}];k=Math.ceil(m/S)-Math.floor(p/S),k>g&&(S=B(k*S/g/f)*f),s(l)||(v=Math.pow(10,l),S=Math.ceil(S*v)/v),"ticks"===n?(M=Math.floor(p/S)*S,w=Math.ceil(m/S)*S):(M=p,w=m),x&&b&&o&&H((r-a)/o,S/1e3)?(k=Math.round(Math.min((r-a)/S,c)),S=(r-a)/k,M=a,w=r):_?(M=x?a:M,w=b?r:w,k=h-1,S=(w-M)/k):(k=(w-M)/S,k=V(k,Math.round(k),S/1e3)?Math.round(k):Math.ceil(k));const P=Math.max(U(S),U(M));v=Math.pow(10,s(l)?P:l),M=Math.round(M*v)/v,w=Math.round(w*v)/v;let D=0;for(x&&(u&&M!==a?(i.push({value:a}),M<a&&D++,V(Math.round((M+D*S)*v)/v,a,xo(a,y,t))&&D++):M<a&&D++);D<k;++D){const t=Math.round((M+D*S)*v)/v;if(b&&t>r)break;i.push({value:t})}return b&&u&&w!==r?i.length&&V(i[i.length-1].value,r,xo(r,y,t))?i[i.length-1].value=r:i.push({value:r}):b&&w!==r||i.push({value:w}),i}({maxTicks:i,bounds:t.bounds,min:t.min,max:t.max,precision:e.precision,step:e.stepSize,count:e.count,maxDigits:this._maxDigits(),horizontal:this.isHorizontal(),minRotation:e.minRotation||0,includeBounds:!1!==e.includeBounds},this._range||this);return"ticks"===t.bounds&&j(n,this,"value"),t.reverse?(n.reverse(),this.start=this.max,this.end=this.min):(this.start=this.min,this.end=this.max),n}configure(){const t=this.ticks;let e=this.min,i=this.max;if(super.configure(),this.options.offset&&t.length){const s=(i-e)/Math.max(t.length-1,1)/2;e-=s,i+=s}this._startValue=e,this._endValue=i,this._valueRange=i-e}getLabelForValue(t){return ne(t,this.chart.options.locale,this.options.ticks.format)}}class _o extends bo{static id="linear";static defaults={ticks:{callback:ae.formatters.numeric}};determineDataLimits(){const{min:t,max:e}=this.getMinMax(!0);this.min=a(t)?t:0,this.max=a(e)?e:1,this.handleTickRangeOptions()}computeTickLimit(){const t=this.isHorizontal(),e=t?this.width:this.height,i=$(this.options.ticks.minRotation),s=(t?Math.sin(i):Math.cos(i))||.001,n=this._resolveTickFontOptions(0);return Math.ceil(e/Math.min(40,n.lineHeight/s))}getPixelForValue(t){return null===t?NaN:this.getPixelForDecimal((t-this._startValue)/this._valueRange)}getValueForPixel(t){return this._startValue+this.getDecimalForPixel(t)*this._valueRange}}const yo=t=>Math.floor(z(t)),vo=(t,e)=>Math.pow(10,yo(t)+e);function Mo(t){return 1===t/Math.pow(10,yo(t))}function wo(t,e,i){const s=Math.pow(10,i),n=Math.floor(t/s);return Math.ceil(e/s)-n}function ko(t,{min:e,max:i}){e=r(t.min,e);const s=[],n=yo(e);let o=function(t,e){let i=yo(e-t);for(;wo(t,e,i)>10;)i++;for(;wo(t,e,i)<10;)i--;return Math.min(i,yo(t))}(e,i),a=o<0?Math.pow(10,Math.abs(o)):1;const l=Math.pow(10,o),h=n>o?Math.pow(10,n):0,c=Math.round((e-h)*a)/a,d=Math.floor((e-h)/l/10)*l*10;let u=Math.floor((c-d)/Math.pow(10,o)),f=r(t.min,Math.round((h+d+u*Math.pow(10,o))*a)/a);for(;f<i;)s.push({value:f,major:Mo(f),significand:u}),u>=10?u=u<15?15:20:u++,u>=20&&(o++,u=2,a=o>=0?1:a),f=Math.round((h+d+u*Math.pow(10,o))*a)/a;const g=r(t.max,f);return s.push({value:g,major:Mo(g),significand:u}),s}class So extends tn{static id="logarithmic";static defaults={ticks:{callback:ae.formatters.logarithmic,major:{enabled:!0}}};constructor(t){super(t),this.start=void 0,this.end=void 0,this._startValue=void 0,this._valueRange=0}parse(t,e){const i=bo.prototype.parse.apply(this,[t,e]);if(0!==i)return a(i)&&i>0?i:null;this._zero=!0}determineDataLimits(){const{min:t,max:e}=this.getMinMax(!0);this.min=a(t)?Math.max(0,t):null,this.max=a(e)?Math.max(0,e):null,this.options.beginAtZero&&(this._zero=!0),this._zero&&this.min!==this._suggestedMin&&!a(this._userMin)&&(this.min=t===vo(this.min,0)?vo(this.min,-1):vo(this.min,0)),this.handleTickRangeOptions()}handleTickRangeOptions(){const{minDefined:t,maxDefined:e}=this.getUserBounds();let i=this.min,s=this.max;const n=e=>i=t?i:e,o=t=>s=e?s:t;i===s&&(i<=0?(n(1),o(10)):(n(vo(i,-1)),o(vo(s,1)))),i<=0&&n(vo(s,-1)),s<=0&&o(vo(i,1)),this.min=i,this.max=s}buildTicks(){const t=this.options,e=ko({min:this._userMin,max:this._userMax},this);return"ticks"===t.bounds&&j(e,this,"value"),t.reverse?(e.reverse(),this.start=this.max,this.end=this.min):(this.start=this.min,this.end=this.max),e}getLabelForValue(t){return void 0===t?"0":ne(t,this.chart.options.locale,this.options.ticks.format)}configure(){const t=this.min;super.configure(),this._startValue=z(t),this._valueRange=z(this.max)-z(t)}getPixelForValue(t){return void 0!==t&&0!==t||(t=this.min),null===t||isNaN(t)?NaN:this.getPixelForDecimal(t===this.min?0:(z(t)-this._startValue)/this._valueRange)}getValueForPixel(t){const e=this.getDecimalForPixel(t);return Math.pow(10,this._startValue+e*this._valueRange)}}function Po(t){const e=t.ticks;if(e.display&&t.display){const t=ki(e.backdropPadding);return l(e.font&&e.font.size,ue.font.size)+t.height}return 0}function Do(t,e,i,s,n){return t===s||t===n?{start:e-i/2,end:e+i/2}:t<s||t>n?{start:e-i,end:e}:{start:e,end:e+i}}function Co(t){const e={l:t.left+t._padding.left,r:t.right-t._padding.right,t:t.top+t._padding.top,b:t.bottom-t._padding.bottom},i=Object.assign({},e),s=[],o=[],a=t._pointLabels.length,r=t.options.pointLabels,l=r.centerPointLabels?C/a:0;for(let u=0;u<a;u++){const a=r.setContext(t.getPointLabelContext(u));o[u]=a.padding;const f=t.getPointPosition(u,t.drawingArea+o[u],l),g=Si(a.font),p=(h=t.ctx,c=g,d=n(d=t._pointLabels[u])?d:[d],{w:Oe(h,c.string,d),h:d.length*c.lineHeight});s[u]=p;const m=G(t.getIndexAngle(u)+l),x=Math.round(Y(m));Oo(i,e,m,Do(x,f.x,p.w,0,180),Do(x,f.y,p.h,90,270))}var h,c,d;t.setCenterPoint(e.l-i.l,i.r-e.r,e.t-i.t,i.b-e.b),t._pointLabelItems=function(t,e,i){const s=[],n=t._pointLabels.length,o=t.options,{centerPointLabels:a,display:r}=o.pointLabels,l={extra:Po(o)/2,additionalAngle:a?C/n:0};let h;for(let o=0;o<n;o++){l.padding=i[o],l.size=e[o];const n=Ao(t,o,l);s.push(n),"auto"===r&&(n.visible=To(n,h),n.visible&&(h=n))}return s}(t,s,o)}function Oo(t,e,i,s,n){const o=Math.abs(Math.sin(i)),a=Math.abs(Math.cos(i));let r=0,l=0;s.start<e.l?(r=(e.l-s.start)/o,t.l=Math.min(t.l,e.l-r)):s.end>e.r&&(r=(s.end-e.r)/o,t.r=Math.max(t.r,e.r+r)),n.start<e.t?(l=(e.t-n.start)/a,t.t=Math.min(t.t,e.t-l)):n.end>e.b&&(l=(n.end-e.b)/a,t.b=Math.max(t.b,e.b+l))}function Ao(t,e,i){const s=t.drawingArea,{extra:n,additionalAngle:o,padding:a,size:r}=i,l=t.getPointPosition(e,s+n+a,o),h=Math.round(Y(G(l.angle+E))),c=function(t,e,i){90===i||270===i?t-=e/2:(i>270||i<90)&&(t-=e);return t}(l.y,r.h,h),d=function(t){if(0===t||180===t)return"center";if(t<180)return"left";return"right"}(h),u=function(t,e,i){"right"===i?t-=e:"center"===i&&(t-=e/2);return t}(l.x,r.w,d);return{visible:!0,x:l.x,y:c,textAlign:d,left:u,top:c,right:u+r.w,bottom:c+r.h}}function To(t,e){if(!e)return!0;const{left:i,top:s,right:n,bottom:o}=t;return!(Re({x:i,y:s},e)||Re({x:i,y:o},e)||Re({x:n,y:s},e)||Re({x:n,y:o},e))}function Lo(t,e,i){const{left:n,top:o,right:a,bottom:r}=i,{backdropColor:l}=e;if(!s(l)){const i=wi(e.borderRadius),s=ki(e.backdropPadding);t.fillStyle=l;const h=n-s.left,c=o-s.top,d=a-n+s.width,u=r-o+s.height;Object.values(i).some((t=>0!==t))?(t.beginPath(),He(t,{x:h,y:c,w:d,h:u,radius:i}),t.fill()):t.fillRect(h,c,d,u)}}function Eo(t,e,i,s){const{ctx:n}=t;if(i)n.arc(t.xCenter,t.yCenter,e,0,O);else{let i=t.getPointPosition(0,e);n.moveTo(i.x,i.y);for(let o=1;o<s;o++)i=t.getPointPosition(o,e),n.lineTo(i.x,i.y)}}class Ro extends bo{static id="radialLinear";static defaults={display:!0,animate:!0,position:"chartArea",angleLines:{display:!0,lineWidth:1,borderDash:[],borderDashOffset:0},grid:{circular:!1},startAngle:0,ticks:{showLabelBackdrop:!0,callback:ae.formatters.numeric},pointLabels:{backdropColor:void 0,backdropPadding:2,display:!0,font:{size:10},callback:t=>t,padding:5,centerPointLabels:!1}};static defaultRoutes={"angleLines.color":"borderColor","pointLabels.color":"color","ticks.color":"color"};static descriptors={angleLines:{_fallback:"grid"}};constructor(t){super(t),this.xCenter=void 0,this.yCenter=void 0,this.drawingArea=void 0,this._pointLabels=[],this._pointLabelItems=[]}setDimensions(){const t=this._padding=ki(Po(this.options)/2),e=this.width=this.maxWidth-t.width,i=this.height=this.maxHeight-t.height;this.xCenter=Math.floor(this.left+e/2+t.left),this.yCenter=Math.floor(this.top+i/2+t.top),this.drawingArea=Math.floor(Math.min(e,i)/2)}determineDataLimits(){const{min:t,max:e}=this.getMinMax(!1);this.min=a(t)&&!isNaN(t)?t:0,this.max=a(e)&&!isNaN(e)?e:0,this.handleTickRangeOptions()}computeTickLimit(){return Math.ceil(this.drawingArea/Po(this.options))}generateTickLabels(t){bo.prototype.generateTickLabels.call(this,t),this._pointLabels=this.getLabels().map(((t,e)=>{const i=d(this.options.pointLabels.callback,[t,e],this);return i||0===i?i:""})).filter(((t,e)=>this.chart.getDataVisibility(e)))}fit(){const t=this.options;t.display&&t.pointLabels.display?Co(this):this.setCenterPoint(0,0,0,0)}setCenterPoint(t,e,i,s){this.xCenter+=Math.floor((t-e)/2),this.yCenter+=Math.floor((i-s)/2),this.drawingArea-=Math.min(this.drawingArea/2,Math.max(t,e,i,s))}getIndexAngle(t){return G(t*(O/(this._pointLabels.length||1))+$(this.options.startAngle||0))}getDistanceFromCenterForValue(t){if(s(t))return NaN;const e=this.drawingArea/(this.max-this.min);return this.options.reverse?(this.max-t)*e:(t-this.min)*e}getValueForDistanceFromCenter(t){if(s(t))return NaN;const e=t/(this.drawingArea/(this.max-this.min));return this.options.reverse?this.max-e:this.min+e}getPointLabelContext(t){const e=this._pointLabels||[];if(t>=0&&t<e.length){const i=e[t];return function(t,e,i){return Ci(t,{label:i,index:e,type:"pointLabel"})}(this.getContext(),t,i)}}getPointPosition(t,e,i=0){const s=this.getIndexAngle(t)-E+i;return{x:Math.cos(s)*e+this.xCenter,y:Math.sin(s)*e+this.yCenter,angle:s}}getPointPositionForValue(t,e){return this.getPointPosition(t,this.getDistanceFromCenterForValue(e))}getBasePosition(t){return this.getPointPositionForValue(t||0,this.getBaseValue())}getPointLabelPosition(t){const{left:e,top:i,right:s,bottom:n}=this._pointLabelItems[t];return{left:e,top:i,right:s,bottom:n}}drawBackground(){const{backgroundColor:t,grid:{circular:e}}=this.options;if(t){const i=this.ctx;i.save(),i.beginPath(),Eo(this,this.getDistanceFromCenterForValue(this._endValue),e,this._pointLabels.length),i.closePath(),i.fillStyle=t,i.fill(),i.restore()}}drawGrid(){const t=this.ctx,e=this.options,{angleLines:i,grid:s,border:n}=e,o=this._pointLabels.length;let a,r,l;if(e.pointLabels.display&&function(t,e){const{ctx:i,options:{pointLabels:s}}=t;for(let n=e-1;n>=0;n--){const e=t._pointLabelItems[n];if(!e.visible)continue;const o=s.setContext(t.getPointLabelContext(n));Lo(i,o,e);const a=Si(o.font),{x:r,y:l,textAlign:h}=e;Ne(i,t._pointLabels[n],r,l+a.lineHeight/2,a,{color:o.color,textAlign:h,textBaseline:"middle"})}}(this,o),s.display&&this.ticks.forEach(((t,e)=>{if(0!==e||0===e&&this.min<0){r=this.getDistanceFromCenterForValue(t.value);const i=this.getContext(e),a=s.setContext(i),l=n.setContext(i);!function(t,e,i,s,n){const o=t.ctx,a=e.circular,{color:r,lineWidth:l}=e;!a&&!s||!r||!l||i<0||(o.save(),o.strokeStyle=r,o.lineWidth=l,o.setLineDash(n.dash||[]),o.lineDashOffset=n.dashOffset,o.beginPath(),Eo(t,i,a,s),o.closePath(),o.stroke(),o.restore())}(this,a,r,o,l)}})),i.display){for(t.save(),a=o-1;a>=0;a--){const s=i.setContext(this.getPointLabelContext(a)),{color:n,lineWidth:o}=s;o&&n&&(t.lineWidth=o,t.strokeStyle=n,t.setLineDash(s.borderDash),t.lineDashOffset=s.borderDashOffset,r=this.getDistanceFromCenterForValue(e.reverse?this.min:this.max),l=this.getPointPosition(a,r),t.beginPath(),t.moveTo(this.xCenter,this.yCenter),t.lineTo(l.x,l.y),t.stroke())}t.restore()}}drawBorder(){}drawLabels(){const t=this.ctx,e=this.options,i=e.ticks;if(!i.display)return;const s=this.getIndexAngle(0);let n,o;t.save(),t.translate(this.xCenter,this.yCenter),t.rotate(s),t.textAlign="center",t.textBaseline="middle",this.ticks.forEach(((s,a)=>{if(0===a&&this.min>=0&&!e.reverse)return;const r=i.setContext(this.getContext(a)),l=Si(r.font);if(n=this.getDistanceFromCenterForValue(this.ticks[a].value),r.showLabelBackdrop){t.font=l.string,o=t.measureText(s.label).width,t.fillStyle=r.backdropColor;const e=ki(r.backdropPadding);t.fillRect(-o/2-e.left,-n-l.size/2-e.top,o+e.width,l.size+e.height)}Ne(t,s.label,0,-n,l,{color:r.color,strokeColor:r.textStrokeColor,strokeWidth:r.textStrokeWidth})})),t.restore()}drawTitle(){}}const Io={millisecond:{common:!0,size:1,steps:1e3},second:{common:!0,size:1e3,steps:60},minute:{common:!0,size:6e4,steps:60},hour:{common:!0,size:36e5,steps:24},day:{common:!0,size:864e5,steps:30},week:{common:!1,size:6048e5,steps:4},month:{common:!0,size:2628e6,steps:12},quarter:{common:!1,size:7884e6,steps:4},year:{common:!0,size:3154e7}},zo=Object.keys(Io);function Fo(t,e){return t-e}function Vo(t,e){if(s(e))return null;const i=t._adapter,{parser:n,round:o,isoWeekday:r}=t._parseOpts;let l=e;return"function"==typeof n&&(l=n(l)),a(l)||(l="string"==typeof n?i.parse(l,n):i.parse(l)),null===l?null:(o&&(l="week"!==o||!N(r)&&!0!==r?i.startOf(l,o):i.startOf(l,"isoWeek",r)),+l)}function Bo(t,e,i,s){const n=zo.length;for(let o=zo.indexOf(t);o<n-1;++o){const t=Io[zo[o]],n=t.steps?t.steps:Number.MAX_SAFE_INTEGER;if(t.common&&Math.ceil((i-e)/(n*t.size))<=s)return zo[o]}return zo[n-1]}function Wo(t,e,i){if(i){if(i.length){const{lo:s,hi:n}=et(i,e);t[i[s]>=e?i[s]:i[n]]=!0}}else t[e]=!0}function No(t,e,i){const s=[],n={},o=e.length;let a,r;for(a=0;a<o;++a)r=e[a],n[r]=a,s.push({value:r,major:!1});return 0!==o&&i?function(t,e,i,s){const n=t._adapter,o=+n.startOf(e[0].value,s),a=e[e.length-1].value;let r,l;for(r=o;r<=a;r=+n.add(r,1,s))l=i[r],l>=0&&(e[l].major=!0);return e}(t,s,n,i):s}class Ho extends tn{static id="time";static defaults={bounds:"data",adapters:{},time:{parser:!1,unit:!1,round:!1,isoWeekday:!1,minUnit:"millisecond",displayFormats:{}},ticks:{source:"auto",callback:!1,major:{enabled:!1}}};constructor(t){super(t),this._cache={data:[],labels:[],all:[]},this._unit="day",this._majorUnit=void 0,this._offsets={},this._normalized=!1,this._parseOpts=void 0}init(t,e={}){const i=t.time||(t.time={}),s=this._adapter=new In._date(t.adapters.date);s.init(e),b(i.displayFormats,s.formats()),this._parseOpts={parser:i.parser,round:i.round,isoWeekday:i.isoWeekday},super.init(t),this._normalized=e.normalized}parse(t,e){return void 0===t?null:Vo(this,t)}beforeLayout(){super.beforeLayout(),this._cache={data:[],labels:[],all:[]}}determineDataLimits(){const t=this.options,e=this._adapter,i=t.time.unit||"day";let{min:s,max:n,minDefined:o,maxDefined:r}=this.getUserBounds();function l(t){o||isNaN(t.min)||(s=Math.min(s,t.min)),r||isNaN(t.max)||(n=Math.max(n,t.max))}o&&r||(l(this._getLabelBounds()),"ticks"===t.bounds&&"labels"===t.ticks.source||l(this.getMinMax(!1))),s=a(s)&&!isNaN(s)?s:+e.startOf(Date.now(),i),n=a(n)&&!isNaN(n)?n:+e.endOf(Date.now(),i)+1,this.min=Math.min(s,n-1),this.max=Math.max(s+1,n)}_getLabelBounds(){const t=this.getLabelTimestamps();let e=Number.POSITIVE_INFINITY,i=Number.NEGATIVE_INFINITY;return t.length&&(e=t[0],i=t[t.length-1]),{min:e,max:i}}buildTicks(){const t=this.options,e=t.time,i=t.ticks,s="labels"===i.source?this.getLabelTimestamps():this._generate();"ticks"===t.bounds&&s.length&&(this.min=this._userMin||s[0],this.max=this._userMax||s[s.length-1]);const n=this.min,o=nt(s,n,this.max);return this._unit=e.unit||(i.autoSkip?Bo(e.minUnit,this.min,this.max,this._getLabelCapacity(n)):function(t,e,i,s,n){for(let o=zo.length-1;o>=zo.indexOf(i);o--){const i=zo[o];if(Io[i].common&&t._adapter.diff(n,s,i)>=e-1)return i}return zo[i?zo.indexOf(i):0]}(this,o.length,e.minUnit,this.min,this.max)),this._majorUnit=i.major.enabled&&"year"!==this._unit?function(t){for(let e=zo.indexOf(t)+1,i=zo.length;e<i;++e)if(Io[zo[e]].common)return zo[e]}(this._unit):void 0,this.initOffsets(s),t.reverse&&o.reverse(),No(this,o,this._majorUnit)}afterAutoSkip(){this.options.offsetAfterAutoskip&&this.initOffsets(this.ticks.map((t=>+t.value)))}initOffsets(t=[]){let e,i,s=0,n=0;this.options.offset&&t.length&&(e=this.getDecimalForValue(t[0]),s=1===t.length?1-e:(this.getDecimalForValue(t[1])-e)/2,i=this.getDecimalForValue(t[t.length-1]),n=1===t.length?i:(i-this.getDecimalForValue(t[t.length-2]))/2);const o=t.length<3?.5:.25;s=Z(s,0,o),n=Z(n,0,o),this._offsets={start:s,end:n,factor:1/(s+1+n)}}_generate(){const t=this._adapter,e=this.min,i=this.max,s=this.options,n=s.time,o=n.unit||Bo(n.minUnit,e,i,this._getLabelCapacity(e)),a=l(s.ticks.stepSize,1),r="week"===o&&n.isoWeekday,h=N(r)||!0===r,c={};let d,u,f=e;if(h&&(f=+t.startOf(f,"isoWeek",r)),f=+t.startOf(f,h?"day":o),t.diff(i,e,o)>1e5*a)throw new Error(e+" and "+i+" are too far apart with stepSize of "+a+" "+o);const g="data"===s.ticks.source&&this.getDataTimestamps();for(d=f,u=0;d<i;d=+t.add(d,a,o),u++)Wo(c,d,g);return d!==i&&"ticks"!==s.bounds&&1!==u||Wo(c,d,g),Object.keys(c).sort(Fo).map((t=>+t))}getLabelForValue(t){const e=this._adapter,i=this.options.time;return i.tooltipFormat?e.format(t,i.tooltipFormat):e.format(t,i.displayFormats.datetime)}format(t,e){const i=this.options.time.displayFormats,s=this._unit,n=e||i[s];return this._adapter.format(t,n)}_tickFormatFunction(t,e,i,s){const n=this.options,o=n.ticks.callback;if(o)return d(o,[t,e,i],this);const a=n.time.displayFormats,r=this._unit,l=this._majorUnit,h=r&&a[r],c=l&&a[l],u=i[e],f=l&&c&&u&&u.major;return this._adapter.format(t,s||(f?c:h))}generateTickLabels(t){let e,i,s;for(e=0,i=t.length;e<i;++e)s=t[e],s.label=this._tickFormatFunction(s.value,e,t)}getDecimalForValue(t){return null===t?NaN:(t-this.min)/(this.max-this.min)}getPixelForValue(t){const e=this._offsets,i=this.getDecimalForValue(t);return this.getPixelForDecimal((e.start+i)*e.factor)}getValueForPixel(t){const e=this._offsets,i=this.getDecimalForPixel(t)/e.factor-e.end;return this.min+i*(this.max-this.min)}_getLabelSize(t){const e=this.options.ticks,i=this.ctx.measureText(t).width,s=$(this.isHorizontal()?e.maxRotation:e.minRotation),n=Math.cos(s),o=Math.sin(s),a=this._resolveTickFontOptions(0).size;return{w:i*n+a*o,h:i*o+a*n}}_getLabelCapacity(t){const e=this.options.time,i=e.displayFormats,s=i[e.unit]||i.millisecond,n=this._tickFormatFunction(t,0,No(this,[t],this._majorUnit),s),o=this._getLabelSize(n),a=Math.floor(this.isHorizontal()?this.width/o.w:this.height/o.h)-1;return a>0?a:1}getDataTimestamps(){let t,e,i=this._cache.data||[];if(i.length)return i;const s=this.getMatchingVisibleMetas();if(this._normalized&&s.length)return this._cache.data=s[0].controller.getAllParsedValues(this);for(t=0,e=s.length;t<e;++t)i=i.concat(s[t].controller.getAllParsedValues(this));return this._cache.data=this.normalize(i)}getLabelTimestamps(){const t=this._cache.labels||[];let e,i;if(t.length)return t;const s=this.getLabels();for(e=0,i=s.length;e<i;++e)t.push(Vo(this,s[e]));return this._cache.labels=this._normalized?t:this.normalize(t)}normalize(t){return lt(t.sort(Fo))}}function jo(t,e,i){let s,n,o,a,r=0,l=t.length-1;i?(e>=t[r].pos&&e<=t[l].pos&&({lo:r,hi:l}=it(t,"pos",e)),({pos:s,time:o}=t[r]),({pos:n,time:a}=t[l])):(e>=t[r].time&&e<=t[l].time&&({lo:r,hi:l}=it(t,"time",e)),({time:s,pos:o}=t[r]),({time:n,pos:a}=t[l]));const h=n-s;return h?o+(a-o)*(e-s)/h:o}var $o=Object.freeze({__proto__:null,CategoryScale:class extends tn{static id="category";static defaults={ticks:{callback:mo}};constructor(t){super(t),this._startValue=void 0,this._valueRange=0,this._addedLabels=[]}init(t){const e=this._addedLabels;if(e.length){const t=this.getLabels();for(const{index:i,label:s}of e)t[i]===s&&t.splice(i,1);this._addedLabels=[]}super.init(t)}parse(t,e){if(s(t))return null;const i=this.getLabels();return((t,e)=>null===t?null:Z(Math.round(t),0,e))(e=isFinite(e)&&i[e]===t?e:po(i,t,l(e,t),this._addedLabels),i.length-1)}determineDataLimits(){const{minDefined:t,maxDefined:e}=this.getUserBounds();let{min:i,max:s}=this.getMinMax(!0);"ticks"===this.options.bounds&&(t||(i=0),e||(s=this.getLabels().length-1)),this.min=i,this.max=s}buildTicks(){const t=this.min,e=this.max,i=this.options.offset,s=[];let n=this.getLabels();n=0===t&&e===n.length-1?n:n.slice(t,e+1),this._valueRange=Math.max(n.length-(i?0:1),1),this._startValue=this.min-(i?.5:0);for(let i=t;i<=e;i++)s.push({value:i});return s}getLabelForValue(t){return mo.call(this,t)}configure(){super.configure(),this.isHorizontal()||(this._reversePixels=!this._reversePixels)}getPixelForValue(t){return"number"!=typeof t&&(t=this.parse(t)),null===t?NaN:this.getPixelForDecimal((t-this._startValue)/this._valueRange)}getPixelForTick(t){const e=this.ticks;return t<0||t>e.length-1?null:this.getPixelForValue(e[t].value)}getValueForPixel(t){return Math.round(this._startValue+this.getDecimalForPixel(t)*this._valueRange)}getBasePixel(){return this.bottom}},LinearScale:_o,LogarithmicScale:So,RadialLinearScale:Ro,TimeScale:Ho,TimeSeriesScale:class extends Ho{static id="timeseries";static defaults=Ho.defaults;constructor(t){super(t),this._table=[],this._minPos=void 0,this._tableRange=void 0}initOffsets(){const t=this._getTimestampsForTable(),e=this._table=this.buildLookupTable(t);this._minPos=jo(e,this.min),this._tableRange=jo(e,this.max)-this._minPos,super.initOffsets(t)}buildLookupTable(t){const{min:e,max:i}=this,s=[],n=[];let o,a,r,l,h;for(o=0,a=t.length;o<a;++o)l=t[o],l>=e&&l<=i&&s.push(l);if(s.length<2)return[{time:e,pos:0},{time:i,pos:1}];for(o=0,a=s.length;o<a;++o)h=s[o+1],r=s[o-1],l=s[o],Math.round((h+r)/2)!==l&&n.push({time:l,pos:o/(a-1)});return n}_generate(){const t=this.min,e=this.max;let i=super.getDataTimestamps();return i.includes(t)&&i.length||i.splice(0,0,t),i.includes(e)&&1!==i.length||i.push(e),i.sort(((t,e)=>t-e))}_getTimestampsForTable(){let t=this._cache.all||[];if(t.length)return t;const e=this.getDataTimestamps(),i=this.getLabelTimestamps();return t=e.length&&i.length?this.normalize(e.concat(i)):e.length?e:i,t=this._cache.all=t,t}getDecimalForValue(t){return(jo(this._table,t)-this._minPos)/this._tableRange}getValueForPixel(t){const e=this._offsets,i=this.getDecimalForPixel(t)/e.factor-e.end;return jo(this._table,i*this._tableRange+this._minPos,!0)}}});const Yo=["rgb(54, 162, 235)","rgb(255, 99, 132)","rgb(255, 159, 64)","rgb(255, 205, 86)","rgb(75, 192, 192)","rgb(153, 102, 255)","rgb(201, 203, 207)"],Uo=Yo.map((t=>t.replace("rgb(","rgba(").replace(")",", 0.5)")));function Xo(t){return Yo[t%Yo.length]}function qo(t){return Uo[t%Uo.length]}function Ko(t){let e=0;return(i,s)=>{const n=t.getDatasetMeta(s).controller;n instanceof $n?e=function(t,e){return t.backgroundColor=t.data.map((()=>Xo(e++))),e}(i,e):n instanceof Yn?e=function(t,e){return t.backgroundColor=t.data.map((()=>qo(e++))),e}(i,e):n&&(e=function(t,e){return t.borderColor=Xo(e),t.backgroundColor=qo(e),++e}(i,e))}}function Go(t){let e;for(e in t)if(t[e].borderColor||t[e].backgroundColor)return!0;return!1}var Jo={id:"colors",defaults:{enabled:!0,forceOverride:!1},beforeLayout(t,e,i){if(!i.enabled)return;const{data:{datasets:s},options:n}=t.config,{elements:o}=n,a=Go(s)||(r=n)&&(r.borderColor||r.backgroundColor)||o&&Go(o)||"rgba(0,0,0,0.1)"!==ue.borderColor||"rgba(0,0,0,0.1)"!==ue.backgroundColor;var r;if(!i.forceOverride&&a)return;const l=Ko(t);s.forEach(l)}};function Zo(t){if(t._decimated){const e=t._data;delete t._decimated,delete t._data,Object.defineProperty(t,"data",{configurable:!0,enumerable:!0,writable:!0,value:e})}}function Qo(t){t.data.datasets.forEach((t=>{Zo(t)}))}var ta={id:"decimation",defaults:{algorithm:"min-max",enabled:!1},beforeElementsUpdate:(t,e,i)=>{if(!i.enabled)return void Qo(t);const n=t.width;t.data.datasets.forEach(((e,o)=>{const{_data:a,indexAxis:r}=e,l=t.getDatasetMeta(o),h=a||e.data;if("y"===Pi([r,t.options.indexAxis]))return;if(!l.controller.supportsDecimation)return;const c=t.scales[l.xAxisID];if("linear"!==c.type&&"time"!==c.type)return;if(t.options.parsing)return;let{start:d,count:u}=function(t,e){const i=e.length;let s,n=0;const{iScale:o}=t,{min:a,max:r,minDefined:l,maxDefined:h}=o.getUserBounds();return l&&(n=Z(it(e,o.axis,a).lo,0,i-1)),s=h?Z(it(e,o.axis,r).hi+1,n,i)-n:i-n,{start:n,count:s}}(l,h);if(u<=(i.threshold||4*n))return void Zo(e);let f;switch(s(a)&&(e._data=h,delete e.data,Object.defineProperty(e,"data",{configurable:!0,enumerable:!0,get:function(){return this._decimated},set:function(t){this._data=t}})),i.algorithm){case"lttb":f=function(t,e,i,s,n){const o=n.samples||s;if(o>=i)return t.slice(e,e+i);const a=[],r=(i-2)/(o-2);let l=0;const h=e+i-1;let c,d,u,f,g,p=e;for(a[l++]=t[p],c=0;c<o-2;c++){let s,n=0,o=0;const h=Math.floor((c+1)*r)+1+e,m=Math.min(Math.floor((c+2)*r)+1,i)+e,x=m-h;for(s=h;s<m;s++)n+=t[s].x,o+=t[s].y;n/=x,o/=x;const b=Math.floor(c*r)+1+e,_=Math.min(Math.floor((c+1)*r)+1,i)+e,{x:y,y:v}=t[p];for(u=f=-1,s=b;s<_;s++)f=.5*Math.abs((y-n)*(t[s].y-v)-(y-t[s].x)*(o-v)),f>u&&(u=f,d=t[s],g=s);a[l++]=d,p=g}return a[l++]=t[h],a}(h,d,u,n,i);break;case"min-max":f=function(t,e,i,n){let o,a,r,l,h,c,d,u,f,g,p=0,m=0;const x=[],b=e+i-1,_=t[e].x,y=t[b].x-_;for(o=e;o<e+i;++o){a=t[o],r=(a.x-_)/y*n,l=a.y;const e=0|r;if(e===h)l<f?(f=l,c=o):l>g&&(g=l,d=o),p=(m*p+a.x)/++m;else{const i=o-1;if(!s(c)&&!s(d)){const e=Math.min(c,d),s=Math.max(c,d);e!==u&&e!==i&&x.push({...t[e],x:p}),s!==u&&s!==i&&x.push({...t[s],x:p})}o>0&&i!==u&&x.push(t[i]),x.push(a),h=e,m=0,f=g=l,c=d=u=o}}return x}(h,d,u,n);break;default:throw new Error(`Unsupported decimation algorithm '${i.algorithm}'`)}e._decimated=f}))},destroy(t){Qo(t)}};function ea(t,e,i,s){if(s)return;let n=e[t],o=i[t];return"angle"===t&&(n=G(n),o=G(o)),{property:t,start:n,end:o}}function ia(t,e,i){for(;e>t;e--){const t=i[e];if(!isNaN(t.x)&&!isNaN(t.y))break}return e}function sa(t,e,i,s){return t&&e?s(t[i],e[i]):t?t[i]:e?e[i]:0}function na(t,e){let i=[],s=!1;return n(t)?(s=!0,i=t):i=function(t,e){const{x:i=null,y:s=null}=t||{},n=e.points,o=[];return e.segments.forEach((({start:t,end:e})=>{e=ia(t,e,n);const a=n[t],r=n[e];null!==s?(o.push({x:a.x,y:s}),o.push({x:r.x,y:s})):null!==i&&(o.push({x:i,y:a.y}),o.push({x:i,y:r.y}))})),o}(t,e),i.length?new oo({points:i,options:{tension:0},_loop:s,_fullLoop:s}):null}function oa(t){return t&&!1!==t.fill}function aa(t,e,i){let s=t[e].fill;const n=[e];let o;if(!i)return s;for(;!1!==s&&-1===n.indexOf(s);){if(!a(s))return s;if(o=t[s],!o)return!1;if(o.visible)return s;n.push(s),s=o.fill}return!1}function ra(t,e,i){const s=function(t){const e=t.options,i=e.fill;let s=l(i&&i.target,i);void 0===s&&(s=!!e.backgroundColor);if(!1===s||null===s)return!1;if(!0===s)return"origin";return s}(t);if(o(s))return!isNaN(s.value)&&s;let n=parseFloat(s);return a(n)&&Math.floor(n)===n?function(t,e,i,s){"-"!==t&&"+"!==t||(i=e+i);if(i===e||i<0||i>=s)return!1;return i}(s[0],e,n,i):["origin","start","end","stack","shape"].indexOf(s)>=0&&s}function la(t,e,i){const s=[];for(let n=0;n<i.length;n++){const o=i[n],{first:a,last:r,point:l}=ha(o,e,"x");if(!(!l||a&&r))if(a)s.unshift(l);else if(t.push(l),!r)break}t.push(...s)}function ha(t,e,i){const s=t.interpolate(e,i);if(!s)return{};const n=s[i],o=t.segments,a=t.points;let r=!1,l=!1;for(let t=0;t<o.length;t++){const e=o[t],s=a[e.start][i],h=a[e.end][i];if(tt(n,s,h)){r=n===s,l=n===h;break}}return{first:r,last:l,point:s}}class ca{constructor(t){this.x=t.x,this.y=t.y,this.radius=t.radius}pathSegment(t,e,i){const{x:s,y:n,radius:o}=this;return e=e||{start:0,end:O},t.arc(s,n,o,e.end,e.start,!0),!i.bounds}interpolate(t){const{x:e,y:i,radius:s}=this,n=t.angle;return{x:e+Math.cos(n)*s,y:i+Math.sin(n)*s,angle:n}}}function da(t){const{chart:e,fill:i,line:s}=t;if(a(i))return function(t,e){const i=t.getDatasetMeta(e),s=i&&t.isDatasetVisible(e);return s?i.dataset:null}(e,i);if("stack"===i)return function(t){const{scale:e,index:i,line:s}=t,n=[],o=s.segments,a=s.points,r=function(t,e){const i=[],s=t.getMatchingVisibleMetas("line");for(let t=0;t<s.length;t++){const n=s[t];if(n.index===e)break;n.hidden||i.unshift(n.dataset)}return i}(e,i);r.push(na({x:null,y:e.bottom},s));for(let t=0;t<o.length;t++){const e=o[t];for(let t=e.start;t<=e.end;t++)la(n,a[t],r)}return new oo({points:n,options:{}})}(t);if("shape"===i)return!0;const n=function(t){const e=t.scale||{};if(e.getPointPositionForValue)return function(t){const{scale:e,fill:i}=t,s=e.options,n=e.getLabels().length,a=s.reverse?e.max:e.min,r=function(t,e,i){let s;return s="start"===t?i:"end"===t?e.options.reverse?e.min:e.max:o(t)?t.value:e.getBaseValue(),s}(i,e,a),l=[];if(s.grid.circular){const t=e.getPointPositionForValue(0,a);return new ca({x:t.x,y:t.y,radius:e.getDistanceFromCenterForValue(r)})}for(let t=0;t<n;++t)l.push(e.getPointPositionForValue(t,r));return l}(t);return function(t){const{scale:e={},fill:i}=t,s=function(t,e){let i=null;return"start"===t?i=e.bottom:"end"===t?i=e.top:o(t)?i=e.getPixelForValue(t.value):e.getBasePixel&&(i=e.getBasePixel()),i}(i,e);if(a(s)){const t=e.isHorizontal();return{x:t?s:null,y:t?null:s}}return null}(t)}(t);return n instanceof ca?n:na(n,s)}function ua(t,e,i){const s=da(e),{chart:n,index:o,line:a,scale:r,axis:l}=e,h=a.options,c=h.fill,d=h.backgroundColor,{above:u=d,below:f=d}=c||{},g=n.getDatasetMeta(o),p=Ni(n,g);s&&a.points.length&&(Ie(t,i),function(t,e){const{line:i,target:s,above:n,below:o,area:a,scale:r,clip:l}=e,h=i._loop?"angle":e.axis;t.save();let c=o;o!==n&&("x"===h?(fa(t,s,a.top),pa(t,{line:i,target:s,color:n,scale:r,property:h,clip:l}),t.restore(),t.save(),fa(t,s,a.bottom)):"y"===h&&(ga(t,s,a.left),pa(t,{line:i,target:s,color:o,scale:r,property:h,clip:l}),t.restore(),t.save(),ga(t,s,a.right),c=n));pa(t,{line:i,target:s,color:c,scale:r,property:h,clip:l}),t.restore()}(t,{line:a,target:s,above:u,below:f,area:i,scale:r,axis:l,clip:p}),ze(t))}function fa(t,e,i){const{segments:s,points:n}=e;let o=!0,a=!1;t.beginPath();for(const r of s){const{start:s,end:l}=r,h=n[s],c=n[ia(s,l,n)];o?(t.moveTo(h.x,h.y),o=!1):(t.lineTo(h.x,i),t.lineTo(h.x,h.y)),a=!!e.pathSegment(t,r,{move:a}),a?t.closePath():t.lineTo(c.x,i)}t.lineTo(e.first().x,i),t.closePath(),t.clip()}function ga(t,e,i){const{segments:s,points:n}=e;let o=!0,a=!1;t.beginPath();for(const r of s){const{start:s,end:l}=r,h=n[s],c=n[ia(s,l,n)];o?(t.moveTo(h.x,h.y),o=!1):(t.lineTo(i,h.y),t.lineTo(h.x,h.y)),a=!!e.pathSegment(t,r,{move:a}),a?t.closePath():t.lineTo(i,c.y)}t.lineTo(i,e.first().y),t.closePath(),t.clip()}function pa(t,e){const{line:i,target:s,property:n,color:o,scale:a,clip:r}=e,l=function(t,e,i){const s=t.segments,n=t.points,o=e.points,a=[];for(const t of s){let{start:s,end:r}=t;r=ia(s,r,n);const l=ea(i,n[s],n[r],t.loop);if(!e.segments){a.push({source:t,target:l,start:n[s],end:n[r]});continue}const h=Ii(e,l);for(const e of h){const s=ea(i,o[e.start],o[e.end],e.loop),r=Ri(t,n,s);for(const t of r)a.push({source:t,target:e,start:{[i]:sa(l,s,"start",Math.max)},end:{[i]:sa(l,s,"end",Math.min)}})}}return a}(i,s,n);for(const{source:e,target:h,start:c,end:d}of l){const{style:{backgroundColor:l=o}={}}=e,u=!0!==s;t.save(),t.fillStyle=l,ma(t,a,r,u&&ea(n,c,d)),t.beginPath();const f=!!i.pathSegment(t,e);let g;if(u){f?t.closePath():xa(t,s,d,n);const e=!!s.pathSegment(t,h,{move:f,reverse:!0});g=f&&e,g||xa(t,s,c,n)}t.closePath(),t.fill(g?"evenodd":"nonzero"),t.restore()}}function ma(t,e,i,s){const n=e.chart.chartArea,{property:o,start:a,end:r}=s||{};if("x"===o||"y"===o){let e,s,l,h;"x"===o?(e=a,s=n.top,l=r,h=n.bottom):(e=n.left,s=a,l=n.right,h=r),t.beginPath(),i&&(e=Math.max(e,i.left),l=Math.min(l,i.right),s=Math.max(s,i.top),h=Math.min(h,i.bottom)),t.rect(e,s,l-e,h-s),t.clip()}}function xa(t,e,i,s){const n=e.interpolate(i,s);n&&t.lineTo(n.x,n.y)}var ba={id:"filler",afterDatasetsUpdate(t,e,i){const s=(t.data.datasets||[]).length,n=[];let o,a,r,l;for(a=0;a<s;++a)o=t.getDatasetMeta(a),r=o.dataset,l=null,r&&r.options&&r instanceof oo&&(l={visible:t.isDatasetVisible(a),index:a,fill:ra(r,a,s),chart:t,axis:o.controller.options.indexAxis,scale:o.vScale,line:r}),o.$filler=l,n.push(l);for(a=0;a<s;++a)l=n[a],l&&!1!==l.fill&&(l.fill=aa(n,a,i.propagate))},beforeDraw(t,e,i){const s="beforeDraw"===i.drawTime,n=t.getSortedVisibleDatasetMetas(),o=t.chartArea;for(let e=n.length-1;e>=0;--e){const i=n[e].$filler;i&&(i.line.updateControlPoints(o,i.axis),s&&i.fill&&ua(t.ctx,i,o))}},beforeDatasetsDraw(t,e,i){if("beforeDatasetsDraw"!==i.drawTime)return;const s=t.getSortedVisibleDatasetMetas();for(let e=s.length-1;e>=0;--e){const i=s[e].$filler;oa(i)&&ua(t.ctx,i,t.chartArea)}},beforeDatasetDraw(t,e,i){const s=e.meta.$filler;oa(s)&&"beforeDatasetDraw"===i.drawTime&&ua(t.ctx,s,t.chartArea)},defaults:{propagate:!0,drawTime:"beforeDatasetDraw"}};const _a=(t,e)=>{let{boxHeight:i=e,boxWidth:s=e}=t;return t.usePointStyle&&(i=Math.min(i,e),s=t.pointStyleWidth||Math.min(s,e)),{boxWidth:s,boxHeight:i,itemHeight:Math.max(e,i)}};class ya extends $s{constructor(t){super(),this._added=!1,this.legendHitBoxes=[],this._hoveredItem=null,this.doughnutMode=!1,this.chart=t.chart,this.options=t.options,this.ctx=t.ctx,this.legendItems=void 0,this.columnSizes=void 0,this.lineWidths=void 0,this.maxHeight=void 0,this.maxWidth=void 0,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.height=void 0,this.width=void 0,this._margins=void 0,this.position=void 0,this.weight=void 0,this.fullSize=void 0}update(t,e,i){this.maxWidth=t,this.maxHeight=e,this._margins=i,this.setDimensions(),this.buildLabels(),this.fit()}setDimensions(){this.isHorizontal()?(this.width=this.maxWidth,this.left=this._margins.left,this.right=this.width):(this.height=this.maxHeight,this.top=this._margins.top,this.bottom=this.height)}buildLabels(){const t=this.options.labels||{};let e=d(t.generateLabels,[this.chart],this)||[];t.filter&&(e=e.filter((e=>t.filter(e,this.chart.data)))),t.sort&&(e=e.sort(((e,i)=>t.sort(e,i,this.chart.data)))),this.options.reverse&&e.reverse(),this.legendItems=e}fit(){const{options:t,ctx:e}=this;if(!t.display)return void(this.width=this.height=0);const i=t.labels,s=Si(i.font),n=s.size,o=this._computeTitleHeight(),{boxWidth:a,itemHeight:r}=_a(i,n);let l,h;e.font=s.string,this.isHorizontal()?(l=this.maxWidth,h=this._fitRows(o,n,a,r)+10):(h=this.maxHeight,l=this._fitCols(o,s,a,r)+10),this.width=Math.min(l,t.maxWidth||this.maxWidth),this.height=Math.min(h,t.maxHeight||this.maxHeight)}_fitRows(t,e,i,s){const{ctx:n,maxWidth:o,options:{labels:{padding:a}}}=this,r=this.legendHitBoxes=[],l=this.lineWidths=[0],h=s+a;let c=t;n.textAlign="left",n.textBaseline="middle";let d=-1,u=-h;return this.legendItems.forEach(((t,f)=>{const g=i+e/2+n.measureText(t.text).width;(0===f||l[l.length-1]+g+2*a>o)&&(c+=h,l[l.length-(f>0?0:1)]=0,u+=h,d++),r[f]={left:0,top:u,row:d,width:g,height:s},l[l.length-1]+=g+a})),c}_fitCols(t,e,i,s){const{ctx:n,maxHeight:o,options:{labels:{padding:a}}}=this,r=this.legendHitBoxes=[],l=this.columnSizes=[],h=o-t;let c=a,d=0,u=0,f=0,g=0;return this.legendItems.forEach(((t,o)=>{const{itemWidth:p,itemHeight:m}=function(t,e,i,s,n){const o=function(t,e,i,s){let n=t.text;n&&"string"!=typeof n&&(n=n.reduce(((t,e)=>t.length>e.length?t:e)));return e+i.size/2+s.measureText(n).width}(s,t,e,i),a=function(t,e,i){let s=t;"string"!=typeof e.text&&(s=va(e,i));return s}(n,s,e.lineHeight);return{itemWidth:o,itemHeight:a}}(i,e,n,t,s);o>0&&u+m+2*a>h&&(c+=d+a,l.push({width:d,height:u}),f+=d+a,g++,d=u=0),r[o]={left:f,top:u,col:g,width:p,height:m},d=Math.max(d,p),u+=m+a})),c+=d,l.push({width:d,height:u}),c}adjustHitBoxes(){if(!this.options.display)return;const t=this._computeTitleHeight(),{legendHitBoxes:e,options:{align:i,labels:{padding:s},rtl:n}}=this,o=Oi(n,this.left,this.width);if(this.isHorizontal()){let n=0,a=ft(i,this.left+s,this.right-this.lineWidths[n]);for(const r of e)n!==r.row&&(n=r.row,a=ft(i,this.left+s,this.right-this.lineWidths[n])),r.top+=this.top+t+s,r.left=o.leftForLtr(o.x(a),r.width),a+=r.width+s}else{let n=0,a=ft(i,this.top+t+s,this.bottom-this.columnSizes[n].height);for(const r of e)r.col!==n&&(n=r.col,a=ft(i,this.top+t+s,this.bottom-this.columnSizes[n].height)),r.top=a,r.left+=this.left+s,r.left=o.leftForLtr(o.x(r.left),r.width),a+=r.height+s}}isHorizontal(){return"top"===this.options.position||"bottom"===this.options.position}draw(){if(this.options.display){const t=this.ctx;Ie(t,this),this._draw(),ze(t)}}_draw(){const{options:t,columnSizes:e,lineWidths:i,ctx:s}=this,{align:n,labels:o}=t,a=ue.color,r=Oi(t.rtl,this.left,this.width),h=Si(o.font),{padding:c}=o,d=h.size,u=d/2;let f;this.drawTitle(),s.textAlign=r.textAlign("left"),s.textBaseline="middle",s.lineWidth=.5,s.font=h.string;const{boxWidth:g,boxHeight:p,itemHeight:m}=_a(o,d),x=this.isHorizontal(),b=this._computeTitleHeight();f=x?{x:ft(n,this.left+c,this.right-i[0]),y:this.top+c+b,line:0}:{x:this.left+c,y:ft(n,this.top+b+c,this.bottom-e[0].height),line:0},Ai(this.ctx,t.textDirection);const _=m+c;this.legendItems.forEach(((y,v)=>{s.strokeStyle=y.fontColor,s.fillStyle=y.fontColor;const M=s.measureText(y.text).width,w=r.textAlign(y.textAlign||(y.textAlign=o.textAlign)),k=g+u+M;let S=f.x,P=f.y;r.setWidth(this.width),x?v>0&&S+k+c>this.right&&(P=f.y+=_,f.line++,S=f.x=ft(n,this.left+c,this.right-i[f.line])):v>0&&P+_>this.bottom&&(S=f.x=S+e[f.line].width+c,f.line++,P=f.y=ft(n,this.top+b+c,this.bottom-e[f.line].height));if(function(t,e,i){if(isNaN(g)||g<=0||isNaN(p)||p<0)return;s.save();const n=l(i.lineWidth,1);if(s.fillStyle=l(i.fillStyle,a),s.lineCap=l(i.lineCap,"butt"),s.lineDashOffset=l(i.lineDashOffset,0),s.lineJoin=l(i.lineJoin,"miter"),s.lineWidth=n,s.strokeStyle=l(i.strokeStyle,a),s.setLineDash(l(i.lineDash,[])),o.usePointStyle){const a={radius:p*Math.SQRT2/2,pointStyle:i.pointStyle,rotation:i.rotation,borderWidth:n},l=r.xPlus(t,g/2);Ee(s,a,l,e+u,o.pointStyleWidth&&g)}else{const o=e+Math.max((d-p)/2,0),a=r.leftForLtr(t,g),l=wi(i.borderRadius);s.beginPath(),Object.values(l).some((t=>0!==t))?He(s,{x:a,y:o,w:g,h:p,radius:l}):s.rect(a,o,g,p),s.fill(),0!==n&&s.stroke()}s.restore()}(r.x(S),P,y),S=gt(w,S+g+u,x?S+k:this.right,t.rtl),function(t,e,i){Ne(s,i.text,t,e+m/2,h,{strikethrough:i.hidden,textAlign:r.textAlign(i.textAlign)})}(r.x(S),P,y),x)f.x+=k+c;else if("string"!=typeof y.text){const t=h.lineHeight;f.y+=va(y,t)+c}else f.y+=_})),Ti(this.ctx,t.textDirection)}drawTitle(){const t=this.options,e=t.title,i=Si(e.font),s=ki(e.padding);if(!e.display)return;const n=Oi(t.rtl,this.left,this.width),o=this.ctx,a=e.position,r=i.size/2,l=s.top+r;let h,c=this.left,d=this.width;if(this.isHorizontal())d=Math.max(...this.lineWidths),h=this.top+l,c=ft(t.align,c,this.right-d);else{const e=this.columnSizes.reduce(((t,e)=>Math.max(t,e.height)),0);h=l+ft(t.align,this.top,this.bottom-e-t.labels.padding-this._computeTitleHeight())}const u=ft(a,c,c+d);o.textAlign=n.textAlign(ut(a)),o.textBaseline="middle",o.strokeStyle=e.color,o.fillStyle=e.color,o.font=i.string,Ne(o,e.text,u,h,i)}_computeTitleHeight(){const t=this.options.title,e=Si(t.font),i=ki(t.padding);return t.display?e.lineHeight+i.height:0}_getLegendItemAt(t,e){let i,s,n;if(tt(t,this.left,this.right)&&tt(e,this.top,this.bottom))for(n=this.legendHitBoxes,i=0;i<n.length;++i)if(s=n[i],tt(t,s.left,s.left+s.width)&&tt(e,s.top,s.top+s.height))return this.legendItems[i];return null}handleEvent(t){const e=this.options;if(!function(t,e){if(("mousemove"===t||"mouseout"===t)&&(e.onHover||e.onLeave))return!0;if(e.onClick&&("click"===t||"mouseup"===t))return!0;return!1}(t.type,e))return;const i=this._getLegendItemAt(t.x,t.y);if("mousemove"===t.type||"mouseout"===t.type){const o=this._hoveredItem,a=(n=i,null!==(s=o)&&null!==n&&s.datasetIndex===n.datasetIndex&&s.index===n.index);o&&!a&&d(e.onLeave,[t,o,this],this),this._hoveredItem=i,i&&!a&&d(e.onHover,[t,i,this],this)}else i&&d(e.onClick,[t,i,this],this);var s,n}}function va(t,e){return e*(t.text?t.text.length:0)}var Ma={id:"legend",_element:ya,start(t,e,i){const s=t.legend=new ya({ctx:t.ctx,options:i,chart:t});ls.configure(t,s,i),ls.addBox(t,s)},stop(t){ls.removeBox(t,t.legend),delete t.legend},beforeUpdate(t,e,i){const s=t.legend;ls.configure(t,s,i),s.options=i},afterUpdate(t){const e=t.legend;e.buildLabels(),e.adjustHitBoxes()},afterEvent(t,e){e.replay||t.legend.handleEvent(e.event)},defaults:{display:!0,position:"top",align:"center",fullSize:!0,reverse:!1,weight:1e3,onClick(t,e,i){const s=e.datasetIndex,n=i.chart;n.isDatasetVisible(s)?(n.hide(s),e.hidden=!0):(n.show(s),e.hidden=!1)},onHover:null,onLeave:null,labels:{color:t=>t.chart.options.color,boxWidth:40,padding:10,generateLabels(t){const e=t.data.datasets,{labels:{usePointStyle:i,pointStyle:s,textAlign:n,color:o,useBorderRadius:a,borderRadius:r}}=t.legend.options;return t._getSortedDatasetMetas().map((t=>{const l=t.controller.getStyle(i?0:void 0),h=ki(l.borderWidth);return{text:e[t.index].label,fillStyle:l.backgroundColor,fontColor:o,hidden:!t.visible,lineCap:l.borderCapStyle,lineDash:l.borderDash,lineDashOffset:l.borderDashOffset,lineJoin:l.borderJoinStyle,lineWidth:(h.width+h.height)/4,strokeStyle:l.borderColor,pointStyle:s||l.pointStyle,rotation:l.rotation,textAlign:n||l.textAlign,borderRadius:a&&(r||l.borderRadius),datasetIndex:t.index}}),this)}},title:{color:t=>t.chart.options.color,display:!1,position:"center",text:""}},descriptors:{_scriptable:t=>!t.startsWith("on"),labels:{_scriptable:t=>!["generateLabels","filter","sort"].includes(t)}}};class wa extends $s{constructor(t){super(),this.chart=t.chart,this.options=t.options,this.ctx=t.ctx,this._padding=void 0,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.width=void 0,this.height=void 0,this.position=void 0,this.weight=void 0,this.fullSize=void 0}update(t,e){const i=this.options;if(this.left=0,this.top=0,!i.display)return void(this.width=this.height=this.right=this.bottom=0);this.width=this.right=t,this.height=this.bottom=e;const s=n(i.text)?i.text.length:1;this._padding=ki(i.padding);const o=s*Si(i.font).lineHeight+this._padding.height;this.isHorizontal()?this.height=o:this.width=o}isHorizontal(){const t=this.options.position;return"top"===t||"bottom"===t}_drawArgs(t){const{top:e,left:i,bottom:s,right:n,options:o}=this,a=o.align;let r,l,h,c=0;return this.isHorizontal()?(l=ft(a,i,n),h=e+t,r=n-i):("left"===o.position?(l=i+t,h=ft(a,s,e),c=-.5*C):(l=n-t,h=ft(a,e,s),c=.5*C),r=s-e),{titleX:l,titleY:h,maxWidth:r,rotation:c}}draw(){const t=this.ctx,e=this.options;if(!e.display)return;const i=Si(e.font),s=i.lineHeight/2+this._padding.top,{titleX:n,titleY:o,maxWidth:a,rotation:r}=this._drawArgs(s);Ne(t,e.text,0,0,i,{color:e.color,maxWidth:a,rotation:r,textAlign:ut(e.align),textBaseline:"middle",translation:[n,o]})}}var ka={id:"title",_element:wa,start(t,e,i){!function(t,e){const i=new wa({ctx:t.ctx,options:e,chart:t});ls.configure(t,i,e),ls.addBox(t,i),t.titleBlock=i}(t,i)},stop(t){const e=t.titleBlock;ls.removeBox(t,e),delete t.titleBlock},beforeUpdate(t,e,i){const s=t.titleBlock;ls.configure(t,s,i),s.options=i},defaults:{align:"center",display:!1,font:{weight:"bold"},fullSize:!0,padding:10,position:"top",text:"",weight:2e3},defaultRoutes:{color:"color"},descriptors:{_scriptable:!0,_indexable:!1}};const Sa=new WeakMap;var Pa={id:"subtitle",start(t,e,i){const s=new wa({ctx:t.ctx,options:i,chart:t});ls.configure(t,s,i),ls.addBox(t,s),Sa.set(t,s)},stop(t){ls.removeBox(t,Sa.get(t)),Sa.delete(t)},beforeUpdate(t,e,i){const s=Sa.get(t);ls.configure(t,s,i),s.options=i},defaults:{align:"center",display:!1,font:{weight:"normal"},fullSize:!0,padding:0,position:"top",text:"",weight:1500},defaultRoutes:{color:"color"},descriptors:{_scriptable:!0,_indexable:!1}};const Da={average(t){if(!t.length)return!1;let e,i,s=new Set,n=0,o=0;for(e=0,i=t.length;e<i;++e){const i=t[e].element;if(i&&i.hasValue()){const t=i.tooltipPosition();s.add(t.x),n+=t.y,++o}}if(0===o||0===s.size)return!1;return{x:[...s].reduce(((t,e)=>t+e))/s.size,y:n/o}},nearest(t,e){if(!t.length)return!1;let i,s,n,o=e.x,a=e.y,r=Number.POSITIVE_INFINITY;for(i=0,s=t.length;i<s;++i){const s=t[i].element;if(s&&s.hasValue()){const t=q(e,s.getCenterPoint());t<r&&(r=t,n=s)}}if(n){const t=n.tooltipPosition();o=t.x,a=t.y}return{x:o,y:a}}};function Ca(t,e){return e&&(n(e)?Array.prototype.push.apply(t,e):t.push(e)),t}function Oa(t){return("string"==typeof t||t instanceof String)&&t.indexOf("\n")>-1?t.split("\n"):t}function Aa(t,e){const{element:i,datasetIndex:s,index:n}=e,o=t.getDatasetMeta(s).controller,{label:a,value:r}=o.getLabelAndValue(n);return{chart:t,label:a,parsed:o.getParsed(n),raw:t.data.datasets[s].data[n],formattedValue:r,dataset:o.getDataset(),dataIndex:n,datasetIndex:s,element:i}}function Ta(t,e){const i=t.chart.ctx,{body:s,footer:n,title:o}=t,{boxWidth:a,boxHeight:r}=e,l=Si(e.bodyFont),h=Si(e.titleFont),c=Si(e.footerFont),d=o.length,f=n.length,g=s.length,p=ki(e.padding);let m=p.height,x=0,b=s.reduce(((t,e)=>t+e.before.length+e.lines.length+e.after.length),0);if(b+=t.beforeBody.length+t.afterBody.length,d&&(m+=d*h.lineHeight+(d-1)*e.titleSpacing+e.titleMarginBottom),b){m+=g*(e.displayColors?Math.max(r,l.lineHeight):l.lineHeight)+(b-g)*l.lineHeight+(b-1)*e.bodySpacing}f&&(m+=e.footerMarginTop+f*c.lineHeight+(f-1)*e.footerSpacing);let _=0;const y=function(t){x=Math.max(x,i.measureText(t).width+_)};return i.save(),i.font=h.string,u(t.title,y),i.font=l.string,u(t.beforeBody.concat(t.afterBody),y),_=e.displayColors?a+2+e.boxPadding:0,u(s,(t=>{u(t.before,y),u(t.lines,y),u(t.after,y)})),_=0,i.font=c.string,u(t.footer,y),i.restore(),x+=p.width,{width:x,height:m}}function La(t,e,i,s){const{x:n,width:o}=i,{width:a,chartArea:{left:r,right:l}}=t;let h="center";return"center"===s?h=n<=(r+l)/2?"left":"right":n<=o/2?h="left":n>=a-o/2&&(h="right"),function(t,e,i,s){const{x:n,width:o}=s,a=i.caretSize+i.caretPadding;return"left"===t&&n+o+a>e.width||"right"===t&&n-o-a<0||void 0}(h,t,e,i)&&(h="center"),h}function Ea(t,e,i){const s=i.yAlign||e.yAlign||function(t,e){const{y:i,height:s}=e;return i<s/2?"top":i>t.height-s/2?"bottom":"center"}(t,i);return{xAlign:i.xAlign||e.xAlign||La(t,e,i,s),yAlign:s}}function Ra(t,e,i,s){const{caretSize:n,caretPadding:o,cornerRadius:a}=t,{xAlign:r,yAlign:l}=i,h=n+o,{topLeft:c,topRight:d,bottomLeft:u,bottomRight:f}=wi(a);let g=function(t,e){let{x:i,width:s}=t;return"right"===e?i-=s:"center"===e&&(i-=s/2),i}(e,r);const p=function(t,e,i){let{y:s,height:n}=t;return"top"===e?s+=i:s-="bottom"===e?n+i:n/2,s}(e,l,h);return"center"===l?"left"===r?g+=h:"right"===r&&(g-=h):"left"===r?g-=Math.max(c,u)+n:"right"===r&&(g+=Math.max(d,f)+n),{x:Z(g,0,s.width-e.width),y:Z(p,0,s.height-e.height)}}function Ia(t,e,i){const s=ki(i.padding);return"center"===e?t.x+t.width/2:"right"===e?t.x+t.width-s.right:t.x+s.left}function za(t){return Ca([],Oa(t))}function Fa(t,e){const i=e&&e.dataset&&e.dataset.tooltip&&e.dataset.tooltip.callbacks;return i?t.override(i):t}const Va={beforeTitle:e,title(t){if(t.length>0){const e=t[0],i=e.chart.data.labels,s=i?i.length:0;if(this&&this.options&&"dataset"===this.options.mode)return e.dataset.label||"";if(e.label)return e.label;if(s>0&&e.dataIndex<s)return i[e.dataIndex]}return""},afterTitle:e,beforeBody:e,beforeLabel:e,label(t){if(this&&this.options&&"dataset"===this.options.mode)return t.label+": "+t.formattedValue||t.formattedValue;let e=t.dataset.label||"";e&&(e+=": ");const i=t.formattedValue;return s(i)||(e+=i),e},labelColor(t){const e=t.chart.getDatasetMeta(t.datasetIndex).controller.getStyle(t.dataIndex);return{borderColor:e.borderColor,backgroundColor:e.backgroundColor,borderWidth:e.borderWidth,borderDash:e.borderDash,borderDashOffset:e.borderDashOffset,borderRadius:0}},labelTextColor(){return this.options.bodyColor},labelPointStyle(t){const e=t.chart.getDatasetMeta(t.datasetIndex).controller.getStyle(t.dataIndex);return{pointStyle:e.pointStyle,rotation:e.rotation}},afterLabel:e,afterBody:e,beforeFooter:e,footer:e,afterFooter:e};function Ba(t,e,i,s){const n=t[e].call(i,s);return void 0===n?Va[e].call(i,s):n}class Wa extends $s{static positioners=Da;constructor(t){super(),this.opacity=0,this._active=[],this._eventPosition=void 0,this._size=void 0,this._cachedAnimations=void 0,this._tooltipItems=[],this.$animations=void 0,this.$context=void 0,this.chart=t.chart,this.options=t.options,this.dataPoints=void 0,this.title=void 0,this.beforeBody=void 0,this.body=void 0,this.afterBody=void 0,this.footer=void 0,this.xAlign=void 0,this.yAlign=void 0,this.x=void 0,this.y=void 0,this.height=void 0,this.width=void 0,this.caretX=void 0,this.caretY=void 0,this.labelColors=void 0,this.labelPointStyles=void 0,this.labelTextColors=void 0}initialize(t){this.options=t,this._cachedAnimations=void 0,this.$context=void 0}_resolveAnimations(){const t=this._cachedAnimations;if(t)return t;const e=this.chart,i=this.options.setContext(this.getContext()),s=i.enabled&&e.options.animation&&i.animations,n=new Ts(this.chart,s);return s._cacheable&&(this._cachedAnimations=Object.freeze(n)),n}getContext(){return this.$context||(this.$context=(t=this.chart.getContext(),e=this,i=this._tooltipItems,Ci(t,{tooltip:e,tooltipItems:i,type:"tooltip"})));var t,e,i}getTitle(t,e){const{callbacks:i}=e,s=Ba(i,"beforeTitle",this,t),n=Ba(i,"title",this,t),o=Ba(i,"afterTitle",this,t);let a=[];return a=Ca(a,Oa(s)),a=Ca(a,Oa(n)),a=Ca(a,Oa(o)),a}getBeforeBody(t,e){return za(Ba(e.callbacks,"beforeBody",this,t))}getBody(t,e){const{callbacks:i}=e,s=[];return u(t,(t=>{const e={before:[],lines:[],after:[]},n=Fa(i,t);Ca(e.before,Oa(Ba(n,"beforeLabel",this,t))),Ca(e.lines,Ba(n,"label",this,t)),Ca(e.after,Oa(Ba(n,"afterLabel",this,t))),s.push(e)})),s}getAfterBody(t,e){return za(Ba(e.callbacks,"afterBody",this,t))}getFooter(t,e){const{callbacks:i}=e,s=Ba(i,"beforeFooter",this,t),n=Ba(i,"footer",this,t),o=Ba(i,"afterFooter",this,t);let a=[];return a=Ca(a,Oa(s)),a=Ca(a,Oa(n)),a=Ca(a,Oa(o)),a}_createItems(t){const e=this._active,i=this.chart.data,s=[],n=[],o=[];let a,r,l=[];for(a=0,r=e.length;a<r;++a)l.push(Aa(this.chart,e[a]));return t.filter&&(l=l.filter(((e,s,n)=>t.filter(e,s,n,i)))),t.itemSort&&(l=l.sort(((e,s)=>t.itemSort(e,s,i)))),u(l,(e=>{const i=Fa(t.callbacks,e);s.push(Ba(i,"labelColor",this,e)),n.push(Ba(i,"labelPointStyle",this,e)),o.push(Ba(i,"labelTextColor",this,e))})),this.labelColors=s,this.labelPointStyles=n,this.labelTextColors=o,this.dataPoints=l,l}update(t,e){const i=this.options.setContext(this.getContext()),s=this._active;let n,o=[];if(s.length){const t=Da[i.position].call(this,s,this._eventPosition);o=this._createItems(i),this.title=this.getTitle(o,i),this.beforeBody=this.getBeforeBody(o,i),this.body=this.getBody(o,i),this.afterBody=this.getAfterBody(o,i),this.footer=this.getFooter(o,i);const e=this._size=Ta(this,i),a=Object.assign({},t,e),r=Ea(this.chart,i,a),l=Ra(i,a,r,this.chart);this.xAlign=r.xAlign,this.yAlign=r.yAlign,n={opacity:1,x:l.x,y:l.y,width:e.width,height:e.height,caretX:t.x,caretY:t.y}}else 0!==this.opacity&&(n={opacity:0});this._tooltipItems=o,this.$context=void 0,n&&this._resolveAnimations().update(this,n),t&&i.external&&i.external.call(this,{chart:this.chart,tooltip:this,replay:e})}drawCaret(t,e,i,s){const n=this.getCaretPosition(t,i,s);e.lineTo(n.x1,n.y1),e.lineTo(n.x2,n.y2),e.lineTo(n.x3,n.y3)}getCaretPosition(t,e,i){const{xAlign:s,yAlign:n}=this,{caretSize:o,cornerRadius:a}=i,{topLeft:r,topRight:l,bottomLeft:h,bottomRight:c}=wi(a),{x:d,y:u}=t,{width:f,height:g}=e;let p,m,x,b,_,y;return"center"===n?(_=u+g/2,"left"===s?(p=d,m=p-o,b=_+o,y=_-o):(p=d+f,m=p+o,b=_-o,y=_+o),x=p):(m="left"===s?d+Math.max(r,h)+o:"right"===s?d+f-Math.max(l,c)-o:this.caretX,"top"===n?(b=u,_=b-o,p=m-o,x=m+o):(b=u+g,_=b+o,p=m+o,x=m-o),y=b),{x1:p,x2:m,x3:x,y1:b,y2:_,y3:y}}drawTitle(t,e,i){const s=this.title,n=s.length;let o,a,r;if(n){const l=Oi(i.rtl,this.x,this.width);for(t.x=Ia(this,i.titleAlign,i),e.textAlign=l.textAlign(i.titleAlign),e.textBaseline="middle",o=Si(i.titleFont),a=i.titleSpacing,e.fillStyle=i.titleColor,e.font=o.string,r=0;r<n;++r)e.fillText(s[r],l.x(t.x),t.y+o.lineHeight/2),t.y+=o.lineHeight+a,r+1===n&&(t.y+=i.titleMarginBottom-a)}}_drawColorBox(t,e,i,s,n){const a=this.labelColors[i],r=this.labelPointStyles[i],{boxHeight:l,boxWidth:h}=n,c=Si(n.bodyFont),d=Ia(this,"left",n),u=s.x(d),f=l<c.lineHeight?(c.lineHeight-l)/2:0,g=e.y+f;if(n.usePointStyle){const e={radius:Math.min(h,l)/2,pointStyle:r.pointStyle,rotation:r.rotation,borderWidth:1},i=s.leftForLtr(u,h)+h/2,o=g+l/2;t.strokeStyle=n.multiKeyBackground,t.fillStyle=n.multiKeyBackground,Le(t,e,i,o),t.strokeStyle=a.borderColor,t.fillStyle=a.backgroundColor,Le(t,e,i,o)}else{t.lineWidth=o(a.borderWidth)?Math.max(...Object.values(a.borderWidth)):a.borderWidth||1,t.strokeStyle=a.borderColor,t.setLineDash(a.borderDash||[]),t.lineDashOffset=a.borderDashOffset||0;const e=s.leftForLtr(u,h),i=s.leftForLtr(s.xPlus(u,1),h-2),r=wi(a.borderRadius);Object.values(r).some((t=>0!==t))?(t.beginPath(),t.fillStyle=n.multiKeyBackground,He(t,{x:e,y:g,w:h,h:l,radius:r}),t.fill(),t.stroke(),t.fillStyle=a.backgroundColor,t.beginPath(),He(t,{x:i,y:g+1,w:h-2,h:l-2,radius:r}),t.fill()):(t.fillStyle=n.multiKeyBackground,t.fillRect(e,g,h,l),t.strokeRect(e,g,h,l),t.fillStyle=a.backgroundColor,t.fillRect(i,g+1,h-2,l-2))}t.fillStyle=this.labelTextColors[i]}drawBody(t,e,i){const{body:s}=this,{bodySpacing:n,bodyAlign:o,displayColors:a,boxHeight:r,boxWidth:l,boxPadding:h}=i,c=Si(i.bodyFont);let d=c.lineHeight,f=0;const g=Oi(i.rtl,this.x,this.width),p=function(i){e.fillText(i,g.x(t.x+f),t.y+d/2),t.y+=d+n},m=g.textAlign(o);let x,b,_,y,v,M,w;for(e.textAlign=o,e.textBaseline="middle",e.font=c.string,t.x=Ia(this,m,i),e.fillStyle=i.bodyColor,u(this.beforeBody,p),f=a&&"right"!==m?"center"===o?l/2+h:l+2+h:0,y=0,M=s.length;y<M;++y){for(x=s[y],b=this.labelTextColors[y],e.fillStyle=b,u(x.before,p),_=x.lines,a&&_.length&&(this._drawColorBox(e,t,y,g,i),d=Math.max(c.lineHeight,r)),v=0,w=_.length;v<w;++v)p(_[v]),d=c.lineHeight;u(x.after,p)}f=0,d=c.lineHeight,u(this.afterBody,p),t.y-=n}drawFooter(t,e,i){const s=this.footer,n=s.length;let o,a;if(n){const r=Oi(i.rtl,this.x,this.width);for(t.x=Ia(this,i.footerAlign,i),t.y+=i.footerMarginTop,e.textAlign=r.textAlign(i.footerAlign),e.textBaseline="middle",o=Si(i.footerFont),e.fillStyle=i.footerColor,e.font=o.string,a=0;a<n;++a)e.fillText(s[a],r.x(t.x),t.y+o.lineHeight/2),t.y+=o.lineHeight+i.footerSpacing}}drawBackground(t,e,i,s){const{xAlign:n,yAlign:o}=this,{x:a,y:r}=t,{width:l,height:h}=i,{topLeft:c,topRight:d,bottomLeft:u,bottomRight:f}=wi(s.cornerRadius);e.fillStyle=s.backgroundColor,e.strokeStyle=s.borderColor,e.lineWidth=s.borderWidth,e.beginPath(),e.moveTo(a+c,r),"top"===o&&this.drawCaret(t,e,i,s),e.lineTo(a+l-d,r),e.quadraticCurveTo(a+l,r,a+l,r+d),"center"===o&&"right"===n&&this.drawCaret(t,e,i,s),e.lineTo(a+l,r+h-f),e.quadraticCurveTo(a+l,r+h,a+l-f,r+h),"bottom"===o&&this.drawCaret(t,e,i,s),e.lineTo(a+u,r+h),e.quadraticCurveTo(a,r+h,a,r+h-u),"center"===o&&"left"===n&&this.drawCaret(t,e,i,s),e.lineTo(a,r+c),e.quadraticCurveTo(a,r,a+c,r),e.closePath(),e.fill(),s.borderWidth>0&&e.stroke()}_updateAnimationTarget(t){const e=this.chart,i=this.$animations,s=i&&i.x,n=i&&i.y;if(s||n){const i=Da[t.position].call(this,this._active,this._eventPosition);if(!i)return;const o=this._size=Ta(this,t),a=Object.assign({},i,this._size),r=Ea(e,t,a),l=Ra(t,a,r,e);s._to===l.x&&n._to===l.y||(this.xAlign=r.xAlign,this.yAlign=r.yAlign,this.width=o.width,this.height=o.height,this.caretX=i.x,this.caretY=i.y,this._resolveAnimations().update(this,l))}}_willRender(){return!!this.opacity}draw(t){const e=this.options.setContext(this.getContext());let i=this.opacity;if(!i)return;this._updateAnimationTarget(e);const s={width:this.width,height:this.height},n={x:this.x,y:this.y};i=Math.abs(i)<.001?0:i;const o=ki(e.padding),a=this.title.length||this.beforeBody.length||this.body.length||this.afterBody.length||this.footer.length;e.enabled&&a&&(t.save(),t.globalAlpha=i,this.drawBackground(n,t,s,e),Ai(t,e.textDirection),n.y+=o.top,this.drawTitle(n,t,e),this.drawBody(n,t,e),this.drawFooter(n,t,e),Ti(t,e.textDirection),t.restore())}getActiveElements(){return this._active||[]}setActiveElements(t,e){const i=this._active,s=t.map((({datasetIndex:t,index:e})=>{const i=this.chart.getDatasetMeta(t);if(!i)throw new Error("Cannot find a dataset at index "+t);return{datasetIndex:t,element:i.data[e],index:e}})),n=!f(i,s),o=this._positionChanged(s,e);(n||o)&&(this._active=s,this._eventPosition=e,this._ignoreReplayEvents=!0,this.update(!0))}handleEvent(t,e,i=!0){if(e&&this._ignoreReplayEvents)return!1;this._ignoreReplayEvents=!1;const s=this.options,n=this._active||[],o=this._getActiveElements(t,n,e,i),a=this._positionChanged(o,t),r=e||!f(o,n)||a;return r&&(this._active=o,(s.enabled||s.external)&&(this._eventPosition={x:t.x,y:t.y},this.update(!0,e))),r}_getActiveElements(t,e,i,s){const n=this.options;if("mouseout"===t.type)return[];if(!s)return e.filter((t=>this.chart.data.datasets[t.datasetIndex]&&void 0!==this.chart.getDatasetMeta(t.datasetIndex).controller.getParsed(t.index)));const o=this.chart.getElementsAtEventForMode(t,n.mode,n,i);return n.reverse&&o.reverse(),o}_positionChanged(t,e){const{caretX:i,caretY:s,options:n}=this,o=Da[n.position].call(this,t,e);return!1!==o&&(i!==o.x||s!==o.y)}}var Na={id:"tooltip",_element:Wa,positioners:Da,afterInit(t,e,i){i&&(t.tooltip=new Wa({chart:t,options:i}))},beforeUpdate(t,e,i){t.tooltip&&t.tooltip.initialize(i)},reset(t,e,i){t.tooltip&&t.tooltip.initialize(i)},afterDraw(t){const e=t.tooltip;if(e&&e._willRender()){const i={tooltip:e};if(!1===t.notifyPlugins("beforeTooltipDraw",{...i,cancelable:!0}))return;e.draw(t.ctx),t.notifyPlugins("afterTooltipDraw",i)}},afterEvent(t,e){if(t.tooltip){const i=e.replay;t.tooltip.handleEvent(e.event,i,e.inChartArea)&&(e.changed=!0)}},defaults:{enabled:!0,external:null,position:"average",backgroundColor:"rgba(0,0,0,0.8)",titleColor:"#fff",titleFont:{weight:"bold"},titleSpacing:2,titleMarginBottom:6,titleAlign:"left",bodyColor:"#fff",bodySpacing:2,bodyFont:{},bodyAlign:"left",footerColor:"#fff",footerSpacing:2,footerMarginTop:6,footerFont:{weight:"bold"},footerAlign:"left",padding:6,caretPadding:2,caretSize:5,cornerRadius:6,boxHeight:(t,e)=>e.bodyFont.size,boxWidth:(t,e)=>e.bodyFont.size,multiKeyBackground:"#fff",displayColors:!0,boxPadding:0,borderColor:"rgba(0,0,0,0)",borderWidth:0,animation:{duration:400,easing:"easeOutQuart"},animations:{numbers:{type:"number",properties:["x","y","width","height","caretX","caretY"]},opacity:{easing:"linear",duration:200}},callbacks:Va},defaultRoutes:{bodyFont:"font",footerFont:"font",titleFont:"font"},descriptors:{_scriptable:t=>"filter"!==t&&"itemSort"!==t&&"external"!==t,_indexable:!1,callbacks:{_scriptable:!1,_indexable:!1},animation:{_fallback:!1},animations:{_fallback:"animation"}},additionalOptionScopes:["interaction"]};return Tn.register(Un,$o,go,t),Tn.helpers={...Hi},Tn._adapters=In,Tn.Animation=As,Tn.Animations=Ts,Tn.animator=bt,Tn.controllers=nn.controllers.items,Tn.DatasetController=js,Tn.Element=$s,Tn.elements=go,Tn.Interaction=Ki,Tn.layouts=ls,Tn.platforms=Ds,Tn.Scale=tn,Tn.Ticks=ae,Object.assign(Tn,Un,$o,go,t,Ds),Tn.Chart=Tn,"undefined"!=typeof window&&(window.Chart=Tn),Tn}));
//# sourceMappingURL=chart.umd.js.map


// --- Component: shared/wrapped/wrapped-ui.js ---
// ==========================================
// WRAPPED UI INJECTOR (Локальная статистика)
// ==========================================

let wrappedOverlay = null;

// Создание оболочки (overlay) для Wrapped
function createWrappedOverlay() {
  if (wrappedOverlay) return wrappedOverlay;

  wrappedOverlay = document.createElement('div');
  wrappedOverlay.id = 'ym-wrapped-overlay';
  wrappedOverlay.className = 'ym-wrapped-overlay-hidden';

  const style = document.createElement('style');
  style.textContent = `
    #ym-wrapped-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(135deg, rgba(20,20,25,0.95) 0%, rgba(10,10,15,0.98) 100%);
      z-index: 999999;
      display: flex;
      opacity: 1;
      transition: opacity 0.4s ease, transform 0.4s ease;
      color: white;
      font-family: 'YS Text', sans-serif;
      transform: scale(1);
      pointer-events: auto;
    }
    .ym-wrapped-overlay-hidden {
      opacity: 0;
      pointer-events: none !important;
      transform: scale(1.05) !important;
    }
    .ym-wrapped-overlay-visible {
      opacity: 1;
    }
    
    /* Sidebar (Tabs) */
    .ym-wrapped-sidebar {
      width: 250px;
      padding: 40px 20px;
      display: flex;
      flex-direction: column;
    }
    .ym-wrapped-sidebar h2 {
      margin: 0 0 40px 10px;
      font-size: 24px;
      background: linear-gradient(90deg, #ffdb4d, #ff8c00);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .ym-wrapped-tab-btn {
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.6);
      padding: 15px 20px;
      text-align: left;
      font-size: 16px;
      font-weight: 500;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 10px;
      font-family: inherit;
    }
    .ym-wrapped-tab-btn:hover {
      color: white;
    }
    .ym-wrapped-tab-btn.active {
      color: #ffdb4d;
      font-weight: bold;
    }

    /* Content Area */
    .ym-wrapped-main {
      flex: 1;
      padding: 50px;
      overflow-y: auto;
      position: relative;
    }
    
    .ym-wrapped-close {
      position: absolute;
      top: 30px;
      right: 40px;
      background: rgba(255,255,255,0.1);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.2s;
      z-index: 10;
    }
    .ym-wrapped-close:hover {
      background: rgba(255,255,255,0.2);
      transform: scale(1.1);
    }
    
    .ym-wrapped-tab-content {
      display: none;
      animation: fadeIn 0.4s ease;
      max-width: 1200px;
      margin: 0 auto;
    }
    .ym-wrapped-tab-content.active {
      display: block;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  document.head.appendChild(style);

  wrappedOverlay.innerHTML = `
    <button class="ym-wrapped-close" aria-label="Закрыть">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
    <div class="ym-wrapped-sidebar">
      <h2>Статистика</h2>
      <button class="ym-wrapped-tab-btn active" data-tab="overview">Обзор</button>
      <button class="ym-wrapped-tab-btn" data-tab="artists">Топ Артистов</button>
      <button class="ym-wrapped-tab-btn" data-tab="tracks">Топ Треков</button>
      <button class="ym-wrapped-tab-btn" data-tab="settings">Данные и Экспорт</button>
    </div>
    
    <div class="ym-wrapped-main">
      <!-- Контейнер куда будут рендериться графики -->
      <div id="ym-wrapped-tab-overview" class="ym-wrapped-tab-content active"></div>
      <div id="ym-wrapped-tab-artists" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-tracks" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-settings" class="ym-wrapped-tab-content"></div>
    </div>
  `;

  document.body.appendChild(wrappedOverlay);

  // Обработка закрытия
  wrappedOverlay.querySelector('.ym-wrapped-close').addEventListener('click', () => {
    closeWrapped();
  });

  // Логика переключения вкладок
  const tabBtns = wrappedOverlay.querySelectorAll('.ym-wrapped-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Снимаем active со всех кнопок и контента
      tabBtns.forEach(b => b.classList.remove('active'));
      wrappedOverlay.querySelectorAll('.ym-wrapped-tab-content').forEach(c => c.classList.remove('active'));
      
      // Ставим active на нажатую
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const content = wrappedOverlay.querySelector('#ym-wrapped-tab-' + tabId);
      if (content) content.classList.add('active');
    });
  });

  return wrappedOverlay;
}

function openWrapped() {
  const overlay = createWrappedOverlay();
  
  // Принудительно запрашиваем offsetWidth, чтобы браузер отрендерил элемент
  void overlay.offsetWidth;
  
  overlay.classList.remove('ym-wrapped-overlay-hidden');
  overlay.classList.add('ym-wrapped-overlay-visible');
  document.body.style.overflow = 'hidden';

  // Рендерим графики при открытии
  if (typeof window.renderWrappedCharts === 'function') {
    window.renderWrappedCharts();
  }
}

function closeWrapped() {
  if (!wrappedOverlay) return;
  wrappedOverlay.classList.remove('ym-wrapped-overlay-visible');
  wrappedOverlay.classList.add('ym-wrapped-overlay-hidden');
  
  // Ждем окончания анимации (0.4s) перед тем как вернуть скролл, 
  // чтобы страница не прыгала во время затухания
  setTimeout(() => {
    if (wrappedOverlay.classList.contains('ym-wrapped-overlay-hidden')) {
      document.body.style.overflow = '';
    }
  }, 400);
}

function injectWrappedButton() {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (!container) return;
  
  if (document.getElementById('ym-wrapped-btn')) return;

  const btn = document.createElement('li');
  btn.id = 'ym-wrapped-btn';
  btn.className = 'HcfYy4VfnRHqgXzIdL7w kRmUIkcHKD5AgtpPo8wT ym-navbar-item-injected';
  btn.setAttribute('title', 'Моя Статистика');
  
  const link = document.createElement('a');
  link.className = 'buOTZq_TKQOVyjMLrXvB ZfF8mQ3Iftpwu0aZgDtG yWJHrpNsBvchs9Jjyokk';
  link.style.cursor = 'pointer';
  
  const iconWrapper = document.createElement('div');
  iconWrapper.className = '_YzsXZGNK8KeaUFC4Ja1';
  iconWrapper.style.position = 'relative';
  
  // Иконка статистики (Chart)
  const svgDoc = new DOMParser().parseFromString(`
    <svg xmlns="http://www.w3.org/2000/svg" class="UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  `, 'image/svg+xml');
  iconWrapper.appendChild(svgDoc.documentElement);
  
  const textWrapper = document.createElement('div');
  textWrapper.className = 'nxMXCBiVfgH4oxds3f2y';
  const textSpan = document.createElement('span');
  textSpan.className = '_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA _3_Mxw7Si7j2g4kWjlpR';
  textSpan.style.webkitLineClamp = '1';
  textSpan.textContent = 'Wrapped';
  textSpan.setAttribute('title', 'Локальная статистика');
  
  textWrapper.appendChild(textSpan);
  link.appendChild(iconWrapper);
  link.appendChild(textWrapper);
  btn.appendChild(link);
  
  container.appendChild(btn);
  
  btn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    openWrapped();
  });
}

function initWrappedInjector() {
  // Пытаемся внедрить сразу
  injectWrappedButton();
  
  // И следим за изменениями DOM на случай SPA навигации
  const observer = new MutationObserver((mutations) => {
    if (!document.getElementById('ym-wrapped-btn')) {
      injectWrappedButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') {
  initWrappedInjector();
}


// --- Component: shared/wrapped/wrapped-db.js ---
// ==========================================
// WRAPPED DATABASE (IndexedDB)
// ==========================================

const DB_NAME = 'BetterYandexMusic_WrappedDB';
const DB_VERSION = 1;

class WrappedDB {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Таблица прослушиваний (история)
        if (!db.objectStoreNames.contains('listens')) {
          const listensStore = db.createObjectStore('listens', { keyPath: 'id', autoIncrement: true });
          listensStore.createIndex('trackId', 'trackId', { unique: false });
          listensStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Таблица треков (метаданные)
        if (!db.objectStoreNames.contains('tracks')) {
          const tracksStore = db.createObjectStore('tracks', { keyPath: 'id' });
          tracksStore.createIndex('title', 'title', { unique: false });
        }
        
        // Таблица артистов (метаданные)
        if (!db.objectStoreNames.contains('artists')) {
          const artistsStore = db.createObjectStore('artists', { keyPath: 'id' });
          artistsStore.createIndex('name', 'name', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event) => {
        console.error('WrappedDB Init Error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async addListen(trackData) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readwrite');
      const listensStore = transaction.objectStore('listens');
      const tracksStore = transaction.objectStore('tracks');
      const artistsStore = transaction.objectStore('artists');

      // 1. Сохраняем/обновляем метаданные трека
      tracksStore.put({
        id: trackData.id,
        title: trackData.title,
        cover: trackData.cover,
        duration: trackData.duration,
        artists: trackData.artists.map(a => a.id)
      });

      // 2. Сохраняем/обновляем метаданные артистов
      if (trackData.artists && Array.isArray(trackData.artists)) {
        trackData.artists.forEach(artist => {
          artistsStore.put({
            id: artist.id,
            name: artist.name,
            cover: artist.cover
          });
        });
      }

      // 3. Добавляем запись о прослушивании
      const listenRecord = {
        trackId: trackData.id,
        timestamp: Date.now(),
        durationListened: trackData.duration // Считаем полный трек для статистики
      };
      
      const request = listensStore.add(listenRecord);

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // Получить всю статистику (агрегация)
  async getStats() {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readonly');
      const listensStore = transaction.objectStore('listens');
      const tracksStore = transaction.objectStore('tracks');
      const artistsStore = transaction.objectStore('artists');

      const listens = [];
      const tracks = new Map();
      const artists = new Map();

      // Сбор всех данных
      listensStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          listens.push(cursor.value);
          cursor.continue();
        } else {
          // Загрузка метаданных треков
          tracksStore.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              tracks.set(cursor.value.id, cursor.value);
              cursor.continue();
            } else {
              // Загрузка метаданных артистов
              artistsStore.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                  artists.set(cursor.value.id, cursor.value);
                  cursor.continue();
                } else {
                  resolve(this.aggregateStats(listens, tracks, artists));
                }
              };
            }
          };
        }
      };
    });
  }

  aggregateStats(listens, tracksMap, artistsMap) {
    const totalListens = listens.length;
    let totalDurationSec = 0;
    
    const trackCounts = {};
    const artistCounts = {};
    const artistDuration = {}; // Время прослушивания артиста (в сек)
    
    const listensByMonth = new Array(12).fill(0);

    for (const listen of listens) {
      const track = tracksMap.get(listen.trackId);
      if (!track) continue;

      totalDurationSec += track.duration || 0;

      // Топ треков
      trackCounts[listen.trackId] = (trackCounts[listen.trackId] || 0) + 1;

      // Топ артистов
      if (track.artists) {
        track.artists.forEach(artistId => {
          artistCounts[artistId] = (artistCounts[artistId] || 0) + 1;
          artistDuration[artistId] = (artistDuration[artistId] || 0) + (track.duration || 0);
        });
      }

      // Активность по месяцам
      const month = new Date(listen.timestamp).getMonth();
      listensByMonth[month]++;
    }

    // Сортировка топов
    const topTracks = Object.entries(trackCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ track: tracksMap.get(id), count }));

    const topArtists = Object.entries(artistDuration) // Сортируем по времени прослушивания
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, duration]) => ({ 
        artist: artistsMap.get(id), 
        duration,
        count: artistCounts[id]
      }));

    return {
      totalListens,
      totalHours: (totalDurationSec / 3600).toFixed(1),
      topTracks,
      topArtists,
      listensByMonth
    };
  }

  // Экспорт базы данных в JSON
  async exportData() {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readonly');
      const data = { listens: [], tracks: [], artists: [] };
      
      let storesCompleted = 0;
      const checkDone = () => {
        storesCompleted++;
        if (storesCompleted === 3) resolve(JSON.stringify(data));
      };

      transaction.objectStore('listens').getAll().onsuccess = e => { data.listens = e.target.result; checkDone(); };
      transaction.objectStore('tracks').getAll().onsuccess = e => { data.tracks = e.target.result; checkDone(); };
      transaction.objectStore('artists').getAll().onsuccess = e => { data.artists = e.target.result; checkDone(); };
    });
  }

  // Импорт базы данных из JSON (слияние)
  async importData(jsonData) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      let data;
      try {
        data = JSON.parse(jsonData);
      } catch (e) {
        return reject(new Error('Неверный формат JSON'));
      }

      if (!data.listens || !data.tracks || !data.artists) {
        return reject(new Error('Отсутствуют необходимые таблицы в JSON'));
      }

      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readwrite');
      const listensStore = transaction.objectStore('listens');
      const tracksStore = transaction.objectStore('tracks');
      const artistsStore = transaction.objectStore('artists');

      // Сохраняем tracks и artists (put сам обновит/запишет поверх)
      data.tracks.forEach(track => tracksStore.put(track));
      data.artists.forEach(artist => artistsStore.put(artist));

      // Для listens нужно избежать дубликатов.
      // Так как keyPath='id' (autoIncrement), мы не можем просто put, если id пересекаются или разные на разных ПК.
      // Лучше всего: прочитать все текущие listens, создать Set из `${trackId}-${timestamp}`
      listensStore.getAll().onsuccess = (e) => {
        const existingListens = e.target.result;
        const existingSet = new Set(existingListens.map(l => `${l.trackId}-${l.timestamp}`));

        let addedCount = 0;
        data.listens.forEach(listen => {
          const key = `${listen.trackId}-${listen.timestamp}`;
          if (!existingSet.has(key)) {
            // Удаляем старый id, чтобы IndexedDB сгенерировал новый (autoIncrement)
            delete listen.id;
            listensStore.add(listen);
            addedCount++;
          }
        });

        resolve({ addedCount });
      };

      transaction.onerror = (e) => reject(e.target.error);
    });
  }
}

// Экспорт инстанса
const wrappedDB = new WrappedDB();
if (typeof window !== 'undefined') {
  window.wrappedDB = wrappedDB;
}


// --- Component: shared/wrapped/wrapped-tracker.js ---
// ==========================================
// WRAPPED TRACKER (Перехват треков)
// ==========================================

class WrappedTracker {
  constructor() {
    this.currentTrackId = null;
    this.trackStartTime = 0;
    this.listenLogged = false;
    this.checkInterval = null;
    
    // Запускаем инициализацию с задержкой
    setTimeout(() => this.init(), 3000);
  }

  init() {
    console.log('[Wrapped Tracker] Инициализация успешна. Следим за треками через Sonata...');

    // Запускаем интервал проверки процента прослушивания (раз в секунду)
    this.checkInterval = setInterval(() => this.checkProgress(), 1000);
  }

  getSonataTrackInfo(activePlayer) {
    try {
      const playerStateTrack = activePlayer.playbackState?.playerState?.track?.value || activePlayer.playbackState?.playerState?.track;
      const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value;
      const entityData = currentEntity?.entity?.data;
      
      const dataObj = playerStateTrack || entityData?.meta || entityData;
      if (!dataObj) return null;

      let duration = 0;
      if (dataObj.durationMs) {
        duration = dataObj.durationMs / 1000;
      } else if (activePlayer.playbackState?.playerState?.progress?.value?.duration) {
        duration = activePlayer.playbackState.playerState.progress.value.duration;
      }

      let artists = [];
      if (Array.isArray(dataObj.artists)) {
        artists = dataObj.artists.map(a => ({
          id: a.name || a.id,
          name: typeof a === 'object' ? a.name : a,
          cover: '' // Обложки артистов не всегда доступны тут
        }));
      }

      return {
        trackId: dataObj.id || (entityData && entityData.id),
        title: dataObj.title || 'Неизвестный трек',
        cover: dataObj.coverUri ? dataObj.coverUri.replace('%%', '400x400') : null,
        duration: duration,
        artists: artists
      };
    } catch (e) {
      return null;
    }
  }

  async checkProgress() {
    if (typeof window.getActivePlayer !== 'function') return;
    
    const activePlayer = window.getActivePlayer();
    if (!activePlayer) return;

    const trackInfo = this.getSonataTrackInfo(activePlayer);
    if (!trackInfo || !trackInfo.trackId) return;

    // Смена трека
    if (this.currentTrackId !== trackInfo.trackId) {
      this.currentTrackId = trackInfo.trackId;
      this.listenLogged = false;
      this.trackStartTime = Date.now();
      console.log(`[Wrapped Tracker] Новый трек: ${trackInfo.title}`);
    }

    if (this.listenLogged) return;

    const progress = activePlayer.playbackState?.playerState?.progress?.value;
    if (!progress || !progress.position || !trackInfo.duration) return;

    const position = progress.position;
    const duration = trackInfo.duration;
    
    // Порог: 30% трека
    const threshold = duration * 0.3;

    if (position >= threshold && threshold > 0) {
      this.listenLogged = true; // Отмечаем, чтобы не дублировать
      await this.saveListen(trackInfo);
    }
  }

  async saveListen(track) {
    try {
      const trackData = {
        id: track.trackId,
        title: track.title,
        cover: track.cover,
        duration: track.duration,
        artists: track.artists
      };

      if (window.wrappedDB) {
        await window.wrappedDB.addListen(trackData);
        console.log(`[Wrapped Tracker] Засчитано прослушивание: ${trackData.title}`);
        
        // Обновляем статистику в UI если она открыта
        if (typeof updateWrappedUI === 'function') {
          updateWrappedUI();
        }
      } else {
        console.warn('[Wrapped Tracker] wrappedDB не найден, прослушивание не сохранено.');
      }
    } catch (e) {
      console.error('[Wrapped Tracker] Ошибка при сохранении прослушивания:', e);
    }
  }
}

// Запускаем трекер
if (typeof window !== 'undefined') {
  window.wrappedTracker = new WrappedTracker();
}


// --- Component: shared/wrapped/wrapped-charts.js ---
// ==========================================
// WRAPPED CHARTS (Отрисовка статистики)
// ==========================================

let artistsChartInstance = null;
let tracksChartInstance = null;
let monthsChartInstance = null;

async function renderWrappedCharts() {
  const containerOverview = document.getElementById('ym-wrapped-tab-overview');
  const containerArtists = document.getElementById('ym-wrapped-tab-artists');
  const containerTracks = document.getElementById('ym-wrapped-tab-tracks');
  const containerSettings = document.getElementById('ym-wrapped-tab-settings');

  if (!containerOverview) return;

  if (!window.wrappedDB) {
    containerOverview.innerHTML = '<div style="color:red; text-align:center;">Ошибка: База данных недоступна</div>';
    return;
  }

  try {
    const stats = await window.wrappedDB.getStats();
    
    if (stats.totalListens === 0) {
      const emptyMsg = `
        <div style="text-align: center; color: rgba(255,255,255,0.5); margin-top: 100px;">
          <h2 style="font-size: 32px; color: white;">Пока нет данных 🥺</h2>
          <p style="font-size: 18px;">Послушайте несколько треков, чтобы статистика начала собираться!</p>
        </div>
      `;
      containerOverview.innerHTML = emptyMsg;
      containerArtists.innerHTML = emptyMsg;
      containerTracks.innerHTML = emptyMsg;
      renderSettingsTab(containerSettings);
      return;
    }

    // Общие настройки Chart.js для темной темы
    Chart.defaults.color = 'rgba(255, 255, 255, 0.6)';
    Chart.defaults.font.family = '"YS Text", sans-serif';

    // Рендер Обзора
    renderOverviewTab(containerOverview, stats);
    
    // Рендер Артистов
    renderArtistsTab(containerArtists, stats);
    
    // Рендер Треков
    renderTracksTab(containerTracks, stats);
    
    // Рендер Настроек (Экспорт/Импорт)
    renderSettingsTab(containerSettings);

  } catch (err) {
    console.error('Ошибка рендеринга графиков:', err);
    containerOverview.innerHTML = '<div style="color:red;">Ошибка при загрузке статистики.</div>';
  }
}

function renderOverviewTab(container, stats) {
  container.innerHTML = `
    <h2 style="font-size: 36px; margin-top: 0;">Обзор</h2>
    <div style="display: flex; gap: 30px; margin-bottom: 40px;">
      <div style="flex: 1; background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px; text-align: center;">
        <div style="font-size: 48px; font-weight: bold; color: #ffdb4d;">${stats.totalListens}</div>
        <div style="font-size: 16px; color: rgba(255,255,255,0.6); text-transform: uppercase;">Треков прослушано</div>
      </div>
      <div style="flex: 1; background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px; text-align: center;">
        <div style="font-size: 48px; font-weight: bold; color: #ff8c00;">${stats.totalHours}</div>
        <div style="font-size: 16px; color: rgba(255,255,255,0.6); text-transform: uppercase;">Часов музыки</div>
      </div>
    </div>
    
    <div style="background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px;">
      <h3 style="margin-top: 0; color: rgba(255,255,255,0.8);">Активность по месяцам</h3>
      <canvas id="ym-chart-months" height="100"></canvas>
    </div>
  `;

  const ctxMonths = document.getElementById('ym-chart-months').getContext('2d');
  if (monthsChartInstance) monthsChartInstance.destroy();

  const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  monthsChartInstance = new Chart(ctxMonths, {
    type: 'line',
    data: {
      labels: monthNames,
      datasets: [{
        label: 'Треков',
        data: stats.listensByMonth,
        borderColor: '#ff8c00',
        backgroundColor: 'rgba(255, 140, 0, 0.2)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderArtistsTab(container, stats) {
  let listHtml = '';
  stats.topArtists.forEach((a, i) => {
    const min = Math.round(a.duration / 60);
    listHtml += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="font-size: 18px;">
          <span style="color: rgba(255,255,255,0.4); margin-right: 15px; width: 20px; display: inline-block;">${i+1}.</span>
          ${a.artist ? a.artist.name : 'Неизвестный'}
        </div>
        <div style="color: #ffdb4d; font-weight: bold;">${min} мин.</div>
      </div>
    `;
  });

  container.innerHTML = `
    <h2 style="font-size: 36px; margin-top: 0;">Топ Артистов</h2>
    <div style="display: flex; gap: 40px;">
      <div style="flex: 1; background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px;">
        <canvas id="ym-chart-artists" height="250"></canvas>
      </div>
      <div style="flex: 1; background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px;">
        <h3 style="margin-top: 0;">Лидеры по времени</h3>
        ${listHtml}
      </div>
    </div>
  `;

  const ctxArtists = document.getElementById('ym-chart-artists').getContext('2d');
  if (artistsChartInstance) artistsChartInstance.destroy();
  
  artistsChartInstance = new Chart(ctxArtists, {
    type: 'doughnut',
    data: {
      labels: stats.topArtists.map(a => a.artist ? a.artist.name : 'Неизвестно'),
      datasets: [{
        data: stats.topArtists.map(a => Math.round(a.duration / 60)),
        backgroundColor: ['#ffdb4d', '#ff8c00', '#ff4d4d', '#cc00ff', '#4d4dff'],
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (context) => ` ${context.label}: ${context.raw} мин.`
          }
        }
      }
    }
  });
}

function renderTracksTab(container, stats) {
  let cardsHtml = '';
  stats.topTracks.slice(0, 10).forEach((t, i) => {
    const title = t.track ? t.track.title : 'Неизвестно';
    let coverUrl = t.track && t.track.cover ? t.track.cover : 'https://music.yandex.ru/blocks/playlist-cover/playlist-cover_like.png';
    if (coverUrl && !coverUrl.startsWith('http') && !coverUrl.startsWith('//')) {
      coverUrl = 'https://' + coverUrl;
    }
    const artistName = t.track && t.track.artists && t.track.artists.length > 0 ? (t.track.artists[0].name || t.track.artists[0]) : '';
    
    cardsHtml += `
      <div style="display: flex; align-items: center; background: rgba(255,255,255,0.03); border-radius: 12px; padding: 10px; transition: background 0.2s;">
        <div style="width: 30px; text-align: center; color: rgba(255,255,255,0.4); font-weight: bold; margin-right: 10px;">${i+1}</div>
        <img src="${coverUrl}" style="width: 50px; height: 50px; border-radius: 8px; margin-right: 15px; object-fit: cover;">
        <div style="flex: 1; overflow: hidden;">
          <div style="font-weight: 500; font-size: 16px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${title}</div>
          <div style="color: rgba(255,255,255,0.5); font-size: 14px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${artistName}</div>
        </div>
        <div style="margin-left: 15px; font-weight: bold; color: #ffdb4d;">${t.count} <span style="font-size: 12px; font-weight: normal; color: rgba(255,255,255,0.4);">раз</span></div>
      </div>
    `;
  });

  container.innerHTML = `
    <h2 style="font-size: 36px; margin-top: 0;">Топ Треков</h2>
    <div style="display: flex; gap: 40px;">
      <div style="flex: 1; background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px; display: flex; flex-direction: column; gap: 10px; max-height: 70vh; overflow-y: auto;">
        ${cardsHtml}
      </div>
      <div style="flex: 1; background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px;">
        <canvas id="ym-chart-tracks" height="250"></canvas>
      </div>
    </div>
  `;

  const ctxTracks = document.getElementById('ym-chart-tracks').getContext('2d');
  if (tracksChartInstance) tracksChartInstance.destroy();

  tracksChartInstance = new Chart(ctxTracks, {
    type: 'bar',
    data: {
      labels: stats.topTracks.slice(0, 5).map(t => t.track ? t.track.title.substring(0, 15) + '...' : 'Unknown'),
      datasets: [{
        label: 'Прослушиваний',
        data: stats.topTracks.slice(0, 5).map(t => t.count),
        backgroundColor: 'rgba(255, 219, 77, 0.8)',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderSettingsTab(container) {
  container.innerHTML = `
    <h2 style="font-size: 36px; margin-top: 0;">Данные и Экспорт</h2>
    <div style="background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px; max-width: 600px;">
      <p style="color: rgba(255,255,255,0.7); margin-bottom: 30px;">
        Вы можете выгрузить всю историю прослушиваний в файл, чтобы перенести её на другой компьютер (например, с работы домой) или просто сохранить для себя.
      </p>
      
      <div style="display: flex; gap: 20px; margin-bottom: 30px;">
        <button id="ym-wrapped-export-btn" style="flex: 1; padding: 15px; border-radius: 12px; border: none; background: #ffdb4d; color: black; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s;">
          📥 Экспорт в JSON
        </button>
        <button id="ym-wrapped-import-btn" style="flex: 1; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: white; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s;">
          📤 Импорт JSON
        </button>
      </div>
      
      <input type="file" id="ym-wrapped-import-file" accept=".json" style="display: none;">
      
      <div id="ym-wrapped-data-status" style="color: #4CAF50; font-weight: 500; min-height: 20px;"></div>
    </div>
  `;

  // Обработчики
  const exportBtn = document.getElementById('ym-wrapped-export-btn');
  const importBtn = document.getElementById('ym-wrapped-import-btn');
  const fileInput = document.getElementById('ym-wrapped-import-file');
  const statusDiv = document.getElementById('ym-wrapped-data-status');

  // Экспорт
  exportBtn.addEventListener('click', async () => {
    exportBtn.innerText = '⏳ Подготовка...';
    try {
      const jsonStr = await window.wrappedDB.exportData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `betteryandexmusic_wrapped_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      statusDiv.innerText = '✅ Данные успешно экспортированы!';
      statusDiv.style.color = '#4CAF50';
    } catch (e) {
      console.error(e);
      statusDiv.innerText = '❌ Ошибка экспорта данных.';
      statusDiv.style.color = '#ff4d4d';
    } finally {
      exportBtn.innerText = '📥 Экспорт в JSON';
    }
  });

  // Импорт
  importBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    statusDiv.innerText = '⏳ Чтение файла...';
    statusDiv.style.color = 'white';

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        statusDiv.innerText = '⏳ Объединение данных...';
        const res = await window.wrappedDB.importData(event.target.result);
        statusDiv.innerText = `✅ Импорт завершен! Добавлено новых записей: ${res.addedCount}.`;
        statusDiv.style.color = '#4CAF50';
        
        // Обновляем графики если нужно
        if (typeof window.renderWrappedCharts === 'function') {
          setTimeout(() => window.renderWrappedCharts(), 2000);
        }
      } catch (err) {
        console.error(err);
        statusDiv.innerText = '❌ Ошибка импорта: ' + err.message;
        statusDiv.style.color = '#ff4d4d';
      }
      fileInput.value = '';
    };
    reader.onerror = () => {
      statusDiv.innerText = '❌ Ошибка чтения файла.';
      statusDiv.style.color = '#ff4d4d';
    };
    reader.readAsText(file);
  });
}

// Экспорт (обновление) функции рендера в window
if (typeof window !== 'undefined') {
  window.renderWrappedCharts = renderWrappedCharts;
}


// --- Component: shared/quality-indicator.js ---
function updateTrackUI(metadata) {
  currentTrackMetadata = metadata;
  if (!metadata) {
    const indicator = document.getElementById('ym-player-quality-indicator');
    if (indicator) indicator.style.display = 'none';
    return;
  }
  let codecStr = '';
  let bitrateStr = '';
  const isLossless = metadata.codec && (metadata.codec.toLowerCase() === 'flac' || metadata.codec.toLowerCase() === 'flac-mp4' || metadata.quality === 'lossless');
  if (metadata.codec) {
    const codecLower = metadata.codec.toLowerCase();
    if (isLossless) {
      codecStr = 'FLAC';
    } else if (codecLower.includes('aac')) {
      codecStr = 'AAC';
    } else if (codecLower.includes('mp3')) {
      codecStr = 'MP3';
    } else {
      codecStr = metadata.codec.toUpperCase();
    }
    if (metadata.bitrate) {
      bitrateStr = ` (${metadata.bitrate} kbps)`;
    } else if (metadata.quality === 'lossless') {
      bitrateStr = ' (Lossless)';
    } else if (metadata.quality === 'hq') {
      bitrateStr = ' (HQ)';
    }
  }

  // Обновляем индикатор в плеере
  const indicator = document.getElementById('ym-player-quality-indicator');
  if (indicator) {
    if (metadata.codec) {
      indicator.textContent = codecStr;
      const qualityTier = metadata.quality === 'lossless' ? 'Lossless' : metadata.quality === 'hq' ? 'HQ' : 'Standard';
      indicator.setAttribute('title', `Формат: ${codecStr}\nБитрейт:${bitrateStr || ' -'}\nКачество: ${qualityTier}`);

      // Стилизация под фирменный стиль Яндекс Музыки
      if (isLossless) {
        indicator.style.background = '#ffdb4d'; // Фирменный желтый
        indicator.style.color = '#000000';
        indicator.style.border = 'none';
        indicator.style.boxShadow = '0 0 6px rgba(255, 219, 77, 0.4)';
      } else if (metadata.quality === 'hq' || metadata.bitrate >= 320) {
        indicator.style.background = 'rgba(255, 255, 255, 0.12)';
        indicator.style.color = '#ffffff';
        indicator.style.border = '1px solid rgba(255, 255, 255, 0.25)';
        indicator.style.boxShadow = 'none';
      } else {
        indicator.style.background = 'rgba(255, 255, 255, 0.05)';
        indicator.style.color = 'rgba(255, 255, 255, 0.6)';
        indicator.style.border = '1px solid rgba(255, 255, 255, 0.12)';
        indicator.style.boxShadow = 'none';
      }
      indicator.style.display = 'inline-flex';
    } else {
      indicator.style.display = 'none';
    }
  }
}

function injectPlayerQualityIndicator() {
  const lyricsBtn = document.querySelector('button[aria-label*="текстомузыку"]') || document.querySelector('button[aria-label*="Lyrics"]');
  if (!lyricsBtn) return;
  const parent = lyricsBtn.parentNode;
  if (!parent) return;
  let indicator = document.getElementById('ym-player-quality-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'ym-player-quality-indicator';
    indicator.style.display = 'none';
    indicator.style.alignItems = 'center';
    indicator.style.justifyContent = 'center';
    indicator.style.fontSize = '9px';
    indicator.style.fontWeight = '700';
    indicator.style.textTransform = 'uppercase';
    indicator.style.letterSpacing = '0.5px';
    indicator.style.padding = '2px 5px';
    indicator.style.borderRadius = '4px';
    indicator.style.marginRight = '8px';
    indicator.style.userSelect = 'none';
    indicator.style.transition = 'all 0.2s ease';
    indicator.style.cursor = 'help';
    indicator.style.position = 'relative';
    indicator.style.zIndex = '3';
    indicator.style.pointerEvents = 'auto';
    indicator.addEventListener('mouseenter', () => {
      let tooltip = document.getElementById('ym-quality-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'ym-quality-tooltip';
        tooltip.className = 'ym-quality-tooltip';
        document.body.appendChild(tooltip);
      }
      if (!currentTrackMetadata) return;
      const metadata = currentTrackMetadata;
      let codecStr = '';
      let bitrateStr = '';
      const isLossless = metadata.codec && (metadata.codec.toLowerCase() === 'flac' || metadata.codec.toLowerCase() === 'flac-mp4' || metadata.quality === 'lossless');
      if (metadata.codec) {
        const codecLower = metadata.codec.toLowerCase();
        if (isLossless) {
          codecStr = 'FLAC';
        } else if (codecLower.includes('aac')) {
          codecStr = 'AAC';
        } else if (codecLower.includes('mp3')) {
          codecStr = 'MP3';
        } else {
          codecStr = metadata.codec.toUpperCase();
        }
        if (metadata.bitrate && metadata.bitrate > 0) {
          bitrateStr = `${metadata.bitrate} kbps`;
        } else if (isLossless) {
          bitrateStr = 'Lossless';
        } else if (metadata.quality === 'hq') {
          bitrateStr = '320 kbps';
        } else {
          bitrateStr = '192 kbps';
        }
      }
      const qualityTier = metadata.quality === 'lossless' ? 'Lossless' : metadata.quality === 'hq' ? 'HQ' : 'Standard';
      tooltip.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 6px; color: ${isLossless ? '#ffdb4d' : '#ffffff'}; font-size: 11px;">
          Качество звука
        </div>
        <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 2px;">
          <span style="color: rgba(255,255,255,0.5);">Кодек:</span>
          <span style="color: #ffffff; font-weight: 600;">${codecStr}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 2px;">
          <span style="color: rgba(255,255,255,0.5);">Битрейт:</span>
          <span style="color: #ffffff; font-weight: 600;">${bitrateStr}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 16px;">
          <span style="color: rgba(255,255,255,0.5);">Качество:</span>
          <span style="color: ${isLossless ? '#ffdb4d' : metadata.quality === 'hq' ? '#ffffff' : 'rgba(255,255,255,0.8)'}; font-weight: 600;">${qualityTier}</span>
        </div>
      `;
      tooltip.classList.add('show');

      // Вычисляем координаты
      const rect = indicator.getBoundingClientRect();
      const tooltipWidth = tooltip.offsetWidth;
      const tooltipHeight = tooltip.offsetHeight;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      let top = rect.top - tooltipHeight - 8;
      if (left < 10) left = 10;
      if (left + tooltipWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltipWidth - 10;
      }
      if (top < 10) {
        top = rect.bottom + 8;
      }
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });
    indicator.addEventListener('mouseleave', () => {
      const tooltip = document.getElementById('ym-quality-tooltip');
      if (tooltip) {
        tooltip.classList.remove('show');
      }
    });
    parent.insertBefore(indicator, lyricsBtn);
    if (currentTrackMetadata) {
      updateTrackUI(currentTrackMetadata);
    }
  }
}

// --- Component: shared/lyrics/lrclib-client.js ---
function parseLrc(lrcText) {
  if (!lrcText) return null;
  const lines = lrcText.split('\n');
  const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/;
  const result = [];
  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0').substring(0, 3), 10) : 0;
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegex, '').trim();
      result.push({
        time,
        text
      });
    }
  }
  result.sort((a, b) => a.time - b.time);
  return result.length > 0 ? result : null;
}

function fetchLyrics(title, artist, durationMs) {
  const requestTrackId = currentLyricsTrackId;
  console.log('[LRCLIB] fetchLyrics called:', { title, artist, durationMs, requestTrackId });
  if (isLyricsLoading && window.ymTrackIdLoadingLyrics === requestTrackId) {
    console.log('[LRCLIB] Lyrics already loading for this track, skipping invocation');
    return;
  }
  
  isLyricsLoading = true;
  window.ymTrackIdLoadingLyrics = requestTrackId;
  window.ymHasFailedLyricsSearch = false;
  const container = document.getElementById('ym-lyrics-container');
  const infoEl = document.getElementById('ym-lyrics-track-info');
  if (infoEl) {
    infoEl.innerHTML = `Слушаем: <strong>${escapeHtml(title)}</strong> - ${escapeHtml(artist)}`;
  }
  if (container) {
    container.innerHTML = `<div class="ym-lyrics-empty"><span class="ym-sync-pulse-dot" style="width: 10px; height: 10px; background: #ffdb4d; box-shadow: 0 0 8px #ffdb4d;"></span>Загрузка текста из LRCLIB...</div>`;
  }
  const fsContainer = document.querySelector('.ym-fullscreen-lyrics-container');
  if (fsContainer) {
    fsContainer.innerHTML = `<div class="ym-fullscreen-lyrics-empty"><span class="ym-sync-pulse-dot" style="width: 15px; height: 15px; background: #ffdb4d; box-shadow: 0 0 12px #ffdb4d;"></span>Загрузка текста из LRCLIB...</div>`;
  }
  const durationSec = durationMs ? Math.round(durationMs / 1000) : 0;
  const cleanTitle = title.replace(/\s*[\[\(](?:remastered|feat|with|explicit|single|mix|deluxe|version)[\]\)]/gi, '').trim();
  const cleanArtist = artist.split(',')[0].trim();
  let url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
  if (durationSec > 0) {
    url += `&duration=${durationSec}`;
  }
  console.log('[LRCLIB] Search URL:', url);

  const handleResponseData = data => {
    console.log('[LRCLIB] Successfully loaded lyrics:', data);
    if (requestTrackId !== currentLyricsTrackId) return;
    isLyricsLoading = false;
    window.ymTrackIdLoadingLyrics = null;
    displayLyricsData(data);
  };
  const handleFailure = err => {
    console.warn('[LRCLIB] Failed to load lyrics:', err);
    if (requestTrackId !== currentLyricsTrackId) return;
    isLyricsLoading = false;
    window.ymTrackIdLoadingLyrics = null;
    window.ymHasFailedLyricsSearch = true;
    showSearchFallback(cleanTitle, cleanArtist);
  };
  if (window.__ymSyncBridge && typeof window.__ymSyncBridge.fetchLyrics === 'function') {
    window.__ymSyncBridge.fetchLyrics(url).catch(err => {
      let fallbackUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
      console.log('[LRCLIB] Primary fetch failed, trying fallback URL:', fallbackUrl);
      return window.__ymSyncBridge.fetchLyrics(fallbackUrl);
    }).then(handleResponseData).catch(handleFailure);
  } else {
    fetch(url).then(res => {
      if (res.status === 404) {
        let fallbackUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
        console.log('[LRCLIB] Primary fetch returned 404, trying fallback URL:', fallbackUrl);
        return fetch(fallbackUrl);
      }
      return res;
    }).then(res => {
      if (!res.ok) throw new Error('Not found');
      return res.json();
    }).then(handleResponseData).catch(handleFailure);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function displayLyricsData(data) {
  const container = document.getElementById('ym-lyrics-container');
  if (container) {
    container.innerHTML = '';
  }
  lastLyricsActiveIndex = -1;
  if (data.syncedLyrics) {
    currentLyricsLines = parseLrc(data.syncedLyrics);
    currentLyricsPlain = null;
    isSyncedLyrics = true;
  } else if (data.plainLyrics) {
    currentLyricsLines = null;
    currentLyricsPlain = data.plainLyrics;
    isSyncedLyrics = false;
  } else {
    currentLyricsLines = null;
    currentLyricsPlain = null;
    isSyncedLyrics = false;
    if (container) {
      container.innerHTML = `<div class="ym-lyrics-empty">У этого трека нет текста в базе данных.</div>`;
    }
    const fsContainer = document.querySelector('.ym-fullscreen-lyrics-container');
    if (fsContainer) {
      fsContainer.innerHTML = `<div class="ym-fullscreen-lyrics-empty">У этого трека нет текста в базе данных.</div>`;
    }
    return;
  }
  if (isSyncedLyrics && currentLyricsLines) {
    if (container) {
      currentLyricsLines.forEach((line, idx) => {
        const lineEl = document.createElement('div');
        lineEl.className = 'ym-lyric-line';
        lineEl.dataset.idx = idx;
        lineEl.dataset.time = line.time;
        lineEl.textContent = line.text || '...';
        lineEl.addEventListener('click', () => {
          lastSidebarUserInteractionTime = 0;
          window.postMessage({
            type: 'FROM_ISOLATED',
            action: 'SYNC_STATE',
            state: {
              time: line.time,
              trackId: currentLyricsTrackId,
              isPause: false
            }
          }, '*');
          try {
            if (typeof getActivePlayer === 'function') {
              const player = getActivePlayer();
              if (player) {
                player.setProgress(line.time);
                if (typeof player.resume === 'function') player.resume();
              }
            }
          } catch (e) {}
        });
        container.appendChild(lineEl);
      });
    }
    const fsContainer = document.querySelector('.ym-fullscreen-lyrics-container');
    if (fsContainer) {
      renderFullscreenLyricsLines(fsContainer);
    }
  } else if (currentLyricsPlain) {
    if (container) {
      const lines = currentLyricsPlain.split('\n');
      lines.forEach(line => {
        const lineEl = document.createElement('div');
        lineEl.className = 'ym-lyric-line';
        lineEl.style.color = '#ffffff';
        lineEl.style.cursor = 'default';
        lineEl.textContent = line.trim() || ' ';
        container.appendChild(lineEl);
      });
    }
    const fsContainer = document.querySelector('.ym-fullscreen-lyrics-container');
    if (fsContainer) {
      renderFullscreenLyricsLines(fsContainer);
    }
  }
}

function showSearchFallback(title, artist) {
  const container = document.getElementById('ym-lyrics-container');
  if (container) {
    container.innerHTML = `
      <div class="ym-lyrics-empty">
        Текст не найден в базе данных.
        <div class="ym-lyrics-search-box">
          <input type="text" id="ym-lyrics-search-input" value="${escapeHtml(artist)} - ${escapeHtml(title)}" placeholder="Введите название песни и артиста" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: #ffffff; padding: 8px 12px; font-size: 13px; outline: none; box-sizing: border-box; width: 100%;" />
          <button id="ym-lyrics-search-btn" class="ym-sync-primary-btn" style="padding: 8px;">Искать вручную</button>
        </div>
        <div id="ym-lyrics-search-results" class="ym-lyrics-search-results" style="display: none;"></div>
      </div>
    `;
    const searchBtn = document.getElementById('ym-lyrics-search-btn');
    const searchInput = document.getElementById('ym-lyrics-search-input');
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => {
        const q = searchInput.value.trim();
        if (q) performManualSearch(q);
      });
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const q = searchInput.value.trim();
          if (q) performManualSearch(q);
        }
      });
    }
  }
  const fsContainer = document.querySelector('.ym-fullscreen-lyrics-container');
  if (fsContainer) {
    fsContainer.innerHTML = `<div class="ym-fullscreen-lyrics-empty">Текст песни не найден.<br><span style="font-size: 16px; font-weight: 500; color: rgba(255,255,255,0.4); margin-top: 12px; display: inline-block;">Вы можете выполнить ручной поиск на панели плеера.</span></div>`;
  }
}

function performManualSearch(query) {
  const resultsContainer = document.getElementById('ym-lyrics-search-results');
  if (!resultsContainer) return;
  resultsContainer.style.display = 'block';
  resultsContainer.innerHTML = `<div style="text-align: center; font-size: 12px; padding: 10px; color: rgba(255,255,255,0.5);">Поиск...</div>`;
  const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
  const handleSearchResults = results => {
    if (!results || results.length === 0) {
      resultsContainer.innerHTML = `<div style="text-align: center; font-size: 12px; padding: 10px; color: rgba(255,255,255,0.4);">Ничего не найдено.</div>`;
      return;
    }
    resultsContainer.innerHTML = '';
    results.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'ym-lyrics-search-item';
      itemEl.innerHTML = `
        <div class="title" title="${escapeHtml(item.trackName)}">${escapeHtml(item.trackName)}</div>
        <div class="artist" title="${escapeHtml(item.artistName)}">${escapeHtml(item.artistName)} (${Math.floor(item.duration / 60)}:${String(item.duration % 60).padStart(2, '0')})</div>
      `;
      itemEl.addEventListener('click', () => {
        displayLyricsData(item);
      });
      resultsContainer.appendChild(itemEl);
    });
  };
  const handleSearchError = err => {
    resultsContainer.innerHTML = `<div style="text-align: center; font-size: 12px; padding: 10px; color: #ef4444;">Ошибка поиска.</div>`;
  };
  if (window.__ymSyncBridge && typeof window.__ymSyncBridge.fetchLyrics === 'function') {
    window.__ymSyncBridge.fetchLyrics(url).then(handleSearchResults).catch(handleSearchError);
  } else {
    fetch(url).then(res => res.json()).then(handleSearchResults).catch(handleSearchError);
  }
}

// --- Component: shared/lyrics/lyrics-sidebar.js ---
// Функции для текста песен (LRCLIB)
function findLyricsButton() {
  const selectors = ['[class*="PlayerBar_lyrics"]', '[class*="PlayerBar_showLyrics"]', '[class*="lyricsButton"]', '[class*="LyricsButton"]', 'button[title*="Текст"]', 'button[title*="текст"]', 'button[title*="Lyrics"]', 'button[title*="lyrics"]', 'button[aria-label*="Текст"]', 'button[aria-label*="текст"]', 'button[aria-label*="Lyrics"]', 'button[aria-label*="lyrics"]'];
  for (const sel of selectors) {
    try {
      const elements = document.querySelectorAll(sel);
      for (const btn of elements) {
        const isInvalid = Array.from(btn.classList).some(cls => cls.includes('contextMenu') || cls.includes('ContextMenu') || cls.includes('menu') || cls.includes('Menu') || cls.includes('PinItem'));
        if (isInvalid) continue;

        // Verify it belongs to some player bar container (standard or Vibe)
        const playerBar = btn.closest('[class*="PlayerBar_"], [class*="player-bar"], [class*="VibePlayerBar_"]');
        if (playerBar) {
          if (!window.hadLoggedLyricsBtnSelector) {
            console.log('[SYNC-DEBUG] findLyricsButton matched selector:', sel, 'classes:', Array.from(btn.classList));
            window.hadLoggedLyricsBtnSelector = true;
          }
          return btn;
        }
      }
    } catch (e) {}
  }
  return null;
}

function patchNativeLyricsButton() {
  const nativeBtn = findLyricsButton();
  if (!nativeBtn) {
    if (!window.hadWarnedLyricsBtnNotFound) {
      console.warn('[SYNC-DEBUG] Native lyrics button not found by any selector.');
      window.hadWarnedLyricsBtnNotFound = true;
    }
    return;
  }
  const isDisabledAttr = nativeBtn.hasAttribute('disabled') || nativeBtn.disabled;
  const hasAriaDisabled = nativeBtn.getAttribute('aria-disabled') === 'true';
  const isDisabledClass = Array.from(nativeBtn.classList).some(cls => cls.toLowerCase().includes('disabled'));
  const isCurrentlyNativelyDisabled = isDisabledAttr || hasAriaDisabled || isDisabledClass;
  window.ymLastKnownNativeLyricsState = !isCurrentlyNativelyDisabled;
  if (isCurrentlyNativelyDisabled) {
    nativeBtn.dataset.ymSyncPatched = 'true';
    let overlay = nativeBtn.parentElement.querySelector('.ym-sync-btn-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'ym-sync-btn-overlay';
      overlay.style.position = 'absolute';
      overlay.style.cursor = 'pointer';
      overlay.style.zIndex = '100';
      overlay.title = 'Текст песни (Yandex Music Sync)';
      const parent = nativeBtn.parentElement;
      if (window.getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(overlay);
      overlay.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        toggleNativeFullscreen();
      });
    }
    overlay.style.top = nativeBtn.offsetTop + 'px';
    overlay.style.left = nativeBtn.offsetLeft + 'px';
    overlay.style.width = nativeBtn.offsetWidth + 'px';
    overlay.style.height = nativeBtn.offsetHeight + 'px';
    overlay.style.display = 'block';
  } else {
    nativeBtn.dataset.ymSyncPatched = 'false';
    const overlay = nativeBtn.parentElement.querySelector('.ym-sync-btn-overlay');
    if (overlay) overlay.style.display = 'none';
  }
  injectLyricsPopover();
}

function injectLyricsPopover() {
  if (document.getElementById('ym-lyrics-popover')) return;
  const popover = document.createElement('div');
  popover.id = 'ym-lyrics-popover';
  popover.className = 'ym-lyrics-popover';
  popover.innerHTML = `
    <div class="ym-lyrics-header">
      <h3>Текст песни</h3>
      <button class="ym-lyrics-close-btn" id="ym-lyrics-close-btn">&times;</button>
    </div>
    <div class="ym-lyrics-body">
      <div id="ym-lyrics-track-info" class="ym-lyrics-track-info">Воспроизведите трек...</div>
      <div id="ym-lyrics-container" class="ym-lyric-lines-container">
        <div class="ym-lyrics-empty">Нет активного воспроизведения</div>
      </div>
    </div>
  `;
  document.body.appendChild(popover);
  const container = document.getElementById('ym-lyrics-container');
  if (container) {
    const updateInteraction = () => {
      lastSidebarUserInteractionTime = Date.now();
    };
    container.addEventListener('wheel', updateInteraction, {
      passive: true
    });
    container.addEventListener('touchmove', updateInteraction, {
      passive: true
    });
    container.addEventListener('mousedown', updateInteraction, {
      passive: true
    });
  }
  const closeBtn = document.getElementById('ym-lyrics-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      popover.classList.remove('show');
    });
  }
  const scrollableSidebar = document.querySelector('[class*="NavbarDesktop_scrollableContent"]');
  if (scrollableSidebar) {
    scrollableSidebar.addEventListener('scroll', () => {
      if (popover.classList.contains('show')) {
        positionLyricsPopover();
      }
    });
  }
}

function toggleLyricsPopover() {
  const popover = document.getElementById('ym-lyrics-popover');
  if (!popover) return;
  const isShowing = popover.classList.contains('show');
  if (isShowing) {
    popover.classList.remove('show');
  } else {
    const syncPopover = document.getElementById('ym-sync-popover');
    if (syncPopover) syncPopover.classList.remove('show');
    const themePopover = document.getElementById('ym-theme-popover');
    if (themePopover) themePopover.classList.remove('show');
    positionLyricsPopover();
    popover.classList.add('show');
    if (currentLyricsTrackId) {
      const activeLineEl = document.querySelector('.ym-lyric-line.active');
      if (activeLineEl) {
        setTimeout(() => activeLineEl.scrollIntoView({
          behavior: 'auto',
          block: 'center'
        }), 100);
      }
    }
  }
}

function positionLyricsPopover() {
  const btn = findLyricsButton();
  const popover = document.getElementById('ym-lyrics-popover');
  if (!btn || !popover) return;
  const rect = btn.getBoundingClientRect();
  const popoverWidth = popover.offsetWidth || 320;
  const popoverHeight = popover.offsetHeight || 480;
  let left = rect.left + rect.width / 2 - popoverWidth / 2;
  let top = rect.top - popoverHeight - 12;
  if (top < 10) top = 10;
  if (left < 10) left = 10;
  if (left + popoverWidth > window.innerWidth - 10) {
    left = window.innerWidth - popoverWidth - 10;
  }
  if (left + popoverWidth > window.innerWidth - 10) {
    left = window.innerWidth - popoverWidth - 10;
  }
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

// --- Component: shared/lyrics/lyrics-highlight.js ---
function updateLyricsHighlight(position) {
  if (!isSyncedLyrics || !currentLyricsLines || currentLyricsLines.length === 0) return;
  let activeIdx = -1;
  for (let i = 0; i < currentLyricsLines.length; i++) {
    if (position >= currentLyricsLines[i].time) {
      activeIdx = i;
    } else {
      break;
    }
  }
  if (activeIdx !== -1 && activeIdx !== lastLyricsActiveIndex) {
    lastLyricsActiveIndex = activeIdx;
    const lineElements = document.querySelectorAll('.ym-lyric-line');
    lineElements.forEach(el => el.classList.remove('active'));
    const activeEl = document.querySelector(`.ym-lyric-line[data-idx="${activeIdx}"]`);
    if (activeEl) {
      activeEl.classList.add('active');
      const container = document.getElementById('ym-lyrics-container');
      if (container) {
        const containerHeight = container.clientHeight;
        const activeTop = activeEl.offsetTop;
        const activeHeight = activeEl.clientHeight;
        if (Date.now() - lastSidebarUserInteractionTime > 7000) {
          container.scrollTo({
            top: activeTop - containerHeight / 2 + activeHeight / 2,
            behavior: 'smooth'
          });
        }
      }
    }

    // For fullscreen player
    const fsContainer = document.querySelector('.ym-fullscreen-lyrics-container');
    if (fsContainer) {
      const fsLineElements = fsContainer.querySelectorAll('.ym-fullscreen-lyric-line');
      fsLineElements.forEach(el => el.classList.remove('active'));
      const fsActiveEl = fsContainer.querySelector(`.ym-fullscreen-lyric-line[data-idx="${activeIdx}"]`);
      if (fsActiveEl) {
        fsActiveEl.classList.add('active');
        const containerHeight = fsContainer.clientHeight;
        const activeRect = fsActiveEl.getBoundingClientRect();
        const containerRect = fsContainer.getBoundingClientRect();
        const activeTop = activeRect.top - containerRect.top + fsContainer.scrollTop;
        const activeHeight = fsActiveEl.clientHeight;
        if (Date.now() - lastFsUserInteractionTime > 7000) {
          fsContainer.scrollTo({
            top: activeTop - containerHeight / 2 + activeHeight / 2,
            behavior: 'smooth'
          });
        }
      }
    }
  }
}

function handleLocalStateUpdate(state) {
  if (!state) return;
  const position = typeof state.position !== 'undefined' ? state.position : state.time;
  const isPause = state.isPause;
  const metadata = state.metadata;
  const trackId = state.trackId;
  if (trackId !== window.ymLastLoggedTrackId) {
    console.log('[SYNC-DEBUG] handleLocalStateUpdate track changed:', {
      trackId: state.trackId,
      hasMetadata: !!state.metadata,
      metadataHasLyrics: state.metadata ? state.metadata.hasLyrics : 'no_metadata'
    });
    window.ymLastLoggedTrackId = trackId;
    window.ymCurrentTrackHasLyrics = null;
    window.ymLastKnownNativeLyricsState = null;
    window.hadLoggedFsEvaluation = false;
    window.hadLoggedFsDecision = false;
    window.hadLoggedFsCustomLyricsStarted = false;

    // Unpatch native button on track change so it re-evaluates correctly for the new track
    const nativeBtn = document.querySelector('[class*="PlayerBarDesktop_lyricsButton"]') || document.querySelector('[class*="PlayerBar_lyricsButton"]') || document.querySelector('button[aria-label="Текст песни"]') || document.querySelector('[data-test-id="lyrics-button"]');
    if (nativeBtn) {
      nativeBtn.dataset.ymSyncPatched = 'false';
      nativeBtn.style.pointerEvents = '';
      nativeBtn.style.opacity = '';
      nativeBtn.style.cursor = '';
    }
  }
  if (metadata && typeof metadata.hasLyrics !== 'undefined') {
    if (window.ymCurrentTrackHasLyrics !== metadata.hasLyrics) {
      window.ymCurrentTrackHasLyrics = metadata.hasLyrics;
      console.log('[SYNC-DEBUG] Updated window.ymCurrentTrackHasLyrics to:', window.ymCurrentTrackHasLyrics);
    }
  }
  if (!trackId) {
    currentLyricsTrackId = null;
    currentLyricsLines = null;
    currentLyricsPlain = null;
    isSyncedLyrics = false;
    const container = document.getElementById('ym-lyrics-container');
    const infoEl = document.getElementById('ym-lyrics-track-info');
    if (infoEl) infoEl.textContent = 'Воспроизведение не запущено';
    if (container) container.innerHTML = `<div class="ym-lyrics-empty">Включите трек для просмотра текста</div>`;
    return;
  }

  const customLyricsMode = localStorage.getItem('ymCustomLyricsMode') || 'fallback';

  if (trackId !== currentLyricsTrackId) {
    currentLyricsTrackId = trackId;
    currentLyricsLines = null;
    currentLyricsPlain = null;
    isSyncedLyrics = false;
    lastLyricsActiveIndex = -1;
    window.ymHasFailedLyricsSearch = false;

    if (customLyricsMode === 'disabled') {
      return;
    }

    if (metadata && metadata.title) {
      // Если mode === 'always', всегда ищем текст
      // Если 'fallback', ищем только если нет текста от Яндекса
      if (customLyricsMode === 'always' || !metadata.hasLyrics) {
        fetchLyrics(metadata.title, metadata.artist, metadata.durationMs);
      }
    } else {
      const container = document.getElementById('ym-lyrics-container');
      const infoEl = document.getElementById('ym-lyrics-track-info');
      if (infoEl) infoEl.textContent = 'Загрузка информации о треке...';
      if (container) container.innerHTML = `<div class="ym-lyrics-empty">Загрузка информации...</div>`;
    }
  } else {
    if (customLyricsMode !== 'disabled' && metadata && metadata.title && !currentLyricsLines && !currentLyricsPlain && (!isLyricsLoading || window.ymTrackIdLoadingLyrics !== currentLyricsTrackId) && !window.ymHasFailedLyricsSearch) {
      if (customLyricsMode === 'always' || !metadata.hasLyrics) {
        fetchLyrics(metadata.title, metadata.artist, metadata.durationMs);
      }
    }
  }
  if (position && !isPause) {
    updateLyricsHighlight(position);
  }
}

window.addEventListener('message', event => {
  if (event.data && event.data.type === 'YM_SYNC_STATE_CHANGED') {
    handleLocalStateUpdate(event.data.state);
  }
});

// --- Component: shared/fullscreen/fullscreen-utils.js ---
function openNativeFullscreen() {
  const btn = document.querySelector('button[aria-label*="Плеер на весь экран"], button[class*="FullscreenPlayerDesktopButton_button"]');
  if (btn) {
    console.log('[SYNC] Found dedicated fullscreen button, triggering click');
    btn.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true
    }));
    btn.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true
    }));
    btn.click();
    return true;
  }

  // Cover image click (specifically for VibePlayerBar / My Wave cover image click)
  const coverImg = document.querySelector('[class*="AlbumCover_coverContainer"] img, [class*="VibePlayerBar_"] [class*="AlbumCover_cover"] img');
  if (coverImg) {
    console.log('[SYNC] Found AlbumCover image, triggering click to open fullscreen');
    coverImg.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true
    }));
    coverImg.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true
    }));
    coverImg.click();
    return true;
  }

  // Fallback: look inside any cover container for a button
  const coverContainer = document.querySelector('[class*="coverContainer"], [class*="PlayerBarDesktopWithBackgroundProgressBar_coverContainer"]');
  if (coverContainer) {
    const fallbackBtn = coverContainer.querySelector('button');
    if (fallbackBtn) {
      console.log('[SYNC] Found button inside cover container, triggering click');
      fallbackBtn.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true
      }));
      fallbackBtn.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true
      }));
      fallbackBtn.click();
      return true;
    }
  }

  // Double fallback to cover images
  const fallbacks = ['[class*="PlayerBarDesktop_cover"]', '[class*="PlayerBar_cover"]', '[class*="PlayerBar_trackCover"]', '[class*="VibePlayerBar_cover"]', '[class*="PlayerBarDesktop_root"] img', '[class*="PlayerBar_"] img', '[class*="VibePlayerBar_"] img'];
  for (const sel of fallbacks) {
    const el = document.querySelector(sel);
    if (el) {
      console.log('[SYNC] Firing events on fallback cover element:', el);
      let current = el;
      for (let i = 0; i < 5; i++) {
        if (!current || current === document.body) break;
        current.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true
        }));
        current.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true
        }));
        current.click();
        current = current.parentElement;
      }
      return true;
    }
  }
  return false;
}

function toggleNativeFullscreen() {
  const isFullscreen = !!document.querySelector('[class*="FullscreenPlayerDesktop_root"]');
  if (isFullscreen) {
    const closeBtn = document.querySelector('[class*="FullscreenPlayerDesktop_closeButton"]');
    if (closeBtn) {
      closeBtn.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true
      }));
      closeBtn.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true
      }));
      closeBtn.click();
      return;
    }
  }
  openNativeFullscreen();
}

function checkContextMenuAndAddFullscreenOption(specificMenu) {
  const contextMenu = specificMenu || document.querySelector('[role="menu"], [class*="ContextMenu_root"], [class*="VibeContextMenu_root"]');
  if (!contextMenu) return;
  
  // Skip if already checked and decided not to patch, or already patched
  if (contextMenu.dataset.ymContextMenuPatched === 'true') return;
  
  const innerText = contextMenu.innerText || '';
  const isTrackMenu = innerText.includes('Моя волна по треку') || innerText.toLowerCase().includes('моя волна по треку');
  const hasTrackIcon = !!contextMenu.querySelector('svg use[xlink\\:href*="vibe"]');
  
  if (!isTrackMenu && !hasTrackIcon) {
    return;
  }
  
  console.log('[SYNC] Found track context menu. Adding fullscreen option...');

  // Mark context menu as patched
  contextMenu.dataset.ymContextMenuPatched = 'true';
  
  const container = contextMenu.querySelector('[class*="ContextMenu_menu"], [class*="ContextMenu_list"], .ggP7WX2_erziDHFOo32s') || contextMenu;
  if (!container) return;
  
  const siblingButton = container.querySelector('button');
  const newBtn = document.createElement('button');
  newBtn.className = siblingButton ? siblingButton.className : 'cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM';
  newBtn.type = 'button';
  newBtn.setAttribute('role', 'menuitem');
  newBtn.setAttribute('tabindex', '-1');
  
  newBtn.innerHTML = `
    <span class="JjlbHZ4FaP9EAcR_1DxF">
      <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 12px;">
        <path d="M15 3h6v6" />
        <path d="M9 21H3v-6" />
        <path d="M21 3l-7 7" />
        <path d="M3 21l7-7" />
      </svg>
      Развернуть на весь экран
    </span>
  `;
  
  newBtn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    toggleNativeFullscreen();
    contextMenu.remove();
  });
  
  const vibeBtn = Array.from(container.querySelectorAll('button')).find(btn => {
    const text = (btn.innerText || '').toLowerCase().replace(/\s+/g, ' ');
    return text.includes('моя волна по треку');
  });
  
  if (vibeBtn) {
    vibeBtn.parentNode.insertBefore(newBtn, vibeBtn.nextSibling);
    console.log('[SYNC] Injected button after "Моя волна по треку" button');
  } else {
    container.insertBefore(newBtn, container.firstChild);
    console.log('[SYNC] Injected button at start of context menu');
  }
}

// Observe body for dynamic context menu additions to prevent intervals lag
if (typeof window !== 'undefined' && !window.ymContextMenuObserver) {
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const menu = node.matches('[role="menu"]') ? node : node.querySelector('[role="menu"], [class*="ContextMenu_root"], [class*="VibeContextMenu_root"]');
          if (menu) {
            // Wait 50ms for React rendering to populate the menu items
            setTimeout(() => checkContextMenuAndAddFullscreenOption(menu), 50);
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.ymContextMenuObserver = observer;
  console.log('[SYNC] Context menu MutationObserver successfully registered');
}

// --- Component: shared/fullscreen/fullscreen-lyrics.js ---
// ==========================================
// FULLSCREEN LYRICS AND GENIUS MODE
// ==========================================

let currentGeniusTrackId = null;
let currentGeniusSongId = null;
let isGeniusLoading = false;
let currentGeniusReferents = [];
let currentGeniusLyricsHtml = null;
let lastSelectedReferentId = null;

function resetGeniusData() {
  currentGeniusTrackId = null;
  currentGeniusSongId = null;
  isGeniusLoading = false;
  currentGeniusReferents = [];
  currentGeniusLyricsHtml = null;
  lastSelectedReferentId = null;
}

function processGeniusLyricsDom(rootEl, currentLyricsLines) {
  function findClosestLyricsLine(text, lrclibLines) {
    if (!text || !lrclibLines) return -1;
    const cleanGenius = text.trim().toLowerCase().replace(/[ёЁ]/g, 'е').replace(/[йЙ]/g, 'и');
    const normGenius = window.normalizeLyricsText(cleanGenius);
    if (!normGenius) return -1;

    // 1. Exact match
    let matchedIdx = lrclibLines.findIndex(l => window.normalizeLyricsText(l.text) === normGenius);
    if (matchedIdx !== -1) return matchedIdx;

    // 2. Substring match
    matchedIdx = lrclibLines.findIndex(l => {
      const lNorm = window.normalizeLyricsText(l.text);
      return lNorm && (lNorm.includes(normGenius) || normGenius.includes(lNorm));
    });
    if (matchedIdx !== -1) return matchedIdx;

    // 3. Word-based Jaccard similarity (highly accurate, prevents matching unrelated lines)
    const getWords = (str) => {
      let val = str.toLowerCase();
      // Map Belarusian/Ukrainian characters to Russian equivalents
      const charMap = {
        'э': 'е',
        'ў': 'у',
        'і': 'и',
        'є': 'е',
        'ї': 'и',
        'ґ': 'г'
      };
      val = val.replace(/[эўієїґ]/g, m => charMap[m]);
      return val
        .replace(/[ёЁ]/g, 'е')
        .replace(/[йЙ]/g, 'и')
        .replace(/[^\w\sа-яё]/gi, '')
        .split(/\s+/)
        .filter(w => w.length > 1);
    };

    const wordsGenius = getWords(text);
    if (wordsGenius.length === 0) return -1;

    let bestIdx = -1;
    let bestScore = 0;

    for (let i = 0; i < lrclibLines.length; i++) {
      const wordsLrc = getWords(lrclibLines[i].text);
      if (wordsLrc.length === 0) continue;

      const setLrc = new Set(wordsLrc);
      let intersection = 0;
      for (const w of wordsGenius) {
        if (setLrc.has(w)) intersection++;
      }

      const union = new Set([...wordsGenius, ...wordsLrc]).size;
      const score = intersection / union;

      if (score > 0.45 && score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx !== -1) return bestIdx;

    // 4. Fallback: Levenshtein distance on normalized strings
    // (This catches cases where spelling/language differences like Belarusian vs Russian drop Jaccard score)
    function getLevenshteinDistance(s1, s2) {
      if (s1 === s2) return 0;
      if (s1.length === 0) return s2.length;
      if (s2.length === 0) return s1.length;
      
      const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
      for (let i = 0; i <= s1.length; i += 1) {
        track[0][i] = i;
      }
      for (let j = 0; j <= s2.length; j += 1) {
        track[j][0] = j;
      }
      for (let j = 1; j <= s2.length; j += 1) {
        for (let i = 1; i <= s1.length; i += 1) {
          const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
          track[j][i] = Math.min(
            track[j][i - 1] + 1,
            track[j - 1][i] + 1,
            track[j - 1][i - 1] + indicator
          );
        }
      }
      return track[s2.length][s1.length];
    }

    let bestLevIdx = -1;
    let bestLevScore = 0;

    for (let i = 0; i < lrclibLines.length; i++) {
      const normLrc = window.normalizeLyricsText(lrclibLines[i].text);
      if (!normLrc) continue;

      const distance = getLevenshteinDistance(normGenius, normLrc);
      const maxLength = Math.max(normGenius.length, normLrc.length);
      if (maxLength === 0) continue;
      const score = 1 - (distance / maxLength);

      // Require at least 50% similarity for Levenshtein fallback
      if (score > 0.50 && score > bestLevScore) {
        bestLevScore = score;
        bestLevIdx = i;
      }
    }

    if (bestLevIdx !== -1) {
      console.log(`[GENIUS-SYNC] Levenshtein matched with score ${bestLevScore.toFixed(2)}: "${text.trim()}" -> "${lrclibLines[bestLevIdx].text}"`);
      return bestLevIdx;
    }

    return -1;
  }

  let matchedCount = 0;
  let unmatchedCount = 0;

  let hasAnyMatches = false;
  if (currentLyricsLines && currentLyricsLines.length > 0) {
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim();
      if (text && !(text.startsWith('[') && text.endsWith(']'))) {
        if (findClosestLyricsLine(text, currentLyricsLines) !== -1) {
          hasAnyMatches = true;
          break;
        }
      }
    }
  }

  const isStaticFallback = !hasAnyMatches;
  if (isStaticFallback) {
    console.log('[GENIUS-SYNC] No matches found or LRCLIB empty. Falling back to static mode.');
  }

  function traverse(element) {
    const childNodes = Array.from(element.childNodes);
    for (const child of childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent;
        const trimmed = text.trim();
        if (!trimmed) continue;
        
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          const span = document.createElement('span');
          span.className = 'ym-genius-header-label ym-genius-lyric-line ym-fullscreen-lyric-line';
          span.textContent = text;
          element.replaceChild(span, child);
          continue;
        }

        if (isStaticFallback) {
          const span = document.createElement('span');
          span.className = 'ym-genius-lyric-line ym-fullscreen-lyric-line static';
          span.textContent = text;
          element.replaceChild(span, child);
        } else {
          const matchedIdx = findClosestLyricsLine(text, currentLyricsLines);
          if (matchedIdx !== -1) {
            matchedCount++;
            const span = document.createElement('span');
            span.className = 'ym-genius-lyric-line ym-fullscreen-lyric-line';
            span.setAttribute('data-idx', matchedIdx);
            span.textContent = text;
            element.replaceChild(span, child);
            console.log(`[GENIUS-SYNC] MATCHED: "${trimmed.substring(0, 30)}..." -> index ${matchedIdx}`);
          } else {
            unmatchedCount++;
            console.warn(`[GENIUS-SYNC] Removing unmatched text node: "${trimmed.substring(0, 45)}..."`);
            child.remove();
          }
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.classList.contains('ym-genius-lyric-line')) continue;
        traverse(child);
      }
    }
  }

  function cleanupEmptyElements(root) {
    const tags = ['a', 'span', 'b', 'i', 'strong', 'em', 'p'];
    let changed = true;
    while (changed) {
      changed = false;
      for (const tag of tags) {
        const els = Array.from(root.querySelectorAll(tag));
        for (const el of els) {
          if (!el.parentNode) continue;
          const hasImage = !!el.querySelector('img');
          const hasLine = !!el.querySelector('.ym-genius-lyric-line');
          if (!el.textContent.trim() && !hasImage && !hasLine) {
            el.remove();
            changed = true;
          }
        }
      }
    }
  }

  function cleanupBrElements(root) {
    const brs = Array.from(root.querySelectorAll('br'));
    for (const br of brs) {
      if (!br.parentNode) continue;

      let prev = br.previousSibling;
      let isFirst = true;
      while (prev) {
        if (prev.nodeType === Node.ELEMENT_NODE) {
          isFirst = false;
          break;
        } else if (prev.nodeType === Node.TEXT_NODE) {
          if (prev.textContent.trim()) {
            isFirst = false;
            break;
          }
        }
        prev = prev.previousSibling;
      }
      if (isFirst) {
        br.remove();
        continue;
      }

      let next = br.nextSibling;
      let hasConsecutiveBr = false;
      while (next) {
        if (next.nodeType === Node.ELEMENT_NODE) {
          if (next.tagName.toLowerCase() === 'br') {
            hasConsecutiveBr = true;
          }
          break;
        } else if (next.nodeType === Node.TEXT_NODE) {
          if (next.textContent.trim()) {
            break;
          }
        }
        next = next.nextSibling;
      }
      if (hasConsecutiveBr) {
        br.remove();
      }
    }
  }

  console.log(`[GENIUS-SYNC] Starting DOM lyrics alignment with ${currentLyricsLines?.length || 0} LRCLIB lines.`);
  traverse(rootEl);
  cleanupEmptyElements(rootEl);
  cleanupBrElements(rootEl);
  console.log(`[GENIUS-SYNC] Alignment finished: ${matchedCount} matched, ${unmatchedCount} unmatched text nodes.`);
}

function findGeniusReferentForLine(lineText, referents) {
  if (!lineText || !referents || referents.length === 0) return null;
  
  const normYandex = window.normalizeLyricsText(lineText);
  if (!normYandex) return null;

  // 1. First pass: try exact match on normalized lines
  for (const ref of referents) {
    if (!ref.fragment) continue;
    const refLines = ref.fragment.split('\n');
    for (const refLine of refLines) {
      const normRefLine = window.normalizeLyricsText(refLine);
      if (normRefLine === normYandex) {
        return ref;
      }
    }
  }

  // 2. Second pass: try substring match (only if length >= 6)
  for (const ref of referents) {
    if (!ref.fragment) continue;
    
    const refLines = ref.fragment.split('\n');
    for (const refLine of refLines) {
      const normRefLine = window.normalizeLyricsText(refLine);
      if (!normRefLine) continue;
      
      if (normRefLine.length >= 6) {
        if (normYandex.includes(normRefLine) || normRefLine.includes(normYandex)) {
          return ref;
        }
      }
    }
    
    // Also try matching the entire (joined) normalized fragment
    const normFullRef = window.normalizeLyricsText(ref.fragment);
    if (normFullRef && normFullRef.length >= 8) {
      if (normYandex.includes(normFullRef) || normFullRef.includes(normYandex)) {
        return ref;
      }
    }
  }

  return null;
}

function renderGeniusPanelStructure(panel) {
  if (!panel) return;
  panel.replaceChildren();

  // Header
  const header = document.createElement('div');
  header.className = 'ym-genius-panel-header';
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  `;

  const title = document.createElement('div');
  title.style.cssText = 'font-size: 16px; font-weight: 700; color: #ffdb4d; font-family: "YSMusic Headline", sans-serif;';
  title.textContent = 'Genius';

  const exitBtn = document.createElement('button');
  exitBtn.className = 'ym-genius-panel-exit-btn';
  exitBtn.textContent = 'Вернуться';
  exitBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    localStorage.setItem('ymGeniusMode', 'false');
    handleFullscreenPlayer();
  });

  header.appendChild(title);
  header.appendChild(exitBtn);
  panel.appendChild(header);

  // Body container
  const body = document.createElement('div');
  body.className = 'ym-genius-panel-body';
  body.style.cssText = `
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  `;
  panel.appendChild(body);

  resetAnnotationPanelBody(body);
}

function resetAnnotationPanelBody(body) {
  if (!body) return;
  body.replaceChildren();

  const welcomeDiv = document.createElement('div');
  welcomeDiv.className = 'ym-genius-annotation-welcome';
  welcomeDiv.style.cssText = `
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    text-align: center;
    opacity: 0.85;
    padding: 20px 0;
  `;

  const titleDiv = document.createElement('div');
  titleDiv.style.cssText = 'font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #ffffff; font-family: "YSMusic Headline", sans-serif;';
  titleDiv.textContent = 'Смыслы и отсылки';

  const descDiv = document.createElement('div');
  descDiv.style.cssText = 'font-size: 14px; opacity: 0.7; line-height: 1.5; font-family: "YS Text", sans-serif; max-width: 300px; margin: 0 auto;';
  descDiv.textContent = 'Нажмите на любую выделенную строчку текста песни слева, чтобы прочитать описание отсылки.';

  welcomeDiv.appendChild(titleDiv);
  welcomeDiv.appendChild(descDiv);
  body.appendChild(welcomeDiv);
}

function resetAnnotationPanel(panel) {
  renderGeniusPanelStructure(panel);
}

function extractGeniusSongId(searchResponse, searchTitleText, searchArtistText) {
  if (!searchResponse || !searchResponse.response || !searchResponse.response.sections) return null;
  
  let bestHit = null;
  let bestScore = -999;
  
  const cleanStr = (s) => (s || '').toLowerCase().replace(/[^\w\sа-яё]/gi, '');
  const searchArtist = cleanStr(searchArtistText);
  const searchTitle = cleanStr(searchTitleText);

  for (const sec of searchResponse.response.sections) {
    if (!sec.hits) continue;
    for (const hit of sec.hits) {
      if ((hit.type === 'song' || hit.index === 'song') && hit.result && hit.result.id) {
        const hitArtist = cleanStr(hit.result.primary_artist?.name);
        const hitTitle = cleanStr(hit.result.title);
        
        let score = 0;
        
        // Artist matching
        if (hitArtist && searchArtist) {
          if (hitArtist === searchArtist) score += 10;
          else if (searchArtist.includes(hitArtist) || hitArtist.includes(searchArtist)) score += 5;
          
          const searchArtistsParts = searchArtist.split(/(?:и|and|feat|ft)/);
          for (const p of searchArtistsParts) {
            if (p.length > 2 && hitArtist.includes(p)) score += 3;
          }
        }
        
        // Title matching
        if (hitTitle && searchTitle) {
          if (hitTitle === searchTitle) score += 10;
          else if (searchTitle.includes(hitTitle) || hitTitle.includes(searchTitle)) score += 5;
        }

        // Penalize completely unrelated meta-pages from Genius
        if (hitTitle.includes('tracklist') || hitTitle.includes('calendar') || 
            hitTitle.includes('annotated') || hitArtist.includes('genius')) {
          score -= 50;
        }

        // Bonus for having annotations
        if (hit.result.annotation_count > 0) score += 2;

        if (score > bestScore) {
          bestScore = score;
          bestHit = hit.result;
        }
      }
    }
  }
  
  if (bestHit) {
    console.log(`[GENIUS-SEARCH] Selected Best Hit: "${bestHit.title}" by "${bestHit.primary_artist?.name}" (Score: ${bestScore})`);
    return bestHit.id;
  }
  return null;
}

async function loadGeniusDataForTrack(trackId, title, artist) {
  if (isGeniusLoading) return;
  resetGeniusData();
  currentGeniusTrackId = trackId;
  isGeniusLoading = true;

  console.log(`[GENIUS] Loading annotations and lyrics for ${artist} - ${title}...`);
  
  const fsRoot = document.querySelector('[class*="FullscreenPlayerDesktop_root"]');
  if (fsRoot) {
    const body = fsRoot.querySelector('.ym-genius-panel-body');
    if (body) {
      resetAnnotationPanelBody(body);
    } else {
      const panel = fsRoot.querySelector('.ym-genius-annotation-panel');
      if (panel) resetAnnotationPanel(panel);
    }
  }

  try {
    const searchData = await window.GeniusAPI.searchSong(title, artist);
    const songId = extractGeniusSongId(searchData, title, artist);
    if (!songId) {
      console.warn('[GENIUS] No matching song found on Genius.');
      isGeniusLoading = false;
      return;
    }
    currentGeniusSongId = songId;

    // Find song page URL from hits
    let songUrl = null;
    if (searchData && searchData.response && searchData.response.sections) {
      for (const sec of searchData.response.sections) {
        if (sec.hits) {
          const hit = sec.hits.find(h => (h.type === 'song' || h.index === 'song') && h.result && h.result.id === songId);
          if (hit) {
            songUrl = hit.result.url;
            break;
          }
        }
      }
    }
    
    console.log(`[GENIUS] Found song ID: ${songId}, URL: ${songUrl}. Fetching referents and HTML page...`);

    const promises = [
      window.GeniusAPI.getReferents(songId)
    ];
    if (songUrl) {
      promises.push(window.GeniusAPI.getSongHtml(songUrl));
    }

    const [referentsData, songHtml] = await Promise.all(promises);

    // 1. Process referents
    if (referentsData && referentsData.response && referentsData.response.referents) {
      const referents = referentsData.response.referents;
      currentGeniusReferents = referents.map(ref => {
        if (!ref.fragment || !ref.annotations || ref.annotations.length === 0) return null;
        const body = ref.annotations[0].body;
        if (!body || !body.html) return null;
        
        const authors = ref.annotations[0].authors || [];
        const authorNames = authors.map(a => a.user ? a.user.name || a.user.login : '').filter(Boolean).join(', ');

        return {
          id: ref.id,
          fragment: ref.fragment,
          html: body.html,
          authorNames: authorNames
        };
      }).filter(Boolean);
      console.log(`[GENIUS] Loaded ${currentGeniusReferents.length} valid referents.`);
    }

    // 2. Process HTML page to extract lyrics
    if (songHtml) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(songHtml, 'text/html');
      const containers = doc.querySelectorAll('[data-lyrics-container="true"]');
      if (containers.length > 0) {
        const wrapper = document.createElement('div');
        containers.forEach(c => {
          const clone = c.cloneNode(true);
          
          // Remove Genius metadata headers / translation widgets
          const excludeSelectors = [
            '[class*="LyricsHeader__Container"]',
            '[data-exclude-from-selection="true"]',
            '[class*="ContributorsCreditSong__Container"]',
            '[class*="Dropdown__Container"]'
          ];
          excludeSelectors.forEach(sel => {
            clone.querySelectorAll(sel).forEach(el => el.remove());
          });

          wrapper.appendChild(clone);
        });
        currentGeniusLyricsHtml = wrapper.innerHTML;
        console.log('[GENIUS] Extracted lyrics from containers successfully.');
      } else {
        const lyricsDiv = doc.querySelector('.lyrics');
        if (lyricsDiv) {
          currentGeniusLyricsHtml = lyricsDiv.innerHTML;
          console.log('[GENIUS] Extracted lyrics from fallback class successfully.');
        }
      }
    }

    const fsContainer = document.querySelector('.ym-fullscreen-lyrics-container');
    if (fsContainer && fsContainer.dataset.trackId === trackId) {
      renderFullscreenLyricsLines(fsContainer);
    }
  } catch (err) {
    console.error('[GENIUS] Failed to load Genius data:', err);
  } finally {
    isGeniusLoading = false;
  }
}

function renderFullscreenLyricsLines(container) {
  container.dataset.trackId = currentLyricsTrackId;
  container.replaceChildren();

  if (isLyricsLoading) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'ym-fullscreen-lyrics-empty';
    emptyEl.textContent = 'Загрузка текста...';
    container.appendChild(emptyEl);
    return;
  }

  const targetLang = localStorage.getItem('ymTargetLang') || 'ru';
  const isTranslationEnabled = localStorage.getItem('ymTranslationEnabled') !== 'false';
  const isGeniusMode = localStorage.getItem('ymGeniusMode') === 'true';

  if (isTranslationEnabled) {
    container.classList.add('ym-has-translation');
  } else {
    container.classList.remove('ym-has-translation');
  }
  if (isGeniusMode && currentGeniusLyricsHtml) {
    const lyricsWrapper = document.createElement('div');
    lyricsWrapper.className = 'ym-genius-lyrics-rendered';
    lyricsWrapper.style.cssText = `
      text-align: center;
      font-size: 22px;
      line-height: 1.8;
      color: rgba(255, 255, 255, 0.95);
      font-family: "YS Text", sans-serif;
      padding: 12px;
    `;

    // Render the original safe HTML
    window.renderSafeHtmlInto(lyricsWrapper, currentGeniusLyricsHtml);

    // Synchronize by aligning text nodes in the DOM with timestamped lyrics
    processGeniusLyricsDom(lyricsWrapper, currentLyricsLines);

    // Set up click events on links
    const links = lyricsWrapper.querySelectorAll('.ym-lyric-annotated');
    console.log(`[GENIUS] Total HTML annotations found on page: ${links.length}`);
    links.forEach((linkEl, idx) => {
      const textSample = linkEl.textContent.trim().substring(0, 45);
      console.log(`[GENIUS] Annotation #${idx + 1} (ID: ${linkEl.getAttribute('data-id')}): "${textSample}..."`);
    });

    links.forEach(linkEl => {
      const refId = linkEl.getAttribute('data-id');
      const geniusRef = currentGeniusReferents.find(r => String(r.id) === String(refId));

      if (lastSelectedReferentId === String(refId)) {
        linkEl.classList.add('ym-genius-annotation-selected');
      }

      linkEl.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        lastFsUserInteractionTime = Date.now() - 6000;

        const fsRoot = document.querySelector('[class*="FullscreenPlayerDesktop_root"]');
        const body = fsRoot ? fsRoot.querySelector('.ym-genius-panel-body') : null;

        if (body) {
          const allSelected = container.querySelectorAll('.ym-genius-annotation-selected');
          allSelected.forEach(el => el.classList.remove('ym-genius-annotation-selected'));

          const matchingLinks = container.querySelectorAll(`.ym-lyric-annotated[data-id="${refId}"]`);
          matchingLinks.forEach(el => el.classList.add('ym-genius-annotation-selected'));

          body.replaceChildren();

          if (geniusRef) {
            lastSelectedReferentId = String(refId);

            const headerDiv = document.createElement('div');
            headerDiv.style.cssText = 'font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #ffdb4d; margin-bottom: 12px; font-weight: 700; font-family: "YSMusic Headline", sans-serif;';
            headerDiv.textContent = 'Объяснение строчки';

            const quoteDiv = document.createElement('div');
            quoteDiv.style.cssText = 'font-size: 16px; font-style: italic; color: rgba(255, 255, 255, 0.6); margin-bottom: 20px; border-left: 2px solid rgba(255, 255, 255, 0.2); padding-left: 12px; font-family: "YS Text", sans-serif;';
            quoteDiv.textContent = `«${linkEl.textContent.trim()}»`;

            const bodyDiv = document.createElement('div');
            bodyDiv.className = 'ym-genius-annotation-body';
            window.renderSafeHtmlInto(bodyDiv, geniusRef.html);

            body.appendChild(headerDiv);
            body.appendChild(quoteDiv);
            body.appendChild(bodyDiv);

            if (geniusRef.authorNames) {
              const authorsDiv = document.createElement('div');
              authorsDiv.style.cssText = 'font-size: 11px; color: rgba(255, 255, 255, 0.4); margin-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 12px; font-family: "YS Text", sans-serif;';
              authorsDiv.textContent = 'Контрибьюторы Genius: ';
              const strongVal = document.createElement('strong');
              strongVal.textContent = geniusRef.authorNames;
              authorsDiv.appendChild(strongVal);
              body.appendChild(authorsDiv);
            }
          } else {
            lastSelectedReferentId = null;
            body.replaceChildren();
            const noInfoDiv = document.createElement('div');
            noInfoDiv.style.cssText = 'font-size: 16px; opacity: 0.6; padding: 20px; text-align: center; font-family: "YS Text", sans-serif;';
            noInfoDiv.textContent = 'Нет описания для этой строчки.';
            body.appendChild(noInfoDiv);
          }
        }
      });
    });

    container.appendChild(lyricsWrapper);
    return;
  }

  if (isSyncedLyrics && currentLyricsLines && currentLyricsLines.length > 0) {
    currentLyricsLines.forEach((line, idx) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'ym-fullscreen-lyric-line';
      lineEl.dataset.idx = idx;
      lineEl.dataset.time = line.time;

      const geniusRef = findGeniusReferentForLine(line.text, currentGeniusReferents);
      if (geniusRef) {
        lineEl.classList.add('ym-lyric-annotated');
        lineEl.dataset.referentId = geniusRef.id;
        lineEl.dataset.annotationHtml = geniusRef.html;
        lineEl.dataset.annotationAuthors = geniusRef.authorNames;
        if (lastSelectedReferentId === geniusRef.id) {
          lineEl.classList.add('ym-genius-annotation-selected');
        }
      }

      const originalTextEl = document.createElement('div');
      originalTextEl.className = 'ym-fullscreen-lyric-original';
      originalTextEl.textContent = line.text || '...';
      lineEl.appendChild(originalTextEl);

      const translationEl = document.createElement('div');
      translationEl.className = 'ym-fullscreen-lyric-translation';
      translationEl.style.cssText = `
        font-family: "YSMusic Headline", sans-serif;
        font-weight: 700;
        font-style: normal;
        font-size: 0.8em;
        opacity: 0.9;
        margin-top: 6px;
        color: rgb(255, 219, 77);
        display: none;
      `;
      lineEl.appendChild(translationEl);

      lineEl.addEventListener('click', () => {
        lastFsUserInteractionTime = 0;
        const currentIsGeniusMode = localStorage.getItem('ymGeniusMode') === 'true';
        
        if (!currentIsGeniusMode) {
          window.postMessage({
            type: 'FROM_ISOLATED',
            action: 'SYNC_STATE',
            state: {
              time: line.time,
              trackId: currentLyricsTrackId,
              isPause: false
            }
          }, '*');
          try {
            if (typeof getActivePlayer === 'function') {
              const player = getActivePlayer();
              if (player) {
                player.setProgress(line.time);
                if (typeof player.resume === 'function') player.resume();
              }
            }
          } catch (e) {}
        }

        if (currentIsGeniusMode) {
          const fsRoot = document.querySelector('[class*="FullscreenPlayerDesktop_root"]');
          const body = fsRoot ? fsRoot.querySelector('.ym-genius-panel-body') : null;
          
          if (body) {
            const allSelected = container.querySelectorAll('.ym-genius-annotation-selected');
            allSelected.forEach(el => el.classList.remove('ym-genius-annotation-selected'));

            const currentRefId = lineEl.dataset.referentId;
            const currentGeniusRef = currentRefId ? currentGeniusReferents.find(r => String(r.id) === String(currentRefId)) : null;

            if (currentGeniusRef) {
              lastSelectedReferentId = currentGeniusRef.id;
              
              const matchingLines = container.querySelectorAll(`.ym-fullscreen-lyric-line[data-referent-id="${currentGeniusRef.id}"]`);
              matchingLines.forEach(el => el.classList.add('ym-genius-annotation-selected'));

              body.replaceChildren();

              const headerDiv = document.createElement('div');
              headerDiv.style.cssText = 'font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #ffdb4d; margin-bottom: 12px; font-weight: 700; font-family: "YSMusic Headline", sans-serif;';
              headerDiv.textContent = 'Объяснение строчки';

              const quoteDiv = document.createElement('div');
              quoteDiv.style.cssText = 'font-size: 16px; font-style: italic; color: rgba(255, 255, 255, 0.6); margin-bottom: 20px; border-left: 2px solid rgba(255, 255, 255, 0.2); padding-left: 12px; font-family: "YS Text", sans-serif;';
              quoteDiv.textContent = `«${line.text}»`;

              const bodyDiv = document.createElement('div');
              bodyDiv.className = 'ym-genius-annotation-body';
              window.renderSafeHtmlInto(bodyDiv, currentGeniusRef.html);

              body.appendChild(headerDiv);
              body.appendChild(quoteDiv);
              body.appendChild(bodyDiv);

              if (currentGeniusRef.authorNames) {
                const authorsDiv = document.createElement('div');
                authorsDiv.style.cssText = 'font-size: 11px; color: rgba(255, 255, 255, 0.4); margin-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 12px; font-family: "YS Text", sans-serif;';
                authorsDiv.textContent = 'Контрибьюторы Genius: ';
                const strongVal = document.createElement('strong');
                strongVal.textContent = currentGeniusRef.authorNames;
                authorsDiv.appendChild(strongVal);
                body.appendChild(authorsDiv);
              }
            } else {
              lastSelectedReferentId = null;
              body.replaceChildren();
              const noInfoDiv = document.createElement('div');
              noInfoDiv.style.cssText = 'font-size: 16px; opacity: 0.6; padding: 20px; text-align: center; font-family: "YS Text", sans-serif;';
              noInfoDiv.textContent = 'Нет описания для этой строчки.';
              body.appendChild(noInfoDiv);
            }
          }
        }
      });
      container.appendChild(lineEl);
    });
  } else if (currentLyricsPlain) {
    const lines = currentLyricsPlain.split('\n');
    lines.forEach((line, idx) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'ym-fullscreen-lyric-line';
      lineEl.style.color = 'rgba(255, 255, 255, 0.8)';
      lineEl.style.cursor = 'default';

      const originalTextEl = document.createElement('div');
      originalTextEl.className = 'ym-fullscreen-lyric-original';
      originalTextEl.textContent = line.trim() || ' ';
      lineEl.appendChild(originalTextEl);

      const translationEl = document.createElement('div');
      translationEl.className = 'ym-fullscreen-lyric-translation';
      translationEl.style.cssText = `
        font-family: "YSMusic Headline", sans-serif;
        font-weight: 700;
        font-style: normal;
        font-size: 0.8em;
        opacity: 0.9;
        margin-top: 6px;
        color: rgb(255, 219, 77);
        display: none;
      `;
      lineEl.appendChild(translationEl);
      container.appendChild(lineEl);
    });
  } else {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'ym-fullscreen-lyrics-empty';
    emptyEl.textContent = 'Текст песни отсутствует';
    container.appendChild(emptyEl);
  }

  if (isTranslationEnabled) {
    applyTranslation(container, currentLyricsTrackId, targetLang);
  }
}

let cachedSyncLyricsButtonClass = null;
let cachedSyncLyricsIconClass = null;
let cachedSyncLyricsIconActiveClass = null;

function getSyncLyricsButtonClass() {
  if (cachedSyncLyricsButtonClass) return cachedSyncLyricsButtonClass;
  try {
    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;
        for (const rule of rules) {
          if (rule.selectorText && rule.selectorText.includes('syncLyricsButton')) {
            const match = rule.selectorText.match(/FullscreenPlayerDesktopControls_syncLyricsButton__[a-zA-Z0-9_-]+/);
            if (match) {
              cachedSyncLyricsButtonClass = match[0];
              return cachedSyncLyricsButtonClass;
            }
          }
        }
      } catch (sheetErr) {}
    }
  } catch (err) {}
  return 'FullscreenPlayerDesktopControls_syncLyricsButton__g6E6g';
}

function getSyncLyricsIconClass() {
  if (cachedSyncLyricsIconClass) return cachedSyncLyricsIconClass;
  try {
    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;
        for (const rule of rules) {
          if (rule.selectorText && rule.selectorText.includes('SyncLyricsButton_icon')) {
            const match = rule.selectorText.match(/SyncLyricsButton_icon__[a-zA-Z0-9_-]+/);
            if (match) {
              cachedSyncLyricsIconClass = match[0];
              return cachedSyncLyricsIconClass;
            }
          }
        }
      } catch (sheetErr) {}
    }
  } catch (err) {}
  return 'SyncLyricsButton_icon__m0Gdk';
}

function getSyncLyricsIconActiveClass() {
  if (cachedSyncLyricsIconActiveClass) return cachedSyncLyricsIconActiveClass;
  try {
    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;
        for (const rule of rules) {
          if (rule.selectorText && rule.selectorText.includes('SyncLyricsButton_icon_active')) {
            const match = rule.selectorText.match(/SyncLyricsButton_icon_active__[a-zA-Z0-9_-]+/);
            if (match) {
              cachedSyncLyricsIconActiveClass = match[0];
              return cachedSyncLyricsIconActiveClass;
            }
          }
        }
      } catch (sheetErr) {}
    }
  } catch (err) {}
  return 'SyncLyricsButton_icon_active__6WcWG';
}

function handleFullscreenPlayer() {
  const fullscreenRoot = document.querySelector('[class*="FullscreenPlayerDesktop_root"]');
  if (!fullscreenRoot) {
    if (window.ymFsObserver) {
      window.ymFsObserver.disconnect();
      window.ymFsObserver = null;
    }
    const prevForcedRoots = document.querySelectorAll('.ym-force-split');
    prevForcedRoots.forEach(el => el.classList.remove('ym-force-split'));
    return;
  }

  // Setup observer to react instantly to Yandex Music's internal layout changes
  if (!window.ymFsObserver) {
    window.ymFsObserver = new MutationObserver(() => {
      if (window.ymFsObserver) {
        window.ymFsObserver.disconnect();
      }
      handleFullscreenPlayer();
      if (window.ymFsObserver && document.body.contains(fullscreenRoot)) {
        window.ymFsObserver.observe(fullscreenRoot, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style']
        });
      }
    });
    window.ymFsObserver.observe(fullscreenRoot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  const contentRoot = fullscreenRoot.querySelector('[class*="FullscreenPlayerDesktopContent_root"]');
  if (!contentRoot) return;
  const controlsRoot = fullscreenRoot.querySelector('[class*="FullscreenPlayerDesktopControls_root"]');
  const nativeFsBtn = controlsRoot ? controlsRoot.querySelector('[class*="FullscreenPlayerDesktopControls_syncLyricsButton"]:not(.ym-custom-sync-lyrics-btn)') : null;
  if (nativeFsBtn) {
    nativeFsBtn.style.removeProperty('display');
  }
  const fullscreenContent = contentRoot.querySelector('[class*="FullscreenPlayerDesktopContent_fullscreenContent"]');
  if (!fullscreenContent) return;
  const infoContainer = contentRoot.querySelector('[class*="FullscreenPlayerDesktopContent_info"]');
  const hasNativeSyncedLyrics = !!contentRoot.querySelector('[class*="SyncLyrics_root"]');
  if (hasNativeSyncedLyrics) {
    window.ymCurrentTrackHasLyrics = true;
  }
  const trackHasLyrics = typeof window.ymCurrentTrackHasLyrics !== 'undefined' ? window.ymCurrentTrackHasLyrics : null;

  const isGeniusMode = localStorage.getItem('ymGeniusMode') === 'true';

  let hasNativeLyrics = false;
  if (trackHasLyrics !== null) {
    hasNativeLyrics = trackHasLyrics;
  } else if (typeof window.ymLastKnownNativeLyricsState !== 'undefined' && window.ymLastKnownNativeLyricsState !== null) {
    hasNativeLyrics = window.ymLastKnownNativeLyricsState;
  } else {
    const nativeBtn = findLyricsButton();
    if (nativeBtn) {
      const isDisabledAttr = nativeBtn.hasAttribute('disabled') || nativeBtn.disabled;
      const hasAriaDisabled = nativeBtn.getAttribute('aria-disabled') === 'true';
      const isDisabledClass = Array.from(nativeBtn.classList).some(cls => cls.toLowerCase().includes('disabled'));
      const isNativelyDisabled = isDisabledAttr || hasAriaDisabled || isDisabledClass;
      hasNativeLyrics = !isNativelyDisabled;
    }
  }

  // Centralized cleanup: if Genius mode is off, make sure the annotation panel is removed
  if (!isGeniusMode) {
    const annotationPanel = fullscreenContent.querySelector('.ym-genius-annotation-panel');
    if (annotationPanel) {
      annotationPanel.remove();
    }
  }

  // Inject or update Genius Toggle Button (direct child of fullscreenRoot, right under close button)
  let geniusToggle = fullscreenRoot.querySelector('.ym-fullscreen-genius-btn');
  if (!geniusToggle) {
    geniusToggle = document.createElement('button');
    geniusToggle.className = 'ym-fullscreen-genius-btn';
    geniusToggle.type = 'button';
    
    geniusToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentGenius = localStorage.getItem('ymGeniusMode') === 'true';
      const newGenius = !currentGenius;

      // Close play queue if it's open, since we want to see lyrics/annotations
      const playQueueBtn = document.querySelector('[class*="FullscreenPlayerDesktopControls_playQueueButton"]');
      if (playQueueBtn && playQueueBtn.getAttribute('aria-pressed') === 'true') {
        playQueueBtn.click();
      }

      localStorage.setItem('ymGeniusMode', newGenius ? 'true' : 'false');
      
      geniusToggle.setAttribute('aria-pressed', newGenius ? 'true' : 'false');
      if (newGenius) {
        geniusToggle.classList.add('active');
      } else {
        geniusToggle.classList.remove('active');
      }
      
      handleFullscreenPlayer();
    });
    
    fullscreenRoot.appendChild(geniusToggle);
    if (typeof ymRegisterActiveElement === 'function') {
      ymRegisterActiveElement(geniusToggle);
    }
  }

  // Set attributes and active class depending on isGeniusMode
  geniusToggle.setAttribute('aria-label', 'Genius');
  geniusToggle.setAttribute('aria-pressed', isGeniusMode ? 'true' : 'false');
  if (isGeniusMode) {
    geniusToggle.classList.add('active');
  } else {
    geniusToggle.classList.remove('active');
  }

  // Always ensure the correct SVG is inside the button (replaces old one if present)
  let svgEl = geniusToggle.querySelector('svg');
  if (!svgEl || !svgEl.querySelector('path[d^="M12.897"]')) {
    geniusToggle.replaceChildren(); // clear any text or old SVG
    const parser = new DOMParser();
    const svgStr = `
      <svg xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M12.897 1.235c-.36.001-.722.013-1.08.017-.218-.028-.371.225-.352.416-.035 1.012.023 2.025-.016 3.036-.037.841-.555 1.596-1.224 2.08-.5.345-1.118.435-1.671.663.121.78.434 1.556 1.057 2.07 1.189 1.053 3.224.86 4.17-.426.945-1.071.453-2.573.603-3.854.286-.48.937-.132 1.317-.49-.34-1.249-.81-2.529-1.725-3.472a11.125 11.125 0 00-1.08-.04zm-10.42.006C.53 2.992-.386 5.797.154 8.361c.384 2.052 1.682 3.893 3.45 4.997.134-.23.23-.476.09-.73-.95-2.814-.138-6.119 1.986-8.19.014-.986.043-1.976-.003-2.961l-.188-.214c-1.003-.051-2.008 0-3.01-.022zm17.88.055l-.205.356c.265.938.6 1.862.72 2.834.58 3.546-.402 7.313-2.614 10.14-1.816 2.353-4.441 4.074-7.334 4.773-2.66.66-5.514.45-8.064-.543-.068.079-.207.237-.275.318 2.664 2.629 6.543 3.969 10.259 3.498 3.075-.327 5.995-1.865 8.023-4.195 1.935-2.187 3.083-5.07 3.125-7.992.122-3.384-1.207-6.819-3.636-9.19z"/>
      </svg>
    `;
    const parsedSvg = parser.parseFromString(svgStr, 'image/svg+xml').documentElement;
    geniusToggle.appendChild(parsedSvg);
  }

  // Toggle .ym-hidden class depending on isGeniusMode (forces display: none !important)
  geniusToggle.classList.toggle('ym-hidden', isGeniusMode);

  if (!window.hadLoggedFsEvaluation) {
    console.log('[SYNC-DEBUG] handleFullscreenPlayer evaluation:', {
      hasNativeSyncedLyrics,
      hasNativeLyrics,
      trackHasLyrics,
      ymCurrentTrackHasLyrics: window.ymCurrentTrackHasLyrics,
      ymLastKnownNativeLyricsState: window.ymLastKnownNativeLyricsState
    });
    window.hadLoggedFsEvaluation = true;
  }

  if (controlsRoot) {
    const computedStyle = window.getComputedStyle(controlsRoot);
    if (computedStyle.position === 'static') {
      controlsRoot.style.position = 'relative';
    }
  }

  const customLyricsMode = localStorage.getItem('ymCustomLyricsMode') || 'fallback';

  // Функция очистки кастомного интерфейса (когда выключаем наш UI)
  const cleanupCustomLyricsUI = () => {
    const customToggle = controlsRoot ? controlsRoot.querySelector('.ym-custom-sync-lyrics-btn') : null;
    if (customToggle) customToggle.remove();

    contentRoot.classList.remove('ym-force-split');
    fullscreenContent.classList.remove('ym-force-split');
    fullscreenRoot.classList.remove('ym-genius-active');
    if (infoContainer) infoContainer.classList.remove('ym-force-split');
    let additionalContent = contentRoot.querySelector('[class*="FullscreenPlayerDesktopContent_additionalContent"]');
    if (additionalContent) additionalContent.classList.remove('ym-force-split');
    const customContainer = contentRoot.querySelector('.ym-fullscreen-lyrics-container');
    if (customContainer) customContainer.remove();
    const transControl = contentRoot.querySelector('.ym-translation-control');
    if (transControl) transControl.remove();
    ensureTranslateControls(fullscreenRoot, null);
    handleNativeLyricsTranslation(contentRoot);
  };

  // Если кастомные тексты полностью выключены — очищаем всё и выходим
  if (customLyricsMode === 'disabled' && !isGeniusMode) {
    cleanupCustomLyricsUI();
    return;
  }

  // If track has native lyrics and we are NOT forcing Genius mode AND mode is NOT 'always', fallback to Yandex's native interface
  if ((hasNativeSyncedLyrics || hasNativeLyrics || trackHasLyrics === true) && !isGeniusMode && customLyricsMode !== 'always') {
    if (!window.hadLoggedFsDecision) {
      console.log('[SYNC-DEBUG] handleFullscreenPlayer: Decided to return early (native lyrics mode). Reason:', {
        hasNativeSyncedLyrics,
        hasNativeLyrics,
        trackHasLyricsTrue: (trackHasLyrics === true)
      });
      window.hadLoggedFsDecision = true;
    }
    cleanupCustomLyricsUI();
    return;
  }

  if (!window.hadLoggedFsCustomLyricsStarted) {
    console.log('[SYNC-DEBUG] handleFullscreenPlayer: Entering custom lyrics rendering mode!');
    window.hadLoggedFsCustomLyricsStarted = true;
  }
  let additionalContent = contentRoot.querySelector('[class*="FullscreenPlayerDesktopContent_additionalContent"]');
  if (!additionalContent) {
    additionalContent = document.createElement('div');
    additionalContent.className = 'FullscreenPlayerDesktopContent_additionalContent__tuuy7 ym-custom-additional-content';
    contentRoot.appendChild(additionalContent);
  }

  // Inject or update custom sync lyrics button (only shown if not in native-only view)
  if (controlsRoot) {
    let customToggle = controlsRoot.querySelector('.ym-custom-sync-lyrics-btn');
    const isVisible = localStorage.getItem('ymCustomLyricsVisible') !== 'false';
    const iconClass = isVisible ? getSyncLyricsIconActiveClass() : getSyncLyricsIconClass();

    if (!customToggle) {
      customToggle = document.createElement('button');
      customToggle.type = 'button';
      customToggle.setAttribute('aria-label', 'Включить текстомузыку Может нарушить доступность');
      customToggle.setAttribute('aria-live', 'off');
      customToggle.setAttribute('aria-busy', 'false');
      
      customToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentVisible = localStorage.getItem('ymCustomLyricsVisible') !== 'false';
        const newVisible = !currentVisible;
        localStorage.setItem('ymCustomLyricsVisible', newVisible ? 'true' : 'false');
        
        // Синхронизируем состояние нативной кнопки, если мы в режиме "always",
        // чтобы Яндекс корректно отработал свои анимации постера и split-режим.
        const mode = localStorage.getItem('ymCustomLyricsMode') || 'fallback';
        if (mode === 'always' && nativeFsBtn) {
          const isNativePressed = nativeFsBtn.getAttribute('aria-pressed') === 'true' || nativeFsBtn.classList.contains('active');
          if (isNativePressed && !newVisible) {
             nativeFsBtn.click(); // Выключаем нативные тексты
          } else if (!isNativePressed && newVisible) {
             nativeFsBtn.click(); // Включаем нативные тексты
          }
        }
        
        handleFullscreenPlayer();
      });
      
      if (nativeFsBtn) {
        nativeFsBtn.parentNode.insertBefore(customToggle, nativeFsBtn);
      } else {
        controlsRoot.appendChild(customToggle);
      }
      if (typeof ymRegisterActiveElement === 'function') {
        ymRegisterActiveElement(customToggle);
      }
    }

    // Copy classes dynamically from native button, or fallback to another native button's classes in the controls container
    let classList = ['ym-custom-sync-lyrics-btn'];
    let baseButton = nativeFsBtn;
    if (!baseButton && controlsRoot) {
      baseButton = controlsRoot.querySelector('button[class*="FullscreenPlayerDesktopControls_"]');
    }

    if (baseButton) {
      baseButton.classList.forEach(cls => {
        const lower = cls.toLowerCase();
        if (cls !== 'ym-custom-sync-lyrics-btn' && 
            !lower.includes('disabled') && 
            !lower.includes('hidden') &&
            !lower.includes('playqueue') &&
            !lower.includes('menu') &&
            !lower.includes('like') &&
            !lower.includes('synclyrics')) {
          classList.push(cls);
        }
      });
    }

    // Add the specific syncLyrics class and ensure fallback if none found
    if (classList.length <= 1) {
      classList.push(
        'cpeagBA1_PblpJn8Xgtv',
        'iJVAJMgccD4vj4E4o068',
        'zIMibMuH7wcqUoW7KH1B',
        'IlG7b1K0AD7E7AMx6F5p',
        'nHWc2sto1C6Gm0Dpw_l0',
        'SGYcNjvjmMsXeEVGUV2Z',
        'qU2apWBO1yyEK0lZ3lPO',
        getSyncLyricsButtonClass()
      );
    } else {
      classList.push(getSyncLyricsButtonClass());
    }
    customToggle.className = classList.join(' ');

    customToggle.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
    if (isVisible) {
      customToggle.classList.add('active');
    } else {
      customToggle.classList.remove('active');
    }

    customToggle.innerHTML = `
      <span class="JjlbHZ4FaP9EAcR_1DxF">
        <svg class="J9wTKytjOWG73QMoN5WP ${iconClass} o_v2ds2BaqtzAsRuCVjw" focusable="false" aria-hidden="true">
          <use xlink:href="/icons/sprite.svg#syncLyrics_m"></use>
        </svg>
      </span>
    `;

    if (nativeFsBtn) {
      nativeFsBtn.style.setProperty('display', 'none', 'important');
    }
  }

  const nativeBtn = findLyricsButton();
  const isPressed = nativeBtn && (nativeBtn.getAttribute('aria-pressed') === 'true' || nativeBtn.classList.contains('active'));
  const hasActiveIcon = !!document.querySelector('[class*="SyncLyricsButton_icon_active"]');
  const isNativelyWithLyrics = !!(isPressed || hasActiveIcon);

  // Determine custom lyrics visibility (active either by custom toggle or forced by Genius mode)
  let isCustomLyricsVisible = localStorage.getItem('ymCustomLyricsVisible') !== 'false' || isGeniusMode;
  
  // If track has native lyrics and they are currently closed in native UI, force custom lyrics to be hidden
  // Only apply this logic if we are not forcing always mode
  if ((hasNativeLyrics || trackHasLyrics === true) && !isNativelyWithLyrics && !isGeniusMode && customLyricsMode !== 'always') {
    isCustomLyricsVisible = false;
  }


  
  if (!isCustomLyricsVisible) {
    contentRoot.classList.remove('ym-force-split');
    fullscreenContent.classList.remove('ym-force-split');
    fullscreenRoot.classList.remove('ym-genius-active');
    if (infoContainer) infoContainer.classList.remove('ym-force-split');
    
    additionalContent.classList.remove('ym-force-split');
    additionalContent.style.display = 'none';
    
    const customContainer = additionalContent.querySelector('.ym-fullscreen-lyrics-container');
    if (customContainer) customContainer.style.display = 'none';
    
    const transControl = contentRoot.querySelector('.ym-translation-control');
    if (transControl) transControl.style.display = 'none';
    const transBtn = fullscreenRoot.querySelector('.ym-fullscreen-translate-btn');
    if (transBtn) transBtn.style.display = 'none';
    
    return;
  }

  additionalContent.style.display = '';
  const transControl = contentRoot.querySelector('.ym-translation-control');
  if (transControl) transControl.style.display = '';
  const transBtn = fullscreenRoot.querySelector('.ym-fullscreen-translate-btn');
  if (transBtn) transBtn.style.display = '';

  // Toggle layout class for Genius mode
  if (isGeniusMode) {
    fullscreenRoot.classList.add('ym-genius-active');
  } else {
    fullscreenRoot.classList.remove('ym-genius-active');
  }

  // Force layout split
  contentRoot.classList.add('ym-force-split');
  fullscreenContent.classList.add('ym-force-split');
  additionalContent.classList.add('ym-force-split');
  if (infoContainer) infoContainer.classList.add('ym-force-split');

  // Hide native lyrics to prevent overlap if we are in "always" mode
  if (customLyricsMode === 'always') {
    const nativeSyncLyrics = contentRoot.querySelector('[class*="SyncLyrics_root"]');
    if (nativeSyncLyrics) {
      nativeSyncLyrics.style.setProperty('display', 'none', 'important');
    }
  }

  // Inject Genius Annotations Panel
  let annotationPanel = fullscreenContent.querySelector('.ym-genius-annotation-panel');
  if (isGeniusMode) {
    if (!annotationPanel) {
      annotationPanel = document.createElement('div');
      annotationPanel.className = 'ym-genius-annotation-panel';
      fullscreenContent.appendChild(annotationPanel);
      resetAnnotationPanel(annotationPanel);
    }
  } else {
    if (annotationPanel) {
      annotationPanel.remove();
    }
  }

  // Load Genius referents/annotations if track changed
  if (currentLyricsTrackId && currentGeniusTrackId !== currentLyricsTrackId) {
    const meta = currentTrackMetadata;
    if (meta && meta.title && meta.artist) {
      loadGeniusDataForTrack(currentLyricsTrackId, meta.title, meta.artist);
    }
  }

  let customLyricsContainer = additionalContent.querySelector('.ym-fullscreen-lyrics-container');
  if (!customLyricsContainer) {
    customLyricsContainer = document.createElement('div');
    customLyricsContainer.className = 'ym-fullscreen-lyrics-container';
    customLyricsContainer.style.display = '';
    const updateScrollInteraction = () => {
      lastFsUserInteractionTime = Date.now(); // 7 seconds pause on scroll
    };
    const updateClickInteraction = () => {
      lastFsUserInteractionTime = Date.now() - 6000; // 1 second pause on click
    };
    customLyricsContainer.addEventListener('wheel', updateScrollInteraction, {
      passive: true
    });
    customLyricsContainer.addEventListener('touchmove', updateScrollInteraction, {
      passive: true
    });
    customLyricsContainer.addEventListener('mousedown', updateClickInteraction, {
      passive: true
    });

    additionalContent.appendChild(customLyricsContainer);
    renderFullscreenLyricsLines(customLyricsContainer);
  } else {
    customLyricsContainer.style.display = '';
    if (customLyricsContainer.dataset.trackId !== currentLyricsTrackId) {
      renderFullscreenLyricsLines(customLyricsContainer);
    }
  }

  // Inject or update translation controls
  ensureTranslateControls(fullscreenRoot, customLyricsContainer);

  // Always sync the active class and scroll when fullscreen handler runs
  if (lastLyricsActiveIndex !== -1) {
    const fsActiveEl = customLyricsContainer.querySelector(`.ym-fullscreen-lyric-line[data-idx="${lastLyricsActiveIndex}"]`);
    if (fsActiveEl && !fsActiveEl.classList.contains('active')) {
      const fsLineElements = customLyricsContainer.querySelectorAll('.ym-fullscreen-lyric-line');
      fsLineElements.forEach(el => el.classList.remove('active'));
      fsActiveEl.classList.add('active');
      const containerHeight = customLyricsContainer.clientHeight;
      const activeRect = fsActiveEl.getBoundingClientRect();
      const containerRect = customLyricsContainer.getBoundingClientRect();
      const activeTop = activeRect.top - containerRect.top + customLyricsContainer.scrollTop;
      const activeHeight = fsActiveEl.clientHeight;
      
      if (Date.now() - lastFsUserInteractionTime > 7000) {
        customLyricsContainer.scrollTo({
          top: activeTop - containerHeight / 2 + activeHeight / 2,
          behavior: 'auto'
        });
      }
    }
  }
}

// --- Component: shared/translation/translation.js ---
function performTranslationFetch(text, targetLang) {
  if (window.__ymSyncBridge && typeof window.__ymSyncBridge.translateText === 'function') {
    return window.__ymSyncBridge.translateText(text, targetLang);
  } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'SC_TRANSLATE', text, targetLang }, (response) => {
        if (response && response.ok) {
          resolve(response.translation);
        } else {
          reject(new Error(response ? response.error : 'Unknown translation error'));
        }
      });
    });
  } else {
    return Promise.reject(new Error('Bridge translateText not available'));
  }
}

async function translateLyrics(lines, targetLang) {
  const chunkSize = 25;
  const translatedLines = [];
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    const textToTranslate = chunk.map(line => line.text || ' ').join('\n');
    try {
      const fullTranslation = await performTranslationFetch(textToTranslate, targetLang);
      const chunkTranslations = fullTranslation.split('\n');
      chunk.forEach((line, idx) => {
        translatedLines.push(chunkTranslations[idx] ? chunkTranslations[idx].trim() : '');
      });
    } catch (err) {
      console.error('[SYNC] Chunk translation error:', err);
      chunk.forEach(() => {
        translatedLines.push('');
      });
    }
  }
  return translatedLines;
}

async function applyTranslation(container, trackId, targetLang) {
  if (ymIsTranslating) return;
  const cacheKey = `${trackId}_${targetLang}`;
  let translations = ymLyricsTranslationCache[cacheKey];
  const linesToTranslate = isSyncedLyrics ? currentLyricsLines : currentLyricsPlain ? currentLyricsPlain.split('\n').map(t => ({
    text: t
  })) : null;
  if (!linesToTranslate || linesToTranslate.length === 0) return;
  if (!translations) {
    ymIsTranslating = true;
    try {
      translations = await translateLyrics(linesToTranslate, targetLang);
      ymLyricsTranslationCache[cacheKey] = translations;
    } catch (e) {
      console.error('[SYNC] Translation error:', e);
    } finally {
      ymIsTranslating = false;
    }
  }
  if (translations && container.dataset.trackId === trackId) {
    const translationEls = container.querySelectorAll('.ym-fullscreen-lyric-translation');
    translationEls.forEach((el, idx) => {
      if (translations[idx]) {
        el.textContent = translations[idx];
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    });
  }
}

function handleNativeLyricsTranslation(contentRoot) {
  const targetLang = localStorage.getItem('ymTargetLang') || 'ru';
  const isTranslationEnabled = localStorage.getItem('ymTranslationEnabled') !== 'false';
  
  const nativeBtn = document.querySelector('[class*="syncLyricsButton"]:not(.ym-custom-sync-lyrics-btn)');
  const isPressed = nativeBtn && (nativeBtn.getAttribute('aria-pressed') === 'true' || nativeBtn.classList.contains('active'));
  const hasActiveIcon = !!document.querySelector('[class*="SyncLyricsButton_icon_active"]');
  const isNativelyWithLyrics = !!(isPressed || hasActiveIcon);

  // Inject global CSS for translations once
  let styleEl = document.getElementById('ym-native-translation-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'ym-native-translation-styles';
    styleEl.textContent = `
      .ym-translation-active [class*="SyncLyricsLine_root"] {
        font-weight: 500 !important;
        transform: scale(0.9) !important;
        transform-origin: center !important;
        display: inline-block !important;
      }
    `;
    document.head.appendChild(styleEl);
  }

  if (!isTranslationEnabled) {
    contentRoot.classList.remove('ym-translation-active');
    const translationEls = contentRoot.querySelectorAll('.ym-native-lyrics-translation');
    translationEls.forEach(el => el.style.display = 'none');
    return;
  }

  // Apply active class to enforce scale(0.9) on original text via CSS
  contentRoot.classList.add('ym-translation-active');

  const nativeLines = contentRoot.querySelectorAll('[class*="SyncLyricsScroller_line"]');
  if (!nativeLines || nativeLines.length === 0) return;
  const trackId = typeof window.ymCurrentTrackId !== 'undefined' ? window.ymCurrentTrackId : 'unknown';
  const cacheKey = `${trackId}_${targetLang}`;
  const translations = ymLyricsTranslationCache[cacheKey];
  if (translations) {
    applyTranslationsToNativeLines(nativeLines, translations);
  } else {
    if (ymIsTranslating) return;
    const linesToTranslate = Array.from(nativeLines).map(lineEl => {
      const span = lineEl.querySelector('[class*="SyncLyricsLine_root"]');
      return {
        text: span ? span.textContent.trim() : ''
      };
    });
    if (linesToTranslate.length === 0) return;
    ymIsTranslating = true;
    translateLyrics(linesToTranslate, targetLang).then(res => {
      ymLyricsTranslationCache[cacheKey] = res;
      applyTranslationsToNativeLines(contentRoot.querySelectorAll('[class*="SyncLyricsScroller_line"]'), res);
    }).catch(err => {
      console.error('[SYNC] Native lyrics translation error:', err);
    }).finally(() => {
      ymIsTranslating = false;
    });
  }
}

function applyTranslationsToNativeLines(nativeLines, translations) {
  if (!translations || translations.length === 0) return;
  const numTranslations = translations.length;
  nativeLines.forEach((lineEl, idx) => {
    // Ensure relative positioning on the parent container
    lineEl.style.position = 'relative';
    let translationEl = lineEl.querySelector('.ym-native-lyrics-translation');
    if (!translationEl) {
      translationEl = document.createElement('div');
      translationEl.className = 'ym-native-lyrics-translation';
      translationEl.style.cssText = `
        font-family: "YSMusic Headline", sans-serif;
        font-weight: 700;
        font-style: normal;
        font-size: 0.8em;
        opacity: 0.9;
        color: rgb(255, 219, 77);
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        text-align: center;
        line-height: 1.4;
        margin-top: 4px;
        pointer-events: none;
      `;
      lineEl.appendChild(translationEl);
    }
    const translationText = translations[idx % numTranslations];
    if (translationText) {
      translationEl.textContent = translationText;
      translationEl.style.display = 'block';
    } else {
      translationEl.style.display = 'none';
    }
  });
}

function ensureTranslateControls(fullscreenRoot, customLyricsContainer) {
  const controlsRoot = fullscreenRoot.querySelector('[class*="FullscreenPlayerDesktopControls_root"]');
  if (controlsRoot) {
    const computedStyle = window.getComputedStyle(controlsRoot);
    if (computedStyle.position === 'static') {
      controlsRoot.style.position = 'relative';
    }
    let translateBtn = controlsRoot.querySelector('.ym-fullscreen-translate-btn');
    if (!translateBtn) {
      translateBtn = document.createElement('button');
      translateBtn.className = 'ym-fullscreen-translate-btn';
      translateBtn.type = 'button';
      translateBtn.setAttribute('aria-label', 'Перевод текста');
      translateBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
          <path d="m5 8 6 6" />
          <path d="m4 14 6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
          <path d="m22 22-5-10-5 10" />
          <path d="M14 18h6" />
        </svg>
      `;
      controlsRoot.appendChild(translateBtn);
    }
    ymRegisterActiveElement(translateBtn);

    let ratingsContainer = controlsRoot.querySelector('.ym-fullscreen-rzt-ratings');
    if (!ratingsContainer) {
      ratingsContainer = document.createElement('div');
      ratingsContainer.className = 'ym-fullscreen-rzt-ratings';
      controlsRoot.appendChild(ratingsContainer);
    }
    ymRegisterActiveElement(ratingsContainer);
    updateRztRatingsUI(ratingsContainer);

    let popover = fullscreenRoot.querySelector('.ym-fullscreen-translate-popover');
    if (!popover) {
      popover = document.createElement('div');
      popover.className = 'ym-fullscreen-translate-popover';
      popover.style.cssText = `
        position: absolute;
        width: 270px;
        background: rgba(28, 28, 32, 0.75);
        backdrop-filter: blur(40px) saturate(180%);
        -webkit-backdrop-filter: blur(40px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
        padding: 8px;
        color: #ffffff;
        font-family: inherit;
        font-size: 13px;
        z-index: 100001;
        display: none;
        flex-direction: column;
        gap: 12px;
        box-sizing: border-box;
        transition: opacity 0.2s ease, transform 0.2s ease;
        transform: scale(0.95);
        opacity: 0;
      `;
      const savedLang = localStorage.getItem('ymTargetLang') || 'ru';
      const isEnabled = localStorage.getItem('ymTranslationEnabled') !== 'false';
      popover.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px 4px 12px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 500; color: var(--ym-popover-text); font-family: inherit;">Перевод текста</h3>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 6px; padding: 0 8px 8px 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--ym-popover-item-bg); border: 1px solid var(--ym-popover-item-border); border-radius: 12px;">
            <span style="color: var(--ym-popover-text); opacity: 0.85;">Включить перевод</span>
            <label class="ym-translate-switch" style="
              position: relative;
              display: inline-block;
              width: 38px;
              height: 20px;
            ">
              <input type="checkbox" id="ym-translate-toggle-cb" ${isEnabled ? 'checked' : ''} style="
                opacity: 0;
                width: 0;
                height: 0;
              ">
              <span class="ym-translate-slider" style="
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                transition: .3s;
                border-radius: 20px;
              "></span>
            </label>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--ym-popover-item-bg); border: 1px solid var(--ym-popover-item-border); border-radius: 12px;">
            <span style="color: var(--ym-popover-text); opacity: 0.85;">Язык перевода</span>
            <select id="ym-translate-lang-select" style="
              background: var(--ym-popover-input-bg);
              border: 1px solid var(--ym-popover-input-border);
              color: var(--ym-popover-active);
              font-weight: 600;
              outline: none;
              cursor: pointer;
              font-family: inherit;
              font-size: 12px;
              padding: 6px 10px;
              border-radius: 12px;
            ">
              <option value="ru" ${savedLang === 'ru' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">Русский</option>
              <option value="en" ${savedLang === 'en' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">English</option>
              <option value="es" ${savedLang === 'es' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">Español</option>
              <option value="de" ${savedLang === 'de' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">Deutsch</option>
              <option value="fr" ${savedLang === 'fr' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">Français</option>
              <option value="zh" ${savedLang === 'zh' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">中文</option>
              <option value="ja" ${savedLang === 'ja' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">日本語</option>
            </select>
          </div>
        </div>
      `;
      fullscreenRoot.appendChild(popover);
      ymRegisterActiveElement(popover);
      if (!document.getElementById('ym-translate-switch-style')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'ym-translate-switch-style';
        styleEl.textContent = `
          .ym-translate-slider {
            background-color: rgba(255, 255, 255, 0.15);
          }
          html.theme-light .ym-translate-slider,
          .theme-light .ym-translate-slider {
            background-color: rgba(0, 0, 0, 0.15);
          }
          .ym-translate-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 3px;
            bottom: 3px;
            background-color: #8e8e93;
            transition: .3s;
            border-radius: 50%;
          }
          html.theme-light .ym-translate-slider:before,
          .theme-light .ym-translate-slider:before {
            background-color: #a0a0a5;
          }
          .ym-translate-switch input:checked + .ym-translate-slider {
            background-color: var(--ym-popover-active, #ffdb4d) !important;
          }
          .ym-translate-switch input:checked + .ym-translate-slider:before {
            transform: translateX(18px);
            background-color: #000000 !important;
          }
        `;
        document.head.appendChild(styleEl);
      }
      const select = popover.querySelector('#ym-translate-lang-select');
      const checkbox = popover.querySelector('#ym-translate-toggle-cb');
      select.addEventListener('change', e => {
        localStorage.setItem('ymTargetLang', e.target.value);
        if (customLyricsContainer) {
          renderFullscreenLyricsLines(customLyricsContainer);
        }
        handleFullscreenPlayer();
      });
      checkbox.addEventListener('change', e => {
        localStorage.setItem('ymTranslationEnabled', e.target.checked ? 'true' : 'false');
        if (customLyricsContainer) {
          renderFullscreenLyricsLines(customLyricsContainer);
        }
        handleFullscreenPlayer();
      });
    }
    translateBtn.onclick = e => {
      e.stopPropagation();
      const isShowing = popover.style.display === 'flex';
      if (isShowing) {
        popover.style.opacity = '0';
        popover.style.transform = 'scale(0.95)';
        setTimeout(() => {
          popover.style.display = 'none';
          ymStopKeepControlsActive();
        }, 200);
        translateBtn.classList.remove('active');
        translateBtn.style.background = '';
        translateBtn.style.borderColor = '';
        translateBtn.style.color = '';
      } else {
        popover.style.display = 'flex';
        popover.offsetHeight;
        popover.style.opacity = '1';
        popover.style.transform = 'scale(1)';
        translateBtn.classList.add('active');
        translateBtn.style.background = '';
        translateBtn.style.borderColor = '';
        translateBtn.style.color = '';
        ymStartKeepControlsActive();
        const btnRect = translateBtn.getBoundingClientRect();
        const parentRect = fullscreenRoot.getBoundingClientRect();
        const relativeTop = btnRect.top - parentRect.top;
        const relativeLeft = btnRect.left - parentRect.left;
        popover.style.top = `${relativeTop}px`;
        if (relativeLeft < parentRect.width / 2) {
          popover.style.left = `${relativeLeft + btnRect.width + 12}px`;
          popover.style.right = 'auto';
        } else {
          popover.style.right = `${parentRect.width - relativeLeft + 12}px`;
          popover.style.left = 'auto';
        }
      }
    };
    if (!window.ymTranslationCloseHandlerRegistered) {
      window.ymTranslationCloseHandlerRegistered = true;
      document.addEventListener('click', e => {
        const activePopover = document.querySelector('.ym-fullscreen-translate-popover');
        const activeBtn = document.querySelector('.ym-fullscreen-translate-btn');
        if (activePopover && activePopover.style.display === 'flex') {
          if (!activePopover.contains(e.target) && (!activeBtn || !activeBtn.contains(e.target))) {
            activePopover.style.opacity = '0';
            activePopover.style.transform = 'scale(0.95)';
            setTimeout(() => {
              activePopover.style.display = 'none';
              ymStopKeepControlsActive();
            }, 200);
            if (activeBtn) {
              activeBtn.classList.remove('active');
              activeBtn.style.background = '';
              activeBtn.style.borderColor = '';
              activeBtn.style.color = '';
            }
          }
        }
      });
    }
  }
}

// Update RZT ratings circles in DOM
function updateRztRatingsUI(ratingsContainer) {
  if (!ratingsContainer) {
    const fullscreenRoot = document.querySelector('[class*="FullscreenPlayerDesktop_root"]');
    if (!fullscreenRoot) return;
    const controlsRoot = fullscreenRoot.querySelector('[class*="FullscreenPlayerDesktopControls_root"]');
    if (!controlsRoot) return;
    ratingsContainer = controlsRoot.querySelector('.ym-fullscreen-rzt-ratings');
    if (!ratingsContainer) return;
  }

  const ratings = window.ymCurrentRztRatings;
  const statusStr = ratings ? JSON.stringify(ratings) : '';
  const trackId = window.ymLastRztTrackId || '';
  
  if (ratingsContainer.dataset.renderedTrackId === trackId && ratingsContainer.dataset.renderedStatus === statusStr) {
    // Already rendered exactly this state, skip updating DOM to prevent hover flickering!
    return;
  }

  // Save the state we are about to render
  ratingsContainer.dataset.renderedTrackId = trackId;
  ratingsContainer.dataset.renderedStatus = statusStr;

  if (!ratings || ratings.empty || ratings.error) {
    ratingsContainer.style.display = 'none';
    ratingsContainer.innerHTML = '';
    return;
  }

  if (ratings.loading) {
    ratingsContainer.style.display = 'flex';
    ratingsContainer.innerHTML = `
      <div class="ym-rzt-rating-circle rzt-blue-solid" data-tooltip="Сайт (Народ с рецензиями): Загрузка..." style="opacity: 0.5;">—</div>
      <div class="ym-rzt-rating-circle rzt-blue-outline" data-tooltip="Сайт (Народ без рецензий): Загрузка..." style="opacity: 0.5;">—</div>
      <div class="ym-rzt-rating-circle rzt-grey-solid" data-tooltip="Фломастер (РЗТ): Загрузка..." style="opacity: 0.5;">—</div>
    `;
    return;
  }

  const hasScores = ratings.withReviews !== null || ratings.withoutReviews !== null || ratings.flomaster !== null;
  if (!hasScores) {
    ratingsContainer.style.display = 'none';
    ratingsContainer.innerHTML = '';
    return;
  }

  ratingsContainer.style.display = 'flex';
  
  const score1 = ratings.withReviews !== null ? ratings.withReviews : '—';
  const score2 = ratings.withoutReviews !== null ? ratings.withoutReviews : '—';
  const score3 = ratings.flomaster !== null ? ratings.flomaster : '—';

  ratingsContainer.innerHTML = `
    <div class="ym-rzt-rating-circle rzt-blue-solid" data-tooltip="Сайт (Народ с рецензиями): ${score1}">${score1}</div>
    <div class="ym-rzt-rating-circle rzt-blue-outline" data-tooltip="Сайт (Народ без рецензий): ${score2}">${score2}</div>
    <div class="ym-rzt-rating-circle rzt-grey-solid" data-tooltip="Фломастер (РЗТ): ${score3}">${score3}</div>
  `;
}

// Keep player controls visible helper variables and functions
let ymKeepControlsActiveInterval = null;
let ymActiveHoverCount = 0;

function ymTriggerMouseMove() {
  const fullscreenRoot = document.querySelector('[class*="FullscreenPlayerDesktop_root"]');
  if (fullscreenRoot) {
    const event = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: window.innerWidth / 2,
      clientY: window.innerHeight / 2
    });
    fullscreenRoot.dispatchEvent(event);
    document.dispatchEvent(event);
  }
}

function ymStartKeepControlsActive() {
  if (!ymKeepControlsActiveInterval) {
    ymTriggerMouseMove();
    ymKeepControlsActiveInterval = setInterval(ymTriggerMouseMove, 1000);
  }
}

function ymStopKeepControlsActive() {
  const popover = document.querySelector('.ym-fullscreen-translate-popover');
  const isPopoverOpen = popover && popover.style.display === 'flex';
  
  if (ymActiveHoverCount <= 0 && !isPopoverOpen) {
    if (ymKeepControlsActiveInterval) {
      clearInterval(ymKeepControlsActiveInterval);
      ymKeepControlsActiveInterval = null;
    }
  }
}

function ymRegisterActiveElement(el) {
  if (!el || el.dataset.ymActiveRegistered === 'true') return;
  el.dataset.ymActiveRegistered = 'true';
  
  el.addEventListener('mouseenter', () => {
    ymActiveHoverCount++;
    ymStartKeepControlsActive();
  });
  
  el.addEventListener('mouseleave', () => {
    ymActiveHoverCount = Math.max(0, ymActiveHoverCount - 1);
    ymStopKeepControlsActive();
  });
}

// Listen to track state change to fetch RZT ratings in page/isolated context
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'YM_SYNC_STATE_CHANGED') {
      const state = event.data.state;
      if (state && state.trackId && state.trackId !== window.ymLastRztTrackId) {
        window.ymLastRztTrackId = state.trackId;
        window.ymCurrentRztRatings = { loading: true };
        
        // Update immediately if container is already visible
        const container = document.querySelector('.ym-fullscreen-rzt-ratings');
        if (container) {
          updateRztRatingsUI(container);
        }
        
        const metadata = state.metadata;
        if (metadata && metadata.title && metadata.artist) {
          const apiObj = typeof RztAPI !== 'undefined' ? RztAPI : (window.RztAPI || null);
          if (apiObj) {
            apiObj.getTrackRatings(metadata.artist, metadata.title)
              .then(ratings => {
                if (window.ymLastRztTrackId === state.trackId) {
                  window.ymCurrentRztRatings = ratings || { empty: true };
                  const container = document.querySelector('.ym-fullscreen-rzt-ratings');
                  if (container) {
                    updateRztRatingsUI(container);
                  }
                }
              })
              .catch(err => {
                console.error('[RZT-UI] Error getting track ratings:', err);
                if (window.ymLastRztTrackId === state.trackId) {
                  window.ymCurrentRztRatings = { error: true };
                  const container = document.querySelector('.ym-fullscreen-rzt-ratings');
                  if (container) {
                    updateRztRatingsUI(container);
                  }
                }
              });
          } else {
            console.warn('[RZT-UI] RztAPI not found in window/context');
            window.ymCurrentRztRatings = { error: true };
          }
        } else {
          window.ymCurrentRztRatings = null;
          const container = document.querySelector('.ym-fullscreen-rzt-ratings');
          if (container) {
            updateRztRatingsUI(container);
          }
        }
      }
    }
  });
}

// --- Component: page/socket-client.js ---
function connectToServer(serverUrl) {
  currentStatus = "connecting";
  updatePopoverUI(currentRoom, currentStatus);

  if (socket && currentServerUrl !== serverUrl) {
    console.log(`[SYNC] Смена адреса сервера с ${currentServerUrl} на ${serverUrl}. Переподключение...`);
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    currentServerUrl = serverUrl;
    console.log(`[SYNC] Подключение к серверу: ${serverUrl}`);
    socket = io(serverUrl);

    socket.on('connect', () => {
      console.log('[SYNC] Успешно подключились к серверу:', serverUrl);
      socket.emit('joinRoom', currentRoom);
      currentStatus = "connected";
      updatePopoverUI(currentRoom, currentStatus);
    });

    socket.on('connect_error', (error) => {
      console.error('[SYNC] Ошибка подключения к серверу:', error);
      currentStatus = "error";
      updatePopoverUI(currentRoom, currentStatus);
    });

    socket.on('disconnect', () => {
      console.log('[SYNC] Отключено от сервера');
      currentStatus = "disconnected";
      updatePopoverUI(null, currentStatus);
    });

    // Обработка синхронизации от сервера
    socket.on('syncState', (serverState) => {
      console.log('[SYNC] Получено syncState от Socket.io:', serverState);

      if (isSyncingFromServer) {
        console.log("[SYNC] Игнорируем команду синхронизации, так как уже идет процесс синхронизации");
        return;
      }

      let localTrackId = null;
      if (window.isCustomAudioActive && window.CustomAudioController && window.CustomAudioController.currentTrack) {
        localTrackId = `soundcloud:${window.CustomAudioController.currentTrack.id}`;
      } else {
        const activePlayer = getActivePlayer();
        const currentEntity = activePlayer?.queueController?.queue?.state?.currentEntity?.value;
        const entityData = currentEntity?.entity?.data;
        const rawId = entityData?.meta?.id || entityData?.id;
        if (rawId) {
          localTrackId = String(rawId);
          const filename = entityData?.meta?.filename || entityData?.filename || '';
          if ((entityData?.meta?.trackSource === 'UGC' || entityData?.trackSource === 'UGC') && filename.startsWith('soundcloud_')) {
            const match = filename.match(/soundcloud_(\d+)\.mp3/);
            if (match) {
              localTrackId = `soundcloud:${match[1]}`;
            }
          }
        }
      }

      isSyncingFromServer = true;
      startSyncSafetyTimeout();

      const isServerTrackValid = serverState.trackId &&
        String(serverState.trackId).trim() !== "" &&
        String(serverState.trackId) !== "undefined" &&
        String(serverState.trackId) !== "null";

      const activePlayer = getActivePlayer();

      // 1. Смена трека (или если плеер еще не инициализирован)
      if (isServerTrackValid && (!activePlayer || String(serverState.trackId) !== String(localTrackId))) {
        console.log(`[SYNC] Получена команда смены трека на ID: ${serverState.trackId}`);

        if (String(serverState.trackId).startsWith("soundcloud:")) {
          console.log(`[SYNC] Запуск SoundCloud синхронизации для: ${serverState.trackId}`);
          window.CustomAudioController.syncPlay(serverState.trackId, serverState)
            .then(() => {
              clearSyncSafetyTimeout();
              isSyncingFromServer = false;
              targetTrackIdToSync = null;
              targetServerStateToSync = null;
            })
            .catch(err => {
              console.error('[SYNC] Ошибка при синхронизации SoundCloud трека:', err);
              clearSyncSafetyTimeout();
              isSyncingFromServer = false;
              targetTrackIdToSync = null;
              targetServerStateToSync = null;
            });
          return;
        }

        // Stop custom audio if we are switching to a Yandex track
        if (window.CustomAudioController) {
          window.CustomAudioController.stop();
        }

        targetTrackIdToSync = String(serverState.trackId);
        targetServerStateToSync = serverState;

        const fallbackToRouter = (state) => {
          clearSyncSafetyTimeout();
          isSyncingFromServer = false;
          targetTrackIdToSync = null;
          targetServerStateToSync = null;
        };

        if (activePlayer) {
          try {
            // Стратегия А: Поиск трека в текущей очереди плеера
            const queueState = activePlayer.playbackState?.queueState;
            if (queueState && queueState.entityList && queueState.entityList.value) {
              const list = queueState.entityList.value;
              const trackIndex = list.findIndex(wrapper => {
                const data = wrapper?.entity?.data || wrapper?.entity?.entityData;
                const id = data?.meta?.id || data?.id;
                
                let queueTrackId = String(id);
                const filename = data?.meta?.filename || data?.filename || '';
                if ((data?.meta?.trackSource === 'UGC' || data?.trackSource === 'UGC') && filename.startsWith('soundcloud_')) {
                  const match = filename.match(/soundcloud_(\d+)\.mp3/);
                  if (match) {
                    queueTrackId = `soundcloud:${match[1]}`;
                  }
                }
                return String(queueTrackId) === String(serverState.trackId);
              });

              if (trackIndex !== -1) {
                console.log(`[SYNC] Трек найден в текущей очереди на индексе ${trackIndex}. Переключаем очередь.`);
                if (typeof activePlayer.setEntityByIndex === 'function') {
                  activePlayer.setEntityByIndex(trackIndex);
                } else if (queueState.index && typeof queueState.index.value !== 'undefined') {
                  queueState.index.value = trackIndex;
                } else {
                  queueState.index = trackIndex;
                }
                return;
              }
            }

            // Стратегия Б: Инжект трека в текущую очередь (бесшовный переход)
            console.log("[SYNC] Трека нет в очереди. Добавляем (inject) и переключаем...");
            if (activePlayer.queueController && typeof activePlayer.queueController.inject === 'function') {
              const currentIndex = queueState?.index?.value || 0;
              const insertIndex = currentIndex + 1;

              activePlayer.queueController.inject({
                entitiesData: [
                  { type: "unloaded", meta: { id: String(serverState.trackId) } }
                ],
                position: insertIndex,
                silent: false
              });

              setTimeout(() => {
                const list = queueState?.entityList?.value || [];
                let targetIndex = -1;

                for (let i = 0; i < list.length; i++) {
                  const d = list[i]?.entity?.data || list[i]?.entity?.entityData;
                  const id = d?.meta?.id || d?.id;
                  if (String(id) === String(serverState.trackId)) {
                    if (targetIndex === -1 || Math.abs(i - insertIndex) < Math.abs(targetIndex - insertIndex)) {
                      targetIndex = i;
                    }
                  }
                }

                const finalIndex = targetIndex !== -1 ? targetIndex : insertIndex;
                console.log(`[SYNC] Переключаемся на внедренный трек (целевой индекс ${finalIndex})`);

                if (typeof activePlayer.setEntityByIndex === 'function') {
                  activePlayer.setEntityByIndex(finalIndex);
                }
              }, 500);

              return;
            } else {
              fallbackToRouter(serverState);
            }
          } catch (e) {
            console.error("[SYNC] Ошибка при взаимодействии с API Sonata:", e);
            fallbackToRouter(serverState);
          }
        } else {
          fallbackToRouter(serverState);
        }
      }
      // 2. Трек тот же, синхронизируем время/паузу
      else if (isServerTrackValid) {
        if (String(serverState.trackId).startsWith("soundcloud:") && window.isCustomAudioActive) {
          window.CustomAudioController.syncPlay(serverState.trackId, serverState)
            .then(() => {
              clearSyncSafetyTimeout();
              isSyncingFromServer = false;
              targetTrackIdToSync = null;
              targetServerStateToSync = null;
            })
            .catch(err => {
              console.error('[SYNC] Ошибка при синхронизации SoundCloud трека:', err);
              clearSyncSafetyTimeout();
              isSyncingFromServer = false;
              targetTrackIdToSync = null;
              targetServerStateToSync = null;
            });
        } else if (activePlayer) {
          syncPlayerControls(activePlayer, serverState);
          clearSyncSafetyTimeout();
          isSyncingFromServer = false;
          targetTrackIdToSync = null;
          targetServerStateToSync = null;
        } else {
          clearSyncSafetyTimeout();
          isSyncingFromServer = false;
          targetTrackIdToSync = null;
          targetServerStateToSync = null;
        }
      } else {
        clearSyncSafetyTimeout();
        isSyncingFromServer = false;
        targetTrackIdToSync = null;
        targetServerStateToSync = null;
      }
    });
  } else {
    socket.emit('joinRoom', currentRoom);
    currentStatus = "connected";
    updatePopoverUI(currentRoom, currentStatus);
  }
}


// --- Component: page/player-monitor.js ---
function findProviderInTree(rootFiber) {
  if (!rootFiber) return null;

  const queue = [rootFiber];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;

    if (node.memoizedProps && node.memoizedProps.value) {
      const val = node.memoizedProps.value;
      if (val && typeof val === 'object' && val.playbackController) {
        return val;
      }
    }

    if (node.child) {
      let child = node.child;
      while (child) {
        queue.push(child);
        child = child.sibling;
      }
    }
  }
  return null;
}

function findProviderFromFiber(startFiber) {
  let fiber = startFiber;
  while (fiber) {
    if (fiber.memoizedProps && fiber.memoizedProps.value) {
      const val = fiber.memoizedProps.value;
      if (val && typeof val === 'object' && val.playbackController) {
        return val;
      }
    }
    fiber = fiber.return;
  }
  return null;
}

function getSonataCore() {
  const rootEl = document.querySelector('#root') || document.querySelector('#__next') || document.body;
  if (!rootEl) return null;

  const containerKey = Object.keys(rootEl).find(
    key => key.startsWith('__reactContainer$') || key.startsWith('__reactFiber$')
  );

  if (containerKey && rootEl[containerKey]) {
    let rootFiber = rootEl[containerKey];
    if (rootFiber.current) {
      rootFiber = rootFiber.current;
    }
    return findProviderInTree(rootFiber);
  }

  const playerEl = document.querySelector('[class*="player"]');
  if (playerEl) {
    const fiberKey = Object.keys(playerEl).find(key => key.startsWith('__reactFiber$'));
    if (fiberKey && playerEl[fiberKey]) {
      const found = findProviderFromFiber(playerEl[fiberKey]);
      if (found) return found;
    }
  }

  const sampleEl = rootEl.querySelector('*');
  if (sampleEl) {
    const fiberKey = Object.keys(sampleEl).find(key => key.startsWith('__reactFiber$'));
    if (fiberKey && sampleEl[fiberKey]) {
      const found = findProviderFromFiber(sampleEl[fiberKey]);
      if (found) return found;
    }
  }

  return null;
}

function getActivePlayer() {
  const core = getSonataCore();
  const activePlaybackWrapper = core?.playbackController?.activePlayback;
  // Если activePlayback - это обертка observable (свойство value), берем значение из нее
  return activePlaybackWrapper.value || null;
}

window.getActivePlayer = getActivePlayer;

function getTrackMetadata(activePlayer) {
  try {
    const playerStateTrack = activePlayer.playbackState?.playerState?.track?.value || activePlayer.playbackState?.playerState?.track;
    const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value;
    const entityData = currentEntity?.entity?.data;
    
    const dataObj = playerStateTrack || entityData?.meta || entityData;
    if (!dataObj) return null;

    const title = dataObj.title || 'Неизвестный трек';
    const version = dataObj.version ? ` (${dataObj.version})` : '';
    const fullTitle = title + version;

    const ugcArtist = entityData?.meta?.ugcArtistName || entityData?.ugcArtistName || dataObj.ugcArtistName;
    let artistsStr = 'Неизвестный исполнитель';
    if (ugcArtist) {
      artistsStr = ugcArtist;
    } else if (Array.isArray(dataObj.artists) && dataObj.artists.length > 0) {
      artistsStr = dataObj.artists.map(a => typeof a === 'object' && a !== null ? (a.name || '') : String(a)).filter(Boolean).join(', ') || 'Неизвестный исполнитель';
    } else if (dataObj.artist) {
      artistsStr = dataObj.artist;
    }

    let durationMs = 0;
    if (dataObj.durationMs) {
      durationMs = dataObj.durationMs;
    } else if (activePlayer.playbackState?.playerState?.progress?.value?.duration) {
      durationMs = activePlayer.playbackState.playerState.progress.value.duration * 1000;
    }

    let coverUrl = '';
    const coverUri = dataObj.coverUri || dataObj.ogImage;
    if (coverUri) {
      let uri = coverUri.replace('%%', '400x400');
      if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
        if (uri.startsWith('//')) {
          uri = 'https:' + uri;
        } else {
          uri = 'https://' + uri;
        }
      }
      coverUrl = uri;
    } else {
      coverUrl = 'https://music.yandex.ru/blocks/playlist-cover/playlist-cover_like.png';
    }

    const mediaSourceData = currentEntity?.entity?.mediaSourceData;
    const quality = mediaSourceData?.data?.quality || '';
    const codec = mediaSourceData?.data?.codec || '';
    const bitrate = mediaSourceData?.data?.bitrate || 0;

    const hasLyrics = !!(
      dataObj.hasLyrics === true || 
      dataObj.lyricsInfo?.hasAvailableText === true || 
      dataObj.lyricsInfo?.hasAvailableTextSync === true || 
      dataObj.lyricsInfo?.hasAvailableTextLyrics === true || 
      dataObj.lyricsInfo?.hasAvailableSyncLyrics === true || 
      dataObj.lyrics
    );

    return {
      title: fullTitle,
      artist: artistsStr,
      durationMs,
      coverUrl,
      quality,
      codec,
      bitrate,
      hasLyrics
    };
  } catch (err) {
    console.error('[SYNC] Ошибка получения метаданных трека:', err);
    return null;
  }
}

// Тайм-аут предохранителя для синхронизации
let syncSafetyTimeout = null;

function startSyncSafetyTimeout() {
  if (syncSafetyTimeout) clearTimeout(syncSafetyTimeout);
  syncSafetyTimeout = setTimeout(() => {
    if (isSyncingFromServer) {
      console.warn("[SYNC] Превышено время ожидания переключения трека (таймаут 4с). Сбрасываем флаг синхронизации.");
      isSyncingFromServer = false;
      targetTrackIdToSync = null;
      targetServerStateToSync = null;
    }
  }, 4000);
}

function clearSyncSafetyTimeout() {
  if (syncSafetyTimeout) {
    clearTimeout(syncSafetyTimeout);
    syncSafetyTimeout = null;
  }
}

// Синхронизация контролов плеера с данными от сервера
function syncPlayerControls(activePlayer, serverState) {
  const isPlaying = activePlayer.playbackState.playerState.status.value === 'playing';
  const isPause = !isPlaying;

  console.log(`[SYNC] Применяем состояние от сервера: Трек ID: ${serverState.trackId}, Время: ${Math.round(serverState.time)}с, Пауза: ${serverState.isPause}`);

  if (serverState.isPause !== isPause) {
    if (serverState.isPause) {
      if (typeof activePlayer.pause === 'function') {
        activePlayer.pause();
      }
    } else {
      if (typeof activePlayer.resume === 'function') {
        activePlayer.resume();
      } else if (typeof activePlayer.play === 'function') {
        activePlayer.play();
      }
    }
  }

  const progress = activePlayer.playbackState.playerState.progress.value;
  const currentPosition = progress?.position || 0;

  if (Math.abs(currentPosition - serverState.time) > 2) {
    console.log(`[SYNC] -> Перемотка через API: ${Math.round(currentPosition)}с -> ${Math.round(serverState.time)}с`);
    activePlayer.setProgress(serverState.time);
  }

  lastSentTrackId = serverState.trackId;
  lastSentIsPause = serverState.isPause;
  lastSentTime = serverState.time;
  lastSentTimestamp = Date.now();
}



function sendStateToPreload() {
  try {
    const activePlayer = getActivePlayer();
    let trackId = "";
    let isPause = true;
    let position = 0;
    let metadata = null;

    if (activePlayer) {
      try {
        const playerStateTrack = activePlayer.playbackState?.playerState?.track?.value || activePlayer.playbackState?.playerState?.track;
        const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value;
        const entityData = currentEntity?.entity?.data;
        if (rawTrackId && String(rawTrackId).trim() !== '' && String(rawTrackId) !== 'undefined' && String(rawTrackId) !== 'null') {
          trackId = String(rawTrackId);
          const filename = entityData?.meta?.filename || entityData?.filename || '';
          if ((entityData?.meta?.trackSource === 'UGC' || entityData?.trackSource === 'UGC') && filename.startsWith('soundcloud_')) {
            const match = filename.match(/soundcloud_(\d+)\.mp3/);
            if (match) {
              trackId = `soundcloud:${match[1]}`;
            }
          }
          const isPlaying = activePlayer.playbackState.playerState.status.value === 'playing';
          isPause = !isPlaying;
          const progress = activePlayer.playbackState.playerState.progress.value;
          position = progress?.position || 0;
          metadata = getTrackMetadata(activePlayer);
        }
      } catch (playerErr) {
        console.warn('[SYNC] Не удалось прочитать состояние плеера для Discord:', playerErr);
      }
    }

    const stateObj = {
      trackId: trackId,
      isPause: isPause,
      position: position,
      metadata: metadata,
      currentRoomId: currentRoom,
      serverUrl: currentServerUrl
    };

    if (typeof updateTrackUI === 'function') {
      updateTrackUI(metadata);
    }

    if (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendState === 'function') {
      window.__ymSyncBridge.sendState(stateObj);
    }
    window.postMessage({
      type: 'YM_SYNC_STATE_CHANGED',
      state: stateObj
    }, '*');
  } catch (err) {
    console.error('[SYNC] Ошибка отправки состояния в preload:', err);
  }
}

// Мониторинг локального плеера
function checkAndSendState() {
  try {
    if (window.isCustomAudioActive) {
      const ac = window.CustomAudioController;
      if (ac && ac.currentTrack) {
        const track = ac.currentTrack;
        const trackId = `soundcloud:${track.id}`;
        const isPause = !ac.isPlaying;
        const position = ac.audioElement ? ac.audioElement.currentTime : 0;
        const now = Date.now();

        const metadata = {
          title: track.title,
          artist: track.user ? track.user.username : 'SoundCloud Artist',
          durationMs: track.duration,
          coverUrl: track.artwork_url || (track.user && track.user.avatar_url) || '',
          hasLyrics: false,
          quality: '128kbps',
          codec: 'mp3',
          bitrate: 128
        };

        const stateObj = {
          trackId: trackId,
          isPause: isPause,
          position: position,
          metadata: metadata,
          currentRoomId: currentRoom,
          serverUrl: currentServerUrl
        };

        if (typeof updateTrackUI === 'function') {
          updateTrackUI(metadata);
        }

        if (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendState === 'function') {
          window.__ymSyncBridge.sendState(stateObj);
        }
        window.postMessage({
          type: 'YM_SYNC_STATE_CHANGED',
          state: stateObj
        }, '*');

        let shouldUpdate = false;
        if (trackId !== lastSentTrackId || isPause !== lastSentIsPause) {
          shouldUpdate = true;
          console.log(`[SYNC] SoundCloud локальное изменение: ${trackId}, Время: ${Math.round(position)}с, Пауза: ${isPause}`);
        } else if (!isPause) {
          const elapsed = (now - lastSentTimestamp) / 1000;
          const expectedPosition = lastSentTime + elapsed;
          if (Math.abs(position - expectedPosition) > 2) {
            shouldUpdate = true;
            console.log(`[SYNC] SoundCloud локальная перемотка: ${trackId}, Время: ${Math.round(position)}с, Пауза: ${isPause}`);
          }
        }

        if (shouldUpdate && socket && currentRoom) {
          lastSentTrackId = trackId;
          lastSentIsPause = isPause;
          lastSentTime = position;
          lastSentTimestamp = now;

          socket.emit('updateState', {
            roomId: currentRoom,
            state: {
              trackId: trackId,
              albumId: '',
              isPause: isPause,
              time: position
            }
          });
        }
      }

      // Если нативный плеер на фоне запустил проигрывание, тушим SoundCloud
      const activePlayer = getActivePlayer();
      if (activePlayer && activePlayer.playbackState?.playerState?.status?.value === 'playing') {
        console.log('[SYNC] Нативный плеер запущен поверх кастомного (мониторинг). Останавливаем кастомный.');
        if (ac) ac.stop();
      }
      return;
    }

    const activePlayer = getActivePlayer();
    if (!activePlayer) {
      if (lastPlayerFound) {
        console.warn("[SYNC] Активное воспроизведение не найдено");
        lastPlayerFound = false;
      }
      return;
    }

    if (!lastPlayerFound) {
      console.log("[SYNC] Успешно подключено к активному плееру Sonata!");
      lastPlayerFound = true;
    }

    if (isSyncingFromServer) {
      let trackId = null;
      try {
        const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value;
        const entityData = currentEntity?.entity?.data;
        trackId = entityData?.meta?.id || entityData?.id;
      } catch (err) { }

      if (trackId && targetTrackIdToSync && String(trackId) === String(targetTrackIdToSync)) {
        console.log(`[SYNC] Успешно переключились на целевой трек: ${trackId}. Синхронизация завершена.`);
        clearSyncSafetyTimeout();
        if (targetServerStateToSync) {
          syncPlayerControls(activePlayer, targetServerStateToSync);
        }
        isSyncingFromServer = false;
        targetTrackIdToSync = null;
        targetServerStateToSync = null;
      } else {
        return;
      }
    }

    const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value;
    const entityData = currentEntity?.entity?.data;

    const rawTrackId = entityData?.meta?.id || entityData?.id;
    if (!rawTrackId) return;
    let trackId = String(rawTrackId);
    if (trackId.trim() === '' || trackId === 'undefined' || trackId === 'null') return;

    // Map UGC SoundCloud tracks to a universal soundcloud: ID for shared session sync
    const filename = entityData?.meta?.filename || entityData?.filename || '';
    if ((entityData?.meta?.trackSource === 'UGC' || entityData?.trackSource === 'UGC') && filename.startsWith('soundcloud_')) {
      const match = filename.match(/soundcloud_(\d+)\.mp3/);
      if (match) {
        trackId = `soundcloud:${match[1]}`;
      }
    }

    const context = currentEntity?.context;
    const contextId = context?.data?.meta?.id || context?.data?.id;

    let urlAlbumId = '';
    const albumMatch = window.location.pathname.match(/\/album\/(\d+)/);
    if (albumMatch) {
      urlAlbumId = albumMatch[1];
    }

    const rawAlbumId = (context?.data?.type === 'album' && contextId) || entityData?.albums?.[0]?.id || urlAlbumId || '';
    const albumId = (rawAlbumId && rawAlbumId !== 'NaN' && !isNaN(Number(rawAlbumId))) ? String(rawAlbumId) : '';

    const isPlaying = activePlayer.playbackState.playerState.status.value === 'playing';
    const isPause = !isPlaying;



    const progress = activePlayer.playbackState.playerState.progress.value;
    const position = progress?.position || 0;

    // Отправляем состояние в preload-скрипт для обновления Discord RPC
    const stateObj = {
      trackId: trackId,
      isPause: isPause,
      position: position,
      metadata: getTrackMetadata(activePlayer),
      currentRoomId: currentRoom,
      serverUrl: currentServerUrl
    };

    if (typeof updateTrackUI === 'function') {
      updateTrackUI(stateObj.metadata);
    }

    if (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendState === 'function') {
      window.__ymSyncBridge.sendState(stateObj);
    }
    window.postMessage({
      type: 'YM_SYNC_STATE_CHANGED',
      state: stateObj
    }, '*');

    const now = Date.now();
    let shouldUpdate = false;

    if (trackId !== lastSentTrackId || isPause !== lastSentIsPause) {
      shouldUpdate = true;
      console.log(`[SYNC] Локальное изменение: Трек ID: ${trackId}, Время: ${Math.round(position)}с, Пауза: ${isPause}`);
    } else if (isPlaying) {
      const elapsed = (now - lastSentTimestamp) / 1000;
      const expectedPosition = lastSentTime + elapsed;
      if (Math.abs(position - expectedPosition) > 2) {
        shouldUpdate = true;
        console.log(`[SYNC] Локальная перемотка: Трек ID: ${trackId}, Время: ${Math.round(position)}с, Пауза: ${isPause}`);
      }
    }

    if (shouldUpdate && socket && currentRoom) {
      lastSentTrackId = trackId;
      lastSentIsPause = isPause;
      lastSentTime = position;
      lastSentTimestamp = now;

      socket.emit('updateState', {
        roomId: currentRoom,
        state: {
          trackId: trackId,
          albumId: albumId,
          isPause: isPause,
          time: position
        }
      });
    }
  } catch (globalErr) {
    console.warn("[SYNC] Ошибка в цикле мониторинга плеера:", globalErr.message || globalErr);
  }
}

// Запускаем мониторинг локального плеера
setInterval(checkAndSendState, 500);


// --- Component: shared/soundcloud-api.js ---
// ==========================================
// SOUNDCLOUD API (MAIN world)
// Communicates via window.postMessage → isolated bridge → background
// ==========================================

const SoundCloudAPI = {
  _pendingRequests: {},
  _initialized: false,

  _init() {
    if (this._initialized) return;
    this._initialized = true;

    // Listen for responses from the isolated bridge
    window.addEventListener('message', (event) => {
      if (!event.data || !event.data.__ym_sc_bridge_response) return;
      const { requestId, response } = event.data;
      const pending = SoundCloudAPI._pendingRequests[requestId];
      if (pending) {
        delete SoundCloudAPI._pendingRequests[requestId];
        if (response && response.ok) {
          pending.resolve(response);
        } else {
          pending.reject(new Error(response && response.error ? response.error : 'Unknown bridge error'));
        }
      }
    });
  },

  _sendToBridge(type, payload) {
    this._init();
    return new Promise((resolve, reject) => {
      const requestId = `sc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      this._pendingRequests[requestId] = { resolve, reject };

      // Timeout safety (increased to 60s for media transfer & upload retries)
      setTimeout(() => {
        if (this._pendingRequests[requestId]) {
          delete this._pendingRequests[requestId];
          reject(new Error('Bridge request timed out'));
        }
      }, 60000);

      window.postMessage({
        __ym_sc_bridge: true,
        requestId,
        type,
        payload
      }, '*');
    });
  },

  async searchTracks(query, limit = 10) {
    try {
      const result = await this._sendToBridge('SC_SEARCH', { query, limit });
      return result.tracks || [];
    } catch (err) {
      console.error('[SOUNDCLOUD] searchTracks error:', err);
      return [];
    }
  },

  async getStreamUrl(track) {
    try {
      const result = await this._sendToBridge('SC_GET_STREAM', { track });
      return result.url || null;
    } catch (err) {
      console.error('[SOUNDCLOUD] getStreamUrl error:', err);
      return null;
    }
  },

  async getTrackInfo(trackId) {
    try {
      const result = await this._sendToBridge('SC_GET_TRACK', { trackId });
      return result.track || null;
    } catch (err) {
      console.error('[SOUNDCLOUD] getTrackInfo error:', err);
      return null;
    }
  },

  // Fetches audio via the isolated bridge (bypasses media-src CSP by creating a yandex.ru blob URL)
  async fetchAudioBlob(streamUrl) {
    try {
      const result = await this._sendToBridge('SC_FETCH_AUDIO', { url: streamUrl });
      return result.url || null;
    } catch (err) {
      console.error('[SOUNDCLOUD] fetchAudioBlob error:', err);
      return null;
    }
  }
};

window.SoundCloudAPI = SoundCloudAPI;


// --- Component: shared/custom-audio.js ---
// ==========================================
// CUSTOM AUDIO CONTROLLER
// ==========================================

// Global logger to print volume states from all places
window.logAllVolumes = function(contextMessage = "") {
    let nativeSlider = null;
    let nativeExponent = null;
    let nativeAudioVol = null;
    let customAudioVol = null;
    let customSlider = null;

    try {
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && activePlayer.playbackState?.playerState) {
            nativeSlider = activePlayer.playbackState.playerState.volume?.value;
            nativeExponent = activePlayer.playbackState.playerState.exponentVolume?.value;
        }
    } catch(e) {}

    try {
        const nativeAudio = document.querySelector('audio:not(#ym-sync-custom-audio), video:not(#ym-sync-custom-audio)');
        if (nativeAudio) {
            nativeAudioVol = nativeAudio.volume;
        }
    } catch(e) {}

    try {
        if (window.CustomAudioController && window.CustomAudioController.audioElement) {
            customAudioVol = window.CustomAudioController.audioElement.volume;
        }
    } catch(e) {}

    try {
        const slider = document.getElementById('sc-ov-volume-slider');
        if (slider) {
            customSlider = parseFloat(slider.value);
        }
    } catch(e) {}

    console.log(
        `%c[VOLUME-SYNC-DEBUG] ${contextMessage}\n` +
        `  -> Наш ползунок (Custom Slider): ${customSlider !== null ? customSlider.toFixed(4) : 'не найден'}\n` +
        `  -> Наш аудио-элемент (Custom Audio volume): ${customAudioVol !== null ? customAudioVol.toFixed(4) : 'не инициализирован'}\n` +
        `  -> Оригинальный Sonata volume: ${nativeSlider !== null ? nativeSlider.toFixed(4) : 'не найден'}\n` +
        `  -> Оригинальный Sonata exponentVolume: ${nativeExponent !== null ? nativeExponent.toFixed(4) : 'не найден'}\n` +
        `  -> Оригинальный аудио-элемент (DOM volume): ${nativeAudioVol !== null ? nativeAudioVol.toFixed(4) : 'не найден'}`,
        "color: #ff9900; font-weight: bold;"
    );
};

// Helper to get native Yandex Music player volume (returns exponent volume which aligns with the UI slider)
window.getNativeVolume = function() {
    // 1. Try Sonata player exponent volume state
    try {
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && activePlayer.playbackState?.playerState?.exponentVolume) {
            const vol = activePlayer.playbackState.playerState.exponentVolume.value;
            if (typeof vol === 'number') return vol;
        } else if (window.getSonataCore) {
            const core = window.getSonataCore();
            if (core?.playbackController?.volumeControl) {
                const vol = core.playbackController.volumeControl.volume;
                if (typeof vol === 'number') return vol;
            } else if (core?.playbackController?.volume) {
                const vol = core.playbackController.volume;
                if (typeof vol === 'number') return vol;
            }
        }
        
        if (window.externalAPI && typeof window.externalAPI.getVolume === 'function') {
            const vol = window.externalAPI.getVolume();
            if (typeof vol === 'number') return vol;
        }
    } catch (e) {
        console.error("[VOLUME-DEBUG] getNativeVolume error:", e);
    }

    // 2. Try native audio element volume
    const nativeAudio = document.querySelector('audio:not(#ym-sync-custom-audio), video:not(#ym-sync-custom-audio)');
    if (nativeAudio) {
        return nativeAudio.volume;
    }
    
    // 3. Fallback to localStorage
    try {
        const stored = localStorage.getItem('volume') || localStorage.getItem('player-volume');
        if (stored !== null) {
            const parsed = parseFloat(stored);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
                // If it was stored as linear volume, convert back to exponent
                if (parsed === 0) return 0;
                return Math.max(0, Math.min(1, 1 + Math.log10(parsed) / 2));
            }
        }
    } catch (e) {}

    return 0.7;
};

// Helper to get native Yandex Music player exponent volume (actual audio output scale)
window.getNativeExponentVolume = function() {
    return window.getNativeVolume();
};

// Helper to set native Yandex Music player volume
window.setNativeVolume = function(vol) {
    if (window.logAllVolumes) {
        window.logAllVolumes(`setNativeVolume вызвана с vol = ${vol}`);
    }
    
    // Translate the desired exponent volume (vol) to Yandex's linear volume
    // volume = 10^(2 * (exponentVolume - 1))
    const translatedVol = vol === 0 ? 0 : Math.max(0, Math.min(1, Math.pow(10, 2 * (vol - 1))));

    // 1. Try Sonata active player API
    try {
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && typeof activePlayer.setVolume === 'function') {
            activePlayer.setVolume(translatedVol);
        } else if (window.getSonataCore) {
            const core = window.getSonataCore();
            if (core?.playbackController) {
                if (typeof core.playbackController.setVolume === 'function') {
                    core.playbackController.setVolume(translatedVol);
                } else if (core.playbackController.volumeControl && typeof core.playbackController.volumeControl.setVolume === 'function') {
                    core.playbackController.volumeControl.setVolume(translatedVol);
                }
            }
        }
        
        if (window.externalAPI && typeof window.externalAPI.setVolume === 'function') {
            window.externalAPI.setVolume(translatedVol);
        }
    } catch (e) {
        console.error("[VOLUME-DEBUG] setNativeVolume error:", e);
    }

    // 2. Set on native audio element
    const nativeAudio = document.querySelector('audio:not(#ym-sync-custom-audio), video:not(#ym-sync-custom-audio)');
    if (nativeAudio) {
        nativeAudio.volume = vol;
    }

    // 3. Set localStorage keys (store linear volume so Yandex's internal code reads it correctly)
    try {
        localStorage.setItem('volume', String(translatedVol));
        localStorage.setItem('player-volume', String(translatedVol));
    } catch (e) {}

    // Log after short timeout to let MobX or other handlers apply changes
    setTimeout(() => {
        if (window.logAllVolumes) {
            window.logAllVolumes("setNativeVolume: Применилось (100мс)");
        }
    }, 100);
};

const CustomAudioController = {
    audioElement: null,
    isPlaying: false,
    currentTrack: null,
    onStateChange: null, // Callback for UI updates

    init() {
        if (!this.audioElement) {
            this.audioElement = document.createElement('audio');
            this.audioElement.id = 'ym-sync-custom-audio';
            this.audioElement.style.display = 'none';
            document.body.appendChild(this.audioElement);

            this.audioElement.addEventListener('timeupdate', () => this.emitState());
            this.audioElement.addEventListener('play', () => {
                this.isPlaying = true;
                this.emitState();
            });
            this.audioElement.addEventListener('pause', () => {
                this.isPlaying = false;
                this.emitState();
            });
            this.audioElement.addEventListener('ended', () => {
                this.isPlaying = false;
                this.emitState();
                // Optionally play next track if we implement a custom queue
            });
            
            // Set volume to match native player on init (use exponent volume for correct loudness)
            this.audioElement.volume = window.getNativeExponentVolume ? window.getNativeExponentVolume() : 0.7;
        }
    },

    emitState() {
        if (this.onStateChange) {
            this.onStateChange({
                track: this.currentTrack,
                isPlaying: this.isPlaying,
                currentTime: this.audioElement ? this.audioElement.currentTime : 0,
                duration: this.audioElement && this.audioElement.duration ? this.audioElement.duration : (this.currentTrack ? this.currentTrack.duration / 1000 : 0)
            });
        }
    },

    async playTrack(track, streamUrl) {
        this.init();
        
        // Sync volume with native player (use exponent volume for correct loudness)
        if (window.getNativeExponentVolume) {
            this.audioElement.volume = window.getNativeExponentVolume();
        }
        
        // 1. Pause native player
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && typeof activePlayer.pause === 'function') {
            window.isCustomAudioActive = true;
            activePlayer.pause();
        } else {
            window.isCustomAudioActive = true;
        }

        // 2. Set track info immediately so UI can update
        this.currentTrack = track;
        this.emitState();

        // 3. Get blob URL (fetched by isolated bridge — bypasses media-src CSP)
        console.log('[CUSTOM AUDIO] Fetching audio blob for:', track.title);
        const blobUrl = await window.SoundCloudAPI.fetchAudioBlob(streamUrl);
        if (!blobUrl) {
            console.error('[CUSTOM AUDIO] Failed to get blob URL');
            window.isCustomAudioActive = false;
            this.currentTrack = null;
            return;
        }

        // 4. Revoke any previous blob URL to free memory
        if (this._currentBlobUrl) {
            URL.revokeObjectURL(this._currentBlobUrl);
        }
        this._currentBlobUrl = blobUrl;

        // 5. Play
        this.audioElement.src = blobUrl;
        this.audioElement.currentTime = 0;
        try {
            await this.audioElement.play();
        } catch (err) {
            console.error('[CUSTOM AUDIO] Play error:', err);
        }
    },

    togglePlayPause() {
        if (!this.audioElement) return;
        if (this.audioElement.paused) {
            this.audioElement.play();
        } else {
            this.audioElement.pause();
        }
    },

    seek(time) {
        if (!this.audioElement) return;
        this.audioElement.currentTime = time;
    },

    setVolume(vol) {
        if (!this.audioElement) return;
        this.audioElement.volume = vol;
    },

    async syncPlay(scTrackId, serverState) {
        this.init();

        // Sync volume with native player (use exponent volume for correct loudness)
        if (window.getNativeExponentVolume) {
            this.audioElement.volume = window.getNativeExponentVolume();
        }

        const numericId = String(scTrackId).replace('soundcloud:', '');

        // If the same track is already loaded
        if (this.currentTrack && String(this.currentTrack.id) === numericId) {
            // Apply play/pause state
            if (serverState.isPause) {
                if (!this.audioElement.paused) {
                    this.audioElement.pause();
                }
            } else {
                if (this.audioElement.paused) {
                    this.audioElement.play().catch(e => console.error('[CUSTOM AUDIO] Play error on sync:', e));
                }
            }

            // Apply seek position
            if (Math.abs(this.audioElement.currentTime - serverState.time) > 2) {
                console.log(`[CUSTOM AUDIO] Seek sync: ${this.audioElement.currentTime} -> ${serverState.time}`);
                this.audioElement.currentTime = serverState.time;
            }
            return;
        }

        console.log('[CUSTOM AUDIO] Syncing new SoundCloud track:', numericId);

        // 1. Pause native player
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && typeof activePlayer.pause === 'function') {
            activePlayer.pause();
        }
        window.isCustomAudioActive = true;

        // 2. Fetch track info from SoundCloud
        const track = await window.SoundCloudAPI.getTrackInfo(numericId);
        if (!track) {
            console.error('[CUSTOM AUDIO] Failed to fetch track info for:', numericId);
            return;
        }

        // 3. Get stream URL
        const streamUrl = await window.SoundCloudAPI.getStreamUrl(track);
        if (!streamUrl) {
            console.error('[CUSTOM AUDIO] Failed to get stream URL for track:', numericId);
            return;
        }

        // 4. Fetch audio blob
        const blobUrl = await window.SoundCloudAPI.fetchAudioBlob(streamUrl);
        if (!blobUrl) {
            console.error('[CUSTOM AUDIO] Failed to get audio blob for track:', numericId);
            return;
        }

        // Revoke old blob url
        if (this._currentBlobUrl) {
            URL.revokeObjectURL(this._currentBlobUrl);
        }
        this._currentBlobUrl = blobUrl;

        this.currentTrack = track;
        this.audioElement.src = blobUrl;
        this.audioElement.currentTime = serverState.time || 0;

        if (serverState.isPause) {
            this.audioElement.pause();
        } else {
            try {
                await this.audioElement.play();
            } catch (err) {
                console.error('[CUSTOM AUDIO] Play error on initial sync:', err);
            }
        }

        this.emitState();
    },

    stop() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
        }
        this.isPlaying = false;
        this.currentTrack = null;
        window.isCustomAudioActive = false;
        this.emitState();
    }
};

window.CustomAudioController = CustomAudioController;


// --- Component: shared/player-faker.js ---
// ==========================================
// UI FAKER (FULL PLAYER OVERLAY)
// ==========================================

const PlayerFaker = {
    overlayActive: false,
    updateInterval: null,
    initialized: false,
    _progressDragging: false,
    spriteMuteId: 'volumeMute_xs',
    spritePauseId: 'pause_filled_l',
    spritePlayId: 'play_filled_l',
    lastLoadedArtworkUrl: null,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        // Inject the CSS rule to hide original elements when custom player is active
        const style = document.createElement('style');
        style.id = 'ym-sync-player-faker-styles';
        style.textContent = `
            body.ym-sync-player-active [class*="PlayerBar_root"],
            body.ym-sync-player-active [class*="PlayerBarDesktop_root"],
            body.ym-sync-player-active [class*="player-bar"],
            body.ym-sync-player-active [class*="CommonLayout_player"],
            body.ym-sync-player-active [class*="DefaultLayout_player"] {
                z-index: 99999 !important;
            }
            body.ym-sync-player-active [class*="PlayerBarDesktopWithBackgroundProgressBar_player"],
            body.ym-sync-player-active [class*="PlayerBar_player"],
            body.ym-sync-player-active [class*="PlayerBarDesktop_player"] {
                display: none !important;
            }
        `;
        document.head.appendChild(style);

        // Register callback with CustomAudioController
        window.CustomAudioController.onStateChange = (state) => {
            if (state.track !== null) {
                if (!this.overlayActive) {
                    this.activateOverlay(state);
                } else {
                    this.updateUI(state);
                }
            } else {
                if (this.overlayActive) {
                    this.deactivateOverlay();
                }
            }
        };

        // Listen to native audio play events to deactivate custom player immediately
        document.addEventListener('play', (e) => {
            if (e.target && e.target.tagName === 'AUDIO' && e.target.id !== 'ym-sync-custom-audio') {
                console.log('[SYNC] Native audio play detected. Stopping custom audio.');
                if (window.CustomAudioController) {
                    window.CustomAudioController.stop();
                }
            }
        }, true);

        // Fetch sprite icons dynamically at startup
        fetch('/icons/sprite.svg')
            .then(res => res.text())
            .then(text => {
                const ids = [...text.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
                
                // Prioritize large icons with '_l' suffix for play/pause buttons
                const pauseId = ids.find(id => id === 'pause_filled_l') || 
                                ids.find(id => id.startsWith('pause_filled') || id.startsWith('pause'));
                if (pauseId) this.spritePauseId = pauseId;
                
                const playId = ids.find(id => id === 'play_filled_l') || 
                               ids.find(id => id.startsWith('play_filled') || id.startsWith('play'));
                if (playId) this.spritePlayId = playId;

                const muteId = ids.find(id => id === 'volumeMute_xs') ||
                               ids.find(id => id.toLowerCase().includes('mute') || id.toLowerCase().includes('off'));
                if (muteId) this.spriteMuteId = muteId;

                console.log('[FAKER] Detected sprite IDs:', {
                    mute: this.spriteMuteId,
                    pause: this.spritePauseId,
                    play: this.spritePlayId
                });
            })
            .catch(err => {
                console.warn('[FAKER] Failed to query sprite.svg, using standard keys:', err);
            });
    },

    findPlayerBar() {
        return document.querySelector('[class*="PlayerBarDesktopWithBackgroundProgressBar_player"]') ||
               document.querySelector('[class*="PlayerBar_player"]') ||
               document.querySelector('[class*="PlayerBarDesktop_player"]');
    },

    activateOverlay(state) {
        this.overlayActive = true;

        const playerBar = this.findPlayerBar();
        if (!playerBar) {
            console.warn('[FAKER] Player bar not found');
            return;
        }

        const playerBarParent = playerBar.parentElement;
        if (!playerBarParent) {
            console.warn('[FAKER] Player bar parent not found');
            return;
        }

        // Remove any previous overlay
        const old = document.getElementById('ym-sync-player-overlay');
        if (old) old.remove();

        // Measure native player bar height to prevent layout collapse
        const nativeHeight = playerBar.offsetHeight || 64;

        // Add class to body to trigger CSS rules
        document.body.classList.add('ym-sync-player-active');

        const overlay = document.createElement('div');
        overlay.id = 'ym-sync-player-overlay';
        overlay.style.cssText = `
            position: relative !important;
            width: 100% !important;
            height: ${nativeHeight}px !important;
            z-index: 99999 !important;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-sizing: border-box;
            background: var(--ym-background-color-primary-enabled-player, rgba(24, 24, 28, 0.95)) !important;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-top: 1px solid var(--yp-color-border-primary, rgba(255, 255, 255, 0.05)) !important;
            color: #fff;
            font-family: Inter, system-ui, sans-serif;
            padding: 0 24px;
            pointer-events: auto;
        `;

        overlay.innerHTML = `
            <!-- Progress Bar (Full Width at the Top) -->
            <div id="sc-ov-progress-container" style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 2px;
                cursor: pointer;
                background: rgba(255, 255, 255, 0.08);
                z-index: 10;
                transition: height 0.1s;
            ">
                <div id="sc-ov-progress-fill" style="
                    height: 100%;
                    width: 0%;
                    background: #ffe000;
                "></div>
                <input id="sc-ov-seek" type="range" min="0" max="1" step="0.001" value="0" style="
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    cursor: pointer;
                    margin: 0;
                    padding: 0;
                ">
            </div>

            <!-- Left Section: Cover + Title + Artist -->
            <div class="PlayerBarDesktopWithBackgroundProgressBar_info__YnvZ_">
                <div class="PlayerBarDesktopWithBackgroundProgressBar_infoCard__i0cbW">
                    <div class="qaIScXjx1qyXuaIHXQIo _7gw1qGE6BeUAdSMbhRx ZcpulvHgF_wsgzB8Hye9 PlayerBarDesktopWithBackgroundProgressBar_coverContainer__dkNCG" style="width: 42px !important; height: 42px !important; overflow: hidden !important; border-radius: 4px !important; flex-shrink: 0 !important; display: block !important;">
                        <img id="sc-ov-cover" class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG PlayerBarDesktopWithBackgroundProgressBar_cover__MKmEt" alt="" loading="eager" src="" style="width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important;">
                    </div>
                    <div class="PlayerBarDesktopWithBackgroundProgressBar_description__5jHke">
                        <div class="Meta_root__R8n1h Meta_root_withSecondaryColor___uENY">
                            <div class="Meta_metaContainer__7i2dp">
                                <div class="Meta_titleContainer__gDuXr">
                                    <div class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR Meta_text__Y5uYH" style="-webkit-line-clamp: 1;">
                                        <span class="_MWOVuZRvUQdXKTMcOPx Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR Meta_text__Y5uYH Meta_title__GGBnH" id="sc-ov-title"></span>
                                    </div>
                                    <span class="Meta_explicitMarkContainer__BxMQg" style="margin-left: 6px; display: inline-flex; align-items: center; vertical-align: middle;">
                                        <svg width="22" height="10" viewBox="0 0 22 10" fill="none" style="flex-shrink: 0; vertical-align: middle;">
                                            <rect width="22" height="10" rx="2" fill="#ff5500"/>
                                            <text x="11" y="7.5" text-anchor="middle" fill="white" font-size="6" font-weight="bold" font-family="Arial,sans-serif">SC</text>
                                        </svg>
                                    </span>
                                </div>
                                <div class="SeparatedArtists_root_variant_breakAll__34YbW SeparatedArtists_root_clamp__SyvjM Meta_text__Y5uYH Meta_artists__VnR52" style="-webkit-line-clamp: 1;">
                                    <span class="_MWOVuZRvUQdXKTMcOPx Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR Meta_text__Y5uYH Meta_artistCaption__JESZi" id="sc-ov-artist"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Center Section: Play/Pause button -->
            <div class="PlayerBarDesktopWithBackgroundProgressBar_sonata__mGFb_ PlayerBarDesktopWithBackgroundProgressBar_sonata_withReversedControls__9TjDN" style="justify-content: center; flex: 1;">
                <div class="BaseSonataControlsDesktop_root__E6wjA PlayerBarDesktopWithBackgroundProgressBar_sonataControls__rSmXQ PlayerBarDesktopWithBackgroundProgressBar_important__HzXrK SonataControls_root__w8uqu" style="justify-content: center;">
                    <div class="BaseSonataControlsDesktop_sonataButtons__7vLtw" style="margin: 0;">
                        <button id="sc-ov-play" class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr undefined qU2apWBO1yyEK0lZ3lPO WsKeF73pWotx9W1tWdYY BaseSonataControlsDesktop_sonataButton__GbwFt" type="button" aria-label="Воспроизведение" aria-live="off" aria-busy="false">
                            <span class="JjlbHZ4FaP9EAcR_1DxF">
                                <svg class="J9wTKytjOWG73QMoN5WP BaseSonataControlsDesktop_playButtonIcon__TlFqv YjRa1ZjM_lXFlrfS7jcu" focusable="false" aria-hidden="true" id="sc-ov-play-svg">
                                    <use xlink:href="/icons/sprite.svg#play_filled_l"></use>
                                </svg>
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Right Section: Lyrics + Volume -->
            <div class="PlayerBarDesktopWithBackgroundProgressBar_meta__FhKTC" style="position: relative; display: flex; align-items: center; gap: 8px;">
                <!-- Lyrics Button -->
                <button id="sc-ov-lyrics" class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO undefined" type="button" aria-label="Включить текстомузыку Может нарушить доступность" aria-live="off" aria-busy="false">
                    <span class="JjlbHZ4FaP9EAcR_1DxF">
                        <svg class="J9wTKytjOWG73QMoN5WP UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true">
                            <use xlink:href="/icons/sprite.svg#syncLyrics_xs"></use>
                        </svg>
                    </span>
                </button>
                
                <!-- Volume Control -->
                <div class="ChangeVolume_root__HDxtA">
                    <div class="ChangeVolume_sliderContainer__pvOZa">
                        <div class="ChangeVolume_wrapperSlider__9S1Vi">
                            <input id="sc-ov-volume-slider" class="JkKcxRVvjK7lcakkEliC qpvIbN4_hF6CqK0bjCq7 SHvrm0VRiLVwGqJJjNO8 undefined ChangeVolume_slider__fCKGZ ChangeVolume_important__ZIYpu" max="1" step="0.01" aria-label="Управление громкостью" type="range" value="0.72">
                        </div>
                    </div>
                    <button id="sc-ov-volume-btn" class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO undefined ChangeVolume_button__4HLEr" type="button" aria-label="Выключить звук" aria-live="off" aria-busy="false">
                        <span class="JjlbHZ4FaP9EAcR_1DxF">
                            <svg class="J9wTKytjOWG73QMoN5WP ChangeVolume_icon__5Zv2a UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true" id="sc-ov-volume-svg">
                                <use xlink:href="/icons/sprite.svg#volume_xs"></use>
                            </svg>
                        </span>
                    </button>
                </div>
            </div>
        `;

        playerBarParent.appendChild(overlay);

        // === Stop event propagation on the overlay to prevent Yandex Music event handlers from triggering ===
        overlay.addEventListener('click', (e) => e.stopPropagation());
        overlay.addEventListener('mousedown', (e) => e.stopPropagation());
        overlay.addEventListener('mouseup', (e) => e.stopPropagation());
        overlay.addEventListener('keydown', (e) => e.stopPropagation());
        overlay.addEventListener('keyup', (e) => e.stopPropagation());

        // === Micro-animations for progress bar ===
        const progressContainer = overlay.querySelector('#sc-ov-progress-container');
        progressContainer.addEventListener('mouseenter', () => {
            progressContainer.style.height = '6px';
        });
        progressContainer.addEventListener('mouseleave', () => {
            progressContainer.style.height = '2px';
        });

        // === Wire up buttons ===
        const playBtn      = overlay.querySelector('#sc-ov-play');
        const lyricsBtn    = overlay.querySelector('#sc-ov-lyrics');
        const seekInput    = overlay.querySelector('#sc-ov-seek');
        const progressFill = overlay.querySelector('#sc-ov-progress-fill');

        const volumeSlider = overlay.querySelector('#sc-ov-volume-slider');
        const volumeBtn    = overlay.querySelector('#sc-ov-volume-btn');
        const volumeSvg    = overlay.querySelector('#sc-ov-volume-svg');

        // Play/Pause toggle
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.CustomAudioController.togglePlayPause();
        });

        // Lyrics toggle
        lyricsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof toggleNativeFullscreen === 'function') {
                toggleNativeFullscreen();
            } else {
                window.postMessage({ type: 'FROM_MAIN', action: 'TOGGLE_LYRICS' }, '*');
            }
        });

        // Seek bar
        seekInput.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this._progressDragging = true;
        });
        seekInput.addEventListener('mouseup', (e) => {
            e.stopPropagation();
            this._progressDragging = false;
            const audio = window.CustomAudioController.audioElement;
            if (audio && audio.duration) {
                audio.currentTime = seekInput.value * audio.duration;
            }
        });
        seekInput.addEventListener('input', (e) => {
            e.stopPropagation();
            const pct = parseFloat(seekInput.value) * 100;
            progressFill.style.transition = 'none';
            progressFill.style.width = pct + '%';
        });

        // Volume control styling helper
        const updateSliderStyle = (vol) => {
            const pct = Math.round(vol * 100);
            volumeSlider.style.backgroundSize = `${pct}% 100%`;
            volumeSlider.style.setProperty('--seek-before-width', `${pct}%`);
        };

        const updateVolumeIcon = (vol) => {
            const useEl = volumeSvg.querySelector('use');
            if (useEl) {
                if (vol === 0) {
                    useEl.setAttribute('xlink:href', `/icons/sprite.svg#${this.spriteMuteId}`);
                    volumeBtn.setAttribute('aria-label', 'Включить звук');
                } else {
                    useEl.setAttribute('xlink:href', `/icons/sprite.svg#volume_xs`);
                    volumeBtn.setAttribute('aria-label', 'Выключить звук');
                }
            }
        };

        const currentVol = window.getNativeVolume ? window.getNativeVolume() : 0.7;
        volumeSlider.value = currentVol;
        updateSliderStyle(currentVol);
        updateVolumeIcon(currentVol);

        volumeSlider.addEventListener('input', (e) => {
            e.stopPropagation();
            const vol = parseFloat(volumeSlider.value);
            if (window.logAllVolumes) {
                window.logAllVolumes(`Драг ползунка: Новое значение = ${vol}`);
            }
            // 1. Set volume on native Yandex player (translating slider to native linear scale)
            if (window.setNativeVolume) {
                window.setNativeVolume(vol);
            }
            // 2. Set volume on custom audio element (same as slider)
            window.CustomAudioController.setVolume(vol);

            updateSliderStyle(vol);
            updateVolumeIcon(vol);
        });

        let lastVolume = currentVol || 0.7;
        volumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const audio = window.CustomAudioController.audioElement;
            if (audio) {
                if (audio.volume > 0) {
                    // Store current linear volume from slider before muting
                    lastVolume = parseFloat(volumeSlider.value) || 0.7;
                    console.log("[VOLUME-DEBUG] Mute clicked. Saving lastVolume:", lastVolume);
                    if (window.setNativeVolume) {
                        window.setNativeVolume(0);
                    }
                    window.CustomAudioController.setVolume(0);
                    volumeSlider.value = 0;
                    updateSliderStyle(0);
                    updateVolumeIcon(0);
                } else {
                    console.log("[VOLUME-DEBUG] Unmute clicked. Restoring lastVolume:", lastVolume);
                    if (window.setNativeVolume) {
                        window.setNativeVolume(lastVolume);
                    }
                    window.CustomAudioController.setVolume(lastVolume);
                    volumeSlider.value = lastVolume;
                    updateSliderStyle(lastVolume);
                    updateVolumeIcon(lastVolume);
                }
            }
        });

        // Initial state update
        this.updateUI(state || {});

        // Periodic sync (for play icon, progress)
        this.updateInterval = setInterval(() => this._tick(), 250);
    },

    deactivateOverlay() {
        this.overlayActive = false;

        document.body.classList.remove('ym-sync-player-active');

        const overlay = document.getElementById('ym-sync-player-overlay');
        if (overlay) overlay.remove();

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        window.isCustomAudioActive = false;
        this.lastLoadedArtworkUrl = null;
    },

    _tick() {
        if (!this.overlayActive) return;

        // Log volumes every 8 ticks (~2 seconds)
        if (!this._tickCount) this._tickCount = 0;
        this._tickCount++;
        if (this._tickCount % 8 === 0) {
            if (window.logAllVolumes) {
                window.logAllVolumes("Периодический тик (2с)");
            }
        }

        const ac = window.CustomAudioController;
        if (!ac || !ac.audioElement) return;

        const audio = ac.audioElement;
        const dur = audio.duration || (ac.currentTrack && ac.currentTrack.duration / 1000) || 0;
        const cur = audio.currentTime || 0;

        const fill   = document.getElementById('sc-ov-progress-fill');
        const seek   = document.getElementById('sc-ov-seek');
        const playSvg = document.getElementById('sc-ov-play-svg');
        const playBtn = document.getElementById('sc-ov-play');

        if (!this._progressDragging && dur > 0) {
            const pct = (cur / dur) * 100;
            if (fill) {
                fill.style.width = pct + '%';
            }
            if (seek) seek.value = cur / dur;
        }

        // Play/Pause icon & accessibility
        if (playSvg && playBtn) {
            const useEl = playSvg.querySelector('use');
            if (useEl) {
                if (ac.isPlaying) {
                    useEl.setAttribute('xlink:href', `/icons/sprite.svg#${this.spritePauseId}`);
                    playBtn.setAttribute('aria-label', 'Пауза');
                } else {
                    useEl.setAttribute('xlink:href', `/icons/sprite.svg#${this.spritePlayId}`);
                    playBtn.setAttribute('aria-label', 'Воспроизведение');
                }
            }
        }
    },

    updateUI(state) {
        if (!state || !state.track) return;

        const title  = document.getElementById('sc-ov-title');
        const artist = document.getElementById('sc-ov-artist');
        const cover  = document.getElementById('sc-ov-cover');

        if (title)  title.textContent  = state.track.title || 'Unknown Track';
        if (artist) artist.textContent = state.track.user?.username || 'SoundCloud';

        // Load artwork via bridge (bypasses img-src CSP)
        const rawUrl = state.track.artwork_url || state.track.user?.avatar_url || '';
        if (cover && rawUrl && this.lastLoadedArtworkUrl !== rawUrl) {
            this.lastLoadedArtworkUrl = rawUrl;
            const artUrl = rawUrl.replace('-large', '-t200x200');
            window.SoundCloudAPI._sendToBridge('SC_FETCH_AUDIO', { url: artUrl })
                .then(res => {
                    if (res && res.url && cover && cover.isConnected) cover.src = res.url;
                })
                .catch(() => {});
        }
    }
};

window.PlayerFaker = PlayerFaker;

// Initialize when loaded
setTimeout(() => {
    if (window.PlayerFaker && window.CustomAudioController) {
        window.PlayerFaker.init();
    }
}, 1000);


// --- Component: shared/soundcloud-search.js ---
// ==========================================
// SOUNDCLOUD SEARCH INJECTOR
// ==========================================

const SoundCloudSearchInjector = {
    initialized: false,
    lastQuery: '',
    searchTimeout: null,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        // Monitor URL changes
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                // Reset container reference on navigation
                const old = document.getElementById('ym-sync-soundcloud-results');
                if (old) old.remove();
                this.lastQuery = '';
                this.checkSearchPage(true);
            }
        }).observe(document, { subtree: true, childList: true });

        // Initial check — retry since React content may not be ready yet
        this.retryCheck(0);

        // Monitor search input typing
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[type="search"]') && location.pathname.startsWith('/search')) {
                const query = e.target.value;
                if (query !== this.lastQuery) {
                    this.lastQuery = query;
                    clearTimeout(this.searchTimeout);
                    if (!query || query.trim() === '') {
                        // Clear results immediately if query is cleared
                        const old = document.getElementById('ym-sync-soundcloud-results');
                        if (old) old.remove();
                    } else {
                        this.searchTimeout = setTimeout(() => {
                            this.performSearch(query);
                        }, 800);
                    }
                }
            }
        });
    },

    checkSearchPage(fromUrlChange = false) {
        if (location.pathname.startsWith('/search')) {
            const searchInput = document.querySelector('input[type="search"]');
            const urlQuery = new URLSearchParams(location.search).get('text') || '';
            const query = fromUrlChange ? urlQuery : (searchInput ? searchInput.value : urlQuery);
            if (query !== this.lastQuery) {
                this.lastQuery = query;
                this.performSearch(query);
            }
        } else {
            const old = document.getElementById('ym-sync-soundcloud-results');
            if (old) old.remove();
        }
    },

    retryCheck(attempt) {
        if (attempt > 12) return;
        setTimeout(() => {
            if (location.pathname.startsWith('/search')) {
                const query = new URLSearchParams(location.search).get('text') || '';
                if (query && query !== this.lastQuery) {
                    const ready =
                        document.querySelector('[class*="SearchMixed_container"]') ||
                        document.querySelector('[class*="SearchMixed_root"]');
                    if (ready) {
                        this.lastQuery = query;
                        this.performSearch(query);
                        return;
                    }
                }
            }
            this.retryCheck(attempt + 1);
        }, 400 * (attempt + 1));
    },

    async performSearch(query) {
        if (!query || query.trim() === '') {
            const old = document.getElementById('ym-sync-soundcloud-results');
            if (old) old.remove();
            return;
        }
        console.log('[SOUNDCLOUD] Searching for:', query);
        this.injectLoadingState();
        try {
            const tracks = await window.SoundCloudAPI.searchTracks(query, 8);
            this.renderResults(tracks);
        } catch (err) {
            console.error('[SOUNDCLOUD] Search failed:', err);
            this.renderError();
        }
    },

    getContainer() {
        // Re-use existing container if already inserted and still in DOM
        const existing = document.getElementById('ym-sync-soundcloud-results');
        if (existing && existing.isConnected) return existing;

        // Try to find SearchMixed_root first (to be inside the scrollable area)
        const mixedRoot = document.querySelector('[class*="SearchMixed_root"]');
        if (mixedRoot) {
            const scContainer = document.createElement('div');
            scContainer.id = 'ym-sync-soundcloud-results';
            scContainer.style.cssText = `
                padding: 16px 24px;
                box-sizing: border-box;
                border-bottom: 1px solid rgba(255,255,255,0.07);
                margin-bottom: 16px;
            `;
            try {
                mixedRoot.prepend(scContainer);
                return scContainer;
            } catch (err) {
                console.error('[SOUNDCLOUD] Failed to prepend to mixedRoot:', err);
            }
        }

        // Fallback to SearchPage_content
        const contentDiv = document.querySelector('[class*="SearchPage_content"]');
        if (contentDiv) {
            const scContainer = document.createElement('div');
            scContainer.id = 'ym-sync-soundcloud-results';
            scContainer.style.cssText = `
                padding: 16px 24px;
                box-sizing: border-box;
                border-bottom: 1px solid rgba(255,255,255,0.07);
                margin-bottom: 16px;
            `;
            try {
                contentDiv.prepend(scContainer);
                return scContainer;
            } catch (err) {
                console.error('[SOUNDCLOUD] Failed to prepend to contentDiv:', err);
            }
        }

        // Final fallback to SearchPage_root (before contentDiv)
        if (contentDiv && contentDiv.parentNode) {
            const scContainer = document.createElement('div');
            scContainer.id = 'ym-sync-soundcloud-results';
            scContainer.style.cssText = `
                padding: 16px 24px;
                box-sizing: border-box;
                border-bottom: 1px solid rgba(255,255,255,0.07);
                margin-bottom: 16px;
            `;
            try {
                contentDiv.parentNode.insertBefore(scContainer, contentDiv);
                return scContainer;
            } catch (err) {
                console.error('[SOUNDCLOUD] Failed to insertBefore contentDiv:', err);
            }
        }

        return null;
    },

    injectLoadingState() {
        const container = this.getContainer();
        if (!container) return;
        container.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="font-size:17px;font-weight:600;opacity:0.9;">SoundCloud</span>
                <span style="font-size:13px;opacity:0.5;">загрузка...</span>
            </div>
        `;
    },

    renderError() {
        const container = this.getContainer();
        if (!container) return;
        container.innerHTML = `
            <div style="font-size:15px;opacity:0.7;">SoundCloud — <span style="color:#ff5e5e;">ошибка загрузки</span></div>
        `;
    },

    renderResults(tracks) {
        const container = this.getContainer();
        if (!container) return;

        if (!tracks || tracks.length === 0) {
            container.innerHTML = `
                <div style="font-size:15px;opacity:0.7;">SoundCloud — ничего не найдено</div>
            `;
            return;
        }

        // Build HTML without ANY inline event handlers (CSP blocks them)
        const tracksHtml = tracks.map((track, index) => {
            const duration = track.duration
                ? Math.floor(track.duration / 60000) + ':' + String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')
                : '';
            const plays = track.playback_count
                ? (track.playback_count > 1000000
                    ? (track.playback_count / 1000000).toFixed(1) + 'M'
                    : track.playback_count > 1000
                        ? Math.floor(track.playback_count / 1000) + 'K'
                        : String(track.playback_count))
                : '';

            return `
                <div class="ym-sync-sc-track" data-index="${index}" style="
                    display:flex; align-items:center; padding:6px 8px;
                    border-radius:8px; cursor:pointer; gap:12px;
                    transition:background 0.15s;
                ">
                    <div class="ym-sync-sc-art" data-art-index="${index}" style="
                        width:40px; height:40px; border-radius:4px; overflow:hidden;
                        flex-shrink:0; background:rgba(255,255,255,0.1);
                        display:flex; align-items:center; justify-content:center;
                        position:relative;
                    ">
                        <svg class="ym-sync-sc-placeholder-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.3">
                            <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/>
                        </svg>
                        <div class="ym-sync-sc-play-overlay" style="
                            position:absolute; top:0; left:0; width:100%; height:100%;
                            background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;
                            opacity:0; transition:opacity 0.15s; pointer-events:none;
                        ">
                            <svg width="12" height="14" viewBox="0 0 10 12" fill="white"><path d="M0 0l10 6-10 6V0z"/></svg>
                        </div>
                    </div>
                    <div style="flex:1; overflow:hidden; min-width:0;">
                        <div style="font-size:14px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.4;">${track.title}</div>
                        <div style="font-size:12px; opacity:0.55; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${track.user?.username || ''}${plays ? ' &middot; ' + plays : ''}
                        </div>
                    </div>
                    <div style="font-size:12px; opacity:0.45; flex-shrink:0;">${duration}</div>
                    
                    <!-- Кнопка импорта в BetterYandexMusic -->
                    <button class="ym-sync-sc-add-btn" data-add-index="${index}" style="
                        width:32px; height:32px; border-radius:50%; background:var(--ym-sync-btn-bg, rgba(128, 128, 128, 0.15));
                        display:flex; align-items:center; justify-content:center;
                        flex-shrink:0; border:none; cursor:pointer; color:inherit;
                        transition:background 0.2s, transform 0.2s; margin-left:4px;
                        padding:0; outline:none; z-index:5;
                    }" title="Добавить в плейлист BetterYandexMusic">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <span style="font-size:17px; font-weight:600; opacity:0.9;">Результаты из SoundCloud</span>
                <svg width="26" height="13" viewBox="0 0 26 13" fill="none">
                    <rect width="26" height="13" rx="3" fill="#ff5500"/>
                    <text x="13" y="9.5" text-anchor="middle" fill="white" font-size="7.5" font-weight="bold" font-family="Arial,sans-serif">SC</text>
                </svg>
            </div>
            <div id="ym-sync-sc-tracks" style="display:flex; flex-direction:column; gap:2px;">
                ${tracksHtml}
            </div>
        `;

        // === Hover effects (NO inline handlers) ===
        const trackEls = container.querySelectorAll('.ym-sync-sc-track');
        trackEls.forEach((el) => {
            el.addEventListener('mouseenter', () => {
                el.style.background = 'rgba(255,255,255,0.07)';
                const overlay = el.querySelector('.ym-sync-sc-play-overlay');
                if (overlay) overlay.style.opacity = '1';
            });
            el.addEventListener('mouseleave', () => {
                el.style.background = 'transparent';
                const overlay = el.querySelector('.ym-sync-sc-play-overlay');
                if (overlay) overlay.style.opacity = '0';
            });
        });

        // === Load artwork via bridge (bypasses img-src CSP) ===
        tracks.forEach((track, index) => {
            const rawUrl = track.artwork_url || track.user?.avatar_url || '';
            if (!rawUrl) return;
            const artUrl = rawUrl.replace('-large', '-t200x200');
            const artEl = container.querySelector(`.ym-sync-sc-art[data-art-index="${index}"]`);
            if (!artEl) return;

            window.SoundCloudAPI._sendToBridge('SC_FETCH_AUDIO', { url: artUrl })
                .then(result => {
                    if (!result || !result.url || !artEl.isConnected) return;
                    const img = document.createElement('img');
                    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
                    img.src = result.url;
                    artEl.innerHTML = '';
                    artEl.appendChild(img);

                    // Re-append play overlay since we cleared innerHTML
                    const overlay = document.createElement('div');
                    overlay.className = 'ym-sync-sc-play-overlay';
                    overlay.style.cssText = `
                        position:absolute; top:0; left:0; width:100%; height:100%;
                        background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;
                        opacity:0; transition:opacity 0.15s; pointer-events:none;
                    `;
                    overlay.innerHTML = `<svg width="12" height="14" viewBox="0 0 10 12" fill="white"><path d="M0 0l10 6-10 6V0z"/></svg>`;
                    artEl.appendChild(overlay);
                })
                .catch(() => { /* placeholder stays */ });
        });

        // === Click to play ===
        trackEls.forEach((el) => {
            el.addEventListener('click', async () => {
                const index = parseInt(el.dataset.index, 10);
                const track = tracks[index];
                if (!track) return;

                console.log('[SOUNDCLOUD] Playing track:', track.title);

                const overlay = el.querySelector('.ym-sync-sc-play-overlay');
                if (overlay) {
                    overlay.style.opacity = '1';
                    overlay.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" style="animation: ym-sync-spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="3" stroke-dasharray="32 10" fill="none" stroke-linecap="round"></circle></svg>`;
                }

                const streamUrl = await window.SoundCloudAPI.getStreamUrl(track);
                if (streamUrl) {
                    await window.CustomAudioController.playTrack(track, streamUrl);
                } else {
                    console.error('[SOUNDCLOUD] Could not get stream URL for track');
                    const currentOverlay = el.querySelector('.ym-sync-sc-play-overlay');
                    if (currentOverlay) {
                        currentOverlay.innerHTML = `<svg width="12" height="14" viewBox="0 0 10 12" fill="white"><path d="M0 0l10 6-10 6V0z"/></svg>`;
                    }
                }
            });
        });

        // === Click to import ===
        const addBtns = container.querySelectorAll('.ym-sync-sc-add-btn');
        addBtns.forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Не запускать проигрывание
                const index = parseInt(btn.dataset.addIndex, 10);
                const track = tracks[index];
                if (!track) return;

                await this.importTrack(track, btn);
            });

            btn.addEventListener('mouseenter', (e) => {
                e.stopPropagation();
                btn.style.background = 'var(--ym-sync-btn-bg-hover, rgba(128, 128, 128, 0.25))';
                btn.style.transform = 'scale(1.1)';
            });

            btn.addEventListener('mouseleave', (e) => {
                e.stopPropagation();
                btn.style.background = 'var(--ym-sync-btn-bg, rgba(128, 128, 128, 0.15))';
                btn.style.transform = 'scale(1)';
            });
        });
    },

    targetPlaylistId: null,

    async getOrCreatePlaylist(uid) {
        if (this.targetPlaylistId) return this.targetPlaylistId;

        const headers = {
            'x-yandex-music-client': 'YandexMusicWebNext/1.0.0',
            'x-yandex-music-multi-auth-user-id': uid,
            'x-yandex-music-without-invocation-info': '1',
            'x-requested-with': 'XMLHttpRequest'
        };

        try {
            console.log('[SOUNDCLOUD IMPORT] Fetching user playlists...');
            const res = await fetch('https://api.music.yandex.ru/landing-blocks/collection/playlists-liked-and-playlists-created?count=100', { 
                headers,
                credentials: 'include'
            });
            if (!res.ok) throw new Error(`Failed to fetch playlists: ${res.status}`);
            const data = await res.json();
            
            const tabs = data.tabs || [];
            const createdTab = tabs.find(t => t.type === 'created_playlist_tab');
            if (createdTab && createdTab.items) {
                const item = createdTab.items.find(i => i.data?.playlist?.title === 'BetterYandexMusic');
                if (item && item.data.playlist) {
                    const playlist = item.data.playlist;
                    this.targetPlaylistId = `${playlist.uid}:${playlist.kind}`;
                    console.log('[SOUNDCLOUD IMPORT] Found existing playlist:', this.targetPlaylistId);
                    return this.targetPlaylistId;
                }
            }

            console.log('[SOUNDCLOUD IMPORT] Playlist "BetterYandexMusic" not found. Creating one...');
            const createRes = await fetch(`https://api.music.yandex.ru/users/${uid}/playlists/create?visibility=public&title=BetterYandexMusic`, {
                method: 'POST',
                headers,
                credentials: 'include'
            });
            if (!createRes.ok) throw new Error(`Failed to create playlist: ${createRes.status}`);
            const createData = await createRes.json();
            if (createData && createData.kind) {
                this.targetPlaylistId = `${uid}:${createData.kind}`;
                console.log('[SOUNDCLOUD IMPORT] Created new playlist:', this.targetPlaylistId);
                return this.targetPlaylistId;
            } else {
                throw new Error('Invalid playlist create response');
            }
        } catch (err) {
            console.error('[SOUNDCLOUD IMPORT] Error in getOrCreatePlaylist:', err);
            throw err;
        }
    },

    async importTrack(track, btn) {
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.style.background = 'rgba(255,255,255,0.1)';
        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" style="animation: ym-sync-spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32 10" fill="none" stroke-linecap="round"></circle>
                <style>
                    @keyframes ym-sync-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </svg>
        `;

        try {
            // Get UID from Yandex Music page
            let uid = null;
            if (window.Mu && window.Mu.adapter && window.Mu.adapter.uid) {
                uid = window.Mu.adapter.uid;
            } else {
                const match = document.cookie.match(/Session_id=[\w\.\:\-\|]+?(\d+)\./) || document.cookie.match(/L=[\w\.\:\-\|]+?\.(\d+)\./);
                if (match) {
                    uid = match[1];
                }
            }

            if (!uid) {
                const activePlayer = window.getActivePlayer && window.getActivePlayer();
                uid = activePlayer?.uid || activePlayer?.user?.uid;
            }

            // Fallback: fetch directly from Yandex Music account status API
            if (!uid) {
                try {
                    console.log('[SOUNDCLOUD IMPORT] Attempting to fetch UID from account/status...');
                    const statusRes = await fetch('https://api.music.yandex.ru/account/status', {
                        credentials: 'include'
                    });
                    if (statusRes.ok) {
                        const statusData = await statusRes.json();
                        uid = statusData.result?.account?.uid || statusData.result?.uid;
                        console.log('[SOUNDCLOUD IMPORT] Fetched UID from account/status:', uid);
                    }
                } catch (e) {
                    console.error('[SOUNDCLOUD IMPORT] Failed to fetch UID from account/status:', e);
                }
            }

            if (!uid) {
                throw new Error('Не удалось получить UID пользователя');
            }

            const playlistId = await this.getOrCreatePlaylist(uid);

            const streamUrl = await window.SoundCloudAPI.getStreamUrl(track);
            if (!streamUrl) throw new Error('Не удалось получить поток трека');

            const filename = `soundcloud_${track.id}.mp3`;
            
            const headers = {
                'x-yandex-music-client': 'YandexMusicWebNext/1.0.0',
                'x-yandex-music-multi-auth-user-id': uid,
                'x-yandex-music-without-invocation-info': '1',
                'x-requested-with': 'XMLHttpRequest'
            };

            const uploadUrlRes = await fetch(`https://api.music.yandex.ru/loader/upload-url?uid=${uid}&playlist-id=${encodeURIComponent(playlistId)}&path=${encodeURIComponent(filename)}`, {
                method: 'POST',
                headers,
                credentials: 'include'
            });
            if (!uploadUrlRes.ok) throw new Error(`Не удалось получить URL загрузки: ${uploadUrlRes.status}`);
            
            const uploadUrlData = await uploadUrlRes.json();
            const postTarget = uploadUrlData['post-target'];
            const ugcTrackId = uploadUrlData['ugc-track-id'];
            if (!postTarget || !ugcTrackId) {
                throw new Error('Неверный ответ от загрузчика Яндекса');
            }
            console.log('[SOUNDCLOUD IMPORT] Delegating download and upload to background script...');
            const bgResponse = await window.SoundCloudAPI._sendToBridge('YM_UPLOAD_TRACK', {
                postTarget,
                streamUrl,
                filename,
                title: track.title,
                artist: track.user?.username || '',
                artworkUrl: track.artwork_url || track.user?.avatar_url || ''
            });

            if (!bgResponse || !bgResponse.ok) {
                throw new Error(bgResponse?.error || 'Ошибка загрузки в фоновом скрипте');
            }

            const uploadResult = bgResponse.result;
            if (uploadResult.result !== 'CREATED') {
                throw new Error(`Неверный статус завершения загрузки: ${uploadResult.result}`);
            }

            const linkFormData = new FormData();
            linkFormData.append('trackIds', ugcTrackId);
            linkFormData.append('removeDuplicates', 'false');
            linkFormData.append('withProgress', 'true');

            const linkRes = await fetch('https://api.music.yandex.ru/tracks', {
                method: 'POST',
                body: linkFormData,
                headers,
                credentials: 'include'
            });

            if (!linkRes.ok) {
                throw new Error(`Не удалось привязать трек к коллекции: ${linkRes.status}`);
            }

            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
            btn.title = 'Добавлено в плейлист BetterYandexMusic!';
            btn.style.background = 'rgba(34,197,94,0.15)';
            
            console.log(`[SOUNDCLOUD IMPORT] Successfully imported track ${track.title} (ID: ${ugcTrackId})`);
        } catch (err) {
            console.error('[SOUNDCLOUD IMPORT] Import failed:', err);
            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            `;
            btn.title = `Ошибка: ${err.message}`;
            btn.style.background = 'rgba(239,68,68,0.15)';
            btn.disabled = false;
            
            setTimeout(() => {
                if (btn && btn.disabled === false) {
                    btn.innerHTML = originalHtml;
                    btn.title = 'Добавить в плейлист BetterYandexMusic';
                    btn.style.background = 'var(--ym-sync-btn-bg, rgba(128, 128, 128, 0.15))';
                }
            }, 5000);
        }
    }
};

window.SoundCloudSearchInjector = SoundCloudSearchInjector;

// Initialize when loaded
setTimeout(() => {
    if (window.SoundCloudSearchInjector && window.SoundCloudAPI) {
        window.SoundCloudSearchInjector.init();
    }
}, 1000);


// --- Component: page/index.js ---
function handleInitialConnection() {
  const url = new URL(window.location.href);
  const syncCode = url.searchParams.get('sync_code');
  const storedRoomId = localStorage.getItem('currentRoomId');
  const storedServerUrl = localStorage.getItem('serverUrl') || 'http://localhost:3000';

  // Применяем сохраненную тему оформления
  const activeTheme = localStorage.getItem('ymActiveTheme') || 'default';
  let customColors = null;
  try {
    const storedColors = localStorage.getItem('ymCustomThemeColors');
    if (storedColors) customColors = JSON.parse(storedColors);
  } catch (e) {
    console.error("[SYNC] Ошибка чтения кастомной темы:", e);
  }
  applyThemeCSS(activeTheme, customColors);

  // Слушаем команды на подключение от локального HTTP сервера (Preload контекст)
  const onJoinHandler = (data) => {
    const { room, server } = data;
    console.log(`[SYNC] Получена внешняя команда на вход в комнату: комната=${room}, сервер=${server}`);
    localStorage.setItem('currentRoomId', room);
    localStorage.setItem('serverUrl', server);
    currentRoom = room;
    connectToServer(server);
    updatePopoverUI(room, currentStatus);
    sendStateToPreload();
  };

  if (window.__ymSyncBridge && typeof window.__ymSyncBridge.onJoinRoom === 'function') {
    window.__ymSyncBridge.onJoinRoom(onJoinHandler);
  } else {
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'YM_SYNC_JOIN_ROOM') {
        onJoinHandler({ room: event.data.room, server: event.data.server });
      }
    });
  }

  if (syncCode) {
    console.log(`[SYNC] Обнаружен код синхронизации в URL: ${syncCode}`);
    currentRoom = syncCode;

    // Сохраняем в localStorage и подключаемся
    localStorage.setItem('currentRoomId', syncCode);
    connectToServer(storedServerUrl);

    // Очищаем URL от параметра sync_code
    url.searchParams.delete('sync_code');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    sendStateToPreload();
  } else if (storedRoomId) {
    currentRoom = storedRoomId;
    connectToServer(storedServerUrl);
    sendStateToPreload();
  }
}

// Запуск инициализации автоподключения
setTimeout(handleInitialConnection, 1000); // Даем странице немного времени загрузиться

// Запускаем опрос для поиска навигационного меню и добавления кнопок
setInterval(() => {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (container) {
    if (typeof injectSyncButton === 'function') injectSyncButton();
    if (typeof injectThemeButton === 'function') injectThemeButton();
    if (typeof injectSleepTimerButton === 'function') injectSleepTimerButton();
    if (typeof syncButtonCollapsedState === 'function') {
      syncButtonCollapsedState('ym-sync-button');
      syncButtonCollapsedState('ym-theme-button');
      syncButtonCollapsedState('ym-sleep-timer-button');
      syncButtonCollapsedState('ym-wrapped-btn');
    }
  }

  if (typeof injectPlayerQualityIndicator === 'function') injectPlayerQualityIndicator();
  if (typeof patchNativeLyricsButton === 'function') patchNativeLyricsButton();
  if (typeof handleFullscreenPlayer === 'function') handleFullscreenPlayer();
  if (typeof checkContextMenuAndAddFullscreenOption === 'function') checkContextMenuAndAddFullscreenOption();
}, 500);



})();
