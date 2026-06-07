function connectToServer(serverUrl) {
  currentStatus = "connecting";
  updatePopoverUI(currentRoom, currentStatus);

  // Если сокет уже подключен к другому серверу, отключаем его
  if (socket && currentServerUrl !== serverUrl) {
    console.log(`Isolated: Смена адреса сервера с ${currentServerUrl} на ${serverUrl}. Переподключение...`);
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    currentServerUrl = serverUrl;
    console.log(`Isolated: Подключение к серверу: ${serverUrl}`);
    socket = io(serverUrl);

    socket.on('connect', () => {
      console.log('Isolated: Успешно подключились к серверу:', serverUrl);
      socket.emit('joinRoom', currentRoom);
      currentStatus = "connected";
      updatePopoverUI(currentRoom, currentStatus);
    });

    socket.on('connect_error', (error) => {
      console.error('Isolated: Ошибка подключения к серверу:', error);
      currentStatus = "error";
      updatePopoverUI(currentRoom, currentStatus);
    });

    socket.on('disconnect', () => {
      console.log('Isolated: Отключено от сервера');
      currentStatus = "disconnected";
      updatePopoverUI(null, currentStatus);
    });

    // Получаем команду от сервера и пересылаем в плеер Яндекса (main.js)
    socket.on('syncState', (state) => {
      console.log('Isolated: [ВСХОДЯЩЕЕ СОБЫТИЕ СЕРВЕРА] Получено syncState от Socket.io. Передаем в main.js', state);
      window.postMessage({ type: "FROM_ISOLATED", action: "SYNC_STATE", state: state }, "*");
    });
  } else {
    socket.emit('joinRoom', currentRoom);
    currentStatus = "connected";
    updatePopoverUI(currentRoom, currentStatus);
  }
}

window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data || event.data.type !== "FROM_MAIN") return;

  if (event.data.action === "UPDATE_STATE") {
    // 1. Обновляем локальный интерфейс поповера
    if (typeof updateTrackUI === 'function') {
      updateTrackUI(event.data.state.metadata);
    }

    // 2. Отправляем на сервер, только если подключены к комнате
    if (socket && currentRoom) {
      console.log('Isolated: [ОТПРАВКА НА СЕРВЕР] Получен UPDATE_STATE от main.js, отправляем через Socket.io:', event.data.state);
      socket.emit('updateState', {
        roomId: currentRoom,
        state: {
          trackId: event.data.state.trackId,
          albumId: event.data.state.albumId,
          isPause: event.data.state.isPause,
          time: event.data.state.time
        }
      });
    }
  } else if (event.data.action === "TOGGLE_LYRICS") {
    if (typeof toggleNativeFullscreen === 'function') {
      toggleNativeFullscreen();
    }
  }
});
