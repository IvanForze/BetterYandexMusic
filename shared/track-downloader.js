// ==========================================
// BETTER YANDEX MUSIC - CURRENT TRACK DOWNLOADER
// ==========================================

// Глобальный кэш перехваченных данных стриминга по trackId
window.__ym_download_cache = window.__ym_download_cache || new Map();
window.__ym_latest_download_info = window.__ym_latest_download_info || null;

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
  console.log('%c[DOWNLOADER] Аудиопоток успешно захвачен!', 'color: #ffdb4d; font-weight: bold;', {
    trackId,
    codec: info.codec,
    bitrate: info.bitrate,
    quality: info.quality,
    url: info.url ? (info.url.substring(0, 50) + '...') : null,
    hasKey: !!info.key
  });
  updateDownloaderButtonTooltip();
}

// 1. Сетевой перехватчик: ловит get-file-info через Fetch и XHR
(function initTrackInterceptor() {
  if (window.__ym_downloader_interceptor_installed) return;
  window.__ym_downloader_interceptor_installed = true;

  // 1.1 Перехват window.fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
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

  // 1.2 Перехват XMLHttpRequest (для клиентов на Axios / XHR)
  try {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
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

  const iconSvg = type === 'success'
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffdb4d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : type === 'error'
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="8"></line></svg>`;

  toast.innerHTML = `${iconSvg}<span>${text}</span>`;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  if (window.__ym_toast_timer) clearTimeout(window.__ym_toast_timer);
  window.__ym_toast_timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
  }, 3500);
}

// 3. Получение информации о текущем треке
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

// 4. Попытка извлечь downloadInfo напрямую из структур плеера Sonata
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
        const url = c.url || c.src || c.downloadInfo?.url;
        const key = c.key || c.secretKey || c.downloadInfo?.key;
        if (url && key) {
          console.log('[DOWNLOADER] Найдена информация о потоке в Sonata mediaSourceData!');
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
  } catch(e) {
    console.warn('[DOWNLOADER] Ошибка чтения mediaSourceData из плеера:', e);
  }
  return null;
}

// 5. Скачивание в браузере (для Web Extension через Web Crypto)
async function downloadInBrowser(downloadInfo, metadata) {
  const response = await fetch(downloadInfo.url);
  if (!response.ok) throw new Error('Ошибка загрузки потока: HTTP ' + response.status);
  const arrayBuffer = await response.arrayBuffer();

  // Расшифровка AES-128-CTR
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
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-CTR', counter, length: 128 },
    cryptoKey,
    arrayBuffer
  );

  const isFlac = (downloadInfo.codec || '').toLowerCase().includes('flac');
  const ext = isFlac ? 'flac' : 'mp3';
  const mime = isFlac ? 'audio/flac' : 'audio/mpeg';

  const blob = new Blob([decryptedBuffer], { type: mime });
  const blobUrl = URL.createObjectURL(blob);
  const safeArtist = (metadata.artist || 'Artist').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  const safeTitle = (metadata.title || 'Track').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  const fileName = `${safeArtist} - ${safeTitle}.${ext}`.substring(0, 180);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(blobUrl);
  }, 1000);

  return { ok: true, fileName };
}

// 6. Вызов Electron Preload Bridge
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

// 7. Основная функция скачивания текущего трека
let isDownloadingTrack = false;

async function triggerDownloadCurrentTrack() {
  if (isDownloadingTrack) return;

  const trackInfo = getCurrentTrackInfo();
  console.log('[DOWNLOADER-DEBUG] Текущий трек:', trackInfo);
  if (!trackInfo) {
    showDownloadToast('Включите любой трек для скачивания', 'error');
    return;
  }

  // 1. Ищем в кэше перехватчика
  let downloadInfo = null;
  if (trackInfo.trackId && window.__ym_download_cache.has(trackInfo.trackId)) {
    downloadInfo = window.__ym_download_cache.get(trackInfo.trackId);
    console.log('[DOWNLOADER-DEBUG] Найдено в кэше по trackId:', trackInfo.trackId);
  }

  // 2. Ищем напрямую в Sonata Player
  if (!downloadInfo) {
    downloadInfo = getDownloadInfoFromPlayer();
    if (downloadInfo) {
      console.log('[DOWNLOADER-DEBUG] Найдено в Sonata Player');
    }
  }

  // 3. Последний захваченный поток
  if (!downloadInfo && window.__ym_latest_download_info) {
    downloadInfo = window.__ym_latest_download_info;
    console.log('[DOWNLOADER-DEBUG] Использован последний захваченный поток');
  }

  if (!downloadInfo) {
    console.warn('[DOWNLOADER-DEBUG] Поток не найден! Текущий кэш:', Array.from(window.__ym_download_cache.keys()));
    showDownloadToast('Переключите трек назад/вперёд, чтобы захватить аудиопоток', 'error');
    return;
  }

  const btn = document.getElementById('ym-player-download-btn');
  isDownloadingTrack = true;
  if (btn) {
    btn.classList.add('ym-downloading');
    btn.innerHTML = `<svg class="ym-download-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path></svg>`;
  }

  const formatText = (downloadInfo.codec || '').toUpperCase() || 'AUDIO';
  showDownloadToast(`Скачивание: ${trackInfo.artist} - ${trackInfo.title} [${formatText}]...`, 'info');

  try {
    let result;
    const isDesktop = typeof window !== 'undefined' && 
      (window.navigator.userAgent.includes('Electron') || 
       (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendState === 'function'));

    if (isDesktop) {
      console.log('[DOWNLOADER] Среда Electron Desktop: вызываем нативный мост...');
      try {
        result = await callElectronDownloadBridge(downloadInfo, trackInfo);
      } catch(bridgeErr) {
        console.warn('[DOWNLOADER] Нативный мост не ответил, скачиваем через браузерный движок:', bridgeErr.message);
        result = await downloadInBrowser(downloadInfo, trackInfo);
      }
    } else {
      console.log('[DOWNLOADER] Среда Browser Extension: прямое скачивание через Web Crypto...');
      result = await downloadInBrowser(downloadInfo, trackInfo);
    }

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
    console.error('[DOWNLOADER] Ошибка скачивания:', err);
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
    isDownloadingTrack = false;
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

// 8. Инжекция кнопки в панель управления плеера
function injectPlayerDownloadButton() {
  if (document.getElementById('ym-player-download-btn')) {
    updateDownloaderButtonTooltip();
    return;
  }

  const qualityIndicator = document.getElementById('ym-player-quality-indicator');
  const lyricsBtn = document.querySelector('button[aria-label*="текстомузыку"]') || document.querySelector('button[aria-label*="Lyrics"]');
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

setInterval(injectPlayerDownloadButton, 1000);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectPlayerDownloadButton);
} else {
  injectPlayerDownloadButton();
}
