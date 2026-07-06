const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/join', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'join.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // В реальном проекте укажите URL вашего расширения/сайта
    methods: ["GET", "POST"]
  }
});

// Хранилище комнат (ключ - ID комнаты, значение - состояние плеера)
const rooms = {};

io.on('connection', (socket) => {
  console.log('Пользователь подключен:', socket.id);

  // Присоединение к комнате
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`[ROOM-JOIN] Пользователь ${socket.id} присоединился к комнате: ${roomId}`);
    
    // Если комната существует, отправляем новому гостю текущее состояние
    if (rooms[roomId]) {
      console.log(`[ROOM-SYNC] Отправляем текущее состояние комнаты ${roomId} новому пользователю ${socket.id}:`, rooms[roomId]);
      socket.emit('syncState', rooms[roomId]);
    } else {
      rooms[roomId] = { trackId: null, time: 0, isPause: true };
      console.log(`[ROOM-CREATE] Создана новая комната: ${roomId}`);
    }
  });

  // Получение обновления от хоста и рассылка гостям
  socket.on('updateState', ({ roomId, state }) => {
    console.log(`[STATE-UPDATE] Получено обновление для комнаты ${roomId} от ${socket.id}:`);
    console.log(`  -> Трек ID: ${state.trackId}`);
    console.log(`  -> Время: ${Math.round(state.time)}с`);
    console.log(`  -> Пауза: ${state.isPause}`);
    
    rooms[roomId] = state; // Сохраняем последнее состояние
    // Рассылаем всем в комнате, кроме отправителя
    socket.to(roomId).emit('syncState', state); 
  });

  socket.on('disconnect', () => {
    console.log('[DISCONNECT] Пользователь отключился:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});