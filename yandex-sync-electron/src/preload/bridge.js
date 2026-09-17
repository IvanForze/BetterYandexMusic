// ==========================================
// SOUNDCLOUD PROXY BRIDGE (Node Preload Context)
// ==========================================

function nodeHttpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const https = require('https');
    const { URL } = require('url');
    
    function makeRequest(targetUrl) {
      try {
        const parsedUrl = new URL(targetUrl);
        const client = parsedUrl.protocol === 'http:' ? http : https;
        const reqOptions = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'http:' ? 80 : 443),
          path: parsedUrl.pathname + parsedUrl.search,
          method: options.method || 'GET',
          headers: options.headers || {},
          timeout: options.timeout || 60000
        };
        
        const req = client.get(reqOptions, (res) => {
          // Follow redirects (needed for stream URLs)
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
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Превышено время ожидания загрузки (${targetUrl})`));
        });

        req.on('error', (err) => {
          reject(err);
        });
      } catch(e) {
        reject(e);
      }
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
  window.addEventListener('message', async (event) => {
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

    if (event.data && (event.data.__ym_sc_bridge === true || event.data.type === 'YM_DOWNLOAD_TRACK')) {
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
      } else if (type === 'BYM_CHECK_UPDATE') {
        nodeHttpsRequest('https://api.github.com/repos/IvanForze/BetterYandexMusic/releases/latest', {
          headers: { 'User-Agent': 'BetterYandexMusic-App', 'Accept': 'application/vnd.github.v3+json' }
        })
          .then(jsonStr => {
            const data = JSON.parse(jsonStr);
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
        const rawTitle = payload.title || '';
        const cleanTitle = rawTitle.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
        const query = cleanTitle || rawTitle;
        const url = `https://risazatvorchestvo.com/search?query=${encodeURIComponent(query)}&type=releases`;
        
        const fetchHeaders = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
        };

        const executeFetch = async () => {
          // 1. Try native net.fetch via IPC from main process (No CORS, passes SmartCaptcha)
          try {
            const electron = require('electron');
            if (electron && electron.ipcRenderer) {
              const res = await electron.ipcRenderer.invoke('ym-sync-net-fetch', {
                url,
                options: { headers: fetchHeaders }
              });
              if (res && res.ok && res.text) {
                return res.text;
              }
            }
          } catch (ipcErr) {
            console.warn('[RZT] IPC net-fetch failed, falling back:', ipcErr.message);
          }

          // 2. Fallback to nodeHttpsRequest
          return await nodeHttpsRequest(url, { headers: fetchHeaders });
        };

        executeFetch()
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
      } else if (type === 'WRITE_FILE') {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const electron = require('electron');
        
        const defaultPath = path.join(os.homedir(), 'Desktop', payload.filename);
        let filePath = null;
        
        try {
          // Вызываем наш IPC-обработчик в главном процессе (внедрен через patch.js)
          const result = await electron.ipcRenderer.invoke('ym-sync-show-save-dialog', {
            defaultPath,
            title: 'Сохранить статистику Wrapped',
            filters: [{ name: 'JSON/JSON5 Files', extensions: ['json'] }]
          });
          
          if (result) {
            if (result.canceled) {
              window.postMessage({
                __ym_sc_bridge_response: true,
                requestId,
                response: { ok: false, error: 'Cancelled' }
              }, '*');
              return;
            }
            filePath = result.filePath;
          }
        } catch (err) {
          console.warn('[SYNC] Native save dialog IPC failed, falling back to direct Desktop write:', err.message);
        }

        // Если диалог отвалился или не поддерживается, пишем напрямую на рабочий стол
        if (!filePath) {
          filePath = defaultPath;
        }
        
        try {
          fs.writeFileSync(filePath, payload.content, 'utf8');
          
          try {
            electron.shell.showItemInFolder(filePath);
          } catch(e) {}
          
          window.postMessage({
            __ym_sc_bridge_response: true,
            requestId,
            response: { ok: true, filePath }
          }, '*');
        } catch(err) {
          window.postMessage({
            __ym_sc_bridge_response: true,
            requestId,
            response: { ok: false, error: err.message }
          }, '*');
        }
      } else if (type === 'SELECT_DOWNLOAD_DIR') {
        const electron = require('electron');
        try {
          const result = await electron.ipcRenderer.invoke('ym-sync-select-folder', payload || {});
          window.postMessage({
            __ym_sc_bridge_response: true,
            requestId,
            response: { ok: true, canceled: result?.canceled, folderPath: result?.filePaths?.[0] || null }
          }, '*');
        } catch(err) {
          window.postMessage({
            __ym_sc_bridge_response: true,
            requestId,
            response: { ok: false, error: err.message }
          }, '*');
        }
      } else if (type === 'OPEN_DOWNLOAD_DIR') {
        const electron = require('electron');
        const path = require('path');
        const os = require('os');
        const folder = (payload && payload.folderPath) || path.join(os.homedir(), 'Downloads', 'BetterYandexMusic');
        try {
          electron.shell.openPath(folder);
          window.postMessage({
            __ym_sc_bridge_response: true,
            requestId,
            response: { ok: true }
          }, '*');
        } catch(err) {
          window.postMessage({
            __ym_sc_bridge_response: true,
            requestId,
            response: { ok: false, error: err.message }
          }, '*');
        }
      } else if (type === 'GET_DEFAULT_DOWNLOAD_DIR') {
        const path = require('path');
        const os = require('os');
        const defaultDir = path.join(os.homedir(), 'Downloads', 'BetterYandexMusic');
        window.postMessage({
          __ym_sc_bridge_response: true,
          requestId,
          response: { ok: true, defaultDir }
        }, '*');
      } else if (type === 'YM_DOWNLOAD_TRACK') {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const crypto = require('crypto');
        const electron = require('electron');

        (async () => {
          try {
            const { downloadInfo, metadata } = payload;
            if (!downloadInfo || !downloadInfo.url || !downloadInfo.key) {
              throw new Error('Отсутствуют данные потока (url или key)');
            }

            console.log('[PRELOAD-DOWNLOAD] Начинаем загрузку трека:', metadata?.title, downloadInfo.codec);
            
            // 1. Скачиваем зашифрованный поток из хранилища
            const encryptedBuffer = await nodeHttpsRequest(downloadInfo.url, { binary: true });
            if (!encryptedBuffer || encryptedBuffer.length === 0) {
              throw new Error('Пустой ответ при загрузке аудиопотока');
            }

            // 2. Расшифровываем AES-128-CTR (с нулевым IV)
            const keyBuffer = Buffer.from(downloadInfo.key, 'hex');
            const iv = Buffer.alloc(16, 0);
            const decipher = crypto.createDecipheriv('aes-128-ctr', keyBuffer, iv);
            const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);

            // 3. Определяем формат
            const codecLower = (downloadInfo.codec || '').toLowerCase();
            const isFlac = codecLower.includes('flac');
            const isAac = codecLower.includes('aac');
            const ext = isFlac ? 'flac' : (isAac ? 'm4a' : 'mp3');

            // 4. Скачиваем обложку (если есть)
            let coverBuffer = null;
            if (metadata && metadata.coverUri) {
              try {
                let coverUrl = metadata.coverUri;
                if (coverUrl.includes('%%')) {
                  coverUrl = 'https://' + coverUrl.replace('%%', 'orig');
                } else if (!coverUrl.startsWith('http')) {
                  coverUrl = 'https://' + coverUrl;
                }
                coverBuffer = await nodeHttpsRequest(coverUrl, { binary: true });
              } catch(coverErr) {
                console.warn('[PRELOAD-DOWNLOAD] Не удалось загрузить обложку:', coverErr.message);
              }
            }

            // 5. Вшивание тегов
            let finalBuffer = decryptedBuffer;
            if (ext === 'mp3') {
              try {
                const id3Tag = buildId3v2Tag({
                  title: metadata?.title || '',
                  artist: metadata?.artist || '',
                  album: metadata?.album || '',
                  year: metadata?.year || ''
                }, coverBuffer);
                if (id3Tag && id3Tag.length > 0) {
                  finalBuffer = Buffer.concat([id3Tag, decryptedBuffer]);
                }
              } catch(tagErr) {
                console.warn('[PRELOAD-DOWNLOAD] Ошибка вшивания ID3:', tagErr.message);
              }
            }

            // 6. Формируем имя файла и целевую папку
            const safeArtist = (metadata?.artist || 'Неизвестный исполнитель').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
            const safeTitle = (metadata?.title || 'Трек').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
            
            // Если передан порядковый номер трека в альбоме
            let fileName;
            if (metadata?.isBatch && typeof metadata?.trackIndex === 'number') {
              const num = String(metadata.trackIndex).padStart(2, '0');
              fileName = `${num}. ${safeArtist} - ${safeTitle}.${ext}`.substring(0, 180);
            } else {
              fileName = `${safeArtist} - ${safeTitle}.${ext}`.substring(0, 180);
            }

            // Базовая папка загрузок: из настроек пользователя или дефолтная
            const customDir = metadata?.customDownloadDir;
            let baseDownloadsDir = (customDir && typeof customDir === 'string' && customDir.trim().length > 0)
              ? customDir.trim()
              : path.join(os.homedir(), 'Downloads', 'BetterYandexMusic');

            // Если для скачивания указана отдельная папка (для альбома или плейлиста)
            let targetDir = baseDownloadsDir;
            if (metadata?.subFolder) {
              const safeSubFolder = String(metadata.subFolder).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
              if (safeSubFolder) {
                targetDir = path.join(baseDownloadsDir, safeSubFolder);
              }
            }

            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }

            const targetFilePath = path.join(targetDir, fileName);
            fs.writeFileSync(targetFilePath, finalBuffer);
            console.log('[PRELOAD-DOWNLOAD] Файл успешно сохранен на диск:', targetFilePath);

            // Открываем папку ТОЛЬКО если пользователь прямо включил эту настройку
            if (metadata?.autoOpenFolder === true) {
              try {
                electron.shell.showItemInFolder(targetFilePath);
              } catch(e) {}
            }

            window.postMessage({
              __ym_sc_bridge_response: true,
              requestId,
              response: { ok: true, filePath: targetFilePath, fileName }
            }, '*');
          } catch(err) {
            console.error('[PRELOAD-DOWNLOAD] Ошибка обработки трека:', err);
            window.postMessage({
              __ym_sc_bridge_response: true,
              requestId,
              response: { ok: false, error: err.message }
            }, '*');
          }
        })();
      }
    }
  });
}

function buildId3v2Tag(metadata, coverBuffer) {
  try {
    const frames = [];

    function makeTextFrame(id, text) {
      if (!text) return null;
      const str = String(text);
      const bom = Buffer.from([0xFF, 0xFE]);
      const textBuf = Buffer.from(str, 'utf16le');
      const content = Buffer.concat([Buffer.from([0x01]), bom, textBuf]);
      const header = Buffer.alloc(10);
      header.write(id, 0, 4, 'ascii');
      header.writeUInt32BE(content.length, 4);
      return Buffer.concat([header, content]);
    }

    if (metadata.title) frames.push(makeTextFrame('TIT2', metadata.title));
    if (metadata.artist) frames.push(makeTextFrame('TPE1', metadata.artist));
    if (metadata.album) frames.push(makeTextFrame('TALB', metadata.album));
    if (metadata.year) frames.push(makeTextFrame('TYER', metadata.year));

    if (coverBuffer && Buffer.isBuffer(coverBuffer) && coverBuffer.length > 0) {
      const mime = Buffer.from('image/jpeg\0', 'ascii');
      const headerPart = Buffer.concat([Buffer.from([0x00]), mime, Buffer.from([0x03, 0x00])]);
      const apicContent = Buffer.concat([headerPart, coverBuffer]);
      const apicHeader = Buffer.alloc(10);
      apicHeader.write('APIC', 0, 4, 'ascii');
      apicHeader.writeUInt32BE(apicContent.length, 4);
      frames.push(Buffer.concat([apicHeader, apicContent]));
    }

    const validFrames = frames.filter(Boolean);
    if (validFrames.length === 0) return Buffer.alloc(0);

    const framesBuffer = Buffer.concat(validFrames);
    const tagSize = framesBuffer.length;

    const synchsafe = Buffer.alloc(4);
    synchsafe[0] = (tagSize >> 21) & 0x7F;
    synchsafe[1] = (tagSize >> 14) & 0x7F;
    synchsafe[2] = (tagSize >> 7) & 0x7F;
    synchsafe[3] = tagSize & 0x7F;

    const id3Header = Buffer.concat([
      Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00]),
      synchsafe
    ]);

    return Buffer.concat([id3Header, framesBuffer]);
  } catch(e) {
    console.warn('[PRELOAD] Ошибка построения ID3 тегов:', e.message);
    return Buffer.alloc(0);
  }
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
