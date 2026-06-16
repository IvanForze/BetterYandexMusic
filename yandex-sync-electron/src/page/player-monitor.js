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

function getSonataCore() {
  const rootEl = document.querySelector('#root') || document.querySelector('#__next') || document.body;
  if (!rootEl) return null;

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

  const playerEl = document.querySelector('[class*="player"]');
  if (playerEl) {
    const fiberKey = Object.keys(playerEl).find(key => key.startsWith('__reactFiber$'));
    if (fiberKey && playerEl[fiberKey]) {
      const found = findProviderFromFiber(playerEl[fiberKey]);
      if (found) return found;
    }
  }

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

function getActivePlayer() {
  const core = getSonataCore();
  const activePlaybackWrapper = core?.playbackController?.activePlayback;
  // Если activePlayback - это обертка observable (свойство value), берем значение из нее
  return activePlaybackWrapper.value || null;
}

window.getActivePlayer = getActivePlayer;

function getTrackMetadata(activePlayer) {
  try {
    const playerStateTrack = activePlayer.playbackState?.playerState?.track?.value || activePlayer.playbackState?.playerState?.track;
    const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value;
    const entityData = currentEntity?.entity?.data;
    
    const dataObj = playerStateTrack || entityData?.meta || entityData;
    if (!dataObj) return null;

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

    const mediaSourceData = currentEntity?.entity?.mediaSourceData;
    const quality = mediaSourceData?.data?.quality || '';
    const codec = mediaSourceData?.data?.codec || '';
    const bitrate = mediaSourceData?.data?.bitrate || 0;

    const hasLyrics = !!(
      dataObj.hasLyrics === true || 
      dataObj.lyricsInfo?.hasAvailableText === true || 
      dataObj.lyricsInfo?.hasAvailableTextSync === true || 
      dataObj.lyricsInfo?.hasAvailableTextLyrics === true || 
      dataObj.lyricsInfo?.hasAvailableSyncLyrics === true || 
      dataObj.lyrics
    );

    return {
      title: fullTitle,
      artist: artistsStr,
      durationMs,
      coverUrl,
      quality,
      codec,
      bitrate,
      hasLyrics
    };
  } catch (err) {
    console.error('[SYNC] Ошибка получения метаданных трека:', err);
    return null;
  }
}

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

// Синхронизация контролов плеера с данными от сервера
function syncPlayerControls(activePlayer, serverState) {
  const isPlaying = activePlayer.playbackState.playerState.status.value === 'playing';
  const isPause = !isPlaying;

  console.log(`[SYNC] Применяем состояние от сервера: Трек ID: ${serverState.trackId}, Время: ${Math.round(serverState.time)}с, Пауза: ${serverState.isPause}`);

  if (serverState.isPause !== isPause) {
    if (serverState.isPause) {
      if (typeof activePlayer.pause === 'function') {
        activePlayer.pause();
      }
    } else {
      if (typeof activePlayer.resume === 'function') {
        activePlayer.resume();
      } else if (typeof activePlayer.play === 'function') {
        activePlayer.play();
      }
    }
  }

  const progress = activePlayer.playbackState.playerState.progress.value;
  const currentPosition = progress?.position || 0;

  if (Math.abs(currentPosition - serverState.time) > 2) {
    console.log(`[SYNC] -> Перемотка через API: ${Math.round(currentPosition)}с -> ${Math.round(serverState.time)}с`);
    activePlayer.setProgress(serverState.time);
  }

  lastSentTrackId = serverState.trackId;
  lastSentIsPause = serverState.isPause;
  lastSentTime = serverState.time;
  lastSentTimestamp = Date.now();
}



function sendStateToPreload() {
  try {
    const activePlayer = getActivePlayer();
    let trackId = "";
    let isPause = true;
    let position = 0;
    let metadata = null;

    if (activePlayer) {
      try {
        const playerStateTrack = activePlayer.playbackState?.playerState?.track?.value || activePlayer.playbackState?.playerState?.track;
        const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value;
        const entityData = currentEntity?.entity?.data;
        if (rawTrackId && String(rawTrackId).trim() !== '' && String(rawTrackId) !== 'undefined' && String(rawTrackId) !== 'null') {
          trackId = String(rawTrackId);
          const filename = entityData?.meta?.filename || entityData?.filename || '';
          if ((entityData?.meta?.trackSource === 'UGC' || entityData?.trackSource === 'UGC') && filename.startsWith('soundcloud_')) {
            const match = filename.match(/soundcloud_(\d+)\.mp3/);
            if (match) {
              trackId = `soundcloud:${match[1]}`;
            }
          }
          const isPlaying = activePlayer.playbackState.playerState.status.value === 'playing';
          isPause = !isPlaying;
          const progress = activePlayer.playbackState.playerState.progress.value;
          position = progress?.position || 0;
          metadata = getTrackMetadata(activePlayer);
        }
      } catch (playerErr) {
        console.warn('[SYNC] Не удалось прочитать состояние плеера для Discord:', playerErr);
      }
    }

    const stateObj = {
      trackId: trackId,
      isPause: isPause,
      position: position,
      metadata: metadata,
      currentRoomId: currentRoom,
      serverUrl: currentServerUrl
    };

    if (typeof updateTrackUI === 'function') {
      updateTrackUI(metadata);
    }

    if (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendState === 'function') {
      window.__ymSyncBridge.sendState(stateObj);
    }
    window.postMessage({
      type: 'YM_SYNC_STATE_CHANGED',
      state: stateObj
    }, '*');
  } catch (err) {
    console.error('[SYNC] Ошибка отправки состояния в preload:', err);
  }
}

// Мониторинг локального плеера
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

        const stateObj = {
          trackId: trackId,
          isPause: isPause,
          position: position,
          metadata: metadata,
          currentRoomId: currentRoom,
          serverUrl: currentServerUrl
        };

        if (typeof updateTrackUI === 'function') {
          updateTrackUI(metadata);
        }

        if (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendState === 'function') {
          window.__ymSyncBridge.sendState(stateObj);
        }
        window.postMessage({
          type: 'YM_SYNC_STATE_CHANGED',
          state: stateObj
        }, '*');

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

        if (shouldUpdate && socket && currentRoom) {
          lastSentTrackId = trackId;
          lastSentIsPause = isPause;
          lastSentTime = position;
          lastSentTimestamp = now;

          socket.emit('updateState', {
            roomId: currentRoom,
            state: {
              trackId: trackId,
              albumId: '',
              isPause: isPause,
              time: position
            }
          });
        }
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

    if (isSyncingFromServer) {
      let trackId = null;
      try {
        const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value;
        const entityData = currentEntity?.entity?.data;
        trackId = entityData?.meta?.id || entityData?.id;
      } catch (err) { }

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

    const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value;
    const entityData = currentEntity?.entity?.data;

    const rawTrackId = entityData?.meta?.id || entityData?.id;
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
    const position = progress?.position || 0;

    // Отправляем состояние в preload-скрипт для обновления Discord RPC
    const stateObj = {
      trackId: trackId,
      isPause: isPause,
      position: position,
      metadata: getTrackMetadata(activePlayer),
      currentRoomId: currentRoom,
      serverUrl: currentServerUrl
    };

    if (typeof updateTrackUI === 'function') {
      updateTrackUI(stateObj.metadata);
    }

    if (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendState === 'function') {
      window.__ymSyncBridge.sendState(stateObj);
    }
    window.postMessage({
      type: 'YM_SYNC_STATE_CHANGED',
      state: stateObj
    }, '*');

    const now = Date.now();
    let shouldUpdate = false;

    if (trackId !== lastSentTrackId || isPause !== lastSentIsPause) {
      shouldUpdate = true;
      console.log(`[SYNC] Локальное изменение: Трек ID: ${trackId}, Время: ${Math.round(position)}с, Пауза: ${isPause}`);
    } else if (isPlaying) {
      const elapsed = (now - lastSentTimestamp) / 1000;
      const expectedPosition = lastSentTime + elapsed;
      if (Math.abs(position - expectedPosition) > 2) {
        shouldUpdate = true;
        console.log(`[SYNC] Локальная перемотка: Трек ID: ${trackId}, Время: ${Math.round(position)}с, Пауза: ${isPause}`);
      }
    }

    if (shouldUpdate && socket && currentRoom) {
      lastSentTrackId = trackId;
      lastSentIsPause = isPause;
      lastSentTime = position;
      lastSentTimestamp = now;

      socket.emit('updateState', {
        roomId: currentRoom,
        state: {
          trackId: trackId,
          albumId: albumId,
          isPause: isPause,
          time: position
        }
      });
    }
  } catch (globalErr) {
    console.warn("[SYNC] Ошибка в цикле мониторинга плеера:", globalErr.message || globalErr);
  }
}

// Запускаем мониторинг локального плеера
setInterval(checkAndSendState, 500);
