// =========================================================================
// BetterYandexMusic: Button & React Fiber / Sonata Action Debugger
// Доступно в консоли DevTools на https://music.yandex.ru/
// Использование:
//   bymDebugButton($0)                     - подробно проанализировать выбранную кнопку
//   bymDebugButton('.ym-premiere-play-btn') - проанализировать по селектору
//   bymStartInspector()                    - интерактивный режим клика по любой кнопке
//   bymStopInspector()                     - выключить инспектор
// =========================================================================

(function initBymButtonDebugger() {
  if (typeof window === 'undefined') return;

  function getReactFiber(dom) {
    if (!dom) return null;
    const fiberKey = Object.keys(dom).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    return fiberKey ? dom[fiberKey] : null;
  }

  function getReactProps(dom) {
    if (!dom) return null;
    const propsKey = Object.keys(dom).find(k => k.startsWith('__reactProps$'));
    return propsKey ? dom[propsKey] : null;
  }

  function findFiberParents(fiber, maxDepth = 15) {
    const list = [];
    let cur = fiber;
    let depth = 0;
    while (cur && depth < maxDepth) {
      let name = 'AnonymousComponent';
      if (typeof cur.type === 'string') {
        name = `<${cur.type}>`;
      } else if (typeof cur.type === 'function') {
        name = cur.type.displayName || cur.type.name || 'FunctionComponent';
      } else if (cur.type && typeof cur.type === 'object') {
        name = cur.type.displayName || cur.type.name || cur.type.render?.name || 'ObjectComponent';
      }

      const p = cur.memoizedProps;
      const dataKeys = p ? Object.keys(p).filter(k => !k.startsWith('children') && !k.startsWith('className')) : [];
      list.push({
        depth,
        component: name,
        hasHandlers: dataKeys.some(k => k.startsWith('on') || k.includes('Click')),
        props: p,
        state: cur.memoizedState
      });
      cur = cur.return;
      depth++;
    }
    return list;
  }

  function debugButton(target) {
    let el = target;
    if (typeof target === 'string') {
      el = document.querySelector(target);
    }
    if (!el && typeof $0 !== 'undefined') {
      el = $0;
    }
    if (!el) {
      console.warn('%c[BYM Debugger] Элемент не найден! Укажите селектор или выберите элемент в Elements ($0)', 'color: #ef4444; font-weight: bold;');
      return null;
    }

    const btn = el.closest('button, [role="button"], a, [data-track-id]') || el;
    const reactProps = getReactProps(btn);
    const fiber = getReactFiber(btn);
    const fiberParents = fiber ? findFiberParents(fiber) : [];

    // Поиск данных трека / альбома / плейлиста в Fiber или DOM
    let foundData = null;
    let curF = fiber;
    while (curF && !foundData) {
      const p = curF.memoizedProps;
      if (p) {
        if (p.track || p.album || p.playlist || p.item || p.entityId || p.seeds || p.stationId) {
          foundData = {
            track: p.track,
            album: p.album,
            playlist: p.playlist,
            item: p.item,
            seeds: p.seeds,
            stationId: p.stationId,
            id: p.id || p.entityId
          };
        }
      }
      curF = curF.return;
    }

    // Проверяем сервисы
    const root = (typeof getYmRootModel === 'function' ? getYmRootModel() : null) || window.__ym?.rootModel;
    const core = (typeof getSonataCore === 'function' ? getSonataCore() : null) || window.getSonataCore?.();
    const player = (typeof getSafeActivePlayer === 'function' ? getSafeActivePlayer() : null) || window.getActivePlayer?.();

    console.group(`%c🔍 [BYM BUTTON DEBUG] %c${btn.tagName.toLowerCase()}%c${btn.className ? '.' + btn.className.split(' ').slice(0, 2).join('.') : ''}`, 'color: #38bdf8; font-weight: bold; font-size: 13px;', 'color: #f59e0b; font-weight: bold;', 'color: #a3e635;');
    
    console.log('%c1. DOM Элемент:', 'color: #fbbf24; font-weight: bold;', btn);
    console.log('%c2. Атрибуты:', 'color: #fbbf24; font-weight: bold;', {
      'aria-label': btn.getAttribute('aria-label'),
      'aria-pressed': btn.getAttribute('aria-pressed'),
      'aria-expanded': btn.getAttribute('aria-expanded'),
      'aria-haspopup': btn.getAttribute('aria-haspopup'),
      'data-track-id': btn.getAttribute('data-track-id'),
      'data-album-id': btn.getAttribute('data-album-id'),
      'data-action': btn.getAttribute('data-action')
    });

    if (reactProps) {
      console.log('%c3. React Props (прямые):', 'color: #10b981; font-weight: bold;', {
        onClick: reactProps.onClick,
        onPointerDown: reactProps.onPointerDown,
        onContextMenu: reactProps.onContextMenu,
        allProps: reactProps
      });
    } else {
      console.log('%c3. React Props:', 'color: #9ca3af; font-style: italic;', 'Не обнаружены (элемент отрендерен нативно BetterYandexMusic)');
    }

    if (fiberParents.length > 0) {
      console.log('%c4. React Fiber цепочка компонентов:', 'color: #8b5cf6; font-weight: bold;', fiberParents);
    }

    if (foundData) {
      console.log('%c5. Обнаруженные музыкальные данные:', 'color: #ec4899; font-weight: bold;', foundData);
    }

    console.log('%c6. Состояние плеера и сервисов:', 'color: #3b82f6; font-weight: bold;', {
      rootModelAvailable: Boolean(root),
      trailerServiceAvailable: Boolean(root?.services?.trailerService || root?.trailer),
      sonataCoreAvailable: Boolean(core),
      activePlayer: player?.id,
      playerStatus: player?.playbackState?.playerState?.status?.value || player?.playbackState?.playerState?.status,
      currentTrack: player?.playbackState?.playerState?.track?.value?.title || player?.playbackState?.playerState?.track?.title
    });

    // Определение функционала кнопки
    let actionDesc = 'Неизвестное действие';
    const aria = btn.getAttribute('aria-label') || '';
    const cls = btn.className || '';
    const act = btn.getAttribute('data-action') || '';

    if (aria.includes('оспроизведение') || aria.includes('ауза') || cls.includes('playButton') || cls.includes('PlayButton')) {
      actionDesc = '▶ ВОСПРОИЗВЕДЕНИЕ / ПАУЗА: Запускает выбранный трек в контексте плейлиста или переключает паузу активного трека.';
    } else if (aria.includes('равится') || cls.includes('likeIcon') || cls.includes('likeButton') || act === 'like') {
      actionDesc = '❤️ ЛАЙК ТРЕКА / АЛЬБОМА: Добавляет/удаляет трек из "Мне нравится", отправляет запрос на API и синхронизирует коллекцию.';
    } else if (aria.includes('рейлер') || cls.includes('trailer') || act === 'trailer') {
      actionDesc = '🎬 ТРЕЙЛЕР: Запускает 30-секундное превью трека/альбома через native trailerService или Sonata trailer context.';
    } else if (aria.includes('еню') || cls.includes('contextMenu') || cls.includes('more') || act === 'menu') {
      actionDesc = '📑 КОНТЕКСТНОЕ МЕНЮ: Открывает всплывающее меню с действиями (лайк, трейлер, Моя волна, переход к альбому/артисту, поделиться).';
    } else if (aria.includes('качать') || cls.includes('download')) {
      actionDesc = '📥 СКАЧАТЬ: Запускает встроенный загрузчик трека BetterYandexMusic.';
    }

    console.log(`%c👉 НАЗНАЧЕНИЕ КНОПКИ: %c${actionDesc}`, 'color: #f59e0b; font-weight: bold;', 'color: #ffffff; font-weight: bold;');
    console.groupEnd();

    return {
      element: btn,
      reactProps,
      fiber,
      foundData,
      actionDesc
    };
  }

  let inspectorActive = false;
  let prevHoverEl = null;

  function onInspectorHover(e) {
    if (!inspectorActive) return;
    const target = e.target.closest('button, [role="button"], a, [class*="HorizontalCardContainer"], [class*="CommonTrack"]');
    if (prevHoverEl && prevHoverEl !== target) {
      prevHoverEl.style.outline = prevHoverEl._bym_prev_outline || '';
      prevHoverEl = null;
    }
    if (target) {
      if (!target._bym_prev_outline) target._bym_prev_outline = target.style.outline;
      target.style.outline = '2px solid #38bdf8';
      prevHoverEl = target;
    }
  }

  function onInspectorClick(e) {
    if (!inspectorActive) return;
    const target = e.target.closest('button, [role="button"], a, [class*="HorizontalCardContainer"], [class*="CommonTrack"]') || e.target;
    
    // Если нажат Shift — отменяем нативное действие, только инспектируем
    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      console.log('%c[Shift+Click] Нативное действие заблокировано для инспекции.', 'color: #f59e0b;');
    }

    debugButton(target);
  }

  function startInspector() {
    if (inspectorActive) return;
    inspectorActive = true;
    document.addEventListener('mouseover', onInspectorHover, { passive: true });
    document.addEventListener('click', onInspectorClick, { capture: true });
    console.log('%c🔎 [BYM Inspector] ВКЛЮЧЕН!', 'color: #10b981; font-weight: bold; font-size: 14px;');
    console.log('%cКликайте по любой кнопке или строке трека для анализа в консоли.\nСовет: Удерживайте Shift при клике, чтобы исследовать кнопку без выполнения действия.\nДля выключения введите: bymStopInspector()', 'color: #94a3b8;');
  }

  function stopInspector() {
    if (!inspectorActive) return;
    inspectorActive = false;
    document.removeEventListener('mouseover', onInspectorHover);
    document.removeEventListener('click', onInspectorClick, { capture: true });
    if (prevHoverEl) {
      prevHoverEl.style.outline = prevHoverEl._bym_prev_outline || '';
      prevHoverEl = null;
    }
    console.log('%c🛑 [BYM Inspector] ВЫКЛЮЧЕН.', 'color: #ef4444; font-weight: bold;');
  }

  window.bymDebugButton = debugButton;
  window.bymStartInspector = startInspector;
  window.bymStopInspector = stopInspector;

  console.log('%c🛠 [BetterYandexMusic Debug Tools] Доступны: bymDebugButton($0), bymStartInspector(), bymStopInspector()', 'color: #38bdf8;');
})();
