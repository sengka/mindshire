// controllers/pomodoroController.js
const User = require("../models/User");
const PomodoroSession = require("../models/PomodoroSession");

function getTodayRangeTR() {
  // "today start/end" local time'a göre
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return { start, end };
}

async function getAuthedUser(req) {
  const userId = req.session.userId; // ✅ projedeki standart bu
  if (!userId) return null;

  const user = await User.findById(userId);
  if (!user) return null;

  return user;
}

exports.startSession = async (req, res) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const { mode, plannedMinutes, roomType, roomId } = req.body;

    const minutesNum = Number(plannedMinutes);
    if (!minutesNum || minutesNum < 1 || minutesNum > 180) {
      return res.status(400).json({ ok: false, message: "plannedMinutes 1-180 arası olmalı" });
    }

    const normalizedMode = (mode || "work").toString();
    const normalizedRoomType = roomType === "community" ? "community" : "personal";

    // Aynı kullanıcıda running varsa otomatik stop
    await PomodoroSession.updateMany(
      { userId: user._id, status: "running" },
      { $set: { status: "stopped", endedAt: new Date() } }
    );

    const sessionDoc = await PomodoroSession.create({
      userId: user._id,
      roomType: normalizedRoomType,
      roomId: roomId || null,
      mode: normalizedMode,
      plannedMinutes: minutesNum,
      actualSeconds: 0,
      startedAt: new Date(),
      endedAt: null,
      status: "running",
    });

    return res.json({
      ok: true,
      sessionId: sessionDoc._id,
      startedAt: sessionDoc.startedAt,
    });
  } catch (err) {
    console.error("startSession error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
};

exports.stopSession = async (req, res) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const { sessionId, actualSeconds, status } = req.body;
    if (!sessionId) return res.status(400).json({ ok: false, message: "sessionId gerekli" });

    const secNum = Number(actualSeconds);
    if (Number.isNaN(secNum) || secNum < 0 || secNum > 60 * 60 * 6) {
      return res.status(400).json({ ok: false, message: "actualSeconds geçersiz" });
    }

    const newStatus = status === "completed" ? "completed" : "stopped";

    const doc = await PomodoroSession.findOneAndUpdate(
      { _id: sessionId, userId: user._id },
      {
        $set: {
          actualSeconds: secNum,
          endedAt: new Date(),
          status: newStatus,
        },
      },
      { new: true }
    );

    if (!doc) return res.status(404).json({ ok: false, message: "Kayıt bulunamadı" });

    return res.json({ ok: true });
  } catch (err) {
    console.error("stopSession error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
};

exports.getTodaySessions = async (req, res) => {
  try {
    const user = await getAuthedUser(req);
    if (!user) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const { start, end } = getTodayRangeTR();

    const sessions = await PomodoroSession.find({
      userId: user._id,
      startedAt: { $gte: start, $lt: end },
    })
      .sort({ startedAt: -1 })
      .lean();

    return res.json({ ok: true, sessions });
  } catch (err) {
    console.error("getTodaySessions error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
};
