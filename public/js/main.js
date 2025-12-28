// çok hafif bir “büyü” efekti: scroll smooth + küçük parıltı animasyonu

// sayfa içinde anchor tıklamalarında yumuşak kaydırma
document.documentElement.style.scrollBehavior = "smooth";

// butonlara ufak bir “pulse” animasyonu
const primaryBtn = document.querySelector(".btn-primary");
if (primaryBtn) {
  setInterval(() => {
    primaryBtn.classList.add("pulse");
    setTimeout(() => primaryBtn.classList.remove("pulse"), 600);
  }, 6000);
}
