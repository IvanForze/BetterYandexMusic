function startLocalApiServer() {
  if (localApiServer) return;
  
  try {
    localApiServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      if (urlObj.pathname === '/join') {
        const room = urlObj.searchParams.get('room');
        let server = urlObj.searchParams.get('server') || 'http://localhost:3000';

        const isRoomValid = typeof room === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(room);
        const isServerValid = typeof server === 'string' && /^https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9@:%._\+~#=]{1,256}(\:[0-9]{1,5})?(\/.*)?$/.test(server);

        if (!isRoomValid || !isServerValid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Неверные параметры комнаты или сервера' }));
          return;
        }

        console.log(`[SYNC] Получена внешняя команда на подключение: комната=${room}, сервер=${server}`);
        
        if (window.__ymSyncJoinRoomCallback) {
          window.__ymSyncJoinRoomCallback({ room, server });
        } else if (typeof window !== 'undefined') {
          window.postMessage({
            type: 'YM_SYNC_JOIN_ROOM',
            room: room,
            server: server
          }, '*');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `Подключение к комнате ${room} запущено` }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Не найдено' }));
    });

    localApiServer.listen(19090, '127.0.0.1', () => {
      console.log('[SYNC] Локальный API сервер запущен на http://127.0.0.1:19090');
    });

    localApiServer.on('error', (err) => {
      console.error('[SYNC] Ошибка запуска локального API сервера:', err.message || err);
      localApiServer = null;
    });
  } catch (err) {
    console.error('[SYNC] Не удалось запустить локальный API сервер:', err);
  }
}
