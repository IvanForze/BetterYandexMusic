function updateLyricsHighlight(position) {
  if (!isSyncedLyrics || !currentLyricsLines || currentLyricsLines.length === 0) return;
  let activeIdx = -1;
  for (let i = 0; i < currentLyricsLines.length; i++) {
    if (position >= currentLyricsLines[i].time) {
      activeIdx = i;
    } else {
      break;
    }
  }
  if (activeIdx !== -1 && activeIdx !== lastLyricsActiveIndex) {
    lastLyricsActiveIndex = activeIdx;
    const lineElements = document.querySelectorAll('.ym-lyric-line');
    lineElements.forEach(el => el.classList.remove('active'));
    const activeEl = document.querySelector(`.ym-lyric-line[data-idx="${activeIdx}"]`);
    if (activeEl) {
      activeEl.classList.add('active');
      const container = document.getElementById('ym-lyrics-container');
      if (container) {
        const containerHeight = container.clientHeight;
        const activeTop = activeEl.offsetTop;
        const activeHeight = activeEl.clientHeight;
        if (Date.now() - lastSidebarUserInteractionTime > 7000) {
          container.scrollTo({
            top: activeTop - containerHeight / 2 + activeHeight / 2,
            behavior: 'smooth'
          });
        }
      }
    }

    // For fullscreen player
    const fsContainer = document.querySelector('.ym-fullscreen-lyrics-container');
    if (fsContainer) {
      const fsLineElements = fsContainer.querySelectorAll('.ym-fullscreen-lyric-line');
      fsLineElements.forEach(el => el.classList.remove('active'));
      const fsActiveEl = fsContainer.querySelector(`.ym-fullscreen-lyric-line[data-idx="${activeIdx}"]`);
      if (fsActiveEl) {
        fsActiveEl.classList.add('active');
        const containerHeight = fsContainer.clientHeight;
        const activeTop = fsActiveEl.offsetTop;
        const activeHeight = fsActiveEl.clientHeight;
        if (Date.now() - lastFsUserInteractionTime > 7000) {
          fsContainer.scrollTo({
            top: activeTop - containerHeight / 2 + activeHeight / 2,
            behavior: 'smooth'
          });
        }
      }
    }
  }
}

function handleLocalStateUpdate(state) {
  if (!state) return;
  const position = typeof state.position !== 'undefined' ? state.position : state.time;
  const isPause = state.isPause;
  const metadata = state.metadata;
  const trackId = state.trackId;
  if (trackId !== window.ymLastLoggedTrackId) {
    console.log('[SYNC-DEBUG] handleLocalStateUpdate track changed:', {
      trackId: state.trackId,
      hasMetadata: !!state.metadata,
      metadataHasLyrics: state.metadata ? state.metadata.hasLyrics : 'no_metadata'
    });
    window.ymLastLoggedTrackId = trackId;
    window.ymCurrentTrackHasLyrics = null;
    window.ymLastKnownNativeLyricsState = null;
    window.hadLoggedFsEvaluation = false;
    window.hadLoggedFsDecision = false;
    window.hadLoggedFsCustomLyricsStarted = false;

    // Unpatch native button on track change so it re-evaluates correctly for the new track
    const nativeBtn = document.querySelector('[class*="PlayerBarDesktop_lyricsButton"]') || document.querySelector('[class*="PlayerBar_lyricsButton"]') || document.querySelector('button[aria-label="Текст песни"]') || document.querySelector('[data-test-id="lyrics-button"]');
    if (nativeBtn) {
      nativeBtn.dataset.ymSyncPatched = 'false';
      nativeBtn.style.pointerEvents = '';
      nativeBtn.style.opacity = '';
      nativeBtn.style.cursor = '';
    }
  }
  if (metadata && typeof metadata.hasLyrics !== 'undefined') {
    if (window.ymCurrentTrackHasLyrics !== metadata.hasLyrics) {
      window.ymCurrentTrackHasLyrics = metadata.hasLyrics;
      console.log('[SYNC-DEBUG] Updated window.ymCurrentTrackHasLyrics to:', window.ymCurrentTrackHasLyrics);
    }
  }
  if (!trackId) {
    currentLyricsTrackId = null;
    currentLyricsLines = null;
    currentLyricsPlain = null;
    isSyncedLyrics = false;
    const container = document.getElementById('ym-lyrics-container');
    const infoEl = document.getElementById('ym-lyrics-track-info');
    if (infoEl) infoEl.textContent = 'Воспроизведение не запущено';
    if (container) container.innerHTML = `<div class="ym-lyrics-empty">Включите трек для просмотра текста</div>`;
    return;
  }
  if (trackId !== currentLyricsTrackId) {
    currentLyricsTrackId = trackId;
    currentLyricsLines = null;
    currentLyricsPlain = null;
    isSyncedLyrics = false;
    lastLyricsActiveIndex = -1;
    window.ymHasFailedLyricsSearch = false;
    if (metadata && metadata.title) {
      fetchLyrics(metadata.title, metadata.artist, metadata.durationMs);
    } else {
      const container = document.getElementById('ym-lyrics-container');
      const infoEl = document.getElementById('ym-lyrics-track-info');
      if (infoEl) infoEl.textContent = 'Загрузка информации о треке...';
      if (container) container.innerHTML = `<div class="ym-lyrics-empty">Загрузка информации...</div>`;
    }
  } else {
    if (metadata && metadata.title && !currentLyricsLines && !currentLyricsPlain && (!isLyricsLoading || window.ymTrackIdLoadingLyrics !== currentLyricsTrackId) && !window.ymHasFailedLyricsSearch) {
      fetchLyrics(metadata.title, metadata.artist, metadata.durationMs);
    }
  }
  if (position && !isPause) {
    updateLyricsHighlight(position);
  }
}

window.addEventListener('message', event => {
  if (event.data && event.data.type === 'YM_SYNC_STATE_CHANGED') {
    handleLocalStateUpdate(event.data.state);
  }
});