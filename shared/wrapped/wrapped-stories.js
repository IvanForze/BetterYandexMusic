// ==========================================
// WRAPPED STORIES (Истории прослушиваний)
// ==========================================

let storiesOverlay = null;
let currentSlideIndex = 0;
let storyTimer = null;
let storyProgressInterval = null;
let currentProgressPercent = 0;
let isStoryPaused = false;
let activeStoriesStats = null;

// Порог времени на каждый слайд (15 секунд)
const SLIDE_DURATION_MS = 15000;
const PROGRESS_STEP_MS = 30;

function showToast(message) {
  // Проверяем, нет ли уже такого тоста
  const existingToast = document.querySelector('.ym-stories-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'ym-stories-toast';
  toast.textContent = message;
  
  toast.style.position = 'fixed';
  toast.style.bottom = '50px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%) translateY(20px)';
  toast.style.background = 'rgba(0, 0, 0, 0.85)';
  toast.style.color = '#fff';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '12px';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = '500';
  toast.style.zIndex = '200000000'; // Поверх истории
  toast.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  toast.style.pointerEvents = 'none';
  toast.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  toast.style.textAlign = 'center';
  toast.style.maxWidth = '320px';

  document.body.appendChild(toast);
  
  void toast.offsetWidth;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

function playTrackInStories(trackId) {
  try {
    const activePlayer = window.getActivePlayer ? window.getActivePlayer() : null;
    if (!activePlayer) {
      console.warn('[Stories] Плеер не найден. Выводим предупреждение...');
      showToast('Пожалуйста, сначала инициализируйте плеер (включите любой трек на 1 секунду и остановите).');
      return;
    }

    const queueState = activePlayer.playbackState?.queueState;
    const list = queueState?.entityList?.value || [];
    
    // Ищем трек в текущей очереди
    const trackIndex = list.findIndex(item => {
      const data = item?.entity?.data || item?.entity?.entityData;
      const id = data?.meta?.id || data?.id;
      return String(id) === String(trackId);
    });

    if (trackIndex !== -1) {
      console.log(`[Stories] Трек найден на индексе ${trackIndex}. Переключаем и запускаем...`);
      if (typeof activePlayer.setEntityByIndex === 'function') {
        activePlayer.setEntityByIndex(trackIndex);
        
        // Запуск воспроизведения
        setTimeout(() => {
          if (typeof activePlayer.resume === 'function') {
            activePlayer.resume();
          } else if (typeof activePlayer.play === 'function') {
            activePlayer.play();
          }
        }, 150);
      }
      return;
    }

    // Если трека нет в очереди, инжектируем его сразу за текущим
    console.log(`[Stories] Трека нет в очереди. Инжектируем ID ${trackId}...`);
    if (activePlayer.queueController && typeof activePlayer.queueController.inject === 'function') {
      const currentIndex = queueState?.index?.value || 0;
      const insertIndex = currentIndex + 1;

      activePlayer.queueController.inject({
        entitiesData: [
          { type: "unloaded", meta: { id: String(trackId) } }
        ],
        position: insertIndex,
        silent: false
      });

      // Переключаемся с небольшой задержкой (500мс, аналогично сокет-синхронизации)
      setTimeout(() => {
        const updatedList = queueState?.entityList?.value || [];
        let targetIndex = -1;
        for (let i = 0; i < updatedList.length; i++) {
          const d = updatedList[i]?.entity?.data || updatedList[i]?.entity?.entityData;
          const id = d?.meta?.id || d?.id;
          if (String(id) === String(trackId)) {
            if (targetIndex === -1 || Math.abs(i - insertIndex) < Math.abs(targetIndex - insertIndex)) {
              targetIndex = i;
            }
          }
        }
        const finalIndex = targetIndex !== -1 ? targetIndex : insertIndex;
        if (typeof activePlayer.setEntityByIndex === 'function') {
          activePlayer.setEntityByIndex(finalIndex);
          
          // Запуск воспроизведения
          setTimeout(() => {
            if (typeof activePlayer.resume === 'function') {
              activePlayer.resume();
            } else if (typeof activePlayer.play === 'function') {
              activePlayer.play();
            }
          }, 150);
        }
      }, 500);
    } else {
      showToast('Пожалуйста, сначала инициализируйте плеер (включите любой трек на 1 секунду и остановите).');
    }
  } catch (e) {
    console.error('[Stories] Ошибка при воспроизведении трека в Sonata:', e);
    showToast('Пожалуйста, сначала инициализируйте плеер (включите любой трек на 1 секунду и остановите).');
  }
}

function openWrappedStories(stats) {
  console.log('[Stories] Открытие историй с данными:', stats);
  activeStoriesStats = stats;
  currentSlideIndex = 0;
  isStoryPaused = false;

  // Скрываем основной оверлей статистики
  const mainOverlay = document.getElementById('ym-wrapped-overlay');
  if (mainOverlay) {
    console.log('[Stories] Скрываем главный оверлей статистики');
    mainOverlay.style.visibility = 'hidden';
  }

  // Создаем контейнер историй
  if (!storiesOverlay) {
    console.log('[Stories] Создаем новый элемент #ym-wrapped-stories');
    storiesOverlay = document.createElement('div');
    storiesOverlay.id = 'ym-wrapped-stories';
    
    const style = document.createElement('style');
    style.id = 'ym-wrapped-stories-style';
    style.textContent = `
      #ym-wrapped-stories {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 10000000 !important;
        background: black;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'YS Text', sans-serif;
        color: white;
        user-select: none;
        -webkit-user-select: none;
      }
      
      .ym-story-card {
        width: 100%;
        max-width: 480px;
        height: 100%;
        max-height: 850px;
        background: linear-gradient(180deg, #18002a 0%, #05000a 100%);
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 40px 24px;
        box-sizing: border-box;
      }
      
      @media (min-width: 480px) {
        .ym-story-card {
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          height: 90vh;
        }
      }
      
      /* Progress Bar */
      .ym-stories-progress {
        display: flex;
        gap: 6px;
        position: absolute;
        top: 15px;
        left: 15px;
        right: 15px;
        z-index: 10;
      }
      
      .ym-story-progress-bg {
        flex: 1;
        height: 4px;
        background: rgba(255,255,255,0.15);
        border-radius: 2px;
        overflow: hidden;
      }
      
      .ym-story-progress-fill {
        width: 0%;
        height: 100%;
        background: white;
        border-radius: 2px;
      }
      
      /* Close Button */
      .ym-story-close {
        position: absolute;
        top: 30px;
        right: 20px;
        z-index: 12;
        background: rgba(255,255,255,0.1);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
      }
      
      .ym-story-close:hover {
        transform: scale(1.1);
        background: rgba(255,255,255,0.2);
      }
      
      /* Navigation Tap Zones */
      .ym-story-tap-left {
        position: absolute;
        top: 0; left: 0; bottom: 0;
        width: 30%;
        z-index: 5;
        cursor: w-resize;
      }
      .ym-story-tap-right {
        position: absolute;
        top: 0; right: 0; bottom: 0;
        width: 70%;
        z-index: 5;
        cursor: e-resize;
      }
      
      /* Slide Content */
      .ym-story-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding-top: 40px;
        animation: slideIn 0.5s cubic-bezier(0.1, 0.8, 0.2, 1);
      }
      
      @keyframes slideIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      
      /* Slide Specific Animations */
      .ym-anim-float {
        animation: floatAnim 4s ease-in-out infinite;
      }
      @keyframes floatAnim {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-10px) rotate(2deg); }
      }
      
      .ym-anim-spin {
        animation: spinAnim 20s linear infinite;
      }
      @keyframes spinAnim {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .ym-story-btn {
        background: linear-gradient(135deg, #cc00ff, #ff8c00);
        border: none;
        border-radius: 14px;
        color: white;
        padding: 14px 28px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        pointer-events: auto;
        z-index: 20;
        margin-top: 20px;
      }
      
      .ym-story-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 8px 24px rgba(204, 0, 255, 0.3);
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(storiesOverlay);
  }

  storiesOverlay.style.display = 'flex';
  renderCurrentSlide();
}

function closeWrappedStories() {
  console.log('[Stories] Закрытие историй');
  if (storyTimer) clearTimeout(storyTimer);
  if (storyProgressInterval) clearInterval(storyProgressInterval);

  if (storiesOverlay) {
    storiesOverlay.style.display = 'none';
  }

  // Останавливаем музыку плеера при выходе из историй
  try {
    const activePlayer = window.getActivePlayer ? window.getActivePlayer() : null;
    if (activePlayer && typeof activePlayer.pause === 'function') {
      console.log('[Stories] Останавливаем музыку плеера при выходе');
      activePlayer.pause();
    }
  } catch (e) {
    console.error('[Stories] Не удалось поставить плеер на паузу:', e);
  }

  // Возвращаем видимость главного оверлея
  const mainOverlay = document.getElementById('ym-wrapped-overlay');
  if (mainOverlay) {
    console.log('[Stories] Показываем главный оверлей статистики');
    mainOverlay.style.visibility = 'visible';
  }
}

let lastSlideChangeTime = 0;

function renderCurrentSlide() {
  console.log('[Stories] Рендерим слайд с индексом:', currentSlideIndex);
  lastSlideChangeTime = Date.now();
  if (storyTimer) clearTimeout(storyTimer);
  if (storyProgressInterval) clearInterval(storyProgressInterval);

  const stats = activeStoriesStats;
  const slidesCount = 5;

  // Рендерим оболочку карточки (без onclick в html)
  storiesOverlay.innerHTML = `
    <div class="ym-story-card" id="ym-story-card-body">
      <div class="ym-stories-progress">
        ${Array.from({ length: slidesCount }, (_, i) => `
          <div class="ym-story-progress-bg">
            <div class="ym-story-progress-fill" id="ym-progress-fill-${i}"></div>
          </div>
        `).join('')}
      </div>
      
      <button class="ym-story-close" aria-label="Закрыть">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
      
      <div class="ym-story-tap-left" id="ym-tap-left"></div>
      <div class="ym-story-tap-right" id="ym-tap-right"></div>
      
      <div class="ym-story-content" id="ym-story-content-body"></div>
    </div>
  `;

  // Подключаем слушатели на закрытие и тапы
  const closeBtn = storiesOverlay.querySelector('.ym-story-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeWrappedStories();
    });
  }
  
  const tapLeft = storiesOverlay.querySelector('#ym-tap-left');
  const tapRight = storiesOverlay.querySelector('#ym-tap-right');
  const cardBody = storiesOverlay.querySelector('#ym-story-card-body');

  if (tapLeft) tapLeft.addEventListener('click', (e) => { e.stopPropagation(); prevSlide(); });
  if (tapRight) tapRight.addEventListener('click', (e) => { e.stopPropagation(); nextSlide(); });

  // Добавляем удержание пальцем/мышкой для паузы
  const pauseStory = () => {
    isStoryPaused = true;
  };
  const resumeStory = () => {
    isStoryPaused = false;
  };

  if (cardBody) {
    cardBody.addEventListener('mousedown', pauseStory);
    cardBody.addEventListener('mouseup', resumeStory);
    cardBody.addEventListener('mouseleave', resumeStory);
    cardBody.addEventListener('touchstart', pauseStory);
    cardBody.addEventListener('touchend', resumeStory);
  }

  // Заполняем прогресс-бары до текущего слайда
  for (let i = 0; i < currentSlideIndex; i++) {
    const el = storiesOverlay.querySelector(`#ym-progress-fill-${i}`);
    if (el) el.style.width = '100%';
  }

  // Устанавливаем градиент фона для карточки в зависимости от слайда
  if (cardBody) {
    switch (currentSlideIndex) {
      case 0:
        cardBody.style.background = 'linear-gradient(135deg, #1d003c 0%, #0d001f 50%, #030008 100%)';
        break;
      case 1:
        cardBody.style.background = 'linear-gradient(135deg, #0f002b 0%, #170017 100%)';
        break;
      case 2:
        cardBody.style.background = 'linear-gradient(135deg, #001f3f 0%, #001220 100%)';
        break;
      case 3:
        cardBody.style.background = 'linear-gradient(135deg, #1b001b 0%, #030008 100%)';
        break;
      case 4:
        cardBody.style.background = 'linear-gradient(135deg, #2b1200 0%, #0a0400 100%)';
        break;
    }
  }

  // Рендерим контент конкретного слайда
  const contentBody = storiesOverlay.querySelector('#ym-story-content-body');
  if (!contentBody) {
    console.error('[Stories] Элемент #ym-story-content-body не найден в DOM!');
    return;
  }
  
  switch (currentSlideIndex) {
    case 0:
      renderIntroSlide(contentBody, stats);
      break;
    case 1:
      renderPlaytimeSlide(contentBody, stats);
      break;
    case 2:
      renderGenreSlide(contentBody, stats);
      break;
    case 3:
      renderArtistSlide(contentBody, stats);
      break;
    case 4:
      renderTrackSlide(contentBody, stats);
      break;
  }

  // Запуск таймера и прогресса
  currentProgressPercent = 0;
  let elapsedMs = 0;

  storyProgressInterval = setInterval(() => {
    if (isStoryPaused) return; // На паузе прогресс не копится

    elapsedMs += PROGRESS_STEP_MS;
    currentProgressPercent = (elapsedMs / SLIDE_DURATION_MS) * 100;
    
    const currentProgressEl = storiesOverlay.querySelector(`#ym-progress-fill-${currentSlideIndex}`);
    if (currentProgressEl) {
      currentProgressEl.style.width = `${Math.min(currentProgressPercent, 100)}%`;
    }

    if (elapsedMs >= SLIDE_DURATION_MS) {
      clearInterval(storyProgressInterval);
      nextSlide();
    }
  }, PROGRESS_STEP_MS);
}

function nextSlide() {
  if (Date.now() - lastSlideChangeTime < 400) return;
  if (currentSlideIndex < 4) {
    currentSlideIndex++;
    renderCurrentSlide();
  } else {
    closeWrappedStories();
  }
}

function prevSlide() {
  if (Date.now() - lastSlideChangeTime < 400) return;
  if (currentSlideIndex > 0) {
    currentSlideIndex--;
    renderCurrentSlide();
  }
}

// ================= SLIDES CONTENT RENDERERS =================

function renderIntroSlide(container, stats) {
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="url(#headphone-gradient)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="ym-anim-float" style="margin-bottom: 25px; filter: drop-shadow(0 0 15px rgba(255, 219, 77, 0.4));">
        <defs>
          <linearGradient id="headphone-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffdb4d" />
            <stop offset="100%" stop-color="#ff8c00" />
          </linearGradient>
        </defs>
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
      <h1 style="font-size: 32px; font-weight: 800; margin: 0; line-height: 1.2; background: linear-gradient(90deg, #ffdb4d, #ff8c00); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Твоя Музыкальная<br>История</h1>
      <p style="font-size: 16px; color: rgba(255,255,255,0.6); margin-top: 15px; max-width: 280px; line-height: 1.4;">Давай вспомним твои лучшие музыкальные моменты и любимые ритмы за это время.</p>
    </div>
    <div style="font-size: 12px; color: rgba(255,255,255,0.3); letter-spacing: 1px; margin-bottom: 10px;">НАЖМИ НА ПРАВУЮ СТОРОНУ, ЧТОБЫ ИДТИ ДАЛЬШЕ</div>
  `;
}

function renderPlaytimeSlide(container, stats) {
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="80" height="80" fill="url(#lightning-gradient)" stroke="none" class="ym-anim-float" style="margin-bottom: 25px; filter: drop-shadow(0 0 15px rgba(204, 0, 255, 0.4));">
        <defs>
          <linearGradient id="lightning-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#cc00ff" />
            <stop offset="100%" stop-color="#ff007f" />
          </linearGradient>
        </defs>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
      <h2 style="font-size: 22px; color: rgba(255,255,255,0.6); margin: 0; text-transform: uppercase; letter-spacing: 2px;">Музыкальный забег</h2>
      
      <div style="margin: 25px 0;">
        <span style="font-size: 72px; font-weight: 900; color: #ffdb4d;">${Math.round(stats.totalHours * 60)}</span>
        <span style="font-size: 24px; font-weight: bold; color: rgba(255,255,255,0.7); display: block; margin-top: -10px;">минут прослушивания</span>
      </div>

      <p style="font-size: 16px; color: rgba(255,255,255,0.8); max-width: 320px; line-height: 1.4;">
        За это время ты успел включить целых <b style="color: #ff8c00;">${stats.totalListens}</b> треков! Настоящая верность любимым ритмам.
      </p>
    </div>
  `;
}

function renderGenreSlide(container, stats) {
  const topGenre = stats.topGenres[0] ? stats.topGenres[0].name : 'Музыка';
  
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="url(#note-gradient)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="ym-anim-float" style="margin-bottom: 25px; filter: drop-shadow(0 0 15px rgba(0, 212, 255, 0.4));">
        <defs>
          <linearGradient id="note-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00f2fe" />
            <stop offset="100%" stop-color="#4facfe" />
          </linearGradient>
        </defs>
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" fill="url(#note-gradient)" />
        <circle cx="18" cy="16" r="3" fill="url(#note-gradient)" />
      </svg>
      <h2 style="font-size: 22px; color: rgba(255,255,255,0.6); margin: 0; text-transform: uppercase; letter-spacing: 2px;">Твоя звуковая волна</h2>
      
      <div style="margin: 25px 0; background: rgba(0, 242, 254, 0.1); border: 2px solid #00f2fe; padding: 15px 35px; border-radius: 20px; box-shadow: 0 0 20px rgba(0, 242, 254, 0.2);">
        <span style="font-size: 38px; font-weight: 900; color: #00f2fe; text-transform: capitalize;">${topGenre}</span>
      </div>

      <p style="font-size: 16px; color: rgba(255,255,255,0.8); max-width: 300px; line-height: 1.5;">
        Этот жанр звучал в твоих ушах чаще остальных. Твоя душа настроена на его частоту!
      </p>
    </div>
  `;
}

function renderArtistSlide(container, stats) {
  const artistObj = stats.topArtists[0];
  const artistName = artistObj && artistObj.artist ? artistObj.artist.name : 'Неизвестный исполнитель';
  const coverUrl = artistObj && artistObj.artist && artistObj.artist.cover ? artistObj.artist.cover : 'https://music.yandex.ru/blocks/playlist-cover/playlist-cover_like.png';
  const minutes = artistObj ? Math.round(artistObj.duration / 60) : 0;
  
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%;">
      <h2 style="font-size: 22px; color: rgba(255,255,255,0.6); margin: 0 0 30px 0; text-transform: uppercase; letter-spacing: 2px;">Твой артист года</h2>
      
      <div class="ym-anim-float" style="position: relative; margin-bottom: 25px;">
        <img src="${coverUrl}" style="width: 180px; height: 180px; border-radius: 50%; object-fit: cover; border: 4px solid #cc00ff; box-shadow: 0 0 30px rgba(204,0,255,0.4);">
      </div>

      <span style="font-size: 32px; font-weight: 800; color: white; display: block; margin-bottom: 10px;">${artistName}</span>
      
      <p style="font-size: 16px; color: rgba(255,255,255,0.8); max-width: 300px; line-height: 1.5; margin: 0;">
        Ты посвятил его творчеству целых <b style="color: #cc00ff;">${minutes}</b> минут! Похоже, вы понимаете друг друга без слов.
      </p>
    </div>
  `;

  // Автоматический запуск трека артиста в фоне через Sonata
  if (artistObj && artistObj.artist) {
    const artistNameLower = artistObj.artist.name.toLowerCase();
    const matchTrack = stats.topTracks.find(t => 
      t.track && t.track.artists && t.track.artists.some(a => (a.name || String(a)).toLowerCase() === artistNameLower)
    );
    if (matchTrack && matchTrack.track) {
      console.log(`[Stories] Автозапуск трека артиста: ${matchTrack.track.title}`);
      playTrackInStories(matchTrack.track.id);
    }
  }
}

function renderTrackSlide(container, stats) {
  const trackObj = stats.topTracks[0];
  const trackId = trackObj && trackObj.track ? trackObj.track.id : null;
  const trackTitle = trackObj && trackObj.track ? trackObj.track.title : 'Неизвестный трек';
  let coverUrl = trackObj && trackObj.track && trackObj.track.cover ? trackObj.track.cover : 'https://music.yandex.ru/blocks/playlist-cover/playlist-cover_like.png';
  if (coverUrl && !coverUrl.startsWith('http') && !coverUrl.startsWith('//')) {
    coverUrl = 'https://' + coverUrl;
  }
  const artistName = trackObj && trackObj.track && trackObj.track.artists && trackObj.track.artists.length > 0 ? (trackObj.track.artists[0].name || trackObj.track.artists[0]) : 'Артист';
  const plays = trackObj ? trackObj.count : 0;
  
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%;">
      <h2 style="font-size: 22px; color: rgba(255,255,255,0.6); margin: 0 0 35px 0; text-transform: uppercase; letter-spacing: 2px;">Трек года</h2>
      
      <div style="position: relative; margin-bottom: 25px; display: flex; justify-content: center; align-items: center;">
        <div class="ym-anim-spin" style="width: 170px; height: 170px; border-radius: 50%; background: #0b0b0b; display: flex; justify-content: center; align-items: center; border: 4px solid #ff8c00; box-shadow: 0 0 30px rgba(255,140,0,0.3); position: relative;">
          <div style="width: 160px; height: 160px; border-radius: 50%; background: repeating-radial-gradient(circle, black, black 2px, #1a1a1a 4px, #1a1a1a 5px); display: flex; justify-content: center; align-items: center;">
            <img src="${coverUrl}" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover;">
          </div>
          <div style="position: absolute; width: 12px; height: 12px; background: #000; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2);"></div>
        </div>
      </div>

      <span style="font-size: 26px; font-weight: 800; color: white; display: block; margin-bottom: 5px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 320px;">${trackTitle}</span>
      <span style="font-size: 18px; color: rgba(255,255,255,0.7); display: block; margin-bottom: 15px;">${artistName}</span>
      
      <p style="font-size: 15px; color: rgba(255,255,255,0.8); max-width: 300px; line-height: 1.5; margin: 0 0 20px 0;">
        Этот трек ты слушал чаще всего — целых <b style="color: #ff8c00;">${plays}</b> раз! Он определенно стал гимном этого периода.
      </p>

      ${trackId ? `<button class="ym-story-btn" id="ym-story-play-btn">▶ Включить в плеере</button>` : ''}
    </div>
  `;

  if (trackId) {
    console.log(`[Stories] Автозапуск трека года: ${trackTitle}`);
    playTrackInStories(trackId);
    
    const playBtn = container.querySelector('#ym-story-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playTrackInStories(trackId);
      });
    }
  }
}

// Экспорт функций в глобальный контекст window
if (typeof window !== 'undefined') {
  window.openWrappedStories = openWrappedStories;
  window.closeWrappedStories = closeWrappedStories;
}
