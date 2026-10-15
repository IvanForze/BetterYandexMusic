# TypeScript Types for Yandex Music Root Model & Internal Services

Этот документ описывает TypeScript интерфейсы и сигнатуры внутренней корневой модели (**Root Model / `__ym`**), вспомогательных сервисов (**Pins Collection, Trailer Service, REST API**) и структур данных ленты «Моей волны», обнаруженных и протестированных в ходе реверс-инжиниринга.

---

## 1. YmRootModel (Корневая модель веб-клиента)

Глобальный синглтон приложения Яндекс Музыки (MobX State Tree / Root Store). Доступен через `window.__ym?.rootModel` или из React Fiber корня `#root`.

```typescript
export interface YmRootModel {
  /** Реактивная библиотека пользователя (лайкнутые треки, альбомы, артисты, плейлисты) */
  library: YmLibraryStore;

  /** Коллекции реактивных сущностей пользователя (пины, лайки, плейлисты) */
  collections: YmCollections;

  /** Вспомогательные сервисы (трейлеры, нотификации, телеметрия) */
  services: YmServices;

  /** Состояние пользовательской сессии и аккаунта */
  user?: {
    account?: {
      data?: {
        uid: number;
        login: string;
        publicId: string;
        hasPlus: boolean;
        avatarId?: string;
      };
      loadingState?: string;
    };
  };

  /** Конфигурация фиче-флагов и экспериментов */
  experiments?: Record<string, boolean | string>;

  /** Экземпляр ядра плеера Sonata Core */
  sonataCore?: SonataCore;
}

export interface YmLibraryStore {
  /** MobX ObservableMap лайкнутых треков (trackId -> "1") */
  tracks: {
    revision: number;
    items: Map<string, '1' | '0'>;
  };

  /** MobX ObservableMap лайкнутых альбомов (albumId -> "1") */
  albums: {
    revision: number;
    items: Map<string, '1' | '0'>;
  };

  /** MobX ObservableMap лайкнутых артистов (artistId -> "1") */
  artists: {
    revision: number;
    items: Map<string, '1' | '0'>;
  };

  /** MobX ObservableMap лайкнутых плейлистов (playlistUuid -> "1") */
  playlists: {
    revision: number;
    items: Map<string, '1' | '0'>;
  };

  /** Проверить отметку «Мне нравится» у трека */
  isTrackLiked(trackId: string | number): boolean;

  /** Проверить отметку «Мне нравится» у альбома */
  isAlbumLiked(albumId: string | number): boolean;

  /** Проверить отметку «Мне нравится» у артиста */
  isArtistLiked(artistId: string | number): boolean;

  /** Проверить отметку «Мне нравится» у плейлиста */
  isPlaylistLiked(playlistId: string | number): boolean;

  /** Нативный экшен переключения лайка трека (MobX State Tree Action) */
  toggleTrackLike(options: {
    entityId: string | number;
    userId: number;
    albumId?: string | number;
  }): Promise<'ok' | 'error'>;

  /** Нативный экшен переключения лайка альбома */
  toggleAlbumLike(options: {
    entityId: string | number;
    userId: number;
  }): Promise<'ok' | 'error'>;

  /** Нативный экшен переключения лайка артиста */
  toggleArtistLike(options: {
    entityId: string | number;
    userId: number;
  }): Promise<'ok' | 'error'>;

  /** Нативный экшен переключения лайка плейлиста */
  togglePlaylistLike(options: {
    entityId: string | number;
    userId: number;
  }): Promise<'ok' | 'error'>;

  /** Синхронизировать коллекцию с сервером */
  getData(substores?: string[]): Promise<unknown>;
}

export interface YmCollections {
  /** Коллекция закрепленных элементов в левом меню */
  pins: PinsCollection;

  /** Коллекция лайкнутых альбомов, треков и артистов */
  likes?: LikesCollection;

  /** Коллекция плейлистов пользователя */
  playlists?: unknown;
}

export interface YmServices {
  /** Сервис 30-секундного предпрослушивания трейлеров альбомов */
  trailerService: TrailerService;

  /** Сервис всплывающих уведомлений (Toast / Alert) */
  notificationService?: NotificationService;

  /** Сервис библиотеки треков */
  libraryService?: unknown;

  /** Сервис обратной связи (дизлайки, пропуски) */
  feedbackService?: unknown;
}
```

---

## 2. Pins Collection (Сервис закрепления элементов)

Управляет списком закрепленных альбомов, плейлистов и артистов в боковой панели (`aside`).

```typescript
export interface PinsCollection {
  /** Список закрепленных альбомов */
  pinnedAlbums?: Array<{ id: number | string; title: string }>;

  /** Список закрепленных артистов */
  pinnedArtists?: Array<{ id: number | string; name: string }>;

  /** Проверить, закреплен ли элемент по его ключу ('artist_item{id}', 'album_item{id}', 'playlist_item{uuid}') */
  isPinned(pinKey: string): boolean;

  /** Переключить закрепление артиста (ВНИМАНИЕ: pinKey обязателен для работы unpin!) */
  toggleArtistPin(options: { id: number | string }, pinKey?: string): Promise<unknown>;

  /** Переключить закрепление альбома (pinKey обязателен для unpin) */
  toggleAlbumPin(options: { id: number | string }, pinKey?: string): Promise<unknown>;

  /** Переключить закрепление плейлиста */
  togglePlaylistPin(options: { id?: number | string; uid?: number | string; kind?: number | string; uuid?: string }, pinKey?: string): Promise<unknown>;

  /** Удалить закреп по ключу pinKey из локального индекса и массива items */
  deletePin(pinKey: string): void;

  /** Добавить элемент в закреп */
  addPin(item: unknown): void;
}
```

### Нативные сетевые эндпоинты Pins API:
```typescript
// 1. Закрепить альбом (POST)
// POST https://api.music.yandex.ru/pin/album
export interface PinAlbumRequest {
  id: number | string;
}

// 2. Открепить альбом (DELETE)
// DELETE https://api.music.yandex.ru/pin/album
// ВНИМАНИЕ: Требует Content-Type: application/json и body с id!
export interface UnpinAlbumRequest {
  id: number | string;
}
```

---

## 3. Trailer Service (Сервис предпрослушивания альбомов)

Воспроизводит сжатые 30-секундные сэмплы треков альбома с отдельным аудиотрактом, не сбивая текущую очередь основного плеера.

```typescript
export interface TrailerService {
  /** Флаг активного воспроизведения трейлера */
  isPlaying: boolean;

  /** Текущий воспроизводимый трейлер альбома */
  currentTrailer: {
    albumId: number | string;
    trackId?: number | string;
    duration?: number;
    progress?: number;
  } | null;

  /** Запустить воспроизведение трейлера по ID альбома */
  playTrailer(options: { albumId: number | string; startTrackIndex?: number }): Promise<void>;

  /** Остановить воспроизведение трейлера */
  stop(): void;

  /** Пауза воспроизведения трейлера */
  pause(): void;

  /** Возобновить воспроизведение */
  resume(): void;
}
```

---

## 4. Likes Architecture & API (Сервис отметок «Мне нравится»)

В новой веб-версии Яндекс Музыки лайки функционируют на двух уровнях:
1. **Реактивный уровень состояния (MobX State Tree / `root.library`)**:
   - Начальные ID лайков гидрируются при загрузке страницы в серверном HTML (Next.js SSR / RSC payload) в MobX `ObservableMap`: `root.library.tracks.items` (а также `albums.items`, `artists.items`, `playlists.items`).
   - Ключ карты — строковый ID (`"153970251"`), значение — `"1"` (константа `LIKED`).
   - Публичные API блоков (например, `/landing-blocks/chart`) **не содержат** персонального флага `liked: true`, чтобы ответ оставался неперсонализированным и кэшировался на Edge/CDN. Статус лайка вычисляется клиентом синхронно через `root.library.isTrackLiked(id)` по локальному словарю `items`.
   - Нативные экшены модели защищены (`[mobx-state-tree] protected`). Модификация `items.set/delete` напрямую извне запрещена и должна производиться через действие `root.library.toggleTrackLike({ entityId, userId, albumId })`.

2. **Сетевой уровень (Users Resource API)**:
   Экшен `toggleTrackLike` оптимистично обновляет `root.library.tracks.items`, выполняет HTTP POST через внутренний `usersResource` и затем синхронизирует ревизию через `/collection/sync`. Если сетевой запрос завершается ошибкой, MST автоматически откатывает локальное состояние.

### Сигнатура вызова MobX State Tree Action:

```typescript
// Вызов нативного действия корневой модели:
await root.library.toggleTrackLike({
  entityId: '153970251',       // ID трека (строка)
  userId: 857786338,           // UID пользователя (root.user.account.data.uid)
  albumId: '43201525'          // Опционально: ID альбома трека (для трека альбома)
});

await root.library.toggleAlbumLike({
  entityId: '43201525',
  userId: 857786338
});
```

### Точные нативные сетевые эндпоинты (REST):

```http
### 1. Поставить лайк треку (ADD)
POST https://api.music.yandex.ru/users/{uid}/likes/tracks/add?track-id={trackId}
# Или для трека с альбомом: ?track-id={trackId}:{albumId}

### 2. Снять лайк с трека (REMOVE)
POST https://api.music.yandex.ru/users/{uid}/likes/tracks/{trackId}/remove
# Или для трека с альбомом: /tracks/{trackId}:{albumId}/remove

### 3. Поставить лайк альбому (ADD)
POST https://api.music.yandex.ru/users/{uid}/likes/albums/add?album-id={albumId}

### 4. Снять лайк с альбома (REMOVE)
POST https://api.music.yandex.ru/users/{uid}/likes/albums/{albumId}/remove

### 5. Поставить лайк плейлисту (ADD)
POST https://api.music.yandex.ru/users/{uid}/likes/playlists/add?owner={ownerUid}&kind={kind}

### 6. Снять лайк с плейлиста (REMOVE)
POST https://api.music.yandex.ru/users/{uid}/likes/playlists/remove?owner={ownerUid}&kind={kind}

### 7. Синхронизация ревизии коллекции (SYNC)
POST https://api.music.yandex.ru/collection/sync
Content-Type: application/json

{"likedTracks": {"revision": 350}}
```

### Обязательные заголовки для запросов лайков:

```http
accept-language: ru
x-requested-with: XMLHttpRequest
x-yandex-music-client: YandexMusicWebNext/1.0.0
x-yandex-music-multi-auth-user-id: {uid}
x-yandex-music-without-invocation-info: 1
```

---

## 5. Live Landing Feed (Структуры данных ленты Моей волны)

Эндпоинты ленты:
- `GET https://api.music.yandex.ru/feed`
- `GET https://api.music.yandex.ru/landing-block/mixes_waves`
- `GET https://api.music.yandex.ru/landing-block/in_style`
- `GET https://api.music.yandex.ru/landing-block/new_releases`
- `GET https://api.music.yandex.ru/landing-block/concerts`

```typescript
export interface LandingFeedResponse {
  result: {
    likesHistory?: LikesHistorySectionData;
    mixesWaves?: MixesWavesSectionData;
    waves?: WavesSectionData;
    inStyle?: InStyleSectionData;
    newReleases?: NewReleasesSectionData;
    concerts?: ConcertsSectionData;
  };
}

/** 1. Секция «Мне нравится» и недавней истории */
export interface LikesHistorySectionData {
  favoriteCount: number;
  recentFavorites: Array<{
    id: number | string;
    title: string;
    coverUri: string;
  }>;
  recentHistory: Array<{
    id: number | string;
    title: string;
    artists: Array<{ id: number; name: string }>;
    coverUri: string;
  }>;
}

/** 2. Секция AI-сетов Моей волны */
export interface MixesWavesSectionData {
  waves: Array<AiWaveSetItem>;
}

export interface AiWaveSetItem {
  id: string;
  title: string;
  category: 'activity' | 'mood' | 'genre' | 'character' | 'language';
  stationId: string;
  seeds: string[];
  color?: string;
  iconUrl?: string;
  backgroundImageUri?: string;
}

/** 3. Секция «В стиле любимых исполнителей» */
export interface InStyleSectionData {
  inStyleTabs: Array<{
    artist: {
      id: number;
      name: string;
      coverUri: string;
    };
    albums: Array<InStyleAlbumItem>;
  }>;
}

export interface InStyleAlbumItem {
  id: number;
  title: string;
  year?: number;
  coverUri: string;
  artists: Array<{ id: number; name: string }>;
  genre?: string;
  trackCount?: number;
  hasTrailer?: boolean;
}

/** 4. Секция «Новые релизы» */
export interface NewReleasesSectionData {
  newReleases: Array<{
    id: number;
    title: string;
    type: 'album' | 'single' | 'podcast';
    coverUri: string;
    artists: Array<{ id: number; name: string }>;
    releaseDate?: string;
    hasTrailer?: boolean;
  }>;
}

/** 5. Секция «Концерты для вас» (GET https://api.music.yandex.ru/concerts/landing/personal) */
export interface ConcertsSectionData {
  concerts: Array<ConcertItem>;
}

export interface ConcertItem {
  id: string;
  concertTitle: string;
  city: string;
  place: string;
  datetime: string; // ISO 8601, e.g. "2026-11-20T20:00:00+03:00"
  dataSessionId?: string;
  contentRating?: '0+' | '6+' | '12+' | '16+' | '18+';
  cover: {
    uri: string; // Template с '%%' (подставляется 960x690_noncrop)
    color?: string; // Hex, e.g. "#97999a"
    derivedColors?: {
      average?: string;
      waveText?: string;
      miniPlayer?: string;
      accent?: string;
    };
  };
  eventInfo?: {
    type: 'concert' | string;
  };
  ticketsUrl?: string;
}
```

---

## 6. Context Menu & Floating UI Types

Типы нативного выпадающего меню альбома с подменю шаринга через Floating UI портал.

```typescript
export interface ContextMenuPosition {
  x: number;
  y: number;
  placement: 'right-start' | 'right-end' | 'left-start' | 'left-end';
}

export interface ContextMenuItem {
  id: string;
  title: string;
  iconSpriteId: string; // e.g. '#pin_xxs', '#like_xxs', '#share_xxs'
  hasSubmenu?: boolean;
  action?: () => void | Promise<void>;
}

export interface ShareSubmenuItem {
  id: 'copy_link' | 'vk' | 'telegram' | 'twitter';
  title: string;
  action: () => void;
}
```
