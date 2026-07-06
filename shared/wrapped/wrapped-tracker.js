// ==========================================
// WRAPPED TRACKER (Перехват треков)
// ==========================================

class WrappedTracker {
  constructor() {
    this.currentTrackId = null;
    this.trackStartTime = 0;
    this.listenLogged = false;
    this.checkInterval = null;
    
    // Запускаем инициализацию с задержкой
    setTimeout(() => this.init(), 3000);
  }

  init() {
    console.log('[Wrapped Tracker] Инициализация успешна. Следим за треками через Sonata...');

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

      let duration = 0;
      if (dataObj.durationMs) {
        duration = dataObj.durationMs / 1000;
      } else if (activePlayer.playbackState?.playerState?.progress?.value?.duration) {
        duration = activePlayer.playbackState.playerState.progress.value.duration;
      }

      let artists = [];
      if (Array.isArray(dataObj.artists)) {
        artists = dataObj.artists.map(a => ({
          id: a.name || a.id,
          name: typeof a === 'object' ? a.name : a,
          cover: '' // Обложки артистов не всегда доступны тут
        }));
      }

      return {
        trackId: dataObj.id || (entityData && entityData.id),
        title: dataObj.title || 'Неизвестный трек',
        cover: dataObj.coverUri ? dataObj.coverUri.replace('%%', '400x400') : null,
        duration: duration,
        artists: artists
      };
    } catch (e) {
      return null;
    }
  }

  async checkProgress() {
    if (typeof window.getActivePlayer !== 'function') return;
    
    const activePlayer = window.getActivePlayer();
    if (!activePlayer) return;

    const trackInfo = this.getSonataTrackInfo(activePlayer);
    if (!trackInfo || !trackInfo.trackId) return;

    // Смена трека
    if (this.currentTrackId !== trackInfo.trackId) {
      this.currentTrackId = trackInfo.trackId;
      this.listenLogged = false;
      this.trackStartTime = Date.now();
      console.log(`[Wrapped Tracker] Новый трек: ${trackInfo.title}`);
    }

    if (this.listenLogged) return;

    const progress = activePlayer.playbackState?.playerState?.progress?.value;
    if (!progress || !progress.position || !trackInfo.duration) return;

    const position = progress.position;
    const duration = trackInfo.duration;
    
    // Порог: 30% трека
    const threshold = duration * 0.3;

    if (position >= threshold && threshold > 0) {
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
        artists: track.artists
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
