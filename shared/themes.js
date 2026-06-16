const THEME_CSS = {
  default: "",
  oled: `
    html, body, .ym-dark-theme, .ym-light-theme, [class*="CommonLayout_root"] {
      --color-bg-primary: #000000 !important;
      --color-bg-secondary: #0a0a0a !important;
      --color-bg-tertiary: #111111 !important;
      --yp-color-bg-primary: #000000 !important;
      --yp-color-bg-secondary: #0a0a0a !important;
      --yp-color-bg-tertiary: #111111 !important;
      --background-primary: #000000 !important;
      --background-secondary: #0a0a0a !important;
      --color-border-primary: #151515 !important;
      --yp-color-border-primary: #151515 !important;
      --color-text-primary: #ffffff !important;
      --yp-color-text-primary: #ffffff !important;
      --yp-color-text-secondary: rgba(255, 255, 255, 0.65) !important;
      --yp-color-text-tertiary: rgba(255, 255, 255, 0.4) !important;
      --player-average-color-background: #000000 !important;
      --ym-background-color-primary-enabled-basic: #000000 !important;
      --ym-background-color-primary-enabled-content: #000000 !important;
      --ym-background-color-primary-enabled-player: #000000 !important;
      --ym-background-color-primary-enabled-popover: #0a0a0a !important;
    }
    body, html, #root, #__next, 
    .deco-pane, .deco-pane-left, .deco-player-bg,
    [class*="page-root"], [class*="sidebar"], [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      background-color: #000000 !important;
      background: #000000 !important;
    }
    [class*="NavbarDesktop_navigationGroup"] {
      background-color: #000000 !important;
    }
    [class*="SidebarDesktop"] {
      background-color: #000000 !important;
    }
    [class*="FullscreenPlayerDesktop_root"],
    [class*="FullscreenPlayerDesktop_modalContent"],
    [class*="FullscreenPlayerDesktopContent_root"],
    [class*="FullscreenPlayerDesktopContent_fullscreenContent"],
    [class*="FullscreenPlayerDesktopContent_additionalContent"] {
      background-color: #000000 !important;
      background: #000000 !important;
    }
    [class*="CommonLayout_root"], [class*="DefaultLayout_root"],
    [class*="Content_root"], [class*="Content_main"], [class*="VibePage_root"] {
      --vibe-gradient-stop-0: #000000 !important;
      --vibe-gradient-stop-1: #000000 !important;
      --vibe-gradient-stop-2: #000000 !important;
      --vibe-gradient-stop-3: #000000 !important;
      --vibe-gradient-stop-4: #000000 !important;
      --vibe-gradient-stop-5: #000000 !important;
      --vibe-gradient-stop-6: #000000 !important;
      --vibe-gradient-stop-7: #000000 !important;
      --vibe-gradient-stop-8: #000000 !important;
      --vibe-gradient-stop-9: #000000 !important;
      --vibe-gradient-stop-10: #000000 !important;
      --vibe-gradient-stop-11: #000000 !important;
      --vibe-gradient-stop-12: #000000 !important;
      --vibe-gradient-stop-13: #000000 !important;
      --vibe-gradient-stop-14: #000000 !important;
      --vibe-gradient-stop-15: #000000 !important;
      background-color: #000000 !important;
      background: #000000 !important;
    }
    [class*="NavbarDesktop_logo__"] div:first-child svg {
      color: #ffffff !important;
      fill: #ffffff !important;
      --ym-logo-text-color: #ffffff !important;
      --ym-logo-color-primary-text: #ffffff !important;
      --ym-logo-color-primary-enabled: #ffffff !important;
    }
  `,
  cyberpunk: `
    html, body, .ym-dark-theme, .ym-light-theme, [class*="CommonLayout_root"] {
      --color-bg-primary: #0f081d !important;
      --color-bg-secondary: #180d2b !important;
      --color-bg-tertiary: #24143f !important;
      --yp-color-bg-primary: #0f081d !important;
      --yp-color-bg-secondary: #180d2b !important;
      --yp-color-bg-tertiary: #24143f !important;
      --yp-color-brand: #ff007f !important;
      --yp-color-brand-hover: #ff3399 !important;
      --color-text-primary: #00ffff !important;
      --yp-color-text-primary: #00ffff !important;
      --yp-color-text-secondary: #ff007f !important;
      --yp-color-text-tertiary: rgba(0, 255, 255, 0.5) !important;
      --yp-color-border-primary: #ff007f33 !important;
      --player-average-color-background: #0f081d !important;
      --ym-background-color-primary-enabled-basic: #0f081d !important;
      --ym-background-color-primary-enabled-content: #0f081d !important;
      --ym-background-color-primary-enabled-player: #0f081d !important;
      --ym-background-color-primary-enabled-popover: #180d2b !important;
      --ym-slider-color-primary-enabled: #ff007f !important;
      --ym-slider-color-primary-hovered: #ff3399 !important;
      --ym-slider-color-primary-pressed: #ff66b2 !important;
      --ym-controls-color-primary-default-enabled: #ff007f !important;
      --ym-controls-color-primary-default-hovered: #ff3399 !important;
      --ym-controls-color-primary-default-pressed: #ff66b2 !important;
    }
    body, html, #root, #__next,
    .deco-pane, .deco-pane-left, .deco-player-bg,
    [class*="page-root"], [class*="sidebar"], [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      background-color: #0f081d !important;
      color: #00ffff !important;
    }
    span, a, p, h1, h2, h3 {
      color: #00ffff !important;
    }
    svg, [class*="UwnL5AJBMMAp6NwMDdZk"], ._YzsXZGNK8KeaUFC4Ja1 svg {
      color: #ff007f !important;
    }
    [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      border-color: rgba(255, 0, 127, 0.4) !important;
      box-shadow: 0 0 15px rgba(255, 0, 127, 0.2) !important;
    }
    .ym-sync-popover, .ym-theme-popover {
      border-color: #ff007f !important;
      box-shadow: 0 0 20px rgba(255, 0, 127, 0.3) !important;
    }
    [class*="FullscreenPlayerDesktop_root"],
    [class*="FullscreenPlayerDesktop_modalContent"],
    [class*="FullscreenPlayerDesktopContent_root"],
    [class*="FullscreenPlayerDesktopContent_fullscreenContent"],
    [class*="FullscreenPlayerDesktopContent_additionalContent"] {
      background-color: #0f081d !important;
      background: #0f081d !important;
    }
    [class*="CommonLayout_root"], [class*="DefaultLayout_root"],
    [class*="Content_root"], [class*="Content_main"], [class*="VibePage_root"] {
      --vibe-gradient-stop-0: #0f081d !important;
      --vibe-gradient-stop-1: #0f081d !important;
      --vibe-gradient-stop-2: #0f081d !important;
      --vibe-gradient-stop-3: #0f081d !important;
      --vibe-gradient-stop-4: #0f081d !important;
      --vibe-gradient-stop-5: #0f081d !important;
      --vibe-gradient-stop-6: #0f081d !important;
      --vibe-gradient-stop-7: #0f081d !important;
      --vibe-gradient-stop-8: #0f081d !important;
      --vibe-gradient-stop-9: #0f081d !important;
      --vibe-gradient-stop-10: #0f081d !important;
      --vibe-gradient-stop-11: #0f081d !important;
      --vibe-gradient-stop-12: #0f081d !important;
      --vibe-gradient-stop-13: #0f081d !important;
      --vibe-gradient-stop-14: #0f081d !important;
      --vibe-gradient-stop-15: #0f081d !important;
      background-color: #0f081d !important;
      background: #0f081d !important;
    }
    [class*="NavbarDesktop_logo__"] div:first-child svg {
      color: #00ffff !important;
      fill: #00ffff !important;
      --ym-logo-text-color: #00ffff !important;
      --ym-logo-color-primary-text: #00ffff !important;
      --ym-logo-color-primary-enabled: #00ffff !important;
    }
  `,
  nord: `
    html, body, .ym-dark-theme, .ym-light-theme, [class*="CommonLayout_root"] {
      --color-bg-primary: #2e3440 !important;
      --color-bg-secondary: #3b4252 !important;
      --color-bg-tertiary: #434c5e !important;
      --yp-color-bg-primary: #2e3440 !important;
      --yp-color-bg-secondary: #3b4252 !important;
      --yp-color-bg-tertiary: #434c5e !important;
      --yp-color-brand: #88c0d0 !important;
      --yp-color-brand-hover: #8fbcbb !important;
      --color-text-primary: #d8dee9 !important;
      --yp-color-text-primary: #d8dee9 !important;
      --yp-color-text-secondary: #e5e9f0 !important;
      --yp-color-text-tertiary: #4c566a !important;
      --yp-color-border-primary: #4c566a !important;
      --player-average-color-background: #2e3440 !important;
      --ym-background-color-primary-enabled-basic: #2e3440 !important;
      --ym-background-color-primary-enabled-content: #2e3440 !important;
      --ym-background-color-primary-enabled-player: #2e3440 !important;
      --ym-background-color-primary-enabled-popover: #3b4252 !important;
      --ym-slider-color-primary-enabled: #88c0d0 !important;
      --ym-slider-color-primary-hovered: #8fbcbb !important;
      --ym-slider-color-primary-pressed: #81a1c1 !important;
      --ym-controls-color-primary-default-enabled: #88c0d0 !important;
      --ym-controls-color-primary-default-hovered: #8fbcbb !important;
      --ym-controls-color-primary-default-pressed: #81a1c1 !important;
    }
    body, html, #root, #__next,
    .deco-pane, .deco-pane-left, .deco-player-bg,
    [class*="page-root"], [class*="sidebar"], [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      background-color: #2e3440 !important;
      color: #d8dee9 !important;
    }
    span, a, p, h1, h2, h3 {
      color: #d8dee9 !important;
    }
    svg, [class*="UwnL5AJBMMAp6NwMDdZk"], ._YzsXZGNK8KeaUFC4Ja1 svg {
      color: #88c0d0 !important;
    }
    [class*="FullscreenPlayerDesktop_root"],
    [class*="FullscreenPlayerDesktop_modalContent"],
    [class*="FullscreenPlayerDesktopContent_root"],
    [class*="FullscreenPlayerDesktopContent_fullscreenContent"],
    [class*="FullscreenPlayerDesktopContent_additionalContent"] {
      background-color: #2e3440 !important;
      background: #2e3440 !important;
    }
    [class*="CommonLayout_root"], [class*="DefaultLayout_root"],
    [class*="Content_root"], [class*="Content_main"], [class*="VibePage_root"] {
      --vibe-gradient-stop-0: #2e3440 !important;
      --vibe-gradient-stop-1: #2e3440 !important;
      --vibe-gradient-stop-2: #2e3440 !important;
      --vibe-gradient-stop-3: #2e3440 !important;
      --vibe-gradient-stop-4: #2e3440 !important;
      --vibe-gradient-stop-5: #2e3440 !important;
      --vibe-gradient-stop-6: #2e3440 !important;
      --vibe-gradient-stop-7: #2e3440 !important;
      --vibe-gradient-stop-8: #2e3440 !important;
      --vibe-gradient-stop-9: #2e3440 !important;
      --vibe-gradient-stop-10: #2e3440 !important;
      --vibe-gradient-stop-11: #2e3440 !important;
      --vibe-gradient-stop-12: #2e3440 !important;
      --vibe-gradient-stop-13: #2e3440 !important;
      --vibe-gradient-stop-14: #2e3440 !important;
      --vibe-gradient-stop-15: #2e3440 !important;
      background-color: #2e3440 !important;
      background: #2e3440 !important;
    }
    [class*="NavbarDesktop_logo__"] div:first-child svg {
      color: #d8dee9 !important;
      fill: #d8dee9 !important;
      --ym-logo-text-color: #d8dee9 !important;
      --ym-logo-color-primary-text: #d8dee9 !important;
      --ym-logo-color-primary-enabled: #d8dee9 !important;
    }
  `,
  sakura: `
    html, body, .ym-dark-theme, .ym-light-theme, [class*="CommonLayout_root"] {
      --color-bg-primary: #fff0f5 !important;
      --color-bg-secondary: #ffe4e1 !important;
      --color-bg-tertiary: #ffdbdb !important;
      --yp-color-bg-primary: #fff0f5 !important;
      --yp-color-bg-secondary: #ffe4e1 !important;
      --yp-color-bg-tertiary: #ffdbdb !important;
      --yp-color-brand: #ff69b4 !important;
      --yp-color-brand-hover: #ff1493 !important;
      --yp-color-text-primary: #4a3b3c !important;
      --yp-color-text-secondary: #6e5c5d !important;
      --yp-color-border-primary: #ffd1d1 !important;
      --player-average-color-background: #fff0f5 !important;
      --ym-background-color-primary-enabled-basic: #fff0f5 !important;
      --ym-background-color-primary-enabled-content: #fff0f5 !important;
      --ym-background-color-primary-enabled-player: #fff0f5 !important;
      --ym-background-color-primary-enabled-popover: #ffe4e1 !important;
      --ym-slider-color-primary-enabled: #ff69b4 !important;
      --ym-slider-color-primary-hovered: #ff1493 !important;
      --ym-slider-color-primary-pressed: #db2777 !important;
      --ym-controls-color-primary-default-enabled: #ff69b4 !important;
      --ym-controls-color-primary-default-hovered: #ff1493 !important;
      --ym-controls-color-primary-default-pressed: #db2777 !important;
    }
    body, html, #root, #__next,
    .deco-pane, .deco-pane-left, .deco-player-bg,
    [class*="page-root"], [class*="sidebar"], [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      background-color: #fff0f5 !important;
      color: #4a3b3c !important;
    }
    [class*="FullscreenPlayerDesktop_root"],
    [class*="FullscreenPlayerDesktop_modalContent"],
    [class*="FullscreenPlayerDesktopContent_root"],
    [class*="FullscreenPlayerDesktopContent_fullscreenContent"],
    [class*="FullscreenPlayerDesktopContent_additionalContent"] {
      background-color: #fff0f5 !important;
      background: #fff0f5 !important;
    }
    span, a, p, h1, h2, h3 {
      color: #4a3b3c !important;
    }
    svg, [class*="UwnL5AJBMMAp6NwMDdZk"], ._YzsXZGNK8KeaUFC4Ja1 svg {
      color: #4a3b3c !important;
    }
    [class*="CommonLayout_root"], [class*="DefaultLayout_root"],
    [class*="Content_root"], [class*="Content_main"], [class*="VibePage_root"] {
      --vibe-gradient-stop-0: #fff0f5 !important;
      --vibe-gradient-stop-1: #fff0f5 !important;
      --vibe-gradient-stop-2: #fff0f5 !important;
      --vibe-gradient-stop-3: #fff0f5 !important;
      --vibe-gradient-stop-4: #fff0f5 !important;
      --vibe-gradient-stop-5: #fff0f5 !important;
      --vibe-gradient-stop-6: #fff0f5 !important;
      --vibe-gradient-stop-7: #fff0f5 !important;
      --vibe-gradient-stop-8: #fff0f5 !important;
      --vibe-gradient-stop-9: #fff0f5 !important;
      --vibe-gradient-stop-10: #fff0f5 !important;
      --vibe-gradient-stop-11: #fff0f5 !important;
      --vibe-gradient-stop-12: #fff0f5 !important;
      --vibe-gradient-stop-13: #fff0f5 !important;
      --vibe-gradient-stop-14: #fff0f5 !important;
      --vibe-gradient-stop-15: #fff0f5 !important;
      background-color: #fff0f5 !important;
      background: #fff0f5 !important;
    }
    [class*="NavbarDesktop_logo__"] div:first-child svg {
      color: #4a3b3c !important;
      fill: #4a3b3c !important;
      --ym-logo-text-color: #4a3b3c !important;
      --ym-logo-color-primary-text: #4a3b3c !important;
      --ym-logo-color-primary-enabled: #4a3b3c !important;
    }
  `
};

function isValidHexColor(color) {
  return typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color);
}

function adjustColorBrightness(hex, percent) {
  if (!isValidHexColor(hex)) return '#000000';
  let R = parseInt(hex.substring(1, 3), 16);
  let G = parseInt(hex.substring(3, 5), 16);
  let B = parseInt(hex.substring(5, 7), 16);

  R = parseInt(R * (100 + percent) / 100);
  G = parseInt(G * (100 + percent) / 100);
  B = parseInt(B * (100 + percent) / 100);

  R = (R < 255) ? R : 255;
  G = (G < 255) ? G : 255;
  B = (B < 255) ? B : 255;

  R = (R > 0) ? R : 0;
  G = (G > 0) ? G : 0;
  B = (B > 0) ? B : 0;

  const rHex = R.toString(16).padStart(2, '0');
  const gHex = G.toString(16).padStart(2, '0');
  const bHex = B.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

function generateCustomThemeCSS(colors) {
  const bg = isValidHexColor(colors.bg) ? colors.bg : '#000000';
  const accent = isValidHexColor(colors.accent) ? colors.accent : '#ffdb4d';
  const text = isValidHexColor(colors.text) ? colors.text : '#ffffff';

  const bgDarker = adjustColorBrightness(bg, -20);
  const borderCol = adjustColorBrightness(bg, 15);

  return `
    html, body, .ym-dark-theme, .ym-light-theme, [class*="CommonLayout_root"] {
      --color-bg-primary: ${bg} !important;
      --color-bg-secondary: ${bgDarker} !important;
      --color-bg-tertiary: ${bgDarker} !important;
      --yp-color-bg-primary: ${bg} !important;
      --yp-color-bg-secondary: ${bgDarker} !important;
      --yp-color-bg-tertiary: ${bgDarker} !important;
      --yp-color-brand: ${accent} !important;
      --yp-color-brand-hover: ${accent} !important;
      --color-text-primary: ${text} !important;
      --yp-color-text-primary: ${text} !important;
      --yp-color-text-secondary: ${text}b3 !important;
      --yp-color-text-tertiary: ${text}80 !important;
      --yp-color-border-primary: ${borderCol} !important;
      --player-average-color-background: ${bg} !important;
      --ym-background-color-primary-enabled-basic: ${bg} !important;
      --ym-background-color-primary-enabled-content: ${bg} !important;
      --ym-background-color-primary-enabled-player: ${bg} !important;
      --ym-background-color-primary-enabled-popover: ${bgDarker} !important;
      --ym-slider-color-primary-enabled: ${accent} !important;
      --ym-slider-color-primary-hovered: ${accent} !important;
      --ym-slider-color-primary-pressed: ${accent} !important;
      --ym-controls-color-primary-default-enabled: ${accent} !important;
      --ym-controls-color-primary-default-hovered: ${accent} !important;
      --ym-controls-color-primary-default-pressed: ${accent} !important;
    }
    body, html, #root, #__next,
    .deco-pane, .deco-pane-left, .deco-player-bg,
    [class*="page-root"], [class*="sidebar"], [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      background-color: ${bg} !important;
      color: ${text} !important;
    }
    [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      border-color: ${borderCol} !important;
    }
    [class*="CommonLayout_root"], [class*="DefaultLayout_root"],
    [class*="Content_root"], [class*="Content_main"], [class*="VibePage_root"] {
      --vibe-gradient-stop-0: ${bg} !important;
      --vibe-gradient-stop-1: ${bg} !important;
      --vibe-gradient-stop-2: ${bg} !important;
      --vibe-gradient-stop-3: ${bg} !important;
      --vibe-gradient-stop-4: ${bg} !important;
      --vibe-gradient-stop-5: ${bg} !important;
      --vibe-gradient-stop-6: ${bg} !important;
      --vibe-gradient-stop-7: ${bg} !important;
      --vibe-gradient-stop-8: ${bg} !important;
      --vibe-gradient-stop-9: ${bg} !important;
      --vibe-gradient-stop-10: ${bg} !important;
      --vibe-gradient-stop-11: ${bg} !important;
      --vibe-gradient-stop-12: ${bg} !important;
      --vibe-gradient-stop-13: ${bg} !important;
      --vibe-gradient-stop-14: ${bg} !important;
      --vibe-gradient-stop-15: ${bg} !important;
      background-color: ${bg} !important;
      background: ${bg} !important;
    }
    [class*="FullscreenPlayerDesktop_root"],
    [class*="FullscreenPlayerDesktop_modalContent"],
    [class*="FullscreenPlayerDesktopContent_root"],
    [class*="FullscreenPlayerDesktopContent_fullscreenContent"],
    [class*="FullscreenPlayerDesktopContent_additionalContent"] {
      background-color: ${bg} !important;
      background: ${bg} !important;
    }
    span, a, p, h1, h2, h3, div {
      color: ${text};
    }
    svg, [class*="UwnL5AJBMMAp6NwMDdZk"], ._YzsXZGNK8KeaUFC4Ja1 svg {
      color: ${text} !important;
    }
    [class*="NavbarDesktop_logo__"] div:first-child svg {
      color: ${text} !important;
      fill: ${text} !important;
      --ym-logo-text-color: ${text} !important;
      --ym-logo-color-primary-text: ${text} !important;
      --ym-logo-color-primary-enabled: ${text} !important;
    }
  `;
}

function applyThemeCSS(themeName, customColors) {
  const allowedThemes = ["default", "oled", "cyberpunk", "nord", "sakura", "custom"];
  if (!allowedThemes.includes(themeName)) {
    themeName = "default";
  }

  let styleEl = document.getElementById('ym-theme-styles');
  if (themeName === 'default') {
    if (styleEl) {
      styleEl.remove();
    }
    return;
  }

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'ym-theme-styles';
    document.head.appendChild(styleEl);
  }

  let cssText = '';
  if (themeName === 'custom') {
    const colors = customColors || { bg: '#000000', accent: '#ffdb4d', text: '#ffffff' };
    cssText = generateCustomThemeCSS(colors);
  } else {
    cssText = THEME_CSS[themeName] || '';
  }

  cssText += `
    [class*="VibePlayerBar_root"] {
      background-color: revert !important;
      background: revert !important;
      border-color: revert !important;
      box-shadow: revert !important;
    }

    /* Fix: нативный градиент-фейд SyncLyrics использует цвет фона из темы.
       Переопределяем ::before/::after чтобы он всегда совпадал с нашей темой. */
    [class*="SyncLyrics_content"] {
      position: relative;
    }
    [class*="SyncLyrics_content"]::before,
    [class*="SyncLyrics_content"]::after {
      background: none !important;
    }
    [class*="SyncLyrics_content"]::before {
      content: "" !important;
      display: block !important;
      position: absolute !important;
      left: 0; right: 0; top: 0;
      height: 120px !important;
      background: linear-gradient(
        to bottom,
        var(--yp-color-bg-primary) 0%,
        transparent 100%
      ) !important;
      pointer-events: none !important;
      z-index: 10 !important;
    }
    [class*="SyncLyrics_content"]::after {
      content: "" !important;
      display: block !important;
      position: absolute !important;
      left: 0; right: 0; bottom: 0;
      height: 120px !important;
      background: linear-gradient(
        to top,
        var(--yp-color-bg-primary) 0%,
        transparent 100%
      ) !important;
      pointer-events: none !important;
      z-index: 10 !important;
    }
  `;

  styleEl.textContent = cssText;
}
