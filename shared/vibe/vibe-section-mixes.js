// =========================================================================
// BetterYandexMusic: Mixes Music Section (Подборки музыки - Тренды)
// Exact 1-to-1 Native Implementation from Yandex Music
// API: GET https://api.music.yandex.ru/landing/block/mixes/mixes_music
// =========================================================================

function renderMixesMusicSection(feedContainer, mixesData) {
  let items = Array.isArray(mixesData) ? mixesData : (mixesData?.items || mixesData?.result?.items || []);
  if (Array.isArray(items)) {
    items = items.filter(it => it && (it.title || it.covers || it.weblink));
  }
  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  const section = document.createElement('section');
  section.className = 'CarouselBlock_root__aeOla ym-vibe-feed-section ym-mixes-music-section';
  section.setAttribute('data-intersection-property-id', 'mixes_music');

  const header = document.createElement('div');
  header.className = 'BlockHeader_root__j3mbg SkeletonBlock_headerContainer__fl8EX';
  header.innerHTML = `
    <div class="BlockHeader_start__ZrGP5">
      <div class="BlockHeader_textContainer___2wn9">
        <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB BlockHeader_title__5xlx6" href="/entities/mixes-music/mixes_music">
          <div class="VUb2BxfgkGQhG1RDQGwF BlockHeader_linkContainer__EuW_L">
            <span class="BlockHeader_linkText__Or6VB">
              <h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww BlockHeader_heading__4iqvS" id="_r_1nc_">Подборки музыки</h2>
            </span>
            <svg class="TXa2RKc_Hf0QPdmUDMwI BlockHeader_titleIcon__GQFEK UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowRight_xs"></use>
            </svg>
          </div>
        </a>
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
  if (titleLink) {
    titleLink.addEventListener('click', (e) => spaNavigate('/entities/mixes-music/mixes_music', e));
  }
  section.appendChild(header);

  const carousel = document.createElement('ol');
  carousel.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_container__9IxUi SkeletonBlock_important__faY0E ym-vibe-feed-mixes-carousel';
  carousel.setAttribute('aria-labelledby', '_r_1nc_ _r_1nc_-description');
  carousel.setAttribute('role', 'list');

  items.forEach((item) => {
    const title = item.title || 'Подборка';
    const weblink = item.weblink || `/tag/${item.id || ''}`;
    const primaryCover = item.covers?.[0] || {};
    const coverUri = primaryCover.uri || item.cover?.uri || '';
    const color = primaryCover.color || item.color || '';

    const img100 = coverUri ? formatYandexImg(coverUri, '100x100') : '';
    const img200 = coverUri ? formatYandexImg(coverUri, '200x200') : '';

    const li = document.createElement('li');
    li.className = 'VJ9IexhAEuYSCyGiMfN4 CarouselBlock_item__DatZ2 CarouselBlock_important__AARmP MixesMusic_item__9QVmW';

    const imgHtml = img100
      ? `<img class="qQ7GQU14EkggPBC6jdeS qq6y6t3GDqWHbY9QpSrd MixesGridMixCard_cover__Ra3ic" alt="" loading="eager" srcset="${escapeHtml(img100)}, ${escapeHtml(img200 || img100)} 2x" src="${escapeHtml(img100)}">`
      : '';

    li.innerHTML = `
      <a target="_self" rel="" class="buOTZq_TKQOVyjMLrXvB MixesGridMixCard_link__D3_S6 MixesMusic_item__9QVmW" href="${escapeHtml(weblink)}">
        <div class="qaIScXjx1qyXuaIHXQIo emVxQKB1wJc9FwuIBG8o ZcpulvHgF_wsgzB8Hye9 MixesGridMixCard_root__HHE7z"${color ? ` style="--subcover-background-color: ${escapeHtml(color)};"` : ''}>
          <div class="MixesGridMixCard_plate__ONH3P">
            <div class="MixesGridMixCard_subcover__z5sBj"></div>
            ${imgHtml}
          </div>
          <div class="MixesGridMixCard_header__t24VH">
            <h3 title="${escapeHtml(title)}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 jMyoZB5J9iZbzJmWOrF0 SehSa7OyRpC2nzYTVb2Q Vi7Rd0SZWqD17F0872TB MixesGridMixCard_title__fKTCy" style="-webkit-line-clamp: 2;">${escapeHtml(title)}</h3>
          </div>
        </div>
      </a>
    `;

    const linkEl = li.querySelector('a.MixesGridMixCard_link__D3_S6');
    if (linkEl) {
      linkEl.addEventListener('click', (e) => spaNavigate(weblink, e));
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
