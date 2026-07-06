// --- sleep-timer.js ---
function injectSleepTimerButton() {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (!container) return;
  const existingBtn = document.getElementById('ym-sleep-timer-button');
  if (existingBtn) {
    if (container.contains(existingBtn)) {
      return;
    } else {
      existingBtn.remove();
    }
  }

  const btn = document.createElement('li');
  btn.id = 'ym-sleep-timer-button';
  btn.className = 'HcfYy4VfnRHqgXzIdL7w kRmUIkcHKD5AgtpPo8wT ym-navbar-item-injected';
  btn.setAttribute('title', 'Таймер сна');

  const link = document.createElement('a');
  link.className = 'buOTZq_TKQOVyjMLrXvB ZfF8mQ3Iftpwu0aZgDtG yWJHrpNsBvchs9Jjyokk';
  link.style.cursor = 'pointer';

  const iconWrapper = document.createElement('div');
  iconWrapper.className = '_YzsXZGNK8KeaUFC4Ja1';
  iconWrapper.style.position = 'relative';

  // Иконка таймера сна (луна / часы)
  const svgDoc = new DOMParser().parseFromString(`
    <svg xmlns="http://www.w3.org/2000/svg" class="UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  `, 'image/svg+xml');
  iconWrapper.appendChild(svgDoc.documentElement);

  const textWrapper = document.createElement('div');
  textWrapper.className = 'nxMXCBiVfgH4oxds3f2y';
  
  const textSpan = document.createElement('span');
  textSpan.id = 'ym-sleep-timer-nav-text';
  textSpan.className = '_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA _3_Mxw7Si7j2g4kWjlpR';
  textSpan.style.webkitLineClamp = '1';
  textSpan.textContent = 'Сон';
  textSpan.setAttribute('title', 'Таймер сна');
  
  textWrapper.appendChild(textSpan);
  link.appendChild(iconWrapper);
  link.appendChild(textWrapper);
  btn.appendChild(link);

  const syncBtn = document.getElementById('ym-sync-button');
  const themeBtn = document.getElementById('ym-theme-button');
  
  if (themeBtn && themeBtn.nextSibling) {
    container.insertBefore(btn, themeBtn.nextSibling);
  } else if (syncBtn && syncBtn.nextSibling) {
    container.insertBefore(btn, syncBtn.nextSibling);
  } else {
    container.appendChild(btn);
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    toggleSleepTimerPopover();
  });

  injectSleepTimerPopover();
}

function injectSleepTimerPopover() {
  if (document.getElementById('ym-sleep-timer-popover')) return;

  const popover = document.createElement('div');
  popover.id = 'ym-sleep-timer-popover';
  popover.className = 'ym-theme-popover'; // Переиспользуем стили поповера тем
  popover.style.display = 'none'; // Будем использовать свой toggle
  
  const header = document.createElement('div');
  header.className = 'ym-theme-popover-header';
  const title = document.createElement('h3');
  title.textContent = 'Таймер сна';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'ym-theme-close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => {
    popover.classList.remove('show');
    popover.style.display = 'none';
  });
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  popover.appendChild(header);

  const body = document.createElement('div');
  body.className = 'ym-theme-popover-body';
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '10px';
  body.style.padding = '12px';

  const statusLabel = document.createElement('div');
  statusLabel.id = 'ym-sleep-timer-status';
  statusLabel.style.fontSize = '14px';
  statusLabel.style.color = 'var(--ym-popover-text, #fff)';
  statusLabel.style.textAlign = 'center';
  statusLabel.style.marginBottom = '10px';
  statusLabel.style.fontWeight = 'bold';
  statusLabel.textContent = 'Таймер выключен';
  body.appendChild(statusLabel);

  const optionsContainer = document.createElement('div');
  optionsContainer.style.display = 'grid';
  optionsContainer.style.gridTemplateColumns = '1fr 1fr';
  optionsContainer.style.gap = '8px';

  const createPresetBtn = (minutes, label) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.padding = '8px';
    btn.style.background = 'var(--ym-popover-item-bg, rgba(255, 255, 255, 0.05))';
    btn.style.border = '1px solid var(--ym-popover-item-border, rgba(255, 255, 255, 0.1))';
    btn.style.color = 'var(--ym-popover-text, #fff)';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(255, 255, 255, 0.1)');
    btn.addEventListener('mouseleave', () => btn.style.background = 'var(--ym-popover-item-bg, rgba(255, 255, 255, 0.05))');
    btn.addEventListener('click', () => startSleepTimer(minutes));
    return btn;
  };

  optionsContainer.appendChild(createPresetBtn(15, '15 мин'));
  optionsContainer.appendChild(createPresetBtn(30, '30 мин'));
  optionsContainer.appendChild(createPresetBtn(45, '45 мин'));
  optionsContainer.appendChild(createPresetBtn(60, '1 час'));

  body.appendChild(optionsContainer);

  const customContainer = document.createElement('div');
  customContainer.style.display = 'flex';
  customContainer.style.gap = '8px';
  customContainer.style.marginTop = '8px';

  const customInput = document.createElement('input');
  customInput.type = 'number';
  customInput.min = '1';
  customInput.max = '720';
  customInput.placeholder = 'Минуты...';
  customInput.style.flex = '1';
  customInput.style.padding = '8px';
  customInput.style.background = 'rgba(0,0,0,0.2)';
  customInput.style.border = '1px solid rgba(255,255,255,0.1)';
  customInput.style.color = '#fff';
  customInput.style.borderRadius = '8px';

  const customBtn = document.createElement('button');
  customBtn.textContent = 'Ок';
  customBtn.style.padding = '8px 12px';
  customBtn.style.background = 'var(--ym-accent-color, #ffdb4d)';
  customBtn.style.color = '#000';
  customBtn.style.border = 'none';
  customBtn.style.borderRadius = '8px';
  customBtn.style.fontWeight = 'bold';
  customBtn.style.cursor = 'pointer';
  customBtn.addEventListener('click', () => {
    const val = parseInt(customInput.value);
    if (!isNaN(val) && val > 0) {
      startSleepTimer(val);
    }
  });

  customContainer.appendChild(customInput);
  customContainer.appendChild(customBtn);
  body.appendChild(customContainer);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Отключить таймер';
  cancelBtn.id = 'ym-sleep-timer-cancel';
  cancelBtn.style.marginTop = '12px';
  cancelBtn.style.padding = '10px';
  cancelBtn.style.background = 'rgba(255, 60, 60, 0.2)';
  cancelBtn.style.color = '#ff6b6b';
  cancelBtn.style.border = '1px solid rgba(255, 60, 60, 0.3)';
  cancelBtn.style.borderRadius = '8px';
  cancelBtn.style.cursor = 'pointer';
  cancelBtn.style.display = 'none';
  cancelBtn.addEventListener('click', stopSleepTimer);
  body.appendChild(cancelBtn);

  popover.appendChild(body);
  document.body.appendChild(popover);
}

function toggleSleepTimerPopover() {
  const popover = document.getElementById('ym-sleep-timer-popover');
  if (!popover) return;

  const isShowing = popover.classList.contains('show');
  if (isShowing) {
    popover.classList.remove('show');
    popover.style.display = 'none';
  } else {
    // Hide others
    const themePopover = document.getElementById('ym-theme-popover');
    if (themePopover) themePopover.classList.remove('show');
    const syncPopover = document.getElementById('ym-sync-popover');
    if (syncPopover) syncPopover.classList.remove('show');

    positionSleepTimerPopover();
    popover.classList.add('show');
    popover.style.display = 'block';
    updateSleepTimerUI();
  }
}

function positionSleepTimerPopover() {
  const btn = document.getElementById('ym-sleep-timer-button');
  const popover = document.getElementById('ym-sleep-timer-popover');
  if (!btn || !popover) return;
  const rect = btn.getBoundingClientRect();
  const popoverWidth = 280;
  const popoverHeight = 320;
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

// Global state
let ymSleepTimerInterval = null;
let ymSleepTimerOriginalVolume = null;

function startSleepTimer(minutes) {
  const endTime = Date.now() + minutes * 60 * 1000;
  localStorage.setItem('ymSleepTimerEnd', endTime.toString());
  updateSleepTimerUI();
  initSleepTimerLoop();
}

function stopSleepTimer() {
  localStorage.removeItem('ymSleepTimerEnd');
  if (ymSleepTimerInterval) {
    clearInterval(ymSleepTimerInterval);
    ymSleepTimerInterval = null;
  }
  updateSleepTimerUI();
}

function updateSleepTimerUI() {
  const statusLabel = document.getElementById('ym-sleep-timer-status');
  const cancelBtn = document.getElementById('ym-sleep-timer-cancel');
  const navText = document.getElementById('ym-sleep-timer-nav-text');

  const endTimeStr = localStorage.getItem('ymSleepTimerEnd');
  if (endTimeStr) {
    const remaining = parseInt(endTimeStr) - Date.now();
    if (remaining > 0) {
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      
      if (statusLabel) statusLabel.textContent = `Осталось: ${minutes}м ${seconds}с`;
      if (cancelBtn) cancelBtn.style.display = 'block';
      if (navText) {
        const formattedMins = minutes.toString().padStart(2, '0');
        const formattedSecs = seconds.toString().padStart(2, '0');
        navText.textContent = `${formattedMins}:${formattedSecs}`;
      }
      return;
    }
  }
  
  if (statusLabel) statusLabel.textContent = 'Таймер выключен';
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (navText) navText.textContent = 'Сон';
}

function initSleepTimerLoop() {
  if (ymSleepTimerInterval) clearInterval(ymSleepTimerInterval);
  
  ymSleepTimerInterval = setInterval(() => {
    updateSleepTimerUI();
    const endTimeStr = localStorage.getItem('ymSleepTimerEnd');
    if (!endTimeStr) {
      clearInterval(ymSleepTimerInterval);
      ymSleepTimerInterval = null;
      return;
    }
    
    const remaining = parseInt(endTimeStr) - Date.now();
    
    if (remaining <= 10000 && remaining > 0) {
      const progress = remaining / 10000; // от 1 до 0
      
      // Инициализируем громкость локально для Electron
      if (ymSleepTimerOriginalVolume === null) {
        ymSleepTimerOriginalVolume = typeof window.getNativeVolume === 'function' ? window.getNativeVolume() : 0.5;
      }
      
      const newVol = ymSleepTimerOriginalVolume * progress;
      if (typeof window.setNativeVolume === 'function') {
        window.setNativeVolume(newVol);
      }
      if (window.CustomAudioController && typeof window.CustomAudioController.setVolume === 'function') {
        window.CustomAudioController.setVolume(newVol);
      }
      
      // Send to main context for extension
      window.postMessage({
        type: 'FROM_ISOLATED',
        action: 'SLEEP_TIMER_ACTION',
        command: 'FADE_VOLUME',
        progress: progress
      }, '*');
    } 
    // Конец таймера
    else if (remaining <= 0) {
      stopSleepTimer();
      
      // Ставим на паузу локально (для Electron)
      let paused = false;
      const activePlayer = window.getActivePlayer ? window.getActivePlayer() : null;
      
      if (activePlayer && typeof activePlayer.pause === 'function') {
        activePlayer.pause();
        paused = true;
      } else if (window.getSonataCore) {
        const core = window.getSonataCore();
        if (core?.playbackController && typeof core.playbackController.pause === 'function') {
          core.playbackController.pause();
          paused = true;
        }
      }
      
      if (!paused && window.externalAPI && typeof window.externalAPI.pause === 'function') {
        window.externalAPI.pause();
        paused = true;
      }
      
      if (!paused) {
        const pauseBtn = document.querySelector('[class*="BaseSonataControlsDesktop_playButton"], [aria-label="Пауза"], [aria-label="Pause"]');
        if (pauseBtn && (pauseBtn.getAttribute('aria-label') === 'Пауза' || pauseBtn.getAttribute('aria-label') === 'Pause' || pauseBtn.innerHTML.includes('pause'))) {
          pauseBtn.click();
        }
      }
      
      if (window.CustomAudioController && typeof window.CustomAudioController.stop === 'function') {
        window.CustomAudioController.stop();
      }
      
      // Send pause to main context (для Расширения)
      window.postMessage({
        type: 'FROM_ISOLATED',
        action: 'SLEEP_TIMER_ACTION',
        command: 'PAUSE'
      }, '*');
      
      // Отключаемся от комнаты синхронизации, чтобы нас не разбудили
      const disconnectBtn = document.getElementById('ym-disconnectBtn');
      if (disconnectBtn && disconnectBtn.style.display !== 'none') {
        disconnectBtn.click();
      }
      
      // Возвращаем исходную громкость
      setTimeout(() => {
        if (ymSleepTimerOriginalVolume !== null) {
          if (typeof window.setNativeVolume === 'function') window.setNativeVolume(ymSleepTimerOriginalVolume);
          if (window.CustomAudioController && typeof window.CustomAudioController.setVolume === 'function') {
            window.CustomAudioController.setVolume(ymSleepTimerOriginalVolume);
          }
          ymSleepTimerOriginalVolume = null;
        }
        
        window.postMessage({
          type: 'FROM_ISOLATED',
          action: 'SLEEP_TIMER_ACTION',
          command: 'RESTORE_VOLUME'
        }, '*');
      }, 500); // Небольшая задержка, чтобы пауза успела сработать
    }
  }, 1000);
}

// Инициализация при загрузке страницы, если таймер уже был установлен
setTimeout(() => {
  if (localStorage.getItem('ymSleepTimerEnd')) {
    initSleepTimerLoop();
  }
}, 2000);
