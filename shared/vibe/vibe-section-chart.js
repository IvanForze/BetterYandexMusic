// =========================================================================
// BetterYandexMusic: Chart Section (Чарт - Тренды)
// Exact 1-to-1 Native Implementation from Yandex Music
// API: GET https://api.music.yandex.ru/landing/block/chart
// =========================================================================

function formatDurationMs(ms) {
  if (!ms || isNaN(ms)) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function renderChartSection(feedContainer, chartData) {
  if (!chartData) return;
  const rawTracks = chartData.chart?.tracks || chartData.chart || [];
  if (!Array.isArray(rawTracks) || rawTracks.length === 0) return;

  const section = document.createElement('section');
  section.className = 'CarouselWithColumnsBlock_root__v_qoo ym-vibe-feed-section ym-chart-section';
  section.setAttribute('data-intersection-property-id', 'ALL_chart');
  section.setAttribute('data-test-id', 'CHART_TRACKS');

  const header = document.createElement('div');
  header.className = 'BlockHeader_root__j3mbg SkeletonBlock_headerContainer__fl8EX';
  header.innerHTML = `
    <div class="BlockHeader_start__ZrGP5">
      <div class="BlockHeader_textContainer___2wn9">
        <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB BlockHeader_title__5xlx6" href="/chart">
          <div class="VUb2BxfgkGQhG1RDQGwF BlockHeader_linkContainer__EuW_L">
            <span class="BlockHeader_linkText__Or6VB">
              <h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww BlockHeader_heading__4iqvS" id="_r_s1_">Чарт</h2>
            </span>
            <svg class="TXa2RKc_Hf0QPdmUDMwI BlockHeader_titleIcon__GQFEK UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowRight_xs"></use>
            </svg>
          </div>
        </a>
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

  const titleLink = header.querySelector('a.BlockHeader_title__5xlx6');
  if (titleLink) {
    titleLink.addEventListener('click', (e) => spaNavigate('/chart', e));
  }
  section.appendChild(header);

  const carousel = document.createElement('ol');
  carousel.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_tracksContainer__uF8Tg ym-vibe-feed-chart-carousel';
  carousel.setAttribute('aria-labelledby', '_r_s1_');
  carousel.setAttribute('role', 'list');

  // Разбиваем треки по 4 штуки в колонку (на каждый <li>)
  const tracksPerColumn = 4;
  for (let colIdx = 0; colIdx < rawTracks.length; colIdx += tracksPerColumn) {
    const chunk = rawTracks.slice(colIdx, colIdx + tracksPerColumn);

    const li = document.createElement('li');
    li.className = 'VJ9IexhAEuYSCyGiMfN4 CarouselWithColumnsBlock_item__RBGs4 CarouselWithColumnsBlock_item_columns_two__46rgZ';

    const colDiv = document.createElement('div');
    colDiv.className = 'CarouselWithColumnsBlock_column__oMRES';

    chunk.forEach((item, innerIdx) => {
      const track = item.track || item;
      const chartMeta = item.chart || {};
      const pos = chartMeta.position || (colIdx + innerIdx + 1);
      const progress = chartMeta.progress || 'same';

      let progressIcon = '/icons/sprite.svg#chartSame_xxs';
      let progressClass = 'Chart_progress_same__Cnbdb';
      let progressLabel = 'Позиция в чарте не изменилась';

      if (progress === 'up') {
        progressIcon = '/icons/sprite.svg#chartUp_xxs';
        progressClass = 'Chart_progress_up__bUfQz';
        progressLabel = 'Позиция в чарте выросла';
      } else if (progress === 'down') {
        progressIcon = '/icons/sprite.svg#chartDown_xxs';
        progressClass = 'Chart_progress_down__uXh_g';
        progressLabel = 'Позиция в чарте снизилась';
      } else if (progress === 'new') {
        progressIcon = '/icons/sprite.svg#chartNew_xxs';
        progressClass = 'Chart_progress_new__2j6Z_';
        progressLabel = 'Новый трек в чарте';
      }

      const trackId = String(track.id || '');
      const title = track.title || '';
      const artists = Array.isArray(track.artists) ? track.artists : [];
      const primaryArtist = artists[0] || {};
      const artistsStr = artists.map(a => a.name).filter(Boolean).join(', ');

      const album = track.albums?.[0] || {};
      const albumId = album.id || '';
      const trackUrl = albumId ? `/album/${albumId}/track/${trackId}` : `/track/${trackId}`;

      const coverUri = track.coverUri || album.coverUri || primaryArtist.cover?.uri || '';
      const cover100 = coverUri ? formatYandexImg(coverUri, '100x100') : '';
      const cover200 = coverUri ? formatYandexImg(coverUri, '200x200') : '';

      const isExplicit = Boolean(track.contentWarning === 'explicit');
      const hasTrailer = Boolean(track.trailer?.available || item.trailer?.available);
      const durationFormatted = formatDurationMs(track.durationMs);

      const isLiked = typeof isTrackLiked === 'function' ? isTrackLiked(trackId) : false;

      const artistsHtml = artists.map(art => `
        <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB Meta_text__Y5uYH Meta_link__IFDBA ym-chart-artist-link" aria-label="Артист ${escapeHtml(art.name || '')}" href="/artist/${art.id}">
          <span class="_MWOVuZRvUQdXKTMcOPx Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR Meta_text__Y5uYH Meta_artistCaption__JESZi">${escapeHtml(art.name || '')}</span>
        </a>
      `).join(', ');

      const trackRow = document.createElement('div');
      trackRow.className = 'HorizontalCardContainer_root__YoAAP CommonTrack_root__i6shE ym-track-row';
      trackRow.setAttribute('aria-label', `${escapeHtml(artistsStr)} ${escapeHtml(title)}`);
      trackRow.setAttribute('data-intersection-property-id', `_r_chart_${pos}_`);
      trackRow.setAttribute('data-track-id', trackId);

      trackRow.innerHTML = `
        <div class="Chart_root__ODed_ TrackChart_chartCell__33_al">
          <div class="_MWOVuZRvUQdXKTMcOPx Z_WIr2W8JU4MPQek3hgR ZYV27jeWd30QDXu4GhaH Chart_position__7UNY9">${pos}</div>
          <svg class="Chart_progress__sGj4s ${progressClass} l3tE1hAMmBj2aoPPwU08" focusable="false" aria-label="${escapeHtml(progressLabel)}" aria-hidden="false">
            <use xlink:href="${progressIcon}"></use>
          </svg>
        </div>
        <div class="PlayButtonWithCover_root__s6Orw TrackChart_playButtonCell__cvY7u">
          <div class="qaIScXjx1qyXuaIHXQIo wdE2qVRIlWUesuBfzCis ZcpulvHgF_wsgzB8Hye9 PlayButtonWithCover_cover__5__Ms">
            ${cover100 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG PlayButtonWithCover_coverImage__DhS1R" alt="Трек ${escapeHtml(title)}" loading="eager" srcset="${escapeHtml(cover100)}, ${escapeHtml(cover200 || cover100)} 2x" src="${escapeHtml(cover100)}">` : ''}
            <div class="PlayButtonWithCover_control__iZy3t">
              <div class="PlayingAnimation_root__YrWz7 PlayingAnimation_root_stopAnimation__qOw_g PlayButtonWithCover_playingAnimation__HWuOW"></div>
              <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr undefined qU2apWBO1yyEK0lZ3lPO WsKeF73pWotx9W1tWdYY PlayButtonWithCover_playButton__rV9pQ ym-chart-play-btn" type="button" aria-label="Воспроизведение" aria-live="off" aria-busy="false" data-track-id="${trackId}">
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
                <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB Meta_albumLink__gASh6 ym-chart-track-link" aria-label="Трек ${escapeHtml(title)} " href="${escapeHtml(trackUrl)}">
                  <span class="_MWOVuZRvUQdXKTMcOPx Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR Meta_text__Y5uYH Meta_title__GGBnH">${escapeHtml(title)}</span>
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
        <div class="CommonControlsBar_root__N8b0F CommonControlsBar_controls__QrogT TrackChart_controlsBarCell__Xd5pn">
          <button type="button" class="ym-track-row-download-btn" aria-label="Скачать трек" title="Скачать трек" data-track-id="${trackId}">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O ${isLiked ? 'zIMibMuH7wcqUoW7KH1B' : ''} IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr j1jXIVckFgZECecFzZMe qU2apWBO1yyEK0lZ3lPO undefined CommonControlsBar_item__qGErG CommonControlsBar_likeIcon__YqgZY ym-chart-like-btn" type="button" aria-label="Нравится" aria-pressed="${isLiked ? 'true' : 'false'}" aria-live="off" aria-busy="false" data-track-id="${trackId}">
            <span class="JjlbHZ4FaP9EAcR_1DxF">
              <svg class="J9wTKytjOWG73QMoN5WP l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true">
                <use xlink:href="${isLiked ? '/icons/sprite.svg#liked_xxs' : '/icons/sprite.svg#like_xxs'}"></use>
              </svg>
            </span>
          </button>
          ${hasTrailer ? `
          <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr undefined qU2apWBO1yyEK0lZ3lPO WsKeF73pWotx9W1tWdYY CommonControlsBar_item__qGErG CommonControlsBar_trailerIcon__ZHSBo ym-chart-trailer-btn" type="button" aria-label="Запустить трейлер" data-track-id="${trackId}" aria-live="off" aria-busy="false">
            <span class="JjlbHZ4FaP9EAcR_1DxF">
              <svg class="J9wTKytjOWG73QMoN5WP UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true">
                <use xlink:href="/icons/sprite.svg#trailer_xs"></use>
              </svg>
            </span>
          </button>` : ''}
          <div class="CommonControlsBar_item__qGErG CommonControlsBar_contextMenuWrapper__XjkaL">
            <span class="_MWOVuZRvUQdXKTMcOPx Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR CommonControlsBar_duration__un38A" role="text">
              <span aria-hidden="true">${durationFormatted}</span>
            </span>
            <div>
              <div>
                <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr j1jXIVckFgZECecFzZMe qU2apWBO1yyEK0lZ3lPO undefined zmtVwO34EPppZErNrlIC UOiSiy5boMAzphK1PFFN CommonControlsBar_contextMenu__EAq_c ym-chart-menu-btn" type="button" aria-label="Контекстное меню" aria-expanded="false" aria-haspopup="menu" data-track-id="${trackId}" aria-live="off" aria-busy="false">
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

      // Links navigation
      trackRow.querySelectorAll('.ym-chart-track-link').forEach(a => {
        a.addEventListener('click', (e) => spaNavigate(trackUrl, e));
      });
      trackRow.querySelectorAll('.ym-chart-artist-link').forEach(a => {
        const href = a.getAttribute('href');
        if (href) a.addEventListener('click', (e) => spaNavigate(href, e));
      });

      // Play button
      const playBtn = trackRow.querySelector('.ym-chart-play-btn');
      if (playBtn) {
        playBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const state = typeof isTrackCurrentlyPlaying === 'function' ? isTrackCurrentlyPlaying(trackId) : { isMatch: false, isPlaying: false };
          const p = getSafeActivePlayer();
          if (state.isMatch) {
            if (typeof p?.togglePause === 'function') {
              p.togglePause();
            } else if (state.isPlaying && typeof p?.pause === 'function') {
              p.pause();
            } else if (!state.isPlaying && (typeof p?.resume === 'function' || typeof p?.play === 'function')) {
              if (p.resume) p.resume();
              else p.play();
            }
          } else {
            if (typeof handlePremiereTrackPlay === 'function') {
              await handlePremiereTrackPlay(trackId, track, playBtn);
            } else if (typeof playPlaylistTrackContext === 'function') {
              await playPlaylistTrackContext({ id: 'chart' }, trackId, track);
            }
          }
          if (typeof updateLandingPlaybackIndicators === 'function') {
            updateLandingPlaybackIndicators();
            setTimeout(updateLandingPlaybackIndicators, 60);
            setTimeout(updateLandingPlaybackIndicators, 250);
          }
        });
      }

      // Download button
      const dlBtn = trackRow.querySelector('.ym-track-row-download-btn');
      if (dlBtn) {
        dlBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof downloadTrackDirectly === 'function') {
            downloadTrackDirectly(trackId);
          } else {
            window.postMessage({ type: 'BYM_DOWNLOAD_TRACK', trackId }, '*');
          }
        });
      }

      // Like button
      const likeBtn = trackRow.querySelector('.ym-chart-like-btn');
      if (likeBtn) {
        likeBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const isPressed = likeBtn.getAttribute('aria-pressed') === 'true' || likeBtn.classList.contains('zIMibMuH7wcqUoW7KH1B');
          const next = !isPressed;
          likeBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
          if (next) {
            likeBtn.classList.add('zIMibMuH7wcqUoW7KH1B');
          } else {
            likeBtn.classList.remove('zIMibMuH7wcqUoW7KH1B');
          }
          const svgUse = likeBtn.querySelector('use');
          if (svgUse) {
            const iconHref = next ? '/icons/sprite.svg#liked_xxs' : '/icons/sprite.svg#like_xxs';
            svgUse.setAttribute('xlink:href', iconHref);
            svgUse.setAttribute('href', iconHref);
          }
          if (typeof toggleLikeTrack === 'function') {
            await toggleLikeTrack(trackId, isPressed);
          }
        });
      }

      // Trailer button
      const trailerBtn = trackRow.querySelector('.ym-chart-trailer-btn');
      if (trailerBtn && hasTrailer) {
        trailerBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (albumId && typeof handleTrailerPlay === 'function') {
            await handleTrailerPlay(albumId, innerIdx);
          } else if (albumId && typeof playAlbumTrailer === 'function') {
            await playAlbumTrailer(albumId);
          }
        });
      }

      // Context Menu button
      const menuBtn = trackRow.querySelector('.ym-chart-menu-btn');
      if (menuBtn) {
        menuBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof openTrackContextMenu === 'function') {
            openTrackContextMenu(menuBtn, track);
          }
        });
        menuBtn.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
        });
      }

      colDiv.appendChild(trackRow);
    });

    li.appendChild(colDiv);
    carousel.appendChild(li);
  }

  const controls = header.querySelectorAll('.CarouselControls_control__L8t4i');
  if (controls.length >= 2 && typeof setupCarouselControls === 'function') {
    setupCarouselControls(carousel, controls[0], controls[1]);
  }

  section.appendChild(carousel);
  feedContainer.appendChild(section);
}
