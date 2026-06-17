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
