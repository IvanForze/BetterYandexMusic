// =========================================================================
// BetterYandexMusic: Vibe Observer, Routing, Event Listeners & Public API
// =========================================================================

  // 9. Observer to maintain button injection, navbar transparency and feed injection
  let lastFeedCheckUrl = '';
  const observer = new MutationObserver(() => {
    checkAndInjectVibeButton();
    trackAsideWidth();

    const mode = getVibeDesignMode();
    const isTarget = isTargetVibePage();

    if (!isTarget) {
      if (document.documentElement) {
        document.documentElement.classList.remove('ym-vibe-no-wheel', 'ym-vibe-with-landing');
      }
      if (document.body) {
        document.body.classList.remove('ym-vibe-no-wheel', 'ym-vibe-with-landing');
      }
      updateNavbarTransparency(false);
      removeVibeLandingFeed();
      return;
    }

    if (mode === 'no_wheel') {
      if (document.documentElement) {
        document.documentElement.classList.add('ym-vibe-no-wheel');
        document.documentElement.classList.remove('ym-vibe-with-landing');
      }
      if (document.body) {
        document.body.classList.add('ym-vibe-no-wheel');
        document.body.classList.remove('ym-vibe-with-landing');
      }
      updateNavbarTransparency(true);
      removeVibeLandingFeed();
    } else if (mode === 'vibe_with_landing') {
      if (document.documentElement) {
        document.documentElement.classList.remove('ym-vibe-no-wheel');
        document.documentElement.classList.add('ym-vibe-with-landing');
      }
      if (document.body) {
        document.body.classList.remove('ym-vibe-no-wheel');
        document.body.classList.add('ym-vibe-with-landing');
      }
      updateNavbarTransparency(true);
      const hasFeed = document.getElementById('ym-vibe-live-landing-feed');
      if (!hasFeed || window.location.href !== lastFeedCheckUrl) {
        lastFeedCheckUrl = window.location.href;
        initVibeLandingFeed();
      }
    } else {
      if (document.documentElement) {
        document.documentElement.classList.remove('ym-vibe-no-wheel', 'ym-vibe-with-landing');
      }
      if (document.body) {
        document.body.classList.remove('ym-vibe-no-wheel', 'ym-vibe-with-landing');
      }
      updateNavbarTransparency(false);
      removeVibeLandingFeed();
    }
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => {
      applyVibeMode(getVibeDesignMode());
    });
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'YM_SYNC_STATE_CHANGED') {
        updateLandingPlaybackIndicators();
      }
    });
    if (typeof document !== 'undefined') {
      document.addEventListener('play', () => updateLandingPlaybackIndicators(), true);
      document.addEventListener('pause', () => updateLandingPlaybackIndicators(), true);
    }
    setInterval(() => {
      if (document.getElementById('ym-vibe-live-landing-feed')) {
        updateLandingPlaybackIndicators();
      }
    }, 350);
  }

  if (typeof document !== 'undefined') {
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
    // Initial checks
    setTimeout(initVibeMode, 300);
    setTimeout(initVibeMode, 1200);
    setTimeout(initVibeMode, 2500);
  }

  // Debug helper function to spy on Sonata Core and native button clicks
  window.BYM_DEBUG_VIBE = function() {
    console.log("%c[BYM Debugger] Запущен шпион за плеером и нативными кнопками!", "color: #ffdb4d; font-size: 16px; font-weight: bold;");

    const core = (typeof getSonataCore === 'function' ? getSonataCore() : null) || (window.getSonataCore ? window.getSonataCore() : null);
    const player = (typeof getActivePlayer === 'function' ? getActivePlayer() : null) || (window.getActivePlayer ? window.getActivePlayer() : null);

    console.log("1. Sonata Core:", core);
    console.log("2. Active Player:", player);

    if (core?.playbackController) {
      const proto = Object.getPrototypeOf(core.playbackController) || {};
      console.log("3. core.playbackController methods:", Object.getOwnPropertyNames(proto));
    }
    if (player?.contextController) {
      const proto = Object.getPrototypeOf(player.contextController) || {};
      console.log("4. player.contextController methods:", Object.getOwnPropertyNames(proto));
    }
    if (player?.queueController) {
      const proto = Object.getPrototypeOf(player.queueController) || {};
      console.log("5. player.queueController methods:", Object.getOwnPropertyNames(proto));
    }

    function spyOnObject(obj, name) {
      if (!obj) return;
      const proto = Object.getPrototypeOf(obj) || obj;
      const props = Object.getOwnPropertyNames(proto);
      for (const key of props) {
        if (typeof obj[key] === 'function' && key !== 'constructor' && !key.startsWith('_bym_spied')) {
          const orig = obj[key].bind(obj);
          obj[key] = function(...args) {
            console.log(`%c[SPY CALL] ${name}.${key}(`, "color: #10b981; font-weight: bold;", ...args, ")");
            try {
              return orig(...args);
            } catch(e) {
              console.error(`[SPY ERROR] ${name}.${key}:`, e);
              throw e;
            }
          };
          obj[key]._bym_spied = true;
        }
      }
    }

    if (core?.playbackController) spyOnObject(core.playbackController, 'core.playbackController');
    if (core?.contextController) spyOnObject(core.contextController, 'core.contextController');
    if (player?.contextController) spyOnObject(player.contextController, 'player.contextController');
    if (player?.queueController) spyOnObject(player.queueController, 'player.queueController');
    if (player) spyOnObject(player, 'player');

    if (!window._bym_click_spied) {
      window._bym_click_spied = true;
      window.addEventListener('click', (e) => {
        const btn = e.target.closest('button, [role="button"], li');
        if (!btn) return;
        console.log("%c[CLICKED ELEMENT]", "color: #3b82f6; font-weight: bold;", btn);
        for (const key in btn) {
          if (key.startsWith('__reactProps$')) {
            console.log("[REACT PROPS]:", btn[key]);
          }
          if (key.startsWith('__reactFiber$')) {
            let f = btn[key];
            console.log("[REACT FIBER memoizedProps]:", f.memoizedProps);
            let depth = 0;
            while (f && depth < 8) {
              if (f.memoizedProps && (f.memoizedProps.onClick || f.memoizedProps.seeds || f.memoizedProps.item || f.memoizedProps.stationId)) {
                console.log(`[FIBER PARENT level ${depth} props]:`, f.memoizedProps);
              }
              f = f.return;
              depth++;
            }
          }
        }
      }, true);
    }

    console.log("%c[ШПИОН АКТИВИРОВАН] Теперь кликните на любую оригинальную кнопку сета на странице!", "color: #ffdb4d; font-size: 14px; font-weight: bold;");
    return "Шпион активен. Кликните по оригинальной кнопке!";
  };

  // Expose API for external debug or settings
  window.__ymVibeEnhancer = {
    getItems: getAllVibeItems,
    activate: activateVibeItem,
    playStation: playVibeStation,
    debug: window.BYM_DEBUG_VIBE,
    applyMode: applyVibeMode,
    refreshFeed: initVibeLandingFeed
  };
  window.BYM_playVibeStation = playVibeStation;

