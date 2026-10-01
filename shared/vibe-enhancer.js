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
    // Only no_wheel on target vibe page gets transparent navbar; otherwise reset
    updateNavbarTransparency(isNoWheel);

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
      html.ym-vibe-no-wheel aside[class*="Navbar"],
      body.ym-vibe-no-wheel aside[class*="Navbar"],
      html.ym-vibe-no-wheel [class*="Navbar_root"],
      body.ym-vibe-no-wheel [class*="Navbar_root"],
      html.ym-vibe-no-wheel [class*="DefaultLayout_navbar"],
      body.ym-vibe-no-wheel [class*="DefaultLayout_navbar"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_root"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_root"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_logoWrapper"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_logoWrapper"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_scrollableContainer"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_scrollableContainer"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_scrollableContent"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_scrollableContent"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_navigation"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_navigation"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_navigation_new"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_navigation_new"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_navigationGroup"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_navigationGroup"],
      html.ym-vibe-no-wheel [class*="SidebarDesktop"],
      body.ym-vibe-no-wheel [class*="SidebarDesktop"],
      html.ym-vibe-no-wheel [class*="NavbarDesktop_pinsList"],
      body.ym-vibe-no-wheel [class*="NavbarDesktop_pinsList"],
      html.ym-vibe-no-wheel [class*="PinsList_root"],
      body.ym-vibe-no-wheel [class*="PinsList_root"],
      html.ym-vibe-no-wheel [class*="NavbarDesktopUserWidget"],
      body.ym-vibe-no-wheel [class*="NavbarDesktopUserWidget"],
      html.ym-vibe-no-wheel [class*="UserProfile_root"],
      body.ym-vibe-no-wheel [class*="UserProfile_root"],
      html.ym-vibe-no-wheel aside.Navbar_root__chF4R,
      body.ym-vibe-no-wheel aside.Navbar_root__chF4R,
      html.ym-vibe-no-wheel aside.DefaultLayout_navbar__LIQWG,
      body.ym-vibe-no-wheel aside.DefaultLayout_navbar__LIQWG,
      html.ym-vibe-no-wheel div.NavbarDesktop_root__scYzp,
      body.ym-vibe-no-wheel div.NavbarDesktop_root__scYzp,
      html.ym-vibe-no-wheel div.NavbarDesktop_scrollableContainer__HLc9D,
      body.ym-vibe-no-wheel div.NavbarDesktop_scrollableContainer__HLc9D,
      html.ym-vibe-no-wheel div.NavbarDesktop_scrollableContent__OyU4P,
      body.ym-vibe-no-wheel div.NavbarDesktop_scrollableContent__OyU4P,
      html.ym-vibe-no-wheel nav.NavbarDesktop_navigation__dLUGW,
      body.ym-vibe-no-wheel nav.NavbarDesktop_navigation__dLUGW,
      html.ym-vibe-no-wheel nav.NavbarDesktop_navigation_new__0j8W5,
      body.ym-vibe-no-wheel nav.NavbarDesktop_navigation_new__0j8W5,
      html.ym-vibe-no-wheel nav.NGdj0oZ2Bt8qdZhP2Tzt,
      body.ym-vibe-no-wheel nav.NGdj0oZ2Bt8qdZhP2Tzt,
      html.ym-vibe-no-wheel nav.QilmoKKJwk6f0BdkYgrA,
      body.ym-vibe-no-wheel nav.QilmoKKJwk6f0BdkYgrA,
      html.ym-vibe-no-wheel ol.NavbarDesktop_navigationGroup__eexLF,
      body.ym-vibe-no-wheel ol.NavbarDesktop_navigationGroup__eexLF,
      html.ym-vibe-no-wheel ol.yuyI2hMAT7qyL1N14MAQ,
      body.ym-vibe-no-wheel ol.yuyI2hMAT7qyL1N14MAQ,
      html.ym-vibe-no-wheel ol.xfFtKQpgAYvC2jI1tBtS,
      body.ym-vibe-no-wheel ol.xfFtKQpgAYvC2jI1tBtS {
        background: transparent !important;
        background-color: transparent !important;
        border: none !important;
        border-right: none !important;
        box-shadow: none !important;
      }
      html.ym-vibe-no-wheel aside::before,
      body.ym-vibe-no-wheel aside::before,
      html.ym-vibe-no-wheel aside::after,
      body.ym-vibe-no-wheel aside::after,
      html.ym-vibe-no-wheel [class*="Navbar"]::before,
      body.ym-vibe-no-wheel [class*="Navbar"]::before,
      html.ym-vibe-no-wheel [class*="Navbar"]::after,
      body.ym-vibe-no-wheel [class*="Navbar"]::after {
        display: none !important;
        background: transparent !important;
      }

      /* Full-screen wave visualizer spanning column 1 and 2 under transparent navbar */
      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="CommonLayout_content"] {
        grid-column: 1 / -1 !important;
        grid-row: 1 !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100vw !important;
        height: 100% !important;
        z-index: 1 !important;
        pointer-events: none !important;
      }

      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]) aside {
        grid-column: 1 !important;
        grid-row: 1 !important;
        position: relative !important;
        z-index: 10 !important;
        pointer-events: auto !important;
      }

      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="CommonLayout_content"] button,
      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="CommonLayout_content"] a,
      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="CommonLayout_content"] input,
      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="VibeControls"],
      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="PlayButton"] {
        pointer-events: auto !important;
      }

      /* Dynamically offset content by actual navbar width (200px expanded, 64px collapsed, etc.) */
      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="VibePage_content"],
      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="VibePage_root"] > div:not([class*="VibeCanvas"]) {
        padding-left: var(--ym-aside-width, 200px) !important;
        box-sizing: border-box !important;
        width: 100% !important;
        transition: padding-left 0.2s cubic-bezier(0.2, 0, 0, 1);
      }

      /* Pure CSS fallback for collapsed sidebar if CSS variable not yet populated */
      html.ym-vibe-no-wheel.ym-navbar-collapsed [class*="CommonLayout_root"]:has([class*="VibePage_root"]) [class*="VibePage_content"],
      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]):has(aside [class*="title_collapsed"]) [class*="VibePage_content"],
      html.ym-vibe-no-wheel [class*="CommonLayout_root"]:has([class*="VibePage_root"]):has(aside.ym-collapsed) [class*="VibePage_content"] {
        padding-left: 64px !important;
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
    newReleases: null,
    concerts: null,
    timestamp: 0
  };
  let activeAiCategory = 'mix';
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
      const [lhRes, mwRes, nrRes, cRes] = await Promise.allSettled([
        fetch('https://api.music.yandex.ru/landing-blocks/likes-and-history', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('https://api.music.yandex.ru/landing-blocks/mixes-waves', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('https://api.music.yandex.ru/landing-blocks/new-releases', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('https://api.music.yandex.ru/concerts/landing/personal', { credentials: 'include' }).then(r => r.ok ? r.json() : null)
      ]);

      if (lhRes.status === 'fulfilled' && lhRes.value) landingFeedCache.likesHistory = lhRes.value;
      if (mwRes.status === 'fulfilled' && mwRes.value) landingFeedCache.mixesWaves = mwRes.value;
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

    // 4. Exact 1-to-1 Section: Новые релизы
    renderNewReleasesSection(feed, data.newReleases);

    // 5. Exact 1-to-1 Section: Концерты для вас
    renderConcertsSection(feed, data.concerts);
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
          <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 qU2apWBO1yyEK0lZ3lPO Yqh9GVOagMQpvymD877t cBxrIXbcPeS3kSzdJdhS Tab_root__LUukY Tab_tab_size_m__c7tVg Skeleton_tab__Jn6By active" type="button" role="tab" aria-selected="true" id="ym-tab-foryou">
            <span class="Tab_covers__cvYeI">
              ${forYouImg1 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG Tab_image__Hen3_" alt="" loading="eager" src="${escapeHtml(forYouImg1)}">` : ''}
              ${forYouImg2 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG Tab_image__Hen3_" alt="" loading="eager" src="${escapeHtml(forYouImg2)}">` : ''}
            </span>
            <span class="Tab_description__p1fTO">
              <div title="Для вас" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA Vi7Rd0SZWqD17F0872TB Tab_title__hAYZk" style="-webkit-line-clamp: 1;">Для вас</div>
              <div title="${escapeHtml(forYouSub)}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI _oBLf5gprWsKjCw4Ce58 _3_Mxw7Si7j2g4kWjlpR Tab_subtitle__fLp9S" style="-webkit-line-clamp: 1;">${escapeHtml(forYouSub)}</div>
            </span>
          </button>
        </li>
        <li class="d50IqTKJZhJIMd5aTqAn">
          <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 qU2apWBO1yyEK0lZ3lPO Yqh9GVOagMQpvymD877t Tab_root__LUukY Tab_tab_size_m__c7tVg Skeleton_tab__Jn6By" type="button" role="tab" aria-selected="false" id="ym-tab-trends">
            <span class="Tab_covers__cvYeI">
              ${trendsImg1 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG Tab_image__Hen3_" alt="" loading="eager" src="${escapeHtml(trendsImg1)}">` : ''}
              ${trendsImg2 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG Tab_image__Hen3_" alt="" loading="eager" src="${escapeHtml(trendsImg2)}">` : ''}
            </span>
            <span class="Tab_description__p1fTO">
              <div title="Тренды" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA Vi7Rd0SZWqD17F0872TB Tab_title__hAYZk" style="-webkit-line-clamp: 1;">Тренды</div>
              <div title="Чарт и Открытия" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI _oBLf5gprWsKjCw4Ce58 _3_Mxw7Si7j2g4kWjlpR Tab_subtitle__fLp9S" style="-webkit-line-clamp: 1;">Чарт и Открытия</div>
            </span>
          </button>
        </li>
      </ol>
    `;

    const tabForYou = header.querySelector('#ym-tab-foryou');
    const tabTrends = header.querySelector('#ym-tab-trends');
    if (tabForYou && tabTrends) {
      tabForYou.addEventListener('click', (e) => {
        e.preventDefault();
        tabForYou.classList.add('active');
        tabForYou.setAttribute('aria-selected', 'true');
        tabTrends.classList.remove('active');
        tabTrends.setAttribute('aria-selected', 'false');
      });
      tabTrends.addEventListener('click', (e) => {
        e.preventDefault();
        tabTrends.classList.add('active');
        tabTrends.setAttribute('aria-selected', 'true');
        tabForYou.classList.remove('active');
        tabForYou.setAttribute('aria-selected', 'false');
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
                      <path d="M6 3.5l4.5 4.5-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
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
                    <path d="M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6V2l4 3.5L12 9V4zm1 4v4.5l3 1.8-.75 1.2-3.75-2.25V8h1.5z" fill="currentColor"/>
                  </svg>
                </div>
                <div class="LikesAndHistoryItem_textContainer__yGdOu">
                  <h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww LikesAndHistoryItem_title__hdi2H">
                    История
                    <svg class="LikesAndHistoryItem_titleIcon__2D_yS UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 16 16" width="12" height="12" focusable="false" aria-hidden="true">
                      <use xlink:href="/icons/sprite.svg#arrowRight_xs"></use>
                      <path d="M6 3.5l4.5 4.5-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
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

  function setupCarouselControls(container, prevBtn, nextBtn) {
    if (!container) return;
    const update = () => {
      const atStart = container.scrollLeft <= 5;
      const atEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 5;
      if (prevBtn) {
        prevBtn.disabled = atStart;
        prevBtn.setAttribute('data-disabled', atStart ? 'true' : 'false');
      }
      if (nextBtn) {
        nextBtn.disabled = atEnd;
        nextBtn.setAttribute('data-disabled', atEnd ? 'true' : 'false');
      }
    };
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const dist = Math.max(340, container.clientWidth * 0.75);
        container.scrollBy({ left: -dist, behavior: 'smooth' });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const dist = Math.max(340, container.clientWidth * 0.75);
        container.scrollBy({ left: dist, behavior: 'smooth' });
      });
    }
    container.addEventListener('scroll', update, { passive: true });
    // Native smooth momentum and snapping - NO wheel deltaY hijacking!
    setTimeout(update, 100);
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
              <path d="M6 3.5l4.5 4.5-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
           </a>`
        : `<h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww Vibes_heading__4i5bM">${escapeHtml(title)}</h2>`
      }
      <div class="CarouselControls_root__E_hwc Vibes_controls__bUp2H">
        <button class="cpeagBA1_PblpJn8Xgtv pnM3iSP9keZOELI2oohr uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO CarouselControls_control__L8t4i prev" type="button" tabindex="-1" aria-hidden="true" disabled data-disabled="true" aria-label="Назад">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" viewBox="0 0 16 16" width="12" height="12" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowLeft_xxs"></use>
              <path d="M10 3.5L5.5 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>
        <button class="cpeagBA1_PblpJn8Xgtv pnM3iSP9keZOELI2oohr uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p i5WuBm5mfG0mflk_1jH_ eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO CarouselControls_control__L8t4i next" type="button" tabindex="-1" aria-hidden="true" aria-label="Вперед">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" viewBox="0 0 16 16" width="12" height="12" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowRight_xxs"></use>
              <path d="M6 3.5l4.5 4.5-4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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
    chipsRow.className = 'TjoCDDIf5PrIGU4w8G6Z TabCarousel_root__8DoRy SkeletonBlock_container__9IxUi Vibes_tabCarousel__bSvp0 ym-vibe-feed-chips';
    chipsRow.setAttribute('role', 'tablist');

    if (!activeAiCategory) activeAiCategory = waves[0].id;
    const currentCatWave = waves.find(w => w.id === activeAiCategory) || waves[0];

    waves.forEach(w => {
      const li = document.createElement('li');
      li.className = 'd50IqTKJZhJIMd5aTqAn';
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `ym-vibe-feed-chip ${w.id === activeAiCategory ? 'active' : ''}`;
      chip.textContent = w.title || w.id;
      chip.addEventListener('click', () => {
        activeAiCategory = w.id;
        section.querySelectorAll('.ym-vibe-feed-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderAiCards(carouselContainer, w.items || []);
      });
      li.appendChild(chip);
      chipsRow.appendChild(li);
    });
    section.appendChild(chipsRow);

    // Horizontal Scrollable Cards Carousel
    const carouselContainer = document.createElement('div');
    carouselContainer.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_container__9IxUi ym-vibe-feed-ai-carousel';
    section.appendChild(carouselContainer);

    renderAiCards(carouselContainer, currentCatWave.items || []);

    const prevBtn = header.querySelector('.CarouselControls_control__L8t4i.prev');
    const nextBtn = header.querySelector('.CarouselControls_control__L8t4i.next');
    setupCarouselControls(carouselContainer, prevBtn, nextBtn);

    feedContainer.appendChild(section);
  }

  function renderAiCards(container, items) {
    container.replaceChildren();
    if (!items || items.length === 0) return;

    items.forEach(item => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'ym-vibe-feed-ai-card';

      const bgImg = formatYandexImg(item.backgroundImageUrl, 'm400x400');
      const avgColor = (item.colors && item.colors.average) || '#333344';
      const textColor = (item.colors && (item.colors.waveText || item.colors.text)) || '#c8c1ff';

      card.style.setProperty('--vibe-button-background', avgColor);
      card.style.setProperty('--vibe-button-text-color', textColor);
      card.style.backgroundColor = avgColor;

      card.innerHTML = `
        ${bgImg ? `<img src="${escapeHtml(bgImg)}" class="ym-vibe-feed-ai-card-img" alt="">` : ''}
        <div class="ym-vibe-feed-ai-card-content">
          <span class="ym-vibe-feed-ai-header">${escapeHtml(item.header || 'Сет Моей волны')}</span>
          <span class="ym-vibe-feed-ai-title">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 3 20 12 6 21 6 3"></polygon>
            </svg>
            <span>${escapeHtml(item.title || '')}</span>
          </span>
        </div>
      `;

      card.addEventListener('click', () => {
        const allItems = getAllVibeItems();
        const match = allItems.find(i =>
          (item.stationId && i.id && i.id.includes(item.stationId)) ||
          (item.title && i.name && i.name.toLowerCase() === item.title.toLowerCase())
        );
        if (match) {
          activateVibeItem(match);
        } else {
          const playBtn = document.querySelector('button[aria-label*="Воспроизведение"], [class*="PlayButtonWithCover"]');
          if (playBtn) playBtn.click();
        }
      });

      container.appendChild(card);
    });
  }

  function renderNewReleasesSection(feedContainer, releasesData) {
    if (!releasesData) return;
    const releases = releasesData.result?.newReleases || releasesData.newReleases || [];
    if (!Array.isArray(releases) || releases.length === 0) return;

    const section = document.createElement('section');
    section.className = 'NewReleases_root__4ONiw ym-vibe-feed-section';

    const header = createSectionHeader('Новые релизы', '/entities/new-releases/NEWRELEASES');
    section.appendChild(header);

    const carousel = document.createElement('div');
    carousel.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_container__9IxUi ym-vibe-feed-releases-carousel';

    releases.forEach(rel => {
      const album = rel.album || {};
      const artist = (rel.artists && rel.artists[0]) || {};
      const artistName = rel.artists ? rel.artists.map(a => a.name).join(', ') : 'Артист';

      const avatarUrl = formatYandexImg(artist.cover?.uri || rel.cover?.uri, '300x300');
      const albumCoverUrl = formatYandexImg(album.cover?.uri || rel.cover?.uri, '100x100');

      let subText = album.albumType === 'single' ? 'сингл' : 'альбом';
      if (rel.releaseDate) {
        try {
          const d = new Date(rel.releaseDate);
          const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
          subText += ` • ${d.getDate()} ${months[d.getMonth()]}`;
        } catch (e) { }
      }

      const card = document.createElement('a');
      card.className = 'ym-vibe-feed-release-card';
      const albumUrl = `/album/${album.id || ''}`;
      card.href = albumUrl;

      card.innerHTML = `
        <div class="ym-vibe-feed-release-cover">
          <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(artistName)}" loading="lazy">
          <div class="ym-vibe-feed-release-fade"></div>
          <div class="ym-vibe-feed-release-artist-caption">${escapeHtml(artistName)}</div>
        </div>
        <div class="ym-vibe-feed-release-paper">
          <img src="${escapeHtml(albumCoverUrl)}" class="ym-vibe-feed-release-thumb" alt="" loading="lazy">
          <div class="ym-vibe-feed-release-details">
            <div class="ym-vibe-feed-release-title" title="${escapeHtml(album.title || '')}">${escapeHtml(album.title || '')}</div>
            <div class="ym-vibe-feed-release-desc">${escapeHtml(subText)}</div>
          </div>
          <div class="ym-vibe-feed-release-play-btn" title="Слушать">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 3 20 12 6 21 6 3"></polygon>
            </svg>
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => spaNavigate(albumUrl, e));
      carousel.appendChild(card);
    });

    const prevBtn = header.querySelector('.CarouselControls_control__L8t4i.prev');
    const nextBtn = header.querySelector('.CarouselControls_control__L8t4i.next');
    setupCarouselControls(carousel, prevBtn, nextBtn);

    section.appendChild(carousel);
    feedContainer.appendChild(section);
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

    const prevBtn = header.querySelector('.CarouselControls_control__L8t4i.prev');
    const nextBtn = header.querySelector('.CarouselControls_control__L8t4i.next');
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
      updateNavbarTransparency(false);
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

  // Expose API for external debug or settings
  window.__ymVibeEnhancer = {
    getItems: getAllVibeItems,
    activate: activateVibeItem,
    applyMode: applyVibeMode,
    refreshFeed: initVibeLandingFeed
  };

})();
