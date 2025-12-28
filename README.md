# 🌱 Mindshire

Mindshire, öğrenciler ve bireysel çalışanlar için geliştirilmiş,  
**çalışma takibi, görev yönetimi ve odaklanma deneyimini bir araya getiren** web tabanlı bir üretkenlik uygulamasıdır.

Proje; takvim, yapılacaklar listesi, istatistikler ve çalışma odaları gibi modüllerle  
kullanıcının öğrenme sürecini daha **düzenli, görünür ve sürdürülebilir** hale getirmeyi amaçlar.

---

## ✨ Özellikler

- 📅 **Takvim Yönetimi**
  - Günlük etkinlik ekleme, güncelleme ve silme
  - Takvim üzerinden çalışma planı oluşturma

- ✅ **To-Do List**
  - Gün bazlı görevler
  - Tamamlanan / tamamlanmayan görev takibi

- 📊 **İstatistikler**
  - Çalışma süresi ve görev tamamlama verileri
  - Kullanıcının ilerlemesini görselleştirme

- 👥 **Çalışma Odaları**
  - Bireysel ve toplu çalışma odaları
  - Pomodoro tabanlı odaklanma sistemi

- 👤 **Profil & Ayarlar**
  - Avatar seçimi
  - Hesap ve kullanıcı ayarları
  - Hesap silme özelliği

---

## 🛠 Kullanılan Teknolojiler

**Backend**
- Node.js
- Express.js
- MongoDB (Mongoose)
- MVC mimarisi

**Frontend**
- EJS (Embedded JavaScript Templates)
- HTML5
- CSS3
- Vanilla JavaScript

**Diğer**
- Git & GitHub
- CSRF Protection
- RESTful Routing

---

## 📂 Proje Yapısı

```text
mindshire/
│
├── controllers/      # İş mantıkları
├── models/           # Veritabanı modelleri
├── routes/           # Express router yapısı
├── views/            # EJS sayfaları
│   └── pages/
├── public/           # CSS, JS, görseller
├── middlewares/      # Auth, CSRF vb.
├── app.js
└── package.json
