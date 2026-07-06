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

      // 1. Сохраняем/обновляем метаданные трека
      tracksStore.put({
        id: trackData.id,
        title: trackData.title,
        cover: trackData.cover,
        duration: trackData.duration,
        artists: trackData.artists.map(a => a.id)
      });

      // 2. Сохраняем/обновляем метаданные артистов
      if (trackData.artists && Array.isArray(trackData.artists)) {
        trackData.artists.forEach(artist => {
          artistsStore.put({
            id: artist.id,
            name: artist.name,
            cover: artist.cover
          });
        });
      }

      // 3. Добавляем запись о прослушивании
      const listenRecord = {
        trackId: trackData.id,
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
              tracks.set(cursor.value.id, cursor.value);
              cursor.continue();
            } else {
              // Загрузка метаданных артистов
              artistsStore.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                  artists.set(cursor.value.id, cursor.value);
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
    
    const listensByMonth = new Array(12).fill(0);

    for (const listen of listens) {
      const track = tracksMap.get(listen.trackId);
      if (!track) continue;

      totalDurationSec += track.duration || 0;

      // Топ треков
      trackCounts[listen.trackId] = (trackCounts[listen.trackId] || 0) + 1;

      // Топ артистов
      if (track.artists) {
        track.artists.forEach(artistId => {
          artistCounts[artistId] = (artistCounts[artistId] || 0) + 1;
          artistDuration[artistId] = (artistDuration[artistId] || 0) + (track.duration || 0);
        });
      }

      // Активность по месяцам
      const month = new Date(listen.timestamp).getMonth();
      listensByMonth[month]++;
    }

    // Сортировка топов
    const topTracks = Object.entries(trackCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ track: tracksMap.get(id), count }));

    const topArtists = Object.entries(artistDuration) // Сортируем по времени прослушивания
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, duration]) => ({ 
        artist: artistsMap.get(id), 
        duration,
        count: artistCounts[id]
      }));

    return {
      totalListens,
      totalHours: (totalDurationSec / 3600).toFixed(1),
      topTracks,
      topArtists,
      listensByMonth
    };
  }

  // Экспорт базы данных в JSON
  async exportData() {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readonly');
      const data = { listens: [], tracks: [], artists: [] };
      
      let storesCompleted = 0;
      const checkDone = () => {
        storesCompleted++;
        if (storesCompleted === 3) resolve(JSON.stringify(data));
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

      if (!data.listens || !data.tracks || !data.artists) {
        return reject(new Error('Отсутствуют необходимые таблицы в JSON'));
      }

      const transaction = this.db.transaction(['listens', 'tracks', 'artists'], 'readwrite');
      const listensStore = transaction.objectStore('listens');
      const tracksStore = transaction.objectStore('tracks');
      const artistsStore = transaction.objectStore('artists');

      // Сохраняем tracks и artists (put сам обновит/запишет поверх)
      data.tracks.forEach(track => tracksStore.put(track));
      data.artists.forEach(artist => artistsStore.put(artist));

      // Для listens нужно избежать дубликатов.
      // Так как keyPath='id' (autoIncrement), мы не можем просто put, если id пересекаются или разные на разных ПК.
      // Лучше всего: прочитать все текущие listens, создать Set из `${trackId}-${timestamp}`
      listensStore.getAll().onsuccess = (e) => {
        const existingListens = e.target.result;
        const existingSet = new Set(existingListens.map(l => `${l.trackId}-${l.timestamp}`));

        let addedCount = 0;
        data.listens.forEach(listen => {
          const key = `${listen.trackId}-${listen.timestamp}`;
          if (!existingSet.has(key)) {
            // Удаляем старый id, чтобы IndexedDB сгенерировал новый (autoIncrement)
            delete listen.id;
            listensStore.add(listen);
            addedCount++;
          }
        });

        resolve({ addedCount });
      };

      transaction.onerror = (e) => reject(e.target.error);
    });
  }
}

// Экспорт инстанса
const wrappedDB = new WrappedDB();
if (typeof window !== 'undefined') {
  window.wrappedDB = wrappedDB;
}
