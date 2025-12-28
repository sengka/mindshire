// routes/homeRoutes.js
const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');
const authController = require('../controllers/authController');

// Ana sayfa
router.get('/', homeController.getWelcomePage);
//kesfet sayfası
router.get('/kesfet', homeController.getDiscoverPage);

router.get('/kayit', homeController.getRegisterPage);
router.get('/giris', authController.loginPage);

module.exports = router;
