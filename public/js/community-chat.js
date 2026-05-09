// public/js/community-chat.js
(function () {
    if (!window.MINDSHIRE_ROOM?.id) return;

    const roomId = window.MINDSHIRE_ROOM.id;
    const socket = window.mindshireSocket || io();

    // DOM Elements
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    const chatContainer = document.getElementById("chatContainer");

    // Remove the welcome placeholder if there is a real message
    function removePlaceholder() {
        const placeholder = chatContainer.querySelector(".study-room__hint");
        if (placeholder) {
            placeholder.remove();
        }
    }

    function addMessageToUI(messageData) {
        removePlaceholder();

        const { sender, message, timestamp } = messageData;
        const timeString = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const isMe = window.MINDSHIRE_USER && sender.id === window.MINDSHIRE_USER.id;

        const msgDiv = document.createElement("div");
        msgDiv.style.display = "flex";
        msgDiv.style.gap = "8px";
        msgDiv.style.alignItems = "flex-start";
        
        if (isMe) {
            msgDiv.style.flexDirection = "row-reverse";
        }

        msgDiv.innerHTML = `
            <img src="${sender.avatarUrl}" alt="Avatar" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid ${sender.isHost ? '#facc15' : 'rgba(255,255,255,0.2)'}; flex-shrink: 0;">
            <div style="background: ${isMe ? 'rgba(79, 70, 229, 0.4)' : 'rgba(255, 255, 255, 0.1)'}; padding: 8px 12px; border-radius: 8px; max-width: 80%;">
                <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-bottom: 4px; display: flex; justify-content: ${isMe ? 'flex-end' : 'space-between'}; gap: 8px;">
                    ${!isMe ? `<strong>${sender.name} ${sender.isHost ? '👑' : ''}</strong>` : ''}
                    <span>${timeString}</span>
                </div>
                <div style="font-size: 0.9rem; word-break: break-word;">${escapeHTML(message)}</div>
            </div>
        `;

        chatContainer.appendChild(msgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Helper to prevent XSS
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    if (chatForm) {
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const message = chatInput.value.trim();
            if (!message) return;

            // Emit chat message event
            socket.emit("room:chat:send", {
                roomId,
                message
            });

            // Clear input
            chatInput.value = "";
        });
    }

    // Listen for incoming chat messages
    socket.on("room:chat:message", (payload) => {
        if (!payload || payload.roomId !== roomId) return;
        addMessageToUI(payload);
    });

})();
