// routes/statsRoutes.js
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// Middleware: Giriş kontrolü
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/giris');
    }
    next();
}

// İstatistik sayfaları
router.get('/stats', requireAuth, statsController.getGeneralStats);
router.get('/stats/pomodoro', requireAuth, statsController.getPomodoroHistory);
router.get('/stats/weekly', requireAuth, statsController.getWeeklyStats);
router.get('/stats/streaks', requireAuth, statsController.getStreakStats);

module.exports = router;
