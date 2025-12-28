const User = require("../models/User");
const Task = require("../models/Task");
const CalendarEvent = require("../models/CalendarEvent");

/** Helpers */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// ✅ "YYYY-MM-DD" veya Date -> local 12:00'a sabitle (timezone kaymasını bitirir)
function normalizeDateNoon(dateLike) {
  let d;

  if (dateLike instanceof Date) {
    d = new Date(dateLike);
  } else {
    const [y, m, day] = String(dateLike || "").split("-").map(Number);
    d = (y && m && day) ? new Date(y, m - 1, day) : new Date();
  }

  d.setHours(12, 0, 0, 0);
  return d;
}

// ✅ Date -> "YYYY-MM-DD" (local)
function toISODateLocal(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthRange(year, monthIndex) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return { from: startOfDay(start), to: endOfDay(end) };
}

//ay seçimi + DB’den o aya ait task/event çekme + günlere göre sayma + 42 hücrelik takvim oluşturma” işini yapıyor ve EJS’e veriyor.
exports.getCalendarPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const user = await User.findById(userId);
    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const userViewData = user.toObject();
    userViewData.stats = {
      level: userViewData.level || 1,
      xp: userViewData.xp || 0,
      xpMax: 1000,
    };

    // /calendar?ym=2025-12
    const ym = String(req.query.ym || "").trim();
    let year, monthIndex;

    if (/^\d{4}-\d{2}$/.test(ym)) {
      year = Number(ym.slice(0, 4));
      monthIndex = Number(ym.slice(5, 7)) - 1;
    } else {
      const now = new Date();
      year = now.getFullYear();
      monthIndex = now.getMonth();
    }

    const { from, to } = monthRange(year, monthIndex);

    const [tasks, events] = await Promise.all([
      Task.find({ userId, date: { $gte: from, $lte: to } })
        .sort({ date: 1, isCompleted: 1, createdAt: -1 })
        .lean(),
      CalendarEvent.find({ userId, date: { $gte: from, $lte: to } })
        .sort({ date: 1, time: 1, createdAt: -1 })
        .lean(),
    ]);
const tasksSafe = (tasks || []).map(t => ({
  ...t,
  dateKey: toISODateLocal(t.date)
}));

const eventsSafe = (events || []).map(e => ({
  ...e,
  dateKey: toISODateLocal(e.date)
}));

const byDay = {};
for (const t of tasksSafe) {
  const k = t.dateKey;
  if (!byDay[k]) byDay[k] = { tasks: [], events: [] };
  byDay[k].tasks.push(t);
}
for (const e of eventsSafe) {
  const k = e.dateKey;
  if (!byDay[k]) byDay[k] = { tasks: [], events: [] };
  byDay[k].events.push(e);
}


    // Takvim grid (42 hücre, Pazartesi başlangıç)
    const firstDay = new Date(year, monthIndex, 1);
    let firstWeekday = firstDay.getDay(); // 0 Pazar
    firstWeekday = (firstWeekday + 6) % 7; // Pazartesi=0

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < 42; i++) {
      const dayNum = i - firstWeekday + 1;
      const inMonth = dayNum >= 1 && dayNum <= daysInMonth;

      if (!inMonth) {
        // out-of-month hücreler: tıklanmasın diye key yok
        cells.push({
          inMonth: false,
          dayNum: "",
          key: "",
          taskCount: 0,
          eventCount: 0,
        });
        continue;
      }

      const dateObj = new Date(year, monthIndex, dayNum);
      const key = toISODateLocal(dateObj);

      const payload = byDay[key] || { tasks: [], events: [] };
      cells.push({
        inMonth: true,
        dayNum,
        key,
        taskCount: payload.tasks.length,
        eventCount: payload.events.length,
      });
    }

    const monthNames = [
      "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
      "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık",
    ];

res.render('pages/calendar', {
  title: 'Takvim | Mindshire',
  layout: 'layouts/main',
  user: userViewData,

  ym: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
  monthTitle: `${monthNames[monthIndex]} ${year}`,
  cells,

  tasks: tasksSafe,
  events: eventsSafe
});

  } catch (err) {
    console.error("Calendar get error:", err);
    res.status(500).send("Bir hata oluştu: " + err.message);
  }
};

// --- TAKVİME YENİ ETKİNLİK/KAYIT EKLEME İŞLEMİ ---
exports.createCalendarEvent = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const { title, type, date, time, location, notes } = req.body;

    // ✅ ym hem query hem body'den gelebilsin
    const ym = String(req.body.ym || req.query.ym || "").trim();
    const suffix = ym ? `?ym=${encodeURIComponent(ym)}` : "";

    if (!title || !title.trim()) return res.redirect("/calendar" + suffix);

    // ✅ 1 gün kaymasını bitiren kayıt şekli
    const normalized = normalizeDateNoon(date || new Date());

    await CalendarEvent.create({
      userId,
      title: title.trim(),
      type: (type || "event").trim(),
      date: normalized,
      time: (time || "").trim(),
      location: (location || "").trim(),
      notes: (notes || "").trim(),
    });

    return res.redirect("/calendar" + suffix);
  } catch (err) {
    console.error("Calendar create error:", err);
    res.status(500).send("Bir hata oluştu: " + err.message);
  }
};
// controllers/calendarController.js

exports.updateCalendarEvent = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const { id } = req.params;
    const { title, type, date, time, location, notes } = req.body;

    if (!title || !title.trim()) {
      const ym = (req.query.ym || "").trim();
      return res.redirect("/calendar" + (ym ? `?ym=${encodeURIComponent(ym)}` : ""));
    }

    // Tarih timezone kaymasın diye: noon normalize
    const normalized = normalizeDateNoon(date || new Date());

    const updated = await CalendarEvent.findOneAndUpdate(
      { _id: id, userId }, // ✅ güvenlik: sadece kendi eventini editle
      {
        title: title.trim(),
        type: (type || "event").trim(),
        date: normalized,
        time: (time || "").trim(),
        location: (location || "").trim(),
        notes: (notes || "").trim()
      },
      { new: true }
    );

    const ym = (req.query.ym || "").trim();
    const suffix = ym ? `?ym=${encodeURIComponent(ym)}` : "";
    return res.redirect("/calendar" + suffix);
  } catch (err) {
    console.error("Calendar update error:", err);
    return res.status(500).send("Bir hata oluştu: " + err.message);
  }
};

exports.deleteCalendarEvent = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const { id } = req.params;

    await CalendarEvent.deleteOne({ _id: id, userId }); // ✅ güvenlik

    const ym = (req.query.ym || "").trim();
    const suffix = ym ? `?ym=${encodeURIComponent(ym)}` : "";
    return res.redirect("/calendar" + suffix);
  } catch (err) {
    console.error("Calendar delete error:", err);
    return res.status(500).send("Bir hata oluştu: " + err.message);
  }
};

