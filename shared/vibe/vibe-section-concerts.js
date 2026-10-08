// =========================================================================
// BetterYandexMusic: Vibe Concerts Section (Exact 1-to-1 Native Render)
// =========================================================================

function renderConcertsSection(feedContainer, concertsData) {
  if (!concertsData) return;
  const concerts = concertsData.result?.concerts || concertsData.concerts || [];
  if (!Array.isArray(concerts) || concerts.length === 0) return;

  const section = document.createElement('section');
  section.className = 'Concerts_root__12jay Concerts_root_withNewConcertCards__42M3w ym-vibe-feed-section ym-concerts-section';
  section.setAttribute('data-intersection-property-id', 'concerts_personal');
  section.setAttribute('data-test-id', 'CONCERTS_PERSONAL');

  // 1. Шапка секции со стрелками управления (в точности 1-в-1 нативный HTML)
  const header = document.createElement('div');
  header.className = 'BlockHeader_root__j3mbg SkeletonBlock_headerContainer__fl8EX';
  header.innerHTML = `
    <div class="BlockHeader_start__ZrGP5">
      <div class="BlockHeader_textContainer___2wn9">
        <div class="BlockHeader_title__5xlx6">
          <h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww BlockHeader_heading__4iqvS" id="_r_concerts_heading_">Концерты для вас</h2>
        </div>
      </div>
    </div>
    <div class="CarouselControls_root__E_hwc Concerts_controls__n4qr8">
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

  const titleHeading = header.querySelector('h2');
  if (titleHeading) {
    titleHeading.style.cursor = 'pointer';
    titleHeading.addEventListener('click', (e) => spaNavigate('/concerts', e));
  }
  section.appendChild(header);

  // 2. Список карточек
  const carousel = document.createElement('ol');
  carousel.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_container__9IxUi SkeletonBlock_important__faY0E ym-vibe-feed-concerts-carousel';
  carousel.setAttribute('aria-labelledby', '_r_concerts_heading_');
  carousel.setAttribute('role', 'list');

  const monthsRu = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const dowsRu = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const monthsFullRu = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];

  concerts.forEach((c, idx) => {
    let monthStr = 'ноя';
    let dayStr = '01';
    let dowStr = 'пт';
    let ariaDateLabel = 'Концерт';

    if (c.datetime) {
      try {
        const d = new Date(c.datetime);
        monthStr = monthsRu[d.getMonth()] || 'ноя';
        dayStr = String(d.getDate());
        dowStr = dowsRu[d.getDay()] || 'пт';
        ariaDateLabel = `${dayStr} ${monthsFullRu[d.getMonth()] || ''} ${d.getFullYear()} г.`;
      } catch (err) {}
    }

    let posterUrl = '';
    if (c.cover?.uri) {
      let rawUri = c.cover.uri;
      if (!rawUri.startsWith('http://') && !rawUri.startsWith('https://')) {
        rawUri = 'https://' + rawUri;
      }
      posterUrl = rawUri.replace('%%', '960x690_noncrop');
    }

    let colorHsl = 'hsl(200, 1.5%, 39.8%)';
    if (c.cover?.color) {
      try {
        const rgb = hexToRgb(c.cover.color);
        if (rgb) {
          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
          colorHsl = `hsl(${Math.round(hsl.h)}, ${hsl.s}%, ${hsl.l}%)`;
        }
      } catch (_) {}
    }

    const concertTitle = c.concertTitle || 'Концерт';
    const city = c.city || 'Москва';
    const rating = c.contentRating || '16+';

    const li = document.createElement('li');
    li.className = 'VJ9IexhAEuYSCyGiMfN4 Concerts_item__jetvg Concerts_important__rvXs6';

    li.innerHTML = `
      <div class="ConcertCardWithImage_root__NHF59" role="button" tabindex="0" data-intersection-property-id="_r_c_${idx}_">
        <div class="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 _3_Mxw7Si7j2g4kWjlpR eaYyesBmJL_NbkgoYR1c">Концерт</div>
        <div class="ConcertCardWithImage_cover__3V2fk">
          <div class="ConcertImage_root__gZpOa ConcertImage_root_withMask__1ayfK" style="--concert-image-date-background: ${colorHsl};">
            <img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG ConcertImage_image__xtZCZ" alt="" loading="eager" aria-hidden="true" srcset="${escapeHtml(posterUrl)}, ${escapeHtml(posterUrl)} 2x" src="${escapeHtml(posterUrl)}">
            <div class="ConcertImage_date__aH1IR ConcertImage_date_withEventType__QRb1o">
              <img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG ConcertImage_dateBackground__GAONC" alt="" loading="eager" aria-hidden="true" srcset="https://avatars.mds.yandex.net/get-music-misc/28052/img.69aab8c335547735b2df1c54/100x100, https://avatars.mds.yandex.net/get-music-misc/28052/img.69aab8c335547735b2df1c54/200x200 2x" src="https://avatars.mds.yandex.net/get-music-misc/28052/img.69aab8c335547735b2df1c54/100x100">
              <div class="ConcertDate_root__xnVG1" aria-label="${escapeHtml(ariaDateLabel)}">
                <div class="_MWOVuZRvUQdXKTMcOPx SehSa7OyRpC2nzYTVb2Q Vi7Rd0SZWqD17F0872TB ConcertDate_month__ti5Na ConcertImage_month_withEventType__Thry7">${escapeHtml(monthStr)}</div>
                <div class="_MWOVuZRvUQdXKTMcOPx Ai2iRN9elHpk_u5splD6 _3_Mxw7Si7j2g4kWjlpR ConcertDate_day__YibpP ConcertImage_day_withEventType__GI5B9">${escapeHtml(dayStr)}</div>
                <div class="_MWOVuZRvUQdXKTMcOPx SehSa7OyRpC2nzYTVb2Q Vi7Rd0SZWqD17F0872TB ConcertDate_weekday__fBZXo ConcertImage_weekday_withEventType__v4vMZ">${escapeHtml(dowStr)}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="ConcertMeta_root__CkKU3">
          <div title="${escapeHtml(concertTitle)}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI V3WU123oO65AxsprotU9 _3_Mxw7Si7j2g4kWjlpR ConcertMeta_city__ngDq2" style="-webkit-line-clamp: 1;">${escapeHtml(concertTitle)}</div>
          <div class="ConcertMeta_info__czKlU">
            <span class="_MWOVuZRvUQdXKTMcOPx g3qWNP6xl__7qxNmtrvd _3_Mxw7Si7j2g4kWjlpR">Концерт</span>
            <span class="_MWOVuZRvUQdXKTMcOPx g3qWNP6xl__7qxNmtrvd _3_Mxw7Si7j2g4kWjlpR" aria-hidden="true">•</span>
            <span class="_MWOVuZRvUQdXKTMcOPx g3qWNP6xl__7qxNmtrvd _3_Mxw7Si7j2g4kWjlpR">${escapeHtml(rating)}</span>
          </div>
          <span title="${escapeHtml(city)}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI g3qWNP6xl__7qxNmtrvd _3_Mxw7Si7j2g4kWjlpR" style="-webkit-line-clamp: 1;">${escapeHtml(city)}</span>
        </div>
      </div>
    `;

    const concertId = c.id || c.concertId || c.uuid;
    const concertUrl = concertId ? `/concert/${concertId}` : '/concerts';

    const cardBtn = li.querySelector('.ConcertCardWithImage_root__NHF59');
    if (cardBtn) {
      cardBtn.addEventListener('click', (e) => {
        spaNavigate(concertUrl, e);
      });
    }

    carousel.appendChild(li);
  });

  const controls = header.querySelectorAll('.CarouselControls_control__L8t4i');
  const prevBtn = controls[0];
  const nextBtn = controls[1];
  setupCarouselControls(carousel, prevBtn, nextBtn);

  section.appendChild(carousel);
  feedContainer.appendChild(section);
}

