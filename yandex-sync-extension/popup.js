document.addEventListener('DOMContentLoaded', () => {
  const roomIdInput = document.getElementById('roomId');
  const serverUrlInput = document.getElementById('serverUrl');
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const statusContainer = document.getElementById('statusContainer');
  const activeRoomIdSpan = document.getElementById('activeRoomId');

  function updateUI(roomId) {
    if (roomId) {
      activeRoomIdSpan.textContent = roomId;
      statusContainer.style.display = 'block';
      connectBtn.style.display = 'none';
      disconnectBtn.style.display = 'block';
      roomIdInput.disabled = true;
      serverUrlInput.disabled = true;
    } else {
      activeRoomIdSpan.textContent = '-';
      statusContainer.style.display = 'none';
      connectBtn.style.display = 'block';
      disconnectBtn.style.display = 'none';
      roomIdInput.disabled = false;
      serverUrlInput.disabled = false;
    }
  }

  // Загружаем сохраненные настройки из local storage расширения
  chrome.storage.local.get(['currentRoomId', 'serverUrl'], (result) => {
    if (result.serverUrl) {
      serverUrlInput.value = result.serverUrl;
    } else {
      serverUrlInput.value = 'http://localhost:3000';
    }

    if (result.currentRoomId) {
      roomIdInput.value = result.currentRoomId;
      updateUI(result.currentRoomId);
    } else {
      updateUI(null);
    }
  });

  connectBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim();
    let serverUrl = serverUrlInput.value.trim();
    if (!roomId) return;
    if (!serverUrl) {
      serverUrl = 'http://localhost:3000';
    }

    // Автоматически добавляем http://, если протокол не указан
    if (!/^https?:\/\//i.test(serverUrl)) {
      serverUrl = 'http://' + serverUrl;
    }
    serverUrlInput.value = serverUrl;

    // Сохраняем комнату и сервер локально
    chrome.storage.local.set({ currentRoomId: roomId, serverUrl: serverUrl }, () => {
      // Отправляем ID комнаты и сервер во вкладку Яндекс Музыки
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.tabs.sendMessage(
            tabs[0].id, 
            { type: "CONNECT_ROOM", roomId: roomId, serverUrl: serverUrl }, 
            (response) => {
              updateUI(roomId);
            }
          );
        }
      });
    });
  });

  disconnectBtn.addEventListener('click', () => {
    // Удаляем комнату локально (сервер оставляем сохраненным)
    chrome.storage.local.remove(['currentRoomId'], () => {
      // Отправляем команду отключения во вкладку Яндекс Музыки
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "DISCONNECT_ROOM" }, (response) => {
            updateUI(null);
          });
        } else {
          updateUI(null);
        }
      });
    });
  });
});