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

  if (request.type === 'BYM_CHECK_UPDATE') {
    fetch('https://api.github.com/repos/IvanForze/BetterYandexMusic/releases/latest', {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }

  if (request.type === 'RZT_GET_RATINGS') {
    const rawTitle = request.title || '';
    const cleanTitle = rawTitle.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
    const query = cleanTitle || rawTitle;
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

  if (request.type === 'GENIUS_SEARCH') {
    const query = `${request.artist} - ${request.title}`;
    const url = `https://genius.com/api/search/multi?q=${encodeURIComponent(query)}`;
    fetch(url, { credentials: 'omit' })
      .then(res => res.json())
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }

  if (request.type === 'GENIUS_REFERENTS') {
    (async () => {
      try {
        let page = 1;
        let referents = [];
        while (true) {
          const url = `https://genius.com/api/referents?song_id=${request.songId}&text_format=html&per_page=50&page=${page}`;
          const res = await fetch(url, { credentials: 'omit' });
          const data = await res.json();
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
        sendResponse({ ok: true, data: { response: { referents } } });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true; // async response
  }

  if (request.type === 'GENIUS_HTML') {
    fetch(request.url, { credentials: 'omit' })
      .then(res => res.text())
      .then(html => sendResponse({ ok: true, data: html }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }

  if (request.type === 'YM_GET_OAUTH_TOKEN') {
    (async () => {
      try {
        const authUrl = 'https://oauth.yandex.ru/authorize?response_type=token&client_id=23cabbbdc6cd418abb4b39c32c41195d';
        const res = await fetch(authUrl, {
          credentials: 'include',
          redirect: 'follow'
        });
        const finalUrl = res.url || '';
        console.log('[BG] OAuth authorize response URL:', finalUrl);
        const match = finalUrl.match(/access_token=([^&]+)/);
        if (match && match[1]) {
          sendResponse({ ok: true, token: match[1] });
          return;
        }
        sendResponse({ ok: false, error: 'Token not found in redirect URL' });
      } catch(err) {
        console.warn('[BG] Failed to get OAuth token:', err);
        sendResponse({ ok: false, error: err.message });
      }
    })();
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

function rztHasArtistMatch(artistListOrString, targetArtist) {
  if (!targetArtist) return true;
  const cleanTarget = rztNormalizeText(targetArtist);
  
  let artistNames = [];
  if (Array.isArray(artistListOrString)) {
    artistNames = artistListOrString.map(a => typeof a === 'string' ? a : (a.title || a.name || ''));
  } else if (typeof artistListOrString === 'string') {
    artistNames = [artistListOrString];
  }
  
  const combined = artistNames.map(a => rztNormalizeText(a)).join(' ');
  if (combined.includes(cleanTarget) || cleanTarget.includes(combined)) return true;

  const targetTokens = targetArtist.split(/(?:feat\.?|feat|&|,|\bи\b|\/|\+)/i).map(a => rztNormalizeText(a)).filter(Boolean);
  for (const t of targetTokens) {
    if (combined.includes(t)) return true;
    for (const a of artistNames) {
      const cleanA = rztNormalizeText(a);
      if (cleanA.includes(t) || t.includes(cleanA)) return true;
    }
  }
  return false;
}

function rztParseRscReleases(html) {
  const releases = [];
  const unescaped = html.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  
  const regex = /"data"\s*:\s*(\{\s*"kind"\s*:\s*"release"[\s\S]*?"nestEnabled"\s*:\s*true\s*\})/g;
  let match;
  while ((match = regex.exec(unescaped)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && parsed.title) {
        releases.push(parsed);
      }
    } catch (e) {}
  }
  
  if (releases.length === 0) {
    const blockRegex = /"kind"\s*:\s*"release"[\s\S]*?"title"\s*:\s*"([^"]+)"[\s\S]*?"artists"\s*:\s*(\[[^\]]*\])[\s\S]*?"meta"\s*:\s*\{([^}]+)\}/g;
    let bMatch;
    while ((bMatch = blockRegex.exec(unescaped)) !== null) {
      try {
        const title = bMatch[1];
        let artists = [];
        try { artists = JSON.parse(bMatch[2]); } catch (err) {}
        const metaStr = '{' + bMatch[3] + '}';
        let meta = {};
        try { meta = JSON.parse(metaStr); } catch (err) {}
        releases.push({ title, artists, meta });
      } catch (e) {}
    }
  }

  return releases;
}

function rztParseScoresFromHtml(html, trackTitle, artistName) {
  if (!html) return null;
  const titleClean = rztNormalizeText(trackTitle);
  const simpleTitle = rztNormalizeText(trackTitle.split(/[(\[]/)[0]);

  const releases = rztParseRscReleases(html);
  if (releases.length > 0) {
    for (const rel of releases) {
      const relTitle = rztNormalizeText(rel.title);
      if (relTitle === titleClean || relTitle === simpleTitle || titleClean.includes(relTitle) || relTitle.includes(cleanTitle)) {
        if (rztHasArtistMatch(rel.artists, artistName)) {
          const meta = rel.meta || {};
          return {
            flomaster: meta.total_rating != null && meta.total_rating > 0 ? meta.total_rating : (meta.total_rating === 0 ? 0 : null),
            withReviews: meta.score_reviews_avg != null && meta.score_reviews_avg > 0 ? meta.score_reviews_avg : null,
            withoutReviews: meta.users_avg_total != null && meta.users_avg_total > 0 ? meta.users_avg_total : null
          };
        }
      }
    }

    for (const rel of releases) {
      const relTitle = rztNormalizeText(rel.title);
      if (relTitle === titleClean || relTitle === simpleTitle) {
        const meta = rel.meta || {};
        return {
          flomaster: meta.total_rating != null && meta.total_rating > 0 ? meta.total_rating : null,
          withReviews: meta.score_reviews_avg != null && meta.score_reviews_avg > 0 ? meta.score_reviews_avg : null,
          withoutReviews: meta.users_avg_total != null && meta.users_avg_total > 0 ? meta.users_avg_total : null
        };
      }
    }
  }

  const unescaped = html.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  const indices = [];
  let idx = unescaped.toLowerCase().indexOf(titleClean);
  while (idx !== -1) {
    indices.push(idx);
    idx = unescaped.toLowerCase().indexOf(titleClean, idx + 1);
  }
  if (indices.length === 0 && simpleTitle && simpleTitle !== titleClean) {
    let idx2 = unescaped.toLowerCase().indexOf(simpleTitle);
    while (idx2 !== -1) {
      indices.push(idx2);
      idx2 = unescaped.toLowerCase().indexOf(simpleTitle, idx2 + 1);
    }
  }

  const extractCircles = (chunk) => {
    const circleRegex = /(?:rounded-full|size-8|size-7|size-12)[^>]*>\s*(?:<span[^>]*>)?\s*([0-9]{1,3})\s*(?:<\/span>)?\s*<\/div>/g;
    const matches = [...chunk.matchAll(circleRegex)].map(m => parseInt(m[1], 10)).filter(n => n >= 0 && n <= 100);
    if (matches.length >= 2) {
      return {
        withReviews: matches[0] != null ? matches[0] : null,
        withoutReviews: matches[1] != null ? matches[1] : null,
        flomaster: matches[2] != null ? matches[2] : null
      };
    }
    return null;
  };

  for (const pos of indices) {
    const chunk = unescaped.slice(pos, pos + 4000);
    if (rztHasArtistMatch(chunk, artistName)) {
      const scores = extractCircles(chunk);
      if (scores) return scores;
    }
  }

  if (indices.length > 0) {
    const chunk = unescaped.slice(indices[0], indices[0] + 4000);
    const scores = extractCircles(chunk);
    if (scores) return scores;
  }

  return null;
}
