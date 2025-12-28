// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

// Middleware: Kullanıcı giriş kontrolü
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/giris');
}

// Profil sayfası
router.get('/profile', isAuthenticated, profileController.getProfile);

// API: Avatar listesi
router.get('/api/avatars', isAuthenticated, profileController.getAvatars);

// API: Avatar güncelle
router.put('/api/users/me/avatar', isAuthenticated, profileController.updateAvatar);

module.exports = router;
