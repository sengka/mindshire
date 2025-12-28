// controllers/settingsController.js
const User = require('../models/User');
const Task = require('../models/Task');
const PomodoroSession = require('../models/PomodoroSession');
const CalendarEvent = require('../models/CalendarEvent');
const StudyRoom = require('../models/StudyRoom');
const bcrypt = require('bcryptjs');

// --- AYARLAR SAYFASI ---
exports.getSettings = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) return res.redirect('/giris');

        const user = await User.findById(userId);
        if (!user) {
            req.session.destroy();
            return res.redirect('/giris');
        }

        let userViewData = user.toObject();

        // XP ve Level bilgilerini ekle
        const xpMax = 1000;
        userViewData.stats = {
            level: userViewData.level || 1,
            xp: userViewData.xp || 0,
            xpMax
        };

        res.render('pages/settings', {
            title: 'Ayarlar | Mindshire',
            user: userViewData,
            layout: 'layouts/main'
        });

    } catch (error) {
        console.error('Ayarlar Hatası:', error);
        res.status(500).send('Bir hata oluştu: ' + error.message);
    }
};

// --- KULLANICI ADI GÜNCELLE (API) ---
exports.updateUsername = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Oturum bulunamadı' });
        }

        const { username } = req.body;

        // Validasyon
        if (!username || username.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Kullanıcı adı en az 3 karakter olmalıdır'
            });
        }

        // Kullanıcı adını güncelle
        const user = await User.findByIdAndUpdate(
            userId,
            { username: username.trim() },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }

        console.log(`✨ Kullanıcı adı güncellendi: ${user.username}`);

        res.json({
            success: true,
            message: 'Kullanıcı adı başarıyla güncellendi',
            username: user.username
        });

    } catch (error) {
        console.error('Kullanıcı adı güncelleme hatası:', error);
        res.status(500).json({ success: false, message: 'Bir hata oluştu' });
    }
};

// --- ŞİFRE DEĞİŞTİR (API) ---
exports.updatePassword = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Oturum bulunamadı' });
        }

        const { currentPassword, newPassword, confirmNewPassword } = req.body;

        // Validasyon
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: 'Tüm alanları doldurun'
            });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: 'Yeni şifreler eşleşmiyor'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Yeni şifre en az 8 karakter olmalıdır'
            });
        }

        const specialCharRegex = /[.?!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
        if (!specialCharRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Yeni şifre en az bir özel karakter içermelidir'
            });
        }

        // Kullanıcıyı bul
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }

        // Mevcut şifreyi doğrula
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Mevcut şifre yanlış'
            });
        }

        // Yeni şifreyi hashle ve kaydet
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        console.log(`🔒 ${user.username} şifresini değiştirdi`);

        res.json({
            success: true,
            message: 'Şifre başarıyla değiştirildi'
        });

    } catch (error) {
        console.error('Şifre değiştirme hatası:', error);
        res.status(500).json({ success: false, message: 'Bir hata oluştu' });
    }
};

// --- HESABI SİL (API) ---
exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Oturum bulunamadı' });
        }

        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Şifre gereklidir'
            });
        }

        // Kullanıcıyı bul
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }

        // Şifreyi doğrula
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Şifre yanlış'
            });
        }

        // Kullanıcıya ait tüm verileri sil
        await Task.deleteMany({ userId });
        await PomodoroSession.deleteMany({ userId });
        await CalendarEvent.deleteMany({ userId });

        // StudyRoom'larda host olan odaları sil veya güncelle
        await StudyRoom.deleteMany({ host: userId });

        // Kullanıcıyı sil
        await User.findByIdAndDelete(userId);

        console.log(`🗑️  ${user.username} hesabı kalıcı olarak silindi`);

        // Session'ı yok et
        req.session.destroy((err) => {
            if (err) {
                console.error('Session silme hatası:', err);
            }
        });

        res.json({
            success: true,
            message: 'Hesap başarıyla silindi'
        });

    } catch (error) {
        console.error('Hesap silme hatası:', error);
        res.status(500).json({ success: false, message: 'Bir hata oluştu' });
    }
};
