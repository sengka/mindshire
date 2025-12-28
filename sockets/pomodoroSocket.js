// sockets/pomodoroSocket.js
// Socket.IO handler for Pomodoro timer synchronization in Study Rooms

const StudyRoom = require("../models/StudyRoom");

// In-memory timer state per room
// roomId -> { isRunning, mode, durationSec, remainingSec, endAt, startedBy, startedAt }
const roomTimers = new Map();

/**
 * Get or initialize timer state for a room
 */
function getRoomTimerState(roomId) {
    if (!roomTimers.has(roomId)) {
        roomTimers.set(roomId, {
            roomId,
            isRunning: false,
            mode: "work",
            durationSec: 1500, // 25 minutes default
            remainingSec: 1500,
            endAt: null,
            startedBy: null,
            startedAt: null,
        });
    }
    return roomTimers.get(roomId);
}

/**
 * Validate if user is the host of the room
 */
async function isUserHost(userId, roomId) {
    try {
        const room = await StudyRoom.findById(roomId);
        if (!room) return false;
        return room.hostUserId.toString() === userId.toString();
    } catch (err) {
        console.error("Error validating host:", err);
        return false;
    }
}

/**
 * Broadcast timer state to all users in the room
 */
function broadcastTimerSync(io, roomId) {
    const state = getRoomTimerState(roomId);
    io.to(roomId).emit("room:timer:sync", state);
}

/**
 * Main socket handler for Pomodoro events
 */
module.exports = function pomodoroSocket(io) {
    io.on("connection", (socket) => {

        // ========================================
        // REQUEST CURRENT TIMER STATE (on join)
        // ========================================
        socket.on("room:timer:request", ({ roomId }) => {
            if (!roomId) return;

            const state = getRoomTimerState(roomId);

            // Send current state to the requesting client
            socket.emit("room:timer:sync", state);
        });

        // ========================================
        // START TIMER (Host only)
        // ========================================
        socket.on("room:timer:start", async ({ roomId, mode, durationSec }) => {
            if (!roomId) return;

            const userId = socket.data.userId;
            if (!userId) return;

            // Validate host authority
            const isHost = await isUserHost(userId, roomId);
            if (!isHost) {
                socket.emit("room:timer:error", {
                    message: "Only the host can control the timer",
                });
                return;
            }

            const state = getRoomTimerState(roomId);

            // Don't restart if already running
            if (state.isRunning) return;

            // If remaining is 0, reset to full duration
            if (state.remainingSec <= 0) {
                state.remainingSec = durationSec;
            }

            // Update state
            state.isRunning = true;
            state.mode = mode || state.mode;
            state.durationSec = durationSec || state.durationSec;
            state.endAt = Date.now() + state.remainingSec * 1000;
            state.startedBy = userId;
            state.startedAt = new Date().toISOString();

            // Broadcast to all users in the room
            broadcastTimerSync(io, roomId);
        });

        // ========================================
        // PAUSE TIMER (Host only)
        // ========================================
        socket.on("room:timer:pause", async ({ roomId }) => {
            if (!roomId) return;

            const userId = socket.data.userId;
            if (!userId) return;

            // Validate host authority
            const isHost = await isUserHost(userId, roomId);
            if (!isHost) {
                socket.emit("room:timer:error", {
                    message: "Only the host can control the timer",
                });
                return;
            }

            const state = getRoomTimerState(roomId);

            if (!state.isRunning) return;

            // Calculate remaining time
            const remaining = Math.max(0, Math.round((state.endAt - Date.now()) / 1000));

            // Update state
            state.isRunning = false;
            state.remainingSec = remaining;
            state.endAt = null;

            // Broadcast to all users
            broadcastTimerSync(io, roomId);
        });

        // ========================================
        // RESET TIMER (Host only)
        // ========================================
        socket.on("room:timer:reset", async ({ roomId }) => {
            if (!roomId) return;

            const userId = socket.data.userId;
            if (!userId) return;

            // Validate host authority
            const isHost = await isUserHost(userId, roomId);
            if (!isHost) {
                socket.emit("room:timer:error", {
                    message: "Only the host can control the timer",
                });
                return;
            }

            const state = getRoomTimerState(roomId);

            // Reset to initial state
            state.isRunning = false;
            state.remainingSec = state.durationSec;
            state.endAt = null;
            state.startedBy = null;
            state.startedAt = null;

            // Broadcast to all users
            broadcastTimerSync(io, roomId);
        });

        // ========================================
        // TIMER FINISHED (Host only)
        // ========================================
        socket.on("room:timer:finish", async ({ roomId }) => {
            if (!roomId) return;

            const userId = socket.data.userId;
            if (!userId) return;

            // Validate host authority
            const isHost = await isUserHost(userId, roomId);
            if (!isHost) return;

            const state = getRoomTimerState(roomId);

            // Mark as finished
            state.isRunning = false;
            state.remainingSec = 0;
            state.endAt = null;

            // Broadcast finish event
            io.to(roomId).emit("room:timer:finished", { roomId });

            // Also sync state
            broadcastTimerSync(io, roomId);
        });

        // ========================================
        // UPDATE SETTINGS (Host only)
        // ========================================
        socket.on("room:settings:update", async ({ roomId, settings }) => {
            if (!roomId || !settings) return;

            const userId = socket.data.userId;
            if (!userId) return;

            // Validate host authority
            const isHost = await isUserHost(userId, roomId);
            if (!isHost) {
                socket.emit("room:timer:error", {
                    message: "Only the host can update settings",
                });
                return;
            }

            try {
                // Update database
                const room = await StudyRoom.findByIdAndUpdate(
                    roomId,
                    {
                        $set: {
                            focusMinutes: settings.focusMinutes,
                            shortBreakMinutes: settings.shortBreakMinutes,
                            longBreakMinutes: settings.longBreakMinutes,
                            sessionsCount: settings.sessionsCount,
                            title: settings.title,
                            themeKey: settings.themeKey,
                            themeLabel: settings.themeLabel,
                            isLocked: settings.isLocked,
                        },
                    },
                    { new: true }
                );

                if (!room) return;

                // Broadcast updated settings to all users
                io.to(roomId).emit("room:settings", {
                    roomId,
                    room: {
                        title: room.title,
                        themeKey: room.themeKey,
                        themeLabel: room.themeLabel,
                        focusMinutes: room.focusMinutes,
                        shortBreakMinutes: room.shortBreakMinutes,
                        longBreakMinutes: room.longBreakMinutes,
                        sessionsCount: room.sessionsCount,
                        isLocked: room.isLocked,
                    },
                });
            } catch (err) {
                console.error("Error updating room settings:", err);
                socket.emit("room:timer:error", {
                    message: "Failed to update settings",
                });
            }
        });

        // ========================================
        // SETTINGS UPDATED BROADCAST (from frontend)
        // ========================================
        socket.on("room:settingsUpdated", async ({ roomId, room }) => {
            if (!roomId || !room) return;

            const userId = socket.data.userId;
            if (!userId) return;

            // Validate host authority
            const isHost = await isUserHost(userId, roomId);
            if (!isHost) return;

            // Broadcast updated settings to all users in room
            io.to(roomId).emit("room:settings", {
                roomId,
                room
            });
        });

        // ========================================
        // ANNOUNCEMENT UPDATED BROADCAST
        // ========================================
        socket.on("room:announcement:updated", async ({ roomId, announcement }) => {
            if (!roomId) return;

            const userId = socket.data.userId;
            if (!userId) return;

            // Validate host authority
            const isHost = await isUserHost(userId, roomId);
            if (!isHost) return;

            // Broadcast to all users in room
            io.to(roomId).emit("room:announcement:update", {
                roomId,
                announcement
            });
        });

        // ========================================
        // ANNOUNCEMENT DELETED BROADCAST
        // ========================================
        socket.on("room:announcement:deleted", async ({ roomId }) => {
            if (!roomId) return;

            const userId = socket.data.userId;
            if (!userId) return;

            // Validate host authority
            const isHost = await isUserHost(userId, roomId);
            if (!isHost) return;

            // Broadcast to all users in room
            io.to(roomId).emit("room:announcement:delete", { roomId });
        });

        // ========================================
        // ANNOUNCEMENT REACTION BROADCAST
        // ========================================
        socket.on("room:announcement:reacted", async ({ roomId, reactions }) => {
            if (!roomId) return;

            // No host validation needed - anyone can react
            // Broadcast to all users in room
            io.to(roomId).emit("room:announcement:reaction", {
                roomId,
                reactions
            });
        });
    });
};
