// =========================================================================
// BetterYandexMusic: Vibe Settings Button & Popover
// =========================================================================

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

