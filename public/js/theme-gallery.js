// public/js/theme-gallery.js
(function () {
  const track = document.getElementById("themeTrack");
  const keyInput = document.getElementById("themeKey");
  const labelInput = document.getElementById("themeLabel");
  const pickedLabel = document.getElementById("themePickedLabel");

  if (!track || !keyInput || !labelInput) return;

  const leftBtn = document.querySelector(".theme-nav--left");
  const rightBtn = document.querySelector(".theme-nav--right");

  function selectSlide(slide) {
    if (!slide) return;
    track.querySelectorAll(".theme-slide").forEach((el) => el.classList.remove("is-selected"));
    slide.classList.add("is-selected");

    const key = slide.dataset.key || "bg1";
    const label = slide.dataset.label || "Gece Kütüphanesi";

    keyInput.value = key;
    labelInput.value = label;
    if (pickedLabel) pickedLabel.textContent = label;
  }

  track.addEventListener("click", (e) => {
    const slide = e.target.closest(".theme-slide");
    if (!slide) return;
    selectSlide(slide);
  });

  // oklar ile kaydırma
  function scrollByCard(dir) {
    const first = track.querySelector(".theme-slide");
    const amount = (first?.offsetWidth || 320) + 14; // kart + gap
    track.scrollBy({ left: dir * amount, behavior: "smooth" });
  }

  if (leftBtn) leftBtn.addEventListener("click", () => scrollByCard(-1));
  if (rightBtn) rightBtn.addEventListener("click", () => scrollByCard(1));

  // ilk seçim: is-selected olanı okut
  const initial = track.querySelector(".theme-slide.is-selected") || track.querySelector(".theme-slide");
  selectSlide(initial);
})();
