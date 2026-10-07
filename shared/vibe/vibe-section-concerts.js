// =========================================================================
// BetterYandexMusic: Vibe Concerts Section
// =========================================================================

  function renderConcertsSection(feedContainer, concertsData) {
    if (!concertsData) return;
    const concerts = concertsData.result?.concerts || concertsData.concerts || [];
    if (!Array.isArray(concerts) || concerts.length === 0) return;

    const section = document.createElement('section');
    section.className = 'ym-vibe-feed-section ym-concerts-section';

    const header = createSectionHeader('Концерты для вас', '/concerts');
    section.appendChild(header);

    const carousel = document.createElement('div');
    carousel.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_container__9IxUi ym-vibe-feed-concerts-carousel';

    const monthsRu = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
    const dowsRu = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

    concerts.forEach(c => {
      let monthStr = 'ОКТ';
      let dayStr = '01';
      let dowStr = 'ПТ';
      if (c.datetime) {
        try {
          const d = new Date(c.datetime);
          monthStr = monthsRu[d.getMonth()] || 'ОКТ';
          dayStr = String(d.getDate()).padStart(2, '0');
          dowStr = dowsRu[d.getDay()] || 'ПТ';
        } catch (err) { }
      }

      const coverImg = formatYandexImg(c.cover?.uri, '400x400');
      const venueStr = [c.place, c.city].filter(Boolean).join(', ') || 'Концерт';

      const card = document.createElement('div');
      card.className = 'ym-vibe-feed-concert-card';

      card.innerHTML = `
        <div class="ym-vibe-feed-concert-image-wrap">
          <img src="${escapeHtml(coverImg)}" class="ym-vibe-feed-concert-image" alt="${escapeHtml(c.concertTitle || '')}" loading="lazy">
          <div class="ym-vibe-feed-concert-date-badge">
            <span class="ym-vibe-feed-concert-date-month">${escapeHtml(monthStr)}</span>
            <span class="ym-vibe-feed-concert-date-day">${escapeHtml(dayStr)}</span>
            <span class="ym-vibe-feed-concert-date-dow">${escapeHtml(dowStr)}</span>
          </div>
        </div>
        <div class="ym-vibe-feed-concert-info">
          <div class="ym-vibe-feed-concert-title" title="${escapeHtml(c.concertTitle || '')}">${escapeHtml(c.concertTitle || '')}</div>
          <div class="ym-vibe-feed-concert-venue" title="${escapeHtml(venueStr)}">${escapeHtml(venueStr)}</div>
        </div>
      `;

      card.addEventListener('click', (e) => spaNavigate('/concerts', e));
      carousel.appendChild(card);
    });

    const controls = header.querySelectorAll('.CarouselControls_control__L8t4i');
    const prevBtn = controls[0];
    const nextBtn = controls[1];
    setupCarouselControls(carousel, prevBtn, nextBtn);

    section.appendChild(carousel);
    feedContainer.appendChild(section);
  }

