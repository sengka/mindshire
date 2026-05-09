// public/js/community-webrtc.js
(function () {
    if (!window.MINDSHIRE_ROOM?.id || !window.SimplePeer) return;

    const roomId = window.MINDSHIRE_ROOM.id;
    const socket = window.mindshireSocket || io();

    const videoGrid = document.getElementById("videoGrid");
    const noVideoHint = document.getElementById("noVideoHint");
    const toggleCameraBtn = document.getElementById("toggleCameraBtn");

    let localStream = null;
    let cameraActive = false;
    const peers = {}; // socket.id -> SimplePeer instance

    function removeHint() {
        if (noVideoHint) noVideoHint.style.display = "none";
    }

    function checkHint() {
        // Find all child nodes that are video wrappers
        const wrappers = Array.from(videoGrid.children).filter(el => el.id && el.id.startsWith("video-wrapper-"));
        if (wrappers.length === 0 && noVideoHint) {
            noVideoHint.style.display = "block";
        }
    }

    function addVideoElement(id, stream, isLocal = false) {
        removeHint();
        
        // Remove if exists
        const existing = document.getElementById(`video-wrapper-${id}`);
        if (existing) existing.remove();

        const videoContainer = document.createElement("div");
        videoContainer.id = `video-wrapper-${id}`;
        videoContainer.style.position = "relative";
        videoContainer.style.width = "180px";
        videoContainer.style.height = "135px"; // 4:3 aspect ratio
        videoContainer.style.backgroundColor = "#000";
        videoContainer.style.borderRadius = "8px";
        videoContainer.style.overflow = "hidden";
        videoContainer.style.boxShadow = "0 4px 6px rgba(0,0,0,0.3)";

        const video = document.createElement("video");
        video.id = `video-${id}`;
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "cover";

        if (isLocal) {
            video.muted = true;
            video.style.transform = "scaleX(-1)"; // Mirror local video
            
            const badge = document.createElement("div");
            badge.textContent = "Sen";
            badge.style.position = "absolute";
            badge.style.bottom = "6px";
            badge.style.left = "6px";
            badge.style.backgroundColor = "rgba(79, 70, 229, 0.8)";
            badge.style.color = "white";
            badge.style.fontSize = "0.75rem";
            badge.style.padding = "2px 8px";
            badge.style.borderRadius = "4px";
            videoContainer.appendChild(badge);
        }

        videoContainer.appendChild(video);
        videoGrid.appendChild(videoContainer);
        
        return video;
    }

    function removeVideoElement(id) {
        const wrapper = document.getElementById(`video-wrapper-${id}`);
        if (wrapper) wrapper.remove();
        checkHint();
    }

    // Initialize peer
    function createPeer(targetSocketId, initiator, stream) {
        const peer = new SimplePeer({
            initiator: initiator,
            stream: stream,
            trickle: false // Wait for all ICE candidates for simpler signaling
        });

        peer.on("signal", (signal) => {
            socket.emit("webrtc:signal", {
                targetSocketId,
                signal
            });
        });

        peer.on("stream", (remoteStream) => {
            addVideoElement(targetSocketId, remoteStream);
        });

        peer.on("close", () => {
            removeVideoElement(targetSocketId);
            if (peers[targetSocketId]) {
                delete peers[targetSocketId];
            }
        });
        
        peer.on("error", (err) => {
            console.error("Peer error:", err);
            removeVideoElement(targetSocketId);
            if (peers[targetSocketId]) {
                delete peers[targetSocketId];
            }
        });

        return peer;
    }

    // Toggle Camera
    toggleCameraBtn.addEventListener("click", async () => {
        if (!cameraActive) {
            try {
                // Sadece video isteyebiliriz veya hem ses hem video (çalışma odası olduğu için sesli mi isteniyor emin değilim, genelde mikrofon istenir)
                // Şimdilik sadece video
                localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                cameraActive = true;
                
                toggleCameraBtn.textContent = "Kamerayı Kapat";
                toggleCameraBtn.classList.remove("btn-secondary");
                toggleCameraBtn.style.backgroundColor = "#ef4444"; // Kırmızı buton
                toggleCameraBtn.style.color = "white";

                addVideoElement("local", localStream, true);

                // Sunucuya odaya görüntülü katıldığımı bildiriyorum
                socket.emit("webrtc:join_video", { roomId });
            } catch (err) {
                console.error("Camera access denied or error:", err);
                alert("Kamera izni alınamadı! Lütfen tarayıcı ayarlarından izin verin.");
            }
        } else {
            cameraActive = false;
            
            toggleCameraBtn.textContent = "Kamerayı Aç";
            toggleCameraBtn.style.backgroundColor = ""; 
            toggleCameraBtn.classList.add("btn-secondary");

            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                localStream = null;
            }
            
            removeVideoElement("local");

            // Bütün bağlantıları kopar
            Object.keys(peers).forEach(id => {
                if (peers[id]) peers[id].destroy();
                delete peers[id];
            });

            // Sunucuya ayrıldığımı bildir
            socket.emit("webrtc:leave_video", { roomId });
        }
    });

    // Another user opened their camera
    socket.on("webrtc:user_joined", (payload) => {
        if (!cameraActive || !localStream) return; // Only connect if my camera is also on
        
        const { socketId } = payload;
        
        // Ben zaten odadayım ve yeni biri kamerasını açtı. Ben bağlantıyı (offer) başlatıyorum.
        const peer = createPeer(socketId, true, localStream);
        peers[socketId] = peer;
    });

    // Incoming signal (offer or answer) from another peer
    socket.on("webrtc:signal", (payload) => {
        if (!cameraActive || !localStream) return;
        
        const { senderSocketId, signal } = payload;
        
        let peer = peers[senderSocketId];
        
        if (!peer) {
            // Bana bir Offer geldi, bunu kabul edecek bir Peer oluşturuyorum (initiator: false)
            peer = createPeer(senderSocketId, false, localStream);
            peers[senderSocketId] = peer;
        }
        
        peer.signal(signal);
    });

    // A user closed their camera or disconnected
    socket.on("webrtc:user_left", (payload) => {
        const { socketId } = payload;
        if (peers[socketId]) {
            peers[socketId].destroy(); // SimplePeer will fire 'close' which removes video
            delete peers[socketId];
        } else {
            // Fallback just in case
            removeVideoElement(socketId);
        }
    });

})();
