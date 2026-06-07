// Дополнительные функции для тем оформления
function injectThemeButton() {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (!container) return;
  const existingBtn = document.getElementById('ym-theme-button');
  if (existingBtn) {
    if (container.contains(existingBtn)) {
      return;
    } else {
      existingBtn.remove();
    }
  }
  injectStyles();
  const btn = document.createElement('li');
  btn.id = 'ym-theme-button';
  btn.className = 'HcfYy4VfnRHqgXzIdL7w kRmUIkcHKD5AgtpPo8wT ym-navbar-item-injected';
  btn.setAttribute('title', 'Темы оформления');
  const link = document.createElement('a');
  link.className = 'buOTZq_TKQOVyjMLrXvB ZfF8mQ3Iftpwu0aZgDtG yWJHrpNsBvchs9Jjyokk';
  link.style.cursor = 'pointer';
  const iconWrapper = document.createElement('div');
  iconWrapper.className = '_YzsXZGNK8KeaUFC4Ja1';
  iconWrapper.style.position = 'relative';
  const svgDoc = new DOMParser().parseFromString(`
    <svg xmlns="http://www.w3.org/2000/svg" class="UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.35249 19.5 5.21553 20.3546 4.73752 20.803C4.26943 21.2421 3.59374 21.464 3.01828 21.2801C2.5188 21.1205 2.08722 20.8122 1.83401 20.3551"/>
      <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor"/>
      <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor"/>
      <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor"/>
      <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor"/>
    </svg>
  `, 'image/svg+xml');
  iconWrapper.appendChild(svgDoc.documentElement);
  const textWrapper = document.createElement('div');
  textWrapper.className = 'nxMXCBiVfgH4oxds3f2y';
  const textSpan = document.createElement('span');
  textSpan.className = '_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA _3_Mxw7Si7j2g4kWjlpR';
  textSpan.style.webkitLineClamp = '1';
  textSpan.textContent = 'Темы';
  textSpan.setAttribute('title', 'Темы оформления');
  textWrapper.appendChild(textSpan);
  link.appendChild(iconWrapper);
  link.appendChild(textWrapper);
  btn.appendChild(link);
  const syncBtn = document.getElementById('ym-sync-button');
  if (syncBtn && syncBtn.nextSibling) {
    container.insertBefore(btn, syncBtn.nextSibling);
  } else {
    container.appendChild(btn);
  }
  btn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    toggleThemePopover();
  });
  injectThemePopover();
}

function injectThemePopover() {
  if (document.getElementById('ym-theme-popover')) return;
  const popover = document.createElement('div');
  popover.id = 'ym-theme-popover';
  popover.className = 'ym-theme-popover';
  const header = document.createElement('div');
  header.className = 'ym-theme-popover-header';
  const title = document.createElement('h3');
  title.textContent = 'Темы оформления';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'ym-theme-close-btn';
  closeBtn.id = 'ym-theme-close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => {
    popover.classList.remove('show');
  });
  header.appendChild(title);
  header.appendChild(closeBtn);
  popover.appendChild(header);
  const body = document.createElement('div');
  body.className = 'ym-theme-popover-body';
  const themeList = document.createElement('div');
  themeList.className = 'ym-theme-list';
  const themes = [{
    id: 'default',
    name: 'Стандартная (Тёмная)'
  }, {
    id: 'oled',
    name: 'OLED Black (Глубокий чёрный)'
  }, {
    id: 'cyberpunk',
    name: 'Neon Cyber (Киберпанк)'
  }, {
    id: 'nord',
    name: 'Nord Frost (Арктический синий)'
  }, {
    id: 'sakura',
    name: 'Sakura Pastel (Пастельный розовый)'
  }, {
    id: 'custom',
    name: 'Своя тема'
  }];
  const customSettings = document.createElement('div');
  customSettings.id = 'ym-custom-theme-settings';
  customSettings.style.display = 'none';
  customSettings.style.flexDirection = 'column';
  customSettings.style.gap = '6px';
  customSettings.style.marginTop = '8px';
  customSettings.style.padding = '8px 8px 8px 8px';
  customSettings.style.borderTop = '1px solid rgba(255, 255, 255, 0.08)';
  const fields = [{
    id: 'ym-custom-bg-color',
    label: 'Цвет фона',
    key: 'bg',
    defaultVal: '#000000'
  }, {
    id: 'ym-custom-accent-color',
    label: 'Цвет акцента',
    key: 'accent',
    defaultVal: '#ffdb4d'
  }, {
    id: 'ym-custom-text-color',
    label: 'Цвет текста',
    key: 'text',
    defaultVal: '#ffffff'
  }];
  const colorInputs = {};
  fields.forEach(field => {
    const group = document.createElement('div');
    group.style.display = 'flex';
    group.style.flexDirection = 'row';
    group.style.justifyContent = 'space-between';
    group.style.alignItems = 'center';
    group.style.padding = '10px 14px';
    group.style.background = 'var(--ym-popover-item-bg)';
    group.style.border = '1px solid var(--ym-popover-item-border)';
    group.style.borderRadius = '12px';
    
    const lbl = document.createElement('label');
    lbl.setAttribute('for', field.id);
    lbl.textContent = field.label;
    lbl.style.fontSize = '13px';
    lbl.style.color = 'var(--ym-popover-text)';
    lbl.style.fontFamily = 'inherit';
    
    const input = document.createElement('input');
    input.setAttribute('type', 'color');
    input.id = field.id;
    input.style.width = '40px';
    input.style.height = '24px';
    input.style.padding = '0';
    input.style.border = 'none';
    input.style.background = 'none';
    input.style.cursor = 'pointer';
    input.value = field.defaultVal;
    
    group.appendChild(lbl);
    group.appendChild(input);
    customSettings.appendChild(group);
    colorInputs[field.key] = input;

    // Реакция на изменение цвета
    input.addEventListener('input', () => {
      const colors = {
        bg: colorInputs.bg.value,
        accent: colorInputs.accent.value,
        text: colorInputs.text.value
      };
      localStorage.setItem('ymCustomThemeColors', JSON.stringify(colors));
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ ymCustomThemeColors: JSON.stringify(colors) });
      }
      applyThemeCSS('custom', colors);
    });
  });
  themes.forEach(theme => {
    const opt = document.createElement('div');
    opt.className = 'ym-theme-option';
    opt.dataset.themeId = theme.id;
    const preview = document.createElement('span');
    preview.className = `ym-theme-preview ym-theme-preview-${theme.id}`;
    opt.appendChild(preview);
    const label = document.createElement('span');
    label.className = 'ym-theme-label';
    label.textContent = theme.name;
    opt.appendChild(label);
    opt.addEventListener('click', () => {
      localStorage.setItem('ymActiveTheme', theme.id);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ ymActiveTheme: theme.id });
      }
      if (theme.id === 'custom') {
        const colors = {
          bg: colorInputs.bg.value,
          accent: colorInputs.accent.value,
          text: colorInputs.text.value
        };
        const storedColors = localStorage.getItem('ymCustomThemeColors');
        let currentColors = colors;
        try {
          if (storedColors) currentColors = JSON.parse(storedColors);
        } catch (e) {}
        applyThemeCSS('custom', currentColors);
        updateThemePopoverUI('custom');
      } else {
        applyThemeCSS(theme.id);
        updateThemePopoverUI(theme.id);
      }
    });
    themeList.appendChild(opt);
  });
  body.appendChild(themeList);
  body.appendChild(customSettings);
  popover.appendChild(body);
  document.body.appendChild(popover);

  // Инициализация значений при создании
  const activeTheme = localStorage.getItem('ymActiveTheme') || 'default';
  updateThemePopoverUI(activeTheme);
  const storedColors = localStorage.getItem('ymCustomThemeColors');
  if (storedColors) {
    try {
      const parsed = JSON.parse(storedColors);
      if (parsed) {
        if (isValidHexColor(parsed.bg)) colorInputs.bg.value = parsed.bg;
        if (isValidHexColor(parsed.accent)) colorInputs.accent.value = parsed.accent;
        if (isValidHexColor(parsed.text)) colorInputs.text.value = parsed.text;
      }
    } catch (e) {}
  }
}

function toggleThemePopover() {
  const popover = document.getElementById('ym-theme-popover');
  if (!popover) return;
  const isShowing = popover.classList.contains('show');
  if (isShowing) {
    popover.classList.remove('show');
  } else {
    const syncPopover = document.getElementById('ym-sync-popover');
    if (syncPopover) syncPopover.classList.remove('show');
    const activeTheme = localStorage.getItem('ymActiveTheme') || 'default';
    updateThemePopoverUI(activeTheme);
    positionThemePopover();
    popover.classList.add('show');
  }
}

function positionThemePopover() {
  const btn = document.getElementById('ym-theme-button');
  const popover = document.getElementById('ym-theme-popover');
  if (!btn || !popover) return;
  const rect = btn.getBoundingClientRect();
  const popoverWidth = popover.offsetWidth || 280;
  const popoverHeight = popover.offsetHeight || 230;
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

function updateThemePopoverUI(themeName) {
  const popover = document.getElementById('ym-theme-popover');
  if (!popover) return;
  const options = popover.querySelectorAll('.ym-theme-option');
  options.forEach(opt => {
    if (opt.dataset.themeId === themeName) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });
  const customPanel = document.getElementById('ym-custom-theme-settings');
  if (customPanel) {
    if (themeName === 'custom') {
      customPanel.style.display = 'flex';
    } else {
      customPanel.style.display = 'none';
    }
  }
}