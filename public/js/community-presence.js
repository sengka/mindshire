// public/js/community-presence.js
(function () {
  if (!window.MINDSHIRE_ROOM?.id) return;

  const roomId = window.MINDSHIRE_ROOM.id;

  const onlineEl = document.getElementById("onlineCount");
  const avatarListEl = document.getElementById("avatarList");

  // Socket bağlantısı
  const socket = io();

  // Make socket globally available for pomodoro.js
  window.mindshireSocket = socket;

  // EJS’den user bilgisi geçelim (aşağıda ekleyeceğiz)
  const user = window.MINDSHIRE_USER || {
    id: null,
    name: "Misafir",
    avatarUrl: "/img/avatars/default.png",
    isHost: false,
  };

  socket.emit("room:join", { roomId, user });

  socket.on("presence:update", (payload) => {
    console.log("🔔 presence:update received:", payload);
    
    if (!payload || payload.roomId !== roomId) return;

    if (onlineEl) onlineEl.textContent = String(payload.count || 0);

    if (!avatarListEl) {
      console.error("❌ avatarList element not found!");
      return;
    }
    
    avatarListEl.innerHTML = "";

    const users = payload.users || [];
    console.log("👥 Total users:", users.length);

    // Deduplicate users based on ID
    const uniqueUsers = [];
    const seenIds = new Set();

    users.forEach(u => {
      if (!u.id) return;
      if (!seenIds.has(u.id)) {
        seenIds.add(u.id);
        uniqueUsers.push(u);
      }
    });

    console.log("✅ Unique users after deduplication:", uniqueUsers.length);

    uniqueUsers.forEach((u) => {
      console.log("🎨 Rendering avatar for:", u.name, "isHost:", u.isHost, "avatarUrl:", u.avatarUrl);
      
      const wrap = document.createElement("div");
      wrap.className = "avatar";

      const isHost = u.isHost === true;
      const displayName = u.name || "Kullanıcı";

      wrap.title = (isHost ? "👑 Host: " : "") + displayName;

      // Avatar URL check
      const avatarUrl = u.avatarUrl || "/img/avatars/default.png";
      wrap.style.backgroundImage = `url('${avatarUrl}')`;
      wrap.style.backgroundSize = "cover";
      wrap.style.backgroundPosition = "center";

      // Host distinction - Gold border
      if (isHost) {
        wrap.style.boxShadow = "0 0 0 2px #FFD700, 0 0 8px rgba(255, 215, 0, 0.5)"; // Gold ring + glow
        wrap.style.border = "2px solid #fff"; // Inner white border for contrast
        wrap.style.zIndex = "10"; // Bring to front
      }

      avatarListEl.appendChild(wrap);
      console.log("✅ Avatar added to DOM");
    });
  });

  socket.on("room:settings", (payload) => {
    if (!payload || payload.roomId !== roomId) return;
    const room = payload.room;

    // Başlık güncelle
    const h1 = document.querySelector(".study-room__title");
    if (h1 && room.title) h1.textContent = room.title;

    // Tema etiketi güncelle
    const themeStrong = document.querySelector(".study-room__subtitle strong");
    if (themeStrong && room.themeLabel) themeStrong.textContent = room.themeLabel;

    // Arka plan uygula
    if (room.themeKey) {
      const url = `/img/studybg/${room.themeKey}.png`;
      document.body.style.backgroundImage = `url('${url}')`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundAttachment = "fixed";
    }

    // Pomodoro preset butonlarının data-minutes değerlerini güncelle
    const bWork = document.getElementById("modeWork");
    const bShort = document.getElementById("modeShort");
    const bLong = document.getElementById("modeLong");

    if (bWork && room.focusMinutes) {
      bWork.dataset.minutes = String(room.focusMinutes);
      bWork.textContent = `🍅 Odak: ${room.focusMinutes} dk`;
    }
    if (bShort && room.shortBreakMinutes) {
      bShort.dataset.minutes = String(room.shortBreakMinutes);
      bShort.textContent = `☕ Kısa mola: ${room.shortBreakMinutes} dk`;
    }
    if (bLong && room.longBreakMinutes) {
      bLong.dataset.minutes = String(room.longBreakMinutes);
      bLong.textContent = `🌙 Uzun mola: ${room.longBreakMinutes} dk`;
    }
  });
})();
