# TypeScript Types for Sonata Player (Яндекс Музыка)

Этот документ описывает TypeScript интерфейсы и сигнатуры внутреннего плеера Яндекс Музыки (**Sonata Player / Sonata Core**), полученные в результате анализа и шпионажа за вызовами в рантайме.

---

## 1. Sonata Core (Корневой объект)

```typescript
export interface SonataCore {
  /** Фабрика для создания сущностей и контекстов воспроизведения */
  factory: SonataFactory;

  /** Контроллер блокировок и диспетчеризации плеера */
  playbackController: PlaybackController;

  /** Дополнительные провайдеры ядра (при наличии) */
  userProvider?: unknown;
  mediaProvider?: unknown;
}

export interface PlaybackController {
  /** Получить текущий активный инстанс плеера (ActivePlayback) */
  getPlayback(id?: string): SonataPlayer;

  /** Обертка с проверкой блокировок перед выполнением экшена */
  callIfUnblocked<T>(action: () => Promise<T> | T): Promise<T>;

  /** Проверить статус блокировки воспроизведения */
  checkPlaybackBlockingStatus(): boolean;

  /** Хуки жизненного цикла воспроизведения */
  beforePlayHandler(player: SonataPlayer): void;
  afterPlayHandler(player: SonataPlayer): void;

  /** Реактивные хуки ошибок */
  hooks: {
    afterError: {
      promise(error: unknown): Promise<void>;
    };
  };

  /** Ссылка на активный плеер MobX (обертка observable) */
  activePlayback: {
    value: SonataPlayer | null;
  };
}
```

---

## 2. Sonata Factory (Создание контекстов и сущностей)

```typescript
export interface SonataFactory {
  contextFactory: SonataContextFactory;

  /** Создать контекст воспроизведения (Моя волна, альбом, плейлист и т.д.) */
  createContext(options: ContextCreationOptions): SonataContext;

  /** Создать отдельную сущность трека/радио */
  createEntity(data: unknown): unknown;

  /** Создать пару контекст-сущность */
  createContextEntityPair(options: unknown): unknown;
}

export interface SonataContextFactory {
  albumsResource?: unknown;
  usersResource?: unknown;
  playlistResource?: unknown;
  artistsResource?: unknown;
  rotorResource?: unknown;
  tracksResource?: unknown;
  radioStationsResource?: unknown;
  radioStreamResource?: unknown;
  logger?: unknown;
  variables?: Record<string, unknown>;
  deferredFeedbacksStore?: unknown;

  /** Внутренний метод создания контекста на базе a.type */
  create(options: ContextCreationOptions): SonataContext;
}

export type ContextType =
  | 'vibe'         // Моя волна, AI-сеты, сеты по настроению/жанру
  | 'album'        // Альбом
  | 'playlist'     // Плейлист (включая «Мне нравится»)
  | 'artist'       // Треки артиста
  | 'various'      // Произвольный список треков
  | 'generative'   // Нейромузыка (генеративный поток)
  | 'radio'        // Тематическое радио
  | 'legacyRadio'; // Старое радио

export interface ContextCreationOptions {
  data: VibeContextData | AlbumContextData | PlaylistContextData | ArtistContextData | GenericContextData;
}

export interface VibeContextData {
  type: 'vibe';
  meta: {
    id: string; // Например: 'mix-by-mood:4' или 'user:onyourwave'
    session?: {
      acceptedSeeds?: Array<{ tag: string; type: string; value: string }>;
      batchId?: string;
      radioSessionId?: string;
      wave?: {
        name: string;
        stationId: string;
        seeds: string[];
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  seeds: string[]; // Например: ['mix-by-mood:4']
  from?: string;   // Например: 'web-landing-discovery_block-sets_by_waves-radio-default'
  includeTracksInResponse?: boolean;
  interactive?: boolean;
}

export interface AlbumContextData {
  type: 'album';
  meta: {
    id: string | number; // ID альбома
  };
  from?: string;
}

export interface PlaylistContextData {
  type: 'playlist';
  meta: {
    uid: string | number;
    kind: string | number;
    uuid?: string;
  };
  from?: string;
}

export interface ArtistContextData {
  type: 'artist';
  meta: {
    id: string | number;
  };
  from?: string;
}

export interface GenericContextData {
  type: string;
  meta: Record<string, unknown>;
  [key: string]: unknown;
}
```

---

## 3. Sonata Context (Инстанс контекста воспроизведения)

```typescript
export interface SonataContext {
  isCurrent: boolean;
  actions: Record<string, unknown>;
  from: string;
  utmLink?: string;
  logger: unknown;
  contextData: VibeContextData | GenericContextData;
  data: VibeContextData | GenericContextData;
  isVibeStarted?: boolean;
  variables?: unknown;
  sessionTracksPromise?: Promise<unknown>;
  feedbacksController?: unknown;
  sessionStore?: unknown;
  deferredFeedbacksQueue?: unknown;
  sessionController?: unknown;
  afterErrorHook?: unknown;
  handleAfterEntityRemoveHook?: unknown;
}
```

---

## 4. Sonata Player (ActivePlayback)

```typescript
export interface SonataPlayer {
  id: 'MAIN' | string;
  isBlocking: boolean;

  /** Контроллер текущего контекста воспроизведения */
  contextController: SonataContextController;

  /** Контроллер очереди треков */
  queueController: SonataQueueController;

  /** Реактивное состояние воспроизведения */
  playbackState: SonataPlaybackState;

  // --- Основные методы управления ---

  /** Запустить контекст (Моя волна, альбом, плейлист) */
  playContext(options: {
    context: SonataContext;
    entitiesData?: unknown;
    loadContextMeta?: boolean;
    queueParams?: unknown;
  }): Promise<void>;

  /** Установить контекст без немедленного запуска */
  setContext(options: {
    context: SonataContext;
    entitiesData?: unknown;
    loadContextMeta?: boolean;
    queueParams?: unknown;
  }): Promise<void>;

  /** Возобновить/начать воспроизведение */
  play(): Promise<void>;
  resume(): Promise<void>;

  /** Поставить на паузу */
  pause(): void;

  /** Переключить паузу */
  togglePause(): Promise<void>;

  /** Установить скорость воспроизведения (например, 1, 1.25, 1.5, 2) */
  setSpeed(speed: number): Promise<void>;

  /** Установить режим повтора ('none' | 'all' | 'one') */
  setRepeatMode(mode: 'none' | 'all' | 'one'): void;

  /** Включить/выключить перемешивание */
  setShuffle(shuffle: boolean): void;

  /** Перемотать на позицию в секундах */
  setProgress(seconds: number): void;

  /** Предзагрузить аудиопоток следующего трека */
  preloadSrc(params: { entity: unknown; bufferGoal: number; positionSec: number }): void;

  /** Переключить трек по индексу очереди */
  setEntityByIndex(index: number): void;

  /** Получить ID плеера */
  getId(): string;
}
```

---

## 5. Controllers & State (Контроллеры и Состояние)

```typescript
export interface SonataContextController {
  /** Текущий активный контекст */
  currentContext: SonataContext | null;

  /** Загрузить метаданные текущего контекста (обложка, название) */
  loadContextMeta(): Promise<void>;

  /** Получить список сущностей текущего контекста */
  getContextEntities(): unknown[];

  /** Создать сущности по списку треков */
  createEntities(entities: unknown[]): unknown[];
}

export interface SonataQueueController {
  queue: {
    state: {
      /** Текущий индекс трека в очереди */
      index?: { value: number };
      
      /** Текущий играющий трек/сущность */
      currentEntity?: {
        value?: SonataQueueEntity;
      };

      /** Список треков в очереди */
      entityList?: {
        value?: SonataQueueEntity[];
      };
    };
  };

  /** Автоматический переход к следующему треку */
  autoMoveForward(): void;

  /** Инициализировать очередь треков */
  setupQueue(params: { entitiesData?: unknown; queueParams?: unknown }): void;

  /** Внедрить трек в текущую очередь (для сквозного переключения/синхронизации) */
  inject(params: {
    entitiesData: Array<{ type: string; meta: { id: string } }>;
    position: number;
    silent: boolean;
  }): void;

  /** Установить повтор */
  setRepeat(mode: 'none' | 'all' | 'one'): void;

  /** Установить перемешивание */
  setShuffle(shuffle: boolean): void;
}

export interface SonataQueueEntity {
  entity?: {
    id?: string;
    data?: SonataTrackData;
    entityData?: SonataTrackData;
  };
  context?: SonataContext;
}

export interface SonataTrackData {
  id: string | number;
  realId?: string | number;
  title: string;
  version?: string;
  durationMs?: number;
  artists?: Array<{ id: number; name: string } | string>;
  albums?: Array<{ id: number; title: string; genre?: string; year?: number }>;
  coverUri?: string;
  contentWarning?: 'explicit' | string;
  meta?: Record<string, unknown>;
}

export interface SonataPlaybackState {
  playerState: {
    /** Текущий трек */
    track?: {
      value?: SonataTrackData;
    } | SonataTrackData;

    /** Флаг паузы */
    isPause?: {
      value: boolean;
    } | boolean;

    /** Прогресс и длительность */
    progress?: {
      value?: {
        position: number; // Текущая секунда
        duration: number; // Общая длительность
      };
    };

    /** Громкость (0.0 - 1.0) */
    volume?: {
      value: number;
    } | number;

    /** Скорость воспроизведения */
    speed?: {
      value: number;
    } | number;
  };
}
```

---

## 6. Примеры использования в BetterYandexMusic

### Запуск сета Моей волны:
```typescript
const core = window.getSonataCore();
const player = window.getActivePlayer();

if (core && player) {
  const vibeContext = core.factory.createContext({
    data: {
      type: 'vibe',
      meta: { id: 'mix-by-mood:4' },
      seeds: ['mix-by-mood:4'],
      from: 'web-landing-discovery_block-sets_by_waves-radio-default',
      includeTracksInResponse: true,
      interactive: true
    }
  });

  await player.playContext({ context: vibeContext, loadContextMeta: true });
}
```

### Запуск альбома:
```typescript
const albumContext = core.factory.createContext({
  data: {
    type: 'album',
    meta: { id: 22647617 },
    from: 'web-album-page'
  }
});

await player.playContext({ context: albumContext, loadContextMeta: true });
```
