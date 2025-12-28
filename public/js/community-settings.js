(function () {
  if (!window.MINDSHIRE_ROOM?.id) return;

  const roomId = window.MINDSHIRE_ROOM.id;
  const form = document.getElementById("hostSettingsForm");
  if (!form) return; // host değilse zaten yok

  const statusEl = document.getElementById("settingsStatus");

  // Use global socket from community-presence.js
  const socket = window.mindshireSocket || io();

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  // Get CSRF token from form or cookie
  function getCsrfToken() {
    // Try from form input
    const input = form.querySelector('input[name="_csrf"]');
    if (input?.value) return input.value;

    // Try from cookie
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === '_csrf') {
        return decodeURIComponent(value);
      }
    }

    // Try from global variable
    if (window.MINDSHIRE_CSRF_TOKEN) {
      return window.MINDSHIRE_CSRF_TOKEN;
    }

    return null;
  }

  function updateLocalUI(room) {
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

    // Form alanlarını da güncelle (host için)
    if (form) {
      const titleInput = form.querySelector('input[name="title"]');
      const themeKeySelect = form.querySelector('select[name="themeKey"]');
      const themeLabelInput = form.querySelector('input[name="themeLabel"]');
      const focusInput = form.querySelector('input[name="focusMinutes"]');
      const shortBreakInput = form.querySelector('input[name="shortBreakMinutes"]');
      const longBreakInput = form.querySelector('input[name="longBreakMinutes"]');
      const sessionsInput = form.querySelector('input[name="sessionsCount"]');
      const isLockedCheckbox = form.querySelector('input[name="isLocked"]');

      if (titleInput) titleInput.value = room.title || '';
      if (themeKeySelect) themeKeySelect.value = room.themeKey || 'bg1';
      if (themeLabelInput) themeLabelInput.value = room.themeLabel || '';
      if (focusInput) focusInput.value = room.focusMinutes || 25;
      if (shortBreakInput) shortBreakInput.value = room.shortBreakMinutes || 5;
      if (longBreakInput) longBreakInput.value = room.longBreakMinutes || 15;
      if (sessionsInput) sessionsInput.value = room.sessionsCount || 4;
      if (isLockedCheckbox) isLockedCheckbox.checked = room.isLocked || false;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const csrfToken = getCsrfToken();

    if (!csrfToken) {
      setStatus("❌ CSRF token bulunamadı!");
      return;
    }

    // Convert FormData to JSON
    const data = {
      title: fd.get('title'),
      themeKey: fd.get('themeKey'),
      themeLabel: fd.get('themeLabel'),
      focusMinutes: Number(fd.get('focusMinutes')),
      shortBreakMinutes: Number(fd.get('shortBreakMinutes')),
      longBreakMinutes: Number(fd.get('longBreakMinutes')),
      sessionsCount: Number(fd.get('sessionsCount')),
      isLocked: fd.get('isLocked') === 'on',
      _csrf: csrfToken
    };

    console.log('📤 Sending settings update:', data);

    try {
      const r = await fetch(form.action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const responseData = await r.json().catch(() => null);

      if (!r.ok || !responseData?.ok) {
        throw new Error(responseData?.message || "Kaydetme başarısız");
      }

      setStatus("✅ Kaydedildi. Herkese yansıtılıyor...");

      // Kendi UI'ımızı hemen güncelle
      updateLocalUI(responseData.room);

      // odadaki herkese canlı yansıt
      socket.emit("room:settingsUpdated", { roomId, room: responseData.room });

    } catch (err) {
      console.error('❌ Settings update error:', err);
      setStatus("❌ Kaydedilemedi: " + err.message);
    }
  });

  // Listen for settings updates from other clients (via server broadcast)
  socket.on("room:settings", ({ roomId: updatedRoomId, room }) => {
    console.log('📥 Received settings update:', { updatedRoomId, room });

    if (updatedRoomId !== roomId) return;

    updateLocalUI(room);
    setStatus("✅ Ayarlar güncellendi!");
  });
})();
