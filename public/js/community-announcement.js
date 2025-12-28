// public/js/community-announcement.js
(function () {
    if (!window.MINDSHIRE_ROOM?.id) return;

    const roomId = window.MINDSHIRE_ROOM.id;
    const user = window.MINDSHIRE_USER || {};
    const isHost = user.isHost === true;

    // DOM elements
    const announcementForm = document.getElementById("announcementForm");
    const announcementTextInput = document.getElementById("announcementTextInput");
    const deleteBtn = document.getElementById("deleteAnnouncement");
    const announcementStatus = document.getElementById("announcementStatus");
    const announcementContainer = document.getElementById("announcementContainer");
    const announcementText = document.getElementById("announcementText");
    const announcementReactions = document.getElementById("announcementReactions");
    const noAnnouncementMsg = document.getElementById("noAnnouncementMsg");
    const emojiButtons = document.querySelectorAll(".emoji-btn");

    // Socket connection (reuse from community-presence.js)
    const socket = window.mindshireSocket || io();

    // Get CSRF token from meta tag or cookie
    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) return meta.getAttribute('content');

        // Fallback: get from cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === '_csrf') return decodeURIComponent(value);
        }
        return null;
    }

    function setStatus(msg) {
        if (announcementStatus) announcementStatus.textContent = msg;
    }

    function renderReactions(reactions) {
        // Find reactions container dynamically (it might be recreated)
        const reactionsContainer = document.getElementById("announcementReactions");
        if (!reactionsContainer) return;

        reactionsContainer.innerHTML = "";

        if (!reactions || reactions.length === 0) return;

        reactions.forEach(reaction => {
            if (!reaction.userIds || reaction.userIds.length === 0) return;

            const reactionEl = document.createElement("span");
            reactionEl.className = "reaction-badge";

            // Check if current user has reacted with this emoji
            const userHasReacted = reaction.userIds.some(id => String(id) === String(user.id));
            if (userHasReacted) {
                reactionEl.classList.add("user-reacted");
            }

            reactionEl.textContent = `${reaction.emoji} ${reaction.userIds.length}`;
            reactionEl.title = `${reaction.userIds.length} kişi bu tepkiyi verdi`;

            reactionsContainer.appendChild(reactionEl);
        });
    }

    function showAnnouncement(announcement) {
        if (!announcementContainer) return;

        // Hide "no announcement" message
        if (noAnnouncementMsg) noAnnouncementMsg.style.display = "none";

        // Create or update announcement box
        let announcementBox = document.getElementById("announcementBox");
        if (!announcementBox) {
            announcementBox = document.createElement("div");
            announcementBox.className = "announcement-box";
            announcementBox.id = "announcementBox";
            announcementBox.innerHTML = `
        <p class="announcement-text" id="announcementText"></p>
        <div class="announcement-reactions" id="announcementReactions"></div>
      `;
            announcementContainer.insertBefore(announcementBox, announcementContainer.firstChild);
        }

        // Update text
        const textEl = announcementBox.querySelector("#announcementText");
        if (textEl) textEl.textContent = announcement.text;

        // Render reactions
        const reactionsEl = announcementBox.querySelector("#announcementReactions");
        if (reactionsEl) {
            renderReactions(announcement.reactions);
        }

        // Show delete button if host
        if (deleteBtn && isHost) {
            deleteBtn.style.display = "inline-block";
        }
    }

    function hideAnnouncement() {
        if (!announcementContainer) return;

        const announcementBox = document.getElementById("announcementBox");
        if (announcementBox) {
            announcementBox.remove();
        }

        // Show "no announcement" message
        if (!noAnnouncementMsg) {
            const msg = document.createElement("p");
            msg.className = "study-room__hint";
            msg.id = "noAnnouncementMsg";
            msg.textContent = "Henüz duyuru yok.";
            announcementContainer.appendChild(msg);
        } else {
            noAnnouncementMsg.style.display = "block";
        }

        // Hide delete button
        if (deleteBtn) {
            deleteBtn.style.display = "none";
        }

        // Clear input if host
        if (announcementTextInput) {
            announcementTextInput.value = "";
        }
    }

    // ========================================
    // HOST: Create/Update Announcement
    // ========================================
    if (announcementForm && isHost) {
        announcementForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const text = announcementTextInput.value.trim();
            if (!text) {
                setStatus("❌ Duyuru metni boş olamaz.");
                return;
            }

            try {
                const csrfToken = getCsrfToken();
                const response = await fetch(`/study-room/community/${roomId}/announcement`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "CSRF-Token": csrfToken
                    },
                    body: JSON.stringify({ text, _csrf: csrfToken })
                });

                const data = await response.json();

                if (!response.ok || !data.ok) {
                    throw new Error(data.message || "Duyuru kaydedilemedi");
                }

                setStatus("✅ Duyuru kaydedildi.");
                showAnnouncement(data.announcement);

                // Broadcast to other users via socket
                socket.emit("room:announcement:updated", {
                    roomId,
                    announcement: data.announcement
                });

            } catch (err) {
                console.error("Announcement save error:", err);
                setStatus("❌ " + err.message);
            }
        });
    }

    // ========================================
    // HOST: Delete Announcement
    // ========================================
    if (deleteBtn && isHost) {
        deleteBtn.addEventListener("click", async () => {
            if (!confirm("Duyuruyu silmek istediğinize emin misiniz?")) return;

            try {
                const csrfToken = getCsrfToken();
                const response = await fetch(`/study-room/community/${roomId}/announcement`, {
                    method: "DELETE",
                    headers: {
                        "CSRF-Token": csrfToken
                    }
                });

                const data = await response.json();

                if (!response.ok || !data.ok) {
                    throw new Error(data.message || "Duyuru silinemedi");
                }

                setStatus("✅ Duyuru silindi.");
                hideAnnouncement();

                // Broadcast to other users via socket
                socket.emit("room:announcement:deleted", { roomId });

            } catch (err) {
                console.error("Announcement delete error:", err);
                setStatus("❌ " + err.message);
            }
        });
    }

    // ========================================
    // ALL USERS: Emoji Reactions
    // ========================================
    emojiButtons.forEach(btn => {
        btn.addEventListener("click", async () => {
            const emoji = btn.dataset.emoji;
            if (!emoji) return;

            // Check if announcement exists
            const announcementBox = document.getElementById("announcementBox");
            if (!announcementBox) {
                setStatus("❌ Duyuru olmadan reaction veremezsiniz.");
                setTimeout(() => setStatus(""), 3000);
                return;
            }

            try {
                const csrfToken = getCsrfToken();
                const response = await fetch(`/study-room/community/${roomId}/announcement/react`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "CSRF-Token": csrfToken
                    },
                    body: JSON.stringify({ emoji, _csrf: csrfToken })
                });

                const data = await response.json();

                if (!response.ok || !data.ok) {
                    throw new Error(data.message || "Reaction eklenemedi");
                }

                // Update reactions locally
                renderReactions(data.reactions);

                // Broadcast to other users via socket
                socket.emit("room:announcement:reacted", {
                    roomId,
                    reactions: data.reactions
                });

            } catch (err) {
                console.error("Reaction error:", err);
                setStatus("❌ " + err.message);
                setTimeout(() => setStatus(""), 3000);
            }
        });
    });

    // ========================================
    // SOCKET LISTENERS
    // ========================================

    // Listen for announcement updates from other users
    socket.on("room:announcement:update", (payload) => {
        if (!payload || payload.roomId !== roomId) return;
        showAnnouncement(payload.announcement);
    });

    // Listen for announcement deletion from host
    socket.on("room:announcement:delete", (payload) => {
        if (!payload || payload.roomId !== roomId) return;
        hideAnnouncement();
    });

    // Listen for reaction updates from other users
    socket.on("room:announcement:reaction", (payload) => {
        if (!payload || payload.roomId !== roomId) return;
        renderReactions(payload.reactions);
    });

    // ========================================
    // INITIAL RENDER
    // ========================================
    // Render initial reactions if announcement exists
    const initialReactions = window.MINDSHIRE_ROOM_ANNOUNCEMENT?.reactions;
    if (initialReactions && announcementReactions) {
        renderReactions(initialReactions);
    }
})();
