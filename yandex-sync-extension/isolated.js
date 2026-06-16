// --- Component: shared/styles.js ---
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
  `;
  document.head.appendChild(style);
}

// --- Component: shared/md5.js ---
/*
 * JavaScript MD5
 * https://github.com/blueimp/JavaScript-MD5
 *
 * Copyright 2011, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * https://opensource.org/licenses/MIT
 *
 * Based on
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/* global define */

/* eslint-disable strict */

;(function ($) {
  'use strict'

  /**
   * Add integers, wrapping at 2^32.
   * This uses 16-bit operations internally to work around bugs in interpreters.
   *
   * @param {number} x First integer
   * @param {number} y Second integer
   * @returns {number} Sum
   */
  function safeAdd(x, y) {
    var lsw = (x & 0xffff) + (y & 0xffff)
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16)
    return (msw << 16) | (lsw & 0xffff)
  }

  /**
   * Bitwise rotate a 32-bit number to the left.
   *
   * @param {number} num 32-bit number
   * @param {number} cnt Rotation count
   * @returns {number} Rotated number
   */
  function bitRotateLeft(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt))
  }

  /**
   * Basic operation the algorithm uses.
   *
   * @param {number} q q
   * @param {number} a a
   * @param {number} b b
   * @param {number} x x
   * @param {number} s s
   * @param {number} t t
   * @returns {number} Result
   */
  function md5cmn(q, a, b, x, s, t) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b)
  }
  /**
   * Basic operation the algorithm uses.
   *
   * @param {number} a a
   * @param {number} b b
   * @param {number} c c
   * @param {number} d d
   * @param {number} x x
   * @param {number} s s
   * @param {number} t t
   * @returns {number} Result
   */
  function md5ff(a, b, c, d, x, s, t) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t)
  }
  /**
   * Basic operation the algorithm uses.
   *
   * @param {number} a a
   * @param {number} b b
   * @param {number} c c
   * @param {number} d d
   * @param {number} x x
   * @param {number} s s
   * @param {number} t t
   * @returns {number} Result
   */
  function md5gg(a, b, c, d, x, s, t) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t)
  }
  /**
   * Basic operation the algorithm uses.
   *
   * @param {number} a a
   * @param {number} b b
   * @param {number} c c
   * @param {number} d d
   * @param {number} x x
   * @param {number} s s
   * @param {number} t t
   * @returns {number} Result
   */
  function md5hh(a, b, c, d, x, s, t) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t)
  }
  /**
   * Basic operation the algorithm uses.
   *
   * @param {number} a a
   * @param {number} b b
   * @param {number} c c
   * @param {number} d d
   * @param {number} x x
   * @param {number} s s
   * @param {number} t t
   * @returns {number} Result
   */
  function md5ii(a, b, c, d, x, s, t) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t)
  }

  /**
   * Calculate the MD5 of an array of little-endian words, and a bit length.
   *
   * @param {Array} x Array of little-endian words
   * @param {number} len Bit length
   * @returns {Array<number>} MD5 Array
   */
  function binlMD5(x, len) {
    /* append padding */
    x[len >> 5] |= 0x80 << len % 32
    x[(((len + 64) >>> 9) << 4) + 14] = len

    var i
    var olda
    var oldb
    var oldc
    var oldd
    var a = 1732584193
    var b = -271733879
    var c = -1732584194
    var d = 271733878

    for (i = 0; i < x.length; i += 16) {
      olda = a
      oldb = b
      oldc = c
      oldd = d

      a = md5ff(a, b, c, d, x[i], 7, -680876936)
      d = md5ff(d, a, b, c, x[i + 1], 12, -389564586)
      c = md5ff(c, d, a, b, x[i + 2], 17, 606105819)
      b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330)
      a = md5ff(a, b, c, d, x[i + 4], 7, -176418897)
      d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426)
      c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341)
      b = md5ff(b, c, d, a, x[i + 7], 22, -45705983)
      a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416)
      d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417)
      c = md5ff(c, d, a, b, x[i + 10], 17, -42063)
      b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162)
      a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682)
      d = md5ff(d, a, b, c, x[i + 13], 12, -40341101)
      c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290)
      b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329)

      a = md5gg(a, b, c, d, x[i + 1], 5, -165796510)
      d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632)
      c = md5gg(c, d, a, b, x[i + 11], 14, 643717713)
      b = md5gg(b, c, d, a, x[i], 20, -373897302)
      a = md5gg(a, b, c, d, x[i + 5], 5, -701558691)
      d = md5gg(d, a, b, c, x[i + 10], 9, 38016083)
      c = md5gg(c, d, a, b, x[i + 15], 14, -660478335)
      b = md5gg(b, c, d, a, x[i + 4], 20, -405537848)
      a = md5gg(a, b, c, d, x[i + 9], 5, 568446438)
      d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690)
      c = md5gg(c, d, a, b, x[i + 3], 14, -187363961)
      b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501)
      a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467)
      d = md5gg(d, a, b, c, x[i + 2], 9, -51403784)
      c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473)
      b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734)

      a = md5hh(a, b, c, d, x[i + 5], 4, -378558)
      d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463)
      c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562)
      b = md5hh(b, c, d, a, x[i + 14], 23, -35309556)
      a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060)
      d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353)
      c = md5hh(c, d, a, b, x[i + 7], 16, -155497632)
      b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640)
      a = md5hh(a, b, c, d, x[i + 13], 4, 681279174)
      d = md5hh(d, a, b, c, x[i], 11, -358537222)
      c = md5hh(c, d, a, b, x[i + 3], 16, -722521979)
      b = md5hh(b, c, d, a, x[i + 6], 23, 76029189)
      a = md5hh(a, b, c, d, x[i + 9], 4, -640364487)
      d = md5hh(d, a, b, c, x[i + 12], 11, -421815835)
      c = md5hh(c, d, a, b, x[i + 15], 16, 530742520)
      b = md5hh(b, c, d, a, x[i + 2], 23, -995338651)

      a = md5ii(a, b, c, d, x[i], 6, -198630844)
      d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415)
      c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905)
      b = md5ii(b, c, d, a, x[i + 5], 21, -57434055)
      a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571)
      d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606)
      c = md5ii(c, d, a, b, x[i + 10], 15, -1051523)
      b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799)
      a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359)
      d = md5ii(d, a, b, c, x[i + 15], 10, -30611744)
      c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380)
      b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649)
      a = md5ii(a, b, c, d, x[i + 4], 6, -145523070)
      d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379)
      c = md5ii(c, d, a, b, x[i + 2], 15, 718787259)
      b = md5ii(b, c, d, a, x[i + 9], 21, -343485551)

      a = safeAdd(a, olda)
      b = safeAdd(b, oldb)
      c = safeAdd(c, oldc)
      d = safeAdd(d, oldd)
    }
    return [a, b, c, d]
  }

  /**
   * Convert an array of little-endian words to a string
   *
   * @param {Array<number>} input MD5 Array
   * @returns {string} MD5 string
   */
  function binl2rstr(input) {
    var i
    var output = ''
    var length32 = input.length * 32
    for (i = 0; i < length32; i += 8) {
      output += String.fromCharCode((input[i >> 5] >>> i % 32) & 0xff)
    }
    return output
  }

  /**
   * Convert a raw string to an array of little-endian words
   * Characters >255 have their high-byte silently ignored.
   *
   * @param {string} input Raw input string
   * @returns {Array<number>} Array of little-endian words
   */
  function rstr2binl(input) {
    var i
    var output = []
    output[(input.length >> 2) - 1] = undefined
    for (i = 0; i < output.length; i += 1) {
      output[i] = 0
    }
    var length8 = input.length * 8
    for (i = 0; i < length8; i += 8) {
      output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << i % 32
    }
    return output
  }

  /**
   * Calculate the MD5 of a raw string
   *
   * @param {string} s Input string
   * @returns {string} Raw MD5 string
   */
  function rstrMD5(s) {
    return binl2rstr(binlMD5(rstr2binl(s), s.length * 8))
  }

  /**
   * Calculates the HMAC-MD5 of a key and some data (raw strings)
   *
   * @param {string} key HMAC key
   * @param {string} data Raw input string
   * @returns {string} Raw MD5 string
   */
  function rstrHMACMD5(key, data) {
    var i
    var bkey = rstr2binl(key)
    var ipad = []
    var opad = []
    var hash
    ipad[15] = opad[15] = undefined
    if (bkey.length > 16) {
      bkey = binlMD5(bkey, key.length * 8)
    }
    for (i = 0; i < 16; i += 1) {
      ipad[i] = bkey[i] ^ 0x36363636
      opad[i] = bkey[i] ^ 0x5c5c5c5c
    }
    hash = binlMD5(ipad.concat(rstr2binl(data)), 512 + data.length * 8)
    return binl2rstr(binlMD5(opad.concat(hash), 512 + 128))
  }

  /**
   * Convert a raw string to a hex string
   *
   * @param {string} input Raw input string
   * @returns {string} Hex encoded string
   */
  function rstr2hex(input) {
    var hexTab = '0123456789abcdef'
    var output = ''
    var x
    var i
    for (i = 0; i < input.length; i += 1) {
      x = input.charCodeAt(i)
      output += hexTab.charAt((x >>> 4) & 0x0f) + hexTab.charAt(x & 0x0f)
    }
    return output
  }

  /**
   * Encode a string as UTF-8
   *
   * @param {string} input Input string
   * @returns {string} UTF8 string
   */
  function str2rstrUTF8(input) {
    return unescape(encodeURIComponent(input))
  }

  /**
   * Encodes input string as raw MD5 string
   *
   * @param {string} s Input string
   * @returns {string} Raw MD5 string
   */
  function rawMD5(s) {
    return rstrMD5(str2rstrUTF8(s))
  }
  /**
   * Encodes input string as Hex encoded string
   *
   * @param {string} s Input string
   * @returns {string} Hex encoded string
   */
  function hexMD5(s) {
    return rstr2hex(rawMD5(s))
  }
  /**
   * Calculates the raw HMAC-MD5 for the given key and data
   *
   * @param {string} k HMAC key
   * @param {string} d Input string
   * @returns {string} Raw MD5 string
   */
  function rawHMACMD5(k, d) {
    return rstrHMACMD5(str2rstrUTF8(k), str2rstrUTF8(d))
  }
  /**
   * Calculates the Hex encoded HMAC-MD5 for the given key and data
   *
   * @param {string} k HMAC key
   * @param {string} d Input string
   * @returns {string} Raw MD5 string
   */
  function hexHMACMD5(k, d) {
    return rstr2hex(rawHMACMD5(k, d))
  }

  /**
   * Calculates MD5 value for a given string.
   * If a key is provided, calculates the HMAC-MD5 value.
   * Returns a Hex encoded string unless the raw argument is given.
   *
   * @param {string} string Input string
   * @param {string} [key] HMAC key
   * @param {boolean} [raw] Raw output switch
   * @returns {string} MD5 output
   */
  function md5(string, key, raw) {
    if (!key) {
      if (!raw) {
        return hexMD5(string)
      }
      return rawMD5(string)
    }
    if (!raw) {
      return hexHMACMD5(key, string)
    }
    return rawHMACMD5(key, string)
  }

  if (typeof define === 'function' && define.amd) {
    define(function () {
      return md5
    })
  } else if (typeof module === 'object' && module.exports) {
    module.exports = md5
  } else {
    $.md5 = md5
  }
  if (typeof window !== 'undefined') window.md5 = md5;
  if (typeof global !== 'undefined') global.md5 = md5;
})(this)


// --- Component: shared/scrobbler.js ---
// Дефолтные ключи Last.fm (могут быть переопределены пользователем в настройках)
const LASTFM_DEFAULT_API_KEY = '4d12b2b376510476bfdae3e2c62c96c4';
const LASTFM_DEFAULT_SECRET = '78e24c2a5e985b67484df24cd76bf349';

function md5Hash(str) {
  if (typeof window !== 'undefined' && window.md5) return window.md5(str);
  if (typeof global !== 'undefined' && global.md5) return global.md5(str);
  throw new Error('MD5 function not found. Ensure md5.js is loaded.');
}

async function makeHttpRequest(url, options = {}, body = null) {
  const reqOptions = {
    method: options.method || 'GET',
    headers: options.headers || {}
  };

  if (body) {
    reqOptions.body = body;
  }

  const response = await fetch(url, reqOptions);
  const text = await response.text();

  if (response.ok) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  } else {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
}

// Генерирует подпись api_sig для Last.fm
function generateLastFmSignature(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  let signatureStr = '';
  for (const key of sortedKeys) {
    if (key !== 'format') {
      signatureStr += key + params[key];
    }
  }
  signatureStr += secret;
  return md5Hash(signatureStr);
}

class ScrobblerService {
  static getSettings() {
    let settings = {
      lastfmEnabled: false,
      lastfmApiKey: '',
      lastfmSecret: '',
      lastfmSessionKey: '',
      lastfmUsername: '',
      listenbrainzEnabled: false,
      listenbrainzToken: '',
      listenbrainzUsername: ''
    };
    return settings;
  }

  // Получить авторизационный токен Last.fm
  static async lastFmGetToken(customApiKey, customSecret) {
    const apiKey = customApiKey || LASTFM_DEFAULT_API_KEY;
    const secret = customSecret || LASTFM_DEFAULT_SECRET;

    const params = {
      api_key: apiKey,
      method: 'auth.getToken'
    };
    const apiSig = generateLastFmSignature(params, secret);
    const url = `https://ws.audioscrobbler.com/2.0/?method=auth.getToken&api_key=${apiKey}&api_sig=${apiSig}&format=json`;
    const data = await makeHttpRequest(url);
    return data.token;
  }

  // Получить Session Key по токену Last.fm
  static async lastFmGetSession(token, customApiKey, customSecret) {
    const apiKey = customApiKey || LASTFM_DEFAULT_API_KEY;
    const secret = customSecret || LASTFM_DEFAULT_SECRET;
    
    const params = {
      api_key: apiKey,
      method: 'auth.getSession',
      token: token
    };
    const apiSig = generateLastFmSignature(params, secret);
    
    const url = `https://ws.audioscrobbler.com/2.0/?method=auth.getSession&api_key=${apiKey}&token=${token}&api_sig=${apiSig}&format=json`;
    const data = await makeHttpRequest(url);
    if (data.session) {
      return {
        sessionKey: data.session.key,
        username: data.session.name
      };
    }
    throw new Error('Не удалось получить сессию Last.fm');
  }

  // Обновить "Now Playing" в Last.fm
  static async lastFmNowPlaying(trackData, config) {
    if (!config.lastfmEnabled || !config.lastfmSessionKey) return;
    
    const apiKey = config.lastfmApiKey || LASTFM_DEFAULT_API_KEY;
    const secret = config.lastfmSecret || LASTFM_DEFAULT_SECRET;

    const params = {
      api_key: apiKey,
      artist: trackData.artist,
      track: trackData.title,
      method: 'track.updateNowPlaying',
      sk: config.lastfmSessionKey
    };
    if (trackData.album) params.album = trackData.album;
    if (trackData.durationMs) params.duration = Math.round(trackData.durationMs / 1000);

    const apiSig = generateLastFmSignature(params, secret);
    params.api_sig = apiSig;
    params.format = 'json';

    const body = new URLSearchParams(params).toString();
    const url = 'https://ws.audioscrobbler.com/2.0/';
    
    return makeHttpRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, body);
  }

  // Заскроблить в Last.fm
  static async lastFmScrobble(trackData, config) {
    if (!config.lastfmEnabled || !config.lastfmSessionKey) return;

    const apiKey = config.lastfmApiKey || LASTFM_DEFAULT_API_KEY;
    const secret = config.lastfmSecret || LASTFM_DEFAULT_SECRET;
    const timestamp = Math.floor(Date.now() / 1000);

    const params = {
      api_key: apiKey,
      artist: trackData.artist,
      track: trackData.title,
      timestamp: timestamp,
      method: 'track.scrobble',
      sk: config.lastfmSessionKey
    };
    if (trackData.album) params.album = trackData.album;
    if (trackData.durationMs) params.duration = Math.round(trackData.durationMs / 1000);

    const apiSig = generateLastFmSignature(params, secret);
    params.api_sig = apiSig;
    params.format = 'json';

    const body = new URLSearchParams(params).toString();
    const url = 'https://ws.audioscrobbler.com/2.0/';

    return makeHttpRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, body);
  }

  // Отправка Now Playing / Scrobble в ListenBrainz
  static async listenBrainzSubmit(trackData, config, listenType) {
    if (!config.listenbrainzEnabled || !config.listenbrainzToken) return;

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = [
      {
        listened_at: listenType === 'scrobble' ? timestamp : undefined,
        track_metadata: {
          artist_name: trackData.artist,
          track_name: trackData.title,
          release_name: trackData.album || undefined,
          additional_info: {
            media_player: 'Yandex Music Sync Client',
            duration_ms: trackData.durationMs || undefined
          }
        }
      }
    ];

    console.log(`[LISTENBRAINZ] Отправка статуса '${listenType}' для: ${trackData.artist} - ${trackData.title}`);

    const body = JSON.stringify({
      listen_type: listenType, // 'playing_now' или 'single' (для скроблинга)
      payload: payload
    });

    const url = 'https://api.listenbrainz.org/1/submit-listens';
    
    return makeHttpRequest(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${config.listenbrainzToken}`,
        'Content-Type': 'application/json'
      }
    }, body).then(res => {
      console.log(`[LISTENBRAINZ] Успешно отправлен статус '${listenType}'`);
      return res;
    });
  }

  // Проверить токен ListenBrainz и получить имя пользователя
  static async listenBrainzValidateToken(token) {
    const url = 'https://api.listenbrainz.org/1/validate-token';
    const data = await makeHttpRequest(url, {
      headers: {
        'Authorization': `Token ${token}`
      }
    });
    if (data.valid === true) {
      return data.user_name;
    }
    throw new Error('Недействительный токен ListenBrainz');
  }
}

// Экспортируем в preload контекст
window.ScrobblerService = ScrobblerService;

class ScrobbleManager {
  constructor() {
    this.currentTrackId = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.playtimeMs = 0;
    this.lastTimestamp = 0;
    this.nowPlayingSent = false;
    this.scrobbled = false;
    
    // Дефолтные настройки
    this.config = {
      lastfmEnabled: false,
      lastfmApiKey: '',
      lastfmSecret: '',
      lastfmSessionKey: '',
      lastfmUsername: '',
      listenbrainzEnabled: false,
      listenbrainzToken: '',
      listenbrainzUsername: ''
    };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[SCROBBLER] Конфигурация обновлена:', {
      lastfmEnabled: this.config.lastfmEnabled,
      lastfmUsername: this.config.lastfmUsername,
      listenbrainzEnabled: this.config.listenbrainzEnabled,
      listenbrainzUsername: this.config.listenbrainzUsername
    });
  }

  onStateChange(trackId, isPause, position, metadata) {
    if (!trackId || !metadata) {
      this.reset();
      return;
    }

    const trackChanged = trackId !== this.currentTrackId;

    if (trackChanged) {
      // Пытаемся заскроблить предыдущий трек перед переключением, если порог был достигнут
      this.checkAndScrobble();

      console.log('[SCROBBLER] Обнаружена смена трека:', metadata.artist, '-', metadata.title);
      this.currentTrackId = trackId;
      this.currentTrack = {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album || '',
        durationMs: metadata.durationMs || 0
      };
      this.isPlaying = !isPause;
      this.playtimeMs = 0;
      this.lastTimestamp = Date.now();
      this.nowPlayingSent = false;
      this.scrobbled = false;
    } else {
      const now = Date.now();
      if (this.isPlaying) {
        const delta = now - this.lastTimestamp;
        // Предохранитель от больших скачков во времени
        if (delta > 0 && delta < 5000) {
          this.playtimeMs += delta;
        }
      }
      this.isPlaying = !isPause;
      this.lastTimestamp = now;
    }

    // Отправляем "Слушает сейчас" после 2 секунд чистого воспроизведения
    if (!this.nowPlayingSent && this.playtimeMs > 2000) {
      this.sendNowPlaying();
    }

    // Проверяем условия для скроблинга
    this.checkAndScrobble();
  }

  reset() {
    this.checkAndScrobble();
    this.currentTrackId = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.playtimeMs = 0;
    this.lastTimestamp = 0;
    this.nowPlayingSent = false;
    this.scrobbled = false;
  }

  sendNowPlaying() {
    if (!this.currentTrack) return;
    this.nowPlayingSent = true;

    console.log('[SCROBBLER] Отправка статуса Now Playing для:', this.currentTrack.artist, '-', this.currentTrack.title);

    if (this.config.lastfmEnabled && this.config.lastfmSessionKey) {
      ScrobblerService.lastFmNowPlaying(this.currentTrack, this.config).catch(err => {
        console.error('[SCROBBLER] Ошибка Last.fm Now Playing:', err.message);
      });
    }

    if (this.config.listenbrainzEnabled && this.config.listenbrainzToken) {
      ScrobblerService.listenBrainzSubmit(this.currentTrack, this.config, 'playing_now').catch(err => {
        console.error('[SCROBBLER] Ошибка ListenBrainz Now Playing:', err.message);
      });
    }
  }

  checkAndScrobble() {
    if (!this.currentTrack || this.scrobbled) return;

    // Условия скробблинга Last.fm / ListenBrainz:
    // 1. Трек играл не менее 30 секунд.
    // 2. Прослушано 50% длины трека ИЛИ 4 минуты (240 секунд).
    const durationMs = this.currentTrack.durationMs || 180000; // По умолчанию 3 минуты, если неизвестно
    const playtimeSec = this.playtimeMs / 1000;
    const durationSec = durationMs / 1000;
    const thresholdSec = Math.min(durationSec / 2, 240);

    if (playtimeSec >= 30 && playtimeSec >= thresholdSec) {
      this.scrobbled = true;
      console.log(`[SCROBBLER] Условия скроблинга выполнены (время: ${Math.round(playtimeSec)}с, порог: ${Math.round(thresholdSec)}с). Отправляем скробл.`);

      if (this.config.lastfmEnabled && this.config.lastfmSessionKey) {
        ScrobblerService.lastFmScrobble(this.currentTrack, this.config).then(() => {
          console.log('[SCROBBLER] Last.fm Scrobble выполнен успешно');
        }).catch(err => {
          console.error('[SCROBBLER] Ошибка Last.fm Scrobble:', err.message);
        });
      }

      if (this.config.listenbrainzEnabled && this.config.listenbrainzToken) {
        ScrobblerService.listenBrainzSubmit(this.currentTrack, this.config, 'scrobble').then(() => {
          console.log('[SCROBBLER] ListenBrainz Scrobble выполнен успешно');
        }).catch(err => {
          console.error('[SCROBBLER] Ошибка ListenBrainz Scrobble:', err.message);
        });
      }
    }
  }
}

window.ScrobbleManager = new ScrobbleManager();

if (typeof module !== 'undefined') {
  module.exports = {
    ScrobblerService,
    ScrobbleManager: window.ScrobbleManager
  };
}



// --- Component: isolated/scrobbler-init.js ---
// Инициализация скробблера для браузерного расширения (ISOLATED World)
window.addEventListener('message', async (event) => {
  if (event.source !== window || !event.data) return;

  if (event.data.type === 'YM_SCROBBLER_SETTINGS_CHANGED') {
    if (window.ScrobbleManager) {
      window.ScrobbleManager.updateConfig(event.data.settings);
    }
  } else if (event.data.type === 'YM_SYNC_STATE_CHANGED') {
    if (window.ScrobbleManager && event.data.state) {
      const { trackId, isPause, position, metadata } = event.data.state;
      window.ScrobbleManager.onStateChange(trackId, isPause, position, metadata);
    }
  } else if (event.data.type === 'YM_SCROBBLER_API_CALL') {
    try {
      if (!window.ScrobblerService || typeof window.ScrobblerService[event.data.method] !== 'function') {
        throw new Error(`Method ${event.data.method} not found on ScrobblerService`);
      }
      const result = await window.ScrobblerService[event.data.method](...event.data.args);
      window.postMessage({ type: 'YM_SCROBBLER_API_RESPONSE', nonce: event.data.nonce, result: result }, '*');
    } catch (e) {
      window.postMessage({ type: 'YM_SCROBBLER_API_RESPONSE', nonce: event.data.nonce, error: e.message }, '*');
    }
  }
});


// --- Component: isolated/variables.js ---
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



// --- Component: shared/themes.js ---
const THEME_CSS = {
  default: "",
  oled: `
    html, body, .ym-dark-theme, .ym-light-theme, [class*="CommonLayout_root"] {
      --color-bg-primary: #000000 !important;
      --color-bg-secondary: #0a0a0a !important;
      --color-bg-tertiary: #111111 !important;
      --yp-color-bg-primary: #000000 !important;
      --yp-color-bg-secondary: #0a0a0a !important;
      --yp-color-bg-tertiary: #111111 !important;
      --background-primary: #000000 !important;
      --background-secondary: #0a0a0a !important;
      --color-border-primary: #151515 !important;
      --yp-color-border-primary: #151515 !important;
      --player-average-color-background: #000000 !important;
      --ym-background-color-primary-enabled-basic: #000000 !important;
      --ym-background-color-primary-enabled-content: #000000 !important;
      --ym-background-color-primary-enabled-player: #000000 !important;
      --ym-background-color-primary-enabled-popover: #0a0a0a !important;
    }
    body, html, #root, #__next, 
    .deco-pane, .deco-pane-left, .deco-player-bg,
    [class*="page-root"], [class*="sidebar"], [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      background-color: #000000 !important;
      background: #000000 !important;
    }
    [class*="NavbarDesktop_navigationGroup"] {
      background-color: #000000 !important;
    }
    [class*="SidebarDesktop"] {
      background-color: #000000 !important;
    }
    [class*="FullscreenPlayerDesktop_root"],
    [class*="FullscreenPlayerDesktop_modalContent"],
    [class*="FullscreenPlayerDesktopContent_root"],
    [class*="FullscreenPlayerDesktopContent_fullscreenContent"],
    [class*="FullscreenPlayerDesktopContent_additionalContent"] {
      background-color: #000000 !important;
      background: #000000 !important;
    }
    [class*="CommonLayout_root"], [class*="DefaultLayout_root"],
    [class*="Content_root"], [class*="Content_main"], [class*="VibePage_root"] {
      --vibe-gradient-stop-0: #000000 !important;
      --vibe-gradient-stop-1: #000000 !important;
      --vibe-gradient-stop-2: #000000 !important;
      --vibe-gradient-stop-3: #000000 !important;
      --vibe-gradient-stop-4: #000000 !important;
      --vibe-gradient-stop-5: #000000 !important;
      --vibe-gradient-stop-6: #000000 !important;
      --vibe-gradient-stop-7: #000000 !important;
      --vibe-gradient-stop-8: #000000 !important;
      --vibe-gradient-stop-9: #000000 !important;
      --vibe-gradient-stop-10: #000000 !important;
      --vibe-gradient-stop-11: #000000 !important;
      --vibe-gradient-stop-12: #000000 !important;
      --vibe-gradient-stop-13: #000000 !important;
      --vibe-gradient-stop-14: #000000 !important;
      --vibe-gradient-stop-15: #000000 !important;
      background-color: #000000 !important;
      background: #000000 !important;
    }
    [class*="NavbarDesktop_logo__"] div:first-child svg {
      color: #ffffff !important;
      fill: #ffffff !important;
      --ym-logo-text-color: #ffffff !important;
      --ym-logo-color-primary-text: #ffffff !important;
      --ym-logo-color-primary-enabled: #ffffff !important;
    }
  `,
  cyberpunk: `
    html, body, .ym-dark-theme, .ym-light-theme, [class*="CommonLayout_root"] {
      --color-bg-primary: #0f081d !important;
      --color-bg-secondary: #180d2b !important;
      --color-bg-tertiary: #24143f !important;
      --yp-color-bg-primary: #0f081d !important;
      --yp-color-bg-secondary: #180d2b !important;
      --yp-color-bg-tertiary: #24143f !important;
      --yp-color-brand: #ff007f !important;
      --yp-color-brand-hover: #ff3399 !important;
      --color-text-primary: #00ffff !important;
      --yp-color-text-primary: #00ffff !important;
      --yp-color-text-secondary: #ff007f !important;
      --yp-color-text-tertiary: rgba(0, 255, 255, 0.5) !important;
      --yp-color-border-primary: #ff007f33 !important;
      --player-average-color-background: #0f081d !important;
      --ym-background-color-primary-enabled-basic: #0f081d !important;
      --ym-background-color-primary-enabled-content: #0f081d !important;
      --ym-background-color-primary-enabled-player: #0f081d !important;
      --ym-background-color-primary-enabled-popover: #180d2b !important;
      --ym-slider-color-primary-enabled: #ff007f !important;
      --ym-slider-color-primary-hovered: #ff3399 !important;
      --ym-slider-color-primary-pressed: #ff66b2 !important;
      --ym-controls-color-primary-default-enabled: #ff007f !important;
      --ym-controls-color-primary-default-hovered: #ff3399 !important;
      --ym-controls-color-primary-default-pressed: #ff66b2 !important;
    }
    body, html, #root, #__next,
    .deco-pane, .deco-pane-left, .deco-player-bg,
    [class*="page-root"], [class*="sidebar"], [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      background-color: #0f081d !important;
      color: #00ffff !important;
    }
    span, a, p, h1, h2, h3 {
      color: #00ffff !important;
    }
    svg, [class*="UwnL5AJBMMAp6NwMDdZk"], ._YzsXZGNK8KeaUFC4Ja1 svg {
      color: #ff007f !important;
    }
    [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      border-color: rgba(255, 0, 127, 0.4) !important;
      box-shadow: 0 0 15px rgba(255, 0, 127, 0.2) !important;
    }
    .ym-sync-popover, .ym-theme-popover {
      border-color: #ff007f !important;
      box-shadow: 0 0 20px rgba(255, 0, 127, 0.3) !important;
    }
    [class*="FullscreenPlayerDesktop_root"],
    [class*="FullscreenPlayerDesktop_modalContent"],
    [class*="FullscreenPlayerDesktopContent_root"],
    [class*="FullscreenPlayerDesktopContent_fullscreenContent"],
    [class*="FullscreenPlayerDesktopContent_additionalContent"] {
      background-color: #0f081d !important;
      background: #0f081d !important;
    }
    [class*="CommonLayout_root"], [class*="DefaultLayout_root"],
    [class*="Content_root"], [class*="Content_main"], [class*="VibePage_root"] {
      --vibe-gradient-stop-0: #0f081d !important;
      --vibe-gradient-stop-1: #0f081d !important;
      --vibe-gradient-stop-2: #0f081d !important;
      --vibe-gradient-stop-3: #0f081d !important;
      --vibe-gradient-stop-4: #0f081d !important;
      --vibe-gradient-stop-5: #0f081d !important;
      --vibe-gradient-stop-6: #0f081d !important;
      --vibe-gradient-stop-7: #0f081d !important;
      --vibe-gradient-stop-8: #0f081d !important;
      --vibe-gradient-stop-9: #0f081d !important;
      --vibe-gradient-stop-10: #0f081d !important;
      --vibe-gradient-stop-11: #0f081d !important;
      --vibe-gradient-stop-12: #0f081d !important;
      --vibe-gradient-stop-13: #0f081d !important;
      --vibe-gradient-stop-14: #0f081d !important;
      --vibe-gradient-stop-15: #0f081d !important;
      background-color: #0f081d !important;
      background: #0f081d !important;
    }
    [class*="NavbarDesktop_logo__"] div:first-child svg {
      color: #00ffff !important;
      fill: #00ffff !important;
      --ym-logo-text-color: #00ffff !important;
      --ym-logo-color-primary-text: #00ffff !important;
      --ym-logo-color-primary-enabled: #00ffff !important;
    }
  `,
  nord: `
    html, body, .ym-dark-theme, .ym-light-theme, [class*="CommonLayout_root"] {
      --color-bg-primary: #2e3440 !important;
      --color-bg-secondary: #3b4252 !important;
      --color-bg-tertiary: #434c5e !important;
      --yp-color-bg-primary: #2e3440 !important;
      --yp-color-bg-secondary: #3b4252 !important;
      --yp-color-bg-tertiary: #434c5e !important;
      --yp-color-brand: #88c0d0 !important;
      --yp-color-brand-hover: #8fbcbb !important;
      --color-text-primary: #d8dee9 !important;
      --yp-color-text-primary: #d8dee9 !important;
      --yp-color-text-secondary: #e5e9f0 !important;
      --yp-color-text-tertiary: #4c566a !important;
      --yp-color-border-primary: #4c566a !important;
      --player-average-color-background: #2e3440 !important;
      --ym-background-color-primary-enabled-basic: #2e3440 !important;
      --ym-background-color-primary-enabled-content: #2e3440 !important;
      --ym-background-color-primary-enabled-player: #2e3440 !important;
      --ym-background-color-primary-enabled-popover: #3b4252 !important;
      --ym-slider-color-primary-enabled: #88c0d0 !important;
      --ym-slider-color-primary-hovered: #8fbcbb !important;
      --ym-slider-color-primary-pressed: #81a1c1 !important;
      --ym-controls-color-primary-default-enabled: #88c0d0 !important;
      --ym-controls-color-primary-default-hovered: #8fbcbb !important;
      --ym-controls-color-primary-default-pressed: #81a1c1 !important;
    }
    body, html, #root, #__next,
    .deco-pane, .deco-pane-left, .deco-player-bg,
    [class*="page-root"], [class*="sidebar"], [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      background-color: #2e3440 !important;
      color: #d8dee9 !important;
    }
    span, a, p, h1, h2, h3 {
      color: #d8dee9 !important;
    }
    svg, [class*="UwnL5AJBMMAp6NwMDdZk"], ._YzsXZGNK8KeaUFC4Ja1 svg {
      color: #88c0d0 !important;
    }
    [class*="FullscreenPlayerDesktop_root"],
    [class*="FullscreenPlayerDesktop_modalContent"],
    [class*="FullscreenPlayerDesktopContent_root"],
    [class*="FullscreenPlayerDesktopContent_fullscreenContent"],
    [class*="FullscreenPlayerDesktopContent_additionalContent"] {
      background-color: #2e3440 !important;
      background: #2e3440 !important;
    }
    [class*="CommonLayout_root"], [class*="DefaultLayout_root"],
    [class*="Content_root"], [class*="Content_main"], [class*="VibePage_root"] {
      --vibe-gradient-stop-0: #2e3440 !important;
      --vibe-gradient-stop-1: #2e3440 !important;
      --vibe-gradient-stop-2: #2e3440 !important;
      --vibe-gradient-stop-3: #2e3440 !important;
      --vibe-gradient-stop-4: #2e3440 !important;
      --vibe-gradient-stop-5: #2e3440 !important;
      --vibe-gradient-stop-6: #2e3440 !important;
      --vibe-gradient-stop-7: #2e3440 !important;
      --vibe-gradient-stop-8: #2e3440 !important;
      --vibe-gradient-stop-9: #2e3440 !important;
      --vibe-gradient-stop-10: #2e3440 !important;
      --vibe-gradient-stop-11: #2e3440 !important;
      --vibe-gradient-stop-12: #2e3440 !important;
      --vibe-gradient-stop-13: #2e3440 !important;
      --vibe-gradient-stop-14: #2e3440 !important;
      --vibe-gradient-stop-15: #2e3440 !important;
      background-color: #2e3440 !important;
      background: #2e3440 !important;
    }
    [class*="NavbarDesktop_logo__"] div:first-child svg {
      color: #d8dee9 !important;
      fill: #d8dee9 !important;
      --ym-logo-text-color: #d8dee9 !important;
      --ym-logo-color-primary-text: #d8dee9 !important;
      --ym-logo-color-primary-enabled: #d8dee9 !important;
    }
  `,
  sakura: `
    html, body, .ym-dark-theme, .ym-light-theme, [class*="CommonLayout_root"] {
      --color-bg-primary: #fff0f5 !important;
      --color-bg-secondary: #ffe4e1 !important;
      --color-bg-tertiary: #ffdbdb !important;
      --yp-color-bg-primary: #fff0f5 !important;
      --yp-color-bg-secondary: #ffe4e1 !important;
      --yp-color-bg-tertiary: #ffdbdb !important;
      --yp-color-brand: #ff69b4 !important;
      --yp-color-brand-hover: #ff1493 !important;
      --yp-color-text-primary: #4a3b3c !important;
      --yp-color-text-secondary: #6e5c5d !important;
      --yp-color-border-primary: #ffd1d1 !important;
      --player-average-color-background: #fff0f5 !important;
      --ym-background-color-primary-enabled-basic: #fff0f5 !important;
      --ym-background-color-primary-enabled-content: #fff0f5 !important;
      --ym-background-color-primary-enabled-player: #fff0f5 !important;
      --ym-background-color-primary-enabled-popover: #ffe4e1 !important;
      --ym-slider-color-primary-enabled: #ff69b4 !important;
      --ym-slider-color-primary-hovered: #ff1493 !important;
      --ym-slider-color-primary-pressed: #db2777 !important;
      --ym-controls-color-primary-default-enabled: #ff69b4 !important;
      --ym-controls-color-primary-default-hovered: #ff1493 !important;
      --ym-controls-color-primary-default-pressed: #db2777 !important;
    }
    body, html, #root, #__next,
    .deco-pane, .deco-pane-left, .deco-player-bg,
    [class*="page-root"], [class*="sidebar"], [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      background-color: #fff0f5 !important;
      color: #4a3b3c !important;
    }
    [class*="FullscreenPlayerDesktop_root"],
    [class*="FullscreenPlayerDesktop_modalContent"],
    [class*="FullscreenPlayerDesktopContent_root"],
    [class*="FullscreenPlayerDesktopContent_fullscreenContent"],
    [class*="FullscreenPlayerDesktopContent_additionalContent"] {
      background-color: #fff0f5 !important;
      background: #fff0f5 !important;
    }
    span, a, p, h1, h2, h3 {
      color: #4a3b3c !important;
    }
    svg, [class*="UwnL5AJBMMAp6NwMDdZk"], ._YzsXZGNK8KeaUFC4Ja1 svg {
      color: #4a3b3c !important;
    }
    [class*="CommonLayout_root"], [class*="DefaultLayout_root"],
    [class*="Content_root"], [class*="Content_main"], [class*="VibePage_root"] {
      --vibe-gradient-stop-0: #fff0f5 !important;
      --vibe-gradient-stop-1: #fff0f5 !important;
      --vibe-gradient-stop-2: #fff0f5 !important;
      --vibe-gradient-stop-3: #fff0f5 !important;
      --vibe-gradient-stop-4: #fff0f5 !important;
      --vibe-gradient-stop-5: #fff0f5 !important;
      --vibe-gradient-stop-6: #fff0f5 !important;
      --vibe-gradient-stop-7: #fff0f5 !important;
      --vibe-gradient-stop-8: #fff0f5 !important;
      --vibe-gradient-stop-9: #fff0f5 !important;
      --vibe-gradient-stop-10: #fff0f5 !important;
      --vibe-gradient-stop-11: #fff0f5 !important;
      --vibe-gradient-stop-12: #fff0f5 !important;
      --vibe-gradient-stop-13: #fff0f5 !important;
      --vibe-gradient-stop-14: #fff0f5 !important;
      --vibe-gradient-stop-15: #fff0f5 !important;
      background-color: #fff0f5 !important;
      background: #fff0f5 !important;
    }
    [class*="NavbarDesktop_logo__"] div:first-child svg {
      color: #4a3b3c !important;
      fill: #4a3b3c !important;
      --ym-logo-text-color: #4a3b3c !important;
      --ym-logo-color-primary-text: #4a3b3c !important;
      --ym-logo-color-primary-enabled: #4a3b3c !important;
    }
  `
};

function isValidHexColor(color) {
  return typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color);
}

function adjustColorBrightness(hex, percent) {
  if (!isValidHexColor(hex)) return '#000000';
  let R = parseInt(hex.substring(1, 3), 16);
  let G = parseInt(hex.substring(3, 5), 16);
  let B = parseInt(hex.substring(5, 7), 16);

  R = parseInt(R * (100 + percent) / 100);
  G = parseInt(G * (100 + percent) / 100);
  B = parseInt(B * (100 + percent) / 100);

  R = (R < 255) ? R : 255;
  G = (G < 255) ? G : 255;
  B = (B < 255) ? B : 255;

  R = (R > 0) ? R : 0;
  G = (G > 0) ? G : 0;
  B = (B > 0) ? B : 0;

  const rHex = R.toString(16).padStart(2, '0');
  const gHex = G.toString(16).padStart(2, '0');
  const bHex = B.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

function generateCustomThemeCSS(colors) {
  const bg = isValidHexColor(colors.bg) ? colors.bg : '#000000';
  const accent = isValidHexColor(colors.accent) ? colors.accent : '#ffdb4d';
  const text = isValidHexColor(colors.text) ? colors.text : '#ffffff';

  const bgDarker = adjustColorBrightness(bg, -20);
  const borderCol = adjustColorBrightness(bg, 15);

  return `
    html, body, .ym-dark-theme, .ym-light-theme, [class*="CommonLayout_root"] {
      --color-bg-primary: ${bg} !important;
      --color-bg-secondary: ${bgDarker} !important;
      --color-bg-tertiary: ${bgDarker} !important;
      --yp-color-bg-primary: ${bg} !important;
      --yp-color-bg-secondary: ${bgDarker} !important;
      --yp-color-bg-tertiary: ${bgDarker} !important;
      --yp-color-brand: ${accent} !important;
      --yp-color-brand-hover: ${accent} !important;
      --color-text-primary: ${text} !important;
      --yp-color-text-primary: ${text} !important;
      --yp-color-text-secondary: ${text}b3 !important;
      --yp-color-text-tertiary: ${text}80 !important;
      --yp-color-border-primary: ${borderCol} !important;
      --player-average-color-background: ${bg} !important;
      --ym-background-color-primary-enabled-basic: ${bg} !important;
      --ym-background-color-primary-enabled-content: ${bg} !important;
      --ym-background-color-primary-enabled-player: ${bg} !important;
      --ym-background-color-primary-enabled-popover: ${bgDarker} !important;
      --ym-slider-color-primary-enabled: ${accent} !important;
      --ym-slider-color-primary-hovered: ${accent} !important;
      --ym-slider-color-primary-pressed: ${accent} !important;
      --ym-controls-color-primary-default-enabled: ${accent} !important;
      --ym-controls-color-primary-default-hovered: ${accent} !important;
      --ym-controls-color-primary-default-pressed: ${accent} !important;
    }
    body, html, #root, #__next,
    .deco-pane, .deco-pane-left, .deco-player-bg,
    [class*="page-root"], [class*="sidebar"], [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      background-color: ${bg} !important;
      color: ${text} !important;
    }
    [class*="player-bar"]:not([class*="VibePlayerBar"]), [class*="Navbar_root__"], [class*="PlayerBar_root__"]:not([class*="VibePlayerBar"]) {
      border-color: ${borderCol} !important;
    }
    [class*="CommonLayout_root"], [class*="DefaultLayout_root"],
    [class*="Content_root"], [class*="Content_main"], [class*="VibePage_root"] {
      --vibe-gradient-stop-0: ${bg} !important;
      --vibe-gradient-stop-1: ${bg} !important;
      --vibe-gradient-stop-2: ${bg} !important;
      --vibe-gradient-stop-3: ${bg} !important;
      --vibe-gradient-stop-4: ${bg} !important;
      --vibe-gradient-stop-5: ${bg} !important;
      --vibe-gradient-stop-6: ${bg} !important;
      --vibe-gradient-stop-7: ${bg} !important;
      --vibe-gradient-stop-8: ${bg} !important;
      --vibe-gradient-stop-9: ${bg} !important;
      --vibe-gradient-stop-10: ${bg} !important;
      --vibe-gradient-stop-11: ${bg} !important;
      --vibe-gradient-stop-12: ${bg} !important;
      --vibe-gradient-stop-13: ${bg} !important;
      --vibe-gradient-stop-14: ${bg} !important;
      --vibe-gradient-stop-15: ${bg} !important;
      background-color: ${bg} !important;
      background: ${bg} !important;
    }
    [class*="FullscreenPlayerDesktop_root"],
    [class*="FullscreenPlayerDesktop_modalContent"],
    [class*="FullscreenPlayerDesktopContent_root"],
    [class*="FullscreenPlayerDesktopContent_fullscreenContent"],
    [class*="FullscreenPlayerDesktopContent_additionalContent"] {
      background-color: ${bg} !important;
      background: ${bg} !important;
    }
    span, a, p, h1, h2, h3, div {
      color: ${text};
    }
    svg, [class*="UwnL5AJBMMAp6NwMDdZk"], ._YzsXZGNK8KeaUFC4Ja1 svg {
      color: ${text} !important;
    }
    [class*="NavbarDesktop_logo__"] div:first-child svg {
      color: ${text} !important;
      fill: ${text} !important;
      --ym-logo-text-color: ${text} !important;
      --ym-logo-color-primary-text: ${text} !important;
      --ym-logo-color-primary-enabled: ${text} !important;
    }
  `;
}

function applyThemeCSS(themeName, customColors) {
  const allowedThemes = ["default", "oled", "cyberpunk", "nord", "sakura", "custom"];
  if (!allowedThemes.includes(themeName)) {
    themeName = "default";
  }

  let styleEl = document.getElementById('ym-theme-styles');
  if (themeName === 'default') {
    if (styleEl) {
      styleEl.remove();
    }
    return;
  }

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'ym-theme-styles';
    document.head.appendChild(styleEl);
  }

  let cssText = '';
  if (themeName === 'custom') {
    const colors = customColors || { bg: '#000000', accent: '#ffdb4d', text: '#ffffff' };
    cssText = generateCustomThemeCSS(colors);
  } else {
    cssText = THEME_CSS[themeName] || '';
  }

  cssText += `
    [class*="VibePlayerBar_root"] {
      background-color: revert !important;
      background: revert !important;
      border-color: revert !important;
      box-shadow: revert !important;
    }
  `;

  styleEl.textContent = cssText;
}


// --- Component: shared/navbar-sync.js ---
function syncButtonCollapsedState(btnId) {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (!container) return;
  const refItem = container.querySelector('li:not(#ym-sync-button):not(#ym-theme-button)');
  const btn = document.getElementById(btnId);
  if (!refItem || !btn) return;

  // 1. Копируем классы списка
  const refItemClasses = Array.from(refItem.classList);
  btn.className = refItemClasses.join(' ') + ' ym-navbar-item-injected';

  // 2. Копируем классы ссылки
  const refLink = refItem.querySelector('a');
  const link = btn.querySelector('a');
  if (refLink && link) {
    link.className = refLink.className;
  }

  // 3. Синхронизируем класс скрытия текста на спане
  const refSpan = refLink ? refLink.querySelector('span') : null;
  const span = link ? link.querySelector('.nxMXCBiVfgH4oxds3f2y span') : null;
  if (refSpan && span) {
    const collapsedClass = Array.from(refSpan.classList).find(c => c.includes('title_collapsed') || c.includes('_title_collapsed'));

    // Удалим старые collapsed-классы с нашего спана
    const oldCollapsedClasses = Array.from(span.classList).filter(c => c.includes('title_collapsed') || c.includes('_title_collapsed'));
    oldCollapsedClasses.forEach(c => span.classList.remove(c));
    if (collapsedClass) {
      span.classList.add(collapsedClass);
      btn.classList.add('ym-collapsed');
    } else {
      btn.classList.remove('ym-collapsed');
    }
  }
}

// --- Component: shared/sync-popover.js ---
function injectSyncButton() {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (!container) return;
  const existingBtn = document.getElementById('ym-sync-button');
  if (existingBtn) {
    if (container.contains(existingBtn)) {
      return; // Уже добавлена в нужный контейнер
    } else {
      existingBtn.remove(); // Удаляем устаревшую кнопку
    }
  }
  injectStyles();
  const btn = document.createElement('li');
  btn.id = 'ym-sync-button';
  btn.className = 'HcfYy4VfnRHqgXzIdL7w kRmUIkcHKD5AgtpPo8wT ym-navbar-item-injected';
  btn.setAttribute('title', 'Синхронизация прослушивания');
  btn.innerHTML = `
    <a class="buOTZq_TKQOVyjMLrXvB ZfF8mQ3Iftpwu0aZgDtG yWJHrpNsBvchs9Jjyokk" style="cursor: pointer;">
      <div class="_YzsXZGNK8KeaUFC4Ja1" style="position: relative;">
        <svg class="UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span class="ym-sync-status-indicator ${currentStatus}"></span>
      </div>
      <div class="nxMXCBiVfgH4oxds3f2y">
        <span title="Синхронизация" class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA _3_Mxw7Si7j2g4kWjlpR" style="-webkit-line-clamp: 1;">Синхронизация</span>
      </div>
    </a>
  `;
  container.appendChild(btn);
  btn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    togglePopover();
  });
  injectPopover();

  // Добавляем отслеживание скролла сайдбара, чтобы поповер перемещался вместе с кнопкой
  const scrollableSidebar = document.querySelector('[class*="NavbarDesktop_scrollableContent"]');
  if (scrollableSidebar) {
    scrollableSidebar.addEventListener('scroll', () => {
      const popover = document.getElementById('ym-sync-popover');
      if (popover && popover.classList.contains('show')) {
        positionPopover();
      }
    });

    // Настраиваем ResizeObserver для мгновенной синхронизации при сжатии
    if (!window.ymSyncSidebarObserver) {
      const observer = new ResizeObserver(entries => {
        syncButtonCollapsedState('ym-sync-button');
        syncButtonCollapsedState('ym-theme-button');
      });
      observer.observe(scrollableSidebar);
      window.ymSyncSidebarObserver = observer;
    }
  }
}

function injectPopover() {
  if (document.getElementById('ym-sync-popover')) return;
  const popover = document.createElement('div');
  popover.id = 'ym-sync-popover';
  popover.className = 'ym-sync-popover';
  popover.innerHTML = `
    <div class="ym-sync-popover-header">
      <h3>Синхронизация</h3>
      <button class="ym-sync-close-btn" id="ym-close-btn">&times;</button>
    </div>
    <div class="ym-sync-popover-body">
      <div class="ym-sync-input-group">
        <label for="ym-serverUrl">Адрес сервера</label>
        <input type="text" id="ym-serverUrl" placeholder="Например: http://localhost:3000" />
      </div>
      <div class="ym-sync-input-group">
        <label for="ym-roomId">Идентификатор комнаты</label>
        <div class="ym-sync-room-input-container">
          <input type="text" id="ym-roomId" placeholder="Например: room-404" />
          <button id="ym-generate-room-btn" class="ym-sync-icon-only-btn" title="Сгенерировать случайную комнату">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
              <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5Z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div id="ym-status-card" class="ym-sync-status-card" style="display: none;">
        <div class="ym-sync-status-info">
          <span class="ym-sync-pulse-dot"></span>
          <span id="ym-status-text">Подключено: <strong id="ym-active-room">-</strong></span>
        </div>
        <div class="ym-sync-status-actions" style="display: flex; gap: 6px;">
          <button id="ym-copy-btn" class="ym-sync-icon-only-btn" title="Копировать ID комнаты">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button id="ym-share-btn" class="ym-sync-icon-only-btn" title="Копировать ссылку-приглашение">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
        </div>
      </div>
      
      <button id="ym-connectBtn" class="ym-sync-primary-btn">Подключиться</button>
      <button id="ym-disconnectBtn" class="ym-sync-danger-btn" style="display: none;">Отключиться</button>

      <div class="ym-sync-settings-section" id="ym-discord-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.12); ${window.__ymSyncBridge ? '' : 'display: none;'}">
        <div class="ym-sync-input-group" style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 0;">
          <label for="ym-discord-rpc-toggle" style="font-size: 11px; color: rgba(255,255,255,0.7); cursor: pointer; user-select: none;">Статус в Discord (Rich Presence)</label>
          <input type="checkbox" id="ym-discord-rpc-toggle" style="cursor: pointer; width: 14px; height: 14px; margin: 0;" />
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(popover);
  setupPopoverListeners();

  // Синхронизация при первом создании
  const storedRoomId = localStorage.getItem('currentRoomId');
  const storedServerUrl = localStorage.getItem('serverUrl') || 'http://localhost:3000';
  const serverInput = document.getElementById('ym-serverUrl');
  const roomInput = document.getElementById('ym-roomId');
  if (serverInput) {
    serverInput.value = storedServerUrl;
  }
  if (roomInput) {
    roomInput.value = storedRoomId || '';
  }
  updatePopoverUI(storedRoomId, currentStatus);
}

function setupPopoverListeners() {
  const popover = document.getElementById('ym-sync-popover');
  const closeBtn = document.getElementById('ym-close-btn');
  const connectBtn = document.getElementById('ym-connectBtn');
  const disconnectBtn = document.getElementById('ym-disconnectBtn');
  const generateBtn = document.getElementById('ym-generate-room-btn');
  const copyBtn = document.getElementById('ym-copy-btn');
  const shareBtn = document.getElementById('ym-share-btn');
  const roomInput = document.getElementById('ym-roomId');
  const serverInput = document.getElementById('ym-serverUrl');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      popover.classList.remove('show');
    });
  }
  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      if (roomInput) {
        const randId = 'sync-' + Math.random().toString(36).substring(2, 8);
        roomInput.value = randId;
      }
    });
  }
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (roomInput && roomInput.value) {
        navigator.clipboard.writeText(roomInput.value).then(() => {
          const originalHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;
          setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
          }, 1500);
        }).catch(err => {
          console.error('Failed to copy room ID: ', err);
        });
      }
    });
  }
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (roomInput && roomInput.value) {
        const roomId = roomInput.value;
        const activeUrl = new URL(window.location.href);
        activeUrl.searchParams.delete('sync_code');
        activeUrl.searchParams.set('sync_code', roomId);
        navigator.clipboard.writeText(activeUrl.toString()).then(() => {
          const originalHTML = shareBtn.innerHTML;
          shareBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;
          setTimeout(() => {
            shareBtn.innerHTML = originalHTML;
          }, 1500);
        }).catch(err => {
          console.error('Failed to copy share link: ', err);
        });
      }
    });
  }
  if (connectBtn) {
    connectBtn.addEventListener('click', () => {
      const roomId = roomInput ? roomInput.value.trim() : '';
      let serverUrl = serverInput ? serverInput.value.trim() : '';
      if (!roomId) return;
      if (!serverUrl) {
        serverUrl = 'http://localhost:3000';
      }
      if (!/^https?:\/\//i.test(serverUrl)) {
        serverUrl = 'http://' + serverUrl;
      }
      if (serverInput) serverInput.value = serverUrl;
      currentRoom = roomId;

      // Сохраняем в localStorage и запускаем соединение
      localStorage.setItem('currentRoomId', roomId);
      localStorage.setItem('serverUrl', serverUrl);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ currentRoomId: roomId, serverUrl: serverUrl });
      }
      connectToServer(serverUrl);
      if (typeof sendStateToPreload === 'function') {
        sendStateToPreload();
      }
    });
  }
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      localStorage.removeItem('currentRoomId');
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(['currentRoomId']);
      }
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      currentRoom = null;
      currentServerUrl = null;
      currentStatus = "disconnected";
      updatePopoverUI(null, currentStatus);
      if (typeof sendStateToPreload === 'function') {
        sendStateToPreload();
      }
    });
  }
  const discordToggle = document.getElementById('ym-discord-rpc-toggle');
  if (discordToggle) {
    const browserRpcEnabled = localStorage.getItem('ymDiscordRpcEnabled') !== 'false';
    discordToggle.checked = browserRpcEnabled;
    discordToggle.addEventListener('change', e => {
      const enabled = e.target.checked;
      localStorage.setItem('ymDiscordRpcEnabled', enabled ? 'true' : 'false');
      if (window.__ymSyncBridge && typeof window.__ymSyncBridge.sendSettings === 'function') {
        window.__ymSyncBridge.sendSettings({
          enabled: enabled
        });
      } else {
        window.postMessage({
          type: 'YM_SYNC_SETTINGS_CHANGED',
          enabled: enabled
        }, '*');
      }
    });
  }
}

function togglePopover() {
  const popover = document.getElementById('ym-sync-popover');
  if (!popover) return;
  const isShowing = popover.classList.contains('show');
  if (isShowing) {
    popover.classList.remove('show');
  } else {
    const themePopover = document.getElementById('ym-theme-popover');
    if (themePopover) themePopover.classList.remove('show');
    const storedRoomId = localStorage.getItem('currentRoomId');
    const storedServerUrl = localStorage.getItem('serverUrl') || 'http://localhost:3000';
    const serverInput = document.getElementById('ym-serverUrl');
    const roomInput = document.getElementById('ym-roomId');
    if (serverInput && !serverInput.disabled) {
      serverInput.value = storedServerUrl;
    }
    if (roomInput && !roomInput.disabled) {
      roomInput.value = storedRoomId || '';
    }
    positionPopover();
    popover.classList.add('show');
  }
}

function positionPopover() {
  const btn = document.getElementById('ym-sync-button');
  const popover = document.getElementById('ym-sync-popover');
  if (!btn || !popover) return;
  const rect = btn.getBoundingClientRect();
  const popoverWidth = popover.offsetWidth || 280;
  const popoverHeight = popover.offsetHeight || 190;
  let left = rect.right + 12;
  let top = rect.top + rect.height / 2 - popoverHeight / 2;
  if (top < 10) top = 10;
  if (top + popoverHeight > window.innerHeight - 10) {
    top = window.innerHeight - popoverHeight - 10;
  }
  if (left + popoverWidth > window.innerWidth - 10) {
    left = window.innerWidth - popoverWidth - 10;
  }
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

// Дополнительные функции для тем оформления

function updatePopoverUI(roomId, status) {
  const popover = document.getElementById('ym-sync-popover');
  if (!popover) return;
  const connectBtn = document.getElementById('ym-connectBtn');
  const disconnectBtn = document.getElementById('ym-disconnectBtn');
  const statusCard = document.getElementById('ym-status-card');
  const activeRoom = document.getElementById('ym-active-room');
  const statusText = document.getElementById('ym-status-text');
  const indicator = document.querySelector('.ym-sync-status-indicator');
  const serverInput = document.getElementById('ym-serverUrl');
  const roomInput = document.getElementById('ym-roomId');
  if (indicator) {
    indicator.className = 'ym-sync-status-indicator ' + status;
  }
  if (status === 'connected') {
    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = 'block';
    if (statusCard) statusCard.style.display = 'flex';
    if (activeRoom) activeRoom.textContent = roomId;
    if (statusText) statusText.innerHTML = `Подключено: <strong id="ym-active-room">${roomId}</strong>`;
    if (serverInput) serverInput.disabled = true;
    if (roomInput) roomInput.disabled = true;
  } else if (status === 'connecting') {
    if (connectBtn) {
      connectBtn.style.display = 'block';
      connectBtn.textContent = 'Подключение...';
      connectBtn.disabled = true;
    }
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    if (statusCard) statusCard.style.display = 'none';
    if (serverInput) serverInput.disabled = true;
    if (roomInput) roomInput.disabled = true;
  } else {
    if (connectBtn) {
      connectBtn.style.display = 'block';
      connectBtn.textContent = 'Подключиться';
      connectBtn.disabled = false;
    }
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    if (statusCard) statusCard.style.display = 'none';
    if (serverInput) serverInput.disabled = false;
    if (roomInput) roomInput.disabled = false;
  }
  if (popover.classList.contains('show')) {
    setTimeout(positionPopover, 0);
  }
}

// Закрытие при клике вовне

// Закрытие при клике вовне
document.addEventListener('click', e => {
  const syncPopover = document.getElementById('ym-sync-popover');
  const syncBtn = document.getElementById('ym-sync-button');
  if (syncPopover && syncBtn && syncPopover.classList.contains('show')) {
    if (!syncPopover.contains(e.target) && !syncBtn.contains(e.target)) {
      syncPopover.classList.remove('show');
    }
  }
  const themePopover = document.getElementById('ym-theme-popover');
  const themeBtn = document.getElementById('ym-theme-button');
  if (themePopover && themeBtn && themePopover.classList.contains('show')) {
    if (!themePopover.contains(e.target) && !themeBtn.contains(e.target)) {
      themePopover.classList.remove('show');
    }
  }
  const lyricsPopover = document.getElementById('ym-lyrics-popover');
  const lyricsBtn = findLyricsButton();
  if (lyricsPopover && lyricsBtn && lyricsPopover.classList.contains('show')) {
    if (!lyricsPopover.contains(e.target) && !lyricsBtn.contains(e.target)) {
      lyricsPopover.classList.remove('show');
    }
  }
});

// Корректировка позиции при ресайзе

// Корректировка позиции при ресайзе
window.addEventListener('resize', () => {
  const syncPopover = document.getElementById('ym-sync-popover');
  if (syncPopover && syncPopover.classList.contains('show')) {
    positionPopover();
  }
  const themePopover = document.getElementById('ym-theme-popover');
  if (themePopover && themePopover.classList.contains('show')) {
    positionThemePopover();
  }
  const lyricsPopover = document.getElementById('ym-lyrics-popover');
  if (lyricsPopover && lyricsPopover.classList.contains('show')) {
    positionLyricsPopover();
  }
});

// Функции для текста песен (LRCLIB)

// --- Component: shared/theme-popover.js ---
// Дополнительные функции для тем оформления
function injectThemeButton() {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (!container) return;
  const existingBtn = document.getElementById('ym-theme-button');
  if (existingBtn) {
    if (container.contains(existingBtn)) {
      return;
    } else {
      existingBtn.remove();
    }
  }
  injectStyles();
  const btn = document.createElement('li');
  btn.id = 'ym-theme-button';
  btn.className = 'HcfYy4VfnRHqgXzIdL7w kRmUIkcHKD5AgtpPo8wT ym-navbar-item-injected';
  btn.setAttribute('title', 'Темы оформления');
  const link = document.createElement('a');
  link.className = 'buOTZq_TKQOVyjMLrXvB ZfF8mQ3Iftpwu0aZgDtG yWJHrpNsBvchs9Jjyokk';
  link.style.cursor = 'pointer';
  const iconWrapper = document.createElement('div');
  iconWrapper.className = '_YzsXZGNK8KeaUFC4Ja1';
  iconWrapper.style.position = 'relative';
  const svgDoc = new DOMParser().parseFromString(`
    <svg xmlns="http://www.w3.org/2000/svg" class="UwnL5AJBMMAp6NwMDdZk" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.35249 19.5 5.21553 20.3546 4.73752 20.803C4.26943 21.2421 3.59374 21.464 3.01828 21.2801C2.5188 21.1205 2.08722 20.8122 1.83401 20.3551"/>
      <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor"/>
      <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor"/>
      <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor"/>
      <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor"/>
    </svg>
  `, 'image/svg+xml');
  iconWrapper.appendChild(svgDoc.documentElement);
  const textWrapper = document.createElement('div');
  textWrapper.className = 'nxMXCBiVfgH4oxds3f2y';
  const textSpan = document.createElement('span');
  textSpan.className = '_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI tk7ahHRDYXJMMB879KUA _3_Mxw7Si7j2g4kWjlpR';
  textSpan.style.webkitLineClamp = '1';
  textSpan.textContent = 'Темы';
  textSpan.setAttribute('title', 'Темы оформления');
  textWrapper.appendChild(textSpan);
  link.appendChild(iconWrapper);
  link.appendChild(textWrapper);
  btn.appendChild(link);
  const syncBtn = document.getElementById('ym-sync-button');
  if (syncBtn && syncBtn.nextSibling) {
    container.insertBefore(btn, syncBtn.nextSibling);
  } else {
    container.appendChild(btn);
  }
  btn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    toggleThemePopover();
  });
  injectThemePopover();
}

function injectThemePopover() {
  if (document.getElementById('ym-theme-popover')) return;
  const popover = document.createElement('div');
  popover.id = 'ym-theme-popover';
  popover.className = 'ym-theme-popover';
  const header = document.createElement('div');
  header.className = 'ym-theme-popover-header';
  const title = document.createElement('h3');
  title.textContent = 'Темы оформления';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'ym-theme-close-btn';
  closeBtn.id = 'ym-theme-close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => {
    popover.classList.remove('show');
  });
  header.appendChild(title);
  header.appendChild(closeBtn);
  popover.appendChild(header);
  const body = document.createElement('div');
  body.className = 'ym-theme-popover-body';
  const themeList = document.createElement('div');
  themeList.className = 'ym-theme-list';
  const themes = [{
    id: 'default',
    name: 'Стандартная (Тёмная)'
  }, {
    id: 'oled',
    name: 'OLED Black (Глубокий чёрный)'
  }, {
    id: 'cyberpunk',
    name: 'Neon Cyber (Киберпанк)'
  }, {
    id: 'nord',
    name: 'Nord Frost (Арктический синий)'
  }, {
    id: 'sakura',
    name: 'Sakura Pastel (Пастельный розовый)'
  }, {
    id: 'custom',
    name: 'Своя тема'
  }];
  const customSettings = document.createElement('div');
  customSettings.id = 'ym-custom-theme-settings';
  customSettings.style.display = 'none';
  customSettings.style.flexDirection = 'column';
  customSettings.style.gap = '6px';
  customSettings.style.marginTop = '8px';
  customSettings.style.padding = '8px 8px 8px 8px';
  customSettings.style.borderTop = '1px solid rgba(255, 255, 255, 0.08)';
  const fields = [{
    id: 'ym-custom-bg-color',
    label: 'Цвет фона',
    key: 'bg',
    defaultVal: '#000000'
  }, {
    id: 'ym-custom-accent-color',
    label: 'Цвет акцента',
    key: 'accent',
    defaultVal: '#ffdb4d'
  }, {
    id: 'ym-custom-text-color',
    label: 'Цвет текста',
    key: 'text',
    defaultVal: '#ffffff'
  }];
  const colorInputs = {};
  fields.forEach(field => {
    const group = document.createElement('div');
    group.style.display = 'flex';
    group.style.flexDirection = 'row';
    group.style.justifyContent = 'space-between';
    group.style.alignItems = 'center';
    group.style.padding = '10px 14px';
    group.style.background = 'var(--ym-popover-item-bg)';
    group.style.border = '1px solid var(--ym-popover-item-border)';
    group.style.borderRadius = '12px';
    
    const lbl = document.createElement('label');
    lbl.setAttribute('for', field.id);
    lbl.textContent = field.label;
    lbl.style.fontSize = '13px';
    lbl.style.color = 'var(--ym-popover-text)';
    lbl.style.fontFamily = 'inherit';
    
    const input = document.createElement('input');
    input.setAttribute('type', 'color');
    input.id = field.id;
    input.style.width = '40px';
    input.style.height = '24px';
    input.style.padding = '0';
    input.style.border = 'none';
    input.style.background = 'none';
    input.style.cursor = 'pointer';
    input.value = field.defaultVal;
    
    group.appendChild(lbl);
    group.appendChild(input);
    customSettings.appendChild(group);
    colorInputs[field.key] = input;

    // Реакция на изменение цвета
    input.addEventListener('input', () => {
      const colors = {
        bg: colorInputs.bg.value,
        accent: colorInputs.accent.value,
        text: colorInputs.text.value
      };
      localStorage.setItem('ymCustomThemeColors', JSON.stringify(colors));
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ ymCustomThemeColors: JSON.stringify(colors) });
      }
      applyThemeCSS('custom', colors);
    });
  });
  themes.forEach(theme => {
    const opt = document.createElement('div');
    opt.className = 'ym-theme-option';
    opt.dataset.themeId = theme.id;
    const preview = document.createElement('span');
    preview.className = `ym-theme-preview ym-theme-preview-${theme.id}`;
    opt.appendChild(preview);
    const label = document.createElement('span');
    label.className = 'ym-theme-label';
    label.textContent = theme.name;
    opt.appendChild(label);
    opt.addEventListener('click', () => {
      localStorage.setItem('ymActiveTheme', theme.id);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ ymActiveTheme: theme.id });
      }
      if (theme.id === 'custom') {
        const colors = {
          bg: colorInputs.bg.value,
          accent: colorInputs.accent.value,
          text: colorInputs.text.value
        };
        const storedColors = localStorage.getItem('ymCustomThemeColors');
        let currentColors = colors;
        try {
          if (storedColors) currentColors = JSON.parse(storedColors);
        } catch (e) {}
        applyThemeCSS('custom', currentColors);
        updateThemePopoverUI('custom');
      } else {
        applyThemeCSS(theme.id);
        updateThemePopoverUI(theme.id);
      }
    });
    themeList.appendChild(opt);
  });
  body.appendChild(themeList);
  body.appendChild(customSettings);
  popover.appendChild(body);
  document.body.appendChild(popover);

  // Инициализация значений при создании
  const activeTheme = localStorage.getItem('ymActiveTheme') || 'default';
  updateThemePopoverUI(activeTheme);
  const storedColors = localStorage.getItem('ymCustomThemeColors');
  if (storedColors) {
    try {
      const parsed = JSON.parse(storedColors);
      if (parsed) {
        if (isValidHexColor(parsed.bg)) colorInputs.bg.value = parsed.bg;
        if (isValidHexColor(parsed.accent)) colorInputs.accent.value = parsed.accent;
        if (isValidHexColor(parsed.text)) colorInputs.text.value = parsed.text;
      }
    } catch (e) {}
  }
}

function toggleThemePopover() {
  const popover = document.getElementById('ym-theme-popover');
  if (!popover) return;
  const isShowing = popover.classList.contains('show');
  if (isShowing) {
    popover.classList.remove('show');
  } else {
    const syncPopover = document.getElementById('ym-sync-popover');
    if (syncPopover) syncPopover.classList.remove('show');
    const activeTheme = localStorage.getItem('ymActiveTheme') || 'default';
    updateThemePopoverUI(activeTheme);
    positionThemePopover();
    popover.classList.add('show');
  }
}

function positionThemePopover() {
  const btn = document.getElementById('ym-theme-button');
  const popover = document.getElementById('ym-theme-popover');
  if (!btn || !popover) return;
  const rect = btn.getBoundingClientRect();
  const popoverWidth = popover.offsetWidth || 280;
  const popoverHeight = popover.offsetHeight || 230;
  let left = rect.right + 12;
  let top = rect.top + rect.height / 2 - popoverHeight / 2;
  if (top < 10) top = 10;
  if (top + popoverHeight > window.innerHeight - 10) {
    top = window.innerHeight - popoverHeight - 10;
  }
  if (left + popoverWidth > window.innerWidth - 10) {
    left = window.innerWidth - popoverWidth - 10;
  }
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function updateThemePopoverUI(themeName) {
  const popover = document.getElementById('ym-theme-popover');
  if (!popover) return;
  const options = popover.querySelectorAll('.ym-theme-option');
  options.forEach(opt => {
    if (opt.dataset.themeId === themeName) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });
  const customPanel = document.getElementById('ym-custom-theme-settings');
  if (customPanel) {
    if (themeName === 'custom') {
      customPanel.style.display = 'flex';
    } else {
      customPanel.style.display = 'none';
    }
  }
}

// --- Component: shared/quality-indicator.js ---
function updateTrackUI(metadata) {
  currentTrackMetadata = metadata;
  if (!metadata) {
    const indicator = document.getElementById('ym-player-quality-indicator');
    if (indicator) indicator.style.display = 'none';
    return;
  }
  let codecStr = '';
  let bitrateStr = '';
  const isLossless = metadata.codec && (metadata.codec.toLowerCase() === 'flac' || metadata.codec.toLowerCase() === 'flac-mp4' || metadata.quality === 'lossless');
  if (metadata.codec) {
    const codecLower = metadata.codec.toLowerCase();
    if (isLossless) {
      codecStr = 'FLAC';
    } else if (codecLower.includes('aac')) {
      codecStr = 'AAC';
    } else if (codecLower.includes('mp3')) {
      codecStr = 'MP3';
    } else {
      codecStr = metadata.codec.toUpperCase();
    }
    if (metadata.bitrate) {
      bitrateStr = ` (${metadata.bitrate} kbps)`;
    } else if (metadata.quality === 'lossless') {
      bitrateStr = ' (Lossless)';
    } else if (metadata.quality === 'hq') {
      bitrateStr = ' (HQ)';
    }
  }

  // Обновляем индикатор в плеере
  const indicator = document.getElementById('ym-player-quality-indicator');
  if (indicator) {
    if (metadata.codec) {
      indicator.textContent = codecStr;
      const qualityTier = metadata.quality === 'lossless' ? 'Lossless' : metadata.quality === 'hq' ? 'HQ' : 'Standard';
      indicator.setAttribute('title', `Формат: ${codecStr}\nБитрейт:${bitrateStr || ' -'}\nКачество: ${qualityTier}`);

      // Стилизация под фирменный стиль Яндекс Музыки
      if (isLossless) {
        indicator.style.background = '#ffdb4d'; // Фирменный желтый
        indicator.style.color = '#000000';
        indicator.style.border = 'none';
        indicator.style.boxShadow = '0 0 6px rgba(255, 219, 77, 0.4)';
      } else if (metadata.quality === 'hq' || metadata.bitrate >= 320) {
        indicator.style.background = 'rgba(255, 255, 255, 0.12)';
        indicator.style.color = '#ffffff';
        indicator.style.border = '1px solid rgba(255, 255, 255, 0.25)';
        indicator.style.boxShadow = 'none';
      } else {
        indicator.style.background = 'rgba(255, 255, 255, 0.05)';
        indicator.style.color = 'rgba(255, 255, 255, 0.6)';
        indicator.style.border = '1px solid rgba(255, 255, 255, 0.12)';
        indicator.style.boxShadow = 'none';
      }
      indicator.style.display = 'inline-flex';
    } else {
      indicator.style.display = 'none';
    }
  }
}

function injectPlayerQualityIndicator() {
  const lyricsBtn = document.querySelector('button[aria-label*="текстомузыку"]') || document.querySelector('button[aria-label*="Lyrics"]');
  if (!lyricsBtn) return;
  const parent = lyricsBtn.parentNode;
  if (!parent) return;
  let indicator = document.getElementById('ym-player-quality-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'ym-player-quality-indicator';
    indicator.style.display = 'none';
    indicator.style.alignItems = 'center';
    indicator.style.justifyContent = 'center';
    indicator.style.fontSize = '9px';
    indicator.style.fontWeight = '700';
    indicator.style.textTransform = 'uppercase';
    indicator.style.letterSpacing = '0.5px';
    indicator.style.padding = '2px 5px';
    indicator.style.borderRadius = '4px';
    indicator.style.marginRight = '8px';
    indicator.style.userSelect = 'none';
    indicator.style.transition = 'all 0.2s ease';
    indicator.style.cursor = 'help';
    indicator.style.position = 'relative';
    indicator.style.zIndex = '3';
    indicator.style.pointerEvents = 'auto';
    indicator.addEventListener('mouseenter', () => {
      let tooltip = document.getElementById('ym-quality-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'ym-quality-tooltip';
        tooltip.className = 'ym-quality-tooltip';
        document.body.appendChild(tooltip);
      }
      if (!currentTrackMetadata) return;
      const metadata = currentTrackMetadata;
      let codecStr = '';
      let bitrateStr = '';
      const isLossless = metadata.codec && (metadata.codec.toLowerCase() === 'flac' || metadata.codec.toLowerCase() === 'flac-mp4' || metadata.quality === 'lossless');
      if (metadata.codec) {
        const codecLower = metadata.codec.toLowerCase();
        if (isLossless) {
          codecStr = 'FLAC';
        } else if (codecLower.includes('aac')) {
          codecStr = 'AAC';
        } else if (codecLower.includes('mp3')) {
          codecStr = 'MP3';
        } else {
          codecStr = metadata.codec.toUpperCase();
        }
        if (metadata.bitrate && metadata.bitrate > 0) {
          bitrateStr = `${metadata.bitrate} kbps`;
        } else if (isLossless) {
          bitrateStr = 'Lossless';
        } else if (metadata.quality === 'hq') {
          bitrateStr = '320 kbps';
        } else {
          bitrateStr = '192 kbps';
        }
      }
      const qualityTier = metadata.quality === 'lossless' ? 'Lossless' : metadata.quality === 'hq' ? 'HQ' : 'Standard';
      tooltip.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 6px; color: ${isLossless ? '#ffdb4d' : '#ffffff'}; font-size: 11px;">
          Качество звука
        </div>
        <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 2px;">
          <span style="color: rgba(255,255,255,0.5);">Кодек:</span>
          <span style="color: #ffffff; font-weight: 600;">${codecStr}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 2px;">
          <span style="color: rgba(255,255,255,0.5);">Битрейт:</span>
          <span style="color: #ffffff; font-weight: 600;">${bitrateStr}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 16px;">
          <span style="color: rgba(255,255,255,0.5);">Качество:</span>
          <span style="color: ${isLossless ? '#ffdb4d' : metadata.quality === 'hq' ? '#ffffff' : 'rgba(255,255,255,0.8)'}; font-weight: 600;">${qualityTier}</span>
        </div>
      `;
      tooltip.classList.add('show');

      // Вычисляем координаты
      const rect = indicator.getBoundingClientRect();
      const tooltipWidth = tooltip.offsetWidth;
      const tooltipHeight = tooltip.offsetHeight;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      let top = rect.top - tooltipHeight - 8;
      if (left < 10) left = 10;
      if (left + tooltipWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltipWidth - 10;
      }
      if (top < 10) {
        top = rect.bottom + 8;
      }
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });
    indicator.addEventListener('mouseleave', () => {
      const tooltip = document.getElementById('ym-quality-tooltip');
      if (tooltip) {
        tooltip.classList.remove('show');
      }
    });
    parent.insertBefore(indicator, lyricsBtn);
    if (currentTrackMetadata) {
      updateTrackUI(currentTrackMetadata);
    }
  }
}

// --- Component: shared/lyrics/lrclib-client.js ---
function parseLrc(lrcText) {
  if (!lrcText) return null;
  const lines = lrcText.split('\n');
  const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/;
  const result = [];
  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0').substring(0, 3), 10) : 0;
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegex, '').trim();
      result.push({
        time,
        text
      });
    }
  }
  result.sort((a, b) => a.time - b.time);
  return result.length > 0 ? result : null;
}

function fetchLyrics(title, artist, durationMs) {
  const requestTrackId = currentLyricsTrackId;
  console.log('[LRCLIB] fetchLyrics called:', { title, artist, durationMs, requestTrackId });
  if (isLyricsLoading && window.ymTrackIdLoadingLyrics === requestTrackId) {
    console.log('[LRCLIB] Lyrics already loading for this track, skipping invocation');
    return;
  }
  
  isLyricsLoading = true;
  window.ymTrackIdLoadingLyrics = requestTrackId;
  window.ymHasFailedLyricsSearch = false;
  const container = document.getElementById('ym-lyrics-container');
  const infoEl = document.getElementById('ym-lyrics-track-info');
  if (infoEl) {
    infoEl.innerHTML = `Слушаем: <strong>${escapeHtml(title)}</strong> - ${escapeHtml(artist)}`;
  }
  if (container) {
    container.innerHTML = `<div class="ym-lyrics-empty"><span class="ym-sync-pulse-dot" style="width: 10px; height: 10px; background: #ffdb4d; box-shadow: 0 0 8px #ffdb4d;"></span>Загрузка текста из LRCLIB...</div>`;
  }
  const fsContainer = document.querySelector('.ym-fullscreen-lyrics-container');
  if (fsContainer) {
    fsContainer.innerHTML = `<div class="ym-fullscreen-lyrics-empty"><span class="ym-sync-pulse-dot" style="width: 15px; height: 15px; background: #ffdb4d; box-shadow: 0 0 12px #ffdb4d;"></span>Загрузка текста из LRCLIB...</div>`;
  }
  const durationSec = durationMs ? Math.round(durationMs / 1000) : 0;
  const cleanTitle = title.replace(/\s*[\[\(](?:remastered|feat|with|explicit|single|mix|deluxe|version)[\]\)]/gi, '').trim();
  const cleanArtist = artist.split(',')[0].trim();
  let url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
  if (durationSec > 0) {
    url += `&duration=${durationSec}`;
  }
  console.log('[LRCLIB] Search URL:', url);

  const handleResponseData = data => {
    console.log('[LRCLIB] Successfully loaded lyrics:', data);
    if (requestTrackId !== currentLyricsTrackId) return;
    isLyricsLoading = false;
    window.ymTrackIdLoadingLyrics = null;
    displayLyricsData(data);
  };
  const handleFailure = err => {
    console.warn('[LRCLIB] Failed to load lyrics:', err);
    if (requestTrackId !== currentLyricsTrackId) return;
    isLyricsLoading = false;
    window.ymTrackIdLoadingLyrics = null;
    window.ymHasFailedLyricsSearch = true;
    showSearchFallback(cleanTitle, cleanArtist);
  };
  if (window.__ymSyncBridge && typeof window.__ymSyncBridge.fetchLyrics === 'function') {
    window.__ymSyncBridge.fetchLyrics(url).catch(err => {
      let fallbackUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
      console.log('[LRCLIB] Primary fetch failed, trying fallback URL:', fallbackUrl);
      return window.__ymSyncBridge.fetchLyrics(fallbackUrl);
    }).then(handleResponseData).catch(handleFailure);
  } else {
    fetch(url).then(res => {
      if (res.status === 404) {
        let fallbackUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
        console.log('[LRCLIB] Primary fetch returned 404, trying fallback URL:', fallbackUrl);
        return fetch(fallbackUrl);
      }
      return res;
    }).then(res => {
      if (!res.ok) throw new Error('Not found');
      return res.json();
    }).then(handleResponseData).catch(handleFailure);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function displayLyricsData(data) {
  const container = document.getElementById('ym-lyrics-container');
  if (container) {
    container.innerHTML = '';
  }
  lastLyricsActiveIndex = -1;
  if (data.syncedLyrics) {
    currentLyricsLines = parseLrc(data.syncedLyrics);
    currentLyricsPlain = null;
    isSyncedLyrics = true;
  } else if (data.plainLyrics) {
    currentLyricsLines = null;
    currentLyricsPlain = data.plainLyrics;
    isSyncedLyrics = false;
  } else {
    currentLyricsLines = null;
    currentLyricsPlain = null;
    isSyncedLyrics = false;
    if (container) {
      container.innerHTML = `<div class="ym-lyrics-empty">У этого трека нет текста в базе данных.</div>`;
    }
    const fsContainer = document.querySelector('.ym-fullscreen-lyrics-container');
    if (fsContainer) {
      fsContainer.innerHTML = `<div class="ym-fullscreen-lyrics-empty">У этого трека нет текста в базе данных.</div>`;
    }
    return;
  }
  if (isSyncedLyrics && currentLyricsLines) {
    if (container) {
      currentLyricsLines.forEach((line, idx) => {
        const lineEl = document.createElement('div');
        lineEl.className = 'ym-lyric-line';
        lineEl.dataset.idx = idx;
        lineEl.dataset.time = line.time;
        lineEl.textContent = line.text || '...';
        lineEl.addEventListener('click', () => {
          lastSidebarUserInteractionTime = 0;
          window.postMessage({
            type: 'FROM_ISOLATED',
            action: 'SYNC_STATE',
            state: {
              time: line.time,
              trackId: currentLyricsTrackId,
              isPause: false
            }
          }, '*');
          try {
            if (typeof getActivePlayer === 'function') {
              const player = getActivePlayer();
              if (player) {
                player.setProgress(line.time);
                if (typeof player.resume === 'function') player.resume();
              }
            }
          } catch (e) {}
        });
        container.appendChild(lineEl);
      });
    }
    const fsContainer = document.querySelector('.ym-fullscreen-lyrics-container');
    if (fsContainer) {
      renderFullscreenLyricsLines(fsContainer);
    }
  } else if (currentLyricsPlain) {
    if (container) {
      const lines = currentLyricsPlain.split('\n');
      lines.forEach(line => {
        const lineEl = document.createElement('div');
        lineEl.className = 'ym-lyric-line';
        lineEl.style.color = '#ffffff';
        lineEl.style.cursor = 'default';
        lineEl.textContent = line.trim() || ' ';
        container.appendChild(lineEl);
      });
    }
    const fsContainer = document.querySelector('.ym-fullscreen-lyrics-container');
    if (fsContainer) {
      renderFullscreenLyricsLines(fsContainer);
    }
  }
}

function showSearchFallback(title, artist) {
  const container = document.getElementById('ym-lyrics-container');
  if (container) {
    container.innerHTML = `
      <div class="ym-lyrics-empty">
        Текст не найден в базе данных.
        <div class="ym-lyrics-search-box">
          <input type="text" id="ym-lyrics-search-input" value="${escapeHtml(artist)} - ${escapeHtml(title)}" placeholder="Введите название песни и артиста" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: #ffffff; padding: 8px 12px; font-size: 13px; outline: none; box-sizing: border-box; width: 100%;" />
          <button id="ym-lyrics-search-btn" class="ym-sync-primary-btn" style="padding: 8px;">Искать вручную</button>
        </div>
        <div id="ym-lyrics-search-results" class="ym-lyrics-search-results" style="display: none;"></div>
      </div>
    `;
    const searchBtn = document.getElementById('ym-lyrics-search-btn');
    const searchInput = document.getElementById('ym-lyrics-search-input');
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => {
        const q = searchInput.value.trim();
        if (q) performManualSearch(q);
      });
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const q = searchInput.value.trim();
          if (q) performManualSearch(q);
        }
      });
    }
  }
  const fsContainer = document.querySelector('.ym-fullscreen-lyrics-container');
  if (fsContainer) {
    fsContainer.innerHTML = `<div class="ym-fullscreen-lyrics-empty">Текст песни не найден.<br><span style="font-size: 16px; font-weight: 500; color: rgba(255,255,255,0.4); margin-top: 12px; display: inline-block;">Вы можете выполнить ручной поиск на панели плеера.</span></div>`;
  }
}

function performManualSearch(query) {
  const resultsContainer = document.getElementById('ym-lyrics-search-results');
  if (!resultsContainer) return;
  resultsContainer.style.display = 'block';
  resultsContainer.innerHTML = `<div style="text-align: center; font-size: 12px; padding: 10px; color: rgba(255,255,255,0.5);">Поиск...</div>`;
  const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
  const handleSearchResults = results => {
    if (!results || results.length === 0) {
      resultsContainer.innerHTML = `<div style="text-align: center; font-size: 12px; padding: 10px; color: rgba(255,255,255,0.4);">Ничего не найдено.</div>`;
      return;
    }
    resultsContainer.innerHTML = '';
    results.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'ym-lyrics-search-item';
      itemEl.innerHTML = `
        <div class="title" title="${escapeHtml(item.trackName)}">${escapeHtml(item.trackName)}</div>
        <div class="artist" title="${escapeHtml(item.artistName)}">${escapeHtml(item.artistName)} (${Math.floor(item.duration / 60)}:${String(item.duration % 60).padStart(2, '0')})</div>
      `;
      itemEl.addEventListener('click', () => {
        displayLyricsData(item);
      });
      resultsContainer.appendChild(itemEl);
    });
  };
  const handleSearchError = err => {
    resultsContainer.innerHTML = `<div style="text-align: center; font-size: 12px; padding: 10px; color: #ef4444;">Ошибка поиска.</div>`;
  };
  if (window.__ymSyncBridge && typeof window.__ymSyncBridge.fetchLyrics === 'function') {
    window.__ymSyncBridge.fetchLyrics(url).then(handleSearchResults).catch(handleSearchError);
  } else {
    fetch(url).then(res => res.json()).then(handleSearchResults).catch(handleSearchError);
  }
}

// --- Component: shared/lyrics/lyrics-sidebar.js ---
// Функции для текста песен (LRCLIB)
function findLyricsButton() {
  const selectors = ['[class*="PlayerBar_lyrics"]', '[class*="PlayerBar_showLyrics"]', '[class*="lyricsButton"]', '[class*="LyricsButton"]', 'button[title*="Текст"]', 'button[title*="текст"]', 'button[title*="Lyrics"]', 'button[title*="lyrics"]', 'button[aria-label*="Текст"]', 'button[aria-label*="текст"]', 'button[aria-label*="Lyrics"]', 'button[aria-label*="lyrics"]'];
  for (const sel of selectors) {
    try {
      const elements = document.querySelectorAll(sel);
      for (const btn of elements) {
        const isInvalid = Array.from(btn.classList).some(cls => cls.includes('contextMenu') || cls.includes('ContextMenu') || cls.includes('menu') || cls.includes('Menu') || cls.includes('PinItem'));
        if (isInvalid) continue;

        // Verify it belongs to some player bar container (standard or Vibe)
        const playerBar = btn.closest('[class*="PlayerBar_"], [class*="player-bar"], [class*="VibePlayerBar_"]');
        if (playerBar) {
          if (!window.hadLoggedLyricsBtnSelector) {
            console.log('[SYNC-DEBUG] findLyricsButton matched selector:', sel, 'classes:', Array.from(btn.classList));
            window.hadLoggedLyricsBtnSelector = true;
          }
          return btn;
        }
      }
    } catch (e) {}
  }
  return null;
}

function patchNativeLyricsButton() {
  const nativeBtn = findLyricsButton();
  if (!nativeBtn) {
    if (!window.hadWarnedLyricsBtnNotFound) {
      console.warn('[SYNC-DEBUG] Native lyrics button not found by any selector.');
      window.hadWarnedLyricsBtnNotFound = true;
    }
    return;
  }
  const isDisabledAttr = nativeBtn.hasAttribute('disabled') || nativeBtn.disabled;
  const hasAriaDisabled = nativeBtn.getAttribute('aria-disabled') === 'true';
  const isDisabledClass = Array.from(nativeBtn.classList).some(cls => cls.toLowerCase().includes('disabled'));
  const isCurrentlyNativelyDisabled = isDisabledAttr || hasAriaDisabled || isDisabledClass;
  window.ymLastKnownNativeLyricsState = !isCurrentlyNativelyDisabled;
  if (isCurrentlyNativelyDisabled) {
    nativeBtn.dataset.ymSyncPatched = 'true';
    let overlay = nativeBtn.parentElement.querySelector('.ym-sync-btn-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'ym-sync-btn-overlay';
      overlay.style.position = 'absolute';
      overlay.style.cursor = 'pointer';
      overlay.style.zIndex = '100';
      overlay.title = 'Текст песни (Yandex Music Sync)';
      const parent = nativeBtn.parentElement;
      if (window.getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(overlay);
      overlay.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        toggleNativeFullscreen();
      });
    }
    overlay.style.top = nativeBtn.offsetTop + 'px';
    overlay.style.left = nativeBtn.offsetLeft + 'px';
    overlay.style.width = nativeBtn.offsetWidth + 'px';
    overlay.style.height = nativeBtn.offsetHeight + 'px';
    overlay.style.display = 'block';
  } else {
    nativeBtn.dataset.ymSyncPatched = 'false';
    const overlay = nativeBtn.parentElement.querySelector('.ym-sync-btn-overlay');
    if (overlay) overlay.style.display = 'none';
  }
  injectLyricsPopover();
}

function injectLyricsPopover() {
  if (document.getElementById('ym-lyrics-popover')) return;
  const popover = document.createElement('div');
  popover.id = 'ym-lyrics-popover';
  popover.className = 'ym-lyrics-popover';
  popover.innerHTML = `
    <div class="ym-lyrics-header">
      <h3>Текст песни</h3>
      <button class="ym-lyrics-close-btn" id="ym-lyrics-close-btn">&times;</button>
    </div>
    <div class="ym-lyrics-body">
      <div id="ym-lyrics-track-info" class="ym-lyrics-track-info">Воспроизведите трек...</div>
      <div id="ym-lyrics-container" class="ym-lyric-lines-container">
        <div class="ym-lyrics-empty">Нет активного воспроизведения</div>
      </div>
    </div>
  `;
  document.body.appendChild(popover);
  const container = document.getElementById('ym-lyrics-container');
  if (container) {
    const updateInteraction = () => {
      lastSidebarUserInteractionTime = Date.now();
    };
    container.addEventListener('wheel', updateInteraction, {
      passive: true
    });
    container.addEventListener('touchmove', updateInteraction, {
      passive: true
    });
    container.addEventListener('mousedown', updateInteraction, {
      passive: true
    });
  }
  const closeBtn = document.getElementById('ym-lyrics-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      popover.classList.remove('show');
    });
  }
  const scrollableSidebar = document.querySelector('[class*="NavbarDesktop_scrollableContent"]');
  if (scrollableSidebar) {
    scrollableSidebar.addEventListener('scroll', () => {
      if (popover.classList.contains('show')) {
        positionLyricsPopover();
      }
    });
  }
}

function toggleLyricsPopover() {
  const popover = document.getElementById('ym-lyrics-popover');
  if (!popover) return;
  const isShowing = popover.classList.contains('show');
  if (isShowing) {
    popover.classList.remove('show');
  } else {
    const syncPopover = document.getElementById('ym-sync-popover');
    if (syncPopover) syncPopover.classList.remove('show');
    const themePopover = document.getElementById('ym-theme-popover');
    if (themePopover) themePopover.classList.remove('show');
    positionLyricsPopover();
    popover.classList.add('show');
    if (currentLyricsTrackId) {
      const activeLineEl = document.querySelector('.ym-lyric-line.active');
      if (activeLineEl) {
        setTimeout(() => activeLineEl.scrollIntoView({
          behavior: 'auto',
          block: 'center'
        }), 100);
      }
    }
  }
}

function positionLyricsPopover() {
  const btn = findLyricsButton();
  const popover = document.getElementById('ym-lyrics-popover');
  if (!btn || !popover) return;
  const rect = btn.getBoundingClientRect();
  const popoverWidth = popover.offsetWidth || 320;
  const popoverHeight = popover.offsetHeight || 480;
  let left = rect.left + rect.width / 2 - popoverWidth / 2;
  let top = rect.top - popoverHeight - 12;
  if (top < 10) top = 10;
  if (left < 10) left = 10;
  if (left + popoverWidth > window.innerWidth - 10) {
    left = window.innerWidth - popoverWidth - 10;
  }
  if (left + popoverWidth > window.innerWidth - 10) {
    left = window.innerWidth - popoverWidth - 10;
  }
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

// --- Component: shared/lyrics/lyrics-highlight.js ---
function updateLyricsHighlight(position) {
  if (!isSyncedLyrics || !currentLyricsLines || currentLyricsLines.length === 0) return;
  let activeIdx = -1;
  for (let i = 0; i < currentLyricsLines.length; i++) {
    if (position >= currentLyricsLines[i].time) {
      activeIdx = i;
    } else {
      break;
    }
  }
  if (activeIdx !== -1 && activeIdx !== lastLyricsActiveIndex) {
    lastLyricsActiveIndex = activeIdx;
    const lineElements = document.querySelectorAll('.ym-lyric-line');
    lineElements.forEach(el => el.classList.remove('active'));
    const activeEl = document.querySelector(`.ym-lyric-line[data-idx="${activeIdx}"]`);
    if (activeEl) {
      activeEl.classList.add('active');
      const container = document.getElementById('ym-lyrics-container');
      if (container) {
        const containerHeight = container.clientHeight;
        const activeTop = activeEl.offsetTop;
        const activeHeight = activeEl.clientHeight;
        if (Date.now() - lastSidebarUserInteractionTime > 7000) {
          container.scrollTo({
            top: activeTop - containerHeight / 2 + activeHeight / 2,
            behavior: 'smooth'
          });
        }
      }
    }

    // For fullscreen player
    const fsContainer = document.querySelector('.ym-fullscreen-lyrics-container');
    if (fsContainer) {
      const fsLineElements = fsContainer.querySelectorAll('.ym-fullscreen-lyric-line');
      fsLineElements.forEach(el => el.classList.remove('active'));
      const fsActiveEl = fsContainer.querySelector(`.ym-fullscreen-lyric-line[data-idx="${activeIdx}"]`);
      if (fsActiveEl) {
        fsActiveEl.classList.add('active');
        const containerHeight = fsContainer.clientHeight;
        const activeTop = fsActiveEl.offsetTop;
        const activeHeight = fsActiveEl.clientHeight;
        if (Date.now() - lastFsUserInteractionTime > 7000) {
          fsContainer.scrollTo({
            top: activeTop - containerHeight / 2 + activeHeight / 2,
            behavior: 'smooth'
          });
        }
      }
    }
  }
}

function handleLocalStateUpdate(state) {
  if (!state) return;
  const position = typeof state.position !== 'undefined' ? state.position : state.time;
  const isPause = state.isPause;
  const metadata = state.metadata;
  const trackId = state.trackId;
  if (trackId !== window.ymLastLoggedTrackId) {
    console.log('[SYNC-DEBUG] handleLocalStateUpdate track changed:', {
      trackId: state.trackId,
      hasMetadata: !!state.metadata,
      metadataHasLyrics: state.metadata ? state.metadata.hasLyrics : 'no_metadata'
    });
    window.ymLastLoggedTrackId = trackId;
    window.ymCurrentTrackHasLyrics = null;
    window.ymLastKnownNativeLyricsState = null;
    window.hadLoggedFsEvaluation = false;
    window.hadLoggedFsDecision = false;
    window.hadLoggedFsCustomLyricsStarted = false;

    // Unpatch native button on track change so it re-evaluates correctly for the new track
    const nativeBtn = document.querySelector('[class*="PlayerBarDesktop_lyricsButton"]') || document.querySelector('[class*="PlayerBar_lyricsButton"]') || document.querySelector('button[aria-label="Текст песни"]') || document.querySelector('[data-test-id="lyrics-button"]');
    if (nativeBtn) {
      nativeBtn.dataset.ymSyncPatched = 'false';
      nativeBtn.style.pointerEvents = '';
      nativeBtn.style.opacity = '';
      nativeBtn.style.cursor = '';
    }
  }
  if (metadata && typeof metadata.hasLyrics !== 'undefined') {
    if (window.ymCurrentTrackHasLyrics !== metadata.hasLyrics) {
      window.ymCurrentTrackHasLyrics = metadata.hasLyrics;
      console.log('[SYNC-DEBUG] Updated window.ymCurrentTrackHasLyrics to:', window.ymCurrentTrackHasLyrics);
    }
  }
  if (!trackId) {
    currentLyricsTrackId = null;
    currentLyricsLines = null;
    currentLyricsPlain = null;
    isSyncedLyrics = false;
    const container = document.getElementById('ym-lyrics-container');
    const infoEl = document.getElementById('ym-lyrics-track-info');
    if (infoEl) infoEl.textContent = 'Воспроизведение не запущено';
    if (container) container.innerHTML = `<div class="ym-lyrics-empty">Включите трек для просмотра текста</div>`;
    return;
  }
  if (trackId !== currentLyricsTrackId) {
    currentLyricsTrackId = trackId;
    currentLyricsLines = null;
    currentLyricsPlain = null;
    isSyncedLyrics = false;
    lastLyricsActiveIndex = -1;
    window.ymHasFailedLyricsSearch = false;
    if (metadata && metadata.title) {
      fetchLyrics(metadata.title, metadata.artist, metadata.durationMs);
    } else {
      const container = document.getElementById('ym-lyrics-container');
      const infoEl = document.getElementById('ym-lyrics-track-info');
      if (infoEl) infoEl.textContent = 'Загрузка информации о треке...';
      if (container) container.innerHTML = `<div class="ym-lyrics-empty">Загрузка информации...</div>`;
    }
  } else {
    if (metadata && metadata.title && !currentLyricsLines && !currentLyricsPlain && (!isLyricsLoading || window.ymTrackIdLoadingLyrics !== currentLyricsTrackId) && !window.ymHasFailedLyricsSearch) {
      fetchLyrics(metadata.title, metadata.artist, metadata.durationMs);
    }
  }
  if (position && !isPause) {
    updateLyricsHighlight(position);
  }
}

window.addEventListener('message', event => {
  if (event.data && event.data.type === 'YM_SYNC_STATE_CHANGED') {
    handleLocalStateUpdate(event.data.state);
  }
});

// --- Component: shared/fullscreen/fullscreen-utils.js ---
function openNativeFullscreen() {
  const btn = document.querySelector('button[aria-label*="Плеер на весь экран"], button[class*="FullscreenPlayerDesktopButton_button"]');
  if (btn) {
    console.log('[SYNC] Found dedicated fullscreen button, triggering click');
    btn.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true
    }));
    btn.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true
    }));
    btn.click();
    return true;
  }

  // Cover image click (specifically for VibePlayerBar / My Wave cover image click)
  const coverImg = document.querySelector('[class*="AlbumCover_coverContainer"] img, [class*="VibePlayerBar_"] [class*="AlbumCover_cover"] img');
  if (coverImg) {
    console.log('[SYNC] Found AlbumCover image, triggering click to open fullscreen');
    coverImg.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true
    }));
    coverImg.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true
    }));
    coverImg.click();
    return true;
  }

  // Fallback: look inside any cover container for a button
  const coverContainer = document.querySelector('[class*="coverContainer"], [class*="PlayerBarDesktopWithBackgroundProgressBar_coverContainer"]');
  if (coverContainer) {
    const fallbackBtn = coverContainer.querySelector('button');
    if (fallbackBtn) {
      console.log('[SYNC] Found button inside cover container, triggering click');
      fallbackBtn.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true
      }));
      fallbackBtn.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true
      }));
      fallbackBtn.click();
      return true;
    }
  }

  // Double fallback to cover images
  const fallbacks = ['[class*="PlayerBarDesktop_cover"]', '[class*="PlayerBar_cover"]', '[class*="PlayerBar_trackCover"]', '[class*="VibePlayerBar_cover"]', '[class*="PlayerBarDesktop_root"] img', '[class*="PlayerBar_"] img', '[class*="VibePlayerBar_"] img'];
  for (const sel of fallbacks) {
    const el = document.querySelector(sel);
    if (el) {
      console.log('[SYNC] Firing events on fallback cover element:', el);
      let current = el;
      for (let i = 0; i < 5; i++) {
        if (!current || current === document.body) break;
        current.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true
        }));
        current.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true
        }));
        current.click();
        current = current.parentElement;
      }
      return true;
    }
  }
  return false;
}

function toggleNativeFullscreen() {
  const isFullscreen = !!document.querySelector('[class*="FullscreenPlayerDesktop_root"]');
  if (isFullscreen) {
    const closeBtn = document.querySelector('[class*="FullscreenPlayerDesktop_closeButton"]');
    if (closeBtn) {
      closeBtn.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true
      }));
      closeBtn.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true
      }));
      closeBtn.click();
      return;
    }
  }
  openNativeFullscreen();
}

function checkContextMenuAndAddFullscreenOption(specificMenu) {
  const contextMenu = specificMenu || document.querySelector('[role="menu"], [class*="ContextMenu_root"], [class*="VibeContextMenu_root"]');
  if (!contextMenu) return;
  
  // Skip if already checked and decided not to patch, or already patched
  if (contextMenu.dataset.ymContextMenuPatched === 'true') return;
  
  const innerText = contextMenu.innerText || '';
  const isTrackMenu = innerText.includes('Моя волна по треку') || innerText.toLowerCase().includes('моя волна по треку');
  const hasTrackIcon = !!contextMenu.querySelector('svg use[xlink\\:href*="vibe"]');
  
  if (!isTrackMenu && !hasTrackIcon) {
    return;
  }
  
  console.log('[SYNC] Found track context menu. Adding fullscreen option...');

  // Mark context menu as patched
  contextMenu.dataset.ymContextMenuPatched = 'true';
  
  const container = contextMenu.querySelector('[class*="ContextMenu_menu"], [class*="ContextMenu_list"], .ggP7WX2_erziDHFOo32s') || contextMenu;
  if (!container) return;
  
  const siblingButton = container.querySelector('button');
  const newBtn = document.createElement('button');
  newBtn.className = siblingButton ? siblingButton.className : 'cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O dgV08FKVLZKFsucuiryn IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr qU2apWBO1yyEK0lZ3lPO kc5CjvU5hT9KEj0iTt3C EiyUV4aCJzpfNzuihfMM';
  newBtn.type = 'button';
  newBtn.setAttribute('role', 'menuitem');
  newBtn.setAttribute('tabindex', '-1');
  
  newBtn.innerHTML = `
    <span class="JjlbHZ4FaP9EAcR_1DxF">
      <svg class="J9wTKytjOWG73QMoN5WP elJfazUBui03YWZgHCbW vqAVPWFJlhAOleK_SLk4 l3tE1hAMmBj2aoPPwU08" focusable="false" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 12px;">
        <path d="M15 3h6v6" />
        <path d="M9 21H3v-6" />
        <path d="M21 3l-7 7" />
        <path d="M3 21l7-7" />
      </svg>
      Развернуть на весь экран
    </span>
  `;
  
  newBtn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    toggleNativeFullscreen();
    contextMenu.remove();
  });
  
  const vibeBtn = Array.from(container.querySelectorAll('button')).find(btn => {
    const text = (btn.innerText || '').toLowerCase().replace(/\s+/g, ' ');
    return text.includes('моя волна по треку');
  });
  
  if (vibeBtn) {
    vibeBtn.parentNode.insertBefore(newBtn, vibeBtn.nextSibling);
    console.log('[SYNC] Injected button after "Моя волна по треку" button');
  } else {
    container.insertBefore(newBtn, container.firstChild);
    console.log('[SYNC] Injected button at start of context menu');
  }
}

// Observe body for dynamic context menu additions to prevent intervals lag
if (typeof window !== 'undefined' && !window.ymContextMenuObserver) {
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const menu = node.matches('[role="menu"]') ? node : node.querySelector('[role="menu"], [class*="ContextMenu_root"], [class*="VibeContextMenu_root"]');
          if (menu) {
            // Wait 50ms for React rendering to populate the menu items
            setTimeout(() => checkContextMenuAndAddFullscreenOption(menu), 50);
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.ymContextMenuObserver = observer;
  console.log('[SYNC] Context menu MutationObserver successfully registered');
}

// --- Component: shared/fullscreen/fullscreen-lyrics.js ---
function renderFullscreenLyricsLines(container) {
  container.dataset.trackId = currentLyricsTrackId;
  container.innerHTML = '';
  if (isLyricsLoading) {
    container.innerHTML = `<div class="ym-fullscreen-lyrics-empty">Загрузка текста...</div>`;
    return;
  }
  const targetLang = localStorage.getItem('ymTargetLang') || 'ru';
  const isTranslationEnabled = localStorage.getItem('ymTranslationEnabled') !== 'false';
  if (isTranslationEnabled) {
    container.classList.add('ym-has-translation');
  } else {
    container.classList.remove('ym-has-translation');
  }
  if (isSyncedLyrics && currentLyricsLines && currentLyricsLines.length > 0) {
    currentLyricsLines.forEach((line, idx) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'ym-fullscreen-lyric-line';
      lineEl.dataset.idx = idx;
      lineEl.dataset.time = line.time;
      const originalTextEl = document.createElement('div');
      originalTextEl.className = 'ym-fullscreen-lyric-original';
      originalTextEl.textContent = line.text || '...';
      lineEl.appendChild(originalTextEl);
      const translationEl = document.createElement('div');
      translationEl.className = 'ym-fullscreen-lyric-translation';
      translationEl.style.cssText = `
        font-family: "YSMusic Headline", sans-serif;
        font-weight: 700;
        font-style: normal;
        font-size: 0.8em;
        opacity: 0.9;
        margin-top: 6px;
        color: rgb(255, 219, 77);
        display: none;
      `;
      lineEl.appendChild(translationEl);
      lineEl.addEventListener('click', () => {
        lastFsUserInteractionTime = 0;
        window.postMessage({
          type: 'FROM_ISOLATED',
          action: 'SYNC_STATE',
          state: {
            time: line.time,
            trackId: currentLyricsTrackId,
            isPause: false
          }
        }, '*');
        try {
          if (typeof getActivePlayer === 'function') {
            const player = getActivePlayer();
            if (player) {
              player.setProgress(line.time);
              if (typeof player.resume === 'function') player.resume();
            }
          }
        } catch (e) {}
      });
      container.appendChild(lineEl);
    });
  } else if (currentLyricsPlain) {
    const lines = currentLyricsPlain.split('\n');
    lines.forEach((line, idx) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'ym-fullscreen-lyric-line';
      lineEl.style.color = 'rgba(255, 255, 255, 0.8)';
      lineEl.style.cursor = 'default';
      const originalTextEl = document.createElement('div');
      originalTextEl.className = 'ym-fullscreen-lyric-original';
      originalTextEl.textContent = line.trim() || ' ';
      lineEl.appendChild(originalTextEl);
      const translationEl = document.createElement('div');
      translationEl.className = 'ym-fullscreen-lyric-translation';
      translationEl.style.cssText = `
        font-family: "YSMusic Headline", sans-serif;
        font-weight: 700;
        font-style: normal;
        font-size: 0.8em;
        opacity: 0.9;
        margin-top: 6px;
        color: rgb(255, 219, 77);
        display: none;
      `;
      lineEl.appendChild(translationEl);
      container.appendChild(lineEl);
    });
  } else {
    container.innerHTML = `<div class="ym-fullscreen-lyrics-empty">Текст песни отсутствует</div>`;
  }
  if (isTranslationEnabled) {
    applyTranslation(container, currentLyricsTrackId, targetLang);
  }
}

let cachedSyncLyricsButtonClass = null;
let cachedSyncLyricsIconClass = null;
let cachedSyncLyricsIconActiveClass = null;

function getSyncLyricsButtonClass() {
  if (cachedSyncLyricsButtonClass) return cachedSyncLyricsButtonClass;
  try {
    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;
        for (const rule of rules) {
          if (rule.selectorText && rule.selectorText.includes('syncLyricsButton')) {
            const match = rule.selectorText.match(/FullscreenPlayerDesktopControls_syncLyricsButton__[a-zA-Z0-9_-]+/);
            if (match) {
              cachedSyncLyricsButtonClass = match[0];
              return cachedSyncLyricsButtonClass;
            }
          }
        }
      } catch (sheetErr) {}
    }
  } catch (err) {}
  return 'FullscreenPlayerDesktopControls_syncLyricsButton__g6E6g';
}

function getSyncLyricsIconClass() {
  if (cachedSyncLyricsIconClass) return cachedSyncLyricsIconClass;
  try {
    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;
        for (const rule of rules) {
          if (rule.selectorText && rule.selectorText.includes('SyncLyricsButton_icon')) {
            const match = rule.selectorText.match(/SyncLyricsButton_icon__[a-zA-Z0-9_-]+/);
            if (match) {
              cachedSyncLyricsIconClass = match[0];
              return cachedSyncLyricsIconClass;
            }
          }
        }
      } catch (sheetErr) {}
    }
  } catch (err) {}
  return 'SyncLyricsButton_icon__m0Gdk';
}

function getSyncLyricsIconActiveClass() {
  if (cachedSyncLyricsIconActiveClass) return cachedSyncLyricsIconActiveClass;
  try {
    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;
        for (const rule of rules) {
          if (rule.selectorText && rule.selectorText.includes('SyncLyricsButton_icon_active')) {
            const match = rule.selectorText.match(/SyncLyricsButton_icon_active__[a-zA-Z0-9_-]+/);
            if (match) {
              cachedSyncLyricsIconActiveClass = match[0];
              return cachedSyncLyricsIconActiveClass;
            }
          }
        }
      } catch (sheetErr) {}
    }
  } catch (err) {}
  return 'SyncLyricsButton_icon_active__6WcWG';
}

function handleFullscreenPlayer() {
  const fullscreenRoot = document.querySelector('[class*="FullscreenPlayerDesktop_root"]');
  if (!fullscreenRoot) {
    const prevForcedRoots = document.querySelectorAll('.ym-force-split');
    prevForcedRoots.forEach(el => el.classList.remove('ym-force-split'));
    return;
  }
  const contentRoot = fullscreenRoot.querySelector('[class*="FullscreenPlayerDesktopContent_root"]');
  if (!contentRoot) return;
  const fullscreenContent = contentRoot.querySelector('[class*="FullscreenPlayerDesktopContent_fullscreenContent"]');
  if (!fullscreenContent) return;
  const infoContainer = contentRoot.querySelector('[class*="FullscreenPlayerDesktopContent_info"]');
  const hasNativeSyncedLyrics = !!contentRoot.querySelector('[class*="SyncLyrics_root"]');
  const trackHasLyrics = typeof window.ymCurrentTrackHasLyrics !== 'undefined' ? window.ymCurrentTrackHasLyrics : null;

  let hasNativeLyrics = false;
  if (trackHasLyrics !== null) {
    hasNativeLyrics = trackHasLyrics;
  } else if (typeof window.ymLastKnownNativeLyricsState !== 'undefined' && window.ymLastKnownNativeLyricsState !== null) {
    hasNativeLyrics = window.ymLastKnownNativeLyricsState;
  } else {
    const nativeBtn = findLyricsButton();
    if (nativeBtn) {
      const isDisabledAttr = nativeBtn.hasAttribute('disabled') || nativeBtn.disabled;
      const hasAriaDisabled = nativeBtn.getAttribute('aria-disabled') === 'true';
      const isDisabledClass = Array.from(nativeBtn.classList).some(cls => cls.toLowerCase().includes('disabled'));
      const isNativelyDisabled = isDisabledAttr || hasAriaDisabled || isDisabledClass;
      hasNativeLyrics = !isNativelyDisabled;
    }
  }

  if (!window.hadLoggedFsEvaluation) {
    console.log('[SYNC-DEBUG] handleFullscreenPlayer evaluation:', {
      hasNativeSyncedLyrics,
      hasNativeLyrics,
      trackHasLyrics,
      ymCurrentTrackHasLyrics: window.ymCurrentTrackHasLyrics,
      ymLastKnownNativeLyricsState: window.ymLastKnownNativeLyricsState
    });
    window.hadLoggedFsEvaluation = true;
  }

  if (hasNativeSyncedLyrics || hasNativeLyrics || trackHasLyrics === true) {
    if (!window.hadLoggedFsDecision) {
      console.log('[SYNC-DEBUG] handleFullscreenPlayer: Decided to return early (native lyrics mode). Reason:', {
        hasNativeSyncedLyrics,
        hasNativeLyrics,
        trackHasLyricsTrue: (trackHasLyrics === true)
      });
      window.hadLoggedFsDecision = true;
    }
    const customToggle = fullscreenRoot.querySelector('.ym-custom-sync-lyrics-btn');
    if (customToggle) customToggle.remove();

    contentRoot.classList.remove('ym-force-split');
    fullscreenContent.classList.remove('ym-force-split');
    if (infoContainer) infoContainer.classList.remove('ym-force-split');
    let additionalContent = contentRoot.querySelector('[class*="FullscreenPlayerDesktopContent_additionalContent"]');
    if (additionalContent) additionalContent.classList.remove('ym-force-split');
    const customContainer = contentRoot.querySelector('.ym-fullscreen-lyrics-container');
    if (customContainer) customContainer.remove();
    const transControl = contentRoot.querySelector('.ym-translation-control');
    if (transControl) transControl.remove();
    ensureTranslateControls(fullscreenRoot, null);
    handleNativeLyricsTranslation(contentRoot);
    return;
  }

  if (!window.hadLoggedFsCustomLyricsStarted) {
    console.log('[SYNC-DEBUG] handleFullscreenPlayer: Entering custom lyrics rendering mode!');
    window.hadLoggedFsCustomLyricsStarted = true;
  }
  let additionalContent = contentRoot.querySelector('[class*="FullscreenPlayerDesktopContent_additionalContent"]');
  if (!additionalContent) {
    additionalContent = document.createElement('div');
    additionalContent.className = 'FullscreenPlayerDesktopContent_additionalContent__tuuy7 ym-custom-additional-content';
    contentRoot.appendChild(additionalContent);
  }

  const controlsRoot = fullscreenRoot.querySelector('[class*="FullscreenPlayerDesktopControls_root"]');
  if (controlsRoot) {
    const btnClass = getSyncLyricsButtonClass();
    const iconClass = getSyncLyricsIconClass();
    const activeClass = getSyncLyricsIconActiveClass();

    let customToggle = controlsRoot.querySelector('.ym-custom-sync-lyrics-btn');
    if (!customToggle) {
      customToggle = document.createElement('button');
      customToggle.className = `cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 zIMibMuH7wcqUoW7KH1B IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 SGYcNjvjmMsXeEVGUV2Z qU2apWBO1yyEK0lZ3lPO undefined ${btnClass} ym-custom-sync-lyrics-btn`;
      customToggle.type = 'button';
      customToggle.setAttribute('aria-label', 'Включить текстомузыку');
      customToggle.setAttribute('aria-live', 'off');
      customToggle.setAttribute('aria-busy', 'false');
      
      const isVisible = localStorage.getItem('ymCustomLyricsVisible') !== 'false';
      customToggle.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
      
      customToggle.innerHTML = `
        <span class="JjlbHZ4FaP9EAcR_1DxF">
          <svg class="J9wTKytjOWG73QMoN5WP ${iconClass} ${isVisible ? activeClass : ''} o_v2ds2BaqtzAsRuCVjw" focusable="false" aria-hidden="true">
            <use xlink:href="/icons/sprite.svg#syncLyrics_m"></use>
          </svg>
        </span>
      `;
      
      customToggle.addEventListener('click', () => {
        const currentVisible = localStorage.getItem('ymCustomLyricsVisible') !== 'false';
        const newVisible = !currentVisible;
        localStorage.setItem('ymCustomLyricsVisible', newVisible ? 'true' : 'false');
        
        customToggle.setAttribute('aria-pressed', newVisible ? 'true' : 'false');
        const svg = customToggle.querySelector('svg');
        if (svg) {
          if (newVisible) {
            svg.setAttribute('class', `J9wTKytjOWG73QMoN5WP ${iconClass} ${activeClass} o_v2ds2BaqtzAsRuCVjw`);
          } else {
            svg.setAttribute('class', `J9wTKytjOWG73QMoN5WP ${iconClass} o_v2ds2BaqtzAsRuCVjw`);
          }
        }
        
        handleFullscreenPlayer();
      });
      
      const rightWrapper = controlsRoot.querySelector('[class*="FullscreenPlayerDesktopControls_bottomRightButtonsWrapper"]');
      if (rightWrapper) {
        controlsRoot.insertBefore(customToggle, rightWrapper);
      } else {
        controlsRoot.appendChild(customToggle);
      }
    } else {
      const isVisible = localStorage.getItem('ymCustomLyricsVisible') !== 'false';
      customToggle.className = `cpeagBA1_PblpJn8Xgtv iJVAJMgccD4vj4E4o068 zIMibMuH7wcqUoW7KH1B IlG7b1K0AD7E7AMx6F5p nHWc2sto1C6Gm0Dpw_l0 SGYcNjvjmMsXeEVGUV2Z qU2apWBO1yyEK0lZ3lPO undefined ${btnClass} ym-custom-sync-lyrics-btn`;
      customToggle.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
      const svg = customToggle.querySelector('svg');
      if (svg) {
        if (isVisible) {
          svg.setAttribute('class', `J9wTKytjOWG73QMoN5WP ${iconClass} ${activeClass} o_v2ds2BaqtzAsRuCVjw`);
        } else {
          svg.setAttribute('class', `J9wTKytjOWG73QMoN5WP ${iconClass} o_v2ds2BaqtzAsRuCVjw`);
        }
      }
    }
  }

  const isCustomLyricsVisible = localStorage.getItem('ymCustomLyricsVisible') !== 'false';
  if (!isCustomLyricsVisible) {
    // Remove split classes to animate cover art back to center
    contentRoot.classList.remove('ym-force-split');
    fullscreenContent.classList.remove('ym-force-split');
    if (infoContainer) infoContainer.classList.remove('ym-force-split');
    
    additionalContent.classList.remove('ym-force-split');
    additionalContent.style.display = 'none';
    
    const customContainer = additionalContent.querySelector('.ym-fullscreen-lyrics-container');
    if (customContainer) customContainer.style.display = 'none';
    
    const transControl = contentRoot.querySelector('.ym-translation-control');
    if (transControl) transControl.style.display = 'none';
    const transBtn = fullscreenRoot.querySelector('.ym-fullscreen-translate-btn');
    if (transBtn) transBtn.style.display = 'none';
    
    return;
  }

  // Restore split classes and displays if visible
  additionalContent.style.display = '';
  const transControl = contentRoot.querySelector('.ym-translation-control');
  if (transControl) transControl.style.display = '';
  const transBtn = fullscreenRoot.querySelector('.ym-fullscreen-translate-btn');
  if (transBtn) transBtn.style.display = '';

  // Force layout split
  contentRoot.classList.add('ym-force-split');
  fullscreenContent.classList.add('ym-force-split');
  additionalContent.classList.add('ym-force-split');
  if (infoContainer) infoContainer.classList.add('ym-force-split');

  let customLyricsContainer = additionalContent.querySelector('.ym-fullscreen-lyrics-container');
  if (!customLyricsContainer) {
    customLyricsContainer = document.createElement('div');
    customLyricsContainer.className = 'ym-fullscreen-lyrics-container';
    customLyricsContainer.style.display = '';
    const updateInteraction = () => {
      lastFsUserInteractionTime = Date.now();
    };
    customLyricsContainer.addEventListener('wheel', updateInteraction, {
      passive: true
    });
    customLyricsContainer.addEventListener('touchmove', updateInteraction, {
      passive: true
    });
    customLyricsContainer.addEventListener('mousedown', updateInteraction, {
      passive: true
    });
    if (!additionalContent.contains(customLyricsContainer)) {
      additionalContent.appendChild(customLyricsContainer);
    }
    renderFullscreenLyricsLines(customLyricsContainer);
  } else {
    customLyricsContainer.style.display = '';
    if (customLyricsContainer.dataset.trackId !== currentLyricsTrackId) {
      renderFullscreenLyricsLines(customLyricsContainer);
    }
  }

  // Inject or update translation controls (Round Button + Popover aligned with Close Button)
  ensureTranslateControls(fullscreenRoot, customLyricsContainer);

  // Always sync the active class and scroll when fullscreen handler runs
  if (lastLyricsActiveIndex !== -1) {
    const fsActiveEl = customLyricsContainer.querySelector(`.ym-fullscreen-lyric-line[data-idx="${lastLyricsActiveIndex}"]`);
    if (fsActiveEl && !fsActiveEl.classList.contains('active')) {
      const fsLineElements = customLyricsContainer.querySelectorAll('.ym-fullscreen-lyric-line');
      fsLineElements.forEach(el => el.classList.remove('active'));
      fsActiveEl.classList.add('active');
      const containerHeight = customLyricsContainer.clientHeight;
      const activeTop = fsActiveEl.offsetTop;
      const activeHeight = fsActiveEl.clientHeight;
      if (Date.now() - lastFsUserInteractionTime > 7000) {
        customLyricsContainer.scrollTo({
          top: activeTop - containerHeight / 2 + activeHeight / 2,
          behavior: 'auto'
        });
      }
    }
  }
}

// --- Component: shared/translation/translation.js ---
function performTranslationFetch(text, targetLang) {
  if (window.__ymSyncBridge && typeof window.__ymSyncBridge.translateText === 'function') {
    return window.__ymSyncBridge.translateText(text, targetLang);
  } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'SC_TRANSLATE', text, targetLang }, (response) => {
        if (response && response.ok) {
          resolve(response.translation);
        } else {
          reject(new Error(response ? response.error : 'Unknown translation error'));
        }
      });
    });
  } else {
    return Promise.reject(new Error('Bridge translateText not available'));
  }
}

async function translateLyrics(lines, targetLang) {
  const chunkSize = 25;
  const translatedLines = [];
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    const textToTranslate = chunk.map(line => line.text || ' ').join('\n');
    try {
      const fullTranslation = await performTranslationFetch(textToTranslate, targetLang);
      const chunkTranslations = fullTranslation.split('\n');
      chunk.forEach((line, idx) => {
        translatedLines.push(chunkTranslations[idx] ? chunkTranslations[idx].trim() : '');
      });
    } catch (err) {
      console.error('[SYNC] Chunk translation error:', err);
      chunk.forEach(() => {
        translatedLines.push('');
      });
    }
  }
  return translatedLines;
}

async function applyTranslation(container, trackId, targetLang) {
  if (ymIsTranslating) return;
  const cacheKey = `${trackId}_${targetLang}`;
  let translations = ymLyricsTranslationCache[cacheKey];
  const linesToTranslate = isSyncedLyrics ? currentLyricsLines : currentLyricsPlain ? currentLyricsPlain.split('\n').map(t => ({
    text: t
  })) : null;
  if (!linesToTranslate || linesToTranslate.length === 0) return;
  if (!translations) {
    ymIsTranslating = true;
    try {
      translations = await translateLyrics(linesToTranslate, targetLang);
      ymLyricsTranslationCache[cacheKey] = translations;
    } catch (e) {
      console.error('[SYNC] Translation error:', e);
    } finally {
      ymIsTranslating = false;
    }
  }
  if (translations && container.dataset.trackId === trackId) {
    const translationEls = container.querySelectorAll('.ym-fullscreen-lyric-translation');
    translationEls.forEach((el, idx) => {
      if (translations[idx]) {
        el.textContent = translations[idx];
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    });
  }
}

function handleNativeLyricsTranslation(contentRoot) {
  const targetLang = localStorage.getItem('ymTargetLang') || 'ru';
  const isTranslationEnabled = localStorage.getItem('ymTranslationEnabled') !== 'false';
  if (!isTranslationEnabled) {
    const translationEls = contentRoot.querySelectorAll('.ym-native-lyrics-translation');
    translationEls.forEach(el => el.style.display = 'none');

    // Reset originalSpan styling when translation is disabled
    const nativeLines = contentRoot.querySelectorAll('[class*="SyncLyricsScroller_line"]');
    nativeLines.forEach(lineEl => {
      const originalSpan = lineEl.querySelector('[class*="SyncLyricsLine_root"]');
      if (originalSpan) {
        originalSpan.style.fontWeight = '';
        originalSpan.style.fontSize = '';
        originalSpan.style.transform = '';
        originalSpan.style.transformOrigin = '';
        originalSpan.style.display = '';
      }
    });

    // Trigger Swiper recalculation
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    return;
  }
  const nativeLines = contentRoot.querySelectorAll('[class*="SyncLyricsScroller_line"]');
  if (!nativeLines || nativeLines.length === 0) return;
  const cacheKey = `${currentLyricsTrackId}_${targetLang}`;
  const translations = ymLyricsTranslationCache[cacheKey];
  if (translations) {
    applyTranslationsToNativeLines(nativeLines, translations);
  } else {
    if (ymIsTranslating) return;
    const linesToTranslate = Array.from(nativeLines).map(lineEl => {
      const span = lineEl.querySelector('[class*="SyncLyricsLine_root"]');
      return {
        text: span ? span.textContent.trim() : ''
      };
    });
    if (linesToTranslate.length === 0) return;
    ymIsTranslating = true;
    translateLyrics(linesToTranslate, targetLang).then(res => {
      ymLyricsTranslationCache[cacheKey] = res;
      applyTranslationsToNativeLines(nativeLines, res);
    }).catch(err => {
      console.error('[SYNC] Native lyrics translation error:', err);
    }).finally(() => {
      ymIsTranslating = false;
    });
  }
}

function applyTranslationsToNativeLines(nativeLines, translations) {
  if (!translations) return;
  const isTranslationEnabled = localStorage.getItem('ymTranslationEnabled') !== 'false';
  nativeLines.forEach((lineEl, idx) => {
    const originalSpan = lineEl.querySelector('[class*="SyncLyricsLine_root"]');
    if (!originalSpan) return;

    // Reset previous flex changes to avoid breaking swiper height calculations
    lineEl.style.display = '';
    lineEl.style.flexDirection = '';
    lineEl.style.alignItems = '';

    // Ensure relative positioning on the parent container
    lineEl.style.position = 'relative';
    let translationEl = lineEl.querySelector('.ym-native-lyrics-translation');
    if (!translationEl) {
      translationEl = document.createElement('div');
      translationEl.className = 'ym-native-lyrics-translation';
      translationEl.style.cssText = `
        font-family: "YSMusic Headline", sans-serif;
        font-weight: 700;
        font-style: normal;
        font-size: 0.8em;
        opacity: 0.9;
        color: rgb(255, 219, 77);
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        text-align: center;
        line-height: 1.4;
        margin-top: 4px;
        pointer-events: none;
      `;
      lineEl.appendChild(translationEl);
    }
    const translationText = translations[idx];
    if (translationText && isTranslationEnabled) {
      translationEl.textContent = translationText;
      translationEl.style.display = 'block';

      // Update original lyrics font weight to 500 (medium) and scale down visually to keep container size intact
      originalSpan.style.fontWeight = '500';
      originalSpan.style.transform = 'scale(0.9)';
      originalSpan.style.transformOrigin = 'center';
      originalSpan.style.display = 'inline-block';
    } else {
      translationEl.style.display = 'none';

      // Restore original styling
      originalSpan.style.fontWeight = '';
      originalSpan.style.fontSize = '';
      originalSpan.style.transform = '';
      originalSpan.style.transformOrigin = '';
      originalSpan.style.display = '';
    }
  });

  // Trigger Swiper recalculation
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 100);
}

function ensureTranslateControls(fullscreenRoot, customLyricsContainer) {
  const controlsRoot = fullscreenRoot.querySelector('[class*="FullscreenPlayerDesktopControls_root"]');
  if (controlsRoot) {
    const computedStyle = window.getComputedStyle(controlsRoot);
    if (computedStyle.position === 'static') {
      controlsRoot.style.position = 'relative';
    }
    let translateBtn = controlsRoot.querySelector('.ym-fullscreen-translate-btn');
    if (!translateBtn) {
      translateBtn = document.createElement('button');
      translateBtn.className = 'ym-fullscreen-translate-btn';
      translateBtn.type = 'button';
      translateBtn.setAttribute('aria-label', 'Перевод текста');
      translateBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
          <path d="m5 8 6 6" />
          <path d="m4 14 6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
          <path d="m22 22-5-10-5 10" />
          <path d="M14 18h6" />
        </svg>
      `;
      controlsRoot.appendChild(translateBtn);
    }
    let popover = fullscreenRoot.querySelector('.ym-fullscreen-translate-popover');
    if (!popover) {
      popover = document.createElement('div');
      popover.className = 'ym-fullscreen-translate-popover';
      popover.style.cssText = `
        position: absolute;
        width: 270px;
        background: rgba(28, 28, 32, 0.75);
        backdrop-filter: blur(40px) saturate(180%);
        -webkit-backdrop-filter: blur(40px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
        padding: 8px;
        color: #ffffff;
        font-family: inherit;
        font-size: 13px;
        z-index: 100001;
        display: none;
        flex-direction: column;
        gap: 12px;
        box-sizing: border-box;
        transition: opacity 0.2s ease, transform 0.2s ease;
        transform: scale(0.95);
        opacity: 0;
      `;
      const savedLang = localStorage.getItem('ymTargetLang') || 'ru';
      const isEnabled = localStorage.getItem('ymTranslationEnabled') !== 'false';
      popover.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px 4px 12px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 500; color: var(--ym-popover-text); font-family: inherit;">Перевод текста</h3>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 6px; padding: 0 8px 8px 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--ym-popover-item-bg); border: 1px solid var(--ym-popover-item-border); border-radius: 12px;">
            <span style="color: var(--ym-popover-text); opacity: 0.85;">Включить перевод</span>
            <label class="ym-translate-switch" style="
              position: relative;
              display: inline-block;
              width: 38px;
              height: 20px;
            ">
              <input type="checkbox" id="ym-translate-toggle-cb" ${isEnabled ? 'checked' : ''} style="
                opacity: 0;
                width: 0;
                height: 0;
              ">
              <span class="ym-translate-slider" style="
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                transition: .3s;
                border-radius: 20px;
              "></span>
            </label>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--ym-popover-item-bg); border: 1px solid var(--ym-popover-item-border); border-radius: 12px;">
            <span style="color: var(--ym-popover-text); opacity: 0.85;">Язык перевода</span>
            <select id="ym-translate-lang-select" style="
              background: var(--ym-popover-input-bg);
              border: 1px solid var(--ym-popover-input-border);
              color: var(--ym-popover-active);
              font-weight: 600;
              outline: none;
              cursor: pointer;
              font-family: inherit;
              font-size: 12px;
              padding: 6px 10px;
              border-radius: 12px;
            ">
              <option value="ru" ${savedLang === 'ru' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">Русский</option>
              <option value="en" ${savedLang === 'en' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">English</option>
              <option value="es" ${savedLang === 'es' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">Español</option>
              <option value="de" ${savedLang === 'de' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">Deutsch</option>
              <option value="fr" ${savedLang === 'fr' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">Français</option>
              <option value="zh" ${savedLang === 'zh' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">中文</option>
              <option value="ja" ${savedLang === 'ja' ? 'selected' : ''} style="background: var(--ym-popover-bg); color: var(--ym-popover-text);">日本語</option>
            </select>
          </div>
        </div>
      `;
      fullscreenRoot.appendChild(popover);
      if (!document.getElementById('ym-translate-switch-style')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'ym-translate-switch-style';
        styleEl.textContent = `
          .ym-translate-slider {
            background-color: rgba(255, 255, 255, 0.15);
          }
          html.theme-light .ym-translate-slider,
          .theme-light .ym-translate-slider {
            background-color: rgba(0, 0, 0, 0.15);
          }
          .ym-translate-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 3px;
            bottom: 3px;
            background-color: #8e8e93;
            transition: .3s;
            border-radius: 50%;
          }
          html.theme-light .ym-translate-slider:before,
          .theme-light .ym-translate-slider:before {
            background-color: #a0a0a5;
          }
          .ym-translate-switch input:checked + .ym-translate-slider {
            background-color: var(--ym-popover-active, #ffdb4d) !important;
          }
          .ym-translate-switch input:checked + .ym-translate-slider:before {
            transform: translateX(18px);
            background-color: #000000 !important;
          }
        `;
        document.head.appendChild(styleEl);
      }
      const select = popover.querySelector('#ym-translate-lang-select');
      const checkbox = popover.querySelector('#ym-translate-toggle-cb');
      select.addEventListener('change', e => {
        localStorage.setItem('ymTargetLang', e.target.value);
        if (customLyricsContainer) {
          renderFullscreenLyricsLines(customLyricsContainer);
        }
        handleFullscreenPlayer();
      });
      checkbox.addEventListener('change', e => {
        localStorage.setItem('ymTranslationEnabled', e.target.checked ? 'true' : 'false');
        if (customLyricsContainer) {
          renderFullscreenLyricsLines(customLyricsContainer);
        }
        handleFullscreenPlayer();
      });
    }
    translateBtn.onclick = e => {
      e.stopPropagation();
      const isShowing = popover.style.display === 'flex';
      if (isShowing) {
        popover.style.opacity = '0';
        popover.style.transform = 'scale(0.95)';
        setTimeout(() => {
          popover.style.display = 'none';
        }, 200);
        translateBtn.classList.remove('active');
        translateBtn.style.background = '';
        translateBtn.style.borderColor = '';
        translateBtn.style.color = '';
      } else {
        popover.style.display = 'flex';
        popover.offsetHeight;
        popover.style.opacity = '1';
        popover.style.transform = 'scale(1)';
        translateBtn.classList.add('active');
        translateBtn.style.background = '';
        translateBtn.style.borderColor = '';
        translateBtn.style.color = '';
        const btnRect = translateBtn.getBoundingClientRect();
        const parentRect = fullscreenRoot.getBoundingClientRect();
        const relativeTop = btnRect.top - parentRect.top;
        const relativeLeft = btnRect.left - parentRect.left;
        popover.style.top = `${relativeTop}px`;
        if (relativeLeft < parentRect.width / 2) {
          popover.style.left = `${relativeLeft + btnRect.width + 12}px`;
          popover.style.right = 'auto';
        } else {
          popover.style.right = `${parentRect.width - relativeLeft + 12}px`;
          popover.style.left = 'auto';
        }
      }
    };
    if (!window.ymTranslationCloseHandlerRegistered) {
      window.ymTranslationCloseHandlerRegistered = true;
      document.addEventListener('click', e => {
        const activePopover = document.querySelector('.ym-fullscreen-translate-popover');
        const activeBtn = document.querySelector('.ym-fullscreen-translate-btn');
        if (activePopover && activePopover.style.display === 'flex') {
          if (!activePopover.contains(e.target) && (!activeBtn || !activeBtn.contains(e.target))) {
            activePopover.style.opacity = '0';
            activePopover.style.transform = 'scale(0.95)';
            setTimeout(() => {
              activePopover.style.display = 'none';
            }, 200);
            if (activeBtn) {
              activeBtn.classList.remove('active');
              activeBtn.style.background = '';
              activeBtn.style.borderColor = '';
              activeBtn.style.color = '';
            }
          }
        }
      });
    }
  }
}

// --- Component: isolated/socket-client.js ---
function connectToServer(serverUrl) {
  currentStatus = "connecting";
  updatePopoverUI(currentRoom, currentStatus);

  // Если сокет уже подключен к другому серверу, отключаем его
  if (socket && currentServerUrl !== serverUrl) {
    console.log(`Isolated: Смена адреса сервера с ${currentServerUrl} на ${serverUrl}. Переподключение...`);
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    currentServerUrl = serverUrl;
    console.log(`Isolated: Подключение к серверу: ${serverUrl}`);
    socket = io(serverUrl);

    socket.on('connect', () => {
      console.log('Isolated: Успешно подключились к серверу:', serverUrl);
      socket.emit('joinRoom', currentRoom);
      currentStatus = "connected";
      updatePopoverUI(currentRoom, currentStatus);
    });

    socket.on('connect_error', (error) => {
      console.error('Isolated: Ошибка подключения к серверу:', error);
      currentStatus = "error";
      updatePopoverUI(currentRoom, currentStatus);
    });

    socket.on('disconnect', () => {
      console.log('Isolated: Отключено от сервера');
      currentStatus = "disconnected";
      updatePopoverUI(null, currentStatus);
    });

    // Получаем команду от сервера и пересылаем в плеер Яндекса (main.js)
    socket.on('syncState', (state) => {
      console.log('Isolated: [ВСХОДЯЩЕЕ СОБЫТИЕ СЕРВЕРА] Получено syncState от Socket.io. Передаем в main.js', state);
      window.postMessage({ type: "FROM_ISOLATED", action: "SYNC_STATE", state: state }, "*");
    });
  } else {
    socket.emit('joinRoom', currentRoom);
    currentStatus = "connected";
    updatePopoverUI(currentRoom, currentStatus);
  }
}

window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data || event.data.type !== "FROM_MAIN") return;

  if (event.data.action === "UPDATE_STATE") {
    // 1. Обновляем локальный интерфейс поповера
    if (typeof updateTrackUI === 'function') {
      updateTrackUI(event.data.state.metadata);
    }

    // 2. Отправляем на сервер, только если подключены к комнате
    if (socket && currentRoom) {
      console.log('Isolated: [ОТПРАВКА НА СЕРВЕР] Получен UPDATE_STATE от main.js, отправляем через Socket.io:', event.data.state);
      socket.emit('updateState', {
        roomId: currentRoom,
        state: {
          trackId: event.data.state.trackId,
          albumId: event.data.state.albumId,
          isPause: event.data.state.isPause,
          time: event.data.state.time
        }
      });
    }
  } else if (event.data.action === "TOGGLE_LYRICS") {
    if (typeof toggleNativeFullscreen === 'function') {
      toggleNativeFullscreen();
    }
  }
});


// --- Component: isolated/index.js ---
// 1. Слушаем команду от popup.js (при нажатии "Подключиться")
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CONNECT_ROOM") {
    currentRoom = request.roomId;
    const serverUrl = request.serverUrl || "http://localhost:3000";
    connectToServer(serverUrl);
    sendResponse({ status: "ok" });
  } else if (request.type === "DISCONNECT_ROOM") {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    currentRoom = null;
    currentServerUrl = null;
    currentStatus = "disconnected";
    updatePopoverUI(null, currentStatus);
    sendResponse({ status: "ok" });
  }
});

// Автоподключение при загрузке страницы, если комната сохранена в storage или передана в URL
chrome.storage.local.get(['currentRoomId', 'serverUrl', 'ymActiveTheme', 'ymCustomThemeColors'], (result) => {
  const activeTheme = result.ymActiveTheme || 'default';
  let customColors = null;
  if (result.ymCustomThemeColors) {
    try {
      customColors = typeof result.ymCustomThemeColors === 'string' ? JSON.parse(result.ymCustomThemeColors) : result.ymCustomThemeColors;
    } catch (e) {
      console.error("[SYNC] Error parsing custom colors:", e);
    }
  }
  applyThemeCSS(activeTheme, customColors);

  const url = new URL(window.location.href);
  const syncCode = url.searchParams.get('sync_code');

  if (syncCode) {
    console.log(`Isolated: Обнаружен код синхронизации в URL: ${syncCode}`);
    currentRoom = syncCode;
    const serverUrl = result.serverUrl || 'http://localhost:3000';
    
    // Сохраняем в хранилище и подключаемся
    chrome.storage.local.set({ currentRoomId: syncCode }, () => {
      connectToServer(serverUrl);
    });

    // Очищаем URL от параметра sync_code
    url.searchParams.delete('sync_code');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } else if (result.currentRoomId) {
    currentRoom = result.currentRoomId;
    const serverUrl = result.serverUrl || 'http://localhost:3000';
    connectToServer(serverUrl);
  }
});

// Запускаем опрос для поиска навигационного меню и добавления кнопок
setInterval(() => {
  const container = document.querySelector('ol[class*="NavbarDesktop_navigationGroup"]');
  if (container) {
    if (typeof injectSyncButton === 'function') injectSyncButton();
    if (typeof injectThemeButton === 'function') injectThemeButton();
    if (typeof syncButtonCollapsedState === 'function') {
      syncButtonCollapsedState('ym-sync-button');
      syncButtonCollapsedState('ym-theme-button');
    }
  }

  if (typeof injectPlayerQualityIndicator === 'function') injectPlayerQualityIndicator();
  if (typeof patchNativeLyricsButton === 'function') patchNativeLyricsButton();
  if (typeof handleFullscreenPlayer === 'function') handleFullscreenPlayer();
  if (typeof checkContextMenuAndAddFullscreenOption === 'function') checkContextMenuAndAddFullscreenOption();
}, 500);


