// Функции для текста песен (LRCLIB)
function findLyricsButton() {
  const selectors = ['[class*="PlayerBar_lyrics"]', '[class*="PlayerBar_showLyrics"]', '[class*="lyricsButton"]', '[class*="LyricsButton"]', 'button[title*="Текст"]', 'button[title*="текст"]', 'button[title*="Lyrics"]', 'button[title*="lyrics"]', 'button[aria-label*="Текст"]', 'button[aria-label*="текст"]', 'button[aria-label*="Lyrics"]', 'button[aria-label*="lyrics"]'];
  for (const sel of selectors) {
    try {
      const elements = document.querySelectorAll(sel);
      for (const btn of elements) {
        const isInvalid = Array.from(btn.classList).some(cls => cls.includes('contextMenu') || cls.includes('ContextMenu') || cls.includes('menu') || cls.includes('Menu') || cls.includes('PinItem'));
        if (isInvalid) continue;

        // Verify it belongs to some player bar container (standard or Vibe)
        const playerBar = btn.closest('[class*="PlayerBar_"], [class*="player-bar"], [class*="VibePlayerBar_"]');
        if (playerBar) {
          if (!window.hadLoggedLyricsBtnSelector) {
            console.log('[SYNC-DEBUG] findLyricsButton matched selector:', sel, 'classes:', Array.from(btn.classList));
            window.hadLoggedLyricsBtnSelector = true;
          }
          return btn;
        }
      }
    } catch (e) {}
  }
  return null;
}

function patchNativeLyricsButton() {
  const nativeBtn = findLyricsButton();
  if (!nativeBtn) {
    if (!window.hadWarnedLyricsBtnNotFound) {
      console.warn('[SYNC-DEBUG] Native lyrics button not found by any selector.');
      window.hadWarnedLyricsBtnNotFound = true;
    }
    return;
  }
  const isDisabledAttr = nativeBtn.hasAttribute('disabled') || nativeBtn.disabled;
  const hasAriaDisabled = nativeBtn.getAttribute('aria-disabled') === 'true';
  const isDisabledClass = Array.from(nativeBtn.classList).some(cls => cls.toLowerCase().includes('disabled'));
  const isCurrentlyNativelyDisabled = isDisabledAttr || hasAriaDisabled || isDisabledClass;
  window.ymLastKnownNativeLyricsState = !isCurrentlyNativelyDisabled;
  if (isCurrentlyNativelyDisabled) {
    nativeBtn.dataset.ymSyncPatched = 'true';
    let overlay = nativeBtn.parentElement.querySelector('.ym-sync-btn-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'ym-sync-btn-overlay';
      overlay.style.position = 'absolute';
      overlay.style.cursor = 'pointer';
      overlay.style.zIndex = '100';
      overlay.title = 'Текст песни (Yandex Music Sync)';
      const parent = nativeBtn.parentElement;
      if (window.getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(overlay);
      overlay.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        toggleNativeFullscreen();
      });
    }
    overlay.style.top = nativeBtn.offsetTop + 'px';
    overlay.style.left = nativeBtn.offsetLeft + 'px';
    overlay.style.width = nativeBtn.offsetWidth + 'px';
    overlay.style.height = nativeBtn.offsetHeight + 'px';
    overlay.style.display = 'block';
  } else {
    nativeBtn.dataset.ymSyncPatched = 'false';
    const overlay = nativeBtn.parentElement.querySelector('.ym-sync-btn-overlay');
    if (overlay) overlay.style.display = 'none';
  }
  injectLyricsPopover();
}

function injectLyricsPopover() {
  if (document.getElementById('ym-lyrics-popover')) return;
  const popover = document.createElement('div');
  popover.id = 'ym-lyrics-popover';
  popover.className = 'ym-lyrics-popover';
  popover.innerHTML = `
    <div class="ym-lyrics-header">
      <h3>Текст песни</h3>
      <button class="ym-lyrics-close-btn" id="ym-lyrics-close-btn">&times;</button>
    </div>
    <div class="ym-lyrics-body">
      <div id="ym-lyrics-track-info" class="ym-lyrics-track-info">Воспроизведите трек...</div>
      <div id="ym-lyrics-container" class="ym-lyric-lines-container">
        <div class="ym-lyrics-empty">Нет активного воспроизведения</div>
      </div>
    </div>
  `;
  document.body.appendChild(popover);
  const container = document.getElementById('ym-lyrics-container');
  if (container) {
    const updateInteraction = () => {
      lastSidebarUserInteractionTime = Date.now();
    };
    container.addEventListener('wheel', updateInteraction, {
      passive: true
    });
    container.addEventListener('touchmove', updateInteraction, {
      passive: true
    });
    container.addEventListener('mousedown', updateInteraction, {
      passive: true
    });
  }
  const closeBtn = document.getElementById('ym-lyrics-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      popover.classList.remove('show');
    });
  }
  const scrollableSidebar = document.querySelector('[class*="NavbarDesktop_scrollableContent"]');
  if (scrollableSidebar) {
    scrollableSidebar.addEventListener('scroll', () => {
      if (popover.classList.contains('show')) {
        positionLyricsPopover();
      }
    });
  }
}

function toggleLyricsPopover() {
  const popover = document.getElementById('ym-lyrics-popover');
  if (!popover) return;
  const isShowing = popover.classList.contains('show');
  if (isShowing) {
    popover.classList.remove('show');
  } else {
    const syncPopover = document.getElementById('ym-sync-popover');
    if (syncPopover) syncPopover.classList.remove('show');
    const themePopover = document.getElementById('ym-theme-popover');
    if (themePopover) themePopover.classList.remove('show');
    positionLyricsPopover();
    popover.classList.add('show');
    if (currentLyricsTrackId) {
      const activeLineEl = document.querySelector('.ym-lyric-line.active');
      if (activeLineEl) {
        setTimeout(() => activeLineEl.scrollIntoView({
          behavior: 'auto',
          block: 'center'
        }), 100);
      }
    }
  }
}

function positionLyricsPopover() {
  const btn = findLyricsButton();
  const popover = document.getElementById('ym-lyrics-popover');
  if (!btn || !popover) return;
  const rect = btn.getBoundingClientRect();
  const popoverWidth = popover.offsetWidth || 320;
  const popoverHeight = popover.offsetHeight || 480;
  let left = rect.left + rect.width / 2 - popoverWidth / 2;
  let top = rect.top - popoverHeight - 12;
  if (top < 10) top = 10;
  if (left < 10) left = 10;
  if (left + popoverWidth > window.innerWidth - 10) {
    left = window.innerWidth - popoverWidth - 10;
  }
  if (left + popoverWidth > window.innerWidth - 10) {
    left = window.innerWidth - popoverWidth - 10;
  }
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}