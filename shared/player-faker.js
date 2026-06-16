// ==========================================
// UI FAKER (FULL PLAYER OVERLAY)
// ==========================================

const PlayerFaker = {
    overlayActive: false,
    updateInterval: null,
    initialized: false,
    _progressDragging: false,
    spriteMuteId: 'volumeMute_xs',
    spritePauseId: 'pause_filled_l',
    spritePlayId: 'play_filled_l',
    lastLoadedArtworkUrl: null,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        // Inject the CSS rule to hide original elements when custom player is active
        const style = document.createElement('style');
        style.id = 'ym-sync-player-faker-styles';
        style.textContent = `
            body.ym-sync-player-active [class*="PlayerBar_root"],
            body.ym-sync-player-active [class*="PlayerBarDesktop_root"],
            body.ym-sync-player-active [class*="player-bar"],
            body.ym-sync-player-active [class*="CommonLayout_player"],
            body.ym-sync-player-active [class*="DefaultLayout_player"] {
                z-index: 99999 !important;
            }
            body.ym-sync-player-active [class*="PlayerBarDesktopWithBackgroundProgressBar_player"],
            body.ym-sync-player-active [class*="PlayerBar_player"],
            body.ym-sync-player-active [class*="PlayerBarDesktop_player"] {
                display: none !important;
            }
        `;
        document.head.appendChild(style);

        // Register callback with CustomAudioController
        window.CustomAudioController.onStateChange = (state) => {
            if (state.track !== null) {
                if (!this.overlayActive) {
                    this.activateOverlay(state);
                } else {
                    this.updateUI(state);
                }
            } else {
                if (this.overlayActive) {
                    this.deactivateOverlay();
                }
            }
        };

        // Listen to native audio play events to deactivate custom player immediately
        document.addEventListener('play', (e) => {
            if (e.target && e.target.tagName === 'AUDIO' && e.target.id !== 'ym-sync-custom-audio') {
                console.log('[SYNC] Native audio play detected. Stopping custom audio.');
                if (window.CustomAudioController) {
                    window.CustomAudioController.stop();
                }
            }
        }, true);

        // Fetch sprite icons dynamically at startup
        fetch('/icons/sprite.svg')
            .then(res => res.text())
            .then(text => {
                const ids = [...text.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
                
                // Prioritize large icons with '_l' suffix for play/pause buttons
                const pauseId = ids.find(id => id === 'pause_filled_l') || 
                                ids.find(id => id.startsWith('pause_filled') || id.startsWith('pause'));
                if (pauseId) this.spritePauseId = pauseId;
                
                const playId = ids.find(id => id === 'play_filled_l') || 
                               ids.find(id => id.startsWith('play_filled') || id.startsWith('play'));
                if (playId) this.spritePlayId = playId;

                const muteId = ids.find(id => id === 'volumeMute_xs') ||
                               ids.find(id => id.toLowerCase().includes('mute') || id.toLowerCase().includes('off'));
                if (muteId) this.spriteMuteId = muteId;

                console.log('[FAKER] Detected sprite IDs:', {
                    mute: this.spriteMuteId,
                    pause: this.spritePauseId,
                    play: this.spritePlayId
                });
            })
            .catch(err => {
                console.warn('[FAKER] Failed to query sprite.svg, using standard keys:', err);
            });
    },

    findPlayerBar() {
        return document.querySelector('[class*="PlayerBarDesktopWithBackgroundProgressBar_player"]') ||
               document.querySelector('[class*="PlayerBar_player"]') ||
               document.querySelector('[class*="PlayerBarDesktop_player"]');
    },

    activateOverlay(state) {
        this.overlayActive = true;

        const playerBar = this.findPlayerBar();
        if (!playerBar) {
            console.warn('[FAKER] Player bar not found');
            return;
        }

        const playerBarParent = playerBar.parentElement;
        if (!playerBarParent) {
            console.warn('[FAKER] Player bar parent not found');
            return;
        }

        // Remove any previous overlay
        const old = document.getElementById('ym-sync-player-overlay');
        if (old) old.remove();

        // Measure native player bar height to prevent layout collapse
        const nativeHeight = playerBar.offsetHeight || 64;

        // Add class to body to trigger CSS rules
        document.body.classList.add('ym-sync-player-active');

        const overlay = document.createElement('div');
        overlay.id = 'ym-sync-player-overlay';
        overlay.style.cssText = `
            position: relative !important;
            width: 100% !important;
            height: ${nativeHeight}px !important;
            z-index: 99999 !important;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-sizing: border-box;
            background: var(--ym-background-color-primary-enabled-player, rgba(24, 24, 28, 0.95)) !important;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-top: 1px solid var(--yp-color-border-primary, rgba(255, 255, 255, 0.05)) !important;
            color: #fff;
            font-family: Inter, system-ui, sans-serif;
            padding: 0 24px;
            pointer-events: auto;
        `;

        overlay.innerHTML = `
            <!-- Progress Bar (Full Width at the Top) -->
            <div id="sc-ov-progress-container" style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 2px;
                cursor: pointer;
                background: rgba(255, 255, 255, 0.08);
                z-index: 10;
                transition: height 0.1s;
            ">
                <div id="sc-ov-progress-fill" style="
                    height: 100%;
                    width: 0%;
                    background: #ffe000;
                "></div>
                <input id="sc-ov-seek" type="range" min="0" max="1" step="0.001" value="0" style="
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    cursor: pointer;
                    margin: 0;
                    padding: 0;
                ">
            </div>

            <!-- Left Section: Cover + Title + Artist -->
            <div class="PlayerBarDesktopWithBackgroundProgressBar_info__YnvZ_">
                <div class="PlayerBarDesktopWithBackgroundProgressBar_infoCard__i0cbW">
                    <div class="qaIScXjx1qyXuaIHXQIo _7gw1qGE6BeUAdSMbhRx ZcpulvHgF_wsgzB8Hye9 PlayerBarDesktopWithBackgroundProgressBar_coverContainer__dkNCG" style="width: 42px !important; height: 42px !important; overflow: hidden !important; border-radius: 4px !important; flex-shrink: 0 !important; display: block !important;">
                        <img id="sc-ov-cover" class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG PlayerBarDesktopWithBackgroundProgressBar_cover__MKmEt" alt="" loading="eager" src="" style="width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important;">
                    </div>
                    <div class="PlayerBarDesktopWithBackgroundProgressBar_description__5jHke">
                        <div class="Meta_root__R8n1h Meta_root_withSecondaryColor___uENY">
                            <div class="Meta_metaContainer__7i2dp">
                                <div class="Meta_titleContainer__gDuXr">
                                    <div class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 oyQL2RSmoNbNQf3Vc6YI Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR Meta_text__Y5uYH" style="-webkit-line-clamp: 1;">
                                        <span class="_MWOVuZRvUQdXKTMcOPx Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR Meta_text__Y5uYH Meta_title__GGBnH" id="sc-ov-title"></span>
                                    </div>
                                    <span class="Meta_explicitMarkContainer__BxMQg" style="margin-left: 6px; display: inline-flex; align-items: center; vertical-align: middle;">
                                        <svg width="22" height="10" viewBox="0 0 22 10" fill="none" style="flex-shrink: 0; vertical-align: middle;">
                                            <rect width="22" height="10" rx="2" fill="#ff5500"/>
                                            <text x="11" y="7.5" text-anchor="middle" fill="white" font-size="6" font-weight="bold" font-family="Arial,sans-serif">SC</text>
                                        </svg>
                                    </span>
                                </div>
                                <div class="SeparatedArtists_root_variant_breakAll__34YbW SeparatedArtists_root_clamp__SyvjM Meta_text__Y5uYH Meta_artists__VnR52" style="-webkit-line-clamp: 1;">
                                    <span class="_MWOVuZRvUQdXKTMcOPx Z_WIr2W8JU4MPQek3hgR _3_Mxw7Si7j2g4kWjlpR Meta_text__Y5uYH Meta_artistCaption__JESZi" id="sc-ov-artist"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Center Section: Play/Pause button -->
            <div class="PlayerBarDesktopWithBackgroundProgressBar_sonata__mGFb_ PlayerBarDesktopWithBackgroundProgressBar_sonata_withReversedControls__9TjDN" style="justify-content: center; flex: 1;">
                <div class="BaseSonataControlsDesktop_root__E6wjA PlayerBarDesktopWithBackgroundProgressBar_sonataControls__rSmXQ PlayerBarDesktopWithBackgroundProgressBar_important__HzXrK SonataControls_root__w8uqu" style="justify-content: center;">
                    <div class="BaseSonataControlsDesktop_sonataButtons__7vLtw" style="margin: 0;">
                        <button id="sc-ov-play" class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr undefined qU2apWBO1yyEK0lZ3lPO WsKeF73pWotx9W1tWdYY BaseSonataControlsDesktop_sonataButton__GbwFt" type="button" aria-label="Воспроизведение" aria-live="off" aria-busy="false">
                            <span class="JjlbHZ4FaP9EAcR_1DxF">
                                <svg class="J9wTKytjOWG73QMoN5WP BaseSonataControlsDesktop_playButtonIcon__TlFqv YjRa1ZjM_lXFlrfS7jcu" focusable="false" aria-hidden="true" id="sc-ov-play-svg">
                                    <use xlink:href="/icons/sprite.svg#play_filled_l"></use>
                                </svg>
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Right Section: Lyrics + Volume -->
            <div class="PlayerBarDesktopWithBackgroundProgressBar_meta__FhKTC" style="position: relative; display: flex; align-items: center; gap: 8px;">
                <!-- Lyrics Button -->
                <button id="sc-ov-lyrics" class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO undefined" type="button" aria-label="Включить текстомузыку Может нарушить доступность" aria-live="off" aria-busy="false">
                    <span class="JjlbHZ4FaP9EAcR_1DxF">
                        <svg class="J9wTKytjOWG73QMoN5WP UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true">
                            <use xlink:href="/icons/sprite.svg#syncLyrics_xs"></use>
                        </svg>
                    </span>
                </button>
                
                <!-- Volume Control -->
                <div class="ChangeVolume_root__HDxtA">
                    <div class="ChangeVolume_sliderContainer__pvOZa">
                        <div class="ChangeVolume_wrapperSlider__9S1Vi">
                            <input id="sc-ov-volume-slider" class="JkKcxRVvjK7lcakkEliC qpvIbN4_hF6CqK0bjCq7 SHvrm0VRiLVwGqJJjNO8 undefined ChangeVolume_slider__fCKGZ ChangeVolume_important__ZIYpu" max="1" step="0.01" aria-label="Управление громкостью" type="range" value="0.72">
                        </div>
                    </div>
                    <button id="sc-ov-volume-btn" class="cpeagBA1_PblpJn8Xgtv UDMYhpDjiAFT3xUx268O uwk3hfWzB2VT7kE13SQk IlG7b1K0AD7E7AMx6F5p HbaqudSqu7Q3mv3zMPGr eQt33MLDiQ6DRSuLaYEp qU2apWBO1yyEK0lZ3lPO undefined ChangeVolume_button__4HLEr" type="button" aria-label="Выключить звук" aria-live="off" aria-busy="false">
                        <span class="JjlbHZ4FaP9EAcR_1DxF">
                            <svg class="J9wTKytjOWG73QMoN5WP ChangeVolume_icon__5Zv2a UwnL5AJBMMAp6NwMDdZk" focusable="false" aria-hidden="true" id="sc-ov-volume-svg">
                                <use xlink:href="/icons/sprite.svg#volume_xs"></use>
                            </svg>
                        </span>
                    </button>
                </div>
            </div>
        `;

        playerBarParent.appendChild(overlay);

        // === Stop event propagation on the overlay to prevent Yandex Music event handlers from triggering ===
        overlay.addEventListener('click', (e) => e.stopPropagation());
        overlay.addEventListener('mousedown', (e) => e.stopPropagation());
        overlay.addEventListener('mouseup', (e) => e.stopPropagation());
        overlay.addEventListener('keydown', (e) => e.stopPropagation());
        overlay.addEventListener('keyup', (e) => e.stopPropagation());

        // === Micro-animations for progress bar ===
        const progressContainer = overlay.querySelector('#sc-ov-progress-container');
        progressContainer.addEventListener('mouseenter', () => {
            progressContainer.style.height = '6px';
        });
        progressContainer.addEventListener('mouseleave', () => {
            progressContainer.style.height = '2px';
        });

        // === Wire up buttons ===
        const playBtn      = overlay.querySelector('#sc-ov-play');
        const lyricsBtn    = overlay.querySelector('#sc-ov-lyrics');
        const seekInput    = overlay.querySelector('#sc-ov-seek');
        const progressFill = overlay.querySelector('#sc-ov-progress-fill');

        const volumeSlider = overlay.querySelector('#sc-ov-volume-slider');
        const volumeBtn    = overlay.querySelector('#sc-ov-volume-btn');
        const volumeSvg    = overlay.querySelector('#sc-ov-volume-svg');

        // Play/Pause toggle
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.CustomAudioController.togglePlayPause();
        });

        // Lyrics toggle
        lyricsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof toggleNativeFullscreen === 'function') {
                toggleNativeFullscreen();
            } else {
                window.postMessage({ type: 'FROM_MAIN', action: 'TOGGLE_LYRICS' }, '*');
            }
        });

        // Seek bar
        seekInput.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this._progressDragging = true;
        });
        seekInput.addEventListener('mouseup', (e) => {
            e.stopPropagation();
            this._progressDragging = false;
            const audio = window.CustomAudioController.audioElement;
            if (audio && audio.duration) {
                audio.currentTime = seekInput.value * audio.duration;
            }
        });
        seekInput.addEventListener('input', (e) => {
            e.stopPropagation();
            const pct = parseFloat(seekInput.value) * 100;
            progressFill.style.transition = 'none';
            progressFill.style.width = pct + '%';
        });

        // Volume control styling helper
        const updateSliderStyle = (vol) => {
            const pct = Math.round(vol * 100);
            volumeSlider.style.backgroundSize = `${pct}% 100%`;
            volumeSlider.style.setProperty('--seek-before-width', `${pct}%`);
        };

        const updateVolumeIcon = (vol) => {
            const useEl = volumeSvg.querySelector('use');
            if (useEl) {
                if (vol === 0) {
                    useEl.setAttribute('xlink:href', `/icons/sprite.svg#${this.spriteMuteId}`);
                    volumeBtn.setAttribute('aria-label', 'Включить звук');
                } else {
                    useEl.setAttribute('xlink:href', `/icons/sprite.svg#volume_xs`);
                    volumeBtn.setAttribute('aria-label', 'Выключить звук');
                }
            }
        };

        const currentVol = window.getNativeVolume ? window.getNativeVolume() : 0.7;
        volumeSlider.value = currentVol;
        updateSliderStyle(currentVol);
        updateVolumeIcon(currentVol);

        volumeSlider.addEventListener('input', (e) => {
            e.stopPropagation();
            const vol = parseFloat(volumeSlider.value);
            if (window.logAllVolumes) {
                window.logAllVolumes(`Драг ползунка: Новое значение = ${vol}`);
            }
            // 1. Set volume on native Yandex player (translating slider to native linear scale)
            if (window.setNativeVolume) {
                window.setNativeVolume(vol);
            }
            // 2. Set volume on custom audio element (same as slider)
            window.CustomAudioController.setVolume(vol);

            updateSliderStyle(vol);
            updateVolumeIcon(vol);
        });

        let lastVolume = currentVol || 0.7;
        volumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const audio = window.CustomAudioController.audioElement;
            if (audio) {
                if (audio.volume > 0) {
                    // Store current linear volume from slider before muting
                    lastVolume = parseFloat(volumeSlider.value) || 0.7;
                    console.log("[VOLUME-DEBUG] Mute clicked. Saving lastVolume:", lastVolume);
                    if (window.setNativeVolume) {
                        window.setNativeVolume(0);
                    }
                    window.CustomAudioController.setVolume(0);
                    volumeSlider.value = 0;
                    updateSliderStyle(0);
                    updateVolumeIcon(0);
                } else {
                    console.log("[VOLUME-DEBUG] Unmute clicked. Restoring lastVolume:", lastVolume);
                    if (window.setNativeVolume) {
                        window.setNativeVolume(lastVolume);
                    }
                    window.CustomAudioController.setVolume(lastVolume);
                    volumeSlider.value = lastVolume;
                    updateSliderStyle(lastVolume);
                    updateVolumeIcon(lastVolume);
                }
            }
        });

        // Initial state update
        this.updateUI(state || {});

        // Periodic sync (for play icon, progress)
        this.updateInterval = setInterval(() => this._tick(), 250);
    },

    deactivateOverlay() {
        this.overlayActive = false;

        document.body.classList.remove('ym-sync-player-active');

        const overlay = document.getElementById('ym-sync-player-overlay');
        if (overlay) overlay.remove();

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        window.isCustomAudioActive = false;
        this.lastLoadedArtworkUrl = null;
    },

    _tick() {
        if (!this.overlayActive) return;

        // Log volumes every 8 ticks (~2 seconds)
        if (!this._tickCount) this._tickCount = 0;
        this._tickCount++;
        if (this._tickCount % 8 === 0) {
            if (window.logAllVolumes) {
                window.logAllVolumes("Периодический тик (2с)");
            }
        }

        const ac = window.CustomAudioController;
        if (!ac || !ac.audioElement) return;

        const audio = ac.audioElement;
        const dur = audio.duration || (ac.currentTrack && ac.currentTrack.duration / 1000) || 0;
        const cur = audio.currentTime || 0;

        const fill   = document.getElementById('sc-ov-progress-fill');
        const seek   = document.getElementById('sc-ov-seek');
        const playSvg = document.getElementById('sc-ov-play-svg');
        const playBtn = document.getElementById('sc-ov-play');

        if (!this._progressDragging && dur > 0) {
            const pct = (cur / dur) * 100;
            if (fill) {
                fill.style.width = pct + '%';
            }
            if (seek) seek.value = cur / dur;
        }

        // Play/Pause icon & accessibility
        if (playSvg && playBtn) {
            const useEl = playSvg.querySelector('use');
            if (useEl) {
                if (ac.isPlaying) {
                    useEl.setAttribute('xlink:href', `/icons/sprite.svg#${this.spritePauseId}`);
                    playBtn.setAttribute('aria-label', 'Пауза');
                } else {
                    useEl.setAttribute('xlink:href', `/icons/sprite.svg#${this.spritePlayId}`);
                    playBtn.setAttribute('aria-label', 'Воспроизведение');
                }
            }
        }
    },

    updateUI(state) {
        if (!state || !state.track) return;

        const title  = document.getElementById('sc-ov-title');
        const artist = document.getElementById('sc-ov-artist');
        const cover  = document.getElementById('sc-ov-cover');

        if (title)  title.textContent  = state.track.title || 'Unknown Track';
        if (artist) artist.textContent = state.track.user?.username || 'SoundCloud';

        // Load artwork via bridge (bypasses img-src CSP)
        const rawUrl = state.track.artwork_url || state.track.user?.avatar_url || '';
        if (cover && rawUrl && this.lastLoadedArtworkUrl !== rawUrl) {
            this.lastLoadedArtworkUrl = rawUrl;
            const artUrl = rawUrl.replace('-large', '-t200x200');
            window.SoundCloudAPI._sendToBridge('SC_FETCH_AUDIO', { url: artUrl })
                .then(res => {
                    if (res && res.url && cover && cover.isConnected) cover.src = res.url;
                })
                .catch(() => {});
        }
    }
};

window.PlayerFaker = PlayerFaker;

// Initialize when loaded
setTimeout(() => {
    if (window.PlayerFaker && window.CustomAudioController) {
        window.PlayerFaker.init();
    }
}, 1000);
