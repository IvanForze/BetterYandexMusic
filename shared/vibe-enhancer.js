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

  function applyVibeMode(mode) {
    if (typeof document === 'undefined') return;
    const isNoWheel = mode === 'no_wheel';
    if (document.documentElement) {
      if (isNoWheel) document.documentElement.classList.add('ym-vibe-no-wheel');
      else document.documentElement.classList.remove('ym-vibe-no-wheel');
    }
    if (document.body) {
      if (isNoWheel) document.body.classList.add('ym-vibe-no-wheel');
      else document.body.classList.remove('ym-vibe-no-wheel');
    }
    ensureVibeTransparencyStyles();
    updateNavbarTransparency(isNoWheel);
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
    // Only show button in "no_wheel" mode!
    if (getVibeDesignMode() !== 'no_wheel') {
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

  // 7. Observer to maintain button injection on SPA route changes and navbar transparency
  const observer = new MutationObserver(() => {
    checkAndInjectVibeButton();
    trackAsideWidth();
    if (getVibeDesignMode() === 'no_wheel') {
      updateNavbarTransparency(true);
    }
  });

  if (typeof document !== 'undefined') {
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
    // Initial check
    setTimeout(initVibeMode, 500);
    setTimeout(initVibeMode, 1500);
    setTimeout(initVibeMode, 3000);
  }

  // Expose API for external debug or settings
  window.__ymVibeEnhancer = {
    getItems: getAllVibeItems,
    activate: activateVibeItem,
    applyMode: applyVibeMode
  };

})();
