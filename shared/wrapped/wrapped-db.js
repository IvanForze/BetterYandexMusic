// ==========================================
// WRAPPED DATABASE (IndexedDB)
// ==========================================

const DB_NAME = 'BetterYandexMusic_WrappedDB';
const DB_VERSION = 1;

class WrappedDB {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Таблица прослушиваний (история)
        if (!db.objectStoreNames.contains('listens')) {
          const listensStore = db.createObjectStore('listens', { keyPath: 'id', autoIncrement: true });
          listensStore.createIndex('trackId', 'trackId', { unique: false });
          listensStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Таблица треков (метаданные)
        if (!db.objectStoreNames.contains('tracks')) {
          const tracksStore = db.createObjectStore('tracks', { keyPath: 'id' });
          tracksStore.createIndex('title', 'title', { unique: false });
        }
        
        // Таблица артистов (метаданные)
        if (!db.objectStoreNames.contains('artists')) {
          const artistsStore = db.createObjectStore('artists', { keyPath: 'id' });
          artistsStore.createIndex('name', 'name', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event) => {
        console.error('WrappedDB Init Error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async addListen(trackData) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readwrite');
      const listensStore = transaction.objectStore('listens');
      const tracksStore = transaction.objectStore('tracks');
      const artistsStore = transaction.objectStore('artists');

      const trackId = String(trackData.id);

      // 1. Сохраняем/обновляем метаданные трека слиянием с существующими полями
      const trackGetReq = tracksStore.get(trackId);
      trackGetReq.onsuccess = (event) => {
        const existingTrack = event.target.result;
        
        const mergedTrack = {
          id: trackId,
          title: trackData.title || (existingTrack ? existingTrack.title : ''),
          cover: trackData.cover || (existingTrack ? existingTrack.cover : null),
          duration: trackData.duration || (existingTrack ? existingTrack.duration : 0),
          artists: trackData.artists ? trackData.artists.map(a => String(a.id)) : (existingTrack ? existingTrack.artists : []),
          genre: trackData.genre || (existingTrack ? existingTrack.genre : null),
          year: trackData.year || (existingTrack ? existingTrack.year : null),
          explicit: trackData.explicit !== undefined ? !!trackData.explicit : (existingTrack ? !!existingTrack.explicit : false)
        };

        // Если в базе уже была обложка, жанр или год, а в новом прослушивании их нет — сохраняем старые
        if (existingTrack) {
          if (!mergedTrack.cover && existingTrack.cover) mergedTrack.cover = existingTrack.cover;
          if (!mergedTrack.genre && existingTrack.genre) mergedTrack.genre = existingTrack.genre;
          if (!mergedTrack.year && existingTrack.year) mergedTrack.year = existingTrack.year;
        }

        tracksStore.put(mergedTrack);
      };

      // 2. Сохраняем/обновляем метаданные артистов слиянием обложек
      if (trackData.artists && Array.isArray(trackData.artists)) {
        trackData.artists.forEach(artist => {
          const artistId = String(artist.id);
          const artistGetReq = artistsStore.get(artistId);
          artistGetReq.onsuccess = (event) => {
            const existingArtist = event.target.result;
            
            const mergedArtist = {
              id: artistId,
              name: artist.name || (existingArtist ? existingArtist.name : ''),
              cover: artist.cover || (existingArtist ? existingArtist.cover : '')
            };

            // Если обложка уже есть в БД, а сейчас пришла пустая — сохраняем ту, что в БД
            if (existingArtist && !mergedArtist.cover && existingArtist.cover) {
              mergedArtist.cover = existingArtist.cover;
            }

            artistsStore.put(mergedArtist);
          };
        });
      }

      // 3. Добавляем запись о прослушивании
      const listenRecord = {
        trackId: trackId,
        timestamp: Date.now(),
        durationListened: trackData.duration // Считаем полный трек для статистики
      };
      
      const request = listensStore.add(listenRecord);
 
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // Получить всю статистику (агрегация)
  async getStats() {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readonly');
      const listensStore = transaction.objectStore('listens');
      const tracksStore = transaction.objectStore('tracks');
      const artistsStore = transaction.objectStore('artists');

      const listens = [];
      const tracks = new Map();
      const artists = new Map();

      // Сбор всех данных
      listensStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          listens.push(cursor.value);
          cursor.continue();
        } else {
          // Загрузка метаданных треков
          tracksStore.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              tracks.set(String(cursor.value.id), cursor.value);
              cursor.continue();
            } else {
              // Загрузка метаданных артистов
              artistsStore.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                  artists.set(String(cursor.value.id), cursor.value);
                  cursor.continue();
                } else {
                  resolve(this.aggregateStats(listens, tracks, artists));
                }
              };
            }
          };
        }
      };
    });
  }

  aggregateStats(listens, tracksMap, artistsMap) {
    const totalListens = listens.length;
    let totalDurationSec = 0;
    
    const trackCounts = {};
    const artistCounts = {};
    const artistDuration = {}; // Время прослушивания артиста (в сек)
    const genreCounts = {};
    
    const listensByMonth = new Array(12).fill(0);
    const hourlyListens = new Array(24).fill(0);
    const weeklyListens = new Array(7).fill(0); // 0 = Воскресенье, 1 = Понедельник, и т.д.
    
    const eraCounts = {
      '2020s': 0,
      '2010s': 0,
      '2000s': 0,
      '90s': 0,
      'Earlier': 0
    };
    let explicitCount = 0;

    // Вспомогательные хранилища для новых фич
    const monthlyTrackCounts = Array.from({ length: 12 }, () => ({}));
    const dailyListens = {};
    const dailyListensDuration = {};
    const dailyTrackCounts = {};
    const slotCounts = {};
    let weekdayListensCount = 0;
    let weekendListensCount = 0;

    for (const listen of listens) {
      const track = tracksMap.get(String(listen.trackId));
      if (!track) continue;

      totalDurationSec += track.duration || 0;

      // Топ треков
      const strTrackId = String(listen.trackId);
      trackCounts[strTrackId] = (trackCounts[strTrackId] || 0) + 1;

      // Топ артистов
      if (track.artists) {
        track.artists.forEach(artistId => {
          const strArtistId = String(artistId);
          artistCounts[strArtistId] = (artistCounts[strArtistId] || 0) + 1;
          artistDuration[strArtistId] = (artistDuration[strArtistId] || 0) + (track.duration || 0);
        });
      }

      // Топ жанров
      if (track.genre) {
        const genre = track.genre;
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      }

      // Распределение по эпохам
      if (track.year) {
        const year = Number(track.year);
        if (year >= 2020) eraCounts['2020s']++;
        else if (year >= 2010) eraCounts['2010s']++;
        else if (year >= 2000) eraCounts['2000s']++;
        else if (year >= 1990) eraCounts['90s']++;
        else eraCounts['Earlier']++;
      }

      // Explicit контент
      if (track.explicit) {
        explicitCount++;
      }

      // Дата прослушивания
      const listenDate = new Date(listen.timestamp);
      
      // Активность по месяцам
      const month = listenDate.getMonth();
      listensByMonth[month]++;

      // Собираем популярные треки по месяцам
      monthlyTrackCounts[month][strTrackId] = (monthlyTrackCounts[month][strTrackId] || 0) + 1;

      // Активность по часам
      const hour = listenDate.getHours();
      hourlyListens[hour]++;

      // Активность по дням недели
      const day = listenDate.getDay();
      weeklyListens[day]++;

      // Будни vs Выходные
      if (day === 0 || day === 6) {
        weekendListensCount++;
      } else {
        weekdayListensCount++;
      }

      // Прослушивания по дням (всегда в локальном часовом поясе)
      const dateStr = `${listenDate.getFullYear()}-${String(listenDate.getMonth() + 1).padStart(2, '0')}-${String(listenDate.getDate()).padStart(2, '0')}`;
      dailyListens[dateStr] = (dailyListens[dateStr] || 0) + 1;
      
      const listenDur = listen.durationListened || track.duration || 0;
      dailyListensDuration[dateStr] = (dailyListensDuration[dateStr] || 0) + listenDur;

      if (!dailyTrackCounts[dateStr]) {
        dailyTrackCounts[dateStr] = {};
      }
      dailyTrackCounts[dateStr][strTrackId] = (dailyTrackCounts[dateStr][strTrackId] || 0) + 1;

      // Слот активности (день_час)
      const slotKey = `${day}_${hour}`;
      slotCounts[slotKey] = (slotCounts[slotKey] || 0) + 1;
    }

    const topTracks = Object.entries(trackCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => {
        const rawTrack = tracksMap.get(String(id));
        if (!rawTrack) return { track: null, count };
        
        // Клонируем объект трека, чтобы избежать мутации в tracksMap
        const track = { ...rawTrack };
        if (track && Array.isArray(track.artists)) {
          // Разрешаем ID артистов в полноценные объекты с именами и обложками
          track.artists = track.artists.map(artistId => {
            const artistObj = artistsMap.get(String(artistId));
            return {
              id: String(artistId),
              name: artistObj ? artistObj.name : 'Неизвестный исполнитель',
              cover: artistObj ? artistObj.cover : ''
            };
          });
        }
        return { track, count };
      });

    const topArtists = Object.entries(artistDuration) // Сортируем по времени прослушивания
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, duration]) => ({ 
        artist: artistsMap.get(String(id)), 
        duration,
        count: artistCounts[id]
      }));

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const explicitPercentage = totalListens > 0 ? Math.round((explicitCount / totalListens) * 100) : 0;

    // 1. Вычисление Музыкального психотипа
    const topArtistDurationSec = topArtists[0] ? topArtists[0].duration : 0;
    const topArtistPercent = totalDurationSec > 0 ? (topArtistDurationSec / totalDurationSec) * 100 : 0;
    
    const totalEraCount = Object.values(eraCounts).reduce((a, b) => a + b, 0);
    const olderEraCount = (eraCounts['2000s'] || 0) + (eraCounts['90s'] || 0) + (eraCounts['Earlier'] || 0);
    const olderEraPercent = totalEraCount > 0 ? (olderEraCount / totalEraCount) * 100 : 0;
    
    const uniqueArtistsCount = Object.keys(artistCounts).length;
    const explorerRatio = totalListens > 0 ? uniqueArtistsCount / totalListens : 0;
    
    const peakHour = hourlyListens.indexOf(Math.max(...hourlyListens));

    let personaName = 'Меломан';
    let personaDescription = 'Вы любите самую разную музыку и находите идеальный баланс во всех жанрах и эпохах.';
    if (olderEraPercent > 30) {
      personaName = 'Путешественник во времени';
      personaDescription = 'Ваше сердце бьется под ритмы прошлых десятилетий. Вы цените классику и проверенные временем хиты.';
    } else if (topArtistPercent > 25) {
      personaName = 'Преданный фанат';
      const artistName = topArtists[0]?.artist?.name || 'своего любимого артиста';
      personaDescription = `Вы невероятно верны своему вкусу. Ваше прослушивание во многом крутится вокруг творчества ${artistName}.`;
    } else if (explorerRatio > 0.5) {
      personaName = 'Первооткрыватель';
      personaDescription = 'Вы постоянно ищете новое звучание. Ваша фонотека полна уникальных имен, а знакомые треки редко повторяются.';
    } else if (peakHour >= 0 && peakHour < 6) {
      personaName = 'Ночная сова';
      personaDescription = 'Для вас музыка — лучший спутник под покровом ночи. Вы часто слушаете треки, когда весь остальной мир спит.';
    } else if (peakHour >= 6 && peakHour < 12) {
      personaName = 'Ранняя пташка';
      personaDescription = 'Музыка заряжает вас энергией на весь день. Вы предпочитаете слушать любимые плейлисты в утренние часы.';
    }
    const listeningPersona = { name: personaName, description: personaDescription };

    // 2. Вычисление Музыкального календаря по месяцам
    const monthlyTopTracks = new Array(12).fill(null);
    for (let m = 0; m < 12; m++) {
      const counts = monthlyTrackCounts[m];
      const entries = Object.entries(counts);
      if (entries.length > 0) {
        entries.sort((a, b) => b[1] - a[1]);
        const [trackId, count] = entries[0];
        const track = tracksMap.get(String(trackId));
        if (track) {
          let coverUrl = track.cover || 'https://music.yandex.ru/blocks/playlist-cover/playlist-cover_like.png';
          if (coverUrl && !coverUrl.startsWith('http') && !coverUrl.startsWith('//')) {
            coverUrl = 'https://' + coverUrl;
          }
          let artistName = '';
          if (Array.isArray(track.artists)) {
            artistName = track.artists.map(artId => {
              if (artId && typeof artId === 'object') {
                return artId.name || 'Неизвестный исполнитель';
              }
              const artObj = artistsMap.get(String(artId));
              return artObj ? artObj.name : String(artId);
            }).join(', ');
          }
          monthlyTopTracks[m] = {
            trackId,
            title: track.title,
            cover: coverUrl,
            artist: artistName,
            count
          };
        }
      }
    }

    // 2.5 Вычисление Топ-трека на каждый день
    const dailyTopTrack = {};
    for (const [dStr, counts] of Object.entries(dailyTrackCounts)) {
      const entries = Object.entries(counts);
      if (entries.length > 0) {
        entries.sort((a, b) => b[1] - a[1]);
        const [trackId, count] = entries[0];
        const track = tracksMap.get(String(trackId));
        if (track) {
          let artistName = '';
          if (Array.isArray(track.artists)) {
            artistName = track.artists.map(artId => {
              if (artId && typeof artId === 'object') return artId.name || 'Неизвестный исполнитель';
              const artObj = artistsMap.get(String(artId));
              return artObj ? artObj.name : String(artId);
            }).join(', ');
          }
          dailyTopTrack[dStr] = {
            title: track.title,
            artist: artistName,
            count
          };
        }
      }
    }

    // 3. Вычисление Личных рекордов
    let peakDayStr = '-';
    let peakDayCount = 0;
    const dailyEntries = Object.entries(dailyListens);
    if (dailyEntries.length > 0) {
      dailyEntries.sort((a, b) => b[1] - a[1]);
      peakDayStr = dailyEntries[0][0];
      peakDayCount = dailyEntries[0][1];
      try {
        const [y, m, d] = peakDayStr.split('-');
        const monthsNamesRU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        peakDayStr = `${parseInt(d)} ${monthsNamesRU[parseInt(m) - 1]} ${y}`;
      } catch (e) {}
    }

    const weekdayPercent = totalListens > 0 ? Math.round((weekdayListensCount / totalListens) * 100) : 0;
    const weekendPercent = totalListens > 0 ? Math.round((weekendListensCount / totalListens) * 100) : 0;

    let favSlotStr = '-';
    const slotEntries = Object.entries(slotCounts);
    if (slotEntries.length > 0) {
      slotEntries.sort((a, b) => b[1] - a[1]);
      const [bestKey, _] = slotEntries[0];
      const [d, h] = bestKey.split('_');
      const daysNamesRU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
      favSlotStr = `${daysNamesRU[parseInt(d)]}, около ${h}:00`;
    }

    const avgTrackDurationMin = totalListens > 0 ? Math.round((totalDurationSec / totalListens) / 60 * 10) / 10 : 0;

    // 4. Вычисление Жанровой палитры и перевод
    const genreDict = {
      'rusrap': { name: 'Русский Рэп', color: '#9b5de5' },
      'ruspop': { name: 'Русский Поп', color: '#f15bb5' },
      'pop': { name: 'Поп-музыка', color: '#00bbf9' },
      'rap': { name: 'Рэп / Хип-хоп', color: '#3f37c9' },
      'rock': { name: 'Рок', color: '#e63946' },
      'alternative': { name: 'Альтернатива', color: '#a8dadc' },
      'electronic': { name: 'Электроника', color: '#00f5d4' },
      'dance': { name: 'Танцевальная', color: '#fee440' },
      'indie': { name: 'Инди', color: '#48cae4' },
      'metal': { name: 'Метал', color: '#1a1a1a' },
      'jazz': { name: 'Джаз', color: '#fb8500' },
      'classical': { name: 'Классика', color: '#e0e0e0' },
      'soundtrack': { name: 'Саундтреки', color: '#ffb703' },
      'rnb': { name: 'R&B', color: '#7209b7' },
      'lofi': { name: 'Лоу-фай', color: '#b5e2fa' },
      'chillout': { name: 'Чиллаут', color: '#90e0ef' },
      'latin': { name: 'Латино', color: '#ff477e' },
      'folk': { name: 'Фолк', color: '#ad2831' },
      'local-indie': { name: 'Локальный инди', color: '#0096c7' }
    };

    const top3Genres = topGenres.slice(0, 3).map(g => {
      const cleanName = g.name.toLowerCase().trim();
      const info = genreDict[cleanName] || {
        name: g.name,
        color: '#' + Math.floor((Math.abs(Math.sin(cleanName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) * 16777215) % 1) * 16777215).toString(16).padStart(6, '0')
      };
      return {
        code: g.name,
        name: g.name,
        color: info.color,
        count: g.count
      };
    });

    let paletteGradient = 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)';
    if (top3Genres.length === 1) {
      paletteGradient = `linear-gradient(135deg, ${top3Genres[0].color}20 0%, ${top3Genres[0].color}05 100%)`;
    } else if (top3Genres.length === 2) {
      paletteGradient = `linear-gradient(135deg, ${top3Genres[0].color}20 0%, ${top3Genres[1].color}10 100%)`;
    } else if (top3Genres.length >= 3) {
      paletteGradient = `linear-gradient(135deg, ${top3Genres[0].color}20 0%, ${top3Genres[1].color}12 50%, ${top3Genres[2].color}08 100%)`;
    }

    return {
      totalListens,
      totalHours: (totalDurationSec / 3600).toFixed(1),
      topTracks,
      topArtists,
      topGenres,
      eraCounts,
      listensByMonth,
      hourlyListens,
      weeklyListens,
      explicitPercentage,
      listeningPersona,
      monthlyTopTracks,
      personalRecords: {
        peakDay: peakDayStr,
        peakDayCount: peakDayCount,
        weekdayPercent,
        weekendPercent,
        favSlot: favSlotStr,
        avgTrackDurationMin
      },
      top3Genres,
      paletteGradient,
      dailyListensDuration,
      dailyListens,
      dailyTopTrack
    };
  }

  // Экспорт базы данных в JSON
  async exportData() {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readonly');
      
      const isDesktop = typeof window !== 'undefined' && 
        (window.navigator.userAgent.includes('Electron') || 
         (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendState === 'function'));

      const data = { 
        version: 1,
        source: isDesktop ? 'desktop' : 'web',
        exportedAt: new Date().toISOString(),
        listens: [], 
        tracks: [], 
        artists: [] 
      };
      
      let storesCompleted = 0;
      const checkDone = () => {
        storesCompleted++;
        if (storesCompleted === 3) resolve(JSON.stringify(data, null, 2));
      };

      transaction.objectStore('listens').getAll().onsuccess = e => { data.listens = e.target.result; checkDone(); };
      transaction.objectStore('tracks').getAll().onsuccess = e => { data.tracks = e.target.result; checkDone(); };
      transaction.objectStore('artists').getAll().onsuccess = e => { data.artists = e.target.result; checkDone(); };
    });
  }

  // Импорт базы данных из JSON (слияние)
  async importData(jsonData) {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      let data;
      try {
        data = JSON.parse(jsonData);
      } catch (e) {
        return reject(new Error('Неверный формат JSON'));
      }

      const listens = data.listens;
      const tracks = data.tracks;
      const artists = data.artists;
      const source = data.source || 'unknown';

      if (!listens || !tracks || !artists) {
        return reject(new Error('Отсутствуют необходимые таблицы в JSON'));
      }

      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readwrite');
      const listensStore = transaction.objectStore('listens');
      const tracksStore = transaction.objectStore('tracks');
      const artistsStore = transaction.objectStore('artists');

      // Сохраняем tracks и artists (put сам обновит/запишет поверх)
      tracks.forEach(track => tracksStore.put(track));
      artists.forEach(artist => artistsStore.put(artist));

      // Для listens нужно избежать дубликатов.
      // Так как keyPath='id' (autoIncrement), мы не можем просто put, если id пересекаются или разные на разных ПК.
      // Лучше всего: прочитать все текущие listens, создать Set из `${trackId}-${timestamp}`
      listensStore.getAll().onsuccess = (e) => {
        const existingListens = e.target.result;
        const existingSet = new Set(existingListens.map(l => `${l.trackId}-${l.timestamp}`));

        let addedCount = 0;
        listens.forEach(listen => {
          const key = `${listen.trackId}-${listen.timestamp}`;
          if (!existingSet.has(key)) {
            // Удаляем старый id, чтобы IndexedDB сгенерировал новый (autoIncrement)
            delete listen.id;
            listensStore.add(listen);
            addedCount++;
          }
        });

        resolve({ addedCount, source });
      };

      transaction.onerror = (e) => reject(e.target.error);
    });
  }

  // Очистка всех данных в БД
  async clearAllData() {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readwrite');
      
      transaction.objectStore('listens').clear();
      transaction.objectStore('tracks').clear();
      transaction.objectStore('artists').clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e.target.error);
    });
  }
}

// Экспорт инстанса
const wrappedDB = new WrappedDB();
if (typeof window !== 'undefined') {
  window.wrappedDB = wrappedDB;
}
