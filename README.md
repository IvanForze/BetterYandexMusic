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

BetterYandexMusic расширяет возможности Яндекс Музыки. Проект добавляет функции совместного прослушивания, кастомизации интерфейса, отображения текстов и перевода песен. Панель управления удобно интегрируется в левый сайдбар.

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

### Другие функции:
*   **Discord Rich Presence:** Отображение текущего трека, обложки и таймлайна в статусе Discord.
*   **Контейнеризация (Docker):** Наличие Dockerfile и docker-compose.yml для развертывания сервера.
*   **Автопатчер Electron:** Скрипт для интеграции кода в десктопное приложение.
*   **Подключение по ссылке:** Доступ к комнатам через URL-адрес.
*   **Glassmorphism:** Дизайн панели управления с эффектом размытия фона.

---

## 🚀 В планах (Roadmap)

* **Интеграция SoundCloud:** Возможность добавлять треки из SoundCloud в свою коллекцию Яндекс Музыки буквально одним нажатием.
* **Таймер сна (Sleep Timer):** Возможность задать время, через которое музыка плавно остановится (очень полезно для тех, кто слушает музыку перед сном).
* **Скробблинг в Last.fm / ListenBrainz:** Встроенная поддержка автоматической отправки прослушанных треков в профиль Last.fm (Яндекс Музыка убрала эту функцию официально, так что это будет киллер-фичей!).
* **Genius Annotations:** Не просто текст песен, а подтягивание аннотаций и фактов о строчках из Genius.com по клику на строчку.
* **Перенос плейлистов (Spotify / Apple Music):** Встроенная утилита, чтобы в пару кликов перенести плейлист из другого сервиса или экспортировать свой.
* **Мини-плеер поверх всех окон (Picture-in-Picture):** Небольшой плавающий виджет с обложкой и управлением, который висит поверх других программ на рабочем столе.
* **Глобальные горячие клавиши (Hotkeys):** Кастомизация шорткатов (особенно для десктопного Electron-приложения), чтобы переключать треки или ставить лайк, не разворачивая приложение.
* **Детальная статистика (Локальный Wrapped):** Сбор статистики прослушиваний прямо в расширении (любимые жанры, сколько часов прослушано), чтобы пользователю не приходилось ждать официальных итогов года в декабре.
* **Интеграция с РЗТ (risazatvorchestvo.com):** Отображение оценок треков (от редакции и пользователей) прямо в плеере и возможность быстро перейти на страницу трека на РЗТ.
* **Классический (старый) дизайн плеера:** Возможность переключаться на старый визуальный стиль приложения Яндекс Музыки для тех, кто скучает по классическому интерфейсу.

---

## 📂 Структура проекта
```text
📦 BetterYandexMusic
 ├── 📂 public/                     # Фронтенд-интерфейс сервера (страницы комнат)
 ├── 📂 shared/                     # Общая логика и UI (перевод, темы, тексты песен, попапы)
 ├── 📂 yandex-sync-electron/       # Скрипты инжекта и патчер десктопного приложения
 ├── 📂 yandex-sync-extension/      # Исходный код расширения для браузеров (Chrome, Edge и др.)
 ├── 📄 build.js                    # Скрипт-сборщик (компилирует shared код для платформ)
 ├── 📄 server.js                   # Node.js + Socket.io сервер координации клиентов
 ├── 📄 Dockerfile                  # Сборка контейнера сервера
 └── 📄 docker-compose.yml          # Файл быстрого старта Docker Compose
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

#### 🖥 Установка в Десктопное приложение (Windows и macOS)
> [!IMPORTANT]
> Перед установкой обязательно полностью закройте приложение Яндекс Музыка.

1. Скачайте архив **`yandex-music-sync-desktop.zip`** из последнего релиза.
2. Распакуйте его в любую папку.
3. Запустите скрипт патчера:
   * **Для Windows:** просто запустите файл `patch.bat`.
   * **Для macOS / Linux:** откройте терминал, перейдите в папку с распакованным архивом и выполните команду `patch.sh`.
4. Дождитесь окончания патчинга (скрипт интегрирует наш мод в официальное приложение).
5. Запустите Яндекс Музыку.

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
