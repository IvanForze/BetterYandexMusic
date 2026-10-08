// =========================================================================
// BetterYandexMusic: Vibe Premiere Section (Exact 1-to-1 Native Render)
// API: GET https://api.music.yandex.ru/landing/block/premiere/smart-open-playlist/RECENT_TRACKS
// =========================================================================

function renderPremiereSection(feedContainer, premiereData) {
  if (!premiereData) return;
  const playlist = premiereData.playlist || {};
  const tracks = premiereData.tracks || [];
  if (!Array.isArray(tracks) || tracks.length === 0) return;

  const playlistUuid = playlist.playlistUuid || 'ps.dcda6558-a32e-454c-a984-3b56eab31262';
  const playlistTitle = playlist.title || 'Премьера';
  const playlistUrl = `/playlists/${playlistUuid}`;

  // Обложка плейлиста в шапке
  const rawCoverUri = premiereData.cover?.uri || playlist.cover?.uri || '';
  const cover100 = formatYandexImg(rawCoverUri, '100x100');
  const cover200 = formatYandexImg(rawCoverUri, '200x200');

  const section = document.createElement('section');
  section.className = 'CarouselWithColumnsBlock_root__v_qoo PlaylistWithTracks_root__jchZL ym-vibe-feed-section ym-premiere-section';
  section.setAttribute('data-intersection-property-id', 'premiere');
  section.setAttribute('data-test-id', 'SMART_OPEN_PLAYLIST');

  // 1. Шапка секции (обложка, заголовок с ссылкой и стрелочкой, описание, контролы карусели)
  const header = document.createElement('div');
  header.className = 'BlockHeader_root__j3mbg SkeletonBlock_headerContainer__fl8EX';
  header.innerHTML = `
    <div class="BlockHeader_start__ZrGP5">
      <div class="qaIScXjx1qyXuaIHXQIo _7gw1qGE6BeUAdSMbhRx ZcpulvHgF_wsgzB8Hye9 BlockHeader_coverContainer__lATZT">
        <img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG BlockHeader_cover__koOXq" alt="" loading="eager" aria-hidden="true" srcset="${escapeHtml(cover100)}, ${escapeHtml(cover200 || cover100)} 2x" src="${escapeHtml(cover100)}">
      </div>
      <div class="BlockHeader_textContainer___2wn9">
        <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB BlockHeader_title__5xlx6 ym-premiere-title-link" href="${escapeHtml(playlistUrl)}">
          <div class="VUb2BxfgkGQhG1RDQGwF BlockHeader_linkContainer__EuW_L">
            <span class="BlockHeader_linkText__Or6VB">
              <h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww BlockHeader_heading__4iqvS" id="_r_premiere_">${escapeHtml(playlistTitle)}</h2>
            </span>
            <svg class="TXa2RKc_Hf0QPdmUDMwI BlockHeader_titleIcon__GQFEK UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowRight_xs"></use>
            </svg>
          </div>
        </a>
        <span title="Лучшие новые треки для вас" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 jMyoZB5J9iZbzJmWOrF0 g3qWNP6xl__7qxNmtrvd _3_Mxw7Si7j2g4kWjlpR BlockHeader_description__hAk9D BlockHeader_description_widthLimit__CXxK1" id="_r_premiere_-description" style="-webkit-line-clamp: 2;">Лучшие новые треки для вас</span>
      </div>
    </div>
    <div class="CarouselWithColumnsBlock_controlsContainer__4_1Ao">
      <div class="CarouselControls_root__E_hwc CarouselWithColumnsBlock_controls__yCSFo">
        <button class="cpeagBA1_PblpJn8Xgtv pnM3iSP9keZOELI2oohr uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO undefined CarouselControls_control__L8t4i CarouselWithColumnsBlock_backwardControl__b_uKR" type="button" tabindex="-1" aria-hidden="true" disabled="" data-disabled="true" aria-live="off" aria-busy="false">
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
    </div>
  `;

  const titleLink = header.querySelector('.ym-premiere-title-link');
  if (titleLink) {
    titleLink.addEventListener('click', (e) => spaNavigate(playlistUrl, e));
  }
  section.appendChild(header);

  // 2. Список колонок с треками (по 6 треков в колонке)
  const carousel = document.createElement('ol');
  carousel.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_tracksContainer__uF8Tg ym-vibe-feed-premiere-carousel';
  carousel.setAttribute('aria-labelledby', '_r_premiere_');
  carousel.setAttribute('role', 'list');

  const tracksPerColumn = 6;
  for (let i = 0; i < tracks.length; i += tracksPerColumn) {
    const columnTracks = tracks.slice(i, i + tracksPerColumn);

    const li = document.createElement('li');
    li.className = 'VJ9IexhAEuYSCyGiMfN4 CarouselWithColumnsBlock_item__RBGs4 CarouselWithColumnsBlock_item_columns_two__46rgZ';

    const colDiv = document.createElement('div');
    colDiv.className = 'CarouselWithColumnsBlock_column__oMRES';

    columnTracks.forEach((t, tIdx) => {
      const trackId = String(t.id || t.realId || '');
      const trackTitle = t.title || 'Трек';
      const durationMs = t.durationMs || 180000;
      const album = (t.albums && t.albums[0]) || {};
      const albumId = album.id || '';
      const trackUrl = albumId ? `/album/${albumId}/track/${trackId}` : `/track/${trackId}`;

      const tCoverUri = t.coverUri || t.ogImage || album.coverUri || '';
      const tCover100 = formatYandexImg(tCoverUri, '100x100');
      const tCover200 = formatYandexImg(tCoverUri, '200x200');

      const artists = t.artists || [];
      const primaryArtist = artists[0]?.name || '';
      const ariaLabel = `${primaryArtist} ${trackTitle}`.trim();

      const isExplicit = t.contentRestrictions?.explicit === true ||
                         t.contentWarning === 'explicit' ||
                         (t.disclaimers && t.disclaimers.includes('explicit'));

      const isLiked = (typeof isTrackLiked === 'function' ? isTrackLiked(trackId) : false) || Boolean(t.liked);

      const artistsHtml = artists.map(a => `
        <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB Meta_text__Y5uYH Meta_link__IFDBA ym-premiere-artist-link" aria-label="Артист ${escapeHtml(a.name || '')}" href="/artist/${a.id}">
          <span class="_MWOVuZRvUQdXKTMcOPx Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR Meta_text__Y5uYH Meta_artistCaption__JESZi">${escapeHtml(a.name || '')}</span>
        </a>
      `).join(', ');

      const trackEl = document.createElement('div');
      trackEl.className = 'HorizontalCardContainer_root__YoAAP CommonTrack_root__i6shE ym-vibe-premiere-track';
      trackEl.setAttribute('aria-label', ariaLabel);
      trackEl.setAttribute('data-track-id', trackId);
      trackEl.setAttribute('data-intersection-property-id', `_r_prem_${i + tIdx}_`);

      trackEl.innerHTML = `
        <div class="PlayButtonWithCover_root__s6Orw TrackPlaylist_playButtonCell__Q6YT_">
          <div class="qaIScXjx1qyXuaIHXQIo wdE2qVRIlWUesuBfzCis ZcpulvHgF_wsgzB8Hye9 PlayButtonWithCover_cover__5__Ms">
            <img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG PlayButtonWithCover_coverImage__DhS1R" alt="Трек ${escapeHtml(trackTitle)}" loading="eager" srcset="${escapeHtml(tCover100)}, ${escapeHtml(tCover200 || tCover100)} 2x" src="${escapeHtml(tCover100)}">
            <div class="PlayButtonWithCover_control__iZy3t">
              <div class="PlayingAnimation_root__YrWz7 PlayingAnimation_root_stopAnimation__qOw_g PlayButtonWithCover_playingAnimation__HWuOW"></div>
              <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr undefined qU2apWBO1yyEK0lZ3lPO WsKeF73pWotx9W1tWdYY PlayButtonWithCover_playButton__rV9pQ ym-premiere-play-btn" type="button" aria-label="Воспроизведение" aria-live="off" aria-busy="false" data-track-id="${escapeHtml(trackId)}">
                <span class="JjlbHZ4FaP9EAcR_1DxF">
                  <svg class="J9wTKytjOWG73QMoN5WP PlayButtonWithCover_playButtonIcon__DRjkN UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true">
                    <use xlink:href="/icons/sprite.svg#play_filled_xs"></use>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
        <div class="Meta_root__R8n1h">
          <div class="Meta_metaContainer__7i2dp">
            <div class="Meta_titleContainer__gDuXr">
              <div class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR Meta_text__Y5uYH" style="-webkit-line-clamp: 1;">
                <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB Meta_albumLink__gASh6 ym-premiere-track-link" aria-label="Трек ${escapeHtml(trackTitle)}" href="${escapeHtml(trackUrl)}">
                  <span class="_MWOVuZRvUQdXKTMcOPx Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR Meta_text__Y5uYH Meta_title__GGBnH">${escapeHtml(trackTitle)}</span>
                </a>
              </div>
              ${isExplicit ? `
              <span class="Meta_explicitMarkContainer__BxMQg">
                <svg class="ExplicitMarkIcon_explicitMark__0BPeQ Meta_explicitMark__ocnCV Rkdd2vKC_3xa1eUdRdHP" focusable="false" aria-label="Возрастное ограничение 18+" aria-hidden="false">
                  <use xlink:href="/icons/sprite.svg#exclamation_xxxs"></use>
                </svg>
              </span>` : ''}
            </div>
            <div class="SeparatedArtists_root_variant_breakAll__34YbW SeparatedArtists_root_clamp__SyvjM Meta_text__Y5uYH Meta_artists__VnR52" style="-webkit-line-clamp: 1;">
              ${artistsHtml}
            </div>
          </div>
        </div>
        <div class="CommonControlsBar_root__N8b0F CommonControlsBar_controls__QrogT TrackPlaylist_controlsBarCell__6clda">
          <button type="button" class="ym-track-row-download-btn" aria-label="Скачать трек" title="Скачать трек" data-track-id="${escapeHtml(trackId)}">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O zIMibMuH7wcqUoW7KH1B IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr j1jXIVckFgZECecFzZMe qU2apWBO1yyEK0lZ3lPO undefined CommonControlsBar_item__qGErG CommonControlsBar_likeIcon__YqgZY ym-track-like-btn" type="button" aria-label="Нравится" aria-pressed="${isLiked ? 'true' : 'false'}" data-track-id="${escapeHtml(trackId)}" aria-live="off" aria-busy="false">
            <span class="JjlbHZ4FaP9EAcR_1DxF">
              <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
                <use xlink:href="/icons/sprite.svg#${isLiked ? 'like_filled_xxs' : 'like_xxs'}"></use>
              </svg>
            </span>
          </button>
          <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr undefined qU2apWBO1yyEK0lZ3lPO WsKeF73pWotx9W1tWdYY CommonControlsBar_item__qGErG CommonControlsBar_trailerIcon__ZHSBo ym-premiere-trailer-btn" type="button" aria-label="Запустить трейлер" data-album-id="${escapeHtml(albumId)}" data-intersection-property-id="onboarding-tooltip" aria-live="off" aria-busy="false">
            <span class="JjlbHZ4FaP9EAcR_1DxF">
              <svg class="J9wTKytjOWG73QMoN5WP UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true">
                <use xlink:href="/icons/sprite.svg#trailer_xs"></use>
              </svg>
            </span>
          </button>
          <div class="CommonControlsBar_item__qGErG CommonControlsBar_contextMenuWrapper__XjkaL">
            <span class="_MWOVuZRvUQdXKTMcOPx Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR CommonControlsBar_duration__un38A" aria-label="${escapeHtml(formatAriaDuration(durationMs))}" role="text">
              <span aria-hidden="true">${formatDuration(durationMs)}</span>
            </span>
            <div>
              <div>
                <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr j1jXIVckFgZECecFzZMe qU2apWBO1yyEK0lZ3lPO undefined zmtVwO34EPppZErNrlIC UOiSiy5boMAzphK1PFFN CommonControlsBar_contextMenu__EAq_c ym-track-menu-btn" type="button" aria-label="Контекстное меню" aria-expanded="false" aria-haspopup="menu" data-track-id="${escapeHtml(trackId)}" aria-live="off" aria-busy="false">
                  <span class="JjlbHZ4FaP9EAcR_1DxF">
                    <svg class="J9wTKytjOWG73QMoN5WP UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true">
                      <use xlink:href="/icons/sprite.svg#more_xs"></use>
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // SPA переходы
      const trackLink = trackEl.querySelector('.ym-premiere-track-link');
      if (trackLink) {
        trackLink.addEventListener('click', (e) => spaNavigate(trackUrl, e));
      }
      trackEl.querySelectorAll('.ym-premiere-artist-link').forEach(a => {
        const href = a.getAttribute('href');
        if (href) a.addEventListener('click', (e) => spaNavigate(href, e));
      });

      // Воспроизведение трека
      const playBtn = trackEl.querySelector('.ym-premiere-play-btn');
      if (playBtn) {
        playBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await handlePremiereTrackPlay(playlist, trackId, t);
        });
      }

      // Скачивание трека
      const dlBtn = trackEl.querySelector('.ym-track-row-download-btn');
      if (dlBtn) {
        dlBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();

          const meta = (typeof extractTrackMetadataFromRow === 'function' ? extractTrackMetadataFromRow(trackEl) : null) || {
            trackId,
            title: trackTitle,
            artist: primaryArtist,
            album: album.title || '',
            coverUri: tCover100
          };

          if (!meta || !meta.trackId) {
            if (typeof showDownloadToast === 'function') showDownloadToast('Не удалось определить ID трека', 'error');
            return;
          }

          dlBtn.classList.add('ym-row-dl-loading');
          dlBtn.innerHTML = `<svg class="ym-download-spinner" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path></svg>`;
          if (typeof showDownloadToast === 'function') showDownloadToast(`Скачивание: ${meta.artist} - ${meta.title}...`, 'info');

          try {
            if (typeof downloadTrack === 'function') {
              const res = await downloadTrack(meta);
              dlBtn.classList.remove('ym-row-dl-loading');
              dlBtn.classList.add('ym-row-dl-success');
              dlBtn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffdb4d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
              if (typeof showDownloadToast === 'function') showDownloadToast(`Сохранено: ${res.fileName || (meta.artist + ' - ' + meta.title)}`, 'success');
              setTimeout(() => {
                dlBtn.classList.remove('ym-row-dl-success');
                dlBtn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
              }, 3000);
            }
          } catch (err) {
            console.error('[DOWNLOADER] Ошибка скачивания трека из строки:', err);
            dlBtn.classList.remove('ym-row-dl-loading');
            dlBtn.classList.add('ym-row-dl-error');
            dlBtn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
            if (typeof showDownloadToast === 'function') showDownloadToast(`Ошибка скачивания: ${err.message}`, 'error');
            setTimeout(() => {
              dlBtn.classList.remove('ym-row-dl-error');
              dlBtn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
            }, 3000);
          }
        });
      }

      // Лайк трека
      const likeBtn = trackEl.querySelector('.ym-track-like-btn');
      if (likeBtn) {
        likeBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const isPressed = likeBtn.getAttribute('aria-pressed') === 'true';
          const next = !isPressed;
          likeBtn.setAttribute('aria-pressed', String(next));
          const svgUse = likeBtn.querySelector('svg use');
          if (svgUse) {
            svgUse.setAttribute('xlink:href', next ? '/icons/sprite.svg#like_filled_xxs' : '/icons/sprite.svg#like_xxs');
            svgUse.setAttribute('href', next ? '/icons/sprite.svg#like_filled_xxs' : '/icons/sprite.svg#like_xxs');
          }
          if (typeof toggleLikeTrack === 'function') {
            await toggleLikeTrack(trackId, isPressed);
          }
        });
      }

      // Трейлер альбома трека
      const trailerBtn = trackEl.querySelector('.ym-premiere-trailer-btn');
      if (trailerBtn && albumId) {
        trailerBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof handleTrailerPlay === 'function') {
            await handleTrailerPlay(albumId, tIdx);
          }
        });
      }

      // Контекстное меню
      const menuBtn = trackEl.querySelector('.ym-track-menu-btn');
      if (menuBtn) {
        menuBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof openTrackContextMenu === 'function') {
            openTrackContextMenu(menuBtn, t, playlist);
          }
        });
      }

      // Правый клик по строке трека открывает контекстное меню
      trackEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (typeof openTrackContextMenu === 'function') {
          openTrackContextMenu(trackEl, t, playlist);
        }
      });

      // Клик по всей строке трека (кроме кнопок и ссылок)
      trackEl.addEventListener('click', async (e) => {
        if (e.target.closest('button') || e.target.closest('a')) return;
        await handlePremiereTrackPlay(playlist, trackId, t);
      });

      colDiv.appendChild(trackEl);
    });

    li.appendChild(colDiv);
    carousel.appendChild(li);
  }

  // Настройка стрелок прокрутки
  const controls = header.querySelectorAll('.CarouselControls_control__L8t4i');
  const prevBtn = controls[0];
  const nextBtn = controls[1];
  setupCarouselControls(carousel, prevBtn, nextBtn);

  section.appendChild(carousel);
  feedContainer.appendChild(section);
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.floor((durationMs || 0) / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatAriaDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.floor((durationMs || 0) / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return ` ${m} мин, ${s} сек.`;
}

async function handlePremiereTrackPlay(playlistData, trackId, trackObj) {
  const player = getSafeActivePlayer();
  const currentTrack = player?.playbackState?.playerState?.track?.value || player?.playbackState?.playerState?.track;
  const currentTrackId = String(currentTrack?.id || currentTrack?.realId || '');

  if (currentTrackId === String(trackId)) {
    if (typeof player?.togglePause === 'function') {
      await player.togglePause();
    } else if (isPlayerPlaying(player) && typeof player?.pause === 'function') {
      player.pause();
    } else if (typeof player?.resume === 'function') {
      player.resume();
    } else if (typeof player?.play === 'function') {
      player.play();
    }
  } else {
    await playPlaylistTrackContext(playlistData, trackId, trackObj);
  }

  updateLandingPlaybackIndicators();
  setTimeout(updateLandingPlaybackIndicators, 60);
  setTimeout(updateLandingPlaybackIndicators, 250);
}
