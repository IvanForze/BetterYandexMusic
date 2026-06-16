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
  
  // Ищем элемент "Офлайн-режим", "О приложении", "Внешний вид", "Язык" чтобы найти список настроек
  const divs = Array.from(document.querySelectorAll('div, span, p, h2, h3'));
  const targetTextElement = divs.find(el => {
    if (el.children.length > 0) return false; // Ищем самый глубокий текстовый узел
    const text = el.textContent || '';
    return text.includes('Офлайн-режим') || text.includes('Плавные переходы') || text.includes('О приложении') || text.includes('Внешний вид') || text.includes('Язык') || text.includes('Качество звука');
  });

  if (!targetTextElement) return;

  // Ищем родительский элемент ряда настроек (Settings Item), который является непосредственным потомком списка
  let itemNode = targetTextElement;
  while (itemNode && itemNode.parentElement && itemNode.parentElement.children.length < 3) {
    itemNode = itemNode.parentElement;
  }

  const listContainer = itemNode ? itemNode.parentElement : null;
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

  block.innerHTML = `
    <!-- Заголовок секции, оформленный как нативный -->
    <div class="ym-settings-section-title" style="font-size: 17px; font-weight: 700; padding: 24px 0 8px 0; letter-spacing: -0.2px;">Скроблинг</div>
    
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

    <!-- Тонкий разделитель в конце нашей секции -->
    <div class="ym-settings-divider" style="height: 1px; margin-top: 14px; margin-bottom: 14px;"></div>

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

  // Настройка слушателей Last.fm
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
        const nativeAudio = document.querySelector('audio:not(#ym-sync-custom-audio)');
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
    // 1. Try Sonata player exponent volume state (UI slider position)
    try {
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && activePlayer.playbackState?.playerState?.exponentVolume) {
            const vol = activePlayer.playbackState.playerState.exponentVolume.value;
            if (typeof vol === 'number') return vol;
        }
    } catch (e) {
        console.error("[VOLUME-DEBUG] getNativeVolume error:", e);
    }

    // 2. Try native audio element volume
    const nativeAudio = document.querySelector('audio:not(#ym-sync-custom-audio)');
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
        }
    } catch (e) {
        console.error("[VOLUME-DEBUG] setNativeVolume error:", e);
    }

    // 2. Set on native audio element
    const nativeAudio = document.querySelector('audio:not(#ym-sync-custom-audio)');
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
  }
});


