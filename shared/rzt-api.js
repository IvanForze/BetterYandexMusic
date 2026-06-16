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
