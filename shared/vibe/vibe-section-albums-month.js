// =========================================================================
// BetterYandexMusic: Albums of the Month Section (Тренды)
// Exact 1-to-1 Native Implementation matching Yandex Music /chart & /landing
// API: GET https://api.music.yandex.ru/landing/block/editorial/new-releases/ALL_albums_of_the_month
// =========================================================================

function renderAlbumsOfTheMonthSection(feedContainer, albumsMonthData) {
  if (!albumsMonthData) return;
  const releases = albumsMonthData.newReleases || albumsMonthData.result?.newReleases || [];
  if (!Array.isArray(releases) || releases.length === 0) return;

  const section = document.createElement('section');
  section.className = 'NewReleases_root__4ONiw ym-vibe-feed-section ym-albums-month-section';
  section.setAttribute('data-intersection-property-id', 'editorial-new-releases');
  section.setAttribute('data-test-id', 'EDITORIAL_NEW_RELEASES');

  const header = document.createElement('div');
  header.className = 'BlockHeader_root__j3mbg SkeletonBlock_headerContainer__fl8EX';
  header.innerHTML = `
    <div class="BlockHeader_start__ZrGP5">
      <div class="BlockHeader_textContainer___2wn9">
        <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB BlockHeader_title__5xlx6" href="/entities/editorial-new-releases/ALL_albums_of_the_month">
          <div class="VUb2BxfgkGQhG1RDQGwF BlockHeader_linkContainer__EuW_L">
            <span class="BlockHeader_linkText__Or6VB">
              <h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww BlockHeader_heading__4iqvS" id="_r_albums_month_">Альбомы месяца</h2>
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
    titleLink.addEventListener('click', (e) => spaNavigate('/entities/editorial-new-releases/ALL_albums_of_the_month', e));
  }
  section.appendChild(header);

  const carousel = document.createElement('ol');
  carousel.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_container__9IxUi SkeletonBlock_important__faY0E ym-vibe-feed-albums-month-carousel';
  carousel.setAttribute('aria-labelledby', '_r_albums_month_');
  carousel.setAttribute('role', 'list');

  releases.forEach((rel, idx) => {
    const album = rel.album || {};
    const artists = Array.isArray(rel.artists) && rel.artists.length > 0 ? rel.artists : [{ name: 'Артист', id: '' }];
    const primaryArtist = artists[0] || {};
    const primaryArtistName = primaryArtist.name || 'Артист';

    const artistCoverUri = rel.cover?.uri || primaryArtist.cover?.uri || album.cover?.uri;
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

    const albumTypeStr = 'альбом';
    let dateStr = '';
    if (rel.releaseDate || album.releaseDate) {
      dateStr = formatAlbumMonthReleaseDate(rel.releaseDate || album.releaseDate);
    }

    const isExplicit = Boolean(album.contentWarning === 'explicit' || (album.contentRestrictions?.disclaimers && album.contentRestrictions.disclaimers.includes('explicit')));
    const hasTrailer = Boolean(rel.trailer?.available || rel.trailer || album.trailer);

    const artistsHtml = artists.map(a => `<a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB NewRelease_artistLink__CO3Zn" aria-label="Артист ${escapeHtml(a.name || '')}" href="/artist/${escapeHtml(a.id || '')}"><span class="_MWOVuZRvUQdXKTMcOPx Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR NewRelease_artistCaption__1F8A9">${escapeHtml(a.name || '')}</span></a>`).join(', ');

    const ariaLabelAlbum = `Альбом ${album.title || ''}`;
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
      <button class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr undefined qU2apWBO1yyEK0lZ3lPO WsKeF73pWotx9W1tWdYY NewRelease_trailerButton__OYAW6 ym-album-month-trailer-btn" type="button" aria-label="Запустить трейлер" data-album-id="${escapeHtml(album.id || '')}" data-intersection-property-id="onboarding-tooltip" aria-live="off" aria-busy="false">
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
      <div class="NewRelease_root__W0T4a" data-intersection-property-id="_r_rel_month_${idx}_">
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
                ${dateStr ? `<span class="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 _3_Mxw7Si7j2g4kWjlpR"> • </span><span class="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 _3_Mxw7Si7j2g4kWjlpR">${escapeHtml(dateStr)}</span>` : ''}
              </span>
            </div>
          </div>
          <div class="NewReleaseCard_container__XvwZC">
            ${explicitHtml}
            ${trailerHtml}
            <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p undefined qU2apWBO1yyEK0lZ3lPO WsKeF73pWotx9W1tWdYY NewReleaseCard_button__WPk82 ym-album-month-play-btn" type="button" aria-label="Воспроизведение" aria-live="off" aria-busy="false" data-album-id="${escapeHtml(album.id || '')}">
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

    const trailerBtn = li.querySelector('.ym-album-month-trailer-btn');
    if (trailerBtn) {
      trailerBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const albumId = album.id;
        const isPlaying = (typeof isAlbumTrailerCurrentlyPlaying === 'function') ? isAlbumTrailerCurrentlyPlaying(albumId) : false;
        if (isPlaying) {
          const p = getSafeActivePlayer();
          if (typeof p?.togglePause === 'function') {
            await p.togglePause();
          } else if (typeof p?.pause === 'function') {
            p.pause();
          }
        } else {
          if (typeof handleTrailerPlay === 'function') {
            await handleTrailerPlay(albumId, 0);
          } else if (typeof playAlbumTrailer === 'function') {
            await playAlbumTrailer(albumId);
          }
        }
        updateLandingPlaybackIndicators();
        setTimeout(updateLandingPlaybackIndicators, 60);
        setTimeout(updateLandingPlaybackIndicators, 250);
      });
    }

    const playBtn = li.querySelector('.ym-album-month-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const albumId = String(album.id || '');
        const p = getSafeActivePlayer();
        const state = (typeof isAlbumCurrentlyPlaying === 'function') ? isAlbumCurrentlyPlaying(albumId) : { isMatch: false, isPlaying: false };

        if (state.isMatch) {
          if (typeof p?.togglePause === 'function') {
            await p.togglePause();
          } else if (state.isPlaying && typeof p?.pause === 'function') {
            p.pause();
          } else if (typeof p?.play === 'function') {
            p.play();
          }
        } else {
          if (typeof playAlbumContext === 'function') {
            await playAlbumContext(albumId);
          }
        }

        updateLandingPlaybackIndicators();
        setTimeout(updateLandingPlaybackIndicators, 60);
        setTimeout(updateLandingPlaybackIndicators, 250);
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

function formatAlbumMonthReleaseDate(isoDateStr) {
  if (!isoDateStr) return '';
  try {
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    const datePart = String(isoDateStr).split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const month = months[monthIdx] || '';
      return `${day} ${month}`.trim();
    }
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = months[d.getMonth()] || '';
    return `${day} ${month}`.trim();
  } catch (_) {
    return '';
  }
}
