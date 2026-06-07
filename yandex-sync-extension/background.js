// ==========================================
// BACKGROUND SERVICE WORKER
// Handles SoundCloud API requests without CSP restrictions
// ==========================================

let cachedClientId = null;

async function getSoundCloudClientId() {
  if (cachedClientId) return cachedClientId;

  try {
    const response = await fetch('https://soundcloud.com/', { credentials: 'omit' });
    const html = await response.text();

    // Find all script src urls
    const scriptMatches = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);

    for (const url of scriptMatches.reverse()) { // newer scripts first
      try {
        const scriptRes = await fetch(url, { credentials: 'omit' });
        const scriptText = await scriptRes.text();
        const match = scriptText.match(/client_id:"([a-zA-Z0-9]{32})"/);
        if (match && match[1]) {
          cachedClientId = match[1];
          console.log('[BG] SoundCloud client_id found:', cachedClientId);
          return cachedClientId;
        }
      } catch (e) {
        // skip this script
      }
    }
    throw new Error('client_id not found in any script');
  } catch (err) {
    console.error('[BG] Failed to get SoundCloud client_id:', err);
    throw err;
  }
}

async function soundCloudSearch(query, limit = 10) {
  const clientId = await getSoundCloudClientId();
  const url = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=${limit}&app_locale=ru`;
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(`SoundCloud search failed: ${res.status}`);
  const data = await res.json();
  return data.collection || [];
}

async function soundCloudGetStream(track) {
  const clientId = await getSoundCloudClientId();
  
  let transcodingUrl = null;
  if (track.media && track.media.transcodings && track.media.transcodings.length > 0) {
    // Prefer progressive (direct mp3) over HLS
    const progressive = track.media.transcodings.find(t => t.format && t.format.protocol === 'progressive');
    const hls = track.media.transcodings.find(t => t.format && t.format.protocol === 'hls');
    const chosen = progressive || hls || track.media.transcodings[0];
    transcodingUrl = chosen.url;
  }

  if (!transcodingUrl) throw new Error('No transcodings available for track');

  const streamRes = await fetch(`${transcodingUrl}?client_id=${clientId}`, { credentials: 'omit' });
  if (!streamRes.ok) throw new Error(`Stream URL fetch failed: ${streamRes.status}`);
  const streamData = await streamRes.json();
  return streamData.url;
}

async function soundCloudGetTrack(trackId) {
  const clientId = await getSoundCloudClientId();
  const url = `https://api-v2.soundcloud.com/tracks/${trackId}?client_id=${clientId}`;
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(`SoundCloud get track failed: ${res.status}`);
  return await res.json();
}

async function translateText(text, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(`Translation failed: ${res.status}`);
  const parsed = await res.json();
  let translated = '';
  if (parsed && parsed[0]) {
    translated = parsed[0].map(item => item[0]).join('');
  }
  return translated;
}

// ==========================================
// Message handler from isolated content script
// ==========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SC_SEARCH') {
    soundCloudSearch(request.query, request.limit || 10)
      .then(tracks => sendResponse({ ok: true, tracks }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }

  if (request.type === 'SC_GET_STREAM') {
    soundCloudGetStream(request.track)
      .then(url => sendResponse({ ok: true, url }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }

  if (request.type === 'SC_GET_TRACK') {
    soundCloudGetTrack(request.trackId)
      .then(track => sendResponse({ ok: true, track }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }

  if (request.type === 'SC_TRANSLATE') {
    translateText(request.text, request.targetLang)
      .then(translation => sendResponse({ ok: true, translation }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }
});
