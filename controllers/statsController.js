// controllers/statsController.js
const User = require('../models/User');
const PomodoroSession = require('../models/PomodoroSession');
const Task = require('../models/Task');
const { calculateStreak, getWeeklyData, formatDuration, getMonthlyActivity } = require('../utils/statsHelper');

/**
 * Genel istatistikler sayfası
 * GET /stats
 */
exports.getGeneralStats = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);
        if (!user) return res.redirect('/giris');

        // Toplam pomodoro sayısı
        const totalPomodoros = await PomodoroSession.countDocuments({
            userId,
            status: 'completed'
        });

        // Toplam çalışma süresi (saniye)
        const totalTimeResult = await PomodoroSession.aggregate([
            { $match: { userId, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$actualSeconds' } } }
        ]);
        const totalSeconds = totalTimeResult[0]?.total || 0;

        // Toplam tamamlanan görev
        const totalTasks = await Task.countDocuments({
            userId,
            isCompleted: true
        });

        // En aktif kategori
        const topCategoryResult = await Task.aggregate([
            { $match: { userId, isCompleted: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);
        const topCategory = topCategoryResult[0]?._id || 'Henüz yok';

        // Son 6 ayın aylık verileri (trend grafiği için)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyTrend = await PomodoroSession.aggregate([
            {
                $match: {
                    userId,
                    status: 'completed',
                    startedAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$startedAt' },
                        month: { $month: '$startedAt' }
                    },
                    sessions: { $sum: 1 },
                    totalMinutes: { $sum: { $divide: ['$actualSeconds', 60] } }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Kategori dağılımı
        const categoryDistribution = await Task.aggregate([
            { $match: { userId, isCompleted: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.render('pages/stats/stats-general', {
            title: 'Genel İstatistikler - Mindshire',
            layout: 'layouts/main',
            user: user.toObject(),
            stats: {
                totalPomodoros,
                totalTime: formatDuration(totalSeconds),
                totalTimeMinutes: Math.round(totalSeconds / 60),
                totalTasks,
                topCategory,
                monthlyTrend,
                categoryDistribution
            }
        });
    } catch (error) {
        console.error('Genel istatistik hatası:', error);
        res.status(500).send('İstatistikler yüklenirken hata oluştu');
    }
};

/**
 * Pomodoro geçmişi sayfası
 * GET /stats/pomodoro
 */
exports.getPomodoroHistory = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);
        if (!user) return res.redirect('/giris');
        const page = parseInt(req.query.page) || 1;
        const limit = 15;
        const skip = (page - 1) * limit;

        // Filtreleme parametreleri
        const filter = { userId };

        if (req.query.mode && req.query.mode !== 'all') {
            filter.mode = req.query.mode;
        }

        if (req.query.startDate || req.query.endDate) {
            filter.startedAt = {};
            if (req.query.startDate) {
                filter.startedAt.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                const endDate = new Date(req.query.endDate);
                endDate.setHours(23, 59, 59);
                filter.startedAt.$lte = endDate;
            }
        }

        // Toplam kayıt sayısı
        const totalSessions = await PomodoroSession.countDocuments(filter);
        const totalPages = Math.ceil(totalSessions / limit);

        // Pomodoro seansları
        const sessions = await PomodoroSession.find(filter)
            .sort({ startedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Formatla
        const formattedSessions = sessions.map(s => ({
            ...s,
            startedAtFormatted: s.startedAt.toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            duration: formatDuration(s.actualSeconds),
            modeLabel: getModeLabel(s.mode),
            statusLabel: getStatusLabel(s.status)
        }));

        res.render('pages/stats/stats-pomodoro', {
            title: 'Pomodoro Geçmişi - Mindshire',
            layout: 'layouts/main',
            user: user.toObject(),
            sessions: formattedSessions,
            pagination: {
                currentPage: page,
                totalPages,
                totalSessions,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filters: {
                mode: req.query.mode || 'all',
                startDate: req.query.startDate || '',
                endDate: req.query.endDate || ''
            }
        });
    } catch (error) {
        console.error('Pomodoro geçmişi hatası:', error);
        res.status(500).send('Pomodoro geçmişi yüklenirken hata oluştu');
    }
};

/**
 * Haftalık grafikler sayfası
 * GET /stats/weekly
 */
exports.getWeeklyStats = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);
        if (!user) return res.redirect('/giris');
        const weeksBack = 4;

        // Son 4 haftanın verileri
        const weeklyData = await getWeeklyData(userId, weeksBack);

        // Toplam ve ortalama hesapla
        const totals = {
            totalMinutes: 0,
            totalSessions: 0,
            avgMinutesPerWeek: 0,
            avgSessionsPerWeek: 0
        };

        weeklyData.forEach(week => {
            totals.totalMinutes += week.totalMinutes;
            totals.totalSessions += week.totalSessions;
        });

        totals.avgMinutesPerWeek = Math.round(totals.totalMinutes / weeksBack);
        totals.avgSessionsPerWeek = Math.round(totals.totalSessions / weeksBack);
        totals.totalTime = formatDuration(totals.totalMinutes * 60);

        // Kategori bazında dağılım (son 4 hafta)
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

        const categoryStats = await Task.aggregate([
            {
                $match: {
                    userId,
                    isCompleted: true,
                    completedAt: { $gte: fourWeeksAgo }
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalMinutes: { $sum: '$duration' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.render('pages/stats/stats-weekly', {
            title: 'Haftalık Grafikler - Mindshire',
            layout: 'layouts/main',
            user: user.toObject(),
            weeklyData,
            totals,
            categoryStats
        });
    } catch (error) {
        console.error('Haftalık istatistik hatası:', error);
        res.status(500).send('Haftalık istatistikler yüklenirken hata oluştu');
    }
};

/**
 * Streak görünümü sayfası
 * GET /stats/streaks
 */
exports.getStreakStats = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);
        if (!user) return res.redirect('/giris');

        // Mevcut streak
        const currentStreak = await calculateStreak(userId);

        // En uzun streak'i hesapla (basit yaklaşım - son 1 yıl)
        // Gerçek uygulamada bu değer cache'lenebilir
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const allSessions = await PomodoroSession.find({
            userId,
            status: 'completed',
            startedAt: { $gte: oneYearAgo }
        }).select('startedAt').lean();

        const allTasks = await Task.find({
            userId,
            isCompleted: true,
            completedAt: { $gte: oneYearAgo }
        }).select('completedAt').lean();

        // Tüm çalışma günlerini topla
        const workDates = new Set();
        allSessions.forEach(s => {
            workDates.add(s.startedAt.toISOString().split('T')[0]);
        });
        allTasks.forEach(t => {
            workDates.add(t.completedAt.toISOString().split('T')[0]);
        });

        const sortedDates = Array.from(workDates).sort();

        // En uzun streak'i bul
        let longestStreak = 0;
        let tempStreak = 1;

        for (let i = 1; i < sortedDates.length; i++) {
            const prevDate = new Date(sortedDates[i - 1]);
            const currDate = new Date(sortedDates[i]);
            const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                tempStreak++;
            } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        // Bu ayın aktivite takvimi
        const now = new Date();
        const monthActivity = await getMonthlyActivity(userId, now.getFullYear(), now.getMonth() + 1);

        res.render('pages/stats/stats-streaks', {
            title: 'Streak İstatistikleri - Mindshire',
            layout: 'layouts/main',
            user: user.toObject(),
            currentStreak,
            longestStreak,
            monthActivity,
            currentMonth: now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
        });
    } catch (error) {
        console.error('Streak istatistik hatası:', error);
        res.status(500).send('Streak istatistikleri yüklenirken hata oluştu');
    }
};

// Yardımcı fonksiyonlar
function getModeLabel(mode) {
    const labels = {
        work: '🍅 Odak',
        short: '☕ Kısa Mola',
        long: '🌙 Uzun Mola',
        custom: '⚙️ Özel'
    };
    return labels[mode] || mode;
}

function getStatusLabel(status) {
    const labels = {
        running: '▶️ Devam ediyor',
        completed: '✅ Tamamlandı',
        stopped: '⏹️ Durduruldu'
    };
    return labels[status] || status;
}
