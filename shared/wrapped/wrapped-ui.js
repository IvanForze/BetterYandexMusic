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
      background: var(--ym-popover-bg, linear-gradient(135deg, rgba(20,20,25,0.98) 0%, rgba(10,10,15,0.99) 100%));
      z-index: 999999;
      display: flex;
      opacity: 1;
      transition: opacity 0.2s ease, transform 0.2s ease;
      color: var(--ym-popover-text, white);
      font-family: 'YS Text', sans-serif;
      transform: scale(1);
      pointer-events: auto;
    }
    .ym-wrapped-overlay-hidden {
      opacity: 0;
      pointer-events: none !important;
      transform: scale(1.03) !important;
    }
    .ym-wrapped-overlay-visible {
      opacity: 1;
    }
    
    /* Sidebar (Tabs) */
    .ym-wrapped-sidebar {
      width: 250px;
      padding: 40px 20px;
      display: flex;
      flex-direction: column;
    }
    .ym-wrapped-sidebar h2 {
      margin: 0 0 40px 10px;
      font-size: 24px;
      font-weight: bold;
      color: var(--ym-popover-text, white);
    }
    .ym-wrapped-tab-btn {
      background: transparent;
      border: none;
      color: var(--ym-popover-text-muted, rgba(255,255,255,0.6));
      padding: 15px 20px;
      text-align: left;
      font-size: 16px;
      font-weight: 500;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 10px;
      font-family: inherit;
    }
    .ym-wrapped-tab-btn:hover {
      color: var(--ym-popover-text, white);
      background: var(--ym-popover-item-hover-bg, rgba(255,255,255,0.05));
    }
    .ym-wrapped-tab-btn.active {
      color: var(--ym-popover-active, #ffdb4d);
      background: var(--ym-popover-item-bg, rgba(255, 219, 77, 0.15));
      font-weight: bold;
    }

    /* Content Area */
    .ym-wrapped-main {
      flex: 1;
      padding: 50px;
      overflow-y: auto;
      position: relative;
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
      animation: fadeIn 0.4s ease;
      max-width: 1200px;
      margin: 0 auto;
    }
    .ym-wrapped-tab-content.active {
      display: block;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  document.head.appendChild(style);

  wrappedOverlay.innerHTML = `
    <button class="ym-wrapped-close" aria-label="Закрыть">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
    <div class="ym-wrapped-sidebar">
      <h2>Статистика</h2>
      <button class="ym-wrapped-tab-btn active" data-tab="overview">Обзор</button>
      <button class="ym-wrapped-tab-btn" data-tab="artists">Топ Артистов</button>
      <button class="ym-wrapped-tab-btn" data-tab="tracks">Топ Треков</button>
      <button class="ym-wrapped-tab-btn" data-tab="genres">Жанры и Эпохи</button>
      <button class="ym-wrapped-tab-btn" data-tab="activity">Активность</button>
      <button class="ym-wrapped-tab-btn" data-tab="settings">Данные и Настройки</button>
    </div>
    
    <div class="ym-wrapped-main">
      <!-- Контейнер куда будут рендериться графики -->
      <div id="ym-wrapped-tab-overview" class="ym-wrapped-tab-content active"></div>
      <div id="ym-wrapped-tab-artists" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-tracks" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-genres" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-activity" class="ym-wrapped-tab-content"></div>
      <div id="ym-wrapped-tab-settings" class="ym-wrapped-tab-content"></div>
    </div>
  `;

  document.body.appendChild(wrappedOverlay);

  // Обработка закрытия
  wrappedOverlay.querySelector('.ym-wrapped-close').addEventListener('click', () => {
    closeWrapped();
  });

  // Логика переключения вкладок
  const tabBtns = wrappedOverlay.querySelectorAll('.ym-wrapped-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Снимаем active со всех кнопок и контента
      tabBtns.forEach(b => b.classList.remove('active'));
      wrappedOverlay.querySelectorAll('.ym-wrapped-tab-content').forEach(c => c.classList.remove('active'));
      
      // Ставим active на нажатую
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const content = wrappedOverlay.querySelector('#ym-wrapped-tab-' + tabId);
      if (content) content.classList.add('active');
    });
  });

  return wrappedOverlay;
}

function openWrapped() {
  const overlay = createWrappedOverlay();
  
  // Принудительно запрашиваем offsetWidth, чтобы браузер отрендерил элемент
  void overlay.offsetWidth;
  
  overlay.classList.remove('ym-wrapped-overlay-hidden');
  overlay.classList.add('ym-wrapped-overlay-visible');
  document.body.style.overflow = 'hidden';

  // Рендерим графики при открытии
  if (typeof window.renderWrappedCharts === 'function') {
    window.renderWrappedCharts();
  }
}

function closeWrapped() {
  if (!wrappedOverlay) return;
  wrappedOverlay.classList.remove('ym-wrapped-overlay-visible');
  wrappedOverlay.classList.add('ym-wrapped-overlay-hidden');
  
  // Ждем окончания анимации (0.2s) перед тем как вернуть скролл
  setTimeout(() => {
    if (wrappedOverlay.classList.contains('ym-wrapped-overlay-hidden')) {
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
