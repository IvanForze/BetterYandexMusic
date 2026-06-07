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
  if (isLyricsLoading && window.ymTrackIdLoadingLyrics === requestTrackId) return;
  
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
  const handleResponseData = data => {
    if (requestTrackId !== currentLyricsTrackId) return;
    isLyricsLoading = false;
    window.ymTrackIdLoadingLyrics = null;
    displayLyricsData(data);
  };
  const handleFailure = err => {
    if (requestTrackId !== currentLyricsTrackId) return;
    isLyricsLoading = false;
    window.ymTrackIdLoadingLyrics = null;
    window.ymHasFailedLyricsSearch = true;
    showSearchFallback(cleanTitle, cleanArtist);
  };
  if (window.__ymSyncBridge && typeof window.__ymSyncBridge.fetchLyrics === 'function') {
    window.__ymSyncBridge.fetchLyrics(url).catch(err => {
      let fallbackUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
      return window.__ymSyncBridge.fetchLyrics(fallbackUrl);
    }).then(handleResponseData).catch(handleFailure);
  } else {
    fetch(url).then(res => {
      if (res.status === 404) {
        let fallbackUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
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