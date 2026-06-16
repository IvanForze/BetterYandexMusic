// ==========================================
// SOUNDCLOUD BRIDGE (Isolated Content Script)
// Relays messages between MAIN world and background service worker
// ==========================================

window.addEventListener('message', async (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;
  if (!event.data || event.data.__ym_sc_bridge !== true) return;

  const { requestId, type, payload } = event.data;

  // SC_FETCH_AUDIO: fetch audio here (isolated script has host_permissions, no page CSP)
  // then create a blob URL on the music.yandex.ru origin so it passes media-src CSP
  if (type === 'SC_FETCH_AUDIO') {
    try {
      const response = await fetch(payload.url, { credentials: 'omit' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.postMessage({
        __ym_sc_bridge_response: true,
        requestId,
        response: { ok: true, url: blobUrl }
      }, '*');
    } catch (err) {
      window.postMessage({
        __ym_sc_bridge_response: true,
        requestId,
        response: { ok: false, error: err.message }
      }, '*');
    }
    return;
  }

  if (type === 'YM_UPLOAD_TRACK') {
    try {
      const result = await handleSoundCloudUpload(payload);
      window.postMessage({
        __ym_sc_bridge_response: true,
        requestId,
        response: { ok: true, result }
      }, '*');
    } catch (err) {
      console.error('[BRIDGE] Yandex upload error:', err);
      window.postMessage({
        __ym_sc_bridge_response: true,
        requestId,
        response: { ok: false, error: err.message }
      }, '*');
    }
    return;
  }

  // All other types (SC_SEARCH, SC_GET_STREAM) → relay to background service worker
  chrome.runtime.sendMessage({ type, ...payload }, (response) => {
    window.postMessage({
      __ym_sc_bridge_response: true,
      requestId,
      response
    }, '*');
  });
});
