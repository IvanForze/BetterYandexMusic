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