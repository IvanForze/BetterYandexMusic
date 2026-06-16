// ==========================================
// SCROBBLER SETTINGS UI INJECTOR (Polished & Resilient)
// ==========================================

// Имитация contextBridge для браузерного расширения через window.postMessage
if (!window.__ymSyncBridge && typeof window.ScrobblerService === 'undefined') {
  function callScrobblerApi(method, args) {
    return new Promise((resolve, reject) => {
      const nonce = Math.random().toString();
      const handler = (event) => {
        if (event.source !== window || !event.data || event.data.type !== 'YM_SCROBBLER_API_RESPONSE' || event.data.nonce !== nonce) return;
        window.removeEventListener('message', handler);
        if (event.data.error) reject(new Error(event.data.error));
        else resolve(event.data.result);
      };
      window.addEventListener('message', handler);
      window.postMessage({ type: 'YM_SCROBBLER_API_CALL', method, args, nonce }, '*');
    });
  }

  window.__ymSyncBridge = {
    sendScrobblerSettings: (settings) => window.postMessage({ type: 'YM_SCROBBLER_SETTINGS_CHANGED', settings }, '*'),
    lastFmGetToken: (k, s) => callScrobblerApi('lastFmGetToken', [k, s]),
    lastFmGetSession: (t, k, s) => callScrobblerApi('lastFmGetSession', [t, k, s]),
    listenBrainzValidateToken: (t) => callScrobblerApi('listenBrainzValidateToken', [t])
  };
}

let lastFmPendingToken = null;

function syncSettingsToPreload() {
  const settings = {
    lastfmEnabled: localStorage.getItem('ymScrobblerLastfmEnabled') === 'true',
    lastfmSessionKey: localStorage.getItem('ymScrobblerLastfmSessionKey') || '',
    lastfmUsername: localStorage.getItem('ymScrobblerLastfmUsername') || '',
    lastfmApiKey: localStorage.getItem('ymScrobblerLastfmApiKey') || '',
    lastfmSecret: localStorage.getItem('ymScrobblerLastfmSecret') || '',
    listenbrainzEnabled: localStorage.getItem('ymScrobblerListenbrainzEnabled') === 'true',
    listenbrainzToken: localStorage.getItem('ymScrobblerListenbrainzToken') || '',
    listenbrainzUsername: localStorage.getItem('ymScrobblerListenbrainzUsername') || ''
  };
  
  if (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendScrobblerSettings === 'function') {
    window.__ymSyncBridge.sendScrobblerSettings(settings);
  } else {
    window.postMessage({
      type: 'YM_SCROBBLER_SETTINGS_CHANGED',
      settings: settings
    }, '*');
  }
}

// Первичная синхронизация при загрузке
setTimeout(syncSettingsToPreload, 2000);


function checkAndInjectSettings() {
  if (!window.location.pathname.includes('/settings')) {
    return;
  }
  
  // Проверяем, не внедрено ли уже в DOM
  if (document.getElementById('ym-scrobbler-settings-block')) {
    return;
  }
  
  // Ищем элемент "Офлайн-режим", "О приложении", "Внешний вид", "Язык" чтобы найти список настроек
  const divs = Array.from(document.querySelectorAll('div, span, p, h2, h3'));
  const targetTextElement = divs.find(el => {
    if (el.children.length > 0) return false; // Ищем самый глубокий текстовый узел
    const text = el.textContent || '';
    return text.includes('Офлайн-режим') || text.includes('Плавные переходы') || text.includes('О приложении') || text.includes('Внешний вид') || text.includes('Язык') || text.includes('Качество звука');
  });

  if (!targetTextElement) return;

  // Ищем родительский элемент ряда настроек (Settings Item), который является непосредственным потомком списка
  let itemNode = targetTextElement;
  while (itemNode && itemNode.parentElement && itemNode.parentElement.children.length < 3) {
    itemNode = itemNode.parentElement;
  }

  const listContainer = itemNode ? itemNode.parentElement : null;
  if (!listContainer) return;

  // Создаем блок настроек скроблинга
  const block = document.createElement('div');
  block.id = 'ym-scrobbler-settings-block';
  block.className = 'ym-settings-section';
  block.style.width = '100%';
  block.style.boxSizing = 'border-box';
  block.style.fontFamily = 'Yandex Sans Text, Arial, sans-serif';

  // Загружаем сохраненные значения
  const lastfmEnabled = localStorage.getItem('ymScrobblerLastfmEnabled') === 'true';
  const lastfmUsername = localStorage.getItem('ymScrobblerLastfmUsername') || '';
  const lastfmSessionKey = localStorage.getItem('ymScrobblerLastfmSessionKey') || '';
  const lastfmApiKey = localStorage.getItem('ymScrobblerLastfmApiKey') || '';
  const lastfmSecret = localStorage.getItem('ymScrobblerLastfmSecret') || '';
  
  const listenbrainzEnabled = localStorage.getItem('ymScrobblerListenbrainzEnabled') === 'true';
  const listenbrainzToken = localStorage.getItem('ymScrobblerListenbrainzToken') || '';
  const listenbrainzUsername = localStorage.getItem('ymScrobblerListenbrainzUsername') || '';

  block.innerHTML = `
    <!-- Заголовок секции, оформленный как нативный -->
    <div class="ym-settings-section-title" style="font-size: 17px; font-weight: 700; padding: 24px 0 8px 0; letter-spacing: -0.2px;">Скроблинг</div>
    
    <!-- Секция Last.fm -->
    <div class="ym-settings-item" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 0; min-height: 52px; box-sizing: border-box;">
      <div style="flex: 1; padding-right: 16px;">
        <div class="ym-settings-item-title" style="font-size: 15px; font-weight: 600; margin-bottom: 3px;">Last.fm</div>
        <div id="ym-lastfm-status" class="ym-settings-item-status" style="font-size: 13px; line-height: 17px; margin-bottom: 8px;">
          ${lastfmSessionKey ? `Подключено как: <strong class="ym-settings-strong">${lastfmUsername}</strong>` : 'Не авторизован'}
        </div>
        
        <!-- Поля ввода собственных ключей Last.fm -->
        <div id="ym-lastfm-keys-container" style="max-width: 420px; margin-bottom: 12px; display: ${lastfmSessionKey ? 'none' : 'block'};">
          <div class="ym-settings-item-subtext" style="font-size:11px; margin-bottom: 6px;">
            Создайте приложение на <a href="https://www.last.fm/api/account/create" target="_blank" style="color: #ffdb4d; text-decoration: underline;">last.fm/api/account/create</a> и укажите ключи ниже:
          </div>
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <input type="text" id="ym-lastfm-apikey" value="${lastfmApiKey}" placeholder="API Key" class="ym-input" style="flex: 1; min-width: 0;">
            <input type="password" id="ym-lastfm-secret" value="${lastfmSecret}" placeholder="Shared Secret" class="ym-input" style="flex: 1; min-width: 0;">
          </div>
        </div>

        <div id="ym-lastfm-actions">
          ${lastfmSessionKey ? 
            `<button id="ym-lastfm-logout-btn" class="ym-btn-secondary">Выйти</button>` :
            `<button id="ym-lastfm-login-btn" class="ym-btn-primary">Войти через Last.fm</button>
             <button id="ym-lastfm-confirm-btn" class="ym-btn-secondary" style="display:none; margin-left: 8px;">Я подтвердил авторизацию</button>`
          }
        </div>
      </div>
      <div style="padding-top: 2px;">
        <label class="ym-switch">
          <input type="checkbox" id="ym-lastfm-toggle" ${lastfmEnabled ? 'checked' : ''}>
          <span class="ym-slider"></span>
        </label>
      </div>
    </div>

    <!-- Секция ListenBrainz -->
    <div class="ym-settings-item" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 0; min-height: 52px; box-sizing: border-box;">
      <div style="flex: 1; padding-right: 16px;">
        <div class="ym-settings-item-title" style="font-size: 15px; font-weight: 600; margin-bottom: 3px;">ListenBrainz</div>
        <div id="ym-listenbrainz-status" class="ym-settings-item-status" style="font-size: 13px; line-height: 17px; margin-bottom: 8px;">
          ${listenbrainzUsername ? `Подключено как: <strong class="ym-settings-strong">${listenbrainzUsername}</strong>` : 'Не подключено'}
        </div>
        
        <div style="max-width: 420px; margin-top: 8px;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="password" id="ym-listenbrainz-token" value="${listenbrainzToken}" placeholder="Токен пользователя (User Token)" class="ym-input" style="flex: 1; min-width: 0;">
            <button id="ym-listenbrainz-save-btn" class="ym-btn-secondary">Сохранить</button>
          </div>
        </div>
      </div>
      <div style="padding-top: 2px;">
        <label class="ym-switch">
          <input type="checkbox" id="ym-listenbrainz-toggle" ${listenbrainzEnabled ? 'checked' : ''}>
          <span class="ym-slider"></span>
        </label>
      </div>
    </div>

    <!-- Тонкий разделитель в конце нашей секции -->
    <div class="ym-settings-divider" style="height: 1px; margin-top: 14px; margin-bottom: 14px;"></div>

    <style>
      /* Использование CSS-переменных Яндекс Музыки для автоматической адаптации к любой теме (темной, светлой, кастомным) */
      .ym-settings-section-title {
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
      }
      .ym-settings-item-title {
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
      }
      .ym-settings-item-status {
        color: var(--yp-color-text-secondary, rgba(255, 255, 255, 0.45)) !important;
      }
      .ym-settings-strong {
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
        font-weight: 600;
      }
      .ym-settings-item-subtext {
        color: var(--yp-color-text-tertiary, rgba(255, 255, 255, 0.4)) !important;
      }
      .ym-settings-item {
        border-bottom: 1px solid var(--yp-color-border-primary, rgba(255, 255, 255, 0.06)) !important;
      }
      .ym-settings-divider {
        background: var(--yp-color-border-primary, rgba(255, 255, 255, 0.06)) !important;
      }

      /* Кнопки в стиле Яндекс Музыки */
      .ym-btn-primary {
        background: var(--yp-color-brand, #ffdb4d) !important;
        color: #000000 !important;
        border: none;
        padding: 6px 16px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: transform 0.1s, opacity 0.15s;
        font-family: inherit;
      }
      .ym-btn-primary:hover {
        opacity: 0.9;
      }
      .ym-btn-primary:active {
        transform: scale(0.97);
      }
      
      .ym-btn-secondary {
        background: var(--yp-color-bg-secondary, rgba(255, 255, 255, 0.08)) !important;
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
        border: 1px solid var(--yp-color-border-primary, rgba(255, 255, 255, 0.12)) !important;
        padding: 6px 16px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: transform 0.1s, background 0.15s;
        font-family: inherit;
      }
      .ym-btn-secondary:hover {
        background: var(--yp-color-bg-tertiary, rgba(255, 255, 255, 0.14)) !important;
      }
      .ym-btn-secondary:active {
        transform: scale(0.97);
      }

      /* Инпуты */
      .ym-input {
        background: var(--yp-color-bg-secondary, rgba(255, 255, 255, 0.06)) !important;
        border: 1px solid var(--yp-color-border-primary, rgba(255, 255, 255, 0.12)) !important;
        color: var(--yp-color-text-primary, var(--color-text-primary, #ffffff)) !important;
        padding: 7px 14px;
        border-radius: 20px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s, background 0.2s;
        font-family: inherit;
        box-sizing: border-box;
        width: 100%;
      }
      .ym-input:focus {
        border-color: var(--yp-color-brand, #ffdb4d) !important;
        background: var(--yp-color-bg-tertiary, rgba(255, 255, 255, 0.09)) !important;
      }
      .ym-input::placeholder {
        color: var(--yp-color-text-tertiary, rgba(255, 255, 255, 0.3)) !important;
      }

      /* Свичи (Тумблеры) в стиле Яндекс Музыки (Желтые при включении) */
      .ym-switch {
        position: relative;
        display: inline-block;
        width: 38px;
        height: 20px;
      }
      .ym-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .ym-slider {
        position: absolute;
        cursor: pointer;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: rgba(128, 128, 128, 0.25) !important;
        transition: background-color 0.2s;
        border-radius: 20px;
      }
      .ym-slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 3px;
        bottom: 3px;
        background-color: #ffffff;
        transition: transform 0.2s, background-color 0.2s;
        border-radius: 50%;
      }
      .ym-switch input:checked + .ym-slider {
        background-color: var(--yp-color-brand, #ffdb4d) !important;
      }
      .ym-switch input:checked + .ym-slider:before {
        transform: translateX(18px);
        background-color: #000000;
      }

      /* Светлая тема Яндекс Музыки (класс .ym-light-theme, как в themes.js) */
      .ym-light-theme .ym-settings-section-title {
        color: #000000 !important;
      }
      .ym-light-theme .ym-settings-item-title {
        color: #000000 !important;
      }
      .ym-light-theme .ym-settings-item-status {
        color: rgba(0, 0, 0, 0.6) !important;
      }
      .ym-light-theme .ym-settings-strong {
        color: #000000 !important;
      }
      .ym-light-theme .ym-settings-item-subtext {
        color: rgba(0, 0, 0, 0.5) !important;
      }
      .ym-light-theme .ym-settings-item {
        border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
      }
      .ym-light-theme .ym-settings-divider {
        background: rgba(0, 0, 0, 0.08) !important;
      }
      .ym-light-theme .ym-btn-secondary {
        background: rgba(0, 0, 0, 0.04) !important;
        color: #000000 !important;
        border: 1px solid rgba(0, 0, 0, 0.15) !important;
      }
      .ym-light-theme .ym-btn-secondary:hover {
        background: rgba(0, 0, 0, 0.09) !important;
      }
      .ym-light-theme .ym-input {
        background: rgba(0, 0, 0, 0.04) !important;
        border: 1px solid rgba(0, 0, 0, 0.15) !important;
        color: #000000 !important;
      }
      .ym-light-theme .ym-input:focus {
        border-color: rgba(0, 0, 0, 0.4) !important;
        background: rgba(0, 0, 0, 0.07) !important;
      }
      .ym-light-theme .ym-input::placeholder {
        color: rgba(0, 0, 0, 0.4) !important;
      }
      .ym-light-theme .ym-slider {
        background-color: rgba(0, 0, 0, 0.15) !important;
      }
    </style>
  `;

  // Находим самый первый элемент настроек в списке (обычно это ряд содержащий "Офлайн-режим" или первый дочерний элемент списка)
  // Вставляем НАШ блок строго ПЕРЕД первым элементом настроек, но ПОСЛЕ заголовка/хедера.
  // Это гарантирует, что блок попадет в прокручиваемый список настроек, не налезая на шапку «Настройки».
  const firstSettingsItem = listContainer.querySelector('div, li');
  if (firstSettingsItem) {
    listContainer.insertBefore(block, firstSettingsItem);
  } else {
    listContainer.appendChild(block);
  }

  // Настройка слушателей Last.fm
  const lastfmToggle = document.getElementById('ym-lastfm-toggle');

  if (lastfmToggle) {
    lastfmToggle.addEventListener('change', (e) => {
      localStorage.setItem('ymScrobblerLastfmEnabled', e.target.checked ? 'true' : 'false');
      syncSettingsToPreload();
    });
  }

  const setupLastFmEvents = () => {
    const loginBtn = document.getElementById('ym-lastfm-login-btn');
    const confirmBtn = document.getElementById('ym-lastfm-confirm-btn');
    const logoutBtn = document.getElementById('ym-lastfm-logout-btn');

    if (loginBtn) {
      loginBtn.addEventListener('click', async () => {
        try {
          const userApiKey = document.getElementById('ym-lastfm-apikey').value.trim();
          const userSecret = document.getElementById('ym-lastfm-secret').value.trim();
          
          if (!userApiKey || !userSecret) {
            alert('Пожалуйста, введите API Key и Shared Secret от Last.fm перед авторизацией.');
            return;
          }

          loginBtn.textContent = 'Получение ссылки...';
          loginBtn.disabled = true;

          // Сохраняем ключи в localStorage
          localStorage.setItem('ymScrobblerLastfmApiKey', userApiKey);
          localStorage.setItem('ymScrobblerLastfmSecret', userSecret);
          syncSettingsToPreload();

          const bridge = window.__ymSyncBridge;
          if (!bridge || typeof bridge.lastFmGetToken !== 'function') {
            throw new Error('Функции моста недоступны');
          }

          const token = await bridge.lastFmGetToken(userApiKey, userSecret);
          lastFmPendingToken = token;

          // Открываем браузер на страницу авторизации с валидным ключом
          window.open(`https://www.last.fm/api/auth/?api_key=${userApiKey}&token=${token}`);

          loginBtn.style.display = 'none';
          confirmBtn.style.display = 'inline-block';
        } catch (err) {
          console.error(err);
          alert('Ошибка авторизации Last.fm: ' + err.message);
          loginBtn.textContent = 'Войти через Last.fm';
          loginBtn.disabled = false;
        }
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        try {
          confirmBtn.textContent = 'Проверка...';
          confirmBtn.disabled = true;

          const bridge = window.__ymSyncBridge;
          const userApiKey = localStorage.getItem('ymScrobblerLastfmApiKey');
          const userSecret = localStorage.getItem('ymScrobblerLastfmSecret');
          const session = await bridge.lastFmGetSession(lastFmPendingToken, userApiKey, userSecret);

          localStorage.setItem('ymScrobblerLastfmSessionKey', session.sessionKey);
          localStorage.setItem('ymScrobblerLastfmUsername', session.username);
          localStorage.setItem('ymScrobblerLastfmEnabled', 'true');

          // Обновляем UI
          document.getElementById('ym-lastfm-status').innerHTML = `Подключено как: <strong class="ym-settings-strong">${session.username}</strong>`;
          document.getElementById('ym-lastfm-actions').innerHTML = `<button id="ym-lastfm-logout-btn" class="ym-btn-secondary">Выйти</button>`;
          const keysContainer = document.getElementById('ym-lastfm-keys-container');
          if (keysContainer) keysContainer.style.display = 'none';
          if (lastfmToggle) lastfmToggle.checked = true;

          syncSettingsToPreload();
          setupLastFmEvents();
        } catch (err) {
          console.error(err);
          alert('Не удалось подтвердить авторизацию. Убедитесь, что вы нажали "Разрешить доступ" на открывшейся веб-странице Last.fm.');
          confirmBtn.textContent = 'Я подтвердил авторизацию';
          confirmBtn.disabled = false;
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('ymScrobblerLastfmSessionKey');
        localStorage.removeItem('ymScrobblerLastfmUsername');
        localStorage.removeItem('ymScrobblerLastfmApiKey');
        localStorage.removeItem('ymScrobblerLastfmSecret');
        localStorage.setItem('ymScrobblerLastfmEnabled', 'false');

        document.getElementById('ym-lastfm-status').textContent = 'Не авторизован';
        document.getElementById('ym-lastfm-actions').innerHTML = `<button id="ym-lastfm-login-btn" class="ym-btn-primary">Войти через Last.fm</button>
           <button id="ym-lastfm-confirm-btn" class="ym-btn-secondary" style="display:none;">Я подтвердил авторизацию</button>`;
        
        const keysContainer = document.getElementById('ym-lastfm-keys-container');
        if (keysContainer) keysContainer.style.display = 'block';
        
        const keyInput = document.getElementById('ym-lastfm-apikey');
        const secInput = document.getElementById('ym-lastfm-secret');
        if (keyInput) keyInput.value = '';
        if (secInput) secInput.value = '';

        if (lastfmToggle) lastfmToggle.checked = false;

        syncSettingsToPreload();
        setupLastFmEvents();
      });
    }
  };

  setupLastFmEvents();

  // Настройка слушателей ListenBrainz
  const listenbrainzToggle = document.getElementById('ym-listenbrainz-toggle');
  if (listenbrainzToggle) {
    listenbrainzToggle.addEventListener('change', (e) => {
      localStorage.setItem('ymScrobblerListenbrainzEnabled', e.target.checked ? 'true' : 'false');
      syncSettingsToPreload();
    });
  }

  const saveBtn = document.getElementById('ym-listenbrainz-save-btn');
  const tokenInput = document.getElementById('ym-listenbrainz-token');
  const lbStatus = document.getElementById('ym-listenbrainz-status');

  if (saveBtn && tokenInput) {
    saveBtn.addEventListener('click', async () => {
      const token = tokenInput.value.trim();
      if (!token) {
        localStorage.removeItem('ymScrobblerListenbrainzToken');
        localStorage.removeItem('ymScrobblerListenbrainzUsername');
        localStorage.setItem('ymScrobblerListenbrainzEnabled', 'false');
        lbStatus.textContent = 'Не подключено';
        if (listenbrainzToggle) listenbrainzToggle.checked = false;
        syncSettingsToPreload();
        return;
      }

      try {
        saveBtn.textContent = 'Проверка...';
        saveBtn.disabled = true;

        const bridge = window.__ymSyncBridge;
        if (!bridge || typeof bridge.listenBrainzValidateToken !== 'function') {
          throw new Error('Функции моста недоступны');
        }

        const username = await bridge.listenBrainzValidateToken(token);
        
        localStorage.setItem('ymScrobblerListenbrainzToken', token);
        localStorage.setItem('ymScrobblerListenbrainzUsername', username);
        localStorage.setItem('ymScrobblerListenbrainzEnabled', 'true');

        lbStatus.innerHTML = `Подключено как: <strong class="ym-settings-strong">${username}</strong>`;
        if (listenbrainzToggle) listenbrainzToggle.checked = true;

        syncSettingsToPreload();
        alert('Токен ListenBrainz успешно сохранен и проверен!');
      } catch (err) {
        console.error(err);
        alert('Ошибка валидации токена ListenBrainz: ' + err.message);
      } finally {
        saveBtn.textContent = 'Сохранить';
        saveBtn.disabled = false;
      }
    });
  }
}

// Регулярно сканируем DOM на предмет нахождения на странице настроек
setInterval(checkAndInjectSettings, 1000);
