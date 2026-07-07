// ==========================================
// WRAPPED UI INJECTOR (Локальная статистика)
// ==========================================

let wrappedOverlay = null;

// Создание оболочки (overlay) для Wrapped
function createWrappedOverlay() {
  if (wrappedOverlay) return wrappedOverlay;

  wrappedOverlay = document.createElement('div');
  wrappedOverlay.id = 'ym-wrapped-overlay';
  wrappedOverlay.className = 'ym-wrapped-overlay-hidden';

  const style = document.createElement('style');
  style.textContent = `
    #ym-wrapped-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(10, 10, 14, 0.72);
      backdrop-filter: blur(25px) saturate(180%);
      -webkit-backdrop-filter: blur(25px) saturate(180%);
      z-index: 999999;
      display: flex;
      opacity: 1;
      visibility: visible;
      transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s linear 0s;
      color: var(--ym-popover-text, white);
      font-family: 'YS Text', sans-serif;
      transform: scale(1);
      pointer-events: auto;
      box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.5);
    }
    .ym-wrapped-overlay-hidden {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transform: scale(1.03) !important;
      transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s linear 0.2s;
    }
    .ym-wrapped-overlay-hidden * {
      opacity: 0 !important;
      transition: opacity 0.1s ease !important;
    }
    .ym-wrapped-overlay-visible {
      opacity: 1;
      visibility: visible !important;
    }
    
    /* Sidebar (Tabs) */
    .ym-wrapped-aside {
      width: 250px;
      padding: 40px 20px;
      display: flex;
      flex-direction: column;
      background: transparent;
    }
    .ym-wrapped-aside h2 {
      margin: 0 0 40px 10px;
      font-size: 24px;
      font-weight: bold;
      color: var(--ym-popover-text, white);
    }
    .ym-wrapped-tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--ym-popover-text-muted, rgba(255,255,255,0.55));
      padding: 14px 20px;
      text-align: left;
      font-size: 15px;
      font-weight: 500;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
      margin-bottom: 8px;
      font-family: inherit;
    }
    .ym-wrapped-tab-btn:hover {
      color: var(--ym-popover-text, white);
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.04);
    }
    .ym-wrapped-tab-btn.active {
      color: var(--ym-popover-active, #ffdb4d);
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-weight: bold;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    /* Content Area */
    .ym-wrapped-main {
      flex: 1;
      padding: 40px 50px;
      position: relative;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: rgba(0, 0, 0, 0.03);
    }
    
    .ym-wrapped-close {
      position: absolute;
      top: 30px;
      right: 40px;
      background: var(--ym-popover-item-bg, rgba(255,255,255,0.1));
      border: none;
      color: var(--ym-popover-close-btn, white);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.2s, color 0.2s;
      z-index: 10;
    }
    .ym-wrapped-close:hover {
      background: var(--ym-popover-item-hover-bg, rgba(255,255,255,0.2));
      color: var(--ym-popover-close-btn-hover, white);
      transform: scale(1.1);
    }
    
    .ym-wrapped-tab-content {
      display: none;
      height: 100%;
      width: 100%;
      flex-direction: column;
      box-sizing: border-box;
      min-height: 0;
      animation: fadeIn 0.4s ease;
      max-width: 1200px;
      margin: 0 auto;
    }
    .ym-wrapped-tab-content.active {
      display: flex;
    }

    .ym-wrapped-columns {
      display: flex;
      gap: 30px;
      flex: 1;
      min-height: 0;
      width: 100%;
    }

    .ym-glass-card {
      background: rgba(255, 255, 255, 0.03) !important;
      border: 1px solid rgba(255, 255, 255, 0.06) !important;
      border-radius: 16px !important;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25) !important;
      box-sizing: border-box !important;
    }

    .ym-wrapped-row {
      display: flex;
      gap: 20px;
      width: 100%;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 1100px) {
      #ym-wrapped-overlay {
        flex-direction: column !important;
      }
      .ym-wrapped-aside {
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 15px 20px !important;
        flex-direction: row !important;
        overflow-x: auto !important;
        border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        flex-shrink: 0 !important;
      }
      .ym-wrapped-aside h2 {
        display: none !important;
      }
      .ym-wrapped-tab-btn {
        margin-bottom: 0 !important;
        margin-right: 8px !important;
        white-space: nowrap !important;
        padding: 8px 16px !important;
        font-size: 14px !important;
      }
      .ym-wrapped-tab-btn[data-tab="stories"] {
        margin-top: 0 !important;
      }
      .ym-wrapped-main {
        padding: 20px !important;
        height: calc(100vh - 75px) !important;
        overflow-y: auto !important;
      }
      .ym-wrapped-tab-content {
        height: auto !important;
        min-height: auto !important;
        overflow-y: visible !important;
      }
      .ym-wrapped-main h2 {
        font-size: 24px !important;
        margin-bottom: 15px !important;
      }
      .ym-wrapped-columns {
        flex-direction: column !important;
        height: auto !important;
        min-height: auto !important;
        overflow-y: visible !important;
        gap: 20px !important;
        flex: none !important;
      }
      .ym-wrapped-columns > div {
        flex: none !important;
        width: 100% !important;
        height: auto !important;
        max-height: none !important;
      }
      .ym-wrapped-row {
        flex-direction: column !important;
        gap: 15px !important;
        flex: none !important;
      }
      .ym-wrapped-row > div {
        flex: none !important;
        width: 100% !important;
        height: auto !important;
      }
      canvas {
        max-height: 220px !important;
      }
    }
  `;

  document.head.appendChild(style);

  wrappedOverlay.innerHTML = `
    <button class="ym-wrapped-close" aria-label="Закрыть">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
    <div class="ym-wrapped-aside">
      <h2>Статистика</h2>
      <button class="ym-wrapped-tab-btn active" data-tab="overview">Обзор</button>
      <button class="ym-wrapped-tab-btn" data-tab="artists">Топ Артистов</button>
      <button class="ym-wrapped-tab-btn" data-tab="tracks">Топ Треков</button>
      <button class="ym-wrapped-tab-btn" data-tab="genres">Жанры и Эпохи</button>
      <button class="ym-wrapped-tab-btn" data-tab="calendar">Календарь</button>
      <button class="ym-wrapped-tab-btn" data-tab="activity">Активность</button>
      <button class="ym-wrapped-tab-btn" data-tab="settings">Данные и Настройки</button>
      <button class="ym-wrapped-tab-btn" data-tab="stories" style="background: linear-gradient(135deg, #cc00ff 0%, #ff8c00 100%); color: white; font-weight: bold; border: none; margin-top: auto; padding: 12px 20px; border-radius: 12px; cursor: pointer; text-align: center; text-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: all 0.2s ease;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: -2px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>Итоги в Историях
      </button>
    </div>
    
    <div class="ym-wrapped-main">
      <!-- Контейнер куда будут рендериться графики -->
      <div id="ym-wrapped-tab-overview" class="ym-wrapped-tab-content active"></div>
      <div id="ym-wrapped-tab-artists" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-tracks" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-genres" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-calendar" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-activity" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-settings" class="ym-wrapped-tab-content"></div>
    </div>
  `;

  document.body.appendChild(wrappedOverlay);

  // Обработка закрытия
  wrappedOverlay.querySelector('.ym-wrapped-close').addEventListener('click', (e) => {
    console.log('[Wrapped UI] Клик по кнопке закрытия X');
    e.stopPropagation();
    e.preventDefault();
    closeWrapped();
  });

  // Закрытие по нажатию клавиши Escape
  const handleEscapeKey = (e) => {
    if (e.key === 'Escape') {
      console.log('[Wrapped UI] Нажат Escape');
      if (typeof window.closeWrappedStories === 'function' && document.getElementById('ym-wrapped-stories')?.style.display === 'flex') {
        window.closeWrappedStories();
      } else if (wrappedOverlay.classList.contains('ym-wrapped-overlay-visible')) {
        closeWrapped();
      }
    }
  };
  document.removeEventListener('keydown', handleEscapeKey);
  document.addEventListener('keydown', handleEscapeKey);

  // Логика переключения вкладок
  const tabBtns = wrappedOverlay.querySelectorAll('.ym-wrapped-tab-btn');
  tabBtns.forEach(btn => {
    const tabId = btn.getAttribute('data-tab');
    if (tabId === 'stories') {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof window.openWrappedStories === 'function' && window.wrappedDB) {
          window.wrappedDB.getStats().then(stats => {
            window.openWrappedStories(stats);
          });
        }
      });
      return;
    }

    btn.addEventListener('click', () => {
      // Снимаем active со всех кнопок и контента
      tabBtns.forEach(b => b.classList.remove('active'));
      wrappedOverlay.querySelectorAll('.ym-wrapped-tab-content').forEach(c => c.classList.remove('active'));
      
      // Ставим active на нажатую
      btn.classList.add('active');
      const content = wrappedOverlay.querySelector('#ym-wrapped-tab-' + tabId);
      if (content) content.classList.add('active');
    });
  });

  return wrappedOverlay;
}

function openWrapped() {
  console.log('[Wrapped UI] Открытие главного меню статистики');
  const overlay = createWrappedOverlay();
  
  // Принудительно запрашиваем offsetWidth, чтобы браузер отрендерил элемент
  void overlay.offsetWidth;
  
  overlay.style.visibility = ''; // Гарантируем, что нет инлайнового hidden
  overlay.classList.remove('ym-wrapped-overlay-hidden');
  overlay.classList.add('ym-wrapped-overlay-visible');
  document.body.style.overflow = 'hidden';

  // Рендерим графики при открытии
  if (typeof window.renderWrappedCharts === 'function') {
    window.renderWrappedCharts();
  }
}

function closeWrapped() {
  console.log('[Wrapped UI] closeWrapped() запущен');
  if (!wrappedOverlay) {
    console.warn('[Wrapped UI] closeWrapped() - wrappedOverlay отсутствует');
    return;
  }
  wrappedOverlay.classList.remove('ym-wrapped-overlay-visible');
  wrappedOverlay.classList.add('ym-wrapped-overlay-hidden');
  wrappedOverlay.style.visibility = ''; // Сбрасываем инлайновый visibility, установленный Историями
  
  // Ждем окончания анимации (0.2s) перед тем как вернуть скролл
  setTimeout(() => {
    if (wrappedOverlay.classList.contains('ym-wrapped-overlay-hidden')) {
      console.log('[Wrapped UI] Сброс overflow body');
      document.body.style.overflow = '';
    }
  }, 200);
}

function injectWrappedButton() {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (!container) return;
  
  if (document.getElementById('ym-wrapped-btn')) return;

  const btn = document.createElement('li');
  btn.id = 'ym-wrapped-btn';
  btn.className = 'HcfYy4VfnRHqgXzIdL7w kRmUIkcHKD5AgtpPo8wT ym-navbar-item-injected';
  btn.setAttribute('title', 'Моя Статистика');
  
  const link = document.createElement('a');
  link.className = 'buOTZq_TKQOVyjMLrXvB ZfF8mQ3Iftpwu0aZgDtG yWJHrpNsBvchs9Jjyokk';
  link.style.cursor = 'pointer';
  
  const iconWrapper = document.createElement('div');
  iconWrapper.className = '_YzsXZGNK8KeaUFC4Ja1';
  iconWrapper.style.position = 'relative';
  
  // Иконка статистики (Chart)
  const svgDoc = new DOMParser().parseFromString(`
    <svg xmlns="http://www.w3.org/2000/svg" class="UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  `, 'image/svg+xml');
  iconWrapper.appendChild(svgDoc.documentElement);
  
  const textWrapper = document.createElement('div');
  textWrapper.className = 'nxMXCBiVfgH4oxds3f2y';
  const textSpan = document.createElement('span');
  textSpan.className = '_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA _3_Mxw7Si7j2g4kWjlpR';
  textSpan.style.webkitLineClamp = '1';
  textSpan.textContent = 'Wrapped';
  textSpan.setAttribute('title', 'Локальная статистика');
  
  textWrapper.appendChild(textSpan);
  link.appendChild(iconWrapper);
  link.appendChild(textWrapper);
  btn.appendChild(link);
  
  container.appendChild(btn);
  
  btn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    openWrapped();
  });
}

function initWrappedInjector() {
  // Пытаемся внедрить сразу
  injectWrappedButton();
  
  // И следим за изменениями DOM на случай SPA навигации
  const observer = new MutationObserver((mutations) => {
    if (!document.getElementById('ym-wrapped-btn')) {
      injectWrappedButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') {
  initWrappedInjector();
}
