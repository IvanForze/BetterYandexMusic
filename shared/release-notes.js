// ==========================================
// BetterYandexMusic: Release Notes & Version Modal
// ==========================================

(function() {
  const BYM_VERSION = '1.3.1';

  const BYM_RELEASES = [
    {
      version: '1.3.1',
      date: '20 августа 2026 г.',
      isCurrent: true,
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

  function openReleaseNotesModal() {
    let overlay = document.getElementById('ym-release-notes-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ym-release-notes-overlay';
      overlay.className = 'ym-rn-overlay';

      const releasesHtml = BYM_RELEASES.map((rel, idx) => {
        const divider = idx < BYM_RELEASES.length - 1 ? '<div class="ym-rn-divider"></div>' : '';
        const currentBadge = rel.isCurrent ? '<span class="ym-rn-curr-tag">Текущая</span>' : '';
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
          <div class="ym-rn-body">
            ${releasesHtml}
          </div>
          <div class="ym-rn-footer">
            <span style="font-size: 11.5px; color: rgba(255,255,255,0.4);">BetterYandexMusic Extension & Desktop</span>
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

      document.body.appendChild(overlay);
    }

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

    if (nativeBtn) {
      // 1. ДЕСКТОП ВЕРСИЯ: найдена нативная кнопка версии Яндекса
      let ourBtn = document.getElementById('ym-version-btn');
      if (!ourBtn) {
        ourBtn = document.createElement('button');
        ourBtn.id = 'ym-version-btn';
        ourBtn.type = 'button';
        ourBtn.setAttribute('aria-label', `Версия BetterYandexMusic: ${BYM_VERSION}`);
        ourBtn.setAttribute('title', `BetterYandexMusic v${BYM_VERSION} — Что нового?`);
        ourBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openReleaseNotesModal();
        });
      }

      // Копируем нативные классы для 100% аутентичного внешнего вида
      const nativeClasses = Array.from(nativeBtn.classList)
        .filter(c => !c.includes('withReleaseNotes') && !c.includes('RELEASE_NOTES'));
      ourBtn.className = nativeClasses.join(' ') + ' ym-version-btn ym-version-btn-desktop';

      const nativeInner = nativeBtn.querySelector('div');
      const innerClasses = nativeInner ? nativeInner.className : '';
      ourBtn.innerHTML = `<div class="${innerClasses}">BYM ${BYM_VERSION}</div>`;

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
        ourBtn.className = 'ym-version-btn ym-version-btn-web';
        ourBtn.setAttribute('aria-label', `Версия BetterYandexMusic: ${BYM_VERSION}`);
        ourBtn.setAttribute('title', `BetterYandexMusic v${BYM_VERSION} — Что нового?`);
        ourBtn.innerHTML = `<span>BYM ${BYM_VERSION}</span>`;
        ourBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openReleaseNotesModal();
        });
        document.body.appendChild(ourBtn);
      } else {
        ourBtn.className = 'ym-version-btn ym-version-btn-web';
        ourBtn.style.display = 'inline-flex';
        if (ourBtn.parentNode !== document.body) {
          document.body.appendChild(ourBtn);
        }
      }

      // Если в правом нижнем углу активен виджет пакетного скачивания, сдвигаем кнопку вверх
      const batchWidget = document.getElementById('ym-batch-download-widget');
      if (batchWidget && batchWidget.classList.contains('ym-bottom-low')) {
        ourBtn.style.bottom = '114px';
      } else {
        ourBtn.style.bottom = '20px';
      }
    }
  }

  // Запуск при старте и периодический контроль
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectVersionButton);
  } else {
    injectVersionButton();
  }

  setInterval(injectVersionButton, 1000);
  window.addEventListener('resize', injectVersionButton);
  window.addEventListener('scroll', injectVersionButton, true);
  window.addEventListener('popstate', injectVersionButton);
  window.addEventListener('ym-navigation-changed', injectVersionButton);

  // Экспорт функции открытия модального окна
  window.openBymReleaseNotes = openReleaseNotesModal;
})();
