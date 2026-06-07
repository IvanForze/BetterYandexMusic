let socket = null;
let currentRoom = null;
let currentServerUrl = null;
let currentStatus = "disconnected"; // "disconnected", "connecting", "connected", "error"

// Переменные для текста песен
let currentLyricsTrackId = null;
let currentLyricsLines = null; // массив [{time, text}]
let currentLyricsPlain = null; // простой текст
let isLyricsLoading = false;
let isSyncedLyrics = false;
let lastLyricsActiveIndex = -1;
let lastFsUserInteractionTime = 0;
let lastSidebarUserInteractionTime = 0;

let ymLyricsTranslationCache = {};
let ymIsTranslating = false;
let currentTrackMetadata = null;

