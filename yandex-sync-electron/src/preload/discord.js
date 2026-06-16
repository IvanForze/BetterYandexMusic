function getDiscordIpcPath() {
  if (process.platform === 'win32') {
    return '\\\\.\\pipe\\discord-ipc-0';
  }
  const prefixes = [
    process.env.XDG_RUNTIME_DIR,
    process.env.TMPDIR,
    process.env.TMP,
    process.env.TEMP,
    '/tmp'
  ];
  for (const prefix of prefixes) {
    if (!prefix) continue;
    for (let i = 0; i < 10; i++) {
      const fullPath = path.join(prefix, `discord-ipc-${i}`);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }
  return null;
}

class DiscordRPC {
  constructor(clientId) {
    this.clientId = clientId;
    this.socket = null;
    this.isReady = false;
    this.reconnectTimer = null;
    this.currentActivity = null;
  }

  connect() {
    if (this.socket) {
      try { this.socket.destroy(); } catch (e) {}
      this.socket = null;
    }
    this.isReady = false;

    const ipcPath = getDiscordIpcPath();
    if (!ipcPath) {
      this.scheduleReconnect();
      return;
    }

    console.log(`[SYNC] Попытка подключения к Discord IPC по пути: ${ipcPath}`);
    this.socket = net.createConnection(ipcPath);

    this.socket.on('connect', () => {
      console.log('[SYNC] Подключено к Discord IPC!');
      this.sendHandshake();
    });

    this.socket.on('data', (data) => {
      this.handleData(data);
    });

    this.socket.on('error', (err) => {
      console.warn('[SYNC] Ошибка Discord IPC:', err.message);
    });

    this.socket.on('close', () => {
      console.log('[SYNC] Соединение с Discord IPC закрыто.');
      this.isReady = false;
      this.socket = null;
      this.scheduleReconnect();
    });
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (discordRpcEnabled) {
        this.connect();
      }
    }, 15000);
  }

  sendFrame(op, payload) {
    if (!this.socket || this.socket.destroyed) return;
    
    const payloadStr = JSON.stringify(payload);
    const payloadLen = Buffer.byteLength(payloadStr);
    console.log(`[SYNC] Discord IPC: Отправляем фрейм. OP = ${op}, Payload =`, payload);
    
    const header = Buffer.alloc(8);
    header.writeInt32LE(op, 0);
    header.writeInt32LE(payloadLen, 4);
    
    try {
      this.socket.write(header);
      this.socket.write(payloadStr);
    } catch (err) {
      console.error('[SYNC] Ошибка отправки фрейма Discord IPC:', err);
    }
  }

  sendHandshake() {
    this.sendFrame(0, {
      v: 1,
      client_id: this.clientId
    });
  }

  handleData(data) {
    try {
      if (data.length < 8) return;
      const op = data.readInt32LE(0);
      const len = data.readInt32LE(4);
      const payloadStr = data.toString('utf8', 8, 8 + len);
      const payload = JSON.parse(payloadStr);
      console.log(`[SYNC] Discord IPC: Получен фрейм. OP = ${op}, Payload =`, payload);

      if (op === 1) {
        if (payload.evt === 'READY') {
          console.log('[SYNC] Discord RPC авторизован и готов!');
          this.isReady = true;
          if (this.currentActivity) {
            this.setActivity(this.currentActivity);
          }
        }
      }
    } catch (e) {
      console.error('[SYNC] Ошибка парсинга фрейма от Discord:', e);
    }
  }

  setActivity(activity) {
    console.log('[SYNC] Discord IPC: Запрос на установку активности:', activity);
    this.currentActivity = activity;
    if (!this.isReady) return;

    const payload = {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity: activity
      },
      nonce: Math.random().toString()
    };

    this.sendFrame(1, payload);
  }

  clearActivity() {
    this.currentActivity = null;
    if (!this.isReady) return;
    
    const payload = {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity: null
      },
      nonce: Math.random().toString()
    };
    
    this.sendFrame(1, payload);
  }

  destroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try { this.socket.destroy(); } catch (e) {}
      this.socket = null;
    }
    this.isReady = false;
  }
}

function initDiscordRPC() {
  if (!discordRpcEnabled) {
    if (discordRPC) {
      discordRPC.destroy();
      discordRPC = null;
    }
    return;
  }
  if (!discordRPC) {
    discordRPC = new DiscordRPC(DISCORD_CLIENT_ID);
    discordRPC.connect();
  }
}

function updateDiscordPresencePreload(trackId, isPause, position, metadata) {
  if (!discordRpcEnabled) return;
  if (!discordRPC) {
    initDiscordRPC();
  }
  
  const now = Date.now();
  
  const trackChanged = trackId !== lastDiscordTrackId;
  const pauseChanged = isPause !== lastDiscordIsPause;
  const roomChanged = currentRoom !== lastDiscordRoom;
  const qualityChanged = metadata?.quality !== lastDiscordQuality;
  const codecChanged = metadata?.codec !== lastDiscordCodec;
  
  let seeked = false;
  if (!trackChanged && !isPause) {
    const elapsed = (now - lastDiscordTimestamp) / 1000;
    const expectedPos = lastDiscordPosition + elapsed;
    if (Math.abs(position - expectedPos) > 2.5) {
      seeked = true;
    }
  }

  if (!trackChanged && !pauseChanged && !seeked && !roomChanged && !qualityChanged && !codecChanged && discordRPC && discordRPC.currentActivity) {
    return;
  }

  lastDiscordTrackId = trackId;
  lastDiscordIsPause = isPause;
  lastDiscordPosition = position;
  lastDiscordTimestamp = now;
  lastDiscordRoom = currentRoom;
  lastDiscordQuality = metadata?.quality || null;
  lastDiscordCodec = metadata?.codec || null;

  if (!metadata) {
    if (discordRPC) discordRPC.clearActivity();
    return;
  }

  let qualityInfo = '';
  if (metadata.codec) {
    let codecStr = '';
    const codecLower = metadata.codec.toLowerCase();
    if (codecLower === 'flac' || codecLower === 'flac-mp4' || metadata.quality === 'lossless') {
      codecStr = 'FLAC';
    } else if (codecLower.includes('aac')) {
      codecStr = 'AAC';
    } else if (codecLower.includes('mp3')) {
      codecStr = 'MP3';
    } else {
      codecStr = metadata.codec.toUpperCase();
    }

    let bitrateStr = '';
    if (metadata.bitrate) {
      bitrateStr = ` (${metadata.bitrate} kbps)`;
    } else if (metadata.quality === 'lossless') {
      bitrateStr = ' (Lossless)';
    } else if (metadata.quality === 'hq') {
      bitrateStr = ' (HQ)';
    }

    qualityInfo = `${codecStr}${bitrateStr}`;
  }

  let stateText = qualityInfo ? `от ${metadata.artist} • ${qualityInfo}` : `от ${metadata.artist}`;
  if (isPause) {
    stateText = `[Пауза] ${stateText}`;
  }

  const activity = {
    details: metadata.title,
    state: stateText,
    type: 2, // 2 = Listening (Слушает)
    assets: {
      large_image: metadata.coverUrl,
      large_text: qualityInfo ? `${metadata.title} — ${metadata.artist} [${qualityInfo}]` : `${metadata.title} — ${metadata.artist}`
    }
  };

  if (currentRoom) {
    activity.assets.small_image = 'https://img.icons8.com/fluency/48/synchronize.png';
    activity.assets.small_text = `В синхронизации: ${currentRoom}`;
  }

  if (!isPause && metadata.durationMs > 0) {
    const startSec = Math.floor((now - Math.round(position * 1000)) / 1000);
    const endSec = Math.floor((now - Math.round(position * 1000) + metadata.durationMs) / 1000);
    activity.timestamps = {
      start: startSec,
      end: endSec
    };
  }

  const buttons = [];
  const defaultDomain = 'http://localhost:3000';
  let serverUrl = currentServerUrl || defaultDomain;
  
  if (!/^https?:\/\//i.test(serverUrl)) {
    serverUrl = 'http://' + serverUrl;
  }
  
  let baseDomain = serverUrl;
  if (!baseDomain.endsWith('/')) {
    baseDomain += '/';
  }

  if (currentRoom) {
    buttons.push({
      label: 'Слушать вместе',
      url: `${baseDomain}join?room=${currentRoom}&server=${encodeURIComponent(serverUrl)}`
    });
  } else {
    buttons.push({
      label: 'Хочу синхронизацию',
      url: baseDomain
    });
  }
  
  activity.buttons = buttons;

  if (discordRPC) discordRPC.setActivity(activity);
}
