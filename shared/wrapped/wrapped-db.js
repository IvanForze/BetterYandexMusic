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
    
    const listensByMonth = new Array(12).fill(0);

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

      // Активность по месяцам
      const month = new Date(listen.timestamp).getMonth();
      listensByMonth[month]++;
    }

    // Сортировка топов
    const topTracks = Object.entries(trackCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ track: tracksMap.get(String(id)), count }));

    const topArtists = Object.entries(artistDuration) // Сортируем по времени прослушивания
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, duration]) => ({ 
        artist: artistsMap.get(String(id)), 
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
