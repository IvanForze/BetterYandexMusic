// =========================================================================
// BetterYandexMusic - My Vibe Enhancer & Carousel Redesign
// =========================================================================

(function () {
  'use strict';

  // State
  let cachedWheelItems = [];
  let isPopoverOpen = false;
  let activeCategory = 'all';
  let searchQuery = '';

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

  // 4. Activate / Play a Vibe Item safely via Swiper navigation and fresh active slide
  function activateVibeItem(item) {
    if (!item) return;
    closePopover();

    const swiper = getSwiperInstance();
    if (swiper && typeof swiper.slideToLoop === 'function') {
      try {
        swiper.slideToLoop(item.index, 0);
        if (typeof swiper.update === 'function') swiper.update();
      } catch (e) { }
    }

    // Wait a frame for Swiper to mount the active slide in the DOM
    setTimeout(() => {
      let targetSlide = null;

      // 1. Try finding slide matching the exact swiper index
      const matchingSlides = document.querySelectorAll(
        `[class*="WheelDesktop_slide"][data-swiper-slide-index="${item.index}"]`
      );
      if (matchingSlides.length > 0) {
        targetSlide = matchingSlides[0];
      }

      // 2. If not found by index, check active slide
      if (!targetSlide) {
        targetSlide = document.querySelector('.swiper-slide-active, [class*="WheelDesktop_activeSlide"]');
      }

      // 3. If still not found, search all slides by name
      if (!targetSlide) {
        const allSlides = document.querySelectorAll('[class*="WheelDesktop_slide"]');
        for (const slide of allSlides) {
          const titleEl = slide.querySelector('[class*="WheelItem_title"]');
          if (titleEl && titleEl.textContent.trim().toLowerCase() === item.name.toLowerCase()) {
            targetSlide = slide;
            break;
          }
        }
      }

      if (targetSlide) {
        let triggered = false;

        // Try React props onClick first
        for (const key in targetSlide) {
          if (key.startsWith('__reactProps$')) {
            const props = targetSlide[key];
            if (props && typeof props.onClick === 'function') {
              try {
                props.onClick({ stopPropagation: () => { }, preventDefault: () => { }, target: targetSlide });
                triggered = true;
              } catch (e) { }
            }
          }
        }

        // Trigger DOM click on the button or slide
        if (!triggered) {
          const playBtn = targetSlide.querySelector(
            'button[aria-label*="Воспроизведение"], [class*="PlayButtonWithCover_playButton"], button'
          );
          const clickable = playBtn || targetSlide.querySelector('[role="button"]') || targetSlide;
          if (clickable) {
            try {
              clickable.click();
            } catch (e) {
              clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }
          }
        }
      } else {
        // Fallback: search wheel React Fiber for select handlers
        triggerWheelFiberSelect(item);
      }
    }, 45);
  }

  function triggerWheelFiberSelect(item) {
    const wheelRoot = document.querySelector('[class*="WheelDesktop_root"], [class*="VibePage_wheel"]');
    if (!wheelRoot) return;

    for (const key in wheelRoot) {
      if (key.startsWith('__reactFiber$')) {
        let fiber = wheelRoot[key];
        let depth = 0;
        while (fiber && depth < 30) {
          const props = fiber.memoizedProps;
          if (props) {
            if (typeof props.onSelect === 'function') {
              try { props.onSelect(item); return; } catch (e) { }
            }
            if (typeof props.onItemClick === 'function') {
              try { props.onItemClick(item); return; } catch (e) { }
            }
            if (typeof props.playWave === 'function') {
              try { props.playWave(item); return; } catch (e) { }
            }
            if (props.wheelStore && typeof props.wheelStore.selectItem === 'function') {
              try { props.wheelStore.selectItem(item); return; } catch (e) { }
            }
          }
          fiber = fiber.return;
          depth++;
        }
      }
    }
  }

  // 5. Inject Settings / Vibe Button into the Context Area
  function checkAndInjectVibeButton() {
    const mode = getVibeDesignMode();
    // Show button in "no_wheel" and "vibe_with_landing" modes!
    if (mode !== 'no_wheel' && mode !== 'vibe_with_landing') {
      const existingBtn = document.getElementById('ym-vibe-settings-btn');
      if (existingBtn) existingBtn.remove();
      return;
    }

    const isVibePage = window.location.pathname === '/' ||
      window.location.pathname === '' ||
      window.location.pathname.startsWith('/vibe') ||
      document.querySelector('[class*="VibePage_root"]');

    if (!isVibePage) {
      const existingBtn = document.getElementById('ym-vibe-settings-btn');
      if (existingBtn) existingBtn.remove();
      return;
    }

    // Target container: VibePage_context or VibeResetButton_root
    const contextContainer = document.querySelector('[class*="VibePage_context"], [class*="VibeResetButton_root"]');
    const vibeMeta = document.querySelector('[class*="VibePage_meta"]');

    if (!contextContainer && !vibeMeta) return;

    // Check or create trigger button - clean text without icons or arrows
    let btn = document.getElementById('ym-vibe-settings-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'ym-vibe-settings-btn';
      btn.className = 'ym-vibe-settings-trigger-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Настройка волны');
      btn.setAttribute('aria-haspopup', 'true');
      btn.textContent = 'Настройка волны';

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePopover(btn);
      });
    }

    // Place the button UNDER the context button (e.g. "Мне нравится ✕")
    if (contextContainer && contextContainer.parentElement) {
      if (btn.previousElementSibling !== contextContainer) {
        contextContainer.insertAdjacentElement('afterend', btn);
      }
    } else if (vibeMeta) {
      if (vibeMeta.firstElementChild !== btn) {
        vibeMeta.insertBefore(btn, vibeMeta.firstChild);
      }
    }
  }

  // 6. Popover Management
  function togglePopover(anchorBtn) {
    if (isPopoverOpen) {
      closePopover();
    } else {
      openPopover(anchorBtn);
    }
  }

  function openPopover(anchorBtn) {
    closePopover();
    isPopoverOpen = true;

    const popover = document.createElement('div');
    popover.id = 'ym-vibe-popover';
    popover.className = 'ym-vibe-popover';

    popover.innerHTML = `
      <div class="ym-vibe-popover-header">
        <div class="ym-vibe-popover-title-row">
          <div class="ym-vibe-popover-title">
            <span>Настройка волны</span>
          </div>
          <button type="button" class="ym-vibe-popover-close-btn" aria-label="Закрыть">✕</button>
        </div>
        <div class="ym-vibe-categories-bar">
          <button type="button" class="ym-vibe-cat-chip ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">Все</button>
          <button type="button" class="ym-vibe-cat-chip ${activeCategory === 'mood' ? 'active' : ''}" data-cat="mood">Настроение</button>
          <button type="button" class="ym-vibe-cat-chip ${activeCategory === 'genre' ? 'active' : ''}" data-cat="genre">Жанры</button>
          <button type="button" class="ym-vibe-cat-chip ${activeCategory === 'artist' ? 'active' : ''}" data-cat="artist">Артисты</button>
          <button type="button" class="ym-vibe-cat-chip ${activeCategory === 'character' ? 'active' : ''}" data-cat="character">Характер</button>
        </div>
      </div>
      <div id="ym-vibe-popover-list" class="ym-vibe-popover-list"></div>
    `;

    document.body.appendChild(popover);

    positionPopover(popover, anchorBtn);

    const listContainer = popover.querySelector('#ym-vibe-popover-list');
    renderPopoverItems(listContainer);

    // Horizontal wheel scroll on categories bar
    const catBar = popover.querySelector('.ym-vibe-categories-bar');
    if (catBar) {
      catBar.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          catBar.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }

    const catChips = popover.querySelectorAll('.ym-vibe-cat-chip');
    catChips.forEach(chip => {
      chip.addEventListener('click', () => {
        catChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeCategory = chip.dataset.cat;
        renderPopoverItems(listContainer);
      });
    });

    const closeBtn = popover.querySelector('.ym-vibe-popover-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closePopover);
    }

    setTimeout(() => {
      document.addEventListener('click', onDocClickClose);
      document.addEventListener('keydown', onEscClose);
    }, 10);
  }

  function positionPopover(popover, anchorBtn) {
    if (!popover || !anchorBtn) return;
    const rect = anchorBtn.getBoundingClientRect();
    const popoverWidth = 380;
    const padding = 16;

    let top = rect.bottom + 10;
    let left = rect.left + (rect.width / 2) - (popoverWidth / 2);

    if (left < padding) left = padding;
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - popoverWidth - padding;
    }

    if (top + 480 > window.innerHeight && rect.top > 480) {
      top = rect.top - 490;
    }

    popover.style.top = `${Math.max(10, Math.round(top))}px`;
    popover.style.left = `${Math.max(10, Math.round(left))}px`;
  }

  function renderPopoverItems(container) {
    if (!container) return;
    container.replaceChildren();

    const allItems = getAllVibeItems();
    if (!allItems || allItems.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'ym-vibe-empty';
      emptyDiv.textContent = 'Список волн загружается... Включите трек на главной странице.';
      container.appendChild(emptyDiv);
      return;
    }

    const filtered = allItems.filter(item => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'ym-vibe-empty';
      noResults.textContent = 'В этой категории пока нет вариантов.';
      container.appendChild(noResults);
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'ym-vibe-item-card';
      card.dataset.id = item.id;
      card.style.setProperty('--vibe-color', item.color || '#ffdb4d');

      const coverHtml = item.coverUrl
        ? `<img src="${escapeHtml(item.coverUrl)}" alt="${escapeHtml(item.name)}" class="ym-vibe-item-cover" loading="lazy">`
        : `<div class="ym-vibe-item-cover-placeholder" style="background: ${item.color || '#333'};">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3m0 14v3M2 12h3m14 0h3"></path></svg>
           </div>`;

      card.innerHTML = `
        <div class="ym-vibe-item-left">
          ${coverHtml}
          <div class="ym-vibe-item-info">
            <div class="ym-vibe-item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
            <div class="ym-vibe-item-desc">${escapeHtml(item.description)}</div>
          </div>
        </div>
        <div class="ym-vibe-item-play-btn" title="Включить">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 3 20 12 6 21 6 3"></polygon>
          </svg>
        </div>
      `;

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        activateVibeItem(item);
      });

      container.appendChild(card);
    });
  }

  function closePopover() {
    isPopoverOpen = false;
    const popover = document.getElementById('ym-vibe-popover');
    if (popover) {
      popover.classList.add('closing');
      setTimeout(() => popover.remove(), 160);
    }
    document.removeEventListener('click', onDocClickClose);
    document.removeEventListener('keydown', onEscClose);
  }

  function onDocClickClose(e) {
    const popover = document.getElementById('ym-vibe-popover');
    const btn = document.getElementById('ym-vibe-settings-btn');
    if (popover && !popover.contains(e.target) && (!btn || !btn.contains(e.target))) {
      closePopover();
    }
  }

  function onEscClose(e) {
    if (e.key === 'Escape') {
      closePopover();
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // =========================================================================
  // 8. Mode 3: Live Landing Feed Under Vibe (Native REST API Integration)
  // =========================================================================

  let landingFeedCache = {
    likesHistory: null,
    mixesWaves: null,
    waves: null,
    inStyle: null,
    newReleases: null,
    concerts: null,
    timestamp: 0
  };
  let activeAiCategory = 'mix';
  let activeWavesCategory = 'mix';
  let activeInStyleArtistId = null;
  let isFetchingFeed = false;

  function formatYandexImg(uri, size = '400x400') {
    if (!uri) return '';
    let url = String(uri);
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    if (url.includes('get-music-misc')) {
      const miscSize = size.startsWith('m') ? size : 'm400x400';
      return url.replace('%%', miscSize);
    }
    return url.replace('%%', size);
  }

  function spaNavigate(url, e) {
    if (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
    }
    if (window.next && window.next.router && typeof window.next.router.push === 'function') {
      try {
        window.next.router.push(url);
        return;
      } catch (err) { }
    }
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  async function fetchFeedData() {
    const now = Date.now();
    if (landingFeedCache.timestamp && (now - landingFeedCache.timestamp < 180000)) {
      return landingFeedCache;
    }

    if (isFetchingFeed) return landingFeedCache;
    isFetchingFeed = true;

    try {
      const [lhRes, mwRes, wavesRes, inStyleRes, nrRes, cRes] = await Promise.allSettled([
        fetch('https://api.music.yandex.ru/landing-blocks/likes-and-history', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('https://api.music.yandex.ru/landing-blocks/mixes-waves', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('https://api.music.yandex.ru/landing-blocks/waves', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('https://api.music.yandex.ru/landing-blocks/in-style', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('https://api.music.yandex.ru/landing-blocks/new-releases', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('https://api.music.yandex.ru/concerts/landing/personal', { credentials: 'include' }).then(r => r.ok ? r.json() : null)
      ]);

      if (lhRes.status === 'fulfilled' && lhRes.value) landingFeedCache.likesHistory = lhRes.value;
      if (mwRes.status === 'fulfilled' && mwRes.value) landingFeedCache.mixesWaves = mwRes.value;
      if (wavesRes.status === 'fulfilled' && wavesRes.value) landingFeedCache.waves = wavesRes.value;
      if (inStyleRes.status === 'fulfilled' && inStyleRes.value) landingFeedCache.inStyle = inStyleRes.value;
      if (nrRes.status === 'fulfilled' && nrRes.value) landingFeedCache.newReleases = nrRes.value;
      if (cRes.status === 'fulfilled' && cRes.value) landingFeedCache.concerts = cRes.value;

      landingFeedCache.timestamp = now;
    } catch (e) {
      console.warn('[BYM] Error fetching live landing feed data:', e);
    } finally {
      isFetchingFeed = false;
    }

    return landingFeedCache;
  }

  async function initVibeLandingFeed() {
    if (getVibeDesignMode() !== 'vibe_with_landing') {
      removeVibeLandingFeed();
      return;
    }

    if (!isTargetVibePage()) {
      removeVibeLandingFeed();
      return;
    }

    // Clean up any obsolete quick block from previous layouts
    const oldQuick = document.getElementById('ym-vibe-quick-block');
    if (oldQuick) oldQuick.remove();

    // Target 2: Scrollable Feed under Vibe inside MainPage_vibeWidgetContainer
    const widgetContainer = document.querySelector('[class*="MainPage_vibeWidgetContainer"]');
    const vibeRoot = document.querySelector('[class*="VibePage_root"]');
    if (widgetContainer) {
      let feedContainer = document.getElementById('ym-vibe-live-landing-feed');
      if (!feedContainer) {
        feedContainer = document.createElement('div');
        feedContainer.id = 'ym-vibe-live-landing-feed';
        if (vibeRoot && vibeRoot.nextElementSibling) {
          widgetContainer.insertBefore(feedContainer, vibeRoot.nextElementSibling);
        } else {
          widgetContainer.appendChild(feedContainer);
        }
      }
    }

    // Fetch and render data
    const data = await fetchFeedData();
    renderLandingFeedUI(data);
  }

  function removeVibeLandingFeed() {
    const quickBlock = document.getElementById('ym-vibe-quick-block');
    if (quickBlock) quickBlock.remove();

    const feed = document.getElementById('ym-vibe-live-landing-feed');
    if (feed) feed.remove();
  }

  function renderLandingFeedUI(data) {
    if (getVibeDesignMode() !== 'vibe_with_landing') return;

    const oldQuick = document.getElementById('ym-vibe-quick-block');
    if (oldQuick) oldQuick.remove();

    const feed = document.getElementById('ym-vibe-live-landing-feed');
    if (!feed || !data) return;
    feed.replaceChildren();

    // 1. Exact 1-to-1 Native Tabs (Для вас / Тренды)
    renderLandingTabs(feed, data.likesHistory, data.newReleases);

    // 2. Exact 1-to-1 Native Likes and History cards (Мне нравится / История)
    renderLikesAndHistorySection(feed, data.likesHistory);

    // 3. Exact 1-to-1 Section: Свели в AI-сет
    renderAiSetsSection(feed, data.mixesWaves);

    // 4. Exact 1-to-1 Section: Больше открытий (WAVES)
    renderMoreDiscoveriesSection(feed, data.waves);

    // 5. Exact 1-to-1 Section: В стиле (IN_STYLE)
    renderInStyleSection(feed, data.inStyle);

    // 6. Exact 1-to-1 Section: Новые релизы
    renderNewReleasesSection(feed, data.newReleases);

    // 7. Exact 1-to-1 Section: Концерты для вас
    renderConcertsSection(feed, data.concerts);

    // 8. Update initial playback indicators for all cards (Play/Pause states)
    updateLandingPlaybackIndicators();
  }

  function renderLandingTabs(feedContainer, lhData, newReleasesData) {
    const lh = lhData?.result || lhData || {};
    const favTracks = lh.favorites?.trackCovers || [];
    const histArtists = lh.history?.subtitleElements || [];
    const artist1 = histArtists[0] || 'Для вас';
    const artist2 = histArtists[1] || 'подборка';
    const forYouSub = `${artist1}, ${artist2}`;

    const forYouImg1 = favTracks[0]?.uri ? formatYandexImg(favTracks[0].uri, '50x50') : '';
    const forYouImg2 = favTracks[1]?.uri ? formatYandexImg(favTracks[1].uri, '50x50') : '';

    const releases = newReleasesData?.result?.newReleases || newReleasesData?.newReleases || [];
    const trendsImg1 = releases[0]?.cover?.uri ? formatYandexImg(releases[0].cover.uri, '50x50') : '';
    const trendsImg2 = releases[1]?.cover?.uri ? formatYandexImg(releases[1].cover.uri, '50x50') : '';

    const header = document.createElement('header');
    header.className = 'Skeleton_header__Ir5f4 ym-landing-tabs-header';
    header.innerHTML = `
      <ol class="TjoCDDIf5PrIGU4w8G6Z TabCarousel_root__8DoRy Skeleton_tabCarousel__E2kLf" role="tablist">
        <li class="d50IqTKJZhJIMd5aTqAn">
          <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 qU2apWBO1yyEK0lZ3lPO Yqh9GVOagMQpvymD877t cBxrIXbcPeS3kSzdJdhS Tab_root__LUukY Tab_tab_size_m__c7tVg Skeleton_tab__Jn6By" type="button" role="tab" id="_r_b2d_-0-tab" aria-controls="_r_b2d_-0-tabpanel" aria-selected="true" aria-label="Для вас" aria-hidden="false" tabindex="0" aria-live="off" aria-busy="false">
            <span class="Tab_covers__cvYeI">
              ${forYouImg1 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG Tab_image__Hen3_" alt="" loading="eager" srcset="${escapeHtml(forYouImg1)}, ${escapeHtml(forYouImg1.replace('50x50', '100x100'))} 2x" src="${escapeHtml(forYouImg1)}">` : ''}
              ${forYouImg2 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG Tab_image__Hen3_" alt="" loading="eager" srcset="${escapeHtml(forYouImg2)}, ${escapeHtml(forYouImg2.replace('50x50', '100x100'))} 2x" src="${escapeHtml(forYouImg2)}">` : ''}
            </span>
            <span class="Tab_description__p1fTO">
              <div title="Для вас" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA Vi7Rd0SZWqD17F0872TB Tab_title__hAYZk" style="-webkit-line-clamp: 1;">Для вас</div>
              <div title="${escapeHtml(forYouSub)}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI _oBLf5gprWsKjCw4Ce58 _3_Mxw7Si7j2g4kWjlpR Tab_subtitle__fLp9S" style="-webkit-line-clamp: 1;">${escapeHtml(forYouSub)}</div>
            </span>
          </button>
        </li>
        <li class="d50IqTKJZhJIMd5aTqAn">
          <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 qU2apWBO1yyEK0lZ3lPO Yqh9GVOagMQpvymD877t Tab_root__LUukY Tab_tab_size_m__c7tVg Skeleton_tab__Jn6By" type="button" role="tab" id="_r_b2d_-1-tab" aria-controls="_r_b2d_-1-tabpanel" aria-selected="false" aria-label="Тренды" aria-hidden="false" tabindex="-1" aria-live="off" aria-busy="false">
            <span class="Tab_covers__cvYeI">
              ${trendsImg1 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG Tab_image__Hen3_" alt="" loading="eager" srcset="${escapeHtml(trendsImg1)}, ${escapeHtml(trendsImg1.replace('50x50', '100x100'))} 2x" src="${escapeHtml(trendsImg1)}">` : ''}
              ${trendsImg2 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG Tab_image__Hen3_" alt="" loading="eager" srcset="${escapeHtml(trendsImg2)}, ${escapeHtml(trendsImg2.replace('50x50', '100x100'))} 2x" src="${escapeHtml(trendsImg2)}">` : ''}
            </span>
            <span class="Tab_description__p1fTO">
              <div title="Тренды" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA Vi7Rd0SZWqD17F0872TB Tab_title__hAYZk" style="-webkit-line-clamp: 1;">Тренды</div>
              <div title="Чарт и Открытия" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI _oBLf5gprWsKjCw4Ce58 _3_Mxw7Si7j2g4kWjlpR Tab_subtitle__fLp9S" style="-webkit-line-clamp: 1;">Чарт и Открытия</div>
            </span>
          </button>
        </li>
      </ol>
    `;

    const tabForYou = header.querySelector('#_r_b2d_-0-tab');
    const tabTrends = header.querySelector('#_r_b2d_-1-tab');
    if (tabForYou && tabTrends) {
      tabForYou.addEventListener('click', (e) => {
        e.preventDefault();
        tabForYou.classList.add('cBxrIXbcPeS3kSzdJdhS');
        tabForYou.setAttribute('aria-selected', 'true');
        tabForYou.setAttribute('tabindex', '0');
        tabTrends.classList.remove('cBxrIXbcPeS3kSzdJdhS');
        tabTrends.setAttribute('aria-selected', 'false');
        tabTrends.setAttribute('tabindex', '-1');
      });
      tabTrends.addEventListener('click', (e) => {
        e.preventDefault();
        tabTrends.classList.add('cBxrIXbcPeS3kSzdJdhS');
        tabTrends.setAttribute('aria-selected', 'true');
        tabTrends.setAttribute('tabindex', '0');
        tabForYou.classList.remove('cBxrIXbcPeS3kSzdJdhS');
        tabForYou.setAttribute('aria-selected', 'false');
        tabForYou.setAttribute('tabindex', '-1');
        spaNavigate('/chart');
      });
    }

    feedContainer.appendChild(header);
  }

  function renderLikesAndHistorySection(feedContainer, lhData) {
    const lh = lhData?.result || lhData || {};
    const fav = lh.favorites || {};
    const hist = lh.history || {};

    const favLink = fav.playlistUuid ? `/playlists/${fav.playlistUuid}` : '/collection';
    const histLink = '/music-history';

    const favCountText = fav.count ? `${fav.count} треков` : 'Мне нравится';
    const histSubElements = Array.isArray(hist.subtitleElements) && hist.subtitleElements.length > 0
      ? hist.subtitleElements.slice(0, 3).join(', ')
      : 'Недавно прослушано';

    const favCoverUrl = fav.cover?.uri
      ? formatYandexImg(fav.cover.uri, '80x80')
      : 'https://avatars.yandex.net/get-music-user-playlist/11418140/favorit-playlist-cover.bb48fdb9b9f4/80x80';

    const favCovers = Array.isArray(fav.trackCovers) ? fav.trackCovers.slice(0, 2) : [];
    let favCoversHtml = '';
    if (favCovers.length > 0) {
      favCoversHtml = `
        <div class="LikesAndHistoryItem_covers__9k_yw">
          ${favCovers.map((c) => {
            const uri = c.uri || c;
            return `
              <div class="qaIScXjx1qyXuaIHXQIo wdE2qVRIlWUesuBfzCis ZcpulvHgF_wsgzB8Hye9 LikesAndHistoryItem_coverContainer__fwXXJ">
                <img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG LikesAndHistoryItem_cover__QlRhz" alt="" loading="eager" src="${escapeHtml(formatYandexImg(uri, '80x80'))}">
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    const histCovers = Array.isArray(hist.trackCovers) ? hist.trackCovers.slice(0, 2) : [];
    let histCoversHtml = '';
    if (histCovers.length > 0) {
      histCoversHtml = `
        <div class="LikesAndHistoryItem_covers__9k_yw">
          ${histCovers.map((c) => {
            const uri = c.uri || c;
            return `
              <div class="qaIScXjx1qyXuaIHXQIo wdE2qVRIlWUesuBfzCis ZcpulvHgF_wsgzB8Hye9 LikesAndHistoryItem_coverContainer__fwXXJ">
                <img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG LikesAndHistoryItem_cover__QlRhz" alt="" loading="eager" src="${escapeHtml(formatYandexImg(uri, '80x80'))}">
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    const section = document.createElement('section');
    section.className = 'LikesAndHistory_root__KCuz_';
    section.innerHTML = `
      <ol class="IZnFMW4gXBshJODnvB1P LikesAndHistory_carousel__579RD" role="list">
        <li class="VJ9IexhAEuYSCyGiMfN4 LikesAndHistory_carouselItem__Yq5Xw">
          <div class="LikesAndHistoryItem_root__oI1gk">
            <a target="_self" class="buOTZq_TKQOVyjMLrXvB LikesAndHistoryItem_link__snTl_" href="${escapeHtml(favLink)}" id="ym-card-fav">
              <div class="LikesAndHistoryItem_start__wdtiV">
                <div class="qaIScXjx1qyXuaIHXQIo emVxQKB1wJc9FwuIBG8o ZcpulvHgF_wsgzB8Hye9 LikesAndHistory_favoritesCoverContainer__UUIDf">
                  <img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG LikesAndHistory_favoritesCover__Nt7Gm" alt="Мне нравится" loading="eager" src="${escapeHtml(favCoverUrl)}">
                </div>
                <div class="LikesAndHistoryItem_textContainer__yGdOu">
                  <h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww LikesAndHistoryItem_title__hdi2H">
                    Мне нравится
                    <svg class="LikesAndHistoryItem_titleIcon__2D_yS UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 16 16" width="12" height="12" focusable="false" aria-hidden="true">
                      <use xlink:href="/icons/sprite.svg#arrowRight_xs"></use>
                    </svg>
                  </h2>
                  <div title="${escapeHtml(favCountText)}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI g3qWNP6xl__7qxNmtrvd _3_Mxw7Si7j2g4kWjlpR LikesAndHistoryItem_subtitle__ghuKi" style="-webkit-line-clamp: 1;">
                    ${escapeHtml(favCountText)}
                  </div>
                </div>
              </div>
              ${favCoversHtml}
            </a>
          </div>
        </li>

        <li class="VJ9IexhAEuYSCyGiMfN4 LikesAndHistory_carouselItem__Yq5Xw">
          <div class="LikesAndHistoryItem_root__oI1gk">
            <a target="_self" class="buOTZq_TKQOVyjMLrXvB LikesAndHistoryItem_link__snTl_" href="${escapeHtml(histLink)}" id="ym-card-hist">
              <div class="LikesAndHistoryItem_start__wdtiV">
                <div class="qaIScXjx1qyXuaIHXQIo emVxQKB1wJc9FwuIBG8o ZcpulvHgF_wsgzB8Hye9 LikesAndHistory_historyIconContainer__KPPbS">
                  <svg class="LikesAndHistory_historyIcon__2FAMu o_v2ds2BaqtzAsRuCVjw" viewBox="0 0 24 24" width="24" height="24" focusable="false" aria-hidden="true">
                    <use xlink:href="/icons/sprite.svg#history_m"></use>
                  </svg>
                </div>
                <div class="LikesAndHistoryItem_textContainer__yGdOu">
                  <h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww LikesAndHistoryItem_title__hdi2H">
                    История
                    <svg class="LikesAndHistoryItem_titleIcon__2D_yS UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 16 16" width="12" height="12" focusable="false" aria-hidden="true">
                      <use xlink:href="/icons/sprite.svg#arrowRight_xs"></use>
                    </svg>
                  </h2>
                  <div title="${escapeHtml(histSubElements)}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI g3qWNP6xl__7qxNmtrvd _3_Mxw7Si7j2g4kWjlpR LikesAndHistoryItem_subtitle__ghuKi" style="-webkit-line-clamp: 1;">
                    ${escapeHtml(histSubElements)}
                  </div>
                </div>
              </div>
              ${histCoversHtml}
            </a>
          </div>
        </li>
      </ol>
    `;

    const favBtn = section.querySelector('#ym-card-fav');
    if (favBtn) favBtn.addEventListener('click', (e) => spaNavigate(favLink, e));
    const histBtn = section.querySelector('#ym-card-hist');
    if (histBtn) histBtn.addEventListener('click', (e) => spaNavigate(histLink, e));

    feedContainer.appendChild(section);
  }

  const ENABLED_CONTROL_CLASS = 'i5WuBm5mfG0mflk_1jH_';

  function setCarouselButtonState(btn, isDisabled) {
    if (!btn) return;
    if (isDisabled) {
      btn.disabled = true;
      btn.setAttribute('data-disabled', 'true');
      btn.classList.remove(ENABLED_CONTROL_CLASS);
    } else {
      btn.disabled = false;
      btn.removeAttribute('disabled');
      btn.removeAttribute('data-disabled');
      btn.classList.add(ENABLED_CONTROL_CLASS);
    }
  }

  function scrollCarouselOneItem(container, direction) {
    if (!container) return;
    const items = Array.from(container.children).filter(el => el.nodeType === 1);
    if (items.length === 0) return;

    // Step distance between consecutive items (item width + gap)
    let step = 0;
    if (items.length >= 2) {
      const r0 = items[0].getBoundingClientRect();
      const r1 = items[1].getBoundingClientRect();
      step = Math.round(r1.left - r0.left);
    }
    if (!step || step <= 0) {
      const r0 = items[0].getBoundingClientRect();
      step = Math.round(r0.width > 0 ? r0.width + 16 : 300);
    }

    container.scrollBy({
      left: direction * step,
      behavior: 'smooth'
    });
  }

  function setupCarouselControls(container, prevBtn, nextBtn) {
    if (!container) return;
    const update = () => {
      const atStart = container.scrollLeft <= 5;
      const atEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 5;
      setCarouselButtonState(prevBtn, atStart);
      setCarouselButtonState(nextBtn, atEnd);
    };
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        scrollCarouselOneItem(container, -1);
        try { prevBtn.blur(); } catch (_) {}
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        scrollCarouselOneItem(container, 1);
        try { nextBtn.blur(); } catch (_) {}
      });
    }
    container.addEventListener('scroll', update, { passive: true });
    // Native smooth momentum and snapping - NO wheel deltaY hijacking!
    update();
    setTimeout(update, 100);
    setTimeout(update, 500);
  }

  function createSectionHeader(title, linkHref) {
    const header = document.createElement('div');
    header.className = 'Vibes_header__L5F6H ym-vibe-feed-header';
    header.innerHTML = `
      ${linkHref
        ? `<a href="${escapeHtml(linkHref)}" class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww Vibes_heading__4i5bM ym-vibe-feed-title-link">
            <span>${escapeHtml(title)}</span>
            <svg class="LikesAndHistoryItem_titleIcon__2D_yS" viewBox="0 0 16 16" width="12" height="12" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowRight_xs"></use>
            </svg>
           </a>`
        : `<h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww Vibes_heading__4i5bM">${escapeHtml(title)}</h2>`
      }
      <div class="CarouselControls_root__E_hwc Vibes_controls__bUp2H">
        <button class="cpeagBA1_PblpJn8Xgtv pnM3iSP9keZOELI2oohr uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO undefined CarouselControls_control__L8t4i" type="button" tabindex="-1" aria-hidden="true" disabled="" data-disabled="true" aria-live="off" aria-busy="false">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowLeft_xxs"></use>
            </svg>
          </span>
        </button>
        <button class="cpeagBA1_PblpJn8Xgtv pnM3iSP9keZOELI2oohr uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p i5WuBm5mfG0mflk_1jH_ eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO undefined CarouselControls_control__L8t4i" type="button" tabindex="-1" aria-hidden="true" aria-live="off" aria-busy="false">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowRight_xxs"></use>
            </svg>
          </span>
        </button>
      </div>
    `;
    if (linkHref) {
      const link = header.querySelector('a');
      if (link) link.addEventListener('click', (e) => spaNavigate(linkHref, e));
    }
    return header;
  }

  function renderAiSetsSection(feedContainer, mixesWavesData) {
    if (!mixesWavesData) return;
    const waves = mixesWavesData.result?.waves || mixesWavesData.waves || [];
    if (!Array.isArray(waves) || waves.length === 0) return;

    const section = document.createElement('section');
    section.className = 'Vibes_root__Bk6PF ym-vibe-feed-section';

    // Header with Title & Carousel Arrows
    const header = createSectionHeader('Свели в AI-сет');
    section.appendChild(header);

    const chipsRow = document.createElement('ol');
    chipsRow.className = 'ym-vibe-filter-chips-row TabCarousel_root__8DoRy SkeletonBlock_container__9IxUi SkeletonBlock_important__faY0E Vibes_tabCarousel__bSvp0 Vibes_important__Vew_4';
    chipsRow.setAttribute('role', 'tablist');
    chipsRow.setAttribute('aria-labelledby', '_r_2jj_');

    if (!activeAiCategory) activeAiCategory = waves[0].id;
    const currentCatWave = waves.find(w => w.id === activeAiCategory) || waves[0];

    waves.forEach((w, idx) => {
      const li = document.createElement('li');
      li.className = 'ym-vibe-filter-chip-item d50IqTKJZhJIMd5aTqAn';
      const isSelected = w.id === activeAiCategory;
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.id = `_r_2jk_-${idx}-tab`;
      tab.setAttribute('aria-controls', `_r_2jk_-${idx}-tabpanel`);
      tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      tab.setAttribute('aria-label', w.title || w.id);
      tab.setAttribute('aria-live', 'off');
      tab.setAttribute('aria-busy', 'false');
      tab.setAttribute('tabindex', isSelected ? '0' : '-1');
      tab.className = `ym-vibe-filter-chip-btn ${isSelected ? 'is-active cBxrIXbcPeS3kSzdJdhS ' : ''}cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 qU2apWBO1yyEK0lZ3lPO Yqh9GVOagMQpvymD877t Tab_root__LUukY Tab_tab_size_m__c7tVg Vibes_tab__uOfqW Vibes_important__Vew_4`;
      tab.innerHTML = `
        <span class="Tab_description__p1fTO">
          <div title="${escapeHtml(w.title || w.id)}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA Vi7Rd0SZWqD17F0872TB Tab_title__hAYZk" style="-webkit-line-clamp: 1;">${escapeHtml(w.title || w.id)}</div>
        </span>
      `;
      tab.addEventListener('click', () => {
        activeAiCategory = w.id;
        chipsRow.querySelectorAll('.ym-vibe-filter-chip-btn').forEach(t => {
          t.classList.remove('is-active', 'cBxrIXbcPeS3kSzdJdhS');
          t.setAttribute('aria-selected', 'false');
          t.setAttribute('tabindex', '-1');
        });
        tab.classList.add('is-active', 'cBxrIXbcPeS3kSzdJdhS');
        tab.setAttribute('aria-selected', 'true');
        tab.setAttribute('tabindex', '0');
        renderAiCards(carouselContainer, w.items || []);
      });
      li.appendChild(tab);
      chipsRow.appendChild(li);
    });
    section.appendChild(chipsRow);

    // Horizontal Scrollable Cards Carousel
    const carouselContainer = document.createElement('ol');
    carouselContainer.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_container__9IxUi SkeletonBlock_important__faY0E ym-vibe-feed-ai-carousel';
    carouselContainer.setAttribute('role', 'list');
    section.appendChild(carouselContainer);

    renderAiCards(carouselContainer, currentCatWave.items || []);

    const controls = header.querySelectorAll('.CarouselControls_control__L8t4i');
    const prevBtn = controls[0];
    const nextBtn = controls[1];
    setupCarouselControls(carouselContainer, prevBtn, nextBtn);

    feedContainer.appendChild(section);
  }

  function findSonataCoreFallback() {
    if (typeof window !== 'undefined') {
      if (typeof window.getSonataCore === 'function') {
        const c = window.getSonataCore();
        if (c) return c;
      }
      try {
        const rootEl = document.querySelector('#root') || document.querySelector('#__next') || document.body;
        if (rootEl) {
          const fiberKey = Object.keys(rootEl).find(k => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$'));
          if (fiberKey && rootEl[fiberKey]) {
            let node = rootEl[fiberKey];
            if (node.current) node = node.current;
            const queue = [node];
            while (queue.length > 0) {
              const cur = queue.shift();
              if (!cur) continue;
              const val = cur.memoizedProps?.value;
              if (val && typeof val === 'object' && val.playbackController) return val;
              if (cur.child) {
                let child = cur.child;
                while (child) {
                  queue.push(child);
                  child = child.sibling;
                }
              }
            }
          }
        }
      } catch (e) { }
    }
    return null;
  }

  function getSafeActivePlayer() {
    if (typeof window !== 'undefined' && typeof window.getActivePlayer === 'function') {
      const p = window.getActivePlayer();
      if (p) return p;
    }
    const core = (typeof getSonataCore === 'function' ? getSonataCore() : null) || findSonataCoreFallback();
    const wrapper = core?.playbackController?.activePlayback;
    return (wrapper && wrapper.value) || wrapper || null;
  }

  function isPlayerPlaying(player) {
    if (!player) return false;
    const playingState = player.playbackState?.playingState;
    if (playingState === 'playing') return true;
    const status = player.playbackState?.playerState?.status?.value || player.playbackState?.playerState?.status;
    if (status === 'playing') return true;
    return false;
  }

  function isAlbumCurrentlyPlaying(albumId) {
    if (!albumId) return { isMatch: false, isPlaying: false };
    const player = getSafeActivePlayer();
    if (!player) return { isMatch: false, isPlaying: false };

    // Если сейчас играет ТРЕЙЛЕР, обычный альбом не считается играющим
    const ctx = player.contextController?.currentContext;
    const ctxData = ctx?.contextData || ctx?.data;
    if (ctxData?.trailer === true || player.id === 'TRAILER') {
      return { isMatch: false, isPlaying: false };
    }

    const targetIdStr = String(albumId);
    let isMatch = false;

    // 1. Проверяем контекст
    const ctxType = ctx?.type || ctx?.data?.type || ctxData?.type;
    const ctxMetaId = ctx?.meta?.id || ctx?.data?.meta?.id || ctxData?.meta?.id;

    if (ctxType === 'album' && String(ctxMetaId) === targetIdStr) {
      isMatch = true;
    }

    // 2. Проверяем текущий играющий трек
    if (!isMatch) {
      const track = player.playbackState?.playerState?.track?.value || player.playbackState?.playerState?.track;
      if (track?.albums && Array.isArray(track.albums)) {
        if (track.albums.some(a => String(a.id) === targetIdStr)) {
          isMatch = true;
        }
      }
    }

    return {
      isMatch,
      isPlaying: isMatch && isPlayerPlaying(player)
    };
  }

  function isAlbumTrailerCurrentlyPlaying(albumId) {
    if (!albumId) return false;
    const player = getSafeActivePlayer();
    if (!player) return false;
    const ctx = player.contextController?.currentContext;
    const ctxData = ctx?.contextData || ctx?.data;
    const isTrailer = ctxData?.trailer === true || player.id === 'TRAILER';
    const targetIdStr = String(albumId);
    const metaId = String(ctxData?.meta?.id || ctx?.meta?.id || '');
    return isTrailer && metaId === targetIdStr && isPlayerPlaying(player);
  }

  function isStationCurrentlyPlaying(item) {
    if (!item) return { isMatch: false, isPlaying: false };
    const player = getSafeActivePlayer();
    if (!player) return { isMatch: false, isPlaying: false };

    const ctx = player.contextController?.currentContext;
    if (!ctx) return { isMatch: false, isPlaying: false };

    const ctxType = ctx?.type || ctx?.data?.type;
    const ctxMetaId = String(ctx?.meta?.id || ctx?.data?.meta?.id || '');
    const ctxSeeds = (ctx?.meta?.seeds || ctx?.data?.seeds || []).map(String);

    const targetStationId = item.stationId ? String(item.stationId) : '';
    const itemSeeds = Array.isArray(item.seeds) ? item.seeds.map(String) : [];

    let isMatch = false;
    if (targetStationId && (ctxMetaId === targetStationId || ctxSeeds.includes(targetStationId))) {
      isMatch = true;
    } else if (itemSeeds.length > 0 && ctxSeeds.length > 0) {
      if (itemSeeds.some(s => ctxSeeds.includes(s))) {
        isMatch = true;
      }
    }

    return {
      isMatch,
      isPlaying: isMatch && isPlayerPlaying(player)
    };
  }

  function updateLandingPlaybackIndicators() {
    const feed = document.getElementById('ym-vibe-live-landing-feed');
    if (!feed) return;

    // 1. Карточки Новых релизов
    const releaseButtons = feed.querySelectorAll('.ym-vibe-release-play-btn');
    releaseButtons.forEach(btn => {
      const albumId = btn.getAttribute('data-album-id');
      const state = isAlbumCurrentlyPlaying(albumId);
      const svgUse = btn.querySelector('svg use');

      if (state.isPlaying) {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#pause_filled_m');
          svgUse.setAttribute('href', '/icons/sprite.svg#pause_filled_m');
        }
        btn.setAttribute('aria-label', 'Пауза');
      } else {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#play_filled_m');
          svgUse.setAttribute('href', '/icons/sprite.svg#play_filled_m');
        }
        btn.setAttribute('aria-label', 'Воспроизведение');
      }
    });

    // 2. Карточки "Свели в AI-сет"
    const aiButtons = feed.querySelectorAll('.ym-vibe-ai-card-btn');
    aiButtons.forEach(btn => {
      let itemData = null;
      try {
        itemData = JSON.parse(btn.getAttribute('data-item') || '{}');
      } catch (e) { }

      const state = isStationCurrentlyPlaying(itemData);
      const svgUse = btn.querySelector('.ym-vibe-ai-icon use');
      const title = itemData?.title || '';

      if (state.isPlaying) {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#pause_xxs');
          svgUse.setAttribute('href', '/icons/sprite.svg#pause_xxs');
        }
        btn.setAttribute('aria-label', `Пауза: ${title}`);
      } else {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#play_xxs');
          svgUse.setAttribute('href', '/icons/sprite.svg#play_xxs');
        }
        btn.setAttribute('aria-label', title || 'Воспроизведение');
      }
    });

    // 3. Карточки "Больше открытий" (WAVES)
    const waveButtons = feed.querySelectorAll('.ym-vibe-wave-btn');
    waveButtons.forEach(btn => {
      let itemData = null;
      try {
        itemData = JSON.parse(btn.getAttribute('data-item') || '{}');
      } catch (e) { }

      const state = isStationCurrentlyPlaying(itemData);
      const svgUse = btn.querySelector('.ym-vibe-wave-icon use');
      const title = itemData?.title || '';

      if (state.isPlaying) {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#pause_xxs');
          svgUse.setAttribute('href', '/icons/sprite.svg#pause_xxs');
        }
        btn.setAttribute('aria-label', `Пауза: ${title}`);
      } else {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#play_xxs');
          svgUse.setAttribute('href', '/icons/sprite.svg#play_xxs');
        }
        btn.setAttribute('aria-label', title || 'Воспроизведение');
      }
    });

    // 4. Карточки "В стиле" (IN_STYLE)
    const inStylePlayButtons = feed.querySelectorAll('.ym-vibe-instyle-play-btn');
    inStylePlayButtons.forEach(btn => {
      const albumId = btn.getAttribute('data-album-id');
      const state = isAlbumCurrentlyPlaying(albumId);
      const svgUse = btn.querySelector('svg use');

      if (state.isPlaying) {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#pause_filled_xl');
          svgUse.setAttribute('href', '/icons/sprite.svg#pause_filled_xl');
        }
        btn.setAttribute('aria-label', 'Пауза');
      } else {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', '/icons/sprite.svg#play_filled_xl');
          svgUse.setAttribute('href', '/icons/sprite.svg#play_filled_xl');
        }
        btn.setAttribute('aria-label', 'Воспроизведение');
      }
    });

    // 5. Карточки с трейлером ("В стиле" и "Новые релизы")
    const trailerButtons = feed.querySelectorAll('.AlbumCard_trailerButton__typHh, .NewRelease_trailerButton__OYAW6');
    trailerButtons.forEach(btn => {
      const albumId = btn.getAttribute('data-album-id');
      const isPlaying = isAlbumTrailerCurrentlyPlaying(albumId);
      const svgUse = btn.querySelector('svg use');
      const isSmall = btn.classList.contains('AlbumCard_trailerButton__typHh');
      const trailerIcon = isSmall ? '/icons/sprite.svg#trailer_xxs' : '/icons/sprite.svg#trailer_xs';
      const pauseIcon = isSmall ? '/icons/sprite.svg#pause_xxs' : '/icons/sprite.svg#pause_xs';

      if (isPlaying) {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', pauseIcon);
          svgUse.setAttribute('href', pauseIcon);
        }
        btn.setAttribute('aria-label', 'Пауза: Трейлер');
      } else {
        if (svgUse) {
          svgUse.setAttribute('xlink:href', trailerIcon);
          svgUse.setAttribute('href', trailerIcon);
        }
        btn.setAttribute('aria-label', 'Запустить трейлер');
      }
    });
  }

  async function playVibeStation(item) {
    if (!item) return false;
    const seeds = item.seeds || (item.stationId ? [item.stationId] : []);
    const stationId = item.stationId || (seeds && seeds[0]) || '';
    if (!seeds || seeds.length === 0) {
      console.warn('[BYM Vibe] No seeds found for station:', item);
      return false;
    }

    console.log('[BYM Vibe] Playing station:', item.title || stationId, seeds);

    const core = (typeof getSonataCore === 'function' ? getSonataCore() : null) ||
                 (typeof window.getSonataCore === 'function' ? window.getSonataCore() : null) ||
                 findSonataCoreFallback();
    const player = getSafeActivePlayer();

    // 1. Прямой запуск через Sonata Core factory + player.playContext (100% нативный способ)
    if (core?.factory?.createContext && player?.playContext) {
      try {
        const ctx = core.factory.createContext({
          data: {
            type: 'vibe',
            meta: { id: stationId },
            seeds: seeds,
            from: 'web-landing-discovery_block-sets_by_waves-radio-default',
            includeTracksInResponse: true,
            interactive: true
          }
        });
        console.log('[BYM Vibe] Created Vibe context:', ctx);
        await player.playContext({ context: ctx, loadContextMeta: true });
        console.log('[BYM Vibe] Station started successfully via core.factory.createContext + player.playContext!');
        return true;
      } catch (err) {
        console.error('[BYM Vibe] Error in createContext / playContext:', err);
      }
    }

    // 2. Попытка через queueController
    try {
      const qc = player?.queueController;
      if (qc) {
        if (typeof qc.playRadio === 'function') {
          await qc.playRadio({ seeds, autoPlay: true });
          return true;
        }
        if (typeof qc.setRadioQueue === 'function') {
          await qc.setRadioQueue({ seeds, autoPlay: true });
          return true;
        }
      }
    } catch (qcErr) {
      console.warn('[BYM Vibe] queueController radio error:', qcErr);
    }

    // 3. Fallback через postMessage для изолированных контекстов
    try {
      window.postMessage({
        type: 'BYM_PLAY_VIBE_STATION',
        stationId: stationId,
        seeds: seeds,
        title: item.title
      }, '*');
      return true;
    } catch (postErr) {
      console.warn('[BYM Vibe] postMessage error:', postErr);
    }

    return false;
  }

  function renderAiCards(container, items) {
    container.replaceChildren();
    if (!items || items.length === 0) return;

    items.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'VJ9IexhAEuYSCyGiMfN4 VibesCarousel_item__AupL0 VibesCarousel_important__JkzUC';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p qU2apWBO1yyEK0lZ3lPO VibeButton_root___i3R5 VibeButton_button__tXFAm ym-vibe-ai-card-btn';
      btn.setAttribute('data-intersection-property-id', `_r_dc${idx}_`);
      btn.setAttribute('aria-live', 'off');
      btn.setAttribute('aria-busy', 'false');
      btn.setAttribute('data-item', JSON.stringify({
        stationId: item.stationId || '',
        seeds: item.seeds || [],
        title: item.title || ''
      }));

      const bgImg400 = formatYandexImg(item.backgroundImageUrl, 'm400x400');
      const bgImg800 = formatYandexImg(item.backgroundImageUrl, 'm800x800');
      const avgColor = (item.colors && item.colors.average) || '#6b65a9';
      const textColor = (item.colors && (item.colors.waveText || item.colors.text)) || '#c8c1ff';

      btn.style.setProperty('--vibe-button-background', avgColor);
      btn.style.setProperty('--vibe-button-text-color', textColor);

      btn.innerHTML = `
        ${bgImg400 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG VibeButton_image__GOwKJ" alt="" loading="eager" srcset="${escapeHtml(bgImg400)}, ${escapeHtml(bgImg800 || bgImg400)} 2x" src="${escapeHtml(bgImg400)}">` : ''}
        <span class="VibeButton_textContainer__j9nOW">
          <span class="_MWOVuZRvUQdXKTMcOPx _oBLf5gprWsKjCw4Ce58 Vi7Rd0SZWqD17F0872TB VibeButton_subtitle__MQ_Ca">${escapeHtml(item.header || 'Сет Моей волны под настроение')}</span>
          <span class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 jMyoZB5J9iZbzJmWOrF0 Ai2iRN9elHpk_u5splD6 Vi7Rd0SZWqD17F0872TB VibeButton_title__sLC0I" style="-webkit-line-clamp: 2;">
            <svg class="VibeButton_icon__KIv7n l3tE1hAMmBj2aoPPwU08 ym-vibe-ai-icon" viewBox="0 0 16 16" width="12" height="12" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#play_xxs"></use>
            </svg>
            ${escapeHtml(item.title || '')}
          </span>
        </span>
      `;

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const st = isStationCurrentlyPlaying(item);
        const p = getSafeActivePlayer();
        if (st.isMatch) {
          if (typeof p?.togglePause === 'function') {
            p.togglePause();
          } else if (st.isPlaying && typeof p?.pause === 'function') {
            p.pause();
          } else if (!st.isPlaying && (typeof p?.resume === 'function' || typeof p?.play === 'function')) {
            if (p.resume) p.resume();
            else p.play();
          } else {
            await playVibeStation(item);
          }
        } else {
          await playVibeStation(item);
        }
        updateLandingPlaybackIndicators();
        setTimeout(updateLandingPlaybackIndicators, 60);
        setTimeout(updateLandingPlaybackIndicators, 250);
        setTimeout(updateLandingPlaybackIndicators, 600);
      });

      li.appendChild(btn);
      container.appendChild(li);
    });

    updateLandingPlaybackIndicators();
  }

  function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return { r: 32, g: 32, b: 32 };
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6) return { r: 32, g: 32, b: 32 };
    return {
      r: parseInt(h.substring(0, 2), 16) || 0,
      g: parseInt(h.substring(2, 4), 16) || 0,
      b: parseInt(h.substring(4, 6), 16) || 0
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 1000) / 10,
      l: Math.round(l * 1000) / 10
    };
  }

  async function playAlbumContext(albumId) {
    if (!albumId) return false;
    const core = (typeof getSonataCore === 'function' ? getSonataCore() : null) ||
                 (typeof window.getSonataCore === 'function' ? window.getSonataCore() : null) ||
                 findSonataCoreFallback();
    const player = getSafeActivePlayer();

    if (core?.factory?.createContext && player?.playContext) {
      try {
        const ctx = core.factory.createContext({
          data: {
            type: 'album',
            meta: { id: String(albumId) },
            from: 'web-landing-discovery_block-new_releases-default',
            includeTracksInResponse: true,
            interactive: true
          }
        });
        await player.playContext({ context: ctx, loadContextMeta: true });
        return true;
      } catch (err) {
        console.warn('[BYM] Error playing album context via Sonata:', err);
      }
    }
    return false;
  }

  let cachedRootModel = null;

  function getYmRootModel() {
    if (cachedRootModel?.isRootModel || cachedRootModel?.pinsCollection) {
      return cachedRootModel;
    }

    if (window.__ym_root_model?.isRootModel || window.__ym_root_model?.pinsCollection) {
      cachedRootModel = window.__ym_root_model;
      return cachedRootModel;
    }

    // 1. Поиск вверх по Fiber от любого элемента страницы
    const anchor = document.querySelector('nav') ||
                   document.querySelector('header') ||
                   document.querySelector('[class*="PlayerBar"]') ||
                   document.body.firstElementChild;
    if (anchor) {
      const fiberKey = Object.keys(anchor).find(k => k.startsWith('__reactFiber$'));
      let cur = anchor[fiberKey];
      while (cur) {
        const val = cur.memoizedProps?.value;
        if (val?.isRootModel || val?.pinsCollection) {
          cachedRootModel = val;
          window.__ym_root_model = val;
          return val;
        }
        cur = cur.return;
      }
    }

    // 2. Поиск по дереву от #root
    const rootEl = document.querySelector('#root');
    const rootKey = rootEl ? Object.keys(rootEl).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$')) : null;
    if (rootEl && rootKey) {
      const stack = [rootEl[rootKey]];
      let count = 0;
      while (stack.length > 0 && count < 2500) {
        const cur = stack.pop();
        count++;
        if (!cur) continue;
        const val = cur.memoizedProps?.value;
        if (val?.isRootModel || val?.pinsCollection) {
          cachedRootModel = val;
          window.__ym_root_model = val;
          return val;
        }
        if (cur.child) stack.push(cur.child);
        if (cur.sibling) stack.push(cur.sibling);
      }
    }

    return null;
  }

  function getPinsCollection() {
    const root = getYmRootModel();
    return root?.pinsCollection || null;
  }

  function getTrailerService() {
    const root = getYmRootModel();
    if (root?.trailer && typeof root.trailer.openAlbumTrailer === 'function') {
      return root.trailer;
    }
    return null;
  }

  function isAlbumPinned(albumId) {
    if (!albumId) return false;
    const pins = getPinsCollection();
    if (!pins) return false;
    const idStr = String(albumId);
    const pinKey = `album_item${albumId}`;

    try {
      if (typeof pins.isPinned === 'function') {
        if (pins.isPinned(pinKey)) return true;
      }
    } catch (_) {}

    try {
      if (pins.index?.has && pins.index.has(pinKey)) {
        return true;
      }
    } catch (_) {}

    try {
      const items = Array.from(pins.items || []);
      return items.some(it => {
        const itId = it?.data?.id || it?.id || it?.entityId || it?.album?.id || it?.meta?.id;
        return String(itId) === idStr;
      });
    } catch (_) {}

    return false;
  }

  async function playAlbumTrailer(albumId) {
    if (!albumId) return false;
    const targetIdStr = String(albumId);

    // 1. Приоритетный путь: нативный сервис трейлера Яндекс Музыки (запуск трейлера + открытие шторки справа)
    try {
      const svc = getTrailerService();
      if (svc && typeof svc.openAlbumTrailer === 'function') {
        svc.openAlbumTrailer(targetIdStr);
        return true;
      }
    } catch (err) {
      console.warn('[BYM] Error playing trailer via native service:', err);
    }

    // 2. Фоллбек путь: воспроизведение контекста трейлера через Sonata Core
    const core = (typeof getSonataCore === 'function' ? getSonataCore() : null) ||
                 (typeof window.getSonataCore === 'function' ? window.getSonataCore() : null) ||
                 findSonataCoreFallback();
    const player = getSafeActivePlayer();

    if (core?.factory?.createContext && player?.playContext) {
      try {
        const ctx = core.factory.createContext({
          data: {
            type: 'album',
            trailer: true,
            meta: { id: targetIdStr },
            from: 'web-album-trailer-default',
            includeTracksInResponse: true,
            interactive: true
          }
        });
        await player.playContext({ context: ctx, loadContextMeta: true });
        return true;
      } catch (err) {
        console.warn('[BYM] Error playing album trailer via Sonata:', err);
      }
    }
    return false;
  }

  async function togglePinAlbum(albumId, shouldBePinned) {
    if (!albumId) return false;
    const numId = Number(albumId) || albumId;
    const pins = getPinsCollection();
    const isCurrentlyPinned = typeof shouldBePinned === 'boolean' ? !shouldBePinned : isAlbumPinned(albumId);
    const method = isCurrentlyPinned ? 'DELETE' : 'PUT';

    // Для добавления: пробуем нативный метод pinsCollection
    if (!isCurrentlyPinned && pins && typeof pins.toggleAlbumPin === 'function') {
      try {
        await pins.toggleAlbumPin({ id: numId });
        return true;
      } catch (err) {
        console.warn('[BYM] Native pin error, fallback to HTTP:', err);
      }
    }

    // Для удаления (DELETE) или фоллбека: точный HTTP REST-запрос
    try {
      await fetch('https://api.music.yandex.ru/pin/album', {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: numId }),
        credentials: 'include'
      });

      // Синхронизируем стор закрепов Яндекса, чтобы Navbar сразу обновился
      if (pins && typeof pins.getData === 'function') {
        pins.getData().catch(() => {});
      }
      return true;
    } catch (err) {
      console.warn('[BYM] Pin HTTP error:', err);
      return false;
    }
  }

  async function toggleLikeAlbum(albumId, isCurrentlyLiked) {
    if (!albumId) return false;
    const uid = window.__ym_user_id || '857786338';
    const action = isCurrentlyLiked ? 'remove' : 'add';
    try {
      await fetch(`https://api.music.yandex.ru/users/${uid}/likes/albums/${action}?album-id=${albumId}`, {
        method: 'POST',
        credentials: 'include'
      });
      fetch('https://api.music.yandex.ru/collection/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likedAlbums: { revision: Date.now() } }),
        credentials: 'include'
      }).catch(() => {});
      return true;
    } catch (err) {
      console.warn('[BYM] Like error:', err);
      return false;
    }
  }

  let activeContextMenuEl = null;

  function closeAlbumContextMenu() {
    if (activeContextMenuEl) {
      activeContextMenuEl.style.opacity = '0';
      activeContextMenuEl.style.transform = 'scale(0.96)';
      const elToRemove = activeContextMenuEl;
      setTimeout(() => {
        if (elToRemove && elToRemove.parentNode) elToRemove.remove();
      }, 150);
      activeContextMenuEl = null;
    }
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.ym-native-album-menu') && !e.target.closest('.AlbumCard_menuButton__pxkA6')) {
      closeAlbumContextMenu();
    }
  });

  window.addEventListener('scroll', () => {
    closeAlbumContextMenu();
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAlbumContextMenu();
    }
  });

  function showMenuToast(message) {
    let toast = document.querySelector('.ym-menu-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'ym-menu-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }

  function openAlbumContextMenu(buttonEl, album, item) {
    closeAlbumContextMenu();

    const card = buttonEl.closest('.AlbumCard_root__vP6k4');
    const pinBtn = card?.querySelector('.AlbumCard_pinButton__Mdi_E');
    const isPinned = pinBtn ? pinBtn.getAttribute('aria-pressed') === 'true' : isAlbumPinned(album.id);
    const isLiked = Boolean(album._isLiked);

    const menu = document.createElement('div');
    menu.className = 's7_MO4NdsYs7nPQALD8W ym-native-album-menu';
    menu.setAttribute('tabindex', '0');
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-orientation', 'vertical');

    menu.innerHTML = `
      <div class="ggP7WX2_erziDHFOo32s">
        <!-- 1. Закрепить -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="pin">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#${isPinned ? 'pin_filled_xxs' : 'pin_xxs'}"></use>
            </svg>
            ${isPinned ? 'Открепить' : 'Закрепить'}
          </span>
        </button>

        <!-- 2. Нравится -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitemcheckbox" aria-checked="${isLiked ? 'true' : 'false'}" tabindex="-1" data-action="like">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#${isLiked ? 'liked_xxs' : 'dislike_xxs'}"></use>
            </svg>
            ${isLiked ? 'Не нравится' : 'Нравится'}
          </span>
        </button>

        <!-- 3. Трейлер -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="trailer">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#trailer_xxs"></use>
            </svg>
            Трейлер
          </span>
        </button>

        <!-- 4. Моя волна по альбому -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="wave">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#vibe_xxs"></use>
            </svg>
            Моя волна по альбому
          </span>
        </button>

        <!-- 5. Поделиться (с нативным подменю) -->
        <div class="ym-native-share-container" style="position: relative;">
          <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 j1jXIVckFgZECecFzZMe qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-nested="" aria-expanded="false" aria-haspopup="menu" data-action="share">
            <span class="JjlbHZ4FaP9EAcR_1DxF">
              <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
                <use xlink:href="/icons/sprite.svg#share_xxs"></use>
              </svg>
              Поделиться
              <svg class="KNLFZ4Jd_xKFInxHox4i l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true" style="margin-left: auto;">
                <use xlink:href="/icons/sprite.svg#arrowRight_xxs"></use>
              </svg>
            </span>
          </button>
          <div class="s7_MO4NdsYs7nPQALD8W ym-native-sub-menu" role="menu" style="display: none; position: absolute; left: 100%; top: -6px; min-width: 190px; z-index: 10001;">
            <div class="ggP7WX2_erziDHFOo32s">
              <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="copy-link">
                <span class="JjlbHZ4FaP9EAcR_1DxF">Скопировать ссылку</span>
              </button>
              <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="copy-html">
                <span class="JjlbHZ4FaP9EAcR_1DxF">HTML-код</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(menu);
    activeContextMenuEl = menu;

    const rect = buttonEl.getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = 240;

    let left = rect.right - menuWidth;
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;

    let top = rect.bottom + 6;
    if (top + menuHeight > window.innerHeight - 10) {
      top = rect.top - menuHeight - 6;
    }

    menu.style.position = 'fixed';
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    menu.style.zIndex = '9999999';
    menu.style.opacity = '0';
    menu.style.transform = 'scale(0.96)';
    menu.style.transformOrigin = 'top right';
    menu.style.transition = 'opacity 150ms ease, transform 150ms cubic-bezier(0.16, 1, 0.3, 1)';

    requestAnimationFrame(() => {
      menu.style.opacity = '1';
      menu.style.transform = 'scale(1)';
    });

    // Обработчик подменю шаринга (наведение мыши)
    const shareContainer = menu.querySelector('.ym-native-share-container');
    const subMenu = menu.querySelector('.ym-native-sub-menu');
    if (shareContainer && subMenu) {
      shareContainer.addEventListener('mouseenter', () => {
        // Проверяем, помещается ли справа
        const containerRect = shareContainer.getBoundingClientRect();
        if (containerRect.right + 200 > window.innerWidth) {
          subMenu.style.left = 'auto';
          subMenu.style.right = '100%';
        } else {
          subMenu.style.left = '100%';
          subMenu.style.right = 'auto';
        }
        subMenu.style.display = 'block';
      });
      shareContainer.addEventListener('mouseleave', () => {
        subMenu.style.display = 'none';
      });
    }

    menu.querySelectorAll('button[data-action]').forEach(itemBtn => {
      itemBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = itemBtn.getAttribute('data-action');
        if (action === 'share') return;

        closeAlbumContextMenu();

        if (action === 'pin') {
          if (pinBtn) pinBtn.click();
          else togglePinAlbum(album.id, !isPinned);
        } else if (action === 'like') {
          const nextLike = !isLiked;
          album._isLiked = nextLike;
          await toggleLikeAlbum(album.id, isLiked);
          showMenuToast(nextLike ? 'Добавлено в коллекцию' : 'Удалено из коллекции');
        } else if (action === 'trailer') {
          await playAlbumTrailer(album.id);
          updateLandingPlaybackIndicators();
          setTimeout(updateLandingPlaybackIndicators, 60);
          setTimeout(updateLandingPlaybackIndicators, 250);
        } else if (action === 'wave') {
          await playVibeStation({
            stationId: `album:${album.id}`,
            seeds: [`album:${album.id}`],
            title: album.title ? `Моя волна: ${album.title}` : 'Моя волна по альбому'
          });
        } else if (action === 'copy-link') {
          const link = `https://music.yandex.ru/album/${album.id}`;
          try {
            await navigator.clipboard.writeText(link);
            showMenuToast('Ссылка скопирована');
          } catch (_) {
            showMenuToast('Не удалось скопировать ссылку');
          }
        } else if (action === 'copy-html') {
          const iframeCode = `<iframe frameborder="0" style="border:none;width:100%;height:450px;" width="100%" height="450" src="https://music.yandex.ru/iframe/#album/${album.id}"></iframe>`;
          try {
            await navigator.clipboard.writeText(iframeCode);
            showMenuToast('HTML-код скопирован');
          } catch (_) {
            showMenuToast('Не удалось скопировать код');
          }
        }
      });
    });
  }

  function renderMoreDiscoveriesSection(feedContainer, wavesData) {
    if (!wavesData) return;
    const waves = wavesData.result?.waves || wavesData.waves || [];
    if (!Array.isArray(waves) || waves.length === 0) return;

    const section = document.createElement('section');
    section.className = 'Vibes_root__Bk6PF ym-vibe-feed-section';
    section.setAttribute('data-intersection-property-id', 'WAVES');
    section.setAttribute('data-test-id', 'WAVES');

    // Header with Title & Carousel Arrows
    const header = document.createElement('div');
    header.className = 'BlockHeader_root__j3mbg SkeletonBlock_headerContainer__fl8EX Vibes_header__RcW5b Vibes_important__Vew_4 ym-vibe-feed-header';
    header.innerHTML = `
      <div class="BlockHeader_start__ZrGP5">
        <div class="BlockHeader_textContainer___2wn9">
          <div class="BlockHeader_title__5xlx6">
            <h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww BlockHeader_heading__4iqvS">Больше открытий</h2>
          </div>
        </div>
      </div>
      <div class="CarouselControls_root__E_hwc Vibes_controls__bUp2H">
        <button class="cpeagBA1_PblpJn8Xgtv pnM3iSP9keZOELI2oohr uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO undefined CarouselControls_control__L8t4i" type="button" tabindex="-1" aria-hidden="true" disabled="" data-disabled="true" aria-live="off" aria-busy="false">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowLeft_xxs"></use>
            </svg>
          </span>
        </button>
        <button class="cpeagBA1_PblpJn8Xgtv pnM3iSP9keZOELI2oohr uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p i5WuBm5mfG0mflk_1jH_ eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO undefined CarouselControls_control__L8t4i" type="button" tabindex="-1" aria-hidden="true" aria-live="off" aria-busy="false">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowRight_xxs"></use>
            </svg>
          </span>
        </button>
      </div>
    `;
    section.appendChild(header);

    const chipsRow = document.createElement('ol');
    chipsRow.className = 'TjoCDDIf5PrIGU4w8G6Z TabCarousel_root__8DoRy SkeletonBlock_container__9IxUi SkeletonBlock_important__faY0E Vibes_tabCarousel__bSvp0 Vibes_important__Vew_4 ym-vibe-filter-chips-row';
    chipsRow.setAttribute('role', 'tablist');

    if (!activeWavesCategory || !waves.some(w => w.id === activeWavesCategory)) {
      activeWavesCategory = waves[0].id;
    }
    const currentCat = waves.find(w => w.id === activeWavesCategory) || waves[0];

    waves.forEach((w, idx) => {
      const li = document.createElement('li');
      li.className = 'd50IqTKJZhJIMd5aTqAn ym-vibe-filter-chip-item';
      const isSelected = w.id === activeWavesCategory;
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.id = `_r_waves_${idx}-tab`;
      tab.setAttribute('aria-controls', `_r_waves_${idx}-tabpanel`);
      tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      tab.setAttribute('aria-label', w.title || w.id);
      tab.setAttribute('aria-live', 'off');
      tab.setAttribute('aria-busy', 'false');
      tab.setAttribute('tabindex', isSelected ? '0' : '-1');
      tab.className = `ym-vibe-filter-chip-btn ${isSelected ? 'is-active cBxrIXbcPeS3kSzdJdhS ' : ''}cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 qU2apWBO1yyEK0lZ3lPO Yqh9GVOagMQpvymD877t Tab_root__LUukY Tab_tab_size_m__c7tVg Vibes_tab__uOfqW Vibes_important__Vew_4`;
      tab.innerHTML = `
        <span class="Tab_description__p1fTO">
          <div title="${escapeHtml(w.title || w.id)}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA Vi7Rd0SZWqD17F0872TB Tab_title__hAYZk" style="-webkit-line-clamp: 1;">${escapeHtml(w.title || w.id)}</div>
        </span>
      `;
      tab.addEventListener('click', () => {
        activeWavesCategory = w.id;
        chipsRow.querySelectorAll('.ym-vibe-filter-chip-btn').forEach(t => {
          t.classList.remove('is-active', 'cBxrIXbcPeS3kSzdJdhS');
          t.setAttribute('aria-selected', 'false');
          t.setAttribute('tabindex', '-1');
        });
        tab.classList.add('is-active', 'cBxrIXbcPeS3kSzdJdhS');
        tab.setAttribute('aria-selected', 'true');
        tab.setAttribute('tabindex', '0');
        renderWaveCards(carouselContainer, w.items || []);
        carouselContainer.scrollLeft = 0;
      });
      li.appendChild(tab);
      chipsRow.appendChild(li);
    });
    section.appendChild(chipsRow);

    const tabPanel = document.createElement('div');
    tabPanel.className = 'oSPcFawW7MIQ9ZTANH9N';
    tabPanel.setAttribute('role', 'tabpanel');

    const carouselContainer = document.createElement('ol');
    carouselContainer.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_container__9IxUi SkeletonBlock_important__faY0E ym-vibe-feed-waves-carousel';
    carouselContainer.setAttribute('role', 'list');
    tabPanel.appendChild(carouselContainer);
    section.appendChild(tabPanel);

    renderWaveCards(carouselContainer, currentCat.items || []);

    const controls = header.querySelectorAll('.CarouselControls_control__L8t4i');
    setupCarouselControls(carouselContainer, controls[0], controls[1]);

    feedContainer.appendChild(section);
  }

  function renderWaveCards(container, items) {
    container.replaceChildren();
    if (!items || items.length === 0) return;

    items.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'VJ9IexhAEuYSCyGiMfN4 VibesCarousel_item__AupL0 VibesCarousel_important__JkzUC';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p qU2apWBO1yyEK0lZ3lPO VibeButton_root___i3R5 VibeButton_button__tXFAm ym-vibe-wave-btn';
      btn.setAttribute('data-intersection-property-id', `_r_wave_${idx}_`);
      btn.setAttribute('aria-live', 'off');
      btn.setAttribute('aria-busy', 'false');
      btn.setAttribute('data-item', JSON.stringify({
        stationId: item.stationId || '',
        seeds: item.seeds || [],
        title: item.title || ''
      }));

      const bgImg400 = formatYandexImg(item.backgroundImageUrl, 'm400x400');
      const bgImg800 = formatYandexImg(item.backgroundImageUrl, 'm800x800');
      const avgColor = (item.colors && item.colors.average) || '#6b65a9';
      const textColor = (item.colors && (item.colors.waveText || item.colors.text)) || '#c8c1ff';

      btn.style.setProperty('--vibe-button-background', avgColor);
      btn.style.setProperty('--vibe-button-text-color', textColor);

      const isLong = item.title && item.title.length > 25;

      btn.innerHTML = `
        ${bgImg400 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG VibeButton_image__GOwKJ" alt="" loading="eager" srcset="${escapeHtml(bgImg400)}, ${escapeHtml(bgImg800 || bgImg400)} 2x" src="${escapeHtml(bgImg400)}">` : ''}
        <span class="VibeButton_textContainer__j9nOW">
          <span class="_MWOVuZRvUQdXKTMcOPx _oBLf5gprWsKjCw4Ce58 Vi7Rd0SZWqD17F0872TB VibeButton_subtitle__MQ_Ca">${escapeHtml(item.header || 'Моя волна')}</span>
          <span class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 jMyoZB5J9iZbzJmWOrF0 Ai2iRN9elHpk_u5splD6 Vi7Rd0SZWqD17F0872TB VibeButton_title__sLC0I ${isLong ? 'VibeButton_title_long__gSVM5' : ''}" style="-webkit-line-clamp: 2;">
            <svg class="VibeButton_icon__KIv7n l3tE1hAMmBj2aoPPwU08 ym-vibe-wave-icon" viewBox="0 0 16 16" width="12" height="12" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#play_xxs"></use>
            </svg>
            ${escapeHtml(item.title || '')}
          </span>
        </span>
      `;

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const st = isStationCurrentlyPlaying(item);
        const p = getSafeActivePlayer();
        if (st.isMatch) {
          if (typeof p?.togglePause === 'function') {
            p.togglePause();
          } else if (st.isPlaying && typeof p?.pause === 'function') {
            p.pause();
          } else if (!st.isPlaying && (typeof p?.resume === 'function' || typeof p?.play === 'function')) {
            if (p.resume) p.resume();
            else p.play();
          } else {
            await playVibeStation(item);
          }
        } else {
          await playVibeStation(item);
        }
        updateLandingPlaybackIndicators();
        setTimeout(updateLandingPlaybackIndicators, 60);
        setTimeout(updateLandingPlaybackIndicators, 250);
        setTimeout(updateLandingPlaybackIndicators, 600);
      });

      li.appendChild(btn);
      container.appendChild(li);
    });

    updateLandingPlaybackIndicators();
  }

  function renderInStyleSection(feedContainer, inStyleData) {
    if (!inStyleData) return;
    const inStyleTabs = inStyleData.result?.inStyleTabs || inStyleData.inStyleTabs || [];
    if (!Array.isArray(inStyleTabs) || inStyleTabs.length === 0) return;

    const section = document.createElement('section');
    section.className = 'InStyle_root__ZsdXE ym-vibe-feed-section';
    section.setAttribute('data-intersection-property-id', 'IN_STYLE');
    section.setAttribute('data-test-id', 'IN_STYLE');

    // Header with Title & Carousel Arrows
    const header = document.createElement('div');
    header.className = 'BlockHeader_root__j3mbg SkeletonBlock_headerContainer__fl8EX InStyle_header__C2AWP InStyle_important__msPsl ym-vibe-feed-header';
    header.innerHTML = `
      <div class="BlockHeader_start__ZrGP5">
        <div class="BlockHeader_textContainer___2wn9">
          <div class="BlockHeader_title__5xlx6">
            <h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww BlockHeader_heading__4iqvS">В стиле</h2>
          </div>
        </div>
      </div>
      <div class="CarouselControls_root__E_hwc InStyle_controls__mGqhj">
        <button class="cpeagBA1_PblpJn8Xgtv pnM3iSP9keZOELI2oohr uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO undefined CarouselControls_control__L8t4i" type="button" tabindex="-1" aria-hidden="true" disabled="" data-disabled="true" aria-live="off" aria-busy="false">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowLeft_xxs"></use>
            </svg>
          </span>
        </button>
        <button class="cpeagBA1_PblpJn8Xgtv pnM3iSP9keZOELI2oohr uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p i5WuBm5mfG0mflk_1jH_ eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO undefined CarouselControls_control__L8t4i" type="button" tabindex="-1" aria-hidden="true" aria-live="off" aria-busy="false">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowRight_xxs"></use>
            </svg>
          </span>
        </button>
      </div>
    `;
    section.appendChild(header);

    const chipsRow = document.createElement('ol');
    chipsRow.className = 'TjoCDDIf5PrIGU4w8G6Z TabCarousel_root__8DoRy SkeletonBlock_container__9IxUi SkeletonBlock_important__faY0E InStyle_tabCarousel__SXqBO InStyle_important__msPsl ym-vibe-filter-chips-row';
    chipsRow.setAttribute('role', 'tablist');

    if (!activeInStyleArtistId || !inStyleTabs.some(t => String(t.id) === String(activeInStyleArtistId))) {
      activeInStyleArtistId = inStyleTabs[0].id;
    }
    const currentArtistTab = inStyleTabs.find(t => String(t.id) === String(activeInStyleArtistId)) || inStyleTabs[0];

    inStyleTabs.forEach((tab, idx) => {
      const li = document.createElement('li');
      li.className = 'd50IqTKJZhJIMd5aTqAn ym-vibe-filter-chip-item';
      const isSelected = String(tab.id) === String(activeInStyleArtistId);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.id = `_r_instyle_${idx}-tab`;
      btn.setAttribute('aria-controls', `_r_instyle_${idx}-tabpanel`);
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      btn.setAttribute('aria-label', tab.title || '');
      btn.setAttribute('aria-live', 'off');
      btn.setAttribute('aria-busy', 'false');
      btn.setAttribute('tabindex', isSelected ? '0' : '-1');
      btn.className = `ym-vibe-filter-chip-btn ${isSelected ? 'cBxrIXbcPeS3kSzdJdhS is-active ' : ''}cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 qU2apWBO1yyEK0lZ3lPO Yqh9GVOagMQpvymD877t Tab_root__LUukY Tab_tab_size_s__zXitP Tab_tab_withCovers__dJzMH InStyle_tab__DeURY InStyle_important__msPsl`;

      const cover50 = formatYandexImg(tab.cover?.uri, '50x50');
      const cover100 = formatYandexImg(tab.cover?.uri, '100x100');

      btn.innerHTML = `
        ${cover50 ? `<span class="Tab_covers__cvYeI"><img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG Tab_image__Hen3_" alt="" loading="eager" srcset="${escapeHtml(cover50)}, ${escapeHtml(cover100)} 2x" src="${escapeHtml(cover50)}"></span>` : ''}
        <span class="Tab_description__p1fTO">
          <div title="${escapeHtml(tab.title || '')}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA Vi7Rd0SZWqD17F0872TB Tab_title__hAYZk" style="-webkit-line-clamp: 1;">${escapeHtml(tab.title || '')}</div>
        </span>
      `;
      btn.addEventListener('click', () => {
        activeInStyleArtistId = tab.id;
        chipsRow.querySelectorAll('.ym-vibe-filter-chip-btn').forEach(t => {
          t.classList.remove('is-active', 'cBxrIXbcPeS3kSzdJdhS');
          t.setAttribute('aria-selected', 'false');
          t.setAttribute('tabindex', '-1');
        });
        btn.classList.add('is-active', 'cBxrIXbcPeS3kSzdJdhS');
        btn.setAttribute('aria-selected', 'true');
        btn.setAttribute('tabindex', '0');
        renderInStyleCards(carouselContainer, tab.items || []);
        carouselContainer.scrollLeft = 0;
      });
      li.appendChild(btn);
      chipsRow.appendChild(li);
    });
    section.appendChild(chipsRow);

    const tabPanel = document.createElement('div');
    tabPanel.className = 'oSPcFawW7MIQ9ZTANH9N';
    tabPanel.setAttribute('role', 'tabpanel');

    const carouselContainer = document.createElement('ol');
    carouselContainer.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_container__9IxUi SkeletonBlock_important__faY0E ym-vibe-feed-instyle-carousel';
    carouselContainer.setAttribute('role', 'list');
    tabPanel.appendChild(carouselContainer);
    section.appendChild(tabPanel);

    renderInStyleCards(carouselContainer, currentArtistTab.items || []);

    const controls = header.querySelectorAll('.CarouselControls_control__L8t4i');
    setupCarouselControls(carouselContainer, controls[0], controls[1]);

    feedContainer.appendChild(section);
  }

  function renderInStyleCards(container, items) {
    container.replaceChildren();
    if (!items || items.length === 0) return;

    items.forEach((item, idx) => {
      const album = item.album || {};
      if (!album.id) return;

      const albumTitle = album.title || '';
      const albumCover200 = formatYandexImg(album.cover?.uri, '200x200');
      const albumCover400 = formatYandexImg(album.cover?.uri, '400x400');
      const artists = item.artists || album.artists || [];
      const isExplicit = album.contentWarning === 'explicit';

      const li = document.createElement('li');
      li.className = 'VJ9IexhAEuYSCyGiMfN4 InStyle_item__e5_Qz InStyle_important__msPsl';

      const card = document.createElement('div');
      card.className = 'laBJlJAaqEVS0i_4Ot3l AlbumCard_root__vP6k4';
      card.setAttribute('aria-label', `Альбом ${albumTitle}`);

      const artistsHtml = artists.map(art => `
        <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB AlbumCard_artistLink__uPR_2 ym-instyle-artist-link" aria-label="Артист ${escapeHtml(art.name || '')}" href="/artist/${art.id}">
          <span class="_MWOVuZRvUQdXKTMcOPx mxSPe5xpZnie9gpIqacd _3_Mxw7Si7j2g4kWjlpR">${escapeHtml(art.name || '')}</span>
        </a>
      `).join(', ');

      const isPinnedInitially = isAlbumPinned(album.id);
      const initialPinIcon = isPinnedInitially ? '/icons/sprite.svg#pin_filled_xxs' : '/icons/sprite.svg#pin_xxs';

      card.innerHTML = `
        <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB eaYyesBmJL_NbkgoYR1c AlbumCard_srTitleLink__TxBNz ym-instyle-album-link" href="/album/${album.id}">${escapeHtml(albumTitle)}</a>
        <div>
          <div class="qaIScXjx1qyXuaIHXQIo _7gw1qGE6BeUAdSMbhRx ZcpulvHgF_wsgzB8Hye9 gtfPudKIIbfkwmuOBzwI AlbumCard_cover__zXmdl">
            <div class="AlbumCard_coverBlock__94ZzY">
              <img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG AlbumCard_image__Mm55s" alt="Альбом ${escapeHtml(albumTitle)}" loading="eager" aria-hidden="true" srcset="${escapeHtml(albumCover200)}, ${escapeHtml(albumCover400)} 2x" src="${escapeHtml(albumCover200)}">
              <div class="KL50tMDvfAdw_9MzcVht PBhQ1krUFiAybu_BS2YE cSCPJSa6Lx6OnpM4ljX9 AlbumCard_controls__yuO40">
                <div class="P6gOmyFtXyetUz0dqhF3">
                  <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 WtFdWDF44egSVM_YiMUX qU2apWBO1yyEK0lZ3lPO ${isPinnedInitially ? 'PinButton_animation_scaled__Aj6LA' : 'PinButton_animation_unscaled__QM3sC'} AlbumCard_pinButton__Mdi_E AlbumCard_control__qx7Xh" type="button" aria-label="${isPinnedInitially ? 'Открепить' : 'Закрепить'}" aria-pressed="${isPinnedInitially ? 'true' : 'false'}" aria-live="off" aria-busy="false" data-album-id="${album.id}">
                    <span class="JjlbHZ4FaP9EAcR_1DxF">
                      <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
                        <use xlink:href="${initialPinIcon}"></use>
                      </svg>
                    </span>
                  </button>
                </div>
                <div class="bL0wE1Bui8zpIZbvMVL3">
                  <div class="RvWjZle1erRBXzJEF9Zj">
                    <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 WtFdWDF44egSVM_YiMUX qU2apWBO1yyEK0lZ3lPO WsKeF73pWotx9W1tWdYY AlbumCard_trailerButton__typHh AlbumCard_control__qx7Xh" type="button" aria-label="Запустить трейлер" data-album-id="${album.id}" aria-live="off" aria-busy="false">
                      <span class="JjlbHZ4FaP9EAcR_1DxF">
                        <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
                          <use xlink:href="/icons/sprite.svg#trailer_xxs"></use>
                        </svg>
                      </span>
                    </button>
                    <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p undefined qU2apWBO1yyEK0lZ3lPO WsKeF73pWotx9W1tWdYY AlbumCard_playButton__mYK9R AlbumCard_control__qx7Xh ym-vibe-instyle-play-btn" type="button" aria-label="Воспроизведение" aria-live="off" aria-busy="false" data-album-id="${album.id}">
                      <span class="JjlbHZ4FaP9EAcR_1DxF">
                        <svg class="J9wTKytjOWG73QMoN5WP Seq0GowcqQmiA9LdLP_g" viewBox="0 0 24 24" width="24" height="24" focusable="false" aria-hidden="true">
                          <use xlink:href="/icons/sprite.svg#play_filled_xl"></use>
                        </svg>
                      </span>
                    </button>
                  </div>
                  <div class="bBh7lvgdfF7bqNqlK78Q">
                    <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 WtFdWDF44egSVM_YiMUX qU2apWBO1yyEK0lZ3lPO zmtVwO34EPppZErNrlIC AlbumCard_menuButton__pxkA6 AlbumCard_control__qx7Xh" type="button" aria-label="Контекстное меню" aria-expanded="false" aria-haspopup="menu" aria-live="off" aria-busy="false" data-album-id="${album.id}">
                      <span class="JjlbHZ4FaP9EAcR_1DxF">
                        <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
                          <use xlink:href="/icons/sprite.svg#more_xxs"></use>
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="IO4kvpDGNI2J0CHwcKSf">
          <div class="l8SktNpJd30JWp1owp_b Mb33JzAWx9EjbQAeScFt PVBDIXF2RTUThmbNT9sV">
            <div class="LmhA6nlLyzxwYIX31gYa">
              <div class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 jMyoZB5J9iZbzJmWOrF0 mxSPe5xpZnie9gpIqacd _3_Mxw7Si7j2g4kWjlpR FAmeEGy52GX1k0xZuPDn" style="-webkit-line-clamp: 2;">
                <div class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 jMyoZB5J9iZbzJmWOrF0 mxSPe5xpZnie9gpIqacd _3_Mxw7Si7j2g4kWjlpR AlbumCard_title__8YvhT" aria-hidden="true" style="-webkit-line-clamp: 2;">
                  <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB AlbumCard_titleLink__u_WLG ym-instyle-album-link" aria-label="${escapeHtml(albumTitle)} " tabindex="-1" href="/album/${album.id}">${escapeHtml(albumTitle)}</a>
                </div>
              </div>
              ${isExplicit ? `<span><svg class="ExplicitMarkIcon_explicitMark__0BPeQ Rkdd2vKC_3xa1eUdRdHP" focusable="false" aria-label="Возрастное ограничение 18+" aria-hidden="false"><use xlink:href="/icons/sprite.svg#exclamation_xxxs"></use></svg></span>` : ''}
            </div>
            <div class="SeparatedArtists_root_variant_breakAll__34YbW SeparatedArtists_root_clamp__SyvjM AlbumCard_artists__phKco" style="-webkit-line-clamp: 1;">
              ${artistsHtml}
            </div>
          </div>
        </div>
      `;

      card.querySelectorAll('.ym-instyle-album-link').forEach(a => {
        a.addEventListener('click', (e) => spaNavigate(`/album/${album.id}`, e));
      });
      card.querySelectorAll('.ym-instyle-artist-link').forEach(a => {
        const href = a.getAttribute('href');
        if (href) a.addEventListener('click', (e) => spaNavigate(href, e));
      });

      const playBtn = card.querySelector('.ym-vibe-instyle-play-btn');
      if (playBtn) {
        playBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const st = isAlbumCurrentlyPlaying(album.id);
          const p = getSafeActivePlayer();
          if (st.isMatch) {
            if (typeof p?.togglePause === 'function') {
              p.togglePause();
            } else if (st.isPlaying && typeof p?.pause === 'function') {
              p.pause();
            } else if (!st.isPlaying && (typeof p?.resume === 'function' || typeof p?.play === 'function')) {
              if (p.resume) p.resume();
              else p.play();
            } else {
              await playAlbumContext(album.id);
            }
          } else {
            await playAlbumContext(album.id);
          }
          updateLandingPlaybackIndicators();
          setTimeout(updateLandingPlaybackIndicators, 60);
          setTimeout(updateLandingPlaybackIndicators, 250);
          setTimeout(updateLandingPlaybackIndicators, 600);
        });
      }

      // Трейлер альбома
      const trailerBtn = card.querySelector('.AlbumCard_trailerButton__typHh');
      if (trailerBtn) {
        trailerBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const isPlaying = isAlbumTrailerCurrentlyPlaying(album.id);
          const p = getSafeActivePlayer();
          if (isPlaying) {
            if (typeof p?.togglePause === 'function') p.togglePause();
            else if (typeof p?.pause === 'function') p.pause();
          } else {
            await playAlbumTrailer(album.id);
          }
          updateLandingPlaybackIndicators();
          setTimeout(updateLandingPlaybackIndicators, 60);
          setTimeout(updateLandingPlaybackIndicators, 250);
          setTimeout(updateLandingPlaybackIndicators, 600);
        });
      }

      // Закрепление альбома (PIN)
      const pinBtn = card.querySelector('.AlbumCard_pinButton__Mdi_E');
      if (pinBtn) {
        pinBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const isCurrentlyPinned = pinBtn.getAttribute('aria-pressed') === 'true';
          const nextState = !isCurrentlyPinned;
          pinBtn.setAttribute('aria-pressed', nextState ? 'true' : 'false');
          pinBtn.setAttribute('aria-label', nextState ? 'Открепить' : 'Закрепить');
          pinBtn.classList.remove('PinButton_animation_scaled__Aj6LA', 'PinButton_animation_unscaled__QM3sC');
          pinBtn.classList.add(nextState ? 'PinButton_animation_scaled__Aj6LA' : 'PinButton_animation_unscaled__QM3sC');

          const svgUse = pinBtn.querySelector('use');
          if (svgUse) {
            const nextIcon = nextState ? '/icons/sprite.svg#pin_filled_xxs' : '/icons/sprite.svg#pin_xxs';
            svgUse.setAttribute('xlink:href', nextIcon);
            svgUse.setAttribute('href', nextIcon);
          }

          await togglePinAlbum(album.id, nextState);
        });
      }

      // Контекстное меню альбома (MENU)
      const menuBtn = card.querySelector('.AlbumCard_menuButton__pxkA6');
      if (menuBtn) {
        menuBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openAlbumContextMenu(menuBtn, album, item);
        });
        menuBtn.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
        });
      }

      li.appendChild(card);
      container.appendChild(li);
    });

    updateLandingPlaybackIndicators();
  }

  function renderNewReleasesSection(feedContainer, releasesData) {
    if (!releasesData) return;
    const releases = releasesData.result?.newReleases || releasesData.newReleases || [];
    if (!Array.isArray(releases) || releases.length === 0) return;

    const section = document.createElement('section');
    section.className = 'NewReleases_root__4ONiw ym-vibe-feed-section';
    section.setAttribute('data-intersection-property-id', 'NEWRELEASES');
    section.setAttribute('data-test-id', 'NEW_RELEASES');

    const header = document.createElement('div');
    header.className = 'BlockHeader_root__j3mbg SkeletonBlock_headerContainer__fl8EX';
    header.innerHTML = `
      <div class="BlockHeader_start__ZrGP5">
        <div class="BlockHeader_textContainer___2wn9">
          <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB BlockHeader_title__5xlx6" href="/entities/new-releases/NEWRELEASES">
            <div class="VUb2BxfgkGQhG1RDQGwF BlockHeader_linkContainer__EuW_L">
              <span class="BlockHeader_linkText__Or6VB">
                <h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww BlockHeader_heading__4iqvS" id="_r_7fq_">Новые релизы</h2>
              </span>
              <svg class="TXa2RKc_Hf0QPdmUDMwI BlockHeader_titleIcon__GQFEK UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true">
                <use xlink:href="/icons/sprite.svg#arrowRight_xs"></use>
              </svg>
            </div>
          </a>
        </div>
      </div>
      <div class="CarouselControls_root__E_hwc NewReleases_controls__zlJZF">
        <button class="cpeagBA1_PblpJn8Xgtv pnM3iSP9keZOELI2oohr uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO undefined CarouselControls_control__L8t4i" type="button" tabindex="-1" aria-hidden="true" disabled="" data-disabled="true" aria-live="off" aria-busy="false">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowLeft_xxs"></use>
            </svg>
          </span>
        </button>
        <button class="cpeagBA1_PblpJn8Xgtv pnM3iSP9keZOELI2oohr uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p i5WuBm5mfG0mflk_1jH_ eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO undefined CarouselControls_control__L8t4i" type="button" tabindex="-1" aria-hidden="true" aria-live="off" aria-busy="false">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowRight_xxs"></use>
            </svg>
          </span>
        </button>
      </div>
    `;

    const titleLink = header.querySelector('a.BlockHeader_title__5xlx6');
    if (titleLink) {
      titleLink.addEventListener('click', (e) => spaNavigate('/entities/new-releases/NEWRELEASES', e));
    }
    section.appendChild(header);

    const carousel = document.createElement('ol');
    carousel.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_container__9IxUi SkeletonBlock_important__faY0E ym-vibe-feed-releases-carousel';
    carousel.setAttribute('aria-labelledby', '_r_7fq_');
    carousel.setAttribute('role', 'list');

    releases.forEach((rel, idx) => {
      const album = rel.album || {};
      const artists = Array.isArray(rel.artists) && rel.artists.length > 0 ? rel.artists : [{ name: 'Артист', id: '' }];
      const primaryArtist = artists[0] || {};
      const primaryArtistName = primaryArtist.name || 'Артист';

      const artistCoverUri = primaryArtist.cover?.uri || rel.cover?.uri || album.cover?.uri;
      const artistCover300 = formatYandexImg(artistCoverUri, '300x300');
      const artistCover600 = formatYandexImg(artistCoverUri, '600x600');

      const albumCoverUri = album.cover?.uri || rel.cover?.uri;
      const albumCover100 = formatYandexImg(albumCoverUri, '100x100');
      const albumCover200 = formatYandexImg(albumCoverUri, '200x200');

      const releaseColor = album.cover?.color || rel.color || '#201c1d';
      const rgb = hexToRgb(releaseColor);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      const coverColor = `hsl(${hsl.h}, ${hsl.s}%, 20%)`;
      const fadeBg = `linear-gradient(180.14deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0) 30.88%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4) 70.8%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9) 80.88%)`;

      const albumType = (album.type || album.albumType || 'single').toLowerCase();
      const albumTypeStr = albumType === 'single' ? 'сингл' : (albumType === 'podcast' ? 'подкаст' : 'альбом');
      let dateStr = '';
      if (rel.releaseDate || album.releaseDate) {
        try {
          const d = new Date(rel.releaseDate || album.releaseDate);
          const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
          dateStr = `${d.getDate()} ${months[d.getMonth()]}`;
        } catch (e) { }
      }

      const isExplicit = Boolean(album.contentWarning === 'explicit' || album.explicit || rel.explicit);
      const hasTrailer = Boolean(rel.trailer || album.trailer);

      const artistsHtml = artists.map(a => `<a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB NewRelease_artistLink__CO3Zn" aria-label="Артист ${escapeHtml(a.name || '')}" href="/artist/${escapeHtml(a.id || '')}"><span class="_MWOVuZRvUQdXKTMcOPx Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR NewRelease_artistCaption__1F8A9">${escapeHtml(a.name || '')}</span></a>`).join(', ');

      const ariaLabelAlbum = `${albumTypeStr.charAt(0).toUpperCase() + albumTypeStr.slice(1)} ${album.title || ''}`;
      const albumUrl = `/album/${album.id || ''}`;
      const primaryArtistUrl = `/artist/${primaryArtist.id || ''}`;

      const explicitHtml = isExplicit ? `
        <span class="NewReleaseCard_explicitMarkContainer__QHRoH">
          <svg class="ExplicitMarkIcon_explicitMark__0BPeQ NewReleaseCard_explicitMark__isgxE Rkdd2vKC_3xa1eUdRdHP" focusable="false" aria-label="Возрастное ограничение 18+" aria-hidden="false">
            <use xlink:href="/icons/sprite.svg#exclamation_xxxs"></use>
          </svg>
        </span>
      ` : '';

      const trailerHtml = hasTrailer ? `
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr undefined qU2apWBO1yyEK0lZ3lPO WsKeF73pWotx9W1tWdYY NewRelease_trailerButton__OYAW6" type="button" aria-label="Запустить трейлер" data-album-id="${escapeHtml(album.id || '')}" data-intersection-property-id="onboarding-tooltip" aria-live="off" aria-busy="false">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#trailer_xs"></use>
            </svg>
          </span>
        </button>
      ` : '';

      const li = document.createElement('li');
      li.className = 'VJ9IexhAEuYSCyGiMfN4 NewReleases_item__Gv0iR NewReleases_important__qkt9x';

      li.innerHTML = `
        <div class="NewRelease_root__W0T4a" data-intersection-property-id="_r_rel_${idx}_">
          <div class="NewRelease_cover__EVFNR">
            <div class="qaIScXjx1qyXuaIHXQIo QIWoHHDozGGG5w2JYImt ZcpulvHgF_wsgzB8Hye9 gtfPudKIIbfkwmuOBzwI NewRelease_coverImage__9x6Uk">
              <img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG NewRelease_image__Vw6_k" alt="${escapeHtml(primaryArtistName)}" loading="eager" aria-hidden="true" srcset="${escapeHtml(artistCover300)}, ${escapeHtml(artistCover600 || artistCover300)} 2x" src="${escapeHtml(artistCover300)}">
              <div class="NewRelease_fade__rVE0_" style="background: ${escapeHtml(fadeBg)};"></div>
            </div>
            <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB NewRelease_fade__rVE0_" aria-label="${escapeHtml(primaryArtistName)}" href="${escapeHtml(primaryArtistUrl)}"></a>
            <div class="SeparatedArtists_root_variant_breakWord__1sziE SeparatedArtists_root_clamp__SyvjM NewRelease_artists__wGTaP" style="-webkit-line-clamp: 2;">
              ${artistsHtml}
            </div>
          </div>
          <div class="qaIScXjx1qyXuaIHXQIo NFJAa_h_EAjwQVY7bU5J ZcpulvHgF_wsgzB8Hye9 NewReleaseCard_root__IY5m_ NewRelease_card__yn06x" style="--new-release-cover-color: ${escapeHtml(coverColor)}; --new-release-color: ${escapeHtml(releaseColor)};">
            <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB NewReleaseCard_paperLink__NN_8o" aria-label="${escapeHtml(ariaLabelAlbum)}" href="${escapeHtml(albumUrl)}"></a>
            <img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG NewReleaseCard_image__oxm2S" alt="Альбом ${escapeHtml(album.title || '')}" loading="eager" srcset="${escapeHtml(albumCover100)}, ${escapeHtml(albumCover200 || albumCover100)} 2x" src="${escapeHtml(albumCover100)}">
            <div class="NewReleaseCard_info__rcfoY">
              <div title="${escapeHtml(album.title || '')}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 jMyoZB5J9iZbzJmWOrF0 Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR NewReleaseCard_title__N5soS" aria-label="${escapeHtml(ariaLabelAlbum)}" style="-webkit-line-clamp: 2;">${escapeHtml(album.title || '')}</div>
              <div class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI mxSPe5xpZnie9gpIqacd _3_Mxw7Si7j2g4kWjlpR NewReleaseCard_description__Daz5q" style="-webkit-line-clamp: 1;">
                <span class="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 _3_Mxw7Si7j2g4kWjlpR NewRelease_descriptionContainer__g56GG">
                  <span class="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 _3_Mxw7Si7j2g4kWjlpR">${escapeHtml(albumTypeStr)}</span>
                  <span class="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 _3_Mxw7Si7j2g4kWjlpR"> • </span>
                  <span class="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 _3_Mxw7Si7j2g4kWjlpR">${escapeHtml(dateStr)}</span>
                </span>
              </div>
            </div>
            <div class="NewReleaseCard_container__XvwZC">
              ${explicitHtml}
              ${trailerHtml}
              <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p undefined qU2apWBO1yyEK0lZ3lPO WsKeF73pWotx9W1tWdYY NewReleaseCard_button__WPk82 ym-vibe-release-play-btn" type="button" aria-label="Воспроизведение" aria-live="off" aria-busy="false" data-album-id="${escapeHtml(album.id || '')}">
                <span class="JjlbHZ4FaP9EAcR_1DxF">
                  <svg class="J9wTKytjOWG73QMoN5WP o_v2ds2BaqtzAsRuCVjw" focusable="false" aria-hidden="true">
                    <use xlink:href="/icons/sprite.svg#play_filled_m"></use>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      `;

      // Event Listeners
      const paperLink = li.querySelector('.NewReleaseCard_paperLink__NN_8o');
      if (paperLink) paperLink.addEventListener('click', (e) => spaNavigate(albumUrl, e));

      const fadeLink = li.querySelector('a.NewRelease_fade__rVE0_');
      if (fadeLink) fadeLink.addEventListener('click', (e) => spaNavigate(primaryArtistUrl, e));

      const artistAnchors = li.querySelectorAll('.NewRelease_artistLink__CO3Zn');
      artistAnchors.forEach(a => {
        a.addEventListener('click', (e) => {
          const href = a.getAttribute('href');
          if (href) spaNavigate(href, e);
        });
      });

      const trailerBtn = li.querySelector('.NewRelease_trailerButton__OYAW6');
      if (trailerBtn) {
        trailerBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (album.id) {
            const isPlaying = isAlbumTrailerCurrentlyPlaying(album.id);
            const p = getSafeActivePlayer();
            if (isPlaying) {
              if (typeof p?.togglePause === 'function') p.togglePause();
              else if (typeof p?.pause === 'function') p.pause();
            } else {
              await playAlbumTrailer(album.id);
            }
            updateLandingPlaybackIndicators();
            setTimeout(updateLandingPlaybackIndicators, 60);
            setTimeout(updateLandingPlaybackIndicators, 250);
            setTimeout(updateLandingPlaybackIndicators, 600);
          }
        });
      }

      const playBtn = li.querySelector('.ym-vibe-release-play-btn');
      if (playBtn) {
        playBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (album.id) {
            const st = isAlbumCurrentlyPlaying(album.id);
            const p = getSafeActivePlayer();
            if (st.isMatch) {
              if (typeof p?.togglePause === 'function') {
                p.togglePause();
              } else if (st.isPlaying && typeof p?.pause === 'function') {
                p.pause();
              } else if (!st.isPlaying && (typeof p?.resume === 'function' || typeof p?.play === 'function')) {
                if (p.resume) p.resume();
                else p.play();
              } else {
                await playAlbumContext(album.id);
              }
            } else {
              const played = await playAlbumContext(album.id);
              if (!played) spaNavigate(albumUrl);
            }
          } else {
            spaNavigate(albumUrl);
          }
          updateLandingPlaybackIndicators();
          setTimeout(updateLandingPlaybackIndicators, 60);
          setTimeout(updateLandingPlaybackIndicators, 250);
          setTimeout(updateLandingPlaybackIndicators, 600);
        });
      }

      carousel.appendChild(li);
    });

    const controls = header.querySelectorAll('.CarouselControls_control__L8t4i');
    const prevBtn = controls[0];
    const nextBtn = controls[1];
    setupCarouselControls(carousel, prevBtn, nextBtn);

    section.appendChild(carousel);
    feedContainer.appendChild(section);

    updateLandingPlaybackIndicators();
  }

  function renderConcertsSection(feedContainer, concertsData) {
    if (!concertsData) return;
    const concerts = concertsData.result?.concerts || concertsData.concerts || [];
    if (!Array.isArray(concerts) || concerts.length === 0) return;

    const section = document.createElement('section');
    section.className = 'ym-vibe-feed-section ym-concerts-section';

    const header = createSectionHeader('Концерты для вас', '/concerts');
    section.appendChild(header);

    const carousel = document.createElement('div');
    carousel.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_container__9IxUi ym-vibe-feed-concerts-carousel';

    const monthsRu = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
    const dowsRu = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

    concerts.forEach(c => {
      let monthStr = 'ОКТ';
      let dayStr = '01';
      let dowStr = 'ПТ';
      if (c.datetime) {
        try {
          const d = new Date(c.datetime);
          monthStr = monthsRu[d.getMonth()] || 'ОКТ';
          dayStr = String(d.getDate()).padStart(2, '0');
          dowStr = dowsRu[d.getDay()] || 'ПТ';
        } catch (err) { }
      }

      const coverImg = formatYandexImg(c.cover?.uri, '400x400');
      const venueStr = [c.place, c.city].filter(Boolean).join(', ') || 'Концерт';

      const card = document.createElement('div');
      card.className = 'ym-vibe-feed-concert-card';

      card.innerHTML = `
        <div class="ym-vibe-feed-concert-image-wrap">
          <img src="${escapeHtml(coverImg)}" class="ym-vibe-feed-concert-image" alt="${escapeHtml(c.concertTitle || '')}" loading="lazy">
          <div class="ym-vibe-feed-concert-date-badge">
            <span class="ym-vibe-feed-concert-date-month">${escapeHtml(monthStr)}</span>
            <span class="ym-vibe-feed-concert-date-day">${escapeHtml(dayStr)}</span>
            <span class="ym-vibe-feed-concert-date-dow">${escapeHtml(dowStr)}</span>
          </div>
        </div>
        <div class="ym-vibe-feed-concert-info">
          <div class="ym-vibe-feed-concert-title" title="${escapeHtml(c.concertTitle || '')}">${escapeHtml(c.concertTitle || '')}</div>
          <div class="ym-vibe-feed-concert-venue" title="${escapeHtml(venueStr)}">${escapeHtml(venueStr)}</div>
        </div>
      `;

      card.addEventListener('click', (e) => spaNavigate('/concerts', e));
      carousel.appendChild(card);
    });

    const controls = header.querySelectorAll('.CarouselControls_control__L8t4i');
    const prevBtn = controls[0];
    const nextBtn = controls[1];
    setupCarouselControls(carousel, prevBtn, nextBtn);

    section.appendChild(carousel);
    feedContainer.appendChild(section);
  }

  // 9. Observer to maintain button injection, navbar transparency and feed injection
  let lastFeedCheckUrl = '';
  const observer = new MutationObserver(() => {
    checkAndInjectVibeButton();
    trackAsideWidth();

    const mode = getVibeDesignMode();
    const isTarget = isTargetVibePage();

    if (!isTarget) {
      if (document.documentElement) {
        document.documentElement.classList.remove('ym-vibe-no-wheel', 'ym-vibe-with-landing');
      }
      if (document.body) {
        document.body.classList.remove('ym-vibe-no-wheel', 'ym-vibe-with-landing');
      }
      updateNavbarTransparency(false);
      removeVibeLandingFeed();
      return;
    }

    if (mode === 'no_wheel') {
      if (document.documentElement) {
        document.documentElement.classList.add('ym-vibe-no-wheel');
        document.documentElement.classList.remove('ym-vibe-with-landing');
      }
      if (document.body) {
        document.body.classList.add('ym-vibe-no-wheel');
        document.body.classList.remove('ym-vibe-with-landing');
      }
      updateNavbarTransparency(true);
      removeVibeLandingFeed();
    } else if (mode === 'vibe_with_landing') {
      if (document.documentElement) {
        document.documentElement.classList.remove('ym-vibe-no-wheel');
        document.documentElement.classList.add('ym-vibe-with-landing');
      }
      if (document.body) {
        document.body.classList.remove('ym-vibe-no-wheel');
        document.body.classList.add('ym-vibe-with-landing');
      }
      updateNavbarTransparency(true);
      const hasFeed = document.getElementById('ym-vibe-live-landing-feed');
      if (!hasFeed || window.location.href !== lastFeedCheckUrl) {
        lastFeedCheckUrl = window.location.href;
        initVibeLandingFeed();
      }
    } else {
      if (document.documentElement) {
        document.documentElement.classList.remove('ym-vibe-no-wheel', 'ym-vibe-with-landing');
      }
      if (document.body) {
        document.body.classList.remove('ym-vibe-no-wheel', 'ym-vibe-with-landing');
      }
      updateNavbarTransparency(false);
      removeVibeLandingFeed();
    }
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => {
      applyVibeMode(getVibeDesignMode());
    });
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'YM_SYNC_STATE_CHANGED') {
        updateLandingPlaybackIndicators();
      }
    });
    if (typeof document !== 'undefined') {
      document.addEventListener('play', () => updateLandingPlaybackIndicators(), true);
      document.addEventListener('pause', () => updateLandingPlaybackIndicators(), true);
    }
    setInterval(() => {
      if (document.getElementById('ym-vibe-live-landing-feed')) {
        updateLandingPlaybackIndicators();
      }
    }, 350);
  }

  if (typeof document !== 'undefined') {
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
    // Initial checks
    setTimeout(initVibeMode, 300);
    setTimeout(initVibeMode, 1200);
    setTimeout(initVibeMode, 2500);
  }

  // Debug helper function to spy on Sonata Core and native button clicks
  window.BYM_DEBUG_VIBE = function() {
    console.log("%c[BYM Debugger] Запущен шпион за плеером и нативными кнопками!", "color: #ffdb4d; font-size: 16px; font-weight: bold;");

    const core = (typeof getSonataCore === 'function' ? getSonataCore() : null) || (window.getSonataCore ? window.getSonataCore() : null);
    const player = (typeof getActivePlayer === 'function' ? getActivePlayer() : null) || (window.getActivePlayer ? window.getActivePlayer() : null);

    console.log("1. Sonata Core:", core);
    console.log("2. Active Player:", player);

    if (core?.playbackController) {
      const proto = Object.getPrototypeOf(core.playbackController) || {};
      console.log("3. core.playbackController methods:", Object.getOwnPropertyNames(proto));
    }
    if (player?.contextController) {
      const proto = Object.getPrototypeOf(player.contextController) || {};
      console.log("4. player.contextController methods:", Object.getOwnPropertyNames(proto));
    }
    if (player?.queueController) {
      const proto = Object.getPrototypeOf(player.queueController) || {};
      console.log("5. player.queueController methods:", Object.getOwnPropertyNames(proto));
    }

    function spyOnObject(obj, name) {
      if (!obj) return;
      const proto = Object.getPrototypeOf(obj) || obj;
      const props = Object.getOwnPropertyNames(proto);
      for (const key of props) {
        if (typeof obj[key] === 'function' && key !== 'constructor' && !key.startsWith('_bym_spied')) {
          const orig = obj[key].bind(obj);
          obj[key] = function(...args) {
            console.log(`%c[SPY CALL] ${name}.${key}(`, "color: #10b981; font-weight: bold;", ...args, ")");
            try {
              return orig(...args);
            } catch(e) {
              console.error(`[SPY ERROR] ${name}.${key}:`, e);
              throw e;
            }
          };
          obj[key]._bym_spied = true;
        }
      }
    }

    if (core?.playbackController) spyOnObject(core.playbackController, 'core.playbackController');
    if (core?.contextController) spyOnObject(core.contextController, 'core.contextController');
    if (player?.contextController) spyOnObject(player.contextController, 'player.contextController');
    if (player?.queueController) spyOnObject(player.queueController, 'player.queueController');
    if (player) spyOnObject(player, 'player');

    if (!window._bym_click_spied) {
      window._bym_click_spied = true;
      window.addEventListener('click', (e) => {
        const btn = e.target.closest('button, [role="button"], li');
        if (!btn) return;
        console.log("%c[CLICKED ELEMENT]", "color: #3b82f6; font-weight: bold;", btn);
        for (const key in btn) {
          if (key.startsWith('__reactProps$')) {
            console.log("[REACT PROPS]:", btn[key]);
          }
          if (key.startsWith('__reactFiber$')) {
            let f = btn[key];
            console.log("[REACT FIBER memoizedProps]:", f.memoizedProps);
            let depth = 0;
            while (f && depth < 8) {
              if (f.memoizedProps && (f.memoizedProps.onClick || f.memoizedProps.seeds || f.memoizedProps.item || f.memoizedProps.stationId)) {
                console.log(`[FIBER PARENT level ${depth} props]:`, f.memoizedProps);
              }
              f = f.return;
              depth++;
            }
          }
        }
      }, true);
    }

    console.log("%c[ШПИОН АКТИВИРОВАН] Теперь кликните на любую оригинальную кнопку сета на странице!", "color: #ffdb4d; font-size: 14px; font-weight: bold;");
    return "Шпион активен. Кликните по оригинальной кнопке!";
  };

  // Expose API for external debug or settings
  window.__ymVibeEnhancer = {
    getItems: getAllVibeItems,
    activate: activateVibeItem,
    playStation: playVibeStation,
    debug: window.BYM_DEBUG_VIBE,
    applyMode: applyVibeMode,
    refreshFeed: initVibeLandingFeed
  };
  window.BYM_playVibeStation = playVibeStation;

})();
