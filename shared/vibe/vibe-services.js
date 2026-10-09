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
    const core = (typeof getSonataCore === 'function' ? getSonataCore() : null) ||
                 (typeof window.getSonataCore === 'function' ? window.getSonataCore() : null) ||
                 findSonataCoreFallback();
    if (core?.playbackController) {
      if (typeof core.playbackController.getPlayback === 'function') {
        try {
          const mainPlayer = core.playbackController.getPlayback('MAIN') || core.playbackController.getPlayback();
          if (mainPlayer && typeof mainPlayer.playContext === 'function') return mainPlayer;
        } catch (_) {}
      }
      const val = core.playbackController.activePlayback?.value;
      if (val && typeof val.playContext === 'function') return val;
    }
    if (typeof window !== 'undefined' && typeof window.getActivePlayer === 'function') {
      try {
        const p = window.getActivePlayer();
        if (p && typeof p.playContext === 'function') return p;
      } catch (_) {}
    }
    return null;
  }

  async function safePlaySonataContext(core, player, ctx, playOptions = { loadContextMeta: true }) {
    if (!player || !ctx) return false;
    const pc = core?.playbackController;

    const doPlay = async () => {
      if (pc) {
        if (typeof pc.beforePlayHandler === 'function') {
          try { pc.beforePlayHandler(player); } catch (_) {}
        }
        if (pc.activePlayback) {
          try { pc.activePlayback.value = player; } catch (_) {}
        }
      }

      await player.playContext({ context: ctx, ...playOptions });

      try {
        if (!isPlayerPlaying(player)) {
          if (typeof player.play === 'function') await player.play();
          else if (typeof player.resume === 'function') await player.resume();
        }
      } catch (_) {}

      if (pc && typeof pc.afterPlayHandler === 'function') {
        try { pc.afterPlayHandler(player); } catch (_) {}
      }
      return true;
    };

    if (pc && typeof pc.callIfUnblocked === 'function') {
      try {
        return await pc.callIfUnblocked(doPlay);
      } catch (e) {
        console.warn('[BYM] pc.callIfUnblocked warning, falling back to direct play:', e);
        return await doPlay();
      }
    }

    return await doPlay();
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
    const svc = getTrailerService();
    const targetKey = typeof albumId === 'object'
      ? (albumId.uid && albumId.kind ? `${albumId.uid}:${albumId.kind}` : String(albumId.id || albumId.uuid || albumId.kind || ''))
      : String(albumId);

    // 1. Проверяем нативное состояние trailerService (открытая шторка)
    if (svc && svc.modal?.isOpened) {
      const activeId = String(svc.id || '');
      if (activeId && (activeId === targetKey || activeId === String(albumId.id || albumId.uuid || ''))) {
        return true;
      }
      if (typeof albumId === 'object' && albumId.uid && albumId.kind && activeId === `${albumId.uid}:${albumId.kind}`) {
        return true;
      }
    }

    // 2. Проверяем Sonata Core контекст
    const player = getSafeActivePlayer();
    if (!player) return false;
    const ctx = player.contextController?.currentContext;
    const ctxData = ctx?.contextData || ctx?.data;
    const isTrailer = ctxData?.trailer === true || player.id === 'TRAILER';
    if (!isTrailer || !isPlayerPlaying(player)) return false;

    const targetIdStr = typeof albumId === 'object' ? String(albumId.id || albumId.uuid || albumId.kind || '') : String(albumId);
    const metaId = String(ctxData?.meta?.id || ctx?.meta?.id || ctxData?.meta?.uuid || ctx?.meta?.uuid || '');
    if (metaId && (metaId === targetIdStr || metaId === targetKey)) return true;

    if (typeof albumId === 'object' && albumId.uid && albumId.kind) {
      const metaUid = String(ctxData?.meta?.uid || ctx?.meta?.uid || '');
      const metaKind = String(ctxData?.meta?.kind || ctx?.meta?.kind || '');
      if (metaUid === String(albumId.uid) && metaKind === String(albumId.kind)) return true;
    }
    return false;
  }

  function isTrackCurrentlyPlaying(trackId) {
    if (!trackId) return { isMatch: false, isPlaying: false };
    const player = getSafeActivePlayer();
    if (!player) return { isMatch: false, isPlaying: false };

    const track = player.playbackState?.playerState?.track?.value || player.playbackState?.playerState?.track;
    const currentTrackId = String(track?.id || track?.realId || '');
    const isMatch = currentTrackId === String(trackId);

    return {
      isMatch,
      isPlaying: isMatch && isPlayerPlaying(player)
    };
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

  function isPlaylistCurrentlyPlaying(playlistId, playlistObj) {
    if (!playlistId && !playlistObj) return { isMatch: false, isPlaying: false };
    const player = getSafeActivePlayer();
    if (!player) return { isMatch: false, isPlaying: false };

    const ctx = player.contextController?.currentContext;
    const ctxData = ctx?.contextData || ctx?.data;
    if (ctxData?.trailer === true || player.id === 'TRAILER') {
      return { isMatch: false, isPlaying: false };
    }

    const uuid = String(playlistObj?.playlistUuid || playlistObj?.uuid || playlistId || '');
    const kind = playlistObj?.kind ? String(playlistObj.kind) : null;
    const uid = playlistObj?.uid ? String(playlistObj.uid) : null;
    const key = (uid && kind) ? `${uid}:${kind}` : null;

    const ctxType = ctx?.type || ctx?.data?.type || ctxData?.type;
    let isMatch = false;

    if (ctxType === 'playlist') {
      const ctxMetaId = String(ctx?.meta?.id || ctx?.data?.meta?.id || ctxData?.meta?.id || '');
      const ctxUuid = String(ctx?.meta?.uuid || ctx?.meta?.playlistUuid || ctx?.data?.meta?.uuid || '');
      if (uuid && (ctxMetaId === uuid || ctxUuid === uuid)) {
        isMatch = true;
      } else if (key && (ctxMetaId === key || ctxMetaId.includes(`:${kind}`))) {
        isMatch = true;
      }
    }

    return {
      isMatch,
      isPlaying: isMatch && isPlayerPlaying(player)
    };
  }

  function isArtistCurrentlyPlaying(artistId) {
    if (!artistId) return { isMatch: false, isPlaying: false };
    const player = getSafeActivePlayer();
    if (!player) return { isMatch: false, isPlaying: false };

    const ctx = player.contextController?.currentContext;
    const ctxData = ctx?.contextData || ctx?.data;
    if (ctxData?.trailer === true || player.id === 'TRAILER') {
      return { isMatch: false, isPlaying: false };
    }

    const targetIdStr = String(artistId);
    let isMatch = false;
    const ctxType = ctx?.type || ctx?.data?.type || ctxData?.type;
    const ctxMetaId = String(ctx?.meta?.id || ctx?.data?.meta?.id || ctxData?.meta?.id || '');

    if (ctxType === 'artist' && ctxMetaId === targetIdStr) {
      isMatch = true;
    } else if (ctxType === 'vibe' && (ctxMetaId.includes(`artist:${targetIdStr}`) || ctxMetaId === targetIdStr)) {
      isMatch = true;
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

    // 6. Треки "Премьера"
    const premiereTrackButtons = feed.querySelectorAll('.ym-premiere-play-btn');
    premiereTrackButtons.forEach(btn => {
      const trackId = btn.getAttribute('data-track-id');
      const state = isTrackCurrentlyPlaying(trackId);
      const svgUse = btn.querySelector('svg use');
      const trackEl = btn.closest('.ym-vibe-premiere-track');
      const animEl = trackEl?.querySelector('.PlayingAnimation_root__YrWz7');

      if (state.isPlaying) {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#pause_filled_xs');
          svgUse.setAttribute('href', '/icons/sprite.svg#pause_filled_xs');
        }
        btn.setAttribute('aria-label', 'Пауза');
        if (animEl) animEl.classList.remove('PlayingAnimation_root_stopAnimation__qOw_g');
        if (trackEl) trackEl.classList.add('HorizontalCardContainer_playing__vP91g');
      } else {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#play_filled_xs');
          svgUse.setAttribute('href', '/icons/sprite.svg#play_filled_xs');
        }
        btn.setAttribute('aria-label', 'Воспроизведение');
        if (animEl) animEl.classList.add('PlayingAnimation_root_stopAnimation__qOw_g');
        if (trackEl) trackEl.classList.remove('HorizontalCardContainer_playing__vP91g');
      }
    });

    // 7. Карточки "Альбомы месяца" (Тренды)
    const albumMonthPlayButtons = feed.querySelectorAll('.ym-album-month-play-btn');
    albumMonthPlayButtons.forEach(btn => {
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

    const albumMonthTrailerButtons = feed.querySelectorAll('.ym-album-month-trailer-btn');
    albumMonthTrailerButtons.forEach(btn => {
      const albumId = btn.getAttribute('data-album-id');
      const isPlaying = isAlbumTrailerCurrentlyPlaying(albumId);
      const svgUse = btn.querySelector('svg use');
      const trailerIcon = '/icons/sprite.svg#trailer_xs';
      const pauseIcon = '/icons/sprite.svg#pause_xs';

      if (isPlaying) {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', pauseIcon);
          svgUse.setAttribute('href', pauseIcon);
        }
        btn.setAttribute('aria-label', 'Пауза: Трейлер');
        btn.setAttribute('title', 'Пауза: Трейлер');
      } else {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', trailerIcon);
          svgUse.setAttribute('href', trailerIcon);
        }
        btn.setAttribute('aria-label', 'Слушать трейлер');
        btn.setAttribute('title', 'Слушать трейлер');
      }
    });

    // 8. Треки "Чарт" (Тренды)
    const chartTrackButtons = feed.querySelectorAll('.ym-chart-play-btn');
    chartTrackButtons.forEach(btn => {
      const trackId = btn.getAttribute('data-track-id');
      const state = isTrackCurrentlyPlaying(trackId);
      const svgUse = btn.querySelector('svg use');
      const trackEl = btn.closest('.CommonTrack_root__i6shE');
      const animEl = trackEl?.querySelector('.PlayingAnimation_root__YrWz7');

      if (state.isPlaying) {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#pause_filled_xs');
          svgUse.setAttribute('href', '/icons/sprite.svg#pause_filled_xs');
        }
        btn.setAttribute('aria-label', 'Пауза');
        if (animEl) animEl.classList.remove('PlayingAnimation_root_stopAnimation__qOw_g');
        if (trackEl) trackEl.classList.add('HorizontalCardContainer_playing__vP91g');
      } else {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#play_filled_xs');
          svgUse.setAttribute('href', '/icons/sprite.svg#play_filled_xs');
        }
        btn.setAttribute('aria-label', 'Воспроизведение');
        if (animEl) animEl.classList.add('PlayingAnimation_root_stopAnimation__qOw_g');
        if (trackEl) trackEl.classList.remove('HorizontalCardContainer_playing__vP91g');
      }
    });

    // 9. Редакционные карточки (альбомы, плейлисты, артисты на табе Тренды)
    const editorialPlayButtons = feed.querySelectorAll('.ym-editorial-play-btn');
    editorialPlayButtons.forEach(btn => {
      const itemId = btn.getAttribute('data-item-id');
      const itemType = btn.getAttribute('data-item-type');
      let state = { isMatch: false, isPlaying: false };

      if (itemType === 'album_item') {
        state = isAlbumCurrentlyPlaying(itemId);
      } else if (itemType === 'liked_playlist_item') {
        state = isPlaylistCurrentlyPlaying(itemId);
      } else if (itemType === 'artist_item') {
        state = isArtistCurrentlyPlaying(itemId);
      }

      const svgUse = btn.querySelector('svg use');
      const card = btn.closest('.laBJlJAaqEVS0i_4Ot3l');

      if (state.isPlaying) {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#pause_filled_xl');
          svgUse.setAttribute('href', '/icons/sprite.svg#pause_filled_xl');
        }
        btn.setAttribute('aria-label', 'Пауза');
        if (card) card.classList.add('is-playing');
      } else {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#play_filled_xl');
          svgUse.setAttribute('href', '/icons/sprite.svg#play_filled_xl');
        }
        btn.setAttribute('aria-label', 'Воспроизведение');
        if (card) card.classList.remove('is-playing');
      }
    });

    const editorialTrailerButtons = feed.querySelectorAll('.ym-editorial-trailer-btn');
    editorialTrailerButtons.forEach(btn => {
      const itemId = btn.getAttribute('data-item-id');
      const itemType = btn.getAttribute('data-item-type');
      const playlistUid = btn.getAttribute('data-playlist-uid');
      const playlistKind = btn.getAttribute('data-playlist-kind');
      const target = (itemType === 'liked_playlist_item' || (playlistUid && playlistKind))
        ? { id: itemId, uuid: itemId, uid: playlistUid, kind: playlistKind }
        : itemId;
      const isPlaying = isAlbumTrailerCurrentlyPlaying(target);
      const svgUse = btn.querySelector('svg use');

      if (isPlaying) {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#pause_xxs');
          svgUse.setAttribute('href', '/icons/sprite.svg#pause_xxs');
        }
        btn.setAttribute('aria-label', 'Пауза: Трейлер');
      } else {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#trailer_xxs');
          svgUse.setAttribute('href', '/icons/sprite.svg#trailer_xxs');
        }
        btn.setAttribute('aria-label', 'Запустить трейлер');
      }
    });
  }

  async function playVibeStation(item) {
    if (!item) return false;
    const itemSeeds = Array.isArray(item.seeds) ? item.seeds.filter(Boolean).map(String) : [];
    const stationId = String(item.stationId || (itemSeeds.length > 0 ? itemSeeds[0] : '')).trim();
    const finalSeeds = itemSeeds.length > 0 ? itemSeeds : (stationId ? [stationId] : ['user:onyourwave']);
    const finalStationId = stationId || finalSeeds[0] || 'user:onyourwave';

    console.log('[BYM Vibe] Playing station:', item.title || finalStationId, finalSeeds);

    const core = (typeof getSonataCore === 'function' ? getSonataCore() : null) ||
                 (typeof window.getSonataCore === 'function' ? window.getSonataCore() : null) ||
                 findSonataCoreFallback();
    const player = getSafeActivePlayer();

    // 1. Прямой запуск через Sonata Core factory + safePlaySonataContext (100% нативный способ)
    if (core?.factory?.createContext && player) {
      try {
        const ctx = core.factory.createContext({
          data: {
            type: 'vibe',
            meta: {
              id: finalStationId,
              session: {
                wave: {
                  name: item.title || finalStationId,
                  stationId: finalStationId,
                  seeds: finalSeeds
                }
              }
            },
            seeds: finalSeeds,
            from: 'web-landing-discovery_block-sets_by_waves-radio-default',
            includeTracksInResponse: true,
            interactive: true
          }
        });
        console.log('[BYM Vibe] Created Vibe context:', ctx);
        const played = await safePlaySonataContext(core, player, ctx, { loadContextMeta: true });
        if (played) {
          console.log('[BYM Vibe] Station started successfully via safePlaySonataContext!');
          return true;
        }
      } catch (err) {
        console.error('[BYM Vibe] Error in createContext / safePlaySonataContext:', err);
      }
    }

    // 2. Попытка через queueController
    try {
      const qc = player?.queueController;
      if (qc) {
        if (typeof qc.playRadio === 'function') {
          await qc.playRadio({ seeds: finalSeeds, autoPlay: true });
          return true;
        }
        if (typeof qc.setRadioQueue === 'function') {
          await qc.setRadioQueue({ seeds: finalSeeds, autoPlay: true });
          return true;
        }
      }
    } catch (qcErr) {
      console.warn('[BYM Vibe] queueController radio error:', qcErr);
    }

    // 3. Fallback через React Fiber нативного колеса/волны (если доступно в DOM)
    try {
      if (typeof triggerWheelFiberSelect === 'function') {
        triggerWheelFiberSelect(item);
        return true;
      }
    } catch (_) {}

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

    if (core?.factory?.createContext && player) {
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
        const played = await safePlaySonataContext(core, player, ctx, { loadContextMeta: true });
        if (played) return true;
      } catch (err) {
        console.warn('[BYM] Error playing album context via Sonata:', err);
      }
    }
    return false;
  }

  async function playPlaylistTrackContext(playlistData, trackId, trackObj) {
    if (!playlistData && !trackId) return false;
    const core = (typeof getSonataCore === 'function' ? getSonataCore() : null) ||
                 (typeof window.getSonataCore === 'function' ? window.getSonataCore() : null) ||
                 findSonataCoreFallback();
    const player = getSafeActivePlayer();
    const root = getYmRootModel();

    const playlistObj = (typeof playlistData === 'object' && playlistData !== null) ? playlistData : {};
    const uuid = playlistObj.playlistUuid || playlistObj.uuid || (typeof playlistData === 'string' ? playlistData : '');
    const uid = playlistObj.uid || playlistObj.owner?.uid || window.__ym_user_id || root?.user?.uid || root?.userState?.uid || null;
    const kind = playlistObj.kind || playlistObj.playlistKind || null;
    const albumId = trackObj?.albums?.[0]?.id || trackObj?.albumId || null;

    if (core?.factory?.createContext && player) {
      // 1. Попытка через нативный контекст плейлиста
      if ((uid && kind) || uuid) {
        try {
          const playlistIdStr = (uid && kind) ? `${uid}:${kind}` : String(uuid);
          const meta = {
            id: playlistIdStr,
            playlistId: playlistIdStr,
            key: playlistIdStr
          };
          if (uuid) {
            meta.uuid = String(uuid);
            meta.playlistUuid = String(uuid);
          }
          if (uid) meta.uid = Number(uid) || uid;
          if (kind) meta.kind = Number(kind) || kind;

          const ctx = core.factory.createContext({
            data: {
              type: 'playlist',
              meta: meta,
              from: 'web-landing-discovery_block-premiere-default',
              includeTracksInResponse: true,
              interactive: true
            }
          });

          console.log('[BYM] Playing Premiere playlist context via Sonata:', { meta, trackId });

          const queueParams = trackId ? {
            initialTrackId: String(trackId),
            trackId: String(trackId),
            entityId: String(trackId)
          } : undefined;

          const played = await safePlaySonataContext(core, player, ctx, {
            loadContextMeta: true,
            queueParams
          });
          if (played) return true;
        } catch (err) {
          console.warn('[BYM] Playlist context play failed, trying fallbacks:', err);
        }
      }

      // 2. Фоллбэк: воспроизведение через контекст альбома трека (если у трека есть albumId)
      if (albumId) {
        try {
          console.log('[BYM] Playing track via Album context fallback:', { albumId, trackId });
          const albumCtx = core.factory.createContext({
            data: {
              type: 'album',
              meta: { id: String(albumId) },
              from: 'web-landing-discovery_block-premiere-default',
              includeTracksInResponse: true,
              interactive: true
            }
          });
          const played = await safePlaySonataContext(core, player, albumCtx, {
            loadContextMeta: true,
            queueParams: trackId ? {
              initialTrackId: String(trackId),
              trackId: String(trackId),
              entityId: String(trackId)
            } : undefined
          });
          if (played) return true;
        } catch (aErr) {
          console.warn('[BYM] Album context fallback failed:', aErr);
        }
      }

      // 3. Фоллбэк: воспроизведение через контекст отдельного трека
      if (trackId) {
        try {
          console.log('[BYM] Playing track via Track context fallback:', trackId);
          const trackCtx = core.factory.createContext({
            data: {
              type: 'track',
              meta: { id: String(trackId) },
              from: 'web-landing-discovery_block-premiere-default',
              includeTracksInResponse: true,
              interactive: true
            }
          });
          const played = await safePlaySonataContext(core, player, trackCtx, {
            loadContextMeta: true
          });
          if (played) return true;
        } catch (tErr) {
          console.warn('[BYM] Track context fallback failed:', tErr);
        }
      }
    }

    // 4. Фоллбэк через очередь плеера, если трек уже загружен
    if (player && trackId && typeof player.setEntityByIndex === 'function') {
      try {
        const list = player.queueController?.queue?.state?.entityList?.value;
        if (Array.isArray(list)) {
          const idx = list.findIndex(e => String(e?.entity?.id || e?.id || e?.entity?.data?.id) === String(trackId));
          if (idx !== -1) {
            player.setEntityByIndex(idx);
            if (typeof player.play === 'function') player.play();
            return true;
          }
        }
      } catch (_) {}
    }

    return false;
  }

  async function handleTrailerPlay(target, trackIndex = 0) {
    if (!target) return false;
    const root = getYmRootModel();
    const svc = getTrailerService() || root?.services?.trailerService;

    // Определяем, является ли цель плейлистом (объект или UUID)
    const isPlaylist = (typeof target === 'object' && (target.type === 'liked_playlist_item' || target.playlist || target.kind || target.playlistUuid)) ||
                       (typeof target === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target.trim()));

    if (isPlaylist) {
      console.log('[BYM] Starting playlist trailer:', target);
      if (typeof playPlaylistTrailer === 'function') {
        const res = await playPlaylistTrailer(target);
        updateLandingPlaybackIndicators();
        return res;
      }
    }

    const albumId = (typeof target === 'object' && target !== null) ? (target.albumId || target.id || target.album?.id) : target;
    const targetIdStr = String(albumId);

    if (svc) {
      if (typeof svc.openAlbumTrailer === 'function') {
        try {
          svc.openAlbumTrailer(targetIdStr);
          updateLandingPlaybackIndicators();
          return true;
        } catch (e) { }
      }
      if (typeof svc.playTrailer === 'function') {
        try {
          await svc.playTrailer({ albumId: Number(albumId) || albumId, startTrackIndex: trackIndex });
          updateLandingPlaybackIndicators();
          return true;
        } catch (e) { }
      }
    }

    const res = await playAlbumTrailer(albumId);
    updateLandingPlaybackIndicators();
    return res;
  }

  let cachedRootModel = null;

  function getYmRootModel() {
    if (cachedRootModel?.isRootModel || cachedRootModel?.pinsCollection || cachedRootModel?.likesCollection || cachedRootModel?.collections) {
      return cachedRootModel;
    }

    if (window.__ym_root_model?.isRootModel || window.__ym_root_model?.pinsCollection || window.__ym_root_model?.likesCollection) {
      cachedRootModel = window.__ym_root_model;
      return cachedRootModel;
    }

    if (window.__ym?.rootModel) {
      cachedRootModel = window.__ym.rootModel;
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
        if (val?.isRootModel || val?.pinsCollection || val?.likesCollection || val?.collections) {
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
        if (val?.isRootModel || val?.pinsCollection || val?.likesCollection || val?.collections) {
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
    return root?.pinsCollection || root?.collections?.pins || null;
  }

  function getLikesCollection() {
    const root = getYmRootModel();
    return root?.likesCollection ||
           root?.collections?.likes ||
           root?.library?.likes ||
           root?.library?.tracks ||
           root?.library ||
           root?.tracksCollection ||
           null;
  }

  function isTrackLiked(trackId) {
    if (!trackId) return false;
    const idStr = String(trackId);
    const likes = getLikesCollection();
    if (!likes) return false;

    try {
      if (typeof likes.isLiked === 'function') {
        const res = likes.isLiked(idStr) || likes.isLiked({ id: idStr, type: 'track' });
        if (typeof res === 'boolean') return res;
      }
    } catch (_) {}

    try {
      if (typeof likes.hasTrack === 'function') {
        if (likes.hasTrack(idStr)) return true;
      }
    } catch (_) {}

    try {
      if (typeof likes.has === 'function') {
        if (likes.has(idStr)) return true;
      }
    } catch (_) {}

    try {
      if (likes.index?.has && (likes.index.has(idStr) || likes.index.has(Number(trackId)))) {
        return true;
      }
    } catch (_) {}

    try {
      if (likes.tracksIndex?.has && (likes.tracksIndex.has(idStr) || likes.tracksIndex.has(Number(trackId)))) {
        return true;
      }
    } catch (_) {}

    try {
      const items = Array.from(likes.items || likes.tracks || likes.tracksList || []);
      return items.some(it => {
        const itId = it?.data?.id || it?.id || it?.entityId || it?.track?.id || it?.meta?.id;
        return String(itId) === idStr;
      });
    } catch (_) {}

    return false;
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

    if (core?.factory?.createContext && player) {
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
        const played = await safePlaySonataContext(core, player, ctx, { loadContextMeta: true });
        if (played) return true;
      } catch (err) {
        console.warn('[BYM] Error playing album trailer via Sonata:', err);
      }
    }
    return false;
  }

  async function playPlaylistTrailer(playlistTarget) {
    if (!playlistTarget) return false;
    const plObj = typeof playlistTarget === 'object' ? (playlistTarget.playlist || playlistTarget) : {};
    let uuid = plObj.playlistUuid || plObj.uuid || (typeof playlistTarget === 'string' ? playlistTarget : '');
    let uid = plObj.uid || null;
    let kind = plObj.kind || null;

    // Если uid или kind не переданы, пробуем найти их в DOM по uuid
    if ((!uid || !kind) && uuid) {
      const el = document.querySelector(`[data-item-id="${uuid}"][data-playlist-uid], [data-item-id="${uuid}"] [data-playlist-uid]`);
      if (el) {
        const targetEl = el.getAttribute('data-playlist-uid') ? el : el.querySelector('[data-playlist-uid]');
        if (targetEl) {
          uid = targetEl.getAttribute('data-playlist-uid') || uid;
          kind = targetEl.getAttribute('data-playlist-kind') || kind;
        }
      }
    }

    const playlistKey = (uid && kind) ? `${uid}:${kind}` : String(uuid);
    console.log('[BYM] playPlaylistTrailer key:', playlistKey, { uid, kind, uuid });

    // 1. Приоритетный путь: нативный trailerService Яндекс Музыки
    // Внимание: openPlaylistTrailer(a) принимает ровно одну строку формата "${uid}:${kind}"
    // и вызывает e.modal.open(), открывая боковую шторку трейлера
    try {
      const svc = getTrailerService();
      if (svc && typeof svc.openPlaylistTrailer === 'function') {
        svc.openPlaylistTrailer(String(playlistKey));
        return true;
      }
      if (svc && typeof svc.playPlaylistTrailer === 'function') {
        await svc.playPlaylistTrailer({ uid: Number(uid) || uid, kind: Number(kind) || kind, uuid });
        return true;
      }
      if (svc && typeof svc.playTrailer === 'function') {
        await svc.playTrailer({ type: 'playlist', id: playlistKey, uid, kind, uuid });
        return true;
      }
    } catch (err) {
      console.warn('[BYM] Error playing playlist trailer via trailerService:', err);
    }

    // 2. Воспроизведение трейлера плейлиста через Sonata Core
    const core = (typeof getSonataCore === 'function' ? getSonataCore() : null) ||
                 (typeof window.getSonataCore === 'function' ? window.getSonataCore() : null) ||
                 findSonataCoreFallback();
    const player = getSafeActivePlayer();

    if (core?.factory?.createContext && player) {
      try {
        const meta = { id: key };
        if (uid) meta.uid = Number(uid) || uid;
        if (kind) meta.kind = Number(kind) || kind;
        if (uuid) meta.uuid = String(uuid);

        const ctx = core.factory.createContext({
          data: {
            type: 'playlist',
            trailer: true,
            meta: meta,
            from: 'web-playlist-trailer-default',
            includeTracksInResponse: true,
            interactive: true
          }
        });
        const played = await safePlaySonataContext(core, player, ctx, { loadContextMeta: true });
        if (played) return true;
      } catch (err) {
        console.warn('[BYM] Error playing playlist trailer via Sonata:', err);
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
    const root = getYmRootModel();
    const likes = getLikesCollection();
    const numId = Number(albumId) || albumId;
    const idStr = String(albumId);

    // 1. Попытка через нативный MobX Root Model / likesCollection
    if (likes) {
      const toggleFn = likes.toggleAlbumLike || likes.toggleAlbum || likes.toggleLike || likes.toggle;
      if (typeof toggleFn === 'function') {
        try {
          console.log('[BYM] Toggling album like via MobX:', albumId);
          await toggleFn.call(likes, { id: numId, type: 'album' });
          return true;
        } catch (_) {
          try {
            await toggleFn.call(likes, idStr);
            return true;
          } catch (_) {}
        }
      }

      if (isCurrentlyLiked) {
        const removeFn = likes.removeAlbumLike || likes.removeAlbum || likes.remove;
        if (typeof removeFn === 'function') {
          try {
            await removeFn.call(likes, { id: numId, type: 'album' });
            return true;
          } catch (_) {}
        }
      } else {
        const addFn = likes.addAlbumLike || likes.addAlbum || likes.add;
        if (typeof addFn === 'function') {
          try {
            await addFn.call(likes, { id: numId, type: 'album' });
            return true;
          } catch (_) {}
        }
      }
    }

    // 2. Фоллбэк: прямой сетевой запрос без 400 sync
    const uid = window.__ym_user_id || root?.user?.uid || root?.userState?.uid;
    if (!uid) return false;
    const action = isCurrentlyLiked ? 'remove' : 'add';
    try {
      const res = await fetch(`https://api.music.yandex.ru/users/${uid}/likes/albums/${action}?album-id=${encodeURIComponent(idStr)}`, {
        method: 'POST',
        credentials: 'include'
      });
      if (likes && typeof likes.getData === 'function') {
        likes.getData().catch(() => {});
      }
      return res.ok;
    } catch (err) {
      console.warn('[BYM] Like album error:', err);
      return false;
    }
  }

  function isPlaylistPinned(playlistId, playlistObj) {
    if (!playlistId && !playlistObj) return false;
    const pins = getPinsCollection();
    if (!pins) return false;
    const uuid = String(playlistObj?.playlistUuid || playlistObj?.uuid || playlistId || '');
    const kind = playlistObj?.kind ? String(playlistObj.kind) : null;
    const uid = playlistObj?.uid ? String(playlistObj.uid) : null;
    const key = (uid && kind) ? `${uid}:${kind}` : null;

    try {
      if (typeof pins.isPinned === 'function') {
        if (uuid && pins.isPinned(`playlist_item${uuid}`)) return true;
        if (key && pins.isPinned(`playlist_item${key}`)) return true;
      }
    } catch (_) {}

    try {
      if (pins.index?.has) {
        if (uuid && pins.index.has(`playlist_item${uuid}`)) return true;
        if (key && pins.index.has(`playlist_item${key}`)) return true;
      }
    } catch (_) {}

    try {
      const items = Array.from(pins.items || []);
      return items.some(it => {
        const itId = String(it?.data?.id || it?.data?.uuid || it?.id || it?.entityId || it?.meta?.id || '');
        return (uuid && itId === uuid) || (key && itId === key);
      });
    } catch (_) {}

    return false;
  }

  async function togglePinPlaylist(playlistId, shouldBePinned, playlistObj) {
    if (!playlistId && !playlistObj) return false;
    const pins = getPinsCollection();
    const isCurrentlyPinned = typeof shouldBePinned === 'boolean' ? !shouldBePinned : isPlaylistPinned(playlistId, playlistObj);
    const method = isCurrentlyPinned ? 'DELETE' : 'PUT';
    const uuid = playlistObj?.playlistUuid || playlistObj?.uuid || playlistId;
    const uid = playlistObj?.uid || window.__ym_user_id;
    const kind = playlistObj?.kind;

    if (!isCurrentlyPinned && pins && typeof pins.togglePlaylistPin === 'function') {
      try {
        await pins.togglePlaylistPin({ uuid, uid, kind });
        return true;
      } catch (err) {
        console.warn('[BYM] Native playlist pin error, fallback to HTTP:', err);
      }
    }

    try {
      const bodyObj = (uid && kind) ? { uid: Number(uid) || uid, kind: Number(kind) || kind } : { uuid: String(uuid) };
      await fetch('https://api.music.yandex.ru/pin/playlist', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj),
        credentials: 'include'
      });
      if (pins && typeof pins.getData === 'function') {
        pins.getData().catch(() => {});
      }
      return true;
    } catch (err) {
      console.warn('[BYM] Pin playlist HTTP error:', err);
      return false;
    }
  }

  async function toggleLikePlaylist(playlistId, isCurrentlyLiked, playlistObj) {
    if (!playlistId && !playlistObj) return false;
    const root = getYmRootModel();
    const likes = getLikesCollection();
    const uid = window.__ym_user_id || root?.user?.uid || root?.userState?.uid;
    const plUid = playlistObj?.uid || uid;
    const kind = playlistObj?.kind;
    const uuid = playlistObj?.playlistUuid || playlistObj?.uuid || playlistId;

    if (likes) {
      const toggleFn = likes.togglePlaylistLike || likes.togglePlaylist || likes.toggle;
      if (typeof toggleFn === 'function') {
        try {
          await toggleFn.call(likes, { uid: plUid, kind: kind, uuid });
          return true;
        } catch (_) {}
      }
    }

    if (!uid || !kind) return false;
    const action = isCurrentlyLiked ? 'remove' : 'add';
    try {
      const res = await fetch(`https://api.music.yandex.ru/users/${uid}/likes/playlists/${action}?owner=${plUid}&kind=${kind}`, {
        method: 'POST',
        credentials: 'include'
      });
      if (likes && typeof likes.getData === 'function') {
        likes.getData().catch(() => {});
      }
      return res.ok;
    } catch (err) {
      console.warn('[BYM] Like playlist error:', err);
      return false;
    }
  }

  async function toggleLikeTrack(trackId, isCurrentlyLiked) {
    if (!trackId) return false;
    if (isCurrentlyLiked === undefined) {
      isCurrentlyLiked = typeof isTrackLiked === 'function' ? isTrackLiked(trackId) : false;
    }
    const root = getYmRootModel();
    const likes = getLikesCollection();
    const numId = Number(trackId) || trackId;
    const idStr = String(trackId);

    // 1. Приоритетный путь: нативный MobX вызов через RootModel / likesCollection
    if (likes) {
      if (isCurrentlyLiked) {
        const removeFn = likes.removeTrackLike || likes.removeTrack || likes.remove || likes.unlikeTrack || likes.dislikeTrack;
        if (typeof removeFn === 'function') {
          try {
            await removeFn.call(likes, { id: numId, type: 'track' });
            return true;
          } catch (_) {
            try {
              await removeFn.call(likes, idStr);
              return true;
            } catch (_) {}
          }
        }
      } else {
        const addFn = likes.addTrackLike || likes.addTrack || likes.add || likes.likeTrack;
        if (typeof addFn === 'function') {
          try {
            await addFn.call(likes, { id: numId, type: 'track' });
            return true;
          } catch (_) {
            try {
              await addFn.call(likes, idStr);
              return true;
            } catch (_) {}
          }
        }
      }

      const toggleFn = likes.toggleTrackLike || likes.toggleTrack || likes.toggleLike || likes.toggle;
      if (typeof toggleFn === 'function') {
        try {
          console.log('[BYM] Toggling track like via MobX collection:', trackId);
          await toggleFn.call(likes, { id: numId, type: 'track' });
          return true;
        } catch (_) {
          try {
            await toggleFn.call(likes, idStr);
            return true;
          } catch (_) {}
        }
      }
    }

    // 2. Сервис библиотеки root.library / root.services.libraryService
    const lib = root?.library || root?.services?.libraryService;
    if (lib) {
      const libToggle = lib.toggleTrackLike || lib.toggleLike || lib.likeTrack;
      if (typeof libToggle === 'function') {
        try {
          await libToggle.call(lib, idStr);
          return true;
        } catch (_) {}
      }
    }

    // 3. Фоллбэк: правильный REST API Яндекса (POST application/x-www-form-urlencoded с body: track-ids=...)
    const uid = window.__ym_user_id || root?.user?.uid || root?.userState?.uid;
    if (!uid) {
      console.warn('[BYM] Cannot toggle track like: UID unavailable');
      return false;
    }
    const action = isCurrentlyLiked ? 'remove' : 'add';
    try {
      console.log(`[BYM] Track like REST fallback: /users/${uid}/likes/tracks/${action} (track-ids: ${idStr})`);
      const resp = await fetch(`https://api.music.yandex.ru/users/${uid}/likes/tracks/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `track-ids=${encodeURIComponent(idStr)}`,
        credentials: 'include'
      });

      if (likes && typeof likes.getData === 'function') {
        likes.getData().catch(() => {});
      } else if (likes && typeof likes.sync === 'function') {
        likes.sync().catch(() => {});
      }
      return resp.ok;
    } catch (err) {
      console.warn('[BYM] Like track error:', err);
      return false;
    }
  }

