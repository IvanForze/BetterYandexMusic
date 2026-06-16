function performTranslationFetch(text, targetLang) {
  if (window.__ymSyncBridge && typeof window.__ymSyncBridge.translateText === 'function') {
    return window.__ymSyncBridge.translateText(text, targetLang);
  } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'SC_TRANSLATE', text, targetLang }, (response) => {
        if (response && response.ok) {
          resolve(response.translation);
        } else {
          reject(new Error(response ? response.error : 'Unknown translation error'));
        }
      });
    });
  } else {
    return Promise.reject(new Error('Bridge translateText not available'));
  }
}

async function translateLyrics(lines, targetLang) {
  const chunkSize = 25;
  const translatedLines = [];
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    const textToTranslate = chunk.map(line => line.text || ' ').join('\n');
    try {
      const fullTranslation = await performTranslationFetch(textToTranslate, targetLang);
      const chunkTranslations = fullTranslation.split('\n');
      chunk.forEach((line, idx) => {
        translatedLines.push(chunkTranslations[idx] ? chunkTranslations[idx].trim() : '');
      });
    } catch (err) {
      console.error('[SYNC] Chunk translation error:', err);
      chunk.forEach(() => {
        translatedLines.push('');
      });
    }
  }
  return translatedLines;
}

async function applyTranslation(container, trackId, targetLang) {
  if (ymIsTranslating) return;
  const cacheKey = `${trackId}_${targetLang}`;
  let translations = ymLyricsTranslationCache[cacheKey];
  const linesToTranslate = isSyncedLyrics ? currentLyricsLines : currentLyricsPlain ? currentLyricsPlain.split('\n').map(t => ({
    text: t
  })) : null;
  if (!linesToTranslate || linesToTranslate.length === 0) return;
  if (!translations) {
    ymIsTranslating = true;
    try {
      translations = await translateLyrics(linesToTranslate, targetLang);
      ymLyricsTranslationCache[cacheKey] = translations;
    } catch (e) {
      console.error('[SYNC] Translation error:', e);
    } finally {
      ymIsTranslating = false;
    }
  }
  if (translations && container.dataset.trackId === trackId) {
    const translationEls = container.querySelectorAll('.ym-fullscreen-lyric-translation');
    translationEls.forEach((el, idx) => {
      if (translations[idx]) {
        el.textContent = translations[idx];
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    });
  }
}

function handleNativeLyricsTranslation(contentRoot) {
  const targetLang = localStorage.getItem('ymTargetLang') || 'ru';
  const isTranslationEnabled = localStorage.getItem('ymTranslationEnabled') !== 'false';
  if (!isTranslationEnabled) {
    const translationEls = contentRoot.querySelectorAll('.ym-native-lyrics-translation');
    translationEls.forEach(el => el.style.display = 'none');

    // Reset originalSpan styling when translation is disabled
    const nativeLines = contentRoot.querySelectorAll('[class*="SyncLyricsScroller_line"]');
    nativeLines.forEach(lineEl => {
      const originalSpan = lineEl.querySelector('[class*="SyncLyricsLine_root"]');
      if (originalSpan) {
        originalSpan.style.fontWeight = '';
        originalSpan.style.fontSize = '';
        originalSpan.style.transform = '';
        originalSpan.style.transformOrigin = '';
        originalSpan.style.display = '';
      }
    });

    // Trigger Swiper recalculation
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    return;
  }
  const nativeLines = contentRoot.querySelectorAll('[class*="SyncLyricsScroller_line"]');
  if (!nativeLines || nativeLines.length === 0) return;
  const cacheKey = `${currentLyricsTrackId}_${targetLang}`;
  const translations = ymLyricsTranslationCache[cacheKey];
  if (translations) {
    applyTranslationsToNativeLines(nativeLines, translations);
  } else {
    if (ymIsTranslating) return;
    const linesToTranslate = Array.from(nativeLines).map(lineEl => {
      const span = lineEl.querySelector('[class*="SyncLyricsLine_root"]');
      return {
        text: span ? span.textContent.trim() : ''
      };
    });
    if (linesToTranslate.length === 0) return;
    ymIsTranslating = true;
    translateLyrics(linesToTranslate, targetLang).then(res => {
      ymLyricsTranslationCache[cacheKey] = res;
      applyTranslationsToNativeLines(nativeLines, res);
    }).catch(err => {
      console.error('[SYNC] Native lyrics translation error:', err);
    }).finally(() => {
      ymIsTranslating = false;
    });
  }
}

function applyTranslationsToNativeLines(nativeLines, translations) {
  if (!translations) return;
  const isTranslationEnabled = localStorage.getItem('ymTranslationEnabled') !== 'false';
  nativeLines.forEach((lineEl, idx) => {
    const originalSpan = lineEl.querySelector('[class*="SyncLyricsLine_root"]');
    if (!originalSpan) return;

    // Reset previous flex changes to avoid breaking swiper height calculations
    lineEl.style.display = '';
    lineEl.style.flexDirection = '';
    lineEl.style.alignItems = '';

    // Ensure relative positioning on the parent container
    lineEl.style.position = 'relative';
    let translationEl = lineEl.querySelector('.ym-native-lyrics-translation');
    if (!translationEl) {
      translationEl = document.createElement('div');
      translationEl.className = 'ym-native-lyrics-translation';
      translationEl.style.cssText = `
        font-family: "YSMusic Headline", sans-serif;
        font-weight: 700;
        font-style: normal;
        font-size: 0.8em;
        opacity: 0.9;
        color: rgb(255, 219, 77);
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        text-align: center;
        line-height: 1.4;
        margin-top: 4px;
        pointer-events: none;
      `;
      lineEl.appendChild(translationEl);
    }
    const translationText = translations[idx];
    if (translationText && isTranslationEnabled) {
      translationEl.textContent = translationText;
      translationEl.style.display = 'block';

      // Update original lyrics font weight to 500 (medium) and scale down visually to keep container size intact
      originalSpan.style.fontWeight = '500';
      originalSpan.style.transform = 'scale(0.9)';
      originalSpan.style.transformOrigin = 'center';
      originalSpan.style.display = 'inline-block';
    } else {
      translationEl.style.display = 'none';

      // Restore original styling
      originalSpan.style.fontWeight = '';
      originalSpan.style.fontSize = '';
      originalSpan.style.transform = '';
      originalSpan.style.transformOrigin = '';
      originalSpan.style.display = '';
    }
  });

  // Trigger Swiper recalculation
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 100);
}

function ensureTranslateControls(fullscreenRoot, customLyricsContainer) {
  const controlsRoot = fullscreenRoot.querySelector('[class*="FullscreenPlayerDesktopControls_root"]');
  if (controlsRoot) {
    const computedStyle = window.getComputedStyle(controlsRoot);
    if (computedStyle.position === 'static') {
      controlsRoot.style.position = 'relative';
    }
    let translateBtn = controlsRoot.querySelector('.ym-fullscreen-translate-btn');
    if (!translateBtn) {
      translateBtn = document.createElement('button');
      translateBtn.className = 'ym-fullscreen-translate-btn';
      translateBtn.type = 'button';
      translateBtn.setAttribute('aria-label', 'Перевод текста');
      translateBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
          <path d="m5 8 6 6" />
          <path d="m4 14 6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
          <path d="m22 22-5-10-5 10" />
          <path d="M14 18h6" />
        </svg>
      `;
      controlsRoot.appendChild(translateBtn);
    }
    ymRegisterActiveElement(translateBtn);

    let ratingsContainer = controlsRoot.querySelector('.ym-fullscreen-rzt-ratings');
    if (!ratingsContainer) {
      ratingsContainer = document.createElement('div');
      ratingsContainer.className = 'ym-fullscreen-rzt-ratings';
      controlsRoot.appendChild(ratingsContainer);
    }
    ymRegisterActiveElement(ratingsContainer);
    updateRztRatingsUI(ratingsContainer);

    let popover = fullscreenRoot.querySelector('.ym-fullscreen-translate-popover');
    if (!popover) {
      popover = document.createElement('div');
      popover.className = 'ym-fullscreen-translate-popover';
      popover.style.cssText = `
        position: absolute;
        width: 270px;
        background: rgba(28, 28, 32, 0.75);
        backdrop-filter: blur(40px) saturate(180%);
        -webkit-backdrop-filter: blur(40px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
        padding: 8px;
        color: #ffffff;
        font-family: inherit;
        font-size: 13px;
        z-index: 100001;
        display: none;
        flex-direction: column;
        gap: 12px;
        box-sizing: border-box;
        transition: opacity 0.2s ease, transform 0.2s ease;
        transform: scale(0.95);
        opacity: 0;
      `;
      const savedLang = localStorage.getItem('ymTargetLang') || 'ru';
      const isEnabled = localStorage.getItem('ymTranslationEnabled') !== 'false';
      popover.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px 4px 12px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 500; color: var(--ym-popover-text); font-family: inherit;">Перевод текста</h3>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 6px; padding: 0 8px 8px 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--ym-popover-item-bg); border: 1px solid var(--ym-popover-item-border); border-radius: 12px;">
            <span style="color: var(--ym-popover-text); opacity: 0.85;">Включить перевод</span>
            <label class="ym-translate-switch" style="
              position: relative;
              display: inline-block;
              width: 38px;
              height: 20px;
            ">
              <input type="checkbox" id="ym-translate-toggle-cb" ${isEnabled ? 'checked' : ''} style="
                opacity: 0;
                width: 0;
                height: 0;
              ">
              <span class="ym-translate-slider" style="
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                transition: .3s;
                border-radius: 20px;
              "></span>
            </label>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--ym-popover-item-bg); border: 1px solid var(--ym-popover-item-border); border-radius: 12px;">
            <span style="color: var(--ym-popover-text); opacity: 0.85;">Язык перевода</span>
            <select id="ym-translate-lang-select" style="
              background: var(--ym-popover-input-bg);
              border: 1px solid var(--ym-popover-input-border);
              color: var(--ym-popover-active);
              font-weight: 600;
              outline: none;
              cursor: pointer;
              font-family: inherit;
              font-size: 12px;
              padding: 6px 10px;
              border-radius: 12px;
            ">
              <option value="ru" ${savedLang === 'ru' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">Русский</option>
              <option value="en" ${savedLang === 'en' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">English</option>
              <option value="es" ${savedLang === 'es' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">Español</option>
              <option value="de" ${savedLang === 'de' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">Deutsch</option>
              <option value="fr" ${savedLang === 'fr' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">Français</option>
              <option value="zh" ${savedLang === 'zh' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">中文</option>
              <option value="ja" ${savedLang === 'ja' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">日本語</option>
            </select>
          </div>
        </div>
      `;
      fullscreenRoot.appendChild(popover);
      ymRegisterActiveElement(popover);
      if (!document.getElementById('ym-translate-switch-style')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'ym-translate-switch-style';
        styleEl.textContent = `
          .ym-translate-slider {
            background-color: rgba(255, 255, 255, 0.15);
          }
          html.theme-light .ym-translate-slider,
          .theme-light .ym-translate-slider {
            background-color: rgba(0, 0, 0, 0.15);
          }
          .ym-translate-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 3px;
            bottom: 3px;
            background-color: #8e8e93;
            transition: .3s;
            border-radius: 50%;
          }
          html.theme-light .ym-translate-slider:before,
          .theme-light .ym-translate-slider:before {
            background-color: #a0a0a5;
          }
          .ym-translate-switch input:checked + .ym-translate-slider {
            background-color: var(--ym-popover-active, #ffdb4d) !important;
          }
          .ym-translate-switch input:checked + .ym-translate-slider:before {
            transform: translateX(18px);
            background-color: #000000 !important;
          }
        `;
        document.head.appendChild(styleEl);
      }
      const select = popover.querySelector('#ym-translate-lang-select');
      const checkbox = popover.querySelector('#ym-translate-toggle-cb');
      select.addEventListener('change', e => {
        localStorage.setItem('ymTargetLang', e.target.value);
        if (customLyricsContainer) {
          renderFullscreenLyricsLines(customLyricsContainer);
        }
        handleFullscreenPlayer();
      });
      checkbox.addEventListener('change', e => {
        localStorage.setItem('ymTranslationEnabled', e.target.checked ? 'true' : 'false');
        if (customLyricsContainer) {
          renderFullscreenLyricsLines(customLyricsContainer);
        }
        handleFullscreenPlayer();
      });
    }
    translateBtn.onclick = e => {
      e.stopPropagation();
      const isShowing = popover.style.display === 'flex';
      if (isShowing) {
        popover.style.opacity = '0';
        popover.style.transform = 'scale(0.95)';
        setTimeout(() => {
          popover.style.display = 'none';
          ymStopKeepControlsActive();
        }, 200);
        translateBtn.classList.remove('active');
        translateBtn.style.background = '';
        translateBtn.style.borderColor = '';
        translateBtn.style.color = '';
      } else {
        popover.style.display = 'flex';
        popover.offsetHeight;
        popover.style.opacity = '1';
        popover.style.transform = 'scale(1)';
        translateBtn.classList.add('active');
        translateBtn.style.background = '';
        translateBtn.style.borderColor = '';
        translateBtn.style.color = '';
        ymStartKeepControlsActive();
        const btnRect = translateBtn.getBoundingClientRect();
        const parentRect = fullscreenRoot.getBoundingClientRect();
        const relativeTop = btnRect.top - parentRect.top;
        const relativeLeft = btnRect.left - parentRect.left;
        popover.style.top = `${relativeTop}px`;
        if (relativeLeft < parentRect.width / 2) {
          popover.style.left = `${relativeLeft + btnRect.width + 12}px`;
          popover.style.right = 'auto';
        } else {
          popover.style.right = `${parentRect.width - relativeLeft + 12}px`;
          popover.style.left = 'auto';
        }
      }
    };
    if (!window.ymTranslationCloseHandlerRegistered) {
      window.ymTranslationCloseHandlerRegistered = true;
      document.addEventListener('click', e => {
        const activePopover = document.querySelector('.ym-fullscreen-translate-popover');
        const activeBtn = document.querySelector('.ym-fullscreen-translate-btn');
        if (activePopover && activePopover.style.display === 'flex') {
          if (!activePopover.contains(e.target) && (!activeBtn || !activeBtn.contains(e.target))) {
            activePopover.style.opacity = '0';
            activePopover.style.transform = 'scale(0.95)';
            setTimeout(() => {
              activePopover.style.display = 'none';
              ymStopKeepControlsActive();
            }, 200);
            if (activeBtn) {
              activeBtn.classList.remove('active');
              activeBtn.style.background = '';
              activeBtn.style.borderColor = '';
              activeBtn.style.color = '';
            }
          }
        }
      });
    }
  }
}

// Update RZT ratings circles in DOM
function updateRztRatingsUI(ratingsContainer) {
  if (!ratingsContainer) {
    const fullscreenRoot = document.querySelector('[class*="FullscreenPlayerDesktop_root"]');
    if (!fullscreenRoot) return;
    const controlsRoot = fullscreenRoot.querySelector('[class*="FullscreenPlayerDesktopControls_root"]');
    if (!controlsRoot) return;
    ratingsContainer = controlsRoot.querySelector('.ym-fullscreen-rzt-ratings');
    if (!ratingsContainer) return;
  }

  const ratings = window.ymCurrentRztRatings;
  const statusStr = ratings ? JSON.stringify(ratings) : '';
  const trackId = window.ymLastRztTrackId || '';
  
  if (ratingsContainer.dataset.renderedTrackId === trackId && ratingsContainer.dataset.renderedStatus === statusStr) {
    // Already rendered exactly this state, skip updating DOM to prevent hover flickering!
    return;
  }

  // Save the state we are about to render
  ratingsContainer.dataset.renderedTrackId = trackId;
  ratingsContainer.dataset.renderedStatus = statusStr;

  if (!ratings || ratings.empty || ratings.error) {
    ratingsContainer.style.display = 'none';
    ratingsContainer.innerHTML = '';
    return;
  }

  if (ratings.loading) {
    ratingsContainer.style.display = 'flex';
    ratingsContainer.innerHTML = `
      <div class="ym-rzt-rating-circle rzt-blue-solid" data-tooltip="Сайт (Народ с рецензиями): Загрузка..." style="opacity: 0.5;">—</div>
      <div class="ym-rzt-rating-circle rzt-blue-outline" data-tooltip="Сайт (Народ без рецензий): Загрузка..." style="opacity: 0.5;">—</div>
      <div class="ym-rzt-rating-circle rzt-grey-solid" data-tooltip="Фломастер (РЗТ): Загрузка..." style="opacity: 0.5;">—</div>
    `;
    return;
  }

  const hasScores = ratings.withReviews !== null || ratings.withoutReviews !== null || ratings.flomaster !== null;
  if (!hasScores) {
    ratingsContainer.style.display = 'none';
    ratingsContainer.innerHTML = '';
    return;
  }

  ratingsContainer.style.display = 'flex';
  
  const score1 = ratings.withReviews !== null ? ratings.withReviews : '—';
  const score2 = ratings.withoutReviews !== null ? ratings.withoutReviews : '—';
  const score3 = ratings.flomaster !== null ? ratings.flomaster : '—';

  ratingsContainer.innerHTML = `
    <div class="ym-rzt-rating-circle rzt-blue-solid" data-tooltip="Сайт (Народ с рецензиями): ${score1}">${score1}</div>
    <div class="ym-rzt-rating-circle rzt-blue-outline" data-tooltip="Сайт (Народ без рецензий): ${score2}">${score2}</div>
    <div class="ym-rzt-rating-circle rzt-grey-solid" data-tooltip="Фломастер (РЗТ): ${score3}">${score3}</div>
  `;
}

// Keep player controls visible helper variables and functions
let ymKeepControlsActiveInterval = null;
let ymActiveHoverCount = 0;

function ymTriggerMouseMove() {
  const fullscreenRoot = document.querySelector('[class*="FullscreenPlayerDesktop_root"]');
  if (fullscreenRoot) {
    const event = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: window.innerWidth / 2,
      clientY: window.innerHeight / 2
    });
    fullscreenRoot.dispatchEvent(event);
    document.dispatchEvent(event);
  }
}

function ymStartKeepControlsActive() {
  if (!ymKeepControlsActiveInterval) {
    ymTriggerMouseMove();
    ymKeepControlsActiveInterval = setInterval(ymTriggerMouseMove, 1000);
  }
}

function ymStopKeepControlsActive() {
  const popover = document.querySelector('.ym-fullscreen-translate-popover');
  const isPopoverOpen = popover && popover.style.display === 'flex';
  
  if (ymActiveHoverCount <= 0 && !isPopoverOpen) {
    if (ymKeepControlsActiveInterval) {
      clearInterval(ymKeepControlsActiveInterval);
      ymKeepControlsActiveInterval = null;
    }
  }
}

function ymRegisterActiveElement(el) {
  if (!el || el.dataset.ymActiveRegistered === 'true') return;
  el.dataset.ymActiveRegistered = 'true';
  
  el.addEventListener('mouseenter', () => {
    ymActiveHoverCount++;
    ymStartKeepControlsActive();
  });
  
  el.addEventListener('mouseleave', () => {
    ymActiveHoverCount = Math.max(0, ymActiveHoverCount - 1);
    ymStopKeepControlsActive();
  });
}

// Listen to track state change to fetch RZT ratings in page/isolated context
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'YM_SYNC_STATE_CHANGED') {
      const state = event.data.state;
      if (state && state.trackId && state.trackId !== window.ymLastRztTrackId) {
        window.ymLastRztTrackId = state.trackId;
        window.ymCurrentRztRatings = { loading: true };
        
        // Update immediately if container is already visible
        const container = document.querySelector('.ym-fullscreen-rzt-ratings');
        if (container) {
          updateRztRatingsUI(container);
        }
        
        const metadata = state.metadata;
        if (metadata && metadata.title && metadata.artist) {
          const apiObj = typeof RztAPI !== 'undefined' ? RztAPI : (window.RztAPI || null);
          if (apiObj) {
            apiObj.getTrackRatings(metadata.artist, metadata.title)
              .then(ratings => {
                if (window.ymLastRztTrackId === state.trackId) {
                  window.ymCurrentRztRatings = ratings || { empty: true };
                  const container = document.querySelector('.ym-fullscreen-rzt-ratings');
                  if (container) {
                    updateRztRatingsUI(container);
                  }
                }
              })
              .catch(err => {
                console.error('[RZT-UI] Error getting track ratings:', err);
                if (window.ymLastRztTrackId === state.trackId) {
                  window.ymCurrentRztRatings = { error: true };
                  const container = document.querySelector('.ym-fullscreen-rzt-ratings');
                  if (container) {
                    updateRztRatingsUI(container);
                  }
                }
              });
          } else {
            console.warn('[RZT-UI] RztAPI not found in window/context');
            window.ymCurrentRztRatings = { error: true };
          }
        } else {
          window.ymCurrentRztRatings = null;
          const container = document.querySelector('.ym-fullscreen-rzt-ratings');
          if (container) {
            updateRztRatingsUI(container);
          }
        }
      }
    }
  });
}