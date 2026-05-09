// public/js/pomodoro.js
(function () {
  const elTime = document.getElementById("pomoTime");
  const btnStart = document.getElementById("pomoStart");
  const btnPause = document.getElementById("pomoPause");
  const btnReset = document.getElementById("pomoReset");

  // Eski mod butonları (geriye uyumluluk)
  const modeWork = document.getElementById("modeWork");
  const modeShort = document.getElementById("modeShort");
  const modeLong = document.getElementById("modeLong");

  // Yeni UI (custom + planned)
  const customMinutesEl = document.getElementById("customMinutes");
  const applyCustomBtn = document.getElementById("applyCustom");
  const plannedEl = document.getElementById("pomoPlanned");

  const statusEl = document.getElementById("pomoStatus");

  // Bu sayfada pomodoro yoksa çık
  if (!elTime || !btnStart || !btnPause || !btnReset) return;

  const STORAGE_KEY = "mindshire_pomodoro_state_v3";
  const SESSION_KEY = "mindshire_pomodoro_active_session_v1";

  // ========================================
  // COMMUNITY vs PERSONAL MODE DETECTION
  // ========================================
  const isCommunity = location.pathname.includes("/study-room/community");
  const roomType = isCommunity ? "community" : "personal";
  const roomId = window.MINDSHIRE_ROOM?.id || null;
  const isHost = window.MINDSHIRE_USER?.isHost || false;

  // Debug logging
  console.log("🍅 Pomodoro Init:", {
    isCommunity,
    roomId,
    isHost,
    hasIo: typeof io !== "undefined",
    user: window.MINDSHIRE_USER,
    room: window.MINDSHIRE_ROOM
  });

  // Socket.io instance (only for community rooms)
  // IMPORTANT: Use global socket if it exists (from community-presence.js)
  let socket = null;
  if (isCommunity) {
    // Wait for global socket to be initialized by community-presence.js
    // community-presence.js loads before pomodoro.js and creates the socket
    socket = window.mindshireSocket || null;

    if (!socket) {
      console.error("🍅 ERROR: Global socket not found! community-presence.js should have created it.");
    } else {
      console.log("🍅 Using existing global socket", socket);
    }
  }

  const defaultState = {
    mode: "work",              // work | short | long | custom
    durationSec: 25 * 60,
    remainingSec: 25 * 60,
    isRunning: false,
    endAt: null,               // timestamp(ms)
    startedAtISO: null
  };

  let state = loadState();
  let tickTimer = null;

  // DB session
  let activeSessionId = loadActiveSessionId(); // string | null

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaultState };
      const parsed = JSON.parse(raw);
      return { ...defaultState, ...parsed };
    } catch {
      return { ...defaultState };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function updatePlannedUI() {
    if (!plannedEl) return;
    plannedEl.textContent = String(Math.round(state.durationSec / 60));
  }

  function setActiveBadge(mode, minutes) {
    // Yeni UI: tüm pomodoro badge butonlarını yakala
    const allBadges = document.querySelectorAll(".pomodoro__modes .badge");
    allBadges.forEach((b) => b.classList.remove("is-active"));

    // dataset üzerinden eşleşen badge'i aktif yap
    const target = Array.from(allBadges).find((b) => {
      const m = Number(b.dataset.minutes);
      const md = (b.dataset.mode || "").trim();
      return m === minutes && (md ? md === mode : true);
    });

    if (target) target.classList.add("is-active");

    // Eski id'leri de (varsalar) uyumlu tut
    if (modeWork) modeWork.classList.toggle("is-active", mode === "work" && minutes === 25);
    if (modeShort) modeShort.classList.toggle("is-active", mode === "short" && minutes === 5);
    if (modeLong) modeLong.classList.toggle("is-active", mode === "long" && minutes === 15);
  }

  function applyMode(mode, minutes) {
    if (state.isRunning) {
      setStatus("Çalışırken mod değişmez. Önce durdur. 🧙‍♀️");
      return;
    }

    const minNum = Number(minutes);
    if (!minNum || minNum < 1 || minNum > 180) {
      setStatus("Süre 1-180 dk arası olmalı.");
      return;
    }

    state.mode = mode;
    state.durationSec = minNum * 60;
    state.remainingSec = minNum * 60;
    state.endAt = null;
    state.startedAtISO = null;
    saveState();

    setActiveBadge(mode, minNum);
    updatePlannedUI();
    render();

    const nice =
      mode === "work" ? "Odak" :
        mode === "short" ? "Kısa mola" :
          mode === "long" ? "Uzun mola" : "Özel";

    setStatus(`${nice} modu hazır. Başlatınca zaman akar.`);
  }

  // ---------------------------
  // DB helpers
  // ---------------------------
  function saveActiveSessionId(id) {
    activeSessionId = id;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ sessionId: id, roomType }));
    } catch { }
  }

  function clearActiveSessionId() {
    activeSessionId = null;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch { }
  }

  function loadActiveSessionId() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.roomType && parsed.roomType !== roomType) return null;
      return parsed?.sessionId || null;
    } catch {
      return null;
    }
  }

  // Get CSRF token from cookie
  function getCsrfToken() {
    // First try: global variable from EJS
    if (window.MINDSHIRE_CSRF_TOKEN) {
      console.log('🔐 CSRF token from EJS:', window.MINDSHIRE_CSRF_TOKEN);
      return window.MINDSHIRE_CSRF_TOKEN;
    }

    // Second try: get from cookie
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === '_csrf') {
        const token = decodeURIComponent(value);
        console.log('🔐 CSRF token from cookie:', token);
        return token;
      }
    }

    // Third try: get from meta tag
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) {
      const token = meta.getAttribute('content');
      console.log('🔐 CSRF token from meta:', token);
      return token;
    }

    console.error('❌ CSRF token not found!');
    return null;
  }

  async function apiStartSession() {
    const plannedMinutes = Math.round(state.durationSec / 60);

    try {
      const csrfToken = getCsrfToken();

      if (!csrfToken) {
        throw new Error('CSRF token bulunamadı');
      }

      console.log('🍅 Starting session with:', {
        mode: state.mode,
        plannedMinutes,
        roomType,
        roomId,
        hasToken: !!csrfToken
      });

      const r = await fetch("/pomodoro/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: state.mode,
          plannedMinutes,
          roomType,
          roomId,
          _csrf: csrfToken
        })
      });

      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) {
        throw new Error(data?.message || "Pomodoro start failed");
      }

      saveActiveSessionId(data.sessionId);
      return data.sessionId;
    } catch (err) {
      console.error(err);
      setStatus("❌ DB kaydı açılamadı: " + err.message);
      return null;
    }
  }

  async function apiStopSession(finalStatus, actualSeconds) {
    if (!activeSessionId) return;

    try {
      const csrfToken = getCsrfToken();
      const r = await fetch("/pomodoro/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: activeSessionId,
          actualSeconds,
          status: finalStatus, // completed | stopped
          _csrf: csrfToken
        })
      });

      const data = await r.json().catch(() => null);
      if (data && data.xpEarned > 0) {
        // Show XP notification
        if (typeof Swal !== "undefined") {
            let html = `<h2 style="color: #ffdb58">+${data.xpEarned} XP</h2>`;
            if (data.newLeague) {
                html += `<p style="color: #00ffff; font-weight: bold; margin-top: 10px;">🌟 LİG ATLADIN: ${data.newLeague}!</p>`;
            }
            if (data.newBadges && data.newBadges.length > 0) {
                const badgeNames = data.newBadges.map(b => b === 'night_owl' ? '🦉 Gece Kuşu' : (b === 'iron_will' ? '🛡️ Demir İrade' : (b === 'first_step' ? '🌱 İlk Adım' : b)));
                html += `<p style="margin-top: 10px;">🎖️ Yeni Rozetler:<br>${badgeNames.join("<br>")}</p>`;
            }
            Swal.fire({
                title: 'Tebrikler! 🎉',
                html: html,
                icon: 'success',
                background: '#1a1a2e',
                color: '#e0e0e0',
                confirmButtonColor: '#6c5ce7'
            });
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("Tur kaydı kapatılamadı. (DB bağlantısını kontrol et)");
    } finally {
      clearActiveSessionId();
    }
  }

  // ---------------------------
  // Timer core
  // ---------------------------
  function scheduleTick() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(syncAndRender, 250);
  }

  function syncAndRender() {
    if (state.isRunning && state.endAt) {
      state.remainingSec = Math.max(0, Math.round((state.endAt - Date.now()) / 1000));
      saveState();
    }

    render();

    if (state.isRunning && state.remainingSec <= 0) {
      finish();
    }
  }

  // ========================================
  // COMMUNITY MODE: Socket-based controls
  // ========================================
  function startCommunity() {
    console.log("🍅 startCommunity called", {
      hasSocket: !!socket,
      roomId,
      isHost,
      mode: state.mode,
      durationSec: state.durationSec
    });

    if (!socket || !roomId) {
      console.error("🍅 ERROR: Missing socket or roomId", { socket: !!socket, roomId });
      setStatus("❌ Socket bağlantısı yok!");
      return;
    }
    if (!isHost) {
      console.warn("🍅 Not host, cannot start");
      setStatus("Sadece host timer'ı kontrol edebilir.");
      return;
    }

    console.log("🍅 Emitting room:timer:start event");

    // Emit to server
    socket.emit("room:timer:start", {
      roomId,
      mode: state.mode,
      durationSec: state.durationSec
    });

    setStatus("Timer başlatılıyor...");
  }

  function pauseCommunity() {
    if (!socket || !roomId) return;
    if (!isHost) {
      setStatus("Sadece host timer'ı kontrol edebilir.");
      return;
    }

    socket.emit("room:timer:pause", { roomId });
  }

  function resetCommunity() {
    if (!socket || !roomId) return;
    if (!isHost) {
      setStatus("Sadece host timer'ı kontrol edebilir.");
      return;
    }

    socket.emit("room:timer:reset", { roomId });
  }

  // ========================================
  // PERSONAL MODE: Local controls
  // ========================================
  function start() {
    if (state.isRunning) return;

    if (state.remainingSec <= 0) {
      state.remainingSec = state.durationSec;
    }

    state.isRunning = true;
    state.startedAtISO = new Date().toISOString();
    state.endAt = Date.now() + state.remainingSec * 1000;
    saveState();

    setStatus("Odak başladı. Telefonu sürgüne yolla. 🍅");

    // DB session aç
    apiStartSession();

    syncAndRender();
    scheduleTick();
  }

  async function pause() {
    if (!state.isRunning) return;

    const remaining = Math.max(0, Math.round((state.endAt - Date.now()) / 1000));
    const elapsed = Math.max(0, state.durationSec - remaining);

    state.remainingSec = remaining;
    state.isRunning = false;
    state.endAt = null;
    saveState();

    clearInterval(tickTimer);
    tickTimer = null;

    render();
    setStatus("Durduruldu. Devam etmek istersen Başlat.");

    await apiStopSession("stopped", elapsed);
  }

  function reset() {
    clearInterval(tickTimer);
    tickTimer = null;

    state.isRunning = false;
    state.endAt = null;
    state.startedAtISO = null;
    state.remainingSec = state.durationSec;
    saveState();

    render();
    setStatus("Sıfırlandı. Yeni bir tur başlatabilirsin.");
  }

  async function finish() {
    clearInterval(tickTimer);
    tickTimer = null;

    // Bittiği an elapsed tam süre olsun
    const elapsed = Math.max(0, state.durationSec);

    state.isRunning = false;
    state.endAt = null;
    state.remainingSec = 0;
    state.startedAtISO = null;
    saveState();

    render();

    try {
      new Audio("/sounds/notify.mp3").play().catch(() => { });
    } catch { }

    setStatus("Tur bitti! Küçük bir mola büyüsü zamanı ✨");

    await apiStopSession("completed", elapsed);

    // If community and host, notify server
    if (isCommunity && isHost && socket && roomId) {
      socket.emit("room:timer:finish", { roomId });
    }
  }

  function render() {
    elTime.textContent = formatTime(state.remainingSec);

    // Disable controls for participants in community mode
    const canControl = !isCommunity || isHost;

    btnStart.disabled = state.isRunning || !canControl;
    btnPause.disabled = !state.isRunning || !canControl;
    btnReset.disabled = !canControl;

    updatePlannedUI();

    const minutesNow = Math.round(state.durationSec / 60);
    setActiveBadge(state.mode, minutesNow);
  }

  // ---------------------------
  // Event bindings
  // ---------------------------
  if (isCommunity) {
    // Community mode: use socket-based controls
    btnStart.addEventListener("click", startCommunity);
    btnPause.addEventListener("click", pauseCommunity);
    btnReset.addEventListener("click", resetCommunity);
  } else {
    // Personal mode: use local controls
    btnStart.addEventListener("click", start);
    btnPause.addEventListener("click", pause);
    btnReset.addEventListener("click", reset);
  }

  // Eski 3 mod butonu (geri uyumluluk) - artık data-minutes kullanıyor
  if (modeWork) {
    modeWork.addEventListener("click", () => {
      const minutes = Number(modeWork.dataset.minutes) || 25;
      applyMode("work", minutes);
    });
  }
  if (modeShort) {
    modeShort.addEventListener("click", () => {
      const minutes = Number(modeShort.dataset.minutes) || 5;
      applyMode("short", minutes);
    });
  }
  if (modeLong) {
    modeLong.addEventListener("click", () => {
      const minutes = Number(modeLong.dataset.minutes) || 15;
      applyMode("long", minutes);
    });
  }

  // Yeni preset yakalayıcı (data-mode + data-minutes olan tüm badge'ler)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".pomodoro__modes button.badge");
    if (!btn) return;

    const minutes = Number(btn.dataset.minutes);
    if (!minutes || minutes <= 0) return;

    const mode = (btn.dataset.mode || "").trim();

    // mode yoksa dakika ile tahmin et
    const inferredMode =
      mode ||
      (minutes <= 10 ? "short" : minutes <= 20 ? "long" : "work");

    applyMode(inferredMode, minutes);
  });

  // Custom süre
  if (applyCustomBtn && customMinutesEl) {
    applyCustomBtn.addEventListener("click", () => {
      const minutes = Number(customMinutesEl.value);
      if (!minutes || minutes < 1 || minutes > 180) {
        setStatus("Özel süre 1-180 dk arasında olmalı.");
        return;
      }
      applyMode("custom", minutes);
      setStatus(`Özel süre ayarlandı: ${minutes} dk. Başlatınca başlar ✨`);
    });
  }

  // ========================================
  // SOCKET EVENT LISTENERS (Community only)
  // ========================================
  if (isCommunity && socket && roomId) {
    // Request initial timer state when joining
    socket.emit("room:timer:request", { roomId });

    // Listen for timer sync from server
    socket.on("room:timer:sync", (serverState) => {
      console.log("🍅 Timer sync received:", serverState);

      if (serverState.roomId !== roomId) return;

      // Update local state from server
      state.mode = serverState.mode;
      state.durationSec = serverState.durationSec;
      state.isRunning = serverState.isRunning;
      state.endAt = serverState.endAt;

      // Calculate remaining from server timestamp
      if (state.isRunning && state.endAt) {
        state.remainingSec = Math.max(0, Math.round((state.endAt - Date.now()) / 1000));
      } else {
        state.remainingSec = serverState.remainingSec;
      }

      saveState();

      // Start/stop local ticker based on server state
      if (state.isRunning && !tickTimer) {
        scheduleTick();
        setStatus("Host timer'ı başlattı. Odaklan! 🍅");
      } else if (!state.isRunning && tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
        if (state.remainingSec === 0) {
          setStatus("Timer bitti!");
        } else {
          setStatus("Host timer'ı duraklattı.");
        }
      }

      render();
    });

    // Listen for timer finished event
    socket.on("room:timer:finished", ({ roomId: finishedRoomId }) => {
      if (finishedRoomId !== roomId) return;

      console.log("🍅 Timer finished!");

      // Play sound for all users
      try {
        new Audio("/sounds/notify.mp3").play().catch(() => { });
      } catch { }

      setStatus("Tur bitti! Küçük bir mola büyüsü zamanı ✨");
    });

    // Listen for errors
    socket.on("room:timer:error", ({ message }) => {
      setStatus(`❌ ${message}`);
    });

    // Show participant status
    if (!isHost) {
      setStatus("🎯 Host timer'ı kontrol ediyor. Sadece izleyebilirsin.");
    }
  }

  // ---------------------------
  // Initial boot
  // ---------------------------
  render();

  if (state.isRunning) {
    setStatus("Devam eden bir odak turu var. Kaldığın yerden devam. 🍅");
    scheduleTick();
  } else {
    if (isCommunity && !isHost) {
      setStatus("🎯 Host timer'ı kontrol ediyor. Hazır olunca başlayacak.");
    } else {
      setStatus("Hazır. Başlatınca odak başlar.");
    }
  }
})();
