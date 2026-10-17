function handleInitialConnection() {
  if (typeof window === 'undefined' || window.location.protocol.startsWith('chrome-error')) return;

  const safeGet = (key, fallback = null) => {
    try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
  };
  const safeSet = (key, val) => {
    try { localStorage.setItem(key, val); } catch (_) {}
  };

  const url = new URL(window.location.href);
  const syncCode = url.searchParams.get('sync_code');
  const storedRoomId = safeGet('currentRoomId');
  const storedServerUrl = safeGet('serverUrl', 'http://localhost:3000');

  // Применяем сохраненную тему оформления
  const activeTheme = safeGet('ymActiveTheme', 'default');
  let customColors = null;
  try {
    const storedColors = safeGet('ymCustomThemeColors');
    if (storedColors) customColors = JSON.parse(storedColors);
  } catch (e) {
    console.error("[SYNC] Ошибка чтения кастомной темы:", e);
  }
  applyThemeCSS(activeTheme, customColors);

  // Слушаем команды на подключение от локального HTTP сервера (Preload контекст)
  const onJoinHandler = (data) => {
    const { room, server } = data;
    console.log(`[SYNC] Получена внешняя команда на вход в комнату: комната=${room}, сервер=${server}`);
    safeSet('currentRoomId', room);
    safeSet('serverUrl', server);
    currentRoom = room;
    connectToServer(server);
    updatePopoverUI(room, currentStatus);
    sendStateToPreload();
  };

  if (window.__ymSyncBridge && typeof window.__ymSyncBridge.onJoinRoom === 'function') {
    window.__ymSyncBridge.onJoinRoom(onJoinHandler);
  } else {
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'YM_SYNC_JOIN_ROOM') {
        onJoinHandler({ room: event.data.room, server: event.data.server });
      }
    });
  }

  if (syncCode) {
    console.log(`[SYNC] Обнаружен код синхронизации в URL: ${syncCode}`);
    currentRoom = syncCode;

    // Сохраняем в localStorage и подключаемся
    safeSet('currentRoomId', syncCode);
    connectToServer(storedServerUrl);

    // Очищаем URL от параметра sync_code
    url.searchParams.delete('sync_code');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    sendStateToPreload();
  } else if (storedRoomId) {
    currentRoom = storedRoomId;
    connectToServer(storedServerUrl);
    sendStateToPreload();
  }
}

// Запуск инициализации автоподключения
setTimeout(handleInitialConnection, 1000); // Даем странице немного времени загрузиться

// Запускаем опрос для поиска навигационного меню и добавления кнопок
setInterval(() => {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (container) {
    if (typeof injectSyncButton === 'function') injectSyncButton();
    if (typeof injectThemeButton === 'function') injectThemeButton();
    if (typeof injectSleepTimerButton === 'function') injectSleepTimerButton();
    if (typeof syncButtonCollapsedState === 'function') {
      syncButtonCollapsedState('ym-sync-button');
      syncButtonCollapsedState('ym-theme-button');
      syncButtonCollapsedState('ym-sleep-timer-button');
      syncButtonCollapsedState('ym-wrapped-btn');
    }
  }

  if (typeof injectPlayerQualityIndicator === 'function') injectPlayerQualityIndicator();
  if (typeof patchNativeLyricsButton === 'function') patchNativeLyricsButton();
  if (typeof handleFullscreenPlayer === 'function') handleFullscreenPlayer();
  if (typeof checkContextMenuAndAddFullscreenOption === 'function') checkContextMenuAndAddFullscreenOption();
}, 500);
