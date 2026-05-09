// public/js/community-audio.js
document.addEventListener("DOMContentLoaded", () => {
    // TABS
    const tabAmbient = document.getElementById("tabAmbient");
    const tabSpotify = document.getElementById("tabSpotify");
    const contentAmbient = document.getElementById("contentAmbient");
    const contentSpotify = document.getElementById("contentSpotify");

    if (tabAmbient && tabSpotify) {
        tabAmbient.addEventListener("click", () => {
            tabAmbient.classList.add("btn-primary");
            tabAmbient.classList.remove("btn-secondary");
            tabSpotify.classList.add("btn-secondary");
            tabSpotify.classList.remove("btn-primary");
            contentAmbient.style.display = "block";
            contentSpotify.style.display = "none";
        });

        tabSpotify.addEventListener("click", () => {
            tabSpotify.classList.add("btn-primary");
            tabSpotify.classList.remove("btn-secondary");
            tabAmbient.classList.add("btn-secondary");
            tabAmbient.classList.remove("btn-primary");
            contentSpotify.style.display = "block";
            contentAmbient.style.display = "none";
            
            // Sadece Spotify sekmesine tıklandığında durumu kontrol et
            checkSpotifyStatus();
        });
    }

    // AMBIENT LOGIC
    const ambientPlayer = document.getElementById("ambientPlayer");
    const ambientBtns = document.querySelectorAll(".ambient-btn");
    const ambientVolume = document.getElementById("ambientVolume");
    const ambientStop = document.getElementById("ambientStop");

    if (ambientPlayer) {
        ambientBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const src = btn.getAttribute("data-src");
                ambientPlayer.src = src;
                ambientPlayer.play().catch(err => console.error("Ses oynatma hatası:", err));
                
                ambientBtns.forEach(b => {
                    b.style.backgroundColor = ""; // Reset
                    b.classList.remove("btn-primary");
                    b.classList.add("btn-secondary");
                });
                btn.classList.remove("btn-secondary");
                btn.classList.add("btn-primary");
            });
        });

        if (ambientVolume) {
            ambientPlayer.volume = ambientVolume.value; // set initial volume
            ambientVolume.addEventListener("input", (e) => {
                ambientPlayer.volume = e.target.value;
            });
        }

        if (ambientStop) {
            ambientStop.addEventListener("click", () => {
                ambientPlayer.pause();
                ambientBtns.forEach(b => {
                    b.classList.remove("btn-primary");
                    b.classList.add("btn-secondary");
                });
            });
        }
    }

    // SPOTIFY LOGIC
    const spotifyConnectDiv = document.getElementById("spotifyConnectDiv");
    const spotifyPlayerDiv = document.getElementById("spotifyPlayerDiv");
    const spotifyPlaylists = document.getElementById("spotifyPlaylists");
    const spotifyIframeContainer = document.getElementById("spotifyIframeContainer");
    let hasFetchedPlaylists = false;

    async function checkSpotifyStatus() {
        if (hasFetchedPlaylists) return; // Zaten çektiysek bir daha API'ye gitme
        
        try {
            const res = await fetch("/spotify/status");
            const data = await res.json();
            
            if (data.connected) {
                spotifyConnectDiv.style.display = "none";
                spotifyPlayerDiv.style.display = "block";
                fetchPlaylists();
            } else {
                spotifyConnectDiv.style.display = "block";
                spotifyPlayerDiv.style.display = "none";
            }
        } catch (err) {
            console.error("Spotify durum kontrolü hatası:", err);
        }
    }

    async function fetchPlaylists() {
        try {
            const res = await fetch("/spotify/playlists");
            const data = await res.json();
            
            if (data.success) {
                hasFetchedPlaylists = true;
                
                // Seçenekleri temizle ve doldur
                spotifyPlaylists.innerHTML = '<option value="">Çalma listesi seç...</option>';
                
                data.playlists.forEach(pl => {
                    const option = document.createElement("option");
                    option.value = pl.id;
                    option.textContent = pl.name;
                    spotifyPlaylists.appendChild(option);
                });
            } else if (res.status === 401) {
                // Token süresi dolduysa
                spotifyConnectDiv.style.display = "block";
                spotifyPlayerDiv.style.display = "none";
                hasFetchedPlaylists = false;
            }
        } catch (err) {
            console.error("Çalma listeleri alınamadı:", err);
        }
    }

    if (spotifyPlaylists) {
        spotifyPlaylists.addEventListener("change", (e) => {
            const playlistId = e.target.value;
            if (!playlistId) {
                spotifyIframeContainer.innerHTML = '<p class="study-room__hint" style="margin: auto;">Listeden bir müzik seçin</p>';
                return;
            }
            
            // Spotify Embed Iframe - theme=0 means dark mode
            spotifyIframeContainer.innerHTML = `
                <iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
            `;
        });
    }
});
