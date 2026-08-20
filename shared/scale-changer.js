// ==========================================
// SCALE CHANGER (UI Zoom & Scaling Controller)
// ==========================================

(function() {
  const STYLE_ID = 'ym-scale-changer-style';
  const STORAGE_KEY = 'ym-interface-scale';
  const MIN_SCALE = 0.4;
  const MAX_SCALE = 2.0;
  const STEP = 0.05;

  let currentScale = 1.0;
  let toastTimeout = null;

  function loadSavedScale() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('scale-changer/savedScale');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= MIN_SCALE && parsed <= MAX_SCALE) {
          return Math.round(parsed * 100) / 100;
        }
      }
    } catch (e) {}
    return 1.0;
  }

  function applyScale(scale, showToast = false) {
    currentScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(scale * 100) / 100));
    try {
      localStorage.setItem(STORAGE_KEY, currentScale.toString());
      localStorage.setItem('scale-changer/savedScale', currentScale.toString());
    } catch (e) {}

    let styleEl = document.getElementById(STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      div[class*="DefaultLayout_root_"] {
        zoom: ${currentScale} !important;
      }
    `;

    // Оповещаем другие компоненты (например, слайдер в настройках)
    window.dispatchEvent(new CustomEvent('ym-scale-changed', { detail: { scale: currentScale } }));

    if (showToast) {
      showScaleToast(currentScale);
    }
  }

  function showScaleToast(scale) {
    let toast = document.getElementById('ym-scale-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ym-scale-toast';
      toast.style.cssText = `
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(-10px);
        background: rgba(20, 20, 26, 0.88);
        color: #fff;
        padding: 10px 20px;
        border-radius: 14px;
        font-family: Yandex Sans Text, system-ui, sans-serif;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.3px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 999999;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      `;
      document.body.appendChild(toast);
    }

    const percent = Math.round(scale * 100);
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fc0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="11" y1="8" x2="11" y2="14"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
      </svg>
      <span>Масштаб: <b style="color: #fc0;">${percent}%</b></span>
    `;

    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      if (toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-10px)';
      }
    }, 1200);
  }

  // Горячие клавиши (Ctrl/Cmd + Plus, Minus, 0 и Колесико мыши)
  window.addEventListener('keydown', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    
    // Пропускаем, если фокус в текстовом поле ввода
    const targetTag = e.target?.tagName?.toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea' || e.target?.isContentEditable) {
      if (e.key !== '+' && e.key !== '=' && e.key !== '-' && e.key !== '0') return;
    }

    if (e.key === '+' || e.key === '=' || e.key === 'Add' || e.code === 'NumpadAdd') {
      e.preventDefault();
      applyScale(currentScale + STEP, true);
    } else if (e.key === '-' || e.key === '_' || e.key === 'Subtract' || e.code === 'NumpadSubtract') {
      e.preventDefault();
      applyScale(currentScale - STEP, true);
    } else if (e.key === '0' || e.code === 'Numpad0') {
      e.preventDefault();
      applyScale(1.0, true);
    }
  }, { passive: false });

  // Масштабирование через Ctrl + Колесо мыши
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        applyScale(currentScale + STEP, true);
      } else if (e.deltaY > 0) {
        applyScale(currentScale - STEP, true);
      }
    }
  }, { passive: false });

  // Глобальный API
  window.ymScaleChanger = {
    getScale: () => currentScale,
    setScale: (val, showToast = false) => applyScale(val, showToast),
    reset: (showToast = true) => applyScale(1.0, showToast),
    increase: () => applyScale(currentScale + STEP, true),
    decrease: () => applyScale(currentScale - STEP, true)
  };

  // Мгновенная инициализация
  currentScale = loadSavedScale();
  applyScale(currentScale, false);
})();
