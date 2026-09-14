// ==========================================
// BETTER YANDEX MUSIC - TRACK DOWNLOADER SUITE
// Supports:
// 1. Current playing track (Player bar & Context menu)
// 2. Individual track rows in playlists/collections/albums
// 3. Batch download for entire playlists and albums
// ==========================================

const YM_DOWNLOAD_SECRET_KEY = 'kzqU4XhfCaY6B6JTHODeq5';

// Глобальный кэш перехваченных данных стриминга по trackId
window.__ym_download_cache = window.__ym_download_cache || new Map();
window.__ym_latest_download_info = window.__ym_latest_download_info || null;
window.__ym_active_context_track = window.__ym_active_context_track || null;
window.__ym_captured_oauth_token = window.__ym_captured_oauth_token || null;

function cacheDownloadInfo(info, sourceUrl = '') {
  if (!info) return;
  let trackId = info.trackId ? String(info.trackId) : '';
  if (!trackId && sourceUrl) {
    try {
      const urlObj = new URL(sourceUrl.startsWith('http') ? sourceUrl : 'https://api.music.yandex.net' + (sourceUrl.startsWith('/') ? sourceUrl : '/' + sourceUrl));
      trackId = urlObj.searchParams.get('trackId') || '';
    } catch(e) {}
  }
  if (trackId) {
    window.__ym_download_cache.set(trackId, info);
  }
  window.__ym_latest_download_info = info;
  console.log('%c[DOWNLOADER] Аудиопоток захвачен!', 'color: #ffdb4d; font-weight: bold;', {
    trackId,
    codec: info.codec,
    bitrate: info.bitrate,
    quality: info.quality,
    url: info.url ? (info.url.substring(0, 50) + '...') : (info.urls?.[0] ? info.urls[0].substring(0, 50) + '...' : null),
    hasKey: !!info.key
  });
  updateDownloaderButtonTooltip();
}

// Извлечение и валидация формата токена (OAuth y0_...)
function cleanTokenFormat(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let t = raw.trim();
  if (t.toLowerCase().startsWith('oauth ')) {
    t = t.substring(6).trim();
  } else if (t.toLowerCase().startsWith('bearer ')) {
    t = t.substring(7).trim();
  }
  t = t.replace(/^["']|["']$/g, '');
  if (!t || t.length < 10) return null;
  return 'OAuth ' + t;
}

// Захват токена из сетевых запросов самого приложения
function inspectAndCaptureAuth(headers) {
  if (!headers) return;
  let auth = null;
  try {
    if (typeof headers.get === 'function') {
      auth = headers.get('authorization') || headers.get('Authorization');
    } else if (typeof headers === 'object') {
      auth = headers['authorization'] || headers['Authorization'] || headers['AUTHORIZATION'];
    }
  } catch(e) {}

  if (auth && typeof auth === 'string') {
    const cleaned = cleanTokenFormat(auth);
    if (cleaned && cleaned !== window.__ym_captured_oauth_token) {
      window.__ym_captured_oauth_token = cleaned;
      try {
        localStorage.setItem('__ym_captured_oauth_token', cleaned);
        sessionStorage.setItem('__ym_captured_oauth_token', cleaned);
      } catch(e) {}
      console.log('%c[DOWNLOADER] Авторизационный токен пользователя успешно захвачен из сети!', 'color: #10b981; font-weight: bold;');
    }
  }
}

// Комплексный поиск OAuth-токена во всех хранилищах и объектах
function getOAuthToken() {
  if (window.__ym_captured_oauth_token) {
    return window.__ym_captured_oauth_token;
  }

  // 1. Проверяем ранее сохраненный токен
  try {
    const saved = localStorage.getItem('__ym_captured_oauth_token') || sessionStorage.getItem('__ym_captured_oauth_token');
    if (saved) {
      window.__ym_captured_oauth_token = cleanTokenFormat(saved);
      return window.__ym_captured_oauth_token;
    }
  } catch(e) {}

  // 2. Проверяем ключ 'oauth' в localStorage (используется в Electron и web)
  try {
    const rawOauth = localStorage.getItem('oauth') || (typeof localStorage.oauth !== 'undefined' ? localStorage.oauth : null);
    if (rawOauth) {
      if (typeof rawOauth === 'string') {
        try {
          const parsed = JSON.parse(rawOauth);
          if (parsed && typeof parsed === 'object') {
            const tokenVal = parsed.value || parsed.token || parsed.accessToken || parsed.access_token;
            if (tokenVal) return cleanTokenFormat(tokenVal);
          }
        } catch(e) {
          if (rawOauth.length > 10) return cleanTokenFormat(rawOauth);
        }
      } else if (typeof rawOauth === 'object' && rawOauth !== null) {
        const tokenVal = rawOauth.value || rawOauth.token || rawOauth.accessToken;
        if (tokenVal) return cleanTokenFormat(tokenVal);
      }
    }
  } catch(e) {}

  // 3. Глубокое сканирование всех ключей localStorage на токен Яндекса
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const val = localStorage.getItem(k);
      if (!val) continue;

      const match = val.match(/(?:y0_|AQAAAA|AgAAAA)[a-zA-Z0-9_\-]{20,}/);
      if (match) {
        const token = cleanTokenFormat(match[0]);
        if (token) {
          console.log(`[DOWNLOADER] Токен обнаружен в localStorage[${k}]!`);
          window.__ym_captured_oauth_token = token;
          return token;
        }
      }
    }
  } catch(e) {}

  // 4. Сканирование sessionStorage
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      const val = sessionStorage.getItem(k);
      if (!val) continue;

      const match = val.match(/(?:y0_|AQAAAA|AgAAAA)[a-zA-Z0-9_\-]{20,}/);
      if (match) {
        const token = cleanTokenFormat(match[0]);
        if (token) {
          console.log(`[DOWNLOADER] Токен обнаружен в sessionStorage[${k}]!`);
          window.__ym_captured_oauth_token = token;
          return token;
        }
      }
    }
  } catch(e) {}

  // 5. Проверка глобальных объектов окна
  try {
    const fromWindow = window.__INITIAL_STATE__?.passport?.user?.token ||
      window.__INITIAL_STATE__?.user?.token ||
      window.passport?.user?.token ||
      window.DATAPACK?.token;
    if (fromWindow) return cleanTokenFormat(fromWindow);
  } catch(e) {}

  // 6. Проверка кук
  try {
    const cookieMatch = document.cookie.match(/oauth_token=([^;]+)/);
    if (cookieMatch) return cleanTokenFormat(decodeURIComponent(cookieMatch[1]));
  } catch(e) {}

  // Запрашиваем токен у расширения в фоне
  try {
    window.postMessage({ type: 'YM_REQUEST_OAUTH_TOKEN' }, '*');
  } catch(e) {}

  return null;
}

// Слушатель получения OAuth токена от background через isolated
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'YM_RECEIVE_OAUTH_TOKEN' && event.data.token) {
    const clean = cleanTokenFormat(event.data.token);
    if (clean) {
      window.__ym_captured_oauth_token = clean;
      try {
        localStorage.setItem('__ym_captured_oauth_token', clean);
        sessionStorage.setItem('__ym_captured_oauth_token', clean);
      } catch(e) {}
      console.log('%c[DOWNLOADER] OAuth токен успешно получен через расширение!', 'color: #10b981; font-weight: bold;');
    }
  }
});

// Асинхронное ожидание токена (если он запрашивается в данный момент)
async function ensureOAuthToken(maxWaitMs = 1500) {
  let token = getOAuthToken();
  if (token) return token;

  try {
    window.postMessage({ type: 'YM_REQUEST_OAUTH_TOKEN' }, '*');
  } catch(e) {}

  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 100));
    token = getOAuthToken();
    if (token) return token;
  }
  return null;
}

// Модальное окно подтверждения авторизации Яндекс ID (если попап заблокирован браузером)
function showAuthPromptModal() {
  return new Promise((resolve) => {
    let modal = document.getElementById('ym-auth-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'ym-auth-modal';
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      z-index: 10000001;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      font-family: Yandex Sans Text, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
    `;

    modal.innerHTML = `
      <div style="background: #18181c; border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 24px 28px; max-width: 440px; width: 90%; color: #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.6); text-align: center;">
        <div style="width: 48px; height: 48px; background: rgba(255, 219, 77, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffdb4d" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        </div>
        <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 8px; color: #fff;">Авторизация скачивания</h3>
        <p style="font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.7); margin: 0 0 20px;">
          Для загрузки треков в полном качестве (FLAC / 320 kbps) не из очереди воспроизведения требуется подтвердить доступ Яндекс ID.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="ym-auth-cancel" style="background: rgba(255,255,255,0.08); border: none; color: rgba(255,255,255,0.8); padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer;">Отмена</button>
          <button id="ym-auth-confirm" style="background: #ffdb4d; color: #000; border: none; padding: 10px 22px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer;">Войти через Яндекс ID</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const cancelBtn = modal.querySelector('#ym-auth-cancel');
    const confirmBtn = modal.querySelector('#ym-auth-confirm');

    cancelBtn.addEventListener('click', () => {
      modal.remove();
      resolve(null);
    });

    confirmBtn.addEventListener('click', () => {
      confirmBtn.textContent = 'Ожидание входа...';
      confirmBtn.style.opacity = '0.7';
      const authUrl = 'https://oauth.yandex.ru/authorize?response_type=token&client_id=23cabbbdc6cd418abb4b39c32c41195d';
      const popup = window.open(authUrl, 'ym_oauth', 'width=550,height=650');
      if (!popup) {
        showDownloadToast('Разрешите всплывающие окна в браузере', 'error');
        modal.remove();
        resolve(null);
        return;
      }

      const timer = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(timer);
            modal.remove();
            resolve(null);
            return;
          }
          const href = popup.location.href;
          if (href && href.includes('access_token=')) {
            const match = href.match(/access_token=([^&]+)/);
            if (match && match[1]) {
              const token = cleanTokenFormat(match[1]);
              window.__ym_captured_oauth_token = token;
              try {
                localStorage.setItem('__ym_captured_oauth_token', token);
                sessionStorage.setItem('__ym_captured_oauth_token', token);
              } catch(e) {}
              popup.close();
              clearInterval(timer);
              modal.remove();
              showDownloadToast('Авторизация успешна! Полное скачивание разблокировано.', 'success');
              resolve(token);
              return;
            }
          }
        } catch(e) {}
      }, 300);
    });
  });
}

// Авторизация через быстрое окно Яндекс ID (для браузера)
function authorizeViaOAuthPopup() {
  return new Promise((resolve) => {
    const authUrl = 'https://oauth.yandex.ru/authorize?response_type=token&client_id=23cabbbdc6cd418abb4b39c32c41195d';
    let popup = null;
    try {
      popup = window.open(authUrl, 'ym_oauth', 'width=550,height=650');
    } catch(e) {}

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      showAuthPromptModal().then(resolve);
      return;
    }

    showDownloadToast('Подтверждение доступа Яндекс Плюс...', 'info');

    const timer = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(timer);
          resolve(null);
          return;
        }
        const href = popup.location.href;
        if (href && href.includes('access_token=')) {
          const match = href.match(/access_token=([^&]+)/);
          if (match && match[1]) {
            const token = cleanTokenFormat(match[1]);
            window.__ym_captured_oauth_token = token;
            try {
              localStorage.setItem('__ym_captured_oauth_token', token);
              sessionStorage.setItem('__ym_captured_oauth_token', token);
            } catch(e) {}
            popup.close();
            clearInterval(timer);
            showDownloadToast('Авторизация успешна! Полное скачивание разблокировано.', 'success');
            console.log('[DOWNLOADER] OAuth токен успешно получен через окно авторизации!');
            resolve(token);
            return;
          }
        }
      } catch(e) {
        // Cross-origin до редиректа на music.yandex.ru - это нормально
      }
    }, 300);
  });
}
window.authorizeViaOAuthPopup = authorizeViaOAuthPopup;

// Ручная установка токена (для настроек или отладки в консоли)
window.setYmOAuthToken = function(tokenStr) {
  const clean = cleanTokenFormat(tokenStr);
  if (clean) {
    window.__ym_captured_oauth_token = clean;
    try {
      localStorage.setItem('__ym_captured_oauth_token', clean);
      sessionStorage.setItem('__ym_captured_oauth_token', clean);
    } catch(e) {}
    showDownloadToast('Токен авторизации успешно установлен!', 'success');
    console.log('[DOWNLOADER] Токен успешно сохранен:', clean.substring(0, 15) + '...');
    return true;
  } else {
    showDownloadToast('Некорректный формат токена', 'error');
    return false;
  }
};

// 1. Сетевой перехватчик: ловит get-file-info и Authorization headers через Fetch и XHR
(function initTrackInterceptor() {
  if (window.__ym_downloader_interceptor_installed) return;
  window.__ym_downloader_interceptor_installed = true;

  // 1.1 Перехват window.fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    try {
      const req = args[0];
      const init = args[1];
      if (init && init.headers) inspectAndCaptureAuth(init.headers);
      if (req instanceof Request && req.headers) inspectAndCaptureAuth(req.headers);
    } catch(e) {}

    const fetchPromise = originalFetch.apply(this, args);
    try {
      const request = args[0];
      const url = typeof request === 'string' ? request : (request && request.url ? request.url : '');
      if (url && (url.includes('get-file-info') || url.includes('/get-file-info'))) {
        fetchPromise.then(async (response) => {
          try {
            const clone = response.clone();
            const data = await clone.json();
            if (data && data.downloadInfo) {
              cacheDownloadInfo(data.downloadInfo, url);
            }
          } catch(e) {}
        }).catch(() => {});
      }
    } catch(e) {}
    return fetchPromise;
  };

  // 1.2 Перехват XMLHttpRequest
  try {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    const origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
      if (header && header.toLowerCase() === 'authorization') {
        inspectAndCaptureAuth({ authorization: value });
      }
      return origSetRequestHeader.apply(this, arguments);
    };

    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this.__ym_url = url;
      return origOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function(...args) {
      if (this.__ym_url && typeof this.__ym_url === 'string' && this.__ym_url.includes('get-file-info')) {
        const xhr = this;
        xhr.addEventListener('load', function() {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data && data.downloadInfo) {
              cacheDownloadInfo(data.downloadInfo, xhr.__ym_url);
            }
          } catch(e) {}
        });
      }
      return origSend.apply(this, args);
    };
  } catch(xhrErr) {
    console.warn('[DOWNLOADER] Не удалось установить XHR перехватчик:', xhrErr);
  }
})();

// 2. Всплывающее уведомление (Toast)
function showDownloadToast(text, type = 'info') {
  let toast = document.getElementById('ym-download-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ym-download-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 124px;
      right: 28px;
      background: rgba(20, 20, 24, 0.94);
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      font-family: Yandex Sans Text, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      z-index: 1000000;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0;
      transform: translateY(12px);
      transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }

  // На главной странице (где нет нижней фиксированной панели плеера) опускаем уведомление ниже
  const isMainPage = window.location.pathname === '/' || window.location.pathname === '';
  const hasBottomPlayer = !!document.querySelector('[class*="PlayerBarDesktop_root"], [class*="PlayerBar_root"], [class*="PlayerBarDesktopWithBackgroundProgressBar_player"]');
  toast.style.bottom = (isMainPage || !hasBottomPlayer) ? '24px' : '124px';

  const iconSvg = type === 'success'
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffdb4d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : type === 'error'
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="8"></line></svg>`;

  toast.innerHTML = `${iconSvg}<span>${text}</span>`;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  if (window.__ym_toast_timer) clearTimeout(window.__ym_toast_timer);
  window.__ym_toast_timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
  }, 3500);
}
window.showDownloadToast = showDownloadToast;

// 3. HMAC-SHA256 подпись и вызовы API Яндекс Музыки
async function getSign(data, secretKey = YM_DOWNLOAD_SECRET_KEY) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return base64.slice(0, -1);
}

function getApiHeaders() {
  const headers = {
    'X-Yandex-Music-Client': 'YandexMusicDesktopAppWindows/' + (window.VERSION || '5.36.0'),
    'X-Yandex-Music-Frontend': 'new',
    'X-Yandex-Music-Without-Invocation-Info': '1'
  };

  const token = getOAuthToken();
  if (token) {
    headers['Authorization'] = token;
    console.log('[DOWNLOADER] Используется токен авторизации:', token.substring(0, 15) + '...');
  } else {
    console.warn('[DOWNLOADER] Предупреждение: Токен авторизации не обнаружен. Запрос может вернуть 30-секундное превью.');
  }

  return headers;
}

// Запрос прямой ссылки на аудиопоток по trackId по требованию
async function fetchTrackDownloadInfo(trackId, quality = 'lossless') {
  const cleanId = String(trackId);
  const ts = Math.floor(Date.now() / 1000);
  
  // Для lossless запрашиваем строго FLAC. Для nq запрашиваем строго MP3 320 kbps
  const audioCodecs = quality === 'lossless'
    ? ['flac', 'flac-mp4']
    : ['mp3'];
  const transports = 'encraw';
  const signData = `${ts}${cleanId}${quality}${audioCodecs.join('')}${transports}`;
  const sign = await getSign(signData);
  const url = `https://api.music.yandex.net/get-file-info?ts=${ts}&trackId=${cleanId}&quality=${quality}&codecs=${encodeURIComponent(audioCodecs.join(','))}&transports=${transports}&sign=${encodeURIComponent(sign)}`;

  await ensureOAuthToken(1000);
  const headers = getApiHeaders();
  const response = await fetch(url, { headers, credentials: 'include' });
  if (!response.ok) {
    if (quality === 'lossless') {
      console.warn(`[DOWNLOADER] Lossless недоступен для трека ${cleanId}, пробуем nq (320kbps MP3)...`);
      return fetchTrackDownloadInfo(cleanId, 'nq');
    }
    throw new Error(`get-file-info вернул HTTP ${response.status}`);
  }

  const json = await response.json();
  let downloadInfo = json?.downloadInfo;
  if (!downloadInfo) {
    if (quality === 'lossless') {
      return fetchTrackDownloadInfo(cleanId, 'nq');
    }
    throw new Error('Ответ сервера не содержит downloadInfo');
  }

  // Если сервер вернул preview (30-секундный фрагмент из-за отсутствия авторизации)
  if (downloadInfo.quality === 'preview') {
    console.warn('[DOWNLOADER] Внимание: сервер вернул 30-секундный preview. Пытаемся применить авторизацию...');
    const token = await ensureOAuthToken(1500);
    if (token && headers['Authorization'] !== token) {
      headers['Authorization'] = token;
      const retryRes = await fetch(url, { headers, credentials: 'include' });
      if (retryRes.ok) {
        const retryJson = await retryRes.json();
        if (retryJson?.downloadInfo && retryJson.downloadInfo.quality !== 'preview') {
          console.log('[DOWNLOADER] Успешно получен полный трек после повторной авторизации!');
          downloadInfo = retryJson.downloadInfo;
        }
      }
    } else if (quality === 'lossless') {
      return fetchTrackDownloadInfo(cleanId, 'nq');
    }
  }

  if (!downloadInfo.url && Array.isArray(downloadInfo.urls) && downloadInfo.urls.length > 0) {
    downloadInfo.url = downloadInfo.urls[0];
  }
  if (!downloadInfo.trackId) {
    downloadInfo.trackId = cleanId;
  }

  cacheDownloadInfo(downloadInfo, url);
  return downloadInfo;
}

// 4. Получение метаданных текущего трека (для плеера)
function getCurrentTrackInfo() {
  try {
    const activePlayer = window.getActivePlayer && window.getActivePlayer();
    if (activePlayer) {
      const track = activePlayer.playbackState?.playerState?.track?.value || activePlayer.playbackState?.playerState?.track;
      const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value || activePlayer.queueController?.queue?.state?.currentEntity;
      const entityData = currentEntity?.entity?.data;
      const dataObj = track || entityData?.meta || entityData;
      if (dataObj) {
        const trackId = String(dataObj.id || dataObj.realId || entityData?.meta?.id || '');
        const title = dataObj.title || 'Трек';
        let artist = 'Неизвестный исполнитель';
        if (Array.isArray(dataObj.artists) && dataObj.artists.length > 0) {
          artist = dataObj.artists.map(a => typeof a === 'object' && a !== null ? (a.name || '') : String(a)).filter(Boolean).join(', ');
        } else if (dataObj.artist) {
          artist = dataObj.artist;
        }
        let album = '';
        if (Array.isArray(dataObj.albums) && dataObj.albums[0]?.title) {
          album = dataObj.albums[0].title;
        } else if (dataObj.album?.title) {
          album = dataObj.album.title;
        }
        let year = '';
        if (Array.isArray(dataObj.albums) && dataObj.albums[0]?.year) {
          year = String(dataObj.albums[0].year);
        } else if (dataObj.year) {
          year = String(dataObj.year);
        }
        const coverUri = dataObj.coverUri || dataObj.ogImage || '';
        return { trackId, title, artist, album, year, coverUri };
      }
    }
  } catch(e) {}

  if (typeof currentTrackMetadata !== 'undefined' && currentTrackMetadata) {
    return {
      trackId: String(currentTrackMetadata.id || ''),
      title: currentTrackMetadata.title || 'Трек',
      artist: currentTrackMetadata.artist || 'Неизвестный исполнитель',
      album: currentTrackMetadata.album || '',
      year: currentTrackMetadata.year ? String(currentTrackMetadata.year) : '',
      coverUri: currentTrackMetadata.coverUri || ''
    };
  }

  return null;
}

// Извлечение информации о потоке напрямую из структур Sonata
function getDownloadInfoFromPlayer() {
  try {
    const activePlayer = window.getActivePlayer && window.getActivePlayer();
    if (!activePlayer) return null;
    const currentEntity = activePlayer.queueController?.queue?.state?.currentEntity?.value || activePlayer.queueController?.queue?.state?.currentEntity;
    
    const candidates = [
      currentEntity?.entity?.mediaSourceData?.data,
      currentEntity?.entity?.mediaSourceData,
      currentEntity?.entity?.mediaSourceData?.data?.downloadInfo,
      currentEntity?.entity?.data?.mediaSourceData?.data,
      activePlayer.playbackState?.currentMediaPlayer?.mediaSourceData?.data,
      activePlayer.playbackState?.mediaPlayersStore?.currentMediaPlayer?.mediaSourceData?.data
    ];

    for (const c of candidates) {
      if (c && typeof c === 'object') {
        const url = c.url || c.src || c.downloadInfo?.url || c.urls?.[0];
        const key = c.key || c.secretKey || c.downloadInfo?.key;
        if (url && key) {
          return {
            url,
            key,
            codec: c.codec || c.downloadInfo?.codec || 'mp3',
            bitrate: c.bitrate || c.downloadInfo?.bitrate || 0,
            quality: c.quality || c.downloadInfo?.quality || '',
            trackId: String(c.trackId || currentEntity?.entity?.data?.meta?.id || '')
          };
        }
      }
    }
  } catch(e) {}
  return null;
}

// 5. Расшифровка аудиопотока в буфер памяти
async function getTrackDecryptedBuffer(downloadInfo, metadata) {
  const streamUrl = downloadInfo.url || downloadInfo.urls?.[0];
  if (!streamUrl) throw new Error('Отсутствует URL аудиофайла');

  const response = await fetch(streamUrl);
  if (!response.ok) throw new Error('Ошибка загрузки потока: HTTP ' + response.status);
  const arrayBuffer = await response.arrayBuffer();

  let finalBuffer = arrayBuffer;
  if (downloadInfo.key) {
    const hexKey = downloadInfo.key;
    const keyBytes = new Uint8Array(hexKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-CTR' },
      false,
      ['decrypt']
    );
    const counter = new Uint8Array(16);
    finalBuffer = await crypto.subtle.decrypt(
      { name: 'AES-CTR', counter, length: 128 },
      cryptoKey,
      arrayBuffer
    );
  }

  const codecLower = (downloadInfo.codec || '').toLowerCase();
  const isFlac = codecLower.includes('flac');
  const isAac = codecLower.includes('aac');
  const ext = isFlac ? 'flac' : (isAac ? 'm4a' : 'mp3');
  const mime = isFlac ? 'audio/flac' : (isAac ? 'audio/mp4' : 'audio/mpeg');

  const safeArtist = (metadata.artist || 'Artist').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  const safeTitle = (metadata.title || 'Track').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  const fileName = `${safeArtist} - ${safeTitle}.${ext}`.substring(0, 180);

  return {
    buffer: new Uint8Array(finalBuffer),
    fileName,
    ext,
    mime,
    safeArtist,
    safeTitle
  };
}

// 6. Скачивание одиночного файла в браузере
async function downloadInBrowser(downloadInfo, metadata) {
  const fileData = await getTrackDecryptedBuffer(downloadInfo, metadata);
  const blob = new Blob([fileData.buffer], { type: fileData.mime });
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileData.fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(blobUrl);
  }, 1000);

  return { ok: true, fileName: fileData.fileName };
}

// 7. Вызов Electron Preload Bridge
function callElectronDownloadBridge(downloadInfo, metadata) {
  return new Promise((resolve, reject) => {
    const requestId = 'dl_' + Math.random().toString(36).substring(2, 9);
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Превышено время ожидания загрузки трека (таймаут 15 сек)'));
    }, 15000);

    const handler = (event) => {
      if (!event.data || !event.data.__ym_sc_bridge_response || event.data.requestId !== requestId) return;
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
      if (event.data.response && event.data.response.ok) {
        resolve(event.data.response);
      } else {
        reject(new Error(event.data.response?.error || 'Неизвестная ошибка сохранения'));
      }
    };

    window.addEventListener('message', handler);
    window.postMessage({
      type: 'YM_DOWNLOAD_TRACK',
      requestId,
      payload: { downloadInfo, metadata }
    }, '*');
  });
}

// 8. Получение информации об аудиопотоке трека (с кэшем и авторизацией)
async function resolveTrackDownloadInfo(trackInfo, customDownloadInfo = null) {
  if (!trackInfo || !trackInfo.trackId) {
    throw new Error('Отсутствует ID трека');
  }
  const trackId = String(trackInfo.trackId);
  const preferredQuality = (typeof localStorage !== 'undefined' && localStorage.getItem('ymDownloadPreferredQuality')) || 'lossless';

  // Проверка соответствия качества потока выбранной настройке пользователя
  function isQualityMatching(info) {
    if (!info || info.quality === 'preview') return false;
    const codec = (info.codec || '').toLowerCase();
    if (preferredQuality === 'lossless') {
      return codec.includes('flac') || info.quality === 'lossless';
    } else {
      return codec.includes('mp3');
    }
  }

  let downloadInfo = customDownloadInfo;
  if (downloadInfo && !isQualityMatching(downloadInfo)) {
    downloadInfo = null;
  }

  // 1. Проверяем кэш, ТОЛЬКО если формат в кэше соответствует настройке
  if (!downloadInfo) {
    if (window.__ym_download_cache.has(trackId)) {
      const cached = window.__ym_download_cache.get(trackId);
      if (isQualityMatching(cached)) {
        downloadInfo = cached;
      }
    }
  }

  // 2. Если трек сейчас играет в плеере, берем из Sonata ТОЛЬКО если качество соответствует настройке
  if (!downloadInfo) {
    const currentTrack = getCurrentTrackInfo();
    if (currentTrack && currentTrack.trackId === trackId) {
      const playerInfo = getDownloadInfoFromPlayer();
      if (isQualityMatching(playerInfo)) {
        downloadInfo = playerInfo;
      }
    }
  }

  // 3. Если подходящего потока нет, запрашиваем с сервера с нужным качеством
  if (!downloadInfo || downloadInfo.quality === 'preview') {
    const isDesktop = typeof window !== 'undefined' && 
      (window.navigator.userAgent.includes('Electron') || 
       (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendState === 'function'));

    if (!isDesktop && !getOAuthToken()) {
      const token = await authorizeViaOAuthPopup();
      if (!token) {
        throw new Error('Для скачивания полного трека требуется авторизация Яндекс ID');
      }
    }

    downloadInfo = await fetchTrackDownloadInfo(trackId, preferredQuality);
  }

  if (!downloadInfo || (!downloadInfo.url && (!downloadInfo.urls || downloadInfo.urls.length === 0))) {
    throw new Error('Не удалось получить адрес аудиопотока');
  }
  if (downloadInfo.quality === 'preview') {
    throw new Error('Сервер предоставил только 30-секундное превью (требуется активный Яндекс Плюс)');
  }
  if (!downloadInfo.url && downloadInfo.urls?.[0]) {
    downloadInfo.url = downloadInfo.urls[0];
  }

  return downloadInfo;
}

// 9. Универсальная функция скачивания любого трека
async function downloadTrack(trackInfo, customDownloadInfo = null) {
  const downloadInfo = await resolveTrackDownloadInfo(trackInfo, customDownloadInfo);

  const isDesktop = typeof window !== 'undefined' && 
    (window.navigator.userAgent.includes('Electron') || 
     (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendState === 'function'));

  let result;
  if (isDesktop) {
    try {
      result = await callElectronDownloadBridge(downloadInfo, trackInfo);
    } catch(bridgeErr) {
      console.warn('[DOWNLOADER] Нативный мост не ответил, скачиваем через браузерный движок:', bridgeErr.message);
      result = await downloadInBrowser(downloadInfo, trackInfo);
    }
  } else {
    result = await downloadInBrowser(downloadInfo, trackInfo);
  }

  return result;
}
window.downloadTrack = downloadTrack;

// Скачивание по одному ID (с автополучением метаданных)
async function downloadTrackById(trackId, optionalMeta = {}) {
  const meta = {
    trackId: String(trackId),
    title: optionalMeta.title || ('Трек ' + trackId),
    artist: optionalMeta.artist || 'Яндекс Музыка',
    album: optionalMeta.album || '',
    year: optionalMeta.year || '',
    coverUri: optionalMeta.coverUri || ''
  };
  return downloadTrack(meta);
}
window.downloadTrackById = downloadTrackById;

// 8. Скачивание текущего воспроизводимого трека
let isDownloadingCurrentTrack = false;

async function triggerDownloadCurrentTrack() {
  if (isDownloadingCurrentTrack) return;

  const trackInfo = getCurrentTrackInfo();
  if (!trackInfo) {
    showDownloadToast('Включите любой трек для скачивания', 'error');
    return;
  }

  const btn = document.getElementById('ym-player-download-btn');
  isDownloadingCurrentTrack = true;
  if (btn) {
    btn.classList.add('ym-downloading');
    btn.innerHTML = `<svg class="ym-download-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path></svg>`;
  }

  const preferredQuality = (typeof localStorage !== 'undefined' && localStorage.getItem('ymDownloadPreferredQuality')) || 'lossless';
  const formatBadge = preferredQuality === 'lossless' ? 'FLAC' : 'MP3 320';
  showDownloadToast(`Скачивание: ${trackInfo.artist} - ${trackInfo.title} [${formatBadge}]...`, 'info');

  try {
    const result = await downloadTrack(trackInfo);
    if (btn) {
      btn.classList.remove('ym-downloading');
      btn.classList.add('ym-download-success');
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffdb4d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      setTimeout(() => {
        btn.classList.remove('ym-download-success');
        resetDownloadButtonIcon(btn);
      }, 3000);
    }
    showDownloadToast(`Сохранено: ${result.fileName || (trackInfo.artist + ' - ' + trackInfo.title)}`, 'success');
  } catch(err) {
    console.error('[DOWNLOADER] Ошибка скачивания текущего трека:', err);
    if (btn) {
      btn.classList.remove('ym-downloading');
      btn.classList.add('ym-download-error');
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      setTimeout(() => {
        btn.classList.remove('ym-download-error');
        resetDownloadButtonIcon(btn);
      }, 3000);
    }
    showDownloadToast(`Ошибка скачивания: ${err.message}`, 'error');
  } finally {
    isDownloadingCurrentTrack = false;
  }
}
window.triggerDownloadCurrentTrack = triggerDownloadCurrentTrack;

function resetDownloadButtonIcon(btn) {
  if (!btn) return;
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
}

function updateDownloaderButtonTooltip() {
  const btn = document.getElementById('ym-player-download-btn');
  if (!btn) return;
  const trackInfo = getCurrentTrackInfo();
  let qualityStr = '';
  if (trackInfo && trackInfo.trackId && window.__ym_download_cache.has(trackInfo.trackId)) {
    const info = window.__ym_download_cache.get(trackInfo.trackId);
    const isLossless = (info.codec || '').toLowerCase().includes('flac');
    qualityStr = isLossless ? ' [FLAC Lossless]' : (info.bitrate ? ` [${info.bitrate} kbps]` : ` [${(info.codec || 'MP3').toUpperCase()}]`);
  }
  btn.setAttribute('title', `Скачать текущий трек${qualityStr}`);
}

// 9. Инжекция кнопки в панель управления плеера
function injectPlayerDownloadButton() {
  // Очищаем ошибочно внедренные кнопки скачивания из полноэкранного режима или обложки
  const rogueBtn = document.querySelector(`
    [class*="FullscreenPlayer"] #ym-player-download-btn,
    [class*="VibePlayer"] #ym-player-download-btn,
    [class*="coverContainer"] #ym-player-download-btn,
    [class*="Cover_root"] #ym-player-download-btn,
    [class*="VibeCover"] #ym-player-download-btn
  `);
  if (rogueBtn) rogueBtn.remove();

  let existingBtn = document.getElementById('ym-player-download-btn');
  if (existingBtn) {
    if (existingBtn.closest('[class*="FullscreenPlayer"], [class*="VibePlayer"], [class*="cover"], [class*="Cover"]')) {
      existingBtn.remove();
      existingBtn = null;
    } else {
      updateDownloaderButtonTooltip();
      return;
    }
  }

  // Ищем строго в фиксированной нижней панели плеера
  const playerBar = document.querySelector(`
    [class*="PlayerBarDesktopWithBackgroundProgressBar_player"],
    [class*="PlayerBarDesktop_root"],
    [class*="PlayerBar_root"],
    [class*="PlayerBar_player"],
    [class*="PlayerBarDesktop_player"]
  `);
  if (!playerBar) return;
  if (playerBar.closest('[class*="FullscreenPlayerDesktop_root"], [class*="FullscreenPlayer_root"], [class*="VibePlayer_root"]')) return;

  const qualityIndicator = playerBar.querySelector('#ym-player-quality-indicator');
  const lyricsBtn = playerBar.querySelector('button[aria-label*="текстомузыку"], button[aria-label*="Lyrics"], [class*="lyricsButton"], [class*="LyricsButton"]');
  const targetSibling = qualityIndicator || lyricsBtn;

  if (!targetSibling || !targetSibling.parentNode) return;

  const btn = document.createElement('button');
  btn.id = 'ym-player-download-btn';
  btn.className = 'ym-player-download-btn';
  btn.setAttribute('type', 'button');
  btn.setAttribute('aria-label', 'Скачать текущий трек');
  btn.setAttribute('title', 'Скачать текущий трек');
  resetDownloadButtonIcon(btn);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    triggerDownloadCurrentTrack();
  });

  targetSibling.parentNode.insertBefore(btn, targetSibling);
  updateDownloaderButtonTooltip();
}

// 10. Извлечение метаданных трека из строки DOM
function extractTrackMetadataFromRow(row) {
  if (!row) return null;

  // Track ID
  let trackId = row.getAttribute('data-entity-id') || row.getAttribute('data-track-id') || '';
  if (!trackId) {
    const trackLink = row.querySelector('a[href*="/track/"]');
    if (trackLink) {
      const match = trackLink.href.match(/\/track\/(\d+)/);
      if (match) trackId = match[1];
    }
  }
  if (!trackId) {
    const albumLink = row.querySelector('a[href*="/album/"]');
    if (albumLink) {
      const match = albumLink.href.match(/\/track\/(\d+)/);
      if (match) trackId = match[1];
    }
  }

  // Title
  let title = '';
  const titleEl = row.querySelector('[class*="Meta_title"], [class*="titleContainer"] [class*="title"], [class*="CommonTrack_title"]');
  if (titleEl) {
    title = titleEl.textContent.trim();
  } else {
    const trackLink = row.querySelector('a[href*="/track/"]');
    if (trackLink) title = trackLink.textContent.trim();
  }
  if (!title) title = 'Трек';

  // Artist
  let artist = '';
  const artistEls = row.querySelectorAll('[class*="Meta_artist"] a, [class*="artistsContainer"] a, a[href*="/artist/"]');
  if (artistEls.length > 0) {
    artist = Array.from(artistEls).map(el => el.textContent.trim()).filter(Boolean).join(', ');
  } else {
    const artistContainer = row.querySelector('[class*="Meta_artist"], [class*="artistsContainer"]');
    if (artistContainer) {
      artist = artistContainer.textContent.trim();
    }
  }
  if (!artist) artist = 'Неизвестный исполнитель';

  // Cover
  let coverUri = '';
  const coverImg = row.querySelector('img[class*="cover"], img[class*="Cover"], [class*="coverContainer"] img');
  if (coverImg && coverImg.src) {
    coverUri = coverImg.src;
  }

  return {
    trackId: String(trackId),
    title,
    artist,
    album: '',
    year: '',
    coverUri
  };
}
window.extractTrackMetadataFromRow = extractTrackMetadataFromRow;

// Поиск строки трека от любого элемента внутри нее
function findTrackRowFromElement(el) {
  if (!el) return null;
  const standardRow = el.closest(`
    [class*="CommonTrack_root"],
    [class*="HorizontalCardContainer_root"],
    [data-entity-id],
    [class*="Track_root"],
    [class*="TrackItem_root"],
    [class*="TrackRow_root"],
    [class*="track_root"]
  `);
  if (standardRow) return standardRow;

  let curr = el;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    if (curr.querySelector && curr.querySelector('a[href*="/track/"], a[href*="/album/"][href*="track="]')) {
      return curr;
    }
    curr = curr.parentElement;
  }
  return null;
}

// Перехват открытия контекстного меню "..." или правого клика по строке трека
function captureActiveContextTrack(e) {
  const target = e.target;
  if (!target) return;
  const contextBtn = target.closest(`
    button[aria-label*="меню"],
    button[aria-label*="Меню"],
    button[aria-label*="More"],
    button[aria-label*="more"],
    button[aria-label*="Дополнительно"],
    button[aria-label*="дополнительно"],
    button[aria-label*="Ещё"],
    button[aria-label*="ещё"],
    button[aria-label*="еще"],
    button[aria-haspopup="menu"],
    [class*="contextMenuButton"],
    [class*="ContextMenuButton"],
    [class*="contextMenuWrapper"] button,
    [class*="ContextMenuWrapper"] button
  `);
  const row = findTrackRowFromElement(contextBtn || target);
  if (row) {
    window.__ym_active_context_track = extractTrackMetadataFromRow(row);
    console.log('[DOWNLOADER] Активный трек для контекстного меню захвачен:', window.__ym_active_context_track);
  }
}
document.addEventListener('pointerdown', captureActiveContextTrack, true);
document.addEventListener('mousedown', captureActiveContextTrack, true);
document.addEventListener('click', captureActiveContextTrack, true);
document.addEventListener('contextmenu', (e) => {
  const row = findTrackRowFromElement(e.target);
  if (row) {
    window.__ym_active_context_track = extractTrackMetadataFromRow(row);
  }
}, true);

// Безопасное определение трека для контекстного меню
function resolveContextTrack(contextMenu) {
  if (window.__ym_active_context_track && (window.__ym_active_context_track.trackId || window.__ym_active_context_track.title)) {
    return window.__ym_active_context_track;
  }

  // 1. Поиск кнопки вызова контекстного меню с aria-expanded="true"
  const expandedBtn = document.querySelector('button[aria-expanded="true"]');
  if (expandedBtn) {
    const row = findTrackRowFromElement(expandedBtn);
    if (row) {
      const meta = extractTrackMetadataFromRow(row);
      if (meta && (meta.trackId || meta.title)) return meta;
    }
  }

  // 2. Поиск ссылки на трек внутри самого открытого контекстного меню
  if (contextMenu) {
    const trackLink = contextMenu.querySelector('a[href*="/track/"]');
    if (trackLink) {
      const m = trackLink.getAttribute('href').match(/\/track\/(\d+)/);
      if (m) {
        const title = contextMenu.querySelector('[class*="title"], [class*="Title"]')?.textContent?.trim() || 'Трек';
        const artist = contextMenu.querySelector('[class*="subtitle"], [class*="Subtitle"], [class*="artist"], [class*="Artist"]')?.textContent?.trim() || '';
        return { trackId: m[1], title, artist, album: '', year: '', coverUri: '' };
      }
    }
  }

  // 3. Если меню открыто из плеера (PlayerBar / FullscreenPlayer / VibePlayerBar) или трек из строки не найден
  if (typeof getCurrentTrackInfo === 'function') {
    const current = getCurrentTrackInfo();
    if (current && (current.trackId || current.title)) {
      return current;
    }
  }

  return null;
}

// Безопасное закрытие контекстного меню без блокировки интерфейса (без застревания backdrop)
function closeContextMenuSafely(contextMenu) {
  const escOpts = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true };
  if (document.activeElement) {
    try {
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', escOpts));
      document.activeElement.dispatchEvent(new KeyboardEvent('keyup', escOpts));
    } catch(e) {}
  }
  document.dispatchEvent(new KeyboardEvent('keydown', escOpts));
  document.dispatchEvent(new KeyboardEvent('keyup', escOpts));
  window.dispatchEvent(new KeyboardEvent('keydown', escOpts));
  window.dispatchEvent(new KeyboardEvent('keyup', escOpts));

  const expandedBtn = document.querySelector('button[aria-expanded="true"]');
  if (expandedBtn) {
    try {
      expandedBtn.click();
    } catch(e) {}
  }

  setTimeout(() => {
    if (document.body) {
      document.body.style.pointerEvents = '';
      document.body.removeAttribute('inert');
      document.body.removeAttribute('data-floating-ui-inert');
    }
    const appRoot = document.getElementById('root') || document.querySelector('[class*="App_root"]');
    if (appRoot) {
      appRoot.style.pointerEvents = '';
      appRoot.removeAttribute('inert');
      appRoot.removeAttribute('data-floating-ui-inert');
    }

    document.querySelectorAll('[class*="Popover_backdrop"], [class*="ContextMenu_backdrop"], [class*="Overlay_root"]').forEach(el => {
      el.remove();
    });

    if (contextMenu && contextMenu.isConnected) {
      const portal = contextMenu.closest('[data-floating-ui-portal], [class*="Popover_root"], [class*="Portal_root"]');
      if (portal && portal !== document.body && portal !== appRoot && portal.parentElement) {
        portal.remove();
      } else {
        contextMenu.remove();
      }
    }

    document.querySelectorAll('[data-floating-ui-portal]').forEach(p => {
      if (!p.firstElementChild || p.querySelectorAll('button:not([class*="ym-"]), a:not([class*="ym-"])').length === 0) {
        p.remove();
      }
    });
  }, 50);
}

// Инжекция пункта "Скачать трек" в контекстное меню трека
function checkContextMenuAndAddDownloadOption(specificMenu) {
  const contextMenu = specificMenu || document.querySelector('[role="menu"], [class*="ContextMenu_root"], [class*="VibeContextMenu_root"]');
  if (!contextMenu) return;

  if (contextMenu.dataset.ymDownloadOptionPatched === 'true') return;

  const innerText = contextMenu.innerText || '';
  const isTrackMenu = innerText.includes('Моя волна по треку') || innerText.toLowerCase().includes('моя волна по треку');
  const hasTrackIcon = !!contextMenu.querySelector('svg use[xlink\\:href*="vibe"]');

  if (!isTrackMenu && !hasTrackIcon) {
    return;
  }

  contextMenu.dataset.ymDownloadOptionPatched = 'true';

  const container = contextMenu.querySelector('[class*="ContextMenu_menu"], [class*="ContextMenu_list"], .ggP7WX2_erziDHFOo32s') || contextMenu;
  if (!container) return;

  if (container.querySelector('.ym-context-menu-download-btn')) return;

  const siblingButton = container.querySelector('button');
  const downloadBtn = document.createElement('button');
  downloadBtn.className = siblingButton ? siblingButton.className : 'cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM';
  downloadBtn.type = 'button';
  downloadBtn.setAttribute('role', 'menuitem');
  downloadBtn.setAttribute('tabindex', '-1');
  downloadBtn.classList.add('ym-context-menu-download-btn');

  downloadBtn.innerHTML = `
    <span class="JjlbHZ4FaP9EAcR_1DxF">
      <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 12px;">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Скачать трек
    </span>
  `;

  downloadBtn.addEventListener('click', async () => {
    const trk = resolveContextTrack(contextMenu);
    window.__ym_active_context_track = null;
    closeContextMenuSafely(contextMenu);

    if (trk && (trk.trackId || trk.title)) {
      showDownloadToast(`Скачивание: ${trk.artist || ''} - ${trk.title}...`, 'info');
      try {
        const res = await downloadTrack(trk);
        showDownloadToast(`Сохранено: ${res.fileName || ((trk.artist ? trk.artist + ' - ' : '') + trk.title)}`, 'success');
      } catch(err) {
        console.error('[DOWNLOADER] Ошибка скачивания трека из контекстного меню:', err);
        showDownloadToast(`Ошибка скачивания: ${err.message}`, 'error');
      }
    } else {
      triggerDownloadCurrentTrack();
    }
  });

  const fullscreenBtn = Array.from(container.querySelectorAll('button')).find(btn => {
    return (btn.innerText || '').toLowerCase().includes('развернуть на весь экран');
  });

  if (fullscreenBtn) {
    fullscreenBtn.parentNode.insertBefore(downloadBtn, fullscreenBtn.nextSibling);
  } else {
    const vibeBtn = Array.from(container.querySelectorAll('button')).find(btn => {
      return (btn.innerText || '').toLowerCase().includes('моя волна по треку');
    });
    if (vibeBtn) {
      vibeBtn.parentNode.insertBefore(downloadBtn, vibeBtn.nextSibling);
    } else {
      container.appendChild(downloadBtn);
    }
  }
}

if (typeof window !== 'undefined' && !window.__ym_context_menu_dl_observer) {
  const dlObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const menu = node.matches?.('[role="menu"], [class*="ContextMenu_root"], [class*="VibeContextMenu_root"]') ? node : node.querySelector?.('[role="menu"], [class*="ContextMenu_root"], [class*="VibeContextMenu_root"]');
          if (menu) {
            setTimeout(() => checkContextMenuAndAddDownloadOption(menu), 40);
          }
        }
      }
    }
  });
  dlObserver.observe(document.body, { childList: true, subtree: true });
  window.__ym_context_menu_dl_observer = dlObserver;
}

// 11. Инжекция кнопок скачивания в каждую строку трека
function injectTrackRowDownloadButtons() {
  const rows = document.querySelectorAll('[class*="CommonTrack_root"], [class*="HorizontalCardContainer_root"]');
  if (!rows || rows.length === 0) return;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const controls = row.querySelector('[class*="CommonControlsBar_controls"], [class*="CommonControlsBar_root"]');
    if (!controls) continue;

    // Находим элемент кнопки "Нравится" (сердечко) или её контейнер, чтобы кнопка скачивания была СЛЕВА от неё
    let likeTarget = null;
    const likeBtn = controls.querySelector('button[aria-label*="равится"], button[aria-label*="Like"], button[aria-label*="like"], button[title*="равится"], button[title*="Like"]');
    if (likeBtn) {
      let curr = likeBtn;
      while (curr && curr.parentNode !== controls) {
        curr = curr.parentNode;
      }
      likeTarget = curr || likeBtn;
    }
    if (!likeTarget) {
      const likeWrapper = controls.querySelector('[class*="likeWrapper"], [class*="LikeWrapper"], [class*="likeControl"], [class*="LikeControl"], [class*="likeButton"], [class*="LikeButton"], [class*="Like_root"], [class*="like_root"]');
      if (likeWrapper) {
        let curr = likeWrapper;
        while (curr && curr.parentNode !== controls) {
          curr = curr.parentNode;
        }
        likeTarget = curr || likeWrapper;
      }
    }

    let btn = row.querySelector('.ym-track-row-download-btn');
    if (btn) {
      // Если кнопка уже создана, гарантируем, что она расположена строго СЛЕВА от сердечка
      if (likeTarget && btn.nextElementSibling !== likeTarget && btn !== likeTarget) {
        controls.insertBefore(btn, likeTarget);
      }
      continue;
    }

    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ym-track-row-download-btn';
    btn.setAttribute('aria-label', 'Скачать трек');
    btn.setAttribute('title', 'Скачать трек');
    btn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();

      const meta = extractTrackMetadataFromRow(row);
      if (!meta || !meta.trackId) {
        showDownloadToast('Не удалось определить ID трека', 'error');
        return;
      }

      btn.classList.add('ym-row-dl-loading');
      btn.innerHTML = `<svg class="ym-download-spinner" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path></svg>`;
      showDownloadToast(`Скачивание: ${meta.artist} - ${meta.title}...`, 'info');

      try {
        const res = await downloadTrack(meta);
        btn.classList.remove('ym-row-dl-loading');
        btn.classList.add('ym-row-dl-success');
        btn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffdb4d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        showDownloadToast(`Сохранено: ${res.fileName || (meta.artist + ' - ' + meta.title)}`, 'success');
        setTimeout(() => {
          btn.classList.remove('ym-row-dl-success');
          btn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
        }, 3000);
      } catch(err) {
        console.error('[DOWNLOADER] Ошибка скачивания трека из строки:', err);
        btn.classList.remove('ym-row-dl-loading');
        btn.classList.add('ym-row-dl-error');
        btn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        showDownloadToast(`Ошибка скачивания: ${err.message}`, 'error');
        setTimeout(() => {
          btn.classList.remove('ym-row-dl-error');
          btn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
        }, 3000);
      }
    });

    if (likeTarget) {
      controls.insertBefore(btn, likeTarget);
    } else {
      const contextMenuWrap = controls.querySelector('[class*="contextMenuWrapper"]');
      if (contextMenuWrap) {
        controls.insertBefore(btn, contextMenuWrap);
      } else {
        controls.insertBefore(btn, controls.firstChild);
      }
    }
  }
}

// 12. Пакетная загрузка треков в единый ZIP-архив (Batch Downloader)
window.__ym_batch_queue = null;

// Таблица CRC-32 (IEEE 802.3)
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function computeCrc32(data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Создание чистого PKZIP-архива в памяти без внешних зависимостей (Store mode, UTF-8)
function createZipBlob(files) {
  const chunks = [];
  const centralDirEntries = [];
  let currentOffset = 0;

  const now = new Date();
  const year = Math.max(1980, now.getFullYear());
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
  const dosDate = (((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const dataBytes = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
    const crc = computeCrc32(dataBytes);
    const size = dataBytes.length;

    // 1. Local File Header (30 байт)
    const localHeader = new Uint8Array(30);
    const lhView = new DataView(localHeader.buffer);
    lhView.setUint32(0, 0x04034b50, true);  // Сигнатура заголовка локального файла
    lhView.setUint16(4, 20, true);          // Версия (2.0)
    lhView.setUint16(6, 0x0800, true);      // Бит 11 = UTF-8 кодировка имени файла
    lhView.setUint16(8, 0, true);           // Метод сжатия (0 = Store, аудио уже сжато)
    lhView.setUint16(10, dosTime, true);    // Время изменения файла
    lhView.setUint16(12, dosDate, true);    // Дата изменения файла
    lhView.setUint32(14, crc, true);        // Контрольная сумма CRC-32
    lhView.setUint32(18, size, true);       // Сжатый размер
    lhView.setUint32(22, size, true);       // Исходный размер
    lhView.setUint16(26, nameBytes.length, true); // Длина имени файла
    lhView.setUint16(28, 0, true);          // Длина поля Extra

    chunks.push(localHeader);
    chunks.push(nameBytes);
    chunks.push(dataBytes);

    centralDirEntries.push({
      nameBytes,
      crc,
      size,
      offset: currentOffset,
      dosTime,
      dosDate
    });

    currentOffset += 30 + nameBytes.length + size;
  }

  const centralDirStart = currentOffset;
  let centralDirSize = 0;

  // 2. Central Directory Headers (46 байт + имя на каждый файл)
  for (const entry of centralDirEntries) {
    const cdHeader = new Uint8Array(46);
    const cdView = new DataView(cdHeader.buffer);
    cdView.setUint32(0, 0x02014b50, true);   // Сигнатура центрального каталога
    cdView.setUint16(4, 20, true);           // Версия создателя
    cdView.setUint16(6, 20, true);           // Минимальная версия
    cdView.setUint16(8, 0x0800, true);       // Бит 11 = UTF-8
    cdView.setUint16(10, 0, true);           // Метод сжатия (Store)
    cdView.setUint16(12, entry.dosTime, true);
    cdView.setUint16(14, entry.dosDate, true);
    cdView.setUint32(16, entry.crc, true);
    cdView.setUint32(20, entry.size, true);
    cdView.setUint32(24, entry.size, true);
    cdView.setUint16(28, entry.nameBytes.length, true);
    cdView.setUint16(30, 0, true);           // Длина Extra
    cdView.setUint16(32, 0, true);           // Длина комментария
    cdView.setUint16(34, 0, true);           // Номер диска
    cdView.setUint16(36, 0, true);           // Внутренние атрибуты
    cdView.setUint32(38, 0, true);           // Внешние атрибуты
    cdView.setUint32(42, entry.offset, true); // Смещение локального заголовка

    chunks.push(cdHeader);
    chunks.push(entry.nameBytes);

    centralDirSize += 46 + entry.nameBytes.length;
  }

  // 3. End of Central Directory Record (22 байта)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);                // Сигнатура конца центрального каталога
  eocdView.setUint16(4, 0, true);                         // Номер текущего диска
  eocdView.setUint16(6, 0, true);                         // Номер диска начала каталога
  eocdView.setUint16(8, centralDirEntries.length, true);  // Записей на диске
  eocdView.setUint16(10, centralDirEntries.length, true); // Всего записей
  eocdView.setUint32(12, centralDirSize, true);           // Размер центрального каталога
  eocdView.setUint32(16, centralDirStart, true);          // Смещение центрального каталога
  eocdView.setUint16(20, 0, true);                        // Длина комментария архива

  chunks.push(eocd);

  return new Blob(chunks, { type: 'application/zip' });
}

function renderBatchWidget(title, total) {
  let widget = document.getElementById('ym-batch-download-widget');
  if (!widget) {
    widget = document.createElement('div');
    widget.id = 'ym-batch-download-widget';
    document.body.appendChild(widget);
  }

  // На главной странице (где нет нижней панели плеера) опускаем виджет ближе к нижнему краю
  const isMainPage = window.location.pathname === '/' || window.location.pathname === '';
  const hasBottomPlayer = !!document.querySelector('[class*="PlayerBarDesktop_root"], [class*="PlayerBar_root"], [class*="PlayerBarDesktopWithBackgroundProgressBar_player"]');
  if (isMainPage || !hasBottomPlayer) {
    widget.classList.add('ym-bottom-low');
    widget.style.bottom = '24px';
  } else {
    widget.classList.remove('ym-bottom-low');
    widget.style.bottom = '';
  }

  widget.innerHTML = `
    <div class="ym-batch-header">
      <div class="ym-batch-title" title="${title}">${title}</div>
      <div class="ym-batch-count"><span id="ym-batch-current-num">0</span> / ${total}</div>
    </div>
    <div class="ym-batch-current" id="ym-batch-current-name">Подготовка к скачиванию...</div>
    <div class="ym-batch-bar-bg">
      <div class="ym-batch-bar-fill" id="ym-batch-progress-bar" style="width: 0%;"></div>
    </div>
    <div class="ym-batch-actions">
      <button type="button" class="ym-batch-cancel-btn" id="ym-batch-cancel-btn">Отмена</button>
    </div>
  `;

  document.getElementById('ym-batch-cancel-btn')?.addEventListener('click', () => {
    if (window.__ym_batch_queue) {
      window.__ym_batch_queue.cancelled = true;
      const statusEl = document.getElementById('ym-batch-current-name');
      if (statusEl) statusEl.textContent = 'Останавливаем загрузку...';
    }
  });

  return widget;
}

const BATCH_ZIP_CHUNK_SIZE = 50;

function triggerBlobDownload(blob, fileName) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(blobUrl);
  }, 15000);
}

async function startBatchDownload(title, trackList) {
  if (!Array.isArray(trackList) || trackList.length === 0) {
    showDownloadToast('В плейлисте не найдено треков для скачивания', 'error');
    return;
  }

  if (window.__ym_batch_queue && window.__ym_batch_queue.active) {
    showDownloadToast('Уже идет скачивание другой очереди треков', 'error');
    return;
  }

  const isDesktop = typeof window !== 'undefined' && 
    (window.navigator.userAgent.includes('Electron') || 
     (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendState === 'function'));

  const totalTracks = trackList.length;
  const totalChunks = isDesktop ? 1 : Math.ceil(totalTracks / BATCH_ZIP_CHUNK_SIZE);
  const safeTitle = (title || 'Альбом').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();

  window.__ym_batch_queue = {
    active: true,
    cancelled: false,
    title: title || 'Загрузка',
    tracks: trackList,
    total: totalTracks,
    completed: 0,
    failed: 0
  };

  const widget = renderBatchWidget(title, totalTracks);
  const currentNumEl = document.getElementById('ym-batch-current-num');
  const currentNameEl = document.getElementById('ym-batch-current-name');
  const progressBar = document.getElementById('ym-batch-progress-bar');

  const startMsg = totalChunks > 1
    ? `Старт скачивания: "${title}" (${totalTracks} треков, ${totalChunks} томов ZIP по ${BATCH_ZIP_CHUNK_SIZE} шт.)`
    : `Старт скачивания: "${title}" (${totalTracks} треков в ZIP)`;
  showDownloadToast(startMsg, 'info');

  let currentChunkIndex = 0;
  let zipFiles = [];

  for (let i = 0; i < totalTracks; i++) {
    if (window.__ym_batch_queue.cancelled) {
      showDownloadToast('Скачивание отменено пользователем', 'info');
      if (!isDesktop && zipFiles.length > 0) {
        currentChunkIndex++;
        const partName = totalChunks > 1
          ? `${safeTitle} (Часть ${currentChunkIndex} - прервано).zip`
          : `${safeTitle} (прервано).zip`;
        try {
          const zipBlob = createZipBlob(zipFiles);
          triggerBlobDownload(zipBlob, partName);
          zipFiles = [];
        } catch(e) {}
      }
      break;
    }

    const trk = trackList[i];
    const trackName = trk.artist ? `${trk.artist} - ${trk.title}` : (trk.title || trk.trackId);
    const chunkLabel = totalChunks > 1 ? `[Том ${currentChunkIndex + 1}/${totalChunks}] ` : '';
    if (currentNameEl) currentNameEl.textContent = `${chunkLabel}[${i + 1}/${totalTracks}] ${trackName}`;

    try {
      if (isDesktop) {
        // В десктопном приложении сохраняем напрямую через нативный мост без окон
        await downloadTrack(trk);
      } else {
        // В браузере загружаем трек в буфер памяти
        const downloadInfo = await resolveTrackDownloadInfo(trk);
        const fileData = await getTrackDecryptedBuffer(downloadInfo, trk);

        const num = String(i + 1).padStart(2, '0');
        const itemName = fileData.safeArtist
          ? `${num}. ${fileData.safeArtist} - ${fileData.safeTitle}.${fileData.ext}`
          : `${num}. ${fileData.safeTitle}.${fileData.ext}`;

        zipFiles.push({
          name: itemName,
          data: fileData.buffer
        });
      }
      window.__ym_batch_queue.completed++;
    } catch(err) {
      console.warn(`[DOWNLOADER] Ошибка скачивания трека ${trackName}:`, err);
      window.__ym_batch_queue.failed++;
    }

    const processed = i + 1;
    const percent = Math.round((processed / totalTracks) * 100);
    if (currentNumEl) currentNumEl.textContent = String(processed);
    if (progressBar) progressBar.style.width = `${percent}%`;

    // Если набрался том BATCH_ZIP_CHUNK_SIZE или это последний трек списка
    const isChunkFull = zipFiles.length >= BATCH_ZIP_CHUNK_SIZE;
    const isLastTrack = i === totalTracks - 1;

    if (!isDesktop && (isChunkFull || isLastTrack) && zipFiles.length > 0) {
      currentChunkIndex++;
      const zipFileName = totalChunks > 1
        ? `${safeTitle} (Часть ${currentChunkIndex} из ${totalChunks}).zip`
        : `${safeTitle}.zip`;

      if (currentNameEl) currentNameEl.textContent = `Упаковка "${zipFileName}"...`;
      try {
        const zipBlob = createZipBlob(zipFiles);
        triggerBlobDownload(zipBlob, zipFileName);
        console.log(`[DOWNLOADER] ZIP-архив "${zipFileName}" (${zipFiles.length} треков) успешно сохранен!`);
        if (totalChunks > 1) {
          showDownloadToast(`Том ${currentChunkIndex} из ${totalChunks} сохранен!`, 'success');
        }
      } catch(zipErr) {
        console.error('[DOWNLOADER] Ошибка создания ZIP-архива:', zipErr);
        showDownloadToast('Ошибка создания ZIP: ' + zipErr.message, 'error');
      }

      // ОСВОБОЖДАЕМ ПАМЯТЬ: очищаем ссылки на буферы для сборщика мусора (GC)
      zipFiles = [];
      await new Promise(r => setTimeout(r, 600));
    } else {
      // Небольшая пауза между треками для стабильности сети
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const finishedState = window.__ym_batch_queue.cancelled ? 'Отменено' : 'Завершено';
  if (currentNameEl) {
    currentNameEl.textContent = `${finishedState}: Скачано ${window.__ym_batch_queue.completed}, ошибок: ${window.__ym_batch_queue.failed}`;
  }
  const finishToast = totalChunks > 1
    ? `Скачивание "${title}" завершено! Сохранено: ${window.__ym_batch_queue.completed} треков в ${currentChunkIndex} томах ZIP`
    : `Скачивание "${title}" завершено! Сохранено: ${window.__ym_batch_queue.completed} треков в ZIP`;
  showDownloadToast(finishToast, 'success');

  window.__ym_batch_queue.active = false;
  setTimeout(() => {
    if (widget && !window.__ym_batch_queue?.active) {
      widget.remove();
    }
  }, 6000);
}
window.startBatchDownload = startBatchDownload;

// Получение списка треков плейлиста или альбома через API с фоллбэком на DOM
async function fetchTracksForHeaderContext(contextHref, container) {
  let tracks = [];

  // 1. Попытка получить через API Яндекс Музыки
  try {
    const headers = getApiHeaders();

    // Проверяем /playlists/{uuid}
    const playlistMatch = (contextHref || window.location.pathname).match(/\/playlists\/([a-zA-Z0-9_\-\.]+)/);
    if (playlistMatch) {
      const playlistId = playlistMatch[1];
      const res = await fetch(`https://api.music.yandex.net/playlist/${playlistId}?resumeStream=false&richTracks=true`, { headers, credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        const rawTracks = json.tracks || json.result?.tracks;
        if (Array.isArray(rawTracks)) {
          tracks = rawTracks.map(t => ({
            trackId: String(t.id || t.trackId || ''),
            title: t.title || 'Трек',
            artist: Array.isArray(t.artists) ? t.artists.map(a => a.name).join(', ') : (t.artist || ''),
            album: t.albums?.[0]?.title || '',
            coverUri: t.ogImage || t.coverUri || ''
          })).filter(t => !!t.trackId);
        }
      }
    }

    // Проверяем /users/{user}/playlists/{kind}
    if (tracks.length === 0) {
      const currentPath = (contextHref || window.location.pathname || '');
      const userPlaylistMatch = currentPath.match(/\/users\/([^/]+)\/playlists\/(\d+)/);
      if (userPlaylistMatch) {
        const user = userPlaylistMatch[1];
        const kind = userPlaylistMatch[2];
        const res = await fetch(`https://api.music.yandex.net/users/${user}/playlists/${kind}?resumeStream=false&richTracks=true`, { headers, credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          const rawTracks = json.result?.tracks || json.tracks;
          if (Array.isArray(rawTracks)) {
            tracks = rawTracks.map(t => {
              const item = t.track || t;
              return {
                trackId: String(item.id || item.trackId || ''),
                title: item.title || 'Трек',
                artist: Array.isArray(item.artists) ? item.artists.map(a => a.name).join(', ') : (item.artist || ''),
                album: item.albums?.[0]?.title || '',
                coverUri: item.ogImage || item.coverUri || ''
              };
            }).filter(t => !!t.trackId);
          }
        }
      }
    }

    // Проверяем "Мне нравится" (Likes / Favorites): /collection, /likes, или заголовок "Мне нравится"
    if (tracks.length === 0) {
      const currentPath = (contextHref || window.location.pathname || '');
      const titleText = ((container ? container.textContent : '') + ' ' + (titleEl ? titleEl.textContent : '')).toLowerCase();
      const isLikes = currentPath.includes('/collection') || 
                      currentPath.includes('/likes') || 
                      titleText.includes('мне нравится') ||
                      titleText.includes('любимые треки');
      
      if (isLikes) {
        let username = '';
        const userMeta = container?.querySelector('[class*="PlaylistMeta_updatedText"], [class*="meta"] [title]');
        if (userMeta && userMeta.getAttribute('title')) {
          username = userMeta.getAttribute('title').trim();
        }
        if (!username) {
          const m = currentPath.match(/\/users\/([^/]+)/);
          if (m) username = m[1];
        }
        if (!username && typeof window !== 'undefined') {
          username = window.__INITIAL_STATE__?.passport?.user?.login ||
                     window.__INITIAL_STATE__?.user?.login ||
                     window.passport?.user?.login;
        }
        if (!username) {
          try {
            const statusRes = await fetch('https://api.music.yandex.net/account/status', { headers, credentials: 'include' });
            if (statusRes.ok) {
              const statusJson = await statusRes.json();
              username = statusJson.result?.account?.login || statusJson.result?.account?.uid;
            }
          } catch(e) {}
        }

        if (username) {
          // В API Яндекс Музыки плейлист "Мне нравится" имеет kind = 3
          const likesRes = await fetch(`https://api.music.yandex.net/users/${username}/playlists/3?resumeStream=false&richTracks=true`, { headers, credentials: 'include' });
          if (likesRes.ok) {
            const json = await likesRes.json();
            const rawTracks = json.result?.tracks || json.tracks;
            if (Array.isArray(rawTracks)) {
              tracks = rawTracks.map(t => {
                const item = t.track || t;
                return {
                  trackId: String(item.id || item.trackId || ''),
                  title: item.title || 'Трек',
                  artist: Array.isArray(item.artists) ? item.artists.map(a => a.name).join(', ') : (item.artist || ''),
                  album: item.albums?.[0]?.title || '',
                  coverUri: item.ogImage || item.coverUri || ''
                };
              }).filter(t => !!t.trackId);
            }
          }
        }
      }
    }

    // Проверяем /album/{albumId}
    if (tracks.length === 0) {
      const currentPath = (contextHref || window.location.pathname || '');
      const albumMatch = currentPath.match(/\/album\/(\d+)/);
      if (albumMatch) {
        const albumId = albumMatch[1];
        const res = await fetch(`https://api.music.yandex.net/albums/${albumId}/with-tracks?resumeStream=false&richTracks=true`, { headers, credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          const volumes = json.volumes || json.result?.volumes;
          if (Array.isArray(volumes)) {
            const rawTracks = volumes.flat();
            tracks = rawTracks.map(t => ({
              trackId: String(t.id || ''),
              title: t.title || 'Трек',
              artist: Array.isArray(t.artists) ? t.artists.map(a => a.name).join(', ') : (t.artist || ''),
              album: t.albums?.[0]?.title || '',
              coverUri: t.ogImage || t.coverUri || ''
            })).filter(t => !!t.trackId);
          }
        }
      }
    }
  } catch(e) {
    console.warn('[DOWNLOADER] API запрос списка треков не удался, переходим к сбору из DOM:', e);
  }

  // 2. Фоллбэк: сбор всех отрендеренных строк треков из текущего блока или страницы
  if (tracks.length === 0) {
    const searchRoot = container ? (container.closest('section') || container.closest('[class*="PlaylistPage"]') || container.closest('[class*="collection"]') || container.parentNode || document) : document;
    const rows = searchRoot.querySelectorAll('[class*="CommonTrack_root"], [data-entity-id], [class*="Track_root"]');
    const seen = new Set();
    for (let i = 0; i < rows.length; i++) {
      const meta = extractTrackMetadataFromRow(rows[i]);
      if (meta && meta.trackId && !seen.has(meta.trackId)) {
        seen.add(meta.trackId);
        tracks.push(meta);
      }
    }
  }

  return tracks;
}

// Проверка, подходит ли данный заголовок для кнопки "Скачать в ZIP"
function isEligiblePlaylistHeader(header) {
  const path = window.location.pathname;

  // 1. На странице /collection (Коллекция):
  // Кнопка ДОЛЖНА быть ТОЛЬКО у блока "Мне нравится" (Любимые треки),
  // и НЕ должна быть у списков "Любимые альбомы", "Подкасты и книги", "Детям", "Любимые исполнители" и т.д.
  if (path === '/collection' || path.startsWith('/collection/')) {
    const text = (header.textContent || '').toLowerCase();
    return text.includes('мне нравится') || text.includes('любимые треки') || text.includes('понравилось');
  }

  // 2. На странице конкретного альбома (/album/123)
  if (/\/album\/\d+/.test(path)) {
    const text = (header.textContent || '').toLowerCase();
    if (text.includes('похожие') || text.includes('другие') || text.includes('рекомендации')) {
      return false;
    }
    if (header.matches('[class*="BlockHeader_root"]') && !header.closest('[class*="AlbumPageHeader"]')) {
      return false;
    }
    return true;
  }

  // 3. На странице конкретного плейлиста (/playlists/... или /users/.../playlists/...)
  if (/\/playlists\/|\/users\/[^/]+\/playlists\//.test(path)) {
    const text = (header.textContent || '').toLowerCase();
    if (text.includes('похожие') || text.includes('рекомендации')) {
      return false;
    }
    if (header.matches('[class*="BlockHeader_root"]') && !header.closest('[class*="PlaylistPageHeader"]')) {
      return false;
    }
    return true;
  }

  return false;
}

function syncPlaylistButtonHeight(btn, header) {
  if (!btn) return;
  
  // Ищем соседнюю кнопку ("Слушать" и др.) строго внутри контейнера кнопок, а не по всей шапке с обложкой
  const controlsContainer = btn.parentElement || header;
  const candidateBtns = controlsContainer.querySelectorAll('button:not(.ym-playlist-download-btn)');
  
  let siblingBtn = null;
  for (let i = 0; i < candidateBtns.length; i++) {
    const b = candidateBtns[i];
    const r = b.getBoundingClientRect();
    // Настоящая кнопка управления имеет высоту от 32px до 60px (отсекает обложки 180px+)
    if (r.height >= 32 && r.height <= 60) {
      const label = (b.getAttribute('aria-label') || b.textContent || '').toLowerCase();
      if (label.includes('слушать') || label.includes('play')) {
        siblingBtn = b;
        break; // Приоритет главной кнопке "Слушать"
      }
      if (!siblingBtn) siblingBtn = b;
    }
  }

  let targetHeight = 44;
  if (siblingBtn) {
    const r = siblingBtn.getBoundingClientRect();
    if (r.height >= 32 && r.height <= 60) {
      targetHeight = Math.round(r.height);
    }
  } else {
    targetHeight = window.innerWidth >= 1280 ? 48 : 44;
  }

  // Строгое ограничение: высота кнопки всегда в диапазоне 36..52px
  targetHeight = Math.min(52, Math.max(36, targetHeight));
  const h = `${targetHeight}px`;
  btn.style.setProperty('height', h, 'important');
  btn.style.setProperty('min-height', h, 'important');
  btn.style.setProperty('max-height', h, 'important');

  if (targetHeight >= 46) {
    btn.style.setProperty('padding', '0 20px', 'important');
    btn.style.setProperty('font-size', '15px', 'important');
    const svg = btn.querySelector('svg');
    if (svg) {
      svg.style.setProperty('width', '18px', 'important');
      svg.style.setProperty('height', '18px', 'important');
    }
  } else {
    btn.style.setProperty('padding', '0 16px', 'important');
    btn.style.setProperty('font-size', '14px', 'important');
    const svg = btn.querySelector('svg');
    if (svg) {
      svg.style.setProperty('width', '16px', 'important');
      svg.style.setProperty('height', '16px', 'important');
    }
  }
}

// 13. Инжекция кнопки "Скачать в ZIP" в заголовки плейлистов и альбомов
function injectPlaylistHeaderDownloadButton() {
  if (!window.__ym_header_dl_resize_bound) {
    window.__ym_header_dl_resize_bound = true;
    window.addEventListener('resize', () => {
      const btns = document.querySelectorAll('.ym-playlist-download-btn');
      for (let i = 0; i < btns.length; i++) {
        const b = btns[i];
        const h = b.closest(`
          [class*="PageHeaderBase_root"],
          [class*="PlaylistPageHeader_header"],
          [class*="AlbumPageHeader_header"],
          [class*="BlockHeader_root"],
          [class*="PlaylistPage_header"],
          [class*="AlbumPage_header"],
          [class*="PageHeader_root"],
          [class*="CommonHeader_root"],
          [class*="CommonPageHeader_root"]
        `) || b.parentElement;
        if (h) syncPlaylistButtonHeight(b, h);
      }
    });
  }

  // Удаляем кнопку "Скачать в ZIP" из неподходящих блоков/каруселей (например, "Любимые альбомы", "Подкасты", "Детям" на /collection)
  const allExistingBtns = document.querySelectorAll('.ym-playlist-download-btn');
  for (let i = 0; i < allExistingBtns.length; i++) {
    const b = allExistingBtns[i];
    const h = b.closest(`
      [class*="PageHeaderBase_root"],
      [class*="PlaylistPageHeader_header"],
      [class*="AlbumPageHeader_header"],
      [class*="BlockHeader_root"],
      [class*="PlaylistPage_header"],
      [class*="AlbumPage_header"],
      [class*="PageHeader_root"],
      [class*="CommonHeader_root"],
      [class*="CommonPageHeader_root"]
    `) || b.parentElement;
    if (!h || !isEligiblePlaylistHeader(h)) {
      b.remove();
    }
  }

  const headers = document.querySelectorAll(`
    [class*="PageHeaderBase_root"],
    [class*="PlaylistPageHeader_header"],
    [class*="AlbumPageHeader_header"],
    [class*="BlockHeader_root"],
    [class*="PlaylistPage_header"],
    [class*="AlbumPage_header"],
    [class*="PageHeader_root"],
    [class*="CommonHeader_root"],
    [class*="CommonPageHeader_root"]
  `);
  if (!headers || headers.length === 0) return;

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (!isEligiblePlaylistHeader(header)) {
      header.querySelector('.ym-playlist-download-btn')?.remove();
      continue;
    }

    const existingBtn = header.querySelector('.ym-playlist-download-btn');
    if (existingBtn) {
      syncPlaylistButtonHeight(existingBtn, header);
      continue;
    }

    const titleLink = header.querySelector('a[href*="/playlists/"], a[href*="/album/"], a[href*="/users/"], [class*="BlockHeader_title"] a, [class*="titleContainer"] a');
    const titleEl = header.querySelector('h1, h2, [class*="PageHeaderTitle_title"], [class*="heading"], [class*="title"]');
    const titleText = (titleLink ? titleLink.textContent : titleEl?.textContent || 'Плейлист').trim();

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ym-playlist-download-btn';
    btn.setAttribute('aria-label', `Скачать плейлист "${titleText}" в ZIP-архиве`);
    btn.setAttribute('title', `Скачать все треки в одном ZIP-архиве ("${titleText}")`);
    btn.style.whiteSpace = 'nowrap';
    btn.style.flexShrink = '0';
    btn.style.width = 'auto';
    btn.style.minWidth = 'max-content';
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Скачать в ZIP</span>
    `;

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();

      const contextHref = titleLink ? titleLink.getAttribute('href') : window.location.pathname;
      btn.style.opacity = '0.7';
      btn.style.pointerEvents = 'none';

      showDownloadToast(`Получаем список треков для "${titleText}"...`, 'info');
      try {
        const tracks = await fetchTracksForHeaderContext(contextHref, header);
        if (tracks.length === 0) {
          showDownloadToast('Не удалось загрузить список треков этого альбома или плейлиста', 'error');
          return;
        }
        startBatchDownload(titleText, tracks);
      } catch(err) {
        showDownloadToast(`Ошибка получения треков: ${err.message}`, 'error');
      } finally {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      }
    });

    // Синхронизируем высоту с соседней кнопкой Яндекса (например, "Слушать" 48px/40px)
    syncPlaylistButtonHeight(btn, header);

    const controlsContainer = header.querySelector(`
      [class*="PageHeaderPlaylist_mainControls"],
      [class*="CommonPageHeader_controls__"],
      [class*="PageHeaderPlaylist_controls__"],
      [class*="controlsContainer"] > [class*="controls__"],
      [class*="controlsContainer"],
      [class*="ControlsBar"],
      [class*="Header_controls"],
      [class*="PageHeader_controls"],
      [class*="PageHeaderBase_controls"]
    `);
    const titleContainer = header.querySelector('[class*="BlockHeader_start"], [class*="titleContainer"], [class*="BlockHeader_titleContainer"]');

    if (controlsContainer) {
      controlsContainer.insertBefore(btn, controlsContainer.firstChild);
    } else if (titleContainer) {
      titleContainer.appendChild(btn);
    } else {
      header.appendChild(btn);
    }
  }
}

// 14. Цикл инжекции элементов интерфейса
function runDownloaderInjectors() {
  injectPlayerDownloadButton();
  injectTrackRowDownloadButtons();
  injectPlaylistHeaderDownloadButton();
  checkContextMenuAndAddDownloadOption();
}

setInterval(runDownloaderInjectors, 1000);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runDownloaderInjectors);
} else {
  runDownloaderInjectors();
}
