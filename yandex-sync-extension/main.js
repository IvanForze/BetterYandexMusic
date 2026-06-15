// --- Component: main/variables.js ---
let lastSentTrackId = null;
let lastSentIsPause = null;
let lastSentTime = 0;
let lastSentTimestamp = 0;
let lastSentQuality = null;
let lastSentCodec = null;
let isSyncingFromServer = false;
let targetTrackIdToSync = null;
let targetServerStateToSync = null;
let lastPlayerFound = false;
let hasLoggedActivePlayer = false;


// --- Component: main/player-monitor.js ---
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
    const trackId = String(rawTrackId);
    if (trackId.trim() === '' || trackId === 'undefined' || trackId === 'null') return;

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


// --- Component: shared/soundcloud-api.js ---
// ==========================================
// SOUNDCLOUD API (MAIN world)
// Communicates via window.postMessage → isolated bridge → background
// ==========================================

const SoundCloudAPI = {
  _pendingRequests: {},
  _initialized: false,

  _init() {
    if (this._initialized) return;
    this._initialized = true;

    // Listen for responses from the isolated bridge
    window.addEventListener('message', (event) => {
      if (!event.data || !event.data.__ym_sc_bridge_response) return;
      const { requestId, response } = event.data;
      const pending = SoundCloudAPI._pendingRequests[requestId];
      if (pending) {
        delete SoundCloudAPI._pendingRequests[requestId];
        if (response && response.ok) {
          pending.resolve(response);
        } else {
          pending.reject(new Error(response && response.error ? response.error : 'Unknown bridge error'));
        }
      }
    });
  },

  _sendToBridge(type, payload) {
    this._init();
    return new Promise((resolve, reject) => {
      const requestId = `sc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      this._pendingRequests[requestId] = { resolve, reject };

      // Timeout safety (increased to 60s for media transfer & upload retries)
      setTimeout(() => {
        if (this._pendingRequests[requestId]) {
          delete this._pendingRequests[requestId];
          reject(new Error('Bridge request timed out'));
        }
      }, 60000);

      window.postMessage({
        __ym_sc_bridge: true,
        requestId,
        type,
        payload
      }, '*');
    });
  },

  async searchTracks(query, limit = 10) {
    try {
      const result = await this._sendToBridge('SC_SEARCH', { query, limit });
      return result.tracks || [];
    } catch (err) {
      console.error('[SOUNDCLOUD] searchTracks error:', err);
      return [];
    }
  },

  async getStreamUrl(track) {
    try {
      const result = await this._sendToBridge('SC_GET_STREAM', { track });
      return result.url || null;
    } catch (err) {
      console.error('[SOUNDCLOUD] getStreamUrl error:', err);
      return null;
    }
  },

  async getTrackInfo(trackId) {
    try {
      const result = await this._sendToBridge('SC_GET_TRACK', { trackId });
      return result.track || null;
    } catch (err) {
      console.error('[SOUNDCLOUD] getTrackInfo error:', err);
      return null;
    }
  },

  // Fetches audio via the isolated bridge (bypasses media-src CSP by creating a yandex.ru blob URL)
  async fetchAudioBlob(streamUrl) {
    try {
      const result = await this._sendToBridge('SC_FETCH_AUDIO', { url: streamUrl });
      return result.url || null;
    } catch (err) {
      console.error('[SOUNDCLOUD] fetchAudioBlob error:', err);
      return null;
    }
  }
};

window.SoundCloudAPI = SoundCloudAPI;


// --- Component: shared/custom-audio.js ---
// ==========================================
// CUSTOM AUDIO CONTROLLER
// ==========================================

const CustomAudioController = {
    audioElement: null,
    isPlaying: false,
    currentTrack: null,
    onStateChange: null, // Callback for UI updates

    init() {
        if (!this.audioElement) {
            this.audioElement = document.createElement('audio');
            this.audioElement.id = 'ym-sync-custom-audio';
            this.audioElement.style.display = 'none';
            document.body.appendChild(this.audioElement);

            this.audioElement.addEventListener('timeupdate', () => this.emitState());
            this.audioElement.addEventListener('play', () => {
                this.isPlaying = true;
                this.emitState();
            });
            this.audioElement.addEventListener('pause', () => {
                this.isPlaying = false;
                this.emitState();
            });
            this.audioElement.addEventListener('ended', () => {
                this.isPlaying = false;
                this.emitState();
                // Optionally play next track if we implement a custom queue
            });
            
            // Set volume to match native player on init, default to 0.7
            this.audioElement.volume = 0.7;
        }
    },

    emitState() {
        if (this.onStateChange) {
            this.onStateChange({
                track: this.currentTrack,
                isPlaying: this.isPlaying,
                currentTime: this.audioElement ? this.audioElement.currentTime : 0,
                duration: this.audioElement && this.audioElement.duration ? this.audioElement.duration : (this.currentTrack ? this.currentTrack.duration / 1000 : 0)
            });
        }
    },

    async playTrack(track, streamUrl) {
        this.init();
        
        // 1. Pause native player
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && typeof activePlayer.pause === 'function') {
            window.isCustomAudioActive = true;
            activePlayer.pause();
        } else {
            window.isCustomAudioActive = true;
        }

        // 2. Set track info immediately so UI can update
        this.currentTrack = track;
        this.emitState();

        // 3. Get blob URL (fetched by isolated bridge — bypasses media-src CSP)
        console.log('[CUSTOM AUDIO] Fetching audio blob for:', track.title);
        const blobUrl = await window.SoundCloudAPI.fetchAudioBlob(streamUrl);
        if (!blobUrl) {
            console.error('[CUSTOM AUDIO] Failed to get blob URL');
            window.isCustomAudioActive = false;
            this.currentTrack = null;
            return;
        }

        // 4. Revoke any previous blob URL to free memory
        if (this._currentBlobUrl) {
            URL.revokeObjectURL(this._currentBlobUrl);
        }
        this._currentBlobUrl = blobUrl;

        // 5. Play
        this.audioElement.src = blobUrl;
        this.audioElement.currentTime = 0;
        try {
            await this.audioElement.play();
        } catch (err) {
            console.error('[CUSTOM AUDIO] Play error:', err);
        }
    },

    togglePlayPause() {
        if (!this.audioElement) return;
        if (this.audioElement.paused) {
            this.audioElement.play();
        } else {
            this.audioElement.pause();
        }
    },

    seek(time) {
        if (!this.audioElement) return;
        this.audioElement.currentTime = time;
    },

    setVolume(vol) {
        if (!this.audioElement) return;
        this.audioElement.volume = vol;
    },

    async syncPlay(scTrackId, serverState) {
        this.init();

        const numericId = String(scTrackId).replace('soundcloud:', '');

        // If the same track is already loaded
        if (this.currentTrack && String(this.currentTrack.id) === numericId) {
            // Apply play/pause state
            if (serverState.isPause) {
                if (!this.audioElement.paused) {
                    this.audioElement.pause();
                }
            } else {
                if (this.audioElement.paused) {
                    this.audioElement.play().catch(e => console.error('[CUSTOM AUDIO] Play error on sync:', e));
                }
            }

            // Apply seek position
            if (Math.abs(this.audioElement.currentTime - serverState.time) > 2) {
                console.log(`[CUSTOM AUDIO] Seek sync: ${this.audioElement.currentTime} -> ${serverState.time}`);
                this.audioElement.currentTime = serverState.time;
            }
            return;
        }

        console.log('[CUSTOM AUDIO] Syncing new SoundCloud track:', numericId);

        // 1. Pause native player
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && typeof activePlayer.pause === 'function') {
            activePlayer.pause();
        }
        window.isCustomAudioActive = true;

        // 2. Fetch track info from SoundCloud
        const track = await window.SoundCloudAPI.getTrackInfo(numericId);
        if (!track) {
            console.error('[CUSTOM AUDIO] Failed to fetch track info for:', numericId);
            return;
        }

        // 3. Get stream URL
        const streamUrl = await window.SoundCloudAPI.getStreamUrl(track);
        if (!streamUrl) {
            console.error('[CUSTOM AUDIO] Failed to get stream URL for track:', numericId);
            return;
        }

        // 4. Fetch audio blob
        const blobUrl = await window.SoundCloudAPI.fetchAudioBlob(streamUrl);
        if (!blobUrl) {
            console.error('[CUSTOM AUDIO] Failed to get audio blob for track:', numericId);
            return;
        }

        // Revoke old blob url
        if (this._currentBlobUrl) {
            URL.revokeObjectURL(this._currentBlobUrl);
        }
        this._currentBlobUrl = blobUrl;

        this.currentTrack = track;
        this.audioElement.src = blobUrl;
        this.audioElement.currentTime = serverState.time || 0;

        if (serverState.isPause) {
            this.audioElement.pause();
        } else {
            try {
                await this.audioElement.play();
            } catch (err) {
                console.error('[CUSTOM AUDIO] Play error on initial sync:', err);
            }
        }

        this.emitState();
    },

    stop() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
        }
        this.isPlaying = false;
        this.currentTrack = null;
        window.isCustomAudioActive = false;
        this.emitState();
    }
};

window.CustomAudioController = CustomAudioController;


// --- Component: shared/player-faker.js ---
// ==========================================
// UI FAKER (FULL PLAYER OVERLAY)
// ==========================================

const PlayerFaker = {
    overlayActive: false,
    updateInterval: null,
    initialized: false,
    _progressDragging: false,
    spriteMuteId: 'volumeMute_xs',
    spritePauseId: 'pause_filled_l',
    spritePlayId: 'play_filled_l',
    lastLoadedArtworkUrl: null,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        // Inject the CSS rule to hide original elements when custom player is active
        const style = document.createElement('style');
        style.id = 'ym-sync-player-faker-styles';
        style.textContent = `
            body.ym-sync-player-active [class*="PlayerBar_root"],
            body.ym-sync-player-active [class*="PlayerBarDesktop_root"],
            body.ym-sync-player-active [class*="player-bar"],
            body.ym-sync-player-active [class*="CommonLayout_player"],
            body.ym-sync-player-active [class*="DefaultLayout_player"] {
                z-index: 99999 !important;
            }
            body.ym-sync-player-active [class*="PlayerBarDesktopWithBackgroundProgressBar_player"],
            body.ym-sync-player-active [class*="PlayerBar_player"],
            body.ym-sync-player-active [class*="PlayerBarDesktop_player"] {
                display: none !important;
            }
        `;
        document.head.appendChild(style);

        // Register callback with CustomAudioController
        window.CustomAudioController.onStateChange = (state) => {
            if (state.track !== null) {
                if (!this.overlayActive) {
                    this.activateOverlay(state);
                } else {
                    this.updateUI(state);
                }
            } else {
                if (this.overlayActive) {
                    this.deactivateOverlay();
                }
            }
        };

        // Listen to native audio play events to deactivate custom player immediately
        document.addEventListener('play', (e) => {
            if (e.target && e.target.tagName === 'AUDIO' && e.target.id !== 'ym-sync-custom-audio') {
                console.log('[SYNC] Native audio play detected. Stopping custom audio.');
                if (window.CustomAudioController) {
                    window.CustomAudioController.stop();
                }
            }
        }, true);

        // Fetch sprite icons dynamically at startup
        fetch('/icons/sprite.svg')
            .then(res => res.text())
            .then(text => {
                const ids = [...text.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
                
                // Prioritize large icons with '_l' suffix for play/pause buttons
                const pauseId = ids.find(id => id === 'pause_filled_l') || 
                                ids.find(id => id.startsWith('pause_filled') || id.startsWith('pause'));
                if (pauseId) this.spritePauseId = pauseId;
                
                const playId = ids.find(id => id === 'play_filled_l') || 
                               ids.find(id => id.startsWith('play_filled') || id.startsWith('play'));
                if (playId) this.spritePlayId = playId;

                const muteId = ids.find(id => id === 'volumeMute_xs') ||
                               ids.find(id => id.toLowerCase().includes('mute') || id.toLowerCase().includes('off'));
                if (muteId) this.spriteMuteId = muteId;

                console.log('[FAKER] Detected sprite IDs:', {
                    mute: this.spriteMuteId,
                    pause: this.spritePauseId,
                    play: this.spritePlayId
                });
            })
            .catch(err => {
                console.warn('[FAKER] Failed to query sprite.svg, using standard keys:', err);
            });
    },

    findPlayerBar() {
        return document.querySelector('[class*="PlayerBarDesktopWithBackgroundProgressBar_player"]') ||
               document.querySelector('[class*="PlayerBar_player"]') ||
               document.querySelector('[class*="PlayerBarDesktop_player"]');
    },

    activateOverlay(state) {
        this.overlayActive = true;

        const playerBar = this.findPlayerBar();
        if (!playerBar) {
            console.warn('[FAKER] Player bar not found');
            return;
        }

        const playerBarParent = playerBar.parentElement;
        if (!playerBarParent) {
            console.warn('[FAKER] Player bar parent not found');
            return;
        }

        // Remove any previous overlay
        const old = document.getElementById('ym-sync-player-overlay');
        if (old) old.remove();

        // Measure native player bar height to prevent layout collapse
        const nativeHeight = playerBar.offsetHeight || 64;

        // Add class to body to trigger CSS rules
        document.body.classList.add('ym-sync-player-active');

        const overlay = document.createElement('div');
        overlay.id = 'ym-sync-player-overlay';
        overlay.style.cssText = `
            position: relative !important;
            width: 100% !important;
            height: ${nativeHeight}px !important;
            z-index: 99999 !important;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-sizing: border-box;
            background: var(--ym-background-color-primary-enabled-player, rgba(24, 24, 28, 0.95)) !important;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-top: 1px solid var(--yp-color-border-primary, rgba(255, 255, 255, 0.05)) !important;
            color: #fff;
            font-family: Inter, system-ui, sans-serif;
            padding: 0 24px;
            pointer-events: auto;
        `;

        overlay.innerHTML = `
            <!-- Progress Bar (Full Width at the Top) -->
            <div id="sc-ov-progress-container" style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 2px;
                cursor: pointer;
                background: rgba(255, 255, 255, 0.08);
                z-index: 10;
                transition: height 0.1s;
            ">
                <div id="sc-ov-progress-fill" style="
                    height: 100%;
                    width: 0%;
                    background: #ffe000;
                "></div>
                <input id="sc-ov-seek" type="range" min="0" max="1" step="0.001" value="0" style="
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    cursor: pointer;
                    margin: 0;
                    padding: 0;
                ">
            </div>

            <!-- Left Section: Cover + Title + Artist -->
            <div class="PlayerBarDesktopWithBackgroundProgressBar_info__YnvZ_">
                <div class="PlayerBarDesktopWithBackgroundProgressBar_infoCard__i0cbW">
                    <div class="qaIScXjx1qyXuaIHXQIo _7gw1qGE6BeUAdSMbhRx ZcpulvHgF_wsgzB8Hye9 PlayerBarDesktopWithBackgroundProgressBar_coverContainer__dkNCG" style="width: 42px !important; height: 42px !important; overflow: hidden !important; border-radius: 4px !important; flex-shrink: 0 !important; display: block !important;">
                        <img id="sc-ov-cover" class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG PlayerBarDesktopWithBackgroundProgressBar_cover__MKmEt" alt="" loading="eager" src="" style="width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important;">
                    </div>
                    <div class="PlayerBarDesktopWithBackgroundProgressBar_description__5jHke">
                        <div class="Meta_root__R8n1h Meta_root_withSecondaryColor___uENY">
                            <div class="Meta_metaContainer__7i2dp">
                                <div class="Meta_titleContainer__gDuXr">
                                    <div class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR Meta_text__Y5uYH" style="-webkit-line-clamp: 1;">
                                        <span class="_MWOVuZRvUQdXKTMcOPx Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR Meta_text__Y5uYH Meta_title__GGBnH" id="sc-ov-title"></span>
                                    </div>
                                    <span class="Meta_explicitMarkContainer__BxMQg" style="margin-left: 6px; display: inline-flex; align-items: center; vertical-align: middle;">
                                        <svg width="22" height="10" viewBox="0 0 22 10" fill="none" style="flex-shrink: 0; vertical-align: middle;">
                                            <rect width="22" height="10" rx="2" fill="#ff5500"/>
                                            <text x="11" y="7.5" text-anchor="middle" fill="white" font-size="6" font-weight="bold" font-family="Arial,sans-serif">SC</text>
                                        </svg>
                                    </span>
                                </div>
                                <div class="SeparatedArtists_root_variant_breakAll__34YbW SeparatedArtists_root_clamp__SyvjM Meta_text__Y5uYH Meta_artists__VnR52" style="-webkit-line-clamp: 1;">
                                    <span class="_MWOVuZRvUQdXKTMcOPx Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR Meta_text__Y5uYH Meta_artistCaption__JESZi" id="sc-ov-artist"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Center Section: Play/Pause button -->
            <div class="PlayerBarDesktopWithBackgroundProgressBar_sonata__mGFb_ PlayerBarDesktopWithBackgroundProgressBar_sonata_withReversedControls__9TjDN" style="justify-content: center; flex: 1;">
                <div class="BaseSonataControlsDesktop_root__E6wjA PlayerBarDesktopWithBackgroundProgressBar_sonataControls__rSmXQ PlayerBarDesktopWithBackgroundProgressBar_important__HzXrK SonataControls_root__w8uqu" style="justify-content: center;">
                    <div class="BaseSonataControlsDesktop_sonataButtons__7vLtw" style="margin: 0;">
                        <button id="sc-ov-play" class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr undefined qU2apWBO1yyEK0lZ3lPO WsKeF73pWotx9W1tWdYY BaseSonataControlsDesktop_sonataButton__GbwFt" type="button" aria-label="Воспроизведение" aria-live="off" aria-busy="false">
                            <span class="JjlbHZ4FaP9EAcR_1DxF">
                                <svg class="J9wTKytjOWG73QMoN5WP BaseSonataControlsDesktop_playButtonIcon__TlFqv YjRa1ZjM_lXFlrfS7jcu" focusable="false" aria-hidden="true" id="sc-ov-play-svg">
                                    <use xlink:href="/icons/sprite.svg#play_filled_l"></use>
                                </svg>
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Right Section: Lyrics + Volume -->
            <div class="PlayerBarDesktopWithBackgroundProgressBar_meta__FhKTC" style="position: relative; display: flex; align-items: center; gap: 8px;">
                <!-- Lyrics Button -->
                <button id="sc-ov-lyrics" class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO undefined" type="button" aria-label="Включить текстомузыку Может нарушить доступность" aria-live="off" aria-busy="false">
                    <span class="JjlbHZ4FaP9EAcR_1DxF">
                        <svg class="J9wTKytjOWG73QMoN5WP UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true">
                            <use xlink:href="/icons/sprite.svg#syncLyrics_xs"></use>
                        </svg>
                    </span>
                </button>
                
                <!-- Volume Control -->
                <div class="ChangeVolume_root__HDxtA">
                    <div class="ChangeVolume_sliderContainer__pvOZa">
                        <div class="ChangeVolume_wrapperSlider__9S1Vi">
                            <input id="sc-ov-volume-slider" class="JkKcxRVvjK7lcakkEliC qpvIbN4_hF6CqK0bjCq7 SHvrm0VRiLVwGqJJjNO8 undefined ChangeVolume_slider__fCKGZ ChangeVolume_important__ZIYpu" max="1" step="0.01" aria-label="Управление громкостью" type="range" value="0.72">
                        </div>
                    </div>
                    <button id="sc-ov-volume-btn" class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO undefined ChangeVolume_button__4HLEr" type="button" aria-label="Выключить звук" aria-live="off" aria-busy="false">
                        <span class="JjlbHZ4FaP9EAcR_1DxF">
                            <svg class="J9wTKytjOWG73QMoN5WP ChangeVolume_icon__5Zv2a UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true" id="sc-ov-volume-svg">
                                <use xlink:href="/icons/sprite.svg#volume_xs"></use>
                            </svg>
                        </span>
                    </button>
                </div>
            </div>
        `;

        playerBarParent.appendChild(overlay);

        // === Stop event propagation on the overlay to prevent Yandex Music event handlers from triggering ===
        overlay.addEventListener('click', (e) => e.stopPropagation());
        overlay.addEventListener('mousedown', (e) => e.stopPropagation());
        overlay.addEventListener('mouseup', (e) => e.stopPropagation());
        overlay.addEventListener('keydown', (e) => e.stopPropagation());
        overlay.addEventListener('keyup', (e) => e.stopPropagation());

        // === Micro-animations for progress bar ===
        const progressContainer = overlay.querySelector('#sc-ov-progress-container');
        progressContainer.addEventListener('mouseenter', () => {
            progressContainer.style.height = '6px';
        });
        progressContainer.addEventListener('mouseleave', () => {
            progressContainer.style.height = '2px';
        });

        // === Wire up buttons ===
        const playBtn      = overlay.querySelector('#sc-ov-play');
        const lyricsBtn    = overlay.querySelector('#sc-ov-lyrics');
        const seekInput    = overlay.querySelector('#sc-ov-seek');
        const progressFill = overlay.querySelector('#sc-ov-progress-fill');

        const volumeSlider = overlay.querySelector('#sc-ov-volume-slider');
        const volumeBtn    = overlay.querySelector('#sc-ov-volume-btn');
        const volumeSvg    = overlay.querySelector('#sc-ov-volume-svg');

        // Play/Pause toggle
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.CustomAudioController.togglePlayPause();
        });

        // Lyrics toggle
        lyricsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof toggleNativeFullscreen === 'function') {
                toggleNativeFullscreen();
            } else {
                window.postMessage({ type: 'FROM_MAIN', action: 'TOGGLE_LYRICS' }, '*');
            }
        });

        // Seek bar
        seekInput.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this._progressDragging = true;
        });
        seekInput.addEventListener('mouseup', (e) => {
            e.stopPropagation();
            this._progressDragging = false;
            const audio = window.CustomAudioController.audioElement;
            if (audio && audio.duration) {
                audio.currentTime = seekInput.value * audio.duration;
            }
        });
        seekInput.addEventListener('input', (e) => {
            e.stopPropagation();
            const pct = parseFloat(seekInput.value) * 100;
            progressFill.style.transition = 'none';
            progressFill.style.width = pct + '%';
        });

        // Volume control styling helper
        const updateSliderStyle = (vol) => {
            const pct = Math.round(vol * 100);
            volumeSlider.style.backgroundSize = `${pct}% 100%`;
            volumeSlider.style.setProperty('--seek-before-width', `${pct}%`);
        };

        const updateVolumeIcon = (vol) => {
            const useEl = volumeSvg.querySelector('use');
            if (useEl) {
                if (vol === 0) {
                    useEl.setAttribute('xlink:href', `/icons/sprite.svg#${this.spriteMuteId}`);
                    volumeBtn.setAttribute('aria-label', 'Включить звук');
                } else {
                    useEl.setAttribute('xlink:href', `/icons/sprite.svg#volume_xs`);
                    volumeBtn.setAttribute('aria-label', 'Выключить звук');
                }
            }
        };

        const currentVol = window.CustomAudioController.audioElement ? window.CustomAudioController.audioElement.volume : 0.7;
        volumeSlider.value = currentVol;
        updateSliderStyle(currentVol);
        updateVolumeIcon(currentVol);

        volumeSlider.addEventListener('input', (e) => {
            e.stopPropagation();
            const vol = parseFloat(volumeSlider.value);
            window.CustomAudioController.setVolume(vol);
            updateSliderStyle(vol);
            updateVolumeIcon(vol);
        });

        let lastVolume = currentVol || 0.7;
        volumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const audio = window.CustomAudioController.audioElement;
            if (audio) {
                if (audio.volume > 0) {
                    lastVolume = audio.volume;
                    window.CustomAudioController.setVolume(0);
                    volumeSlider.value = 0;
                    updateSliderStyle(0);
                    updateVolumeIcon(0);
                } else {
                    window.CustomAudioController.setVolume(lastVolume);
                    volumeSlider.value = lastVolume;
                    updateSliderStyle(lastVolume);
                    updateVolumeIcon(lastVolume);
                }
            }
        });

        // Initial state update
        this.updateUI(state || {});

        // Periodic sync (for play icon, progress)
        this.updateInterval = setInterval(() => this._tick(), 250);
    },

    deactivateOverlay() {
        this.overlayActive = false;

        document.body.classList.remove('ym-sync-player-active');

        const overlay = document.getElementById('ym-sync-player-overlay');
        if (overlay) overlay.remove();

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        window.isCustomAudioActive = false;
        this.lastLoadedArtworkUrl = null;
    },

    _tick() {
        if (!this.overlayActive) return;
        const ac = window.CustomAudioController;
        if (!ac || !ac.audioElement) return;

        const audio = ac.audioElement;
        const dur = audio.duration || (ac.currentTrack && ac.currentTrack.duration / 1000) || 0;
        const cur = audio.currentTime || 0;

        const fill   = document.getElementById('sc-ov-progress-fill');
        const seek   = document.getElementById('sc-ov-seek');
        const playSvg = document.getElementById('sc-ov-play-svg');
        const playBtn = document.getElementById('sc-ov-play');

        if (!this._progressDragging && dur > 0) {
            const pct = (cur / dur) * 100;
            if (fill) {
                fill.style.width = pct + '%';
            }
            if (seek) seek.value = cur / dur;
        }

        // Play/Pause icon & accessibility
        if (playSvg && playBtn) {
            const useEl = playSvg.querySelector('use');
            if (useEl) {
                if (ac.isPlaying) {
                    useEl.setAttribute('xlink:href', `/icons/sprite.svg#${this.spritePauseId}`);
                    playBtn.setAttribute('aria-label', 'Пауза');
                } else {
                    useEl.setAttribute('xlink:href', `/icons/sprite.svg#${this.spritePlayId}`);
                    playBtn.setAttribute('aria-label', 'Воспроизведение');
                }
            }
        }
    },

    updateUI(state) {
        if (!state || !state.track) return;

        const title  = document.getElementById('sc-ov-title');
        const artist = document.getElementById('sc-ov-artist');
        const cover  = document.getElementById('sc-ov-cover');

        if (title)  title.textContent  = state.track.title || 'Unknown Track';
        if (artist) artist.textContent = state.track.user?.username || 'SoundCloud';

        // Load artwork via bridge (bypasses img-src CSP)
        const rawUrl = state.track.artwork_url || state.track.user?.avatar_url || '';
        if (cover && rawUrl && this.lastLoadedArtworkUrl !== rawUrl) {
            this.lastLoadedArtworkUrl = rawUrl;
            const artUrl = rawUrl.replace('-large', '-t200x200');
            window.SoundCloudAPI._sendToBridge('SC_FETCH_AUDIO', { url: artUrl })
                .then(res => {
                    if (res && res.url && cover && cover.isConnected) cover.src = res.url;
                })
                .catch(() => {});
        }
    }
};

window.PlayerFaker = PlayerFaker;

// Initialize when loaded
setTimeout(() => {
    if (window.PlayerFaker && window.CustomAudioController) {
        window.PlayerFaker.init();
    }
}, 1000);


// --- Component: shared/soundcloud-search.js ---
// ==========================================
// SOUNDCLOUD SEARCH INJECTOR
// ==========================================

const SoundCloudSearchInjector = {
    initialized: false,
    lastQuery: '',
    searchTimeout: null,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        // Monitor URL changes
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                // Reset container reference on navigation
                const old = document.getElementById('ym-sync-soundcloud-results');
                if (old) old.remove();
                this.lastQuery = '';
                this.checkSearchPage();
            }
        }).observe(document, { subtree: true, childList: true });

        // Initial check — retry since React content may not be ready yet
        this.retryCheck(0);

        // Monitor search input typing
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[type="search"]') && location.pathname.startsWith('/search')) {
                const query = e.target.value;
                if (query !== this.lastQuery) {
                    this.lastQuery = query;
                    clearTimeout(this.searchTimeout);
                    this.searchTimeout = setTimeout(() => {
                        this.performSearch(query);
                    }, 800);
                }
            }
        });
    },

    checkSearchPage() {
        if (location.pathname.startsWith('/search')) {
            const searchInput = document.querySelector('input[type="search"]');
            const urlQuery = new URLSearchParams(location.search).get('text') || '';
            const query = (searchInput && searchInput.value) || urlQuery;
            if (query && query !== this.lastQuery) {
                this.lastQuery = query;
                this.performSearch(query);
            }
        }
    },

    retryCheck(attempt) {
        if (attempt > 12) return;
        setTimeout(() => {
            if (location.pathname.startsWith('/search')) {
                const query = new URLSearchParams(location.search).get('text') || '';
                if (query && query !== this.lastQuery) {
                    const ready =
                        document.querySelector('[class*="SearchMixed_container"]') ||
                        document.querySelector('[class*="SearchMixed_root"]');
                    if (ready) {
                        this.lastQuery = query;
                        this.performSearch(query);
                        return;
                    }
                }
            }
            this.retryCheck(attempt + 1);
        }, 400 * (attempt + 1));
    },

    async performSearch(query) {
        if (!query || query.trim() === '') return;
        console.log('[SOUNDCLOUD] Searching for:', query);
        this.injectLoadingState();
        try {
            const tracks = await window.SoundCloudAPI.searchTracks(query, 8);
            this.renderResults(tracks);
        } catch (err) {
            console.error('[SOUNDCLOUD] Search failed:', err);
            this.renderError();
        }
    },

    getContainer() {
        // Re-use existing container if already inserted and still in DOM
        const existing = document.getElementById('ym-sync-soundcloud-results');
        if (existing && existing.isConnected) return existing;

        // Try to find SearchMixed_root first (to be inside the scrollable area)
        const mixedRoot = document.querySelector('[class*="SearchMixed_root"]');
        if (mixedRoot) {
            const scContainer = document.createElement('div');
            scContainer.id = 'ym-sync-soundcloud-results';
            scContainer.style.cssText = `
                padding: 16px 24px;
                box-sizing: border-box;
                border-bottom: 1px solid rgba(255,255,255,0.07);
                margin-bottom: 16px;
            `;
            try {
                mixedRoot.prepend(scContainer);
                return scContainer;
            } catch (err) {
                console.error('[SOUNDCLOUD] Failed to prepend to mixedRoot:', err);
            }
        }

        // Fallback to SearchPage_content
        const contentDiv = document.querySelector('[class*="SearchPage_content"]');
        if (contentDiv) {
            const scContainer = document.createElement('div');
            scContainer.id = 'ym-sync-soundcloud-results';
            scContainer.style.cssText = `
                padding: 16px 24px;
                box-sizing: border-box;
                border-bottom: 1px solid rgba(255,255,255,0.07);
                margin-bottom: 16px;
            `;
            try {
                contentDiv.prepend(scContainer);
                return scContainer;
            } catch (err) {
                console.error('[SOUNDCLOUD] Failed to prepend to contentDiv:', err);
            }
        }

        // Final fallback to SearchPage_root (before contentDiv)
        if (contentDiv && contentDiv.parentNode) {
            const scContainer = document.createElement('div');
            scContainer.id = 'ym-sync-soundcloud-results';
            scContainer.style.cssText = `
                padding: 16px 24px;
                box-sizing: border-box;
                border-bottom: 1px solid rgba(255,255,255,0.07);
                margin-bottom: 16px;
            `;
            try {
                contentDiv.parentNode.insertBefore(scContainer, contentDiv);
                return scContainer;
            } catch (err) {
                console.error('[SOUNDCLOUD] Failed to insertBefore contentDiv:', err);
            }
        }

        return null;
    },

    injectLoadingState() {
        const container = this.getContainer();
        if (!container) return;
        container.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="font-size:17px;font-weight:600;opacity:0.9;">SoundCloud</span>
                <span style="font-size:13px;opacity:0.5;">загрузка...</span>
            </div>
        `;
    },

    renderError() {
        const container = this.getContainer();
        if (!container) return;
        container.innerHTML = `
            <div style="font-size:15px;opacity:0.7;">SoundCloud — <span style="color:#ff5e5e;">ошибка загрузки</span></div>
        `;
    },

    renderResults(tracks) {
        const container = this.getContainer();
        if (!container) return;

        if (!tracks || tracks.length === 0) {
            container.innerHTML = `
                <div style="font-size:15px;opacity:0.7;">SoundCloud — ничего не найдено</div>
            `;
            return;
        }

        // Build HTML without ANY inline event handlers (CSP blocks them)
        const tracksHtml = tracks.map((track, index) => {
            const duration = track.duration
                ? Math.floor(track.duration / 60000) + ':' + String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')
                : '';
            const plays = track.playback_count
                ? (track.playback_count > 1000000
                    ? (track.playback_count / 1000000).toFixed(1) + 'M'
                    : track.playback_count > 1000
                        ? Math.floor(track.playback_count / 1000) + 'K'
                        : String(track.playback_count))
                : '';

            return `
                <div class="ym-sync-sc-track" data-index="${index}" style="
                    display:flex; align-items:center; padding:6px 8px;
                    border-radius:8px; cursor:pointer; gap:12px;
                    transition:background 0.15s;
                ">
                    <div class="ym-sync-sc-art" data-art-index="${index}" style="
                        width:40px; height:40px; border-radius:4px; overflow:hidden;
                        flex-shrink:0; background:rgba(255,255,255,0.1);
                        display:flex; align-items:center; justify-content:center;
                    ">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.3">
                            <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/>
                        </svg>
                    </div>
                    <div style="flex:1; overflow:hidden; min-width:0;">
                        <div style="font-size:14px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.4;">${track.title}</div>
                        <div style="font-size:12px; opacity:0.55; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${track.user?.username || ''}${plays ? ' &middot; ' + plays : ''}
                        </div>
                    </div>
                    <div style="font-size:12px; opacity:0.45; flex-shrink:0;">${duration}</div>
                    
                    <!-- Кнопка импорта в BetterYandexMusic -->
                    <button class="ym-sync-sc-add-btn" data-add-index="${index}" style="
                        width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.06);
                        display:flex; align-items:center; justify-content:center;
                        flex-shrink:0; border:none; cursor:pointer; color:#fff;
                        transition:background 0.2s, transform 0.2s; margin-left:4px;
                        padding:0; outline:none; z-index:5;
                    }" title="Добавить в плейлист BetterYandexMusic">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>

                    <div class="ym-sync-sc-play-btn" style="
                        width:32px; height:32px; border-radius:50%; background:#ff5500;
                        display:flex; align-items:center; justify-content:center;
                        flex-shrink:0; opacity:0; transition:opacity 0.15s; pointer-events:none;
                    ">
                        <svg width="10" height="12" viewBox="0 0 10 12" fill="white"><path d="M0 0l10 6-10 6V0z"/></svg>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <span style="font-size:17px; font-weight:600; opacity:0.9;">Результаты из SoundCloud</span>
                <svg width="26" height="13" viewBox="0 0 26 13" fill="none">
                    <rect width="26" height="13" rx="3" fill="#ff5500"/>
                    <text x="13" y="9.5" text-anchor="middle" fill="white" font-size="7.5" font-weight="bold" font-family="Arial,sans-serif">SC</text>
                </svg>
            </div>
            <div id="ym-sync-sc-tracks" style="display:flex; flex-direction:column; gap:2px;">
                ${tracksHtml}
            </div>
        `;

        // === Hover effects (NO inline handlers) ===
        const trackEls = container.querySelectorAll('.ym-sync-sc-track');
        trackEls.forEach((el) => {
            const btn = el.querySelector('.ym-sync-sc-play-btn');
            el.addEventListener('mouseenter', () => {
                el.style.background = 'rgba(255,255,255,0.07)';
                if (btn) btn.style.opacity = '1';
            });
            el.addEventListener('mouseleave', () => {
                el.style.background = 'transparent';
                if (btn) btn.style.opacity = '0';
            });
        });

        // === Load artwork via bridge (bypasses img-src CSP) ===
        tracks.forEach((track, index) => {
            const rawUrl = track.artwork_url || track.user?.avatar_url || '';
            if (!rawUrl) return;
            const artUrl = rawUrl.replace('-large', '-t200x200');
            const artEl = container.querySelector(`.ym-sync-sc-art[data-art-index="${index}"]`);
            if (!artEl) return;

            window.SoundCloudAPI._sendToBridge('SC_FETCH_AUDIO', { url: artUrl })
                .then(result => {
                    if (!result || !result.url || !artEl.isConnected) return;
                    const img = document.createElement('img');
                    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
                    img.src = result.url;
                    artEl.innerHTML = '';
                    artEl.appendChild(img);
                })
                .catch(() => { /* placeholder stays */ });
        });

        // === Click to play ===
        trackEls.forEach((el) => {
            el.addEventListener('click', async () => {
                const index = parseInt(el.dataset.index, 10);
                const track = tracks[index];
                if (!track) return;

                console.log('[SOUNDCLOUD] Playing track:', track.title);

                const btn = el.querySelector('.ym-sync-sc-play-btn');
                if (btn) {
                    btn.style.opacity = '1';
                    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" stroke="white" stroke-width="2" fill="none" stroke-dasharray="10 20" stroke-linecap="round"/></svg>`;
                }

                const streamUrl = await window.SoundCloudAPI.getStreamUrl(track);
                if (streamUrl) {
                    await window.CustomAudioController.playTrack(track, streamUrl);
                } else {
                    console.error('[SOUNDCLOUD] Could not get stream URL for track');
                    if (btn) {
                        btn.innerHTML = `<svg width="10" height="12" viewBox="0 0 10 12" fill="white"><path d="M0 0l10 6-10 6V0z"/></svg>`;
                    }
                }
            });
        });

        // === Click to import ===
        const addBtns = container.querySelectorAll('.ym-sync-sc-add-btn');
        addBtns.forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Не запускать проигрывание
                const index = parseInt(btn.dataset.addIndex, 10);
                const track = tracks[index];
                if (!track) return;

                await this.importTrack(track, btn);
            });

            btn.addEventListener('mouseenter', (e) => {
                e.stopPropagation();
                btn.style.background = 'rgba(255,255,255,0.16)';
                btn.style.transform = 'scale(1.1)';
            });

            btn.addEventListener('mouseleave', (e) => {
                e.stopPropagation();
                btn.style.background = 'rgba(255,255,255,0.06)';
                btn.style.transform = 'scale(1)';
            });
        });
    },

    targetPlaylistId: null,

    async getOrCreatePlaylist(uid) {
        if (this.targetPlaylistId) return this.targetPlaylistId;

        const headers = {
            'x-yandex-music-client': 'YandexMusicWebNext/1.0.0',
            'x-yandex-music-multi-auth-user-id': uid,
            'x-yandex-music-without-invocation-info': '1',
            'x-requested-with': 'XMLHttpRequest'
        };

        try {
            console.log('[SOUNDCLOUD IMPORT] Fetching user playlists...');
            const res = await fetch('https://api.music.yandex.ru/landing-blocks/collection/playlists-liked-and-playlists-created?count=100', { 
                headers,
                credentials: 'include'
            });
            if (!res.ok) throw new Error(`Failed to fetch playlists: ${res.status}`);
            const data = await res.json();
            
            const tabs = data.tabs || [];
            const createdTab = tabs.find(t => t.type === 'created_playlist_tab');
            if (createdTab && createdTab.items) {
                const item = createdTab.items.find(i => i.data?.playlist?.title === 'BetterYandexMusic');
                if (item && item.data.playlist) {
                    const playlist = item.data.playlist;
                    this.targetPlaylistId = `${playlist.uid}:${playlist.kind}`;
                    console.log('[SOUNDCLOUD IMPORT] Found existing playlist:', this.targetPlaylistId);
                    return this.targetPlaylistId;
                }
            }

            console.log('[SOUNDCLOUD IMPORT] Playlist "BetterYandexMusic" not found. Creating one...');
            const createRes = await fetch(`https://api.music.yandex.ru/users/${uid}/playlists/create?visibility=public&title=BetterYandexMusic`, {
                method: 'POST',
                headers,
                credentials: 'include'
            });
            if (!createRes.ok) throw new Error(`Failed to create playlist: ${createRes.status}`);
            const createData = await createRes.json();
            if (createData && createData.kind) {
                this.targetPlaylistId = `${uid}:${createData.kind}`;
                console.log('[SOUNDCLOUD IMPORT] Created new playlist:', this.targetPlaylistId);
                return this.targetPlaylistId;
            } else {
                throw new Error('Invalid playlist create response');
            }
        } catch (err) {
            console.error('[SOUNDCLOUD IMPORT] Error in getOrCreatePlaylist:', err);
            throw err;
        }
    },

    async importTrack(track, btn) {
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.style.background = 'rgba(255,255,255,0.1)';
        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" style="animation: ym-sync-spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32 10" fill="none" stroke-linecap="round"></circle>
                <style>
                    @keyframes ym-sync-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </svg>
        `;

        try {
            // Get UID from Yandex Music page
            let uid = null;
            if (window.Mu && window.Mu.adapter && window.Mu.adapter.uid) {
                uid = window.Mu.adapter.uid;
            } else {
                const match = document.cookie.match(/Session_id=[\w\.\:\-\|]+?(\d+)\./) || document.cookie.match(/L=[\w\.\:\-\|]+?\.(\d+)\./);
                if (match) {
                    uid = match[1];
                }
            }

            if (!uid) {
                const activePlayer = window.getActivePlayer && window.getActivePlayer();
                uid = activePlayer?.uid || activePlayer?.user?.uid;
            }

            // Fallback: fetch directly from Yandex Music account status API
            if (!uid) {
                try {
                    console.log('[SOUNDCLOUD IMPORT] Attempting to fetch UID from account/status...');
                    const statusRes = await fetch('https://api.music.yandex.ru/account/status', {
                        credentials: 'include'
                    });
                    if (statusRes.ok) {
                        const statusData = await statusRes.json();
                        uid = statusData.result?.account?.uid || statusData.result?.uid;
                        console.log('[SOUNDCLOUD IMPORT] Fetched UID from account/status:', uid);
                    }
                } catch (e) {
                    console.error('[SOUNDCLOUD IMPORT] Failed to fetch UID from account/status:', e);
                }
            }

            if (!uid) {
                throw new Error('Не удалось получить UID пользователя');
            }

            const playlistId = await this.getOrCreatePlaylist(uid);

            const streamUrl = await window.SoundCloudAPI.getStreamUrl(track);
            if (!streamUrl) throw new Error('Не удалось получить поток трека');

            const filename = `soundcloud_${track.id}.mp3`;
            
            const headers = {
                'x-yandex-music-client': 'YandexMusicWebNext/1.0.0',
                'x-yandex-music-multi-auth-user-id': uid,
                'x-yandex-music-without-invocation-info': '1',
                'x-requested-with': 'XMLHttpRequest'
            };

            const uploadUrlRes = await fetch(`https://api.music.yandex.ru/loader/upload-url?uid=${uid}&playlist-id=${encodeURIComponent(playlistId)}&path=${encodeURIComponent(filename)}`, {
                method: 'POST',
                headers,
                credentials: 'include'
            });
            if (!uploadUrlRes.ok) throw new Error(`Не удалось получить URL загрузки: ${uploadUrlRes.status}`);
            
            const uploadUrlData = await uploadUrlRes.json();
            const postTarget = uploadUrlData['post-target'];
            const ugcTrackId = uploadUrlData['ugc-track-id'];
            if (!postTarget || !ugcTrackId) {
                throw new Error('Неверный ответ от загрузчика Яндекса');
            }
            console.log('[SOUNDCLOUD IMPORT] Delegating download and upload to background script...');
            const bgResponse = await window.SoundCloudAPI._sendToBridge('YM_UPLOAD_TRACK', {
                postTarget,
                streamUrl,
                filename,
                title: track.title,
                artist: track.user?.username || '',
                artworkUrl: track.artwork_url || track.user?.avatar_url || ''
            });

            if (!bgResponse || !bgResponse.ok) {
                throw new Error(bgResponse?.error || 'Ошибка загрузки в фоновом скрипте');
            }

            const uploadResult = bgResponse.result;
            if (uploadResult.result !== 'CREATED') {
                throw new Error(`Неверный статус завершения загрузки: ${uploadResult.result}`);
            }

            const linkFormData = new FormData();
            linkFormData.append('trackIds', ugcTrackId);
            linkFormData.append('removeDuplicates', 'false');
            linkFormData.append('withProgress', 'true');

            const linkRes = await fetch('https://api.music.yandex.ru/tracks', {
                method: 'POST',
                body: linkFormData,
                headers,
                credentials: 'include'
            });

            if (!linkRes.ok) {
                throw new Error(`Не удалось привязать трек к коллекции: ${linkRes.status}`);
            }

            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
            btn.title = 'Добавлено в плейлист BetterYandexMusic!';
            btn.style.background = 'rgba(34,197,94,0.15)';
            
            console.log(`[SOUNDCLOUD IMPORT] Successfully imported track ${track.title} (ID: ${ugcTrackId})`);
        } catch (err) {
            console.error('[SOUNDCLOUD IMPORT] Import failed:', err);
            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            `;
            btn.title = `Ошибка: ${err.message}`;
            btn.style.background = 'rgba(239,68,68,0.15)';
            btn.disabled = false;
            
            setTimeout(() => {
                if (btn && btn.disabled === false) {
                    btn.innerHTML = originalHtml;
                    btn.title = 'Добавить в плейлист BetterYandexMusic';
                    btn.style.background = 'rgba(255,255,255,0.06)';
                }
            }, 5000);
        }
    }
};

window.SoundCloudSearchInjector = SoundCloudSearchInjector;

// Initialize when loaded
setTimeout(() => {
    if (window.SoundCloudSearchInjector && window.SoundCloudAPI) {
        window.SoundCloudSearchInjector.init();
    }
}, 1000);


// --- Component: main/index.js ---
// Обработка сообщений от сервера (через isolated.js)
window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data || event.data.type !== "FROM_ISOLATED") return;

  if (event.data.action === "SYNC_STATE") {
    const serverState = event.data.state;
    console.log("[SYNC] [ОБРАБОТКА ИЗ ISOLATED] Main.js получил SYNC_STATE:", serverState);

    if (isSyncingFromServer) {
      console.log("[SYNC] Игнорируем команду синхронизации, так как уже идет процесс синхронизации");
      return;
    }

    let localTrackId = null;
    if (window.isCustomAudioActive && window.CustomAudioController && window.CustomAudioController.currentTrack) {
      localTrackId = `soundcloud:${window.CustomAudioController.currentTrack.id}`;
    } else {
      const activePlayer = getActivePlayer();
      const currentEntity = activePlayer?.queueController?.queue?.state?.currentEntity?.value;
      const entityData = currentEntity?.entity?.data;
      localTrackId = entityData?.meta?.id || entityData?.id;
    }

    isSyncingFromServer = true;
    startSyncSafetyTimeout();

    const isServerTrackValid = serverState.trackId && 
                               String(serverState.trackId).trim() !== "" && 
                               String(serverState.trackId) !== "undefined" && 
                               String(serverState.trackId) !== "null";

    const activePlayer = getActivePlayer();

    // 1. Смена трека (или если плеер еще не инициализирован)
    if (isServerTrackValid && (!activePlayer || String(serverState.trackId) !== String(localTrackId))) {
      console.log(`[SYNC] Получена команда смены трека на ID: ${serverState.trackId}`);

      if (String(serverState.trackId).startsWith("soundcloud:")) {
        console.log(`[SYNC] Запуск SoundCloud синхронизации для: ${serverState.trackId}`);
        window.CustomAudioController.syncPlay(serverState.trackId, serverState)
          .then(() => {
            clearSyncSafetyTimeout();
            isSyncingFromServer = false;
            targetTrackIdToSync = null;
            targetServerStateToSync = null;
          })
          .catch(err => {
            console.error('[SYNC] Ошибка при синхронизации SoundCloud трека:', err);
            clearSyncSafetyTimeout();
            isSyncingFromServer = false;
            targetTrackIdToSync = null;
            targetServerStateToSync = null;
          });
        return;
      }

      // Stop custom audio if we are switching to a Yandex track
      if (window.CustomAudioController) {
        window.CustomAudioController.stop();
      }

      targetTrackIdToSync = String(serverState.trackId);
      targetServerStateToSync = serverState;

      const fallbackToRouter = (state) => {
        const path = `/track/${state.trackId}`;
        const playParam = state.isPause ? "" : "?play=1";
        const fullUrl = `${path}${playParam}`;

        console.log(`[SYNC] Резервный редирект отключен: ${fullUrl}`);
        // window.location.href = fullUrl;

        clearSyncSafetyTimeout();
        isSyncingFromServer = false;
        targetTrackIdToSync = null;
        targetServerStateToSync = null;
      };

      if (activePlayer) {
        try {
          // Стратегия А: Поиск трека в текущей очереди плеера
          const queueState = activePlayer.playbackState?.queueState;
          if (queueState && queueState.entityList && queueState.entityList.value) {
            const list = queueState.entityList.value;
            // Ищем нужный трек в списке
            const trackIndex = list.findIndex(wrapper => {
              const data = wrapper?.entity?.data || wrapper?.entity?.entityData;
              const id = data?.meta?.id || data?.id;
              return String(id) === String(serverState.trackId);
            });

            if (trackIndex !== -1) {
              console.log(`[SYNC] Трек найден в текущей очереди на индексе ${trackIndex}. Переключаем очередь через setEntityByIndex.`);
              
              if (typeof activePlayer.setEntityByIndex === 'function') {
                activePlayer.setEntityByIndex(trackIndex);
              } else if (queueState.index && typeof queueState.index.value !== 'undefined') {
                queueState.index.value = trackIndex;
              } else {
                queueState.index = trackIndex;
              }
              
              // Ждем переключения трека в checkAndSendState для вызова syncPlayerControls
              return; // Выходим, так как успешно переключились!
            }
          }

          // Стратегия Б: Инжект трека в текущую очередь (бесшовный переход)
          console.log("[SYNC] Трека нет в очереди. Добавляем (inject) и переключаем...");
          if (activePlayer.queueController && typeof activePlayer.queueController.inject === 'function') {
            const currentIndex = queueState?.index?.value || 0;
            const insertIndex = currentIndex + 1;
            
            activePlayer.queueController.inject({
              entitiesData: [
                { type: "unloaded", meta: { id: String(serverState.trackId) } }
              ],
              position: insertIndex,
              silent: false // Меняем на false для надежной генерации событий обновления MobX
            });

            // Даем плееру небольшую задержку на переваривание инжекта, а затем ищем точную позицию
            setTimeout(() => {
              const list = queueState?.entityList?.value || [];
              let targetIndex = -1;
              
              // Динамический поиск трека по ID в очереди, чтобы переключить на верный индекс
              for (let i = 0; i < list.length; i++) {
                const d = list[i]?.entity?.data || list[i]?.entity?.entityData;
                const id = d?.meta?.id || d?.id;
                if (String(id) === String(serverState.trackId)) {
                  // Выбираем индекс, ближайший к insertIndex
                  if (targetIndex === -1 || Math.abs(i - insertIndex) < Math.abs(targetIndex - insertIndex)) {
                    targetIndex = i;
                  }
                }
              }
              
              const finalIndex = targetIndex !== -1 ? targetIndex : insertIndex;
              console.log(`[SYNC] Переключаемся на внедренный трек (целевой индекс ${finalIndex}, расчетный ${insertIndex})`);
              
              if (typeof activePlayer.setEntityByIndex === 'function') {
                activePlayer.setEntityByIndex(finalIndex);
              }
              // Ждем переключения трека в checkAndSendState для вызова syncPlayerControls
            }, 500);
            
            return; // Выходим, так как стратегия инжекта запущена
          } else {
            console.log("[SYNC] Метод inject не найден. Переходим на запасной роутер.");
            fallbackToRouter(serverState);
          }
        } catch (e) {
          console.error("[SYNC] Ошибка при взаимодействии с API Sonata:", e);
          fallbackToRouter(serverState);
        }
      } else {
        fallbackToRouter(serverState);
      }
    } 
    // 2. Трек тот же, синхронизируем время/паузу
    else if (isServerTrackValid) {
      if (String(serverState.trackId).startsWith("soundcloud:")) {
        window.CustomAudioController.syncPlay(serverState.trackId, serverState)
          .then(() => {
            clearSyncSafetyTimeout();
            isSyncingFromServer = false;
            targetTrackIdToSync = null;
            targetServerStateToSync = null;
          })
          .catch(err => {
            console.error('[SYNC] Ошибка при синхронизации SoundCloud трека:', err);
            clearSyncSafetyTimeout();
            isSyncingFromServer = false;
            targetTrackIdToSync = null;
            targetServerStateToSync = null;
          });
      } else if (activePlayer) {
        syncPlayerControls(activePlayer, serverState);
        clearSyncSafetyTimeout();
        isSyncingFromServer = false;
        targetTrackIdToSync = null;
        targetServerStateToSync = null;
      } else {
        clearSyncSafetyTimeout();
        isSyncingFromServer = false;
        targetTrackIdToSync = null;
        targetServerStateToSync = null;
      }
    } else {
      clearSyncSafetyTimeout();
      isSyncingFromServer = false;
      targetTrackIdToSync = null;
      targetServerStateToSync = null;
    }
  }
});


