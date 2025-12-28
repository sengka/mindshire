// utils/statsHelper.js
const PomodoroSession = require('../models/PomodoroSession');
const Task = require('../models/Task');

/**
 * Kullanıcının mevcut streak'ini hesaplar (ardışık çalışma günü)
 * @param {ObjectId} userId - Kullanıcı ID
 * @returns {Promise<number>} - Mevcut streak (gün sayısı)
 */
async function calculateStreak(userId) {
    try {
        // Son 365 günün tamamlanmış pomodoro veya görevlerini al
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        // Çalışılan günleri bul (pomodoro veya görev tamamlanan günler)
        const pomodoroSessions = await PomodoroSession.find({
            userId,
            status: 'completed',
            startedAt: { $gte: oneYearAgo }
        }).select('startedAt').lean();

        const completedTasks = await Task.find({
            userId,
            isCompleted: true,
            completedAt: { $gte: oneYearAgo }
        }).select('completedAt').lean();

        // Tüm çalışma günlerini topla
        const workDates = new Set();

        pomodoroSessions.forEach(session => {
            const dateStr = session.startedAt.toISOString().split('T')[0];
            workDates.add(dateStr);
        });

        completedTasks.forEach(task => {
            const dateStr = task.completedAt.toISOString().split('T')[0];
            workDates.add(dateStr);
        });

        // Tarihleri sırala (en yeniden en eskiye)
        const sortedDates = Array.from(workDates).sort().reverse();

        if (sortedDates.length === 0) return 0;

        // Bugünden geriye doğru ardışık günleri say
        const today = new Date().toISOString().split('T')[0];
        let streak = 0;
        let currentDate = new Date();

        for (let i = 0; i < 365; i++) {
            const dateStr = currentDate.toISOString().split('T')[0];

            if (sortedDates.includes(dateStr)) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                // Bugün çalışılmadıysa dün'den başla
                if (i === 0 && dateStr === today) {
                    currentDate.setDate(currentDate.getDate() - 1);
                    continue;
                }
                break;
            }
        }

        return streak;
    } catch (error) {
        console.error('Streak hesaplama hatası:', error);
        return 0;
    }
}

/**
 * Son N haftanın günlük çalışma verilerini getirir
 * @param {ObjectId} userId - Kullanıcı ID
 * @param {number} weeksBack - Kaç hafta geriye gidilecek (varsayılan: 4)
 * @returns {Promise<Array>} - Haftalık veri dizisi
 */
async function getWeeklyData(userId, weeksBack = 4) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (weeksBack * 7));
        startDate.setHours(0, 0, 0, 0);

        // Günlük pomodoro sürelerini topla
        const dailyData = await PomodoroSession.aggregate([
            {
                $match: {
                    userId,
                    startedAt: { $gte: startDate },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$startedAt' }
                    },
                    totalSeconds: { $sum: '$actualSeconds' },
                    sessionCount: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Son N haftayı hafta hafta grupla
        const weeks = [];
        for (let i = weeksBack - 1; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (i * 7) - 6);
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() - (i * 7));
            weekEnd.setHours(23, 59, 59, 999);

            const weekData = {
                weekNumber: weeksBack - i,
                startDate: weekStart,
                endDate: weekEnd,
                days: [],
                totalMinutes: 0,
                totalSessions: 0
            };

            // Her gün için veri oluştur
            for (let d = 0; d < 7; d++) {
                const currentDay = new Date(weekStart);
                currentDay.setDate(currentDay.getDate() + d);
                const dateStr = currentDay.toISOString().split('T')[0];

                const dayData = dailyData.find(item => item._id === dateStr);

                weekData.days.push({
                    date: currentDay,
                    dateStr,
                    minutes: dayData ? Math.round(dayData.totalSeconds / 60) : 0,
                    sessions: dayData ? dayData.sessionCount : 0
                });

                if (dayData) {
                    weekData.totalMinutes += Math.round(dayData.totalSeconds / 60);
                    weekData.totalSessions += dayData.sessionCount;
                }
            }

            weeks.push(weekData);
        }

        return weeks;
    } catch (error) {
        console.error('Haftalık veri hatası:', error);
        return [];
    }
}

/**
 * Saniyeyi "X saat Y dk" formatına çevirir
 * @param {number} seconds - Saniye
 * @returns {string} - Formatlanmış süre
 */
function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0 dk';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours === 0) {
        return `${minutes} dk`;
    } else if (minutes === 0) {
        return `${hours} saat`;
    } else {
        return `${hours} saat ${minutes} dk`;
    }
}

/**
 * Belirli bir ay için aktivite haritası oluşturur
 * @param {ObjectId} userId - Kullanıcı ID
 * @param {number} year - Yıl
 * @param {number} month - Ay (1-12)
 * @returns {Promise<Array>} - Günlük aktivite dizisi
 */
async function getMonthlyActivity(userId, year, month) {
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Ayın tüm günlerini oluştur
        const daysInMonth = endDate.getDate();
        const activityMap = {};

        // Çalışılan günleri bul
        const pomodoroSessions = await PomodoroSession.find({
            userId,
            status: 'completed',
            startedAt: { $gte: startDate, $lte: endDate }
        }).select('startedAt actualSeconds').lean();

        const completedTasks = await Task.find({
            userId,
            isCompleted: true,
            completedAt: { $gte: startDate, $lte: endDate }
        }).select('completedAt').lean();

        // Pomodoro verilerini işle
        pomodoroSessions.forEach(session => {
            const day = session.startedAt.getDate();
            if (!activityMap[day]) {
                activityMap[day] = { sessions: 0, tasks: 0, minutes: 0 };
            }
            activityMap[day].sessions++;
            activityMap[day].minutes += Math.round(session.actualSeconds / 60);
        });

        // Görev verilerini işle
        completedTasks.forEach(task => {
            const day = task.completedAt.getDate();
            if (!activityMap[day]) {
                activityMap[day] = { sessions: 0, tasks: 0, minutes: 0 };
            }
            activityMap[day].tasks++;
        });

        // Tüm günler için dizi oluştur
        const monthActivity = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month - 1, day);
            monthActivity.push({
                day,
                date: currentDate,
                dayName: currentDate.toLocaleDateString('tr-TR', { weekday: 'short' }),
                hasActivity: !!activityMap[day],
                sessions: activityMap[day]?.sessions || 0,
                tasks: activityMap[day]?.tasks || 0,
                minutes: activityMap[day]?.minutes || 0
            });
        }

        return monthActivity;
    } catch (error) {
        console.error('Aylık aktivite hatası:', error);
        return [];
    }
}

module.exports = {
    calculateStreak,
    getWeeklyData,
    formatDuration,
    getMonthlyActivity
};
