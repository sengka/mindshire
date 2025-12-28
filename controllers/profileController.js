// controllers/profileController.js
const User = require('../models/User');
const Avatar = require('../models/Avatar');

// --- PROFİL SAYFASI ---
exports.getProfile = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) return res.redirect('/giris');

        const user = await User.findById(userId);
        if (!user) {
            req.session.destroy();
            return res.redirect('/giris');
        }

        // Kullanıcı verilerini hazırla
        let userViewData = user.toObject();

        // XP ve Level bilgilerini ekle
        const xpMax = 1000;
        userViewData.stats = {
            level: userViewData.level || 1,
            xp: userViewData.xp || 0,
            xpMax
        };

        // Katılma tarihini formatla
        const joinDate = new Date(user.createdAt).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        res.render('pages/profile', {
            title: 'Profilim | Mindshire',
            user: userViewData,
            joinDate,
            layout: 'layouts/main'
        });

    } catch (error) {
        console.error('Profil Hatası:', error);
        res.status(500).send('Bir hata oluştu: ' + error.message);
    }
};

// --- AVATAR LİSTESİNİ GETIR (API) ---
exports.getAvatars = async (req, res) => {
    try {
        const avatars = await Avatar.find().sort({ category: 1, name: 1 }).lean();

        // Kategorilere göre grupla
        const grouped = {
            default: [],
            buyu: [],
            elf: [],
            peri: [],
            fark: []
        };

        avatars.forEach(avatar => {
            if (grouped[avatar.category]) {
                grouped[avatar.category].push(avatar);
            }
        });

        res.json({ success: true, avatars: grouped });
    } catch (error) {
        console.error('Avatar listesi hatası:', error);
        res.status(500).json({ success: false, message: 'Avatarlar yüklenemedi' });
    }
};

// --- AVATAR GÜNCELLE (API) ---
exports.updateAvatar = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Oturum bulunamadı' });
        }

        const { avatarId } = req.body;

        // Avatar'ın geçerli olup olmadığını kontrol et
        const avatar = await Avatar.findById(avatarId);
        if (!avatar) {
            return res.status(404).json({ success: false, message: 'Avatar bulunamadı' });
        }

        // Kullanıcının avatar'ını güncelle
        const user = await User.findByIdAndUpdate(
            userId,
            { avatar: avatar.imageUrl },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }

        console.log(`✨ ${user.username} avatar'ını güncelledi: ${avatar.name}`);

        res.json({
            success: true,
            message: 'Avatar başarıyla güncellendi',
            avatarUrl: avatar.imageUrl
        });

    } catch (error) {
        console.error('Avatar güncelleme hatası:', error);
        res.status(500).json({ success: false, message: 'Bir hata oluştu' });
    }
};
