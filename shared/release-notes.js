// ==========================================
// BetterYandexMusic: Release Notes & Version Modal
// ==========================================

(function() {
  const BYM_VERSION = '1.3.1';
  const GITHUB_REPO = 'IvanForze/BetterYandexMusic';
  const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 часов между фоновыми запросами

  let updateInfo = null; // { hasUpdate, latestVersion, htmlUrl, name, body, publishedAt }

  const BYM_RELEASES = [
    {
      version: '1.3.1',
      date: '20 августа 2026 г.',
      changes: [
        'Масштабирование интерфейса (Zoom): горячие клавиши (Ctrl +, Ctrl -, Ctrl 0, Ctrl + колесо мыши), HUD-индикатор и ползунок в настройках.',
        'Скачивание треков и целых альбомов/плейлистов в ZIP-архив с поддержкой FLAC Lossless и MP3 320 kbps.',
        'Индикатор Lossless качества звука в нижней панели плеера.',
        'Исправлен поиск и отображение оценок «Риса за Творчество» (РЗТ) в полноэкранном плеере.',
        'Исправлено дублирование названий треков и исполнителей в Discord RPC.',
        'Исправлена отрисовка графиков в разделе аналитики (Local Wrapped).',
        'Улучшена стабильность и совместимость установщика.'
      ]
    },
    {
      version: '1.3.0',
      date: '7 июля 2026 г.',
      changes: [
        'Local Wrapped — персональная статистика прослушиваний в реальном времени: топ треков и артистов, жанры, активность по часам и дням.',
        'GitHub-style heatmap активности за год с интерактивными тултипами.',
        'Интерактивный режим историй (Wrapped Stories) с карточками и быстрым воспроизведением.',
        'Экспорт и импорт локальной базы статистики прослушиваний.',
        'Установщик: исправлен поиск пути Яндекс Музыки на Linux (Flatpak, deb/rpm, AppImage).',
        'Оформление: эмодзи заменены на современные SVG-иконки Lucide.'
      ]
    },
    {
      version: '1.2.1',
      date: '6 июля 2026 г.',
      changes: [
        'Локальный сервер синхронизации: управление сервером совместного прослушивания и Cloudflare-туннелями прямо из интерфейса.',
        'Кастомный источник текстов песен: в настройки добавлен выбор альтернативных источников текстов (LRCLib / Genius).',
        'Скробблинг треков в Last.fm и ListenBrainz.',
        'Улучшение стабильности синхронизации очередей.'
      ]
    },
    {
      version: '1.2.0',
      date: '5 июля 2026 г.',
      changes: [
        'Интеграция SoundCloud: поиск треков напрямую из интерфейса Яндекс Музыки с возможностью прослушивания и автоматического импорта в медиатеку.',
        'Интеграция с Genius: полноэкранный плеер с поддержкой текстов от Genius, аннотациями и фактами о строчках песен.',
        'Таймер сна: новая функция для плавного затухания громкости и автоматического отключения плеера через заданное время.',
        'Оценки RZT: исправлена ошибка отображения подсказок с оценками в полноэкранном плеере.'
      ]
    },
    {
      version: '1.1.0',
      date: '17 июня 2026 г.',
      changes: [
        'Синхронизация совместного прослушивания треков между несколькими клиентами.',
        'Улучшение управления воспроизведением через WebSocket-соединение.'
      ]
    },
    {
      version: '1.0.0',
      date: '8 июня 2026 г.',
      changes: [
        'Первый релиз BetterYandexMusic: базовый функционал интеграции, сборки для Linux, Windows и macOS.'
      ]
    }
  ];

  // Сравнение версий формата SemVer (1.3.1 vs 1.3.0)
  function compareSemver(v1, v2) {
    const clean = v => (v || '').replace(/^[^\d]*/, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
    const p1 = clean(v1);
    const p2 = clean(v2);
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  // Запрос свежих данных о релизе через мост (обход CSP в браузере и Electron) или прямой fetch
  function fetchLatestReleaseData() {
    return new Promise((resolve) => {
      const requestId = 'bym_upd_' + Math.random().toString(36).slice(2);
      let done = false;

      const finish = (result) => {
        if (done) return;
        done = true;
        try { window.removeEventListener('message', onMsg); } catch(e) {}
        resolve(result);
      };

      const onMsg = (event) => {
        if (event.data && event.data.__ym_sc_bridge_response && event.data.requestId === requestId) {
          if (event.data.response && event.data.response.ok && event.data.response.data) {
            finish(event.data.response.data);
          } else {
            directFetch();
          }
        }
      };

      window.addEventListener('message', onMsg);

      // 1. Запрос через мост (Electron preload / Chrome Extension background worker)
      try {
        window.postMessage({
          __ym_sc_bridge: true,
          requestId,
          type: 'BYM_CHECK_UPDATE'
        }, '*');
      } catch (e) {}

      // 2. Фоллбек по таймауту на прямой fetch
      const timeoutTimer = setTimeout(() => {
        directFetch();
      }, 900);

      function directFetch() {
        if (done) return;
        clearTimeout(timeoutTimer);
        fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        })
          .then(resp => {
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.json();
          })
          .then(data => finish(data))
          .catch(err => {
            finish(null);
          });
      }
    });
  }

  // Запрос свежей версии через GitHub Releases API
  async function checkBymUpdates(force = false) {
    try {
      const storageKey = 'bym_update_info';
      const now = Date.now();
      if (!force) {
        try {
          const cachedRaw = localStorage.getItem(storageKey);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if (cached && (now - cached.checkedAt < CHECK_INTERVAL_MS) && cached.currentVersion === BYM_VERSION) {
              updateInfo = cached.info;
              injectVersionButton();
              if (updateInfo && updateInfo.hasUpdate) {
                showUpdateToast(updateInfo);
              }
              return updateInfo;
            }
          }
        } catch (e) {}
      }

      const data = await fetchLatestReleaseData();
      if (!data) return null;
      const rawTag = data.tag_name || '';
      const latestVer = rawTag.replace(/^v/, '');

      const hasUpdate = compareSemver(latestVer, BYM_VERSION) > 0;
      updateInfo = {
        hasUpdate,
        latestVersion: latestVer,
        htmlUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases`,
        name: data.name || `Релиз v${latestVer}`,
        body: data.body || '',
        publishedAt: data.published_at
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify({
          checkedAt: now,
          currentVersion: BYM_VERSION,
          info: updateInfo
        }));
      } catch (e) {}

      injectVersionButton();
      if (hasUpdate) {
        showUpdateToast(updateInfo);
      }
      return updateInfo;
    } catch (err) {
      console.warn('[BYM] Ошибка проверки обновлений с GitHub:', err);
      return null;
    }
  }

  // Ненавязчивый Toast с уведомлением о новой версии
  function showUpdateToast(info) {
    if (typeof document === 'undefined') return;
    if (!info || !info.hasUpdate) return;
    const sessionDismissKey = 'bym_update_toast_dismissed_' + info.latestVersion;
    if (sessionStorage.getItem(sessionDismissKey)) return;

    let toast = document.getElementById('ym-update-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ym-update-toast';
      document.body.appendChild(toast);
    }

    toast.className = 'ym-update-toast';
    toast.innerHTML = `
      <div class="ym-update-toast-icon">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </div>
      <div class="ym-update-toast-content">
        <div class="ym-update-toast-title">Доступно обновление BYM v${info.latestVersion}!</div>
        <div class="ym-update-toast-sub">У вас установлена версия v${BYM_VERSION}</div>
      </div>
      <button type="button" class="ym-update-toast-btn" id="ym-update-toast-action">Что нового</button>
      <button type="button" class="ym-update-toast-close" id="ym-update-toast-close" aria-label="Закрыть">✕</button>
    `;

    toast.querySelector('#ym-update-toast-action')?.addEventListener('click', () => {
      toast.classList.remove('ym-update-toast-active');
      openReleaseNotesModal();
    });

    toast.querySelector('#ym-update-toast-close')?.addEventListener('click', () => {
      toast.classList.remove('ym-update-toast-active');
      sessionStorage.setItem(sessionDismissKey, '1');
    });

    requestAnimationFrame(() => {
      toast.classList.add('ym-update-toast-active');
    });

    setTimeout(() => {
      if (toast && toast.classList.contains('ym-update-toast-active')) {
        toast.classList.remove('ym-update-toast-active');
      }
    }, 12000);
  }

  function isYmMainPage() {
    const path = (window.location.pathname || '').replace(/\/+$/, '');
    return path === '' || path === '/home';
  }

  function closeReleaseNotesModal() {
    const overlay = document.getElementById('ym-release-notes-overlay');
    if (overlay) {
      overlay.classList.remove('ym-rn-active');
      setTimeout(() => {
        if (overlay && !overlay.classList.contains('ym-rn-active')) {
          overlay.remove();
        }
      }, 260);
    }
    document.removeEventListener('keydown', handleEscapeKey);
  }

  function handleEscapeKey(e) {
    if (e.key === 'Escape') {
      closeReleaseNotesModal();
    }
  }

  function renderModalContent(overlay) {
    const updateBannerHtml = (updateInfo && updateInfo.hasUpdate) ? `
      <div class="ym-rn-update-banner">
        <div class="ym-rn-update-banner-header">
          <div class="ym-rn-update-badge-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <div class="ym-rn-update-banner-info">
            <div class="ym-rn-update-banner-title">Доступна новая версия <strong>v${updateInfo.latestVersion}</strong>!</div>
            <div class="ym-rn-update-banner-desc">У вас v${BYM_VERSION}. Ознакомьтесь с изменениями или загрузите релиз.</div>
          </div>
        </div>
        <a href="${updateInfo.htmlUrl}" target="_blank" rel="noopener noreferrer" class="ym-rn-update-banner-link">
          <span>Скачать</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      </div>
    ` : '';

    const releasesHtml = BYM_RELEASES.map((rel, idx) => {
      const divider = idx < BYM_RELEASES.length - 1 ? '<div class="ym-rn-divider"></div>' : '';
      const isCurrent = rel.version === BYM_VERSION;
      const currentBadge = isCurrent ? '<span class="ym-rn-curr-tag">Текущая</span>' : '';
      const listItems = rel.changes.map(c => `<li>${c}</li>`).join('');

      return `
        <div class="ym-rn-entry">
          <div class="ym-rn-version-row">
            <span class="ym-rn-version">${rel.version}</span>
            ${currentBadge}
          </div>
          <div class="ym-rn-date">${rel.date}</div>
          <ul class="ym-rn-list">
            ${listItems}
          </ul>
        </div>
        ${divider}
      `;
    }).join('');

    const bodyEl = overlay.querySelector('.ym-rn-body');
    if (bodyEl) {
      bodyEl.innerHTML = updateBannerHtml + releasesHtml;
    }
  }

  function openReleaseNotesModal() {
    let overlay = document.getElementById('ym-release-notes-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ym-release-notes-overlay';
      overlay.className = 'ym-rn-overlay';

      overlay.innerHTML = `
        <div class="ym-rn-modal" role="dialog" aria-modal="true" aria-labelledby="ym-rn-dialog-title">
          <div class="ym-rn-header">
            <div class="ym-rn-title-wrap">
              <h2 class="ym-rn-title" id="ym-rn-dialog-title">Что нового?</h2>
              <span class="ym-rn-badge">BetterYandexMusic v${BYM_VERSION}</span>
            </div>
            <button type="button" class="ym-rn-close-btn" id="ym-rn-close-btn" aria-label="Закрыть">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="ym-rn-body"></div>
          <div class="ym-rn-footer">
            <button type="button" class="ym-rn-check-btn" id="ym-rn-check-btn">Проверить обновления</button>
            <a href="https://github.com/IvanForze/BetterYandexMusic" target="_blank" rel="noopener noreferrer" class="ym-rn-github-link">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span>GitHub</span>
            </a>
          </div>
        </div>
      `;

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeReleaseNotesModal();
        }
      });

      overlay.querySelector('#ym-rn-close-btn')?.addEventListener('click', () => {
        closeReleaseNotesModal();
      });

      overlay.querySelector('#ym-rn-check-btn')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const origText = btn.textContent;
        btn.textContent = 'Проверка...';
        btn.disabled = true;
        const res = await checkBymUpdates(true);
        btn.disabled = false;
        if (res && res.hasUpdate) {
          btn.textContent = `Доступна v${res.latestVersion}!`;
        } else {
          btn.textContent = 'У вас последняя версия!';
        }
        renderModalContent(overlay);
        setTimeout(() => {
          if (btn) btn.textContent = origText;
        }, 3000);
      });

      document.body.appendChild(overlay);
    }

    renderModalContent(overlay);

    // Триггерим анимацию появления
    requestAnimationFrame(() => {
      overlay.classList.add('ym-rn-active');
    });

    document.addEventListener('keydown', handleEscapeKey);
  }

  function injectVersionButton() {
    const isDesktop = typeof window !== 'undefined' && 
      (window.navigator.userAgent.includes('Electron') || 
       (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendState === 'function'));

    const nativeBtn = document.querySelector('[data-test-id="RELEASE_NOTES_BUTTON"]');
    const hasUpdate = updateInfo && updateInfo.hasUpdate;
    const updateDot = hasUpdate ? '<span class="ym-version-update-dot" title="Доступно обновление!"></span>' : '';
    const btnTitle = hasUpdate
      ? `BetterYandexMusic: Доступно обновление до v${updateInfo.latestVersion}! Нажмите для подробностей`
      : `BetterYandexMusic v${BYM_VERSION} — Что нового?`;

    if (nativeBtn) {
      // 1. ДЕСКТОП ВЕРСИЯ: найдена нативная кнопка версии Яндекса
      let ourBtn = document.getElementById('ym-version-btn');
      if (!ourBtn) {
        ourBtn = document.createElement('button');
        ourBtn.id = 'ym-version-btn';
        ourBtn.type = 'button';
        ourBtn.setAttribute('aria-label', `Версия BetterYandexMusic: ${BYM_VERSION}`);
        ourBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openReleaseNotesModal();
        });
      }

      ourBtn.setAttribute('title', btnTitle);

      // Копируем нативные классы для 100% аутентичного внешнего вида
      const nativeClasses = Array.from(nativeBtn.classList)
        .filter(c => !c.includes('withReleaseNotes') && !c.includes('RELEASE_NOTES'));
      ourBtn.className = nativeClasses.join(' ') + ' ym-version-btn ym-version-btn-desktop' + (hasUpdate ? ' ym-has-update' : '');

      const nativeInner = nativeBtn.querySelector('div');
      const innerClasses = nativeInner ? nativeInner.className : '';
      const targetHtml = `<div class="${innerClasses}">BYM ${BYM_VERSION}${updateDot}</div>`;
      if (ourBtn.innerHTML !== targetHtml) {
        ourBtn.innerHTML = targetHtml;
      }

      // Вставляем строго перед нативной кнопкой в ее родительский слот (как было!)
      const parent = nativeBtn.parentNode;
      if (parent) {
        parent.classList.add('ym-version-container-flex');
        parent.style.display = 'inline-flex';
        parent.style.flexDirection = 'row';
        parent.style.alignItems = 'center';
        parent.style.flexWrap = 'nowrap';
        parent.style.gap = '8px';

        if (ourBtn.nextSibling !== nativeBtn || ourBtn.parentNode !== parent) {
          parent.insertBefore(ourBtn, nativeBtn);
        }
      }

      ourBtn.style.position = 'static';
      ourBtn.style.display = 'inline-flex';
      ourBtn.style.margin = '0';
      ourBtn.style.marginBlockEnd = 'var(--ym-spacer-size-m, 12px)';
    } else {
      let ourBtn = document.getElementById('ym-version-btn');

      // Если в десктопе на странице нет нативной кнопки — прячем нашу кнопку!
      if (isDesktop) {
        if (ourBtn) {
          ourBtn.style.display = 'none';
        }
        return;
      }

      // 2. ВЕБ ВЕРСИЯ (или на странице нет нативной кнопки)
      const onMain = isYmMainPage();

      if (!onMain) {
        if (ourBtn) {
          ourBtn.style.display = 'none';
        }
        return;
      }

      if (!ourBtn) {
        ourBtn = document.createElement('button');
        ourBtn.id = 'ym-version-btn';
        ourBtn.type = 'button';
        ourBtn.className = 'ym-version-btn ym-version-btn-web' + (hasUpdate ? ' ym-has-update' : '');
        ourBtn.setAttribute('aria-label', `Версия BetterYandexMusic: ${BYM_VERSION}`);
        ourBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openReleaseNotesModal();
        });
        document.body.appendChild(ourBtn);
      } else {
        ourBtn.className = 'ym-version-btn ym-version-btn-web' + (hasUpdate ? ' ym-has-update' : '');
        ourBtn.style.display = 'inline-flex';
        if (ourBtn.parentNode !== document.body) {
          document.body.appendChild(ourBtn);
        }
      }

      ourBtn.setAttribute('title', btnTitle);
      const targetHtml = `<span>BYM ${BYM_VERSION}</span>${updateDot}`;
      if (ourBtn.innerHTML !== targetHtml) {
        ourBtn.innerHTML = targetHtml;
      }
    }
  }

  // Запуск при старте и периодический контроль
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectVersionButton();
      checkBymUpdates();
    });
  } else {
    injectVersionButton();
    checkBymUpdates();
  }

  setInterval(injectVersionButton, 1000);
  window.addEventListener('resize', injectVersionButton);
  window.addEventListener('scroll', injectVersionButton, true);
  window.addEventListener('popstate', injectVersionButton);
  window.addEventListener('ym-navigation-changed', injectVersionButton);

  // Экспорт функции открытия модального окна и проверки обновлений
  window.openBymReleaseNotes = openReleaseNotesModal;
  window.checkBymUpdates = checkBymUpdates;
})();
