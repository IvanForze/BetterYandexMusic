// =========================================================================
// BetterYandexMusic: Vibe In Style Section
// =========================================================================

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

