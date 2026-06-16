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

  if (request.type === 'RZT_GET_RATINGS') {
    const query = request.title;
    const url = `https://risazatvorchestvo.com/search?query=${encodeURIComponent(query)}&type=releases`;
    fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    })
    .then(res => res.text())
    .then(html => {
      const ratings = rztParseScoresFromHtml(html, request.title, request.artist);
      sendResponse({ ok: true, data: ratings });
    })
    .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }
});

function rztNormalizeText(text) {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/[\u200b-\u200d\uFEFF]/g, '')
    .replace(/[^a-zа-я0-9\s-_]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function rztHasArtistMatch(chunk, artistName) {
  if (!artistName) return true;
  const cleanArtist = rztNormalizeText(artistName);
  const cleanChunk = rztNormalizeText(chunk);
  
  if (cleanChunk.includes(cleanArtist)) return true;
  
  const artists = artistName.split(/(?:feat\.?|feat|&|,|\bи\b)/i).map(a => rztNormalizeText(a)).filter(Boolean);
  for (const a of artists) {
    if (cleanChunk.includes(a)) return true;
  }
  
  return false;
}

function rztParseScoresFromHtml(html, trackTitle, artistName) {
  if (!html) return null;
  const titleClean = rztNormalizeText(trackTitle);
  
  const indices = [];
  let idx = html.toLowerCase().indexOf(titleClean);
  while (idx !== -1) {
    indices.push(idx);
    idx = html.toLowerCase().indexOf(titleClean, idx + 1);
  }
  
  if (indices.length === 0) {
    const simpleTitle = rztNormalizeText(trackTitle.split(/[(\[]/)[0]);
    if (simpleTitle && simpleTitle !== titleClean) {
      let idx2 = html.toLowerCase().indexOf(simpleTitle);
      while (idx2 !== -1) {
        indices.push(idx2);
        idx2 = html.toLowerCase().indexOf(simpleTitle, idx2 + 1);
      }
    }
  }

  for (const pos of indices) {
    const chunk = html.slice(pos, pos + 3000);
    if (rztHasArtistMatch(chunk, artistName)) {
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
}
