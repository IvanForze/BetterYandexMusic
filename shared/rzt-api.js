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

  hasArtistMatch(artistListOrString, targetArtist) {
    if (!targetArtist) return true;
    const cleanTarget = this.normalizeText(targetArtist);
    
    let artistNames = [];
    if (Array.isArray(artistListOrString)) {
      artistNames = artistListOrString.map(a => typeof a === 'string' ? a : (a.title || a.name || ''));
    } else if (typeof artistListOrString === 'string') {
      artistNames = [artistListOrString];
    }
    
    const combined = artistNames.map(a => this.normalizeText(a)).join(' ');
    if (combined.includes(cleanTarget) || cleanTarget.includes(combined)) return true;

    const targetTokens = targetArtist.split(/(?:feat\.?|feat|&|,|\bи\b|\/|\+)/i).map(a => this.normalizeText(a)).filter(Boolean);
    for (const t of targetTokens) {
      if (combined.includes(t)) return true;
      for (const a of artistNames) {
        const cleanA = this.normalizeText(a);
        if (cleanA.includes(t) || t.includes(cleanA)) return true;
      }
    }
    return false;
  },

  parseRscReleases(html) {
    const releases = [];
    const unescaped = html.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    
    // 1. Try matching full JSON data object
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
    
    // 2. Fallback regex for partial RSC release slices
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
  },

  parseScoresFromHtml(html, trackTitle, artistName) {
    if (!html) return null;
    const titleClean = this.normalizeText(trackTitle);
    const simpleTitle = this.normalizeText(trackTitle.split(/[(\[]/)[0]);

    // 1. Try Next.js RSC structured releases parsing (100% precision)
    const releases = this.parseRscReleases(html);
    if (releases.length > 0) {
      // 1a. Look for matching title AND matching artist
      for (const rel of releases) {
        const relTitle = this.normalizeText(rel.title);
        if (relTitle === titleClean || relTitle === simpleTitle || titleClean.includes(relTitle) || relTitle.includes(titleClean)) {
          if (this.hasArtistMatch(rel.artists, artistName)) {
            const meta = rel.meta || {};
            return {
              flomaster: meta.total_rating != null && meta.total_rating > 0 ? meta.total_rating : (meta.total_rating === 0 ? 0 : null),
              withReviews: meta.score_reviews_avg != null && meta.score_reviews_avg > 0 ? meta.score_reviews_avg : null,
              withoutReviews: meta.users_avg_total != null && meta.users_avg_total > 0 ? meta.users_avg_total : null
            };
          }
        }
      }

      // 1b. Fallback: match by title alone
      for (const rel of releases) {
        const relTitle = this.normalizeText(rel.title);
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

    // 2. Fallback: DOM / Regex parsing for new and old site designs
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
      if (this.hasArtistMatch(chunk, artistName)) {
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
