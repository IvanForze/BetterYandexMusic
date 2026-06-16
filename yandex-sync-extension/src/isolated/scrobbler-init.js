// Инициализация скробблера для браузерного расширения (ISOLATED World)
window.addEventListener('message', async (event) => {
  if (event.source !== window || !event.data) return;

  if (event.data.type === 'YM_SCROBBLER_SETTINGS_CHANGED') {
    if (window.ScrobbleManager) {
      window.ScrobbleManager.updateConfig(event.data.settings);
    }
  } else if (event.data.type === 'YM_SYNC_STATE_CHANGED') {
    if (window.ScrobbleManager && event.data.state) {
      const { trackId, isPause, position, metadata } = event.data.state;
      window.ScrobbleManager.onStateChange(trackId, isPause, position, metadata);
    }
  } else if (event.data.type === 'YM_SCROBBLER_API_CALL') {
    try {
      if (!window.ScrobblerService || typeof window.ScrobblerService[event.data.method] !== 'function') {
        throw new Error(`Method ${event.data.method} not found on ScrobblerService`);
      }
      const result = await window.ScrobblerService[event.data.method](...event.data.args);
      window.postMessage({ type: 'YM_SCROBBLER_API_RESPONSE', nonce: event.data.nonce, result: result }, '*');
    } catch (e) {
      window.postMessage({ type: 'YM_SCROBBLER_API_RESPONSE', nonce: event.data.nonce, error: e.message }, '*');
    }
  }
});
