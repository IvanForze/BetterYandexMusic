// =========================================================================
// BetterYandexMusic: Vibe Services (Playback, Sonata, Pins, Trailer & Likes)
// =========================================================================

  // 4. Activate / Play a Vibe Item safely via Swiper navigation and fresh active slide
  function activateVibeItem(item) {
    if (!item) return;
    closePopover();

    const swiper = getSwiperInstance();
    if (swiper && typeof swiper.slideToLoop === 'function') {
      try {
        swiper.slideToLoop(item.index, 0);
        if (typeof swiper.update === 'function') swiper.update();
      } catch (e) { }
    }

    // Wait a frame for Swiper to mount the active slide in the DOM
    setTimeout(() => {
      let targetSlide = null;

      // 1. Try finding slide matching the exact swiper index
      const matchingSlides = document.querySelectorAll(
        `[class*="WheelDesktop_slide"][data-swiper-slide-index="${item.index}"]`
      );
      if (matchingSlides.length > 0) {
        targetSlide = matchingSlides[0];
      }

      // 2. If not found by index, check active slide
      if (!targetSlide) {
        targetSlide = document.querySelector('.swiper-slide-active, [class*="WheelDesktop_activeSlide"]');
      }

      // 3. If still not found, search all slides by name
      if (!targetSlide) {
        const allSlides = document.querySelectorAll('[class*="WheelDesktop_slide"]');
        for (const slide of allSlides) {
          const titleEl = slide.querySelector('[class*="WheelItem_title"]');
          if (titleEl && titleEl.textContent.trim().toLowerCase() === item.name.toLowerCase()) {
            targetSlide = slide;
            break;
          }
        }
      }

      if (targetSlide) {
        let triggered = false;

        // Try React props onClick first
        for (const key in targetSlide) {
          if (key.startsWith('__reactProps$')) {
            const props = targetSlide[key];
            if (props && typeof props.onClick === 'function') {
              try {
                props.onClick({ stopPropagation: () => { }, preventDefault: () => { }, target: targetSlide });
                triggered = true;
              } catch (e) { }
            }
          }
        }

        // Trigger DOM click on the button or slide
        if (!triggered) {
          const playBtn = targetSlide.querySelector(
            'button[aria-label*="Воспроизведение"], [class*="PlayButtonWithCover_playButton"], button'
          );
          const clickable = playBtn || targetSlide.querySelector('[role="button"]') || targetSlide;
          if (clickable) {
            try {
              clickable.click();
            } catch (e) {
              clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }
          }
        }
      } else {
        // Fallback: search wheel React Fiber for select handlers
        triggerWheelFiberSelect(item);
      }
    }, 45);
  }

  function triggerWheelFiberSelect(item) {
    const wheelRoot = document.querySelector('[class*="WheelDesktop_root"], [class*="VibePage_wheel"]');
    if (!wheelRoot) return;

    for (const key in wheelRoot) {
      if (key.startsWith('__reactFiber$')) {
        let fiber = wheelRoot[key];
        let depth = 0;
        while (fiber && depth < 30) {
          const props = fiber.memoizedProps;
          if (props) {
            if (typeof props.onSelect === 'function') {
              try { props.onSelect(item); return; } catch (e) { }
            }
            if (typeof props.onItemClick === 'function') {
              try { props.onItemClick(item); return; } catch (e) { }
            }
            if (typeof props.playWave === 'function') {
              try { props.playWave(item); return; } catch (e) { }
            }
            if (props.wheelStore && typeof props.wheelStore.selectItem === 'function') {
              try { props.wheelStore.selectItem(item); return; } catch (e) { }
            }
          }
          fiber = fiber.return;
          depth++;
        }
      }
    }
  }


  function findSonataCoreFallback() {
    if (typeof window !== 'undefined') {
      if (typeof window.getSonataCore === 'function') {
        const c = window.getSonataCore();
        if (c) return c;
      }
      try {
        const rootEl = document.querySelector('#root') || document.querySelector('#__next') || document.body;
        if (rootEl) {
          const fiberKey = Object.keys(rootEl).find(k => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$'));
          if (fiberKey && rootEl[fiberKey]) {
            let node = rootEl[fiberKey];
            if (node.current) node = node.current;
            const queue = [node];
            while (queue.length > 0) {
              const cur = queue.shift();
              if (!cur) continue;
              const val = cur.memoizedProps?.value;
              if (val && typeof val === 'object' && val.playbackController) return val;
              if (cur.child) {
                let child = cur.child;
                while (child) {
                  queue.push(child);
                  child = child.sibling;
                }
              }
            }
          }
        }
      } catch (e) { }
    }
    return null;
  }

  function getSafeActivePlayer() {
    if (typeof window !== 'undefined' && typeof window.getActivePlayer === 'function') {
      const p = window.getActivePlayer();
      if (p) return p;
    }
    const core = (typeof getSonataCore === 'function' ? getSonataCore() : null) || findSonataCoreFallback();
    const wrapper = core?.playbackController?.activePlayback;
    return (wrapper && wrapper.value) || wrapper || null;
  }

  function isPlayerPlaying(player) {
    if (!player) return false;
    const playingState = player.playbackState?.playingState;
    if (playingState === 'playing') return true;
    const status = player.playbackState?.playerState?.status?.value || player.playbackState?.playerState?.status;
    if (status === 'playing') return true;
    return false;
  }

  function isAlbumCurrentlyPlaying(albumId) {
    if (!albumId) return { isMatch: false, isPlaying: false };
    const player = getSafeActivePlayer();
    if (!player) return { isMatch: false, isPlaying: false };

    // Если сейчас играет ТРЕЙЛЕР, обычный альбом не считается играющим
    const ctx = player.contextController?.currentContext;
    const ctxData = ctx?.contextData || ctx?.data;
    if (ctxData?.trailer === true || player.id === 'TRAILER') {
      return { isMatch: false, isPlaying: false };
    }

    const targetIdStr = String(albumId);
    let isMatch = false;

    // 1. Проверяем контекст
    const ctxType = ctx?.type || ctx?.data?.type || ctxData?.type;
    const ctxMetaId = ctx?.meta?.id || ctx?.data?.meta?.id || ctxData?.meta?.id;

    if (ctxType === 'album' && String(ctxMetaId) === targetIdStr) {
      isMatch = true;
    }

    // 2. Проверяем текущий играющий трек
    if (!isMatch) {
      const track = player.playbackState?.playerState?.track?.value || player.playbackState?.playerState?.track;
      if (track?.albums && Array.isArray(track.albums)) {
        if (track.albums.some(a => String(a.id) === targetIdStr)) {
          isMatch = true;
        }
      }
    }

    return {
      isMatch,
      isPlaying: isMatch && isPlayerPlaying(player)
    };
  }

  function isAlbumTrailerCurrentlyPlaying(albumId) {
    if (!albumId) return false;
    const player = getSafeActivePlayer();
    if (!player) return false;
    const ctx = player.contextController?.currentContext;
    const ctxData = ctx?.contextData || ctx?.data;
    const isTrailer = ctxData?.trailer === true || player.id === 'TRAILER';
    const targetIdStr = String(albumId);
    const metaId = String(ctxData?.meta?.id || ctx?.meta?.id || '');
    return isTrailer && metaId === targetIdStr && isPlayerPlaying(player);
  }

  function isStationCurrentlyPlaying(item) {
    if (!item) return { isMatch: false, isPlaying: false };
    const player = getSafeActivePlayer();
    if (!player) return { isMatch: false, isPlaying: false };

    const ctx = player.contextController?.currentContext;
    if (!ctx) return { isMatch: false, isPlaying: false };

    const ctxType = ctx?.type || ctx?.data?.type;
    const ctxMetaId = String(ctx?.meta?.id || ctx?.data?.meta?.id || '');
    const ctxSeeds = (ctx?.meta?.seeds || ctx?.data?.seeds || []).map(String);

    const targetStationId = item.stationId ? String(item.stationId) : '';
    const itemSeeds = Array.isArray(item.seeds) ? item.seeds.map(String) : [];

    let isMatch = false;
    if (targetStationId && (ctxMetaId === targetStationId || ctxSeeds.includes(targetStationId))) {
      isMatch = true;
    } else if (itemSeeds.length > 0 && ctxSeeds.length > 0) {
      if (itemSeeds.some(s => ctxSeeds.includes(s))) {
        isMatch = true;
      }
    }

    return {
      isMatch,
      isPlaying: isMatch && isPlayerPlaying(player)
    };
  }

  function updateLandingPlaybackIndicators() {
    const feed = document.getElementById('ym-vibe-live-landing-feed');
    if (!feed) return;

    // 1. Карточки Новых релизов
    const releaseButtons = feed.querySelectorAll('.ym-vibe-release-play-btn');
    releaseButtons.forEach(btn => {
      const albumId = btn.getAttribute('data-album-id');
      const state = isAlbumCurrentlyPlaying(albumId);
      const svgUse = btn.querySelector('svg use');

      if (state.isPlaying) {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#pause_filled_m');
          svgUse.setAttribute('href', '/icons/sprite.svg#pause_filled_m');
        }
        btn.setAttribute('aria-label', 'Пауза');
      } else {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#play_filled_m');
          svgUse.setAttribute('href', '/icons/sprite.svg#play_filled_m');
        }
        btn.setAttribute('aria-label', 'Воспроизведение');
      }
    });

    // 2. Карточки "Свели в AI-сет"
    const aiButtons = feed.querySelectorAll('.ym-vibe-ai-card-btn');
    aiButtons.forEach(btn => {
      let itemData = null;
      try {
        itemData = JSON.parse(btn.getAttribute('data-item') || '{}');
      } catch (e) { }

      const state = isStationCurrentlyPlaying(itemData);
      const svgUse = btn.querySelector('.ym-vibe-ai-icon use');
      const title = itemData?.title || '';

      if (state.isPlaying) {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#pause_xxs');
          svgUse.setAttribute('href', '/icons/sprite.svg#pause_xxs');
        }
        btn.setAttribute('aria-label', `Пауза: ${title}`);
      } else {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#play_xxs');
          svgUse.setAttribute('href', '/icons/sprite.svg#play_xxs');
        }
        btn.setAttribute('aria-label', title || 'Воспроизведение');
      }
    });

    // 3. Карточки "Больше открытий" (WAVES)
    const waveButtons = feed.querySelectorAll('.ym-vibe-wave-btn');
    waveButtons.forEach(btn => {
      let itemData = null;
      try {
        itemData = JSON.parse(btn.getAttribute('data-item') || '{}');
      } catch (e) { }

      const state = isStationCurrentlyPlaying(itemData);
      const svgUse = btn.querySelector('.ym-vibe-wave-icon use');
      const title = itemData?.title || '';

      if (state.isPlaying) {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#pause_xxs');
          svgUse.setAttribute('href', '/icons/sprite.svg#pause_xxs');
        }
        btn.setAttribute('aria-label', `Пауза: ${title}`);
      } else {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#play_xxs');
          svgUse.setAttribute('href', '/icons/sprite.svg#play_xxs');
        }
        btn.setAttribute('aria-label', title || 'Воспроизведение');
      }
    });

    // 4. Карточки "В стиле" (IN_STYLE)
    const inStylePlayButtons = feed.querySelectorAll('.ym-vibe-instyle-play-btn');
    inStylePlayButtons.forEach(btn => {
      const albumId = btn.getAttribute('data-album-id');
      const state = isAlbumCurrentlyPlaying(albumId);
      const svgUse = btn.querySelector('svg use');

      if (state.isPlaying) {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#pause_filled_xl');
          svgUse.setAttribute('href', '/icons/sprite.svg#pause_filled_xl');
        }
        btn.setAttribute('aria-label', 'Пауза');
      } else {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#play_filled_xl');
          svgUse.setAttribute('href', '/icons/sprite.svg#play_filled_xl');
        }
        btn.setAttribute('aria-label', 'Воспроизведение');
      }
    });

    // 5. Карточки с трейлером ("В стиле" и "Новые релизы")
    const trailerButtons = feed.querySelectorAll('.AlbumCard_trailerButton__typHh, .NewRelease_trailerButton__OYAW6');
    trailerButtons.forEach(btn => {
      const albumId = btn.getAttribute('data-album-id');
      const isPlaying = isAlbumTrailerCurrentlyPlaying(albumId);
      const svgUse = btn.querySelector('svg use');
      const isSmall = btn.classList.contains('AlbumCard_trailerButton__typHh');
      const trailerIcon = isSmall ? '/icons/sprite.svg#trailer_xxs' : '/icons/sprite.svg#trailer_xs';
      const pauseIcon = isSmall ? '/icons/sprite.svg#pause_xxs' : '/icons/sprite.svg#pause_xs';

      if (isPlaying) {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', pauseIcon);
          svgUse.setAttribute('href', pauseIcon);
        }
        btn.setAttribute('aria-label', 'Пауза: Трейлер');
      } else {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', trailerIcon);
          svgUse.setAttribute('href', trailerIcon);
        }
        btn.setAttribute('aria-label', 'Запустить трейлер');
      }
    });
  }

  async function playVibeStation(item) {
    if (!item) return false;
    const seeds = item.seeds || (item.stationId ? [item.stationId] : []);
    const stationId = item.stationId || (seeds && seeds[0]) || '';
    if (!seeds || seeds.length === 0) {
      console.warn('[BYM Vibe] No seeds found for station:', item);
      return false;
    }

    console.log('[BYM Vibe] Playing station:', item.title || stationId, seeds);

    const core = (typeof getSonataCore === 'function' ? getSonataCore() : null) ||
                 (typeof window.getSonataCore === 'function' ? window.getSonataCore() : null) ||
                 findSonataCoreFallback();
    const player = getSafeActivePlayer();

    // 1. Прямой запуск через Sonata Core factory + player.playContext (100% нативный способ)
    if (core?.factory?.createContext && player?.playContext) {
      try {
        const ctx = core.factory.createContext({
          data: {
            type: 'vibe',
            meta: { id: stationId },
            seeds: seeds,
            from: 'web-landing-discovery_block-sets_by_waves-radio-default',
            includeTracksInResponse: true,
            interactive: true
          }
        });
        console.log('[BYM Vibe] Created Vibe context:', ctx);
        await player.playContext({ context: ctx, loadContextMeta: true });
        console.log('[BYM Vibe] Station started successfully via core.factory.createContext + player.playContext!');
        return true;
      } catch (err) {
        console.error('[BYM Vibe] Error in createContext / playContext:', err);
      }
    }

    // 2. Попытка через queueController
    try {
      const qc = player?.queueController;
      if (qc) {
        if (typeof qc.playRadio === 'function') {
          await qc.playRadio({ seeds, autoPlay: true });
          return true;
        }
        if (typeof qc.setRadioQueue === 'function') {
          await qc.setRadioQueue({ seeds, autoPlay: true });
          return true;
        }
      }
    } catch (qcErr) {
      console.warn('[BYM Vibe] queueController radio error:', qcErr);
    }

    // 3. Fallback через postMessage для изолированных контекстов
    try {
      window.postMessage({
        type: 'BYM_PLAY_VIBE_STATION',
        stationId: stationId,
        seeds: seeds,
        title: item.title
      }, '*');
      return true;
    } catch (postErr) {
      console.warn('[BYM Vibe] postMessage error:', postErr);
    }

    return false;
  }


  function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return { r: 32, g: 32, b: 32 };
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6) return { r: 32, g: 32, b: 32 };
    return {
      r: parseInt(h.substring(0, 2), 16) || 0,
      g: parseInt(h.substring(2, 4), 16) || 0,
      b: parseInt(h.substring(4, 6), 16) || 0
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 1000) / 10,
      l: Math.round(l * 1000) / 10
    };
  }

  async function playAlbumContext(albumId) {
    if (!albumId) return false;
    const core = (typeof getSonataCore === 'function' ? getSonataCore() : null) ||
                 (typeof window.getSonataCore === 'function' ? window.getSonataCore() : null) ||
                 findSonataCoreFallback();
    const player = getSafeActivePlayer();

    if (core?.factory?.createContext && player?.playContext) {
      try {
        const ctx = core.factory.createContext({
          data: {
            type: 'album',
            meta: { id: String(albumId) },
            from: 'web-landing-discovery_block-new_releases-default',
            includeTracksInResponse: true,
            interactive: true
          }
        });
        await player.playContext({ context: ctx, loadContextMeta: true });
        return true;
      } catch (err) {
        console.warn('[BYM] Error playing album context via Sonata:', err);
      }
    }
    return false;
  }

  let cachedRootModel = null;

  function getYmRootModel() {
    if (cachedRootModel?.isRootModel || cachedRootModel?.pinsCollection) {
      return cachedRootModel;
    }

    if (window.__ym_root_model?.isRootModel || window.__ym_root_model?.pinsCollection) {
      cachedRootModel = window.__ym_root_model;
      return cachedRootModel;
    }

    // 1. Поиск вверх по Fiber от любого элемента страницы
    const anchor = document.querySelector('nav') ||
                   document.querySelector('header') ||
                   document.querySelector('[class*="PlayerBar"]') ||
                   document.body.firstElementChild;
    if (anchor) {
      const fiberKey = Object.keys(anchor).find(k => k.startsWith('__reactFiber$'));
      let cur = anchor[fiberKey];
      while (cur) {
        const val = cur.memoizedProps?.value;
        if (val?.isRootModel || val?.pinsCollection) {
          cachedRootModel = val;
          window.__ym_root_model = val;
          return val;
        }
        cur = cur.return;
      }
    }

    // 2. Поиск по дереву от #root
    const rootEl = document.querySelector('#root');
    const rootKey = rootEl ? Object.keys(rootEl).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$')) : null;
    if (rootEl && rootKey) {
      const stack = [rootEl[rootKey]];
      let count = 0;
      while (stack.length > 0 && count < 2500) {
        const cur = stack.pop();
        count++;
        if (!cur) continue;
        const val = cur.memoizedProps?.value;
        if (val?.isRootModel || val?.pinsCollection) {
          cachedRootModel = val;
          window.__ym_root_model = val;
          return val;
        }
        if (cur.child) stack.push(cur.child);
        if (cur.sibling) stack.push(cur.sibling);
      }
    }

    return null;
  }

  function getPinsCollection() {
    const root = getYmRootModel();
    return root?.pinsCollection || null;
  }

  function getTrailerService() {
    const root = getYmRootModel();
    if (root?.trailer && typeof root.trailer.openAlbumTrailer === 'function') {
      return root.trailer;
    }
    return null;
  }

  function isAlbumPinned(albumId) {
    if (!albumId) return false;
    const pins = getPinsCollection();
    if (!pins) return false;
    const idStr = String(albumId);
    const pinKey = `album_item${albumId}`;

    try {
      if (typeof pins.isPinned === 'function') {
        if (pins.isPinned(pinKey)) return true;
      }
    } catch (_) {}

    try {
      if (pins.index?.has && pins.index.has(pinKey)) {
        return true;
      }
    } catch (_) {}

    try {
      const items = Array.from(pins.items || []);
      return items.some(it => {
        const itId = it?.data?.id || it?.id || it?.entityId || it?.album?.id || it?.meta?.id;
        return String(itId) === idStr;
      });
    } catch (_) {}

    return false;
  }

  async function playAlbumTrailer(albumId) {
    if (!albumId) return false;
    const targetIdStr = String(albumId);

    // 1. Приоритетный путь: нативный сервис трейлера Яндекс Музыки (запуск трейлера + открытие шторки справа)
    try {
      const svc = getTrailerService();
      if (svc && typeof svc.openAlbumTrailer === 'function') {
        svc.openAlbumTrailer(targetIdStr);
        return true;
      }
    } catch (err) {
      console.warn('[BYM] Error playing trailer via native service:', err);
    }

    // 2. Фоллбек путь: воспроизведение контекста трейлера через Sonata Core
    const core = (typeof getSonataCore === 'function' ? getSonataCore() : null) ||
                 (typeof window.getSonataCore === 'function' ? window.getSonataCore() : null) ||
                 findSonataCoreFallback();
    const player = getSafeActivePlayer();

    if (core?.factory?.createContext && player?.playContext) {
      try {
        const ctx = core.factory.createContext({
          data: {
            type: 'album',
            trailer: true,
            meta: { id: targetIdStr },
            from: 'web-album-trailer-default',
            includeTracksInResponse: true,
            interactive: true
          }
        });
        await player.playContext({ context: ctx, loadContextMeta: true });
        return true;
      } catch (err) {
        console.warn('[BYM] Error playing album trailer via Sonata:', err);
      }
    }
    return false;
  }

  async function togglePinAlbum(albumId, shouldBePinned) {
    if (!albumId) return false;
    const numId = Number(albumId) || albumId;
    const pins = getPinsCollection();
    const isCurrentlyPinned = typeof shouldBePinned === 'boolean' ? !shouldBePinned : isAlbumPinned(albumId);
    const method = isCurrentlyPinned ? 'DELETE' : 'PUT';

    // Для добавления: пробуем нативный метод pinsCollection
    if (!isCurrentlyPinned && pins && typeof pins.toggleAlbumPin === 'function') {
      try {
        await pins.toggleAlbumPin({ id: numId });
        return true;
      } catch (err) {
        console.warn('[BYM] Native pin error, fallback to HTTP:', err);
      }
    }

    // Для удаления (DELETE) или фоллбека: точный HTTP REST-запрос
    try {
      await fetch('https://api.music.yandex.ru/pin/album', {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: numId }),
        credentials: 'include'
      });

      // Синхронизируем стор закрепов Яндекса, чтобы Navbar сразу обновился
      if (pins && typeof pins.getData === 'function') {
        pins.getData().catch(() => {});
      }
      return true;
    } catch (err) {
      console.warn('[BYM] Pin HTTP error:', err);
      return false;
    }
  }

  async function toggleLikeAlbum(albumId, isCurrentlyLiked) {
    if (!albumId) return false;
    const uid = window.__ym_user_id || '857786338';
    const action = isCurrentlyLiked ? 'remove' : 'add';
    try {
      await fetch(`https://api.music.yandex.ru/users/${uid}/likes/albums/${action}?album-id=${albumId}`, {
        method: 'POST',
        credentials: 'include'
      });
      fetch('https://api.music.yandex.ru/collection/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likedAlbums: { revision: Date.now() } }),
        credentials: 'include'
      }).catch(() => {});
      return true;
    } catch (err) {
      console.warn('[BYM] Like error:', err);
      return false;
    }
  }

