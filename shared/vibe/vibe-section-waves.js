// =========================================================================
// BetterYandexMusic: Vibe More Discoveries Section (Waves)
// =========================================================================

  function renderMoreDiscoveriesSection(feedContainer, wavesData) {
    if (!wavesData) return;
    const waves = wavesData.result?.waves || wavesData.waves || [];
    if (!Array.isArray(waves) || waves.length === 0) return;

    const section = document.createElement('section');
    section.className = 'Vibes_root__Bk6PF ym-vibe-feed-section';
    section.setAttribute('data-intersection-property-id', 'WAVES');
    section.setAttribute('data-test-id', 'WAVES');

    // Header with Title & Carousel Arrows
    const header = document.createElement('div');
    header.className = 'BlockHeader_root__j3mbg SkeletonBlock_headerContainer__fl8EX Vibes_header__RcW5b Vibes_important__Vew_4 ym-vibe-feed-header';
    header.innerHTML = `
      <div class="BlockHeader_start__ZrGP5">
        <div class="BlockHeader_textContainer___2wn9">
          <div class="BlockHeader_title__5xlx6">
            <h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww BlockHeader_heading__4iqvS">Больше открытий</h2>
          </div>
        </div>
      </div>
      <div class="CarouselControls_root__E_hwc Vibes_controls__bUp2H">
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
    chipsRow.className = 'TjoCDDIf5PrIGU4w8G6Z TabCarousel_root__8DoRy SkeletonBlock_container__9IxUi SkeletonBlock_important__faY0E Vibes_tabCarousel__bSvp0 Vibes_important__Vew_4 ym-vibe-filter-chips-row';
    chipsRow.setAttribute('role', 'tablist');

    if (!activeWavesCategory || !waves.some(w => w.id === activeWavesCategory)) {
      activeWavesCategory = waves[0].id;
    }
    const currentCat = waves.find(w => w.id === activeWavesCategory) || waves[0];

    waves.forEach((w, idx) => {
      const li = document.createElement('li');
      li.className = 'd50IqTKJZhJIMd5aTqAn ym-vibe-filter-chip-item';
      const isSelected = w.id === activeWavesCategory;
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.id = `_r_waves_${idx}-tab`;
      tab.setAttribute('aria-controls', `_r_waves_${idx}-tabpanel`);
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
        activeWavesCategory = w.id;
        chipsRow.querySelectorAll('.ym-vibe-filter-chip-btn').forEach(t => {
          t.classList.remove('is-active', 'cBxrIXbcPeS3kSzdJdhS');
          t.setAttribute('aria-selected', 'false');
          t.setAttribute('tabindex', '-1');
        });
        tab.classList.add('is-active', 'cBxrIXbcPeS3kSzdJdhS');
        tab.setAttribute('aria-selected', 'true');
        tab.setAttribute('tabindex', '0');
        renderWaveCards(carouselContainer, w.items || []);
        carouselContainer.scrollLeft = 0;
      });
      li.appendChild(tab);
      chipsRow.appendChild(li);
    });
    section.appendChild(chipsRow);

    const tabPanel = document.createElement('div');
    tabPanel.className = 'oSPcFawW7MIQ9ZTANH9N';
    tabPanel.setAttribute('role', 'tabpanel');

    const carouselContainer = document.createElement('ol');
    carouselContainer.className = 'IZnFMW4gXBshJODnvB1P SkeletonBlock_container__9IxUi SkeletonBlock_important__faY0E ym-vibe-feed-waves-carousel';
    carouselContainer.setAttribute('role', 'list');
    tabPanel.appendChild(carouselContainer);
    section.appendChild(tabPanel);

    renderWaveCards(carouselContainer, currentCat.items || []);

    const controls = header.querySelectorAll('.CarouselControls_control__L8t4i');
    setupCarouselControls(carouselContainer, controls[0], controls[1]);

    feedContainer.appendChild(section);
  }

  function renderWaveCards(container, items) {
    container.replaceChildren();
    if (!items || items.length === 0) return;

    items.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'VJ9IexhAEuYSCyGiMfN4 VibesCarousel_item__AupL0 VibesCarousel_important__JkzUC';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p qU2apWBO1yyEK0lZ3lPO VibeButton_root___i3R5 VibeButton_button__tXFAm ym-vibe-wave-btn';
      btn.setAttribute('data-intersection-property-id', `_r_wave_${idx}_`);
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

      const isLong = item.title && item.title.length > 25;

      btn.innerHTML = `
        ${bgImg400 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG VibeButton_image__GOwKJ" alt="" loading="eager" srcset="${escapeHtml(bgImg400)}, ${escapeHtml(bgImg800 || bgImg400)} 2x" src="${escapeHtml(bgImg400)}">` : ''}
        <span class="VibeButton_textContainer__j9nOW">
          <span class="_MWOVuZRvUQdXKTMcOPx _oBLf5gprWsKjCw4Ce58 Vi7Rd0SZWqD17F0872TB VibeButton_subtitle__MQ_Ca">${escapeHtml(item.header || 'Моя волна')}</span>
          <span class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 jMyoZB5J9iZbzJmWOrF0 Ai2iRN9elHpk_u5splD6 Vi7Rd0SZWqD17F0872TB VibeButton_title__sLC0I ${isLong ? 'VibeButton_title_long__gSVM5' : ''}" style="-webkit-line-clamp: 2;">
            <svg class="VibeButton_icon__KIv7n l3tE1hAMmBj2aoPPwU08 ym-vibe-wave-icon" viewBox="0 0 16 16" width="12" height="12" focusable="false" aria-hidden="true">
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

