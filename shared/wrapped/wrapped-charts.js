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
    
    <div class="ym-glass-card" style="flex: 1; min-height: 0; padding: 25px; display: flex; flex-direction: column;">
      <h3 style="margin-top: 0; margin-bottom: 15px; color: rgba(255,255,255,0.8); flex-shrink: 0;">Активность по месяцам</h3>
      <div style="flex: 1; min-height: 0; position: relative;">
        <canvas id="ym-chart-months"></canvas>
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
  monthsChartInstance = new Chart(ctxMonths, {
    type: 'line',
    data: {
      labels: monthNames,
      datasets: [{
        label: 'Треков',
        data: stats.listensByMonth,
        borderColor: '#ff8c00',
        backgroundColor: 'rgba(255, 140, 0, 0.2)',
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
    
    <div class="ym-wrapped-columns" style="flex: 0.8;">
      <div class="ym-glass-card" style="flex: 1; padding: 20px; display: flex; flex-direction: column; min-height: 0;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; flex-shrink: 0;">Топ-5 Жанров</h3>
        <div style="flex: 1; overflow-y: auto; min-height: 0; padding-right: 5px;">
          ${genresListHtml}
        </div>
      </div>
      <div class="ym-glass-card" style="flex: 1; padding: 20px; display: flex; flex-direction: column; justify-content: center; min-height: 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
          <div style="flex: 1; min-width: 0;">
            <h3 style="margin: 0; font-size: 18px; color: #ff4d4d; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Индекс Explicit</h3>
            <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.5); font-size: 13px; line-height: 1.3;">Доля треков с нецензурной лексикой или контентом 18+</p>
          </div>
          <div style="flex: 1; max-width: 200px; display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
            <div style="flex: 1; height: 10px; background: rgba(255,255,255,0.08); border-radius: 5px; overflow: hidden;">
              <div style="width: ${stats.explicitPercentage}%; height: 100%; background: linear-gradient(90deg, #ff4d4d, #ff2222); border-radius: 5px;"></div>
            </div>
            <div style="font-size: 18px; font-weight: bold; color: #ff4d4d; min-width: 45px; text-align: right;">${stats.explicitPercentage}%</div>
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

// Экспорт (обновление) функции рендера в window
if (typeof window !== 'undefined') {
  window.renderWrappedCharts = renderWrappedCharts;
}
