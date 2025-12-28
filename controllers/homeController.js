// controllers/homeController.js

const homeController = {

// Ana sayfa için denetleyici
getWelcomePage: (req, res) => {
        res.render('pages/welcome', {
            title: 'Büyülü Kütüphane - Hoş Geldiniz',
            // Layout dosyanızda kullanılıyorsa aktif sayfa bilgisi vs. gönderebilirsiniz.
            path: '/'
        });       
    },
//kesfet sayfası için denetleyici
    getDiscoverPage: (req, res) => {
        res.render('pages/discover', {
            title: 'Akademiyi Keşfet - Büyülü Kütüphane', // Başlık hatası almamak için title gönderiyoruz
            path: '/kesfet'
        });
    },

    // 3. Giriş Yap Sayfası (EKSİK OLAN BU OLABİLİR)
    getLoginPage: (req, res) => {
        res.render('pages/login', {
            title: 'Giriş Yap - Büyülü Kütüphane',
            path: '/giris'
        });
    },

    // 4. Kayıt Ol Sayfası (EKSİK OLAN BU OLABİLİR)
    getRegisterPage: (req, res) => {
        res.render('pages/register', {
            title: 'Kayıt Ol - Büyülü Kütüphane',
            path: '/kayit'
        });
    }

//YENİ SAYFA DENETLEYİCİLERİNİ BURAYA EKLEYE
};

module.exports = homeController;
