// =========================================================================
// BetterYandexMusic: Vibe Landing Feed Orchestrator & Common Components
// =========================================================================

  // =========================================================================
  // 8. Mode 3: Live Landing Feed Under Vibe (Native REST API Integration)
  // =========================================================================

  let landingFeedCache = {
    likesHistory: null,
    mixesWaves: null,
    waves: null,
    inStyle: null,
    newReleases: null,
    concerts: null,
    premiere: null,
    albumsMonth: null,
    mixesMusic: null,
    editorialCompilations: {},
    timestamp: 0
  };
  let activeLandingTab = 'for_you'; // 'for_you' | 'trends'
  let activeAiCategory = 'mix';
  let activeWavesCategory = 'mix';
  let activeInStyleArtistId = null;
  let isFetchingFeed = false;

  const EDITORIAL_TRENDS_SECTIONS = [
    {
      id: 'ml_playlists',
      title: 'Редакция х Алгоритмы',
      description: 'Плейлисты для любого настроения',
      viewAllActionLink: '/entities/editorial-compilation/ml_playlists',
      endpoint: 'https://api.music.yandex.ru/landing/block/editorial/compilation/ml_playlists'
    },
    {
      id: 'editors_playlists',
      title: 'Редакция лайкает',
      description: 'Музыка, которую мы слушаем прямо сейчас',
      viewAllActionLink: '/entities/editorial-compilation/editors_playlists',
      endpoint: 'https://api.music.yandex.ru/landing/block/editorial/compilation/editors_playlists'
    },
    {
      id: 'foreign',
      title: 'Вы могли пропустить',
      description: '',
      viewAllActionLink: '/entities/editorial-compilation/foreign',
      endpoint: 'https://api.music.yandex.ru/landing/block/editorial/compilation/foreign'
    },
    {
      id: 'letnyaya_podborka',
      title: 'Осенняя',
      description: '',
      viewAllActionLink: '/entities/editorial-compilation/letnyaya_podborka',
      endpoint: 'https://api.music.yandex.ru/landing/block/editorial/compilation/letnyaya_podborka'
    },
    {
      id: 'RUSSIA_newcomers',
      title: 'Открытия',
      description: 'Восходящие звёзды музыкальной сцены',
      viewAllActionLink: '/entities/editorial-compilation/RUSSIA_newcomers',
      endpoint: 'https://api.music.yandex.ru/landing/block/editorial/compilation/RUSSIA_newcomers'
    },
    {
      id: 'ALL_isrka',
      title: 'Зажглись от Искры',
      description: 'Взлетели в Моей волне, засияли в нашем плейлисте',
      viewAllActionLink: '/entities/editorial-artists/ALL_isrka',
      testId: 'EDITORIAL_ARTISTS',
      endpoint: 'https://api.music.yandex.ru/landing/block/editorial/artists/ALL_isrka'
    },
    {
      id: 'ALL_albums_with_commentary',
      title: 'Артисты комментируют',
      description: 'Истории создания альбомов от первого лица',
      viewAllActionLink: '/entities/editorial-compilation/ALL_albums_with_commentary',
      endpoint: 'https://api.music.yandex.ru/landing/block/editorial/compilation/ALL_albums_with_commentary'
    },
    {
      id: 'nitro_playlists',
      title: 'Они взлетели в Нитро',
      description: 'Треки, покорившие Мою волну за последний месяц',
      viewAllActionLink: '/entities/editorial-compilation/nitro_playlists',
      endpoint: 'https://api.music.yandex.ru/landing/block/editorial/compilation/nitro_playlists'
    },
    {
      id: 'RUSSIA_editorial_compilation',
      title: 'Выбор редакции',
      description: 'Лучшие плейлисты по версии музыкальных редакторов',
      viewAllActionLink: '/entities/editorial-compilation/RUSSIA_editorial_compilation',
      endpoint: 'https://api.music.yandex.ru/landing/block/editorial/compilation/RUSSIA_editorial_compilation'
    }
  ];

  function formatYandexImg(uri, size = '400x400') {
    if (!uri) return '';
    let url = String(uri);
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    if (url.includes('mixes.covers')) {
      return url.replace('%%', size);
    }
    if (url.includes('get-music-misc')) {
      const miscSize = size.startsWith('m') ? size : (size.includes('x') ? size : 'm400x400');
      return url.replace('%%', miscSize);
    }
    return url.replace('%%', size);
  }

  function extractMixesFromStatePatches() {
    if (typeof window !== 'undefined' && Array.isArray(window.__STATE_PATCHES__)) {
      for (const batch of window.__STATE_PATCHES__) {
        if (Array.isArray(batch)) {
          for (const patch of batch) {
            const path = patch?.path || '';
            if (path.includes('blocks/0/data') || path.includes('/landing/tabs/data/1/blocks/0/data')) {
              const items = patch.value?.items;
              if (Array.isArray(items) && items.length > 0 && items.some(it => it && it.title)) {
                return items;
              }
            }
          }
        }
      }
    }
    return null;
  }

  function parseMixesFromLandingHtml(html) {
    if (!html || typeof html !== 'string') return null;
    const needle1 = '/landing/tabs/data/1/blocks/0/data';
    const needle2 = '\\u002Flanding\\u002Ftabs\\u002Fdata\\u002F1\\u002Fblocks\\u002F0\\u002Fdata';
    let idx = html.indexOf(needle1);
    if (idx === -1) idx = html.indexOf(needle2);
    if (idx === -1) {
      const moodIdx = html.indexOf('music_moods');
      if (moodIdx !== -1) {
        const itemsBefore = html.lastIndexOf('"items":', moodIdx);
        if (itemsBefore !== -1) idx = itemsBefore;
      }
    }
    if (idx === -1) return null;

    const itemsIdx = html.indexOf('"items":', idx);
    if (itemsIdx === -1) return null;

    const arrStart = html.indexOf('[', itemsIdx);
    if (arrStart === -1) return null;

    let depth = 0;
    let arrEnd = -1;
    for (let i = arrStart; i < html.length; i++) {
      if (html[i] === '[') depth++;
      else if (html[i] === ']') {
        depth--;
        if (depth === 0) {
          arrEnd = i + 1;
          break;
        }
      }
    }

    if (arrEnd !== -1) {
      try {
        const parsed = JSON.parse(html.slice(arrStart, arrEnd));
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.some(it => it && it.title)) {
          return parsed;
        }
      } catch (e) {
        console.warn('[BYM] Error parsing mixes JSON from HTML:', e);
      }
    }
    return null;
  }

  async function fetchMixesData() {
    const fromPatches = extractMixesFromStatePatches();
    if (fromPatches) return fromPatches;

    try {
      const res = await fetch('/landing/main?tab=popular', { credentials: 'include' });
      if (res.ok) {
        const html = await res.text();
        const fromHtml = parseMixesFromLandingHtml(html);
        if (fromHtml) return fromHtml;
      }
    } catch (e) {
      console.warn('[BYM] Error fetching mixes from landing page:', e);
    }

    return null;
  }

  function spaNavigate(url, e) {
    if (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
    }
    if (window.next && window.next.router && typeof window.next.router.push === 'function') {
      try {
        window.next.router.push(url);
        return;
      } catch (err) { }
    }
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  async function fetchFeedData() {
    const now = Date.now();
    if (landingFeedCache.timestamp && (now - landingFeedCache.timestamp < 180000)) {
      return landingFeedCache;
    }

    if (isFetchingFeed) return landingFeedCache;
    isFetchingFeed = true;

    try {
      const editorialPromises = EDITORIAL_TRENDS_SECTIONS.map(cfg =>
        fetch(cfg.endpoint, { credentials: 'include' })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      );

      const [lhRes, mwRes, wavesRes, inStyleRes, nrRes, cRes, premRes, amRes, mmData, ...editorialResults] = await Promise.allSettled([
        fetch('https://api.music.yandex.ru/landing-blocks/likes-and-history', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('https://api.music.yandex.ru/landing-blocks/mixes-waves', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('https://api.music.yandex.ru/landing-blocks/waves', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('https://api.music.yandex.ru/landing-blocks/in-style', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('https://api.music.yandex.ru/landing-blocks/new-releases', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('https://api.music.yandex.ru/concerts/landing/personal', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('https://api.music.yandex.ru/landing/block/premiere/smart-open-playlist/RECENT_TRACKS', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('https://api.music.yandex.ru/landing/block/editorial/new-releases/ALL_albums_of_the_month', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetchMixesData(),
        ...editorialPromises
      ]);

      if (lhRes.status === 'fulfilled' && lhRes.value) landingFeedCache.likesHistory = lhRes.value;
      if (mwRes.status === 'fulfilled' && mwRes.value) landingFeedCache.mixesWaves = mwRes.value;
      if (wavesRes.status === 'fulfilled' && wavesRes.value) landingFeedCache.waves = wavesRes.value;
      if (inStyleRes.status === 'fulfilled' && inStyleRes.value) landingFeedCache.inStyle = inStyleRes.value;
      if (nrRes.status === 'fulfilled' && nrRes.value) landingFeedCache.newReleases = nrRes.value;
      if (cRes.status === 'fulfilled' && cRes.value) landingFeedCache.concerts = cRes.value;
      if (premRes.status === 'fulfilled' && premRes.value) {
        landingFeedCache.premiere = premRes.value?.result || premRes.value;
      }
      if (amRes.status === 'fulfilled' && amRes.value) {
        landingFeedCache.albumsMonth = amRes.value?.result || amRes.value;
      }
      if (mmData.status === 'fulfilled' && mmData.value) {
        landingFeedCache.mixesMusic = mmData.value?.items ? mmData.value.items : mmData.value;
      }

      editorialResults.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value) {
          const cfg = EDITORIAL_TRENDS_SECTIONS[i];
          if (cfg) {
            landingFeedCache.editorialCompilations[cfg.id] = res.value?.result || res.value;
          }
        }
      });

      landingFeedCache.timestamp = now;
    } catch (e) {
      console.warn('[BYM] Error fetching live landing feed data:', e);
    } finally {
      isFetchingFeed = false;
    }

    return landingFeedCache;
  }

  async function initVibeLandingFeed() {
    if (getVibeDesignMode() !== 'vibe_with_landing') {
      removeVibeLandingFeed();
      return;
    }

    if (!isTargetVibePage()) {
      removeVibeLandingFeed();
      return;
    }

    // Clean up any obsolete quick block from previous layouts
    const oldQuick = document.getElementById('ym-vibe-quick-block');
    if (oldQuick) oldQuick.remove();

    // Target 2: Scrollable Feed under Vibe inside MainPage_vibeWidgetContainer
    const widgetContainer = document.querySelector('[class*="MainPage_vibeWidgetContainer"]');
    const vibeRoot = document.querySelector('[class*="VibePage_root"]');
    if (widgetContainer) {
      let feedContainer = document.getElementById('ym-vibe-live-landing-feed');
      if (!feedContainer) {
        feedContainer = document.createElement('div');
        feedContainer.id = 'ym-vibe-live-landing-feed';
        if (vibeRoot && vibeRoot.nextElementSibling) {
          widgetContainer.insertBefore(feedContainer, vibeRoot.nextElementSibling);
        } else {
          widgetContainer.appendChild(feedContainer);
        }
      }
    }

    // Fetch and render data
    const data = await fetchFeedData();
    renderLandingFeedUI(data);
  }

  function removeVibeLandingFeed() {
    const quickBlock = document.getElementById('ym-vibe-quick-block');
    if (quickBlock) quickBlock.remove();

    const feed = document.getElementById('ym-vibe-live-landing-feed');
    if (feed) feed.remove();
  }

  function renderLandingFeedUI(data) {
    if (getVibeDesignMode() !== 'vibe_with_landing') return;

    const oldQuick = document.getElementById('ym-vibe-quick-block');
    if (oldQuick) oldQuick.remove();

    const feed = document.getElementById('ym-vibe-live-landing-feed');
    if (!feed || !data) return;
    feed.replaceChildren();

    // 1. Exact 1-to-1 Native Tabs (Для вас / Тренды)
    renderLandingTabs(feed, data.likesHistory, data.newReleases, data.albumsMonth);

    if (activeLandingTab === 'for_you') {
      // 2. Exact 1-to-1 Native Likes and History cards (Мне нравится / История)
      renderLikesAndHistorySection(feed, data.likesHistory);

      // 3. Section 1: Свели в AI-сет
      renderAiSetsSection(feed, data.mixesWaves);

      // 4. Section 2: Новые релизы
      renderNewReleasesSection(feed, data.newReleases);

      // 5. Section 3: Больше открытий (WAVES)
      renderMoreDiscoveriesSection(feed, data.waves);

      // 6. Section 4: В стиле (IN_STYLE)
      renderInStyleSection(feed, data.inStyle);

      // 7. Section 5: Концерты для вас
      renderConcertsSection(feed, data.concerts);

      // 8. Section 6: Премьера (SMART_OPEN_PLAYLIST)
      if (typeof renderPremiereSection === 'function') {
        renderPremiereSection(feed, data.premiere);
      }
    } else if (activeLandingTab === 'trends') {
      // 1. Секция 1: Подборки музыки
      if (typeof renderMixesMusicSection === 'function') {
        renderMixesMusicSection(feed, data.mixesMusic);
      }

      // 2. Секция 2: Альбомы месяца
      if (typeof renderAlbumsOfTheMonthSection === 'function') {
        renderAlbumsOfTheMonthSection(feed, data.albumsMonth);
      }

      // 3. Редакционные подборки:
      // - Редакция х Алгоритмы
      // - Редакция лайкает
      // - Вы могли пропустить
      // - Осенняя
      // - Открытия
      // - Зажглись от Искры
      // - Артисты комментируют
      // - Они взлетели в Нитро
      // - Выбор редакции
      if (typeof renderEditorialCompilationSection === 'function' && data.editorialCompilations) {
        EDITORIAL_TRENDS_SECTIONS.forEach(cfg => {
          const secData = data.editorialCompilations[cfg.id];
          if (secData) {
            renderEditorialCompilationSection(feed, cfg, secData);
          }
        });
      }
    }

    // 9. Update initial playback indicators for all cards (Play/Pause states)
    updateLandingPlaybackIndicators();
  }

  function renderLandingTabs(feedContainer, lhData, newReleasesData, albumsMonthData) {
    const lh = lhData?.result || lhData || {};
    const favTracks = lh.favorites?.trackCovers || [];
    const histArtists = lh.history?.subtitleElements || [];
    const artist1 = histArtists[0] || 'Для вас';
    const artist2 = histArtists[1] || 'подборка';
    const forYouSub = `${artist1}, ${artist2}`;

    const forYouImg1 = favTracks[0]?.uri ? formatYandexImg(favTracks[0].uri, '50x50') : '';
    const forYouImg2 = favTracks[1]?.uri ? formatYandexImg(favTracks[1].uri, '50x50') : '';

    // Данные для таба "Тренды": из секции ALL_albums_of_the_month (например: Женя Трофимов, КлоуКома)
    const amReleases = albumsMonthData?.newReleases || albumsMonthData?.result?.newReleases || [];
    const am0 = amReleases[0];
    const am1 = amReleases[1];

    const trendsArtist0 = am0?.artists?.[0]?.name || 'Женя Трофимов';
    const trendsArtist1 = am1?.artists?.[0]?.name || 'КлоуКома';
    const trendsSub = `${trendsArtist0}, ${trendsArtist1}`;

    const trendsImgRaw1 = am0?.cover?.uri || am0?.artists?.[0]?.cover?.uri;
    const trendsImgRaw2 = am1?.cover?.uri || am1?.artists?.[0]?.cover?.uri;

    const releasesFallback = newReleasesData?.result?.newReleases || newReleasesData?.newReleases || [];
    const trendsImg1 = trendsImgRaw1
      ? formatYandexImg(trendsImgRaw1, '50x50')
      : (releasesFallback[0]?.cover?.uri ? formatYandexImg(releasesFallback[0].cover.uri, '50x50') : '');
    const trendsImg2 = trendsImgRaw2
      ? formatYandexImg(trendsImgRaw2, '50x50')
      : (releasesFallback[1]?.cover?.uri ? formatYandexImg(releasesFallback[1].cover.uri, '50x50') : '');

    const isForYouActive = activeLandingTab === 'for_you';
    const isTrendsActive = activeLandingTab === 'trends';

    const header = document.createElement('header');
    header.className = 'Skeleton_header__Ir5f4 ym-landing-tabs-header';
    header.innerHTML = `
      <ol class="TjoCDDIf5PrIGU4w8G6Z TabCarousel_root__8DoRy Skeleton_tabCarousel__E2kLf" role="tablist">
        <li class="d50IqTKJZhJIMd5aTqAn">
          <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 qU2apWBO1yyEK0lZ3lPO Yqh9GVOagMQpvymD877t ${isForYouActive ? 'cBxrIXbcPeS3kSzdJdhS' : ''} Tab_root__LUukY Tab_tab_size_m__c7tVg Skeleton_tab__Jn6By" type="button" role="tab" id="_r_b2d_-0-tab" aria-controls="_r_b2d_-0-tabpanel" aria-selected="${isForYouActive ? 'true' : 'false'}" aria-label="Для вас" aria-hidden="false" tabindex="${isForYouActive ? '0' : '-1'}" aria-live="off" aria-busy="false">
            <span class="Tab_covers__cvYeI">
              ${forYouImg1 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG Tab_image__Hen3_" alt="" loading="eager" srcset="${escapeHtml(forYouImg1)}, ${escapeHtml(forYouImg1.replace('50x50', '100x100'))} 2x" src="${escapeHtml(forYouImg1)}">` : ''}
              ${forYouImg2 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG Tab_image__Hen3_" alt="" loading="eager" srcset="${escapeHtml(forYouImg2)}, ${escapeHtml(forYouImg2.replace('50x50', '100x100'))} 2x" src="${escapeHtml(forYouImg2)}">` : ''}
            </span>
            <span class="Tab_description__p1fTO">
              <div title="Для вас" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA Vi7Rd0SZWqD17F0872TB Tab_title__hAYZk" style="-webkit-line-clamp: 1;">Для вас</div>
              <div title="${escapeHtml(forYouSub)}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI _oBLf5gprWsKjCw4Ce58 _3_Mxw7Si7j2g4kWjlpR Tab_subtitle__fLp9S" style="-webkit-line-clamp: 1;">${escapeHtml(forYouSub)}</div>
            </span>
          </button>
        </li>
        <li class="d50IqTKJZhJIMd5aTqAn">
          <button class="cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 qU2apWBO1yyEK0lZ3lPO Yqh9GVOagMQpvymD877t ${isTrendsActive ? 'cBxrIXbcPeS3kSzdJdhS' : ''} Tab_root__LUukY Tab_tab_size_m__c7tVg Skeleton_tab__Jn6By" type="button" role="tab" id="_r_b2d_-1-tab" aria-controls="_r_b2d_-1-tabpanel" aria-selected="${isTrendsActive ? 'true' : 'false'}" aria-label="Тренды" aria-hidden="false" tabindex="${isTrendsActive ? '0' : '-1'}" aria-live="off" aria-busy="false">
            <span class="Tab_covers__cvYeI">
              ${trendsImg1 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG Tab_image__Hen3_" alt="" loading="eager" srcset="${escapeHtml(trendsImg1)}, ${escapeHtml(trendsImg1.replace('50x50', '100x100'))} 2x" src="${escapeHtml(trendsImg1)}">` : ''}
              ${trendsImg2 ? `<img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG Tab_image__Hen3_" alt="" loading="eager" srcset="${escapeHtml(trendsImg2)}, ${escapeHtml(trendsImg2.replace('50x50', '100x100'))} 2x" src="${escapeHtml(trendsImg2)}">` : ''}
            </span>
            <span class="Tab_description__p1fTO">
              <div title="Тренды" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA Vi7Rd0SZWqD17F0872TB Tab_title__hAYZk" style="-webkit-line-clamp: 1;">Тренды</div>
              <div title="${escapeHtml(trendsSub)}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI _oBLf5gprWsKjCw4Ce58 _3_Mxw7Si7j2g4kWjlpR Tab_subtitle__fLp9S" style="-webkit-line-clamp: 1;">${escapeHtml(trendsSub)}</div>
            </span>
          </button>
        </li>
      </ol>
    `;

    const tabForYou = header.querySelector('#_r_b2d_-0-tab');
    const tabTrends = header.querySelector('#_r_b2d_-1-tab');
    if (tabForYou && tabTrends) {
      tabForYou.addEventListener('click', (e) => {
        e.preventDefault();
        if (activeLandingTab === 'for_you') return;
        activeLandingTab = 'for_you';
        renderLandingFeedUI(landingFeedCache);
      });
      tabTrends.addEventListener('click', (e) => {
        e.preventDefault();
        if (activeLandingTab === 'trends') return;
        activeLandingTab = 'trends';
        renderLandingFeedUI(landingFeedCache);
      });
    }

    feedContainer.appendChild(header);
  }

  function renderLikesAndHistorySection(feedContainer, lhData) {
    const lh = lhData?.result || lhData || {};
    const fav = lh.favorites || {};
    const hist = lh.history || {};

    const favLink = fav.playlistUuid ? `/playlists/${fav.playlistUuid}` : '/collection';
    const histLink = '/music-history';

    const favCountText = fav.count ? `${fav.count} треков` : 'Мне нравится';
    const histSubElements = Array.isArray(hist.subtitleElements) && hist.subtitleElements.length > 0
      ? hist.subtitleElements.slice(0, 3).join(', ')
      : 'Недавно прослушано';

    const favCoverUrl = fav.cover?.uri
      ? formatYandexImg(fav.cover.uri, '80x80')
      : 'https://avatars.yandex.net/get-music-user-playlist/11418140/favorit-playlist-cover.bb48fdb9b9f4/80x80';

    const favCovers = Array.isArray(fav.trackCovers) ? fav.trackCovers.slice(0, 2) : [];
    let favCoversHtml = '';
    if (favCovers.length > 0) {
      favCoversHtml = `
        <div class="LikesAndHistoryItem_covers__9k_yw">
          ${favCovers.map((c) => {
            const uri = c.uri || c;
            return `
              <div class="qaIScXjx1qyXuaIHXQIo wdE2qVRIlWUesuBfzCis ZcpulvHgF_wsgzB8Hye9 LikesAndHistoryItem_coverContainer__fwXXJ">
                <img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG LikesAndHistoryItem_cover__QlRhz" alt="" loading="eager" src="${escapeHtml(formatYandexImg(uri, '80x80'))}">
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    const histCovers = Array.isArray(hist.trackCovers) ? hist.trackCovers.slice(0, 2) : [];
    let histCoversHtml = '';
    if (histCovers.length > 0) {
      histCoversHtml = `
        <div class="LikesAndHistoryItem_covers__9k_yw">
          ${histCovers.map((c) => {
            const uri = c.uri || c;
            return `
              <div class="qaIScXjx1qyXuaIHXQIo wdE2qVRIlWUesuBfzCis ZcpulvHgF_wsgzB8Hye9 LikesAndHistoryItem_coverContainer__fwXXJ">
                <img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG LikesAndHistoryItem_cover__QlRhz" alt="" loading="eager" src="${escapeHtml(formatYandexImg(uri, '80x80'))}">
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    const section = document.createElement('section');
    section.className = 'LikesAndHistory_root__KCuz_';
    section.innerHTML = `
      <ol class="IZnFMW4gXBshJODnvB1P LikesAndHistory_carousel__579RD" role="list">
        <li class="VJ9IexhAEuYSCyGiMfN4 LikesAndHistory_carouselItem__Yq5Xw">
          <div class="LikesAndHistoryItem_root__oI1gk">
            <a target="_self" class="buOTZq_TKQOVyjMLrXvB LikesAndHistoryItem_link__snTl_" href="${escapeHtml(favLink)}" id="ym-card-fav">
              <div class="LikesAndHistoryItem_start__wdtiV">
                <div class="qaIScXjx1qyXuaIHXQIo emVxQKB1wJc9FwuIBG8o ZcpulvHgF_wsgzB8Hye9 LikesAndHistory_favoritesCoverContainer__UUIDf">
                  <img class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG LikesAndHistory_favoritesCover__Nt7Gm" alt="Мне нравится" loading="eager" src="${escapeHtml(favCoverUrl)}">
                </div>
                <div class="LikesAndHistoryItem_textContainer__yGdOu">
                  <h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww LikesAndHistoryItem_title__hdi2H">
                    Мне нравится
                    <svg class="LikesAndHistoryItem_titleIcon__2D_yS UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 16 16" width="12" height="12" focusable="false" aria-hidden="true">
                      <use xlink:href="/icons/sprite.svg#arrowRight_xs"></use>
                    </svg>
                  </h2>
                  <div title="${escapeHtml(favCountText)}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI g3qWNP6xl__7qxNmtrvd _3_Mxw7Si7j2g4kWjlpR LikesAndHistoryItem_subtitle__ghuKi" style="-webkit-line-clamp: 1;">
                    ${escapeHtml(favCountText)}
                  </div>
                </div>
              </div>
              ${favCoversHtml}
            </a>
          </div>
        </li>

        <li class="VJ9IexhAEuYSCyGiMfN4 LikesAndHistory_carouselItem__Yq5Xw">
          <div class="LikesAndHistoryItem_root__oI1gk">
            <a target="_self" class="buOTZq_TKQOVyjMLrXvB LikesAndHistoryItem_link__snTl_" href="${escapeHtml(histLink)}" id="ym-card-hist">
              <div class="LikesAndHistoryItem_start__wdtiV">
                <div class="qaIScXjx1qyXuaIHXQIo emVxQKB1wJc9FwuIBG8o ZcpulvHgF_wsgzB8Hye9 LikesAndHistory_historyIconContainer__KPPbS">
                  <svg class="LikesAndHistory_historyIcon__2FAMu o_v2ds2BaqtzAsRuCVjw" viewBox="0 0 24 24" width="24" height="24" focusable="false" aria-hidden="true">
                    <use xlink:href="/icons/sprite.svg#history_m"></use>
                  </svg>
                </div>
                <div class="LikesAndHistoryItem_textContainer__yGdOu">
                  <h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww LikesAndHistoryItem_title__hdi2H">
                    История
                    <svg class="LikesAndHistoryItem_titleIcon__2D_yS UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 16 16" width="12" height="12" focusable="false" aria-hidden="true">
                      <use xlink:href="/icons/sprite.svg#arrowRight_xs"></use>
                    </svg>
                  </h2>
                  <div title="${escapeHtml(histSubElements)}" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI g3qWNP6xl__7qxNmtrvd _3_Mxw7Si7j2g4kWjlpR LikesAndHistoryItem_subtitle__ghuKi" style="-webkit-line-clamp: 1;">
                    ${escapeHtml(histSubElements)}
                  </div>
                </div>
              </div>
              ${histCoversHtml}
            </a>
          </div>
        </li>
      </ol>
    `;

    const favBtn = section.querySelector('#ym-card-fav');
    if (favBtn) favBtn.addEventListener('click', (e) => spaNavigate(favLink, e));
    const histBtn = section.querySelector('#ym-card-hist');
    if (histBtn) histBtn.addEventListener('click', (e) => spaNavigate(histLink, e));

    feedContainer.appendChild(section);
  }

  const ENABLED_CONTROL_CLASS = 'i5WuBm5mfG0mflk_1jH_';

  function setCarouselButtonState(btn, isDisabled) {
    if (!btn) return;
    if (isDisabled) {
      btn.disabled = true;
      btn.setAttribute('data-disabled', 'true');
      btn.classList.remove(ENABLED_CONTROL_CLASS);
    } else {
      btn.disabled = false;
      btn.removeAttribute('disabled');
      btn.removeAttribute('data-disabled');
      btn.classList.add(ENABLED_CONTROL_CLASS);
    }
  }

  function scrollCarouselOneItem(container, direction) {
    if (!container) return;
    const items = Array.from(container.children).filter(el => el.nodeType === 1);
    if (items.length === 0) return;

    // Step distance between consecutive items (item width + gap)
    let step = 0;
    if (items.length >= 2) {
      const r0 = items[0].getBoundingClientRect();
      const r1 = items[1].getBoundingClientRect();
      step = Math.round(r1.left - r0.left);
    }
    if (!step || step <= 0) {
      const r0 = items[0].getBoundingClientRect();
      step = Math.round(r0.width > 0 ? r0.width + 16 : 300);
    }

    container.scrollBy({
      left: direction * step,
      behavior: 'smooth'
    });
  }

  function setupCarouselControls(container, prevBtn, nextBtn) {
    if (!container) return;
    const update = () => {
      const atStart = container.scrollLeft <= 5;
      const atEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 5;
      setCarouselButtonState(prevBtn, atStart);
      setCarouselButtonState(nextBtn, atEnd);
    };
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        scrollCarouselOneItem(container, -1);
        try { prevBtn.blur(); } catch (_) {}
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        scrollCarouselOneItem(container, 1);
        try { nextBtn.blur(); } catch (_) {}
      });
    }
    container.addEventListener('scroll', update, { passive: true });
    // Native smooth momentum and snapping - NO wheel deltaY hijacking!
    update();
    setTimeout(update, 100);
    setTimeout(update, 500);
  }

  function createSectionHeader(title, linkHref) {
    const header = document.createElement('div');
    header.className = 'Vibes_header__L5F6H ym-vibe-feed-header';
    header.innerHTML = `
      ${linkHref
        ? `<a href="${escapeHtml(linkHref)}" class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww Vibes_heading__4i5bM ym-vibe-feed-title-link">
            <span>${escapeHtml(title)}</span>
            <svg class="LikesAndHistoryItem_titleIcon__2D_yS" viewBox="0 0 16 16" width="12" height="12" focusable="false" aria-hidden="true">
              <use xlink:href="/icons/sprite.svg#arrowRight_xs"></use>
            </svg>
           </a>`
        : `<h2 class="_MWOVuZRvUQdXKTMcOPx Ctk8dbecq31Qh7isOJPQ nSU6fV9y80WrZEfafvww Vibes_heading__4i5bM">${escapeHtml(title)}</h2>`
      }
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
    if (linkHref) {
      const link = header.querySelector('a');
      if (link) link.addEventListener('click', (e) => spaNavigate(linkHref, e));
    }
    return header;
  }

