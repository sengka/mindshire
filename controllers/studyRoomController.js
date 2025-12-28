// controllers/studyRoomController.js
const User = require("../models/User");
const PomodoroSession = require("../models/PomodoroSession");
const StudyRoom = require("../models/StudyRoom");

function safeUserView(userDoc) {
  const u = userDoc.toObject();
  u.stats = {
    level: u.level || 1,
    xp: u.xp || 0,
    xpMax: 1000
  };
  u.notifications = u.notifications || 0;
  return u;
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return { start, end };
}

async function requireUser(req) {
  const userId = req.session.userId;
  if (!userId) return null;

  const user = await User.findById(userId);
  if (!user) {
    req.session.destroy();
    return null;
  }
  return user;
}

exports.getStudyRoomIndex = async (req, res) => {
  const user = await requireUser(req);
  if (!user) return res.redirect("/login");

  res.render("pages/study-room/index", {
    layout: "layouts/main",
    title: "Çalışma Odası",
    user: safeUserView(user)
  });
};

exports.getPersonalRoom = async (req, res) => {
  const user = await requireUser(req);
  if (!user) return res.redirect("/login");

  res.render("pages/study-room/personal", {
    layout: "layouts/main",
    title: "Kişisel Çalışma Odası",
    user: safeUserView(user)
  });
};

/* ================================
   TOPLULUK LOBİSİ
   GET /study-room/community
================================ */
exports.getCommunityLobby = async (req, res) => {
  const user = await requireUser(req);
  if (!user) return res.redirect("/login");

  const rooms = await StudyRoom.find({ status: "active" })
    .sort({ updatedAt: -1 })
    .limit(30)
    .lean();

  const totalVisits = rooms.reduce((acc, r) => acc + (r.totalVisits || 0), 0);

  res.render("pages/study-room/community-lobby", {
    layout: "layouts/main",
    title: "Topluluk Çalışma Odaları",
    user: safeUserView(user),
    rooms,
    totalVisits
  });
};

/* ================================
   TOPLULUK ODA SAYFASI
   GET /study-room/community/:roomId
================================ */

exports.getCommunityRoomPage = async (req, res) => {
  const user = await requireUser(req);
  if (!user) return res.redirect("/login");

  const { roomId } = req.params; // route aynı kalsın diye roomId kullanıyorum

  // 1) Önce slug ile dene
  let room = await StudyRoom.findOne({ slug: roomId }).lean();

  // 2) Bulamazsa, ID gibi duruyorsa ID ile dene (backward compatibility)
  if (!room && /^[0-9a-fA-F]{24}$/.test(roomId)) {
    room = await StudyRoom.findById(roomId).lean();

    // ID ile bulundu ve slug varsa canonical slug URL'ye 301
    if (room && room.slug) {
      return res.redirect(301, `/study-room/community/${room.slug}`);
    }
  }

  // 3) Oda yoksa veya aktif değilse
  if (!room || room.status !== "active") {
    return res.status(404).send("Oda bulunamadı.");
  }

  // 4) Ziyaret / katılım sayacı (room._id ile!)
  await StudyRoom.updateOne(
    { _id: room._id },
    { $inc: { totalVisits: 1, totalJoins: 1 } }
  );

  // Son 10 dakikada aktif kullanıcılar
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);

  const activeUsers = await PomodoroSession.distinct("userId", {
    roomType: "community",
    roomId: String(room._id), // DB’de nasıl tutuyorsan ona göre: bazen ObjectId bazen string
    status: "running",
    startedAt: { $gte: tenMinAgo }
  });

  const activeUsersCount = activeUsers.length;

  const isHost = String(room.hostUserId) === String(user._id);

  return res.render("pages/study-room/community-room", {
    layout: "layouts/main",
    title: `${room.title} | Topluluk Odası`,
    user: safeUserView(user),
    room,
    isHost,
    activeUsersCount
  });
};


/* ================================
   ODA KUR (HOST)
   POST /study-room/community/create
================================ */
exports.createCommunityRoom = async (req, res) => {
  try {
    const user = await requireUser(req);
    if (!user) return res.redirect("/login");

    const {
      title,
      themeKey,
      themeLabel,
      focusMinutes,
      sessionsCount,
      shortBreakMinutes,
      longBreakMinutes,
      isLocked,
      accessCode
    } = req.body;

    if (!title || !title.trim()) return res.redirect("/study-room/community");

    const doc = await StudyRoom.create({
      hostUserId: user._id,
      title: title.trim(),
      themeKey: (themeKey || "bg1").trim(),
      themeLabel: (themeLabel || "Gece Kütüphanesi").trim(),
      focusMinutes: Number(focusMinutes) || 25,
      sessionsCount: Number(sessionsCount) || 4,
      shortBreakMinutes: Number(shortBreakMinutes) || 5,
      longBreakMinutes: Number(longBreakMinutes) || 15,
      isLocked: isLocked === "on" || isLocked === true,
      accessCode: (accessCode || "").trim() || null,
      status: "active"
    });

    return res.redirect(`/study-room/community/${doc.slug || doc._id}`);
  } catch (err) {
    console.error("createCommunityRoom error:", err);
    return res.status(500).send("Sunucu hatası");
  }
};

/* ================================
   ODAYI BİTİR (HOST)
   POST /study-room/community/:roomId/end
================================ */
exports.endCommunityRoom = async (req, res) => {
  try {
    const user = await requireUser(req);
    if (!user) return res.redirect("/login");

    const { roomId } = req.params;

    const room = await StudyRoom.findById(roomId);
    if (!room) return res.redirect("/study-room/community");

    const isHost = String(room.hostUserId) === String(user._id);
    if (!isHost) return res.status(403).send("Yetkisiz");

    room.status = "ended";
    await room.save();

    return res.redirect("/study-room/community");
  } catch (err) {
    console.error("endCommunityRoom error:", err);
    return res.status(500).send("Sunucu hatası");
  }
};

/* ================================
   /study-room/log
================================ */
exports.getPomodoroLogPage = async (req, res) => {
  try {
    const user = await requireUser(req);
    if (!user) return res.redirect("/login");

    const { start, end } = getTodayRange();

    const sessions = await PomodoroSession.find({
      userId: user._id,
      startedAt: { $gte: start, $lt: end }
    })
      .sort({ startedAt: -1 })
      .lean();

    const totalFocusMinutes = sessions
      .filter(s => s.mode === "work" || s.mode === "custom")
      .reduce((acc, s) => acc + Math.round((s.actualSeconds || 0) / 60), 0);

    res.render("pages/study-room/log", {
      layout: "layouts/main",
      title: "Bugünkü Pomodorolar",
      user: safeUserView(user),
      sessions,
      totalFocusMinutes
    });
  } catch (error) {
    console.error("Pomodoro log page error:", error);
    res.status(500).send("Sunucu hatası");
  }
};


exports.updateCommunityRoomSettings = async (req, res) => {
  try {
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const { roomId } = req.params;

    const room = await StudyRoom.findById(roomId);
    if (!room) return res.status(404).json({ ok: false, message: "Room not found" });

    const isHost = String(room.hostUserId) === String(user._id);
    if (!isHost) return res.status(403).json({ ok: false, message: "Forbidden" });

    const {
      title,
      themeKey,
      themeLabel,
      focusMinutes,
      sessionsCount,
      shortBreakMinutes,
      longBreakMinutes,
      isLocked
    } = req.body;

    room.title = (title || room.title).trim();
    room.themeKey = (themeKey || room.themeKey).trim();
    room.themeLabel = (themeLabel || room.themeLabel).trim();

    room.focusMinutes = Math.max(5, Math.min(180, Number(focusMinutes) || room.focusMinutes));
    room.sessionsCount = Math.max(1, Math.min(24, Number(sessionsCount) || room.sessionsCount));
    room.shortBreakMinutes = Math.max(1, Math.min(60, Number(shortBreakMinutes) || room.shortBreakMinutes));
    room.longBreakMinutes = Math.max(1, Math.min(120, Number(longBreakMinutes) || room.longBreakMinutes));

    room.isLocked = isLocked === "on" || isLocked === true;

    await room.save();

    return res.json({
      ok: true,
      room: {
        _id: room._id,
        title: room.title,
        themeKey: room.themeKey,
        themeLabel: room.themeLabel,
        focusMinutes: room.focusMinutes,
        sessionsCount: room.sessionsCount,
        shortBreakMinutes: room.shortBreakMinutes,
        longBreakMinutes: room.longBreakMinutes,
        isLocked: room.isLocked
      }
    });
  } catch (err) {
    console.error("updateCommunityRoomSettings error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
};

/* ================================
   DUYURU OLUŞTUR/GÜNCELLE (HOST)
   POST /study-room/community/:roomId/announcement
================================ */
exports.createOrUpdateAnnouncement = async (req, res) => {
  try {
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const { roomId } = req.params;
    const { text } = req.body;

    const room = await StudyRoom.findById(roomId);
    if (!room) return res.status(404).json({ ok: false, message: "Room not found" });

    // Sadece host duyuru oluşturabilir
    const isHost = String(room.hostUserId) === String(user._id);
    if (!isHost) return res.status(403).json({ ok: false, message: "Only host can create announcements" });

    if (!text || !text.trim()) {
      return res.status(400).json({ ok: false, message: "Announcement text is required" });
    }

    room.announcement = {
      text: text.trim(),
      createdAt: new Date(),
      reactions: room.announcement?.reactions || []
    };

    await room.save();

    return res.json({
      ok: true,
      announcement: room.announcement
    });
  } catch (err) {
    console.error("createOrUpdateAnnouncement error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
};

/* ================================
   DUYURU SİL (HOST)
   DELETE /study-room/community/:roomId/announcement
================================ */
exports.deleteAnnouncement = async (req, res) => {
  try {
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const { roomId } = req.params;

    const room = await StudyRoom.findById(roomId);
    if (!room) return res.status(404).json({ ok: false, message: "Room not found" });

    // Sadece host duyuru silebilir
    const isHost = String(room.hostUserId) === String(user._id);
    if (!isHost) return res.status(403).json({ ok: false, message: "Only host can delete announcements" });

    room.announcement = {
      text: null,
      createdAt: null,
      reactions: []
    };

    await room.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteAnnouncement error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
};

/* ================================
   EMOJİ REAKSİYON TOGGLE
   POST /study-room/community/:roomId/announcement/react
================================ */
exports.toggleAnnouncementReaction = async (req, res) => {
  try {
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const { roomId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ ok: false, message: "Emoji is required" });
    }

    const room = await StudyRoom.findById(roomId);
    if (!room) return res.status(404).json({ ok: false, message: "Room not found" });

    if (!room.announcement?.text) {
      return res.status(400).json({ ok: false, message: "No announcement to react to" });
    }

    // Reactions array'ini initialize et
    if (!room.announcement.reactions) {
      room.announcement.reactions = [];
    }

    // Bu emoji için mevcut reaction'ı bul
    let emojiReaction = room.announcement.reactions.find(r => r.emoji === emoji);

    if (!emojiReaction) {
      // Yeni emoji reaction oluştur
      emojiReaction = { emoji, userIds: [] };
      room.announcement.reactions.push(emojiReaction);
    }

    // Kullanıcı zaten bu emojiyi kullanmış mı?
    const userIdStr = String(user._id);
    const userIndex = emojiReaction.userIds.findIndex(id => String(id) === userIdStr);

    if (userIndex > -1) {
      // Kullanıcı zaten reaction vermiş, kaldır (toggle)
      emojiReaction.userIds.splice(userIndex, 1);

      // Eğer hiç kullanıcı kalmadıysa bu emoji reaction'ı sil
      if (emojiReaction.userIds.length === 0) {
        room.announcement.reactions = room.announcement.reactions.filter(r => r.emoji !== emoji);
      }
    } else {
      // Kullanıcı reaction vermemiş, ekle
      emojiReaction.userIds.push(user._id);
    }

    await room.save();

    return res.json({
      ok: true,
      reactions: room.announcement.reactions
    });
  } catch (err) {
    console.error("toggleAnnouncementReaction error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
};
