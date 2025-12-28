// sockets/presenceSocket.js
// presence tracking for Study Rooms

// roomId -> Map(socketId -> user)
const roomUsers = new Map();

function getRoomMap(roomId) {
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Map());
  }
  return roomUsers.get(roomId);
}

function emitPresence(io, roomId) {
  const usersMap = getRoomMap(roomId);
  const users = Array.from(usersMap.values());

  io.to(roomId).emit("presence:update", {
    roomId,
    count: users.length,
    users // [{id, name, avatarUrl, isHost}]
  });
}

module.exports = function presenceSocket(io) {
  io.on("connection", (socket) => {

    socket.on("room:join", ({ roomId, user }) => {
      if (!roomId) return;

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userId = user?.id; // Store userId for host validation

      const safeUser = {
        id: user?.id || socket.id,
        name: user?.name || "Misafir",
        avatarUrl: user?.avatarUrl || "/img/avatars/default.png",
        isHost: !!user?.isHost
      };

      const usersMap = getRoomMap(roomId);
      usersMap.set(socket.id, safeUser);

      emitPresence(io, roomId);
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const usersMap = getRoomMap(roomId);
      usersMap.delete(socket.id);

      emitPresence(io, roomId);
    });
  });
};
