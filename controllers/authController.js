// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// --- KAYIT OLMA İŞLEMİ ---
exports.registerUser = async (req, res) => {
    try {
        const { username, email, password, avatar } = req.body;

        if (password.length < 8) {
            console.log("Hata: Şifre en az 8 karakter olmalı!");
            return res.redirect('/kayit');
        }

        const specialCharRegex = /[.?!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
        if (!specialCharRegex.test(password)) {
            console.log("Hata: Şifre özel bir karakter içermelidir!");
            return res.redirect('/kayit');
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log("Bu e-posta zaten kayıtlı!");
            return res.redirect('/kayit');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            avatar: avatar || '/img/avatars/buyu1.png'
        });

        await newUser.save();
        console.log("✨ Yeni Büyücü Kaydedildi:", username);
        res.redirect('/giris');

    } catch (error) {
        console.error("Kayıt Hatası:", error);
        res.status(500).send("Bir hata oluştu.");
    }
};

// --- GİRİŞ SAYFASI ---
exports.loginPage = (req, res) => {
    res.render('pages/login', {
        title: 'Giriş Yap',
        layout: 'layouts/main'
    });
};

// --- GİRİŞ YAPMA İŞLEMİ ---
exports.loginUser = async (req, res) => {
    try {
        console.log("Gelen Form Verisi:", req.body);
        const { email, password } = req.body;

        // 1. Kullanıcıyı bul
        const user = await User.findOne({ email });

        if (!user) {
            console.log("Kullanıcı bulunamadı!");
            return res.render('pages/login', { title: 'Giriş Yap', error: 'Böyle bir büyücü bulunamadı!' });
        }

        // 2. Şifreyi kıyasla
        const isMatch = await bcrypt.compare(password, user.password);

        // 3. Şifre yanlışsa durdur
        if (!isMatch) {
            console.log("Şifre yanlış!");
            return res.render('pages/login', { title: 'Giriş Yap', error: 'Gizli kelime yanlış!' });
        }

        // --- BAŞARILI GİRİŞ ---
        req.session.userId = user._id; // Session kaydı (userId ile tutarlı)

        console.log("Giriş Başarılı, Dashboard'a uçuluyor... 🧹");
        return res.redirect('/dashboard');

    } catch (error) {
        console.log("Login Hatası:", error);
        res.status(500).send("Büyü bozuldu (Sunucu Hatası)");
    }
};

// --- ŞİFREMİ UNUTTUM SAYFASI ---
exports.forgotPasswordPage = (req, res) => {
    res.render('pages/forgot-password', { title: 'Şifremi Unuttum' });
};

// --- ŞİFRE SIFIRLAMA MAİLİ GÖNDERME ---
exports.forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return res.render('pages/forgot-password', {
                title: 'Şifremi Unuttum',
                error: 'Bu e-posta adresine ait bir büyücü bulunamadı.'
            });
        }

        // Token oluştur
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Token'ı veritabanına kaydet
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 saat
        await user.save();

        // Link oluştur
        const resetUrl = `${req.protocol}://${req.get('host')}/sifre-sifirla/${resetToken}`;

        const message = `
      <div style="background-color:#1a1a2e; color:#e0e0e0; padding:20px; font-family:sans-serif;">
        <h1 style="color:#d4af37;">🔮 Şifre Yenileme</h1>
        <p>Büyülü Kütüphane hesabın için bir şifre sıfırlama büyüsü talep edildi.</p>
        <a href="${resetUrl}" style="background-color:#d4af37; color:#000; padding:10px 20px; text-decoration:none; border-radius:5px; font-weight:bold;">Şifremi Sıfırla</a>
        <p style="margin-top:20px; font-size:12px; color:#888;">Bu işlemi sen yapmadıysan, bu parşömeni yak ve unut.</p>
      </div>
    `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Şifre Sıfırlama Büyüsü 🗝️',
                message
            });

            res.render('pages/forgot-password', {
                title: 'Şifremi Unuttum',
                success: true
            });

        } catch (err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            return res.render('pages/forgot-password', {
                title: 'Şifremi Unuttum',
                error: 'Baykuş yolda kayboldu (Mail gönderilemedi).'
            });
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Sunucu Hatası");
    }
};

// --- ŞİFRE SIFIRLAMA İŞLEMLERİ (GET) ---
exports.getResetPasswordPage = async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('pages/forgot-password', {
                title: 'Hata',
                error: 'Bu sıfırlama parşömeni (linki) geçersiz veya süresi dolmuş.'
            });
        }

        res.render('pages/reset-password', {
            title: 'Yeni Şifre Belirle',
            token: req.params.token
        });

    } catch (error) {
        console.log(error);
        res.redirect('/sifremi-unuttum');
    }
};

// --- ŞİFRE YENİLEME (POST) ---
exports.resetPassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        const token = req.params.token;

        if (password !== confirmPassword) {
            return res.render('pages/reset-password', {
                title: 'Yeni Şifre Belirle',
                token: token,
                error: 'Şifreler birbiriyle uyuşmuyor!'
            });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('pages/forgot-password', {
                title: 'Hata',
                error: 'Süre dolmuş veya link bozuk. Tekrar baykuş gönder.'
            });
        }

        // Şifreyi güncelle
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Tokenları temizle
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        console.log("Şifre başarıyla sıfırlandı!");

        res.render('pages/login', {
            title: 'Giriş Yap',
            success: 'Şifren başarıyla yenilendi! Artık giriş yapabilirsin.'
        });

    } catch (error) {
        console.log("Reset Error:", error);
        res.status(500).send("Bir hata oluştu.");
    }
};

// --- ÇIKIŞ YAPMA İŞLEMİ (LOGOUT) ---
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
};