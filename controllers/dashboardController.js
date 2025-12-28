// controllers/dashboardController.js
const User = require('../models/User');
const Task = require('../models/Task');
const PomodoroSession = require('../models/PomodoroSession');
const CalendarEvent = require('../models/CalendarEvent');
const { calculateStreak, formatDuration } = require('../utils/statsHelper');

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

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Pazartesi başlangıç
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/giris');

    const user = await User.findById(userId);
    if (!user) {
      req.session.destroy();
      return res.redirect('/giris');
    }

    let userViewData = user.toObject();

    // ✅ XP/Level
    const xpMax = 1000;
    userViewData.stats = {
      level: userViewData.level || 1,
      xp: userViewData.xp || 0,
      xpMax
    };

    userViewData.notifications = userViewData.notifications || 0;

    // ✅ Bugünkü görevleri DB'den çek
    const today = new Date();
    const from = startOfDay(today);
    const to = endOfDay(today);

    const todaysTasks = await Task.find({
      userId,
      date: { $gte: from, $lte: to }
    })
      .sort({ isCompleted: 1, createdAt: -1 })
      .lean();

    const totalTasksToday = todaysTasks.length;
    const completedTasksToday = todaysTasks.filter(t => t.isCompleted).length;

    // ✅ GERÇEK İSTATİSTİKLER

    // 1. Bugünkü pomodoro sayısı
    const todayPomodoros = await PomodoroSession.countDocuments({
      userId,
      startedAt: { $gte: from, $lte: to },
      status: 'completed'
    });

    // 2. Mevcut streak
    const currentStreak = await calculateStreak(userId);

    // 3. Bu haftanın başlangıcı
    const weekStart = startOfWeek(today);

    // 4. Bu haftanın çalışma süresi (saniye)
    const weeklyResult = await PomodoroSession.aggregate([
      {
        $match: {
          userId,
          startedAt: { $gte: weekStart },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalSeconds: { $sum: '$actualSeconds' }
        }
      }
    ]);
    const weeklySeconds = weeklyResult[0]?.totalSeconds || 0;
    const weeklyDuration = formatDuration(weeklySeconds);

    // 5. Bu haftanın tamamlanan görev sayısı
    const weeklyTasks = await Task.countDocuments({
      userId,
      completedAt: { $gte: weekStart },
      isCompleted: true
    });

    // 6. En aktif kategori
    const topCategoryResult = await Task.aggregate([
      { $match: { userId, isCompleted: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    const topCategory = topCategoryResult[0]?._id || 'Henüz yok';

    // 7. Yaklaşan takvim etkinlikleri (bugünden sonraki 5 etkinlik)
    const upcomingEvents = await CalendarEvent.find({
      userId,
      date: { $gte: from }
    })
      .sort({ date: 1, time: 1 })
      .limit(5)
      .lean();

    // Dashboard kartları için "dashboard" alanı
    userViewData.dashboard = {
      totalTasksToday,
      completedTasksToday,
      todaysTasks: todaysTasks.slice(0, 5) // listede ilk 5'i göster
    };

    return res.render('pages/dashboard', {
      title: 'Ana Salon | Mindshire',
      user: userViewData,
      stats: {
        todayPomodoros,
        currentStreak,
        weeklyDuration,
        weeklyTasks,
        topCategory
      },
      upcomingEvents, // Yaklaşan takvim etkinlikleri
      currentSong: "Lofi Beats - Rainy Day 🌧️",
      layout: 'layouts/main'
    });

  } catch (error) {
    console.error("Dashboard Hatası:", error);
    return res.status(500).send("Bir hata oluştu: " + error.message);
  }
};
