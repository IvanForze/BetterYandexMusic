// =========================================================================
// BetterYandexMusic: Editorial Compilations Sections (Тренды)
// Exact 1-to-1 Native Implementation from Yandex Music
// Supports:
// - Редакция х Алгоритмы (ml_playlists)
// - Редакция лайкает (editors_playlists)
// - Вы могли пропустить (foreign)
// - Осенняя (letnyaya_podborka)
// - Открытия (RUSSIA_newcomers)
// - Зажглись от Искры (ALL_isrka)
// - Артисты комментируют (ALL_albums_with_commentary)
// - Они взлетели в Нитро (nitro_playlists)
// - Выбор редакции (RUSSIA_editorial_compilation)
// =========================================================================

function renderEditorialCompilationSection(feedContainer, config, sectionData) {
  if (!sectionData) return;
  const items = sectionData.items || sectionData.result?.items || [];
  if (!Array.isArray(items) || items.length === 0) return;

  const section = document.createElement('section');
  section.className = 'CarouselBlock_root__aeOla ym-vibe-feed-section ym-editorial-section';
  section.setAttribute('data-intersection-property-id', config.id);
  section.setAttribute('data-test-id', config.testId || 'EDITORIAL_COMPILATION');

  const header = document.createElement('div');
  header.className = 'BlockHeader_root__j3mbg SkeletonBlock_headerContainer__fl8EX';
  header.innerHTML = `
    <div class="BlockHeader_start__ZrGP5">
      <div class="BlockHeader_textContainer___2wn9">
        <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB BlockHeader_title__5xlx6" href="${escapeHtml(config.viewAllActionLink || '#')}">
          <div class="VUb2BxfgkGQhG1RDQGwF BlockHeader_linkContainer__EuW_L">
            <span class="BlockHeader_linkText__Or6VB">
              <h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww BlockHeader_heading__4iqvS" id="_r_${escapeHtml(config.id)}_">${escapeHtml(config.title)}</h2>
            </span>
            <svg class="TXa2RKc_Hf0QPdmUDMwI BlockHeader_titleIcon__GQFEK UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowRight_xs"></use>
            </svg>
          </div>
        </a>
        ${config.description ? `
        <span style="-webkit-line-clamp: 2;" title="${escapeHtml(config.description)}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 jMyoZB5J9iZbzJmWOrF0 g3qWNP6xl__7qxNmtrvd _3_Mxw7Si7j2g4kWjlpR BlockHeader_description__hAk9D BlockHeader_description_widthLimit__CXxK1">
          ${escapeHtml(config.description)}
        </span>` : ''}
      </div>
    </div>
    <div class="CarouselControls_root__E_hwc CarouselBlock_controls__vsHCR">
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
  if (titleLink && config.viewAllActionLink) {
    titleLink.addEventListener('click', (e) => spaNavigate(config.viewAllActionLink, e));
  }
  section.appendChild(header);

  const carousel = document.createElement('ol');
  carousel.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_container__9IxUi SkeletonBlock_important__faY0E ym-vibe-feed-editorial-carousel';
  carousel.setAttribute('aria-labelledby', `_r_${config.id}_`);
  carousel.setAttribute('role', 'list');

  items.forEach((itemWrapper) => {
    const itemType = itemWrapper.type;
    const itemData = itemWrapper.data || {};

    let title = '';
    let subtitle = '';
    let coverUri = '';
    let url = '';
    let isRound = false;
    let hasTrailer = false;
    let itemId = '';
    let onPlay = null;

    if (itemType === 'liked_playlist_item' || itemData.playlist) {
      const pl = itemData.playlist || {};
      title = pl.title || '';
      const likesCount = itemData.likesCount || pl.likesCount;
      subtitle = likesCount ? `${Number(likesCount).toLocaleString('ru-RU')} лайков` : '';
      coverUri = pl.cover?.uri || '';
      const uuid = pl.playlistUuid || pl.uuid || pl.kind;
      url = pl.uid ? `/users/${pl.uid}/playlists/${pl.kind}` : `/playlists/${uuid}`;
      itemId = uuid;
      hasTrailer = Boolean(itemData.trailer?.available || pl.trailer?.available);
      onPlay = async () => {
        if (typeof playPlaylistTrackContext === 'function') {
          await playPlaylistTrackContext(pl);
        }
      };
    } else if (itemType === 'album_item' || itemData.album) {
      const alb = itemData.album || {};
      title = alb.title || '';
      const artists = itemData.artists || alb.artists || [];
      subtitle = artists.map(a => a.name).filter(Boolean).join(', ');
      coverUri = alb.cover?.uri || '';
      url = `/album/${alb.id}`;
      itemId = alb.id;
      hasTrailer = Boolean(itemData.trailer?.available || alb.trailer?.available);
      onPlay = async () => {
        if (typeof playAlbumContext === 'function') {
          await playAlbumContext(alb.id);
        }
      };
    } else if (itemType === 'artist_item' || itemData.artist) {
      const art = itemData.artist || {};
      title = art.name || '';
      subtitle = 'Исполнитель';
      coverUri = art.cover?.uri || '';
      url = `/artist/${art.id}`;
      itemId = art.id;
      isRound = true;
      hasTrailer = Boolean(itemData.trailer?.available || art.trailer?.available);
      onPlay = async () => {
        if (typeof playArtistWave === 'function') {
          await playArtistWave(art.id);
        }
      };
    } else {
      return;
    }

    const cover100 = coverUri ? formatYandexImg(coverUri, '200x200') : '';
    const cover200 = coverUri ? formatYandexImg(coverUri, '400x400') : '';

    const isPinnedInitially = itemType === 'album_item'
      ? (typeof isAlbumPinned === 'function' ? isAlbumPinned(itemId) : false)
      : (itemType === 'liked_playlist_item' ? (typeof isPlaylistPinned === 'function' ? isPlaylistPinned(itemId, itemData.playlist) : false) : false);
    const initialPinIcon = isPinnedInitially ? '/icons/sprite.svg#pin_filled_xxs' : '/icons/sprite.svg#pin_xxs';

    const li = document.createElement('li');
    li.className = 'VJ9IexhAEuYSCyGiMfN4 CarouselBlock_item__DatZ2 CarouselBlock_important__AARmP';
    li.setAttribute('data-item-id', itemId);
    li.setAttribute('data-item-type', itemType);
    if (itemData.playlist?.uid) li.setAttribute('data-playlist-uid', String(itemData.playlist.uid));
    if (itemData.playlist?.kind) li.setAttribute('data-playlist-kind', String(itemData.playlist.kind));

    li.innerHTML = `
      <div class="laBJlJAaqEVS0i_4Ot3l ${isRound ? 'ArtistCard_root__x67BK' : 'PlaylistCard_root__i3pR4'}" data-test-id="${itemType === 'artist_item' ? 'ARTIST_ITEM' : (itemType === 'album_item' ? 'ALBUM_ITEM' : 'PLAYLIST_ITEM')}" data-item-id="${escapeHtml(itemId)}" data-item-type="${escapeHtml(itemType)}" data-playlist-uid="${escapeHtml(String(itemData.playlist?.uid || ''))}" data-playlist-kind="${escapeHtml(String(itemData.playlist?.kind || ''))}">
        <div class="qaIScXjx1qyXuaIHXQIo _7gw1qGE6BeUAdSMbhRx ZcpulvHgF_wsgzB8Hye9 gtfPudKIIbfkwmuOBzwI ${isRound ? 'ArtistCard_cover__29ShU' : 'PlaylistCard_cover__tpK5L withShadow'}">
          <div class="${isRound ? 'ArtistCard_coverBlock__dBL4x' : 'PlaylistCard_coverBlock__1slsN'}">
            ${cover100 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG ${isRound ? 'ArtistCard_image__pONJx' : 'PlaylistCard_image__Li6oy'}" alt="${escapeHtml(title)}" loading="lazy" aria-hidden="true" srcset="${escapeHtml(cover100)}, ${escapeHtml(cover200 || cover100)} 2x" src="${escapeHtml(cover100)}">` : ''}
            <div class="KL50tMDvfAdw_9MzcVht PBhQ1krUFiAybu_BS2YE cSCPJSa6Lx6OnpM4ljX9 ${isRound ? 'ArtistCard_controls__jsqqI' : 'PlaylistCard_controls__Ej8Rz'}">
              <div class="P6gOmyFtXyetUz0dqhF3">
                <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 WtFdWDF44egSVM_YiMUX qU2apWBO1yyEK0lZ3lPO ${isPinnedInitially ? 'PinButton_animation_scaled__Aj6LA' : 'PinButton_animation_unscaled__QM3sC'} ${isRound ? 'ArtistCard_pinButton__LU9TL ArtistCard_control___qv5j' : 'AlbumCard_pinButton__Mdi_E AlbumCard_control__qx7Xh'} ym-editorial-pin-btn" type="button" aria-label="${isPinnedInitially ? 'Открепить' : 'Закрепить'}" aria-pressed="${isPinnedInitially ? 'true' : 'false'}" aria-live="off" aria-busy="false" data-item-id="${escapeHtml(itemId)}" data-item-type="${escapeHtml(itemType)}">
                  <span class="JjlbHZ4FaP9EAcR_1DxF">
                    <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
                      <use xlink:href="${initialPinIcon}"></use>
                    </svg>
                  </span>
                </button>
              </div>
              <div class="bL0wE1Bui8zpIZbvMVL3">
                <div class="RvWjZle1erRBXzJEF9Zj">
                  ${hasTrailer ? `
                  <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 WtFdWDF44egSVM_YiMUX qU2apWBO1yyEK0lZ3lPO WsKeF73pWotx9W1tWdYY ${isRound ? 'ArtistCard_trailerButton__a2NHm ArtistCard_control___qv5j' : 'PlaylistCard_trailerButton__Qjg_U PlaylistCard_control__73YUq'} ym-editorial-trailer-btn" type="button" aria-label="Запустить трейлер" aria-live="off" aria-busy="false" data-item-id="${escapeHtml(itemId)}" data-item-type="${escapeHtml(itemType)}" data-playlist-uid="${escapeHtml(String(itemData.playlist?.uid || ''))}" data-playlist-kind="${escapeHtml(String(itemData.playlist?.kind || ''))}">
                    <span class="JjlbHZ4FaP9EAcR_1DxF">
                      <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
                        <use xlink:href="/icons/sprite.svg#trailer_xxs"></use>
                      </svg>
                    </span>
                  </button>` : ''}
                  <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p undefined qU2apWBO1yyEK0lZ3lPO WsKeF73pWotx9W1tWdYY ${isRound ? 'ArtistCard_playButton__XZoTr ArtistCard_control___qv5j' : 'PlaylistCard_playButton__eaduk PlaylistCard_control__73YUq'} ym-editorial-play-btn" type="button" aria-label="Воспроизведение" aria-live="off" aria-busy="false" data-item-id="${escapeHtml(itemId)}" data-item-type="${escapeHtml(itemType)}">
                    <span class="JjlbHZ4FaP9EAcR_1DxF">
                      <svg class="J9wTKytjOWG73QMoN5WP Seq0GowcqQmiA9LdLP_g" viewBox="0 0 24 24" width="24" height="24" focusable="false" aria-hidden="true">
                        <use xlink:href="/icons/sprite.svg#play_filled_xl"></use>
                      </svg>
                    </span>
                  </button>
                </div>
                <div class="bBh7lvgdfF7bqNqlK78Q">
                  <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 WtFdWDF44egSVM_YiMUX qU2apWBO1yyEK0lZ3lPO zmtVwO34EPppZErNrlIC ${isRound ? 'ArtistCard_menuButton__LU9TL ArtistCard_control___qv5j' : 'AlbumCard_menuButton__pxkA6 AlbumCard_control__qx7Xh'} ym-editorial-menu-btn" type="button" aria-label="Контекстное меню" aria-expanded="false" aria-haspopup="menu" aria-live="off" aria-busy="false" data-item-id="${escapeHtml(itemId)}" data-item-type="${escapeHtml(itemType)}">
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
        <div class="IO4kvpDGNI2J0CHwcKSf">
          <div class="l8SktNpJd30JWp1owp_b Mb33JzAWx9EjbQAeScFt PVBDIXF2RTUThmbNT9sV">
            <div class="LmhA6nlLyzxwYIX31gYa">
              <div class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 jMyoZB5J9iZbzJmWOrF0 mxSPe5xpZnie9gpIqacd _3_Mxw7Si7j2g4kWjlpR FAmeEGy52GX1k0xZuPDn" style="-webkit-line-clamp: 2;">
                <div class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 jMyoZB5J9iZbzJmWOrF0 mxSPe5xpZnie9gpIqacd _3_Mxw7Si7j2g4kWjlpR" aria-hidden="true" style="-webkit-line-clamp: 2;">
                  <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB ${isRound ? 'ArtistCard_titleLink__G8Puz' : 'PlaylistCard_titleLink__H8qEc'} ym-editorial-link" aria-label="${escapeHtml(title)} " tabindex="-1" href="${escapeHtml(url)}">${escapeHtml(title)}</a>
                </div>
              </div>
            </div>
            ${subtitle ? `
            <div class="SeparatedArtists_root_variant_breakAll__34YbW SeparatedArtists_root_clamp__SyvjM" style="-webkit-line-clamp: 1;">
              <span class="_MWOVuZRvUQdXKTMcOPx mxSPe5xpZnie9gpIqacd _3_Mxw7Si7j2g4kWjlpR">${escapeHtml(subtitle)}</span>
            </div>` : ''}
          </div>
        </div>
      </div>
    `;

    // Navigation on click
    li.querySelectorAll('.ym-editorial-link').forEach(linkEl => {
      linkEl.addEventListener('click', (e) => spaNavigate(url, e));
    });

    const coverBlock = li.querySelector('.qaIScXjx1qyXuaIHXQIo');
    if (coverBlock) {
      coverBlock.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        spaNavigate(url, e);
      });
    }

    // Pin button
    const pinBtn = li.querySelector('.ym-editorial-pin-btn');
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

        if (itemType === 'album_item') {
          if (typeof togglePinAlbum === 'function') await togglePinAlbum(itemId, nextState);
        } else if (itemType === 'liked_playlist_item') {
          if (typeof togglePinPlaylist === 'function') await togglePinPlaylist(itemId, nextState, itemData.playlist);
        }
      });
    }

    // Play button
    const playBtn = li.querySelector('.ym-editorial-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const p = getSafeActivePlayer();
        let state = { isMatch: false, isPlaying: false };
        if (itemType === 'album_item' && typeof isAlbumCurrentlyPlaying === 'function') {
          state = isAlbumCurrentlyPlaying(itemId);
        } else if (itemType === 'liked_playlist_item' && typeof isPlaylistCurrentlyPlaying === 'function') {
          state = isPlaylistCurrentlyPlaying(itemId, itemData.playlist);
        } else if (itemType === 'artist_item' && typeof isArtistCurrentlyPlaying === 'function') {
          state = isArtistCurrentlyPlaying(itemId);
        }

        if (state.isMatch) {
          if (typeof p?.togglePause === 'function') {
            p.togglePause();
          } else if (state.isPlaying && typeof p?.pause === 'function') {
            p.pause();
          } else if (!state.isPlaying && (typeof p?.resume === 'function' || typeof p?.play === 'function')) {
            if (p.resume) p.resume();
            else p.play();
          }
        } else if (typeof onPlay === 'function') {
          await onPlay();
        }

        if (typeof updateLandingPlaybackIndicators === 'function') {
          updateLandingPlaybackIndicators();
          setTimeout(updateLandingPlaybackIndicators, 60);
          setTimeout(updateLandingPlaybackIndicators, 250);
          setTimeout(updateLandingPlaybackIndicators, 600);
        }
      });
    }

    // Trailer button
    const trailerBtn = li.querySelector('.ym-editorial-trailer-btn');
    if (trailerBtn && hasTrailer) {
      trailerBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const trailerTarget = itemType === 'album_item'
          ? itemId
          : {
              type: itemType,
              id: itemId,
              uuid: itemId,
              uid: itemData.playlist?.uid,
              kind: itemData.playlist?.kind,
              playlist: itemData.playlist
            };
        const isPlaying = typeof isAlbumTrailerCurrentlyPlaying === 'function' && isAlbumTrailerCurrentlyPlaying(trailerTarget);
        const p = getSafeActivePlayer();
        if (isPlaying) {
          if (typeof p?.togglePause === 'function') p.togglePause();
          else if (typeof p?.pause === 'function') p.pause();
        } else {
          if (typeof handleTrailerPlay === 'function') {
            await handleTrailerPlay(trailerTarget);
          } else if (typeof playAlbumTrailer === 'function') {
            await playAlbumTrailer(trailerTarget);
          }
        }
        if (typeof updateLandingPlaybackIndicators === 'function') {
          updateLandingPlaybackIndicators();
          setTimeout(updateLandingPlaybackIndicators, 60);
          setTimeout(updateLandingPlaybackIndicators, 250);
        }
      });
    }

    // Context menu button (троеточие)
    const menuBtn = li.querySelector('.ym-editorial-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (itemType === 'album_item' && typeof openAlbumContextMenu === 'function') {
          openAlbumContextMenu(menuBtn, itemData.album || { id: itemId, title }, itemWrapper);
        } else if (itemType === 'liked_playlist_item' && typeof openPlaylistContextMenu === 'function') {
          openPlaylistContextMenu(menuBtn, itemData.playlist || { id: itemId, title }, itemWrapper);
        } else if (typeof openAlbumContextMenu === 'function') {
          openAlbumContextMenu(menuBtn, { id: itemId, title }, itemWrapper);
        }
      });
      menuBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      });
    }

    carousel.appendChild(li);
  });

  const controls = header.querySelectorAll('.CarouselControls_control__L8t4i');
  if (controls.length >= 2 && typeof setupCarouselControls === 'function') {
    setupCarouselControls(carousel, controls[0], controls[1]);
  }

  section.appendChild(carousel);
  feedContainer.appendChild(section);
}
