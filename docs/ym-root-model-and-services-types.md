# TypeScript Types for Yandex Music Root Model & Internal Services

Этот документ описывает TypeScript интерфейсы и сигнатуры внутренней корневой модели (**Root Model / `__ym`**), вспомогательных сервисов (**Pins Collection, Trailer Service, REST API**) и структур данных ленты «Моей волны», обнаруженных и протестированных в ходе реверс-инжиниринга.

---

## 1. YmRootModel (Корневая модель веб-клиента)

Глобальный синглтон приложения Яндекс Музыки (MobX State Tree / Root Store). Доступен через `window.__ym?.rootModel` или из React Fiber корня `#root`.

```typescript
export interface YmRootModel {
  /** Коллекции реактивных сущностей пользователя (пины, лайки, плейлисты) */
  collections: YmCollections;

  /** Вспомогательные сервисы (трейлеры, нотификации, телеметрия) */
  services: YmServices;

  /** Состояние пользовательской сессии */
  user?: YmUserState;

  /** Конфигурация фиче-флагов и экспериментов */
  experiments?: Record<string, boolean | string>;

  /** Экземпляр ядра плеера Sonata Core */
  sonataCore?: SonataCore;
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

  /** Проверить, закреплен ли альбом */
  isAlbumPinned(albumId: number | string): boolean;

  /** Проверить, закреплен ли артист */
  isArtistPinned(artistId: number | string): boolean;

  /** Переключить закрепление альбома через внутренний экшен */
  toggleAlbumPin(options: { id: number | string }): Promise<boolean>;

  /** Переключить закрепление артиста */
  toggleArtistPin(options: { id: number | string }): Promise<boolean>;

  /** Удалить закреп */
  removePin(options: { type: 'album' | 'artist' | 'playlist'; id: number | string }): Promise<void>;
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

## 4. Likes API (Сетевой сервис отметок «Мне нравится»)

```typescript
// POST / DELETE https://api.music.yandex.ru/users/{uid}/likes/albums/add
// POST / DELETE https://api.music.yandex.ru/users/{uid}/likes/albums/remove

export interface AlbumLikePayload {
  'album-id': number | string;
}

export interface ToggleLikeResponse {
  result: {
    revision: number;
    success: boolean;
  };
}
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
