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

        if (isGeniusMode) {
          const fsRoot = document.querySelector('[class*="FullscreenPlayerDesktop_root"]');
          const body = fsRoot ? fsRoot.querySelector('.ym-genius-panel-body') : null;
          
          if (body) {
            const allSelected = container.querySelectorAll('.ym-genius-annotation-selected');
            allSelected.forEach(el => el.classList.remove('ym-genius-annotation-selected'));

            if (geniusRef) {
              lastSelectedReferentId = geniusRef.id;
              
              const matchingLines = container.querySelectorAll(`.ym-fullscreen-lyric-line[data-referent-id="${geniusRef.id}"]`);
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

  const controlsRoot = fullscreenRoot.querySelector('[class*="FullscreenPlayerDesktopControls_root"]');

  if (controlsRoot) {
    const computedStyle = window.getComputedStyle(controlsRoot);
    if (computedStyle.position === 'static') {
      controlsRoot.style.position = 'relative';
    }
  }

  // If track has native lyrics and we are NOT forcing Genius mode, fallback to Yandex's native interface
  if ((hasNativeSyncedLyrics || hasNativeLyrics || trackHasLyrics === true) && !isGeniusMode) {
    if (!window.hadLoggedFsDecision) {
      console.log('[SYNC-DEBUG] handleFullscreenPlayer: Decided to return early (native lyrics mode). Reason:', {
        hasNativeSyncedLyrics,
        hasNativeLyrics,
        trackHasLyricsTrue: (trackHasLyrics === true)
      });
      window.hadLoggedFsDecision = true;
    }
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
    if (!customToggle) {
      customToggle = document.createElement('button');
      customToggle.className = 'ym-custom-sync-lyrics-btn';
      customToggle.type = 'button';
      customToggle.setAttribute('aria-label', 'Включить текстомузыку');
      
      const isVisible = localStorage.getItem('ymCustomLyricsVisible') !== 'false';
      customToggle.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
      if (isVisible) {
        customToggle.classList.add('active');
      }
      
      customToggle.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
      `;
      
      customToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentVisible = localStorage.getItem('ymCustomLyricsVisible') !== 'false';
        const newVisible = !currentVisible;
        localStorage.setItem('ymCustomLyricsVisible', newVisible ? 'true' : 'false');
        
        customToggle.setAttribute('aria-pressed', newVisible ? 'true' : 'false');
        if (newVisible) {
          customToggle.classList.add('active');
        } else {
          customToggle.classList.remove('active');
        }
        
        handleFullscreenPlayer();
      });
      
      controlsRoot.appendChild(customToggle);
      if (typeof ymRegisterActiveElement === 'function') {
        ymRegisterActiveElement(customToggle);
      }
    } else {
      const isVisible = localStorage.getItem('ymCustomLyricsVisible') !== 'false';
      customToggle.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
      if (isVisible) {
        customToggle.classList.add('active');
      } else {
        customToggle.classList.remove('active');
      }
    }
  }

  const nativeBtn = findLyricsButton();
  const isPressed = nativeBtn && (nativeBtn.getAttribute('aria-pressed') === 'true' || nativeBtn.classList.contains('active'));
  const hasActiveIcon = !!document.querySelector('[class*="SyncLyricsButton_icon_active"]');
  const isNativelyWithLyrics = !!(isPressed || hasActiveIcon);

  // Determine custom lyrics visibility (active either by custom toggle or forced by Genius mode)
  let isCustomLyricsVisible = localStorage.getItem('ymCustomLyricsVisible') !== 'false' || isGeniusMode;
  
  // If track has native lyrics and they are currently closed in native UI, force custom lyrics to be hidden
  if ((hasNativeLyrics || trackHasLyrics === true) && !isNativelyWithLyrics && !isGeniusMode) {
    isCustomLyricsVisible = false;
  }

  console.log('[DEBUG-LYRICS] final visibility check:', {
    isPressed,
    hasActiveIcon,
    isNativelyWithLyrics,
    isCustomLyricsVisible,
    hasNativeLyrics,
    trackHasLyrics
  });
  
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
    customLyricsContainer.addEventListener('click', (e) => {
      // Don't close if clicking an interactive element (link, translation control, buttons, etc.)
      if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.ym-translation-control') || e.target.closest('.ym-genius-annotation-panel') || e.target.closest('.ym-genius-panel-exit-btn')) {
        return;
      }
      
      // Don't close if the user is currently selecting text
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        return;
      }

      localStorage.setItem('ymGeniusMode', 'false');
      localStorage.setItem('ymCustomLyricsVisible', 'false');
      handleFullscreenPlayer();
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