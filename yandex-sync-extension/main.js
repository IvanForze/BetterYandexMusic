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

window.getSonataCore = getSonataCore;
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


// --- Component: shared/settings-injector.js ---
// ==========================================
// SCROBBLER SETTINGS UI INJECTOR (Polished & Resilient)
// ==========================================

// Имитация contextBridge для браузерного расширения через window.postMessage
if (!window.__ymSyncBridge && typeof window.ScrobblerService === 'undefined') {
  function callScrobblerApi(method, args) {
    return new Promise((resolve, reject) => {
      const nonce = Math.random().toString();
      const handler = (event) => {
        if (event.source !== window || !event.data || event.data.type !== 'YM_SCROBBLER_API_RESPONSE' || event.data.nonce !== nonce) return;
        window.removeEventListener('message', handler);
        if (event.data.error) reject(new Error(event.data.error));
        else resolve(event.data.result);
      };
      window.addEventListener('message', handler);
      window.postMessage({ type: 'YM_SCROBBLER_API_CALL', method, args, nonce }, '*');
    });
  }

  window.__ymSyncBridge = {
    sendScrobblerSettings: (settings) => window.postMessage({ type: 'YM_SCROBBLER_SETTINGS_CHANGED', settings }, '*'),
    lastFmGetToken: (k, s) => callScrobblerApi('lastFmGetToken', [k, s]),
    lastFmGetSession: (t, k, s) => callScrobblerApi('lastFmGetSession', [t, k, s]),
    listenBrainzValidateToken: (t) => callScrobblerApi('listenBrainzValidateToken', [t])
  };
}

let lastFmPendingToken = null;

function syncSettingsToPreload() {
  const settings = {
    lastfmEnabled: localStorage.getItem('ymScrobblerLastfmEnabled') === 'true',
    lastfmSessionKey: localStorage.getItem('ymScrobblerLastfmSessionKey') || '',
    lastfmUsername: localStorage.getItem('ymScrobblerLastfmUsername') || '',
    lastfmApiKey: localStorage.getItem('ymScrobblerLastfmApiKey') || '',
    lastfmSecret: localStorage.getItem('ymScrobblerLastfmSecret') || '',
    listenbrainzEnabled: localStorage.getItem('ymScrobblerListenbrainzEnabled') === 'true',
    listenbrainzToken: localStorage.getItem('ymScrobblerListenbrainzToken') || '',
    listenbrainzUsername: localStorage.getItem('ymScrobblerListenbrainzUsername') || ''
  };
  
  if (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendScrobblerSettings === 'function') {
    window.__ymSyncBridge.sendScrobblerSettings(settings);
  } else {
    window.postMessage({
      type: 'YM_SCROBBLER_SETTINGS_CHANGED',
      settings: settings
    }, '*');
  }
}

// Первичная синхронизация при загрузке
setTimeout(syncSettingsToPreload, 2000);


function checkAndInjectSettings() {
  if (!window.location.pathname.includes('/settings')) {
    return;
  }
  
  // Проверяем, не внедрено ли уже в DOM
  if (document.getElementById('ym-scrobbler-settings-block')) {
    return;
  }
  
  // Ищем список настроек по data-test-id (надежный способ)
  let listContainer = document.querySelector('[data-test-id="SETTINGS_LIST"]');
  
  if (!listContainer) {
    // Резервный способ: ищем по тексту элементов
    const divs = Array.from(document.querySelectorAll('div, span, p, h2, h3'));
    const targetTextElement = divs.find(el => {
      if (el.children.length > 0) return false;
      const text = el.textContent || '';
      return text.includes('Офлайн-режим') || text.includes('Плавные переходы') || text.includes('О приложении') || text.includes('Внешний вид') || text.includes('Язык') || text.includes('Качество звука');
    });

    if (!targetTextElement) return;

    let itemNode = targetTextElement;
    while (itemNode && itemNode.parentElement && itemNode.parentElement.tagName !== 'UL' && itemNode.parentElement.children.length < 3) {
      itemNode = itemNode.parentElement;
    }

    listContainer = itemNode ? itemNode.parentElement : null;
  }

  if (!listContainer) return;

  // Создаем блок настроек скроблинга
  const block = document.createElement('div');
  block.id = 'ym-scrobbler-settings-block';
  block.className = 'ym-settings-section';
  block.style.width = '100%';
  block.style.boxSizing = 'border-box';
  block.style.fontFamily = 'Yandex Sans Text, Arial, sans-serif';

  // Загружаем сохраненные значения
  const lastfmEnabled = localStorage.getItem('ymScrobblerLastfmEnabled') === 'true';
  const lastfmUsername = localStorage.getItem('ymScrobblerLastfmUsername') || '';
  const lastfmSessionKey = localStorage.getItem('ymScrobblerLastfmSessionKey') || '';
  const lastfmApiKey = localStorage.getItem('ymScrobblerLastfmApiKey') || '';
  const lastfmSecret = localStorage.getItem('ymScrobblerLastfmSecret') || '';
  
  const listenbrainzEnabled = localStorage.getItem('ymScrobblerListenbrainzEnabled') === 'true';
  const listenbrainzToken = localStorage.getItem('ymScrobblerListenbrainzToken') || '';
  const listenbrainzUsername = localStorage.getItem('ymScrobblerListenbrainzUsername') || '';

  // Читаем настройку кастомных текстов
  const customLyricsMode = localStorage.getItem('ymCustomLyricsMode') || 'fallback';

  block.innerHTML = `
    <!-- Заголовок секции BetterYandexMusic -->
    <div class="ym-settings-section-title" style="font-size: 17px; font-weight: 700; padding: 24px 0 8px 0; letter-spacing: -0.2px;">BetterYandexMusic</div>
    
    <!-- Секция Текст Песен -->
    <div class="ym-settings-item" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 0; min-height: 52px; box-sizing: border-box;">
      <div style="flex: 1; padding-right: 16px;">
        <div class="ym-settings-item-title" style="font-size: 15px; font-weight: 600; margin-bottom: 3px;">Текст песен (LRCLib / Genius)</div>
        <div class="ym-settings-item-status" style="font-size: 13px; line-height: 17px; margin-bottom: 8px;">
          Замещение официальных текстов песен альтернативными источниками
        </div>
        <div style="max-width: 420px; margin-top: 8px;">
          <select id="ym-custom-lyrics-mode" class="ym-select">
            <option value="disabled" ${customLyricsMode === 'disabled' ? 'selected' : ''}>Выключить</option>
            <option value="fallback" ${customLyricsMode === 'fallback' ? 'selected' : ''}>Только если нет текста от Яндекса</option>
            <option value="always" ${customLyricsMode === 'always' ? 'selected' : ''}>Всегда заменять текст на свой</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Секция Локальный Сервер (только для Electron) -->
    <div id="ym-local-server-section" style="display: none;">
      <div class="ym-settings-item" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 0; min-height: 52px; box-sizing: border-box;">
        <div style="flex: 1; padding-right: 16px;">
          <div class="ym-settings-item-title" style="font-size: 15px; font-weight: 600; margin-bottom: 3px;">Сервер синхронизации</div>
          <div id="ym-local-server-status" class="ym-settings-item-status" style="font-size: 13px; line-height: 17px; margin-bottom: 8px;">
            Остановлен
          </div>
          <div style="max-width: 420px; margin-top: 8px; display: flex; align-items: center; gap: 8px;">
            <button id="ym-local-server-btn" class="ym-btn-secondary" style="white-space: nowrap; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background-color 0.2s, transform 0.1s;">Запустить сервер</button>
            <input id="ym-local-server-url" type="text" class="ym-input" readonly placeholder="Здесь появится ссылка" style="flex: 1; padding: 6px 12px; border-radius: 8px; font-size: 13px; outline: none; box-sizing: border-box; display: none;">
          </div>
          <div id="ym-local-server-error" style="color: #ff4d4d; font-size: 12px; margin-top: 6px; display: none;"></div>
        </div>
      </div>
    </div>

    <!-- Заголовок секции Скробблинг -->
    <div class="ym-settings-section-title" style="font-size: 17px; font-weight: 700; padding: 8px 0 8px 0; letter-spacing: -0.2px;">Скроблинг</div>
    
    <!-- Секция Last.fm -->
    <div class="ym-settings-item" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 0; min-height: 52px; box-sizing: border-box;">
      <div style="flex: 1; padding-right: 16px;">
        <div class="ym-settings-item-title" style="font-size: 15px; font-weight: 600; margin-bottom: 3px;">Last.fm</div>
        <div id="ym-lastfm-status" class="ym-settings-item-status" style="font-size: 13px; line-height: 17px; margin-bottom: 8px;">
          ${lastfmSessionKey ? `Подключено как: <strong class="ym-settings-strong">${lastfmUsername}</strong>` : 'Не авторизован'}
        </div>
        
        <!-- Поля ввода собственных ключей Last.fm -->
        <div id="ym-lastfm-keys-container" style="max-width: 420px; margin-bottom: 12px; display: ${lastfmSessionKey ? 'none' : 'block'};">
          <div class="ym-settings-item-subtext" style="font-size:11px; margin-bottom: 6px;">
            Создайте приложение на <a href="https://www.last.fm/api/account/create" target="_blank" style="color: #ffdb4d; text-decoration: underline;">last.fm/api/account/create</a> и укажите ключи ниже:
          </div>
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <input type="text" id="ym-lastfm-apikey" value="${lastfmApiKey}" placeholder="API Key" class="ym-input" style="flex: 1; min-width: 0;">
            <input type="password" id="ym-lastfm-secret" value="${lastfmSecret}" placeholder="Shared Secret" class="ym-input" style="flex: 1; min-width: 0;">
          </div>
        </div>

        <div id="ym-lastfm-actions">
          ${lastfmSessionKey ? 
            `<button id="ym-lastfm-logout-btn" class="ym-btn-secondary">Выйти</button>` :
            `<button id="ym-lastfm-login-btn" class="ym-btn-primary">Войти через Last.fm</button>
             <button id="ym-lastfm-confirm-btn" class="ym-btn-secondary" style="display:none; margin-left: 8px;">Я подтвердил авторизацию</button>`
          }
        </div>
      </div>
      <div style="padding-top: 2px;">
        <label class="ym-switch">
          <input type="checkbox" id="ym-lastfm-toggle" ${lastfmEnabled ? 'checked' : ''}>
          <span class="ym-slider"></span>
        </label>
      </div>
    </div>

    <!-- Секция ListenBrainz -->
    <div class="ym-settings-item" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 0; min-height: 52px; box-sizing: border-box;">
      <div style="flex: 1; padding-right: 16px;">
        <div class="ym-settings-item-title" style="font-size: 15px; font-weight: 600; margin-bottom: 3px;">ListenBrainz</div>
        <div id="ym-listenbrainz-status" class="ym-settings-item-status" style="font-size: 13px; line-height: 17px; margin-bottom: 8px;">
          ${listenbrainzUsername ? `Подключено как: <strong class="ym-settings-strong">${listenbrainzUsername}</strong>` : 'Не подключено'}
        </div>
        
        <div style="max-width: 420px; margin-top: 8px;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="password" id="ym-listenbrainz-token" value="${listenbrainzToken}" placeholder="Токен пользователя (User Token)" class="ym-input" style="flex: 1; min-width: 0;">
            <button id="ym-listenbrainz-save-btn" class="ym-btn-secondary">Сохранить</button>
          </div>
        </div>
      </div>
      <div style="padding-top: 2px;">
        <label class="ym-switch">
          <input type="checkbox" id="ym-listenbrainz-toggle" ${listenbrainzEnabled ? 'checked' : ''}>
          <span class="ym-slider"></span>
        </label>
      </div>
    </div>

    </div>

    <style>
      /* Использование CSS-переменных Яндекс Музыки для автоматической адаптации к любой теме (темной, светлой, кастомным) */
      .ym-settings-section-title {
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
      }
      .ym-settings-item-title {
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
      }
      .ym-settings-item-status {
        color: var(--yp-color-text-secondary, rgba(255, 255, 255, 0.45)) !important;
      }
      .ym-settings-strong {
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
        font-weight: 600;
      }
      .ym-settings-item-subtext {
        color: var(--yp-color-text-tertiary, rgba(255, 255, 255, 0.4)) !important;
      }
      .ym-settings-item {
        border-bottom: 1px solid var(--yp-color-border-primary, rgba(255, 255, 255, 0.06)) !important;
      }
      .ym-settings-divider {
        background: var(--yp-color-border-primary, rgba(255, 255, 255, 0.06)) !important;
      }

      /* Кнопки в стиле Яндекс Музыки */
      .ym-btn-primary {
        background: var(--yp-color-brand, #ffdb4d) !important;
        color: #000000 !important;
        border: none;
        padding: 6px 16px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: transform 0.1s, opacity 0.15s;
        font-family: inherit;
      }
      .ym-btn-primary:hover {
        opacity: 0.9;
      }
      .ym-btn-primary:active {
        transform: scale(0.97);
      }
      
      .ym-btn-secondary {
        background: var(--yp-color-bg-secondary, rgba(255, 255, 255, 0.08)) !important;
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
        border: 1px solid var(--yp-color-border-primary, rgba(255, 255, 255, 0.12)) !important;
        padding: 6px 16px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: transform 0.1s, background 0.15s;
        font-family: inherit;
      }
      .ym-btn-secondary:hover {
        background: var(--yp-color-bg-tertiary, rgba(255, 255, 255, 0.14)) !important;
      }
      .ym-btn-secondary:active {
        transform: scale(0.97);
      }

      /* Инпуты */
      .ym-input {
        background: var(--yp-color-bg-secondary, rgba(255, 255, 255, 0.06)) !important;
        border: 1px solid var(--yp-color-border-primary, rgba(255, 255, 255, 0.12)) !important;
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
        padding: 7px 14px;
        border-radius: 20px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s, background 0.2s;
        font-family: inherit;
        box-sizing: border-box;
        width: 100%;
      }
      .ym-input:focus {
        border-color: var(--yp-color-brand, #ffdb4d) !important;
        background: var(--yp-color-bg-tertiary, rgba(255, 255, 255, 0.09)) !important;
      }
      .ym-input::placeholder {
        color: var(--yp-color-text-tertiary, rgba(255, 255, 255, 0.3)) !important;
      }

      /* Свичи (Тумблеры) в стиле Яндекс Музыки (Желтые при включении) */
      .ym-switch {
        position: relative;
        display: inline-block;
        width: 38px;
        height: 20px;
      }
      .ym-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .ym-slider {
        position: absolute;
        cursor: pointer;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: rgba(128, 128, 128, 0.25) !important;
        transition: background-color 0.2s;
        border-radius: 20px;
      }
      .ym-slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 3px;
        bottom: 3px;
        background-color: #ffffff;
        transition: transform 0.2s, background-color 0.2s;
        border-radius: 50%;
      }
      .ym-switch input:checked + .ym-slider {
        background-color: var(--yp-color-brand, #ffdb4d) !important;
      }
      .ym-switch input:checked + .ym-slider:before {
        transform: translateX(18px);
        background-color: #000000;
      }

      /* Селект */
      .ym-select {
        background-color: var(--yp-color-bg-secondary, rgba(255, 255, 255, 0.06)) !important;
        border: 1px solid var(--yp-color-border-primary, rgba(255, 255, 255, 0.12)) !important;
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
        padding: 7px 14px;
        border-radius: 8px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s, background 0.2s;
        font-family: inherit;
        box-sizing: border-box;
        width: 100%;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlsaW5lIHBvaW50cz0iNiA5IDEyIDE1IDE4IDkiPjwvcG9seWxpbmU+PC9zdmc+");
        background-repeat: no-repeat;
        background-position: right 14px center;
        background-size: 16px;
      }
      .ym-select:focus {
        border-color: var(--yp-color-brand, #ffdb4d) !important;
        background-color: var(--yp-color-bg-tertiary, rgba(255, 255, 255, 0.09)) !important;
      }
      .ym-select option {
        background: #202020;
        color: #fff;
      }

      /* Светлая тема Яндекс Музыки (класс .ym-light-theme, как в themes.js) */
      .ym-light-theme .ym-settings-section-title {
        color: #000000 !important;
      }
      .ym-light-theme .ym-settings-item-title {
        color: #000000 !important;
      }
      .ym-light-theme .ym-settings-item-status {
        color: rgba(0, 0, 0, 0.6) !important;
      }
      .ym-light-theme .ym-settings-strong {
        color: #000000 !important;
      }
      .ym-light-theme .ym-settings-item-subtext {
        color: rgba(0, 0, 0, 0.5) !important;
      }
      .ym-light-theme .ym-settings-item {
        border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
      }
      .ym-light-theme .ym-settings-divider {
        background: rgba(0, 0, 0, 0.08) !important;
      }
      .ym-light-theme .ym-btn-secondary {
        background: rgba(0, 0, 0, 0.04) !important;
        color: #000000 !important;
        border: 1px solid rgba(0, 0, 0, 0.15) !important;
      }
      .ym-light-theme .ym-btn-secondary:hover {
        background: rgba(0, 0, 0, 0.09) !important;
      }
      .ym-light-theme .ym-input {
        background: rgba(0, 0, 0, 0.04) !important;
        border: 1px solid rgba(0, 0, 0, 0.15) !important;
        color: #000000 !important;
      }
      .ym-light-theme .ym-input:focus {
        border-color: rgba(0, 0, 0, 0.4) !important;
        background: rgba(0, 0, 0, 0.07) !important;
      }
      .ym-light-theme .ym-input::placeholder {
        color: rgba(0, 0, 0, 0.4) !important;
      }
      .ym-light-theme .ym-select {
        background-color: rgba(0, 0, 0, 0.04) !important;
        border: 1px solid rgba(0, 0, 0, 0.15) !important;
        color: #000000 !important;
        background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlsaW5lIHBvaW50cz0iNiA5IDEyIDE1IDE4IDkiPjwvcG9seWxpbmU+PC9zdmc+");
      }
      .ym-light-theme .ym-select:focus {
        border-color: rgba(0, 0, 0, 0.4) !important;
        background-color: rgba(0, 0, 0, 0.07) !important;
      }
      .ym-light-theme .ym-select option {
        background: #ffffff;
        color: #000000;
      }
      .ym-light-theme .ym-slider {
        background-color: rgba(0, 0, 0, 0.15) !important;
      }
    </style>
  `;

  // Находим самый первый элемент настроек в списке (обычно это ряд содержащий "Офлайн-режим" или первый дочерний элемент списка)
  // Вставляем НАШ блок строго ПЕРЕД первым элементом настроек, но ПОСЛЕ заголовка/хедера.
  // Это гарантирует, что блок попадет в прокручиваемый список настроек, не налезая на шапку «Настройки».
  const firstSettingsItem = listContainer.querySelector('div, li');
  if (firstSettingsItem) {
    listContainer.insertBefore(block, firstSettingsItem);
  } else {
    listContainer.appendChild(block);
  }

  const lyricsModeSelect = document.getElementById('ym-custom-lyrics-mode');
  if (lyricsModeSelect) {
    lyricsModeSelect.addEventListener('change', (e) => {
      localStorage.setItem('ymCustomLyricsMode', e.target.value);
    });
  }

  // === Обработчики Локального Сервера (Только для Electron) ===
  const localServerSection = document.getElementById('ym-local-server-section');
  if (window.__ymSyncBridge && window.__ymSyncBridge.startLocalServer) {
    localServerSection.style.display = 'block';
    
    const serverBtn = document.getElementById('ym-local-server-btn');
    const serverStatus = document.getElementById('ym-local-server-status');
    const serverUrl = document.getElementById('ym-local-server-url');
    const serverError = document.getElementById('ym-local-server-error');
    let isServerRunning = false;

    window.__ymSyncBridge.onServerStatus((statusData) => {
      if (statusData === true || statusData === false) return; // ignore old boolean statuses if any
      serverError.style.display = 'none';

      if (statusData.status === 'starting') {
        serverStatus.textContent = 'Запускается туннель...';
        serverBtn.textContent = 'Остановить';
        serverBtn.style.opacity = '0.5';
        serverBtn.style.pointerEvents = 'none';
        isServerRunning = true;
      } else if (statusData.status === 'running') {
        serverStatus.innerHTML = '<strong style="color: #4caf50;">Туннель открыт!</strong>';
        serverBtn.textContent = 'Остановить';
        serverBtn.style.opacity = '1';
        serverBtn.style.pointerEvents = 'auto';
        serverUrl.style.display = 'block';
        serverUrl.value = statusData.url;
        // Копируем в буфер
        navigator.clipboard.writeText(statusData.url).catch(console.error);
        isServerRunning = true;
      } else if (statusData.status === 'stopped') {
        serverStatus.textContent = 'Остановлен';
        serverBtn.textContent = 'Запустить сервер';
        serverBtn.style.opacity = '1';
        serverBtn.style.pointerEvents = 'auto';
        serverUrl.style.display = 'none';
        serverUrl.value = '';
        isServerRunning = false;
      } else if (statusData.status === 'error') {
        serverStatus.textContent = 'Ошибка запуска';
        serverBtn.textContent = 'Запустить сервер';
        serverBtn.style.opacity = '1';
        serverBtn.style.pointerEvents = 'auto';
        serverUrl.style.display = 'none';
        serverError.style.display = 'block';
        serverError.textContent = statusData.error;
        isServerRunning = false;
      }
    });

    serverBtn.addEventListener('click', () => {
      if (isServerRunning) {
        window.__ymSyncBridge.stopLocalServer();
      } else {
        serverError.style.display = 'none';
        serverStatus.textContent = 'Подготовка...';
        serverBtn.style.opacity = '0.5';
        serverBtn.style.pointerEvents = 'none';
        window.__ymSyncBridge.startLocalServer();
      }
    });
  }

  // === Обработчики Last.fm ===
  const lastfmToggle = document.getElementById('ym-lastfm-toggle');

  if (lastfmToggle) {
    lastfmToggle.addEventListener('change', (e) => {
      localStorage.setItem('ymScrobblerLastfmEnabled', e.target.checked ? 'true' : 'false');
      syncSettingsToPreload();
    });
  }

  const setupLastFmEvents = () => {
    const loginBtn = document.getElementById('ym-lastfm-login-btn');
    const confirmBtn = document.getElementById('ym-lastfm-confirm-btn');
    const logoutBtn = document.getElementById('ym-lastfm-logout-btn');

    if (loginBtn) {
      loginBtn.addEventListener('click', async () => {
        try {
          const userApiKey = document.getElementById('ym-lastfm-apikey').value.trim();
          const userSecret = document.getElementById('ym-lastfm-secret').value.trim();
          
          if (!userApiKey || !userSecret) {
            alert('Пожалуйста, введите API Key и Shared Secret от Last.fm перед авторизацией.');
            return;
          }

          loginBtn.textContent = 'Получение ссылки...';
          loginBtn.disabled = true;

          // Сохраняем ключи в localStorage
          localStorage.setItem('ymScrobblerLastfmApiKey', userApiKey);
          localStorage.setItem('ymScrobblerLastfmSecret', userSecret);
          syncSettingsToPreload();

          const bridge = window.__ymSyncBridge;
          if (!bridge || typeof bridge.lastFmGetToken !== 'function') {
            throw new Error('Функции моста недоступны');
          }

          const token = await bridge.lastFmGetToken(userApiKey, userSecret);
          lastFmPendingToken = token;

          // Открываем браузер на страницу авторизации с валидным ключом
          window.open(`https://www.last.fm/api/auth/?api_key=${userApiKey}&token=${token}`);

          loginBtn.style.display = 'none';
          confirmBtn.style.display = 'inline-block';
        } catch (err) {
          console.error(err);
          alert('Ошибка авторизации Last.fm: ' + err.message);
          loginBtn.textContent = 'Войти через Last.fm';
          loginBtn.disabled = false;
        }
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        try {
          confirmBtn.textContent = 'Проверка...';
          confirmBtn.disabled = true;

          const bridge = window.__ymSyncBridge;
          const userApiKey = localStorage.getItem('ymScrobblerLastfmApiKey');
          const userSecret = localStorage.getItem('ymScrobblerLastfmSecret');
          const session = await bridge.lastFmGetSession(lastFmPendingToken, userApiKey, userSecret);

          localStorage.setItem('ymScrobblerLastfmSessionKey', session.sessionKey);
          localStorage.setItem('ymScrobblerLastfmUsername', session.username);
          localStorage.setItem('ymScrobblerLastfmEnabled', 'true');

          // Обновляем UI
          document.getElementById('ym-lastfm-status').innerHTML = `Подключено как: <strong class="ym-settings-strong">${session.username}</strong>`;
          document.getElementById('ym-lastfm-actions').innerHTML = `<button id="ym-lastfm-logout-btn" class="ym-btn-secondary">Выйти</button>`;
          const keysContainer = document.getElementById('ym-lastfm-keys-container');
          if (keysContainer) keysContainer.style.display = 'none';
          if (lastfmToggle) lastfmToggle.checked = true;

          syncSettingsToPreload();
          setupLastFmEvents();
        } catch (err) {
          console.error(err);
          alert('Не удалось подтвердить авторизацию. Убедитесь, что вы нажали "Разрешить доступ" на открывшейся веб-странице Last.fm.');
          confirmBtn.textContent = 'Я подтвердил авторизацию';
          confirmBtn.disabled = false;
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('ymScrobblerLastfmSessionKey');
        localStorage.removeItem('ymScrobblerLastfmUsername');
        localStorage.removeItem('ymScrobblerLastfmApiKey');
        localStorage.removeItem('ymScrobblerLastfmSecret');
        localStorage.setItem('ymScrobblerLastfmEnabled', 'false');

        document.getElementById('ym-lastfm-status').textContent = 'Не авторизован';
        document.getElementById('ym-lastfm-actions').innerHTML = `<button id="ym-lastfm-login-btn" class="ym-btn-primary">Войти через Last.fm</button>
           <button id="ym-lastfm-confirm-btn" class="ym-btn-secondary" style="display:none;">Я подтвердил авторизацию</button>`;
        
        const keysContainer = document.getElementById('ym-lastfm-keys-container');
        if (keysContainer) keysContainer.style.display = 'block';
        
        const keyInput = document.getElementById('ym-lastfm-apikey');
        const secInput = document.getElementById('ym-lastfm-secret');
        if (keyInput) keyInput.value = '';
        if (secInput) secInput.value = '';

        if (lastfmToggle) lastfmToggle.checked = false;

        syncSettingsToPreload();
        setupLastFmEvents();
      });
    }
  };

  setupLastFmEvents();

  // Настройка слушателей ListenBrainz
  const listenbrainzToggle = document.getElementById('ym-listenbrainz-toggle');
  if (listenbrainzToggle) {
    listenbrainzToggle.addEventListener('change', (e) => {
      localStorage.setItem('ymScrobblerListenbrainzEnabled', e.target.checked ? 'true' : 'false');
      syncSettingsToPreload();
    });
  }

  const saveBtn = document.getElementById('ym-listenbrainz-save-btn');
  const tokenInput = document.getElementById('ym-listenbrainz-token');
  const lbStatus = document.getElementById('ym-listenbrainz-status');

  if (saveBtn && tokenInput) {
    saveBtn.addEventListener('click', async () => {
      const token = tokenInput.value.trim();
      if (!token) {
        localStorage.removeItem('ymScrobblerListenbrainzToken');
        localStorage.removeItem('ymScrobblerListenbrainzUsername');
        localStorage.setItem('ymScrobblerListenbrainzEnabled', 'false');
        lbStatus.textContent = 'Не подключено';
        if (listenbrainzToggle) listenbrainzToggle.checked = false;
        syncSettingsToPreload();
        return;
      }

      try {
        saveBtn.textContent = 'Проверка...';
        saveBtn.disabled = true;

        const bridge = window.__ymSyncBridge;
        if (!bridge || typeof bridge.listenBrainzValidateToken !== 'function') {
          throw new Error('Функции моста недоступны');
        }

        const username = await bridge.listenBrainzValidateToken(token);
        
        localStorage.setItem('ymScrobblerListenbrainzToken', token);
        localStorage.setItem('ymScrobblerListenbrainzUsername', username);
        localStorage.setItem('ymScrobblerListenbrainzEnabled', 'true');

        lbStatus.innerHTML = `Подключено как: <strong class="ym-settings-strong">${username}</strong>`;
        if (listenbrainzToggle) listenbrainzToggle.checked = true;

        syncSettingsToPreload();
        alert('Токен ListenBrainz успешно сохранен и проверен!');
      } catch (err) {
        console.error(err);
        alert('Ошибка валидации токена ListenBrainz: ' + err.message);
      } finally {
        saveBtn.textContent = 'Сохранить';
        saveBtn.disabled = false;
      }
    });
  }
}

// Регулярно сканируем DOM на предмет нахождения на странице настроек
setInterval(checkAndInjectSettings, 1000);


// --- Component: shared/wrapped/chart.js ---
/*!
 * Chart.js v4.5.1
 * https://www.chartjs.org
 * (c) 2025 Chart.js Contributors
 * Released under the MIT License
 */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).Chart=e()}(this,(function(){"use strict";var t=Object.freeze({__proto__:null,get Colors(){return Jo},get Decimation(){return ta},get Filler(){return ba},get Legend(){return Ma},get SubTitle(){return Pa},get Title(){return ka},get Tooltip(){return Na}});function e(){}const i=(()=>{let t=0;return()=>t++})();function s(t){return null==t}function n(t){if(Array.isArray&&Array.isArray(t))return!0;const e=Object.prototype.toString.call(t);return"[object"===e.slice(0,7)&&"Array]"===e.slice(-6)}function o(t){return null!==t&&"[object Object]"===Object.prototype.toString.call(t)}function a(t){return("number"==typeof t||t instanceof Number)&&isFinite(+t)}function r(t,e){return a(t)?t:e}function l(t,e){return void 0===t?e:t}const h=(t,e)=>"string"==typeof t&&t.endsWith("%")?parseFloat(t)/100:+t/e,c=(t,e)=>"string"==typeof t&&t.endsWith("%")?parseFloat(t)/100*e:+t;function d(t,e,i){if(t&&"function"==typeof t.call)return t.apply(i,e)}function u(t,e,i,s){let a,r,l;if(n(t))if(r=t.length,s)for(a=r-1;a>=0;a--)e.call(i,t[a],a);else for(a=0;a<r;a++)e.call(i,t[a],a);else if(o(t))for(l=Object.keys(t),r=l.length,a=0;a<r;a++)e.call(i,t[l[a]],l[a])}function f(t,e){let i,s,n,o;if(!t||!e||t.length!==e.length)return!1;for(i=0,s=t.length;i<s;++i)if(n=t[i],o=e[i],n.datasetIndex!==o.datasetIndex||n.index!==o.index)return!1;return!0}function g(t){if(n(t))return t.map(g);if(o(t)){const e=Object.create(null),i=Object.keys(t),s=i.length;let n=0;for(;n<s;++n)e[i[n]]=g(t[i[n]]);return e}return t}function p(t){return-1===["__proto__","prototype","constructor"].indexOf(t)}function m(t,e,i,s){if(!p(t))return;const n=e[t],a=i[t];o(n)&&o(a)?x(n,a,s):e[t]=g(a)}function x(t,e,i){const s=n(e)?e:[e],a=s.length;if(!o(t))return t;const r=(i=i||{}).merger||m;let l;for(let e=0;e<a;++e){if(l=s[e],!o(l))continue;const n=Object.keys(l);for(let e=0,s=n.length;e<s;++e)r(n[e],t,l,i)}return t}function b(t,e){return x(t,e,{merger:_})}function _(t,e,i){if(!p(t))return;const s=e[t],n=i[t];o(s)&&o(n)?b(s,n):Object.prototype.hasOwnProperty.call(e,t)||(e[t]=g(n))}const y={"":t=>t,x:t=>t.x,y:t=>t.y};function v(t){const e=t.split("."),i=[];let s="";for(const t of e)s+=t,s.endsWith("\\")?s=s.slice(0,-1)+".":(i.push(s),s="");return i}function M(t,e){const i=y[e]||(y[e]=function(t){const e=v(t);return t=>{for(const i of e){if(""===i)break;t=t&&t[i]}return t}}(e));return i(t)}function w(t){return t.charAt(0).toUpperCase()+t.slice(1)}const k=t=>void 0!==t,S=t=>"function"==typeof t,P=(t,e)=>{if(t.size!==e.size)return!1;for(const i of t)if(!e.has(i))return!1;return!0};function D(t){return"mouseup"===t.type||"click"===t.type||"contextmenu"===t.type}const C=Math.PI,O=2*C,A=O+C,T=Number.POSITIVE_INFINITY,L=C/180,E=C/2,R=C/4,I=2*C/3,z=Math.log10,F=Math.sign;function V(t,e,i){return Math.abs(t-e)<i}function B(t){const e=Math.round(t);t=V(t,e,t/1e3)?e:t;const i=Math.pow(10,Math.floor(z(t))),s=t/i;return(s<=1?1:s<=2?2:s<=5?5:10)*i}function W(t){const e=[],i=Math.sqrt(t);let s;for(s=1;s<i;s++)t%s==0&&(e.push(s),e.push(t/s));return i===(0|i)&&e.push(i),e.sort(((t,e)=>t-e)).pop(),e}function N(t){return!function(t){return"symbol"==typeof t||"object"==typeof t&&null!==t&&!(Symbol.toPrimitive in t||"toString"in t||"valueOf"in t)}(t)&&!isNaN(parseFloat(t))&&isFinite(t)}function H(t,e){const i=Math.round(t);return i-e<=t&&i+e>=t}function j(t,e,i){let s,n,o;for(s=0,n=t.length;s<n;s++)o=t[s][i],isNaN(o)||(e.min=Math.min(e.min,o),e.max=Math.max(e.max,o))}function $(t){return t*(C/180)}function Y(t){return t*(180/C)}function U(t){if(!a(t))return;let e=1,i=0;for(;Math.round(t*e)/e!==t;)e*=10,i++;return i}function X(t,e){const i=e.x-t.x,s=e.y-t.y,n=Math.sqrt(i*i+s*s);let o=Math.atan2(s,i);return o<-.5*C&&(o+=O),{angle:o,distance:n}}function q(t,e){return Math.sqrt(Math.pow(e.x-t.x,2)+Math.pow(e.y-t.y,2))}function K(t,e){return(t-e+A)%O-C}function G(t){return(t%O+O)%O}function J(t,e,i,s){const n=G(t),o=G(e),a=G(i),r=G(o-n),l=G(a-n),h=G(n-o),c=G(n-a);return n===o||n===a||s&&o===a||r>l&&h<c}function Z(t,e,i){return Math.max(e,Math.min(i,t))}function Q(t){return Z(t,-32768,32767)}function tt(t,e,i,s=1e-6){return t>=Math.min(e,i)-s&&t<=Math.max(e,i)+s}function et(t,e,i){i=i||(i=>t[i]<e);let s,n=t.length-1,o=0;for(;n-o>1;)s=o+n>>1,i(s)?o=s:n=s;return{lo:o,hi:n}}const it=(t,e,i,s)=>et(t,i,s?s=>{const n=t[s][e];return n<i||n===i&&t[s+1][e]===i}:s=>t[s][e]<i),st=(t,e,i)=>et(t,i,(s=>t[s][e]>=i));function nt(t,e,i){let s=0,n=t.length;for(;s<n&&t[s]<e;)s++;for(;n>s&&t[n-1]>i;)n--;return s>0||n<t.length?t.slice(s,n):t}const ot=["push","pop","shift","splice","unshift"];function at(t,e){t._chartjs?t._chartjs.listeners.push(e):(Object.defineProperty(t,"_chartjs",{configurable:!0,enumerable:!1,value:{listeners:[e]}}),ot.forEach((e=>{const i="_onData"+w(e),s=t[e];Object.defineProperty(t,e,{configurable:!0,enumerable:!1,value(...e){const n=s.apply(this,e);return t._chartjs.listeners.forEach((t=>{"function"==typeof t[i]&&t[i](...e)})),n}})})))}function rt(t,e){const i=t._chartjs;if(!i)return;const s=i.listeners,n=s.indexOf(e);-1!==n&&s.splice(n,1),s.length>0||(ot.forEach((e=>{delete t[e]})),delete t._chartjs)}function lt(t){const e=new Set(t);return e.size===t.length?t:Array.from(e)}const ht="undefined"==typeof window?function(t){return t()}:window.requestAnimationFrame;function ct(t,e){let i=[],s=!1;return function(...n){i=n,s||(s=!0,ht.call(window,(()=>{s=!1,t.apply(e,i)})))}}function dt(t,e){let i;return function(...s){return e?(clearTimeout(i),i=setTimeout(t,e,s)):t.apply(this,s),e}}const ut=t=>"start"===t?"left":"end"===t?"right":"center",ft=(t,e,i)=>"start"===t?e:"end"===t?i:(e+i)/2,gt=(t,e,i,s)=>t===(s?"left":"right")?i:"center"===t?(e+i)/2:e;function pt(t,e,i){const n=e.length;let o=0,a=n;if(t._sorted){const{iScale:r,vScale:l,_parsed:h}=t,c=t.dataset&&t.dataset.options?t.dataset.options.spanGaps:null,d=r.axis,{min:u,max:f,minDefined:g,maxDefined:p}=r.getUserBounds();if(g){if(o=Math.min(it(h,d,u).lo,i?n:it(e,d,r.getPixelForValue(u)).lo),c){const t=h.slice(0,o+1).reverse().findIndex((t=>!s(t[l.axis])));o-=Math.max(0,t)}o=Z(o,0,n-1)}if(p){let t=Math.max(it(h,r.axis,f,!0).hi+1,i?0:it(e,d,r.getPixelForValue(f),!0).hi+1);if(c){const e=h.slice(t-1).findIndex((t=>!s(t[l.axis])));t+=Math.max(0,e)}a=Z(t,o,n)-o}else a=n-o}return{start:o,count:a}}function mt(t){const{xScale:e,yScale:i,_scaleRanges:s}=t,n={xmin:e.min,xmax:e.max,ymin:i.min,ymax:i.max};if(!s)return t._scaleRanges=n,!0;const o=s.xmin!==e.min||s.xmax!==e.max||s.ymin!==i.min||s.ymax!==i.max;return Object.assign(s,n),o}class xt{constructor(){this._request=null,this._charts=new Map,this._running=!1,this._lastDate=void 0}_notify(t,e,i,s){const n=e.listeners[s],o=e.duration;n.forEach((s=>s({chart:t,initial:e.initial,numSteps:o,currentStep:Math.min(i-e.start,o)})))}_refresh(){this._request||(this._running=!0,this._request=ht.call(window,(()=>{this._update(),this._request=null,this._running&&this._refresh()})))}_update(t=Date.now()){let e=0;this._charts.forEach(((i,s)=>{if(!i.running||!i.items.length)return;const n=i.items;let o,a=n.length-1,r=!1;for(;a>=0;--a)o=n[a],o._active?(o._total>i.duration&&(i.duration=o._total),o.tick(t),r=!0):(n[a]=n[n.length-1],n.pop());r&&(s.draw(),this._notify(s,i,t,"progress")),n.length||(i.running=!1,this._notify(s,i,t,"complete"),i.initial=!1),e+=n.length})),this._lastDate=t,0===e&&(this._running=!1)}_getAnims(t){const e=this._charts;let i=e.get(t);return i||(i={running:!1,initial:!0,items:[],listeners:{complete:[],progress:[]}},e.set(t,i)),i}listen(t,e,i){this._getAnims(t).listeners[e].push(i)}add(t,e){e&&e.length&&this._getAnims(t).items.push(...e)}has(t){return this._getAnims(t).items.length>0}start(t){const e=this._charts.get(t);e&&(e.running=!0,e.start=Date.now(),e.duration=e.items.reduce(((t,e)=>Math.max(t,e._duration)),0),this._refresh())}running(t){if(!this._running)return!1;const e=this._charts.get(t);return!!(e&&e.running&&e.items.length)}stop(t){const e=this._charts.get(t);if(!e||!e.items.length)return;const i=e.items;let s=i.length-1;for(;s>=0;--s)i[s].cancel();e.items=[],this._notify(t,e,Date.now(),"complete")}remove(t){return this._charts.delete(t)}}var bt=new xt;
/*!
 * @kurkle/color v0.3.2
 * https://github.com/kurkle/color#readme
 * (c) 2023 Jukka Kurkela
 * Released under the MIT License
 */function _t(t){return t+.5|0}const yt=(t,e,i)=>Math.max(Math.min(t,i),e);function vt(t){return yt(_t(2.55*t),0,255)}function Mt(t){return yt(_t(255*t),0,255)}function wt(t){return yt(_t(t/2.55)/100,0,1)}function kt(t){return yt(_t(100*t),0,100)}const St={0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,A:10,B:11,C:12,D:13,E:14,F:15,a:10,b:11,c:12,d:13,e:14,f:15},Pt=[..."0123456789ABCDEF"],Dt=t=>Pt[15&t],Ct=t=>Pt[(240&t)>>4]+Pt[15&t],Ot=t=>(240&t)>>4==(15&t);function At(t){var e=(t=>Ot(t.r)&&Ot(t.g)&&Ot(t.b)&&Ot(t.a))(t)?Dt:Ct;return t?"#"+e(t.r)+e(t.g)+e(t.b)+((t,e)=>t<255?e(t):"")(t.a,e):void 0}const Tt=/^(hsla?|hwb|hsv)\(\s*([-+.e\d]+)(?:deg)?[\s,]+([-+.e\d]+)%[\s,]+([-+.e\d]+)%(?:[\s,]+([-+.e\d]+)(%)?)?\s*\)$/;function Lt(t,e,i){const s=e*Math.min(i,1-i),n=(e,n=(e+t/30)%12)=>i-s*Math.max(Math.min(n-3,9-n,1),-1);return[n(0),n(8),n(4)]}function Et(t,e,i){const s=(s,n=(s+t/60)%6)=>i-i*e*Math.max(Math.min(n,4-n,1),0);return[s(5),s(3),s(1)]}function Rt(t,e,i){const s=Lt(t,1,.5);let n;for(e+i>1&&(n=1/(e+i),e*=n,i*=n),n=0;n<3;n++)s[n]*=1-e-i,s[n]+=e;return s}function It(t){const e=t.r/255,i=t.g/255,s=t.b/255,n=Math.max(e,i,s),o=Math.min(e,i,s),a=(n+o)/2;let r,l,h;return n!==o&&(h=n-o,l=a>.5?h/(2-n-o):h/(n+o),r=function(t,e,i,s,n){return t===n?(e-i)/s+(e<i?6:0):e===n?(i-t)/s+2:(t-e)/s+4}(e,i,s,h,n),r=60*r+.5),[0|r,l||0,a]}function zt(t,e,i,s){return(Array.isArray(e)?t(e[0],e[1],e[2]):t(e,i,s)).map(Mt)}function Ft(t,e,i){return zt(Lt,t,e,i)}function Vt(t){return(t%360+360)%360}function Bt(t){const e=Tt.exec(t);let i,s=255;if(!e)return;e[5]!==i&&(s=e[6]?vt(+e[5]):Mt(+e[5]));const n=Vt(+e[2]),o=+e[3]/100,a=+e[4]/100;return i="hwb"===e[1]?function(t,e,i){return zt(Rt,t,e,i)}(n,o,a):"hsv"===e[1]?function(t,e,i){return zt(Et,t,e,i)}(n,o,a):Ft(n,o,a),{r:i[0],g:i[1],b:i[2],a:s}}const Wt={x:"dark",Z:"light",Y:"re",X:"blu",W:"gr",V:"medium",U:"slate",A:"ee",T:"ol",S:"or",B:"ra",C:"lateg",D:"ights",R:"in",Q:"turquois",E:"hi",P:"ro",O:"al",N:"le",M:"de",L:"yello",F:"en",K:"ch",G:"arks",H:"ea",I:"ightg",J:"wh"},Nt={OiceXe:"f0f8ff",antiquewEte:"faebd7",aqua:"ffff",aquamarRe:"7fffd4",azuY:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"0",blanKedOmond:"ffebcd",Xe:"ff",XeviTet:"8a2be2",bPwn:"a52a2a",burlywood:"deb887",caMtXe:"5f9ea0",KartYuse:"7fff00",KocTate:"d2691e",cSO:"ff7f50",cSnflowerXe:"6495ed",cSnsilk:"fff8dc",crimson:"dc143c",cyan:"ffff",xXe:"8b",xcyan:"8b8b",xgTMnPd:"b8860b",xWay:"a9a9a9",xgYF:"6400",xgYy:"a9a9a9",xkhaki:"bdb76b",xmagFta:"8b008b",xTivegYF:"556b2f",xSange:"ff8c00",xScEd:"9932cc",xYd:"8b0000",xsOmon:"e9967a",xsHgYF:"8fbc8f",xUXe:"483d8b",xUWay:"2f4f4f",xUgYy:"2f4f4f",xQe:"ced1",xviTet:"9400d3",dAppRk:"ff1493",dApskyXe:"bfff",dimWay:"696969",dimgYy:"696969",dodgerXe:"1e90ff",fiYbrick:"b22222",flSOwEte:"fffaf0",foYstWAn:"228b22",fuKsia:"ff00ff",gaRsbSo:"dcdcdc",ghostwEte:"f8f8ff",gTd:"ffd700",gTMnPd:"daa520",Way:"808080",gYF:"8000",gYFLw:"adff2f",gYy:"808080",honeyMw:"f0fff0",hotpRk:"ff69b4",RdianYd:"cd5c5c",Rdigo:"4b0082",ivSy:"fffff0",khaki:"f0e68c",lavFMr:"e6e6fa",lavFMrXsh:"fff0f5",lawngYF:"7cfc00",NmoncEffon:"fffacd",ZXe:"add8e6",ZcSO:"f08080",Zcyan:"e0ffff",ZgTMnPdLw:"fafad2",ZWay:"d3d3d3",ZgYF:"90ee90",ZgYy:"d3d3d3",ZpRk:"ffb6c1",ZsOmon:"ffa07a",ZsHgYF:"20b2aa",ZskyXe:"87cefa",ZUWay:"778899",ZUgYy:"778899",ZstAlXe:"b0c4de",ZLw:"ffffe0",lime:"ff00",limegYF:"32cd32",lRF:"faf0e6",magFta:"ff00ff",maPon:"800000",VaquamarRe:"66cdaa",VXe:"cd",VScEd:"ba55d3",VpurpN:"9370db",VsHgYF:"3cb371",VUXe:"7b68ee",VsprRggYF:"fa9a",VQe:"48d1cc",VviTetYd:"c71585",midnightXe:"191970",mRtcYam:"f5fffa",mistyPse:"ffe4e1",moccasR:"ffe4b5",navajowEte:"ffdead",navy:"80",Tdlace:"fdf5e6",Tive:"808000",TivedBb:"6b8e23",Sange:"ffa500",SangeYd:"ff4500",ScEd:"da70d6",pOegTMnPd:"eee8aa",pOegYF:"98fb98",pOeQe:"afeeee",pOeviTetYd:"db7093",papayawEp:"ffefd5",pHKpuff:"ffdab9",peru:"cd853f",pRk:"ffc0cb",plum:"dda0dd",powMrXe:"b0e0e6",purpN:"800080",YbeccapurpN:"663399",Yd:"ff0000",Psybrown:"bc8f8f",PyOXe:"4169e1",saddNbPwn:"8b4513",sOmon:"fa8072",sandybPwn:"f4a460",sHgYF:"2e8b57",sHshell:"fff5ee",siFna:"a0522d",silver:"c0c0c0",skyXe:"87ceeb",UXe:"6a5acd",UWay:"708090",UgYy:"708090",snow:"fffafa",sprRggYF:"ff7f",stAlXe:"4682b4",tan:"d2b48c",teO:"8080",tEstN:"d8bfd8",tomato:"ff6347",Qe:"40e0d0",viTet:"ee82ee",JHt:"f5deb3",wEte:"ffffff",wEtesmoke:"f5f5f5",Lw:"ffff00",LwgYF:"9acd32"};let Ht;function jt(t){Ht||(Ht=function(){const t={},e=Object.keys(Nt),i=Object.keys(Wt);let s,n,o,a,r;for(s=0;s<e.length;s++){for(a=r=e[s],n=0;n<i.length;n++)o=i[n],r=r.replace(o,Wt[o]);o=parseInt(Nt[a],16),t[r]=[o>>16&255,o>>8&255,255&o]}return t}(),Ht.transparent=[0,0,0,0]);const e=Ht[t.toLowerCase()];return e&&{r:e[0],g:e[1],b:e[2],a:4===e.length?e[3]:255}}const $t=/^rgba?\(\s*([-+.\d]+)(%)?[\s,]+([-+.e\d]+)(%)?[\s,]+([-+.e\d]+)(%)?(?:[\s,/]+([-+.e\d]+)(%)?)?\s*\)$/;const Yt=t=>t<=.0031308?12.92*t:1.055*Math.pow(t,1/2.4)-.055,Ut=t=>t<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4);function Xt(t,e,i){if(t){let s=It(t);s[e]=Math.max(0,Math.min(s[e]+s[e]*i,0===e?360:1)),s=Ft(s),t.r=s[0],t.g=s[1],t.b=s[2]}}function qt(t,e){return t?Object.assign(e||{},t):t}function Kt(t){var e={r:0,g:0,b:0,a:255};return Array.isArray(t)?t.length>=3&&(e={r:t[0],g:t[1],b:t[2],a:255},t.length>3&&(e.a=Mt(t[3]))):(e=qt(t,{r:0,g:0,b:0,a:1})).a=Mt(e.a),e}function Gt(t){return"r"===t.charAt(0)?function(t){const e=$t.exec(t);let i,s,n,o=255;if(e){if(e[7]!==i){const t=+e[7];o=e[8]?vt(t):yt(255*t,0,255)}return i=+e[1],s=+e[3],n=+e[5],i=255&(e[2]?vt(i):yt(i,0,255)),s=255&(e[4]?vt(s):yt(s,0,255)),n=255&(e[6]?vt(n):yt(n,0,255)),{r:i,g:s,b:n,a:o}}}(t):Bt(t)}class Jt{constructor(t){if(t instanceof Jt)return t;const e=typeof t;let i;var s,n,o;"object"===e?i=Kt(t):"string"===e&&(o=(s=t).length,"#"===s[0]&&(4===o||5===o?n={r:255&17*St[s[1]],g:255&17*St[s[2]],b:255&17*St[s[3]],a:5===o?17*St[s[4]]:255}:7!==o&&9!==o||(n={r:St[s[1]]<<4|St[s[2]],g:St[s[3]]<<4|St[s[4]],b:St[s[5]]<<4|St[s[6]],a:9===o?St[s[7]]<<4|St[s[8]]:255})),i=n||jt(t)||Gt(t)),this._rgb=i,this._valid=!!i}get valid(){return this._valid}get rgb(){var t=qt(this._rgb);return t&&(t.a=wt(t.a)),t}set rgb(t){this._rgb=Kt(t)}rgbString(){return this._valid?(t=this._rgb)&&(t.a<255?`rgba(${t.r}, ${t.g}, ${t.b}, ${wt(t.a)})`:`rgb(${t.r}, ${t.g}, ${t.b})`):void 0;var t}hexString(){return this._valid?At(this._rgb):void 0}hslString(){return this._valid?function(t){if(!t)return;const e=It(t),i=e[0],s=kt(e[1]),n=kt(e[2]);return t.a<255?`hsla(${i}, ${s}%, ${n}%, ${wt(t.a)})`:`hsl(${i}, ${s}%, ${n}%)`}(this._rgb):void 0}mix(t,e){if(t){const i=this.rgb,s=t.rgb;let n;const o=e===n?.5:e,a=2*o-1,r=i.a-s.a,l=((a*r==-1?a:(a+r)/(1+a*r))+1)/2;n=1-l,i.r=255&l*i.r+n*s.r+.5,i.g=255&l*i.g+n*s.g+.5,i.b=255&l*i.b+n*s.b+.5,i.a=o*i.a+(1-o)*s.a,this.rgb=i}return this}interpolate(t,e){return t&&(this._rgb=function(t,e,i){const s=Ut(wt(t.r)),n=Ut(wt(t.g)),o=Ut(wt(t.b));return{r:Mt(Yt(s+i*(Ut(wt(e.r))-s))),g:Mt(Yt(n+i*(Ut(wt(e.g))-n))),b:Mt(Yt(o+i*(Ut(wt(e.b))-o))),a:t.a+i*(e.a-t.a)}}(this._rgb,t._rgb,e)),this}clone(){return new Jt(this.rgb)}alpha(t){return this._rgb.a=Mt(t),this}clearer(t){return this._rgb.a*=1-t,this}greyscale(){const t=this._rgb,e=_t(.3*t.r+.59*t.g+.11*t.b);return t.r=t.g=t.b=e,this}opaquer(t){return this._rgb.a*=1+t,this}negate(){const t=this._rgb;return t.r=255-t.r,t.g=255-t.g,t.b=255-t.b,this}lighten(t){return Xt(this._rgb,2,t),this}darken(t){return Xt(this._rgb,2,-t),this}saturate(t){return Xt(this._rgb,1,t),this}desaturate(t){return Xt(this._rgb,1,-t),this}rotate(t){return function(t,e){var i=It(t);i[0]=Vt(i[0]+e),i=Ft(i),t.r=i[0],t.g=i[1],t.b=i[2]}(this._rgb,t),this}}function Zt(t){if(t&&"object"==typeof t){const e=t.toString();return"[object CanvasPattern]"===e||"[object CanvasGradient]"===e}return!1}function Qt(t){return Zt(t)?t:new Jt(t)}function te(t){return Zt(t)?t:new Jt(t).saturate(.5).darken(.1).hexString()}const ee=["x","y","borderWidth","radius","tension"],ie=["color","borderColor","backgroundColor"];const se=new Map;function ne(t,e,i){return function(t,e){e=e||{};const i=t+JSON.stringify(e);let s=se.get(i);return s||(s=new Intl.NumberFormat(t,e),se.set(i,s)),s}(e,i).format(t)}const oe={values:t=>n(t)?t:""+t,numeric(t,e,i){if(0===t)return"0";const s=this.chart.options.locale;let n,o=t;if(i.length>1){const e=Math.max(Math.abs(i[0].value),Math.abs(i[i.length-1].value));(e<1e-4||e>1e15)&&(n="scientific"),o=function(t,e){let i=e.length>3?e[2].value-e[1].value:e[1].value-e[0].value;Math.abs(i)>=1&&t!==Math.floor(t)&&(i=t-Math.floor(t));return i}(t,i)}const a=z(Math.abs(o)),r=isNaN(a)?1:Math.max(Math.min(-1*Math.floor(a),20),0),l={notation:n,minimumFractionDigits:r,maximumFractionDigits:r};return Object.assign(l,this.options.ticks.format),ne(t,s,l)},logarithmic(t,e,i){if(0===t)return"0";const s=i[e].significand||t/Math.pow(10,Math.floor(z(t)));return[1,2,3,5,10,15].includes(s)||e>.8*i.length?oe.numeric.call(this,t,e,i):""}};var ae={formatters:oe};const re=Object.create(null),le=Object.create(null);function he(t,e){if(!e)return t;const i=e.split(".");for(let e=0,s=i.length;e<s;++e){const s=i[e];t=t[s]||(t[s]=Object.create(null))}return t}function ce(t,e,i){return"string"==typeof e?x(he(t,e),i):x(he(t,""),e)}class de{constructor(t,e){this.animation=void 0,this.backgroundColor="rgba(0,0,0,0.1)",this.borderColor="rgba(0,0,0,0.1)",this.color="#666",this.datasets={},this.devicePixelRatio=t=>t.chart.platform.getDevicePixelRatio(),this.elements={},this.events=["mousemove","mouseout","click","touchstart","touchmove"],this.font={family:"'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",size:12,style:"normal",lineHeight:1.2,weight:null},this.hover={},this.hoverBackgroundColor=(t,e)=>te(e.backgroundColor),this.hoverBorderColor=(t,e)=>te(e.borderColor),this.hoverColor=(t,e)=>te(e.color),this.indexAxis="x",this.interaction={mode:"nearest",intersect:!0,includeInvisible:!1},this.maintainAspectRatio=!0,this.onHover=null,this.onClick=null,this.parsing=!0,this.plugins={},this.responsive=!0,this.scale=void 0,this.scales={},this.showLine=!0,this.drawActiveElementsOnTop=!0,this.describe(t),this.apply(e)}set(t,e){return ce(this,t,e)}get(t){return he(this,t)}describe(t,e){return ce(le,t,e)}override(t,e){return ce(re,t,e)}route(t,e,i,s){const n=he(this,t),a=he(this,i),r="_"+e;Object.defineProperties(n,{[r]:{value:n[e],writable:!0},[e]:{enumerable:!0,get(){const t=this[r],e=a[s];return o(t)?Object.assign({},e,t):l(t,e)},set(t){this[r]=t}}})}apply(t){t.forEach((t=>t(this)))}}var ue=new de({_scriptable:t=>!t.startsWith("on"),_indexable:t=>"events"!==t,hover:{_fallback:"interaction"},interaction:{_scriptable:!1,_indexable:!1}},[function(t){t.set("animation",{delay:void 0,duration:1e3,easing:"easeOutQuart",fn:void 0,from:void 0,loop:void 0,to:void 0,type:void 0}),t.describe("animation",{_fallback:!1,_indexable:!1,_scriptable:t=>"onProgress"!==t&&"onComplete"!==t&&"fn"!==t}),t.set("animations",{colors:{type:"color",properties:ie},numbers:{type:"number",properties:ee}}),t.describe("animations",{_fallback:"animation"}),t.set("transitions",{active:{animation:{duration:400}},resize:{animation:{duration:0}},show:{animations:{colors:{from:"transparent"},visible:{type:"boolean",duration:0}}},hide:{animations:{colors:{to:"transparent"},visible:{type:"boolean",easing:"linear",fn:t=>0|t}}}})},function(t){t.set("layout",{autoPadding:!0,padding:{top:0,right:0,bottom:0,left:0}})},function(t){t.set("scale",{display:!0,offset:!1,reverse:!1,beginAtZero:!1,bounds:"ticks",clip:!0,grace:0,grid:{display:!0,lineWidth:1,drawOnChartArea:!0,drawTicks:!0,tickLength:8,tickWidth:(t,e)=>e.lineWidth,tickColor:(t,e)=>e.color,offset:!1},border:{display:!0,dash:[],dashOffset:0,width:1},title:{display:!1,text:"",padding:{top:4,bottom:4}},ticks:{minRotation:0,maxRotation:50,mirror:!1,textStrokeWidth:0,textStrokeColor:"",padding:3,display:!0,autoSkip:!0,autoSkipPadding:3,labelOffset:0,callback:ae.formatters.values,minor:{},major:{},align:"center",crossAlign:"near",showLabelBackdrop:!1,backdropColor:"rgba(255, 255, 255, 0.75)",backdropPadding:2}}),t.route("scale.ticks","color","","color"),t.route("scale.grid","color","","borderColor"),t.route("scale.border","color","","borderColor"),t.route("scale.title","color","","color"),t.describe("scale",{_fallback:!1,_scriptable:t=>!t.startsWith("before")&&!t.startsWith("after")&&"callback"!==t&&"parser"!==t,_indexable:t=>"borderDash"!==t&&"tickBorderDash"!==t&&"dash"!==t}),t.describe("scales",{_fallback:"scale"}),t.describe("scale.ticks",{_scriptable:t=>"backdropPadding"!==t&&"callback"!==t,_indexable:t=>"backdropPadding"!==t})}]);function fe(){return"undefined"!=typeof window&&"undefined"!=typeof document}function ge(t){let e=t.parentNode;return e&&"[object ShadowRoot]"===e.toString()&&(e=e.host),e}function pe(t,e,i){let s;return"string"==typeof t?(s=parseInt(t,10),-1!==t.indexOf("%")&&(s=s/100*e.parentNode[i])):s=t,s}const me=t=>t.ownerDocument.defaultView.getComputedStyle(t,null);function xe(t,e){return me(t).getPropertyValue(e)}const be=["top","right","bottom","left"];function _e(t,e,i){const s={};i=i?"-"+i:"";for(let n=0;n<4;n++){const o=be[n];s[o]=parseFloat(t[e+"-"+o+i])||0}return s.width=s.left+s.right,s.height=s.top+s.bottom,s}const ye=(t,e,i)=>(t>0||e>0)&&(!i||!i.shadowRoot);function ve(t,e){if("native"in t)return t;const{canvas:i,currentDevicePixelRatio:s}=e,n=me(i),o="border-box"===n.boxSizing,a=_e(n,"padding"),r=_e(n,"border","width"),{x:l,y:h,box:c}=function(t,e){const i=t.touches,s=i&&i.length?i[0]:t,{offsetX:n,offsetY:o}=s;let a,r,l=!1;if(ye(n,o,t.target))a=n,r=o;else{const t=e.getBoundingClientRect();a=s.clientX-t.left,r=s.clientY-t.top,l=!0}return{x:a,y:r,box:l}}(t,i),d=a.left+(c&&r.left),u=a.top+(c&&r.top);let{width:f,height:g}=e;return o&&(f-=a.width+r.width,g-=a.height+r.height),{x:Math.round((l-d)/f*i.width/s),y:Math.round((h-u)/g*i.height/s)}}const Me=t=>Math.round(10*t)/10;function we(t,e,i,s){const n=me(t),o=_e(n,"margin"),a=pe(n.maxWidth,t,"clientWidth")||T,r=pe(n.maxHeight,t,"clientHeight")||T,l=function(t,e,i){let s,n;if(void 0===e||void 0===i){const o=t&&ge(t);if(o){const t=o.getBoundingClientRect(),a=me(o),r=_e(a,"border","width"),l=_e(a,"padding");e=t.width-l.width-r.width,i=t.height-l.height-r.height,s=pe(a.maxWidth,o,"clientWidth"),n=pe(a.maxHeight,o,"clientHeight")}else e=t.clientWidth,i=t.clientHeight}return{width:e,height:i,maxWidth:s||T,maxHeight:n||T}}(t,e,i);let{width:h,height:c}=l;if("content-box"===n.boxSizing){const t=_e(n,"border","width"),e=_e(n,"padding");h-=e.width+t.width,c-=e.height+t.height}h=Math.max(0,h-o.width),c=Math.max(0,s?h/s:c-o.height),h=Me(Math.min(h,a,l.maxWidth)),c=Me(Math.min(c,r,l.maxHeight)),h&&!c&&(c=Me(h/2));return(void 0!==e||void 0!==i)&&s&&l.height&&c>l.height&&(c=l.height,h=Me(Math.floor(c*s))),{width:h,height:c}}function ke(t,e,i){const s=e||1,n=Me(t.height*s),o=Me(t.width*s);t.height=Me(t.height),t.width=Me(t.width);const a=t.canvas;return a.style&&(i||!a.style.height&&!a.style.width)&&(a.style.height=`${t.height}px`,a.style.width=`${t.width}px`),(t.currentDevicePixelRatio!==s||a.height!==n||a.width!==o)&&(t.currentDevicePixelRatio=s,a.height=n,a.width=o,t.ctx.setTransform(s,0,0,s,0,0),!0)}const Se=function(){let t=!1;try{const e={get passive(){return t=!0,!1}};fe()&&(window.addEventListener("test",null,e),window.removeEventListener("test",null,e))}catch(t){}return t}();function Pe(t,e){const i=xe(t,e),s=i&&i.match(/^(\d+)(\.\d+)?px$/);return s?+s[1]:void 0}function De(t){return!t||s(t.size)||s(t.family)?null:(t.style?t.style+" ":"")+(t.weight?t.weight+" ":"")+t.size+"px "+t.family}function Ce(t,e,i,s,n){let o=e[n];return o||(o=e[n]=t.measureText(n).width,i.push(n)),o>s&&(s=o),s}function Oe(t,e,i,s){let o=(s=s||{}).data=s.data||{},a=s.garbageCollect=s.garbageCollect||[];s.font!==e&&(o=s.data={},a=s.garbageCollect=[],s.font=e),t.save(),t.font=e;let r=0;const l=i.length;let h,c,d,u,f;for(h=0;h<l;h++)if(u=i[h],null==u||n(u)){if(n(u))for(c=0,d=u.length;c<d;c++)f=u[c],null==f||n(f)||(r=Ce(t,o,a,r,f))}else r=Ce(t,o,a,r,u);t.restore();const g=a.length/2;if(g>i.length){for(h=0;h<g;h++)delete o[a[h]];a.splice(0,g)}return r}function Ae(t,e,i){const s=t.currentDevicePixelRatio,n=0!==i?Math.max(i/2,.5):0;return Math.round((e-n)*s)/s+n}function Te(t,e){(e||t)&&((e=e||t.getContext("2d")).save(),e.resetTransform(),e.clearRect(0,0,t.width,t.height),e.restore())}function Le(t,e,i,s){Ee(t,e,i,s,null)}function Ee(t,e,i,s,n){let o,a,r,l,h,c,d,u;const f=e.pointStyle,g=e.rotation,p=e.radius;let m=(g||0)*L;if(f&&"object"==typeof f&&(o=f.toString(),"[object HTMLImageElement]"===o||"[object HTMLCanvasElement]"===o))return t.save(),t.translate(i,s),t.rotate(m),t.drawImage(f,-f.width/2,-f.height/2,f.width,f.height),void t.restore();if(!(isNaN(p)||p<=0)){switch(t.beginPath(),f){default:n?t.ellipse(i,s,n/2,p,0,0,O):t.arc(i,s,p,0,O),t.closePath();break;case"triangle":c=n?n/2:p,t.moveTo(i+Math.sin(m)*c,s-Math.cos(m)*p),m+=I,t.lineTo(i+Math.sin(m)*c,s-Math.cos(m)*p),m+=I,t.lineTo(i+Math.sin(m)*c,s-Math.cos(m)*p),t.closePath();break;case"rectRounded":h=.516*p,l=p-h,a=Math.cos(m+R)*l,d=Math.cos(m+R)*(n?n/2-h:l),r=Math.sin(m+R)*l,u=Math.sin(m+R)*(n?n/2-h:l),t.arc(i-d,s-r,h,m-C,m-E),t.arc(i+u,s-a,h,m-E,m),t.arc(i+d,s+r,h,m,m+E),t.arc(i-u,s+a,h,m+E,m+C),t.closePath();break;case"rect":if(!g){l=Math.SQRT1_2*p,c=n?n/2:l,t.rect(i-c,s-l,2*c,2*l);break}m+=R;case"rectRot":d=Math.cos(m)*(n?n/2:p),a=Math.cos(m)*p,r=Math.sin(m)*p,u=Math.sin(m)*(n?n/2:p),t.moveTo(i-d,s-r),t.lineTo(i+u,s-a),t.lineTo(i+d,s+r),t.lineTo(i-u,s+a),t.closePath();break;case"crossRot":m+=R;case"cross":d=Math.cos(m)*(n?n/2:p),a=Math.cos(m)*p,r=Math.sin(m)*p,u=Math.sin(m)*(n?n/2:p),t.moveTo(i-d,s-r),t.lineTo(i+d,s+r),t.moveTo(i+u,s-a),t.lineTo(i-u,s+a);break;case"star":d=Math.cos(m)*(n?n/2:p),a=Math.cos(m)*p,r=Math.sin(m)*p,u=Math.sin(m)*(n?n/2:p),t.moveTo(i-d,s-r),t.lineTo(i+d,s+r),t.moveTo(i+u,s-a),t.lineTo(i-u,s+a),m+=R,d=Math.cos(m)*(n?n/2:p),a=Math.cos(m)*p,r=Math.sin(m)*p,u=Math.sin(m)*(n?n/2:p),t.moveTo(i-d,s-r),t.lineTo(i+d,s+r),t.moveTo(i+u,s-a),t.lineTo(i-u,s+a);break;case"line":a=n?n/2:Math.cos(m)*p,r=Math.sin(m)*p,t.moveTo(i-a,s-r),t.lineTo(i+a,s+r);break;case"dash":t.moveTo(i,s),t.lineTo(i+Math.cos(m)*(n?n/2:p),s+Math.sin(m)*p);break;case!1:t.closePath()}t.fill(),e.borderWidth>0&&t.stroke()}}function Re(t,e,i){return i=i||.5,!e||t&&t.x>e.left-i&&t.x<e.right+i&&t.y>e.top-i&&t.y<e.bottom+i}function Ie(t,e){t.save(),t.beginPath(),t.rect(e.left,e.top,e.right-e.left,e.bottom-e.top),t.clip()}function ze(t){t.restore()}function Fe(t,e,i,s,n){if(!e)return t.lineTo(i.x,i.y);if("middle"===n){const s=(e.x+i.x)/2;t.lineTo(s,e.y),t.lineTo(s,i.y)}else"after"===n!=!!s?t.lineTo(e.x,i.y):t.lineTo(i.x,e.y);t.lineTo(i.x,i.y)}function Ve(t,e,i,s){if(!e)return t.lineTo(i.x,i.y);t.bezierCurveTo(s?e.cp1x:e.cp2x,s?e.cp1y:e.cp2y,s?i.cp2x:i.cp1x,s?i.cp2y:i.cp1y,i.x,i.y)}function Be(t,e,i,s,n){if(n.strikethrough||n.underline){const o=t.measureText(s),a=e-o.actualBoundingBoxLeft,r=e+o.actualBoundingBoxRight,l=i-o.actualBoundingBoxAscent,h=i+o.actualBoundingBoxDescent,c=n.strikethrough?(l+h)/2:h;t.strokeStyle=t.fillStyle,t.beginPath(),t.lineWidth=n.decorationWidth||2,t.moveTo(a,c),t.lineTo(r,c),t.stroke()}}function We(t,e){const i=t.fillStyle;t.fillStyle=e.color,t.fillRect(e.left,e.top,e.width,e.height),t.fillStyle=i}function Ne(t,e,i,o,a,r={}){const l=n(e)?e:[e],h=r.strokeWidth>0&&""!==r.strokeColor;let c,d;for(t.save(),t.font=a.string,function(t,e){e.translation&&t.translate(e.translation[0],e.translation[1]),s(e.rotation)||t.rotate(e.rotation),e.color&&(t.fillStyle=e.color),e.textAlign&&(t.textAlign=e.textAlign),e.textBaseline&&(t.textBaseline=e.textBaseline)}(t,r),c=0;c<l.length;++c)d=l[c],r.backdrop&&We(t,r.backdrop),h&&(r.strokeColor&&(t.strokeStyle=r.strokeColor),s(r.strokeWidth)||(t.lineWidth=r.strokeWidth),t.strokeText(d,i,o,r.maxWidth)),t.fillText(d,i,o,r.maxWidth),Be(t,i,o,d,r),o+=Number(a.lineHeight);t.restore()}function He(t,e){const{x:i,y:s,w:n,h:o,radius:a}=e;t.arc(i+a.topLeft,s+a.topLeft,a.topLeft,1.5*C,C,!0),t.lineTo(i,s+o-a.bottomLeft),t.arc(i+a.bottomLeft,s+o-a.bottomLeft,a.bottomLeft,C,E,!0),t.lineTo(i+n-a.bottomRight,s+o),t.arc(i+n-a.bottomRight,s+o-a.bottomRight,a.bottomRight,E,0,!0),t.lineTo(i+n,s+a.topRight),t.arc(i+n-a.topRight,s+a.topRight,a.topRight,0,-E,!0),t.lineTo(i+a.topLeft,s)}function je(t,e=[""],i,s,n=(()=>t[0])){const o=i||t;void 0===s&&(s=ti("_fallback",t));const a={[Symbol.toStringTag]:"Object",_cacheable:!0,_scopes:t,_rootScopes:o,_fallback:s,_getTarget:n,override:i=>je([i,...t],e,o,s)};return new Proxy(a,{deleteProperty:(e,i)=>(delete e[i],delete e._keys,delete t[0][i],!0),get:(i,s)=>qe(i,s,(()=>function(t,e,i,s){let n;for(const o of e)if(n=ti(Ue(o,t),i),void 0!==n)return Xe(t,n)?Ze(i,s,t,n):n}(s,e,t,i))),getOwnPropertyDescriptor:(t,e)=>Reflect.getOwnPropertyDescriptor(t._scopes[0],e),getPrototypeOf:()=>Reflect.getPrototypeOf(t[0]),has:(t,e)=>ei(t).includes(e),ownKeys:t=>ei(t),set(t,e,i){const s=t._storage||(t._storage=n());return t[e]=s[e]=i,delete t._keys,!0}})}function $e(t,e,i,s){const a={_cacheable:!1,_proxy:t,_context:e,_subProxy:i,_stack:new Set,_descriptors:Ye(t,s),setContext:e=>$e(t,e,i,s),override:n=>$e(t.override(n),e,i,s)};return new Proxy(a,{deleteProperty:(e,i)=>(delete e[i],delete t[i],!0),get:(t,e,i)=>qe(t,e,(()=>function(t,e,i){const{_proxy:s,_context:a,_subProxy:r,_descriptors:l}=t;let h=s[e];S(h)&&l.isScriptable(e)&&(h=function(t,e,i,s){const{_proxy:n,_context:o,_subProxy:a,_stack:r}=i;if(r.has(t))throw new Error("Recursion detected: "+Array.from(r).join("->")+"->"+t);r.add(t);let l=e(o,a||s);r.delete(t),Xe(t,l)&&(l=Ze(n._scopes,n,t,l));return l}(e,h,t,i));n(h)&&h.length&&(h=function(t,e,i,s){const{_proxy:n,_context:a,_subProxy:r,_descriptors:l}=i;if(void 0!==a.index&&s(t))return e[a.index%e.length];if(o(e[0])){const i=e,s=n._scopes.filter((t=>t!==i));e=[];for(const o of i){const i=Ze(s,n,t,o);e.push($e(i,a,r&&r[t],l))}}return e}(e,h,t,l.isIndexable));Xe(e,h)&&(h=$e(h,a,r&&r[e],l));return h}(t,e,i))),getOwnPropertyDescriptor:(e,i)=>e._descriptors.allKeys?Reflect.has(t,i)?{enumerable:!0,configurable:!0}:void 0:Reflect.getOwnPropertyDescriptor(t,i),getPrototypeOf:()=>Reflect.getPrototypeOf(t),has:(e,i)=>Reflect.has(t,i),ownKeys:()=>Reflect.ownKeys(t),set:(e,i,s)=>(t[i]=s,delete e[i],!0)})}function Ye(t,e={scriptable:!0,indexable:!0}){const{_scriptable:i=e.scriptable,_indexable:s=e.indexable,_allKeys:n=e.allKeys}=t;return{allKeys:n,scriptable:i,indexable:s,isScriptable:S(i)?i:()=>i,isIndexable:S(s)?s:()=>s}}const Ue=(t,e)=>t?t+w(e):e,Xe=(t,e)=>o(e)&&"adapters"!==t&&(null===Object.getPrototypeOf(e)||e.constructor===Object);function qe(t,e,i){if(Object.prototype.hasOwnProperty.call(t,e)||"constructor"===e)return t[e];const s=i();return t[e]=s,s}function Ke(t,e,i){return S(t)?t(e,i):t}const Ge=(t,e)=>!0===t?e:"string"==typeof t?M(e,t):void 0;function Je(t,e,i,s,n){for(const o of e){const e=Ge(i,o);if(e){t.add(e);const o=Ke(e._fallback,i,n);if(void 0!==o&&o!==i&&o!==s)return o}else if(!1===e&&void 0!==s&&i!==s)return null}return!1}function Ze(t,e,i,s){const a=e._rootScopes,r=Ke(e._fallback,i,s),l=[...t,...a],h=new Set;h.add(s);let c=Qe(h,l,i,r||i,s);return null!==c&&((void 0===r||r===i||(c=Qe(h,l,r,c,s),null!==c))&&je(Array.from(h),[""],a,r,(()=>function(t,e,i){const s=t._getTarget();e in s||(s[e]={});const a=s[e];if(n(a)&&o(i))return i;return a||{}}(e,i,s))))}function Qe(t,e,i,s,n){for(;i;)i=Je(t,e,i,s,n);return i}function ti(t,e){for(const i of e){if(!i)continue;const e=i[t];if(void 0!==e)return e}}function ei(t){let e=t._keys;return e||(e=t._keys=function(t){const e=new Set;for(const i of t)for(const t of Object.keys(i).filter((t=>!t.startsWith("_"))))e.add(t);return Array.from(e)}(t._scopes)),e}function ii(t,e,i,s){const{iScale:n}=t,{key:o="r"}=this._parsing,a=new Array(s);let r,l,h,c;for(r=0,l=s;r<l;++r)h=r+i,c=e[h],a[r]={r:n.parse(M(c,o),h)};return a}const si=Number.EPSILON||1e-14,ni=(t,e)=>e<t.length&&!t[e].skip&&t[e],oi=t=>"x"===t?"y":"x";function ai(t,e,i,s){const n=t.skip?e:t,o=e,a=i.skip?e:i,r=q(o,n),l=q(a,o);let h=r/(r+l),c=l/(r+l);h=isNaN(h)?0:h,c=isNaN(c)?0:c;const d=s*h,u=s*c;return{previous:{x:o.x-d*(a.x-n.x),y:o.y-d*(a.y-n.y)},next:{x:o.x+u*(a.x-n.x),y:o.y+u*(a.y-n.y)}}}function ri(t,e="x"){const i=oi(e),s=t.length,n=Array(s).fill(0),o=Array(s);let a,r,l,h=ni(t,0);for(a=0;a<s;++a)if(r=l,l=h,h=ni(t,a+1),l){if(h){const t=h[e]-l[e];n[a]=0!==t?(h[i]-l[i])/t:0}o[a]=r?h?F(n[a-1])!==F(n[a])?0:(n[a-1]+n[a])/2:n[a-1]:n[a]}!function(t,e,i){const s=t.length;let n,o,a,r,l,h=ni(t,0);for(let c=0;c<s-1;++c)l=h,h=ni(t,c+1),l&&h&&(V(e[c],0,si)?i[c]=i[c+1]=0:(n=i[c]/e[c],o=i[c+1]/e[c],r=Math.pow(n,2)+Math.pow(o,2),r<=9||(a=3/Math.sqrt(r),i[c]=n*a*e[c],i[c+1]=o*a*e[c])))}(t,n,o),function(t,e,i="x"){const s=oi(i),n=t.length;let o,a,r,l=ni(t,0);for(let h=0;h<n;++h){if(a=r,r=l,l=ni(t,h+1),!r)continue;const n=r[i],c=r[s];a&&(o=(n-a[i])/3,r[`cp1${i}`]=n-o,r[`cp1${s}`]=c-o*e[h]),l&&(o=(l[i]-n)/3,r[`cp2${i}`]=n+o,r[`cp2${s}`]=c+o*e[h])}}(t,o,e)}function li(t,e,i){return Math.max(Math.min(t,i),e)}function hi(t,e,i,s,n){let o,a,r,l;if(e.spanGaps&&(t=t.filter((t=>!t.skip))),"monotone"===e.cubicInterpolationMode)ri(t,n);else{let i=s?t[t.length-1]:t[0];for(o=0,a=t.length;o<a;++o)r=t[o],l=ai(i,r,t[Math.min(o+1,a-(s?0:1))%a],e.tension),r.cp1x=l.previous.x,r.cp1y=l.previous.y,r.cp2x=l.next.x,r.cp2y=l.next.y,i=r}e.capBezierPoints&&function(t,e){let i,s,n,o,a,r=Re(t[0],e);for(i=0,s=t.length;i<s;++i)a=o,o=r,r=i<s-1&&Re(t[i+1],e),o&&(n=t[i],a&&(n.cp1x=li(n.cp1x,e.left,e.right),n.cp1y=li(n.cp1y,e.top,e.bottom)),r&&(n.cp2x=li(n.cp2x,e.left,e.right),n.cp2y=li(n.cp2y,e.top,e.bottom)))}(t,i)}const ci=t=>0===t||1===t,di=(t,e,i)=>-Math.pow(2,10*(t-=1))*Math.sin((t-e)*O/i),ui=(t,e,i)=>Math.pow(2,-10*t)*Math.sin((t-e)*O/i)+1,fi={linear:t=>t,easeInQuad:t=>t*t,easeOutQuad:t=>-t*(t-2),easeInOutQuad:t=>(t/=.5)<1?.5*t*t:-.5*(--t*(t-2)-1),easeInCubic:t=>t*t*t,easeOutCubic:t=>(t-=1)*t*t+1,easeInOutCubic:t=>(t/=.5)<1?.5*t*t*t:.5*((t-=2)*t*t+2),easeInQuart:t=>t*t*t*t,easeOutQuart:t=>-((t-=1)*t*t*t-1),easeInOutQuart:t=>(t/=.5)<1?.5*t*t*t*t:-.5*((t-=2)*t*t*t-2),easeInQuint:t=>t*t*t*t*t,easeOutQuint:t=>(t-=1)*t*t*t*t+1,easeInOutQuint:t=>(t/=.5)<1?.5*t*t*t*t*t:.5*((t-=2)*t*t*t*t+2),easeInSine:t=>1-Math.cos(t*E),easeOutSine:t=>Math.sin(t*E),easeInOutSine:t=>-.5*(Math.cos(C*t)-1),easeInExpo:t=>0===t?0:Math.pow(2,10*(t-1)),easeOutExpo:t=>1===t?1:1-Math.pow(2,-10*t),easeInOutExpo:t=>ci(t)?t:t<.5?.5*Math.pow(2,10*(2*t-1)):.5*(2-Math.pow(2,-10*(2*t-1))),easeInCirc:t=>t>=1?t:-(Math.sqrt(1-t*t)-1),easeOutCirc:t=>Math.sqrt(1-(t-=1)*t),easeInOutCirc:t=>(t/=.5)<1?-.5*(Math.sqrt(1-t*t)-1):.5*(Math.sqrt(1-(t-=2)*t)+1),easeInElastic:t=>ci(t)?t:di(t,.075,.3),easeOutElastic:t=>ci(t)?t:ui(t,.075,.3),easeInOutElastic(t){const e=.1125;return ci(t)?t:t<.5?.5*di(2*t,e,.45):.5+.5*ui(2*t-1,e,.45)},easeInBack(t){const e=1.70158;return t*t*((e+1)*t-e)},easeOutBack(t){const e=1.70158;return(t-=1)*t*((e+1)*t+e)+1},easeInOutBack(t){let e=1.70158;return(t/=.5)<1?t*t*((1+(e*=1.525))*t-e)*.5:.5*((t-=2)*t*((1+(e*=1.525))*t+e)+2)},easeInBounce:t=>1-fi.easeOutBounce(1-t),easeOutBounce(t){const e=7.5625,i=2.75;return t<1/i?e*t*t:t<2/i?e*(t-=1.5/i)*t+.75:t<2.5/i?e*(t-=2.25/i)*t+.9375:e*(t-=2.625/i)*t+.984375},easeInOutBounce:t=>t<.5?.5*fi.easeInBounce(2*t):.5*fi.easeOutBounce(2*t-1)+.5};function gi(t,e,i,s){return{x:t.x+i*(e.x-t.x),y:t.y+i*(e.y-t.y)}}function pi(t,e,i,s){return{x:t.x+i*(e.x-t.x),y:"middle"===s?i<.5?t.y:e.y:"after"===s?i<1?t.y:e.y:i>0?e.y:t.y}}function mi(t,e,i,s){const n={x:t.cp2x,y:t.cp2y},o={x:e.cp1x,y:e.cp1y},a=gi(t,n,i),r=gi(n,o,i),l=gi(o,e,i),h=gi(a,r,i),c=gi(r,l,i);return gi(h,c,i)}const xi=/^(normal|(\d+(?:\.\d+)?)(px|em|%)?)$/,bi=/^(normal|italic|initial|inherit|unset|(oblique( -?[0-9]?[0-9]deg)?))$/;function _i(t,e){const i=(""+t).match(xi);if(!i||"normal"===i[1])return 1.2*e;switch(t=+i[2],i[3]){case"px":return t;case"%":t/=100}return e*t}const yi=t=>+t||0;function vi(t,e){const i={},s=o(e),n=s?Object.keys(e):e,a=o(t)?s?i=>l(t[i],t[e[i]]):e=>t[e]:()=>t;for(const t of n)i[t]=yi(a(t));return i}function Mi(t){return vi(t,{top:"y",right:"x",bottom:"y",left:"x"})}function wi(t){return vi(t,["topLeft","topRight","bottomLeft","bottomRight"])}function ki(t){const e=Mi(t);return e.width=e.left+e.right,e.height=e.top+e.bottom,e}function Si(t,e){t=t||{},e=e||ue.font;let i=l(t.size,e.size);"string"==typeof i&&(i=parseInt(i,10));let s=l(t.style,e.style);s&&!(""+s).match(bi)&&(console.warn('Invalid font style specified: "'+s+'"'),s=void 0);const n={family:l(t.family,e.family),lineHeight:_i(l(t.lineHeight,e.lineHeight),i),size:i,style:s,weight:l(t.weight,e.weight),string:""};return n.string=De(n),n}function Pi(t,e,i,s){let o,a,r,l=!0;for(o=0,a=t.length;o<a;++o)if(r=t[o],void 0!==r&&(void 0!==e&&"function"==typeof r&&(r=r(e),l=!1),void 0!==i&&n(r)&&(r=r[i%r.length],l=!1),void 0!==r))return s&&!l&&(s.cacheable=!1),r}function Di(t,e,i){const{min:s,max:n}=t,o=c(e,(n-s)/2),a=(t,e)=>i&&0===t?0:t+e;return{min:a(s,-Math.abs(o)),max:a(n,o)}}function Ci(t,e){return Object.assign(Object.create(t),e)}function Oi(t,e,i){return t?function(t,e){return{x:i=>t+t+e-i,setWidth(t){e=t},textAlign:t=>"center"===t?t:"right"===t?"left":"right",xPlus:(t,e)=>t-e,leftForLtr:(t,e)=>t-e}}(e,i):{x:t=>t,setWidth(t){},textAlign:t=>t,xPlus:(t,e)=>t+e,leftForLtr:(t,e)=>t}}function Ai(t,e){let i,s;"ltr"!==e&&"rtl"!==e||(i=t.canvas.style,s=[i.getPropertyValue("direction"),i.getPropertyPriority("direction")],i.setProperty("direction",e,"important"),t.prevTextDirection=s)}function Ti(t,e){void 0!==e&&(delete t.prevTextDirection,t.canvas.style.setProperty("direction",e[0],e[1]))}function Li(t){return"angle"===t?{between:J,compare:K,normalize:G}:{between:tt,compare:(t,e)=>t-e,normalize:t=>t}}function Ei({start:t,end:e,count:i,loop:s,style:n}){return{start:t%i,end:e%i,loop:s&&(e-t+1)%i==0,style:n}}function Ri(t,e,i){if(!i)return[t];const{property:s,start:n,end:o}=i,a=e.length,{compare:r,between:l,normalize:h}=Li(s),{start:c,end:d,loop:u,style:f}=function(t,e,i){const{property:s,start:n,end:o}=i,{between:a,normalize:r}=Li(s),l=e.length;let h,c,{start:d,end:u,loop:f}=t;if(f){for(d+=l,u+=l,h=0,c=l;h<c&&a(r(e[d%l][s]),n,o);++h)d--,u--;d%=l,u%=l}return u<d&&(u+=l),{start:d,end:u,loop:f,style:t.style}}(t,e,i),g=[];let p,m,x,b=!1,_=null;const y=()=>b||l(n,x,p)&&0!==r(n,x),v=()=>!b||0===r(o,p)||l(o,x,p);for(let t=c,i=c;t<=d;++t)m=e[t%a],m.skip||(p=h(m[s]),p!==x&&(b=l(p,n,o),null===_&&y()&&(_=0===r(p,n)?t:i),null!==_&&v()&&(g.push(Ei({start:_,end:t,loop:u,count:a,style:f})),_=null),i=t,x=p));return null!==_&&g.push(Ei({start:_,end:d,loop:u,count:a,style:f})),g}function Ii(t,e){const i=[],s=t.segments;for(let n=0;n<s.length;n++){const o=Ri(s[n],t.points,e);o.length&&i.push(...o)}return i}function zi(t,e){const i=t.points,s=t.options.spanGaps,n=i.length;if(!n)return[];const o=!!t._loop,{start:a,end:r}=function(t,e,i,s){let n=0,o=e-1;if(i&&!s)for(;n<e&&!t[n].skip;)n++;for(;n<e&&t[n].skip;)n++;for(n%=e,i&&(o+=n);o>n&&t[o%e].skip;)o--;return o%=e,{start:n,end:o}}(i,n,o,s);if(!0===s)return Fi(t,[{start:a,end:r,loop:o}],i,e);return Fi(t,function(t,e,i,s){const n=t.length,o=[];let a,r=e,l=t[e];for(a=e+1;a<=i;++a){const i=t[a%n];i.skip||i.stop?l.skip||(s=!1,o.push({start:e%n,end:(a-1)%n,loop:s}),e=r=i.stop?a:null):(r=a,l.skip&&(e=a)),l=i}return null!==r&&o.push({start:e%n,end:r%n,loop:s}),o}(i,a,r<a?r+n:r,!!t._fullLoop&&0===a&&r===n-1),i,e)}function Fi(t,e,i,s){return s&&s.setContext&&i?function(t,e,i,s){const n=t._chart.getContext(),o=Vi(t.options),{_datasetIndex:a,options:{spanGaps:r}}=t,l=i.length,h=[];let c=o,d=e[0].start,u=d;function f(t,e,s,n){const o=r?-1:1;if(t!==e){for(t+=l;i[t%l].skip;)t-=o;for(;i[e%l].skip;)e+=o;t%l!=e%l&&(h.push({start:t%l,end:e%l,loop:s,style:n}),c=n,d=e%l)}}for(const t of e){d=r?d:t.start;let e,o=i[d%l];for(u=d+1;u<=t.end;u++){const r=i[u%l];e=Vi(s.setContext(Ci(n,{type:"segment",p0:o,p1:r,p0DataIndex:(u-1)%l,p1DataIndex:u%l,datasetIndex:a}))),Bi(e,c)&&f(d,u-1,t.loop,c),o=r,c=e}d<u-1&&f(d,u-1,t.loop,c)}return h}(t,e,i,s):e}function Vi(t){return{backgroundColor:t.backgroundColor,borderCapStyle:t.borderCapStyle,borderDash:t.borderDash,borderDashOffset:t.borderDashOffset,borderJoinStyle:t.borderJoinStyle,borderWidth:t.borderWidth,borderColor:t.borderColor}}function Bi(t,e){if(!e)return!1;const i=[],s=function(t,e){return Zt(e)?(i.includes(e)||i.push(e),i.indexOf(e)):e};return JSON.stringify(t,s)!==JSON.stringify(e,s)}function Wi(t,e,i){return t.options.clip?t[i]:e[i]}function Ni(t,e){const i=e._clip;if(i.disabled)return!1;const s=function(t,e){const{xScale:i,yScale:s}=t;return i&&s?{left:Wi(i,e,"left"),right:Wi(i,e,"right"),top:Wi(s,e,"top"),bottom:Wi(s,e,"bottom")}:e}(e,t.chartArea);return{left:!1===i.left?0:s.left-(!0===i.left?0:i.left),right:!1===i.right?t.width:s.right+(!0===i.right?0:i.right),top:!1===i.top?0:s.top-(!0===i.top?0:i.top),bottom:!1===i.bottom?t.height:s.bottom+(!0===i.bottom?0:i.bottom)}}var Hi=Object.freeze({__proto__:null,HALF_PI:E,INFINITY:T,PI:C,PITAU:A,QUARTER_PI:R,RAD_PER_DEG:L,TAU:O,TWO_THIRDS_PI:I,_addGrace:Di,_alignPixel:Ae,_alignStartEnd:ft,_angleBetween:J,_angleDiff:K,_arrayUnique:lt,_attachContext:$e,_bezierCurveTo:Ve,_bezierInterpolation:mi,_boundSegment:Ri,_boundSegments:Ii,_capitalize:w,_computeSegments:zi,_createResolver:je,_decimalPlaces:U,_deprecated:function(t,e,i,s){void 0!==e&&console.warn(t+': "'+i+'" is deprecated. Please use "'+s+'" instead')},_descriptors:Ye,_elementsEqual:f,_factorize:W,_filterBetween:nt,_getParentNode:ge,_getStartAndCountOfVisiblePoints:pt,_int16Range:Q,_isBetween:tt,_isClickEvent:D,_isDomSupported:fe,_isPointInArea:Re,_limitValue:Z,_longestText:Oe,_lookup:et,_lookupByKey:it,_measureText:Ce,_merger:m,_mergerIf:_,_normalizeAngle:G,_parseObjectDataRadialScale:ii,_pointInLine:gi,_readValueToProps:vi,_rlookupByKey:st,_scaleRangesChanged:mt,_setMinAndMaxByKey:j,_splitKey:v,_steppedInterpolation:pi,_steppedLineTo:Fe,_textX:gt,_toLeftRightCenter:ut,_updateBezierControlPoints:hi,addRoundedRectPath:He,almostEquals:V,almostWhole:H,callback:d,clearCanvas:Te,clipArea:Ie,clone:g,color:Qt,createContext:Ci,debounce:dt,defined:k,distanceBetweenPoints:q,drawPoint:Le,drawPointLegend:Ee,each:u,easingEffects:fi,finiteOrDefault:r,fontString:function(t,e,i){return e+" "+t+"px "+i},formatNumber:ne,getAngleFromPoint:X,getDatasetClipArea:Ni,getHoverColor:te,getMaximumSize:we,getRelativePosition:ve,getRtlAdapter:Oi,getStyle:xe,isArray:n,isFinite:a,isFunction:S,isNullOrUndef:s,isNumber:N,isObject:o,isPatternOrGradient:Zt,listenArrayEvents:at,log10:z,merge:x,mergeIf:b,niceNum:B,noop:e,overrideTextDirection:Ai,readUsedSize:Pe,renderText:Ne,requestAnimFrame:ht,resolve:Pi,resolveObjectKey:M,restoreTextDirection:Ti,retinaScale:ke,setsEqual:P,sign:F,splineCurve:ai,splineCurveMonotone:ri,supportsEventListenerOptions:Se,throttled:ct,toDegrees:Y,toDimension:c,toFont:Si,toFontString:De,toLineHeight:_i,toPadding:ki,toPercentage:h,toRadians:$,toTRBL:Mi,toTRBLCorners:wi,uid:i,unclipArea:ze,unlistenArrayEvents:rt,valueOrDefault:l});function ji(t,e,i,n){const{controller:o,data:a,_sorted:r}=t,l=o._cachedMeta.iScale,h=t.dataset&&t.dataset.options?t.dataset.options.spanGaps:null;if(l&&e===l.axis&&"r"!==e&&r&&a.length){const r=l._reversePixels?st:it;if(!n){const n=r(a,e,i);if(h){const{vScale:e}=o._cachedMeta,{_parsed:i}=t,a=i.slice(0,n.lo+1).reverse().findIndex((t=>!s(t[e.axis])));n.lo-=Math.max(0,a);const r=i.slice(n.hi).findIndex((t=>!s(t[e.axis])));n.hi+=Math.max(0,r)}return n}if(o._sharedOptions){const t=a[0],s="function"==typeof t.getRange&&t.getRange(e);if(s){const t=r(a,e,i-s),n=r(a,e,i+s);return{lo:t.lo,hi:n.hi}}}}return{lo:0,hi:a.length-1}}function $i(t,e,i,s,n){const o=t.getSortedVisibleDatasetMetas(),a=i[e];for(let t=0,i=o.length;t<i;++t){const{index:i,data:r}=o[t],{lo:l,hi:h}=ji(o[t],e,a,n);for(let t=l;t<=h;++t){const e=r[t];e.skip||s(e,i,t)}}}function Yi(t,e,i,s,n){const o=[];if(!n&&!t.isPointInArea(e))return o;return $i(t,i,e,(function(i,a,r){(n||Re(i,t.chartArea,0))&&i.inRange(e.x,e.y,s)&&o.push({element:i,datasetIndex:a,index:r})}),!0),o}function Ui(t,e,i,s,n,o){let a=[];const r=function(t){const e=-1!==t.indexOf("x"),i=-1!==t.indexOf("y");return function(t,s){const n=e?Math.abs(t.x-s.x):0,o=i?Math.abs(t.y-s.y):0;return Math.sqrt(Math.pow(n,2)+Math.pow(o,2))}}(i);let l=Number.POSITIVE_INFINITY;return $i(t,i,e,(function(i,h,c){const d=i.inRange(e.x,e.y,n);if(s&&!d)return;const u=i.getCenterPoint(n);if(!(!!o||t.isPointInArea(u))&&!d)return;const f=r(e,u);f<l?(a=[{element:i,datasetIndex:h,index:c}],l=f):f===l&&a.push({element:i,datasetIndex:h,index:c})})),a}function Xi(t,e,i,s,n,o){return o||t.isPointInArea(e)?"r"!==i||s?Ui(t,e,i,s,n,o):function(t,e,i,s){let n=[];return $i(t,i,e,(function(t,i,o){const{startAngle:a,endAngle:r}=t.getProps(["startAngle","endAngle"],s),{angle:l}=X(t,{x:e.x,y:e.y});J(l,a,r)&&n.push({element:t,datasetIndex:i,index:o})})),n}(t,e,i,n):[]}function qi(t,e,i,s,n){const o=[],a="x"===i?"inXRange":"inYRange";let r=!1;return $i(t,i,e,((t,s,l)=>{t[a]&&t[a](e[i],n)&&(o.push({element:t,datasetIndex:s,index:l}),r=r||t.inRange(e.x,e.y,n))})),s&&!r?[]:o}var Ki={evaluateInteractionItems:$i,modes:{index(t,e,i,s){const n=ve(e,t),o=i.axis||"x",a=i.includeInvisible||!1,r=i.intersect?Yi(t,n,o,s,a):Xi(t,n,o,!1,s,a),l=[];return r.length?(t.getSortedVisibleDatasetMetas().forEach((t=>{const e=r[0].index,i=t.data[e];i&&!i.skip&&l.push({element:i,datasetIndex:t.index,index:e})})),l):[]},dataset(t,e,i,s){const n=ve(e,t),o=i.axis||"xy",a=i.includeInvisible||!1;let r=i.intersect?Yi(t,n,o,s,a):Xi(t,n,o,!1,s,a);if(r.length>0){const e=r[0].datasetIndex,i=t.getDatasetMeta(e).data;r=[];for(let t=0;t<i.length;++t)r.push({element:i[t],datasetIndex:e,index:t})}return r},point:(t,e,i,s)=>Yi(t,ve(e,t),i.axis||"xy",s,i.includeInvisible||!1),nearest(t,e,i,s){const n=ve(e,t),o=i.axis||"xy",a=i.includeInvisible||!1;return Xi(t,n,o,i.intersect,s,a)},x:(t,e,i,s)=>qi(t,ve(e,t),"x",i.intersect,s),y:(t,e,i,s)=>qi(t,ve(e,t),"y",i.intersect,s)}};const Gi=["left","top","right","bottom"];function Ji(t,e){return t.filter((t=>t.pos===e))}function Zi(t,e){return t.filter((t=>-1===Gi.indexOf(t.pos)&&t.box.axis===e))}function Qi(t,e){return t.sort(((t,i)=>{const s=e?i:t,n=e?t:i;return s.weight===n.weight?s.index-n.index:s.weight-n.weight}))}function ts(t,e){const i=function(t){const e={};for(const i of t){const{stack:t,pos:s,stackWeight:n}=i;if(!t||!Gi.includes(s))continue;const o=e[t]||(e[t]={count:0,placed:0,weight:0,size:0});o.count++,o.weight+=n}return e}(t),{vBoxMaxWidth:s,hBoxMaxHeight:n}=e;let o,a,r;for(o=0,a=t.length;o<a;++o){r=t[o];const{fullSize:a}=r.box,l=i[r.stack],h=l&&r.stackWeight/l.weight;r.horizontal?(r.width=h?h*s:a&&e.availableWidth,r.height=n):(r.width=s,r.height=h?h*n:a&&e.availableHeight)}return i}function es(t,e,i,s){return Math.max(t[i],e[i])+Math.max(t[s],e[s])}function is(t,e){t.top=Math.max(t.top,e.top),t.left=Math.max(t.left,e.left),t.bottom=Math.max(t.bottom,e.bottom),t.right=Math.max(t.right,e.right)}function ss(t,e,i,s){const{pos:n,box:a}=i,r=t.maxPadding;if(!o(n)){i.size&&(t[n]-=i.size);const e=s[i.stack]||{size:0,count:1};e.size=Math.max(e.size,i.horizontal?a.height:a.width),i.size=e.size/e.count,t[n]+=i.size}a.getPadding&&is(r,a.getPadding());const l=Math.max(0,e.outerWidth-es(r,t,"left","right")),h=Math.max(0,e.outerHeight-es(r,t,"top","bottom")),c=l!==t.w,d=h!==t.h;return t.w=l,t.h=h,i.horizontal?{same:c,other:d}:{same:d,other:c}}function ns(t,e){const i=e.maxPadding;function s(t){const s={left:0,top:0,right:0,bottom:0};return t.forEach((t=>{s[t]=Math.max(e[t],i[t])})),s}return s(t?["left","right"]:["top","bottom"])}function os(t,e,i,s){const n=[];let o,a,r,l,h,c;for(o=0,a=t.length,h=0;o<a;++o){r=t[o],l=r.box,l.update(r.width||e.w,r.height||e.h,ns(r.horizontal,e));const{same:a,other:d}=ss(e,i,r,s);h|=a&&n.length,c=c||d,l.fullSize||n.push(r)}return h&&os(n,e,i,s)||c}function as(t,e,i,s,n){t.top=i,t.left=e,t.right=e+s,t.bottom=i+n,t.width=s,t.height=n}function rs(t,e,i,s){const n=i.padding;let{x:o,y:a}=e;for(const r of t){const t=r.box,l=s[r.stack]||{count:1,placed:0,weight:1},h=r.stackWeight/l.weight||1;if(r.horizontal){const s=e.w*h,o=l.size||t.height;k(l.start)&&(a=l.start),t.fullSize?as(t,n.left,a,i.outerWidth-n.right-n.left,o):as(t,e.left+l.placed,a,s,o),l.start=a,l.placed+=s,a=t.bottom}else{const s=e.h*h,a=l.size||t.width;k(l.start)&&(o=l.start),t.fullSize?as(t,o,n.top,a,i.outerHeight-n.bottom-n.top):as(t,o,e.top+l.placed,a,s),l.start=o,l.placed+=s,o=t.right}}e.x=o,e.y=a}var ls={addBox(t,e){t.boxes||(t.boxes=[]),e.fullSize=e.fullSize||!1,e.position=e.position||"top",e.weight=e.weight||0,e._layers=e._layers||function(){return[{z:0,draw(t){e.draw(t)}}]},t.boxes.push(e)},removeBox(t,e){const i=t.boxes?t.boxes.indexOf(e):-1;-1!==i&&t.boxes.splice(i,1)},configure(t,e,i){e.fullSize=i.fullSize,e.position=i.position,e.weight=i.weight},update(t,e,i,s){if(!t)return;const n=ki(t.options.layout.padding),o=Math.max(e-n.width,0),a=Math.max(i-n.height,0),r=function(t){const e=function(t){const e=[];let i,s,n,o,a,r;for(i=0,s=(t||[]).length;i<s;++i)n=t[i],({position:o,options:{stack:a,stackWeight:r=1}}=n),e.push({index:i,box:n,pos:o,horizontal:n.isHorizontal(),weight:n.weight,stack:a&&o+a,stackWeight:r});return e}(t),i=Qi(e.filter((t=>t.box.fullSize)),!0),s=Qi(Ji(e,"left"),!0),n=Qi(Ji(e,"right")),o=Qi(Ji(e,"top"),!0),a=Qi(Ji(e,"bottom")),r=Zi(e,"x"),l=Zi(e,"y");return{fullSize:i,leftAndTop:s.concat(o),rightAndBottom:n.concat(l).concat(a).concat(r),chartArea:Ji(e,"chartArea"),vertical:s.concat(n).concat(l),horizontal:o.concat(a).concat(r)}}(t.boxes),l=r.vertical,h=r.horizontal;u(t.boxes,(t=>{"function"==typeof t.beforeLayout&&t.beforeLayout()}));const c=l.reduce(((t,e)=>e.box.options&&!1===e.box.options.display?t:t+1),0)||1,d=Object.freeze({outerWidth:e,outerHeight:i,padding:n,availableWidth:o,availableHeight:a,vBoxMaxWidth:o/2/c,hBoxMaxHeight:a/2}),f=Object.assign({},n);is(f,ki(s));const g=Object.assign({maxPadding:f,w:o,h:a,x:n.left,y:n.top},n),p=ts(l.concat(h),d);os(r.fullSize,g,d,p),os(l,g,d,p),os(h,g,d,p)&&os(l,g,d,p),function(t){const e=t.maxPadding;function i(i){const s=Math.max(e[i]-t[i],0);return t[i]+=s,s}t.y+=i("top"),t.x+=i("left"),i("right"),i("bottom")}(g),rs(r.leftAndTop,g,d,p),g.x+=g.w,g.y+=g.h,rs(r.rightAndBottom,g,d,p),t.chartArea={left:g.left,top:g.top,right:g.left+g.w,bottom:g.top+g.h,height:g.h,width:g.w},u(r.chartArea,(e=>{const i=e.box;Object.assign(i,t.chartArea),i.update(g.w,g.h,{left:0,top:0,right:0,bottom:0})}))}};class hs{acquireContext(t,e){}releaseContext(t){return!1}addEventListener(t,e,i){}removeEventListener(t,e,i){}getDevicePixelRatio(){return 1}getMaximumSize(t,e,i,s){return e=Math.max(0,e||t.width),i=i||t.height,{width:e,height:Math.max(0,s?Math.floor(e/s):i)}}isAttached(t){return!0}updateConfig(t){}}class cs extends hs{acquireContext(t){return t&&t.getContext&&t.getContext("2d")||null}updateConfig(t){t.options.animation=!1}}const ds="$chartjs",us={touchstart:"mousedown",touchmove:"mousemove",touchend:"mouseup",pointerenter:"mouseenter",pointerdown:"mousedown",pointermove:"mousemove",pointerup:"mouseup",pointerleave:"mouseout",pointerout:"mouseout"},fs=t=>null===t||""===t;const gs=!!Se&&{passive:!0};function ps(t,e,i){t&&t.canvas&&t.canvas.removeEventListener(e,i,gs)}function ms(t,e){for(const i of t)if(i===e||i.contains(e))return!0}function xs(t,e,i){const s=t.canvas,n=new MutationObserver((t=>{let e=!1;for(const i of t)e=e||ms(i.addedNodes,s),e=e&&!ms(i.removedNodes,s);e&&i()}));return n.observe(document,{childList:!0,subtree:!0}),n}function bs(t,e,i){const s=t.canvas,n=new MutationObserver((t=>{let e=!1;for(const i of t)e=e||ms(i.removedNodes,s),e=e&&!ms(i.addedNodes,s);e&&i()}));return n.observe(document,{childList:!0,subtree:!0}),n}const _s=new Map;let ys=0;function vs(){const t=window.devicePixelRatio;t!==ys&&(ys=t,_s.forEach(((e,i)=>{i.currentDevicePixelRatio!==t&&e()})))}function Ms(t,e,i){const s=t.canvas,n=s&&ge(s);if(!n)return;const o=ct(((t,e)=>{const s=n.clientWidth;i(t,e),s<n.clientWidth&&i()}),window),a=new ResizeObserver((t=>{const e=t[0],i=e.contentRect.width,s=e.contentRect.height;0===i&&0===s||o(i,s)}));return a.observe(n),function(t,e){_s.size||window.addEventListener("resize",vs),_s.set(t,e)}(t,o),a}function ws(t,e,i){i&&i.disconnect(),"resize"===e&&function(t){_s.delete(t),_s.size||window.removeEventListener("resize",vs)}(t)}function ks(t,e,i){const s=t.canvas,n=ct((e=>{null!==t.ctx&&i(function(t,e){const i=us[t.type]||t.type,{x:s,y:n}=ve(t,e);return{type:i,chart:e,native:t,x:void 0!==s?s:null,y:void 0!==n?n:null}}(e,t))}),t);return function(t,e,i){t&&t.addEventListener(e,i,gs)}(s,e,n),n}class Ss extends hs{acquireContext(t,e){const i=t&&t.getContext&&t.getContext("2d");return i&&i.canvas===t?(function(t,e){const i=t.style,s=t.getAttribute("height"),n=t.getAttribute("width");if(t[ds]={initial:{height:s,width:n,style:{display:i.display,height:i.height,width:i.width}}},i.display=i.display||"block",i.boxSizing=i.boxSizing||"border-box",fs(n)){const e=Pe(t,"width");void 0!==e&&(t.width=e)}if(fs(s))if(""===t.style.height)t.height=t.width/(e||2);else{const e=Pe(t,"height");void 0!==e&&(t.height=e)}}(t,e),i):null}releaseContext(t){const e=t.canvas;if(!e[ds])return!1;const i=e[ds].initial;["height","width"].forEach((t=>{const n=i[t];s(n)?e.removeAttribute(t):e.setAttribute(t,n)}));const n=i.style||{};return Object.keys(n).forEach((t=>{e.style[t]=n[t]})),e.width=e.width,delete e[ds],!0}addEventListener(t,e,i){this.removeEventListener(t,e);const s=t.$proxies||(t.$proxies={}),n={attach:xs,detach:bs,resize:Ms}[e]||ks;s[e]=n(t,e,i)}removeEventListener(t,e){const i=t.$proxies||(t.$proxies={}),s=i[e];if(!s)return;({attach:ws,detach:ws,resize:ws}[e]||ps)(t,e,s),i[e]=void 0}getDevicePixelRatio(){return window.devicePixelRatio}getMaximumSize(t,e,i,s){return we(t,e,i,s)}isAttached(t){const e=t&&ge(t);return!(!e||!e.isConnected)}}function Ps(t){return!fe()||"undefined"!=typeof OffscreenCanvas&&t instanceof OffscreenCanvas?cs:Ss}var Ds=Object.freeze({__proto__:null,BasePlatform:hs,BasicPlatform:cs,DomPlatform:Ss,_detectPlatform:Ps});const Cs="transparent",Os={boolean:(t,e,i)=>i>.5?e:t,color(t,e,i){const s=Qt(t||Cs),n=s.valid&&Qt(e||Cs);return n&&n.valid?n.mix(s,i).hexString():e},number:(t,e,i)=>t+(e-t)*i};class As{constructor(t,e,i,s){const n=e[i];s=Pi([t.to,s,n,t.from]);const o=Pi([t.from,n,s]);this._active=!0,this._fn=t.fn||Os[t.type||typeof o],this._easing=fi[t.easing]||fi.linear,this._start=Math.floor(Date.now()+(t.delay||0)),this._duration=this._total=Math.floor(t.duration),this._loop=!!t.loop,this._target=e,this._prop=i,this._from=o,this._to=s,this._promises=void 0}active(){return this._active}update(t,e,i){if(this._active){this._notify(!1);const s=this._target[this._prop],n=i-this._start,o=this._duration-n;this._start=i,this._duration=Math.floor(Math.max(o,t.duration)),this._total+=n,this._loop=!!t.loop,this._to=Pi([t.to,e,s,t.from]),this._from=Pi([t.from,s,e])}}cancel(){this._active&&(this.tick(Date.now()),this._active=!1,this._notify(!1))}tick(t){const e=t-this._start,i=this._duration,s=this._prop,n=this._from,o=this._loop,a=this._to;let r;if(this._active=n!==a&&(o||e<i),!this._active)return this._target[s]=a,void this._notify(!0);e<0?this._target[s]=n:(r=e/i%2,r=o&&r>1?2-r:r,r=this._easing(Math.min(1,Math.max(0,r))),this._target[s]=this._fn(n,a,r))}wait(){const t=this._promises||(this._promises=[]);return new Promise(((e,i)=>{t.push({res:e,rej:i})}))}_notify(t){const e=t?"res":"rej",i=this._promises||[];for(let t=0;t<i.length;t++)i[t][e]()}}class Ts{constructor(t,e){this._chart=t,this._properties=new Map,this.configure(e)}configure(t){if(!o(t))return;const e=Object.keys(ue.animation),i=this._properties;Object.getOwnPropertyNames(t).forEach((s=>{const a=t[s];if(!o(a))return;const r={};for(const t of e)r[t]=a[t];(n(a.properties)&&a.properties||[s]).forEach((t=>{t!==s&&i.has(t)||i.set(t,r)}))}))}_animateOptions(t,e){const i=e.options,s=function(t,e){if(!e)return;let i=t.options;if(!i)return void(t.options=e);i.$shared&&(t.options=i=Object.assign({},i,{$shared:!1,$animations:{}}));return i}(t,i);if(!s)return[];const n=this._createAnimations(s,i);return i.$shared&&function(t,e){const i=[],s=Object.keys(e);for(let e=0;e<s.length;e++){const n=t[s[e]];n&&n.active()&&i.push(n.wait())}return Promise.all(i)}(t.options.$animations,i).then((()=>{t.options=i}),(()=>{})),n}_createAnimations(t,e){const i=this._properties,s=[],n=t.$animations||(t.$animations={}),o=Object.keys(e),a=Date.now();let r;for(r=o.length-1;r>=0;--r){const l=o[r];if("$"===l.charAt(0))continue;if("options"===l){s.push(...this._animateOptions(t,e));continue}const h=e[l];let c=n[l];const d=i.get(l);if(c){if(d&&c.active()){c.update(d,h,a);continue}c.cancel()}d&&d.duration?(n[l]=c=new As(d,t,l,h),s.push(c)):t[l]=h}return s}update(t,e){if(0===this._properties.size)return void Object.assign(t,e);const i=this._createAnimations(t,e);return i.length?(bt.add(this._chart,i),!0):void 0}}function Ls(t,e){const i=t&&t.options||{},s=i.reverse,n=void 0===i.min?e:0,o=void 0===i.max?e:0;return{start:s?o:n,end:s?n:o}}function Es(t,e){const i=[],s=t._getSortedDatasetMetas(e);let n,o;for(n=0,o=s.length;n<o;++n)i.push(s[n].index);return i}function Rs(t,e,i,s={}){const n=t.keys,o="single"===s.mode;let r,l,h,c;if(null===e)return;let d=!1;for(r=0,l=n.length;r<l;++r){if(h=+n[r],h===i){if(d=!0,s.all)continue;break}c=t.values[h],a(c)&&(o||0===e||F(e)===F(c))&&(e+=c)}return d||s.all?e:0}function Is(t,e){const i=t&&t.options.stacked;return i||void 0===i&&void 0!==e.stack}function zs(t,e,i){const s=t[e]||(t[e]={});return s[i]||(s[i]={})}function Fs(t,e,i,s){for(const n of e.getMatchingVisibleMetas(s).reverse()){const e=t[n.index];if(i&&e>0||!i&&e<0)return n.index}return null}function Vs(t,e){const{chart:i,_cachedMeta:s}=t,n=i._stacks||(i._stacks={}),{iScale:o,vScale:a,index:r}=s,l=o.axis,h=a.axis,c=function(t,e,i){return`${t.id}.${e.id}.${i.stack||i.type}`}(o,a,s),d=e.length;let u;for(let t=0;t<d;++t){const i=e[t],{[l]:o,[h]:d}=i;u=(i._stacks||(i._stacks={}))[h]=zs(n,c,o),u[r]=d,u._top=Fs(u,a,!0,s.type),u._bottom=Fs(u,a,!1,s.type);(u._visualValues||(u._visualValues={}))[r]=d}}function Bs(t,e){const i=t.scales;return Object.keys(i).filter((t=>i[t].axis===e)).shift()}function Ws(t,e){const i=t.controller.index,s=t.vScale&&t.vScale.axis;if(s){e=e||t._parsed;for(const t of e){const e=t._stacks;if(!e||void 0===e[s]||void 0===e[s][i])return;delete e[s][i],void 0!==e[s]._visualValues&&void 0!==e[s]._visualValues[i]&&delete e[s]._visualValues[i]}}}const Ns=t=>"reset"===t||"none"===t,Hs=(t,e)=>e?t:Object.assign({},t);class js{static defaults={};static datasetElementType=null;static dataElementType=null;constructor(t,e){this.chart=t,this._ctx=t.ctx,this.index=e,this._cachedDataOpts={},this._cachedMeta=this.getMeta(),this._type=this._cachedMeta.type,this.options=void 0,this._parsing=!1,this._data=void 0,this._objectData=void 0,this._sharedOptions=void 0,this._drawStart=void 0,this._drawCount=void 0,this.enableOptionSharing=!1,this.supportsDecimation=!1,this.$context=void 0,this._syncList=[],this.datasetElementType=new.target.datasetElementType,this.dataElementType=new.target.dataElementType,this.initialize()}initialize(){const t=this._cachedMeta;this.configure(),this.linkScales(),t._stacked=Is(t.vScale,t),this.addElements(),this.options.fill&&!this.chart.isPluginEnabled("filler")&&console.warn("Tried to use the 'fill' option without the 'Filler' plugin enabled. Please import and register the 'Filler' plugin and make sure it is not disabled in the options")}updateIndex(t){this.index!==t&&Ws(this._cachedMeta),this.index=t}linkScales(){const t=this.chart,e=this._cachedMeta,i=this.getDataset(),s=(t,e,i,s)=>"x"===t?e:"r"===t?s:i,n=e.xAxisID=l(i.xAxisID,Bs(t,"x")),o=e.yAxisID=l(i.yAxisID,Bs(t,"y")),a=e.rAxisID=l(i.rAxisID,Bs(t,"r")),r=e.indexAxis,h=e.iAxisID=s(r,n,o,a),c=e.vAxisID=s(r,o,n,a);e.xScale=this.getScaleForId(n),e.yScale=this.getScaleForId(o),e.rScale=this.getScaleForId(a),e.iScale=this.getScaleForId(h),e.vScale=this.getScaleForId(c)}getDataset(){return this.chart.data.datasets[this.index]}getMeta(){return this.chart.getDatasetMeta(this.index)}getScaleForId(t){return this.chart.scales[t]}_getOtherScale(t){const e=this._cachedMeta;return t===e.iScale?e.vScale:e.iScale}reset(){this._update("reset")}_destroy(){const t=this._cachedMeta;this._data&&rt(this._data,this),t._stacked&&Ws(t)}_dataCheck(){const t=this.getDataset(),e=t.data||(t.data=[]),i=this._data;if(o(e)){const t=this._cachedMeta;this._data=function(t,e){const{iScale:i,vScale:s}=e,n="x"===i.axis?"x":"y",o="x"===s.axis?"x":"y",a=Object.keys(t),r=new Array(a.length);let l,h,c;for(l=0,h=a.length;l<h;++l)c=a[l],r[l]={[n]:c,[o]:t[c]};return r}(e,t)}else if(i!==e){if(i){rt(i,this);const t=this._cachedMeta;Ws(t),t._parsed=[]}e&&Object.isExtensible(e)&&at(e,this),this._syncList=[],this._data=e}}addElements(){const t=this._cachedMeta;this._dataCheck(),this.datasetElementType&&(t.dataset=new this.datasetElementType)}buildOrUpdateElements(t){const e=this._cachedMeta,i=this.getDataset();let s=!1;this._dataCheck();const n=e._stacked;e._stacked=Is(e.vScale,e),e.stack!==i.stack&&(s=!0,Ws(e),e.stack=i.stack),this._resyncElements(t),(s||n!==e._stacked)&&(Vs(this,e._parsed),e._stacked=Is(e.vScale,e))}configure(){const t=this.chart.config,e=t.datasetScopeKeys(this._type),i=t.getOptionScopes(this.getDataset(),e,!0);this.options=t.createResolver(i,this.getContext()),this._parsing=this.options.parsing,this._cachedDataOpts={}}parse(t,e){const{_cachedMeta:i,_data:s}=this,{iScale:a,_stacked:r}=i,l=a.axis;let h,c,d,u=0===t&&e===s.length||i._sorted,f=t>0&&i._parsed[t-1];if(!1===this._parsing)i._parsed=s,i._sorted=!0,d=s;else{d=n(s[t])?this.parseArrayData(i,s,t,e):o(s[t])?this.parseObjectData(i,s,t,e):this.parsePrimitiveData(i,s,t,e);const a=()=>null===c[l]||f&&c[l]<f[l];for(h=0;h<e;++h)i._parsed[h+t]=c=d[h],u&&(a()&&(u=!1),f=c);i._sorted=u}r&&Vs(this,d)}parsePrimitiveData(t,e,i,s){const{iScale:n,vScale:o}=t,a=n.axis,r=o.axis,l=n.getLabels(),h=n===o,c=new Array(s);let d,u,f;for(d=0,u=s;d<u;++d)f=d+i,c[d]={[a]:h||n.parse(l[f],f),[r]:o.parse(e[f],f)};return c}parseArrayData(t,e,i,s){const{xScale:n,yScale:o}=t,a=new Array(s);let r,l,h,c;for(r=0,l=s;r<l;++r)h=r+i,c=e[h],a[r]={x:n.parse(c[0],h),y:o.parse(c[1],h)};return a}parseObjectData(t,e,i,s){const{xScale:n,yScale:o}=t,{xAxisKey:a="x",yAxisKey:r="y"}=this._parsing,l=new Array(s);let h,c,d,u;for(h=0,c=s;h<c;++h)d=h+i,u=e[d],l[h]={x:n.parse(M(u,a),d),y:o.parse(M(u,r),d)};return l}getParsed(t){return this._cachedMeta._parsed[t]}getDataElement(t){return this._cachedMeta.data[t]}applyStack(t,e,i){const s=this.chart,n=this._cachedMeta,o=e[t.axis];return Rs({keys:Es(s,!0),values:e._stacks[t.axis]._visualValues},o,n.index,{mode:i})}updateRangeFromParsed(t,e,i,s){const n=i[e.axis];let o=null===n?NaN:n;const a=s&&i._stacks[e.axis];s&&a&&(s.values=a,o=Rs(s,n,this._cachedMeta.index)),t.min=Math.min(t.min,o),t.max=Math.max(t.max,o)}getMinMax(t,e){const i=this._cachedMeta,s=i._parsed,n=i._sorted&&t===i.iScale,o=s.length,r=this._getOtherScale(t),l=((t,e,i)=>t&&!e.hidden&&e._stacked&&{keys:Es(i,!0),values:null})(e,i,this.chart),h={min:Number.POSITIVE_INFINITY,max:Number.NEGATIVE_INFINITY},{min:c,max:d}=function(t){const{min:e,max:i,minDefined:s,maxDefined:n}=t.getUserBounds();return{min:s?e:Number.NEGATIVE_INFINITY,max:n?i:Number.POSITIVE_INFINITY}}(r);let u,f;function g(){f=s[u];const e=f[r.axis];return!a(f[t.axis])||c>e||d<e}for(u=0;u<o&&(g()||(this.updateRangeFromParsed(h,t,f,l),!n));++u);if(n)for(u=o-1;u>=0;--u)if(!g()){this.updateRangeFromParsed(h,t,f,l);break}return h}getAllParsedValues(t){const e=this._cachedMeta._parsed,i=[];let s,n,o;for(s=0,n=e.length;s<n;++s)o=e[s][t.axis],a(o)&&i.push(o);return i}getMaxOverflow(){return!1}getLabelAndValue(t){const e=this._cachedMeta,i=e.iScale,s=e.vScale,n=this.getParsed(t);return{label:i?""+i.getLabelForValue(n[i.axis]):"",value:s?""+s.getLabelForValue(n[s.axis]):""}}_update(t){const e=this._cachedMeta;this.update(t||"default"),e._clip=function(t){let e,i,s,n;return o(t)?(e=t.top,i=t.right,s=t.bottom,n=t.left):e=i=s=n=t,{top:e,right:i,bottom:s,left:n,disabled:!1===t}}(l(this.options.clip,function(t,e,i){if(!1===i)return!1;const s=Ls(t,i),n=Ls(e,i);return{top:n.end,right:s.end,bottom:n.start,left:s.start}}(e.xScale,e.yScale,this.getMaxOverflow())))}update(t){}draw(){const t=this._ctx,e=this.chart,i=this._cachedMeta,s=i.data||[],n=e.chartArea,o=[],a=this._drawStart||0,r=this._drawCount||s.length-a,l=this.options.drawActiveElementsOnTop;let h;for(i.dataset&&i.dataset.draw(t,n,a,r),h=a;h<a+r;++h){const e=s[h];e.hidden||(e.active&&l?o.push(e):e.draw(t,n))}for(h=0;h<o.length;++h)o[h].draw(t,n)}getStyle(t,e){const i=e?"active":"default";return void 0===t&&this._cachedMeta.dataset?this.resolveDatasetElementOptions(i):this.resolveDataElementOptions(t||0,i)}getContext(t,e,i){const s=this.getDataset();let n;if(t>=0&&t<this._cachedMeta.data.length){const e=this._cachedMeta.data[t];n=e.$context||(e.$context=function(t,e,i){return Ci(t,{active:!1,dataIndex:e,parsed:void 0,raw:void 0,element:i,index:e,mode:"default",type:"data"})}(this.getContext(),t,e)),n.parsed=this.getParsed(t),n.raw=s.data[t],n.index=n.dataIndex=t}else n=this.$context||(this.$context=function(t,e){return Ci(t,{active:!1,dataset:void 0,datasetIndex:e,index:e,mode:"default",type:"dataset"})}(this.chart.getContext(),this.index)),n.dataset=s,n.index=n.datasetIndex=this.index;return n.active=!!e,n.mode=i,n}resolveDatasetElementOptions(t){return this._resolveElementOptions(this.datasetElementType.id,t)}resolveDataElementOptions(t,e){return this._resolveElementOptions(this.dataElementType.id,e,t)}_resolveElementOptions(t,e="default",i){const s="active"===e,n=this._cachedDataOpts,o=t+"-"+e,a=n[o],r=this.enableOptionSharing&&k(i);if(a)return Hs(a,r);const l=this.chart.config,h=l.datasetElementScopeKeys(this._type,t),c=s?[`${t}Hover`,"hover",t,""]:[t,""],d=l.getOptionScopes(this.getDataset(),h),u=Object.keys(ue.elements[t]),f=l.resolveNamedOptions(d,u,(()=>this.getContext(i,s,e)),c);return f.$shared&&(f.$shared=r,n[o]=Object.freeze(Hs(f,r))),f}_resolveAnimations(t,e,i){const s=this.chart,n=this._cachedDataOpts,o=`animation-${e}`,a=n[o];if(a)return a;let r;if(!1!==s.options.animation){const s=this.chart.config,n=s.datasetAnimationScopeKeys(this._type,e),o=s.getOptionScopes(this.getDataset(),n);r=s.createResolver(o,this.getContext(t,i,e))}const l=new Ts(s,r&&r.animations);return r&&r._cacheable&&(n[o]=Object.freeze(l)),l}getSharedOptions(t){if(t.$shared)return this._sharedOptions||(this._sharedOptions=Object.assign({},t))}includeOptions(t,e){return!e||Ns(t)||this.chart._animationsDisabled}_getSharedOptions(t,e){const i=this.resolveDataElementOptions(t,e),s=this._sharedOptions,n=this.getSharedOptions(i),o=this.includeOptions(e,n)||n!==s;return this.updateSharedOptions(n,e,i),{sharedOptions:n,includeOptions:o}}updateElement(t,e,i,s){Ns(s)?Object.assign(t,i):this._resolveAnimations(e,s).update(t,i)}updateSharedOptions(t,e,i){t&&!Ns(e)&&this._resolveAnimations(void 0,e).update(t,i)}_setStyle(t,e,i,s){t.active=s;const n=this.getStyle(e,s);this._resolveAnimations(e,i,s).update(t,{options:!s&&this.getSharedOptions(n)||n})}removeHoverStyle(t,e,i){this._setStyle(t,i,"active",!1)}setHoverStyle(t,e,i){this._setStyle(t,i,"active",!0)}_removeDatasetHoverStyle(){const t=this._cachedMeta.dataset;t&&this._setStyle(t,void 0,"active",!1)}_setDatasetHoverStyle(){const t=this._cachedMeta.dataset;t&&this._setStyle(t,void 0,"active",!0)}_resyncElements(t){const e=this._data,i=this._cachedMeta.data;for(const[t,e,i]of this._syncList)this[t](e,i);this._syncList=[];const s=i.length,n=e.length,o=Math.min(n,s);o&&this.parse(0,o),n>s?this._insertElements(s,n-s,t):n<s&&this._removeElements(n,s-n)}_insertElements(t,e,i=!0){const s=this._cachedMeta,n=s.data,o=t+e;let a;const r=t=>{for(t.length+=e,a=t.length-1;a>=o;a--)t[a]=t[a-e]};for(r(n),a=t;a<o;++a)n[a]=new this.dataElementType;this._parsing&&r(s._parsed),this.parse(t,e),i&&this.updateElements(n,t,e,"reset")}updateElements(t,e,i,s){}_removeElements(t,e){const i=this._cachedMeta;if(this._parsing){const s=i._parsed.splice(t,e);i._stacked&&Ws(i,s)}i.data.splice(t,e)}_sync(t){if(this._parsing)this._syncList.push(t);else{const[e,i,s]=t;this[e](i,s)}this.chart._dataChanges.push([this.index,...t])}_onDataPush(){const t=arguments.length;this._sync(["_insertElements",this.getDataset().data.length-t,t])}_onDataPop(){this._sync(["_removeElements",this._cachedMeta.data.length-1,1])}_onDataShift(){this._sync(["_removeElements",0,1])}_onDataSplice(t,e){e&&this._sync(["_removeElements",t,e]);const i=arguments.length-2;i&&this._sync(["_insertElements",t,i])}_onDataUnshift(){this._sync(["_insertElements",0,arguments.length])}}class $s{static defaults={};static defaultRoutes=void 0;x;y;active=!1;options;$animations;tooltipPosition(t){const{x:e,y:i}=this.getProps(["x","y"],t);return{x:e,y:i}}hasValue(){return N(this.x)&&N(this.y)}getProps(t,e){const i=this.$animations;if(!e||!i)return this;const s={};return t.forEach((t=>{s[t]=i[t]&&i[t].active()?i[t]._to:this[t]})),s}}function Ys(t,e){const i=t.options.ticks,n=function(t){const e=t.options.offset,i=t._tickSize(),s=t._length/i+(e?0:1),n=t._maxLength/i;return Math.floor(Math.min(s,n))}(t),o=Math.min(i.maxTicksLimit||n,n),a=i.major.enabled?function(t){const e=[];let i,s;for(i=0,s=t.length;i<s;i++)t[i].major&&e.push(i);return e}(e):[],r=a.length,l=a[0],h=a[r-1],c=[];if(r>o)return function(t,e,i,s){let n,o=0,a=i[0];for(s=Math.ceil(s),n=0;n<t.length;n++)n===a&&(e.push(t[n]),o++,a=i[o*s])}(e,c,a,r/o),c;const d=function(t,e,i){const s=function(t){const e=t.length;let i,s;if(e<2)return!1;for(s=t[0],i=1;i<e;++i)if(t[i]-t[i-1]!==s)return!1;return s}(t),n=e.length/i;if(!s)return Math.max(n,1);const o=W(s);for(let t=0,e=o.length-1;t<e;t++){const e=o[t];if(e>n)return e}return Math.max(n,1)}(a,e,o);if(r>0){let t,i;const n=r>1?Math.round((h-l)/(r-1)):null;for(Us(e,c,d,s(n)?0:l-n,l),t=0,i=r-1;t<i;t++)Us(e,c,d,a[t],a[t+1]);return Us(e,c,d,h,s(n)?e.length:h+n),c}return Us(e,c,d),c}function Us(t,e,i,s,n){const o=l(s,0),a=Math.min(l(n,t.length),t.length);let r,h,c,d=0;for(i=Math.ceil(i),n&&(r=n-s,i=r/Math.floor(r/i)),c=o;c<0;)d++,c=Math.round(o+d*i);for(h=Math.max(o,0);h<a;h++)h===c&&(e.push(t[h]),d++,c=Math.round(o+d*i))}const Xs=(t,e,i)=>"top"===e||"left"===e?t[e]+i:t[e]-i,qs=(t,e)=>Math.min(e||t,t);function Ks(t,e){const i=[],s=t.length/e,n=t.length;let o=0;for(;o<n;o+=s)i.push(t[Math.floor(o)]);return i}function Gs(t,e,i){const s=t.ticks.length,n=Math.min(e,s-1),o=t._startPixel,a=t._endPixel,r=1e-6;let l,h=t.getPixelForTick(n);if(!(i&&(l=1===s?Math.max(h-o,a-h):0===e?(t.getPixelForTick(1)-h)/2:(h-t.getPixelForTick(n-1))/2,h+=n<e?l:-l,h<o-r||h>a+r)))return h}function Js(t){return t.drawTicks?t.tickLength:0}function Zs(t,e){if(!t.display)return 0;const i=Si(t.font,e),s=ki(t.padding);return(n(t.text)?t.text.length:1)*i.lineHeight+s.height}function Qs(t,e,i){let s=ut(t);return(i&&"right"!==e||!i&&"right"===e)&&(s=(t=>"left"===t?"right":"right"===t?"left":t)(s)),s}class tn extends $s{constructor(t){super(),this.id=t.id,this.type=t.type,this.options=void 0,this.ctx=t.ctx,this.chart=t.chart,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.width=void 0,this.height=void 0,this._margins={left:0,right:0,top:0,bottom:0},this.maxWidth=void 0,this.maxHeight=void 0,this.paddingTop=void 0,this.paddingBottom=void 0,this.paddingLeft=void 0,this.paddingRight=void 0,this.axis=void 0,this.labelRotation=void 0,this.min=void 0,this.max=void 0,this._range=void 0,this.ticks=[],this._gridLineItems=null,this._labelItems=null,this._labelSizes=null,this._length=0,this._maxLength=0,this._longestTextCache={},this._startPixel=void 0,this._endPixel=void 0,this._reversePixels=!1,this._userMax=void 0,this._userMin=void 0,this._suggestedMax=void 0,this._suggestedMin=void 0,this._ticksLength=0,this._borderValue=0,this._cache={},this._dataLimitsCached=!1,this.$context=void 0}init(t){this.options=t.setContext(this.getContext()),this.axis=t.axis,this._userMin=this.parse(t.min),this._userMax=this.parse(t.max),this._suggestedMin=this.parse(t.suggestedMin),this._suggestedMax=this.parse(t.suggestedMax)}parse(t,e){return t}getUserBounds(){let{_userMin:t,_userMax:e,_suggestedMin:i,_suggestedMax:s}=this;return t=r(t,Number.POSITIVE_INFINITY),e=r(e,Number.NEGATIVE_INFINITY),i=r(i,Number.POSITIVE_INFINITY),s=r(s,Number.NEGATIVE_INFINITY),{min:r(t,i),max:r(e,s),minDefined:a(t),maxDefined:a(e)}}getMinMax(t){let e,{min:i,max:s,minDefined:n,maxDefined:o}=this.getUserBounds();if(n&&o)return{min:i,max:s};const a=this.getMatchingVisibleMetas();for(let r=0,l=a.length;r<l;++r)e=a[r].controller.getMinMax(this,t),n||(i=Math.min(i,e.min)),o||(s=Math.max(s,e.max));return i=o&&i>s?s:i,s=n&&i>s?i:s,{min:r(i,r(s,i)),max:r(s,r(i,s))}}getPadding(){return{left:this.paddingLeft||0,top:this.paddingTop||0,right:this.paddingRight||0,bottom:this.paddingBottom||0}}getTicks(){return this.ticks}getLabels(){const t=this.chart.data;return this.options.labels||(this.isHorizontal()?t.xLabels:t.yLabels)||t.labels||[]}getLabelItems(t=this.chart.chartArea){return this._labelItems||(this._labelItems=this._computeLabelItems(t))}beforeLayout(){this._cache={},this._dataLimitsCached=!1}beforeUpdate(){d(this.options.beforeUpdate,[this])}update(t,e,i){const{beginAtZero:s,grace:n,ticks:o}=this.options,a=o.sampleSize;this.beforeUpdate(),this.maxWidth=t,this.maxHeight=e,this._margins=i=Object.assign({left:0,right:0,top:0,bottom:0},i),this.ticks=null,this._labelSizes=null,this._gridLineItems=null,this._labelItems=null,this.beforeSetDimensions(),this.setDimensions(),this.afterSetDimensions(),this._maxLength=this.isHorizontal()?this.width+i.left+i.right:this.height+i.top+i.bottom,this._dataLimitsCached||(this.beforeDataLimits(),this.determineDataLimits(),this.afterDataLimits(),this._range=Di(this,n,s),this._dataLimitsCached=!0),this.beforeBuildTicks(),this.ticks=this.buildTicks()||[],this.afterBuildTicks();const r=a<this.ticks.length;this._convertTicksToLabels(r?Ks(this.ticks,a):this.ticks),this.configure(),this.beforeCalculateLabelRotation(),this.calculateLabelRotation(),this.afterCalculateLabelRotation(),o.display&&(o.autoSkip||"auto"===o.source)&&(this.ticks=Ys(this,this.ticks),this._labelSizes=null,this.afterAutoSkip()),r&&this._convertTicksToLabels(this.ticks),this.beforeFit(),this.fit(),this.afterFit(),this.afterUpdate()}configure(){let t,e,i=this.options.reverse;this.isHorizontal()?(t=this.left,e=this.right):(t=this.top,e=this.bottom,i=!i),this._startPixel=t,this._endPixel=e,this._reversePixels=i,this._length=e-t,this._alignToPixels=this.options.alignToPixels}afterUpdate(){d(this.options.afterUpdate,[this])}beforeSetDimensions(){d(this.options.beforeSetDimensions,[this])}setDimensions(){this.isHorizontal()?(this.width=this.maxWidth,this.left=0,this.right=this.width):(this.height=this.maxHeight,this.top=0,this.bottom=this.height),this.paddingLeft=0,this.paddingTop=0,this.paddingRight=0,this.paddingBottom=0}afterSetDimensions(){d(this.options.afterSetDimensions,[this])}_callHooks(t){this.chart.notifyPlugins(t,this.getContext()),d(this.options[t],[this])}beforeDataLimits(){this._callHooks("beforeDataLimits")}determineDataLimits(){}afterDataLimits(){this._callHooks("afterDataLimits")}beforeBuildTicks(){this._callHooks("beforeBuildTicks")}buildTicks(){return[]}afterBuildTicks(){this._callHooks("afterBuildTicks")}beforeTickToLabelConversion(){d(this.options.beforeTickToLabelConversion,[this])}generateTickLabels(t){const e=this.options.ticks;let i,s,n;for(i=0,s=t.length;i<s;i++)n=t[i],n.label=d(e.callback,[n.value,i,t],this)}afterTickToLabelConversion(){d(this.options.afterTickToLabelConversion,[this])}beforeCalculateLabelRotation(){d(this.options.beforeCalculateLabelRotation,[this])}calculateLabelRotation(){const t=this.options,e=t.ticks,i=qs(this.ticks.length,t.ticks.maxTicksLimit),s=e.minRotation||0,n=e.maxRotation;let o,a,r,l=s;if(!this._isVisible()||!e.display||s>=n||i<=1||!this.isHorizontal())return void(this.labelRotation=s);const h=this._getLabelSizes(),c=h.widest.width,d=h.highest.height,u=Z(this.chart.width-c,0,this.maxWidth);o=t.offset?this.maxWidth/i:u/(i-1),c+6>o&&(o=u/(i-(t.offset?.5:1)),a=this.maxHeight-Js(t.grid)-e.padding-Zs(t.title,this.chart.options.font),r=Math.sqrt(c*c+d*d),l=Y(Math.min(Math.asin(Z((h.highest.height+6)/o,-1,1)),Math.asin(Z(a/r,-1,1))-Math.asin(Z(d/r,-1,1)))),l=Math.max(s,Math.min(n,l))),this.labelRotation=l}afterCalculateLabelRotation(){d(this.options.afterCalculateLabelRotation,[this])}afterAutoSkip(){}beforeFit(){d(this.options.beforeFit,[this])}fit(){const t={width:0,height:0},{chart:e,options:{ticks:i,title:s,grid:n}}=this,o=this._isVisible(),a=this.isHorizontal();if(o){const o=Zs(s,e.options.font);if(a?(t.width=this.maxWidth,t.height=Js(n)+o):(t.height=this.maxHeight,t.width=Js(n)+o),i.display&&this.ticks.length){const{first:e,last:s,widest:n,highest:o}=this._getLabelSizes(),r=2*i.padding,l=$(this.labelRotation),h=Math.cos(l),c=Math.sin(l);if(a){const e=i.mirror?0:c*n.width+h*o.height;t.height=Math.min(this.maxHeight,t.height+e+r)}else{const e=i.mirror?0:h*n.width+c*o.height;t.width=Math.min(this.maxWidth,t.width+e+r)}this._calculatePadding(e,s,c,h)}}this._handleMargins(),a?(this.width=this._length=e.width-this._margins.left-this._margins.right,this.height=t.height):(this.width=t.width,this.height=this._length=e.height-this._margins.top-this._margins.bottom)}_calculatePadding(t,e,i,s){const{ticks:{align:n,padding:o},position:a}=this.options,r=0!==this.labelRotation,l="top"!==a&&"x"===this.axis;if(this.isHorizontal()){const a=this.getPixelForTick(0)-this.left,h=this.right-this.getPixelForTick(this.ticks.length-1);let c=0,d=0;r?l?(c=s*t.width,d=i*e.height):(c=i*t.height,d=s*e.width):"start"===n?d=e.width:"end"===n?c=t.width:"inner"!==n&&(c=t.width/2,d=e.width/2),this.paddingLeft=Math.max((c-a+o)*this.width/(this.width-a),0),this.paddingRight=Math.max((d-h+o)*this.width/(this.width-h),0)}else{let i=e.height/2,s=t.height/2;"start"===n?(i=0,s=t.height):"end"===n&&(i=e.height,s=0),this.paddingTop=i+o,this.paddingBottom=s+o}}_handleMargins(){this._margins&&(this._margins.left=Math.max(this.paddingLeft,this._margins.left),this._margins.top=Math.max(this.paddingTop,this._margins.top),this._margins.right=Math.max(this.paddingRight,this._margins.right),this._margins.bottom=Math.max(this.paddingBottom,this._margins.bottom))}afterFit(){d(this.options.afterFit,[this])}isHorizontal(){const{axis:t,position:e}=this.options;return"top"===e||"bottom"===e||"x"===t}isFullSize(){return this.options.fullSize}_convertTicksToLabels(t){let e,i;for(this.beforeTickToLabelConversion(),this.generateTickLabels(t),e=0,i=t.length;e<i;e++)s(t[e].label)&&(t.splice(e,1),i--,e--);this.afterTickToLabelConversion()}_getLabelSizes(){let t=this._labelSizes;if(!t){const e=this.options.ticks.sampleSize;let i=this.ticks;e<i.length&&(i=Ks(i,e)),this._labelSizes=t=this._computeLabelSizes(i,i.length,this.options.ticks.maxTicksLimit)}return t}_computeLabelSizes(t,e,i){const{ctx:o,_longestTextCache:a}=this,r=[],l=[],h=Math.floor(e/qs(e,i));let c,d,f,g,p,m,x,b,_,y,v,M=0,w=0;for(c=0;c<e;c+=h){if(g=t[c].label,p=this._resolveTickFontOptions(c),o.font=m=p.string,x=a[m]=a[m]||{data:{},gc:[]},b=p.lineHeight,_=y=0,s(g)||n(g)){if(n(g))for(d=0,f=g.length;d<f;++d)v=g[d],s(v)||n(v)||(_=Ce(o,x.data,x.gc,_,v),y+=b)}else _=Ce(o,x.data,x.gc,_,g),y=b;r.push(_),l.push(y),M=Math.max(_,M),w=Math.max(y,w)}!function(t,e){u(t,(t=>{const i=t.gc,s=i.length/2;let n;if(s>e){for(n=0;n<s;++n)delete t.data[i[n]];i.splice(0,s)}}))}(a,e);const k=r.indexOf(M),S=l.indexOf(w),P=t=>({width:r[t]||0,height:l[t]||0});return{first:P(0),last:P(e-1),widest:P(k),highest:P(S),widths:r,heights:l}}getLabelForValue(t){return t}getPixelForValue(t,e){return NaN}getValueForPixel(t){}getPixelForTick(t){const e=this.ticks;return t<0||t>e.length-1?null:this.getPixelForValue(e[t].value)}getPixelForDecimal(t){this._reversePixels&&(t=1-t);const e=this._startPixel+t*this._length;return Q(this._alignToPixels?Ae(this.chart,e,0):e)}getDecimalForPixel(t){const e=(t-this._startPixel)/this._length;return this._reversePixels?1-e:e}getBasePixel(){return this.getPixelForValue(this.getBaseValue())}getBaseValue(){const{min:t,max:e}=this;return t<0&&e<0?e:t>0&&e>0?t:0}getContext(t){const e=this.ticks||[];if(t>=0&&t<e.length){const i=e[t];return i.$context||(i.$context=function(t,e,i){return Ci(t,{tick:i,index:e,type:"tick"})}(this.getContext(),t,i))}return this.$context||(this.$context=Ci(this.chart.getContext(),{scale:this,type:"scale"}))}_tickSize(){const t=this.options.ticks,e=$(this.labelRotation),i=Math.abs(Math.cos(e)),s=Math.abs(Math.sin(e)),n=this._getLabelSizes(),o=t.autoSkipPadding||0,a=n?n.widest.width+o:0,r=n?n.highest.height+o:0;return this.isHorizontal()?r*i>a*s?a/i:r/s:r*s<a*i?r/i:a/s}_isVisible(){const t=this.options.display;return"auto"!==t?!!t:this.getMatchingVisibleMetas().length>0}_computeGridLineItems(t){const e=this.axis,i=this.chart,s=this.options,{grid:n,position:a,border:r}=s,h=n.offset,c=this.isHorizontal(),d=this.ticks.length+(h?1:0),u=Js(n),f=[],g=r.setContext(this.getContext()),p=g.display?g.width:0,m=p/2,x=function(t){return Ae(i,t,p)};let b,_,y,v,M,w,k,S,P,D,C,O;if("top"===a)b=x(this.bottom),w=this.bottom-u,S=b-m,D=x(t.top)+m,O=t.bottom;else if("bottom"===a)b=x(this.top),D=t.top,O=x(t.bottom)-m,w=b+m,S=this.top+u;else if("left"===a)b=x(this.right),M=this.right-u,k=b-m,P=x(t.left)+m,C=t.right;else if("right"===a)b=x(this.left),P=t.left,C=x(t.right)-m,M=b+m,k=this.left+u;else if("x"===e){if("center"===a)b=x((t.top+t.bottom)/2+.5);else if(o(a)){const t=Object.keys(a)[0],e=a[t];b=x(this.chart.scales[t].getPixelForValue(e))}D=t.top,O=t.bottom,w=b+m,S=w+u}else if("y"===e){if("center"===a)b=x((t.left+t.right)/2);else if(o(a)){const t=Object.keys(a)[0],e=a[t];b=x(this.chart.scales[t].getPixelForValue(e))}M=b-m,k=M-u,P=t.left,C=t.right}const A=l(s.ticks.maxTicksLimit,d),T=Math.max(1,Math.ceil(d/A));for(_=0;_<d;_+=T){const t=this.getContext(_),e=n.setContext(t),s=r.setContext(t),o=e.lineWidth,a=e.color,l=s.dash||[],d=s.dashOffset,u=e.tickWidth,g=e.tickColor,p=e.tickBorderDash||[],m=e.tickBorderDashOffset;y=Gs(this,_,h),void 0!==y&&(v=Ae(i,y,o),c?M=k=P=C=v:w=S=D=O=v,f.push({tx1:M,ty1:w,tx2:k,ty2:S,x1:P,y1:D,x2:C,y2:O,width:o,color:a,borderDash:l,borderDashOffset:d,tickWidth:u,tickColor:g,tickBorderDash:p,tickBorderDashOffset:m}))}return this._ticksLength=d,this._borderValue=b,f}_computeLabelItems(t){const e=this.axis,i=this.options,{position:s,ticks:a}=i,r=this.isHorizontal(),l=this.ticks,{align:h,crossAlign:c,padding:d,mirror:u}=a,f=Js(i.grid),g=f+d,p=u?-d:g,m=-$(this.labelRotation),x=[];let b,_,y,v,M,w,k,S,P,D,C,O,A="middle";if("top"===s)w=this.bottom-p,k=this._getXAxisLabelAlignment();else if("bottom"===s)w=this.top+p,k=this._getXAxisLabelAlignment();else if("left"===s){const t=this._getYAxisLabelAlignment(f);k=t.textAlign,M=t.x}else if("right"===s){const t=this._getYAxisLabelAlignment(f);k=t.textAlign,M=t.x}else if("x"===e){if("center"===s)w=(t.top+t.bottom)/2+g;else if(o(s)){const t=Object.keys(s)[0],e=s[t];w=this.chart.scales[t].getPixelForValue(e)+g}k=this._getXAxisLabelAlignment()}else if("y"===e){if("center"===s)M=(t.left+t.right)/2-g;else if(o(s)){const t=Object.keys(s)[0],e=s[t];M=this.chart.scales[t].getPixelForValue(e)}k=this._getYAxisLabelAlignment(f).textAlign}"y"===e&&("start"===h?A="top":"end"===h&&(A="bottom"));const T=this._getLabelSizes();for(b=0,_=l.length;b<_;++b){y=l[b],v=y.label;const t=a.setContext(this.getContext(b));S=this.getPixelForTick(b)+a.labelOffset,P=this._resolveTickFontOptions(b),D=P.lineHeight,C=n(v)?v.length:1;const e=C/2,i=t.color,o=t.textStrokeColor,h=t.textStrokeWidth;let d,f=k;if(r?(M=S,"inner"===k&&(f=b===_-1?this.options.reverse?"left":"right":0===b?this.options.reverse?"right":"left":"center"),O="top"===s?"near"===c||0!==m?-C*D+D/2:"center"===c?-T.highest.height/2-e*D+D:-T.highest.height+D/2:"near"===c||0!==m?D/2:"center"===c?T.highest.height/2-e*D:T.highest.height-C*D,u&&(O*=-1),0===m||t.showLabelBackdrop||(M+=D/2*Math.sin(m))):(w=S,O=(1-C)*D/2),t.showLabelBackdrop){const e=ki(t.backdropPadding),i=T.heights[b],s=T.widths[b];let n=O-e.top,o=0-e.left;switch(A){case"middle":n-=i/2;break;case"bottom":n-=i}switch(k){case"center":o-=s/2;break;case"right":o-=s;break;case"inner":b===_-1?o-=s:b>0&&(o-=s/2)}d={left:o,top:n,width:s+e.width,height:i+e.height,color:t.backdropColor}}x.push({label:v,font:P,textOffset:O,options:{rotation:m,color:i,strokeColor:o,strokeWidth:h,textAlign:f,textBaseline:A,translation:[M,w],backdrop:d}})}return x}_getXAxisLabelAlignment(){const{position:t,ticks:e}=this.options;if(-$(this.labelRotation))return"top"===t?"left":"right";let i="center";return"start"===e.align?i="left":"end"===e.align?i="right":"inner"===e.align&&(i="inner"),i}_getYAxisLabelAlignment(t){const{position:e,ticks:{crossAlign:i,mirror:s,padding:n}}=this.options,o=t+n,a=this._getLabelSizes().widest.width;let r,l;return"left"===e?s?(l=this.right+n,"near"===i?r="left":"center"===i?(r="center",l+=a/2):(r="right",l+=a)):(l=this.right-o,"near"===i?r="right":"center"===i?(r="center",l-=a/2):(r="left",l=this.left)):"right"===e?s?(l=this.left+n,"near"===i?r="right":"center"===i?(r="center",l-=a/2):(r="left",l-=a)):(l=this.left+o,"near"===i?r="left":"center"===i?(r="center",l+=a/2):(r="right",l=this.right)):r="right",{textAlign:r,x:l}}_computeLabelArea(){if(this.options.ticks.mirror)return;const t=this.chart,e=this.options.position;return"left"===e||"right"===e?{top:0,left:this.left,bottom:t.height,right:this.right}:"top"===e||"bottom"===e?{top:this.top,left:0,bottom:this.bottom,right:t.width}:void 0}drawBackground(){const{ctx:t,options:{backgroundColor:e},left:i,top:s,width:n,height:o}=this;e&&(t.save(),t.fillStyle=e,t.fillRect(i,s,n,o),t.restore())}getLineWidthForValue(t){const e=this.options.grid;if(!this._isVisible()||!e.display)return 0;const i=this.ticks.findIndex((e=>e.value===t));if(i>=0){return e.setContext(this.getContext(i)).lineWidth}return 0}drawGrid(t){const e=this.options.grid,i=this.ctx,s=this._gridLineItems||(this._gridLineItems=this._computeGridLineItems(t));let n,o;const a=(t,e,s)=>{s.width&&s.color&&(i.save(),i.lineWidth=s.width,i.strokeStyle=s.color,i.setLineDash(s.borderDash||[]),i.lineDashOffset=s.borderDashOffset,i.beginPath(),i.moveTo(t.x,t.y),i.lineTo(e.x,e.y),i.stroke(),i.restore())};if(e.display)for(n=0,o=s.length;n<o;++n){const t=s[n];e.drawOnChartArea&&a({x:t.x1,y:t.y1},{x:t.x2,y:t.y2},t),e.drawTicks&&a({x:t.tx1,y:t.ty1},{x:t.tx2,y:t.ty2},{color:t.tickColor,width:t.tickWidth,borderDash:t.tickBorderDash,borderDashOffset:t.tickBorderDashOffset})}}drawBorder(){const{chart:t,ctx:e,options:{border:i,grid:s}}=this,n=i.setContext(this.getContext()),o=i.display?n.width:0;if(!o)return;const a=s.setContext(this.getContext(0)).lineWidth,r=this._borderValue;let l,h,c,d;this.isHorizontal()?(l=Ae(t,this.left,o)-o/2,h=Ae(t,this.right,a)+a/2,c=d=r):(c=Ae(t,this.top,o)-o/2,d=Ae(t,this.bottom,a)+a/2,l=h=r),e.save(),e.lineWidth=n.width,e.strokeStyle=n.color,e.beginPath(),e.moveTo(l,c),e.lineTo(h,d),e.stroke(),e.restore()}drawLabels(t){if(!this.options.ticks.display)return;const e=this.ctx,i=this._computeLabelArea();i&&Ie(e,i);const s=this.getLabelItems(t);for(const t of s){const i=t.options,s=t.font;Ne(e,t.label,0,t.textOffset,s,i)}i&&ze(e)}drawTitle(){const{ctx:t,options:{position:e,title:i,reverse:s}}=this;if(!i.display)return;const a=Si(i.font),r=ki(i.padding),l=i.align;let h=a.lineHeight/2;"bottom"===e||"center"===e||o(e)?(h+=r.bottom,n(i.text)&&(h+=a.lineHeight*(i.text.length-1))):h+=r.top;const{titleX:c,titleY:d,maxWidth:u,rotation:f}=function(t,e,i,s){const{top:n,left:a,bottom:r,right:l,chart:h}=t,{chartArea:c,scales:d}=h;let u,f,g,p=0;const m=r-n,x=l-a;if(t.isHorizontal()){if(f=ft(s,a,l),o(i)){const t=Object.keys(i)[0],s=i[t];g=d[t].getPixelForValue(s)+m-e}else g="center"===i?(c.bottom+c.top)/2+m-e:Xs(t,i,e);u=l-a}else{if(o(i)){const t=Object.keys(i)[0],s=i[t];f=d[t].getPixelForValue(s)-x+e}else f="center"===i?(c.left+c.right)/2-x+e:Xs(t,i,e);g=ft(s,r,n),p="left"===i?-E:E}return{titleX:f,titleY:g,maxWidth:u,rotation:p}}(this,h,e,l);Ne(t,i.text,0,0,a,{color:i.color,maxWidth:u,rotation:f,textAlign:Qs(l,e,s),textBaseline:"middle",translation:[c,d]})}draw(t){this._isVisible()&&(this.drawBackground(),this.drawGrid(t),this.drawBorder(),this.drawTitle(),this.drawLabels(t))}_layers(){const t=this.options,e=t.ticks&&t.ticks.z||0,i=l(t.grid&&t.grid.z,-1),s=l(t.border&&t.border.z,0);return this._isVisible()&&this.draw===tn.prototype.draw?[{z:i,draw:t=>{this.drawBackground(),this.drawGrid(t),this.drawTitle()}},{z:s,draw:()=>{this.drawBorder()}},{z:e,draw:t=>{this.drawLabels(t)}}]:[{z:e,draw:t=>{this.draw(t)}}]}getMatchingVisibleMetas(t){const e=this.chart.getSortedVisibleDatasetMetas(),i=this.axis+"AxisID",s=[];let n,o;for(n=0,o=e.length;n<o;++n){const o=e[n];o[i]!==this.id||t&&o.type!==t||s.push(o)}return s}_resolveTickFontOptions(t){return Si(this.options.ticks.setContext(this.getContext(t)).font)}_maxDigits(){const t=this._resolveTickFontOptions(0).lineHeight;return(this.isHorizontal()?this.width:this.height)/t}}class en{constructor(t,e,i){this.type=t,this.scope=e,this.override=i,this.items=Object.create(null)}isForType(t){return Object.prototype.isPrototypeOf.call(this.type.prototype,t.prototype)}register(t){const e=Object.getPrototypeOf(t);let i;(function(t){return"id"in t&&"defaults"in t})(e)&&(i=this.register(e));const s=this.items,n=t.id,o=this.scope+"."+n;if(!n)throw new Error("class does not have id: "+t);return n in s||(s[n]=t,function(t,e,i){const s=x(Object.create(null),[i?ue.get(i):{},ue.get(e),t.defaults]);ue.set(e,s),t.defaultRoutes&&function(t,e){Object.keys(e).forEach((i=>{const s=i.split("."),n=s.pop(),o=[t].concat(s).join("."),a=e[i].split("."),r=a.pop(),l=a.join(".");ue.route(o,n,l,r)}))}(e,t.defaultRoutes);t.descriptors&&ue.describe(e,t.descriptors)}(t,o,i),this.override&&ue.override(t.id,t.overrides)),o}get(t){return this.items[t]}unregister(t){const e=this.items,i=t.id,s=this.scope;i in e&&delete e[i],s&&i in ue[s]&&(delete ue[s][i],this.override&&delete re[i])}}class sn{constructor(){this.controllers=new en(js,"datasets",!0),this.elements=new en($s,"elements"),this.plugins=new en(Object,"plugins"),this.scales=new en(tn,"scales"),this._typedRegistries=[this.controllers,this.scales,this.elements]}add(...t){this._each("register",t)}remove(...t){this._each("unregister",t)}addControllers(...t){this._each("register",t,this.controllers)}addElements(...t){this._each("register",t,this.elements)}addPlugins(...t){this._each("register",t,this.plugins)}addScales(...t){this._each("register",t,this.scales)}getController(t){return this._get(t,this.controllers,"controller")}getElement(t){return this._get(t,this.elements,"element")}getPlugin(t){return this._get(t,this.plugins,"plugin")}getScale(t){return this._get(t,this.scales,"scale")}removeControllers(...t){this._each("unregister",t,this.controllers)}removeElements(...t){this._each("unregister",t,this.elements)}removePlugins(...t){this._each("unregister",t,this.plugins)}removeScales(...t){this._each("unregister",t,this.scales)}_each(t,e,i){[...e].forEach((e=>{const s=i||this._getRegistryForType(e);i||s.isForType(e)||s===this.plugins&&e.id?this._exec(t,s,e):u(e,(e=>{const s=i||this._getRegistryForType(e);this._exec(t,s,e)}))}))}_exec(t,e,i){const s=w(t);d(i["before"+s],[],i),e[t](i),d(i["after"+s],[],i)}_getRegistryForType(t){for(let e=0;e<this._typedRegistries.length;e++){const i=this._typedRegistries[e];if(i.isForType(t))return i}return this.plugins}_get(t,e,i){const s=e.get(t);if(void 0===s)throw new Error('"'+t+'" is not a registered '+i+".");return s}}var nn=new sn;class on{constructor(){this._init=void 0}notify(t,e,i,s){if("beforeInit"===e&&(this._init=this._createDescriptors(t,!0),this._notify(this._init,t,"install")),void 0===this._init)return;const n=s?this._descriptors(t).filter(s):this._descriptors(t),o=this._notify(n,t,e,i);return"afterDestroy"===e&&(this._notify(n,t,"stop"),this._notify(this._init,t,"uninstall"),this._init=void 0),o}_notify(t,e,i,s){s=s||{};for(const n of t){const t=n.plugin;if(!1===d(t[i],[e,s,n.options],t)&&s.cancelable)return!1}return!0}invalidate(){s(this._cache)||(this._oldCache=this._cache,this._cache=void 0)}_descriptors(t){if(this._cache)return this._cache;const e=this._cache=this._createDescriptors(t);return this._notifyStateChanges(t),e}_createDescriptors(t,e){const i=t&&t.config,s=l(i.options&&i.options.plugins,{}),n=function(t){const e={},i=[],s=Object.keys(nn.plugins.items);for(let t=0;t<s.length;t++)i.push(nn.getPlugin(s[t]));const n=t.plugins||[];for(let t=0;t<n.length;t++){const s=n[t];-1===i.indexOf(s)&&(i.push(s),e[s.id]=!0)}return{plugins:i,localIds:e}}(i);return!1!==s||e?function(t,{plugins:e,localIds:i},s,n){const o=[],a=t.getContext();for(const r of e){const e=r.id,l=an(s[e],n);null!==l&&o.push({plugin:r,options:rn(t.config,{plugin:r,local:i[e]},l,a)})}return o}(t,n,s,e):[]}_notifyStateChanges(t){const e=this._oldCache||[],i=this._cache,s=(t,e)=>t.filter((t=>!e.some((e=>t.plugin.id===e.plugin.id))));this._notify(s(e,i),t,"stop"),this._notify(s(i,e),t,"start")}}function an(t,e){return e||!1!==t?!0===t?{}:t:null}function rn(t,{plugin:e,local:i},s,n){const o=t.pluginScopeKeys(e),a=t.getOptionScopes(s,o);return i&&e.defaults&&a.push(e.defaults),t.createResolver(a,n,[""],{scriptable:!1,indexable:!1,allKeys:!0})}function ln(t,e){const i=ue.datasets[t]||{};return((e.datasets||{})[t]||{}).indexAxis||e.indexAxis||i.indexAxis||"x"}function hn(t){if("x"===t||"y"===t||"r"===t)return t}function cn(t,...e){if(hn(t))return t;for(const s of e){const e=s.axis||("top"===(i=s.position)||"bottom"===i?"x":"left"===i||"right"===i?"y":void 0)||t.length>1&&hn(t[0].toLowerCase());if(e)return e}var i;throw new Error(`Cannot determine type of '${t}' axis. Please provide 'axis' or 'position' option.`)}function dn(t,e,i){if(i[e+"AxisID"]===t)return{axis:e}}function un(t,e){const i=re[t.type]||{scales:{}},s=e.scales||{},n=ln(t.type,e),a=Object.create(null);return Object.keys(s).forEach((e=>{const r=s[e];if(!o(r))return console.error(`Invalid scale configuration for scale: ${e}`);if(r._proxy)return console.warn(`Ignoring resolver passed as options for scale: ${e}`);const l=cn(e,r,function(t,e){if(e.data&&e.data.datasets){const i=e.data.datasets.filter((e=>e.xAxisID===t||e.yAxisID===t));if(i.length)return dn(t,"x",i[0])||dn(t,"y",i[0])}return{}}(e,t),ue.scales[r.type]),h=function(t,e){return t===e?"_index_":"_value_"}(l,n),c=i.scales||{};a[e]=b(Object.create(null),[{axis:l},r,c[l],c[h]])})),t.data.datasets.forEach((i=>{const n=i.type||t.type,o=i.indexAxis||ln(n,e),r=(re[n]||{}).scales||{};Object.keys(r).forEach((t=>{const e=function(t,e){let i=t;return"_index_"===t?i=e:"_value_"===t&&(i="x"===e?"y":"x"),i}(t,o),n=i[e+"AxisID"]||e;a[n]=a[n]||Object.create(null),b(a[n],[{axis:e},s[n],r[t]])}))})),Object.keys(a).forEach((t=>{const e=a[t];b(e,[ue.scales[e.type],ue.scale])})),a}function fn(t){const e=t.options||(t.options={});e.plugins=l(e.plugins,{}),e.scales=un(t,e)}function gn(t){return(t=t||{}).datasets=t.datasets||[],t.labels=t.labels||[],t}const pn=new Map,mn=new Set;function xn(t,e){let i=pn.get(t);return i||(i=e(),pn.set(t,i),mn.add(i)),i}const bn=(t,e,i)=>{const s=M(e,i);void 0!==s&&t.add(s)};class _n{constructor(t){this._config=function(t){return(t=t||{}).data=gn(t.data),fn(t),t}(t),this._scopeCache=new Map,this._resolverCache=new Map}get platform(){return this._config.platform}get type(){return this._config.type}set type(t){this._config.type=t}get data(){return this._config.data}set data(t){this._config.data=gn(t)}get options(){return this._config.options}set options(t){this._config.options=t}get plugins(){return this._config.plugins}update(){const t=this._config;this.clearCache(),fn(t)}clearCache(){this._scopeCache.clear(),this._resolverCache.clear()}datasetScopeKeys(t){return xn(t,(()=>[[`datasets.${t}`,""]]))}datasetAnimationScopeKeys(t,e){return xn(`${t}.transition.${e}`,(()=>[[`datasets.${t}.transitions.${e}`,`transitions.${e}`],[`datasets.${t}`,""]]))}datasetElementScopeKeys(t,e){return xn(`${t}-${e}`,(()=>[[`datasets.${t}.elements.${e}`,`datasets.${t}`,`elements.${e}`,""]]))}pluginScopeKeys(t){const e=t.id;return xn(`${this.type}-plugin-${e}`,(()=>[[`plugins.${e}`,...t.additionalOptionScopes||[]]]))}_cachedScopes(t,e){const i=this._scopeCache;let s=i.get(t);return s&&!e||(s=new Map,i.set(t,s)),s}getOptionScopes(t,e,i){const{options:s,type:n}=this,o=this._cachedScopes(t,i),a=o.get(e);if(a)return a;const r=new Set;e.forEach((e=>{t&&(r.add(t),e.forEach((e=>bn(r,t,e)))),e.forEach((t=>bn(r,s,t))),e.forEach((t=>bn(r,re[n]||{},t))),e.forEach((t=>bn(r,ue,t))),e.forEach((t=>bn(r,le,t)))}));const l=Array.from(r);return 0===l.length&&l.push(Object.create(null)),mn.has(e)&&o.set(e,l),l}chartOptionScopes(){const{options:t,type:e}=this;return[t,re[e]||{},ue.datasets[e]||{},{type:e},ue,le]}resolveNamedOptions(t,e,i,s=[""]){const o={$shared:!0},{resolver:a,subPrefixes:r}=yn(this._resolverCache,t,s);let l=a;if(function(t,e){const{isScriptable:i,isIndexable:s}=Ye(t);for(const o of e){const e=i(o),a=s(o),r=(a||e)&&t[o];if(e&&(S(r)||vn(r))||a&&n(r))return!0}return!1}(a,e)){o.$shared=!1;l=$e(a,i=S(i)?i():i,this.createResolver(t,i,r))}for(const t of e)o[t]=l[t];return o}createResolver(t,e,i=[""],s){const{resolver:n}=yn(this._resolverCache,t,i);return o(e)?$e(n,e,void 0,s):n}}function yn(t,e,i){let s=t.get(e);s||(s=new Map,t.set(e,s));const n=i.join();let o=s.get(n);if(!o){o={resolver:je(e,i),subPrefixes:i.filter((t=>!t.toLowerCase().includes("hover")))},s.set(n,o)}return o}const vn=t=>o(t)&&Object.getOwnPropertyNames(t).some((e=>S(t[e])));const Mn=["top","bottom","left","right","chartArea"];function wn(t,e){return"top"===t||"bottom"===t||-1===Mn.indexOf(t)&&"x"===e}function kn(t,e){return function(i,s){return i[t]===s[t]?i[e]-s[e]:i[t]-s[t]}}function Sn(t){const e=t.chart,i=e.options.animation;e.notifyPlugins("afterRender"),d(i&&i.onComplete,[t],e)}function Pn(t){const e=t.chart,i=e.options.animation;d(i&&i.onProgress,[t],e)}function Dn(t){return fe()&&"string"==typeof t?t=document.getElementById(t):t&&t.length&&(t=t[0]),t&&t.canvas&&(t=t.canvas),t}const Cn={},On=t=>{const e=Dn(t);return Object.values(Cn).filter((t=>t.canvas===e)).pop()};function An(t,e,i){const s=Object.keys(t);for(const n of s){const s=+n;if(s>=e){const o=t[n];delete t[n],(i>0||s>e)&&(t[s+i]=o)}}}class Tn{static defaults=ue;static instances=Cn;static overrides=re;static registry=nn;static version="4.5.1";static getChart=On;static register(...t){nn.add(...t),Ln()}static unregister(...t){nn.remove(...t),Ln()}constructor(t,e){const s=this.config=new _n(e),n=Dn(t),o=On(n);if(o)throw new Error("Canvas is already in use. Chart with ID '"+o.id+"' must be destroyed before the canvas with ID '"+o.canvas.id+"' can be reused.");const a=s.createResolver(s.chartOptionScopes(),this.getContext());this.platform=new(s.platform||Ps(n)),this.platform.updateConfig(s);const r=this.platform.acquireContext(n,a.aspectRatio),l=r&&r.canvas,h=l&&l.height,c=l&&l.width;this.id=i(),this.ctx=r,this.canvas=l,this.width=c,this.height=h,this._options=a,this._aspectRatio=this.aspectRatio,this._layers=[],this._metasets=[],this._stacks=void 0,this.boxes=[],this.currentDevicePixelRatio=void 0,this.chartArea=void 0,this._active=[],this._lastEvent=void 0,this._listeners={},this._responsiveListeners=void 0,this._sortedMetasets=[],this.scales={},this._plugins=new on,this.$proxies={},this._hiddenIndices={},this.attached=!1,this._animationsDisabled=void 0,this.$context=void 0,this._doResize=dt((t=>this.update(t)),a.resizeDelay||0),this._dataChanges=[],Cn[this.id]=this,r&&l?(bt.listen(this,"complete",Sn),bt.listen(this,"progress",Pn),this._initialize(),this.attached&&this.update()):console.error("Failed to create chart: can't acquire context from the given item")}get aspectRatio(){const{options:{aspectRatio:t,maintainAspectRatio:e},width:i,height:n,_aspectRatio:o}=this;return s(t)?e&&o?o:n?i/n:null:t}get data(){return this.config.data}set data(t){this.config.data=t}get options(){return this._options}set options(t){this.config.options=t}get registry(){return nn}_initialize(){return this.notifyPlugins("beforeInit"),this.options.responsive?this.resize():ke(this,this.options.devicePixelRatio),this.bindEvents(),this.notifyPlugins("afterInit"),this}clear(){return Te(this.canvas,this.ctx),this}stop(){return bt.stop(this),this}resize(t,e){bt.running(this)?this._resizeBeforeDraw={width:t,height:e}:this._resize(t,e)}_resize(t,e){const i=this.options,s=this.canvas,n=i.maintainAspectRatio&&this.aspectRatio,o=this.platform.getMaximumSize(s,t,e,n),a=i.devicePixelRatio||this.platform.getDevicePixelRatio(),r=this.width?"resize":"attach";this.width=o.width,this.height=o.height,this._aspectRatio=this.aspectRatio,ke(this,a,!0)&&(this.notifyPlugins("resize",{size:o}),d(i.onResize,[this,o],this),this.attached&&this._doResize(r)&&this.render())}ensureScalesHaveIDs(){u(this.options.scales||{},((t,e)=>{t.id=e}))}buildOrUpdateScales(){const t=this.options,e=t.scales,i=this.scales,s=Object.keys(i).reduce(((t,e)=>(t[e]=!1,t)),{});let n=[];e&&(n=n.concat(Object.keys(e).map((t=>{const i=e[t],s=cn(t,i),n="r"===s,o="x"===s;return{options:i,dposition:n?"chartArea":o?"bottom":"left",dtype:n?"radialLinear":o?"category":"linear"}})))),u(n,(e=>{const n=e.options,o=n.id,a=cn(o,n),r=l(n.type,e.dtype);void 0!==n.position&&wn(n.position,a)===wn(e.dposition)||(n.position=e.dposition),s[o]=!0;let h=null;if(o in i&&i[o].type===r)h=i[o];else{h=new(nn.getScale(r))({id:o,type:r,ctx:this.ctx,chart:this}),i[h.id]=h}h.init(n,t)})),u(s,((t,e)=>{t||delete i[e]})),u(i,(t=>{ls.configure(this,t,t.options),ls.addBox(this,t)}))}_updateMetasets(){const t=this._metasets,e=this.data.datasets.length,i=t.length;if(t.sort(((t,e)=>t.index-e.index)),i>e){for(let t=e;t<i;++t)this._destroyDatasetMeta(t);t.splice(e,i-e)}this._sortedMetasets=t.slice(0).sort(kn("order","index"))}_removeUnreferencedMetasets(){const{_metasets:t,data:{datasets:e}}=this;t.length>e.length&&delete this._stacks,t.forEach(((t,i)=>{0===e.filter((e=>e===t._dataset)).length&&this._destroyDatasetMeta(i)}))}buildOrUpdateControllers(){const t=[],e=this.data.datasets;let i,s;for(this._removeUnreferencedMetasets(),i=0,s=e.length;i<s;i++){const s=e[i];let n=this.getDatasetMeta(i);const o=s.type||this.config.type;if(n.type&&n.type!==o&&(this._destroyDatasetMeta(i),n=this.getDatasetMeta(i)),n.type=o,n.indexAxis=s.indexAxis||ln(o,this.options),n.order=s.order||0,n.index=i,n.label=""+s.label,n.visible=this.isDatasetVisible(i),n.controller)n.controller.updateIndex(i),n.controller.linkScales();else{const e=nn.getController(o),{datasetElementType:s,dataElementType:a}=ue.datasets[o];Object.assign(e,{dataElementType:nn.getElement(a),datasetElementType:s&&nn.getElement(s)}),n.controller=new e(this,i),t.push(n.controller)}}return this._updateMetasets(),t}_resetElements(){u(this.data.datasets,((t,e)=>{this.getDatasetMeta(e).controller.reset()}),this)}reset(){this._resetElements(),this.notifyPlugins("reset")}update(t){const e=this.config;e.update();const i=this._options=e.createResolver(e.chartOptionScopes(),this.getContext()),s=this._animationsDisabled=!i.animation;if(this._updateScales(),this._checkEventBindings(),this._updateHiddenIndices(),this._plugins.invalidate(),!1===this.notifyPlugins("beforeUpdate",{mode:t,cancelable:!0}))return;const n=this.buildOrUpdateControllers();this.notifyPlugins("beforeElementsUpdate");let o=0;for(let t=0,e=this.data.datasets.length;t<e;t++){const{controller:e}=this.getDatasetMeta(t),i=!s&&-1===n.indexOf(e);e.buildOrUpdateElements(i),o=Math.max(+e.getMaxOverflow(),o)}o=this._minPadding=i.layout.autoPadding?o:0,this._updateLayout(o),s||u(n,(t=>{t.reset()})),this._updateDatasets(t),this.notifyPlugins("afterUpdate",{mode:t}),this._layers.sort(kn("z","_idx"));const{_active:a,_lastEvent:r}=this;r?this._eventHandler(r,!0):a.length&&this._updateHoverStyles(a,a,!0),this.render()}_updateScales(){u(this.scales,(t=>{ls.removeBox(this,t)})),this.ensureScalesHaveIDs(),this.buildOrUpdateScales()}_checkEventBindings(){const t=this.options,e=new Set(Object.keys(this._listeners)),i=new Set(t.events);P(e,i)&&!!this._responsiveListeners===t.responsive||(this.unbindEvents(),this.bindEvents())}_updateHiddenIndices(){const{_hiddenIndices:t}=this,e=this._getUniformDataChanges()||[];for(const{method:i,start:s,count:n}of e){An(t,s,"_removeElements"===i?-n:n)}}_getUniformDataChanges(){const t=this._dataChanges;if(!t||!t.length)return;this._dataChanges=[];const e=this.data.datasets.length,i=e=>new Set(t.filter((t=>t[0]===e)).map(((t,e)=>e+","+t.splice(1).join(",")))),s=i(0);for(let t=1;t<e;t++)if(!P(s,i(t)))return;return Array.from(s).map((t=>t.split(","))).map((t=>({method:t[1],start:+t[2],count:+t[3]})))}_updateLayout(t){if(!1===this.notifyPlugins("beforeLayout",{cancelable:!0}))return;ls.update(this,this.width,this.height,t);const e=this.chartArea,i=e.width<=0||e.height<=0;this._layers=[],u(this.boxes,(t=>{i&&"chartArea"===t.position||(t.configure&&t.configure(),this._layers.push(...t._layers()))}),this),this._layers.forEach(((t,e)=>{t._idx=e})),this.notifyPlugins("afterLayout")}_updateDatasets(t){if(!1!==this.notifyPlugins("beforeDatasetsUpdate",{mode:t,cancelable:!0})){for(let t=0,e=this.data.datasets.length;t<e;++t)this.getDatasetMeta(t).controller.configure();for(let e=0,i=this.data.datasets.length;e<i;++e)this._updateDataset(e,S(t)?t({datasetIndex:e}):t);this.notifyPlugins("afterDatasetsUpdate",{mode:t})}}_updateDataset(t,e){const i=this.getDatasetMeta(t),s={meta:i,index:t,mode:e,cancelable:!0};!1!==this.notifyPlugins("beforeDatasetUpdate",s)&&(i.controller._update(e),s.cancelable=!1,this.notifyPlugins("afterDatasetUpdate",s))}render(){!1!==this.notifyPlugins("beforeRender",{cancelable:!0})&&(bt.has(this)?this.attached&&!bt.running(this)&&bt.start(this):(this.draw(),Sn({chart:this})))}draw(){let t;if(this._resizeBeforeDraw){const{width:t,height:e}=this._resizeBeforeDraw;this._resizeBeforeDraw=null,this._resize(t,e)}if(this.clear(),this.width<=0||this.height<=0)return;if(!1===this.notifyPlugins("beforeDraw",{cancelable:!0}))return;const e=this._layers;for(t=0;t<e.length&&e[t].z<=0;++t)e[t].draw(this.chartArea);for(this._drawDatasets();t<e.length;++t)e[t].draw(this.chartArea);this.notifyPlugins("afterDraw")}_getSortedDatasetMetas(t){const e=this._sortedMetasets,i=[];let s,n;for(s=0,n=e.length;s<n;++s){const n=e[s];t&&!n.visible||i.push(n)}return i}getSortedVisibleDatasetMetas(){return this._getSortedDatasetMetas(!0)}_drawDatasets(){if(!1===this.notifyPlugins("beforeDatasetsDraw",{cancelable:!0}))return;const t=this.getSortedVisibleDatasetMetas();for(let e=t.length-1;e>=0;--e)this._drawDataset(t[e]);this.notifyPlugins("afterDatasetsDraw")}_drawDataset(t){const e=this.ctx,i={meta:t,index:t.index,cancelable:!0},s=Ni(this,t);!1!==this.notifyPlugins("beforeDatasetDraw",i)&&(s&&Ie(e,s),t.controller.draw(),s&&ze(e),i.cancelable=!1,this.notifyPlugins("afterDatasetDraw",i))}isPointInArea(t){return Re(t,this.chartArea,this._minPadding)}getElementsAtEventForMode(t,e,i,s){const n=Ki.modes[e];return"function"==typeof n?n(this,t,i,s):[]}getDatasetMeta(t){const e=this.data.datasets[t],i=this._metasets;let s=i.filter((t=>t&&t._dataset===e)).pop();return s||(s={type:null,data:[],dataset:null,controller:null,hidden:null,xAxisID:null,yAxisID:null,order:e&&e.order||0,index:t,_dataset:e,_parsed:[],_sorted:!1},i.push(s)),s}getContext(){return this.$context||(this.$context=Ci(null,{chart:this,type:"chart"}))}getVisibleDatasetCount(){return this.getSortedVisibleDatasetMetas().length}isDatasetVisible(t){const e=this.data.datasets[t];if(!e)return!1;const i=this.getDatasetMeta(t);return"boolean"==typeof i.hidden?!i.hidden:!e.hidden}setDatasetVisibility(t,e){this.getDatasetMeta(t).hidden=!e}toggleDataVisibility(t){this._hiddenIndices[t]=!this._hiddenIndices[t]}getDataVisibility(t){return!this._hiddenIndices[t]}_updateVisibility(t,e,i){const s=i?"show":"hide",n=this.getDatasetMeta(t),o=n.controller._resolveAnimations(void 0,s);k(e)?(n.data[e].hidden=!i,this.update()):(this.setDatasetVisibility(t,i),o.update(n,{visible:i}),this.update((e=>e.datasetIndex===t?s:void 0)))}hide(t,e){this._updateVisibility(t,e,!1)}show(t,e){this._updateVisibility(t,e,!0)}_destroyDatasetMeta(t){const e=this._metasets[t];e&&e.controller&&e.controller._destroy(),delete this._metasets[t]}_stop(){let t,e;for(this.stop(),bt.remove(this),t=0,e=this.data.datasets.length;t<e;++t)this._destroyDatasetMeta(t)}destroy(){this.notifyPlugins("beforeDestroy");const{canvas:t,ctx:e}=this;this._stop(),this.config.clearCache(),t&&(this.unbindEvents(),Te(t,e),this.platform.releaseContext(e),this.canvas=null,this.ctx=null),delete Cn[this.id],this.notifyPlugins("afterDestroy")}toBase64Image(...t){return this.canvas.toDataURL(...t)}bindEvents(){this.bindUserEvents(),this.options.responsive?this.bindResponsiveEvents():this.attached=!0}bindUserEvents(){const t=this._listeners,e=this.platform,i=(i,s)=>{e.addEventListener(this,i,s),t[i]=s},s=(t,e,i)=>{t.offsetX=e,t.offsetY=i,this._eventHandler(t)};u(this.options.events,(t=>i(t,s)))}bindResponsiveEvents(){this._responsiveListeners||(this._responsiveListeners={});const t=this._responsiveListeners,e=this.platform,i=(i,s)=>{e.addEventListener(this,i,s),t[i]=s},s=(i,s)=>{t[i]&&(e.removeEventListener(this,i,s),delete t[i])},n=(t,e)=>{this.canvas&&this.resize(t,e)};let o;const a=()=>{s("attach",a),this.attached=!0,this.resize(),i("resize",n),i("detach",o)};o=()=>{this.attached=!1,s("resize",n),this._stop(),this._resize(0,0),i("attach",a)},e.isAttached(this.canvas)?a():o()}unbindEvents(){u(this._listeners,((t,e)=>{this.platform.removeEventListener(this,e,t)})),this._listeners={},u(this._responsiveListeners,((t,e)=>{this.platform.removeEventListener(this,e,t)})),this._responsiveListeners=void 0}updateHoverStyle(t,e,i){const s=i?"set":"remove";let n,o,a,r;for("dataset"===e&&(n=this.getDatasetMeta(t[0].datasetIndex),n.controller["_"+s+"DatasetHoverStyle"]()),a=0,r=t.length;a<r;++a){o=t[a];const e=o&&this.getDatasetMeta(o.datasetIndex).controller;e&&e[s+"HoverStyle"](o.element,o.datasetIndex,o.index)}}getActiveElements(){return this._active||[]}setActiveElements(t){const e=this._active||[],i=t.map((({datasetIndex:t,index:e})=>{const i=this.getDatasetMeta(t);if(!i)throw new Error("No dataset found at index "+t);return{datasetIndex:t,element:i.data[e],index:e}}));!f(i,e)&&(this._active=i,this._lastEvent=null,this._updateHoverStyles(i,e))}notifyPlugins(t,e,i){return this._plugins.notify(this,t,e,i)}isPluginEnabled(t){return 1===this._plugins._cache.filter((e=>e.plugin.id===t)).length}_updateHoverStyles(t,e,i){const s=this.options.hover,n=(t,e)=>t.filter((t=>!e.some((e=>t.datasetIndex===e.datasetIndex&&t.index===e.index)))),o=n(e,t),a=i?t:n(t,e);o.length&&this.updateHoverStyle(o,s.mode,!1),a.length&&s.mode&&this.updateHoverStyle(a,s.mode,!0)}_eventHandler(t,e){const i={event:t,replay:e,cancelable:!0,inChartArea:this.isPointInArea(t)},s=e=>(e.options.events||this.options.events).includes(t.native.type);if(!1===this.notifyPlugins("beforeEvent",i,s))return;const n=this._handleEvent(t,e,i.inChartArea);return i.cancelable=!1,this.notifyPlugins("afterEvent",i,s),(n||i.changed)&&this.render(),this}_handleEvent(t,e,i){const{_active:s=[],options:n}=this,o=e,a=this._getActiveElements(t,s,i,o),r=D(t),l=function(t,e,i,s){return i&&"mouseout"!==t.type?s?e:t:null}(t,this._lastEvent,i,r);i&&(this._lastEvent=null,d(n.onHover,[t,a,this],this),r&&d(n.onClick,[t,a,this],this));const h=!f(a,s);return(h||e)&&(this._active=a,this._updateHoverStyles(a,s,e)),this._lastEvent=l,h}_getActiveElements(t,e,i,s){if("mouseout"===t.type)return[];if(!i)return e;const n=this.options.hover;return this.getElementsAtEventForMode(t,n.mode,n,s)}}function Ln(){return u(Tn.instances,(t=>t._plugins.invalidate()))}function En(){throw new Error("This method is not implemented: Check that a complete date adapter is provided.")}class Rn{static override(t){Object.assign(Rn.prototype,t)}options;constructor(t){this.options=t||{}}init(){}formats(){return En()}parse(){return En()}format(){return En()}add(){return En()}diff(){return En()}startOf(){return En()}endOf(){return En()}}var In={_date:Rn};function zn(t){const e=t.iScale,i=function(t,e){if(!t._cache.$bar){const i=t.getMatchingVisibleMetas(e);let s=[];for(let e=0,n=i.length;e<n;e++)s=s.concat(i[e].controller.getAllParsedValues(t));t._cache.$bar=lt(s.sort(((t,e)=>t-e)))}return t._cache.$bar}(e,t.type);let s,n,o,a,r=e._length;const l=()=>{32767!==o&&-32768!==o&&(k(a)&&(r=Math.min(r,Math.abs(o-a)||r)),a=o)};for(s=0,n=i.length;s<n;++s)o=e.getPixelForValue(i[s]),l();for(a=void 0,s=0,n=e.ticks.length;s<n;++s)o=e.getPixelForTick(s),l();return r}function Fn(t,e,i,s){return n(t)?function(t,e,i,s){const n=i.parse(t[0],s),o=i.parse(t[1],s),a=Math.min(n,o),r=Math.max(n,o);let l=a,h=r;Math.abs(a)>Math.abs(r)&&(l=r,h=a),e[i.axis]=h,e._custom={barStart:l,barEnd:h,start:n,end:o,min:a,max:r}}(t,e,i,s):e[i.axis]=i.parse(t,s),e}function Vn(t,e,i,s){const n=t.iScale,o=t.vScale,a=n.getLabels(),r=n===o,l=[];let h,c,d,u;for(h=i,c=i+s;h<c;++h)u=e[h],d={},d[n.axis]=r||n.parse(a[h],h),l.push(Fn(u,d,o,h));return l}function Bn(t){return t&&void 0!==t.barStart&&void 0!==t.barEnd}function Wn(t,e,i,s){let n=e.borderSkipped;const o={};if(!n)return void(t.borderSkipped=o);if(!0===n)return void(t.borderSkipped={top:!0,right:!0,bottom:!0,left:!0});const{start:a,end:r,reverse:l,top:h,bottom:c}=function(t){let e,i,s,n,o;return t.horizontal?(e=t.base>t.x,i="left",s="right"):(e=t.base<t.y,i="bottom",s="top"),e?(n="end",o="start"):(n="start",o="end"),{start:i,end:s,reverse:e,top:n,bottom:o}}(t);"middle"===n&&i&&(t.enableBorderRadius=!0,(i._top||0)===s?n=h:(i._bottom||0)===s?n=c:(o[Nn(c,a,r,l)]=!0,n=h)),o[Nn(n,a,r,l)]=!0,t.borderSkipped=o}function Nn(t,e,i,s){var n,o,a;return s?(a=i,t=Hn(t=(n=t)===(o=e)?a:n===a?o:n,i,e)):t=Hn(t,e,i),t}function Hn(t,e,i){return"start"===t?e:"end"===t?i:t}function jn(t,{inflateAmount:e},i){t.inflateAmount="auto"===e?1===i?.33:0:e}class $n extends js{static id="doughnut";static defaults={datasetElementType:!1,dataElementType:"arc",animation:{animateRotate:!0,animateScale:!1},animations:{numbers:{type:"number",properties:["circumference","endAngle","innerRadius","outerRadius","startAngle","x","y","offset","borderWidth","spacing"]}},cutout:"50%",rotation:0,circumference:360,radius:"100%",spacing:0,indexAxis:"r"};static descriptors={_scriptable:t=>"spacing"!==t,_indexable:t=>"spacing"!==t&&!t.startsWith("borderDash")&&!t.startsWith("hoverBorderDash")};static overrides={aspectRatio:1,plugins:{legend:{labels:{generateLabels(t){const e=t.data,{labels:{pointStyle:i,textAlign:s,color:n,useBorderRadius:o,borderRadius:a}}=t.legend.options;return e.labels.length&&e.datasets.length?e.labels.map(((e,r)=>{const l=t.getDatasetMeta(0).controller.getStyle(r);return{text:e,fillStyle:l.backgroundColor,fontColor:n,hidden:!t.getDataVisibility(r),lineDash:l.borderDash,lineDashOffset:l.borderDashOffset,lineJoin:l.borderJoinStyle,lineWidth:l.borderWidth,strokeStyle:l.borderColor,textAlign:s,pointStyle:i,borderRadius:o&&(a||l.borderRadius),index:r}})):[]}},onClick(t,e,i){i.chart.toggleDataVisibility(e.index),i.chart.update()}}}};constructor(t,e){super(t,e),this.enableOptionSharing=!0,this.innerRadius=void 0,this.outerRadius=void 0,this.offsetX=void 0,this.offsetY=void 0}linkScales(){}parse(t,e){const i=this.getDataset().data,s=this._cachedMeta;if(!1===this._parsing)s._parsed=i;else{let n,a,r=t=>+i[t];if(o(i[t])){const{key:t="value"}=this._parsing;r=e=>+M(i[e],t)}for(n=t,a=t+e;n<a;++n)s._parsed[n]=r(n)}}_getRotation(){return $(this.options.rotation-90)}_getCircumference(){return $(this.options.circumference)}_getRotationExtents(){let t=O,e=-O;for(let i=0;i<this.chart.data.datasets.length;++i)if(this.chart.isDatasetVisible(i)&&this.chart.getDatasetMeta(i).type===this._type){const s=this.chart.getDatasetMeta(i).controller,n=s._getRotation(),o=s._getCircumference();t=Math.min(t,n),e=Math.max(e,n+o)}return{rotation:t,circumference:e-t}}update(t){const e=this.chart,{chartArea:i}=e,s=this._cachedMeta,n=s.data,o=this.getMaxBorderWidth()+this.getMaxOffset(n)+this.options.spacing,a=Math.max((Math.min(i.width,i.height)-o)/2,0),r=Math.min(h(this.options.cutout,a),1),l=this._getRingWeight(this.index),{circumference:d,rotation:u}=this._getRotationExtents(),{ratioX:f,ratioY:g,offsetX:p,offsetY:m}=function(t,e,i){let s=1,n=1,o=0,a=0;if(e<O){const r=t,l=r+e,h=Math.cos(r),c=Math.sin(r),d=Math.cos(l),u=Math.sin(l),f=(t,e,s)=>J(t,r,l,!0)?1:Math.max(e,e*i,s,s*i),g=(t,e,s)=>J(t,r,l,!0)?-1:Math.min(e,e*i,s,s*i),p=f(0,h,d),m=f(E,c,u),x=g(C,h,d),b=g(C+E,c,u);s=(p-x)/2,n=(m-b)/2,o=-(p+x)/2,a=-(m+b)/2}return{ratioX:s,ratioY:n,offsetX:o,offsetY:a}}(u,d,r),x=(i.width-o)/f,b=(i.height-o)/g,_=Math.max(Math.min(x,b)/2,0),y=c(this.options.radius,_),v=(y-Math.max(y*r,0))/this._getVisibleDatasetWeightTotal();this.offsetX=p*y,this.offsetY=m*y,s.total=this.calculateTotal(),this.outerRadius=y-v*this._getRingWeightOffset(this.index),this.innerRadius=Math.max(this.outerRadius-v*l,0),this.updateElements(n,0,n.length,t)}_circumference(t,e){const i=this.options,s=this._cachedMeta,n=this._getCircumference();return e&&i.animation.animateRotate||!this.chart.getDataVisibility(t)||null===s._parsed[t]||s.data[t].hidden?0:this.calculateCircumference(s._parsed[t]*n/O)}updateElements(t,e,i,s){const n="reset"===s,o=this.chart,a=o.chartArea,r=o.options.animation,l=(a.left+a.right)/2,h=(a.top+a.bottom)/2,c=n&&r.animateScale,d=c?0:this.innerRadius,u=c?0:this.outerRadius,{sharedOptions:f,includeOptions:g}=this._getSharedOptions(e,s);let p,m=this._getRotation();for(p=0;p<e;++p)m+=this._circumference(p,n);for(p=e;p<e+i;++p){const e=this._circumference(p,n),i=t[p],o={x:l+this.offsetX,y:h+this.offsetY,startAngle:m,endAngle:m+e,circumference:e,outerRadius:u,innerRadius:d};g&&(o.options=f||this.resolveDataElementOptions(p,i.active?"active":s)),m+=e,this.updateElement(i,p,o,s)}}calculateTotal(){const t=this._cachedMeta,e=t.data;let i,s=0;for(i=0;i<e.length;i++){const n=t._parsed[i];null===n||isNaN(n)||!this.chart.getDataVisibility(i)||e[i].hidden||(s+=Math.abs(n))}return s}calculateCircumference(t){const e=this._cachedMeta.total;return e>0&&!isNaN(t)?O*(Math.abs(t)/e):0}getLabelAndValue(t){const e=this._cachedMeta,i=this.chart,s=i.data.labels||[],n=ne(e._parsed[t],i.options.locale);return{label:s[t]||"",value:n}}getMaxBorderWidth(t){let e=0;const i=this.chart;let s,n,o,a,r;if(!t)for(s=0,n=i.data.datasets.length;s<n;++s)if(i.isDatasetVisible(s)){o=i.getDatasetMeta(s),t=o.data,a=o.controller;break}if(!t)return 0;for(s=0,n=t.length;s<n;++s)r=a.resolveDataElementOptions(s),"inner"!==r.borderAlign&&(e=Math.max(e,r.borderWidth||0,r.hoverBorderWidth||0));return e}getMaxOffset(t){let e=0;for(let i=0,s=t.length;i<s;++i){const t=this.resolveDataElementOptions(i);e=Math.max(e,t.offset||0,t.hoverOffset||0)}return e}_getRingWeightOffset(t){let e=0;for(let i=0;i<t;++i)this.chart.isDatasetVisible(i)&&(e+=this._getRingWeight(i));return e}_getRingWeight(t){return Math.max(l(this.chart.data.datasets[t].weight,1),0)}_getVisibleDatasetWeightTotal(){return this._getRingWeightOffset(this.chart.data.datasets.length)||1}}class Yn extends js{static id="polarArea";static defaults={dataElementType:"arc",animation:{animateRotate:!0,animateScale:!0},animations:{numbers:{type:"number",properties:["x","y","startAngle","endAngle","innerRadius","outerRadius"]}},indexAxis:"r",startAngle:0};static overrides={aspectRatio:1,plugins:{legend:{labels:{generateLabels(t){const e=t.data;if(e.labels.length&&e.datasets.length){const{labels:{pointStyle:i,color:s}}=t.legend.options;return e.labels.map(((e,n)=>{const o=t.getDatasetMeta(0).controller.getStyle(n);return{text:e,fillStyle:o.backgroundColor,strokeStyle:o.borderColor,fontColor:s,lineWidth:o.borderWidth,pointStyle:i,hidden:!t.getDataVisibility(n),index:n}}))}return[]}},onClick(t,e,i){i.chart.toggleDataVisibility(e.index),i.chart.update()}}},scales:{r:{type:"radialLinear",angleLines:{display:!1},beginAtZero:!0,grid:{circular:!0},pointLabels:{display:!1},startAngle:0}}};constructor(t,e){super(t,e),this.innerRadius=void 0,this.outerRadius=void 0}getLabelAndValue(t){const e=this._cachedMeta,i=this.chart,s=i.data.labels||[],n=ne(e._parsed[t].r,i.options.locale);return{label:s[t]||"",value:n}}parseObjectData(t,e,i,s){return ii.bind(this)(t,e,i,s)}update(t){const e=this._cachedMeta.data;this._updateRadius(),this.updateElements(e,0,e.length,t)}getMinMax(){const t=this._cachedMeta,e={min:Number.POSITIVE_INFINITY,max:Number.NEGATIVE_INFINITY};return t.data.forEach(((t,i)=>{const s=this.getParsed(i).r;!isNaN(s)&&this.chart.getDataVisibility(i)&&(s<e.min&&(e.min=s),s>e.max&&(e.max=s))})),e}_updateRadius(){const t=this.chart,e=t.chartArea,i=t.options,s=Math.min(e.right-e.left,e.bottom-e.top),n=Math.max(s/2,0),o=(n-Math.max(i.cutoutPercentage?n/100*i.cutoutPercentage:1,0))/t.getVisibleDatasetCount();this.outerRadius=n-o*this.index,this.innerRadius=this.outerRadius-o}updateElements(t,e,i,s){const n="reset"===s,o=this.chart,a=o.options.animation,r=this._cachedMeta.rScale,l=r.xCenter,h=r.yCenter,c=r.getIndexAngle(0)-.5*C;let d,u=c;const f=360/this.countVisibleElements();for(d=0;d<e;++d)u+=this._computeAngle(d,s,f);for(d=e;d<e+i;d++){const e=t[d];let i=u,g=u+this._computeAngle(d,s,f),p=o.getDataVisibility(d)?r.getDistanceFromCenterForValue(this.getParsed(d).r):0;u=g,n&&(a.animateScale&&(p=0),a.animateRotate&&(i=g=c));const m={x:l,y:h,innerRadius:0,outerRadius:p,startAngle:i,endAngle:g,options:this.resolveDataElementOptions(d,e.active?"active":s)};this.updateElement(e,d,m,s)}}countVisibleElements(){const t=this._cachedMeta;let e=0;return t.data.forEach(((t,i)=>{!isNaN(this.getParsed(i).r)&&this.chart.getDataVisibility(i)&&e++})),e}_computeAngle(t,e,i){return this.chart.getDataVisibility(t)?$(this.resolveDataElementOptions(t,e).angle||i):0}}var Un=Object.freeze({__proto__:null,BarController:class extends js{static id="bar";static defaults={datasetElementType:!1,dataElementType:"bar",categoryPercentage:.8,barPercentage:.9,grouped:!0,animations:{numbers:{type:"number",properties:["x","y","base","width","height"]}}};static overrides={scales:{_index_:{type:"category",offset:!0,grid:{offset:!0}},_value_:{type:"linear",beginAtZero:!0}}};parsePrimitiveData(t,e,i,s){return Vn(t,e,i,s)}parseArrayData(t,e,i,s){return Vn(t,e,i,s)}parseObjectData(t,e,i,s){const{iScale:n,vScale:o}=t,{xAxisKey:a="x",yAxisKey:r="y"}=this._parsing,l="x"===n.axis?a:r,h="x"===o.axis?a:r,c=[];let d,u,f,g;for(d=i,u=i+s;d<u;++d)g=e[d],f={},f[n.axis]=n.parse(M(g,l),d),c.push(Fn(M(g,h),f,o,d));return c}updateRangeFromParsed(t,e,i,s){super.updateRangeFromParsed(t,e,i,s);const n=i._custom;n&&e===this._cachedMeta.vScale&&(t.min=Math.min(t.min,n.min),t.max=Math.max(t.max,n.max))}getMaxOverflow(){return 0}getLabelAndValue(t){const e=this._cachedMeta,{iScale:i,vScale:s}=e,n=this.getParsed(t),o=n._custom,a=Bn(o)?"["+o.start+", "+o.end+"]":""+s.getLabelForValue(n[s.axis]);return{label:""+i.getLabelForValue(n[i.axis]),value:a}}initialize(){this.enableOptionSharing=!0,super.initialize();this._cachedMeta.stack=this.getDataset().stack}update(t){const e=this._cachedMeta;this.updateElements(e.data,0,e.data.length,t)}updateElements(t,e,i,n){const o="reset"===n,{index:a,_cachedMeta:{vScale:r}}=this,l=r.getBasePixel(),h=r.isHorizontal(),c=this._getRuler(),{sharedOptions:d,includeOptions:u}=this._getSharedOptions(e,n);for(let f=e;f<e+i;f++){const e=this.getParsed(f),i=o||s(e[r.axis])?{base:l,head:l}:this._calculateBarValuePixels(f),g=this._calculateBarIndexPixels(f,c),p=(e._stacks||{})[r.axis],m={horizontal:h,base:i.base,enableBorderRadius:!p||Bn(e._custom)||a===p._top||a===p._bottom,x:h?i.head:g.center,y:h?g.center:i.head,height:h?g.size:Math.abs(i.size),width:h?Math.abs(i.size):g.size};u&&(m.options=d||this.resolveDataElementOptions(f,t[f].active?"active":n));const x=m.options||t[f].options;Wn(m,x,p,a),jn(m,x,c.ratio),this.updateElement(t[f],f,m,n)}}_getStacks(t,e){const{iScale:i}=this._cachedMeta,n=i.getMatchingVisibleMetas(this._type).filter((t=>t.controller.options.grouped)),o=i.options.stacked,a=[],r=this._cachedMeta.controller.getParsed(e),l=r&&r[i.axis],h=t=>{const e=t._parsed.find((t=>t[i.axis]===l)),n=e&&e[t.vScale.axis];if(s(n)||isNaN(n))return!0};for(const i of n)if((void 0===e||!h(i))&&((!1===o||-1===a.indexOf(i.stack)||void 0===o&&void 0===i.stack)&&a.push(i.stack),i.index===t))break;return a.length||a.push(void 0),a}_getStackCount(t){return this._getStacks(void 0,t).length}_getAxisCount(){return this._getAxis().length}getFirstScaleIdForIndexAxis(){const t=this.chart.scales,e=this.chart.options.indexAxis;return Object.keys(t).filter((i=>t[i].axis===e)).shift()}_getAxis(){const t={},e=this.getFirstScaleIdForIndexAxis();for(const i of this.chart.data.datasets)t[l("x"===this.chart.options.indexAxis?i.xAxisID:i.yAxisID,e)]=!0;return Object.keys(t)}_getStackIndex(t,e,i){const s=this._getStacks(t,i),n=void 0!==e?s.indexOf(e):-1;return-1===n?s.length-1:n}_getRuler(){const t=this.options,e=this._cachedMeta,i=e.iScale,s=[];let n,o;for(n=0,o=e.data.length;n<o;++n)s.push(i.getPixelForValue(this.getParsed(n)[i.axis],n));const a=t.barThickness;return{min:a||zn(e),pixels:s,start:i._startPixel,end:i._endPixel,stackCount:this._getStackCount(),scale:i,grouped:t.grouped,ratio:a?1:t.categoryPercentage*t.barPercentage}}_calculateBarValuePixels(t){const{_cachedMeta:{vScale:e,_stacked:i,index:n},options:{base:o,minBarLength:a}}=this,r=o||0,l=this.getParsed(t),h=l._custom,c=Bn(h);let d,u,f=l[e.axis],g=0,p=i?this.applyStack(e,l,i):f;p!==f&&(g=p-f,p=f),c&&(f=h.barStart,p=h.barEnd-h.barStart,0!==f&&F(f)!==F(h.barEnd)&&(g=0),g+=f);const m=s(o)||c?g:o;let x=e.getPixelForValue(m);if(d=this.chart.getDataVisibility(t)?e.getPixelForValue(g+p):x,u=d-x,Math.abs(u)<a){u=function(t,e,i){return 0!==t?F(t):(e.isHorizontal()?1:-1)*(e.min>=i?1:-1)}(u,e,r)*a,f===r&&(x-=u/2);const t=e.getPixelForDecimal(0),s=e.getPixelForDecimal(1),o=Math.min(t,s),h=Math.max(t,s);x=Math.max(Math.min(x,h),o),d=x+u,i&&!c&&(l._stacks[e.axis]._visualValues[n]=e.getValueForPixel(d)-e.getValueForPixel(x))}if(x===e.getPixelForValue(r)){const t=F(u)*e.getLineWidthForValue(r)/2;x+=t,u-=t}return{size:u,base:x,head:d,center:d+u/2}}_calculateBarIndexPixels(t,e){const i=e.scale,n=this.options,o=n.skipNull,a=l(n.maxBarThickness,1/0);let r,h;const c=this._getAxisCount();if(e.grouped){const i=o?this._getStackCount(t):e.stackCount,d="flex"===n.barThickness?function(t,e,i,s){const n=e.pixels,o=n[t];let a=t>0?n[t-1]:null,r=t<n.length-1?n[t+1]:null;const l=i.categoryPercentage;null===a&&(a=o-(null===r?e.end-e.start:r-o)),null===r&&(r=o+o-a);const h=o-(o-Math.min(a,r))/2*l;return{chunk:Math.abs(r-a)/2*l/s,ratio:i.barPercentage,start:h}}(t,e,n,i*c):function(t,e,i,n){const o=i.barThickness;let a,r;return s(o)?(a=e.min*i.categoryPercentage,r=i.barPercentage):(a=o*n,r=1),{chunk:a/n,ratio:r,start:e.pixels[t]-a/2}}(t,e,n,i*c),u="x"===this.chart.options.indexAxis?this.getDataset().xAxisID:this.getDataset().yAxisID,f=this._getAxis().indexOf(l(u,this.getFirstScaleIdForIndexAxis())),g=this._getStackIndex(this.index,this._cachedMeta.stack,o?t:void 0)+f;r=d.start+d.chunk*g+d.chunk/2,h=Math.min(a,d.chunk*d.ratio)}else r=i.getPixelForValue(this.getParsed(t)[i.axis],t),h=Math.min(a,e.min*e.ratio);return{base:r-h/2,head:r+h/2,center:r,size:h}}draw(){const t=this._cachedMeta,e=t.vScale,i=t.data,s=i.length;let n=0;for(;n<s;++n)null===this.getParsed(n)[e.axis]||i[n].hidden||i[n].draw(this._ctx)}},BubbleController:class extends js{static id="bubble";static defaults={datasetElementType:!1,dataElementType:"point",animations:{numbers:{type:"number",properties:["x","y","borderWidth","radius"]}}};static overrides={scales:{x:{type:"linear"},y:{type:"linear"}}};initialize(){this.enableOptionSharing=!0,super.initialize()}parsePrimitiveData(t,e,i,s){const n=super.parsePrimitiveData(t,e,i,s);for(let t=0;t<n.length;t++)n[t]._custom=this.resolveDataElementOptions(t+i).radius;return n}parseArrayData(t,e,i,s){const n=super.parseArrayData(t,e,i,s);for(let t=0;t<n.length;t++){const s=e[i+t];n[t]._custom=l(s[2],this.resolveDataElementOptions(t+i).radius)}return n}parseObjectData(t,e,i,s){const n=super.parseObjectData(t,e,i,s);for(let t=0;t<n.length;t++){const s=e[i+t];n[t]._custom=l(s&&s.r&&+s.r,this.resolveDataElementOptions(t+i).radius)}return n}getMaxOverflow(){const t=this._cachedMeta.data;let e=0;for(let i=t.length-1;i>=0;--i)e=Math.max(e,t[i].size(this.resolveDataElementOptions(i))/2);return e>0&&e}getLabelAndValue(t){const e=this._cachedMeta,i=this.chart.data.labels||[],{xScale:s,yScale:n}=e,o=this.getParsed(t),a=s.getLabelForValue(o.x),r=n.getLabelForValue(o.y),l=o._custom;return{label:i[t]||"",value:"("+a+", "+r+(l?", "+l:"")+")"}}update(t){const e=this._cachedMeta.data;this.updateElements(e,0,e.length,t)}updateElements(t,e,i,s){const n="reset"===s,{iScale:o,vScale:a}=this._cachedMeta,{sharedOptions:r,includeOptions:l}=this._getSharedOptions(e,s),h=o.axis,c=a.axis;for(let d=e;d<e+i;d++){const e=t[d],i=!n&&this.getParsed(d),u={},f=u[h]=n?o.getPixelForDecimal(.5):o.getPixelForValue(i[h]),g=u[c]=n?a.getBasePixel():a.getPixelForValue(i[c]);u.skip=isNaN(f)||isNaN(g),l&&(u.options=r||this.resolveDataElementOptions(d,e.active?"active":s),n&&(u.options.radius=0)),this.updateElement(e,d,u,s)}}resolveDataElementOptions(t,e){const i=this.getParsed(t);let s=super.resolveDataElementOptions(t,e);s.$shared&&(s=Object.assign({},s,{$shared:!1}));const n=s.radius;return"active"!==e&&(s.radius=0),s.radius+=l(i&&i._custom,n),s}},DoughnutController:$n,LineController:class extends js{static id="line";static defaults={datasetElementType:"line",dataElementType:"point",showLine:!0,spanGaps:!1};static overrides={scales:{_index_:{type:"category"},_value_:{type:"linear"}}};initialize(){this.enableOptionSharing=!0,this.supportsDecimation=!0,super.initialize()}update(t){const e=this._cachedMeta,{dataset:i,data:s=[],_dataset:n}=e,o=this.chart._animationsDisabled;let{start:a,count:r}=pt(e,s,o);this._drawStart=a,this._drawCount=r,mt(e)&&(a=0,r=s.length),i._chart=this.chart,i._datasetIndex=this.index,i._decimated=!!n._decimated,i.points=s;const l=this.resolveDatasetElementOptions(t);this.options.showLine||(l.borderWidth=0),l.segment=this.options.segment,this.updateElement(i,void 0,{animated:!o,options:l},t),this.updateElements(s,a,r,t)}updateElements(t,e,i,n){const o="reset"===n,{iScale:a,vScale:r,_stacked:l,_dataset:h}=this._cachedMeta,{sharedOptions:c,includeOptions:d}=this._getSharedOptions(e,n),u=a.axis,f=r.axis,{spanGaps:g,segment:p}=this.options,m=N(g)?g:Number.POSITIVE_INFINITY,x=this.chart._animationsDisabled||o||"none"===n,b=e+i,_=t.length;let y=e>0&&this.getParsed(e-1);for(let i=0;i<_;++i){const g=t[i],_=x?g:{};if(i<e||i>=b){_.skip=!0;continue}const v=this.getParsed(i),M=s(v[f]),w=_[u]=a.getPixelForValue(v[u],i),k=_[f]=o||M?r.getBasePixel():r.getPixelForValue(l?this.applyStack(r,v,l):v[f],i);_.skip=isNaN(w)||isNaN(k)||M,_.stop=i>0&&Math.abs(v[u]-y[u])>m,p&&(_.parsed=v,_.raw=h.data[i]),d&&(_.options=c||this.resolveDataElementOptions(i,g.active?"active":n)),x||this.updateElement(g,i,_,n),y=v}}getMaxOverflow(){const t=this._cachedMeta,e=t.dataset,i=e.options&&e.options.borderWidth||0,s=t.data||[];if(!s.length)return i;const n=s[0].size(this.resolveDataElementOptions(0)),o=s[s.length-1].size(this.resolveDataElementOptions(s.length-1));return Math.max(i,n,o)/2}draw(){const t=this._cachedMeta;t.dataset.updateControlPoints(this.chart.chartArea,t.iScale.axis),super.draw()}},PieController:class extends $n{static id="pie";static defaults={cutout:0,rotation:0,circumference:360,radius:"100%"}},PolarAreaController:Yn,RadarController:class extends js{static id="radar";static defaults={datasetElementType:"line",dataElementType:"point",indexAxis:"r",showLine:!0,elements:{line:{fill:"start"}}};static overrides={aspectRatio:1,scales:{r:{type:"radialLinear"}}};getLabelAndValue(t){const e=this._cachedMeta.vScale,i=this.getParsed(t);return{label:e.getLabels()[t],value:""+e.getLabelForValue(i[e.axis])}}parseObjectData(t,e,i,s){return ii.bind(this)(t,e,i,s)}update(t){const e=this._cachedMeta,i=e.dataset,s=e.data||[],n=e.iScale.getLabels();if(i.points=s,"resize"!==t){const e=this.resolveDatasetElementOptions(t);this.options.showLine||(e.borderWidth=0);const o={_loop:!0,_fullLoop:n.length===s.length,options:e};this.updateElement(i,void 0,o,t)}this.updateElements(s,0,s.length,t)}updateElements(t,e,i,s){const n=this._cachedMeta.rScale,o="reset"===s;for(let a=e;a<e+i;a++){const e=t[a],i=this.resolveDataElementOptions(a,e.active?"active":s),r=n.getPointPositionForValue(a,this.getParsed(a).r),l=o?n.xCenter:r.x,h=o?n.yCenter:r.y,c={x:l,y:h,angle:r.angle,skip:isNaN(l)||isNaN(h),options:i};this.updateElement(e,a,c,s)}}},ScatterController:class extends js{static id="scatter";static defaults={datasetElementType:!1,dataElementType:"point",showLine:!1,fill:!1};static overrides={interaction:{mode:"point"},scales:{x:{type:"linear"},y:{type:"linear"}}};getLabelAndValue(t){const e=this._cachedMeta,i=this.chart.data.labels||[],{xScale:s,yScale:n}=e,o=this.getParsed(t),a=s.getLabelForValue(o.x),r=n.getLabelForValue(o.y);return{label:i[t]||"",value:"("+a+", "+r+")"}}update(t){const e=this._cachedMeta,{data:i=[]}=e,s=this.chart._animationsDisabled;let{start:n,count:o}=pt(e,i,s);if(this._drawStart=n,this._drawCount=o,mt(e)&&(n=0,o=i.length),this.options.showLine){this.datasetElementType||this.addElements();const{dataset:n,_dataset:o}=e;n._chart=this.chart,n._datasetIndex=this.index,n._decimated=!!o._decimated,n.points=i;const a=this.resolveDatasetElementOptions(t);a.segment=this.options.segment,this.updateElement(n,void 0,{animated:!s,options:a},t)}else this.datasetElementType&&(delete e.dataset,this.datasetElementType=!1);this.updateElements(i,n,o,t)}addElements(){const{showLine:t}=this.options;!this.datasetElementType&&t&&(this.datasetElementType=this.chart.registry.getElement("line")),super.addElements()}updateElements(t,e,i,n){const o="reset"===n,{iScale:a,vScale:r,_stacked:l,_dataset:h}=this._cachedMeta,c=this.resolveDataElementOptions(e,n),d=this.getSharedOptions(c),u=this.includeOptions(n,d),f=a.axis,g=r.axis,{spanGaps:p,segment:m}=this.options,x=N(p)?p:Number.POSITIVE_INFINITY,b=this.chart._animationsDisabled||o||"none"===n;let _=e>0&&this.getParsed(e-1);for(let c=e;c<e+i;++c){const e=t[c],i=this.getParsed(c),p=b?e:{},y=s(i[g]),v=p[f]=a.getPixelForValue(i[f],c),M=p[g]=o||y?r.getBasePixel():r.getPixelForValue(l?this.applyStack(r,i,l):i[g],c);p.skip=isNaN(v)||isNaN(M)||y,p.stop=c>0&&Math.abs(i[f]-_[f])>x,m&&(p.parsed=i,p.raw=h.data[c]),u&&(p.options=d||this.resolveDataElementOptions(c,e.active?"active":n)),b||this.updateElement(e,c,p,n),_=i}this.updateSharedOptions(d,n,c)}getMaxOverflow(){const t=this._cachedMeta,e=t.data||[];if(!this.options.showLine){let t=0;for(let i=e.length-1;i>=0;--i)t=Math.max(t,e[i].size(this.resolveDataElementOptions(i))/2);return t>0&&t}const i=t.dataset,s=i.options&&i.options.borderWidth||0;if(!e.length)return s;const n=e[0].size(this.resolveDataElementOptions(0)),o=e[e.length-1].size(this.resolveDataElementOptions(e.length-1));return Math.max(s,n,o)/2}}});function Xn(t,e,i,s){const n=vi(t.options.borderRadius,["outerStart","outerEnd","innerStart","innerEnd"]);const o=(i-e)/2,a=Math.min(o,s*e/2),r=t=>{const e=(i-Math.min(o,t))*s/2;return Z(t,0,Math.min(o,e))};return{outerStart:r(n.outerStart),outerEnd:r(n.outerEnd),innerStart:Z(n.innerStart,0,a),innerEnd:Z(n.innerEnd,0,a)}}function qn(t,e,i,s){return{x:i+t*Math.cos(e),y:s+t*Math.sin(e)}}function Kn(t,e,i,s,n,o){const{x:a,y:r,startAngle:l,pixelMargin:h,innerRadius:c}=e,d=Math.max(e.outerRadius+s+i-h,0),u=c>0?c+s+i+h:0;let f=0;const g=n-l;if(s){const t=((c>0?c-s:0)+(d>0?d-s:0))/2;f=(g-(0!==t?g*t/(t+s):g))/2}const p=(g-Math.max(.001,g*d-i/C)/d)/2,m=l+p+f,x=n-p-f,{outerStart:b,outerEnd:_,innerStart:y,innerEnd:v}=Xn(e,u,d,x-m),M=d-b,w=d-_,k=m+b/M,S=x-_/w,P=u+y,D=u+v,O=m+y/P,A=x-v/D;if(t.beginPath(),o){const e=(k+S)/2;if(t.arc(a,r,d,k,e),t.arc(a,r,d,e,S),_>0){const e=qn(w,S,a,r);t.arc(e.x,e.y,_,S,x+E)}const i=qn(D,x,a,r);if(t.lineTo(i.x,i.y),v>0){const e=qn(D,A,a,r);t.arc(e.x,e.y,v,x+E,A+Math.PI)}const s=(x-v/u+(m+y/u))/2;if(t.arc(a,r,u,x-v/u,s,!0),t.arc(a,r,u,s,m+y/u,!0),y>0){const e=qn(P,O,a,r);t.arc(e.x,e.y,y,O+Math.PI,m-E)}const n=qn(M,m,a,r);if(t.lineTo(n.x,n.y),b>0){const e=qn(M,k,a,r);t.arc(e.x,e.y,b,m-E,k)}}else{t.moveTo(a,r);const e=Math.cos(k)*d+a,i=Math.sin(k)*d+r;t.lineTo(e,i);const s=Math.cos(S)*d+a,n=Math.sin(S)*d+r;t.lineTo(s,n)}t.closePath()}function Gn(t,e,i,s,n){const{fullCircles:o,startAngle:a,circumference:r,options:l}=e,{borderWidth:h,borderJoinStyle:c,borderDash:d,borderDashOffset:u,borderRadius:f}=l,g="inner"===l.borderAlign;if(!h)return;t.setLineDash(d||[]),t.lineDashOffset=u,g?(t.lineWidth=2*h,t.lineJoin=c||"round"):(t.lineWidth=h,t.lineJoin=c||"bevel");let p=e.endAngle;if(o){Kn(t,e,i,s,p,n);for(let e=0;e<o;++e)t.stroke();isNaN(r)||(p=a+(r%O||O))}g&&function(t,e,i){const{startAngle:s,pixelMargin:n,x:o,y:a,outerRadius:r,innerRadius:l}=e;let h=n/r;t.beginPath(),t.arc(o,a,r,s-h,i+h),l>n?(h=n/l,t.arc(o,a,l,i+h,s-h,!0)):t.arc(o,a,n,i+E,s-E),t.closePath(),t.clip()}(t,e,p),l.selfJoin&&p-a>=C&&0===f&&"miter"!==c&&function(t,e,i){const{startAngle:s,x:n,y:o,outerRadius:a,innerRadius:r,options:l}=e,{borderWidth:h,borderJoinStyle:c}=l,d=Math.min(h/a,G(s-i));if(t.beginPath(),t.arc(n,o,a-h/2,s+d/2,i-d/2),r>0){const e=Math.min(h/r,G(s-i));t.arc(n,o,r+h/2,i-e/2,s+e/2,!0)}else{const e=Math.min(h/2,a*G(s-i));if("round"===c)t.arc(n,o,e,i-C/2,s+C/2,!0);else if("bevel"===c){const a=2*e*e,r=-a*Math.cos(i+C/2)+n,l=-a*Math.sin(i+C/2)+o,h=a*Math.cos(s+C/2)+n,c=a*Math.sin(s+C/2)+o;t.lineTo(r,l),t.lineTo(h,c)}}t.closePath(),t.moveTo(0,0),t.rect(0,0,t.canvas.width,t.canvas.height),t.clip("evenodd")}(t,e,p),o||(Kn(t,e,i,s,p,n),t.stroke())}function Jn(t,e,i=e){t.lineCap=l(i.borderCapStyle,e.borderCapStyle),t.setLineDash(l(i.borderDash,e.borderDash)),t.lineDashOffset=l(i.borderDashOffset,e.borderDashOffset),t.lineJoin=l(i.borderJoinStyle,e.borderJoinStyle),t.lineWidth=l(i.borderWidth,e.borderWidth),t.strokeStyle=l(i.borderColor,e.borderColor)}function Zn(t,e,i){t.lineTo(i.x,i.y)}function Qn(t,e,i={}){const s=t.length,{start:n=0,end:o=s-1}=i,{start:a,end:r}=e,l=Math.max(n,a),h=Math.min(o,r),c=n<a&&o<a||n>r&&o>r;return{count:s,start:l,loop:e.loop,ilen:h<l&&!c?s+h-l:h-l}}function to(t,e,i,s){const{points:n,options:o}=e,{count:a,start:r,loop:l,ilen:h}=Qn(n,i,s),c=function(t){return t.stepped?Fe:t.tension||"monotone"===t.cubicInterpolationMode?Ve:Zn}(o);let d,u,f,{move:g=!0,reverse:p}=s||{};for(d=0;d<=h;++d)u=n[(r+(p?h-d:d))%a],u.skip||(g?(t.moveTo(u.x,u.y),g=!1):c(t,f,u,p,o.stepped),f=u);return l&&(u=n[(r+(p?h:0))%a],c(t,f,u,p,o.stepped)),!!l}function eo(t,e,i,s){const n=e.points,{count:o,start:a,ilen:r}=Qn(n,i,s),{move:l=!0,reverse:h}=s||{};let c,d,u,f,g,p,m=0,x=0;const b=t=>(a+(h?r-t:t))%o,_=()=>{f!==g&&(t.lineTo(m,g),t.lineTo(m,f),t.lineTo(m,p))};for(l&&(d=n[b(0)],t.moveTo(d.x,d.y)),c=0;c<=r;++c){if(d=n[b(c)],d.skip)continue;const e=d.x,i=d.y,s=0|e;s===u?(i<f?f=i:i>g&&(g=i),m=(x*m+e)/++x):(_(),t.lineTo(e,i),u=s,x=0,f=g=i),p=i}_()}function io(t){const e=t.options,i=e.borderDash&&e.borderDash.length;return!(t._decimated||t._loop||e.tension||"monotone"===e.cubicInterpolationMode||e.stepped||i)?eo:to}const so="function"==typeof Path2D;function no(t,e,i,s){so&&!e.options.segment?function(t,e,i,s){let n=e._path;n||(n=e._path=new Path2D,e.path(n,i,s)&&n.closePath()),Jn(t,e.options),t.stroke(n)}(t,e,i,s):function(t,e,i,s){const{segments:n,options:o}=e,a=io(e);for(const r of n)Jn(t,o,r.style),t.beginPath(),a(t,e,r,{start:i,end:i+s-1})&&t.closePath(),t.stroke()}(t,e,i,s)}class oo extends $s{static id="line";static defaults={borderCapStyle:"butt",borderDash:[],borderDashOffset:0,borderJoinStyle:"miter",borderWidth:3,capBezierPoints:!0,cubicInterpolationMode:"default",fill:!1,spanGaps:!1,stepped:!1,tension:0};static defaultRoutes={backgroundColor:"backgroundColor",borderColor:"borderColor"};static descriptors={_scriptable:!0,_indexable:t=>"borderDash"!==t&&"fill"!==t};constructor(t){super(),this.animated=!0,this.options=void 0,this._chart=void 0,this._loop=void 0,this._fullLoop=void 0,this._path=void 0,this._points=void 0,this._segments=void 0,this._decimated=!1,this._pointsUpdated=!1,this._datasetIndex=void 0,t&&Object.assign(this,t)}updateControlPoints(t,e){const i=this.options;if((i.tension||"monotone"===i.cubicInterpolationMode)&&!i.stepped&&!this._pointsUpdated){const s=i.spanGaps?this._loop:this._fullLoop;hi(this._points,i,t,s,e),this._pointsUpdated=!0}}set points(t){this._points=t,delete this._segments,delete this._path,this._pointsUpdated=!1}get points(){return this._points}get segments(){return this._segments||(this._segments=zi(this,this.options.segment))}first(){const t=this.segments,e=this.points;return t.length&&e[t[0].start]}last(){const t=this.segments,e=this.points,i=t.length;return i&&e[t[i-1].end]}interpolate(t,e){const i=this.options,s=t[e],n=this.points,o=Ii(this,{property:e,start:s,end:s});if(!o.length)return;const a=[],r=function(t){return t.stepped?pi:t.tension||"monotone"===t.cubicInterpolationMode?mi:gi}(i);let l,h;for(l=0,h=o.length;l<h;++l){const{start:h,end:c}=o[l],d=n[h],u=n[c];if(d===u){a.push(d);continue}const f=r(d,u,Math.abs((s-d[e])/(u[e]-d[e])),i.stepped);f[e]=t[e],a.push(f)}return 1===a.length?a[0]:a}pathSegment(t,e,i){return io(this)(t,this,e,i)}path(t,e,i){const s=this.segments,n=io(this);let o=this._loop;e=e||0,i=i||this.points.length-e;for(const a of s)o&=n(t,this,a,{start:e,end:e+i-1});return!!o}draw(t,e,i,s){const n=this.options||{};(this.points||[]).length&&n.borderWidth&&(t.save(),no(t,this,i,s),t.restore()),this.animated&&(this._pointsUpdated=!1,this._path=void 0)}}function ao(t,e,i,s){const n=t.options,{[i]:o}=t.getProps([i],s);return Math.abs(e-o)<n.radius+n.hitRadius}function ro(t,e){const{x:i,y:s,base:n,width:o,height:a}=t.getProps(["x","y","base","width","height"],e);let r,l,h,c,d;return t.horizontal?(d=a/2,r=Math.min(i,n),l=Math.max(i,n),h=s-d,c=s+d):(d=o/2,r=i-d,l=i+d,h=Math.min(s,n),c=Math.max(s,n)),{left:r,top:h,right:l,bottom:c}}function lo(t,e,i,s){return t?0:Z(e,i,s)}function ho(t){const e=ro(t),i=e.right-e.left,s=e.bottom-e.top,n=function(t,e,i){const s=t.options.borderWidth,n=t.borderSkipped,o=Mi(s);return{t:lo(n.top,o.top,0,i),r:lo(n.right,o.right,0,e),b:lo(n.bottom,o.bottom,0,i),l:lo(n.left,o.left,0,e)}}(t,i/2,s/2),a=function(t,e,i){const{enableBorderRadius:s}=t.getProps(["enableBorderRadius"]),n=t.options.borderRadius,a=wi(n),r=Math.min(e,i),l=t.borderSkipped,h=s||o(n);return{topLeft:lo(!h||l.top||l.left,a.topLeft,0,r),topRight:lo(!h||l.top||l.right,a.topRight,0,r),bottomLeft:lo(!h||l.bottom||l.left,a.bottomLeft,0,r),bottomRight:lo(!h||l.bottom||l.right,a.bottomRight,0,r)}}(t,i/2,s/2);return{outer:{x:e.left,y:e.top,w:i,h:s,radius:a},inner:{x:e.left+n.l,y:e.top+n.t,w:i-n.l-n.r,h:s-n.t-n.b,radius:{topLeft:Math.max(0,a.topLeft-Math.max(n.t,n.l)),topRight:Math.max(0,a.topRight-Math.max(n.t,n.r)),bottomLeft:Math.max(0,a.bottomLeft-Math.max(n.b,n.l)),bottomRight:Math.max(0,a.bottomRight-Math.max(n.b,n.r))}}}}function co(t,e,i,s){const n=null===e,o=null===i,a=t&&!(n&&o)&&ro(t,s);return a&&(n||tt(e,a.left,a.right))&&(o||tt(i,a.top,a.bottom))}function uo(t,e){t.rect(e.x,e.y,e.w,e.h)}function fo(t,e,i={}){const s=t.x!==i.x?-e:0,n=t.y!==i.y?-e:0,o=(t.x+t.w!==i.x+i.w?e:0)-s,a=(t.y+t.h!==i.y+i.h?e:0)-n;return{x:t.x+s,y:t.y+n,w:t.w+o,h:t.h+a,radius:t.radius}}var go=Object.freeze({__proto__:null,ArcElement:class extends $s{static id="arc";static defaults={borderAlign:"center",borderColor:"#fff",borderDash:[],borderDashOffset:0,borderJoinStyle:void 0,borderRadius:0,borderWidth:2,offset:0,spacing:0,angle:void 0,circular:!0,selfJoin:!1};static defaultRoutes={backgroundColor:"backgroundColor"};static descriptors={_scriptable:!0,_indexable:t=>"borderDash"!==t};circumference;endAngle;fullCircles;innerRadius;outerRadius;pixelMargin;startAngle;constructor(t){super(),this.options=void 0,this.circumference=void 0,this.startAngle=void 0,this.endAngle=void 0,this.innerRadius=void 0,this.outerRadius=void 0,this.pixelMargin=0,this.fullCircles=0,t&&Object.assign(this,t)}inRange(t,e,i){const s=this.getProps(["x","y"],i),{angle:n,distance:o}=X(s,{x:t,y:e}),{startAngle:a,endAngle:r,innerRadius:h,outerRadius:c,circumference:d}=this.getProps(["startAngle","endAngle","innerRadius","outerRadius","circumference"],i),u=(this.options.spacing+this.options.borderWidth)/2,f=l(d,r-a),g=J(n,a,r)&&a!==r,p=f>=O||g,m=tt(o,h+u,c+u);return p&&m}getCenterPoint(t){const{x:e,y:i,startAngle:s,endAngle:n,innerRadius:o,outerRadius:a}=this.getProps(["x","y","startAngle","endAngle","innerRadius","outerRadius"],t),{offset:r,spacing:l}=this.options,h=(s+n)/2,c=(o+a+l+r)/2;return{x:e+Math.cos(h)*c,y:i+Math.sin(h)*c}}tooltipPosition(t){return this.getCenterPoint(t)}draw(t){const{options:e,circumference:i}=this,s=(e.offset||0)/4,n=(e.spacing||0)/2,o=e.circular;if(this.pixelMargin="inner"===e.borderAlign?.33:0,this.fullCircles=i>O?Math.floor(i/O):0,0===i||this.innerRadius<0||this.outerRadius<0)return;t.save();const a=(this.startAngle+this.endAngle)/2;t.translate(Math.cos(a)*s,Math.sin(a)*s);const r=s*(1-Math.sin(Math.min(C,i||0)));t.fillStyle=e.backgroundColor,t.strokeStyle=e.borderColor,function(t,e,i,s,n){const{fullCircles:o,startAngle:a,circumference:r}=e;let l=e.endAngle;if(o){Kn(t,e,i,s,l,n);for(let e=0;e<o;++e)t.fill();isNaN(r)||(l=a+(r%O||O))}Kn(t,e,i,s,l,n),t.fill()}(t,this,r,n,o),Gn(t,this,r,n,o),t.restore()}},BarElement:class extends $s{static id="bar";static defaults={borderSkipped:"start",borderWidth:0,borderRadius:0,inflateAmount:"auto",pointStyle:void 0};static defaultRoutes={backgroundColor:"backgroundColor",borderColor:"borderColor"};constructor(t){super(),this.options=void 0,this.horizontal=void 0,this.base=void 0,this.width=void 0,this.height=void 0,this.inflateAmount=void 0,t&&Object.assign(this,t)}draw(t){const{inflateAmount:e,options:{borderColor:i,backgroundColor:s}}=this,{inner:n,outer:o}=ho(this),a=(r=o.radius).topLeft||r.topRight||r.bottomLeft||r.bottomRight?He:uo;var r;t.save(),o.w===n.w&&o.h===n.h||(t.beginPath(),a(t,fo(o,e,n)),t.clip(),a(t,fo(n,-e,o)),t.fillStyle=i,t.fill("evenodd")),t.beginPath(),a(t,fo(n,e)),t.fillStyle=s,t.fill(),t.restore()}inRange(t,e,i){return co(this,t,e,i)}inXRange(t,e){return co(this,t,null,e)}inYRange(t,e){return co(this,null,t,e)}getCenterPoint(t){const{x:e,y:i,base:s,horizontal:n}=this.getProps(["x","y","base","horizontal"],t);return{x:n?(e+s)/2:e,y:n?i:(i+s)/2}}getRange(t){return"x"===t?this.width/2:this.height/2}},LineElement:oo,PointElement:class extends $s{static id="point";parsed;skip;stop;static defaults={borderWidth:1,hitRadius:1,hoverBorderWidth:1,hoverRadius:4,pointStyle:"circle",radius:3,rotation:0};static defaultRoutes={backgroundColor:"backgroundColor",borderColor:"borderColor"};constructor(t){super(),this.options=void 0,this.parsed=void 0,this.skip=void 0,this.stop=void 0,t&&Object.assign(this,t)}inRange(t,e,i){const s=this.options,{x:n,y:o}=this.getProps(["x","y"],i);return Math.pow(t-n,2)+Math.pow(e-o,2)<Math.pow(s.hitRadius+s.radius,2)}inXRange(t,e){return ao(this,t,"x",e)}inYRange(t,e){return ao(this,t,"y",e)}getCenterPoint(t){const{x:e,y:i}=this.getProps(["x","y"],t);return{x:e,y:i}}size(t){let e=(t=t||this.options||{}).radius||0;e=Math.max(e,e&&t.hoverRadius||0);return 2*(e+(e&&t.borderWidth||0))}draw(t,e){const i=this.options;this.skip||i.radius<.1||!Re(this,e,this.size(i)/2)||(t.strokeStyle=i.borderColor,t.lineWidth=i.borderWidth,t.fillStyle=i.backgroundColor,Le(t,i,this.x,this.y))}getRange(){const t=this.options||{};return t.radius+t.hitRadius}}});function po(t,e,i,s){const n=t.indexOf(e);if(-1===n)return((t,e,i,s)=>("string"==typeof e?(i=t.push(e)-1,s.unshift({index:i,label:e})):isNaN(e)&&(i=null),i))(t,e,i,s);return n!==t.lastIndexOf(e)?i:n}function mo(t){const e=this.getLabels();return t>=0&&t<e.length?e[t]:t}function xo(t,e,{horizontal:i,minRotation:s}){const n=$(s),o=(i?Math.sin(n):Math.cos(n))||.001,a=.75*e*(""+t).length;return Math.min(e/o,a)}class bo extends tn{constructor(t){super(t),this.start=void 0,this.end=void 0,this._startValue=void 0,this._endValue=void 0,this._valueRange=0}parse(t,e){return s(t)||("number"==typeof t||t instanceof Number)&&!isFinite(+t)?null:+t}handleTickRangeOptions(){const{beginAtZero:t}=this.options,{minDefined:e,maxDefined:i}=this.getUserBounds();let{min:s,max:n}=this;const o=t=>s=e?s:t,a=t=>n=i?n:t;if(t){const t=F(s),e=F(n);t<0&&e<0?a(0):t>0&&e>0&&o(0)}if(s===n){let e=0===n?1:Math.abs(.05*n);a(n+e),t||o(s-e)}this.min=s,this.max=n}getTickLimit(){const t=this.options.ticks;let e,{maxTicksLimit:i,stepSize:s}=t;return s?(e=Math.ceil(this.max/s)-Math.floor(this.min/s)+1,e>1e3&&(console.warn(`scales.${this.id}.ticks.stepSize: ${s} would result generating up to ${e} ticks. Limiting to 1000.`),e=1e3)):(e=this.computeTickLimit(),i=i||11),i&&(e=Math.min(i,e)),e}computeTickLimit(){return Number.POSITIVE_INFINITY}buildTicks(){const t=this.options,e=t.ticks;let i=this.getTickLimit();i=Math.max(2,i);const n=function(t,e){const i=[],{bounds:n,step:o,min:a,max:r,precision:l,count:h,maxTicks:c,maxDigits:d,includeBounds:u}=t,f=o||1,g=c-1,{min:p,max:m}=e,x=!s(a),b=!s(r),_=!s(h),y=(m-p)/(d+1);let v,M,w,k,S=B((m-p)/g/f)*f;if(S<1e-14&&!x&&!b)return[{value:p},{value:m}];k=Math.ceil(m/S)-Math.floor(p/S),k>g&&(S=B(k*S/g/f)*f),s(l)||(v=Math.pow(10,l),S=Math.ceil(S*v)/v),"ticks"===n?(M=Math.floor(p/S)*S,w=Math.ceil(m/S)*S):(M=p,w=m),x&&b&&o&&H((r-a)/o,S/1e3)?(k=Math.round(Math.min((r-a)/S,c)),S=(r-a)/k,M=a,w=r):_?(M=x?a:M,w=b?r:w,k=h-1,S=(w-M)/k):(k=(w-M)/S,k=V(k,Math.round(k),S/1e3)?Math.round(k):Math.ceil(k));const P=Math.max(U(S),U(M));v=Math.pow(10,s(l)?P:l),M=Math.round(M*v)/v,w=Math.round(w*v)/v;let D=0;for(x&&(u&&M!==a?(i.push({value:a}),M<a&&D++,V(Math.round((M+D*S)*v)/v,a,xo(a,y,t))&&D++):M<a&&D++);D<k;++D){const t=Math.round((M+D*S)*v)/v;if(b&&t>r)break;i.push({value:t})}return b&&u&&w!==r?i.length&&V(i[i.length-1].value,r,xo(r,y,t))?i[i.length-1].value=r:i.push({value:r}):b&&w!==r||i.push({value:w}),i}({maxTicks:i,bounds:t.bounds,min:t.min,max:t.max,precision:e.precision,step:e.stepSize,count:e.count,maxDigits:this._maxDigits(),horizontal:this.isHorizontal(),minRotation:e.minRotation||0,includeBounds:!1!==e.includeBounds},this._range||this);return"ticks"===t.bounds&&j(n,this,"value"),t.reverse?(n.reverse(),this.start=this.max,this.end=this.min):(this.start=this.min,this.end=this.max),n}configure(){const t=this.ticks;let e=this.min,i=this.max;if(super.configure(),this.options.offset&&t.length){const s=(i-e)/Math.max(t.length-1,1)/2;e-=s,i+=s}this._startValue=e,this._endValue=i,this._valueRange=i-e}getLabelForValue(t){return ne(t,this.chart.options.locale,this.options.ticks.format)}}class _o extends bo{static id="linear";static defaults={ticks:{callback:ae.formatters.numeric}};determineDataLimits(){const{min:t,max:e}=this.getMinMax(!0);this.min=a(t)?t:0,this.max=a(e)?e:1,this.handleTickRangeOptions()}computeTickLimit(){const t=this.isHorizontal(),e=t?this.width:this.height,i=$(this.options.ticks.minRotation),s=(t?Math.sin(i):Math.cos(i))||.001,n=this._resolveTickFontOptions(0);return Math.ceil(e/Math.min(40,n.lineHeight/s))}getPixelForValue(t){return null===t?NaN:this.getPixelForDecimal((t-this._startValue)/this._valueRange)}getValueForPixel(t){return this._startValue+this.getDecimalForPixel(t)*this._valueRange}}const yo=t=>Math.floor(z(t)),vo=(t,e)=>Math.pow(10,yo(t)+e);function Mo(t){return 1===t/Math.pow(10,yo(t))}function wo(t,e,i){const s=Math.pow(10,i),n=Math.floor(t/s);return Math.ceil(e/s)-n}function ko(t,{min:e,max:i}){e=r(t.min,e);const s=[],n=yo(e);let o=function(t,e){let i=yo(e-t);for(;wo(t,e,i)>10;)i++;for(;wo(t,e,i)<10;)i--;return Math.min(i,yo(t))}(e,i),a=o<0?Math.pow(10,Math.abs(o)):1;const l=Math.pow(10,o),h=n>o?Math.pow(10,n):0,c=Math.round((e-h)*a)/a,d=Math.floor((e-h)/l/10)*l*10;let u=Math.floor((c-d)/Math.pow(10,o)),f=r(t.min,Math.round((h+d+u*Math.pow(10,o))*a)/a);for(;f<i;)s.push({value:f,major:Mo(f),significand:u}),u>=10?u=u<15?15:20:u++,u>=20&&(o++,u=2,a=o>=0?1:a),f=Math.round((h+d+u*Math.pow(10,o))*a)/a;const g=r(t.max,f);return s.push({value:g,major:Mo(g),significand:u}),s}class So extends tn{static id="logarithmic";static defaults={ticks:{callback:ae.formatters.logarithmic,major:{enabled:!0}}};constructor(t){super(t),this.start=void 0,this.end=void 0,this._startValue=void 0,this._valueRange=0}parse(t,e){const i=bo.prototype.parse.apply(this,[t,e]);if(0!==i)return a(i)&&i>0?i:null;this._zero=!0}determineDataLimits(){const{min:t,max:e}=this.getMinMax(!0);this.min=a(t)?Math.max(0,t):null,this.max=a(e)?Math.max(0,e):null,this.options.beginAtZero&&(this._zero=!0),this._zero&&this.min!==this._suggestedMin&&!a(this._userMin)&&(this.min=t===vo(this.min,0)?vo(this.min,-1):vo(this.min,0)),this.handleTickRangeOptions()}handleTickRangeOptions(){const{minDefined:t,maxDefined:e}=this.getUserBounds();let i=this.min,s=this.max;const n=e=>i=t?i:e,o=t=>s=e?s:t;i===s&&(i<=0?(n(1),o(10)):(n(vo(i,-1)),o(vo(s,1)))),i<=0&&n(vo(s,-1)),s<=0&&o(vo(i,1)),this.min=i,this.max=s}buildTicks(){const t=this.options,e=ko({min:this._userMin,max:this._userMax},this);return"ticks"===t.bounds&&j(e,this,"value"),t.reverse?(e.reverse(),this.start=this.max,this.end=this.min):(this.start=this.min,this.end=this.max),e}getLabelForValue(t){return void 0===t?"0":ne(t,this.chart.options.locale,this.options.ticks.format)}configure(){const t=this.min;super.configure(),this._startValue=z(t),this._valueRange=z(this.max)-z(t)}getPixelForValue(t){return void 0!==t&&0!==t||(t=this.min),null===t||isNaN(t)?NaN:this.getPixelForDecimal(t===this.min?0:(z(t)-this._startValue)/this._valueRange)}getValueForPixel(t){const e=this.getDecimalForPixel(t);return Math.pow(10,this._startValue+e*this._valueRange)}}function Po(t){const e=t.ticks;if(e.display&&t.display){const t=ki(e.backdropPadding);return l(e.font&&e.font.size,ue.font.size)+t.height}return 0}function Do(t,e,i,s,n){return t===s||t===n?{start:e-i/2,end:e+i/2}:t<s||t>n?{start:e-i,end:e}:{start:e,end:e+i}}function Co(t){const e={l:t.left+t._padding.left,r:t.right-t._padding.right,t:t.top+t._padding.top,b:t.bottom-t._padding.bottom},i=Object.assign({},e),s=[],o=[],a=t._pointLabels.length,r=t.options.pointLabels,l=r.centerPointLabels?C/a:0;for(let u=0;u<a;u++){const a=r.setContext(t.getPointLabelContext(u));o[u]=a.padding;const f=t.getPointPosition(u,t.drawingArea+o[u],l),g=Si(a.font),p=(h=t.ctx,c=g,d=n(d=t._pointLabels[u])?d:[d],{w:Oe(h,c.string,d),h:d.length*c.lineHeight});s[u]=p;const m=G(t.getIndexAngle(u)+l),x=Math.round(Y(m));Oo(i,e,m,Do(x,f.x,p.w,0,180),Do(x,f.y,p.h,90,270))}var h,c,d;t.setCenterPoint(e.l-i.l,i.r-e.r,e.t-i.t,i.b-e.b),t._pointLabelItems=function(t,e,i){const s=[],n=t._pointLabels.length,o=t.options,{centerPointLabels:a,display:r}=o.pointLabels,l={extra:Po(o)/2,additionalAngle:a?C/n:0};let h;for(let o=0;o<n;o++){l.padding=i[o],l.size=e[o];const n=Ao(t,o,l);s.push(n),"auto"===r&&(n.visible=To(n,h),n.visible&&(h=n))}return s}(t,s,o)}function Oo(t,e,i,s,n){const o=Math.abs(Math.sin(i)),a=Math.abs(Math.cos(i));let r=0,l=0;s.start<e.l?(r=(e.l-s.start)/o,t.l=Math.min(t.l,e.l-r)):s.end>e.r&&(r=(s.end-e.r)/o,t.r=Math.max(t.r,e.r+r)),n.start<e.t?(l=(e.t-n.start)/a,t.t=Math.min(t.t,e.t-l)):n.end>e.b&&(l=(n.end-e.b)/a,t.b=Math.max(t.b,e.b+l))}function Ao(t,e,i){const s=t.drawingArea,{extra:n,additionalAngle:o,padding:a,size:r}=i,l=t.getPointPosition(e,s+n+a,o),h=Math.round(Y(G(l.angle+E))),c=function(t,e,i){90===i||270===i?t-=e/2:(i>270||i<90)&&(t-=e);return t}(l.y,r.h,h),d=function(t){if(0===t||180===t)return"center";if(t<180)return"left";return"right"}(h),u=function(t,e,i){"right"===i?t-=e:"center"===i&&(t-=e/2);return t}(l.x,r.w,d);return{visible:!0,x:l.x,y:c,textAlign:d,left:u,top:c,right:u+r.w,bottom:c+r.h}}function To(t,e){if(!e)return!0;const{left:i,top:s,right:n,bottom:o}=t;return!(Re({x:i,y:s},e)||Re({x:i,y:o},e)||Re({x:n,y:s},e)||Re({x:n,y:o},e))}function Lo(t,e,i){const{left:n,top:o,right:a,bottom:r}=i,{backdropColor:l}=e;if(!s(l)){const i=wi(e.borderRadius),s=ki(e.backdropPadding);t.fillStyle=l;const h=n-s.left,c=o-s.top,d=a-n+s.width,u=r-o+s.height;Object.values(i).some((t=>0!==t))?(t.beginPath(),He(t,{x:h,y:c,w:d,h:u,radius:i}),t.fill()):t.fillRect(h,c,d,u)}}function Eo(t,e,i,s){const{ctx:n}=t;if(i)n.arc(t.xCenter,t.yCenter,e,0,O);else{let i=t.getPointPosition(0,e);n.moveTo(i.x,i.y);for(let o=1;o<s;o++)i=t.getPointPosition(o,e),n.lineTo(i.x,i.y)}}class Ro extends bo{static id="radialLinear";static defaults={display:!0,animate:!0,position:"chartArea",angleLines:{display:!0,lineWidth:1,borderDash:[],borderDashOffset:0},grid:{circular:!1},startAngle:0,ticks:{showLabelBackdrop:!0,callback:ae.formatters.numeric},pointLabels:{backdropColor:void 0,backdropPadding:2,display:!0,font:{size:10},callback:t=>t,padding:5,centerPointLabels:!1}};static defaultRoutes={"angleLines.color":"borderColor","pointLabels.color":"color","ticks.color":"color"};static descriptors={angleLines:{_fallback:"grid"}};constructor(t){super(t),this.xCenter=void 0,this.yCenter=void 0,this.drawingArea=void 0,this._pointLabels=[],this._pointLabelItems=[]}setDimensions(){const t=this._padding=ki(Po(this.options)/2),e=this.width=this.maxWidth-t.width,i=this.height=this.maxHeight-t.height;this.xCenter=Math.floor(this.left+e/2+t.left),this.yCenter=Math.floor(this.top+i/2+t.top),this.drawingArea=Math.floor(Math.min(e,i)/2)}determineDataLimits(){const{min:t,max:e}=this.getMinMax(!1);this.min=a(t)&&!isNaN(t)?t:0,this.max=a(e)&&!isNaN(e)?e:0,this.handleTickRangeOptions()}computeTickLimit(){return Math.ceil(this.drawingArea/Po(this.options))}generateTickLabels(t){bo.prototype.generateTickLabels.call(this,t),this._pointLabels=this.getLabels().map(((t,e)=>{const i=d(this.options.pointLabels.callback,[t,e],this);return i||0===i?i:""})).filter(((t,e)=>this.chart.getDataVisibility(e)))}fit(){const t=this.options;t.display&&t.pointLabels.display?Co(this):this.setCenterPoint(0,0,0,0)}setCenterPoint(t,e,i,s){this.xCenter+=Math.floor((t-e)/2),this.yCenter+=Math.floor((i-s)/2),this.drawingArea-=Math.min(this.drawingArea/2,Math.max(t,e,i,s))}getIndexAngle(t){return G(t*(O/(this._pointLabels.length||1))+$(this.options.startAngle||0))}getDistanceFromCenterForValue(t){if(s(t))return NaN;const e=this.drawingArea/(this.max-this.min);return this.options.reverse?(this.max-t)*e:(t-this.min)*e}getValueForDistanceFromCenter(t){if(s(t))return NaN;const e=t/(this.drawingArea/(this.max-this.min));return this.options.reverse?this.max-e:this.min+e}getPointLabelContext(t){const e=this._pointLabels||[];if(t>=0&&t<e.length){const i=e[t];return function(t,e,i){return Ci(t,{label:i,index:e,type:"pointLabel"})}(this.getContext(),t,i)}}getPointPosition(t,e,i=0){const s=this.getIndexAngle(t)-E+i;return{x:Math.cos(s)*e+this.xCenter,y:Math.sin(s)*e+this.yCenter,angle:s}}getPointPositionForValue(t,e){return this.getPointPosition(t,this.getDistanceFromCenterForValue(e))}getBasePosition(t){return this.getPointPositionForValue(t||0,this.getBaseValue())}getPointLabelPosition(t){const{left:e,top:i,right:s,bottom:n}=this._pointLabelItems[t];return{left:e,top:i,right:s,bottom:n}}drawBackground(){const{backgroundColor:t,grid:{circular:e}}=this.options;if(t){const i=this.ctx;i.save(),i.beginPath(),Eo(this,this.getDistanceFromCenterForValue(this._endValue),e,this._pointLabels.length),i.closePath(),i.fillStyle=t,i.fill(),i.restore()}}drawGrid(){const t=this.ctx,e=this.options,{angleLines:i,grid:s,border:n}=e,o=this._pointLabels.length;let a,r,l;if(e.pointLabels.display&&function(t,e){const{ctx:i,options:{pointLabels:s}}=t;for(let n=e-1;n>=0;n--){const e=t._pointLabelItems[n];if(!e.visible)continue;const o=s.setContext(t.getPointLabelContext(n));Lo(i,o,e);const a=Si(o.font),{x:r,y:l,textAlign:h}=e;Ne(i,t._pointLabels[n],r,l+a.lineHeight/2,a,{color:o.color,textAlign:h,textBaseline:"middle"})}}(this,o),s.display&&this.ticks.forEach(((t,e)=>{if(0!==e||0===e&&this.min<0){r=this.getDistanceFromCenterForValue(t.value);const i=this.getContext(e),a=s.setContext(i),l=n.setContext(i);!function(t,e,i,s,n){const o=t.ctx,a=e.circular,{color:r,lineWidth:l}=e;!a&&!s||!r||!l||i<0||(o.save(),o.strokeStyle=r,o.lineWidth=l,o.setLineDash(n.dash||[]),o.lineDashOffset=n.dashOffset,o.beginPath(),Eo(t,i,a,s),o.closePath(),o.stroke(),o.restore())}(this,a,r,o,l)}})),i.display){for(t.save(),a=o-1;a>=0;a--){const s=i.setContext(this.getPointLabelContext(a)),{color:n,lineWidth:o}=s;o&&n&&(t.lineWidth=o,t.strokeStyle=n,t.setLineDash(s.borderDash),t.lineDashOffset=s.borderDashOffset,r=this.getDistanceFromCenterForValue(e.reverse?this.min:this.max),l=this.getPointPosition(a,r),t.beginPath(),t.moveTo(this.xCenter,this.yCenter),t.lineTo(l.x,l.y),t.stroke())}t.restore()}}drawBorder(){}drawLabels(){const t=this.ctx,e=this.options,i=e.ticks;if(!i.display)return;const s=this.getIndexAngle(0);let n,o;t.save(),t.translate(this.xCenter,this.yCenter),t.rotate(s),t.textAlign="center",t.textBaseline="middle",this.ticks.forEach(((s,a)=>{if(0===a&&this.min>=0&&!e.reverse)return;const r=i.setContext(this.getContext(a)),l=Si(r.font);if(n=this.getDistanceFromCenterForValue(this.ticks[a].value),r.showLabelBackdrop){t.font=l.string,o=t.measureText(s.label).width,t.fillStyle=r.backdropColor;const e=ki(r.backdropPadding);t.fillRect(-o/2-e.left,-n-l.size/2-e.top,o+e.width,l.size+e.height)}Ne(t,s.label,0,-n,l,{color:r.color,strokeColor:r.textStrokeColor,strokeWidth:r.textStrokeWidth})})),t.restore()}drawTitle(){}}const Io={millisecond:{common:!0,size:1,steps:1e3},second:{common:!0,size:1e3,steps:60},minute:{common:!0,size:6e4,steps:60},hour:{common:!0,size:36e5,steps:24},day:{common:!0,size:864e5,steps:30},week:{common:!1,size:6048e5,steps:4},month:{common:!0,size:2628e6,steps:12},quarter:{common:!1,size:7884e6,steps:4},year:{common:!0,size:3154e7}},zo=Object.keys(Io);function Fo(t,e){return t-e}function Vo(t,e){if(s(e))return null;const i=t._adapter,{parser:n,round:o,isoWeekday:r}=t._parseOpts;let l=e;return"function"==typeof n&&(l=n(l)),a(l)||(l="string"==typeof n?i.parse(l,n):i.parse(l)),null===l?null:(o&&(l="week"!==o||!N(r)&&!0!==r?i.startOf(l,o):i.startOf(l,"isoWeek",r)),+l)}function Bo(t,e,i,s){const n=zo.length;for(let o=zo.indexOf(t);o<n-1;++o){const t=Io[zo[o]],n=t.steps?t.steps:Number.MAX_SAFE_INTEGER;if(t.common&&Math.ceil((i-e)/(n*t.size))<=s)return zo[o]}return zo[n-1]}function Wo(t,e,i){if(i){if(i.length){const{lo:s,hi:n}=et(i,e);t[i[s]>=e?i[s]:i[n]]=!0}}else t[e]=!0}function No(t,e,i){const s=[],n={},o=e.length;let a,r;for(a=0;a<o;++a)r=e[a],n[r]=a,s.push({value:r,major:!1});return 0!==o&&i?function(t,e,i,s){const n=t._adapter,o=+n.startOf(e[0].value,s),a=e[e.length-1].value;let r,l;for(r=o;r<=a;r=+n.add(r,1,s))l=i[r],l>=0&&(e[l].major=!0);return e}(t,s,n,i):s}class Ho extends tn{static id="time";static defaults={bounds:"data",adapters:{},time:{parser:!1,unit:!1,round:!1,isoWeekday:!1,minUnit:"millisecond",displayFormats:{}},ticks:{source:"auto",callback:!1,major:{enabled:!1}}};constructor(t){super(t),this._cache={data:[],labels:[],all:[]},this._unit="day",this._majorUnit=void 0,this._offsets={},this._normalized=!1,this._parseOpts=void 0}init(t,e={}){const i=t.time||(t.time={}),s=this._adapter=new In._date(t.adapters.date);s.init(e),b(i.displayFormats,s.formats()),this._parseOpts={parser:i.parser,round:i.round,isoWeekday:i.isoWeekday},super.init(t),this._normalized=e.normalized}parse(t,e){return void 0===t?null:Vo(this,t)}beforeLayout(){super.beforeLayout(),this._cache={data:[],labels:[],all:[]}}determineDataLimits(){const t=this.options,e=this._adapter,i=t.time.unit||"day";let{min:s,max:n,minDefined:o,maxDefined:r}=this.getUserBounds();function l(t){o||isNaN(t.min)||(s=Math.min(s,t.min)),r||isNaN(t.max)||(n=Math.max(n,t.max))}o&&r||(l(this._getLabelBounds()),"ticks"===t.bounds&&"labels"===t.ticks.source||l(this.getMinMax(!1))),s=a(s)&&!isNaN(s)?s:+e.startOf(Date.now(),i),n=a(n)&&!isNaN(n)?n:+e.endOf(Date.now(),i)+1,this.min=Math.min(s,n-1),this.max=Math.max(s+1,n)}_getLabelBounds(){const t=this.getLabelTimestamps();let e=Number.POSITIVE_INFINITY,i=Number.NEGATIVE_INFINITY;return t.length&&(e=t[0],i=t[t.length-1]),{min:e,max:i}}buildTicks(){const t=this.options,e=t.time,i=t.ticks,s="labels"===i.source?this.getLabelTimestamps():this._generate();"ticks"===t.bounds&&s.length&&(this.min=this._userMin||s[0],this.max=this._userMax||s[s.length-1]);const n=this.min,o=nt(s,n,this.max);return this._unit=e.unit||(i.autoSkip?Bo(e.minUnit,this.min,this.max,this._getLabelCapacity(n)):function(t,e,i,s,n){for(let o=zo.length-1;o>=zo.indexOf(i);o--){const i=zo[o];if(Io[i].common&&t._adapter.diff(n,s,i)>=e-1)return i}return zo[i?zo.indexOf(i):0]}(this,o.length,e.minUnit,this.min,this.max)),this._majorUnit=i.major.enabled&&"year"!==this._unit?function(t){for(let e=zo.indexOf(t)+1,i=zo.length;e<i;++e)if(Io[zo[e]].common)return zo[e]}(this._unit):void 0,this.initOffsets(s),t.reverse&&o.reverse(),No(this,o,this._majorUnit)}afterAutoSkip(){this.options.offsetAfterAutoskip&&this.initOffsets(this.ticks.map((t=>+t.value)))}initOffsets(t=[]){let e,i,s=0,n=0;this.options.offset&&t.length&&(e=this.getDecimalForValue(t[0]),s=1===t.length?1-e:(this.getDecimalForValue(t[1])-e)/2,i=this.getDecimalForValue(t[t.length-1]),n=1===t.length?i:(i-this.getDecimalForValue(t[t.length-2]))/2);const o=t.length<3?.5:.25;s=Z(s,0,o),n=Z(n,0,o),this._offsets={start:s,end:n,factor:1/(s+1+n)}}_generate(){const t=this._adapter,e=this.min,i=this.max,s=this.options,n=s.time,o=n.unit||Bo(n.minUnit,e,i,this._getLabelCapacity(e)),a=l(s.ticks.stepSize,1),r="week"===o&&n.isoWeekday,h=N(r)||!0===r,c={};let d,u,f=e;if(h&&(f=+t.startOf(f,"isoWeek",r)),f=+t.startOf(f,h?"day":o),t.diff(i,e,o)>1e5*a)throw new Error(e+" and "+i+" are too far apart with stepSize of "+a+" "+o);const g="data"===s.ticks.source&&this.getDataTimestamps();for(d=f,u=0;d<i;d=+t.add(d,a,o),u++)Wo(c,d,g);return d!==i&&"ticks"!==s.bounds&&1!==u||Wo(c,d,g),Object.keys(c).sort(Fo).map((t=>+t))}getLabelForValue(t){const e=this._adapter,i=this.options.time;return i.tooltipFormat?e.format(t,i.tooltipFormat):e.format(t,i.displayFormats.datetime)}format(t,e){const i=this.options.time.displayFormats,s=this._unit,n=e||i[s];return this._adapter.format(t,n)}_tickFormatFunction(t,e,i,s){const n=this.options,o=n.ticks.callback;if(o)return d(o,[t,e,i],this);const a=n.time.displayFormats,r=this._unit,l=this._majorUnit,h=r&&a[r],c=l&&a[l],u=i[e],f=l&&c&&u&&u.major;return this._adapter.format(t,s||(f?c:h))}generateTickLabels(t){let e,i,s;for(e=0,i=t.length;e<i;++e)s=t[e],s.label=this._tickFormatFunction(s.value,e,t)}getDecimalForValue(t){return null===t?NaN:(t-this.min)/(this.max-this.min)}getPixelForValue(t){const e=this._offsets,i=this.getDecimalForValue(t);return this.getPixelForDecimal((e.start+i)*e.factor)}getValueForPixel(t){const e=this._offsets,i=this.getDecimalForPixel(t)/e.factor-e.end;return this.min+i*(this.max-this.min)}_getLabelSize(t){const e=this.options.ticks,i=this.ctx.measureText(t).width,s=$(this.isHorizontal()?e.maxRotation:e.minRotation),n=Math.cos(s),o=Math.sin(s),a=this._resolveTickFontOptions(0).size;return{w:i*n+a*o,h:i*o+a*n}}_getLabelCapacity(t){const e=this.options.time,i=e.displayFormats,s=i[e.unit]||i.millisecond,n=this._tickFormatFunction(t,0,No(this,[t],this._majorUnit),s),o=this._getLabelSize(n),a=Math.floor(this.isHorizontal()?this.width/o.w:this.height/o.h)-1;return a>0?a:1}getDataTimestamps(){let t,e,i=this._cache.data||[];if(i.length)return i;const s=this.getMatchingVisibleMetas();if(this._normalized&&s.length)return this._cache.data=s[0].controller.getAllParsedValues(this);for(t=0,e=s.length;t<e;++t)i=i.concat(s[t].controller.getAllParsedValues(this));return this._cache.data=this.normalize(i)}getLabelTimestamps(){const t=this._cache.labels||[];let e,i;if(t.length)return t;const s=this.getLabels();for(e=0,i=s.length;e<i;++e)t.push(Vo(this,s[e]));return this._cache.labels=this._normalized?t:this.normalize(t)}normalize(t){return lt(t.sort(Fo))}}function jo(t,e,i){let s,n,o,a,r=0,l=t.length-1;i?(e>=t[r].pos&&e<=t[l].pos&&({lo:r,hi:l}=it(t,"pos",e)),({pos:s,time:o}=t[r]),({pos:n,time:a}=t[l])):(e>=t[r].time&&e<=t[l].time&&({lo:r,hi:l}=it(t,"time",e)),({time:s,pos:o}=t[r]),({time:n,pos:a}=t[l]));const h=n-s;return h?o+(a-o)*(e-s)/h:o}var $o=Object.freeze({__proto__:null,CategoryScale:class extends tn{static id="category";static defaults={ticks:{callback:mo}};constructor(t){super(t),this._startValue=void 0,this._valueRange=0,this._addedLabels=[]}init(t){const e=this._addedLabels;if(e.length){const t=this.getLabels();for(const{index:i,label:s}of e)t[i]===s&&t.splice(i,1);this._addedLabels=[]}super.init(t)}parse(t,e){if(s(t))return null;const i=this.getLabels();return((t,e)=>null===t?null:Z(Math.round(t),0,e))(e=isFinite(e)&&i[e]===t?e:po(i,t,l(e,t),this._addedLabels),i.length-1)}determineDataLimits(){const{minDefined:t,maxDefined:e}=this.getUserBounds();let{min:i,max:s}=this.getMinMax(!0);"ticks"===this.options.bounds&&(t||(i=0),e||(s=this.getLabels().length-1)),this.min=i,this.max=s}buildTicks(){const t=this.min,e=this.max,i=this.options.offset,s=[];let n=this.getLabels();n=0===t&&e===n.length-1?n:n.slice(t,e+1),this._valueRange=Math.max(n.length-(i?0:1),1),this._startValue=this.min-(i?.5:0);for(let i=t;i<=e;i++)s.push({value:i});return s}getLabelForValue(t){return mo.call(this,t)}configure(){super.configure(),this.isHorizontal()||(this._reversePixels=!this._reversePixels)}getPixelForValue(t){return"number"!=typeof t&&(t=this.parse(t)),null===t?NaN:this.getPixelForDecimal((t-this._startValue)/this._valueRange)}getPixelForTick(t){const e=this.ticks;return t<0||t>e.length-1?null:this.getPixelForValue(e[t].value)}getValueForPixel(t){return Math.round(this._startValue+this.getDecimalForPixel(t)*this._valueRange)}getBasePixel(){return this.bottom}},LinearScale:_o,LogarithmicScale:So,RadialLinearScale:Ro,TimeScale:Ho,TimeSeriesScale:class extends Ho{static id="timeseries";static defaults=Ho.defaults;constructor(t){super(t),this._table=[],this._minPos=void 0,this._tableRange=void 0}initOffsets(){const t=this._getTimestampsForTable(),e=this._table=this.buildLookupTable(t);this._minPos=jo(e,this.min),this._tableRange=jo(e,this.max)-this._minPos,super.initOffsets(t)}buildLookupTable(t){const{min:e,max:i}=this,s=[],n=[];let o,a,r,l,h;for(o=0,a=t.length;o<a;++o)l=t[o],l>=e&&l<=i&&s.push(l);if(s.length<2)return[{time:e,pos:0},{time:i,pos:1}];for(o=0,a=s.length;o<a;++o)h=s[o+1],r=s[o-1],l=s[o],Math.round((h+r)/2)!==l&&n.push({time:l,pos:o/(a-1)});return n}_generate(){const t=this.min,e=this.max;let i=super.getDataTimestamps();return i.includes(t)&&i.length||i.splice(0,0,t),i.includes(e)&&1!==i.length||i.push(e),i.sort(((t,e)=>t-e))}_getTimestampsForTable(){let t=this._cache.all||[];if(t.length)return t;const e=this.getDataTimestamps(),i=this.getLabelTimestamps();return t=e.length&&i.length?this.normalize(e.concat(i)):e.length?e:i,t=this._cache.all=t,t}getDecimalForValue(t){return(jo(this._table,t)-this._minPos)/this._tableRange}getValueForPixel(t){const e=this._offsets,i=this.getDecimalForPixel(t)/e.factor-e.end;return jo(this._table,i*this._tableRange+this._minPos,!0)}}});const Yo=["rgb(54, 162, 235)","rgb(255, 99, 132)","rgb(255, 159, 64)","rgb(255, 205, 86)","rgb(75, 192, 192)","rgb(153, 102, 255)","rgb(201, 203, 207)"],Uo=Yo.map((t=>t.replace("rgb(","rgba(").replace(")",", 0.5)")));function Xo(t){return Yo[t%Yo.length]}function qo(t){return Uo[t%Uo.length]}function Ko(t){let e=0;return(i,s)=>{const n=t.getDatasetMeta(s).controller;n instanceof $n?e=function(t,e){return t.backgroundColor=t.data.map((()=>Xo(e++))),e}(i,e):n instanceof Yn?e=function(t,e){return t.backgroundColor=t.data.map((()=>qo(e++))),e}(i,e):n&&(e=function(t,e){return t.borderColor=Xo(e),t.backgroundColor=qo(e),++e}(i,e))}}function Go(t){let e;for(e in t)if(t[e].borderColor||t[e].backgroundColor)return!0;return!1}var Jo={id:"colors",defaults:{enabled:!0,forceOverride:!1},beforeLayout(t,e,i){if(!i.enabled)return;const{data:{datasets:s},options:n}=t.config,{elements:o}=n,a=Go(s)||(r=n)&&(r.borderColor||r.backgroundColor)||o&&Go(o)||"rgba(0,0,0,0.1)"!==ue.borderColor||"rgba(0,0,0,0.1)"!==ue.backgroundColor;var r;if(!i.forceOverride&&a)return;const l=Ko(t);s.forEach(l)}};function Zo(t){if(t._decimated){const e=t._data;delete t._decimated,delete t._data,Object.defineProperty(t,"data",{configurable:!0,enumerable:!0,writable:!0,value:e})}}function Qo(t){t.data.datasets.forEach((t=>{Zo(t)}))}var ta={id:"decimation",defaults:{algorithm:"min-max",enabled:!1},beforeElementsUpdate:(t,e,i)=>{if(!i.enabled)return void Qo(t);const n=t.width;t.data.datasets.forEach(((e,o)=>{const{_data:a,indexAxis:r}=e,l=t.getDatasetMeta(o),h=a||e.data;if("y"===Pi([r,t.options.indexAxis]))return;if(!l.controller.supportsDecimation)return;const c=t.scales[l.xAxisID];if("linear"!==c.type&&"time"!==c.type)return;if(t.options.parsing)return;let{start:d,count:u}=function(t,e){const i=e.length;let s,n=0;const{iScale:o}=t,{min:a,max:r,minDefined:l,maxDefined:h}=o.getUserBounds();return l&&(n=Z(it(e,o.axis,a).lo,0,i-1)),s=h?Z(it(e,o.axis,r).hi+1,n,i)-n:i-n,{start:n,count:s}}(l,h);if(u<=(i.threshold||4*n))return void Zo(e);let f;switch(s(a)&&(e._data=h,delete e.data,Object.defineProperty(e,"data",{configurable:!0,enumerable:!0,get:function(){return this._decimated},set:function(t){this._data=t}})),i.algorithm){case"lttb":f=function(t,e,i,s,n){const o=n.samples||s;if(o>=i)return t.slice(e,e+i);const a=[],r=(i-2)/(o-2);let l=0;const h=e+i-1;let c,d,u,f,g,p=e;for(a[l++]=t[p],c=0;c<o-2;c++){let s,n=0,o=0;const h=Math.floor((c+1)*r)+1+e,m=Math.min(Math.floor((c+2)*r)+1,i)+e,x=m-h;for(s=h;s<m;s++)n+=t[s].x,o+=t[s].y;n/=x,o/=x;const b=Math.floor(c*r)+1+e,_=Math.min(Math.floor((c+1)*r)+1,i)+e,{x:y,y:v}=t[p];for(u=f=-1,s=b;s<_;s++)f=.5*Math.abs((y-n)*(t[s].y-v)-(y-t[s].x)*(o-v)),f>u&&(u=f,d=t[s],g=s);a[l++]=d,p=g}return a[l++]=t[h],a}(h,d,u,n,i);break;case"min-max":f=function(t,e,i,n){let o,a,r,l,h,c,d,u,f,g,p=0,m=0;const x=[],b=e+i-1,_=t[e].x,y=t[b].x-_;for(o=e;o<e+i;++o){a=t[o],r=(a.x-_)/y*n,l=a.y;const e=0|r;if(e===h)l<f?(f=l,c=o):l>g&&(g=l,d=o),p=(m*p+a.x)/++m;else{const i=o-1;if(!s(c)&&!s(d)){const e=Math.min(c,d),s=Math.max(c,d);e!==u&&e!==i&&x.push({...t[e],x:p}),s!==u&&s!==i&&x.push({...t[s],x:p})}o>0&&i!==u&&x.push(t[i]),x.push(a),h=e,m=0,f=g=l,c=d=u=o}}return x}(h,d,u,n);break;default:throw new Error(`Unsupported decimation algorithm '${i.algorithm}'`)}e._decimated=f}))},destroy(t){Qo(t)}};function ea(t,e,i,s){if(s)return;let n=e[t],o=i[t];return"angle"===t&&(n=G(n),o=G(o)),{property:t,start:n,end:o}}function ia(t,e,i){for(;e>t;e--){const t=i[e];if(!isNaN(t.x)&&!isNaN(t.y))break}return e}function sa(t,e,i,s){return t&&e?s(t[i],e[i]):t?t[i]:e?e[i]:0}function na(t,e){let i=[],s=!1;return n(t)?(s=!0,i=t):i=function(t,e){const{x:i=null,y:s=null}=t||{},n=e.points,o=[];return e.segments.forEach((({start:t,end:e})=>{e=ia(t,e,n);const a=n[t],r=n[e];null!==s?(o.push({x:a.x,y:s}),o.push({x:r.x,y:s})):null!==i&&(o.push({x:i,y:a.y}),o.push({x:i,y:r.y}))})),o}(t,e),i.length?new oo({points:i,options:{tension:0},_loop:s,_fullLoop:s}):null}function oa(t){return t&&!1!==t.fill}function aa(t,e,i){let s=t[e].fill;const n=[e];let o;if(!i)return s;for(;!1!==s&&-1===n.indexOf(s);){if(!a(s))return s;if(o=t[s],!o)return!1;if(o.visible)return s;n.push(s),s=o.fill}return!1}function ra(t,e,i){const s=function(t){const e=t.options,i=e.fill;let s=l(i&&i.target,i);void 0===s&&(s=!!e.backgroundColor);if(!1===s||null===s)return!1;if(!0===s)return"origin";return s}(t);if(o(s))return!isNaN(s.value)&&s;let n=parseFloat(s);return a(n)&&Math.floor(n)===n?function(t,e,i,s){"-"!==t&&"+"!==t||(i=e+i);if(i===e||i<0||i>=s)return!1;return i}(s[0],e,n,i):["origin","start","end","stack","shape"].indexOf(s)>=0&&s}function la(t,e,i){const s=[];for(let n=0;n<i.length;n++){const o=i[n],{first:a,last:r,point:l}=ha(o,e,"x");if(!(!l||a&&r))if(a)s.unshift(l);else if(t.push(l),!r)break}t.push(...s)}function ha(t,e,i){const s=t.interpolate(e,i);if(!s)return{};const n=s[i],o=t.segments,a=t.points;let r=!1,l=!1;for(let t=0;t<o.length;t++){const e=o[t],s=a[e.start][i],h=a[e.end][i];if(tt(n,s,h)){r=n===s,l=n===h;break}}return{first:r,last:l,point:s}}class ca{constructor(t){this.x=t.x,this.y=t.y,this.radius=t.radius}pathSegment(t,e,i){const{x:s,y:n,radius:o}=this;return e=e||{start:0,end:O},t.arc(s,n,o,e.end,e.start,!0),!i.bounds}interpolate(t){const{x:e,y:i,radius:s}=this,n=t.angle;return{x:e+Math.cos(n)*s,y:i+Math.sin(n)*s,angle:n}}}function da(t){const{chart:e,fill:i,line:s}=t;if(a(i))return function(t,e){const i=t.getDatasetMeta(e),s=i&&t.isDatasetVisible(e);return s?i.dataset:null}(e,i);if("stack"===i)return function(t){const{scale:e,index:i,line:s}=t,n=[],o=s.segments,a=s.points,r=function(t,e){const i=[],s=t.getMatchingVisibleMetas("line");for(let t=0;t<s.length;t++){const n=s[t];if(n.index===e)break;n.hidden||i.unshift(n.dataset)}return i}(e,i);r.push(na({x:null,y:e.bottom},s));for(let t=0;t<o.length;t++){const e=o[t];for(let t=e.start;t<=e.end;t++)la(n,a[t],r)}return new oo({points:n,options:{}})}(t);if("shape"===i)return!0;const n=function(t){const e=t.scale||{};if(e.getPointPositionForValue)return function(t){const{scale:e,fill:i}=t,s=e.options,n=e.getLabels().length,a=s.reverse?e.max:e.min,r=function(t,e,i){let s;return s="start"===t?i:"end"===t?e.options.reverse?e.min:e.max:o(t)?t.value:e.getBaseValue(),s}(i,e,a),l=[];if(s.grid.circular){const t=e.getPointPositionForValue(0,a);return new ca({x:t.x,y:t.y,radius:e.getDistanceFromCenterForValue(r)})}for(let t=0;t<n;++t)l.push(e.getPointPositionForValue(t,r));return l}(t);return function(t){const{scale:e={},fill:i}=t,s=function(t,e){let i=null;return"start"===t?i=e.bottom:"end"===t?i=e.top:o(t)?i=e.getPixelForValue(t.value):e.getBasePixel&&(i=e.getBasePixel()),i}(i,e);if(a(s)){const t=e.isHorizontal();return{x:t?s:null,y:t?null:s}}return null}(t)}(t);return n instanceof ca?n:na(n,s)}function ua(t,e,i){const s=da(e),{chart:n,index:o,line:a,scale:r,axis:l}=e,h=a.options,c=h.fill,d=h.backgroundColor,{above:u=d,below:f=d}=c||{},g=n.getDatasetMeta(o),p=Ni(n,g);s&&a.points.length&&(Ie(t,i),function(t,e){const{line:i,target:s,above:n,below:o,area:a,scale:r,clip:l}=e,h=i._loop?"angle":e.axis;t.save();let c=o;o!==n&&("x"===h?(fa(t,s,a.top),pa(t,{line:i,target:s,color:n,scale:r,property:h,clip:l}),t.restore(),t.save(),fa(t,s,a.bottom)):"y"===h&&(ga(t,s,a.left),pa(t,{line:i,target:s,color:o,scale:r,property:h,clip:l}),t.restore(),t.save(),ga(t,s,a.right),c=n));pa(t,{line:i,target:s,color:c,scale:r,property:h,clip:l}),t.restore()}(t,{line:a,target:s,above:u,below:f,area:i,scale:r,axis:l,clip:p}),ze(t))}function fa(t,e,i){const{segments:s,points:n}=e;let o=!0,a=!1;t.beginPath();for(const r of s){const{start:s,end:l}=r,h=n[s],c=n[ia(s,l,n)];o?(t.moveTo(h.x,h.y),o=!1):(t.lineTo(h.x,i),t.lineTo(h.x,h.y)),a=!!e.pathSegment(t,r,{move:a}),a?t.closePath():t.lineTo(c.x,i)}t.lineTo(e.first().x,i),t.closePath(),t.clip()}function ga(t,e,i){const{segments:s,points:n}=e;let o=!0,a=!1;t.beginPath();for(const r of s){const{start:s,end:l}=r,h=n[s],c=n[ia(s,l,n)];o?(t.moveTo(h.x,h.y),o=!1):(t.lineTo(i,h.y),t.lineTo(h.x,h.y)),a=!!e.pathSegment(t,r,{move:a}),a?t.closePath():t.lineTo(i,c.y)}t.lineTo(i,e.first().y),t.closePath(),t.clip()}function pa(t,e){const{line:i,target:s,property:n,color:o,scale:a,clip:r}=e,l=function(t,e,i){const s=t.segments,n=t.points,o=e.points,a=[];for(const t of s){let{start:s,end:r}=t;r=ia(s,r,n);const l=ea(i,n[s],n[r],t.loop);if(!e.segments){a.push({source:t,target:l,start:n[s],end:n[r]});continue}const h=Ii(e,l);for(const e of h){const s=ea(i,o[e.start],o[e.end],e.loop),r=Ri(t,n,s);for(const t of r)a.push({source:t,target:e,start:{[i]:sa(l,s,"start",Math.max)},end:{[i]:sa(l,s,"end",Math.min)}})}}return a}(i,s,n);for(const{source:e,target:h,start:c,end:d}of l){const{style:{backgroundColor:l=o}={}}=e,u=!0!==s;t.save(),t.fillStyle=l,ma(t,a,r,u&&ea(n,c,d)),t.beginPath();const f=!!i.pathSegment(t,e);let g;if(u){f?t.closePath():xa(t,s,d,n);const e=!!s.pathSegment(t,h,{move:f,reverse:!0});g=f&&e,g||xa(t,s,c,n)}t.closePath(),t.fill(g?"evenodd":"nonzero"),t.restore()}}function ma(t,e,i,s){const n=e.chart.chartArea,{property:o,start:a,end:r}=s||{};if("x"===o||"y"===o){let e,s,l,h;"x"===o?(e=a,s=n.top,l=r,h=n.bottom):(e=n.left,s=a,l=n.right,h=r),t.beginPath(),i&&(e=Math.max(e,i.left),l=Math.min(l,i.right),s=Math.max(s,i.top),h=Math.min(h,i.bottom)),t.rect(e,s,l-e,h-s),t.clip()}}function xa(t,e,i,s){const n=e.interpolate(i,s);n&&t.lineTo(n.x,n.y)}var ba={id:"filler",afterDatasetsUpdate(t,e,i){const s=(t.data.datasets||[]).length,n=[];let o,a,r,l;for(a=0;a<s;++a)o=t.getDatasetMeta(a),r=o.dataset,l=null,r&&r.options&&r instanceof oo&&(l={visible:t.isDatasetVisible(a),index:a,fill:ra(r,a,s),chart:t,axis:o.controller.options.indexAxis,scale:o.vScale,line:r}),o.$filler=l,n.push(l);for(a=0;a<s;++a)l=n[a],l&&!1!==l.fill&&(l.fill=aa(n,a,i.propagate))},beforeDraw(t,e,i){const s="beforeDraw"===i.drawTime,n=t.getSortedVisibleDatasetMetas(),o=t.chartArea;for(let e=n.length-1;e>=0;--e){const i=n[e].$filler;i&&(i.line.updateControlPoints(o,i.axis),s&&i.fill&&ua(t.ctx,i,o))}},beforeDatasetsDraw(t,e,i){if("beforeDatasetsDraw"!==i.drawTime)return;const s=t.getSortedVisibleDatasetMetas();for(let e=s.length-1;e>=0;--e){const i=s[e].$filler;oa(i)&&ua(t.ctx,i,t.chartArea)}},beforeDatasetDraw(t,e,i){const s=e.meta.$filler;oa(s)&&"beforeDatasetDraw"===i.drawTime&&ua(t.ctx,s,t.chartArea)},defaults:{propagate:!0,drawTime:"beforeDatasetDraw"}};const _a=(t,e)=>{let{boxHeight:i=e,boxWidth:s=e}=t;return t.usePointStyle&&(i=Math.min(i,e),s=t.pointStyleWidth||Math.min(s,e)),{boxWidth:s,boxHeight:i,itemHeight:Math.max(e,i)}};class ya extends $s{constructor(t){super(),this._added=!1,this.legendHitBoxes=[],this._hoveredItem=null,this.doughnutMode=!1,this.chart=t.chart,this.options=t.options,this.ctx=t.ctx,this.legendItems=void 0,this.columnSizes=void 0,this.lineWidths=void 0,this.maxHeight=void 0,this.maxWidth=void 0,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.height=void 0,this.width=void 0,this._margins=void 0,this.position=void 0,this.weight=void 0,this.fullSize=void 0}update(t,e,i){this.maxWidth=t,this.maxHeight=e,this._margins=i,this.setDimensions(),this.buildLabels(),this.fit()}setDimensions(){this.isHorizontal()?(this.width=this.maxWidth,this.left=this._margins.left,this.right=this.width):(this.height=this.maxHeight,this.top=this._margins.top,this.bottom=this.height)}buildLabels(){const t=this.options.labels||{};let e=d(t.generateLabels,[this.chart],this)||[];t.filter&&(e=e.filter((e=>t.filter(e,this.chart.data)))),t.sort&&(e=e.sort(((e,i)=>t.sort(e,i,this.chart.data)))),this.options.reverse&&e.reverse(),this.legendItems=e}fit(){const{options:t,ctx:e}=this;if(!t.display)return void(this.width=this.height=0);const i=t.labels,s=Si(i.font),n=s.size,o=this._computeTitleHeight(),{boxWidth:a,itemHeight:r}=_a(i,n);let l,h;e.font=s.string,this.isHorizontal()?(l=this.maxWidth,h=this._fitRows(o,n,a,r)+10):(h=this.maxHeight,l=this._fitCols(o,s,a,r)+10),this.width=Math.min(l,t.maxWidth||this.maxWidth),this.height=Math.min(h,t.maxHeight||this.maxHeight)}_fitRows(t,e,i,s){const{ctx:n,maxWidth:o,options:{labels:{padding:a}}}=this,r=this.legendHitBoxes=[],l=this.lineWidths=[0],h=s+a;let c=t;n.textAlign="left",n.textBaseline="middle";let d=-1,u=-h;return this.legendItems.forEach(((t,f)=>{const g=i+e/2+n.measureText(t.text).width;(0===f||l[l.length-1]+g+2*a>o)&&(c+=h,l[l.length-(f>0?0:1)]=0,u+=h,d++),r[f]={left:0,top:u,row:d,width:g,height:s},l[l.length-1]+=g+a})),c}_fitCols(t,e,i,s){const{ctx:n,maxHeight:o,options:{labels:{padding:a}}}=this,r=this.legendHitBoxes=[],l=this.columnSizes=[],h=o-t;let c=a,d=0,u=0,f=0,g=0;return this.legendItems.forEach(((t,o)=>{const{itemWidth:p,itemHeight:m}=function(t,e,i,s,n){const o=function(t,e,i,s){let n=t.text;n&&"string"!=typeof n&&(n=n.reduce(((t,e)=>t.length>e.length?t:e)));return e+i.size/2+s.measureText(n).width}(s,t,e,i),a=function(t,e,i){let s=t;"string"!=typeof e.text&&(s=va(e,i));return s}(n,s,e.lineHeight);return{itemWidth:o,itemHeight:a}}(i,e,n,t,s);o>0&&u+m+2*a>h&&(c+=d+a,l.push({width:d,height:u}),f+=d+a,g++,d=u=0),r[o]={left:f,top:u,col:g,width:p,height:m},d=Math.max(d,p),u+=m+a})),c+=d,l.push({width:d,height:u}),c}adjustHitBoxes(){if(!this.options.display)return;const t=this._computeTitleHeight(),{legendHitBoxes:e,options:{align:i,labels:{padding:s},rtl:n}}=this,o=Oi(n,this.left,this.width);if(this.isHorizontal()){let n=0,a=ft(i,this.left+s,this.right-this.lineWidths[n]);for(const r of e)n!==r.row&&(n=r.row,a=ft(i,this.left+s,this.right-this.lineWidths[n])),r.top+=this.top+t+s,r.left=o.leftForLtr(o.x(a),r.width),a+=r.width+s}else{let n=0,a=ft(i,this.top+t+s,this.bottom-this.columnSizes[n].height);for(const r of e)r.col!==n&&(n=r.col,a=ft(i,this.top+t+s,this.bottom-this.columnSizes[n].height)),r.top=a,r.left+=this.left+s,r.left=o.leftForLtr(o.x(r.left),r.width),a+=r.height+s}}isHorizontal(){return"top"===this.options.position||"bottom"===this.options.position}draw(){if(this.options.display){const t=this.ctx;Ie(t,this),this._draw(),ze(t)}}_draw(){const{options:t,columnSizes:e,lineWidths:i,ctx:s}=this,{align:n,labels:o}=t,a=ue.color,r=Oi(t.rtl,this.left,this.width),h=Si(o.font),{padding:c}=o,d=h.size,u=d/2;let f;this.drawTitle(),s.textAlign=r.textAlign("left"),s.textBaseline="middle",s.lineWidth=.5,s.font=h.string;const{boxWidth:g,boxHeight:p,itemHeight:m}=_a(o,d),x=this.isHorizontal(),b=this._computeTitleHeight();f=x?{x:ft(n,this.left+c,this.right-i[0]),y:this.top+c+b,line:0}:{x:this.left+c,y:ft(n,this.top+b+c,this.bottom-e[0].height),line:0},Ai(this.ctx,t.textDirection);const _=m+c;this.legendItems.forEach(((y,v)=>{s.strokeStyle=y.fontColor,s.fillStyle=y.fontColor;const M=s.measureText(y.text).width,w=r.textAlign(y.textAlign||(y.textAlign=o.textAlign)),k=g+u+M;let S=f.x,P=f.y;r.setWidth(this.width),x?v>0&&S+k+c>this.right&&(P=f.y+=_,f.line++,S=f.x=ft(n,this.left+c,this.right-i[f.line])):v>0&&P+_>this.bottom&&(S=f.x=S+e[f.line].width+c,f.line++,P=f.y=ft(n,this.top+b+c,this.bottom-e[f.line].height));if(function(t,e,i){if(isNaN(g)||g<=0||isNaN(p)||p<0)return;s.save();const n=l(i.lineWidth,1);if(s.fillStyle=l(i.fillStyle,a),s.lineCap=l(i.lineCap,"butt"),s.lineDashOffset=l(i.lineDashOffset,0),s.lineJoin=l(i.lineJoin,"miter"),s.lineWidth=n,s.strokeStyle=l(i.strokeStyle,a),s.setLineDash(l(i.lineDash,[])),o.usePointStyle){const a={radius:p*Math.SQRT2/2,pointStyle:i.pointStyle,rotation:i.rotation,borderWidth:n},l=r.xPlus(t,g/2);Ee(s,a,l,e+u,o.pointStyleWidth&&g)}else{const o=e+Math.max((d-p)/2,0),a=r.leftForLtr(t,g),l=wi(i.borderRadius);s.beginPath(),Object.values(l).some((t=>0!==t))?He(s,{x:a,y:o,w:g,h:p,radius:l}):s.rect(a,o,g,p),s.fill(),0!==n&&s.stroke()}s.restore()}(r.x(S),P,y),S=gt(w,S+g+u,x?S+k:this.right,t.rtl),function(t,e,i){Ne(s,i.text,t,e+m/2,h,{strikethrough:i.hidden,textAlign:r.textAlign(i.textAlign)})}(r.x(S),P,y),x)f.x+=k+c;else if("string"!=typeof y.text){const t=h.lineHeight;f.y+=va(y,t)+c}else f.y+=_})),Ti(this.ctx,t.textDirection)}drawTitle(){const t=this.options,e=t.title,i=Si(e.font),s=ki(e.padding);if(!e.display)return;const n=Oi(t.rtl,this.left,this.width),o=this.ctx,a=e.position,r=i.size/2,l=s.top+r;let h,c=this.left,d=this.width;if(this.isHorizontal())d=Math.max(...this.lineWidths),h=this.top+l,c=ft(t.align,c,this.right-d);else{const e=this.columnSizes.reduce(((t,e)=>Math.max(t,e.height)),0);h=l+ft(t.align,this.top,this.bottom-e-t.labels.padding-this._computeTitleHeight())}const u=ft(a,c,c+d);o.textAlign=n.textAlign(ut(a)),o.textBaseline="middle",o.strokeStyle=e.color,o.fillStyle=e.color,o.font=i.string,Ne(o,e.text,u,h,i)}_computeTitleHeight(){const t=this.options.title,e=Si(t.font),i=ki(t.padding);return t.display?e.lineHeight+i.height:0}_getLegendItemAt(t,e){let i,s,n;if(tt(t,this.left,this.right)&&tt(e,this.top,this.bottom))for(n=this.legendHitBoxes,i=0;i<n.length;++i)if(s=n[i],tt(t,s.left,s.left+s.width)&&tt(e,s.top,s.top+s.height))return this.legendItems[i];return null}handleEvent(t){const e=this.options;if(!function(t,e){if(("mousemove"===t||"mouseout"===t)&&(e.onHover||e.onLeave))return!0;if(e.onClick&&("click"===t||"mouseup"===t))return!0;return!1}(t.type,e))return;const i=this._getLegendItemAt(t.x,t.y);if("mousemove"===t.type||"mouseout"===t.type){const o=this._hoveredItem,a=(n=i,null!==(s=o)&&null!==n&&s.datasetIndex===n.datasetIndex&&s.index===n.index);o&&!a&&d(e.onLeave,[t,o,this],this),this._hoveredItem=i,i&&!a&&d(e.onHover,[t,i,this],this)}else i&&d(e.onClick,[t,i,this],this);var s,n}}function va(t,e){return e*(t.text?t.text.length:0)}var Ma={id:"legend",_element:ya,start(t,e,i){const s=t.legend=new ya({ctx:t.ctx,options:i,chart:t});ls.configure(t,s,i),ls.addBox(t,s)},stop(t){ls.removeBox(t,t.legend),delete t.legend},beforeUpdate(t,e,i){const s=t.legend;ls.configure(t,s,i),s.options=i},afterUpdate(t){const e=t.legend;e.buildLabels(),e.adjustHitBoxes()},afterEvent(t,e){e.replay||t.legend.handleEvent(e.event)},defaults:{display:!0,position:"top",align:"center",fullSize:!0,reverse:!1,weight:1e3,onClick(t,e,i){const s=e.datasetIndex,n=i.chart;n.isDatasetVisible(s)?(n.hide(s),e.hidden=!0):(n.show(s),e.hidden=!1)},onHover:null,onLeave:null,labels:{color:t=>t.chart.options.color,boxWidth:40,padding:10,generateLabels(t){const e=t.data.datasets,{labels:{usePointStyle:i,pointStyle:s,textAlign:n,color:o,useBorderRadius:a,borderRadius:r}}=t.legend.options;return t._getSortedDatasetMetas().map((t=>{const l=t.controller.getStyle(i?0:void 0),h=ki(l.borderWidth);return{text:e[t.index].label,fillStyle:l.backgroundColor,fontColor:o,hidden:!t.visible,lineCap:l.borderCapStyle,lineDash:l.borderDash,lineDashOffset:l.borderDashOffset,lineJoin:l.borderJoinStyle,lineWidth:(h.width+h.height)/4,strokeStyle:l.borderColor,pointStyle:s||l.pointStyle,rotation:l.rotation,textAlign:n||l.textAlign,borderRadius:a&&(r||l.borderRadius),datasetIndex:t.index}}),this)}},title:{color:t=>t.chart.options.color,display:!1,position:"center",text:""}},descriptors:{_scriptable:t=>!t.startsWith("on"),labels:{_scriptable:t=>!["generateLabels","filter","sort"].includes(t)}}};class wa extends $s{constructor(t){super(),this.chart=t.chart,this.options=t.options,this.ctx=t.ctx,this._padding=void 0,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.width=void 0,this.height=void 0,this.position=void 0,this.weight=void 0,this.fullSize=void 0}update(t,e){const i=this.options;if(this.left=0,this.top=0,!i.display)return void(this.width=this.height=this.right=this.bottom=0);this.width=this.right=t,this.height=this.bottom=e;const s=n(i.text)?i.text.length:1;this._padding=ki(i.padding);const o=s*Si(i.font).lineHeight+this._padding.height;this.isHorizontal()?this.height=o:this.width=o}isHorizontal(){const t=this.options.position;return"top"===t||"bottom"===t}_drawArgs(t){const{top:e,left:i,bottom:s,right:n,options:o}=this,a=o.align;let r,l,h,c=0;return this.isHorizontal()?(l=ft(a,i,n),h=e+t,r=n-i):("left"===o.position?(l=i+t,h=ft(a,s,e),c=-.5*C):(l=n-t,h=ft(a,e,s),c=.5*C),r=s-e),{titleX:l,titleY:h,maxWidth:r,rotation:c}}draw(){const t=this.ctx,e=this.options;if(!e.display)return;const i=Si(e.font),s=i.lineHeight/2+this._padding.top,{titleX:n,titleY:o,maxWidth:a,rotation:r}=this._drawArgs(s);Ne(t,e.text,0,0,i,{color:e.color,maxWidth:a,rotation:r,textAlign:ut(e.align),textBaseline:"middle",translation:[n,o]})}}var ka={id:"title",_element:wa,start(t,e,i){!function(t,e){const i=new wa({ctx:t.ctx,options:e,chart:t});ls.configure(t,i,e),ls.addBox(t,i),t.titleBlock=i}(t,i)},stop(t){const e=t.titleBlock;ls.removeBox(t,e),delete t.titleBlock},beforeUpdate(t,e,i){const s=t.titleBlock;ls.configure(t,s,i),s.options=i},defaults:{align:"center",display:!1,font:{weight:"bold"},fullSize:!0,padding:10,position:"top",text:"",weight:2e3},defaultRoutes:{color:"color"},descriptors:{_scriptable:!0,_indexable:!1}};const Sa=new WeakMap;var Pa={id:"subtitle",start(t,e,i){const s=new wa({ctx:t.ctx,options:i,chart:t});ls.configure(t,s,i),ls.addBox(t,s),Sa.set(t,s)},stop(t){ls.removeBox(t,Sa.get(t)),Sa.delete(t)},beforeUpdate(t,e,i){const s=Sa.get(t);ls.configure(t,s,i),s.options=i},defaults:{align:"center",display:!1,font:{weight:"normal"},fullSize:!0,padding:0,position:"top",text:"",weight:1500},defaultRoutes:{color:"color"},descriptors:{_scriptable:!0,_indexable:!1}};const Da={average(t){if(!t.length)return!1;let e,i,s=new Set,n=0,o=0;for(e=0,i=t.length;e<i;++e){const i=t[e].element;if(i&&i.hasValue()){const t=i.tooltipPosition();s.add(t.x),n+=t.y,++o}}if(0===o||0===s.size)return!1;return{x:[...s].reduce(((t,e)=>t+e))/s.size,y:n/o}},nearest(t,e){if(!t.length)return!1;let i,s,n,o=e.x,a=e.y,r=Number.POSITIVE_INFINITY;for(i=0,s=t.length;i<s;++i){const s=t[i].element;if(s&&s.hasValue()){const t=q(e,s.getCenterPoint());t<r&&(r=t,n=s)}}if(n){const t=n.tooltipPosition();o=t.x,a=t.y}return{x:o,y:a}}};function Ca(t,e){return e&&(n(e)?Array.prototype.push.apply(t,e):t.push(e)),t}function Oa(t){return("string"==typeof t||t instanceof String)&&t.indexOf("\n")>-1?t.split("\n"):t}function Aa(t,e){const{element:i,datasetIndex:s,index:n}=e,o=t.getDatasetMeta(s).controller,{label:a,value:r}=o.getLabelAndValue(n);return{chart:t,label:a,parsed:o.getParsed(n),raw:t.data.datasets[s].data[n],formattedValue:r,dataset:o.getDataset(),dataIndex:n,datasetIndex:s,element:i}}function Ta(t,e){const i=t.chart.ctx,{body:s,footer:n,title:o}=t,{boxWidth:a,boxHeight:r}=e,l=Si(e.bodyFont),h=Si(e.titleFont),c=Si(e.footerFont),d=o.length,f=n.length,g=s.length,p=ki(e.padding);let m=p.height,x=0,b=s.reduce(((t,e)=>t+e.before.length+e.lines.length+e.after.length),0);if(b+=t.beforeBody.length+t.afterBody.length,d&&(m+=d*h.lineHeight+(d-1)*e.titleSpacing+e.titleMarginBottom),b){m+=g*(e.displayColors?Math.max(r,l.lineHeight):l.lineHeight)+(b-g)*l.lineHeight+(b-1)*e.bodySpacing}f&&(m+=e.footerMarginTop+f*c.lineHeight+(f-1)*e.footerSpacing);let _=0;const y=function(t){x=Math.max(x,i.measureText(t).width+_)};return i.save(),i.font=h.string,u(t.title,y),i.font=l.string,u(t.beforeBody.concat(t.afterBody),y),_=e.displayColors?a+2+e.boxPadding:0,u(s,(t=>{u(t.before,y),u(t.lines,y),u(t.after,y)})),_=0,i.font=c.string,u(t.footer,y),i.restore(),x+=p.width,{width:x,height:m}}function La(t,e,i,s){const{x:n,width:o}=i,{width:a,chartArea:{left:r,right:l}}=t;let h="center";return"center"===s?h=n<=(r+l)/2?"left":"right":n<=o/2?h="left":n>=a-o/2&&(h="right"),function(t,e,i,s){const{x:n,width:o}=s,a=i.caretSize+i.caretPadding;return"left"===t&&n+o+a>e.width||"right"===t&&n-o-a<0||void 0}(h,t,e,i)&&(h="center"),h}function Ea(t,e,i){const s=i.yAlign||e.yAlign||function(t,e){const{y:i,height:s}=e;return i<s/2?"top":i>t.height-s/2?"bottom":"center"}(t,i);return{xAlign:i.xAlign||e.xAlign||La(t,e,i,s),yAlign:s}}function Ra(t,e,i,s){const{caretSize:n,caretPadding:o,cornerRadius:a}=t,{xAlign:r,yAlign:l}=i,h=n+o,{topLeft:c,topRight:d,bottomLeft:u,bottomRight:f}=wi(a);let g=function(t,e){let{x:i,width:s}=t;return"right"===e?i-=s:"center"===e&&(i-=s/2),i}(e,r);const p=function(t,e,i){let{y:s,height:n}=t;return"top"===e?s+=i:s-="bottom"===e?n+i:n/2,s}(e,l,h);return"center"===l?"left"===r?g+=h:"right"===r&&(g-=h):"left"===r?g-=Math.max(c,u)+n:"right"===r&&(g+=Math.max(d,f)+n),{x:Z(g,0,s.width-e.width),y:Z(p,0,s.height-e.height)}}function Ia(t,e,i){const s=ki(i.padding);return"center"===e?t.x+t.width/2:"right"===e?t.x+t.width-s.right:t.x+s.left}function za(t){return Ca([],Oa(t))}function Fa(t,e){const i=e&&e.dataset&&e.dataset.tooltip&&e.dataset.tooltip.callbacks;return i?t.override(i):t}const Va={beforeTitle:e,title(t){if(t.length>0){const e=t[0],i=e.chart.data.labels,s=i?i.length:0;if(this&&this.options&&"dataset"===this.options.mode)return e.dataset.label||"";if(e.label)return e.label;if(s>0&&e.dataIndex<s)return i[e.dataIndex]}return""},afterTitle:e,beforeBody:e,beforeLabel:e,label(t){if(this&&this.options&&"dataset"===this.options.mode)return t.label+": "+t.formattedValue||t.formattedValue;let e=t.dataset.label||"";e&&(e+=": ");const i=t.formattedValue;return s(i)||(e+=i),e},labelColor(t){const e=t.chart.getDatasetMeta(t.datasetIndex).controller.getStyle(t.dataIndex);return{borderColor:e.borderColor,backgroundColor:e.backgroundColor,borderWidth:e.borderWidth,borderDash:e.borderDash,borderDashOffset:e.borderDashOffset,borderRadius:0}},labelTextColor(){return this.options.bodyColor},labelPointStyle(t){const e=t.chart.getDatasetMeta(t.datasetIndex).controller.getStyle(t.dataIndex);return{pointStyle:e.pointStyle,rotation:e.rotation}},afterLabel:e,afterBody:e,beforeFooter:e,footer:e,afterFooter:e};function Ba(t,e,i,s){const n=t[e].call(i,s);return void 0===n?Va[e].call(i,s):n}class Wa extends $s{static positioners=Da;constructor(t){super(),this.opacity=0,this._active=[],this._eventPosition=void 0,this._size=void 0,this._cachedAnimations=void 0,this._tooltipItems=[],this.$animations=void 0,this.$context=void 0,this.chart=t.chart,this.options=t.options,this.dataPoints=void 0,this.title=void 0,this.beforeBody=void 0,this.body=void 0,this.afterBody=void 0,this.footer=void 0,this.xAlign=void 0,this.yAlign=void 0,this.x=void 0,this.y=void 0,this.height=void 0,this.width=void 0,this.caretX=void 0,this.caretY=void 0,this.labelColors=void 0,this.labelPointStyles=void 0,this.labelTextColors=void 0}initialize(t){this.options=t,this._cachedAnimations=void 0,this.$context=void 0}_resolveAnimations(){const t=this._cachedAnimations;if(t)return t;const e=this.chart,i=this.options.setContext(this.getContext()),s=i.enabled&&e.options.animation&&i.animations,n=new Ts(this.chart,s);return s._cacheable&&(this._cachedAnimations=Object.freeze(n)),n}getContext(){return this.$context||(this.$context=(t=this.chart.getContext(),e=this,i=this._tooltipItems,Ci(t,{tooltip:e,tooltipItems:i,type:"tooltip"})));var t,e,i}getTitle(t,e){const{callbacks:i}=e,s=Ba(i,"beforeTitle",this,t),n=Ba(i,"title",this,t),o=Ba(i,"afterTitle",this,t);let a=[];return a=Ca(a,Oa(s)),a=Ca(a,Oa(n)),a=Ca(a,Oa(o)),a}getBeforeBody(t,e){return za(Ba(e.callbacks,"beforeBody",this,t))}getBody(t,e){const{callbacks:i}=e,s=[];return u(t,(t=>{const e={before:[],lines:[],after:[]},n=Fa(i,t);Ca(e.before,Oa(Ba(n,"beforeLabel",this,t))),Ca(e.lines,Ba(n,"label",this,t)),Ca(e.after,Oa(Ba(n,"afterLabel",this,t))),s.push(e)})),s}getAfterBody(t,e){return za(Ba(e.callbacks,"afterBody",this,t))}getFooter(t,e){const{callbacks:i}=e,s=Ba(i,"beforeFooter",this,t),n=Ba(i,"footer",this,t),o=Ba(i,"afterFooter",this,t);let a=[];return a=Ca(a,Oa(s)),a=Ca(a,Oa(n)),a=Ca(a,Oa(o)),a}_createItems(t){const e=this._active,i=this.chart.data,s=[],n=[],o=[];let a,r,l=[];for(a=0,r=e.length;a<r;++a)l.push(Aa(this.chart,e[a]));return t.filter&&(l=l.filter(((e,s,n)=>t.filter(e,s,n,i)))),t.itemSort&&(l=l.sort(((e,s)=>t.itemSort(e,s,i)))),u(l,(e=>{const i=Fa(t.callbacks,e);s.push(Ba(i,"labelColor",this,e)),n.push(Ba(i,"labelPointStyle",this,e)),o.push(Ba(i,"labelTextColor",this,e))})),this.labelColors=s,this.labelPointStyles=n,this.labelTextColors=o,this.dataPoints=l,l}update(t,e){const i=this.options.setContext(this.getContext()),s=this._active;let n,o=[];if(s.length){const t=Da[i.position].call(this,s,this._eventPosition);o=this._createItems(i),this.title=this.getTitle(o,i),this.beforeBody=this.getBeforeBody(o,i),this.body=this.getBody(o,i),this.afterBody=this.getAfterBody(o,i),this.footer=this.getFooter(o,i);const e=this._size=Ta(this,i),a=Object.assign({},t,e),r=Ea(this.chart,i,a),l=Ra(i,a,r,this.chart);this.xAlign=r.xAlign,this.yAlign=r.yAlign,n={opacity:1,x:l.x,y:l.y,width:e.width,height:e.height,caretX:t.x,caretY:t.y}}else 0!==this.opacity&&(n={opacity:0});this._tooltipItems=o,this.$context=void 0,n&&this._resolveAnimations().update(this,n),t&&i.external&&i.external.call(this,{chart:this.chart,tooltip:this,replay:e})}drawCaret(t,e,i,s){const n=this.getCaretPosition(t,i,s);e.lineTo(n.x1,n.y1),e.lineTo(n.x2,n.y2),e.lineTo(n.x3,n.y3)}getCaretPosition(t,e,i){const{xAlign:s,yAlign:n}=this,{caretSize:o,cornerRadius:a}=i,{topLeft:r,topRight:l,bottomLeft:h,bottomRight:c}=wi(a),{x:d,y:u}=t,{width:f,height:g}=e;let p,m,x,b,_,y;return"center"===n?(_=u+g/2,"left"===s?(p=d,m=p-o,b=_+o,y=_-o):(p=d+f,m=p+o,b=_-o,y=_+o),x=p):(m="left"===s?d+Math.max(r,h)+o:"right"===s?d+f-Math.max(l,c)-o:this.caretX,"top"===n?(b=u,_=b-o,p=m-o,x=m+o):(b=u+g,_=b+o,p=m+o,x=m-o),y=b),{x1:p,x2:m,x3:x,y1:b,y2:_,y3:y}}drawTitle(t,e,i){const s=this.title,n=s.length;let o,a,r;if(n){const l=Oi(i.rtl,this.x,this.width);for(t.x=Ia(this,i.titleAlign,i),e.textAlign=l.textAlign(i.titleAlign),e.textBaseline="middle",o=Si(i.titleFont),a=i.titleSpacing,e.fillStyle=i.titleColor,e.font=o.string,r=0;r<n;++r)e.fillText(s[r],l.x(t.x),t.y+o.lineHeight/2),t.y+=o.lineHeight+a,r+1===n&&(t.y+=i.titleMarginBottom-a)}}_drawColorBox(t,e,i,s,n){const a=this.labelColors[i],r=this.labelPointStyles[i],{boxHeight:l,boxWidth:h}=n,c=Si(n.bodyFont),d=Ia(this,"left",n),u=s.x(d),f=l<c.lineHeight?(c.lineHeight-l)/2:0,g=e.y+f;if(n.usePointStyle){const e={radius:Math.min(h,l)/2,pointStyle:r.pointStyle,rotation:r.rotation,borderWidth:1},i=s.leftForLtr(u,h)+h/2,o=g+l/2;t.strokeStyle=n.multiKeyBackground,t.fillStyle=n.multiKeyBackground,Le(t,e,i,o),t.strokeStyle=a.borderColor,t.fillStyle=a.backgroundColor,Le(t,e,i,o)}else{t.lineWidth=o(a.borderWidth)?Math.max(...Object.values(a.borderWidth)):a.borderWidth||1,t.strokeStyle=a.borderColor,t.setLineDash(a.borderDash||[]),t.lineDashOffset=a.borderDashOffset||0;const e=s.leftForLtr(u,h),i=s.leftForLtr(s.xPlus(u,1),h-2),r=wi(a.borderRadius);Object.values(r).some((t=>0!==t))?(t.beginPath(),t.fillStyle=n.multiKeyBackground,He(t,{x:e,y:g,w:h,h:l,radius:r}),t.fill(),t.stroke(),t.fillStyle=a.backgroundColor,t.beginPath(),He(t,{x:i,y:g+1,w:h-2,h:l-2,radius:r}),t.fill()):(t.fillStyle=n.multiKeyBackground,t.fillRect(e,g,h,l),t.strokeRect(e,g,h,l),t.fillStyle=a.backgroundColor,t.fillRect(i,g+1,h-2,l-2))}t.fillStyle=this.labelTextColors[i]}drawBody(t,e,i){const{body:s}=this,{bodySpacing:n,bodyAlign:o,displayColors:a,boxHeight:r,boxWidth:l,boxPadding:h}=i,c=Si(i.bodyFont);let d=c.lineHeight,f=0;const g=Oi(i.rtl,this.x,this.width),p=function(i){e.fillText(i,g.x(t.x+f),t.y+d/2),t.y+=d+n},m=g.textAlign(o);let x,b,_,y,v,M,w;for(e.textAlign=o,e.textBaseline="middle",e.font=c.string,t.x=Ia(this,m,i),e.fillStyle=i.bodyColor,u(this.beforeBody,p),f=a&&"right"!==m?"center"===o?l/2+h:l+2+h:0,y=0,M=s.length;y<M;++y){for(x=s[y],b=this.labelTextColors[y],e.fillStyle=b,u(x.before,p),_=x.lines,a&&_.length&&(this._drawColorBox(e,t,y,g,i),d=Math.max(c.lineHeight,r)),v=0,w=_.length;v<w;++v)p(_[v]),d=c.lineHeight;u(x.after,p)}f=0,d=c.lineHeight,u(this.afterBody,p),t.y-=n}drawFooter(t,e,i){const s=this.footer,n=s.length;let o,a;if(n){const r=Oi(i.rtl,this.x,this.width);for(t.x=Ia(this,i.footerAlign,i),t.y+=i.footerMarginTop,e.textAlign=r.textAlign(i.footerAlign),e.textBaseline="middle",o=Si(i.footerFont),e.fillStyle=i.footerColor,e.font=o.string,a=0;a<n;++a)e.fillText(s[a],r.x(t.x),t.y+o.lineHeight/2),t.y+=o.lineHeight+i.footerSpacing}}drawBackground(t,e,i,s){const{xAlign:n,yAlign:o}=this,{x:a,y:r}=t,{width:l,height:h}=i,{topLeft:c,topRight:d,bottomLeft:u,bottomRight:f}=wi(s.cornerRadius);e.fillStyle=s.backgroundColor,e.strokeStyle=s.borderColor,e.lineWidth=s.borderWidth,e.beginPath(),e.moveTo(a+c,r),"top"===o&&this.drawCaret(t,e,i,s),e.lineTo(a+l-d,r),e.quadraticCurveTo(a+l,r,a+l,r+d),"center"===o&&"right"===n&&this.drawCaret(t,e,i,s),e.lineTo(a+l,r+h-f),e.quadraticCurveTo(a+l,r+h,a+l-f,r+h),"bottom"===o&&this.drawCaret(t,e,i,s),e.lineTo(a+u,r+h),e.quadraticCurveTo(a,r+h,a,r+h-u),"center"===o&&"left"===n&&this.drawCaret(t,e,i,s),e.lineTo(a,r+c),e.quadraticCurveTo(a,r,a+c,r),e.closePath(),e.fill(),s.borderWidth>0&&e.stroke()}_updateAnimationTarget(t){const e=this.chart,i=this.$animations,s=i&&i.x,n=i&&i.y;if(s||n){const i=Da[t.position].call(this,this._active,this._eventPosition);if(!i)return;const o=this._size=Ta(this,t),a=Object.assign({},i,this._size),r=Ea(e,t,a),l=Ra(t,a,r,e);s._to===l.x&&n._to===l.y||(this.xAlign=r.xAlign,this.yAlign=r.yAlign,this.width=o.width,this.height=o.height,this.caretX=i.x,this.caretY=i.y,this._resolveAnimations().update(this,l))}}_willRender(){return!!this.opacity}draw(t){const e=this.options.setContext(this.getContext());let i=this.opacity;if(!i)return;this._updateAnimationTarget(e);const s={width:this.width,height:this.height},n={x:this.x,y:this.y};i=Math.abs(i)<.001?0:i;const o=ki(e.padding),a=this.title.length||this.beforeBody.length||this.body.length||this.afterBody.length||this.footer.length;e.enabled&&a&&(t.save(),t.globalAlpha=i,this.drawBackground(n,t,s,e),Ai(t,e.textDirection),n.y+=o.top,this.drawTitle(n,t,e),this.drawBody(n,t,e),this.drawFooter(n,t,e),Ti(t,e.textDirection),t.restore())}getActiveElements(){return this._active||[]}setActiveElements(t,e){const i=this._active,s=t.map((({datasetIndex:t,index:e})=>{const i=this.chart.getDatasetMeta(t);if(!i)throw new Error("Cannot find a dataset at index "+t);return{datasetIndex:t,element:i.data[e],index:e}})),n=!f(i,s),o=this._positionChanged(s,e);(n||o)&&(this._active=s,this._eventPosition=e,this._ignoreReplayEvents=!0,this.update(!0))}handleEvent(t,e,i=!0){if(e&&this._ignoreReplayEvents)return!1;this._ignoreReplayEvents=!1;const s=this.options,n=this._active||[],o=this._getActiveElements(t,n,e,i),a=this._positionChanged(o,t),r=e||!f(o,n)||a;return r&&(this._active=o,(s.enabled||s.external)&&(this._eventPosition={x:t.x,y:t.y},this.update(!0,e))),r}_getActiveElements(t,e,i,s){const n=this.options;if("mouseout"===t.type)return[];if(!s)return e.filter((t=>this.chart.data.datasets[t.datasetIndex]&&void 0!==this.chart.getDatasetMeta(t.datasetIndex).controller.getParsed(t.index)));const o=this.chart.getElementsAtEventForMode(t,n.mode,n,i);return n.reverse&&o.reverse(),o}_positionChanged(t,e){const{caretX:i,caretY:s,options:n}=this,o=Da[n.position].call(this,t,e);return!1!==o&&(i!==o.x||s!==o.y)}}var Na={id:"tooltip",_element:Wa,positioners:Da,afterInit(t,e,i){i&&(t.tooltip=new Wa({chart:t,options:i}))},beforeUpdate(t,e,i){t.tooltip&&t.tooltip.initialize(i)},reset(t,e,i){t.tooltip&&t.tooltip.initialize(i)},afterDraw(t){const e=t.tooltip;if(e&&e._willRender()){const i={tooltip:e};if(!1===t.notifyPlugins("beforeTooltipDraw",{...i,cancelable:!0}))return;e.draw(t.ctx),t.notifyPlugins("afterTooltipDraw",i)}},afterEvent(t,e){if(t.tooltip){const i=e.replay;t.tooltip.handleEvent(e.event,i,e.inChartArea)&&(e.changed=!0)}},defaults:{enabled:!0,external:null,position:"average",backgroundColor:"rgba(0,0,0,0.8)",titleColor:"#fff",titleFont:{weight:"bold"},titleSpacing:2,titleMarginBottom:6,titleAlign:"left",bodyColor:"#fff",bodySpacing:2,bodyFont:{},bodyAlign:"left",footerColor:"#fff",footerSpacing:2,footerMarginTop:6,footerFont:{weight:"bold"},footerAlign:"left",padding:6,caretPadding:2,caretSize:5,cornerRadius:6,boxHeight:(t,e)=>e.bodyFont.size,boxWidth:(t,e)=>e.bodyFont.size,multiKeyBackground:"#fff",displayColors:!0,boxPadding:0,borderColor:"rgba(0,0,0,0)",borderWidth:0,animation:{duration:400,easing:"easeOutQuart"},animations:{numbers:{type:"number",properties:["x","y","width","height","caretX","caretY"]},opacity:{easing:"linear",duration:200}},callbacks:Va},defaultRoutes:{bodyFont:"font",footerFont:"font",titleFont:"font"},descriptors:{_scriptable:t=>"filter"!==t&&"itemSort"!==t&&"external"!==t,_indexable:!1,callbacks:{_scriptable:!1,_indexable:!1},animation:{_fallback:!1},animations:{_fallback:"animation"}},additionalOptionScopes:["interaction"]};return Tn.register(Un,$o,go,t),Tn.helpers={...Hi},Tn._adapters=In,Tn.Animation=As,Tn.Animations=Ts,Tn.animator=bt,Tn.controllers=nn.controllers.items,Tn.DatasetController=js,Tn.Element=$s,Tn.elements=go,Tn.Interaction=Ki,Tn.layouts=ls,Tn.platforms=Ds,Tn.Scale=tn,Tn.Ticks=ae,Object.assign(Tn,Un,$o,go,t,Ds),Tn.Chart=Tn,"undefined"!=typeof window&&(window.Chart=Tn),Tn}));
//# sourceMappingURL=chart.umd.js.map


// --- Component: shared/wrapped/wrapped-ui.js ---
// ==========================================
// WRAPPED UI INJECTOR (Локальная статистика)
// ==========================================

let wrappedOverlay = null;

// Создание оболочки (overlay) для Wrapped
function createWrappedOverlay() {
  if (wrappedOverlay) return wrappedOverlay;

  wrappedOverlay = document.createElement('div');
  wrappedOverlay.id = 'ym-wrapped-overlay';
  wrappedOverlay.className = 'ym-wrapped-overlay-hidden';

  const style = document.createElement('style');
  style.textContent = `
    #ym-wrapped-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(10, 10, 14, 0.72);
      backdrop-filter: blur(25px) saturate(180%);
      -webkit-backdrop-filter: blur(25px) saturate(180%);
      z-index: 999999;
      display: flex;
      opacity: 1;
      visibility: visible;
      transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s linear 0s;
      color: var(--ym-popover-text, white);
      font-family: 'YS Text', sans-serif;
      transform: scale(1);
      pointer-events: auto;
      box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.5);
    }
    .ym-wrapped-overlay-hidden {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transform: scale(1.03) !important;
      transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s linear 0.2s;
    }
    .ym-wrapped-overlay-hidden * {
      opacity: 0 !important;
      transition: opacity 0.1s ease !important;
    }
    .ym-wrapped-overlay-visible {
      opacity: 1;
      visibility: visible !important;
    }
    
    /* Sidebar (Tabs) */
    .ym-wrapped-aside {
      width: 250px;
      padding: 40px 20px;
      display: flex;
      flex-direction: column;
      background: transparent;
    }
    .ym-wrapped-aside h2 {
      margin: 0 0 40px 10px;
      font-size: 24px;
      font-weight: bold;
      color: var(--ym-popover-text, white);
    }
    .ym-wrapped-tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--ym-popover-text-muted, rgba(255,255,255,0.55));
      padding: 14px 20px;
      text-align: left;
      font-size: 15px;
      font-weight: 500;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
      margin-bottom: 8px;
      font-family: inherit;
    }
    .ym-wrapped-tab-btn:hover {
      color: var(--ym-popover-text, white);
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.04);
    }
    .ym-wrapped-tab-btn.active {
      color: var(--ym-popover-active, #ffdb4d);
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-weight: bold;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    /* Content Area */
    .ym-wrapped-main {
      flex: 1;
      padding: 40px 50px;
      position: relative;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: rgba(0, 0, 0, 0.03);
    }
    
    .ym-wrapped-close {
      position: absolute;
      top: 30px;
      right: 40px;
      background: var(--ym-popover-item-bg, rgba(255,255,255,0.1));
      border: none;
      color: var(--ym-popover-close-btn, white);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.2s, color 0.2s;
      z-index: 10;
    }
    .ym-wrapped-close:hover {
      background: var(--ym-popover-item-hover-bg, rgba(255,255,255,0.2));
      color: var(--ym-popover-close-btn-hover, white);
      transform: scale(1.1);
    }
    
    .ym-wrapped-tab-content {
      display: none;
      height: 100%;
      width: 100%;
      flex-direction: column;
      box-sizing: border-box;
      min-height: 0;
      animation: fadeIn 0.4s ease;
      max-width: 1200px;
      margin: 0 auto;
    }
    .ym-wrapped-tab-content.active {
      display: flex;
    }

    .ym-wrapped-columns {
      display: flex;
      gap: 30px;
      flex: 1;
      min-height: 0;
      width: 100%;
    }

    .ym-glass-card {
      background: rgba(255, 255, 255, 0.03) !important;
      border: 1px solid rgba(255, 255, 255, 0.06) !important;
      border-radius: 16px !important;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25) !important;
      box-sizing: border-box !important;
    }

    .ym-wrapped-row {
      display: flex;
      gap: 20px;
      width: 100%;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 1100px) {
      #ym-wrapped-overlay {
        flex-direction: column !important;
      }
      .ym-wrapped-aside {
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 15px 20px !important;
        flex-direction: row !important;
        overflow-x: auto !important;
        border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        flex-shrink: 0 !important;
      }
      .ym-wrapped-aside h2 {
        display: none !important;
      }
      .ym-wrapped-tab-btn {
        margin-bottom: 0 !important;
        margin-right: 8px !important;
        white-space: nowrap !important;
        padding: 8px 16px !important;
        font-size: 14px !important;
      }
      .ym-wrapped-tab-btn[data-tab="stories"] {
        margin-top: 0 !important;
      }
      .ym-wrapped-main {
        padding: 20px !important;
        height: calc(100vh - 75px) !important;
        overflow-y: auto !important;
      }
      .ym-wrapped-tab-content {
        height: auto !important;
        min-height: auto !important;
        overflow-y: visible !important;
      }
      .ym-wrapped-main h2 {
        font-size: 24px !important;
        margin-bottom: 15px !important;
      }
      .ym-wrapped-columns {
        flex-direction: column !important;
        height: auto !important;
        min-height: auto !important;
        overflow-y: visible !important;
        gap: 20px !important;
        flex: none !important;
      }
      .ym-wrapped-columns > div {
        flex: none !important;
        width: 100% !important;
        height: auto !important;
        max-height: none !important;
      }
      .ym-wrapped-row {
        flex-direction: column !important;
        gap: 15px !important;
        flex: none !important;
      }
      .ym-wrapped-row > div {
        flex: none !important;
        width: 100% !important;
        height: auto !important;
      }
      canvas {
        max-height: 220px !important;
      }
    }
  `;

  document.head.appendChild(style);

  wrappedOverlay.innerHTML = `
    <button class="ym-wrapped-close" aria-label="Закрыть">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
    <div class="ym-wrapped-aside">
      <h2>Статистика</h2>
      <button class="ym-wrapped-tab-btn active" data-tab="overview">Обзор</button>
      <button class="ym-wrapped-tab-btn" data-tab="artists">Топ Артистов</button>
      <button class="ym-wrapped-tab-btn" data-tab="tracks">Топ Треков</button>
      <button class="ym-wrapped-tab-btn" data-tab="genres">Жанры и Эпохи</button>
      <button class="ym-wrapped-tab-btn" data-tab="calendar">Календарь</button>
      <button class="ym-wrapped-tab-btn" data-tab="activity">Активность</button>
      <button class="ym-wrapped-tab-btn" data-tab="settings">Данные и Настройки</button>
      <button class="ym-wrapped-tab-btn" data-tab="stories" style="background: linear-gradient(135deg, #cc00ff 0%, #ff8c00 100%); color: white; font-weight: bold; border: none; margin-top: auto; padding: 12px 20px; border-radius: 12px; cursor: pointer; text-align: center; text-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: all 0.2s ease;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: -2px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>Итоги в Историях
      </button>
    </div>
    
    <div class="ym-wrapped-main">
      <!-- Контейнер куда будут рендериться графики -->
      <div id="ym-wrapped-tab-overview" class="ym-wrapped-tab-content active"></div>
      <div id="ym-wrapped-tab-artists" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-tracks" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-genres" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-calendar" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-activity" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-settings" class="ym-wrapped-tab-content"></div>
    </div>
  `;

  document.body.appendChild(wrappedOverlay);

  // Обработка закрытия
  wrappedOverlay.querySelector('.ym-wrapped-close').addEventListener('click', (e) => {
    console.log('[Wrapped UI] Клик по кнопке закрытия X');
    e.stopPropagation();
    e.preventDefault();
    closeWrapped();
  });

  // Закрытие по нажатию клавиши Escape
  const handleEscapeKey = (e) => {
    if (e.key === 'Escape') {
      console.log('[Wrapped UI] Нажат Escape');
      if (typeof window.closeWrappedStories === 'function' && document.getElementById('ym-wrapped-stories')?.style.display === 'flex') {
        window.closeWrappedStories();
      } else if (wrappedOverlay.classList.contains('ym-wrapped-overlay-visible')) {
        closeWrapped();
      }
    }
  };
  document.removeEventListener('keydown', handleEscapeKey);
  document.addEventListener('keydown', handleEscapeKey);

  // Логика переключения вкладок
  const tabBtns = wrappedOverlay.querySelectorAll('.ym-wrapped-tab-btn');
  tabBtns.forEach(btn => {
    const tabId = btn.getAttribute('data-tab');
    if (tabId === 'stories') {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof window.openWrappedStories === 'function' && window.wrappedDB) {
          window.wrappedDB.getStats().then(stats => {
            window.openWrappedStories(stats);
          });
        }
      });
      return;
    }

    btn.addEventListener('click', () => {
      // Снимаем active со всех кнопок и контента
      tabBtns.forEach(b => b.classList.remove('active'));
      wrappedOverlay.querySelectorAll('.ym-wrapped-tab-content').forEach(c => c.classList.remove('active'));
      
      // Ставим active на нажатую
      btn.classList.add('active');
      const content = wrappedOverlay.querySelector('#ym-wrapped-tab-' + tabId);
      if (content) content.classList.add('active');
    });
  });

  return wrappedOverlay;
}

function openWrapped() {
  console.log('[Wrapped UI] Открытие главного меню статистики');
  const overlay = createWrappedOverlay();
  
  // Принудительно запрашиваем offsetWidth, чтобы браузер отрендерил элемент
  void overlay.offsetWidth;
  
  overlay.style.visibility = ''; // Гарантируем, что нет инлайнового hidden
  overlay.classList.remove('ym-wrapped-overlay-hidden');
  overlay.classList.add('ym-wrapped-overlay-visible');
  document.body.style.overflow = 'hidden';

  // Рендерим графики при открытии
  if (typeof window.renderWrappedCharts === 'function') {
    window.renderWrappedCharts();
  }
}

function closeWrapped() {
  console.log('[Wrapped UI] closeWrapped() запущен');
  if (!wrappedOverlay) {
    console.warn('[Wrapped UI] closeWrapped() - wrappedOverlay отсутствует');
    return;
  }
  wrappedOverlay.classList.remove('ym-wrapped-overlay-visible');
  wrappedOverlay.classList.add('ym-wrapped-overlay-hidden');
  wrappedOverlay.style.visibility = ''; // Сбрасываем инлайновый visibility, установленный Историями
  
  // Ждем окончания анимации (0.2s) перед тем как вернуть скролл
  setTimeout(() => {
    if (wrappedOverlay.classList.contains('ym-wrapped-overlay-hidden')) {
      console.log('[Wrapped UI] Сброс overflow body');
      document.body.style.overflow = '';
    }
  }, 200);
}

function injectWrappedButton() {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (!container) return;
  
  if (document.getElementById('ym-wrapped-btn')) return;

  const btn = document.createElement('li');
  btn.id = 'ym-wrapped-btn';
  btn.className = 'HcfYy4VfnRHqgXzIdL7w kRmUIkcHKD5AgtpPo8wT ym-navbar-item-injected';
  btn.setAttribute('title', 'Моя Статистика');
  
  const link = document.createElement('a');
  link.className = 'buOTZq_TKQOVyjMLrXvB ZfF8mQ3Iftpwu0aZgDtG yWJHrpNsBvchs9Jjyokk';
  link.style.cursor = 'pointer';
  
  const iconWrapper = document.createElement('div');
  iconWrapper.className = '_YzsXZGNK8KeaUFC4Ja1';
  iconWrapper.style.position = 'relative';
  
  // Иконка статистики (Chart)
  const svgDoc = new DOMParser().parseFromString(`
    <svg xmlns="http://www.w3.org/2000/svg" class="UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  `, 'image/svg+xml');
  iconWrapper.appendChild(svgDoc.documentElement);
  
  const textWrapper = document.createElement('div');
  textWrapper.className = 'nxMXCBiVfgH4oxds3f2y';
  const textSpan = document.createElement('span');
  textSpan.className = '_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA _3_Mxw7Si7j2g4kWjlpR';
  textSpan.style.webkitLineClamp = '1';
  textSpan.textContent = 'Wrapped';
  textSpan.setAttribute('title', 'Локальная статистика');
  
  textWrapper.appendChild(textSpan);
  link.appendChild(iconWrapper);
  link.appendChild(textWrapper);
  btn.appendChild(link);
  
  container.appendChild(btn);
  
  btn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    openWrapped();
  });
}

function initWrappedInjector() {
  // Пытаемся внедрить сразу
  injectWrappedButton();
  
  // И следим за изменениями DOM на случай SPA навигации
  const observer = new MutationObserver((mutations) => {
    if (!document.getElementById('ym-wrapped-btn')) {
      injectWrappedButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') {
  initWrappedInjector();
}


// --- Component: shared/wrapped/wrapped-db.js ---
// ==========================================
// WRAPPED DATABASE (IndexedDB)
// ==========================================

const DB_NAME = 'BetterYandexMusic_WrappedDB';
const DB_VERSION = 1;

class WrappedDB {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Таблица прослушиваний (история)
        if (!db.objectStoreNames.contains('listens')) {
          const listensStore = db.createObjectStore('listens', { keyPath: 'id', autoIncrement: true });
          listensStore.createIndex('trackId', 'trackId', { unique: false });
          listensStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Таблица треков (метаданные)
        if (!db.objectStoreNames.contains('tracks')) {
          const tracksStore = db.createObjectStore('tracks', { keyPath: 'id' });
          tracksStore.createIndex('title', 'title', { unique: false });
        }
        
        // Таблица артистов (метаданные)
        if (!db.objectStoreNames.contains('artists')) {
          const artistsStore = db.createObjectStore('artists', { keyPath: 'id' });
          artistsStore.createIndex('name', 'name', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event) => {
        console.error('WrappedDB Init Error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async addListen(trackData) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readwrite');
      const listensStore = transaction.objectStore('listens');
      const tracksStore = transaction.objectStore('tracks');
      const artistsStore = transaction.objectStore('artists');

      const trackId = String(trackData.id);

      // 1. Сохраняем/обновляем метаданные трека слиянием с существующими полями
      const trackGetReq = tracksStore.get(trackId);
      trackGetReq.onsuccess = (event) => {
        const existingTrack = event.target.result;
        
        const mergedTrack = {
          id: trackId,
          title: trackData.title || (existingTrack ? existingTrack.title : ''),
          cover: trackData.cover || (existingTrack ? existingTrack.cover : null),
          duration: trackData.duration || (existingTrack ? existingTrack.duration : 0),
          artists: trackData.artists ? trackData.artists.map(a => String(a.id)) : (existingTrack ? existingTrack.artists : []),
          genre: trackData.genre || (existingTrack ? existingTrack.genre : null),
          year: trackData.year || (existingTrack ? existingTrack.year : null),
          explicit: trackData.explicit !== undefined ? !!trackData.explicit : (existingTrack ? !!existingTrack.explicit : false)
        };

        // Если в базе уже была обложка, жанр или год, а в новом прослушивании их нет — сохраняем старые
        if (existingTrack) {
          if (!mergedTrack.cover && existingTrack.cover) mergedTrack.cover = existingTrack.cover;
          if (!mergedTrack.genre && existingTrack.genre) mergedTrack.genre = existingTrack.genre;
          if (!mergedTrack.year && existingTrack.year) mergedTrack.year = existingTrack.year;
        }

        tracksStore.put(mergedTrack);
      };

      // 2. Сохраняем/обновляем метаданные артистов слиянием обложек
      if (trackData.artists && Array.isArray(trackData.artists)) {
        trackData.artists.forEach(artist => {
          const artistId = String(artist.id);
          const artistGetReq = artistsStore.get(artistId);
          artistGetReq.onsuccess = (event) => {
            const existingArtist = event.target.result;
            
            const mergedArtist = {
              id: artistId,
              name: artist.name || (existingArtist ? existingArtist.name : ''),
              cover: artist.cover || (existingArtist ? existingArtist.cover : '')
            };

            // Если обложка уже есть в БД, а сейчас пришла пустая — сохраняем ту, что в БД
            if (existingArtist && !mergedArtist.cover && existingArtist.cover) {
              mergedArtist.cover = existingArtist.cover;
            }

            artistsStore.put(mergedArtist);
          };
        });
      }

      // 3. Добавляем запись о прослушивании
      const listenRecord = {
        trackId: trackId,
        timestamp: Date.now(),
        durationListened: trackData.duration // Считаем полный трек для статистики
      };
      
      const request = listensStore.add(listenRecord);
 
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // Получить всю статистику (агрегация)
  async getStats() {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readonly');
      const listensStore = transaction.objectStore('listens');
      const tracksStore = transaction.objectStore('tracks');
      const artistsStore = transaction.objectStore('artists');

      const listens = [];
      const tracks = new Map();
      const artists = new Map();

      // Сбор всех данных
      listensStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          listens.push(cursor.value);
          cursor.continue();
        } else {
          // Загрузка метаданных треков
          tracksStore.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              tracks.set(String(cursor.value.id), cursor.value);
              cursor.continue();
            } else {
              // Загрузка метаданных артистов
              artistsStore.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                  artists.set(String(cursor.value.id), cursor.value);
                  cursor.continue();
                } else {
                  resolve(this.aggregateStats(listens, tracks, artists));
                }
              };
            }
          };
        }
      };
    });
  }

  aggregateStats(listens, tracksMap, artistsMap) {
    const totalListens = listens.length;
    let totalDurationSec = 0;
    
    const trackCounts = {};
    const artistCounts = {};
    const artistDuration = {}; // Время прослушивания артиста (в сек)
    const genreCounts = {};
    
    const listensByMonth = new Array(12).fill(0);
    const hourlyListens = new Array(24).fill(0);
    const weeklyListens = new Array(7).fill(0); // 0 = Воскресенье, 1 = Понедельник, и т.д.
    
    const eraCounts = {
      '2020s': 0,
      '2010s': 0,
      '2000s': 0,
      '90s': 0,
      'Earlier': 0
    };
    let explicitCount = 0;

    // Вспомогательные хранилища для новых фич
    const monthlyTrackCounts = Array.from({ length: 12 }, () => ({}));
    const dailyListens = {};
    const dailyListensDuration = {};
    const dailyTrackCounts = {};
    const slotCounts = {};
    let weekdayListensCount = 0;
    let weekendListensCount = 0;

    for (const listen of listens) {
      const track = tracksMap.get(String(listen.trackId));
      if (!track) continue;

      totalDurationSec += track.duration || 0;

      // Топ треков
      const strTrackId = String(listen.trackId);
      trackCounts[strTrackId] = (trackCounts[strTrackId] || 0) + 1;

      // Топ артистов
      if (track.artists) {
        track.artists.forEach(artistId => {
          const strArtistId = String(artistId);
          artistCounts[strArtistId] = (artistCounts[strArtistId] || 0) + 1;
          artistDuration[strArtistId] = (artistDuration[strArtistId] || 0) + (track.duration || 0);
        });
      }

      // Топ жанров
      if (track.genre) {
        const genre = track.genre;
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      }

      // Распределение по эпохам
      if (track.year) {
        const year = Number(track.year);
        if (year >= 2020) eraCounts['2020s']++;
        else if (year >= 2010) eraCounts['2010s']++;
        else if (year >= 2000) eraCounts['2000s']++;
        else if (year >= 1990) eraCounts['90s']++;
        else eraCounts['Earlier']++;
      }

      // Explicit контент
      if (track.explicit) {
        explicitCount++;
      }

      // Дата прослушивания
      const listenDate = new Date(listen.timestamp);
      
      // Активность по месяцам
      const month = listenDate.getMonth();
      listensByMonth[month]++;

      // Собираем популярные треки по месяцам
      monthlyTrackCounts[month][strTrackId] = (monthlyTrackCounts[month][strTrackId] || 0) + 1;

      // Активность по часам
      const hour = listenDate.getHours();
      hourlyListens[hour]++;

      // Активность по дням недели
      const day = listenDate.getDay();
      weeklyListens[day]++;

      // Будни vs Выходные
      if (day === 0 || day === 6) {
        weekendListensCount++;
      } else {
        weekdayListensCount++;
      }

      // Прослушивания по дням (всегда в локальном часовом поясе)
      const dateStr = `${listenDate.getFullYear()}-${String(listenDate.getMonth() + 1).padStart(2, '0')}-${String(listenDate.getDate()).padStart(2, '0')}`;
      dailyListens[dateStr] = (dailyListens[dateStr] || 0) + 1;
      
      const listenDur = listen.durationListened || track.duration || 0;
      dailyListensDuration[dateStr] = (dailyListensDuration[dateStr] || 0) + listenDur;

      if (!dailyTrackCounts[dateStr]) {
        dailyTrackCounts[dateStr] = {};
      }
      dailyTrackCounts[dateStr][strTrackId] = (dailyTrackCounts[dateStr][strTrackId] || 0) + 1;

      // Слот активности (день_час)
      const slotKey = `${day}_${hour}`;
      slotCounts[slotKey] = (slotCounts[slotKey] || 0) + 1;
    }

    const topTracks = Object.entries(trackCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => {
        const rawTrack = tracksMap.get(String(id));
        if (!rawTrack) return { track: null, count };
        
        // Клонируем объект трека, чтобы избежать мутации в tracksMap
        const track = { ...rawTrack };
        if (track && Array.isArray(track.artists)) {
          // Разрешаем ID артистов в полноценные объекты с именами и обложками
          track.artists = track.artists.map(artistId => {
            const artistObj = artistsMap.get(String(artistId));
            return {
              id: String(artistId),
              name: artistObj ? artistObj.name : 'Неизвестный исполнитель',
              cover: artistObj ? artistObj.cover : ''
            };
          });
        }
        return { track, count };
      });

    const topArtists = Object.entries(artistDuration) // Сортируем по времени прослушивания
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, duration]) => ({ 
        artist: artistsMap.get(String(id)), 
        duration,
        count: artistCounts[id]
      }));

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const explicitPercentage = totalListens > 0 ? Math.round((explicitCount / totalListens) * 100) : 0;

    // 1. Вычисление Музыкального психотипа
    const topArtistDurationSec = topArtists[0] ? topArtists[0].duration : 0;
    const topArtistPercent = totalDurationSec > 0 ? (topArtistDurationSec / totalDurationSec) * 100 : 0;
    
    const totalEraCount = Object.values(eraCounts).reduce((a, b) => a + b, 0);
    const olderEraCount = (eraCounts['2000s'] || 0) + (eraCounts['90s'] || 0) + (eraCounts['Earlier'] || 0);
    const olderEraPercent = totalEraCount > 0 ? (olderEraCount / totalEraCount) * 100 : 0;
    
    const uniqueArtistsCount = Object.keys(artistCounts).length;
    const explorerRatio = totalListens > 0 ? uniqueArtistsCount / totalListens : 0;
    
    const peakHour = hourlyListens.indexOf(Math.max(...hourlyListens));

    let personaName = 'Меломан';
    let personaDescription = 'Вы любите самую разную музыку и находите идеальный баланс во всех жанрах и эпохах.';
    if (olderEraPercent > 30) {
      personaName = 'Путешественник во времени';
      personaDescription = 'Ваше сердце бьется под ритмы прошлых десятилетий. Вы цените классику и проверенные временем хиты.';
    } else if (topArtistPercent > 25) {
      personaName = 'Преданный фанат';
      const artistName = topArtists[0]?.artist?.name || 'своего любимого артиста';
      personaDescription = `Вы невероятно верны своему вкусу. Ваше прослушивание во многом крутится вокруг творчества ${artistName}.`;
    } else if (explorerRatio > 0.5) {
      personaName = 'Первооткрыватель';
      personaDescription = 'Вы постоянно ищете новое звучание. Ваша фонотека полна уникальных имен, а знакомые треки редко повторяются.';
    } else if (peakHour >= 0 && peakHour < 6) {
      personaName = 'Ночная сова';
      personaDescription = 'Для вас музыка — лучший спутник под покровом ночи. Вы часто слушаете треки, когда весь остальной мир спит.';
    } else if (peakHour >= 6 && peakHour < 12) {
      personaName = 'Ранняя пташка';
      personaDescription = 'Музыка заряжает вас энергией на весь день. Вы предпочитаете слушать любимые плейлисты в утренние часы.';
    }
    const listeningPersona = { name: personaName, description: personaDescription };

    // 2. Вычисление Музыкального календаря по месяцам
    const monthlyTopTracks = new Array(12).fill(null);
    for (let m = 0; m < 12; m++) {
      const counts = monthlyTrackCounts[m];
      const entries = Object.entries(counts);
      if (entries.length > 0) {
        entries.sort((a, b) => b[1] - a[1]);
        const [trackId, count] = entries[0];
        const track = tracksMap.get(String(trackId));
        if (track) {
          let coverUrl = track.cover || 'https://music.yandex.ru/blocks/playlist-cover/playlist-cover_like.png';
          if (coverUrl && !coverUrl.startsWith('http') && !coverUrl.startsWith('//')) {
            coverUrl = 'https://' + coverUrl;
          }
          let artistName = '';
          if (Array.isArray(track.artists)) {
            artistName = track.artists.map(artId => {
              if (artId && typeof artId === 'object') {
                return artId.name || 'Неизвестный исполнитель';
              }
              const artObj = artistsMap.get(String(artId));
              return artObj ? artObj.name : String(artId);
            }).join(', ');
          }
          monthlyTopTracks[m] = {
            trackId,
            title: track.title,
            cover: coverUrl,
            artist: artistName,
            count
          };
        }
      }
    }

    // 2.5 Вычисление Топ-трека на каждый день
    const dailyTopTrack = {};
    for (const [dStr, counts] of Object.entries(dailyTrackCounts)) {
      const entries = Object.entries(counts);
      if (entries.length > 0) {
        entries.sort((a, b) => b[1] - a[1]);
        const [trackId, count] = entries[0];
        const track = tracksMap.get(String(trackId));
        if (track) {
          let artistName = '';
          if (Array.isArray(track.artists)) {
            artistName = track.artists.map(artId => {
              if (artId && typeof artId === 'object') return artId.name || 'Неизвестный исполнитель';
              const artObj = artistsMap.get(String(artId));
              return artObj ? artObj.name : String(artId);
            }).join(', ');
          }
          dailyTopTrack[dStr] = {
            title: track.title,
            artist: artistName,
            count
          };
        }
      }
    }

    // 3. Вычисление Личных рекордов
    let peakDayStr = '-';
    let peakDayCount = 0;
    const dailyEntries = Object.entries(dailyListens);
    if (dailyEntries.length > 0) {
      dailyEntries.sort((a, b) => b[1] - a[1]);
      peakDayStr = dailyEntries[0][0];
      peakDayCount = dailyEntries[0][1];
      try {
        const [y, m, d] = peakDayStr.split('-');
        const monthsNamesRU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        peakDayStr = `${parseInt(d)} ${monthsNamesRU[parseInt(m) - 1]} ${y}`;
      } catch (e) {}
    }

    const weekdayPercent = totalListens > 0 ? Math.round((weekdayListensCount / totalListens) * 100) : 0;
    const weekendPercent = totalListens > 0 ? Math.round((weekendListensCount / totalListens) * 100) : 0;

    let favSlotStr = '-';
    const slotEntries = Object.entries(slotCounts);
    if (slotEntries.length > 0) {
      slotEntries.sort((a, b) => b[1] - a[1]);
      const [bestKey, _] = slotEntries[0];
      const [d, h] = bestKey.split('_');
      const daysNamesRU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
      favSlotStr = `${daysNamesRU[parseInt(d)]}, около ${h}:00`;
    }

    const avgTrackDurationMin = totalListens > 0 ? Math.round((totalDurationSec / totalListens) / 60 * 10) / 10 : 0;

    // 4. Вычисление Жанровой палитры и перевод
    const genreDict = {
      'rusrap': { name: 'Русский Рэп', color: '#9b5de5' },
      'ruspop': { name: 'Русский Поп', color: '#f15bb5' },
      'pop': { name: 'Поп-музыка', color: '#00bbf9' },
      'rap': { name: 'Рэп / Хип-хоп', color: '#3f37c9' },
      'rock': { name: 'Рок', color: '#e63946' },
      'alternative': { name: 'Альтернатива', color: '#a8dadc' },
      'electronic': { name: 'Электроника', color: '#00f5d4' },
      'dance': { name: 'Танцевальная', color: '#fee440' },
      'indie': { name: 'Инди', color: '#48cae4' },
      'metal': { name: 'Метал', color: '#1a1a1a' },
      'jazz': { name: 'Джаз', color: '#fb8500' },
      'classical': { name: 'Классика', color: '#e0e0e0' },
      'soundtrack': { name: 'Саундтреки', color: '#ffb703' },
      'rnb': { name: 'R&B', color: '#7209b7' },
      'lofi': { name: 'Лоу-фай', color: '#b5e2fa' },
      'chillout': { name: 'Чиллаут', color: '#90e0ef' },
      'latin': { name: 'Латино', color: '#ff477e' },
      'folk': { name: 'Фолк', color: '#ad2831' },
      'local-indie': { name: 'Локальный инди', color: '#0096c7' }
    };

    const top3Genres = topGenres.slice(0, 3).map(g => {
      const cleanName = g.name.toLowerCase().trim();
      const info = genreDict[cleanName] || {
        name: g.name,
        color: '#' + Math.floor((Math.abs(Math.sin(cleanName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) * 16777215) % 1) * 16777215).toString(16).padStart(6, '0')
      };
      return {
        code: g.name,
        name: g.name,
        color: info.color,
        count: g.count
      };
    });

    let paletteGradient = 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)';
    if (top3Genres.length === 1) {
      paletteGradient = `linear-gradient(135deg, ${top3Genres[0].color}20 0%, ${top3Genres[0].color}05 100%)`;
    } else if (top3Genres.length === 2) {
      paletteGradient = `linear-gradient(135deg, ${top3Genres[0].color}20 0%, ${top3Genres[1].color}10 100%)`;
    } else if (top3Genres.length >= 3) {
      paletteGradient = `linear-gradient(135deg, ${top3Genres[0].color}20 0%, ${top3Genres[1].color}12 50%, ${top3Genres[2].color}08 100%)`;
    }

    return {
      totalListens,
      totalHours: (totalDurationSec / 3600).toFixed(1),
      topTracks,
      topArtists,
      topGenres,
      eraCounts,
      listensByMonth,
      hourlyListens,
      weeklyListens,
      explicitPercentage,
      listeningPersona,
      monthlyTopTracks,
      personalRecords: {
        peakDay: peakDayStr,
        peakDayCount: peakDayCount,
        weekdayPercent,
        weekendPercent,
        favSlot: favSlotStr,
        avgTrackDurationMin
      },
      top3Genres,
      paletteGradient,
      dailyListensDuration,
      dailyListens,
      dailyTopTrack
    };
  }

  // Экспорт базы данных в JSON
  async exportData() {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readonly');
      
      const isDesktop = typeof window !== 'undefined' && 
        (window.navigator.userAgent.includes('Electron') || 
         (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendState === 'function'));

      const data = { 
        version: 1,
        source: isDesktop ? 'desktop' : 'web',
        exportedAt: new Date().toISOString(),
        listens: [], 
        tracks: [], 
        artists: [] 
      };
      
      let storesCompleted = 0;
      const checkDone = () => {
        storesCompleted++;
        if (storesCompleted === 3) resolve(JSON.stringify(data, null, 2));
      };

      transaction.objectStore('listens').getAll().onsuccess = e => { data.listens = e.target.result; checkDone(); };
      transaction.objectStore('tracks').getAll().onsuccess = e => { data.tracks = e.target.result; checkDone(); };
      transaction.objectStore('artists').getAll().onsuccess = e => { data.artists = e.target.result; checkDone(); };
    });
  }

  // Импорт базы данных из JSON (слияние)
  async importData(jsonData) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      let data;
      try {
        data = JSON.parse(jsonData);
      } catch (e) {
        return reject(new Error('Неверный формат JSON'));
      }

      const listens = data.listens;
      const tracks = data.tracks;
      const artists = data.artists;
      const source = data.source || 'unknown';

      if (!listens || !tracks || !artists) {
        return reject(new Error('Отсутствуют необходимые таблицы в JSON'));
      }

      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readwrite');
      const listensStore = transaction.objectStore('listens');
      const tracksStore = transaction.objectStore('tracks');
      const artistsStore = transaction.objectStore('artists');

      // Сохраняем tracks и artists (put сам обновит/запишет поверх)
      tracks.forEach(track => tracksStore.put(track));
      artists.forEach(artist => artistsStore.put(artist));

      // Для listens нужно избежать дубликатов.
      // Так как keyPath='id' (autoIncrement), мы не можем просто put, если id пересекаются или разные на разных ПК.
      // Лучше всего: прочитать все текущие listens, создать Set из `${trackId}-${timestamp}`
      listensStore.getAll().onsuccess = (e) => {
        const existingListens = e.target.result;
        const existingSet = new Set(existingListens.map(l => `${l.trackId}-${l.timestamp}`));

        let addedCount = 0;
        listens.forEach(listen => {
          const key = `${listen.trackId}-${listen.timestamp}`;
          if (!existingSet.has(key)) {
            // Удаляем старый id, чтобы IndexedDB сгенерировал новый (autoIncrement)
            delete listen.id;
            listensStore.add(listen);
            addedCount++;
          }
        });

        resolve({ addedCount, source });
      };

      transaction.onerror = (e) => reject(e.target.error);
    });
  }

  // Очистка всех данных в БД
  async clearAllData() {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readwrite');
      
      transaction.objectStore('listens').clear();
      transaction.objectStore('tracks').clear();
      transaction.objectStore('artists').clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e.target.error);
    });
  }
}

// Экспорт инстанса
const wrappedDB = new WrappedDB();
if (typeof window !== 'undefined') {
  window.wrappedDB = wrappedDB;
}


// --- Component: shared/wrapped/wrapped-tracker.js ---
// ==========================================
// WRAPPED TRACKER (Перехват треков)
// ==========================================

class WrappedTracker {
  constructor() {
    this.currentTrackId = null;
    this.listenLogged = false;
    this.checkInterval = null;
    
    // Трекинг чистого времени прослушивания в миллисекундах
    this.activePlaytimeMs = 0;
    this.lastCheckTime = 0;
    this.isPlaying = false;
    
    // Запускаем инициализацию с задержкой
    setTimeout(() => this.init(), 3000);
  }

  init() {
    console.log('[Wrapped Tracker] Инициализация успешна. Следим за треками через Sonata...');
    this.lastCheckTime = Date.now();
    // Запускаем интервал проверки процента прослушивания (раз в секунду)
    this.checkInterval = setInterval(() => this.checkProgress(), 1000);
  }

  getSonataTrackInfo(activePlayer) {
    try {
      const playerStateTrack = activePlayer.playbackState?.playerState?.track?.value || activePlayer.playbackState?.playerState?.track;
      const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value;
      const entityData = currentEntity?.entity?.data;
      
      const dataObj = playerStateTrack || entityData?.meta || entityData;
      if (!dataObj) return null;

      // Выводим объект Sonata и метаданные трека в консоль для анализа (отключено)
      // console.log('[Wrapped Tracker] Sonata Player:', activePlayer);
      // console.log('[Wrapped Tracker] Sonata Track Object:', dataObj);

      let duration = 0;
      if (dataObj.durationMs) {
        duration = dataObj.durationMs / 1000;
      } else if (activePlayer.playbackState?.playerState?.progress?.value?.duration) {
        duration = activePlayer.playbackState.playerState.progress.value.duration;
      }

      let artists = [];
      const rawArtists = dataObj.artists || entityData?.meta?.artists || entityData?.artists || [];
      if (Array.isArray(rawArtists)) {
        artists = rawArtists.map(a => {
          let artistCover = '';
          let name = '';
          let id = '';
          
          if (a && typeof a === 'object') {
            id = String(a.id || a.name || '');
            name = a.name || '';
            if (a.cover) {
              if (typeof a.cover === 'string') {
                artistCover = a.cover;
              } else if (a.cover.uri) {
                artistCover = a.cover.uri;
              }
            } else if (a.coverUri) {
              artistCover = a.coverUri;
            }
          } else {
            id = String(a);
          }
          
          // Если имя отсутствует в объекте Sonata (например, пришел только ID), 
          // ищем богатые метаданные в очереди (entityData)
          if ((!name || name === id) && id && entityData) {
            const entArtists = entityData.meta?.artists || entityData.artists || [];
            const found = entArtists.find(ea => String(ea.id) === id);
            if (found && found.name) {
              name = found.name;
              if (!artistCover) {
                const cov = found.cover?.uri || found.cover || found.coverUri || '';
                if (cov) artistCover = cov;
              }
            }
          }
          
          if (!name) {
            name = typeof a === 'object' ? (a.name || a.id || 'Неизвестный исполнитель') : String(a);
          }
          
          if (artistCover && !artistCover.startsWith('http') && !artistCover.startsWith('//')) {
            artistCover = 'https://' + artistCover.replace('%%', '200x200');
          }
          
          return {
            id: id || name,
            name: name,
            cover: artistCover
          };
        });
      }

      // Вытягиваем жанр и год из первого альбома
      let genre = null;
      let year = null;
      const albumObj = dataObj.albums && dataObj.albums[0] ? dataObj.albums[0] : (dataObj.album || null);
      if (albumObj) {
        genre = albumObj.genre || null;
        year = albumObj.year || null;
      }
      
      // Отметка Explicit
      const explicit = dataObj.contentWarning === 'explicit';

      return {
        trackId: String(dataObj.id || (entityData && entityData.id)),
        title: dataObj.title || 'Неизвестный трек',
        cover: dataObj.coverUri ? dataObj.coverUri.replace('%%', '400x400') : null,
        duration: duration,
        artists: artists,
        genre: genre,
        year: year,
        explicit: explicit
      };
    } catch (e) {
      console.error('[Wrapped Tracker] Error extracting track info:', e);
      return null;
    }
  }

  async checkProgress() {
    if (typeof window.getActivePlayer !== 'function') return;
    
    const activePlayer = window.getActivePlayer();
    if (!activePlayer) return;

    const trackInfo = this.getSonataTrackInfo(activePlayer);
    if (!trackInfo || !trackInfo.trackId) return;

    const now = Date.now();
    const isPause = activePlayer.playbackState?.playerState?.isPause?.value || activePlayer.playbackState?.playerState?.isPause;
    const playing = !isPause;

    // Смена трека
    if (this.currentTrackId !== trackInfo.trackId) {
      this.currentTrackId = trackInfo.trackId;
      this.listenLogged = false;
      this.activePlaytimeMs = 0;
      this.lastCheckTime = now;
      this.isPlaying = playing;
      console.log(`[Wrapped Tracker] Новый трек: ${trackInfo.title}`);
      
      // Логируем полные данные для анализа
      const playerStateTrack = activePlayer.playbackState?.playerState?.track?.value || activePlayer.playbackState?.playerState?.track;
      const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value;
      const entityData = currentEntity?.entity?.data;
      const rawTrackObj = playerStateTrack || entityData?.meta || entityData;
      
      console.log('[Wrapped Tracker] Sonata Player Object:', activePlayer);
      console.log('[Wrapped Tracker] Sonata Raw Track Object:', rawTrackObj);
      console.log('[Wrapped Tracker] Extracted Track Info:', trackInfo);
      
      return;
    }

    // Если плеер физически воспроизводит трек, копим время
    if (this.isPlaying && playing) {
      const delta = now - this.lastCheckTime;
      // Предохранитель от просыпания вкладки / лагов системы
      if (delta > 0 && delta < 5000) {
        this.activePlaytimeMs += delta;
      }
    }
    
    this.isPlaying = playing;
    this.lastCheckTime = now;

    if (this.listenLogged) return;

    const progress = activePlayer.playbackState?.playerState?.progress?.value;
    if (!progress || !progress.position || !trackInfo.duration) return;

    const playtimeSec = this.activePlaytimeMs / 1000;
    const duration = trackInfo.duration;
    
    // Считаем прослушивание по стандарту Last.fm/Spotify: 
    // 50% от трека или 240 секунд (что наступит раньше),
    // при этом трек должен физически проигрываться не менее 30 секунд.
    const threshold = Math.min(duration / 2, 240);

    if (playtimeSec >= 30 && playtimeSec >= threshold && threshold > 0) {
      this.listenLogged = true; // Отмечаем, чтобы не дублировать
      await this.saveListen(trackInfo);
    }
  }

  async saveListen(track) {
    try {
      const trackData = {
        id: track.trackId,
        title: track.title,
        cover: track.cover,
        duration: track.duration,
        artists: track.artists,
        genre: track.genre,
        year: track.year,
        explicit: track.explicit
      };

      if (window.wrappedDB) {
        await window.wrappedDB.addListen(trackData);
        console.log(`[Wrapped Tracker] Засчитано прослушивание: ${trackData.title}`);
        
        // Обновляем статистику в UI если она открыта
        if (typeof updateWrappedUI === 'function') {
          updateWrappedUI();
        }
      } else {
        console.warn('[Wrapped Tracker] wrappedDB не найден, прослушивание не сохранено.');
      }
    } catch (e) {
      console.error('[Wrapped Tracker] Ошибка при сохранении прослушивания:', e);
    }
  }
}

// Запускаем трекер
if (typeof window !== 'undefined') {
  window.wrappedTracker = new WrappedTracker();
}


// --- Component: shared/wrapped/wrapped-charts.js ---
// ==========================================
// WRAPPED CHARTS (Отрисовка статистики)
// ==========================================

let artistsChartInstance = null;
let tracksChartInstance = null;
let monthsChartInstance = null;
let genresChartInstance = null;
let erasChartInstance = null;
let hoursChartInstance = null;
let daysChartInstance = null;

async function renderWrappedCharts() {
  const containerOverview = document.getElementById('ym-wrapped-tab-overview');
  const containerArtists = document.getElementById('ym-wrapped-tab-artists');
  const containerTracks = document.getElementById('ym-wrapped-tab-tracks');
  const containerGenres = document.getElementById('ym-wrapped-tab-genres');
  const containerCalendar = document.getElementById('ym-wrapped-tab-calendar');
  const containerActivity = document.getElementById('ym-wrapped-tab-activity');
  const containerSettings = document.getElementById('ym-wrapped-tab-settings');

  if (!containerOverview) return;

  if (!window.wrappedDB) {
    containerOverview.innerHTML = '<div style="color:red; text-align:center;">Ошибка: База данных недоступна</div>';
    return;
  }

  try {
    const stats = await window.wrappedDB.getStats();
    
    if (stats.totalListens === 0) {
      const emptyMsg = `
        <div style="text-align: center; color: rgba(255,255,255,0.5); margin-top: 100px;">
          <h2 style="font-size: 32px; color: white;">Пока нет данных 🥺</h2>
          <p style="font-size: 18px;">Послушайте несколько треков, чтобы статистика начала собираться!</p>
        </div>
      `;
      containerOverview.innerHTML = emptyMsg;
      containerArtists.innerHTML = emptyMsg;
      containerTracks.innerHTML = emptyMsg;
      containerGenres.innerHTML = emptyMsg;
      if (containerCalendar) containerCalendar.innerHTML = emptyMsg;
      containerActivity.innerHTML = emptyMsg;
      renderSettingsTab(containerSettings);
      return;
    }

    // Общие настройки Chart.js для темной темы
    Chart.defaults.color = 'rgba(255, 255, 255, 0.6)';
    Chart.defaults.font.family = '"YS Text", sans-serif';

    // Рендер вкладки Обзор
    renderOverviewTab(containerOverview, stats);
    
    // Рендер вкладки Артисты
    renderArtistsTab(containerArtists, stats);
    
    // Рендер вкладки Треки
    renderTracksTab(containerTracks, stats);

    // Рендер вкладки Жанры и Эпохи
    renderGenresTab(containerGenres, stats);

    // Рендер вкладки Календарь
    if (containerCalendar) {
      renderCalendarTab(containerCalendar, stats);
    }

    // Рендер вкладки Активность
    renderActivityTab(containerActivity, stats);

    // Рендер вкладки Настройки
    renderSettingsTab(containerSettings);

  } catch (err) {
    console.error('Ошибка рендеринга графиков:', err);
    containerOverview.innerHTML = '<div style="color:red;">Ошибка при загрузке статистики.</div>';
  }
}

function renderOverviewTab(container, stats) {
  container.innerHTML = `
    <h2 style="font-size: 32px; margin-top: 0; margin-bottom: 20px; flex-shrink: 0;">Обзор</h2>
    <div class="ym-wrapped-row" style="margin-bottom: 20px; flex-shrink: 0;">
      <div class="ym-glass-card" style="flex: 1.2; background: linear-gradient(135deg, rgba(204, 0, 255, 0.12) 0%, rgba(255, 140, 0, 0.12) 100%) !important; border: 1px dashed rgba(255, 255, 255, 0.15) !important; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
        <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: white;">Твои Музыкальные Итоги</h3>
        <button id="ym-stories-overview-btn" style="background: linear-gradient(135deg, #cc00ff 0%, #ff8c00 100%); border: none; border-radius: 12px; color: white; padding: 10px 20px; font-size: 14px; font-weight: bold; cursor: pointer; transition: transform 0.2s; font-family: inherit; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          Посмотреть Истории
        </button>
      </div>
      <div class="ym-glass-card" style="flex: 0.9; padding: 20px; text-align: center; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-size: 36px; font-weight: bold; color: #ffdb4d; line-height: 1.2;">${stats.totalListens}</div>
        <div style="font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">Треков прослушано</div>
      </div>
      <div class="ym-glass-card" style="flex: 0.9; padding: 20px; text-align: center; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-size: 36px; font-weight: bold; color: #ff8c00; line-height: 1.2;">${stats.totalHours}</div>
        <div style="font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">Часов музыки</div>
      </div>
    </div>
    
    <div class="ym-wrapped-columns" style="flex: 1; min-height: 0; gap: 20px;">
      <div style="flex: 0.9; display: flex; flex-direction: column; gap: 20px; min-height: 0;">
        <div class="ym-glass-card" style="padding: 20px; display: flex; align-items: center; gap: 20px;">
          <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #cc00ff, #ff8c00); display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; box-shadow: 0 4px 15px rgba(204, 0, 255, 0.3);">🎭</div>
          <div style="min-width: 0;">
            <div style="font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px;">Музыкальный психотип</div>
            <div style="font-size: 16px; font-weight: bold; color: #ffdb4d; margin-top: 2px;">${stats.listeningPersona.name}</div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 4px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${stats.listeningPersona.description}</div>
          </div>
        </div>
        
        <div class="ym-glass-card" style="padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 10px; min-height: 0;">
          <h3 style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Личные Рекорды</h3>
          
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
            <span style="color: rgba(255,255,255,0.4);">Самый активный день:</span>
            <span style="font-weight: 500; text-align: right; color: white;">${stats.personalRecords.peakDay} <span style="color: #ffdb4d; font-weight: bold;">(${stats.personalRecords.peakDayCount} тр.)</span></span>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
            <span style="color: rgba(255,255,255,0.4);">Любимое время:</span>
            <span style="font-weight: 500; text-align: right; color: #ff8c00;">${stats.personalRecords.favSlot}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
            <span style="color: rgba(255,255,255,0.4);">Будни vs Выходные:</span>
            <span style="font-weight: 500; text-align: right; color: white;">${stats.personalRecords.weekdayPercent}% / ${stats.personalRecords.weekendPercent}%</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
            <span style="color: rgba(255,255,255,0.4);">Средняя длина трека:</span>
            <span style="font-weight: 500; text-align: right; color: white;">${stats.personalRecords.avgTrackDurationMin} мин.</span>
          </div>
        </div>
      </div>
      
      <div class="ym-glass-card" style="flex: 1.1; min-height: 0; padding: 25px; display: flex; flex-direction: column;">
        <h3 style="margin-top: 0; margin-bottom: 15px; color: rgba(255,255,255,0.8); flex-shrink: 0;">Активность по месяцам</h3>
        <div style="flex: 1; min-height: 0; position: relative;">
          <canvas id="ym-chart-months"></canvas>
        </div>
      </div>
    </div>
  `;

  const overviewBtn = container.querySelector('#ym-stories-overview-btn');
  if (overviewBtn) {
    overviewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (typeof window.openWrappedStories === 'function') {
        window.openWrappedStories(stats);
      }
    });
  }

  const ctxMonths = document.getElementById('ym-chart-months').getContext('2d');
  if (monthsChartInstance) monthsChartInstance.destroy();

  const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  
  // Создаем градиент для графика активности по месяцам
  const chartGradient = ctxMonths.createLinearGradient(0, 0, 0, 200);
  chartGradient.addColorStop(0, 'rgba(255, 140, 0, 0.3)');
  chartGradient.addColorStop(1, 'rgba(255, 140, 0, 0.0)');

  monthsChartInstance = new Chart(ctxMonths, {
    type: 'line',
    data: {
      labels: monthNames,
      datasets: [{
        label: 'Треков',
        data: stats.listensByMonth,
        borderColor: '#ff8c00',
        backgroundColor: chartGradient,
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderArtistsTab(container, stats) {
  // Вычисляем количество артистов под высоту экрана
  const viewportHeight = window.innerHeight;
  let topCount = 5;
  if (viewportHeight < 720) {
    topCount = 3;
  } else if (viewportHeight > 900) {
    topCount = 7;
  }

  const mainArtists = stats.topArtists.slice(0, topCount);
  const otherArtists = stats.topArtists.slice(topCount);

  let listHtml = '';
  mainArtists.forEach((a, i) => {
    const min = Math.round(a.duration / 60);
    const coverUrl = a.artist && a.artist.cover ? a.artist.cover : 'https://music.yandex.ru/blocks/playlist-cover/playlist-cover_like.png';
    listHtml += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="display: flex; align-items: center; font-size: 16px; min-width: 0;">
          <span style="color: rgba(255,255,255,0.4); margin-right: 15px; width: 20px; display: inline-block; text-align: center; flex-shrink: 0;">${i+1}</span>
          <img src="${coverUrl}" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 15px; object-fit: cover; flex-shrink: 0;">
          <span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.artist ? a.artist.name : 'Неизвестный'}</span>
        </div>
        <div style="color: #ffdb4d; font-weight: bold; flex-shrink: 0; margin-left: 10px;">${min} мин.</div>
      </div>
    `;
  });

  if (otherArtists.length > 0) {
    const otherMin = otherArtists.reduce((sum, a) => sum + Math.round(a.duration / 60), 0);
    listHtml += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="display: flex; align-items: center; font-size: 16px; min-width: 0;">
          <span style="color: rgba(255,255,255,0.4); margin-right: 15px; width: 20px; display: inline-block; text-align: center; flex-shrink: 0;">-</span>
          <div style="width: 40px; height: 40px; border-radius: 50%; margin-right: 15px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: rgba(255,255,255,0.4);"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <span style="font-weight: 500; color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Другие (${otherArtists.length})</span>
        </div>
        <div style="color: rgba(255,255,255,0.6); font-weight: bold; flex-shrink: 0; margin-left: 10px;">${otherMin} мин.</div>
      </div>
    `;
  }

  container.innerHTML = `
    <h2 style="font-size: 32px; margin-top: 0; margin-bottom: 20px; flex-shrink: 0;">Топ Артистов</h2>
    <div class="ym-wrapped-columns">
      <div class="ym-glass-card" style="flex: 1.1; padding: 25px; display: flex; flex-direction: column; min-height: 0;">
        <div style="flex: 1; min-height: 0; position: relative;">
          <canvas id="ym-chart-artists"></canvas>
        </div>
      </div>
      <div class="ym-glass-card" style="flex: 0.9; padding: 25px; display: flex; flex-direction: column; min-height: 0;">
        <h3 style="margin-top: 0; margin-bottom: 15px; flex-shrink: 0;">Лидеры по времени</h3>
        <div style="flex: 1; overflow-y: auto; min-height: 0; padding-right: 5px;">
          ${listHtml}
        </div>
      </div>
    </div>
  `;

  const ctxArtists = document.getElementById('ym-chart-artists').getContext('2d');
  if (artistsChartInstance) artistsChartInstance.destroy();
  
  const labels = mainArtists.map(a => a.artist ? a.artist.name : 'Неизвестный');
  const data = mainArtists.map(a => Math.round(a.duration / 60));
  const colors = ['#ffdb4d', '#ff8c00', '#ff4d4d', '#cc00ff', '#4d4dff', '#00f2fe', '#4facfe'];
  const sliceColors = colors.slice(0, topCount);

  if (otherArtists.length > 0) {
    labels.push('Другие');
    const otherDurationMin = otherArtists.reduce((sum, a) => sum + Math.round(a.duration / 60), 0);
    data.push(otherDurationMin);
    sliceColors.push('rgba(255,255,255,0.15)');
  }

  artistsChartInstance = new Chart(ctxArtists, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: sliceColors,
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (context) => ` ${context.label}: ${context.raw} мин.`
          }
        }
      }
    }
  });
}

function renderTracksTab(container, stats) {
  let cardsHtml = '';
  stats.topTracks.slice(0, 10).forEach((t, i) => {
    const title = t.track ? t.track.title : 'Неизвестно';
    let coverUrl = t.track && t.track.cover ? t.track.cover : 'https://music.yandex.ru/blocks/playlist-cover/playlist-cover_like.png';
    if (coverUrl && !coverUrl.startsWith('http') && !coverUrl.startsWith('//')) {
      coverUrl = 'https://' + coverUrl;
    }
    const artistName = t.track && t.track.artists && t.track.artists.length > 0 
      ? t.track.artists.map(a => a.name || String(a)).join(', ') 
      : '';
    
    cardsHtml += `
      <div style="display: flex; align-items: center; background: rgba(255,255,255,0.03); border-radius: 12px; padding: 10px; transition: background 0.2s; font-size: 15px;">
        <div style="width: 25px; text-align: center; color: rgba(255,255,255,0.4); font-weight: bold; margin-right: 10px; flex-shrink: 0;">${i+1}</div>
        <img src="${coverUrl}" style="width: 44px; height: 44px; border-radius: 8px; margin-right: 15px; object-fit: cover; flex-shrink: 0;">
        <div style="flex: 1; overflow: hidden; min-width: 0;">
          <div style="font-weight: 500; font-size: 15px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${title}</div>
          <div style="color: rgba(255,255,255,0.5); font-size: 13px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${artistName}</div>
        </div>
        <div style="margin-left: 15px; font-weight: bold; color: #ffdb4d; flex-shrink: 0;">${t.count} <span style="font-size: 12px; font-weight: normal; color: rgba(255,255,255,0.4);">раз</span></div>
      </div>
    `;
  });

  container.innerHTML = `
    <h2 style="font-size: 32px; margin-top: 0; margin-bottom: 20px; flex-shrink: 0;">Топ Треков</h2>
    <div class="ym-wrapped-columns">
      <div class="ym-glass-card" style="flex: 1; padding: 25px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; min-height: 0; padding-right: 5px;">
        ${cardsHtml}
      </div>
      <div class="ym-glass-card" style="flex: 1; padding: 25px; display: flex; flex-direction: column; min-height: 0;">
        <div style="flex: 1; min-height: 0; position: relative;">
          <canvas id="ym-chart-tracks"></canvas>
        </div>
      </div>
    </div>
  `;

  const ctxTracks = document.getElementById('ym-chart-tracks').getContext('2d');
  if (tracksChartInstance) tracksChartInstance.destroy();

  tracksChartInstance = new Chart(ctxTracks, {
    type: 'bar',
    data: {
      labels: stats.topTracks.slice(0, 5).map(t => t.track ? t.track.title.substring(0, 15) + '...' : 'Unknown'),
      datasets: [{
        label: 'Прослушиваний',
        data: stats.topTracks.slice(0, 5).map(t => t.count),
        backgroundColor: 'rgba(255, 219, 77, 0.8)',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderSettingsTab(container) {
  container.innerHTML = `
    <h2 style="font-size: 36px; margin-top: 0;">Данные и Экспорт</h2>
    <div class="ym-glass-card" style="padding: 30px; max-width: 600px;">
      <p style="color: rgba(255,255,255,0.7); margin-bottom: 30px;">
        Вы можете выгрузить всю историю прослушиваний в файл, чтобы перенести её на другой компьютер (например, с работы домой) или просто сохранить для себя.
      </p>
      
      <div style="display: flex; gap: 20px; margin-bottom: 30px;">
        <button id="ym-wrapped-export-btn" style="flex: 1; padding: 15px; border-radius: 12px; border: none; background: #ffdb4d; color: black; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Экспорт в JSON
        </button>
        <button id="ym-wrapped-import-btn" style="flex: 1; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: white; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          Импорт JSON
        </button>
      </div>
      
      <input type="file" id="ym-wrapped-import-file" accept=".json" style="display: none;">
      
      <div id="ym-wrapped-data-status" style="color: #4CAF50; font-weight: 500; min-height: 20px; margin-bottom: 20px;"></div>

      <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
        <button id="ym-wrapped-clear-btn" style="width: 100%; padding: 15px; border-radius: 12px; border: 1px solid #ff4d4d; background: transparent; color: #ff4d4d; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          Очистить всю статистику
        </button>
      </div>
    </div>
  `;

  // Обработчики
  const exportBtn = document.getElementById('ym-wrapped-export-btn');
  const importBtn = document.getElementById('ym-wrapped-import-btn');
  const fileInput = document.getElementById('ym-wrapped-import-file');
  const statusDiv = document.getElementById('ym-wrapped-data-status');
  const clearBtn = document.getElementById('ym-wrapped-clear-btn');

  // Экспорт
  exportBtn.addEventListener('click', async () => {
    exportBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: -2px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Подготовка...';
    try {
      const jsonStr = await window.wrappedDB.exportData();
      
      const isDesktop = typeof window !== 'undefined' && 
        (window.navigator.userAgent.includes('Electron') || 
         (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendState === 'function'));

      const filename = `betteryandexmusic_wrapped_data_${new Date().toISOString().split('T')[0]}.json`;

      if (isDesktop) {
        // На десктопе сохраняем напрямую через Node.js мост, так как обычное скачивание Blobs не работает
        const requestId = `write_file_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        
        const handler = (event) => {
          if (!event.data || !event.data.__ym_sc_bridge_response || event.data.requestId !== requestId) return;
          window.removeEventListener('message', handler);
          
          const response = event.data.response;
          if (response && response.ok) {
            // Если сохранен через диалог, путь может отличаться от Рабочего стола
            const savedFilename = response.filePath ? response.filePath.split(/[/\\]/).pop() : filename;
            statusDiv.innerText = `✅ Успешно экспортировано: ${savedFilename}`;
            statusDiv.style.color = '#4CAF50';
          } else {
            if (response.error === 'Cancelled') {
              statusDiv.innerText = 'Экспорт отменен пользователем.';
              statusDiv.style.color = '#ffdb4d';
            } else {
              statusDiv.innerText = `Ошибка записи файла: ${response.error || 'Unknown error'}`;
              statusDiv.style.color = '#ff4d4d';
            }
          }
          exportBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: -2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Экспорт в JSON';
        };
        
        window.addEventListener('message', handler);
        
        window.postMessage({
          __ym_sc_bridge: true,
          requestId,
          type: 'WRITE_FILE',
          payload: { filename, content: jsonStr }
        }, '*');

      } else {
        // Обычное скачивание для веб-версии
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        statusDiv.innerText = 'Данные успешно экспортированы!';
        statusDiv.style.color = '#4CAF50';
        exportBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: -2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Экспорт в JSON';
      }
    } catch (e) {
      console.error(e);
      statusDiv.innerText = 'Ошибка экспорта данных.';
      statusDiv.style.color = '#ff4d4d';
      exportBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: -2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Экспорт в JSON';
    }
  });

  // Импорт
  importBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    statusDiv.innerText = 'Чтение файла...';
    statusDiv.style.color = 'white';

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        statusDiv.innerText = 'Объединение данных...';
        const res = await window.wrappedDB.importData(event.target.result);
        
        let sourceStr = 'неизвестного источника';
        if (res.source === 'web') sourceStr = 'веб-версии';
        if (res.source === 'desktop') sourceStr = 'десктоп-приложения';
        
        statusDiv.innerText = `Импорт из ${sourceStr} успешно завершен! Добавлено новых записей: ${res.addedCount}.`;
        statusDiv.style.color = '#4CAF50';
        
        // Обновляем графики если нужно
        if (typeof window.renderWrappedCharts === 'function') {
          setTimeout(() => window.renderWrappedCharts(), 2000);
        }
      } catch (err) {
        console.error(err);
        statusDiv.innerText = '❌ Ошибка импорта: ' + err.message;
        statusDiv.style.color = '#ff4d4d';
      }
      fileInput.value = '';
    };
    reader.onerror = () => {
      statusDiv.innerText = 'Ошибка чтения файла.';
      statusDiv.style.color = '#ff4d4d';
    };
    reader.readAsText(file);
  });

  // Очистка данных
  clearBtn.addEventListener('click', async () => {
    const confirmed = confirm('Вы уверены, что хотите полностью стереть локальную статистику? Все прослушивания будут безвозвратно удалены.');
    if (!confirmed) return;

    clearBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: -2px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Очистка...';
    try {
      await window.wrappedDB.clearAllData();
      statusDiv.innerText = 'База данных статистики успешно очищена.';
      statusDiv.style.color = '#ff4d4d';
      
      // Перерисовываем пустую страницу
      if (typeof window.renderWrappedCharts === 'function') {
        setTimeout(() => window.renderWrappedCharts(), 1500);
      }
    } catch(err) {
      console.error(err);
      statusDiv.innerText = 'Ошибка очистки: ' + err.message;
      statusDiv.style.color = '#ff4d4d';
    } finally {
      clearBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: -2px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>Очистить всю статистику';
    }
  });
}

function renderGenresTab(container, stats) {
  let genresListHtml = '';
  stats.topGenres.slice(0, 5).forEach((g, i) => {
    genresListHtml += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 15px;">
        <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          <span style="color: rgba(255,255,255,0.4); margin-right: 15px; width: 20px; display: inline-block;">${i+1}</span>
          ${g.name}
        </div>
        <div style="color: #ffdb4d; font-weight: bold; flex-shrink: 0; margin-left: 10px;">${g.count} треков</div>
      </div>
    `;
  });

  if (stats.topGenres.length === 0) {
    genresListHtml = '<p style="color: rgba(255,255,255,0.5); font-size: 14px;">Жанры не определены.</p>';
  }

  container.innerHTML = `
    <h2 style="font-size: 32px; margin-top: 0; margin-bottom: 20px; flex-shrink: 0;">Жанры и Эпохи</h2>
    <div class="ym-wrapped-columns" style="flex: 1.2; margin-bottom: 20px;">
      <div class="ym-glass-card" style="flex: 1.2; padding: 20px; display: flex; flex-direction: column; min-height: 0;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; flex-shrink: 0;">Популярные Жанры</h3>
        <div style="flex: 1; min-height: 0; position: relative;">
          <canvas id="ym-chart-genres"></canvas>
        </div>
      </div>
      <div class="ym-glass-card" style="flex: 0.8; padding: 20px; display: flex; flex-direction: column; min-height: 0;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; flex-shrink: 0;">Распределение по Эпохам</h3>
        <div style="flex: 1; min-height: 0; position: relative;">
          <canvas id="ym-chart-eras"></canvas>
        </div>
      </div>
    </div>
    
    <div class="ym-wrapped-columns" style="flex: 0.8; gap: 20px;">
      <div class="ym-glass-card" style="flex: 1.1; padding: 20px; display: flex; flex-direction: column; min-height: 0;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; flex-shrink: 0;">Топ-5 Жанров</h3>
        <div style="flex: 1; overflow-y: auto; min-height: 0; padding-right: 5px;">
          ${genresListHtml}
        </div>
      </div>
      <div style="flex: 0.9; display: flex; flex-direction: column; gap: 20px; min-height: 0;">
        <div class="ym-glass-card" style="padding: 20px; display: flex; flex-direction: column; justify-content: center; min-height: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
            <div style="flex: 1; min-width: 0;">
              <h3 style="margin: 0; font-size: 16px; color: #ff4d4d; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Индекс Explicit</h3>
              <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.5); font-size: 12px; line-height: 1.3;">Доля треков с нецензурной лексикой</p>
            </div>
            <div style="flex: 1; max-width: 150px; display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
              <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.08); border-radius: 5px; overflow: hidden;">
                <div style="width: ${stats.explicitPercentage}%; height: 100%; background: linear-gradient(90deg, #ff4d4d, #ff2222); border-radius: 5px;"></div>
              </div>
              <div style="font-size: 16px; font-weight: bold; color: #ff4d4d; min-width: 35px; text-align: right;">${stats.explicitPercentage}%</div>
            </div>
          </div>
        </div>
        
        <div class="ym-glass-card" style="padding: 16px 20px; flex: 1; display: flex; align-items: center; gap: 15px; background: ${stats.paletteGradient} !important; border: 1px solid rgba(255,255,255,0.08);">
          <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">🎨</div>
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px;">Жанровая палитра</div>
            <div style="font-size: 13px; font-weight: bold; color: white; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${stats.top3Genres.map(g => g.name).join(' • ')}">
              ${stats.top3Genres.map(g => g.name).join(' • ') || 'Не определено'}
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Смесь ваших любимых стилей</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // 1. Отрисовка графика Жанров (Горизонтальный Bar)
  const ctxGenres = document.getElementById('ym-chart-genres').getContext('2d');
  if (genresChartInstance) genresChartInstance.destroy();
  
  genresChartInstance = new Chart(ctxGenres, {
    type: 'bar',
    data: {
      labels: stats.topGenres.slice(0, 5).map(g => g.name),
      datasets: [{
        data: stats.topGenres.slice(0, 5).map(g => g.count),
        backgroundColor: 'rgba(255, 219, 77, 0.85)',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, beginAtZero: true },
        y: { grid: { display: false } }
      }
    }
  });

  // 2. Отрисовка графика Эпох (Doughnut)
  const ctxEras = document.getElementById('ym-chart-eras').getContext('2d');
  if (erasChartInstance) erasChartInstance.destroy();

  const erasLabels = ['2020-е', '2010-е', '2000-е', '90-е', 'Ранее'];
  const erasData = [
    stats.eraCounts['2020s'] || 0,
    stats.eraCounts['2010s'] || 0,
    stats.eraCounts['2000s'] || 0,
    stats.eraCounts['90s'] || 0,
    stats.eraCounts['Earlier'] || 0
  ];
  
  // Отсекаем неиспользуемые эпохи
  const activeLabels = [];
  const activeData = [];
  erasData.forEach((val, index) => {
    if (val > 0) {
      activeLabels.push(erasLabels[index]);
      activeData.push(val);
    }
  });

  erasChartInstance = new Chart(ctxEras, {
    type: 'doughnut',
    data: {
      labels: activeLabels.length > 0 ? activeLabels : ['Нет данных'],
      datasets: [{
        data: activeData.length > 0 ? activeData : [1],
        backgroundColor: activeData.length > 0 ? ['#ffdb4d', '#ff8c00', '#ff4d4d', '#cc00ff', '#4d4dff'] : ['rgba(255,255,255,0.05)'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function renderActivityTab(container, stats) {
  container.innerHTML = `
    <h2 style="font-size: 32px; margin-top: 0; margin-bottom: 20px; flex-shrink: 0;">Активность</h2>
    <div style="display: flex; flex-direction: column; gap: 20px; flex: 1; min-height: 0;">
      <div class="ym-glass-card" style="flex: 1.1; min-height: 0; display: flex; flex-direction: column; padding: 20px;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; flex-shrink: 0;">Прослушивания по времени суток</h3>
        <div style="flex: 1; min-height: 0; position: relative;">
          <canvas id="ym-chart-hours"></canvas>
        </div>
      </div>
      <div class="ym-glass-card" style="flex: 0.9; min-height: 0; display: flex; flex-direction: column; padding: 20px;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; flex-shrink: 0;">Активность по дням недели</h3>
        <div style="flex: 1; min-height: 0; position: relative;">
          <canvas id="ym-chart-days"></canvas>
        </div>
      </div>
    </div>
  `;

  // 1. График по часам (Area Chart / Line)
  const ctxHours = document.getElementById('ym-chart-hours').getContext('2d');
  if (hoursChartInstance) hoursChartInstance.destroy();

  const gradient = ctxHours.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(255, 219, 77, 0.45)');
  gradient.addColorStop(1, 'rgba(255, 219, 77, 0.0)');

  hoursChartInstance = new Chart(ctxHours, {
    type: 'line',
    data: {
      labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
      datasets: [{
        label: 'Прослушивания',
        data: stats.hourlyListens,
        borderColor: '#ffdb4d',
        borderWidth: 3,
        fill: true,
        backgroundColor: gradient,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' } },
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });

  // 2. График по дням недели (Bar Chart)
  const ctxDays = document.getElementById('ym-chart-days').getContext('2d');
  if (daysChartInstance) daysChartInstance.destroy();

  const orderedDaysLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const orderedDaysData = [
    stats.weeklyListens[1] || 0, // Пн
    stats.weeklyListens[2] || 0, // Вт
    stats.weeklyListens[3] || 0, // Ср
    stats.weeklyListens[4] || 0, // Чт
    stats.weeklyListens[5] || 0, // Пт
    stats.weeklyListens[6] || 0, // Сб
    stats.weeklyListens[0] || 0  // Вс
  ];

  daysChartInstance = new Chart(ctxDays, {
    type: 'bar',
    data: {
      labels: orderedDaysLabels,
      datasets: [{
        data: orderedDaysData,
        backgroundColor: 'rgba(255, 140, 0, 0.85)',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderCalendarTab(container, stats) {
  try {
    // 1. Построение GitHub-style Heatmap прослушиваний по дням
    const today = new Date();
    const endDate = new Date(today);
    const dayOfWeek = endDate.getDay(); // 0 = Sun, 6 = Sat
    // Сдвигаем endDate на конец текущей недели (суббота), чтобы сетка была ровной
    endDate.setDate(endDate.getDate() + (6 - dayOfWeek));
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 370); // 53 недели назад (53 * 7 = 371 день)

    const weeks = [];
    let currentWeek = [];
    
    let curr = new Date(startDate);
    // Накапливаем список месяцев и индекс колонки, в которой этот месяц начинается
    const monthLabels = []; // { name, colIndex }
    let lastMonth = -1;
    let colIndex = 0;

    while (curr <= endDate) {
      // Вычисляем dateStr ВСЕГДА в локальном часовом поясе, чтобы синхронизировать с wrapped-db.js
      const dateStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;

      const durationSec = stats.dailyListensDuration ? (stats.dailyListensDuration[dateStr] || 0) : 0;
      const durationMin = Math.round(durationSec / 60);
      
      currentWeek.push({
        dateStr,
        date: new Date(curr),
        durationMin
      });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        // Проверяем месяц первого дня в новой неделе
        const m = curr.getMonth();
        if (m !== lastMonth) {
          monthLabels.push({
            name: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'][m],
            colIndex: colIndex
          });
          lastMonth = m;
        }
        currentWeek = [];
        colIndex++;
      }
      
      curr.setDate(curr.getDate() + 1);
    }

    // Рендерим HTML для Heatmap с использованием единого CSS Grid для полной отзывчивости
    let cellsHtml = '';
    
    // 1. Добавляем подписи дней недели в 1-ю колонку
    cellsHtml += `<div style="grid-column: 1; grid-row: 2; font-size: 9px; color: rgba(255,255,255,0.3); align-self: center; padding-right: 8px; user-select: none;">Вс</div>`;
    cellsHtml += `<div style="grid-column: 1; grid-row: 4; font-size: 9px; color: rgba(255,255,255,0.3); align-self: center; padding-right: 8px; user-select: none;">Вт</div>`;
    cellsHtml += `<div style="grid-column: 1; grid-row: 6; font-size: 9px; color: rgba(255,255,255,0.3); align-self: center; padding-right: 8px; user-select: none;">Чт</div>`;
    cellsHtml += `<div style="grid-column: 1; grid-row: 8; font-size: 9px; color: rgba(255,255,255,0.3); align-self: center; padding-right: 8px; user-select: none;">Сб</div>`;

    // 2. Добавляем названия месяцев в 1-ю строчку
    monthLabels.forEach(ml => {
      cellsHtml += `
        <div style="grid-column: ${ml.colIndex + 2}; grid-row: 1; font-size: 9px; color: rgba(255,255,255,0.3); text-align: left; overflow: visible; white-space: nowrap; user-select: none; margin-bottom: 5px; width: 0; min-width: 0;">
          ${ml.name}
        </div>
      `;
    });

    // 3. Добавляем сами ячейки дней
    weeks.forEach((week, colIdx) => {
      week.forEach((day, dayIdx) => {
        if (!day) return;
        
        let bgColor = 'rgba(255, 255, 255, 0.04)';
        let borderStyle = '1px solid rgba(255, 255, 255, 0.02)';
        if (day.durationMin > 0 && day.durationMin <= 10) {
          bgColor = 'rgba(204, 0, 255, 0.2)';
        } else if (day.durationMin > 10 && day.durationMin <= 30) {
          bgColor = 'rgba(204, 0, 255, 0.55)';
        } else if (day.durationMin > 30 && day.durationMin <= 60) {
          bgColor = 'rgba(255, 140, 0, 0.6)';
        } else if (day.durationMin > 60) {
          bgColor = '#ff8c00';
        }
        
        const tracksCount = stats.dailyListens ? (stats.dailyListens[day.dateStr] || 0) : 0;
        const topTrack = stats.dailyTopTrack ? stats.dailyTopTrack[day.dateStr] : null;
        
        const monthsNamesRU_lower = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        const formatStr = `${day.date.getDate()} ${monthsNamesRU_lower[day.date.getMonth()]} ${day.date.getFullYear()}`;
        
        let tooltip = `${formatStr}\n• ${day.durationMin} мин. музыки\n• ${tracksCount} треков`;
        if (topTrack) {
          tooltip += `\n• Топ: ${topTrack.title} — ${topTrack.artist}`;
        }
        
        cellsHtml += `
          <div 
            class="ym-heatmap-cell"
            style="grid-column: ${colIdx + 2}; grid-row: ${dayIdx + 2}; width: 100%; aspect-ratio: 1; border-radius: 2px; background: ${bgColor}; border: ${borderStyle}; cursor: pointer; box-sizing: border-box;" 
            data-tooltip="${tooltip.replace(/"/g, '&quot;')}">
          </div>
        `;
      });
    });

    const heatmapCardHtml = `
      <div class="ym-glass-card" style="padding: 20px; margin-bottom: 25px; display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: rgba(255,255,255,0.8); font-weight: bold;">Карта активности (минут прослушивания)</h3>
        <div style="overflow-x: auto; padding-bottom: 10px; width: 100%; box-sizing: border-box;">
          <div style="display: grid; grid-template-columns: auto repeat(53, 1fr); grid-template-rows: auto repeat(7, 1fr); gap: 3px; width: 100%; min-width: 650px; align-items: center; box-sizing: border-box;">
            ${cellsHtml}
          </div>
        </div>
        
        <!-- Легенда -->
        <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 10px; font-size: 11px; color: rgba(255,255,255,0.4); user-select: none;">
          <span>Меньше</span>
          <div style="display: flex; gap: 3px; margin: 0 8px;">
            <div style="width: 10px; height: 10px; border-radius: 2px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.02);"></div>
            <div style="width: 10px; height: 10px; border-radius: 2px; background: rgba(204, 0, 255, 0.2);"></div>
            <div style="width: 10px; height: 10px; border-radius: 2px; background: rgba(204, 0, 255, 0.55);"></div>
            <div style="width: 10px; height: 10px; border-radius: 2px; background: rgba(255, 140, 0, 0.6);"></div>
            <div style="width: 10px; height: 10px; border-radius: 2px; background: #ff8c00;"></div>
          </div>
          <span>Больше</span>
        </div>
      </div>
    `;

  // 2. Построение сетки треков по месяцам
  const monthNamesRU = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  let gridHtml = '';

  for (let m = 0; m < 12; m++) {
    const trackInfo = stats.monthlyTopTracks[m];
    
    if (trackInfo) {
      gridHtml += `
        <div class="ym-glass-card" style="padding: 15px; display: flex; align-items: center; gap: 12px; min-width: 0; box-sizing: border-box;">
          <img src="${trackInfo.cover}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px;">${monthNamesRU[m]}</div>
            <div style="font-size: 13px; font-weight: bold; color: white; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${trackInfo.title}">${trackInfo.title}</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${trackInfo.artist}">${trackInfo.artist}</div>
          </div>
          <div style="font-size: 11px; color: #ffdb4d; font-weight: bold; flex-shrink: 0; margin-left: 5px; text-align: right;">
            ${trackInfo.count} <span style="font-size: 9px; font-weight: normal; color: rgba(255,255,255,0.4); display: block;">прослуш.</span>
          </div>
        </div>
      `;
    } else {
      gridHtml += `
        <div class="ym-glass-card" style="padding: 15px; display: flex; align-items: center; gap: 12px; min-width: 0; box-sizing: border-box; opacity: 0.5;">
          <div style="width: 50px; height: 50px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; color: rgba(255,255,255,0.2);">?</div>
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 10px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.5px;">${monthNamesRU[m]}</div>
            <div style="font-size: 13px; color: rgba(255,255,255,0.3); margin-top: 2px; font-style: italic;">Нет данных</div>
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = `
    <h2 style="font-size: 32px; margin-top: 0; margin-bottom: 20px; flex-shrink: 0;">Музыкальный Календарь</h2>
    <div style="flex: 1; min-height: 0; display: flex; flex-direction: column; overflow-y: auto; padding-right: 5px;">
      ${heatmapCardHtml}
      
      <h3 style="margin: 0 0 15px 0; font-size: 16px; color: rgba(255,255,255,0.8); font-weight: bold; flex-shrink: 0;">Главные треки по месяцам</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 15px; padding-bottom: 20px; flex-shrink: 0;">
        ${gridHtml}
      </div>
    </div>
  `;
  } catch (err) {
    console.error("Ошибка рендеринга календаря:", err);
    container.innerHTML = `<div style="color:red; padding: 20px;">Ошибка рендеринга календаря: ${err.message}</div>`;
  }
}

// Экспорт (обновление) функции рендера в window
if (typeof window !== 'undefined') {
  window.renderWrappedCharts = renderWrappedCharts;
}

// Инициализация кастомного красивого тултипа через делегирование событий
if (typeof window !== 'undefined') {
  let tooltipDiv = document.getElementById('ym-heatmap-tooltip');
  if (!tooltipDiv) {
    tooltipDiv = document.createElement('div');
    tooltipDiv.id = 'ym-heatmap-tooltip';
    tooltipDiv.style.cssText = `
      position: fixed;
      display: none;
      background: rgba(28, 28, 30, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
      color: white;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 9999999;
      pointer-events: none;
      max-width: 250px;
      line-height: 1.5;
      font-family: "YS Text", sans-serif;
      transition: opacity 0.1s ease, transform 0.1s ease;
      opacity: 0;
      transform: scale(0.95);
    `;
    document.body.appendChild(tooltipDiv);
  }

  // Делегирование событий мыши для ячеек активности
  document.addEventListener('mouseover', (e) => {
    const cell = e.target.closest('.ym-heatmap-cell');
    if (cell) {
      showHeatmapTooltip(e, cell);
    }
  });

  document.addEventListener('mousemove', (e) => {
    const cell = e.target.closest('.ym-heatmap-cell');
    if (cell) {
      moveHeatmapTooltip(e);
    }
  });

  document.addEventListener('mouseout', (e) => {
    const cell = e.target.closest('.ym-heatmap-cell');
    if (cell) {
      hideHeatmapTooltip();
    }
  });

  function showHeatmapTooltip(e, cellElement) {
    const text = cellElement.getAttribute('data-tooltip');
    if (!text) return;
    
    const html = text.split('\n').map((line, idx) => {
      if (idx === 0) {
        return `<div style="font-weight: bold; margin-bottom: 5px; color: white; font-size: 13px;">${line}</div>`;
      }
      if (line.startsWith('• Топ:')) {
        return `<div style="color: #ffdb4d; margin-top: 3px; font-weight: bold;">${line}</div>`;
      }
      return `<div style="color: rgba(255,255,255,0.7);">${line}</div>`;
    }).join('');
    
    tooltipDiv.innerHTML = html;
    tooltipDiv.style.display = 'block';
    
    // Принудительный reflow
    void tooltipDiv.offsetWidth;
    tooltipDiv.style.opacity = '1';
    tooltipDiv.style.transform = 'scale(1)';
    
    moveHeatmapTooltip(e);
  }

  function moveHeatmapTooltip(e) {
    const x = e.clientX;
    const y = e.clientY;
    
    const tooltipWidth = tooltipDiv.offsetWidth;
    const tooltipHeight = tooltipDiv.offsetHeight;
    
    let left = x + 15;
    let top = y - tooltipHeight - 15;
    
    if (left + tooltipWidth > window.innerWidth) {
      left = x - tooltipWidth - 15;
    }
    if (top < 10) {
      top = y + 20;
    }
    
    tooltipDiv.style.left = left + 'px';
    tooltipDiv.style.top = top + 'px';
  }

  function hideHeatmapTooltip() {
    tooltipDiv.style.opacity = '0';
    tooltipDiv.style.transform = 'scale(0.95)';
    setTimeout(() => {
      if (tooltipDiv.style.opacity === '0') {
        tooltipDiv.style.display = 'none';
      }
    }, 100);
  }
}


// --- Component: shared/wrapped/wrapped-stories.js ---
// ==========================================
// WRAPPED STORIES (Истории прослушиваний)
// ==========================================

let storiesOverlay = null;
let currentSlideIndex = 0;
let storyTimer = null;
let storyProgressInterval = null;
let currentProgressPercent = 0;
let isStoryPaused = false;
let activeStoriesStats = null;

// Порог времени на каждый слайд (15 секунд)
const SLIDE_DURATION_MS = 15000;
const PROGRESS_STEP_MS = 30;

function showToast(message) {
  // Проверяем, нет ли уже такого тоста
  const existingToast = document.querySelector('.ym-stories-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'ym-stories-toast';
  toast.textContent = message;
  
  toast.style.position = 'fixed';
  toast.style.bottom = '50px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%) translateY(20px)';
  toast.style.background = 'rgba(0, 0, 0, 0.85)';
  toast.style.color = '#fff';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '12px';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = '500';
  toast.style.zIndex = '200000000'; // Поверх истории
  toast.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  toast.style.pointerEvents = 'none';
  toast.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  toast.style.textAlign = 'center';
  toast.style.maxWidth = '320px';

  document.body.appendChild(toast);
  
  void toast.offsetWidth;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

function playTrackInStories(trackId) {
  try {
    const activePlayer = window.getActivePlayer ? window.getActivePlayer() : null;
    if (!activePlayer) {
      console.warn('[Stories] Плеер не найден. Выводим предупреждение...');
      showToast('Пожалуйста, сначала инициализируйте плеер (включите любой трек на 1 секунду и остановите).');
      return;
    }

    const queueState = activePlayer.playbackState?.queueState;
    const list = queueState?.entityList?.value || [];
    
    // Ищем трек в текущей очереди
    const trackIndex = list.findIndex(item => {
      const data = item?.entity?.data || item?.entity?.entityData;
      const id = data?.meta?.id || data?.id;
      return String(id) === String(trackId);
    });

    if (trackIndex !== -1) {
      console.log(`[Stories] Трек найден на индексе ${trackIndex}. Переключаем и запускаем...`);
      if (typeof activePlayer.setEntityByIndex === 'function') {
        activePlayer.setEntityByIndex(trackIndex);
        
        // Запуск воспроизведения
        setTimeout(() => {
          if (typeof activePlayer.resume === 'function') {
            activePlayer.resume();
          } else if (typeof activePlayer.play === 'function') {
            activePlayer.play();
          }
        }, 150);
      }
      return;
    }

    // Если трека нет в очереди, инжектируем его сразу за текущим
    console.log(`[Stories] Трека нет в очереди. Инжектируем ID ${trackId}...`);
    if (activePlayer.queueController && typeof activePlayer.queueController.inject === 'function') {
      const currentIndex = queueState?.index?.value || 0;
      const insertIndex = currentIndex + 1;

      activePlayer.queueController.inject({
        entitiesData: [
          { type: "unloaded", meta: { id: String(trackId) } }
        ],
        position: insertIndex,
        silent: false
      });

      // Переключаемся с небольшой задержкой (500мс, аналогично сокет-синхронизации)
      setTimeout(() => {
        const updatedList = queueState?.entityList?.value || [];
        let targetIndex = -1;
        for (let i = 0; i < updatedList.length; i++) {
          const d = updatedList[i]?.entity?.data || updatedList[i]?.entity?.entityData;
          const id = d?.meta?.id || d?.id;
          if (String(id) === String(trackId)) {
            if (targetIndex === -1 || Math.abs(i - insertIndex) < Math.abs(targetIndex - insertIndex)) {
              targetIndex = i;
            }
          }
        }
        const finalIndex = targetIndex !== -1 ? targetIndex : insertIndex;
        if (typeof activePlayer.setEntityByIndex === 'function') {
          activePlayer.setEntityByIndex(finalIndex);
          
          // Запуск воспроизведения
          setTimeout(() => {
            if (typeof activePlayer.resume === 'function') {
              activePlayer.resume();
            } else if (typeof activePlayer.play === 'function') {
              activePlayer.play();
            }
          }, 150);
        }
      }, 500);
    } else {
      showToast('Пожалуйста, сначала инициализируйте плеер (включите любой трек на 1 секунду и остановите).');
    }
  } catch (e) {
    console.error('[Stories] Ошибка при воспроизведении трека в Sonata:', e);
    showToast('Пожалуйста, сначала инициализируйте плеер (включите любой трек на 1 секунду и остановите).');
  }
}

function openWrappedStories(stats) {
  console.log('[Stories] Открытие историй с данными:', stats);
  activeStoriesStats = stats;
  currentSlideIndex = 0;
  isStoryPaused = false;

  // Скрываем основной оверлей статистики
  const mainOverlay = document.getElementById('ym-wrapped-overlay');
  if (mainOverlay) {
    console.log('[Stories] Скрываем главный оверлей статистики');
    mainOverlay.style.visibility = 'hidden';
  }

  // Создаем контейнер историй
  if (!storiesOverlay) {
    console.log('[Stories] Создаем новый элемент #ym-wrapped-stories');
    storiesOverlay = document.createElement('div');
    storiesOverlay.id = 'ym-wrapped-stories';
    
    const style = document.createElement('style');
    style.id = 'ym-wrapped-stories-style';
    style.textContent = `
      #ym-wrapped-stories {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 10000000 !important;
        background: black;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'YS Text', sans-serif;
        color: white;
        user-select: none;
        -webkit-user-select: none;
      }
      
      .ym-story-card {
        width: 100%;
        max-width: 480px;
        height: 100%;
        max-height: 850px;
        background: linear-gradient(180deg, #18002a 0%, #05000a 100%);
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 40px 24px;
        box-sizing: border-box;
      }
      
      @media (min-width: 480px) {
        .ym-story-card {
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          height: 90vh;
        }
      }
      
      /* Progress Bar */
      .ym-stories-progress {
        display: flex;
        gap: 6px;
        position: absolute;
        top: 15px;
        left: 15px;
        right: 15px;
        z-index: 10;
      }
      
      .ym-story-progress-bg {
        flex: 1;
        height: 4px;
        background: rgba(255,255,255,0.15);
        border-radius: 2px;
        overflow: hidden;
      }
      
      .ym-story-progress-fill {
        width: 0%;
        height: 100%;
        background: white;
        border-radius: 2px;
      }
      
      /* Close Button */
      .ym-story-close {
        position: absolute;
        top: 30px;
        right: 20px;
        z-index: 12;
        background: rgba(255,255,255,0.1);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
      }
      
      .ym-story-close:hover {
        transform: scale(1.1);
        background: rgba(255,255,255,0.2);
      }
      
      /* Navigation Tap Zones */
      .ym-story-tap-left {
        position: absolute;
        top: 0; left: 0; bottom: 0;
        width: 30%;
        z-index: 5;
        cursor: w-resize;
      }
      .ym-story-tap-right {
        position: absolute;
        top: 0; right: 0; bottom: 0;
        width: 70%;
        z-index: 5;
        cursor: e-resize;
      }
      
      /* Slide Content */
      .ym-story-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding-top: 40px;
        animation: slideIn 0.5s cubic-bezier(0.1, 0.8, 0.2, 1);
      }
      
      @keyframes slideIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      
      /* Slide Specific Animations */
      .ym-anim-float {
        animation: floatAnim 4s ease-in-out infinite;
      }
      @keyframes floatAnim {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-10px) rotate(2deg); }
      }
      
      .ym-anim-spin {
        animation: spinAnim 20s linear infinite;
      }
      @keyframes spinAnim {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .ym-story-btn {
        background: linear-gradient(135deg, #cc00ff, #ff8c00);
        border: none;
        border-radius: 14px;
        color: white;
        padding: 14px 28px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        pointer-events: auto;
        z-index: 20;
        margin-top: 20px;
      }
      
      .ym-story-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 8px 24px rgba(204, 0, 255, 0.3);
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(storiesOverlay);
  }

  storiesOverlay.style.display = 'flex';
  renderCurrentSlide();
}

function closeWrappedStories() {
  console.log('[Stories] Закрытие историй');
  if (storyTimer) clearTimeout(storyTimer);
  if (storyProgressInterval) clearInterval(storyProgressInterval);

  if (storiesOverlay) {
    storiesOverlay.style.display = 'none';
  }

  // Останавливаем музыку плеера при выходе из историй
  try {
    const activePlayer = window.getActivePlayer ? window.getActivePlayer() : null;
    if (activePlayer && typeof activePlayer.pause === 'function') {
      console.log('[Stories] Останавливаем музыку плеера при выходе');
      activePlayer.pause();
    }
  } catch (e) {
    console.error('[Stories] Не удалось поставить плеер на паузу:', e);
  }

  // Возвращаем видимость главного оверлея
  const mainOverlay = document.getElementById('ym-wrapped-overlay');
  if (mainOverlay) {
    console.log('[Stories] Показываем главный оверлей статистики');
    mainOverlay.style.visibility = 'visible';
  }
}

let lastSlideChangeTime = 0;

function renderCurrentSlide() {
  console.log('[Stories] Рендерим слайд с индексом:', currentSlideIndex);
  lastSlideChangeTime = Date.now();
  if (storyTimer) clearTimeout(storyTimer);
  if (storyProgressInterval) clearInterval(storyProgressInterval);

  const stats = activeStoriesStats;
  const slidesCount = 5;

  // Рендерим оболочку карточки (без onclick в html)
  storiesOverlay.innerHTML = `
    <div class="ym-story-card" id="ym-story-card-body">
      <div class="ym-stories-progress">
        ${Array.from({ length: slidesCount }, (_, i) => `
          <div class="ym-story-progress-bg">
            <div class="ym-story-progress-fill" id="ym-progress-fill-${i}"></div>
          </div>
        `).join('')}
      </div>
      
      <button class="ym-story-close" aria-label="Закрыть">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
      
      <div class="ym-story-tap-left" id="ym-tap-left"></div>
      <div class="ym-story-tap-right" id="ym-tap-right"></div>
      
      <div class="ym-story-content" id="ym-story-content-body"></div>
    </div>
  `;

  // Подключаем слушатели на закрытие и тапы
  const closeBtn = storiesOverlay.querySelector('.ym-story-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeWrappedStories();
    });
  }
  
  const tapLeft = storiesOverlay.querySelector('#ym-tap-left');
  const tapRight = storiesOverlay.querySelector('#ym-tap-right');
  const cardBody = storiesOverlay.querySelector('#ym-story-card-body');

  if (tapLeft) tapLeft.addEventListener('click', (e) => { e.stopPropagation(); prevSlide(); });
  if (tapRight) tapRight.addEventListener('click', (e) => { e.stopPropagation(); nextSlide(); });

  // Добавляем удержание пальцем/мышкой для паузы
  const pauseStory = () => {
    isStoryPaused = true;
  };
  const resumeStory = () => {
    isStoryPaused = false;
  };

  if (cardBody) {
    cardBody.addEventListener('mousedown', pauseStory);
    cardBody.addEventListener('mouseup', resumeStory);
    cardBody.addEventListener('mouseleave', resumeStory);
    cardBody.addEventListener('touchstart', pauseStory);
    cardBody.addEventListener('touchend', resumeStory);
  }

  // Заполняем прогресс-бары до текущего слайда
  for (let i = 0; i < currentSlideIndex; i++) {
    const el = storiesOverlay.querySelector(`#ym-progress-fill-${i}`);
    if (el) el.style.width = '100%';
  }

  // Устанавливаем градиент фона для карточки в зависимости от слайда
  if (cardBody) {
    switch (currentSlideIndex) {
      case 0:
        cardBody.style.background = 'linear-gradient(135deg, #1d003c 0%, #0d001f 50%, #030008 100%)';
        break;
      case 1:
        cardBody.style.background = 'linear-gradient(135deg, #0f002b 0%, #170017 100%)';
        break;
      case 2:
        cardBody.style.background = 'linear-gradient(135deg, #001f3f 0%, #001220 100%)';
        break;
      case 3:
        cardBody.style.background = 'linear-gradient(135deg, #1b001b 0%, #030008 100%)';
        break;
      case 4:
        cardBody.style.background = 'linear-gradient(135deg, #2b1200 0%, #0a0400 100%)';
        break;
    }
  }

  // Рендерим контент конкретного слайда
  const contentBody = storiesOverlay.querySelector('#ym-story-content-body');
  if (!contentBody) {
    console.error('[Stories] Элемент #ym-story-content-body не найден в DOM!');
    return;
  }
  
  switch (currentSlideIndex) {
    case 0:
      renderIntroSlide(contentBody, stats);
      break;
    case 1:
      renderPlaytimeSlide(contentBody, stats);
      break;
    case 2:
      renderGenreSlide(contentBody, stats);
      break;
    case 3:
      renderArtistSlide(contentBody, stats);
      break;
    case 4:
      renderTrackSlide(contentBody, stats);
      break;
  }

  // Запуск таймера и прогресса
  currentProgressPercent = 0;
  let elapsedMs = 0;

  storyProgressInterval = setInterval(() => {
    if (isStoryPaused) return; // На паузе прогресс не копится

    elapsedMs += PROGRESS_STEP_MS;
    currentProgressPercent = (elapsedMs / SLIDE_DURATION_MS) * 100;
    
    const currentProgressEl = storiesOverlay.querySelector(`#ym-progress-fill-${currentSlideIndex}`);
    if (currentProgressEl) {
      currentProgressEl.style.width = `${Math.min(currentProgressPercent, 100)}%`;
    }

    if (elapsedMs >= SLIDE_DURATION_MS) {
      clearInterval(storyProgressInterval);
      nextSlide();
    }
  }, PROGRESS_STEP_MS);
}

function nextSlide() {
  if (Date.now() - lastSlideChangeTime < 400) return;
  if (currentSlideIndex < 4) {
    currentSlideIndex++;
    renderCurrentSlide();
  } else {
    closeWrappedStories();
  }
}

function prevSlide() {
  if (Date.now() - lastSlideChangeTime < 400) return;
  if (currentSlideIndex > 0) {
    currentSlideIndex--;
    renderCurrentSlide();
  }
}

// ================= SLIDES CONTENT RENDERERS =================

function renderIntroSlide(container, stats) {
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="url(#headphone-gradient)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="ym-anim-float" style="margin-bottom: 25px; filter: drop-shadow(0 0 15px rgba(255, 219, 77, 0.4));">
        <defs>
          <linearGradient id="headphone-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffdb4d" />
            <stop offset="100%" stop-color="#ff8c00" />
          </linearGradient>
        </defs>
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
      <h1 style="font-size: 32px; font-weight: 800; margin: 0; line-height: 1.2; background: linear-gradient(90deg, #ffdb4d, #ff8c00); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Твоя Музыкальная<br>История</h1>
      <p style="font-size: 16px; color: rgba(255,255,255,0.6); margin-top: 15px; max-width: 280px; line-height: 1.4;">Давай вспомним твои лучшие музыкальные моменты и любимые ритмы за это время.</p>
    </div>
    <div style="font-size: 12px; color: rgba(255,255,255,0.3); letter-spacing: 1px; margin-bottom: 10px;">НАЖМИ НА ПРАВУЮ СТОРОНУ, ЧТОБЫ ИДТИ ДАЛЬШЕ</div>
  `;
}

function renderPlaytimeSlide(container, stats) {
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="80" height="80" fill="url(#lightning-gradient)" stroke="none" class="ym-anim-float" style="margin-bottom: 25px; filter: drop-shadow(0 0 15px rgba(204, 0, 255, 0.4));">
        <defs>
          <linearGradient id="lightning-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#cc00ff" />
            <stop offset="100%" stop-color="#ff007f" />
          </linearGradient>
        </defs>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
      <h2 style="font-size: 22px; color: rgba(255,255,255,0.6); margin: 0; text-transform: uppercase; letter-spacing: 2px;">Музыкальный забег</h2>
      
      <div style="margin: 25px 0;">
        <span style="font-size: 72px; font-weight: 900; color: #ffdb4d;">${Math.round(stats.totalHours * 60)}</span>
        <span style="font-size: 24px; font-weight: bold; color: rgba(255,255,255,0.7); display: block; margin-top: -10px;">минут прослушивания</span>
      </div>

      <p style="font-size: 16px; color: rgba(255,255,255,0.8); max-width: 320px; line-height: 1.4;">
        За это время ты успел включить целых <b style="color: #ff8c00;">${stats.totalListens}</b> треков! Настоящая верность любимым ритмам.
      </p>
    </div>
  `;
}

function renderGenreSlide(container, stats) {
  const topGenre = stats.topGenres[0] ? stats.topGenres[0].name : 'Музыка';
  
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="url(#note-gradient)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="ym-anim-float" style="margin-bottom: 25px; filter: drop-shadow(0 0 15px rgba(0, 212, 255, 0.4));">
        <defs>
          <linearGradient id="note-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00f2fe" />
            <stop offset="100%" stop-color="#4facfe" />
          </linearGradient>
        </defs>
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" fill="url(#note-gradient)" />
        <circle cx="18" cy="16" r="3" fill="url(#note-gradient)" />
      </svg>
      <h2 style="font-size: 22px; color: rgba(255,255,255,0.6); margin: 0; text-transform: uppercase; letter-spacing: 2px;">Твоя звуковая волна</h2>
      
      <div style="margin: 25px 0; background: rgba(0, 242, 254, 0.1); border: 2px solid #00f2fe; padding: 15px 35px; border-radius: 20px; box-shadow: 0 0 20px rgba(0, 242, 254, 0.2);">
        <span style="font-size: 38px; font-weight: 900; color: #00f2fe; text-transform: capitalize;">${topGenre}</span>
      </div>

      <p style="font-size: 16px; color: rgba(255,255,255,0.8); max-width: 300px; line-height: 1.5;">
        Этот жанр звучал в твоих ушах чаще остальных. Твоя душа настроена на его частоту!
      </p>
    </div>
  `;
}

function renderArtistSlide(container, stats) {
  const artistObj = stats.topArtists[0];
  const artistName = artistObj && artistObj.artist ? artistObj.artist.name : 'Неизвестный исполнитель';
  const coverUrl = artistObj && artistObj.artist && artistObj.artist.cover ? artistObj.artist.cover : 'https://music.yandex.ru/blocks/playlist-cover/playlist-cover_like.png';
  const minutes = artistObj ? Math.round(artistObj.duration / 60) : 0;
  
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%;">
      <h2 style="font-size: 22px; color: rgba(255,255,255,0.6); margin: 0 0 30px 0; text-transform: uppercase; letter-spacing: 2px;">Твой артист года</h2>
      
      <div class="ym-anim-float" style="position: relative; margin-bottom: 25px;">
        <img src="${coverUrl}" style="width: 180px; height: 180px; border-radius: 50%; object-fit: cover; border: 4px solid #cc00ff; box-shadow: 0 0 30px rgba(204,0,255,0.4);">
      </div>

      <span style="font-size: 32px; font-weight: 800; color: white; display: block; margin-bottom: 10px;">${artistName}</span>
      
      <p style="font-size: 16px; color: rgba(255,255,255,0.8); max-width: 300px; line-height: 1.5; margin: 0;">
        Ты посвятил его творчеству целых <b style="color: #cc00ff;">${minutes}</b> минут! Похоже, вы понимаете друг друга без слов.
      </p>
    </div>
  `;

  // Автоматический запуск трека артиста в фоне через Sonata
  if (artistObj && artistObj.artist) {
    const artistNameLower = artistObj.artist.name.toLowerCase();
    const matchTrack = stats.topTracks.find(t => 
      t.track && t.track.artists && t.track.artists.some(a => (a.name || String(a)).toLowerCase() === artistNameLower)
    );
    if (matchTrack && matchTrack.track) {
      console.log(`[Stories] Автозапуск трека артиста: ${matchTrack.track.title}`);
      playTrackInStories(matchTrack.track.id);
    }
  }
}

function renderTrackSlide(container, stats) {
  const trackObj = stats.topTracks[0];
  const trackId = trackObj && trackObj.track ? trackObj.track.id : null;
  const trackTitle = trackObj && trackObj.track ? trackObj.track.title : 'Неизвестный трек';
  let coverUrl = trackObj && trackObj.track && trackObj.track.cover ? trackObj.track.cover : 'https://music.yandex.ru/blocks/playlist-cover/playlist-cover_like.png';
  if (coverUrl && !coverUrl.startsWith('http') && !coverUrl.startsWith('//')) {
    coverUrl = 'https://' + coverUrl;
  }
  const artistName = trackObj && trackObj.track && trackObj.track.artists && trackObj.track.artists.length > 0 
    ? trackObj.track.artists.map(a => a.name || String(a)).join(', ') 
    : 'Артист';
  const plays = trackObj ? trackObj.count : 0;
  
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%;">
      <h2 style="font-size: 22px; color: rgba(255,255,255,0.6); margin: 0 0 35px 0; text-transform: uppercase; letter-spacing: 2px;">Трек года</h2>
      
      <div style="position: relative; margin-bottom: 25px; display: flex; justify-content: center; align-items: center;">
        <div class="ym-anim-spin" style="width: 170px; height: 170px; border-radius: 50%; background: #0b0b0b; display: flex; justify-content: center; align-items: center; border: 4px solid #ff8c00; box-shadow: 0 0 30px rgba(255,140,0,0.3); position: relative;">
          <div style="width: 160px; height: 160px; border-radius: 50%; background: repeating-radial-gradient(circle, black, black 2px, #1a1a1a 4px, #1a1a1a 5px); display: flex; justify-content: center; align-items: center;">
            <img src="${coverUrl}" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover;">
          </div>
          <div style="position: absolute; width: 12px; height: 12px; background: #000; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2);"></div>
        </div>
      </div>

      <span style="font-size: 26px; font-weight: 800; color: white; display: block; margin-bottom: 5px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 320px;">${trackTitle}</span>
      <span style="font-size: 18px; color: rgba(255,255,255,0.7); display: block; margin-bottom: 15px;">${artistName}</span>
      
      <p style="font-size: 15px; color: rgba(255,255,255,0.8); max-width: 300px; line-height: 1.5; margin: 0 0 20px 0;">
        Этот трек ты слушал чаще всего — целых <b style="color: #ff8c00;">${plays}</b> раз! Он определенно стал гимном этого периода.
      </p>

      ${trackId ? `<button class="ym-story-btn" id="ym-story-play-btn">▶ Включить в плеере</button>` : ''}
    </div>
  `;

  if (trackId) {
    console.log(`[Stories] Автозапуск трека года: ${trackTitle}`);
    playTrackInStories(trackId);
    
    const playBtn = container.querySelector('#ym-story-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playTrackInStories(trackId);
      });
    }
  }
}

// Экспорт функций в глобальный контекст window
if (typeof window !== 'undefined') {
  window.openWrappedStories = openWrappedStories;
  window.closeWrappedStories = closeWrappedStories;
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

// Global logger to print volume states from all places
window.logAllVolumes = function(contextMessage = "") {
    let nativeSlider = null;
    let nativeExponent = null;
    let nativeAudioVol = null;
    let customAudioVol = null;
    let customSlider = null;

    try {
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && activePlayer.playbackState?.playerState) {
            nativeSlider = activePlayer.playbackState.playerState.volume?.value;
            nativeExponent = activePlayer.playbackState.playerState.exponentVolume?.value;
        }
    } catch(e) {}

    try {
        const nativeAudio = document.querySelector('audio:not(#ym-sync-custom-audio), video:not(#ym-sync-custom-audio)');
        if (nativeAudio) {
            nativeAudioVol = nativeAudio.volume;
        }
    } catch(e) {}

    try {
        if (window.CustomAudioController && window.CustomAudioController.audioElement) {
            customAudioVol = window.CustomAudioController.audioElement.volume;
        }
    } catch(e) {}

    try {
        const slider = document.getElementById('sc-ov-volume-slider');
        if (slider) {
            customSlider = parseFloat(slider.value);
        }
    } catch(e) {}

    console.log(
        `%c[VOLUME-SYNC-DEBUG] ${contextMessage}\n` +
        `  -> Наш ползунок (Custom Slider): ${customSlider !== null ? customSlider.toFixed(4) : 'не найден'}\n` +
        `  -> Наш аудио-элемент (Custom Audio volume): ${customAudioVol !== null ? customAudioVol.toFixed(4) : 'не инициализирован'}\n` +
        `  -> Оригинальный Sonata volume: ${nativeSlider !== null ? nativeSlider.toFixed(4) : 'не найден'}\n` +
        `  -> Оригинальный Sonata exponentVolume: ${nativeExponent !== null ? nativeExponent.toFixed(4) : 'не найден'}\n` +
        `  -> Оригинальный аудио-элемент (DOM volume): ${nativeAudioVol !== null ? nativeAudioVol.toFixed(4) : 'не найден'}`,
        "color: #ff9900; font-weight: bold;"
    );
};

// Helper to get native Yandex Music player volume (returns exponent volume which aligns with the UI slider)
window.getNativeVolume = function() {
    // 1. Try Sonata player exponent volume state
    try {
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && activePlayer.playbackState?.playerState?.exponentVolume) {
            const vol = activePlayer.playbackState.playerState.exponentVolume.value;
            if (typeof vol === 'number') return vol;
        } else if (window.getSonataCore) {
            const core = window.getSonataCore();
            if (core?.playbackController?.volumeControl) {
                const vol = core.playbackController.volumeControl.volume;
                if (typeof vol === 'number') return vol;
            } else if (core?.playbackController?.volume) {
                const vol = core.playbackController.volume;
                if (typeof vol === 'number') return vol;
            }
        }
        
        if (window.externalAPI && typeof window.externalAPI.getVolume === 'function') {
            const vol = window.externalAPI.getVolume();
            if (typeof vol === 'number') return vol;
        }
    } catch (e) {
        console.error("[VOLUME-DEBUG] getNativeVolume error:", e);
    }

    // 2. Try native audio element volume
    const nativeAudio = document.querySelector('audio:not(#ym-sync-custom-audio), video:not(#ym-sync-custom-audio)');
    if (nativeAudio) {
        return nativeAudio.volume;
    }
    
    // 3. Fallback to localStorage
    try {
        const stored = localStorage.getItem('volume') || localStorage.getItem('player-volume');
        if (stored !== null) {
            const parsed = parseFloat(stored);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
                // If it was stored as linear volume, convert back to exponent
                if (parsed === 0) return 0;
                return Math.max(0, Math.min(1, 1 + Math.log10(parsed) / 2));
            }
        }
    } catch (e) {}

    return 0.7;
};

// Helper to get native Yandex Music player exponent volume (actual audio output scale)
window.getNativeExponentVolume = function() {
    return window.getNativeVolume();
};

// Helper to set native Yandex Music player volume
window.setNativeVolume = function(vol) {
    if (window.logAllVolumes) {
        window.logAllVolumes(`setNativeVolume вызвана с vol = ${vol}`);
    }
    
    // Translate the desired exponent volume (vol) to Yandex's linear volume
    // volume = 10^(2 * (exponentVolume - 1))
    const translatedVol = vol === 0 ? 0 : Math.max(0, Math.min(1, Math.pow(10, 2 * (vol - 1))));

    // 1. Try Sonata active player API
    try {
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && typeof activePlayer.setVolume === 'function') {
            activePlayer.setVolume(translatedVol);
        } else if (window.getSonataCore) {
            const core = window.getSonataCore();
            if (core?.playbackController) {
                if (typeof core.playbackController.setVolume === 'function') {
                    core.playbackController.setVolume(translatedVol);
                } else if (core.playbackController.volumeControl && typeof core.playbackController.volumeControl.setVolume === 'function') {
                    core.playbackController.volumeControl.setVolume(translatedVol);
                }
            }
        }
        
        if (window.externalAPI && typeof window.externalAPI.setVolume === 'function') {
            window.externalAPI.setVolume(translatedVol);
        }
    } catch (e) {
        console.error("[VOLUME-DEBUG] setNativeVolume error:", e);
    }

    // 2. Set on native audio element
    const nativeAudio = document.querySelector('audio:not(#ym-sync-custom-audio), video:not(#ym-sync-custom-audio)');
    if (nativeAudio) {
        nativeAudio.volume = vol;
    }

    // 3. Set localStorage keys (store linear volume so Yandex's internal code reads it correctly)
    try {
        localStorage.setItem('volume', String(translatedVol));
        localStorage.setItem('player-volume', String(translatedVol));
    } catch (e) {}

    // Log after short timeout to let MobX or other handlers apply changes
    setTimeout(() => {
        if (window.logAllVolumes) {
            window.logAllVolumes("setNativeVolume: Применилось (100мс)");
        }
    }, 100);
};

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
            
            // Set volume to match native player on init (use exponent volume for correct loudness)
            this.audioElement.volume = window.getNativeExponentVolume ? window.getNativeExponentVolume() : 0.7;
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
        
        // Sync volume with native player (use exponent volume for correct loudness)
        if (window.getNativeExponentVolume) {
            this.audioElement.volume = window.getNativeExponentVolume();
        }
        
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

        // Sync volume with native player (use exponent volume for correct loudness)
        if (window.getNativeExponentVolume) {
            this.audioElement.volume = window.getNativeExponentVolume();
        }

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

        const currentVol = window.getNativeVolume ? window.getNativeVolume() : 0.7;
        volumeSlider.value = currentVol;
        updateSliderStyle(currentVol);
        updateVolumeIcon(currentVol);

        volumeSlider.addEventListener('input', (e) => {
            e.stopPropagation();
            const vol = parseFloat(volumeSlider.value);
            if (window.logAllVolumes) {
                window.logAllVolumes(`Драг ползунка: Новое значение = ${vol}`);
            }
            // 1. Set volume on native Yandex player (translating slider to native linear scale)
            if (window.setNativeVolume) {
                window.setNativeVolume(vol);
            }
            // 2. Set volume on custom audio element (same as slider)
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
                    // Store current linear volume from slider before muting
                    lastVolume = parseFloat(volumeSlider.value) || 0.7;
                    console.log("[VOLUME-DEBUG] Mute clicked. Saving lastVolume:", lastVolume);
                    if (window.setNativeVolume) {
                        window.setNativeVolume(0);
                    }
                    window.CustomAudioController.setVolume(0);
                    volumeSlider.value = 0;
                    updateSliderStyle(0);
                    updateVolumeIcon(0);
                } else {
                    console.log("[VOLUME-DEBUG] Unmute clicked. Restoring lastVolume:", lastVolume);
                    if (window.setNativeVolume) {
                        window.setNativeVolume(lastVolume);
                    }
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

        // Log volumes every 8 ticks (~2 seconds)
        if (!this._tickCount) this._tickCount = 0;
        this._tickCount++;
        if (this._tickCount % 8 === 0) {
            if (window.logAllVolumes) {
                window.logAllVolumes("Периодический тик (2с)");
            }
        }

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
                this.checkSearchPage(true);
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
                    if (!query || query.trim() === '') {
                        // Clear results immediately if query is cleared
                        const old = document.getElementById('ym-sync-soundcloud-results');
                        if (old) old.remove();
                    } else {
                        this.searchTimeout = setTimeout(() => {
                            this.performSearch(query);
                        }, 800);
                    }
                }
            }
        });
    },

    checkSearchPage(fromUrlChange = false) {
        if (location.pathname.startsWith('/search')) {
            const searchInput = document.querySelector('input[type="search"]');
            const urlQuery = new URLSearchParams(location.search).get('text') || '';
            const query = fromUrlChange ? urlQuery : (searchInput ? searchInput.value : urlQuery);
            if (query !== this.lastQuery) {
                this.lastQuery = query;
                this.performSearch(query);
            }
        } else {
            const old = document.getElementById('ym-sync-soundcloud-results');
            if (old) old.remove();
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
        if (!query || query.trim() === '') {
            const old = document.getElementById('ym-sync-soundcloud-results');
            if (old) old.remove();
            return;
        }
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
                        position:relative;
                    ">
                        <svg class="ym-sync-sc-placeholder-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.3">
                            <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/>
                        </svg>
                        <div class="ym-sync-sc-play-overlay" style="
                            position:absolute; top:0; left:0; width:100%; height:100%;
                            background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;
                            opacity:0; transition:opacity 0.15s; pointer-events:none;
                        ">
                            <svg width="12" height="14" viewBox="0 0 10 12" fill="white"><path d="M0 0l10 6-10 6V0z"/></svg>
                        </div>
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
                        width:32px; height:32px; border-radius:50%; background:var(--ym-sync-btn-bg, rgba(128, 128, 128, 0.15));
                        display:flex; align-items:center; justify-content:center;
                        flex-shrink:0; border:none; cursor:pointer; color:inherit;
                        transition:background 0.2s, transform 0.2s; margin-left:4px;
                        padding:0; outline:none; z-index:5;
                    }" title="Добавить в плейлист BetterYandexMusic">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
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
            el.addEventListener('mouseenter', () => {
                el.style.background = 'rgba(255,255,255,0.07)';
                const overlay = el.querySelector('.ym-sync-sc-play-overlay');
                if (overlay) overlay.style.opacity = '1';
            });
            el.addEventListener('mouseleave', () => {
                el.style.background = 'transparent';
                const overlay = el.querySelector('.ym-sync-sc-play-overlay');
                if (overlay) overlay.style.opacity = '0';
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

                    // Re-append play overlay since we cleared innerHTML
                    const overlay = document.createElement('div');
                    overlay.className = 'ym-sync-sc-play-overlay';
                    overlay.style.cssText = `
                        position:absolute; top:0; left:0; width:100%; height:100%;
                        background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;
                        opacity:0; transition:opacity 0.15s; pointer-events:none;
                    `;
                    overlay.innerHTML = `<svg width="12" height="14" viewBox="0 0 10 12" fill="white"><path d="M0 0l10 6-10 6V0z"/></svg>`;
                    artEl.appendChild(overlay);
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

                const overlay = el.querySelector('.ym-sync-sc-play-overlay');
                if (overlay) {
                    overlay.style.opacity = '1';
                    overlay.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" style="animation: ym-sync-spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="3" stroke-dasharray="32 10" fill="none" stroke-linecap="round"></circle></svg>`;
                }

                const streamUrl = await window.SoundCloudAPI.getStreamUrl(track);
                if (streamUrl) {
                    await window.CustomAudioController.playTrack(track, streamUrl);
                } else {
                    console.error('[SOUNDCLOUD] Could not get stream URL for track');
                    const currentOverlay = el.querySelector('.ym-sync-sc-play-overlay');
                    if (currentOverlay) {
                        currentOverlay.innerHTML = `<svg width="12" height="14" viewBox="0 0 10 12" fill="white"><path d="M0 0l10 6-10 6V0z"/></svg>`;
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
                btn.style.background = 'var(--ym-sync-btn-bg-hover, rgba(128, 128, 128, 0.25))';
                btn.style.transform = 'scale(1.1)';
            });

            btn.addEventListener('mouseleave', (e) => {
                e.stopPropagation();
                btn.style.background = 'var(--ym-sync-btn-bg, rgba(128, 128, 128, 0.15))';
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
                    btn.style.background = 'var(--ym-sync-btn-bg, rgba(128, 128, 128, 0.15))';
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
      const rawId = entityData?.meta?.id || entityData?.id;
      if (rawId) {
        localTrackId = String(rawId);
        const filename = entityData?.meta?.filename || entityData?.filename || '';
        if ((entityData?.meta?.trackSource === 'UGC' || entityData?.trackSource === 'UGC') && filename.startsWith('soundcloud_')) {
          const match = filename.match(/soundcloud_(\d+)\.mp3/);
          if (match) {
            localTrackId = `soundcloud:${match[1]}`;
          }
        }
      }
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
            // Ищем нужный трек в списке (с поддержкой UGC SoundCloud треков)
            const trackIndex = list.findIndex(wrapper => {
              const data = wrapper?.entity?.data || wrapper?.entity?.entityData;
              const id = data?.meta?.id || data?.id;
              
              let queueTrackId = String(id);
              const filename = data?.meta?.filename || data?.filename || '';
              if ((data?.meta?.trackSource === 'UGC' || data?.trackSource === 'UGC') && filename.startsWith('soundcloud_')) {
                const match = filename.match(/soundcloud_(\d+)\.mp3/);
                if (match) {
                  queueTrackId = `soundcloud:${match[1]}`;
                }
              }
              return String(queueTrackId) === String(serverState.trackId);
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
      if (String(serverState.trackId).startsWith("soundcloud:") && window.isCustomAudioActive) {
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
  } else if (event.data.action === "SLEEP_TIMER_ACTION") {
    if (event.data.command === "FADE_VOLUME") {
      if (typeof window.sleepTimerOriginalVolume === 'undefined') {
        window.sleepTimerOriginalVolume = typeof window.getNativeVolume === 'function' ? window.getNativeVolume() : 0.5;
      }
      
      const newVol = window.sleepTimerOriginalVolume * event.data.progress;
      if (typeof window.setNativeVolume === 'function') {
        window.setNativeVolume(newVol);
      }
      if (window.CustomAudioController && typeof window.CustomAudioController.setVolume === 'function') {
        window.CustomAudioController.setVolume(newVol);
      }
    } else if (event.data.command === "RESTORE_VOLUME") {
      if (typeof window.sleepTimerOriginalVolume !== 'undefined') {
        if (typeof window.setNativeVolume === 'function') {
          window.setNativeVolume(window.sleepTimerOriginalVolume);
        }
        if (window.CustomAudioController && typeof window.CustomAudioController.setVolume === 'function') {
          window.CustomAudioController.setVolume(window.sleepTimerOriginalVolume);
        }
        window.sleepTimerOriginalVolume = undefined;
      }
    } else if (event.data.command === "SET_VOLUME") {
      if (typeof window.setNativeVolume === 'function') {
        window.setNativeVolume(event.data.volume);
      }
      if (window.CustomAudioController && typeof window.CustomAudioController.setVolume === 'function') {
        window.CustomAudioController.setVolume(event.data.volume);
      }
    } else if (event.data.command === "PAUSE") {
      const activePlayer = window.getActivePlayer ? window.getActivePlayer() : null;
      let paused = false;
      
      if (activePlayer && typeof activePlayer.pause === 'function') {
        activePlayer.pause();
        paused = true;
      } else if (window.getSonataCore) {
        const core = window.getSonataCore();
        if (core?.playbackController && typeof core.playbackController.pause === 'function') {
          core.playbackController.pause();
          paused = true;
        }
      }
      
      if (!paused && window.externalAPI && typeof window.externalAPI.pause === 'function') {
        window.externalAPI.pause();
        paused = true;
      } 
      
      if (!paused) {
        const pauseBtn = document.querySelector('[class*="BaseSonataControlsDesktop_playButton"], [aria-label="Пауза"], [aria-label="Pause"]');
        if (pauseBtn) {
          pauseBtn.click();
        }
      }
      if (window.CustomAudioController && typeof window.CustomAudioController.stop === 'function') {
        window.CustomAudioController.stop();
      }
    }
  }
});


