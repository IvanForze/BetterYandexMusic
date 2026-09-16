function injectStyles() {
  if (document.getElementById('ym-sync-styles')) return;
  const style = document.createElement('style');
  style.id = 'ym-sync-styles';
  style.textContent = `
    .ym-sync-status-indicator {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: #808080;
      border: 1.5px solid #18181c;
      transition: all 0.3s ease;
      z-index: 10;
    }

    .ym-sync-status-indicator.connecting {
      background-color: #f59e0b;
      box-shadow: 0 0 8px #f59e0b;
      animation: ym-pulse 1.2s infinite;
    }

    .ym-sync-status-indicator.connected {
      background-color: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: ym-pulse 1.5s infinite;
    }

    .ym-sync-status-indicator.error {
      background-color: #ef4444;
      box-shadow: 0 0 8px #ef4444;
    }

    .ym-sync-navbar-item.ym-collapsed .nxMXCBiVfgH4oxds3f2y {
      display: none !important;
    }

    @keyframes ym-pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.6; }
      100% { transform: scale(1); opacity: 1; }
    }

    .ym-sync-popover,
    .ym-theme-popover,
    .ym-lyrics-popover,
    .ym-fullscreen-translate-popover {
      --ym-popover-bg: rgba(28, 28, 32, 0.75);
      --ym-popover-border: rgba(255, 255, 255, 0.08);
      --ym-popover-text: #ffffff;
      --ym-popover-text-muted: rgba(255, 255, 255, 0.6);
      --ym-popover-text-label: rgba(255, 255, 255, 0.65);
      --ym-popover-item-bg: rgba(255, 255, 255, 0.03);
      --ym-popover-item-border: rgba(255, 255, 255, 0.05);
      --ym-popover-item-hover-bg: rgba(255, 255, 255, 0.08);
      --ym-popover-item-hover-border: rgba(255, 255, 255, 0.1);
      --ym-popover-input-bg: rgba(255, 255, 255, 0.06);
      --ym-popover-input-border: rgba(255, 255, 255, 0.08);
      --ym-popover-close-btn: #a0a0a5;
      --ym-popover-close-btn-hover: #ffffff;
      --ym-popover-shadow: rgba(0, 0, 0, 0.5);
      --ym-popover-active: #ffdb4d;
    }

    .ym-sync-popover {
      position: fixed;
      width: 290px;
      background: var(--ym-popover-bg) !important;
      backdrop-filter: blur(40px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(40px) saturate(180%) !important;
      border: 1px solid var(--ym-popover-border) !important;
      border-radius: 20px !important;
      box-shadow: 0 16px 48px var(--ym-popover-shadow) !important;
      padding: 8px !important;
      color: var(--ym-popover-text) !important;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif !important;
      font-weight: 500;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: opacity 0.2s ease, transform 0.2s ease;
      transform: translateY(5px);
      opacity: 0;
      pointer-events: none;
      box-sizing: border-box;
    }

    .ym-sync-popover.show {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .ym-sync-popover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px 4px 12px;
    }

    .ym-sync-popover-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      color: var(--ym-popover-text);
    }

    .ym-sync-close-btn {
      background: none;
      border: none;
      color: var(--ym-popover-close-btn);
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      transition: color 0.2s;
    }

    .ym-sync-close-btn:hover {
      color: var(--ym-popover-close-btn-hover);
    }

    .ym-sync-popover-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 0 8px 8px 8px;
    }

    .ym-sync-input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ym-sync-input-group label {
      font-size: 10px;
      font-weight: 500;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      color: var(--ym-popover-text-label);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .ym-sync-input-group input {
      background: var(--ym-popover-input-bg);
      border: 1px solid var(--ym-popover-input-border);
      border-radius: 12px;
      color: var(--ym-popover-text);
      padding: 10px 14px;
      font-size: 13px;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-weight: 500;
      outline: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
      width: 100%;
    }

    .ym-sync-input-group input::placeholder {
      color: var(--ym-popover-text-muted);
    }

    .ym-sync-input-group input:focus {
      border-color: var(--ym-popover-active);
      background: var(--ym-popover-input-bg);
      box-shadow: 0 0 0 3px rgba(255, 219, 77, 0.15);
    }

    .ym-sync-room-input-container {
      display: flex;
      gap: 8px;
      width: 100%;
    }

    .ym-sync-room-input-container input {
      flex-grow: 1;
    }

    .ym-sync-icon-only-btn {
      background: var(--ym-popover-item-bg);
      border: 1px solid var(--ym-popover-item-border);
      color: var(--ym-popover-close-btn);
      border-radius: 12px;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
      box-sizing: border-box;
      padding: 0;
    }

    .ym-sync-icon-only-btn:hover {
      background: var(--ym-popover-item-hover-bg);
      color: var(--ym-popover-close-btn-hover);
      border-color: var(--ym-popover-item-hover-border);
    }

    .ym-sync-primary-btn {
      background: #ffdb4d;
      border: none;
      border-radius: 12px;
      color: #000000;
      padding: 12px;
      font-size: 13px;
      font-weight: 600;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(255, 219, 77, 0.15);
      width: 100%;
      box-sizing: border-box;
    }

    .ym-sync-primary-btn:hover:not(:disabled) {
      background: #ffe170;
      box-shadow: 0 6px 16px rgba(255, 219, 77, 0.25);
    }

    .ym-sync-primary-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      color: rgba(0, 0, 0, 0.6);
    }

    .ym-sync-danger-btn {
      background: #ef4444;
      border: none;
      border-radius: 12px;
      color: #ffffff;
      padding: 12px;
      font-size: 13px;
      font-weight: 600;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
      width: 100%;
      box-sizing: border-box;
    }

    .ym-sync-danger-btn:hover {
      background: #dc2626;
      box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
    }

    .ym-sync-status-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--ym-popover-item-bg);
      border: 1px solid var(--ym-popover-item-border);
      border-radius: 12px;
      padding: 10px 14px;
      box-sizing: border-box;
      width: 100%;
    }

    .ym-sync-status-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ym-sync-pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
      animation: ym-pulse 1.5s infinite;
      flex-shrink: 0;
    }

    .ym-sync-status-info span {
      font-size: 12px;
      color: var(--ym-popover-text);
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-weight: 500;
    }

    .ym-sync-status-info strong {
      color: #10b981;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-weight: 500;
      word-break: break-all;
    }

    .ym-theme-popover {
      position: fixed;
      width: 290px;
      background: var(--ym-popover-bg) !important;
      backdrop-filter: blur(40px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(40px) saturate(180%) !important;
      border: 1px solid var(--ym-popover-border) !important;
      border-radius: 20px !important;
      box-shadow: 0 16px 48px var(--ym-popover-shadow) !important;
      padding: 8px !important;
      color: var(--ym-popover-text) !important;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif !important;
      font-weight: 500;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: opacity 0.2s ease, transform 0.2s ease;
      transform: translateY(5px);
      opacity: 0;
      pointer-events: none;
      box-sizing: border-box;
    }

    .ym-theme-popover.show {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .ym-theme-popover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px 4px 12px;
    }

    .ym-theme-popover-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      color: var(--ym-popover-text);
    }

    .ym-theme-close-btn {
      background: none;
      border: none;
      color: var(--ym-popover-close-btn);
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      transition: color 0.2s;
    }

    .ym-theme-close-btn:hover {
      color: var(--ym-popover-close-btn-hover);
    }

    .ym-theme-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 0 8px 8px 8px;
    }

    .ym-theme-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: var(--ym-popover-item-bg);
      border: 1px solid var(--ym-popover-item-border);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 13px;
      color: var(--ym-popover-text);
      opacity: 0.85;
    }

    .ym-theme-option:hover {
      background: var(--ym-popover-item-hover-bg);
      border-color: var(--ym-popover-item-hover-border);
      color: var(--ym-popover-text);
      opacity: 1;
    }

    .ym-theme-option.active {
      border-color: var(--ym-popover-active);
      background: rgba(255, 219, 77, 0.1);
      color: var(--ym-popover-active);
      opacity: 1;
    }

    .ym-theme-preview {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
    }

    .ym-theme-preview-default {
      background: #18181c;
    }

    .ym-theme-preview-oled {
      background: #000000;
      border-color: #ffffff33;
    }

    .ym-theme-preview-cyberpunk {
      background: #0f081d;
      border-color: #ff007f;
    }

    .ym-theme-preview-nord {
      background: #2e3440;
      border-color: #88c0d0;
    }

    .ym-theme-preview-sakura {
      background: #fff0f5;
      border-color: #ff69b4;
    }

    .ym-theme-preview-custom {
      background: linear-gradient(135deg, #ff007f 0%, #00ffff 50%, #ffdb4d 100%);
      border-color: rgba(255, 255, 255, 0.4);
    }
    .ym-navbar-item-injected.ym-collapsed .nxMXCBiVfgH4oxds3f2y {
      display: none !important;
    }

    .ym-quality-tooltip {
      position: fixed;
      background: rgba(24, 24, 30, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 8px 12px;
      color: rgba(255, 255, 255, 0.8);
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      font-weight: 500;
      z-index: 999999;
      pointer-events: none;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      transition: opacity 0.15s ease, transform 0.15s ease;
      opacity: 0;
      transform: translateY(4px);
      box-sizing: border-box;
      text-align: left;
    }
    .ym-quality-tooltip.show {
      opacity: 1;
      transform: translateY(0);
    }

    .ym-lyrics-popover {
      position: fixed;
      width: 320px;
      height: 480px;
      background: var(--ym-popover-bg) !important;
      backdrop-filter: blur(40px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(40px) saturate(180%) !important;
      border: 1px solid var(--ym-popover-border) !important;
      border-radius: 20px !important;
      box-shadow: 0 16px 48px var(--ym-popover-shadow) !important;
      padding: 8px !important;
      color: var(--ym-popover-text) !important;
      font-family: 'YS Text', 'Yandex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif !important;
      font-weight: 500;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: opacity 0.2s ease, transform 0.2s ease;
      transform: translateY(5px);
      opacity: 0;
      pointer-events: none;
      box-sizing: border-box;
    }

    .ym-lyrics-popover.show {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .ym-lyrics-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--ym-popover-border);
      padding: 8px 12px 8px 12px;
    }

    .ym-lyrics-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--ym-popover-text);
    }

    .ym-lyrics-close-btn {
      background: none;
      border: none;
      color: var(--ym-popover-close-btn);
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      transition: color 0.2s;
    }

    .ym-lyrics-close-btn:hover {
      color: var(--ym-popover-close-btn-hover);
    }

    .ym-lyrics-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      padding: 0 8px 8px 8px;
    }

    .ym-lyrics-track-info {
      font-size: 12px;
      color: var(--ym-popover-text-muted);
      margin-bottom: 8px;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ym-lyrics-track-info strong {
      color: var(--ym-popover-text);
    }

    .ym-lyric-lines-container {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 200px 10px;
      scroll-behavior: smooth;
    }

    .ym-lyric-lines-container::-webkit-scrollbar {
      width: 4px;
    }

    .ym-lyric-lines-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .ym-lyric-lines-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }

    .ym-lyric-line {
      font-size: 14px;
      color: var(--ym-popover-text-muted);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      text-align: center;
      line-height: 1.4;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
    }

    .ym-lyric-line:hover {
      color: var(--ym-popover-text);
      background: var(--ym-popover-item-bg);
    }

    .ym-lyric-line.active {
      color: var(--ym-popover-active);
      font-size: 18px;
      font-weight: 800;
      text-shadow: 0 0 12px rgba(255, 219, 77, 0.5);
      transform: scale(1.04);
      background: rgba(255, 219, 77, 0.03);
    }

    .ym-lyrics-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: var(--ym-popover-text-muted);
      font-size: 13px;
      gap: 12px;
      padding: 10px;
    }

    .ym-lyrics-search-box {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
    }

    .ym-lyrics-search-results {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 200px;
      overflow-y: auto;
      width: 100%;
      margin-top: 8px;
    }

    .ym-lyrics-search-results::-webkit-scrollbar {
      width: 4px;
    }

    .ym-lyrics-search-results::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }

    .ym-lyrics-search-item {
      padding: 8px 12px;
      background: var(--ym-popover-item-bg);
      border: 1px solid var(--ym-popover-item-border);
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
    }

    .ym-lyrics-search-item:hover {
      background: var(--ym-popover-item-hover-bg);
      border-color: var(--ym-popover-active);
    }

    .ym-lyrics-search-item div {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ym-lyrics-search-item .title {
      font-weight: 600;
      color: var(--ym-popover-text);
    }

    .ym-lyrics-search-item .artist {
      color: var(--ym-popover-text-muted);
      margin-top: 2px;
    }

    /* Style for patched native lyrics button */
    [data-ym-sync-patched="true"] {
      opacity: 1 !important;
      pointer-events: auto !important;
      cursor: pointer !important;
    }
    
    [data-ym-sync-patched="true"] svg {
      color: #ffdb4d !important;
      fill: currentColor !important;
    }

    /* Fullscreen player custom lyrics styles */
    .ym-fullscreen-lyrics-container {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 80vh;
      max-height: 600px;
      overflow-y: auto;
      padding: min(40vh, 300px) 12%;
      scroll-behavior: smooth;
      box-sizing: border-box;
      mask-image: linear-gradient(to bottom, transparent 0%, white 15%, white 85%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, transparent 0%, white 15%, white 85%, transparent 100%);
      transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease;
    }

    /* Hide custom lyrics and panels when Play Queue is active */
    [class*="FullscreenPlayerDesktop_root"]:has([class*="FullscreenPlayerDesktopControls_playQueueButton"][aria-pressed="true"]) .ym-fullscreen-lyrics-container,
    [class*="FullscreenPlayerDesktop_root"]:has([class*="FullscreenPlayerDesktopControls_playQueueButton"][aria-pressed="true"]) .ym-fullscreen-genius-content,
    [class*="FullscreenPlayerDesktop_root"]:has([class*="FullscreenPlayerDesktopControls_playQueueButton"][aria-pressed="true"]) .ym-genius-annotation-panel,
    [class*="FullscreenPlayerDesktop_root"]:has([class*="FullscreenPlayerDesktopControls_playQueueButton"][aria-pressed="true"]) .ym-translate-controls {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transform: translateX(-20px) !important;
    }

    .ym-fullscreen-lyric-original {
      font-family: inherit;
      font-weight: inherit;
      font-size: inherit;
      transition: font-weight 0.2s ease, font-size 0.2s ease;
    }

    .ym-fullscreen-lyrics-container.ym-has-translation .ym-fullscreen-lyric-original {
      font-weight: 500 !important;
      font-size: 0.9em !important;
    }

    .ym-fullscreen-lyrics-container::-webkit-scrollbar {
      display: none;
    }

    .ym-fullscreen-lyric-line {
      font-family: "YSMusic Headline", sans-serif !important;
      font-style: normal !important;
      font-weight: 700 !important;
      font-size: 28px;
      line-height: 1.4;
      color: rgb(230, 230, 230) !important;
      opacity: 0.35 !important;
      margin-bottom: 32px;
      text-align: center !important;
      transform: scale(1);
      transform-origin: center center;
      transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: opacity, transform;
      cursor: pointer;
      user-select: none;
    }

    .ym-fullscreen-lyric-line:hover {
      opacity: 0.85 !important;
    }

    .ym-fullscreen-lyric-line.active {
      font-family: "YSMusic Headline", sans-serif !important;
      font-style: normal !important;
      font-weight: 700 !important;
      color: rgb(230, 230, 230) !important;
      opacity: 1 !important;
      transform: scale(1.18) !important;
    }

    /* Style for the next line following the active one */
    .ym-fullscreen-lyric-line.active + .ym-fullscreen-lyric-line {
      font-family: "YSMusic Headline", sans-serif !important;
      font-style: normal !important;
      font-weight: 700 !important;
      color: rgb(230, 230, 230) !important;
      opacity: 0.6 !important;
    }

    /* Genius mode header labels [Verse 1], [Chorus], etc. */
    .ym-genius-header-label {
      display: block !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.12em !important;
      opacity: 0.45 !important;
      margin-top: 28px !important;
      margin-bottom: 20px !important;
      cursor: default !important;
      transform: none !important;
    }
    .ym-genius-header-label:hover {
      opacity: 0.45 !important;
      transform: none !important;
    }

    /* Genius mode static fallback lyric lines */
    .ym-fullscreen-lyric-line.static {
      opacity: 0.85 !important;
      cursor: default;
    }
    .ym-fullscreen-lyric-line.static:hover {
      opacity: 1 !important;
    }
    a.ym-lyric-annotated .ym-fullscreen-lyric-line.static {
      cursor: pointer !important;
    }

    .ym-fullscreen-lyrics-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: rgba(255, 255, 255, 0.5);
      font-size: 24px;
      font-weight: 600;
      text-align: center;
    }

    /* Split mode layout override when custom lyrics are injected */
    [class*="FullscreenPlayerDesktopContent_root"].ym-force-split {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 60px !important;
      width: 100% !important;
      max-width: 1200px !important;
      margin: 0 auto !important;
      padding: 0 40px !important;
      box-sizing: border-box !important;
      align-items: center !important;
      justify-content: center !important;
      position: relative !important;
      transform: none !important;
      left: 0 !important;
      top: 0 !important;
    }

    [class*="FullscreenPlayerDesktopContent_fullscreenContent"].ym-force-split {
      width: 100% !important;
      max-width: 400px !important;
      margin: 0 auto !important; /* Center alignment */
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      position: relative !important;
      transform: none !important;
      left: 0 !important;
      top: 0 !important;
      height: auto !important;
    }

    [class*="FullscreenPlayerDesktopContent_additionalContent"].ym-force-split {
      width: 100% !important;
      max-width: 600px !important;
      margin: 0 auto !important; /* Center alignment */
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      opacity: 1 !important;
      visibility: visible !important;
      height: 80vh !important;
      position: relative !important;
      transform: none !important;
      left: 0 !important;
    }

    [class*="FullscreenPlayerDesktopContent_additionalContent"].ym-force-split > :not(.ym-fullscreen-lyrics-container) {
      display: none !important;
    }

    /* Adjust poster cover size in split mode */
    .ym-force-split [class*="FullscreenPlayerDesktopPoster_root"] {
      width: 100% !important;
      max-width: 400px !important;
      margin: 0 auto !important;
      position: relative !important;
    }

    .ym-force-split [class*="FullscreenPlayerDesktopPoster_cover"] {
      width: 100% !important;
      height: auto !important;
      aspect-ratio: 1/1 !important;
      border-radius: 12px !important;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4) !important;
    }

    /* Metadata and controls container under the cover art */
    [class*="FullscreenPlayerDesktopContent_info"].ym-force-split {
      width: 100% !important;
      max-width: 400px !important;
      margin: 20px auto 0 auto !important;
      padding: 0 !important;
      text-align: left !important;
    }

    /* Force slider to align and match the 400px cover art width in split mode, and position timecodes under it */
    .ym-force-split [class*="FullscreenPlayerDesktopContent_sliderContainer"] {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      grid-template-rows: auto auto !important;
      width: 100% !important;
      max-width: 400px !important;
      margin: 12px 0 0 0 !important;
      height: 42px !important;
    }

    .ym-force-split [class*="FullscreenPlayerDesktopContent_sliderContainer"] input {
      grid-column: 1 / span 2 !important;
      grid-row: 1 !important;
      width: 100% !important;
      margin: 0 !important;
    }

    .ym-force-split [class*="FullscreenPlayerDesktopContent_sliderContainer"] [class*="Timecode_root_start"] {
      grid-column: 1 !important;
      grid-row: 2 !important;
      justify-self: start !important;
      margin-top: 4px !important;
    }

    .ym-force-split [class*="FullscreenPlayerDesktopContent_sliderContainer"] [class*="Timecode_root_end"] {
      grid-column: 2 !important;
      grid-row: 2 !important;
      justify-self: end !important;
      margin-top: 4px !important;
    }

    /* Align title and artist text to the left in split mode, just like Yandex does natively */
    .ym-force-split [class*="Meta_root"] {
      align-items: flex-start !important;
      text-align: left !important;
    }

    /* Translate button: positioned inside FullscreenPlayerDesktopControls_root */
    .ym-fullscreen-translate-btn {
      position: absolute !important;
      top: 16px !important;
      left: 16px !important;
      width: 64px !important;
      height: 64px !important;
      border-radius: 50% !important;
      background: rgba(26, 26, 26, 0.9) !important;
      border: none !important;
      color: #fff !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      z-index: 100000 !important;
      transition: all 0.2s ease !important;
      outline: none !important;
      padding: 0 !important;
    }
    
    .ym-fullscreen-translate-btn:hover:not(.active) {
      background: rgba(40, 40, 40, 0.9) !important;
      transform: scale(1.05) !important;
    }

    .ym-fullscreen-translate-btn.active:hover {
      transform: scale(1.05) !important;
    }
    
    .ym-fullscreen-translate-btn.active {
      background: #ffdb4d !important;
      color: #000000 !important;
      box-shadow: 0 0 12px rgba(255, 219, 77, 0.4) !important;
    }

    /* RZT Ratings Container and Circles */
    .ym-fullscreen-rzt-ratings {
      position: absolute !important;
      top: 30px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      display: flex !important;
      flex-direction: row !important;
      gap: 12px !important;
      z-index: 100000 !important;
      pointer-events: auto !important;
    }

    .ym-rzt-rating-circle {
      width: 36px !important;
      height: 36px !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: "YSMusic Headline", "YS Text", "Yandex Sans", sans-serif !important;
      font-size: 15px !important;
      font-weight: 700 !important;
      color: #ffffff !important;
      position: relative !important;
      cursor: pointer !important;
      box-sizing: border-box !important;
      transition: transform 0.2s ease, opacity 0.2s ease !important;
    }

    .ym-rzt-rating-circle:hover {
      transform: scale(1.1) !important;
    }

    /* Tooltip styling */
    .ym-rzt-rating-circle::after {
      content: attr(data-tooltip);
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(6px);
      background: rgba(28, 28, 32, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-family: "YS Text", "Yandex Sans", sans-serif;
      font-weight: 500;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease, transform 0.2s ease;
      z-index: 100002;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .ym-rzt-rating-circle:hover::after {
      opacity: 1;
      transform: translateX(-50%) translateY(2px);
    }

    .ym-rzt-rating-circle.rzt-blue-solid {
      background-color: #2563eb !important;
      border: none !important;
    }

    .ym-rzt-rating-circle.rzt-blue-outline {
      background-color: transparent !important;
      border: 2px solid #2563eb !important;
    }

    .ym-rzt-rating-circle.rzt-grey-solid {
      background-color: rgba(255, 255, 255, 0.15) !important;
      border: none !important;
    }

    /* --- Light Theme Support --- */
    html.theme-light .ym-sync-popover,
    body.theme-light .ym-sync-popover,
    .theme-light .ym-sync-popover,
    html[data-theme="light"] .ym-sync-popover,
    [data-theme="light"] .ym-sync-popover,
    html.theme-light .ym-theme-popover,
    body.theme-light .ym-theme-popover,
    .theme-light .ym-theme-popover,
    html[data-theme="light"] .ym-theme-popover,
    [data-theme="light"] .ym-theme-popover,
    html.theme-light .ym-lyrics-popover,
    body.theme-light .ym-lyrics-popover,
    .theme-light .ym-lyrics-popover,
    html[data-theme="light"] .ym-lyrics-popover,
    [data-theme="light"] .ym-lyrics-popover,
    html.theme-light .ym-fullscreen-translate-popover,
    body.theme-light .ym-fullscreen-translate-popover,
    .theme-light .ym-fullscreen-translate-popover,
    html[data-theme="light"] .ym-fullscreen-translate-popover,
    [data-theme="light"] .ym-fullscreen-translate-popover {
      --ym-popover-bg: rgba(255, 255, 255, 0.75);
      --ym-popover-border: rgba(0, 0, 0, 0.08);
      --ym-popover-text: #000000;
      --ym-popover-text-muted: rgba(0, 0, 0, 0.55);
      --ym-popover-text-label: rgba(0, 0, 0, 0.55);
      --ym-popover-item-bg: rgba(0, 0, 0, 0.03);
      --ym-popover-item-border: rgba(0, 0, 0, 0.05);
      --ym-popover-item-hover-bg: rgba(0, 0, 0, 0.06);
      --ym-popover-item-hover-border: rgba(0, 0, 0, 0.08);
      --ym-popover-input-bg: rgba(0, 0, 0, 0.03);
      --ym-popover-input-border: rgba(0, 0, 0, 0.05);
      --ym-popover-close-btn: rgba(0, 0, 0, 0.45);
      --ym-popover-close-btn-hover: #000000;
      --ym-popover-shadow: rgba(0, 0, 0, 0.12);
      --ym-popover-active: #ccaa00;
    }

    /* --- Genius Mode Layout Swaps --- */
    .ym-genius-active [class*="FullscreenPlayerDesktopContent_root"].ym-force-split {
      grid-template-columns: 1.2fr 1fr !important;
      align-items: center !important;
      justify-content: center !important;
    }
    
    .ym-genius-active [class*="FullscreenPlayerDesktopContent_additionalContent"].ym-force-split {
      grid-column: 1 !important;
      grid-row: 1 !important;
      max-width: 650px !important;
    }

    .ym-genius-active [class*="FullscreenPlayerDesktopContent_fullscreenContent"].ym-force-split {
      grid-column: 2 !important;
      grid-row: 1 !important;
      max-width: 550px !important;
      width: 100% !important;
      height: 80vh !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: stretch !important;
      position: relative !important;
    }

    /* Hide standard details in Genius mode */
    .ym-genius-active [class*="FullscreenPlayerDesktopPoster_root"],
    .ym-genius-active [class*="FullscreenPlayerDesktopContent_info"].ym-force-split {
      display: none !important;
    }

    /* Genius Toggle Button styling */
    .ym-fullscreen-genius-btn {
      position: absolute !important;
      top: 108px;
      right: 48px;
      width: 40px !important;
      height: 40px !important;
      border-radius: 50% !important;
      background: rgba(26, 26, 26, 0.9) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: #fff !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      z-index: 100000 !important;
      transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease !important;
      outline: none !important;
      padding: 0 !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
    }
    .ym-fullscreen-genius-btn svg {
      fill: currentColor !important;
      stroke: none !important;
      width: 20px !important;
      height: 20px !important;
      display: block !important;
    }
    .ym-fullscreen-genius-btn:hover {
      background: rgba(40, 40, 40, 0.9) !important;
      transform: scale(1.05) !important;
      border-color: rgba(255, 255, 255, 0.25) !important;
    }
    .ym-fullscreen-genius-btn.active,
    .ym-fullscreen-genius-btn[aria-pressed="true"] {
      background: #ffdb4d !important;
      border-color: #ffdb4d !important;
      color: #000000 !important;
      box-shadow: 0 0 12px rgba(255, 219, 77, 0.5) !important;
    }
    .ym-fullscreen-genius-btn svg {
      display: block !important;
    }

    /* Custom Sync Lyrics Toggle Button */
    .ym-custom-sync-lyrics-btn {
      display: inline-flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      cursor: pointer !important;
    }
    .ym-custom-sync-lyrics-btn svg {
      display: block !important;
    }

    /* Genius Panel Exit Button */
    .ym-genius-panel-exit-btn {
      background: rgba(255, 255, 255, 0.08) !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      border-radius: 20px !important;
      color: #fff !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      padding: 6px 14px !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      font-family: "YS Text", sans-serif !important;
      outline: none !important;
    }
    .ym-genius-panel-exit-btn:hover {
      background: rgba(255, 255, 255, 0.15) !important;
      border-color: rgba(255, 255, 255, 0.3) !important;
      transform: scale(1.02) !important;
    }
    .ym-genius-panel-exit-btn:active {
      transform: scale(0.98) !important;
    }

    /* Annotated Lyrics Line styles */
    .ym-genius-active .ym-fullscreen-lyric-line.ym-lyric-annotated {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 10px 18px;
      box-sizing: border-box;
      display: inline-block;
      margin-left: auto;
      margin-right: auto;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(255, 255, 255, 0.03);
    }
    .ym-genius-active .ym-fullscreen-lyric-line.ym-lyric-annotated:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.08);
      transform: translateY(-1px);
    }
    .ym-genius-active .ym-fullscreen-lyric-line.ym-lyric-annotated.active {
      background: rgba(255, 219, 77, 0.1);
      border-color: rgba(255, 219, 77, 0.2);
    }
    .ym-genius-active .ym-fullscreen-lyric-line.ym-genius-annotation-selected {
      background: rgba(255, 219, 77, 0.2) !important;
      border-color: #ffdb4d !important;
      color: #ffffff !important;
      opacity: 1 !important;
      box-shadow: 0 4px 20px rgba(255, 219, 77, 0.15) !important;
      transform: scale(1.05) !important;
    }

    .ym-genius-lyric-line {
      display: block !important;
      margin-bottom: 28px !important;
    }

    /* Inline Genius lyrics anchors (base styles) */
    a.ym-lyric-annotated {
      color: #fff !important;
      text-decoration: none !important;
      transition: all 0.2s ease !important;
      cursor: pointer !important;
    }

    /* Normal inline highlights (when there is no nested block line inside the anchor) */
    a.ym-lyric-annotated:not(:has(.ym-genius-lyric-line)) {
      background: rgba(255, 219, 77, 0.15) !important;
      border-bottom: 2px solid rgba(255, 219, 77, 0.4) !important;
      padding: 2px 4px !important;
      border-radius: 4px !important;
      display: inline !important;
    }
    a.ym-lyric-annotated:not(:has(.ym-genius-lyric-line)):hover {
      background: rgba(255, 219, 77, 0.3) !important;
      border-color: #ffdb4d !important;
    }

    /* Block highlights (when the anchor wraps whole lines of lyrics) */
    a.ym-lyric-annotated:has(.ym-genius-lyric-line) {
      display: contents !important; /* Prevents inline tag border-bottom collapse/artifacts */
    }

    /* The actual visual frame for block-level annotated lines */
    a.ym-lyric-annotated .ym-genius-lyric-line {
      background: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.03) !important;
      border-radius: 12px;
      padding: 10px 18px !important;
      box-sizing: border-box;
      display: inline-block !important;
      margin-left: auto;
      margin-right: auto;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    a.ym-lyric-annotated:hover .ym-genius-lyric-line {
      background: rgba(255, 255, 255, 0.12) !important;
      border-color: rgba(255, 255, 255, 0.08) !important;
      transform: translateY(-1px);
    }

    /* Highlight matching active state and selection states on block frames */
    a.ym-lyric-annotated .ym-genius-lyric-line.active {
      background: rgba(255, 219, 77, 0.1) !important;
      border-color: rgba(255, 219, 77, 0.2) !important;
    }
    a.ym-lyric-annotated .ym-genius-lyric-line.ym-genius-annotation-selected {
      background: rgba(255, 219, 77, 0.2) !important;
      border-color: #ffdb4d !important;
      box-shadow: 0 4px 20px rgba(255, 219, 77, 0.15) !important;
      transform: scale(1.05) !important;
    }
    a.ym-lyric-annotated.ym-genius-annotation-selected {
      background: rgba(255, 219, 77, 0.45) !important;
      border-color: #ffdb4d !important;
      box-shadow: 0 0 10px rgba(255, 219, 77, 0.3) !important;
      color: #ffffff !important;
    }

    /* Glassmorphic Annotation Panel */
    .ym-genius-annotation-panel {
      display: flex;
      flex-direction: column;
      height: 80vh;
      max-height: 600px;
      position: relative !important;
      z-index: 10000 !important;
      background: rgba(20, 20, 20, 0.35);
      backdrop-filter: blur(25px) saturate(180%);
      -webkit-backdrop-filter: blur(25px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 24px 16px 24px 28px;
      box-sizing: border-box;
      overflow: hidden;
      color: #ffffff;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
      text-align: left;
    }

    /* Genius Annotation Body & Scrollbars */
    .ym-genius-panel-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      padding-right: 10px;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
    }

    .ym-genius-panel-body::-webkit-scrollbar,
    .ym-genius-annotation-panel::-webkit-scrollbar,
    .ym-genius-annotation-body::-webkit-scrollbar {
      width: 6px;
    }

    .ym-genius-panel-body::-webkit-scrollbar-track,
    .ym-genius-annotation-panel::-webkit-scrollbar-track,
    .ym-genius-annotation-body::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 9999px;
      margin: 4px 0;
    }

    .ym-genius-panel-body::-webkit-scrollbar-thumb,
    .ym-genius-annotation-panel::-webkit-scrollbar-thumb,
    .ym-genius-annotation-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.22);
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .ym-genius-panel-body::-webkit-scrollbar-thumb:hover,
    .ym-genius-annotation-panel::-webkit-scrollbar-thumb:hover,
    .ym-genius-annotation-body::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 219, 77, 0.65);
      border-color: rgba(255, 219, 77, 0.4);
      box-shadow: 0 0 8px rgba(255, 219, 77, 0.35);
    }

    .ym-genius-panel-body::-webkit-scrollbar-thumb:active,
    .ym-genius-annotation-panel::-webkit-scrollbar-thumb:active,
    .ym-genius-annotation-body::-webkit-scrollbar-thumb:active {
      background: #ffdb4d;
      border-color: #ffdb4d;
      box-shadow: 0 0 12px rgba(255, 219, 77, 0.6);
    }

    .ym-genius-annotation-welcome {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      text-align: center;
      opacity: 0.85;
    }

    .ym-genius-annotation-body {
      font-size: 15px;
      line-height: 1.6;
      font-family: "YS Text", sans-serif;
      color: rgba(255, 255, 255, 0.85);
    }
    .ym-genius-annotation-body p {
      margin: 0 0 16px 0;
    }
    .ym-genius-annotation-body p:last-child {
      margin-bottom: 0;
    }
    .ym-genius-annotation-body a {
      color: #ffdb4d;
      text-decoration: none;
      border-bottom: 1px dashed rgba(255, 219, 77, 0.4);
      transition: all 0.2s ease;
    }
    .ym-genius-annotation-body a:hover {
      color: #ffe880;
      border-bottom-color: #ffe880;
    }
    .ym-genius-annotation-body blockquote {
      border-left: 3px solid #ffdb4d;
      margin: 0 0 16px 0;
      padding: 4px 0 4px 16px;
      font-style: italic;
      color: rgba(255, 255, 255, 0.7);
      background: rgba(255, 255, 255, 0.02);
      border-radius: 0 8px 8px 0;
    }
    .ym-genius-annotation-body img {
      max-width: 100%;
      height: auto;
      border-radius: 12px;
      margin: 14px 0;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .ym-hidden {
      display: none !important;
    }

    /* ==========================================
       WRAPPED UI (Локальная статистика)
       ========================================== */
    .ym-wrapped-profile-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: calc(100% - 32px);
      margin: 8px 16px 16px 16px;
      padding: 10px 16px;
      background: rgba(255, 219, 77, 0.1);
      color: #ffdb4d;
      border: 1px solid rgba(255, 219, 77, 0.2);
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: "YS Text", "Yandex Sans Text", sans-serif;
      box-sizing: border-box;
    }
    .ym-wrapped-profile-btn:hover {
      background: rgba(255, 219, 77, 0.2);
      transform: scale(0.98);
    }
    
    #ym-wrapped-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999;
      background: rgba(18, 18, 20, 0.85);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      display: flex;
      justify-content: center;
      align-items: center;
      transition: opacity 0.4s ease, visibility 0.4s ease;
    }
    
    .ym-wrapped-overlay-hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
    
    .ym-wrapped-overlay-visible {
      opacity: 1;
      visibility: visible;
      pointer-events: all;
    }

    .ym-wrapped-content {
      position: relative;
      width: 90%;
      max-width: 900px;
      height: 85vh;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
      padding: 40px;
      display: flex;
      flex-direction: column;
      transform: translateY(20px) scale(0.95);
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      overflow: hidden;
    }
    
    .ym-wrapped-overlay-visible .ym-wrapped-content {
      transform: translateY(0) scale(1);
    }

    .ym-wrapped-close {
      position: absolute;
      top: 24px;
      right: 24px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      cursor: pointer;
      transition: all 0.2s ease;
      z-index: 10;
    }
    .ym-wrapped-close:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1) rotate(90deg);
    }
    
    .ym-wrapped-header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .ym-wrapped-header h1 {
      font-size: 42px;
      font-weight: 800;
      margin: 0 0 8px 0;
      background: linear-gradient(135deg, #ffdb4d, #ff8c00);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -1px;
    }
    
    .ym-wrapped-header p {
      font-size: 16px;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .ym-wrapped-body {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    /* Custom modern scrollbars for Wrapped */
    #ym-wrapped-overlay * {
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }
    #ym-wrapped-overlay *::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    #ym-wrapped-overlay *::-webkit-scrollbar-track {
      background: transparent;
    }
    #ym-wrapped-overlay *::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.18);
      border-radius: 999px;
      transition: background 0.2s ease;
    }
    #ym-wrapped-overlay *::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.35);
    }
    #ym-wrapped-overlay *::-webkit-scrollbar-button,
    #ym-wrapped-overlay *::-webkit-scrollbar-corner {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }

    /* Track Downloader Button in Player */
    .ym-player-download-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: transparent !important;
      border: none !important;
      color: rgba(255, 255, 255, 0.6) !important;
      width: 32px !important;
      height: 32px !important;
      padding: 0 !important;
      margin-right: 6px !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      transition: color 0.15s ease, opacity 0.15s ease !important;
      outline: none !important;
      position: relative !important;
      z-index: 3 !important;
      vertical-align: middle !important;
      transform: none !important;
    }
    .ym-player-download-btn:hover {
      color: #ffffff !important;
      background: transparent !important;
      transform: none !important;
    }
    .ym-player-download-btn:active {
      transform: none !important;
    }
    .ym-player-download-btn svg {
      width: 18px !important;
      height: 18px !important;
      stroke: currentColor !important;
      transition: stroke 0.2s ease !important;
      display: block !important;
    }
    .ym-player-download-btn.ym-downloading {
      color: #ffdb4d !important;
      background: transparent !important;
      pointer-events: none !important;
    }
    .ym-download-spinner {
      animation: ym-dl-spin 0.8s linear infinite !important;
    }
    @keyframes ym-dl-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .ym-player-download-btn.ym-download-success {
      color: #ffdb4d !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    .ym-player-download-btn.ym-download-error {
      color: #ff4d4d !important;
      background: transparent !important;
    }

    /* Track Row Download Button in Lists / Collection */
    .ym-track-row-download-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: transparent !important;
      border: none !important;
      color: rgba(255, 255, 255, 0.55) !important;
      width: 32px !important;
      height: 32px !important;
      padding: 0 !important;
      margin: 0 4px !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      opacity: 0.75 !important;
      transition: opacity 0.15s ease, color 0.15s ease !important;
      outline: none !important;
      vertical-align: middle !important;
      flex-shrink: 0 !important;
      transform: none !important;
    }
    .ym-track-row-download-btn svg {
      width: 17px !important;
      height: 17px !important;
      display: block !important;
    }
    /* Hover and active states */
    [class*="CommonTrack_root"]:hover .ym-track-row-download-btn,
    [class*="HorizontalCardContainer_root"]:hover .ym-track-row-download-btn,
    .ym-track-row-download-btn.ym-row-dl-active {
      opacity: 0.9 !important;
    }
    .ym-track-row-download-btn:hover {
      color: #ffffff !important;
      opacity: 1 !important;
      transform: none !important;
    }
    .ym-track-row-download-btn:active {
      transform: none !important;
    }
    .ym-track-row-download-btn.ym-row-dl-loading {
      color: #ffdb4d !important;
      opacity: 1 !important;
      pointer-events: none !important;
      transform: none !important;
    }
    .ym-track-row-download-btn.ym-row-dl-success {
      color: #ffdb4d !important;
      opacity: 1 !important;
      transform: none !important;
    }
    .ym-track-row-download-btn.ym-row-dl-error {
      color: #ff4d4d !important;
      opacity: 1 !important;
      transform: none !important;
    }

    /* Playlist / Album Header "Скачать в ZIP" Button */
    .ym-playlist-download-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      background: rgba(255, 255, 255, 0.08) !important;
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
      color: #ffffff !important;
      height: 44px;
      min-height: 40px;
      max-height: 48px !important;
      padding: 0 16px !important;
      border-radius: 9999px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      font-family: 'YS Text', 'Yandex Sans Text', -apple-system, BlinkMacSystemFont, Arial, sans-serif !important;
      line-height: 20px !important;
      cursor: pointer !important;
      transition: background-color 0.15s ease !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      vertical-align: middle !important;
      user-select: none !important;
      white-space: nowrap !important;
      flex: 0 0 auto !important;
      flex-shrink: 0 !important;
      width: auto !important;
      min-width: max-content !important;
      max-width: none !important;
      transform: none !important;
    }
    @media (min-width: 1280px) {
      .ym-playlist-download-btn {
        height: 48px;
        min-height: 48px;
        max-height: 48px !important;
        padding: 0 20px !important;
        font-size: 15px !important;
      }
      .ym-playlist-download-btn svg {
        width: 18px !important;
        height: 18px !important;
      }
    }
    .ym-playlist-download-btn:hover {
      background: rgba(255, 255, 255, 0.12) !important;
      border: none !important;
      box-shadow: none !important;
      transform: none !important;
    }
    .ym-playlist-download-btn:active {
      background: rgba(255, 255, 255, 0.18) !important;
      border: none !important;
      box-shadow: none !important;
      transform: none !important;
    }
    .ym-playlist-download-btn svg {
      width: 16px !important;
      height: 16px !important;
      stroke: currentColor !important;
      flex-shrink: 0 !important;
    }
    .ym-playlist-download-btn span {
      font-family: 'YS Text', 'Yandex Sans Text', -apple-system, BlinkMacSystemFont, Arial, sans-serif !important;
      font-weight: 500 !important;
      font-size: 14px !important;
      line-height: 20px !important;
      letter-spacing: normal !important;
      white-space: nowrap !important;
      display: inline !important;
      flex-shrink: 0 !important;
    }

    /* Floating Batch Download Progress Widget */
    #ym-batch-download-widget {
      position: fixed;
      bottom: 125px;
      right: 0;
      z-index: 9999999;
      pointer-events: none;
      font-family: Yandex Sans Text, system-ui, sans-serif;
      transition: bottom 0.35s cubic-bezier(0.25, 1, 0.5, 1);
    }

    /* Расположение виджета ближе к нижнему краю на главной странице */
    #ym-batch-download-widget.ym-bottom-low {
      bottom: 24px !important;
    }

    /* Развернутая карточка скачивания */
    #ym-batch-download-widget .ym-batch-full-content {
      position: absolute;
      bottom: 0;
      right: 20px;
      width: 320px;
      background: rgba(24, 24, 28, 0.94);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      padding: 14px 16px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      color: #ffffff;
      box-sizing: border-box;
      transform: translateX(0);
      opacity: 1;
      pointer-events: auto;
      user-select: none;
      transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1),
                  opacity 0.24s ease;
      animation: ym-batch-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes ym-batch-in {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }

    /* При сворачивании карточка плавно уезжает за правый край экрана */
    #ym-batch-download-widget.ym-batch-minimized .ym-batch-full-content {
      transform: translateX(calc(100% + 30px));
      opacity: 0;
      pointer-events: none;
    }

    /* Минималистичный боковой ярлычок (Edge Tab) без лишнего свечения */
    #ym-batch-download-widget .ym-batch-mini-content {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 44px;
      padding: 0;
      border-radius: 10px 0 0 10px;
      background: rgba(26, 26, 30, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-right: none;
      box-shadow: -2px 4px 12px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      transform: translateX(100%);
      opacity: 0;
      pointer-events: none;
      cursor: pointer;
      user-select: none;
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
                  opacity 0.2s ease,
                  background 0.2s ease,
                  border-color 0.2s ease,
                  box-shadow 0.2s ease;
    }

    /* При сворачивании ярлычок мягко выдвигается из правого края экрана */
    #ym-batch-download-widget.ym-batch-minimized .ym-batch-mini-content {
      transform: translateX(0);
      opacity: 1;
      pointer-events: auto;
    }
    #ym-batch-download-widget.ym-batch-minimized .ym-batch-mini-content:hover {
      background: rgba(34, 34, 40, 0.96);
      border-color: rgba(255, 255, 255, 0.24);
      box-shadow: -3px 6px 16px rgba(0, 0, 0, 0.45);
    }
    #ym-batch-download-widget.ym-batch-minimized .ym-batch-mini-content:hover .ym-batch-edge-arrow {
      transform: translateX(-1px);
      color: #ffffff;
    }

    #ym-batch-download-widget .ym-batch-edge-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.65);
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      transition: transform 0.18s ease, color 0.18s ease;
      z-index: 2;
    }

    /* Вертикальная микро-полоска прогресса на левом торце ярлычка */
    #ym-batch-download-widget .ym-batch-edge-progress-bar {
      position: absolute;
      left: 0;
      bottom: 0;
      width: 2px;
      height: 100%;
      background: rgba(255, 255, 255, 0.08);
      z-index: 1;
    }
    #ym-batch-download-widget .ym-batch-edge-progress-fill {
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100%;
      height: 0%;
      background: #ffdb4d;
      transition: height 0.25s ease;
    }

    #ym-batch-download-widget .ym-batch-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    #ym-batch-download-widget .ym-batch-title {
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 195px;
    }
    #ym-batch-download-widget .ym-batch-header-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    #ym-batch-download-widget .ym-batch-count {
      font-size: 11px;
      font-weight: 600;
      color: #ffdb4d;
    }
    #ym-batch-download-widget .ym-batch-minimize-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      padding: 3px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s ease, background 0.15s ease, transform 0.15s ease;
      line-height: 1;
    }
    #ym-batch-download-widget .ym-batch-minimize-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.12);
      transform: translateY(1px);
    }
    #ym-batch-download-widget .ym-batch-current {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 10px;
    }
    #ym-batch-download-widget .ym-batch-bar-bg {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    #ym-batch-download-widget .ym-batch-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #ffdb4d, #ffa500);
      border-radius: 3px;
      width: 0%;
      transition: width 0.25s ease;
    }
    #ym-batch-download-widget .ym-batch-actions {
      display: flex;
      justify-content: flex-end;
    }
    #ym-batch-download-widget .ym-batch-cancel-btn {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: rgba(255, 255, 255, 0.7);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    #ym-batch-download-widget .ym-batch-cancel-btn:hover {
      background: rgba(255, 77, 77, 0.2);
      color: #ff4d4d;
    }

    /* Запрет отображения кнопок нижней панели внутри полноэкранного режима или на обложке */
    [class*="FullscreenPlayer"] #ym-player-quality-indicator,
    [class*="FullscreenPlayer"] #ym-player-download-btn,
    [class*="VibePlayer"] #ym-player-quality-indicator,
    [class*="VibePlayer"] #ym-player-download-btn,
    [class*="Cover_root"] #ym-player-quality-indicator,
    [class*="Cover_root"] #ym-player-download-btn,
    [class*="coverContainer"] #ym-player-quality-indicator,
    [class*="coverContainer"] #ym-player-download-btn,
    [class*="VibeCover"] #ym-player-quality-indicator,
    [class*="VibeCover"] #ym-player-download-btn {
      display: none !important;
    }

    /* Version Button (Desktop & Web) */
    .ym-version-btn {
      user-select: none;
      -webkit-user-select: none;
      cursor: pointer;
      font-family: Yandex Sans Text, system-ui, sans-serif;
      border-radius: 9999px !important;
      border: none !important;
      outline: none !important;
      transform: none !important;
      box-shadow: none !important;
      transition: color 0.15s ease, background 0.15s ease, opacity 0.15s ease, bottom 0.35s cubic-bezier(0.25, 1, 0.5, 1) !important;
    }

    [class*="MainPage_betaSlot"],
    [class*="betaSlot"],
    .ym-version-container-flex {
      display: inline-flex !important;
      flex-direction: row !important;
      align-items: center !important;
      flex-wrap: nowrap !important;
      gap: 8px !important;
    }

    [class*="MainPage_betaSlot"] > button,
    [class*="betaSlot"] > button,
    .ym-version-container-flex > button {
      margin-top: 0 !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      vertical-align: middle !important;
    }

    .ym-version-btn-desktop {
      margin: 0 !important;
      margin-block-end: var(--ym-spacer-size-m, 12px) !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 9999px !important;
      border: none !important;
      transform: none !important;
      flex-shrink: 0 !important;
      white-space: nowrap !important;
      vertical-align: middle !important;
    }
    .ym-version-btn-desktop:hover,
    .ym-version-btn-desktop:active {
      opacity: 0.9;
      transform: none !important;
      border: none !important;
    }
    .ym-version-btn-web {
      position: fixed;
      bottom: 20px;
      right: 28px;
      z-index: 99998;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: none !important;
      border-radius: 9999px !important;
      padding: 5px 12px;
      color: rgba(255, 255, 255, 0.55);
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.2px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: none !important;
      transform: none !important;
    }
    .ym-version-btn-web:hover,
    .ym-version-btn-web:active {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      border: none !important;
      transform: none !important;
    }

    /* Release Notes Modal */
    .ym-rn-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 10000000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      padding: 16px;
      box-sizing: border-box;
    }
    .ym-rn-overlay.ym-rn-active {
      opacity: 1;
      pointer-events: auto;
    }
    .ym-rn-modal {
      background: #18181c;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      width: 480px;
      max-width: 100%;
      max-height: 84vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
      transform: scale(0.94);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
      font-family: Yandex Sans Text, system-ui, sans-serif;
      color: #ffffff;
      box-sizing: border-box;
    }
    .ym-rn-overlay.ym-rn-active .ym-rn-modal {
      transform: scale(1);
    }
    .ym-rn-header {
      padding: 22px 24px 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    }
    .ym-rn-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ym-rn-title {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.2px;
    }
    .ym-rn-badge {
      background: rgba(255, 219, 77, 0.15);
      color: #ffdb4d;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid rgba(255, 219, 77, 0.25);
    }
    .ym-rn-close-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      padding: 0;
    }
    .ym-rn-close-btn:hover {
      background: rgba(255, 255, 255, 0.16);
      color: #ffffff;
    }
    .ym-rn-body {
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1;
    }
    .ym-rn-body::-webkit-scrollbar {
      width: 6px;
    }
    .ym-rn-body::-webkit-scrollbar-track {
      background: transparent;
    }
    .ym-rn-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.16);
      border-radius: 3px;
    }
    .ym-rn-body::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.28);
    }
    .ym-rn-entry {
      margin-bottom: 24px;
    }
    .ym-rn-entry:last-child {
      margin-bottom: 0;
    }
    .ym-rn-version-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 2px;
    }
    .ym-rn-version {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
    }
    .ym-rn-curr-tag {
      font-size: 10px;
      font-weight: 700;
      color: #ffdb4d;
      background: rgba(255, 219, 77, 0.15);
      border: 1px solid rgba(255, 219, 77, 0.3);
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .ym-rn-date {
      font-size: 12.5px;
      color: rgba(255, 255, 255, 0.45);
      margin-bottom: 12px;
    }
    .ym-rn-list {
      margin: 0;
      padding-left: 18px;
      color: rgba(255, 255, 255, 0.82);
      font-size: 13.5px;
      line-height: 1.6;
    }
    .ym-rn-list li {
      margin-bottom: 6px;
    }
    .ym-rn-list li:last-child {
      margin-bottom: 0;
    }
    .ym-rn-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
      margin: 22px 0;
    }
    .ym-rn-footer {
      padding: 12px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(0, 0, 0, 0.2);
    }
    .ym-rn-github-link {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: rgba(255, 255, 255, 0.55);
      font-size: 12px;
      text-decoration: none;
      transition: color 0.15s ease;
    }
    .ym-rn-github-link:hover {
      color: #ffdb4d;
    }

    /* =========================================================================
       My Vibe Carousel Redesign & Vibe Popover
       ========================================================================= */

    /* Mode: Hide Wheel Carousel without breaking Swiper/MobX virtualization */
    body.ym-vibe-no-wheel [class*="WheelDesktop_root"],
    body.ym-vibe-no-wheel [class*="VibePage_wheel"] {
      position: absolute !important;
      left: -9999px !important;
      top: -9999px !important;
      width: 320px !important;
      height: 600px !important;
      opacity: 0 !important;
      pointer-events: none !important;
      overflow: hidden !important;
      z-index: -999 !important;
    }

    /* Bulletproof Transparent sidebar in No Wheel mode */
    html.ym-vibe-no-wheel aside,
    body.ym-vibe-no-wheel aside,
    html.ym-vibe-no-wheel aside[class*="Navbar"],
    body.ym-vibe-no-wheel aside[class*="Navbar"],
    html.ym-vibe-no-wheel [class*="Navbar_root"],
    body.ym-vibe-no-wheel [class*="Navbar_root"],
    html.ym-vibe-no-wheel [class*="DefaultLayout_navbar"],
    body.ym-vibe-no-wheel [class*="DefaultLayout_navbar"],
    html.ym-vibe-no-wheel [class*="NavbarDesktop_root"],
    body.ym-vibe-no-wheel [class*="NavbarDesktop_root"],
    html.ym-vibe-no-wheel [class*="NavbarDesktop_logoWrapper"],
    body.ym-vibe-no-wheel [class*="NavbarDesktop_logoWrapper"],
    html.ym-vibe-no-wheel [class*="NavbarDesktop_scrollableContainer"],
    body.ym-vibe-no-wheel [class*="NavbarDesktop_scrollableContainer"],
    html.ym-vibe-no-wheel [class*="NavbarDesktop_scrollableContent"],
    body.ym-vibe-no-wheel [class*="NavbarDesktop_scrollableContent"],
    html.ym-vibe-no-wheel [class*="NavbarDesktop_navigation"],
    body.ym-vibe-no-wheel [class*="NavbarDesktop_navigation"],
    html.ym-vibe-no-wheel [class*="NavbarDesktop_navigation_new"],
    body.ym-vibe-no-wheel [class*="NavbarDesktop_navigation_new"],
    html.ym-vibe-no-wheel [class*="NavbarDesktop_navigationGroup"],
    body.ym-vibe-no-wheel [class*="NavbarDesktop_navigationGroup"],
    html.ym-vibe-no-wheel [class*="SidebarDesktop"],
    body.ym-vibe-no-wheel [class*="SidebarDesktop"],
    html.ym-vibe-no-wheel [class*="NavbarDesktop_pinsList"],
    body.ym-vibe-no-wheel [class*="NavbarDesktop_pinsList"],
    html.ym-vibe-no-wheel [class*="PinsList_root"],
    body.ym-vibe-no-wheel [class*="PinsList_root"],
    html.ym-vibe-no-wheel [class*="NavbarDesktopUserWidget"],
    body.ym-vibe-no-wheel [class*="NavbarDesktopUserWidget"],
    html.ym-vibe-no-wheel [class*="UserProfile_root"],
    body.ym-vibe-no-wheel [class*="UserProfile_root"],
    html.ym-vibe-no-wheel aside.Navbar_root__chF4R,
    body.ym-vibe-no-wheel aside.Navbar_root__chF4R,
    html.ym-vibe-no-wheel aside.DefaultLayout_navbar__LIQWG,
    body.ym-vibe-no-wheel aside.DefaultLayout_navbar__LIQWG,
    html.ym-vibe-no-wheel div.NavbarDesktop_root__scYzp,
    body.ym-vibe-no-wheel div.NavbarDesktop_root__scYzp,
    html.ym-vibe-no-wheel div.NavbarDesktop_scrollableContainer__HLc9D,
    body.ym-vibe-no-wheel div.NavbarDesktop_scrollableContainer__HLc9D,
    html.ym-vibe-no-wheel div.NavbarDesktop_scrollableContent__OyU4P,
    body.ym-vibe-no-wheel div.NavbarDesktop_scrollableContent__OyU4P,
    html.ym-vibe-no-wheel nav.NavbarDesktop_navigation__dLUGW,
    body.ym-vibe-no-wheel nav.NavbarDesktop_navigation__dLUGW,
    html.ym-vibe-no-wheel nav.NavbarDesktop_navigation_new__0j8W5,
    body.ym-vibe-no-wheel nav.NavbarDesktop_navigation_new__0j8W5,
    html.ym-vibe-no-wheel nav.NGdj0oZ2Bt8qdZhP2Tzt,
    body.ym-vibe-no-wheel nav.NGdj0oZ2Bt8qdZhP2Tzt,
    html.ym-vibe-no-wheel nav.QilmoKKJwk6f0BdkYgrA,
    body.ym-vibe-no-wheel nav.QilmoKKJwk6f0BdkYgrA,
    html.ym-vibe-no-wheel ol.NavbarDesktop_navigationGroup__eexLF,
    body.ym-vibe-no-wheel ol.NavbarDesktop_navigationGroup__eexLF,
    html.ym-vibe-no-wheel ol.yuyI2hMAT7qyL1N14MAQ,
    body.ym-vibe-no-wheel ol.yuyI2hMAT7qyL1N14MAQ,
    html.ym-vibe-no-wheel ol.xfFtKQpgAYvC2jI1tBtS,
    body.ym-vibe-no-wheel ol.xfFtKQpgAYvC2jI1tBtS {
      background: transparent !important;
      background-color: transparent !important;
      border: none !important;
      border-right: none !important;
      box-shadow: none !important;
    }
    html.ym-vibe-no-wheel aside::before,
    body.ym-vibe-no-wheel aside::before,
    html.ym-vibe-no-wheel aside::after,
    body.ym-vibe-no-wheel aside::after,
    html.ym-vibe-no-wheel [class*="Navbar"]::before,
    body.ym-vibe-no-wheel [class*="Navbar"]::before,
    html.ym-vibe-no-wheel [class*="Navbar"]::after,
    body.ym-vibe-no-wheel [class*="Navbar"]::after {
      display: none !important;
      background: transparent !important;
    }

    /* Only show trigger button in no_wheel mode */
    body:not(.ym-vibe-no-wheel) #ym-vibe-settings-btn {
      display: none !important;
    }

    /* Context container (Мне нравится ✕) */
    [class*="VibePage_context"] {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin-bottom: 6px !important;
    }

    /* Ensure Vibe Meta stacks vertically centered */
    body.ym-vibe-no-wheel [class*="VibePage_meta"] {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
    }

    /* Trigger Button (Clean, no border, placed vertically UNDER the context button) */
    .ym-vibe-settings-trigger-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      align-self: center !important;
      margin: 4px auto 12px auto !important;
      padding: 7px 18px;
      border-radius: 9999px;
      border: none !important;
      outline: none !important;
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      user-select: none;
      z-index: 10;
    }
    .ym-vibe-settings-trigger-btn:hover {
      background: rgba(255, 255, 255, 0.16);
      border: none !important;
      color: #ffdb4d;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25), 0 0 12px rgba(255, 219, 77, 0.2);
      transform: translateY(-1px);
    }
    .ym-vibe-settings-trigger-btn:active {
      transform: translateY(0) scale(0.98);
    }

    /* Popover Container */
    .ym-vibe-popover {
      position: fixed;
      z-index: 999999;
      width: 380px;
      max-height: 500px;
      display: flex;
      flex-direction: column;
      background: rgba(20, 20, 24, 0.92);
      backdrop-filter: blur(28px) saturate(190%);
      -webkit-backdrop-filter: blur(28px) saturate(190%);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
      color: #ffffff;
      font-family: "YS Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-sizing: border-box;
      overflow: hidden;
      animation: ymVibePopoverIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      transform-origin: top center;
    }
    .ym-vibe-popover.closing {
      animation: ymVibePopoverOut 0.16s cubic-bezier(0.4, 0, 1, 1) forwards;
    }
    @keyframes ymVibePopoverIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-6px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    @keyframes ymVibePopoverOut {
      from {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      to {
        opacity: 0;
        transform: scale(0.95) translateY(-6px);
      }
    }

    /* Popover Header */
    .ym-vibe-popover-header {
      padding: 16px 18px 10px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ym-vibe-popover-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .ym-vibe-popover-title {
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
      font-family: "YSMusic Headline", sans-serif;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ym-vibe-popover-close-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.4);
      font-size: 15px;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      transition: color 0.15s, background 0.15s;
      line-height: 1;
    }
    .ym-vibe-popover-close-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }

    /* Categories Bar */
    .ym-vibe-categories-bar {
      display: flex;
      align-items: center;
      gap: 7px;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 4px 2px 6px 2px;
      scrollbar-width: none;
      -ms-overflow-style: none;
      cursor: grab;
      user-select: none;
    }
    .ym-vibe-categories-bar::-webkit-scrollbar {
      display: none;
    }
    .ym-vibe-cat-chip {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      padding: 4px 11px;
      font-size: 11.5px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .ym-vibe-cat-chip:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }
    .ym-vibe-cat-chip.active {
      background: #ffdb4d;
      border-color: #ffdb4d;
      color: #000000;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(255, 219, 77, 0.3);
    }

    /* List Container */
    .ym-vibe-popover-list {
      flex: 1;
      overflow-y: auto;
      max-height: 330px;
      padding: 8px 10px 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
    }
    .ym-vibe-popover-list::-webkit-scrollbar {
      width: 5px;
    }
    .ym-vibe-popover-list::-webkit-scrollbar-track {
      background: transparent;
    }
    .ym-vibe-popover-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.18);
      border-radius: 9999px;
    }
    .ym-vibe-popover-list::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 219, 77, 0.6);
    }

    /* Item Card */
    .ym-vibe-item-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: 12px;
      cursor: pointer;
      background: transparent;
      border: 1px solid transparent;
      transition: all 0.18s cubic-bezier(0.2, 0, 0, 1);
      position: relative;
    }
    .ym-vibe-item-card:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.1);
      transform: translateX(2px);
    }
    .ym-vibe-item-card:hover .ym-vibe-item-play-btn {
      opacity: 1;
      transform: scale(1);
    }
    .ym-vibe-item-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex: 1;
    }
    .ym-vibe-item-cover {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      object-fit: cover;
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .ym-vibe-item-cover-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ym-vibe-item-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      gap: 2px;
    }
    .ym-vibe-item-name {
      font-size: 13.5px;
      font-weight: 600;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ym-vibe-item-desc {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.45);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ym-vibe-item-play-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #ffdb4d;
      color: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: scale(0.85);
      transition: all 0.18s cubic-bezier(0.2, 0, 0, 1);
      flex-shrink: 0;
      margin-left: 8px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    }
    .ym-vibe-item-play-btn svg {
      margin-left: 2px;
    }

    .ym-vibe-empty {
      padding: 30px 16px;
      text-align: center;
      color: rgba(255, 255, 255, 0.45);
      font-size: 13px;
      line-height: 1.5;
    }

  `;
  document.head.appendChild(style);
}