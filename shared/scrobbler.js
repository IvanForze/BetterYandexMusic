// Дефолтные ключи Last.fm (могут быть переопределены пользователем в настройках)
const LASTFM_DEFAULT_API_KEY = '4d12b2b376510476bfdae3e2c62c96c4';
const LASTFM_DEFAULT_SECRET = '78e24c2a5e985b67484df24cd76bf349';

function md5Hash(str) {
  if (typeof window !== 'undefined' && window.md5) return window.md5(str);
  if (typeof global !== 'undefined' && global.md5) return global.md5(str);
  throw new Error('MD5 function not found. Ensure md5.js is loaded.');
}

async function makeHttpRequest(url, options = {}, body = null) {
  const reqOptions = {
    method: options.method || 'GET',
    headers: options.headers || {}
  };

  if (body) {
    reqOptions.body = body;
  }

  const response = await fetch(url, reqOptions);
  const text = await response.text();

  if (response.ok) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  } else {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
}

// Генерирует подпись api_sig для Last.fm
function generateLastFmSignature(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  let signatureStr = '';
  for (const key of sortedKeys) {
    if (key !== 'format') {
      signatureStr += key + params[key];
    }
  }
  signatureStr += secret;
  return md5Hash(signatureStr);
}

class ScrobblerService {
  static getSettings() {
    let settings = {
      lastfmEnabled: false,
      lastfmApiKey: '',
      lastfmSecret: '',
      lastfmSessionKey: '',
      lastfmUsername: '',
      listenbrainzEnabled: false,
      listenbrainzToken: '',
      listenbrainzUsername: ''
    };
    return settings;
  }

  // Получить авторизационный токен Last.fm
  static async lastFmGetToken(customApiKey, customSecret) {
    const apiKey = customApiKey || LASTFM_DEFAULT_API_KEY;
    const secret = customSecret || LASTFM_DEFAULT_SECRET;

    const params = {
      api_key: apiKey,
      method: 'auth.getToken'
    };
    const apiSig = generateLastFmSignature(params, secret);
    const url = `https://ws.audioscrobbler.com/2.0/?method=auth.getToken&api_key=${apiKey}&api_sig=${apiSig}&format=json`;
    const data = await makeHttpRequest(url);
    return data.token;
  }

  // Получить Session Key по токену Last.fm
  static async lastFmGetSession(token, customApiKey, customSecret) {
    const apiKey = customApiKey || LASTFM_DEFAULT_API_KEY;
    const secret = customSecret || LASTFM_DEFAULT_SECRET;
    
    const params = {
      api_key: apiKey,
      method: 'auth.getSession',
      token: token
    };
    const apiSig = generateLastFmSignature(params, secret);
    
    const url = `https://ws.audioscrobbler.com/2.0/?method=auth.getSession&api_key=${apiKey}&token=${token}&api_sig=${apiSig}&format=json`;
    const data = await makeHttpRequest(url);
    if (data.session) {
      return {
        sessionKey: data.session.key,
        username: data.session.name
      };
    }
    throw new Error('Не удалось получить сессию Last.fm');
  }

  // Обновить "Now Playing" в Last.fm
  static async lastFmNowPlaying(trackData, config) {
    if (!config.lastfmEnabled || !config.lastfmSessionKey) return;
    
    const apiKey = config.lastfmApiKey || LASTFM_DEFAULT_API_KEY;
    const secret = config.lastfmSecret || LASTFM_DEFAULT_SECRET;

    const params = {
      api_key: apiKey,
      artist: trackData.artist,
      track: trackData.title,
      method: 'track.updateNowPlaying',
      sk: config.lastfmSessionKey
    };
    if (trackData.album) params.album = trackData.album;
    if (trackData.durationMs) params.duration = Math.round(trackData.durationMs / 1000);

    const apiSig = generateLastFmSignature(params, secret);
    params.api_sig = apiSig;
    params.format = 'json';

    const body = new URLSearchParams(params).toString();
    const url = 'https://ws.audioscrobbler.com/2.0/';
    
    return makeHttpRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, body);
  }

  // Заскроблить в Last.fm
  static async lastFmScrobble(trackData, config) {
    if (!config.lastfmEnabled || !config.lastfmSessionKey) return;

    const apiKey = config.lastfmApiKey || LASTFM_DEFAULT_API_KEY;
    const secret = config.lastfmSecret || LASTFM_DEFAULT_SECRET;
    const timestamp = Math.floor(Date.now() / 1000);

    const params = {
      api_key: apiKey,
      artist: trackData.artist,
      track: trackData.title,
      timestamp: timestamp,
      method: 'track.scrobble',
      sk: config.lastfmSessionKey
    };
    if (trackData.album) params.album = trackData.album;
    if (trackData.durationMs) params.duration = Math.round(trackData.durationMs / 1000);

    const apiSig = generateLastFmSignature(params, secret);
    params.api_sig = apiSig;
    params.format = 'json';

    const body = new URLSearchParams(params).toString();
    const url = 'https://ws.audioscrobbler.com/2.0/';

    return makeHttpRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, body);
  }

  // Отправка Now Playing / Scrobble в ListenBrainz
  static async listenBrainzSubmit(trackData, config, listenType) {
    if (!config.listenbrainzEnabled || !config.listenbrainzToken) return;

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = [
      {
        listened_at: listenType === 'scrobble' ? timestamp : undefined,
        track_metadata: {
          artist_name: trackData.artist,
          track_name: trackData.title,
          release_name: trackData.album || undefined,
          additional_info: {
            media_player: 'Yandex Music Sync Client',
            duration_ms: trackData.durationMs || undefined
          }
        }
      }
    ];

    console.log(`[LISTENBRAINZ] Отправка статуса '${listenType}' для: ${trackData.artist} - ${trackData.title}`);

    const body = JSON.stringify({
      listen_type: listenType, // 'playing_now' или 'single' (для скроблинга)
      payload: payload
    });

    const url = 'https://api.listenbrainz.org/1/submit-listens';
    
    return makeHttpRequest(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${config.listenbrainzToken}`,
        'Content-Type': 'application/json'
      }
    }, body).then(res => {
      console.log(`[LISTENBRAINZ] Успешно отправлен статус '${listenType}'`);
      return res;
    });
  }

  // Проверить токен ListenBrainz и получить имя пользователя
  static async listenBrainzValidateToken(token) {
    const url = 'https://api.listenbrainz.org/1/validate-token';
    const data = await makeHttpRequest(url, {
      headers: {
        'Authorization': `Token ${token}`
      }
    });
    if (data.valid === true) {
      return data.user_name;
    }
    throw new Error('Недействительный токен ListenBrainz');
  }
}

// Экспортируем в preload контекст
window.ScrobblerService = ScrobblerService;

class ScrobbleManager {
  constructor() {
    this.currentTrackId = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.playtimeMs = 0;
    this.lastTimestamp = 0;
    this.nowPlayingSent = false;
    this.scrobbled = false;
    
    // Дефолтные настройки
    this.config = {
      lastfmEnabled: false,
      lastfmApiKey: '',
      lastfmSecret: '',
      lastfmSessionKey: '',
      lastfmUsername: '',
      listenbrainzEnabled: false,
      listenbrainzToken: '',
      listenbrainzUsername: ''
    };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[SCROBBLER] Конфигурация обновлена:', {
      lastfmEnabled: this.config.lastfmEnabled,
      lastfmUsername: this.config.lastfmUsername,
      listenbrainzEnabled: this.config.listenbrainzEnabled,
      listenbrainzUsername: this.config.listenbrainzUsername
    });
  }

  onStateChange(trackId, isPause, position, metadata) {
    if (!trackId || !metadata) {
      this.reset();
      return;
    }

    const trackChanged = trackId !== this.currentTrackId;

    if (trackChanged) {
      // Пытаемся заскроблить предыдущий трек перед переключением, если порог был достигнут
      this.checkAndScrobble();

      console.log('[SCROBBLER] Обнаружена смена трека:', metadata.artist, '-', metadata.title);
      
      const apiObj = typeof RztAPI !== 'undefined' ? RztAPI : (typeof window !== 'undefined' ? window.RztAPI : null);
      if (apiObj) {
        apiObj.getTrackRatings(metadata.artist, metadata.title)
          .then(ratings => {
            if (ratings) {
              console.log(`[RZT] Оценки для "${metadata.artist} - ${metadata.title}": ` +
                `Фломастер (РЗТ): ${ratings.flomaster !== null ? ratings.flomaster : '—'} | ` +
                `Сайт (с рецензиями): ${ratings.withReviews !== null ? ratings.withReviews : '—'} | ` +
                `Сайт (без рецензий): ${ratings.withoutReviews !== null ? ratings.withoutReviews : '—'}`
              );
            } else {
              console.log(`[RZT] Оценки для "${metadata.artist} - ${metadata.title}" не найдены (возможно, релиз не оценен)`);
            }
          })
          .catch(err => {
            console.error('[RZT] Ошибка получения оценок:', err.message);
          });
      }

      this.currentTrackId = trackId;
      this.currentTrack = {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album || '',
        durationMs: metadata.durationMs || 0
      };
      this.isPlaying = !isPause;
      this.playtimeMs = 0;
      this.lastTimestamp = Date.now();
      this.nowPlayingSent = false;
      this.scrobbled = false;
    } else {
      const now = Date.now();
      if (this.isPlaying) {
        const delta = now - this.lastTimestamp;
        // Предохранитель от больших скачков во времени
        if (delta > 0 && delta < 5000) {
          this.playtimeMs += delta;
        }
      }
      this.isPlaying = !isPause;
      this.lastTimestamp = now;
    }

    // Отправляем "Слушает сейчас" после 2 секунд чистого воспроизведения
    if (!this.nowPlayingSent && this.playtimeMs > 2000) {
      this.sendNowPlaying();
    }

    // Проверяем условия для скроблинга
    this.checkAndScrobble();
  }

  reset() {
    this.checkAndScrobble();
    this.currentTrackId = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.playtimeMs = 0;
    this.lastTimestamp = 0;
    this.nowPlayingSent = false;
    this.scrobbled = false;
  }

  sendNowPlaying() {
    if (!this.currentTrack) return;
    this.nowPlayingSent = true;

    console.log('[SCROBBLER] Отправка статуса Now Playing для:', this.currentTrack.artist, '-', this.currentTrack.title);

    if (this.config.lastfmEnabled && this.config.lastfmSessionKey) {
      ScrobblerService.lastFmNowPlaying(this.currentTrack, this.config).catch(err => {
        console.error('[SCROBBLER] Ошибка Last.fm Now Playing:', err.message);
      });
    }

    if (this.config.listenbrainzEnabled && this.config.listenbrainzToken) {
      ScrobblerService.listenBrainzSubmit(this.currentTrack, this.config, 'playing_now').catch(err => {
        console.error('[SCROBBLER] Ошибка ListenBrainz Now Playing:', err.message);
      });
    }
  }

  checkAndScrobble() {
    if (!this.currentTrack || this.scrobbled) return;

    // Условия скробблинга Last.fm / ListenBrainz:
    // 1. Трек играл не менее 30 секунд.
    // 2. Прослушано 50% длины трека ИЛИ 4 минуты (240 секунд).
    const durationMs = this.currentTrack.durationMs || 180000; // По умолчанию 3 минуты, если неизвестно
    const playtimeSec = this.playtimeMs / 1000;
    const durationSec = durationMs / 1000;
    const thresholdSec = Math.min(durationSec / 2, 240);

    if (playtimeSec >= 30 && playtimeSec >= thresholdSec) {
      this.scrobbled = true;
      console.log(`[SCROBBLER] Условия скроблинга выполнены (время: ${Math.round(playtimeSec)}с, порог: ${Math.round(thresholdSec)}с). Отправляем скробл.`);

      if (this.config.lastfmEnabled && this.config.lastfmSessionKey) {
        ScrobblerService.lastFmScrobble(this.currentTrack, this.config).then(() => {
          console.log('[SCROBBLER] Last.fm Scrobble выполнен успешно');
        }).catch(err => {
          console.error('[SCROBBLER] Ошибка Last.fm Scrobble:', err.message);
        });
      }

      if (this.config.listenbrainzEnabled && this.config.listenbrainzToken) {
        ScrobblerService.listenBrainzSubmit(this.currentTrack, this.config, 'scrobble').then(() => {
          console.log('[SCROBBLER] ListenBrainz Scrobble выполнен успешно');
        }).catch(err => {
          console.error('[SCROBBLER] Ошибка ListenBrainz Scrobble:', err.message);
        });
      }
    }
  }
}

window.ScrobbleManager = new ScrobbleManager();

if (typeof module !== 'undefined') {
  module.exports = {
    ScrobblerService,
    ScrobbleManager: window.ScrobbleManager
  };
}

