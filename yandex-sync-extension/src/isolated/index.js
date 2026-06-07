// 1. Слушаем команду от popup.js (при нажатии "Подключиться")
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CONNECT_ROOM") {
    currentRoom = request.roomId;
    const serverUrl = request.serverUrl || "http://localhost:3000";
    connectToServer(serverUrl);
    sendResponse({ status: "ok" });
  } else if (request.type === "DISCONNECT_ROOM") {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    currentRoom = null;
    currentServerUrl = null;
    currentStatus = "disconnected";
    updatePopoverUI(null, currentStatus);
    sendResponse({ status: "ok" });
  }
});

// Автоподключение при загрузке страницы, если комната сохранена в storage или передана в URL
chrome.storage.local.get(['currentRoomId', 'serverUrl', 'ymActiveTheme', 'ymCustomThemeColors'], (result) => {
  const activeTheme = result.ymActiveTheme || 'default';
  let customColors = null;
  if (result.ymCustomThemeColors) {
    try {
      customColors = typeof result.ymCustomThemeColors === 'string' ? JSON.parse(result.ymCustomThemeColors) : result.ymCustomThemeColors;
    } catch (e) {
      console.error("[SYNC] Error parsing custom colors:", e);
    }
  }
  applyThemeCSS(activeTheme, customColors);

  const url = new URL(window.location.href);
  const syncCode = url.searchParams.get('sync_code');

  if (syncCode) {
    console.log(`Isolated: Обнаружен код синхронизации в URL: ${syncCode}`);
    currentRoom = syncCode;
    const serverUrl = result.serverUrl || 'http://localhost:3000';
    
    // Сохраняем в хранилище и подключаемся
    chrome.storage.local.set({ currentRoomId: syncCode }, () => {
      connectToServer(serverUrl);
    });

    // Очищаем URL от параметра sync_code
    url.searchParams.delete('sync_code');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } else if (result.currentRoomId) {
    currentRoom = result.currentRoomId;
    const serverUrl = result.serverUrl || 'http://localhost:3000';
    connectToServer(serverUrl);
  }
});

// Запускаем опрос для поиска навигационного меню и добавления кнопок
setInterval(() => {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (container) {
    if (typeof injectSyncButton === 'function') injectSyncButton();
    if (typeof injectThemeButton === 'function') injectThemeButton();
    if (typeof syncButtonCollapsedState === 'function') {
      syncButtonCollapsedState('ym-sync-button');
      syncButtonCollapsedState('ym-theme-button');
    }
  }

  if (typeof injectPlayerQualityIndicator === 'function') injectPlayerQualityIndicator();
  if (typeof patchNativeLyricsButton === 'function') patchNativeLyricsButton();
  if (typeof handleFullscreenPlayer === 'function') handleFullscreenPlayer();
  if (typeof checkContextMenuAndAddFullscreenOption === 'function') checkContextMenuAndAddFullscreenOption();
}, 500);
