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
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(-6px);
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
      transform: translateX(-50%) translateY(-2px);
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
      top: 108px !important;
      right: 48px !important;
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
      transition: all 0.2s ease !important;
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
      padding: 28px;
      box-sizing: border-box;
      overflow-y: auto;
      color: #ffffff;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
      text-align: left;
    }
    .ym-genius-annotation-panel::-webkit-scrollbar {
      width: 6px;
    }
    .ym-genius-annotation-panel::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
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
  `;
  document.head.appendChild(style);
}