// =========================================================================
// BetterYandexMusic: Vibe Core (State, Modes, Layout & Wheel Interception)
// =========================================================================

// Shared State
let cachedWheelItems = [];
let isPopoverOpen = false;
let activeCategory = "all";
let searchQuery = "";

  // 1. Initialize Mode from localStorage
  function getVibeDesignMode() {
    try {
      return localStorage.getItem('ymVibeDesignMode') || 'default';
    } catch (e) {
      return 'default';
    }
  }

  function isTargetVibePage() {
    if (typeof window === 'undefined') return false;
    const p = window.location.pathname;
    // Explicitly reject non-vibe routes immediately
    if (p.startsWith('/landing') || p.startsWith('/album') || p.startsWith('/artist') ||
        p.startsWith('/users') || p.startsWith('/playlist') || p.startsWith('/genre') ||
        p.startsWith('/chart') || p.startsWith('/radio') || p.startsWith('/search') ||
        p.startsWith('/settings')) {
      return false;
    }
    return p === '/' || p === '' || p.startsWith('/vibe');
  }

  function applyVibeMode(mode) {
    if (typeof document === 'undefined') return;
    const isTarget = isTargetVibePage();
    const isNoWheel = isTarget && mode === 'no_wheel';
    const isWithLanding = isTarget && mode === 'vibe_with_landing';
    if (document.documentElement) {
      document.documentElement.classList.toggle('ym-vibe-no-wheel', isNoWheel);
      document.documentElement.classList.toggle('ym-vibe-with-landing', isWithLanding);
    }
    if (document.body) {
      document.body.classList.toggle('ym-vibe-no-wheel', isNoWheel);
      document.body.classList.toggle('ym-vibe-with-landing', isWithLanding);
    }
    ensureVibeTransparencyStyles();
    // Transparent navbar in both no_wheel and vibe_with_landing modes on target vibe page
    updateNavbarTransparency(isNoWheel || isWithLanding);

    if (isWithLanding) {
      initVibeLandingFeed();
    } else {
      removeVibeLandingFeed();
    }
  }

  function ensureVibeTransparencyStyles() {
    if (typeof document === 'undefined') return;
    let styleEl = document.getElementById('ym-vibe-transparency-override');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'ym-vibe-transparency-override';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      html.ym-vibe-no-wheel aside,
      body.ym-vibe-no-wheel aside,
      html.ym-vibe-with-landing aside,
      body.ym-vibe-with-landing aside,
      html.ym-vibe-no-wheel aside[class*="Navbar"],
      body.ym-vibe-no-wheel aside[class*="Navbar"],
      html.ym-vibe-with-landing aside[class*="Navbar"],
      body.ym-vibe-with-landing aside[class*="Navbar"],
      html.ym-vibe-no-wheel [class*="Navbar_root"],
      body.ym-vibe-no-wheel [class*="Navbar_root"],
      html.ym-vibe-with-landing [class*="Navbar_root"],
      body.ym-vibe-with-landing [class*="Navbar_root"],
      html.ym-vibe-no-wheel [class*="DefaultLayout_navbar"],
      body.ym-vibe-no-wheel [class*="DefaultLayout_navbar"],
      html.ym-vibe-with-landing [class*="DefaultLayout_navbar"],
      body.ym-vibe-with-landing [class*="DefaultLayout_navbar"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_root"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_root"],
      html.ym-vibe-with-landing [class*="NavbarDesktop_root"],
      body.ym-vibe-with-landing [class*="NavbarDesktop_root"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_logoWrapper"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_logoWrapper"],
      html.ym-vibe-with-landing [class*="NavbarDesktop_logoWrapper"],
      body.ym-vibe-with-landing [class*="NavbarDesktop_logoWrapper"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_scrollableContainer"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_scrollableContainer"],
      html.ym-vibe-with-landing [class*="NavbarDesktop_scrollableContainer"],
      body.ym-vibe-with-landing [class*="NavbarDesktop_scrollableContainer"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_scrollableContent"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_scrollableContent"],
      html.ym-vibe-with-landing [class*="NavbarDesktop_scrollableContent"],
      body.ym-vibe-with-landing [class*="NavbarDesktop_scrollableContent"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_navigation"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_navigation"],
      html.ym-vibe-with-landing [class*="NavbarDesktop_navigation"],
      body.ym-vibe-with-landing [class*="NavbarDesktop_navigation"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_navigation_new"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_navigation_new"],
      html.ym-vibe-with-landing [class*="NavbarDesktop_navigation_new"],
      body.ym-vibe-with-landing [class*="NavbarDesktop_navigation_new"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_navigationGroup"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_navigationGroup"],
      html.ym-vibe-with-landing [class*="NavbarDesktop_navigationGroup"],
      body.ym-vibe-with-landing [class*="NavbarDesktop_navigationGroup"],
      html.ym-vibe-no-wheel [class*="SidebarDesktop"],
      body.ym-vibe-no-wheel [class*="SidebarDesktop"],
      html.ym-vibe-with-landing [class*="SidebarDesktop"],
      body.ym-vibe-with-landing [class*="SidebarDesktop"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_pinsList"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_pinsList"],
      html.ym-vibe-with-landing [class*="NavbarDesktop_pinsList"],
      body.ym-vibe-with-landing [class*="NavbarDesktop_pinsList"],
      html.ym-vibe-no-wheel [class*="PinsList_root"],
      body.ym-vibe-no-wheel [class*="PinsList_root"],
      html.ym-vibe-with-landing [class*="PinsList_root"],
      body.ym-vibe-with-landing [class*="PinsList_root"],
      html.ym-vibe-no-wheel [class*="NavbarDesktopUserWidget"],
      body.ym-vibe-no-wheel [class*="NavbarDesktopUserWidget"],
      html.ym-vibe-with-landing [class*="NavbarDesktopUserWidget"],
      body.ym-vibe-with-landing [class*="NavbarDesktopUserWidget"],
      html.ym-vibe-no-wheel [class*="UserProfile_root"],
      body.ym-vibe-no-wheel [class*="UserProfile_root"],
      html.ym-vibe-with-landing [class*="UserProfile_root"],
      body.ym-vibe-with-landing [class*="UserProfile_root"],
      html.ym-vibe-no-wheel aside.Navbar_root__chF4R,
      body.ym-vibe-no-wheel aside.Navbar_root__chF4R,
      html.ym-vibe-with-landing aside.Navbar_root__chF4R,
      body.ym-vibe-with-landing aside.Navbar_root__chF4R,
      html.ym-vibe-no-wheel aside.DefaultLayout_navbar__LIQWG,
      body.ym-vibe-no-wheel aside.DefaultLayout_navbar__LIQWG,
      html.ym-vibe-with-landing aside.DefaultLayout_navbar__LIQWG,
      body.ym-vibe-with-landing aside.DefaultLayout_navbar__LIQWG,
      html.ym-vibe-no-wheel div.NavbarDesktop_root__scYzp,
      body.ym-vibe-no-wheel div.NavbarDesktop_root__scYzp,
      html.ym-vibe-with-landing div.NavbarDesktop_root__scYzp,
      body.ym-vibe-with-landing div.NavbarDesktop_root__scYzp,
      html.ym-vibe-no-wheel div.NavbarDesktop_scrollableContainer__HLc9D,
      body.ym-vibe-no-wheel div.NavbarDesktop_scrollableContainer__HLc9D,
      html.ym-vibe-with-landing div.NavbarDesktop_scrollableContainer__HLc9D,
      body.ym-vibe-with-landing div.NavbarDesktop_scrollableContainer__HLc9D,
      html.ym-vibe-no-wheel div.NavbarDesktop_scrollableContent__OyU4P,
      body.ym-vibe-no-wheel div.NavbarDesktop_scrollableContent__OyU4P,
      html.ym-vibe-with-landing div.NavbarDesktop_scrollableContent__OyU4P,
      body.ym-vibe-with-landing div.NavbarDesktop_scrollableContent__OyU4P,
      html.ym-vibe-no-wheel nav.NavbarDesktop_navigation__dLUGW,
      body.ym-vibe-no-wheel nav.NavbarDesktop_navigation__dLUGW,
      html.ym-vibe-with-landing nav.NavbarDesktop_navigation__dLUGW,
      body.ym-vibe-with-landing nav.NavbarDesktop_navigation__dLUGW,
      html.ym-vibe-no-wheel nav.NavbarDesktop_navigation_new__0j8W5,
      body.ym-vibe-no-wheel nav.NavbarDesktop_navigation_new__0j8W5,
      html.ym-vibe-with-landing nav.NavbarDesktop_navigation_new__0j8W5,
      body.ym-vibe-with-landing nav.NavbarDesktop_navigation_new__0j8W5,
      html.ym-vibe-no-wheel nav.NGdj0oZ2Bt8qdZhP2Tzt,
      body.ym-vibe-no-wheel nav.NGdj0oZ2Bt8qdZhP2Tzt,
      html.ym-vibe-with-landing nav.NGdj0oZ2Bt8qdZhP2Tzt,
      body.ym-vibe-with-landing nav.NGdj0oZ2Bt8qdZhP2Tzt,
      html.ym-vibe-no-wheel nav.QilmoKKJwk6f0BdkYgrA,
      body.ym-vibe-no-wheel nav.QilmoKKJwk6f0BdkYgrA,
      html.ym-vibe-with-landing nav.QilmoKKJwk6f0BdkYgrA,
      body.ym-vibe-with-landing nav.QilmoKKJwk6f0BdkYgrA,
      html.ym-vibe-no-wheel ol.NavbarDesktop_navigationGroup__eexLF,
      body.ym-vibe-no-wheel ol.NavbarDesktop_navigationGroup__eexLF,
      html.ym-vibe-with-landing ol.NavbarDesktop_navigationGroup__eexLF,
      body.ym-vibe-with-landing ol.NavbarDesktop_navigationGroup__eexLF,
      html.ym-vibe-no-wheel ol.yuyI2hMAT7qyL1N14MAQ,
      body.ym-vibe-no-wheel ol.yuyI2hMAT7qyL1N14MAQ,
      html.ym-vibe-with-landing ol.yuyI2hMAT7qyL1N14MAQ,
      body.ym-vibe-with-landing ol.yuyI2hMAT7qyL1N14MAQ,
      html.ym-vibe-no-wheel ol.xfFtKQpgAYvC2jI1tBtS,
      body.ym-vibe-no-wheel ol.xfFtKQpgAYvC2jI1tBtS,
      html.ym-vibe-with-landing ol.xfFtKQpgAYvC2jI1tBtS,
      body.ym-vibe-with-landing ol.xfFtKQpgAYvC2jI1tBtS {
        background: transparent !important;
        background-color: transparent !important;
        border: none !important;
        border-right: none !important;
        box-shadow: none !important;
      }
      html.ym-vibe-no-wheel aside::before,
      body.ym-vibe-no-wheel aside::before,
      html.ym-vibe-with-landing aside::before,
      body.ym-vibe-with-landing aside::before,
      html.ym-vibe-no-wheel aside::after,
      body.ym-vibe-no-wheel aside::after,
      html.ym-vibe-with-landing aside::after,
      body.ym-vibe-with-landing aside::after,
      html.ym-vibe-no-wheel [class*="Navbar"]::before,
      body.ym-vibe-no-wheel [class*="Navbar"]::before,
      html.ym-vibe-with-landing [class*="Navbar"]::before,
      body.ym-vibe-with-landing [class*="Navbar"]::before,
      html.ym-vibe-no-wheel [class*="Navbar"]::after,
      body.ym-vibe-no-wheel [class*="Navbar"]::after,
      html.ym-vibe-with-landing [class*="Navbar"]::after,
      body.ym-vibe-with-landing [class*="Navbar"]::after {
        display: none !important;
        background: transparent !important;
      }

      /* Full-screen wave visualizer spanning column 1 and 2 under transparent navbar */
      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="CommonLayout_content"],
      html.ym-vibe-with-landing [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="CommonLayout_content"] {
        grid-column: 1 / -1 !important;
        grid-row: 1 !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100vw !important;
        height: 100% !important;
        z-index: 1 !important;
        pointer-events: auto !important;
      }

      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]) aside,
      html.ym-vibe-with-landing [class*="CommonLayout_root"]:has([class*="VibePage_root"]) aside {
        grid-column: 1 !important;
        grid-row: 1 !important;
        position: relative !important;
        z-index: 10 !important;
        pointer-events: auto !important;
      }

      /* Dynamically offset content by actual navbar width (200px expanded, 64px collapsed, etc.) */
      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="VibePage_content"],
      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="VibePage_root"] > div:not([class*="VibeCanvas"]),
      html.ym-vibe-with-landing [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="VibePage_content"],
      html.ym-vibe-with-landing [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="VibePage_root"] > div:not([class*="VibeCanvas"]) {
        padding-left: var(--ym-aside-width, 200px) !important;
        box-sizing: border-box !important;
        width: 100% !important;
        transition: padding-left 0.2s cubic-bezier(0.2, 0, 0, 1);
      }

      html.ym-vibe-with-landing #ym-vibe-live-landing-feed {
        padding-left: calc(var(--ym-aside-width, 200px) + 24px) !important;
        padding-right: 24px !important;
        box-sizing: border-box !important;
        width: 100% !important;
        transition: padding-left 0.2s cubic-bezier(0.2, 0, 0, 1);
      }

      /* Pure CSS fallback for collapsed sidebar if CSS variable not yet populated */
      html.ym-vibe-no-wheel.ym-navbar-collapsed [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="VibePage_content"],
      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]):has(aside [class*="title_collapsed"]) [class*="VibePage_content"],
      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]):has(aside.ym-collapsed) [class*="VibePage_content"],
      html.ym-vibe-with-landing.ym-navbar-collapsed [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="VibePage_content"],
      html.ym-vibe-with-landing [class*="CommonLayout_root"]:has([class*="VibePage_root"]):has(aside [class*="title_collapsed"]) [class*="VibePage_content"],
      html.ym-vibe-with-landing [class*="CommonLayout_root"]:has([class*="VibePage_root"]):has(aside.ym-collapsed) [class*="VibePage_content"] {
        padding-left: 64px !important;
      }

      html.ym-vibe-with-landing.ym-navbar-collapsed #ym-vibe-live-landing-feed,
      html.ym-vibe-with-landing [class*="CommonLayout_root"]:has([class*="VibePage_root"]):has(aside [class*="title_collapsed"]) #ym-vibe-live-landing-feed,
      html.ym-vibe-with-landing [class*="CommonLayout_root"]:has([class*="VibePage_root"]):has(aside.ym-collapsed) #ym-vibe-live-landing-feed {
        padding-left: calc(64px + 24px) !important;
      }
    `;
  }

  function updateNavbarTransparency(isNoWheel) {
    if (typeof document === 'undefined') return;
    try {
      const targets = document.querySelectorAll(
        'aside, [class*="Navbar_root"], [class*="DefaultLayout_navbar"], [class*="NavbarDesktop_root"], [class*="NavbarDesktop_logoWrapper"], [class*="NavbarDesktop_scrollableContainer"], [class*="NavbarDesktop_scrollableContent"], [class*="NavbarDesktop_navigation"], [class*="NavbarDesktop_navigationGroup"], [class*="SidebarDesktop"]'
      );
      targets.forEach(el => {
        if (isNoWheel) {
          el.style.setProperty('background', 'transparent', 'important');
          el.style.setProperty('background-color', 'transparent', 'important');
          el.style.setProperty('border-right', 'none', 'important');
          el.style.setProperty('box-shadow', 'none', 'important');
        } else {
          el.style.removeProperty('background');
          el.style.removeProperty('background-color');
          el.style.removeProperty('border-right');
          el.style.removeProperty('box-shadow');
        }
      });
    } catch (e) { }
  }

  let asideResizeObserver = null;
  let lastObservedAside = null;
  let lastObservedChild = null;

  function updateAsideWidth() {
    if (typeof document === 'undefined') return;
    const aside = document.querySelector('aside');
    if (!aside) return;

    const child = aside.querySelector('[class*="NavbarDesktop_root"]') || aside.firstElementChild;
    const asideRect = aside.getBoundingClientRect();
    const childRect = child ? child.getBoundingClientRect() : asideRect;

    let width = asideRect.width;
    if (childRect && childRect.width > 0 && childRect.width < asideRect.width) {
      width = childRect.width;
    }

    if (width > 0) {
      const rounded = Math.round(width);
      document.documentElement.style.setProperty('--ym-aside-width', rounded + 'px');
      if (rounded < 100) {
        document.documentElement.classList.add('ym-navbar-collapsed');
      } else {
        document.documentElement.classList.remove('ym-navbar-collapsed');
      }
    }
  }

  function trackAsideWidth() {
    if (typeof document === 'undefined') return;
    const aside = document.querySelector('aside');
    if (!aside) return;

    updateAsideWidth();

    if (typeof ResizeObserver !== 'undefined') {
      if (!asideResizeObserver) {
        asideResizeObserver = new ResizeObserver(() => {
          updateAsideWidth();
        });
      }
      const child = aside.querySelector('[class*="NavbarDesktop_root"]') || aside.firstElementChild;
      if (lastObservedAside !== aside) {
        if (lastObservedAside) {
          try { asideResizeObserver.unobserve(lastObservedAside); } catch (e) {}
        }
        asideResizeObserver.observe(aside);
        lastObservedAside = aside;
      }
      if (child && lastObservedChild !== child) {
        if (lastObservedChild) {
          try { asideResizeObserver.unobserve(lastObservedChild); } catch (e) {}
        }
        asideResizeObserver.observe(child);
        lastObservedChild = child;
      }
    }
  }

  // Instant tracking on collapse button clicks & transitions (capturing phase)
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      if (e.target && e.target.closest && e.target.closest('aside, [class*="Navbar"]')) {
        const start = performance.now();
        const tick = () => {
          updateAsideWidth();
          if (performance.now() - start < 450) {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      }
    }, true);

    document.addEventListener('transitionend', (e) => {
      if (e.target && e.target.closest && e.target.closest('aside, [class*="Navbar"]')) {
        updateAsideWidth();
      }
    }, true);
  }

  // Apply immediately and on DOM ready
  function initVibeMode() {
    if (typeof injectVibeStyles === 'function') {
      injectVibeStyles();
    }
    applyVibeMode(getVibeDesignMode());
    checkAndInjectVibeButton();
    trackAsideWidth();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initVibeMode);
    } else {
      initVibeMode();
    }
  }

  // Listen for mode changes from Settings
  window.addEventListener('ym-vibe-mode-changed', (e) => {
    if (e.detail && e.detail.mode) {
      applyVibeMode(e.detail.mode);
      checkAndInjectVibeButton();
    }
  });

  // Load cached wheel items from localStorage
  try {
    const raw = localStorage.getItem('ymLastWheelItems');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedWheelItems = parsed;
      }
    }
  } catch (e) { }

  // 2. Intercept wheel network requests (fetch & XMLHttpRequest)
  function inspectWheelResponse(url, data) {
    if (!url || typeof url !== 'string') return;
    if (!url.includes('/wheel/new') && !url.includes('wheel/new')) return;

    if (data && data.items && Array.isArray(data.items) && data.items.length > 0) {
      cachedWheelItems = data.items.map((item, idx) => normalizeWheelItem(item, idx));
      try {
        localStorage.setItem('ymLastWheelItems', JSON.stringify(cachedWheelItems));
      } catch (e) { }

      // If popover is currently open, refresh the items
      const listContainer = document.getElementById('ym-vibe-popover-list');
      if (listContainer) {
        renderPopoverItems(listContainer);
      }
    }
  }

  // Normalize raw item from API
  function normalizeWheelItem(item, idx) {
    const wave = (item && item.data && item.data.wave) || {};
    const agent = (item && item.data && item.data.agent) || {};
    const cover = agent.cover || {};

    let coverUrl = '';
    if (cover.uri) {
      coverUrl = cover.uri.startsWith('http') ? cover.uri : `https://${cover.uri}`;
      coverUrl = coverUrl.replace('%%', '100x100');
    }

    const desc = wave.description || '';
    let category = 'other';
    if (desc.includes('настроению') || (item.id && item.id.includes('mood:'))) {
      category = 'mood';
    } else if (desc.includes('жанру') || (item.id && (item.id.includes('genre:') || item.id.includes('micro-genre:')))) {
      category = 'genre';
    } else if (desc.includes('артиста') || (item.id && item.id.includes('artist:'))) {
      category = 'artist';
    } else if (desc.includes('характеру') || (item.id && item.id.includes('diversity:'))) {
      category = 'character';
    } else if (item.id === 'user:onyourwave' || (wave.name && wave.name.includes('привычному'))) {
      category = 'main';
    }

    return {
      id: item.id || `wheel-item-${idx}`,
      index: idx,
      name: wave.name || 'Моя волна',
      description: desc || 'Моя волна',
      category: category,
      color: cover.color || '#ffdb4d',
      coverUrl: coverUrl,
      seeds: Array.isArray(wave.seeds) ? Array.from(wave.seeds) : []
    };
  }

  // Hook window.fetch
  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (...args) {
      const fetchPromise = origFetch.apply(this, args);
      try {
        const req = args[0];
        const url = typeof req === 'string' ? req : (req && req.url ? req.url : '');
        if (url && (url.includes('/wheel/new') || url.includes('wheel/new'))) {
          fetchPromise.then(async (response) => {
            try {
              const clone = response.clone();
              const json = await clone.json();
              inspectWheelResponse(url, json);
            } catch (e) { }
          }).catch(() => { });
        }
      } catch (e) { }
      return fetchPromise;
    };
  }

  // Hook XMLHttpRequest
  try {
    const origXhrOpen = XMLHttpRequest.prototype.open;
    const origXhrSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this.__ym_vibe_url = url;
      return origXhrOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      if (this.__ym_vibe_url && typeof this.__ym_vibe_url === 'string' && this.__ym_vibe_url.includes('/wheel/new')) {
        const xhr = this;
        xhr.addEventListener('load', function () {
          try {
            const data = JSON.parse(xhr.responseText);
            inspectWheelResponse(xhr.__ym_vibe_url, data);
          } catch (e) { }
        });
      }
      return origXhrSend.apply(this, args);
    };
  } catch (e) { }

  // 3. Fallback: Parse slides directly from DOM if available
  function getItemsFromDOM() {
    const slides = document.querySelectorAll('[class*="WheelDesktop_slide"], [class*="WheelItem_root"]');
    if (!slides || slides.length === 0) return [];

    const items = [];
    slides.forEach((slide, idx) => {
      const titleEl = slide.querySelector('[class*="WheelItem_title"]');
      const title = titleEl ? titleEl.textContent.trim() : '';
      if (!title) return;

      const imgEl = slide.querySelector('img');
      const coverUrl = imgEl ? (imgEl.src || '') : '';
      const ariaLabel = slide.getAttribute('aria-label') || (slide.closest('[aria-label]') ? slide.closest('[aria-label]').getAttribute('aria-label') : '') || '';

      let category = 'other';
      if (ariaLabel.includes('настроению')) category = 'mood';
      else if (ariaLabel.includes('жанру')) category = 'genre';
      else if (ariaLabel.includes('артиста')) category = 'artist';
      else if (ariaLabel.includes('характеру')) category = 'character';
      else if (title.includes('привычному')) category = 'main';

      let slideIndex = slide.getAttribute('data-swiper-slide-index');
      if (slideIndex === null && slide.closest('[data-swiper-slide-index]')) {
        slideIndex = slide.closest('[data-swiper-slide-index]').getAttribute('data-swiper-slide-index');
      }

      items.push({
        id: `dom-${idx}`,
        index: slideIndex !== null ? parseInt(slideIndex, 10) : idx,
        name: title,
        description: ariaLabel || 'Моя волна',
        category: category,
        color: '#ffdb4d',
        coverUrl: coverUrl
      });
    });

    return items;
  }

  // Unified items getter
  function getAllVibeItems() {
    if (cachedWheelItems && cachedWheelItems.length > 0) {
      return cachedWheelItems;
    }
    const fromDOM = getItemsFromDOM();
    if (fromDOM.length > 0) {
      return fromDOM;
    }
    return [];
  }

  // Find active Swiper instance from DOM or React Fiber
  function getSwiperInstance() {
    const swiperEl = document.querySelector(
      '[class*="WheelDesktop_root"] .swiper, [class*="WheelDesktop_root"] [class*="swiper"], [class*="WheelDesktop_swiper"], [class*="WheelDesktop_root"]'
    );
    if (!swiperEl) return null;
    if (swiperEl.swiper) return swiperEl.swiper;

    const inner = swiperEl.querySelector('.swiper, [class*="swiper"]');
    if (inner && inner.swiper) return inner.swiper;

    for (const key in swiperEl) {
      if (key.startsWith('__reactFiber$')) {
        let fiber = swiperEl[key];
        let depth = 0;
        while (fiber && depth < 25) {
          if (fiber.memoizedProps && fiber.memoizedProps.swiper) {
            return fiber.memoizedProps.swiper;
          }
          if (fiber.memoizedState) {
            let s = fiber.memoizedState;
            while (s) {
              if (s.memoizedState && s.memoizedState.swiper) return s.memoizedState.swiper;
              if (s.memoizedState && typeof s.memoizedState.slideToLoop === 'function') return s.memoizedState;
              s = s.next;
            }
          }
          fiber = fiber.return;
          depth++;
        }
      }
    }
    return null;
  }

