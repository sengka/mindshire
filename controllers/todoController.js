const User = require('../models/User');
const Task = require('../models/Task');

function normalizeDateNoon(dateLike) {
  // dateLike: Date veya "YYYY-MM-DD"
  let d = dateLike instanceof Date ? dateLike : null;

  if (!d) {
    const [y, m, day] = String(dateLike || "").split("-").map(Number);
    if (!y || !m || !day) d = new Date();
    else d = new Date(y, m - 1, day); // local
  }

  // local 12:00 => UTC'ye dönse bile aynı güne düşer
  d.setHours(12, 0, 0, 0);
  return d;
}

function parseDateInputLocal(ymd) {
  // ymd: "YYYY-MM-DD"
  const [y, m, d] = (ymd || '').split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d); // LOCAL midnight
}

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

// input[type="date"] için güvenli local YYYY-MM-DD
function toISODateLocal(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// "10 Mart · Pazartesi"
function formatDayTitle(dateObj) {
  const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  const days = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
  const d = dateObj.getDate();
  const m = months[dateObj.getMonth()];
  const dow = days[dateObj.getDay()];
  return `${d} ${m} · ${dow}`;
}

exports.getTodoPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/login');

    const user = await User.findById(userId);
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }

    const userViewData = user.toObject();

    // Header için tek format
    userViewData.stats = {
      level: userViewData.level || 1,
      xp: userViewData.xp || 0,
      xpMax: 1000
    };

    // --- BUGÜN ---
    const today = new Date();
    const from = startOfDay(today);
    const to = endOfDay(today);

    const tasksToday = await Task.find({
      userId,
      date: { $gte: from, $lte: to },
    })
      .sort({ isCompleted: 1, createdAt: -1 })
      .lean();

    // --- YARIN VE SONRASI (SONRAKİ GÜNLER PANELİ) ---
    const tomorrow = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowFrom = startOfDay(tomorrow);

    const futureTasks = await Task.find({
      userId,
      date: { $gte: tomorrowFrom }
    })
      .sort({ date: 1, createdAt: -1 })
      .lean();

    // Tarihe göre grupla: { 'YYYY-MM-DD': [tasks] }
    const grouped = {};
    for (const t of futureTasks) {
      const key = toISODateLocal(t.date);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    }

    // UI için dizi: [{ key, label, title, count, tasks }]
    const keys = Object.keys(grouped).sort();
    const nextDays = keys.map((key, idx) => {
      const dateObj = new Date(key + "T00:00:00");
      return {
        key,
        label: idx === 0 ? "Yarın" : "Sonraki gün",
        title: formatDayTitle(dateObj),
        count: grouped[key].length,
        tasks: grouped[key]
      };
    });

    return res.render('pages/todo', {
      title: 'To-Do | Mindshire',
      layout: 'layouts/main',
      user: userViewData,
      tasks: tasksToday,
      nextDays,                         // ✅ yeni
      todayISO: toISODateLocal(today),  // ✅ local (UTC kaymaz)
    });

  } catch (error) {
    console.error('Todo get error:', error);
    return res.status(500).send('Bir hata oluştu: ' + error.message);
  }
};

exports.createTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/login');

    const { title, duration, category, xp, date } = req.body;
    if (!title || !title.trim()) return res.redirect('/todo');

const normalized = normalizeDateNoon(date || new Date());


    await Task.create({
      userId,
      title: title.trim(),
      duration: Number(duration) || 25,
      category: (category || 'Genel').trim(),
      xp: Number(xp) || 10,
      date: normalized,
    });

    return res.redirect('/todo');
  } catch (error) {
    console.error('Todo create error:', error);
    return res.status(500).send('Bir hata oluştu: ' + error.message);
  }
};


exports.toggleComplete = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/login');

    const { id } = req.params;

    const task = await Task.findOne({ _id: id, userId });
    if (!task) return res.redirect('/todo');

    const user = await User.findById(userId);
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }

    const xpValue = Number(task.xp) || 0;
    const xpMax = 1000;

    const goingToComplete = !task.isCompleted;

    task.isCompleted = goingToComplete;
    task.completedAt = goingToComplete ? new Date() : null;
    await task.save();

    user.xp = Number(user.xp) || 0;
    user.level = Number(user.level) || 1;

    if (goingToComplete) user.xp += xpValue;
    else user.xp = Math.max(0, user.xp - xpValue);

    while (user.xp >= xpMax) {
      user.xp -= xpMax;
      user.level += 1;
    }

    await user.save();

    return res.redirect('/todo');
  } catch (error) {
    console.error('Todo toggle error:', error);
    return res.status(500).send('Bir hata oluştu: ' + error.message);
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/login');

    const { id } = req.params;
    await Task.deleteOne({ _id: id, userId });

    return res.redirect('/todo');
  } catch (error) {
    console.error('Todo delete error:', error);
    return res.status(500).send('Bir hata oluştu: ' + error.message);
  }
};
