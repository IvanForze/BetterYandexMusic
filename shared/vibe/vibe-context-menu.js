// =========================================================================
// BetterYandexMusic: Album Context Menu & Share Submenu Portal
// =========================================================================

  let activeContextMenuEl = null;
  let activeSubmenuEl = null;
  let submenuCloseTimer = null;

  function closeSubmenu(immediate = false) {
    if (submenuCloseTimer) {
      clearTimeout(submenuCloseTimer);
      submenuCloseTimer = null;
    }
    if (activeSubmenuEl) {
      const el = activeSubmenuEl;
      activeSubmenuEl = null;
      if (immediate) {
        if (el.parentNode) el.remove();
      } else {
        el.style.opacity = '0';
        el.style.transform = 'scale(0.96)';
        setTimeout(() => {
          if (el.parentNode) el.remove();
        }, 120);
      }
    }
    const shareBtn = activeContextMenuEl?.querySelector('[data-action="share"]');
    if (shareBtn) shareBtn.setAttribute('aria-expanded', 'false');
  }

  function closeAlbumContextMenu() {
    closeSubmenu(true);
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
    if (
      !e.target.closest('.ym-native-album-menu') &&
      !e.target.closest('.ym-native-album-submenu') &&
      !e.target.closest('.AlbumCard_menuButton__pxkA6') &&
      !e.target.closest('.ArtistCard_menuButton__EynXG') &&
      !e.target.closest('.ym-editorial-menu-btn') &&
      !e.target.closest('.ym-chart-menu-btn') &&
      !e.target.closest('.ym-track-menu-btn') &&
      !e.target.closest('.CommonControlsBar_contextMenu__EAq_c')
    ) {
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

    const card = buttonEl?.closest?.('.AlbumCard_root__vP6k4') || buttonEl?.closest?.('.laBJlJAaqEVS0i_4Ot3l') || buttonEl?.closest?.('li');
    const pinBtn = card?.querySelector('.AlbumCard_pinButton__Mdi_E, .ym-editorial-pin-btn');
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

        <!-- 5. Поделиться -->
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

    // Обработчик подменю шаринга (Portal в document.body как в нативном Яндекс Музыке)
    function openSubmenu() {
      if (submenuCloseTimer) {
        clearTimeout(submenuCloseTimer);
        submenuCloseTimer = null;
      }
      if (activeSubmenuEl) return;

      const shareBtn = menu.querySelector('button[data-action="share"]');
      if (!shareBtn) return;
      shareBtn.setAttribute('aria-expanded', 'true');

      const sub = document.createElement('div');
      sub.className = 's7_MO4NdsYs7nPQALD8W ym-native-album-submenu';
      sub.setAttribute('tabindex', '-1');
      sub.setAttribute('role', 'menu');
      sub.setAttribute('aria-orientation', 'vertical');
      sub.innerHTML = `
        <div class="ggP7WX2_erziDHFOo32s">
          <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" aria-live="off" aria-busy="false" data-action="copy-link">
            <span class="JjlbHZ4FaP9EAcR_1DxF">
              <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
                <use xlink:href="/icons/sprite.svg#chain_xxs"></use>
              </svg>Скопировать ссылку</span>
          </button>
          <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" aria-live="off" aria-busy="false" data-action="copy-html">
            <span class="JjlbHZ4FaP9EAcR_1DxF">
              <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
                <use xlink:href="/icons/sprite.svg#code_xxs"></use>
              </svg>HTML-код</span>
          </button>
        </div>
      `;

      document.body.appendChild(sub);
      activeSubmenuEl = sub;

      const shareRect = shareBtn.getBoundingClientRect();
      const subWidth = 205;
      let sLeft = shareRect.right + 2;
      let opensToLeft = false;
      if (sLeft + subWidth > window.innerWidth - 10) {
        sLeft = shareRect.left - subWidth - 2;
        opensToLeft = true;
      }
      let sTop = shareRect.top - 6;
      if (sTop + 90 > window.innerHeight - 10) {
        sTop = window.innerHeight - 100;
      }

      sub.style.position = 'fixed';
      sub.style.left = `${Math.round(sLeft)}px`;
      sub.style.top = `${Math.round(sTop)}px`;
      sub.style.zIndex = '10000000';
      sub.style.opacity = '0';
      sub.style.transform = 'scale(0.96)';
      sub.style.transformOrigin = opensToLeft ? 'top right' : 'top left';
      sub.style.transition = 'opacity 120ms ease, transform 120ms cubic-bezier(0.16, 1, 0.3, 1)';

      requestAnimationFrame(() => {
        sub.style.opacity = '1';
        sub.style.transform = 'scale(1)';
      });

      sub.addEventListener('mouseenter', () => {
        if (submenuCloseTimer) {
          clearTimeout(submenuCloseTimer);
          submenuCloseTimer = null;
        }
      });

      sub.addEventListener('mouseleave', () => {
        submenuCloseTimer = setTimeout(() => {
          closeSubmenu();
        }, 120);
      });

      sub.querySelectorAll('button[data-action]').forEach(sBtn => {
        sBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const action = sBtn.getAttribute('data-action');
          closeAlbumContextMenu();
          if (action === 'copy-link') {
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

    const shareBtn = menu.querySelector('button[data-action="share"]');
    if (shareBtn) {
      shareBtn.addEventListener('mouseenter', () => {
        openSubmenu();
      });
      shareBtn.addEventListener('mouseleave', () => {
        submenuCloseTimer = setTimeout(() => {
          closeSubmenu();
        }, 120);
      });
      shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (activeSubmenuEl) {
          closeSubmenu();
        } else {
          openSubmenu();
        }
      });
    }

    // При наведении на другие элементы родительского меню немедленно закрываем подменю
    menu.querySelectorAll('button[data-action]:not([data-action="share"])').forEach(otherBtn => {
      otherBtn.addEventListener('mouseenter', () => {
        closeSubmenu();
      });
    });

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
        }
      });
    });
  }

  function openPlaylistContextMenu(buttonEl, playlist, itemWrapper) {
    closeAlbumContextMenu();

    const pl = playlist?.playlist || playlist || {};
    const uuid = pl.playlistUuid || pl.uuid || pl.kind;
    const plUid = pl.uid;
    const kind = pl.kind;
    const title = pl.title || '';
    const isPinned = typeof isPlaylistPinned === 'function' ? isPlaylistPinned(uuid, pl) : false;
    const hasTrailer = Boolean(pl.trailer?.available || itemWrapper?.data?.trailer?.available);

    const menu = document.createElement('div');
    menu.className = 's7_MO4NdsYs7nPQALD8W ym-native-album-menu ym-native-playlist-menu';
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

        ${hasTrailer ? `
        <!-- 2. Трейлер -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="trailer">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#trailer_xxs"></use>
            </svg>
            Трейлер
          </span>
        </button>` : ''}

        <!-- 3. Моя волна по плейлисту -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="wave">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#vibe_xxs"></use>
            </svg>
            Моя волна по плейлисту
          </span>
        </button>

        <!-- 4. Поделиться -->
        <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 j1jXIVckFgZECecFzZMe qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="share">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#share_xxs"></use>
            </svg>
            Поделиться
          </span>
        </button>
      </div>
    `;

    document.body.appendChild(menu);
    activeContextMenuEl = menu;

    const rect = buttonEl.getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = 200;

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
    menu.style.transition = 'opacity 150ms cubic-bezier(0.16, 1, 0.3, 1), transform 150ms cubic-bezier(0.16, 1, 0.3, 1)';

    requestAnimationFrame(() => {
      menu.style.opacity = '1';
      menu.style.transform = 'scale(1)';
    });

    const card = buttonEl.closest('.PlaylistCard_root__i3pR4') || buttonEl.closest('li');
    const pinBtn = card?.querySelector('.ym-editorial-pin-btn');

    menu.querySelectorAll('button[data-action]').forEach(itemBtn => {
      itemBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = itemBtn.getAttribute('data-action');
        if (action === 'share') return;

        closeAlbumContextMenu();

        if (action === 'pin') {
          if (pinBtn) pinBtn.click();
          else if (typeof togglePinPlaylist === 'function') await togglePinPlaylist(uuid, !isPinned, pl);
        } else if (action === 'trailer') {
          if (typeof handleTrailerPlay === 'function') {
            await handleTrailerPlay(uuid);
          }
        } else if (action === 'wave') {
          if (typeof playVibeStation === 'function') {
            const seed = (plUid && kind) ? `playlist:${plUid}:${kind}` : `playlist:${uuid}`;
            await playVibeStation({
              stationId: seed,
              seeds: [seed],
              title: title ? `Моя волна: ${title}` : 'Моя волна'
            });
          }
        }
      });
    });

    const shareBtn = menu.querySelector('button[data-action="share"]');
    if (shareBtn) {
      shareBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeAlbumContextMenu();
        const playlistUrl = plUid && kind ? `https://music.yandex.ru/users/${plUid}/playlists/${kind}` : `https://music.yandex.ru/playlists/${uuid}`;
        try {
          await navigator.clipboard.writeText(playlistUrl);
          showMenuToast('Ссылка на плейлист скопирована');
        } catch (_) {
          showMenuToast('Не удалось скопировать ссылку');
        }
      });
    }
  }

  function openTrackContextMenu(buttonEl, track, playlist) {
    if (!buttonEl || !track) return;
    if (buttonEl.target) {
      buttonEl = buttonEl.target.closest('button') || buttonEl.currentTarget || buttonEl.target;
    }

    closeAlbumContextMenu();

    const trackId = String(track.id || track.realId || '');
    const album = (track.albums && track.albums[0]) || {};
    const albumId = album.id || '';
    const artists = track.artists || [];
    const firstArtist = artists[0] || {};
    const hasTrailer = Boolean(track.hasTrailer || album?.hasTrailer || (track.trailer && track.trailer.available));

    const trackRow = buttonEl?.closest?.('.HorizontalCardContainer_root__YoAAP') || buttonEl?.closest?.('.ym-track-row') || buttonEl?.closest?.('.ym-vibe-premiere-track');
    const likeBtn = trackRow?.querySelector('.ym-track-like-btn, .ym-chart-like-btn');
    const isLiked = likeBtn
      ? (likeBtn.getAttribute('aria-pressed') === 'true' || likeBtn.classList.contains('zIMibMuH7wcqUoW7KH1B'))
      : (typeof isTrackLiked === 'function' ? isTrackLiked(trackId) : false);

    const menu = document.createElement('div');
    menu.className = 's7_MO4NdsYs7nPQALD8W ym-native-album-menu ym-native-track-menu';
    menu.setAttribute('tabindex', '0');
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-orientation', 'vertical');

    // Флаги предотвращают повторную инжекцию из fullscreen-utils.js и track-downloader.js
    menu.dataset.ymContextMenuPatched = 'true';
    menu.dataset.ymDownloadOptionPatched = 'true';

    menu.innerHTML = `
      <div class="ggP7WX2_erziDHFOo32s">
        <!-- 1. Нравится -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitemcheckbox" aria-checked="${isLiked ? 'true' : 'false'}" tabindex="-1" data-action="like">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#${isLiked ? 'liked_xxs' : 'like_xxs'}"></use>
            </svg>
            ${isLiked ? 'Удалить из «Мне нравится»' : 'Нравится'}
          </span>
        </button>

        ${(hasTrailer || albumId) ? `
        <!-- 2. Трейлер -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="trailer">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#trailer_xxs"></use>
            </svg>
            Трейлер
          </span>
        </button>` : ''}

        <!-- 3. Моя волна по треку -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="wave">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#vibe_xxs"></use>
            </svg>
            Моя волна по треку
          </span>
        </button>

        <!-- 4. Развернуть на весь экран -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="fullscreen">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 12px;">
              <path d="M15 3h6v6"></path>
              <path d="M9 21H3v-6"></path>
              <path d="M21 3l-7 7"></path>
              <path d="M3 21l7-7"></path>
            </svg>
            Развернуть на весь экран
          </span>
        </button>

        <!-- 5. Скачать трек -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM ym-context-menu-download-btn" type="button" role="menuitem" tabindex="-1" data-action="download">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 12px;">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Скачать трек
          </span>
        </button>

        <!-- 6. Не нравится -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="dislike">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#dislike_xxs"></use>
            </svg>
            Не нравится
          </span>
        </button>

        <!-- 7. Добавить в плейлист -->
        <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 j1jXIVckFgZECecFzZMe qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-nested="" aria-expanded="false" aria-haspopup="menu" data-action="add-playlist">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#addToPlaylist_xxs"></use>
            </svg>
            Добавить в плейлист
            <svg class="KNLFZ4Jd_xKFInxHox4i l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true" style="margin-left: auto;">
              <use xlink:href="/icons/sprite.svg#arrowRight_xxs"></use>
            </svg>
          </span>
        </button>

        <!-- 8. Поделиться -->
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

        ${albumId ? `
        <!-- 9. Перейти к альбому -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="album">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#album_xxs"></use>
            </svg>
            Перейти к альбому
          </span>
        </button>` : ''}

        ${firstArtist.id ? `
        <!-- 10. Перейти к исполнителю -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="artist">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#artist_xxs"></use>
            </svg>
            Перейти к исполнителю
          </span>
        </button>` : ''}

        <!-- 11. О треке -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="info">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#info_xxs"></use>
            </svg>
            О треке
          </span>
        </button>
      </div>
    `;

    document.body.appendChild(menu);
    activeContextMenuEl = menu;

    buttonEl.setAttribute('aria-expanded', 'true');

    const rect = buttonEl.getBoundingClientRect();
    const menuWidth = 240;
    const menuHeight = 440;

    let left = rect.right - menuWidth;
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;

    let top = rect.bottom + 6;
    if (top + menuHeight > window.innerHeight - 10) {
      top = Math.max(10, rect.top - menuHeight - 6);
    }

    menu.style.position = 'fixed';
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    menu.style.zIndex = '9999999';
    menu.style.maxHeight = 'calc(100vh - 20px)';
    menu.style.overflowY = 'auto';
    menu.style.overflowX = 'hidden';
    menu.style.opacity = '0';
    menu.style.transform = 'scale(0.96)';
    menu.style.transformOrigin = 'top right';
    menu.style.transition = 'opacity 150ms cubic-bezier(0.16, 1, 0.3, 1), transform 150ms cubic-bezier(0.16, 1, 0.3, 1)';

    requestAnimationFrame(() => {
      menu.style.opacity = '1';
      menu.style.transform = 'scale(1)';
    });

    // Подменю «Поделиться»
    function openTrackShareSubmenu() {
      closeSubmenu(true);
      const shareBtn = menu.querySelector('button[data-action="share"]');
      if (!shareBtn) return;
      shareBtn.setAttribute('aria-expanded', 'true');

      const sub = document.createElement('div');
      sub.className = 's7_MO4NdsYs7nPQALD8W ym-native-album-submenu';
      sub.setAttribute('tabindex', '0');
      sub.setAttribute('role', 'menu');

      sub.innerHTML = `
        <div class="ggP7WX2_erziDHFOo32s">
          <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="copy-link">
            <span class="JjlbHZ4FaP9EAcR_1DxF">
              <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
                <use xlink:href="/icons/sprite.svg#link_xxs"></use>
              </svg>
              Скопировать ссылку
            </span>
          </button>
        </div>
      `;

      document.body.appendChild(sub);
      activeSubmenuEl = sub;

      const sRect = shareBtn.getBoundingClientRect();
      const subWidth = 200;
      let sLeft = sRect.right + 6;
      if (sLeft + subWidth > window.innerWidth - 10) {
        sLeft = sRect.left - subWidth - 6;
      }
      sub.style.position = 'fixed';
      sub.style.left = `${Math.round(sLeft)}px`;
      sub.style.top = `${Math.round(sRect.top)}px`;
      sub.style.zIndex = '10000000';

      sub.querySelector('button[data-action="copy-link"]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeAlbumContextMenu();
        const trackUrl = albumId ? `https://music.yandex.ru/album/${albumId}/track/${trackId}` : `https://music.yandex.ru/track/${trackId}`;
        try {
          await navigator.clipboard.writeText(trackUrl);
          showMenuToast('Ссылка на трек скопирована');
        } catch (_) {
          showMenuToast('Не удалось скопировать ссылку');
        }
      });
    }

    // Подменю «Добавить в плейлист»
    async function openTrackPlaylistSubmenu() {
      closeSubmenu(true);
      const plBtn = menu.querySelector('button[data-action="add-playlist"]');
      if (!plBtn) return;
      plBtn.setAttribute('aria-expanded', 'true');

      const sub = document.createElement('div');
      sub.className = 's7_MO4NdsYs7nPQALD8W ym-native-album-submenu';
      sub.setAttribute('tabindex', '0');
      sub.setAttribute('role', 'menu');
      sub.style.maxHeight = '320px';
      sub.style.overflowY = 'auto';

      sub.innerHTML = `
        <div class="ggP7WX2_erziDHFOo32s">
          <div style="padding: 10px 14px; font-size: 13px; opacity: 0.6;">Загрузка плейлистов...</div>
        </div>
      `;

      document.body.appendChild(sub);
      activeSubmenuEl = sub;

      const sRect = plBtn.getBoundingClientRect();
      const subWidth = 220;
      let sLeft = sRect.right + 6;
      if (sLeft + subWidth > window.innerWidth - 10) {
        sLeft = sRect.left - subWidth - 6;
      }
      sub.style.position = 'fixed';
      sub.style.left = `${Math.round(sLeft)}px`;
      sub.style.top = `${Math.round(sRect.top)}px`;
      sub.style.zIndex = '10000000';

      const root = window.__ym?.rootModel;
      const uid = root?.user?.account?.data?.uid || window.__ym_user_id;

      try {
        let playlists = [];
        if (uid) {
          const res = await fetch(`https://api.music.yandex.ru/users/${uid}/playlists/list`, {
            headers: {
              'x-requested-with': 'XMLHttpRequest',
              'x-yandex-music-client': 'YandexMusicWebNext/1.0.0',
              'x-yandex-music-multi-auth-user-id': String(uid)
            }
          });
          if (res.ok) {
            const data = await res.json();
            playlists = data?.result || [];
          }
        }

        const container = sub.querySelector('.ggP7WX2_erziDHFOo32s');
        if (!container) return;

        if (playlists.length === 0) {
          container.innerHTML = `
            <div style="padding: 10px 14px; font-size: 13px; opacity: 0.6;">Плейлисты не найдены</div>
          `;
          return;
        }

        container.innerHTML = playlists.map(pl => `
          <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-playlist-kind="${pl.kind}" data-playlist-title="${encodeURIComponent(pl.title || '')}">
            <span class="JjlbHZ4FaP9EAcR_1DxF" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${pl.title || 'Плейлист'}
            </span>
          </button>
        `).join('');

        container.querySelectorAll('button[data-playlist-kind]').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const kind = btn.getAttribute('data-playlist-kind');
            const plTitle = decodeURIComponent(btn.getAttribute('data-playlist-title') || '');
            closeAlbumContextMenu();

            try {
              const getRes = await fetch(`https://api.music.yandex.ru/users/${uid}/playlists/${kind}`, {
                headers: {
                  'x-requested-with': 'XMLHttpRequest',
                  'x-yandex-music-client': 'YandexMusicWebNext/1.0.0',
                  'x-yandex-music-multi-auth-user-id': String(uid)
                }
              });
              const plData = await getRes.json();
              const revision = plData?.result?.revision || 0;
              const diff = JSON.stringify([
                {
                  op: 'insert',
                  at: 0,
                  tracks: [{ id: String(trackId), albumId: albumId ? String(albumId) : undefined }]
                }
              ]);
              const postRes = await fetch(`https://api.music.yandex.ru/users/${uid}/playlists/${kind}/change-relative`, {
                method: 'POST',
                headers: {
                  'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                  'x-requested-with': 'XMLHttpRequest',
                  'x-yandex-music-client': 'YandexMusicWebNext/1.0.0',
                  'x-yandex-music-multi-auth-user-id': String(uid)
                },
                body: `diff=${encodeURIComponent(diff)}&revision=${revision}`
              });

              if (postRes.ok) {
                showMenuToast(`Трек добавлен в «${plTitle}»`);
              } else {
                showMenuToast('Не удалось добавить трек в плейлист');
              }
            } catch (err) {
              console.warn('[BYM] Playlist add error:', err);
              showMenuToast('Не удалось добавить трек в плейлист');
            }
          });
        });
      } catch (err) {
        console.warn('[BYM] Fetch playlists error:', err);
        const container = sub.querySelector('.ggP7WX2_erziDHFOo32s');
        if (container) {
          container.innerHTML = `<div style="padding: 10px 14px; font-size: 13px; opacity: 0.6;">Ошибка загрузки</div>`;
        }
      }
    }

    const shareBtn = menu.querySelector('button[data-action="share"]');
    if (shareBtn) {
      shareBtn.addEventListener('mouseenter', openTrackShareSubmenu);
      shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openTrackShareSubmenu();
      });
    }

    const playlistBtn = menu.querySelector('button[data-action="add-playlist"]');
    if (playlistBtn) {
      playlistBtn.addEventListener('mouseenter', openTrackPlaylistSubmenu);
      playlistBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openTrackPlaylistSubmenu();
      });
    }

    menu.querySelectorAll('button[data-action]').forEach(itemBtn => {
      const action = itemBtn.getAttribute('data-action');
      if (action !== 'share' && action !== 'add-playlist') {
        itemBtn.addEventListener('mouseenter', () => {
          closeSubmenu();
        });
      }

      itemBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (action === 'share' || action === 'add-playlist') return;

        closeAlbumContextMenu();

        if (action === 'like') {
          if (likeBtn) {
            likeBtn.click();
          } else {
            await toggleLikeTrack(trackId, isLiked, albumId);
            showMenuToast(!isLiked ? 'Добавлено в коллекцию' : 'Удалено из коллекции');
          }
        } else if (action === 'trailer') {
          if (albumId && typeof handleTrailerPlay === 'function') {
            await handleTrailerPlay(albumId);
          }
        } else if (action === 'wave') {
          if (typeof playVibeStation === 'function') {
            await playVibeStation({
              stationId: `track:${trackId}`,
              seeds: [`track:${trackId}`],
              title: track.title ? `Моя волна: ${track.title}` : 'Моя волна по треку'
            });
          }
        } else if (action === 'fullscreen') {
          if (typeof window.toggleNativeFullscreen === 'function') {
            window.toggleNativeFullscreen();
          } else {
            const fsBtn = document.querySelector('[class*="PlayerBar"] button[aria-label*="весь экран"], [data-test-id="FULLSCREEN_BUTTON"]');
            if (fsBtn) fsBtn.click();
          }
        } else if (action === 'download') {
          const dlBtn = trackRow?.querySelector('.ym-track-row-download-btn, .ym-chart-download-btn');
          if (dlBtn) {
            dlBtn.click();
          } else if (typeof window.__ym_download_track === 'function') {
            window.__ym_download_track(trackId);
          }
        } else if (action === 'dislike') {
          const root = window.__ym?.rootModel;
          const uid = root?.user?.account?.data?.uid || window.__ym_user_id;
          if (uid) {
            try {
              await fetch(`https://api.music.yandex.ru/users/${uid}/dislikes/tracks/add?track-id=${trackId}`, {
                method: 'POST',
                headers: {
                  'x-requested-with': 'XMLHttpRequest',
                  'x-yandex-music-client': 'YandexMusicWebNext/1.0.0',
                  'x-yandex-music-multi-auth-user-id': String(uid)
                }
              });
            } catch (_) {}
          }
          showMenuToast('Не рекомендовать этот трек');
        } else if (action === 'album') {
          if (albumId) spaNavigate(`/album/${albumId}`);
        } else if (action === 'artist') {
          if (firstArtist.id) spaNavigate(`/artist/${firstArtist.id}`);
        } else if (action === 'info') {
          if (typeof openTrackInfo === 'function') {
            openTrackInfo(trackId, albumId);
          }
        }
      });
    });
  }

  function openArtistContextMenu(buttonEl, artist, itemWrapper) {
    closeAlbumContextMenu();

    const art = artist?.artist || artist || {};
    const artistId = String(art.id || artist.id || '');
    const title = art.name || artist.title || '';
    const isPinned = typeof isArtistPinned === 'function' ? isArtistPinned(artistId) : false;
    const isLiked = typeof isArtistLiked === 'function' ? isArtistLiked(artistId) : false;
    const hasTrailer = Boolean(art.trailer?.available || itemWrapper?.data?.trailer?.available);

    const menu = document.createElement('div');
    menu.className = 's7_MO4NdsYs7nPQALD8W ym-native-album-menu ym-native-artist-menu';
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
              <use xlink:href="/icons/sprite.svg#${isLiked ? 'like_filled_xxs' : 'like_xxs'}"></use>
            </svg>
            ${isLiked ? 'Не нравится' : 'Нравится'}
          </span>
        </button>

        ${hasTrailer ? `
        <!-- 3. Трейлер -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="trailer">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#trailer_xxs"></use>
            </svg>
            Трейлер
          </span>
        </button>` : ''}

        <!-- 4. Моя волна по артисту -->
        <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="wave">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#vibe_xxs"></use>
            </svg>
            Моя волна по артисту
          </span>
        </button>

        <!-- 5. Поделиться -->
        <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 j1jXIVckFgZECecFzZMe qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM" type="button" role="menuitem" tabindex="-1" data-action="share">
          <span class="JjlbHZ4FaP9EAcR_1DxF">
            <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#share_xxs"></use>
            </svg>
            Поделиться
          </span>
        </button>
      </div>
    `;

    document.body.appendChild(menu);
    activeContextMenuEl = menu;

    const rect = buttonEl.getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = 220;

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
    menu.style.transition = 'opacity 150ms cubic-bezier(0.16, 1, 0.3, 1), transform 150ms cubic-bezier(0.16, 1, 0.3, 1)';

    requestAnimationFrame(() => {
      menu.style.opacity = '1';
      menu.style.transform = 'scale(1)';
    });

    const card = buttonEl.closest('.ArtistCard_root__x67BK') || buttonEl.closest('li');
    const pinBtn = card?.querySelector('.ym-editorial-pin-btn');
    const likeBtn = card?.querySelector('.ym-editorial-like-btn');

    menu.querySelectorAll('button[data-action]').forEach(itemBtn => {
      itemBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = itemBtn.getAttribute('data-action');
        if (action === 'share') return;

        closeAlbumContextMenu();

        if (action === 'pin') {
          if (pinBtn) pinBtn.click();
          else if (typeof togglePinArtist === 'function') await togglePinArtist(artistId, !isPinned);
        } else if (action === 'like') {
          if (likeBtn) likeBtn.click();
          else if (typeof toggleLikeArtist === 'function') await toggleLikeArtist(artistId, isLiked);
        } else if (action === 'trailer') {
          if (typeof handleTrailerPlay === 'function') {
            await handleTrailerPlay(artistId);
          }
        } else if (action === 'wave') {
          if (typeof playArtistWave === 'function') {
            await playArtistWave(artistId);
          }
        }
      });
    });

    const shareBtn = menu.querySelector('button[data-action="share"]');
    if (shareBtn) {
      shareBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeAlbumContextMenu();
        const artistUrl = `https://music.yandex.ru/artist/${artistId}`;
        try {
          await navigator.clipboard.writeText(artistUrl);
          showMenuToast('Ссылка на артиста скопирована');
        } catch (_) {
          showMenuToast('Не удалось скопировать ссылку');
        }
      });
    }
  }

  if (typeof window !== 'undefined') {
    window.openAlbumContextMenu = openAlbumContextMenu;
    window.openPlaylistContextMenu = openPlaylistContextMenu;
    window.openTrackContextMenu = openTrackContextMenu;
    window.openArtistContextMenu = openArtistContextMenu;
  }


