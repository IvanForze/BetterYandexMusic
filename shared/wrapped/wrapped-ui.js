// ==========================================
// WRAPPED UI INJECTOR (Локальная статистика)
// ==========================================

let wrappedOverlay = null;

function createWrappedOverlay() {
  if (wrappedOverlay) return wrappedOverlay;

  wrappedOverlay = document.createElement('div');
  wrappedOverlay.id = 'ym-wrapped-overlay';
  wrappedOverlay.className = 'ym-wrapped-overlay-hidden';

  wrappedOverlay.innerHTML = `
    <div class="ym-wrapped-content">
      <button class="ym-wrapped-close" aria-label="Закрыть">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
      <div class="ym-wrapped-header">
        <h1>Твоя Статистика</h1>
        <p>Локальный Wrapped (Бета)</p>
      </div>
      <div class="ym-wrapped-body">
        <div style="text-align: center; color: rgba(255,255,255,0.5); margin-top: 50px;">
          Здесь скоро появятся красивые графики 🚀
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(wrappedOverlay);

  // Закрытие по клику на крестик
  wrappedOverlay.querySelector('.ym-wrapped-close').addEventListener('click', () => {
    closeWrapped();
  });

  // Закрытие по клику вне контента
  wrappedOverlay.addEventListener('click', (e) => {
    if (e.target === wrappedOverlay) {
      closeWrapped();
    }
  });

  return wrappedOverlay;
}

function openWrapped() {
  const overlay = createWrappedOverlay();
  overlay.classList.remove('ym-wrapped-overlay-hidden');
  overlay.classList.add('ym-wrapped-overlay-visible');
  document.body.style.overflow = 'hidden';
}

function closeWrapped() {
  if (!wrappedOverlay) return;
  wrappedOverlay.classList.remove('ym-wrapped-overlay-visible');
  wrappedOverlay.classList.add('ym-wrapped-overlay-hidden');
  document.body.style.overflow = '';
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
    
    // Синхронизация свернутого состояния (если есть функция из navbar-sync)
    if (typeof syncButtonCollapsedState === 'function') {
      syncButtonCollapsedState('ym-wrapped-btn');
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') {
  initWrappedInjector();
}
