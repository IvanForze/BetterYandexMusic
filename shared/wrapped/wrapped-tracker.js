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
      if (Array.isArray(dataObj.artists)) {
        artists = dataObj.artists.map(a => {
          let artistCover = '';
          if (a && typeof a === 'object') {
            if (a.cover) {
              if (typeof a.cover === 'string') {
                artistCover = a.cover;
              } else if (a.cover.uri) {
                artistCover = a.cover.uri;
              }
            } else if (a.coverUri) {
              artistCover = a.coverUri;
            }
            
            if (artistCover && !artistCover.startsWith('http') && !artistCover.startsWith('//')) {
              artistCover = 'https://' + artistCover.replace('%%', '200x200');
            }
          }
          
          return {
            id: String(a.id || a.name || (typeof a === 'string' ? a : 'unknown')),
            name: typeof a === 'object' ? a.name : a,
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
