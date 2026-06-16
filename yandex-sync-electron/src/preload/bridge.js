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
