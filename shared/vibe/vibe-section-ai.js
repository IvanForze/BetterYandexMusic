// =========================================================================
// BetterYandexMusic: Vibe AI Sets Section
// =========================================================================

  function renderAiSetsSection(feedContainer, mixesWavesData) {
    if (!mixesWavesData) return;
    const waves = mixesWavesData.result?.waves || mixesWavesData.waves || [];
    if (!Array.isArray(waves) || waves.length === 0) return;

    const section = document.createElement('section');
    section.className = 'Vibes_root__Bk6PF ym-vibe-feed-section';

    // Header with Title & Carousel Arrows
    const header = createSectionHeader('Свели в AI-сет');
    section.appendChild(header);

    const chipsRow = document.createElement('ol');
    chipsRow.className = 'ym-vibe-filter-chips-row TabCarousel_root__8DoRy SkeletonBlock_container__9IxUi SkeletonBlock_important__faY0E Vibes_tabCarousel__bSvp0 Vibes_important__Vew_4';
    chipsRow.setAttribute('role', 'tablist');
    chipsRow.setAttribute('aria-labelledby', '_r_2jj_');

    if (!activeAiCategory) activeAiCategory = waves[0].id;
    const currentCatWave = waves.find(w => w.id === activeAiCategory) || waves[0];

    waves.forEach((w, idx) => {
      const li = document.createElement('li');
      li.className = 'ym-vibe-filter-chip-item d50IqTKJZhJIMd5aTqAn';
      const isSelected = w.id === activeAiCategory;
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.id = `_r_2jk_-${idx}-tab`;
      tab.setAttribute('aria-controls', `_r_2jk_-${idx}-tabpanel`);
      tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      tab.setAttribute('aria-label', w.title || w.id);
      tab.setAttribute('aria-live', 'off');
      tab.setAttribute('aria-busy', 'false');
      tab.setAttribute('tabindex', isSelected ? '0' : '-1');
      tab.className = `ym-vibe-filter-chip-btn ${isSelected ? 'is-active cBxrIXbcPeS3kSzdJdhS ' : ''}cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 qU2apWBO1yyEK0lZ3lPO Yqh9GVOagMQpvymD877t Tab_root__LUukY Tab_tab_size_m__c7tVg Vibes_tab__uOfqW Vibes_important__Vew_4`;
      tab.innerHTML = `
        <span class="Tab_description__p1fTO">
          <div title="${escapeHtml(w.title || w.id)}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA Vi7Rd0SZWqD17F0872TB Tab_title__hAYZk" style="-webkit-line-clamp: 1;">${escapeHtml(w.title || w.id)}</div>
        </span>
      `;
      tab.addEventListener('click', () => {
        activeAiCategory = w.id;
        chipsRow.querySelectorAll('.ym-vibe-filter-chip-btn').forEach(t => {
          t.classList.remove('is-active', 'cBxrIXbcPeS3kSzdJdhS');
          t.setAttribute('aria-selected', 'false');
          t.setAttribute('tabindex', '-1');
        });
        tab.classList.add('is-active', 'cBxrIXbcPeS3kSzdJdhS');
        tab.setAttribute('aria-selected', 'true');
        tab.setAttribute('tabindex', '0');
        renderAiCards(carouselContainer, w.items || []);
      });
      li.appendChild(tab);
      chipsRow.appendChild(li);
    });
    section.appendChild(chipsRow);

    // Horizontal Scrollable Cards Carousel
    const carouselContainer = document.createElement('ol');
    carouselContainer.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_container__9IxUi SkeletonBlock_important__faY0E ym-vibe-feed-ai-carousel';
    carouselContainer.setAttribute('role', 'list');
    section.appendChild(carouselContainer);

    renderAiCards(carouselContainer, currentCatWave.items || []);

    const controls = header.querySelectorAll('.CarouselControls_control__L8t4i');
    const prevBtn = controls[0];
    const nextBtn = controls[1];
    setupCarouselControls(carouselContainer, prevBtn, nextBtn);

    feedContainer.appendChild(section);
  }


  function renderAiCards(container, items) {
    container.replaceChildren();
    if (!items || items.length === 0) return;

    items.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'VJ9IexhAEuYSCyGiMfN4 VibesCarousel_item__AupL0 VibesCarousel_important__JkzUC';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p qU2apWBO1yyEK0lZ3lPO VibeButton_root___i3R5 VibeButton_button__tXFAm ym-vibe-ai-card-btn';
      btn.setAttribute('data-intersection-property-id', `_r_dc${idx}_`);
      btn.setAttribute('aria-live', 'off');
      btn.setAttribute('aria-busy', 'false');
      btn.setAttribute('data-item', JSON.stringify({
        stationId: item.stationId || '',
        seeds: item.seeds || [],
        title: item.title || ''
      }));

      const bgImg400 = formatYandexImg(item.backgroundImageUrl, 'm400x400');
      const bgImg800 = formatYandexImg(item.backgroundImageUrl, 'm800x800');
      const avgColor = (item.colors && item.colors.average) || '#6b65a9';
      const textColor = (item.colors && (item.colors.waveText || item.colors.text)) || '#c8c1ff';

      btn.style.setProperty('--vibe-button-background', avgColor);
      btn.style.setProperty('--vibe-button-text-color', textColor);

      btn.innerHTML = `
        ${bgImg400 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG VibeButton_image__GOwKJ" alt="" loading="eager" srcset="${escapeHtml(bgImg400)}, ${escapeHtml(bgImg800 || bgImg400)} 2x" src="${escapeHtml(bgImg400)}">` : ''}
        <span class="VibeButton_textContainer__j9nOW">
          <span class="_MWOVuZRvUQdXKTMcOPx _oBLf5gprWsKjCw4Ce58 Vi7Rd0SZWqD17F0872TB VibeButton_subtitle__MQ_Ca">${escapeHtml(item.header || 'Сет Моей волны под настроение')}</span>
          <span class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 jMyoZB5J9iZbzJmWOrF0 Ai2iRN9elHpk_u5splD6 Vi7Rd0SZWqD17F0872TB VibeButton_title__sLC0I" style="-webkit-line-clamp: 2;">
            <svg class="VibeButton_icon__KIv7n l3tE1hAMmBj2aoPPwU08 ym-vibe-ai-icon" viewBox="0 0 16 16" width="12" height="12" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#play_xxs"></use>
            </svg>
            ${escapeHtml(item.title || '')}
          </span>
        </span>
      `;

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const st = isStationCurrentlyPlaying(item);
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
            await playVibeStation(item);
          }
        } else {
          await playVibeStation(item);
        }
        updateLandingPlaybackIndicators();
        setTimeout(updateLandingPlaybackIndicators, 60);
        setTimeout(updateLandingPlaybackIndicators, 250);
        setTimeout(updateLandingPlaybackIndicators, 600);
      });

      li.appendChild(btn);
      container.appendChild(li);
    });

    updateLandingPlaybackIndicators();
  }

