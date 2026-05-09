// sockets/webrtcSocket.js
module.exports = function webrtcSocket(io) {
    io.on("connection", (socket) => {
        
        // When a user turns on their camera, they join the video pool for their room
        socket.on("webrtc:join_video", (payload) => {
            const { roomId } = payload;
            if (!roomId) return;
            
            socket.data.roomId = roomId;
            socket.data.videoActive = true;
            
            const user = socket.data.user || { id: socket.id, name: "Kullanıcı" };
            
            // Notify others in the room that this user joined video
            // Broadcast to everyone else in the room
            socket.to(roomId).emit("webrtc:user_joined", {
                socketId: socket.id,
                user
            });
        });

        // Handle signaling between specific peers
        socket.on("webrtc:signal", (payload) => {
            const { targetSocketId, signal } = payload;
            if (!targetSocketId || !signal) return;

            // Forward the signal to the target peer
            io.to(targetSocketId).emit("webrtc:signal", {
                senderSocketId: socket.id,
                signal
            });
        });

        // When a user explicitly turns off their camera
        socket.on("webrtc:leave_video", () => {
            const roomId = socket.data.roomId;
            if (!roomId) return;
            
            socket.data.videoActive = false;
            
            // Notify others to destroy the peer connection
            socket.to(roomId).emit("webrtc:user_left", {
                socketId: socket.id
            });
        });

        // Cleanup on disconnect
        socket.on("disconnect", () => {
            const roomId = socket.data.roomId;
            if (roomId && socket.data.videoActive) {
                // Notify others in the room to cleanup this peer
                socket.to(roomId).emit("webrtc:user_left", {
                    socketId: socket.id
                });
            }
        });
    });
};
