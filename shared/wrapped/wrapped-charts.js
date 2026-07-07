// ==========================================
// WRAPPED CHARTS (Отрисовка статистики)
// ==========================================

let artistsChartInstance = null;
let tracksChartInstance = null;
let monthsChartInstance = null;
let genresChartInstance = null;
let erasChartInstance = null;
let hoursChartInstance = null;
let daysChartInstance = null;

async function renderWrappedCharts() {
  const containerOverview = document.getElementById('ym-wrapped-tab-overview');
  const containerArtists = document.getElementById('ym-wrapped-tab-artists');
  const containerTracks = document.getElementById('ym-wrapped-tab-tracks');
  const containerGenres = document.getElementById('ym-wrapped-tab-genres');
  const containerCalendar = document.getElementById('ym-wrapped-tab-calendar');
  const containerActivity = document.getElementById('ym-wrapped-tab-activity');
  const containerSettings = document.getElementById('ym-wrapped-tab-settings');

  if (!containerOverview) return;

  if (!window.wrappedDB) {
    containerOverview.innerHTML = '<div style="color:red; text-align:center;">Ошибка: База данных недоступна</div>';
    return;
  }

  try {
    const stats = await window.wrappedDB.getStats();
    
    if (stats.totalListens === 0) {
      const emptyMsg = `
        <div style="text-align: center; color: rgba(255,255,255,0.5); margin-top: 100px;">
          <h2 style="font-size: 32px; color: white;">Пока нет данных 🥺</h2>
          <p style="font-size: 18px;">Послушайте несколько треков, чтобы статистика начала собираться!</p>
        </div>
      `;
      containerOverview.innerHTML = emptyMsg;
      containerArtists.innerHTML = emptyMsg;
      containerTracks.innerHTML = emptyMsg;
      containerGenres.innerHTML = emptyMsg;
      if (containerCalendar) containerCalendar.innerHTML = emptyMsg;
      containerActivity.innerHTML = emptyMsg;
      renderSettingsTab(containerSettings);
      return;
    }

    // Общие настройки Chart.js для темной темы
    Chart.defaults.color = 'rgba(255, 255, 255, 0.6)';
    Chart.defaults.font.family = '"YS Text", sans-serif';

    // Рендер вкладки Обзор
    renderOverviewTab(containerOverview, stats);
    
    // Рендер вкладки Артисты
    renderArtistsTab(containerArtists, stats);
    
    // Рендер вкладки Треки
    renderTracksTab(containerTracks, stats);

    // Рендер вкладки Жанры и Эпохи
    renderGenresTab(containerGenres, stats);

    // Рендер вкладки Календарь
    if (containerCalendar) {
      renderCalendarTab(containerCalendar, stats);
    }

    // Рендер вкладки Активность
    renderActivityTab(containerActivity, stats);

    // Рендер вкладки Настройки
    renderSettingsTab(containerSettings);

  } catch (err) {
    console.error('Ошибка рендеринга графиков:', err);
    containerOverview.innerHTML = '<div style="color:red;">Ошибка при загрузке статистики.</div>';
  }
}

function renderOverviewTab(container, stats) {
  container.innerHTML = `
    <h2 style="font-size: 32px; margin-top: 0; margin-bottom: 20px; flex-shrink: 0;">Обзор</h2>
    <div class="ym-wrapped-row" style="margin-bottom: 20px; flex-shrink: 0;">
      <div class="ym-glass-card" style="flex: 1.2; background: linear-gradient(135deg, rgba(204, 0, 255, 0.12) 0%, rgba(255, 140, 0, 0.12) 100%) !important; border: 1px dashed rgba(255, 255, 255, 0.15) !important; padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
        <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: white;">Твои Музыкальные Итоги</h3>
        <button id="ym-stories-overview-btn" style="background: linear-gradient(135deg, #cc00ff 0%, #ff8c00 100%); border: none; border-radius: 12px; color: white; padding: 10px 20px; font-size: 14px; font-weight: bold; cursor: pointer; transition: transform 0.2s; font-family: inherit; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          Посмотреть Истории
        </button>
      </div>
      <div class="ym-glass-card" style="flex: 0.9; padding: 20px; text-align: center; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-size: 36px; font-weight: bold; color: #ffdb4d; line-height: 1.2;">${stats.totalListens}</div>
        <div style="font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">Треков прослушано</div>
      </div>
      <div class="ym-glass-card" style="flex: 0.9; padding: 20px; text-align: center; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-size: 36px; font-weight: bold; color: #ff8c00; line-height: 1.2;">${stats.totalHours}</div>
        <div style="font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">Часов музыки</div>
      </div>
    </div>
    
    <div class="ym-wrapped-columns" style="flex: 1; min-height: 0; gap: 20px;">
      <div style="flex: 0.9; display: flex; flex-direction: column; gap: 20px; min-height: 0;">
        <div class="ym-glass-card" style="padding: 20px; display: flex; align-items: center; gap: 20px;">
          <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #cc00ff, #ff8c00); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 15px rgba(204, 0, 255, 0.3);">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/><path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5Z"/><path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z"/></svg>
          </div>
          <div style="min-width: 0;">
            <div style="font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px;">Музыкальный психотип</div>
            <div style="font-size: 16px; font-weight: bold; color: #ffdb4d; margin-top: 2px;">${stats.listeningPersona.name}</div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 4px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${stats.listeningPersona.description}</div>
          </div>
        </div>
        
        <div class="ym-glass-card" style="padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 10px; min-height: 0;">
          <h3 style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Личные Рекорды</h3>
          
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
            <span style="color: rgba(255,255,255,0.4);">Самый активный день:</span>
            <span style="font-weight: 500; text-align: right; color: white;">${stats.personalRecords.peakDay} <span style="color: #ffdb4d; font-weight: bold;">(${stats.personalRecords.peakDayCount} тр.)</span></span>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
            <span style="color: rgba(255,255,255,0.4);">Любимое время:</span>
            <span style="font-weight: 500; text-align: right; color: #ff8c00;">${stats.personalRecords.favSlot}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
            <span style="color: rgba(255,255,255,0.4);">Будни vs Выходные:</span>
            <span style="font-weight: 500; text-align: right; color: white;">${stats.personalRecords.weekdayPercent}% / ${stats.personalRecords.weekendPercent}%</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
            <span style="color: rgba(255,255,255,0.4);">Средняя длина трека:</span>
            <span style="font-weight: 500; text-align: right; color: white;">${stats.personalRecords.avgTrackDurationMin} мин.</span>
          </div>
        </div>
      </div>
      
      <div class="ym-glass-card" style="flex: 1.1; min-height: 0; padding: 25px; display: flex; flex-direction: column;">
        <h3 style="margin-top: 0; margin-bottom: 15px; color: rgba(255,255,255,0.8); flex-shrink: 0;">Активность по месяцам</h3>
        <div style="flex: 1; min-height: 0; position: relative;">
          <canvas id="ym-chart-months"></canvas>
        </div>
      </div>
    </div>
  `;

  const overviewBtn = container.querySelector('#ym-stories-overview-btn');
  if (overviewBtn) {
    overviewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (typeof window.openWrappedStories === 'function') {
        window.openWrappedStories(stats);
      }
    });
  }

  const ctxMonths = document.getElementById('ym-chart-months').getContext('2d');
  if (monthsChartInstance) monthsChartInstance.destroy();

  const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  
  // Создаем градиент для графика активности по месяцам
  const chartGradient = ctxMonths.createLinearGradient(0, 0, 0, 200);
  chartGradient.addColorStop(0, 'rgba(255, 140, 0, 0.3)');
  chartGradient.addColorStop(1, 'rgba(255, 140, 0, 0.0)');

  monthsChartInstance = new Chart(ctxMonths, {
    type: 'line',
    data: {
      labels: monthNames,
      datasets: [{
        label: 'Треков',
        data: stats.listensByMonth,
        borderColor: '#ff8c00',
        backgroundColor: chartGradient,
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderArtistsTab(container, stats) {
  // Вычисляем количество артистов под высоту экрана
  const viewportHeight = window.innerHeight;
  let topCount = 5;
  if (viewportHeight < 720) {
    topCount = 3;
  } else if (viewportHeight > 900) {
    topCount = 7;
  }

  const mainArtists = stats.topArtists.slice(0, topCount);
  const otherArtists = stats.topArtists.slice(topCount);

  let listHtml = '';
  mainArtists.forEach((a, i) => {
    const min = Math.round(a.duration / 60);
    const coverUrl = a.artist && a.artist.cover ? a.artist.cover : 'https://music.yandex.ru/blocks/playlist-cover/playlist-cover_like.png';
    listHtml += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="display: flex; align-items: center; font-size: 16px; min-width: 0;">
          <span style="color: rgba(255,255,255,0.4); margin-right: 15px; width: 20px; display: inline-block; text-align: center; flex-shrink: 0;">${i+1}</span>
          <img src="${coverUrl}" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 15px; object-fit: cover; flex-shrink: 0;">
          <span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.artist ? a.artist.name : 'Неизвестный'}</span>
        </div>
        <div style="color: #ffdb4d; font-weight: bold; flex-shrink: 0; margin-left: 10px;">${min} мин.</div>
      </div>
    `;
  });

  if (otherArtists.length > 0) {
    const otherMin = otherArtists.reduce((sum, a) => sum + Math.round(a.duration / 60), 0);
    listHtml += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="display: flex; align-items: center; font-size: 16px; min-width: 0;">
          <span style="color: rgba(255,255,255,0.4); margin-right: 15px; width: 20px; display: inline-block; text-align: center; flex-shrink: 0;">-</span>
          <div style="width: 40px; height: 40px; border-radius: 50%; margin-right: 15px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: rgba(255,255,255,0.4);"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <span style="font-weight: 500; color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Другие (${otherArtists.length})</span>
        </div>
        <div style="color: rgba(255,255,255,0.6); font-weight: bold; flex-shrink: 0; margin-left: 10px;">${otherMin} мин.</div>
      </div>
    `;
  }

  container.innerHTML = `
    <h2 style="font-size: 32px; margin-top: 0; margin-bottom: 20px; flex-shrink: 0;">Топ Артистов</h2>
    <div class="ym-wrapped-columns">
      <div class="ym-glass-card" style="flex: 1.1; padding: 25px; display: flex; flex-direction: column; min-height: 0;">
        <div style="flex: 1; min-height: 0; position: relative;">
          <canvas id="ym-chart-artists"></canvas>
        </div>
      </div>
      <div class="ym-glass-card" style="flex: 0.9; padding: 25px; display: flex; flex-direction: column; min-height: 0;">
        <h3 style="margin-top: 0; margin-bottom: 15px; flex-shrink: 0;">Лидеры по времени</h3>
        <div style="flex: 1; overflow-y: auto; min-height: 0; padding-right: 5px;">
          ${listHtml}
        </div>
      </div>
    </div>
  `;

  const ctxArtists = document.getElementById('ym-chart-artists').getContext('2d');
  if (artistsChartInstance) artistsChartInstance.destroy();
  
  const labels = mainArtists.map(a => a.artist ? a.artist.name : 'Неизвестный');
  const data = mainArtists.map(a => Math.round(a.duration / 60));
  const colors = ['#ffdb4d', '#ff8c00', '#ff4d4d', '#cc00ff', '#4d4dff', '#00f2fe', '#4facfe'];
  const sliceColors = colors.slice(0, topCount);

  if (otherArtists.length > 0) {
    labels.push('Другие');
    const otherDurationMin = otherArtists.reduce((sum, a) => sum + Math.round(a.duration / 60), 0);
    data.push(otherDurationMin);
    sliceColors.push('rgba(255,255,255,0.15)');
  }

  artistsChartInstance = new Chart(ctxArtists, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: sliceColors,
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (context) => ` ${context.label}: ${context.raw} мин.`
          }
        }
      }
    }
  });
}

function renderTracksTab(container, stats) {
  let cardsHtml = '';
  stats.topTracks.slice(0, 10).forEach((t, i) => {
    const title = t.track ? t.track.title : 'Неизвестно';
    let coverUrl = t.track && t.track.cover ? t.track.cover : 'https://music.yandex.ru/blocks/playlist-cover/playlist-cover_like.png';
    if (coverUrl && !coverUrl.startsWith('http') && !coverUrl.startsWith('//')) {
      coverUrl = 'https://' + coverUrl;
    }
    const artistName = t.track && t.track.artists && t.track.artists.length > 0 
      ? t.track.artists.map(a => a.name || String(a)).join(', ') 
      : '';
    
    cardsHtml += `
      <div style="display: flex; align-items: center; background: rgba(255,255,255,0.03); border-radius: 12px; padding: 10px; transition: background 0.2s; font-size: 15px;">
        <div style="width: 25px; text-align: center; color: rgba(255,255,255,0.4); font-weight: bold; margin-right: 10px; flex-shrink: 0;">${i+1}</div>
        <img src="${coverUrl}" style="width: 44px; height: 44px; border-radius: 8px; margin-right: 15px; object-fit: cover; flex-shrink: 0;">
        <div style="flex: 1; overflow: hidden; min-width: 0;">
          <div style="font-weight: 500; font-size: 15px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${title}</div>
          <div style="color: rgba(255,255,255,0.5); font-size: 13px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${artistName}</div>
        </div>
        <div style="margin-left: 15px; font-weight: bold; color: #ffdb4d; flex-shrink: 0;">${t.count} <span style="font-size: 12px; font-weight: normal; color: rgba(255,255,255,0.4);">раз</span></div>
      </div>
    `;
  });

  container.innerHTML = `
    <h2 style="font-size: 32px; margin-top: 0; margin-bottom: 20px; flex-shrink: 0;">Топ Треков</h2>
    <div class="ym-wrapped-columns">
      <div class="ym-glass-card" style="flex: 1; padding: 25px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; min-height: 0; padding-right: 5px;">
        ${cardsHtml}
      </div>
      <div class="ym-glass-card" style="flex: 1; padding: 25px; display: flex; flex-direction: column; min-height: 0;">
        <div style="flex: 1; min-height: 0; position: relative;">
          <canvas id="ym-chart-tracks"></canvas>
        </div>
      </div>
    </div>
  `;

  const ctxTracks = document.getElementById('ym-chart-tracks').getContext('2d');
  if (tracksChartInstance) tracksChartInstance.destroy();

  tracksChartInstance = new Chart(ctxTracks, {
    type: 'bar',
    data: {
      labels: stats.topTracks.slice(0, 5).map(t => t.track ? t.track.title.substring(0, 15) + '...' : 'Unknown'),
      datasets: [{
        label: 'Прослушиваний',
        data: stats.topTracks.slice(0, 5).map(t => t.count),
        backgroundColor: 'rgba(255, 219, 77, 0.8)',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderSettingsTab(container) {
  container.innerHTML = `
    <h2 style="font-size: 36px; margin-top: 0;">Данные и Экспорт</h2>
    <div class="ym-glass-card" style="padding: 30px; max-width: 600px;">
      <p style="color: rgba(255,255,255,0.7); margin-bottom: 30px;">
        Вы можете выгрузить всю историю прослушиваний в файл, чтобы перенести её на другой компьютер (например, с работы домой) или просто сохранить для себя.
      </p>
      
      <div style="display: flex; gap: 20px; margin-bottom: 30px;">
        <button id="ym-wrapped-export-btn" style="flex: 1; padding: 15px; border-radius: 12px; border: none; background: #ffdb4d; color: black; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Экспорт в JSON
        </button>
        <button id="ym-wrapped-import-btn" style="flex: 1; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: white; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          Импорт JSON
        </button>
      </div>
      
      <input type="file" id="ym-wrapped-import-file" accept=".json" style="display: none;">
      
      <div id="ym-wrapped-data-status" style="color: #4CAF50; font-weight: 500; min-height: 20px; margin-bottom: 20px;"></div>

      <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
        <button id="ym-wrapped-clear-btn" style="width: 100%; padding: 15px; border-radius: 12px; border: 1px solid #ff4d4d; background: transparent; color: #ff4d4d; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          Очистить всю статистику
        </button>
      </div>
    </div>
  `;

  // Обработчики
  const exportBtn = document.getElementById('ym-wrapped-export-btn');
  const importBtn = document.getElementById('ym-wrapped-import-btn');
  const fileInput = document.getElementById('ym-wrapped-import-file');
  const statusDiv = document.getElementById('ym-wrapped-data-status');
  const clearBtn = document.getElementById('ym-wrapped-clear-btn');

  // Экспорт
  exportBtn.addEventListener('click', async () => {
    exportBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: -2px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Подготовка...';
    try {
      const jsonStr = await window.wrappedDB.exportData();
      
      const isDesktop = typeof window !== 'undefined' && 
        (window.navigator.userAgent.includes('Electron') || 
         (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendState === 'function'));

      const filename = `betteryandexmusic_wrapped_data_${new Date().toISOString().split('T')[0]}.json`;

      if (isDesktop) {
        // На десктопе сохраняем напрямую через Node.js мост, так как обычное скачивание Blobs не работает
        const requestId = `write_file_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        
        const handler = (event) => {
          if (!event.data || !event.data.__ym_sc_bridge_response || event.data.requestId !== requestId) return;
          window.removeEventListener('message', handler);
          
          const response = event.data.response;
          if (response && response.ok) {
            // Если сохранен через диалог, путь может отличаться от Рабочего стола
            const savedFilename = response.filePath ? response.filePath.split(/[/\\]/).pop() : filename;
            statusDiv.innerText = `✅ Успешно экспортировано: ${savedFilename}`;
            statusDiv.style.color = '#4CAF50';
          } else {
            if (response.error === 'Cancelled') {
              statusDiv.innerText = 'Экспорт отменен пользователем.';
              statusDiv.style.color = '#ffdb4d';
            } else {
              statusDiv.innerText = `Ошибка записи файла: ${response.error || 'Unknown error'}`;
              statusDiv.style.color = '#ff4d4d';
            }
          }
          exportBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: -2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Экспорт в JSON';
        };
        
        window.addEventListener('message', handler);
        
        window.postMessage({
          __ym_sc_bridge: true,
          requestId,
          type: 'WRITE_FILE',
          payload: { filename, content: jsonStr }
        }, '*');

      } else {
        // Обычное скачивание для веб-версии
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        statusDiv.innerText = 'Данные успешно экспортированы!';
        statusDiv.style.color = '#4CAF50';
        exportBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: -2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Экспорт в JSON';
      }
    } catch (e) {
      console.error(e);
      statusDiv.innerText = 'Ошибка экспорта данных.';
      statusDiv.style.color = '#ff4d4d';
      exportBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: -2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Экспорт в JSON';
    }
  });

  // Импорт
  importBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    statusDiv.innerText = 'Чтение файла...';
    statusDiv.style.color = 'white';

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        statusDiv.innerText = 'Объединение данных...';
        const res = await window.wrappedDB.importData(event.target.result);
        
        let sourceStr = 'неизвестного источника';
        if (res.source === 'web') sourceStr = 'веб-версии';
        if (res.source === 'desktop') sourceStr = 'десктоп-приложения';
        
        statusDiv.innerText = `Импорт из ${sourceStr} успешно завершен! Добавлено новых записей: ${res.addedCount}.`;
        statusDiv.style.color = '#4CAF50';
        
        // Обновляем графики если нужно
        if (typeof window.renderWrappedCharts === 'function') {
          setTimeout(() => window.renderWrappedCharts(), 2000);
        }
      } catch (err) {
        console.error(err);
        statusDiv.innerText = '❌ Ошибка импорта: ' + err.message;
        statusDiv.style.color = '#ff4d4d';
      }
      fileInput.value = '';
    };
    reader.onerror = () => {
      statusDiv.innerText = 'Ошибка чтения файла.';
      statusDiv.style.color = '#ff4d4d';
    };
    reader.readAsText(file);
  });

  // Очистка данных
  clearBtn.addEventListener('click', async () => {
    const confirmed = confirm('Вы уверены, что хотите полностью стереть локальную статистику? Все прослушивания будут безвозвратно удалены.');
    if (!confirmed) return;

    clearBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: -2px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Очистка...';
    try {
      await window.wrappedDB.clearAllData();
      statusDiv.innerText = 'База данных статистики успешно очищена.';
      statusDiv.style.color = '#ff4d4d';
      
      // Перерисовываем пустую страницу
      if (typeof window.renderWrappedCharts === 'function') {
        setTimeout(() => window.renderWrappedCharts(), 1500);
      }
    } catch(err) {
      console.error(err);
      statusDiv.innerText = 'Ошибка очистки: ' + err.message;
      statusDiv.style.color = '#ff4d4d';
    } finally {
      clearBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; display: inline-block; vertical-align: -2px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>Очистить всю статистику';
    }
  });
}

function renderGenresTab(container, stats) {
  let genresListHtml = '';
  stats.topGenres.slice(0, 5).forEach((g, i) => {
    genresListHtml += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 15px;">
        <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          <span style="color: rgba(255,255,255,0.4); margin-right: 15px; width: 20px; display: inline-block;">${i+1}</span>
          ${g.name}
        </div>
        <div style="color: #ffdb4d; font-weight: bold; flex-shrink: 0; margin-left: 10px;">${g.count} треков</div>
      </div>
    `;
  });

  if (stats.topGenres.length === 0) {
    genresListHtml = '<p style="color: rgba(255,255,255,0.5); font-size: 14px;">Жанры не определены.</p>';
  }

  container.innerHTML = `
    <h2 style="font-size: 32px; margin-top: 0; margin-bottom: 20px; flex-shrink: 0;">Жанры и Эпохи</h2>
    <div class="ym-wrapped-columns" style="flex: 1.2; margin-bottom: 20px;">
      <div class="ym-glass-card" style="flex: 1.2; padding: 20px; display: flex; flex-direction: column; min-height: 0;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; flex-shrink: 0;">Популярные Жанры</h3>
        <div style="flex: 1; min-height: 0; position: relative;">
          <canvas id="ym-chart-genres"></canvas>
        </div>
      </div>
      <div class="ym-glass-card" style="flex: 0.8; padding: 20px; display: flex; flex-direction: column; min-height: 0;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; flex-shrink: 0;">Распределение по Эпохам</h3>
        <div style="flex: 1; min-height: 0; position: relative;">
          <canvas id="ym-chart-eras"></canvas>
        </div>
      </div>
    </div>
    
    <div class="ym-wrapped-columns" style="flex: 0.8; gap: 20px;">
      <div class="ym-glass-card" style="flex: 1.1; padding: 20px; display: flex; flex-direction: column; min-height: 0;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; flex-shrink: 0;">Топ-5 Жанров</h3>
        <div style="flex: 1; overflow-y: auto; min-height: 0; padding-right: 5px;">
          ${genresListHtml}
        </div>
      </div>
      <div style="flex: 0.9; display: flex; flex-direction: column; gap: 20px; min-height: 0;">
        <div class="ym-glass-card" style="padding: 20px; display: flex; flex-direction: column; justify-content: center; min-height: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
            <div style="flex: 1; min-width: 0;">
              <h3 style="margin: 0; font-size: 16px; color: #ff4d4d; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Индекс Explicit</h3>
              <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.5); font-size: 12px; line-height: 1.3;">Доля треков с нецензурной лексикой</p>
            </div>
            <div style="flex: 1; max-width: 150px; display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
              <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.08); border-radius: 5px; overflow: hidden;">
                <div style="width: ${stats.explicitPercentage}%; height: 100%; background: linear-gradient(90deg, #ff4d4d, #ff2222); border-radius: 5px;"></div>
              </div>
              <div style="font-size: 16px; font-weight: bold; color: #ff4d4d; min-width: 35px; text-align: right;">${stats.explicitPercentage}%</div>
            </div>
          </div>
        </div>
        
        <div class="ym-glass-card" style="padding: 16px 20px; flex: 1; display: flex; align-items: center; gap: 15px; background: ${stats.paletteGradient} !important; border: 1px solid rgba(255,255,255,0.08);">
          <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-palette"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.63-.77 1.63-1.7 0-.45-.18-.85-.46-1.2-.29-.37-.47-.83-.47-1.34 0-1.06.84-1.92 1.88-1.92h1.66c4.58 0 8.3-3.72 8.3-8.3C22 5.56 17.5 2 12 2z"/></svg>
          </div>
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px;">Жанровая палитра</div>
            <div style="font-size: 13px; font-weight: bold; color: white; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${stats.top3Genres.map(g => g.name).join(' • ')}">
              ${stats.top3Genres.map(g => g.name).join(' • ') || 'Не определено'}
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Смесь ваших любимых стилей</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // 1. Отрисовка графика Жанров (Горизонтальный Bar)
  const ctxGenres = document.getElementById('ym-chart-genres').getContext('2d');
  if (genresChartInstance) genresChartInstance.destroy();
  
  genresChartInstance = new Chart(ctxGenres, {
    type: 'bar',
    data: {
      labels: stats.topGenres.slice(0, 5).map(g => g.name),
      datasets: [{
        data: stats.topGenres.slice(0, 5).map(g => g.count),
        backgroundColor: 'rgba(255, 219, 77, 0.85)',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, beginAtZero: true },
        y: { grid: { display: false } }
      }
    }
  });

  // 2. Отрисовка графика Эпох (Doughnut)
  const ctxEras = document.getElementById('ym-chart-eras').getContext('2d');
  if (erasChartInstance) erasChartInstance.destroy();

  const erasLabels = ['2020-е', '2010-е', '2000-е', '90-е', 'Ранее'];
  const erasData = [
    stats.eraCounts['2020s'] || 0,
    stats.eraCounts['2010s'] || 0,
    stats.eraCounts['2000s'] || 0,
    stats.eraCounts['90s'] || 0,
    stats.eraCounts['Earlier'] || 0
  ];
  
  // Отсекаем неиспользуемые эпохи
  const activeLabels = [];
  const activeData = [];
  erasData.forEach((val, index) => {
    if (val > 0) {
      activeLabels.push(erasLabels[index]);
      activeData.push(val);
    }
  });

  erasChartInstance = new Chart(ctxEras, {
    type: 'doughnut',
    data: {
      labels: activeLabels.length > 0 ? activeLabels : ['Нет данных'],
      datasets: [{
        data: activeData.length > 0 ? activeData : [1],
        backgroundColor: activeData.length > 0 ? ['#ffdb4d', '#ff8c00', '#ff4d4d', '#cc00ff', '#4d4dff'] : ['rgba(255,255,255,0.05)'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function renderActivityTab(container, stats) {
  container.innerHTML = `
    <h2 style="font-size: 32px; margin-top: 0; margin-bottom: 20px; flex-shrink: 0;">Активность</h2>
    <div style="display: flex; flex-direction: column; gap: 20px; flex: 1; min-height: 0;">
      <div class="ym-glass-card" style="flex: 1.1; min-height: 0; display: flex; flex-direction: column; padding: 20px;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; flex-shrink: 0;">Прослушивания по времени суток</h3>
        <div style="flex: 1; min-height: 0; position: relative;">
          <canvas id="ym-chart-hours"></canvas>
        </div>
      </div>
      <div class="ym-glass-card" style="flex: 0.9; min-height: 0; display: flex; flex-direction: column; padding: 20px;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; flex-shrink: 0;">Активность по дням недели</h3>
        <div style="flex: 1; min-height: 0; position: relative;">
          <canvas id="ym-chart-days"></canvas>
        </div>
      </div>
    </div>
  `;

  // 1. График по часам (Area Chart / Line)
  const ctxHours = document.getElementById('ym-chart-hours').getContext('2d');
  if (hoursChartInstance) hoursChartInstance.destroy();

  const gradient = ctxHours.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(255, 219, 77, 0.45)');
  gradient.addColorStop(1, 'rgba(255, 219, 77, 0.0)');

  hoursChartInstance = new Chart(ctxHours, {
    type: 'line',
    data: {
      labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
      datasets: [{
        label: 'Прослушивания',
        data: stats.hourlyListens,
        borderColor: '#ffdb4d',
        borderWidth: 3,
        fill: true,
        backgroundColor: gradient,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' } },
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });

  // 2. График по дням недели (Bar Chart)
  const ctxDays = document.getElementById('ym-chart-days').getContext('2d');
  if (daysChartInstance) daysChartInstance.destroy();

  const orderedDaysLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const orderedDaysData = [
    stats.weeklyListens[1] || 0, // Пн
    stats.weeklyListens[2] || 0, // Вт
    stats.weeklyListens[3] || 0, // Ср
    stats.weeklyListens[4] || 0, // Чт
    stats.weeklyListens[5] || 0, // Пт
    stats.weeklyListens[6] || 0, // Сб
    stats.weeklyListens[0] || 0  // Вс
  ];

  daysChartInstance = new Chart(ctxDays, {
    type: 'bar',
    data: {
      labels: orderedDaysLabels,
      datasets: [{
        data: orderedDaysData,
        backgroundColor: 'rgba(255, 140, 0, 0.85)',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderCalendarTab(container, stats) {
  try {
    // 1. Построение GitHub-style Heatmap прослушиваний по дням
    const today = new Date();
    const endDate = new Date(today);
    const dayOfWeek = endDate.getDay(); // 0 = Sun, 6 = Sat
    // Сдвигаем endDate на конец текущей недели (суббота), чтобы сетка была ровной
    endDate.setDate(endDate.getDate() + (6 - dayOfWeek));
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 370); // 53 недели назад (53 * 7 = 371 день)

    const weeks = [];
    let currentWeek = [];
    
    let curr = new Date(startDate);
    // Накапливаем список месяцев и индекс колонки, в которой этот месяц начинается
    const monthLabels = []; // { name, colIndex }
    let lastMonth = -1;
    let colIndex = 0;

    while (curr <= endDate) {
      // Вычисляем dateStr ВСЕГДА в локальном часовом поясе, чтобы синхронизировать с wrapped-db.js
      const dateStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;

      const durationSec = stats.dailyListensDuration ? (stats.dailyListensDuration[dateStr] || 0) : 0;
      const durationMin = Math.round(durationSec / 60);
      
      currentWeek.push({
        dateStr,
        date: new Date(curr),
        durationMin
      });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        // Проверяем месяц первого дня в новой неделе
        const m = curr.getMonth();
        if (m !== lastMonth) {
          monthLabels.push({
            name: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'][m],
            colIndex: colIndex
          });
          lastMonth = m;
        }
        currentWeek = [];
        colIndex++;
      }
      
      curr.setDate(curr.getDate() + 1);
    }

    // Рендерим HTML для Heatmap с использованием единого CSS Grid для полной отзывчивости
    let cellsHtml = '';
    
    // 1. Добавляем подписи дней недели в 1-ю колонку
    cellsHtml += `<div style="grid-column: 1; grid-row: 2; font-size: 9px; color: rgba(255,255,255,0.3); align-self: center; padding-right: 8px; user-select: none;">Вс</div>`;
    cellsHtml += `<div style="grid-column: 1; grid-row: 4; font-size: 9px; color: rgba(255,255,255,0.3); align-self: center; padding-right: 8px; user-select: none;">Вт</div>`;
    cellsHtml += `<div style="grid-column: 1; grid-row: 6; font-size: 9px; color: rgba(255,255,255,0.3); align-self: center; padding-right: 8px; user-select: none;">Чт</div>`;
    cellsHtml += `<div style="grid-column: 1; grid-row: 8; font-size: 9px; color: rgba(255,255,255,0.3); align-self: center; padding-right: 8px; user-select: none;">Сб</div>`;

    // 2. Добавляем названия месяцев в 1-ю строчку
    monthLabels.forEach(ml => {
      cellsHtml += `
        <div style="grid-column: ${ml.colIndex + 2}; grid-row: 1; font-size: 9px; color: rgba(255,255,255,0.3); text-align: left; overflow: visible; white-space: nowrap; user-select: none; margin-bottom: 5px; width: 0; min-width: 0;">
          ${ml.name}
        </div>
      `;
    });

    // 3. Добавляем сами ячейки дней
    weeks.forEach((week, colIdx) => {
      week.forEach((day, dayIdx) => {
        if (!day) return;
        
        let bgColor = 'rgba(255, 255, 255, 0.04)';
        let borderStyle = '1px solid rgba(255, 255, 255, 0.02)';
        if (day.durationMin > 0 && day.durationMin <= 10) {
          bgColor = 'rgba(204, 0, 255, 0.2)';
        } else if (day.durationMin > 10 && day.durationMin <= 30) {
          bgColor = 'rgba(204, 0, 255, 0.55)';
        } else if (day.durationMin > 30 && day.durationMin <= 60) {
          bgColor = 'rgba(255, 140, 0, 0.6)';
        } else if (day.durationMin > 60) {
          bgColor = '#ff8c00';
        }
        
        const tracksCount = stats.dailyListens ? (stats.dailyListens[day.dateStr] || 0) : 0;
        const topTrack = stats.dailyTopTrack ? stats.dailyTopTrack[day.dateStr] : null;
        
        const monthsNamesRU_lower = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        const formatStr = `${day.date.getDate()} ${monthsNamesRU_lower[day.date.getMonth()]} ${day.date.getFullYear()}`;
        
        let tooltip = `${formatStr}\n• ${day.durationMin} мин. музыки\n• ${tracksCount} треков`;
        if (topTrack) {
          tooltip += `\n• Топ: ${topTrack.title} — ${topTrack.artist}`;
        }
        
        cellsHtml += `
          <div 
            class="ym-heatmap-cell"
            style="grid-column: ${colIdx + 2}; grid-row: ${dayIdx + 2}; width: 100%; aspect-ratio: 1; border-radius: 2px; background: ${bgColor}; border: ${borderStyle}; cursor: pointer; box-sizing: border-box;" 
            data-tooltip="${tooltip.replace(/"/g, '&quot;')}">
          </div>
        `;
      });
    });

    const heatmapCardHtml = `
      <div class="ym-glass-card" style="padding: 20px; margin-bottom: 25px; display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: rgba(255,255,255,0.8); font-weight: bold;">Карта активности (минут прослушивания)</h3>
        <div style="overflow-x: auto; padding-bottom: 10px; width: 100%; box-sizing: border-box;">
          <div style="display: grid; grid-template-columns: auto repeat(53, 1fr); grid-template-rows: auto repeat(7, 1fr); gap: 3px; width: 100%; min-width: 650px; align-items: center; box-sizing: border-box;">
            ${cellsHtml}
          </div>
        </div>
        
        <!-- Легенда -->
        <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 10px; font-size: 11px; color: rgba(255,255,255,0.4); user-select: none;">
          <span>Меньше</span>
          <div style="display: flex; gap: 3px; margin: 0 8px;">
            <div style="width: 10px; height: 10px; border-radius: 2px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.02);"></div>
            <div style="width: 10px; height: 10px; border-radius: 2px; background: rgba(204, 0, 255, 0.2);"></div>
            <div style="width: 10px; height: 10px; border-radius: 2px; background: rgba(204, 0, 255, 0.55);"></div>
            <div style="width: 10px; height: 10px; border-radius: 2px; background: rgba(255, 140, 0, 0.6);"></div>
            <div style="width: 10px; height: 10px; border-radius: 2px; background: #ff8c00;"></div>
          </div>
          <span>Больше</span>
        </div>
      </div>
    `;

  // 2. Построение сетки треков по месяцам
  const monthNamesRU = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  let gridHtml = '';

  for (let m = 0; m < 12; m++) {
    const trackInfo = stats.monthlyTopTracks[m];
    
    if (trackInfo) {
      gridHtml += `
        <div class="ym-glass-card" style="padding: 15px; display: flex; align-items: center; gap: 12px; min-width: 0; box-sizing: border-box;">
          <img src="${trackInfo.cover}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px;">${monthNamesRU[m]}</div>
            <div style="font-size: 13px; font-weight: bold; color: white; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${trackInfo.title}">${trackInfo.title}</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${trackInfo.artist}">${trackInfo.artist}</div>
          </div>
          <div style="font-size: 11px; color: #ffdb4d; font-weight: bold; flex-shrink: 0; margin-left: 5px; text-align: right;">
            ${trackInfo.count} <span style="font-size: 9px; font-weight: normal; color: rgba(255,255,255,0.4); display: block;">прослуш.</span>
          </div>
        </div>
      `;
    } else {
      gridHtml += `
        <div class="ym-glass-card" style="padding: 15px; display: flex; align-items: center; gap: 12px; min-width: 0; box-sizing: border-box; opacity: 0.5;">
          <div style="width: 50px; height: 50px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; color: rgba(255,255,255,0.2);">?</div>
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 10px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.5px;">${monthNamesRU[m]}</div>
            <div style="font-size: 13px; color: rgba(255,255,255,0.3); margin-top: 2px; font-style: italic;">Нет данных</div>
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = `
    <h2 style="font-size: 32px; margin-top: 0; margin-bottom: 20px; flex-shrink: 0;">Музыкальный Календарь</h2>
    <div style="flex: 1; min-height: 0; display: flex; flex-direction: column; overflow-y: auto; padding-right: 5px;">
      ${heatmapCardHtml}
      
      <h3 style="margin: 0 0 15px 0; font-size: 16px; color: rgba(255,255,255,0.8); font-weight: bold; flex-shrink: 0;">Главные треки по месяцам</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 15px; padding-bottom: 20px; flex-shrink: 0;">
        ${gridHtml}
      </div>
    </div>
  `;
  } catch (err) {
    console.error("Ошибка рендеринга календаря:", err);
    container.innerHTML = `<div style="color:red; padding: 20px;">Ошибка рендеринга календаря: ${err.message}</div>`;
  }
}

// Экспорт (обновление) функции рендера в window
if (typeof window !== 'undefined') {
  window.renderWrappedCharts = renderWrappedCharts;
}

// Инициализация кастомного красивого тултипа через делегирование событий
if (typeof window !== 'undefined') {
  let tooltipDiv = document.getElementById('ym-heatmap-tooltip');
  if (!tooltipDiv) {
    tooltipDiv = document.createElement('div');
    tooltipDiv.id = 'ym-heatmap-tooltip';
    tooltipDiv.style.cssText = `
      position: fixed;
      display: none;
      background: rgba(28, 28, 30, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
      color: white;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 9999999;
      pointer-events: none;
      max-width: 250px;
      line-height: 1.5;
      font-family: "YS Text", sans-serif;
      transition: opacity 0.1s ease, transform 0.1s ease;
      opacity: 0;
      transform: scale(0.95);
    `;
    document.body.appendChild(tooltipDiv);
  }

  // Делегирование событий мыши для ячеек активности
  document.addEventListener('mouseover', (e) => {
    const cell = e.target.closest('.ym-heatmap-cell');
    if (cell) {
      showHeatmapTooltip(e, cell);
    }
  });

  document.addEventListener('mousemove', (e) => {
    const cell = e.target.closest('.ym-heatmap-cell');
    if (cell) {
      moveHeatmapTooltip(e);
    }
  });

  document.addEventListener('mouseout', (e) => {
    const cell = e.target.closest('.ym-heatmap-cell');
    if (cell) {
      hideHeatmapTooltip();
    }
  });

  function showHeatmapTooltip(e, cellElement) {
    const text = cellElement.getAttribute('data-tooltip');
    if (!text) return;
    
    const html = text.split('\n').map((line, idx) => {
      if (idx === 0) {
        return `<div style="font-weight: bold; margin-bottom: 5px; color: white; font-size: 13px;">${line}</div>`;
      }
      if (line.startsWith('• Топ:')) {
        return `<div style="color: #ffdb4d; margin-top: 3px; font-weight: bold;">${line}</div>`;
      }
      return `<div style="color: rgba(255,255,255,0.7);">${line}</div>`;
    }).join('');
    
    tooltipDiv.innerHTML = html;
    tooltipDiv.style.display = 'block';
    
    // Принудительный reflow
    void tooltipDiv.offsetWidth;
    tooltipDiv.style.opacity = '1';
    tooltipDiv.style.transform = 'scale(1)';
    
    moveHeatmapTooltip(e);
  }

  function moveHeatmapTooltip(e) {
    const x = e.clientX;
    const y = e.clientY;
    
    const tooltipWidth = tooltipDiv.offsetWidth;
    const tooltipHeight = tooltipDiv.offsetHeight;
    
    let left = x + 15;
    let top = y - tooltipHeight - 15;
    
    if (left + tooltipWidth > window.innerWidth) {
      left = x - tooltipWidth - 15;
    }
    if (top < 10) {
      top = y + 20;
    }
    
    tooltipDiv.style.left = left + 'px';
    tooltipDiv.style.top = top + 'px';
  }

  function hideHeatmapTooltip() {
    tooltipDiv.style.opacity = '0';
    tooltipDiv.style.transform = 'scale(0.95)';
    setTimeout(() => {
      if (tooltipDiv.style.opacity === '0') {
        tooltipDiv.style.display = 'none';
      }
    }, 100);
  }
}
