// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const homeController = require('../controllers/homeController');

// --- KAYIT İŞLEMLERİ ---
// Sayfayı göster:
router.get('/kayit', homeController.getRegisterPage);
// İşlemi yap:
router.post('/kayit', authController.registerUser);

// --- GİRİŞ İŞLEMLERİ ---
// Sayfayı göster:
router.get('/giris', authController.loginPage);
// İşlemi yap:
router.post('/giris', authController.loginUser);

// --- ŞİFRE SIFIRLAMA İŞLEMLERİ ---
router.get('/sifremi-unuttum', authController.forgotPasswordPage);
router.post('/sifremi-unuttum', authController.forgotPassword);

// Linke tıklayınca sayfayı göster
router.get('/sifre-sifirla/:token', authController.getResetPasswordPage);

// Formu gönderince şifreyi değiştir
router.post('/sifre-sifirla/:token', authController.resetPassword);

//Çıkış yapma işlemi
router.post('/logout', authController.logout);

module.exports = router;