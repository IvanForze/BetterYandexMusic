// ==========================================
// CUSTOM AUDIO CONTROLLER
// ==========================================

// Global logger to print volume states from all places
window.logAllVolumes = function(contextMessage = "") {
    let nativeSlider = null;
    let nativeExponent = null;
    let nativeAudioVol = null;
    let customAudioVol = null;
    let customSlider = null;

    try {
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && activePlayer.playbackState?.playerState) {
            nativeSlider = activePlayer.playbackState.playerState.volume?.value;
            nativeExponent = activePlayer.playbackState.playerState.exponentVolume?.value;
        }
    } catch(e) {}

    try {
        const nativeAudio = document.querySelector('audio:not(#ym-sync-custom-audio), video:not(#ym-sync-custom-audio)');
        if (nativeAudio) {
            nativeAudioVol = nativeAudio.volume;
        }
    } catch(e) {}

    try {
        if (window.CustomAudioController && window.CustomAudioController.audioElement) {
            customAudioVol = window.CustomAudioController.audioElement.volume;
        }
    } catch(e) {}

    try {
        const slider = document.getElementById('sc-ov-volume-slider');
        if (slider) {
            customSlider = parseFloat(slider.value);
        }
    } catch(e) {}

    console.log(
        `%c[VOLUME-SYNC-DEBUG] ${contextMessage}\n` +
        `  -> Наш ползунок (Custom Slider): ${customSlider !== null ? customSlider.toFixed(4) : 'не найден'}\n` +
        `  -> Наш аудио-элемент (Custom Audio volume): ${customAudioVol !== null ? customAudioVol.toFixed(4) : 'не инициализирован'}\n` +
        `  -> Оригинальный Sonata volume: ${nativeSlider !== null ? nativeSlider.toFixed(4) : 'не найден'}\n` +
        `  -> Оригинальный Sonata exponentVolume: ${nativeExponent !== null ? nativeExponent.toFixed(4) : 'не найден'}\n` +
        `  -> Оригинальный аудио-элемент (DOM volume): ${nativeAudioVol !== null ? nativeAudioVol.toFixed(4) : 'не найден'}`,
        "color: #ff9900; font-weight: bold;"
    );
};

// Helper to get native Yandex Music player volume (returns exponent volume which aligns with the UI slider)
window.getNativeVolume = function() {
    // 1. Try Sonata player exponent volume state
    try {
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && activePlayer.playbackState?.playerState?.exponentVolume) {
            const vol = activePlayer.playbackState.playerState.exponentVolume.value;
            if (typeof vol === 'number') return vol;
        } else if (window.getSonataCore) {
            const core = window.getSonataCore();
            if (core?.playbackController?.volumeControl) {
                const vol = core.playbackController.volumeControl.volume;
                if (typeof vol === 'number') return vol;
            } else if (core?.playbackController?.volume) {
                const vol = core.playbackController.volume;
                if (typeof vol === 'number') return vol;
            }
        }
        
        if (window.externalAPI && typeof window.externalAPI.getVolume === 'function') {
            const vol = window.externalAPI.getVolume();
            if (typeof vol === 'number') return vol;
        }
    } catch (e) {
        console.error("[VOLUME-DEBUG] getNativeVolume error:", e);
    }

    // 2. Try native audio element volume
    const nativeAudio = document.querySelector('audio:not(#ym-sync-custom-audio), video:not(#ym-sync-custom-audio)');
    if (nativeAudio) {
        return nativeAudio.volume;
    }
    
    // 3. Fallback to localStorage
    try {
        const stored = localStorage.getItem('volume') || localStorage.getItem('player-volume');
        if (stored !== null) {
            const parsed = parseFloat(stored);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
                // If it was stored as linear volume, convert back to exponent
                if (parsed === 0) return 0;
                return Math.max(0, Math.min(1, 1 + Math.log10(parsed) / 2));
            }
        }
    } catch (e) {}

    return 0.7;
};

// Helper to get native Yandex Music player exponent volume (actual audio output scale)
window.getNativeExponentVolume = function() {
    return window.getNativeVolume();
};

// Helper to set native Yandex Music player volume
window.setNativeVolume = function(vol) {
    if (window.logAllVolumes) {
        window.logAllVolumes(`setNativeVolume вызвана с vol = ${vol}`);
    }
    
    // Translate the desired exponent volume (vol) to Yandex's linear volume
    // volume = 10^(2 * (exponentVolume - 1))
    const translatedVol = vol === 0 ? 0 : Math.max(0, Math.min(1, Math.pow(10, 2 * (vol - 1))));

    // 1. Try Sonata active player API
    try {
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && typeof activePlayer.setVolume === 'function') {
            activePlayer.setVolume(translatedVol);
        } else if (window.getSonataCore) {
            const core = window.getSonataCore();
            if (core?.playbackController) {
                if (typeof core.playbackController.setVolume === 'function') {
                    core.playbackController.setVolume(translatedVol);
                } else if (core.playbackController.volumeControl && typeof core.playbackController.volumeControl.setVolume === 'function') {
                    core.playbackController.volumeControl.setVolume(translatedVol);
                }
            }
        }
        
        if (window.externalAPI && typeof window.externalAPI.setVolume === 'function') {
            window.externalAPI.setVolume(translatedVol);
        }
    } catch (e) {
        console.error("[VOLUME-DEBUG] setNativeVolume error:", e);
    }

    // 2. Set on native audio element
    const nativeAudio = document.querySelector('audio:not(#ym-sync-custom-audio), video:not(#ym-sync-custom-audio)');
    if (nativeAudio) {
        nativeAudio.volume = vol;
    }

    // 3. Set localStorage keys (store linear volume so Yandex's internal code reads it correctly)
    try {
        localStorage.setItem('volume', String(translatedVol));
        localStorage.setItem('player-volume', String(translatedVol));
    } catch (e) {}

    // Log after short timeout to let MobX or other handlers apply changes
    setTimeout(() => {
        if (window.logAllVolumes) {
            window.logAllVolumes("setNativeVolume: Применилось (100мс)");
        }
    }, 100);
};

const CustomAudioController = {
    audioElement: null,
    isPlaying: false,
    currentTrack: null,
    onStateChange: null, // Callback for UI updates

    init() {
        if (!this.audioElement) {
            this.audioElement = document.createElement('audio');
            this.audioElement.id = 'ym-sync-custom-audio';
            this.audioElement.style.display = 'none';
            document.body.appendChild(this.audioElement);

            this.audioElement.addEventListener('timeupdate', () => this.emitState());
            this.audioElement.addEventListener('play', () => {
                this.isPlaying = true;
                this.emitState();
            });
            this.audioElement.addEventListener('pause', () => {
                this.isPlaying = false;
                this.emitState();
            });
            this.audioElement.addEventListener('ended', () => {
                this.isPlaying = false;
                this.emitState();
                // Optionally play next track if we implement a custom queue
            });
            
            // Set volume to match native player on init (use exponent volume for correct loudness)
            this.audioElement.volume = window.getNativeExponentVolume ? window.getNativeExponentVolume() : 0.7;
        }
    },

    emitState() {
        if (this.onStateChange) {
            this.onStateChange({
                track: this.currentTrack,
                isPlaying: this.isPlaying,
                currentTime: this.audioElement ? this.audioElement.currentTime : 0,
                duration: this.audioElement && this.audioElement.duration ? this.audioElement.duration : (this.currentTrack ? this.currentTrack.duration / 1000 : 0)
            });
        }
    },

    async playTrack(track, streamUrl) {
        this.init();
        
        // Sync volume with native player (use exponent volume for correct loudness)
        if (window.getNativeExponentVolume) {
            this.audioElement.volume = window.getNativeExponentVolume();
        }
        
        // 1. Pause native player
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && typeof activePlayer.pause === 'function') {
            window.isCustomAudioActive = true;
            activePlayer.pause();
        } else {
            window.isCustomAudioActive = true;
        }

        // 2. Set track info immediately so UI can update
        this.currentTrack = track;
        this.emitState();

        // 3. Get blob URL (fetched by isolated bridge — bypasses media-src CSP)
        console.log('[CUSTOM AUDIO] Fetching audio blob for:', track.title);
        const blobUrl = await window.SoundCloudAPI.fetchAudioBlob(streamUrl);
        if (!blobUrl) {
            console.error('[CUSTOM AUDIO] Failed to get blob URL');
            window.isCustomAudioActive = false;
            this.currentTrack = null;
            return;
        }

        // 4. Revoke any previous blob URL to free memory
        if (this._currentBlobUrl) {
            URL.revokeObjectURL(this._currentBlobUrl);
        }
        this._currentBlobUrl = blobUrl;

        // 5. Play
        this.audioElement.src = blobUrl;
        this.audioElement.currentTime = 0;
        try {
            await this.audioElement.play();
        } catch (err) {
            console.error('[CUSTOM AUDIO] Play error:', err);
        }
    },

    togglePlayPause() {
        if (!this.audioElement) return;
        if (this.audioElement.paused) {
            this.audioElement.play();
        } else {
            this.audioElement.pause();
        }
    },

    seek(time) {
        if (!this.audioElement) return;
        this.audioElement.currentTime = time;
    },

    setVolume(vol) {
        if (!this.audioElement) return;
        this.audioElement.volume = vol;
    },

    async syncPlay(scTrackId, serverState) {
        this.init();

        // Sync volume with native player (use exponent volume for correct loudness)
        if (window.getNativeExponentVolume) {
            this.audioElement.volume = window.getNativeExponentVolume();
        }

        const numericId = String(scTrackId).replace('soundcloud:', '');

        // If the same track is already loaded
        if (this.currentTrack && String(this.currentTrack.id) === numericId) {
            // Apply play/pause state
            if (serverState.isPause) {
                if (!this.audioElement.paused) {
                    this.audioElement.pause();
                }
            } else {
                if (this.audioElement.paused) {
                    this.audioElement.play().catch(e => console.error('[CUSTOM AUDIO] Play error on sync:', e));
                }
            }

            // Apply seek position
            if (Math.abs(this.audioElement.currentTime - serverState.time) > 2) {
                console.log(`[CUSTOM AUDIO] Seek sync: ${this.audioElement.currentTime} -> ${serverState.time}`);
                this.audioElement.currentTime = serverState.time;
            }
            return;
        }

        console.log('[CUSTOM AUDIO] Syncing new SoundCloud track:', numericId);

        // 1. Pause native player
        const activePlayer = window.getActivePlayer && window.getActivePlayer();
        if (activePlayer && typeof activePlayer.pause === 'function') {
            activePlayer.pause();
        }
        window.isCustomAudioActive = true;

        // 2. Fetch track info from SoundCloud
        const track = await window.SoundCloudAPI.getTrackInfo(numericId);
        if (!track) {
            console.error('[CUSTOM AUDIO] Failed to fetch track info for:', numericId);
            return;
        }

        // 3. Get stream URL
        const streamUrl = await window.SoundCloudAPI.getStreamUrl(track);
        if (!streamUrl) {
            console.error('[CUSTOM AUDIO] Failed to get stream URL for track:', numericId);
            return;
        }

        // 4. Fetch audio blob
        const blobUrl = await window.SoundCloudAPI.fetchAudioBlob(streamUrl);
        if (!blobUrl) {
            console.error('[CUSTOM AUDIO] Failed to get audio blob for track:', numericId);
            return;
        }

        // Revoke old blob url
        if (this._currentBlobUrl) {
            URL.revokeObjectURL(this._currentBlobUrl);
        }
        this._currentBlobUrl = blobUrl;

        this.currentTrack = track;
        this.audioElement.src = blobUrl;
        this.audioElement.currentTime = serverState.time || 0;

        if (serverState.isPause) {
            this.audioElement.pause();
        } else {
            try {
                await this.audioElement.play();
            } catch (err) {
                console.error('[CUSTOM AUDIO] Play error on initial sync:', err);
            }
        }

        this.emitState();
    },

    stop() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
        }
        this.isPlaying = false;
        this.currentTrack = null;
        window.isCustomAudioActive = false;
        this.emitState();
    }
};

window.CustomAudioController = CustomAudioController;
