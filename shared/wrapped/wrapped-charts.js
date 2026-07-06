// ==========================================
// WRAPPED CHARTS (Отрисовка статистики)
// ==========================================

let artistsChartInstance = null;
let tracksChartInstance = null;
let monthsChartInstance = null;

async function renderWrappedCharts() {
  const containerOverview = document.getElementById('ym-wrapped-tab-overview');
  const containerArtists = document.getElementById('ym-wrapped-tab-artists');
  const containerTracks = document.getElementById('ym-wrapped-tab-tracks');
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
      renderSettingsTab(containerSettings);
      return;
    }

    // Общие настройки Chart.js для темной темы
    Chart.defaults.color = 'rgba(255, 255, 255, 0.6)';
    Chart.defaults.font.family = '"YS Text", sans-serif';

    // Рендер Обзора
    renderOverviewTab(containerOverview, stats);
    
    // Рендер Артистов
    renderArtistsTab(containerArtists, stats);
    
    // Рендер Треков
    renderTracksTab(containerTracks, stats);
    
    // Рендер Настроек (Экспорт/Импорт)
    renderSettingsTab(containerSettings);

  } catch (err) {
    console.error('Ошибка рендеринга графиков:', err);
    containerOverview.innerHTML = '<div style="color:red;">Ошибка при загрузке статистики.</div>';
  }
}

function renderOverviewTab(container, stats) {
  container.innerHTML = `
    <h2 style="font-size: 36px; margin-top: 0;">Обзор</h2>
    <div style="display: flex; gap: 30px; margin-bottom: 40px;">
      <div style="flex: 1; background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px; text-align: center;">
        <div style="font-size: 48px; font-weight: bold; color: #ffdb4d;">${stats.totalListens}</div>
        <div style="font-size: 16px; color: rgba(255,255,255,0.6); text-transform: uppercase;">Треков прослушано</div>
      </div>
      <div style="flex: 1; background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px; text-align: center;">
        <div style="font-size: 48px; font-weight: bold; color: #ff8c00;">${stats.totalHours}</div>
        <div style="font-size: 16px; color: rgba(255,255,255,0.6); text-transform: uppercase;">Часов музыки</div>
      </div>
    </div>
    
    <div style="background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px;">
      <h3 style="margin-top: 0; color: rgba(255,255,255,0.8);">Активность по месяцам</h3>
      <canvas id="ym-chart-months" height="100"></canvas>
    </div>
  `;

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
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderArtistsTab(container, stats) {
  let listHtml = '';
  stats.topArtists.forEach((a, i) => {
    const min = Math.round(a.duration / 60);
    listHtml += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="font-size: 18px;">
          <span style="color: rgba(255,255,255,0.4); margin-right: 15px; width: 20px; display: inline-block;">${i+1}.</span>
          ${a.artist ? a.artist.name : 'Неизвестный'}
        </div>
        <div style="color: #ffdb4d; font-weight: bold;">${min} мин.</div>
      </div>
    `;
  });

  container.innerHTML = `
    <h2 style="font-size: 36px; margin-top: 0;">Топ Артистов</h2>
    <div style="display: flex; gap: 40px;">
      <div style="flex: 1; background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px;">
        <canvas id="ym-chart-artists" height="250"></canvas>
      </div>
      <div style="flex: 1; background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px;">
        <h3 style="margin-top: 0;">Лидеры по времени</h3>
        ${listHtml}
      </div>
    </div>
  `;

  const ctxArtists = document.getElementById('ym-chart-artists').getContext('2d');
  if (artistsChartInstance) artistsChartInstance.destroy();
  
  artistsChartInstance = new Chart(ctxArtists, {
    type: 'doughnut',
    data: {
      labels: stats.topArtists.map(a => a.artist ? a.artist.name : 'Неизвестно'),
      datasets: [{
        data: stats.topArtists.map(a => Math.round(a.duration / 60)),
        backgroundColor: ['#ffdb4d', '#ff8c00', '#ff4d4d', '#cc00ff', '#4d4dff'],
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
    const artistName = t.track && t.track.artists && t.track.artists.length > 0 ? (t.track.artists[0].name || t.track.artists[0]) : '';
    
    cardsHtml += `
      <div style="display: flex; align-items: center; background: rgba(255,255,255,0.03); border-radius: 12px; padding: 10px; transition: background 0.2s;">
        <div style="width: 30px; text-align: center; color: rgba(255,255,255,0.4); font-weight: bold; margin-right: 10px;">${i+1}</div>
        <img src="${coverUrl}" style="width: 50px; height: 50px; border-radius: 8px; margin-right: 15px; object-fit: cover;">
        <div style="flex: 1; overflow: hidden;">
          <div style="font-weight: 500; font-size: 16px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${title}</div>
          <div style="color: rgba(255,255,255,0.5); font-size: 14px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${artistName}</div>
        </div>
        <div style="margin-left: 15px; font-weight: bold; color: #ffdb4d;">${t.count} <span style="font-size: 12px; font-weight: normal; color: rgba(255,255,255,0.4);">раз</span></div>
      </div>
    `;
  });

  container.innerHTML = `
    <h2 style="font-size: 36px; margin-top: 0;">Топ Треков</h2>
    <div style="display: flex; gap: 40px;">
      <div style="flex: 1; background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px; display: flex; flex-direction: column; gap: 10px; max-height: 70vh; overflow-y: auto;">
        ${cardsHtml}
      </div>
      <div style="flex: 1; background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px;">
        <canvas id="ym-chart-tracks" height="250"></canvas>
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
    <div style="background: rgba(0,0,0,0.2); border-radius: 16px; padding: 30px; max-width: 600px;">
      <p style="color: rgba(255,255,255,0.7); margin-bottom: 30px;">
        Вы можете выгрузить всю историю прослушиваний в файл, чтобы перенести её на другой компьютер (например, с работы домой) или просто сохранить для себя.
      </p>
      
      <div style="display: flex; gap: 20px; margin-bottom: 30px;">
        <button id="ym-wrapped-export-btn" style="flex: 1; padding: 15px; border-radius: 12px; border: none; background: #ffdb4d; color: black; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s;">
          📥 Экспорт в JSON
        </button>
        <button id="ym-wrapped-import-btn" style="flex: 1; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: white; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s;">
          📤 Импорт JSON
        </button>
      </div>
      
      <input type="file" id="ym-wrapped-import-file" accept=".json" style="display: none;">
      
      <div id="ym-wrapped-data-status" style="color: #4CAF50; font-weight: 500; min-height: 20px;"></div>
    </div>
  `;

  // Обработчики
  const exportBtn = document.getElementById('ym-wrapped-export-btn');
  const importBtn = document.getElementById('ym-wrapped-import-btn');
  const fileInput = document.getElementById('ym-wrapped-import-file');
  const statusDiv = document.getElementById('ym-wrapped-data-status');

  // Экспорт
  exportBtn.addEventListener('click', async () => {
    exportBtn.innerText = '⏳ Подготовка...';
    try {
      const jsonStr = await window.wrappedDB.exportData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `betteryandexmusic_wrapped_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      statusDiv.innerText = '✅ Данные успешно экспортированы!';
      statusDiv.style.color = '#4CAF50';
    } catch (e) {
      console.error(e);
      statusDiv.innerText = '❌ Ошибка экспорта данных.';
      statusDiv.style.color = '#ff4d4d';
    } finally {
      exportBtn.innerText = '📥 Экспорт в JSON';
    }
  });

  // Импорт
  importBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    statusDiv.innerText = '⏳ Чтение файла...';
    statusDiv.style.color = 'white';

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        statusDiv.innerText = '⏳ Объединение данных...';
        const res = await window.wrappedDB.importData(event.target.result);
        statusDiv.innerText = `✅ Импорт завершен! Добавлено новых записей: ${res.addedCount}.`;
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
      statusDiv.innerText = '❌ Ошибка чтения файла.';
      statusDiv.style.color = '#ff4d4d';
    };
    reader.readAsText(file);
  });
}

// Экспорт (обновление) функции рендера в window
if (typeof window !== 'undefined') {
  window.renderWrappedCharts = renderWrappedCharts;
}
