function openNativeFullscreen() {
  const btn = document.querySelector('button[aria-label*="Плеер на весь экран"], button[class*="FullscreenPlayerDesktopButton_button"]');
  if (btn) {
    console.log('[SYNC] Found dedicated fullscreen button, triggering click');
    btn.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true
    }));
    btn.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true
    }));
    btn.click();
    return true;
  }

  // Cover image click (specifically for VibePlayerBar / My Wave cover image click)
  const coverImg = document.querySelector('[class*="AlbumCover_coverContainer"] img, [class*="VibePlayerBar_"] [class*="AlbumCover_cover"] img');
  if (coverImg) {
    console.log('[SYNC] Found AlbumCover image, triggering click to open fullscreen');
    coverImg.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true
    }));
    coverImg.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true
    }));
    coverImg.click();
    return true;
  }

  // Fallback: look inside any cover container for a button
  const coverContainer = document.querySelector('[class*="coverContainer"], [class*="PlayerBarDesktopWithBackgroundProgressBar_coverContainer"]');
  if (coverContainer) {
    const fallbackBtn = coverContainer.querySelector('button');
    if (fallbackBtn) {
      console.log('[SYNC] Found button inside cover container, triggering click');
      fallbackBtn.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true
      }));
      fallbackBtn.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true
      }));
      fallbackBtn.click();
      return true;
    }
  }

  // Double fallback to cover images
  const fallbacks = ['[class*="PlayerBarDesktop_cover"]', '[class*="PlayerBar_cover"]', '[class*="PlayerBar_trackCover"]', '[class*="VibePlayerBar_cover"]', '[class*="PlayerBarDesktop_root"] img', '[class*="PlayerBar_"] img', '[class*="VibePlayerBar_"] img'];
  for (const sel of fallbacks) {
    const el = document.querySelector(sel);
    if (el) {
      console.log('[SYNC] Firing events on fallback cover element:', el);
      let current = el;
      for (let i = 0; i < 5; i++) {
        if (!current || current === document.body) break;
        current.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true
        }));
        current.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true
        }));
        current.click();
        current = current.parentElement;
      }
      return true;
    }
  }
  return false;
}

function toggleNativeFullscreen() {
  const isFullscreen = !!document.querySelector('[class*="FullscreenPlayerDesktop_root"]');
  if (isFullscreen) {
    const closeBtn = document.querySelector('[class*="FullscreenPlayerDesktop_closeButton"]');
    if (closeBtn) {
      closeBtn.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true
      }));
      closeBtn.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true
      }));
      closeBtn.click();
      return;
    }
  }
  openNativeFullscreen();
}

function checkContextMenuAndAddFullscreenOption(specificMenu) {
  const contextMenu = specificMenu || document.querySelector('[role="menu"], [class*="ContextMenu_root"], [class*="VibeContextMenu_root"]');
  if (!contextMenu) return;
  
  // Skip if already checked and decided not to patch, or already patched
  if (contextMenu.dataset.ymContextMenuPatched === 'true') return;
  
  const innerText = contextMenu.innerText || '';
  const isTrackMenu = innerText.includes('Моя волна по треку') || innerText.toLowerCase().includes('моя волна по треку');
  const hasTrackIcon = !!contextMenu.querySelector('svg use[xlink\\:href*="vibe"]');
  
  if (!isTrackMenu && !hasTrackIcon) {
    return;
  }
  
  console.log('[SYNC] Found track context menu. Adding fullscreen option...');

  // Mark context menu as patched
  contextMenu.dataset.ymContextMenuPatched = 'true';
  
  const container = contextMenu.querySelector('[class*="ContextMenu_menu"], [class*="ContextMenu_list"], .ggP7WX2_erziDHFOo32s') || contextMenu;
  if (!container) return;
  
  const siblingButton = container.querySelector('button');
  const newBtn = document.createElement('button');
  newBtn.className = siblingButton ? siblingButton.className : 'cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM';
  newBtn.type = 'button';
  newBtn.setAttribute('role', 'menuitem');
  newBtn.setAttribute('tabindex', '-1');
  
  newBtn.innerHTML = `
    <span class="JjlbHZ4FaP9EAcR_1DxF">
      <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 12px;">
        <path d="M15 3h6v6" />
        <path d="M9 21H3v-6" />
        <path d="M21 3l-7 7" />
        <path d="M3 21l7-7" />
      </svg>
      Развернуть на весь экран
    </span>
  `;
  
  newBtn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    toggleNativeFullscreen();
    contextMenu.remove();
  });
  
  const vibeBtn = Array.from(container.querySelectorAll('button')).find(btn => {
    const text = (btn.innerText || '').toLowerCase().replace(/\s+/g, ' ');
    return text.includes('моя волна по треку');
  });
  
  if (vibeBtn) {
    vibeBtn.parentNode.insertBefore(newBtn, vibeBtn.nextSibling);
    console.log('[SYNC] Injected button after "Моя волна по треку" button');
  } else {
    container.insertBefore(newBtn, container.firstChild);
    console.log('[SYNC] Injected button at start of context menu');
  }
}

// Observe body for dynamic context menu additions to prevent intervals lag
if (typeof window !== 'undefined' && !window.ymContextMenuObserver) {
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const menu = node.matches('[role="menu"]') ? node : node.querySelector('[role="menu"], [class*="ContextMenu_root"], [class*="VibeContextMenu_root"]');
          if (menu) {
            // Wait 50ms for React rendering to populate the menu items
            setTimeout(() => checkContextMenuAndAddFullscreenOption(menu), 50);
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.ymContextMenuObserver = observer;
  console.log('[SYNC] Context menu MutationObserver successfully registered');
}