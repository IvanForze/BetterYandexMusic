function injectSyncButton() {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (!container) return;
  const existingBtn = document.getElementById('ym-sync-button');
  if (existingBtn) {
    if (container.contains(existingBtn)) {
      return; // Уже добавлена в нужный контейнер
    } else {
      existingBtn.remove(); // Удаляем устаревшую кнопку
    }
  }
  injectStyles();
  const btn = document.createElement('li');
  btn.id = 'ym-sync-button';
  btn.className = 'HcfYy4VfnRHqgXzIdL7w kRmUIkcHKD5AgtpPo8wT ym-navbar-item-injected';
  btn.setAttribute('title', 'Синхронизация прослушивания');
  btn.innerHTML = `
    <a class="buOTZq_TKQOVyjMLrXvB ZfF8mQ3Iftpwu0aZgDtG yWJHrpNsBvchs9Jjyokk" style="cursor: pointer;">
      <div class="_YzsXZGNK8KeaUFC4Ja1" style="position: relative;">
        <svg class="UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span class="ym-sync-status-indicator ${currentStatus}"></span>
      </div>
      <div class="nxMXCBiVfgH4oxds3f2y">
        <span title="Синхронизация" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA _3_Mxw7Si7j2g4kWjlpR" style="-webkit-line-clamp: 1;">Синхронизация</span>
      </div>
    </a>
  `;
  container.appendChild(btn);
  btn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    togglePopover();
  });
  injectPopover();

  // Добавляем отслеживание скролла сайдбара, чтобы поповер перемещался вместе с кнопкой
  const scrollableSidebar = document.querySelector('[class*="NavbarDesktop_scrollableContent"]');
  if (scrollableSidebar) {
    scrollableSidebar.addEventListener('scroll', () => {
      const popover = document.getElementById('ym-sync-popover');
      if (popover && popover.classList.contains('show')) {
        positionPopover();
      }
    });

    // Настраиваем ResizeObserver для мгновенной синхронизации при сжатии
    if (!window.ymSyncSidebarObserver) {
      const observer = new ResizeObserver(entries => {
        syncButtonCollapsedState('ym-sync-button');
        syncButtonCollapsedState('ym-theme-button');
      });
      observer.observe(scrollableSidebar);
      window.ymSyncSidebarObserver = observer;
    }
  }
}

function injectPopover() {
  if (document.getElementById('ym-sync-popover')) return;
  const popover = document.createElement('div');
  popover.id = 'ym-sync-popover';
  popover.className = 'ym-sync-popover';
  popover.innerHTML = `
    <div class="ym-sync-popover-header">
      <h3>Синхронизация</h3>
      <button class="ym-sync-close-btn" id="ym-close-btn">&times;</button>
    </div>
    <div class="ym-sync-popover-body">
      <div class="ym-sync-input-group">
        <label for="ym-serverUrl">Адрес сервера</label>
        <input type="text" id="ym-serverUrl" placeholder="Например: http://localhost:3000" />
      </div>
      <div class="ym-sync-input-group">
        <label for="ym-roomId">Идентификатор комнаты</label>
        <div class="ym-sync-room-input-container">
          <input type="text" id="ym-roomId" placeholder="Например: room-404" />
          <button id="ym-generate-room-btn" class="ym-sync-icon-only-btn" title="Сгенерировать случайную комнату">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
              <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5Z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div id="ym-status-card" class="ym-sync-status-card" style="display: none;">
        <div class="ym-sync-status-info">
          <span class="ym-sync-pulse-dot"></span>
          <span id="ym-status-text">Подключено: <strong id="ym-active-room">-</strong></span>
        </div>
        <div class="ym-sync-status-actions" style="display: flex; gap: 6px;">
          <button id="ym-copy-btn" class="ym-sync-icon-only-btn" title="Копировать ID комнаты">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button id="ym-share-btn" class="ym-sync-icon-only-btn" title="Копировать ссылку-приглашение">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
        </div>
      </div>
      
      <button id="ym-connectBtn" class="ym-sync-primary-btn">Подключиться</button>
      <button id="ym-disconnectBtn" class="ym-sync-danger-btn" style="display: none;">Отключиться</button>

      <div class="ym-sync-settings-section" id="ym-discord-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.12); ${window.__ymSyncBridge ? '' : 'display: none;'}">
        <div class="ym-sync-input-group" style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 0;">
          <label for="ym-discord-rpc-toggle" style="font-size: 11px; color: rgba(255,255,255,0.7); cursor: pointer; user-select: none;">Статус в Discord (Rich Presence)</label>
          <input type="checkbox" id="ym-discord-rpc-toggle" style="cursor: pointer; width: 14px; height: 14px; margin: 0;" />
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(popover);
  setupPopoverListeners();

  // Синхронизация при первом создании
  const storedRoomId = localStorage.getItem('currentRoomId');
  const storedServerUrl = localStorage.getItem('serverUrl') || 'http://localhost:3000';
  const serverInput = document.getElementById('ym-serverUrl');
  const roomInput = document.getElementById('ym-roomId');
  if (serverInput) {
    serverInput.value = storedServerUrl;
  }
  if (roomInput) {
    roomInput.value = storedRoomId || '';
  }
  updatePopoverUI(storedRoomId, currentStatus);
}

function setupPopoverListeners() {
  const popover = document.getElementById('ym-sync-popover');
  const closeBtn = document.getElementById('ym-close-btn');
  const connectBtn = document.getElementById('ym-connectBtn');
  const disconnectBtn = document.getElementById('ym-disconnectBtn');
  const generateBtn = document.getElementById('ym-generate-room-btn');
  const copyBtn = document.getElementById('ym-copy-btn');
  const shareBtn = document.getElementById('ym-share-btn');
  const roomInput = document.getElementById('ym-roomId');
  const serverInput = document.getElementById('ym-serverUrl');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      popover.classList.remove('show');
    });
  }
  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      if (roomInput) {
        const randId = 'sync-' + Math.random().toString(36).substring(2, 8);
        roomInput.value = randId;
      }
    });
  }
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (roomInput && roomInput.value) {
        navigator.clipboard.writeText(roomInput.value).then(() => {
          const originalHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;
          setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
          }, 1500);
        }).catch(err => {
          console.error('Failed to copy room ID: ', err);
        });
      }
    });
  }
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (roomInput && roomInput.value) {
        const roomId = roomInput.value;
        const shareUrlStr = `https://music.yandex.ru/?sync_code=${encodeURIComponent(roomId)}`;

        navigator.clipboard.writeText(shareUrlStr).then(() => {
          const originalHTML = shareBtn.innerHTML;
          shareBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;
          setTimeout(() => {
            shareBtn.innerHTML = originalHTML;
          }, 1500);
        }).catch(err => {
          console.error('Failed to copy share link: ', err);
        });
      }
    });
  }
  if (connectBtn) {
    connectBtn.addEventListener('click', () => {
      const roomId = roomInput ? roomInput.value.trim() : '';
      let serverUrl = serverInput ? serverInput.value.trim() : '';
      if (!roomId) return;
      if (!serverUrl) {
        serverUrl = 'http://localhost:3000';
      }
      if (!/^https?:\/\//i.test(serverUrl)) {
        serverUrl = 'http://' + serverUrl;
      }
      if (serverInput) serverInput.value = serverUrl;
      currentRoom = roomId;

      // Сохраняем в localStorage и запускаем соединение
      localStorage.setItem('currentRoomId', roomId);
      localStorage.setItem('serverUrl', serverUrl);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ currentRoomId: roomId, serverUrl: serverUrl });
      }
      connectToServer(serverUrl);
      if (typeof sendStateToPreload === 'function') {
        sendStateToPreload();
      }
    });
  }
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      localStorage.removeItem('currentRoomId');
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(['currentRoomId']);
      }
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      currentRoom = null;
      currentServerUrl = null;
      currentStatus = "disconnected";
      updatePopoverUI(null, currentStatus);
      if (typeof sendStateToPreload === 'function') {
        sendStateToPreload();
      }
    });
  }
  const discordToggle = document.getElementById('ym-discord-rpc-toggle');
  if (discordToggle) {
    const browserRpcEnabled = localStorage.getItem('ymDiscordRpcEnabled') !== 'false';
    discordToggle.checked = browserRpcEnabled;
    discordToggle.addEventListener('change', e => {
      const enabled = e.target.checked;
      localStorage.setItem('ymDiscordRpcEnabled', enabled ? 'true' : 'false');
      if (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendSettings === 'function') {
        window.__ymSyncBridge.sendSettings({
          enabled: enabled
        });
      } else {
        window.postMessage({
          type: 'YM_SYNC_SETTINGS_CHANGED',
          enabled: enabled
        }, '*');
      }
    });
  }
}

function togglePopover() {
  const popover = document.getElementById('ym-sync-popover');
  if (!popover) return;
  const isShowing = popover.classList.contains('show');
  if (isShowing) {
    popover.classList.remove('show');
  } else {
    const themePopover = document.getElementById('ym-theme-popover');
    if (themePopover) themePopover.classList.remove('show');
    const storedRoomId = localStorage.getItem('currentRoomId');
    const storedServerUrl = localStorage.getItem('serverUrl') || 'http://localhost:3000';
    const serverInput = document.getElementById('ym-serverUrl');
    const roomInput = document.getElementById('ym-roomId');
    if (serverInput && !serverInput.disabled) {
      serverInput.value = storedServerUrl;
    }
    if (roomInput && !roomInput.disabled) {
      roomInput.value = storedRoomId || '';
    }
    positionPopover();
    popover.classList.add('show');
  }
}

function positionPopover() {
  const btn = document.getElementById('ym-sync-button');
  const popover = document.getElementById('ym-sync-popover');
  if (!btn || !popover) return;
  const rect = btn.getBoundingClientRect();
  const popoverWidth = popover.offsetWidth || 280;
  const popoverHeight = popover.offsetHeight || 190;
  let left = rect.right + 12;
  let top = rect.top + rect.height / 2 - popoverHeight / 2;
  if (top < 10) top = 10;
  if (top + popoverHeight > window.innerHeight - 10) {
    top = window.innerHeight - popoverHeight - 10;
  }
  if (left + popoverWidth > window.innerWidth - 10) {
    left = window.innerWidth - popoverWidth - 10;
  }
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

// Дополнительные функции для тем оформления

function updatePopoverUI(roomId, status) {
  const popover = document.getElementById('ym-sync-popover');
  if (!popover) return;
  const connectBtn = document.getElementById('ym-connectBtn');
  const disconnectBtn = document.getElementById('ym-disconnectBtn');
  const statusCard = document.getElementById('ym-status-card');
  const activeRoom = document.getElementById('ym-active-room');
  const statusText = document.getElementById('ym-status-text');
  const indicator = document.querySelector('.ym-sync-status-indicator');
  const serverInput = document.getElementById('ym-serverUrl');
  const roomInput = document.getElementById('ym-roomId');
  if (indicator) {
    indicator.className = 'ym-sync-status-indicator ' + status;
  }
  if (status === 'connected') {
    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = 'block';
    if (statusCard) statusCard.style.display = 'flex';
    if (activeRoom) activeRoom.textContent = roomId;
    if (statusText) statusText.innerHTML = `Подключено: <strong id="ym-active-room">${roomId}</strong>`;
    if (serverInput) serverInput.disabled = true;
    if (roomInput) roomInput.disabled = true;
  } else if (status === 'connecting') {
    if (connectBtn) {
      connectBtn.style.display = 'block';
      connectBtn.textContent = 'Подключение...';
      connectBtn.disabled = true;
    }
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    if (statusCard) statusCard.style.display = 'none';
    if (serverInput) serverInput.disabled = true;
    if (roomInput) roomInput.disabled = true;
  } else {
    if (connectBtn) {
      connectBtn.style.display = 'block';
      connectBtn.textContent = 'Подключиться';
      connectBtn.disabled = false;
    }
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    if (statusCard) statusCard.style.display = 'none';
    if (serverInput) serverInput.disabled = false;
    if (roomInput) roomInput.disabled = false;
  }
  if (popover.classList.contains('show')) {
    setTimeout(positionPopover, 0);
  }
}

// Закрытие при клике вовне

// Закрытие при клике вовне
document.addEventListener('click', e => {
  const syncPopover = document.getElementById('ym-sync-popover');
  const syncBtn = document.getElementById('ym-sync-button');
  if (syncPopover && syncBtn && syncPopover.classList.contains('show')) {
    if (!syncPopover.contains(e.target) && !syncBtn.contains(e.target)) {
      syncPopover.classList.remove('show');
    }
  }
  const themePopover = document.getElementById('ym-theme-popover');
  const themeBtn = document.getElementById('ym-theme-button');
  if (themePopover && themeBtn && themePopover.classList.contains('show')) {
    if (!themePopover.contains(e.target) && !themeBtn.contains(e.target)) {
      themePopover.classList.remove('show');
    }
  }
  const lyricsPopover = document.getElementById('ym-lyrics-popover');
  const lyricsBtn = findLyricsButton();
  if (lyricsPopover && lyricsBtn && lyricsPopover.classList.contains('show')) {
    if (!lyricsPopover.contains(e.target) && !lyricsBtn.contains(e.target)) {
      lyricsPopover.classList.remove('show');
    }
  }
});

// Корректировка позиции при ресайзе

// Корректировка позиции при ресайзе
window.addEventListener('resize', () => {
  const syncPopover = document.getElementById('ym-sync-popover');
  if (syncPopover && syncPopover.classList.contains('show')) {
    positionPopover();
  }
  const themePopover = document.getElementById('ym-theme-popover');
  if (themePopover && themePopover.classList.contains('show')) {
    positionThemePopover();
  }
  const lyricsPopover = document.getElementById('ym-lyrics-popover');
  if (lyricsPopover && lyricsPopover.classList.contains('show')) {
    positionLyricsPopover();
  }
});

// Функции для текста песен (LRCLIB)