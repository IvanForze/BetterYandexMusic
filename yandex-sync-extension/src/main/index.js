// Обработка сообщений от сервера (через isolated.js)
window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data || event.data.type !== "FROM_ISOLATED") return;

  if (event.data.action === "SYNC_STATE") {
    const serverState = event.data.state;
    console.log("[SYNC] [ОБРАБОТКА ИЗ ISOLATED] Main.js получил SYNC_STATE:", serverState);

    if (isSyncingFromServer) {
      console.log("[SYNC] Игнорируем команду синхронизации, так как уже идет процесс синхронизации");
      return;
    }

    let localTrackId = null;
    if (window.isCustomAudioActive && window.CustomAudioController && window.CustomAudioController.currentTrack) {
      localTrackId = `soundcloud:${window.CustomAudioController.currentTrack.id}`;
    } else {
      const activePlayer = getActivePlayer();
      const currentEntity = activePlayer?.queueController?.queue?.state?.currentEntity?.value;
      const entityData = currentEntity?.entity?.data;
      localTrackId = entityData?.meta?.id || entityData?.id;
    }

    isSyncingFromServer = true;
    startSyncSafetyTimeout();

    const isServerTrackValid = serverState.trackId && 
                               String(serverState.trackId).trim() !== "" && 
                               String(serverState.trackId) !== "undefined" && 
                               String(serverState.trackId) !== "null";

    const activePlayer = getActivePlayer();

    // 1. Смена трека (или если плеер еще не инициализирован)
    if (isServerTrackValid && (!activePlayer || String(serverState.trackId) !== String(localTrackId))) {
      console.log(`[SYNC] Получена команда смены трека на ID: ${serverState.trackId}`);

      if (String(serverState.trackId).startsWith("soundcloud:")) {
        console.log(`[SYNC] Запуск SoundCloud синхронизации для: ${serverState.trackId}`);
        window.CustomAudioController.syncPlay(serverState.trackId, serverState)
          .then(() => {
            clearSyncSafetyTimeout();
            isSyncingFromServer = false;
            targetTrackIdToSync = null;
            targetServerStateToSync = null;
          })
          .catch(err => {
            console.error('[SYNC] Ошибка при синхронизации SoundCloud трека:', err);
            clearSyncSafetyTimeout();
            isSyncingFromServer = false;
            targetTrackIdToSync = null;
            targetServerStateToSync = null;
          });
        return;
      }

      // Stop custom audio if we are switching to a Yandex track
      if (window.CustomAudioController) {
        window.CustomAudioController.stop();
      }

      targetTrackIdToSync = String(serverState.trackId);
      targetServerStateToSync = serverState;

      const fallbackToRouter = (state) => {
        const path = `/track/${state.trackId}`;
        const playParam = state.isPause ? "" : "?play=1";
        const fullUrl = `${path}${playParam}`;

        console.log(`[SYNC] Резервный редирект отключен: ${fullUrl}`);
        // window.location.href = fullUrl;

        clearSyncSafetyTimeout();
        isSyncingFromServer = false;
        targetTrackIdToSync = null;
        targetServerStateToSync = null;
      };

      if (activePlayer) {
        try {
          // Стратегия А: Поиск трека в текущей очереди плеера
          const queueState = activePlayer.playbackState?.queueState;
          if (queueState && queueState.entityList && queueState.entityList.value) {
            const list = queueState.entityList.value;
            // Ищем нужный трек в списке
            const trackIndex = list.findIndex(wrapper => {
              const data = wrapper?.entity?.data || wrapper?.entity?.entityData;
              const id = data?.meta?.id || data?.id;
              return String(id) === String(serverState.trackId);
            });

            if (trackIndex !== -1) {
              console.log(`[SYNC] Трек найден в текущей очереди на индексе ${trackIndex}. Переключаем очередь через setEntityByIndex.`);
              
              if (typeof activePlayer.setEntityByIndex === 'function') {
                activePlayer.setEntityByIndex(trackIndex);
              } else if (queueState.index && typeof queueState.index.value !== 'undefined') {
                queueState.index.value = trackIndex;
              } else {
                queueState.index = trackIndex;
              }
              
              // Ждем переключения трека в checkAndSendState для вызова syncPlayerControls
              return; // Выходим, так как успешно переключились!
            }
          }

          // Стратегия Б: Инжект трека в текущую очередь (бесшовный переход)
          console.log("[SYNC] Трека нет в очереди. Добавляем (inject) и переключаем...");
          if (activePlayer.queueController && typeof activePlayer.queueController.inject === 'function') {
            const currentIndex = queueState?.index?.value || 0;
            const insertIndex = currentIndex + 1;
            
            activePlayer.queueController.inject({
              entitiesData: [
                { type: "unloaded", meta: { id: String(serverState.trackId) } }
              ],
              position: insertIndex,
              silent: false // Меняем на false для надежной генерации событий обновления MobX
            });

            // Даем плееру небольшую задержку на переваривание инжекта, а затем ищем точную позицию
            setTimeout(() => {
              const list = queueState?.entityList?.value || [];
              let targetIndex = -1;
              
              // Динамический поиск трека по ID в очереди, чтобы переключить на верный индекс
              for (let i = 0; i < list.length; i++) {
                const d = list[i]?.entity?.data || list[i]?.entity?.entityData;
                const id = d?.meta?.id || d?.id;
                if (String(id) === String(serverState.trackId)) {
                  // Выбираем индекс, ближайший к insertIndex
                  if (targetIndex === -1 || Math.abs(i - insertIndex) < Math.abs(targetIndex - insertIndex)) {
                    targetIndex = i;
                  }
                }
              }
              
              const finalIndex = targetIndex !== -1 ? targetIndex : insertIndex;
              console.log(`[SYNC] Переключаемся на внедренный трек (целевой индекс ${finalIndex}, расчетный ${insertIndex})`);
              
              if (typeof activePlayer.setEntityByIndex === 'function') {
                activePlayer.setEntityByIndex(finalIndex);
              }
              // Ждем переключения трека в checkAndSendState для вызова syncPlayerControls
            }, 500);
            
            return; // Выходим, так как стратегия инжекта запущена
          } else {
            console.log("[SYNC] Метод inject не найден. Переходим на запасной роутер.");
            fallbackToRouter(serverState);
          }
        } catch (e) {
          console.error("[SYNC] Ошибка при взаимодействии с API Sonata:", e);
          fallbackToRouter(serverState);
        }
      } else {
        fallbackToRouter(serverState);
      }
    } 
    // 2. Трек тот же, синхронизируем время/паузу
    else if (isServerTrackValid) {
      if (String(serverState.trackId).startsWith("soundcloud:")) {
        window.CustomAudioController.syncPlay(serverState.trackId, serverState)
          .then(() => {
            clearSyncSafetyTimeout();
            isSyncingFromServer = false;
            targetTrackIdToSync = null;
            targetServerStateToSync = null;
          })
          .catch(err => {
            console.error('[SYNC] Ошибка при синхронизации SoundCloud трека:', err);
            clearSyncSafetyTimeout();
            isSyncingFromServer = false;
            targetTrackIdToSync = null;
            targetServerStateToSync = null;
          });
      } else if (activePlayer) {
        syncPlayerControls(activePlayer, serverState);
        clearSyncSafetyTimeout();
        isSyncingFromServer = false;
        targetTrackIdToSync = null;
        targetServerStateToSync = null;
      } else {
        clearSyncSafetyTimeout();
        isSyncingFromServer = false;
        targetTrackIdToSync = null;
        targetServerStateToSync = null;
      }
    } else {
      clearSyncSafetyTimeout();
      isSyncingFromServer = false;
      targetTrackIdToSync = null;
      targetServerStateToSync = null;
    }
  }
});
