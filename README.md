<h1 align="center" style="font-weight: 800; border-bottom: none; margin-bottom: 10px;">BetterYandexMusic</h1>

<p align="center" style="font-size: 1.2em; color: #8b949e; margin-top: 0;">
  Прокачай свою Яндекс Музыку: совместное прослушивание, новые темы, тексты песен и многое другое.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-16%2B-green?style=for-the-badge&logo=node.js&logoColor=white&color=339933" alt="Node Version">
  <img src="https://img.shields.io/badge/Socket.io-v4-black?style=for-the-badge&logo=socket.io&logoColor=white&color=010101" alt="Socket.io Version">
  <img src="https://img.shields.io/badge/Electron-Compatible-blue?style=for-the-badge&logo=electron&logoColor=white&color=47848F" alt="Electron">
  <img src="https://img.shields.io/badge/Docker-Supported-blue?style=for-the-badge&logo=docker&logoColor=white&color=2496ED" alt="Docker">
  <img src="https://img.shields.io/badge/License-PolyForm%20Noncommercial-red?style=for-the-badge" alt="License">
</p>

---

## 📥 Скачать (Releases)

Готовые версии (билды) проекта автоматически собираются и доступны на вкладке **[Releases](../../releases)**:
* 📦 **`yandex-music-sync-extension.zip`** — готовое расширение для быстрой установки в браузер (Chrome, Edge, Яндекс Браузер).
* 🖥 **`yandex-music-sync-desktop.zip`** — утилита (патчер) для интеграции в официальное десктопное приложение Яндекс Музыки.

---

BetterYandexMusic расширяет возможности Яндекс Музыки. Проект добавляет функции совместного прослушивания, кастомизации интерфейса, отображения текстов и перевода песен, скробблинга, интеграции с RZT и SoundCloud. Панель управления удобно интегрируется в левый сайдбар.

---

## Ключевые возможности

### 🔄 Синхронизация песни
Трансляция действий (воспроизведение, пауза, перемотка времени, переключение треков).
<p align="center" style="margin-top: 15px;">
  <img src="https://github.com/IvanForze/BetterYandexMusic/raw/refs/heads/assets/assets/videos/sync-demo.gif" width="100%" alt="Видео Синхронизации" style="border-radius: 12px; max-width: 820px; border: 1px solid #30363d; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
</p>


### 🎨 Переключение темы
Изменение оформления через встроенные пресеты или конструктор «Своя тема».
<p align="center" style="margin-top: 15px;">
  <img src="https://github.com/IvanForze/BetterYandexMusic/raw/refs/heads/assets/assets/videos/themes-demo.gif" width="100%" alt="Видео Тем" style="border-radius: 12px; max-width: 820px; border: 1px solid #30363d; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
</p>

---

### 🎧 Выбор качества песни
Управление битрейтом и качеством воспроизводимого аудио из интерфейса.
<p align="center" style="margin-top: 15px;">
  <img src="https://github.com/IvanForze/BetterYandexMusic/raw/refs/heads/assets/assets/videos/quality-demo.gif" width="100%" alt="Видео Качества" style="border-radius: 12px; max-width: 820px; border: 1px solid #30363d; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
</p>

---

### 🌐 Перевод песни
Встроенный переводчик с поддержкой полноэкранного режима.
<p align="center" style="margin-top: 15px;">
  <img src="https://github.com/IvanForze/BetterYandexMusic/raw/refs/heads/assets/assets/videos/translation-demo.gif" width="100%" alt="Видео Перевода" style="border-radius: 12px; max-width: 820px; border: 1px solid #30363d; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
</p>

---

### 🎤 Текст для песен (без официального текста)
Отображение текстов песен из внешних баз для треков, у которых нет текста в Яндекс Музыке.
<p align="center" style="margin-top: 15px;">
  <img src="https://github.com/IvanForze/BetterYandexMusic/raw/refs/heads/assets/assets/videos/lyrics-demo.gif" width="100%" alt="Видео Текстов" style="border-radius: 12px; max-width: 820px; border: 1px solid #30363d; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
</p>

---

### 🎵 Скробблинг (Last.fm / ListenBrainz)
Автоматическая отправка прослушанных треков в профили Last.fm и ListenBrainz.
* Настройка прямо на странице настроек Яндекс Музыки (в разделе «Скроблинг»).

---

### 🏆 Оценки РЗТ (risazatvorchestvo.com)
Интеграция с независимым музыкальным изданием «Риса за Творчество» — автоматический поиск и отображение рейтингов треков прямо в полноэкранном плеере.
* В **полноэкранном режиме** рядом с кнопкой перевода появляются три круговых бейджа с оценками.

---

### 🎶 Поиск треков из SoundCloud

> [!IMPORTANT]
> Для работы поиска и воспроизведения треков из SoundCloud необходим обход блокировки:
> * **VPN** — поиск и воспроизведение работают корректно. Добавление трека в коллекцию через кнопку «+» **иногда может не работать** при использовании VPN.
> * **Zapret** — поиск, воспроизведение и добавление в коллекцию работают полностью корректно. Рекомендуемый способ.

Возможность искать треки на SoundCloud прямо из интерфейса Яндекс Музыки и добавлять их в личную коллекцию одним нажатием.

---

### Другие функции:
*   **Discord Rich Presence:** Отображение текущего трека, обложки и таймлайна в статусе Discord.
*   **Контейнеризация (Docker):** Наличие Dockerfile и docker-compose.yml для развертывания сервера.
*   **Автопатчер Electron:** Скрипт для интеграции кода в десктопное приложение.
*   **Подключение по ссылке:** Доступ к комнатам через URL-адрес.
*   **Glassmorphism:** Дизайн панели управления с эффектом размытия фона.

---

## 🚀 В планах (Roadmap)

* **Таймер сна (Sleep Timer):** Возможность задать время, через которое музыка плавно остановится (очень полезно для тех, кто слушает музыку перед сном).
* **Genius Annotations:** Не просто текст песен, а подтягивание аннотаций и фактов о строчках из Genius.com по клику на строчку.
* **Перенос плейлистов (Spotify / Apple Music):** Встроенная утилита, чтобы в пару кликов перенести плейлист из другого сервиса или экспортировать свой.
* **Мини-плеер поверх всех окон (Picture-in-Picture):** Небольшой плавающий виджет с обложкой и управлением, который висит поверх других программ на рабочем столе.
* **Глобальные горячие клавиши (Hotkeys):** Кастомизация шорткатов (особенно для десктопного Electron-приложения), чтобы переключать треки или ставить лайк, не разворачивая приложение.
* **Детальная статистика (Локальный Wrapped):** Сбор статистики прослушиваний прямо в расширении (любимые жанры, сколько часов прослушано), чтобы пользователю не приходилось ждать официальных итогов года в декабре.
* **Классический (старый) дизайн плеера:** Возможность переключаться на старый визуальный стиль приложения Яндекс Музыки для тех, кто скучает по классическому интерфейсу.

---

## 📂 Структура проекта
```text
📦 BetterYandexMusic
 ├── 📂 public/                          # Фронтенд-интерфейс сервера (страницы комнат)
 ├── 📂 shared/                          # Общая логика и UI (используется на всех платформах)
 │    ├── 📂 fullscreen/                 # Компоненты полноэкранного плеера (лирика, интерфейс)
 │    ├── 📂 lyrics/                     # Клиент LRCLib и рендер текстов песен
 │    ├── 📂 translation/                # Перевод текстов + интеграция RZT-оценок в плеер
 │    ├── 📄 rzt-api.js                  # Клиент API risazatvorchestvo.com (поиск, парсинг оценок)
 │    ├── 📄 scrobbler.js                # Скробблинг Last.fm и ListenBrainz
 │    ├── 📄 settings-injector.js        # Инжект настроек скробблинга на страницу настроек ЯМ
 │    ├── 📄 soundcloud-api.js           # Клиент SoundCloud API
 │    ├── 📄 soundcloud-search.js        # UI поиска и добавления треков из SoundCloud
 │    ├── 📄 soundcloud-import.js        # Импорт треков SoundCloud в коллекцию Яндекс Музыки
 │    ├── 📄 themes.js                   # Кастомные темы оформления
 │    ├── 📄 styles.js                   # Глобальные стили расширения
 │    ├── 📄 player-faker.js             # Эмуляция плеера для SoundCloud-треков
 │    ├── 📄 navbar-sync.js              # Кнопка синхронизации в навбаре
 │    ├── 📄 sync-popover.js             # Попап управления комнатой синхронизации
 │    ├── 📄 theme-popover.js            # Попап выбора темы
 │    ├── 📄 quality-indicator.js        # Индикатор и выбор качества аудио
 │    ├── 📄 custom-audio.js             # Кастомное аудио (для SoundCloud-треков)
 │    └── 📄 md5.js                      # MD5-хэширование (для Last.fm API)
 ├── 📂 yandex-sync-electron/            # Скрипты инжекта и патчер десктопного приложения
 │    └── 📂 src/
 │         ├── 📂 preload/              # Preload-скрипты (Discord RPC, HTTP-сервер, мост API)
 │         └── 📂 page/                # Скрипты веб-страницы (инициализация, монитор плеера)
 ├── 📂 yandex-sync-extension/           # Исходный код расширения для браузеров
 │    ├── 📂 src/
 │    │    ├── 📂 isolated/             # Скрипты изолированного контекста (скробблинг, переменные)
 │    │    └── 📂 main/                 # Скрипты основного контекста страницы
 │    ├── 📄 background.js              # Фоновый скрипт (RZT-запросы, API-проксирование)
 │    ├── 📄 manifest.json              # Манифест расширения
 │    ├── 📄 isolated.js                # Собранный изолированный бандл
 │    └── 📄 main.js                    # Собранный основной бандл
 ├── 📂 yandex-sync-installer/           # Установщик для десктопного приложения
 │    └── 📂 assets/                   # Собранный desktop-sync.js для патчера
 ├── 📄 build.js                         # Скрипт-сборщик (компилирует shared код для всех платформ)
 ├── 📄 server.js                        # Node.js + Socket.io сервер координации клиентов
 ├── 📄 Dockerfile                       # Сборка контейнера сервера
 └── 📄 docker-compose.yml               # Файл быстрого старта Docker Compose
```

---

## Установка и запуск

> [!IMPORTANT]
> Перед запуском синхронизации (подключением к комнате) обязательно включите любую песню, чтобы плеер Яндекс Музыки проинициализировался.

### 🚀 Способ 1: Установка из релизов (Рекомендуется)

Готовые версии можно найти на вкладке **[Releases](../../releases)**.

#### 📦 Установка в браузер (Chrome, Edge, Яндекс Браузер)
1. Скачайте архив **`yandex-music-sync-extension.zip`** из последнего релиза.
2. Распакуйте его в удобную папку на компьютере.
3. Откройте страницу управления расширениями в браузере (например, `chrome://extensions/`).
4. Включите **Режим разработчика** (Developer mode) в правом верхнем углу.
5. Нажмите **Загрузить распакованное расширение** (Load unpacked) и выберите папку, в которую вы распаковали архив.
6. Откройте или обновите вкладку [Яндекс Музыки](https://music.yandex.ru).

#### 🖥 Установка в Десктопное приложение (Windows, Linux и macOS)
> [!IMPORTANT]
> Перед установкой обязательно полностью закройте приложение Яндекс Музыка.

1. Скачайте установщик для вашей ОС из последнего релиза:
   * **Windows:** Скачайте и запустите `BetterYandexMusic Installer.exe`.
   * **Linux:** Скачайте `BetterYandexMusic Installer.AppImage`, сделайте файл исполняемым и запустите.
   * **macOS:** Скачайте `BetterYandexMusic Installer.dmg`, откройте его и перетащите приложение в папку "Программы" (Applications).
     > [!WARNING]
     > В macOS из-за системы защиты (Gatekeeper) может появиться ошибка "Приложение повреждено". Чтобы это исправить, откройте приложение **Терминал** и выполните команду:
     > `xattr -cr "/Applications/BetterYandexMusic Installer.app"`
     > После этого запустите установщик из папки "Программы".
2. В окне установщика нажмите кнопку **"Установить"** и дождитесь завершения (появится зеленая кнопка "Готово!").
3. Запустите Яндекс Музыку.

---

### 💻 Способ 2: Сборка из исходников (Для разработчиков)

Этот способ нужен, если вы хотите вносить изменения в код проекта или запустить свой личный сервер синхронизации.

#### Локальный запуск сервера (Node.js)
1. Установите [Node.js](https://nodejs.org/) (v16+).
2. Склонируйте репозиторий и установите зависимости:
   ```bash
   npm install
   ```
3. Запустите сервер:
   * **Обычный запуск:** `npm start` (сервер будет доступен по адресу `http://localhost:3000`).
   * **Запуск с генерацией HTTPS (рекомендуется):** 
     ```bash
     npm run start:tunnel
     ```
     Скрипт автоматически создаст временный HTTPS домен (через Cloudflare Tunnel), который можно скопировать и вставить в мод. Это нужно для обхода ограничений браузеров.

#### Запуск сервера через Docker
```bash
docker-compose up -d --build
```

#### Ручная сборка расширения и патчера
> [!TIP]
> Перед использованием локальных исходников обязательно скомпилируйте общие файлы командой `npm run build`.

* **Для браузера:** После выполнения сборки, загрузите папку `yandex-sync-extension` как распакованное расширение в настройках браузера.
* **Для десктопа:** После сборки перейдите в терминале в папку `yandex-sync-electron` и запустите команду `node patch.js` (приложение Яндекс Музыки должно быть закрыто).

---

## Лицензия

Проект распространяется по лицензии **PolyForm Noncommercial 1.0.0**.
Подробности в файле `LICENSE`.

<p align="center" style="margin-top: 40px; color: #8b949e; font-size: 0.9em;">
  Навайбкожено с ❤️ для всех любителей музыки. Приятного совместного прослушивания!
</p>
