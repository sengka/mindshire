
// public/js/study-room.js
(function () {
  const input = document.getElementById("ytUrl");
  const player = document.getElementById("ytPlayer");
  const statusEl = document.getElementById("ytStatus");

  if (!input || !player) return; // sadece personal sayfada çalışsın

  function extractYouTubeId(url) {
    if (!url) return null;

    // Kullanıcı bazen sadece id de yapıştırabilir
    const trimmed = url.trim();

    // 11 karakterlik video id formatına yakınsa direkt kabul et
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

    try {
      const u = new URL(trimmed);

      // youtu.be/VIDEOID
      if (u.hostname.includes("youtu.be")) {
        const id = u.pathname.replace("/", "");
        return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }

      // youtube.com/watch?v=VIDEOID
      const v = u.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      // youtube.com/embed/VIDEOID
      const embedMatch = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];

      return null;
    } catch (e) {
      // URL parse edilemezse null
      return null;
    }
  }

  function setStatus(msg, type = "info") {
    if (!statusEl) return;
    statusEl.textContent = msg;

    statusEl.dataset.type = type; // css ile renklendirebilirsin
  }

  function updatePlayer(videoId) {
    // autoplay=1 bazı tarayıcılarda ses açıkken engellenir; güvenli olsun diye mute=1
    const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`;
    player.src = src;
  }

  let debounceTimer = null;

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const id = extractYouTubeId(input.value);

      if (!id) {
        setStatus("Geçerli bir YouTube linki yapıştır (watch?v=... veya youtu.be/...) ✨", "error");
        return;
      }

      updatePlayer(id);
      setStatus("Video yüklendi. Odak zamanı.", "success");
    }, 450);
  });

  // Kullanıcı paste yapınca daha hızlı tepki verelim
  input.addEventListener("paste", () => {
    setTimeout(() => {
      const id = extractYouTubeId(input.value);
      if (!id) {
        setStatus("Linki tanıyamadım. YouTube linki olduğundan emin misin?", "error");
        return;
      }
      updatePlayer(id);
      setStatus("Video yüklendi. 🍵", "success");
    }, 50);
  });
})();
