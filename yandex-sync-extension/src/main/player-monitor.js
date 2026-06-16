// Тайм-аут предохранителя для синхронизации
let syncSafetyTimeout = null;

function startSyncSafetyTimeout() {
  if (syncSafetyTimeout) clearTimeout(syncSafetyTimeout);
  syncSafetyTimeout = setTimeout(() => {
    if (isSyncingFromServer) {
      console.warn("[SYNC] Превышено время ожидания переключения трека (таймаут 4с). Сбрасываем флаг синхронизации.");
      isSyncingFromServer = false;
      targetTrackIdToSync = null;
      targetServerStateToSync = null;
    }
  }, 4000);
}

function clearSyncSafetyTimeout() {
  if (syncSafetyTimeout) {
    clearTimeout(syncSafetyTimeout);
    syncSafetyTimeout = null;
  }
}

// Поиск Sonata Core в дереве Fiber (объект с playbackController)
function findProviderInTree(rootFiber) {
  if (!rootFiber) return null;
  
  const queue = [rootFiber];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;

    if (node.memoizedProps && node.memoizedProps.value) {
      const val = node.memoizedProps.value;
      if (val && typeof val === 'object' && val.playbackController) {
        return val;
      }
    }

    if (node.child) {
      let child = node.child;
      while (child) {
        queue.push(child);
        child = child.sibling;
      }
    }
  }
  return null;
}

// Поиск вверх по дереву Fiber
function findProviderFromFiber(startFiber) {
  let fiber = startFiber;
  while (fiber) {
    if (fiber.memoizedProps && fiber.memoizedProps.value) {
      const val = fiber.memoizedProps.value;
      if (val && typeof val === 'object' && val.playbackController) {
        return val;
      }
    }
    fiber = fiber.return;
  }
  return null;
}

// Получить корневой объект Sonata Core (оптимизированный и быстрый поиск)
function getSonataCore() {
  const rootEl = document.querySelector('#root') || document.querySelector('#__next') || document.body;
  if (!rootEl) return null;

  // 1. Проверяем React-ключ на самом корневом элементе
  const containerKey = Object.keys(rootEl).find(
    key => key.startsWith('__reactContainer$') || key.startsWith('__reactFiber$')
  );
  
  if (containerKey && rootEl[containerKey]) {
    let rootFiber = rootEl[containerKey];
    if (rootFiber.current) {
      rootFiber = rootFiber.current;
    }
    return findProviderInTree(rootFiber);
  }

  // 2. Если на корне нет ключа, берем элемент плеера и идем вверх
  const playerEl = document.querySelector('[class*="player"]');
  if (playerEl) {
    const fiberKey = Object.keys(playerEl).find(key => key.startsWith('__reactFiber$'));
    if (fiberKey && playerEl[fiberKey]) {
      const found = findProviderFromFiber(playerEl[fiberKey]);
      if (found) return found;
    }
  }

  // Резервный поиск по первому попавшемуся React-элементу
  const sampleEl = rootEl.querySelector('*');
  if (sampleEl) {
    const fiberKey = Object.keys(sampleEl).find(key => key.startsWith('__reactFiber$'));
    if (fiberKey && sampleEl[fiberKey]) {
      const found = findProviderFromFiber(sampleEl[fiberKey]);
      if (found) return found;
    }
  }
  
  return null;
}

// Получить активный инстанс плеера (воспроизведения)
function getActivePlayer() {
  const core = getSonataCore();
  const activePlaybackWrapper = core?.playbackController?.activePlayback;
  if (!activePlaybackWrapper) return null;
  
  // Если activePlayback - это обертка observable (свойство value), берем значение из нее
  return activePlaybackWrapper.value || null;
}

window.getActivePlayer = getActivePlayer;

function getTrackMetadata(activePlayer) {
  try {
    const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value;
    const entityData = currentEntity?.entity?.data;
    if (!entityData) return null;

    const dataObj = entityData.meta || entityData;

    const title = dataObj.title || 'Неизвестный трек';
    const version = dataObj.version ? ` (${dataObj.version})` : '';
    const fullTitle = title + version;

    const ugcArtist = entityData?.meta?.ugcArtistName || entityData?.ugcArtistName || dataObj.ugcArtistName;
    let artistsStr = 'Неизвестный исполнитель';
    if (ugcArtist) {
      artistsStr = ugcArtist;
    } else if (Array.isArray(dataObj.artists) && dataObj.artists.length > 0) {
      artistsStr = dataObj.artists.map(a => typeof a === 'object' && a !== null ? (a.name || '') : String(a)).filter(Boolean).join(', ') || 'Неизвестный исполнитель';
    } else if (dataObj.artist) {
      artistsStr = dataObj.artist;
    }

    let durationMs = 0;
    if (dataObj.durationMs) {
      durationMs = dataObj.durationMs;
    } else if (activePlayer.playbackState?.playerState?.progress?.value?.duration) {
      durationMs = activePlayer.playbackState.playerState.progress.value.duration * 1000;
    }

    let coverUrl = '';
    const coverUri = dataObj.coverUri || dataObj.ogImage;
    if (coverUri) {
      let uri = coverUri.replace('%%', '400x400');
      if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
        if (uri.startsWith('//')) {
          uri = 'https:' + uri;
        } else {
          uri = 'https://' + uri;
        }
      }
      coverUrl = uri;
    } else {
      coverUrl = 'https://music.yandex.ru/blocks/playlist-cover/playlist-cover_like.png';
    }

    const hasLyrics = !!(
      dataObj.hasLyrics === true || 
      dataObj.lyricsInfo?.hasAvailableText === true || 
      dataObj.lyricsInfo?.hasAvailableTextSync === true || 
      dataObj.lyricsInfo?.hasAvailableTextLyrics === true || 
      dataObj.lyricsInfo?.hasAvailableSyncLyrics === true || 
      dataObj.lyrics
    );

    const mediaSourceData = currentEntity?.entity?.mediaSourceData;
    const quality = mediaSourceData?.data?.quality || '';
    const codec = mediaSourceData?.data?.codec || '';
    const bitrate = mediaSourceData?.data?.bitrate || 0;

    return {
      title: fullTitle,
      artist: artistsStr,
      durationMs,
      coverUrl,
      hasLyrics,
      quality,
      codec,
      bitrate
    };
  } catch (err) {
    console.error('[SYNC] Ошибка получения метаданных трека:', err);
    return null;
  }
}

// Проверка состояния плеера и отправка на сервер (для хоста)
function checkAndSendState() {
  try {
    if (window.isCustomAudioActive) {
      const ac = window.CustomAudioController;
      if (ac && ac.currentTrack) {
        const track = ac.currentTrack;
        const trackId = `soundcloud:${track.id}`;
        const isPause = !ac.isPlaying;
        const position = ac.audioElement ? ac.audioElement.currentTime : 0;
        const now = Date.now();

        const metadata = {
          title: track.title,
          artist: track.user ? track.user.username : 'SoundCloud Artist',
          durationMs: track.duration,
          coverUrl: track.artwork_url || (track.user && track.user.avatar_url) || '',
          hasLyrics: false,
          quality: '128kbps',
          codec: 'mp3',
          bitrate: 128
        };

        let shouldUpdate = false;
        if (trackId !== lastSentTrackId || isPause !== lastSentIsPause) {
          shouldUpdate = true;
          console.log(`[SYNC] SoundCloud локальное изменение: ${trackId}, Время: ${Math.round(position)}с, Пауза: ${isPause}`);
        } else if (!isPause) {
          const elapsed = (now - lastSentTimestamp) / 1000;
          const expectedPosition = lastSentTime + elapsed;
          if (Math.abs(position - expectedPosition) > 2) {
            shouldUpdate = true;
            console.log(`[SYNC] SoundCloud локальная перемотка: ${trackId}, Время: ${Math.round(position)}с, Пауза: ${isPause}`);
          }
        }

        if (shouldUpdate) {
          lastSentTrackId = trackId;
          lastSentIsPause = isPause;
          lastSentTime = position;
          lastSentTimestamp = now;

          window.postMessage({
            type: "FROM_MAIN",
            action: "UPDATE_STATE",
            state: {
              trackId: trackId,
              albumId: '',
              isPause: isPause,
              time: position,
              metadata: metadata
            }
          }, "*");
        }

        // Отправляем состояние на каждый тик для локального UI (например, текстов песен)
        window.postMessage({
          type: 'YM_SYNC_STATE_CHANGED',
          state: {
            trackId: trackId,
            isPause: isPause,
            position: position,
            metadata: metadata
          }
        }, '*');
      }

      // Если нативный плеер на фоне запустил проигрывание, тушим SoundCloud
      const activePlayer = getActivePlayer();
      if (activePlayer && activePlayer.playbackState?.playerState?.status?.value === 'playing') {
        console.log('[SYNC] Нативный плеер запущен поверх кастомного (мониторинг). Останавливаем кастомный.');
        if (ac) ac.stop();
      }
      return;
    }

    const activePlayer = getActivePlayer();
    if (!activePlayer) {
      if (lastPlayerFound) {
        console.warn("[SYNC] Активное воспроизведение не найдено");
        lastPlayerFound = false;
      }
      return;
    }

    if (!lastPlayerFound) {
      console.log("[SYNC] Успешно подключено к активному плееру Sonata!");
      lastPlayerFound = true;
    }

    // Однократный вывод объекта activePlayer в консоль для отладки
    if (!hasLoggedActivePlayer) {
      hasLoggedActivePlayer = true;
      window.myDebugPlayer = activePlayer; // Сохраняем глобально для отладки
      console.log("[SYNC-DEBUG] Объект activePlayer найден! Полный вывод:", activePlayer);
      
      // Запускаем инспекцию громкости
      try {
        console.log("--- ИНСПЕКЦИЯ ГРОМКОСТИ ---");
        const inspect = (obj, path = "myDebugPlayer", depth = 0) => {
          if (!obj || typeof obj !== 'object' || depth > 4) return;
          let keys = [];
          try {
            let curr = obj;
            while (curr && curr !== Object.prototype) {
              keys.push(...Object.getOwnPropertyNames(curr));
              curr = Object.getPrototypeOf(curr);
            }
          } catch(e) {}
          const uniqueKeys = [...new Set(keys)];
          for (const key of uniqueKeys) {
            if (key.toLowerCase().includes('volume') || key.toLowerCase().includes('mute')) {
              try { console.log(`[VOLUME-PROP] ${path}.${key} (${typeof obj[key]})`); } catch(e) {}
            }
            try {
              const desc = Object.getOwnPropertyDescriptor(obj, key);
              if (desc && desc.value && typeof desc.value === 'object') {
                inspect(desc.value, `${path}.${key}`, depth + 1);
              }
            } catch(e) {}
          }
        };
        inspect(activePlayer);

        const findAudio = (obj, path = "myDebugPlayer", depth = 0, visited = new Set()) => {
          if (!obj || typeof obj !== 'object' || depth > 4 || visited.has(obj)) return;
          visited.add(obj);
          if (obj instanceof HTMLAudioElement) {
            console.log(`[VOLUME-AUDIO-EL] ${path} (HTMLAudioElement), volume:`, obj.volume);
            return;
          }
          for (const key in obj) {
            try { findAudio(obj[key], `${path}.${key}`, depth + 1, visited); } catch(e) {}
          }
        };
        findAudio(activePlayer);
      } catch (e) {
        console.error("Ошибка при инспекции громкости:", e);
      }
      console.log("[SYNC-DEBUG] Ключи activePlayer:", Object.keys(activePlayer));
      console.log("[SYNC-DEBUG] get() метод:", typeof activePlayer.get);
      if (typeof activePlayer.get === 'function') {
        try {
          console.log("[SYNC-DEBUG] Результат get():", activePlayer.get());
        } catch (e) {
          console.error("[SYNC-DEBUG] Ошибка get():", e);
        }
      }
      console.log("[SYNC-DEBUG] observableValue:", activePlayer.observableValue);
      if (activePlayer.observableValue) {
        console.log("[SYNC-DEBUG] Ключи observableValue:", Object.keys(activePlayer.observableValue));
        console.log("[SYNC-DEBUG] Прототип observableValue:", Object.getPrototypeOf(activePlayer.observableValue));
      }
      console.log("[SYNC-DEBUG] Прототип activePlayer:", Object.getPrototypeOf(activePlayer));
      try {
        const proto = Object.getPrototypeOf(activePlayer);
        console.log("[SYNC-DEBUG] Дескрипторы прототипа:", Object.getOwnPropertyDescriptors(proto));
      } catch(e) {}
      
      if (activePlayer.playbackState) {
        console.log("[SYNC-DEBUG] playbackState:", activePlayer.playbackState);
      }
      try {
        const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value;
        console.log("[SYNC-DEBUG] currentEntity:", currentEntity);
        if (currentEntity) {
          console.log("[SYNC-DEBUG] currentEntity.entity:", currentEntity.entity);
          console.log("[SYNC-DEBUG] currentEntity.entity.data:", currentEntity.entity?.data);
          console.log("[SYNC-DEBUG] albums:", currentEntity.entity?.data?.albums);
        }
      } catch (e) {}
    }

    if (isSyncingFromServer) {
      let trackId = null;
      try {
        const playerStateTrack = activePlayer.playbackState?.playerState?.track?.value || activePlayer.playbackState?.playerState?.track;
        const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value;
        const entityData = currentEntity?.entity?.data;

        trackId = playerStateTrack?.id || entityData?.meta?.id || entityData?.id;
      } catch (err) {
        // Игнорируем ошибки mobx-state-tree во время сброса/перезаписи очереди
      }
      
      if (trackId && targetTrackIdToSync && String(trackId) === String(targetTrackIdToSync)) {
        console.log(`[SYNC] Успешно переключились на целевой трек: ${trackId}. Синхронизация завершена.`);
        clearSyncSafetyTimeout();
        if (targetServerStateToSync) {
          syncPlayerControls(activePlayer, targetServerStateToSync);
        }
        isSyncingFromServer = false;
        targetTrackIdToSync = null;
        targetServerStateToSync = null;
      } else {
        return;
      }
    }

    const playerStateTrack = activePlayer.playbackState?.playerState?.track?.value || activePlayer.playbackState?.playerState?.track;
    const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value;
    const entityData = currentEntity?.entity?.data;
    
    const rawTrackId = playerStateTrack?.id || entityData?.meta?.id || entityData?.id;
    if (!rawTrackId) return;
    let trackId = String(rawTrackId);
    if (trackId.trim() === '' || trackId === 'undefined' || trackId === 'null') return;

    // Map UGC SoundCloud tracks to a universal soundcloud: ID for shared session sync
    const filename = entityData?.meta?.filename || entityData?.filename || '';
    if ((entityData?.meta?.trackSource === 'UGC' || entityData?.trackSource === 'UGC') && filename.startsWith('soundcloud_')) {
      const match = filename.match(/soundcloud_(\d+)\.mp3/);
      if (match) {
        trackId = `soundcloud:${match[1]}`;
      }
    }

    const context = currentEntity?.context;
    const contextId = context?.data?.meta?.id || context?.data?.id;

    let urlAlbumId = '';
    const albumMatch = window.location.pathname.match(/\/album\/(\d+)/);
    if (albumMatch) {
      urlAlbumId = albumMatch[1];
    }

    const rawAlbumId = (context?.data?.type === 'album' && contextId) || entityData?.albums?.[0]?.id || urlAlbumId || '';
    const albumId = (rawAlbumId && rawAlbumId !== 'NaN' && !isNaN(Number(rawAlbumId))) ? String(rawAlbumId) : '';

    const isPlaying = activePlayer.playbackState.playerState.status.value === 'playing';
    const isPause = !isPlaying;



    const progress = activePlayer.playbackState.playerState.progress.value;
    const now = Date.now();

    const metadata = getTrackMetadata(activePlayer);

    const position = progress?.position || 0;

    let shouldUpdate = false;

    if (trackId !== lastSentTrackId || isPause !== lastSentIsPause) {
      shouldUpdate = true;
      console.log(`[SYNC] Локальное изменение: Трек ID: ${trackId}, Время: ${Math.round(position)}с, Пауза: ${isPause}`);
      if (trackId !== lastSentTrackId) {
        console.log("[SYNC-DEBUG] Данные нового трека (currentEntity):", currentEntity);
        console.log("[SYNC-DEBUG] albums:", entityData?.albums);
      }
    } else if (isPlaying) {
      const elapsed = (now - lastSentTimestamp) / 1000;
      const expectedPosition = lastSentTime + elapsed;
      if (Math.abs(position - expectedPosition) > 2) {
        shouldUpdate = true;
        console.log(`[SYNC] Локальная перемотка: Трек ID: ${trackId}, Время: ${Math.round(position)}с (ручной сдвиг с ${Math.round(expectedPosition)}с), Пауза: ${isPause}`);
      }
    }

    if (shouldUpdate) {
      lastSentTrackId = trackId;
      lastSentIsPause = isPause;
      lastSentTime = position;
      lastSentTimestamp = now;

      window.postMessage({
        type: "FROM_MAIN",
        action: "UPDATE_STATE",
        state: {
          trackId: trackId,
          albumId: albumId,
          isPause: isPause,
          time: position,
          metadata: metadata
        }
      }, "*");
    }

    // Отправляем состояние на каждый тик для локального UI (например, текстов песен)
    window.postMessage({
      type: 'YM_SYNC_STATE_CHANGED',
      state: {
        trackId: trackId,
        isPause: isPause,
        position: position,
        metadata: getTrackMetadata(activePlayer)
      }
    }, '*');
  } catch (globalErr) {
    console.warn("[SYNC] Ошибка в цикле мониторинга плеера (возможно, идет переинициализация):", globalErr.message || globalErr);
  }
}

// Запускаем мониторинг плеера
setInterval(checkAndSendState, 500);

// Синхронизация контролов плеера с данными от сервера
function syncPlayerControls(activePlayer, serverState) {
  const isPlaying = activePlayer.playbackState.playerState.status.value === 'playing';
  const isPause = !isPlaying;

  console.log(`[SYNC] Применяем состояние от сервера: Трек ID: ${serverState.trackId}, Время: ${Math.round(serverState.time)}с, Пауза: ${serverState.isPause}`);

  // 1. Синхронизируем паузу/плей
  if (serverState.isPause !== isPause) {
    if (serverState.isPause) {
      console.log("[SYNC] -> Пытаемся поставить на паузу. Методы pause/play:", typeof activePlayer.pause, typeof activePlayer.play);
      if (typeof activePlayer.pause === 'function') {
        activePlayer.pause();
      } else {
        console.warn("[SYNC] -> Метод pause не найден на activePlayer!");
      }
    } else {
      console.log("[SYNC] -> Пытаемся включить воспроизведение. Методы resume/play:", typeof activePlayer.resume, typeof activePlayer.play);
      if (typeof activePlayer.resume === 'function') {
        activePlayer.resume();
      } else if (typeof activePlayer.play === 'function') {
        console.log("[SYNC] -> Используем метод play() вместо resume()");
        activePlayer.play();
      } else {
        console.warn("[SYNC] -> Методы resume или play не найдены в activePlayer!");
      }
    }
  }

  // 2. Синхронизируем позицию (перемотку)
  const progress = activePlayer.playbackState.playerState.progress.value;
  const currentPosition = progress?.position || 0;

  if (Math.abs(currentPosition - serverState.time) > 2) {
    console.log(`[SYNC] -> Перемотка через API: ${Math.round(currentPosition)}с -> ${Math.round(serverState.time)}с`);
    activePlayer.setProgress(serverState.time);
  }

  // Обновляем локальный кэш отправки, чтобы предотвратить эхо-эффект
  lastSentTrackId = serverState.trackId;
  lastSentIsPause = serverState.isPause;
  lastSentTime = serverState.time;
  lastSentTimestamp = Date.now();
}
