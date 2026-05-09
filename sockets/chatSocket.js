// sockets/chatSocket.js
// Socket.IO handler for real-time chat in Study Rooms

module.exports = function chatSocket(io) {
    io.on("connection", (socket) => {
        
        socket.on("room:chat:send", (payload) => {
            const { roomId, message } = payload;
            
            if (!roomId || !message || message.trim() === "") return;

            // socket.data.user comes from presenceSocket.js where it is stored on room:join
            const user = socket.data.user || {
                id: socket.id,
                name: "Misafir",
                avatarUrl: "/img/avatars/default.png",
                isHost: false
            };

            // Broadcast the message to all users in the room (including the sender)
            io.to(roomId).emit("room:chat:message", {
                roomId,
                message: message.trim(),
                sender: user,
                timestamp: new Date().toISOString()
            });
        });
        
    });
};
