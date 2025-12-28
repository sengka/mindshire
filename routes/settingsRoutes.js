// routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// Middleware: Kullanıcı giriş kontrolü
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/giris');
}

// Ayarlar sayfası
router.get('/settings', isAuthenticated, settingsController.getSettings);

// API: Kullanıcı adı güncelle
router.put('/api/users/me', isAuthenticated, settingsController.updateUsername);

// API: Şifre değiştir
router.put('/api/users/me/password', isAuthenticated, settingsController.updatePassword);

// API: Hesabı sil
router.delete('/api/users/me', isAuthenticated, settingsController.deleteAccount);

module.exports = router;
