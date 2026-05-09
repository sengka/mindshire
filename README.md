# 🌱 Mindshire

**Mindshire**, öğrenciler ve bireysel çalışanlar için geliştirilmiş web tabanlı bir üretkenlik uygulamasıdır.  
Kullanıcıların çalışma süreçlerini planlamasını, takip etmesini ve odaklanmasını kolaylaştırmayı amaçlar.

Takvim, görev yönetimi, istatistikler ve çalışma odaları gibi modülleri tek bir platformda birleştirerek öğrenme sürecini daha **düzenli**, **ölçülebilir** ve **sürdürülebilir** hale getirir.

---

## ✨ Özellikler

### 📅 Takvim Yönetimi
- Günlük etkinlik ekleme, güncelleme ve silme  
- Takvim üzerinden çalışma planı oluşturma  

### ✅ To-Do List
- Gün bazlı görev oluşturma  
- Tamamlanan / tamamlanmayan görev takibi  

### 📊 İstatistikler
- Çalışma süresi analizi  
- Görev tamamlama oranları  
- Kullanıcı ilerlemesini görselleştirme  

### 👥 Çalışma Odaları
- Bireysel ve toplu çalışma alanları  
- Pomodoro tabanlı odaklanma sistemi  

### 👤 Profil & Ayarlar
- Avatar seçimi  
- Kullanıcı ayarları yönetimi  
- Hesap silme özelliği  

---

## 🛠 Kullanılan Teknolojiler

### Backend
- Node.js  
- Express.js  
- MongoDB (Mongoose)  
- MVC mimarisi  
- RESTful API  

### Frontend
- EJS (Embedded JavaScript Templates)  
- HTML5  
- CSS3  
- Vanilla JavaScript  

### Diğer
- Git & GitHub  
- CSRF Protection  
- Authentication & Authorization Middleware  

---

## 🚀 Kurulum ve Çalıştırma

Projeyi lokal ortamda çalıştırmak için aşağıdaki adımları izleyin:

### 1️⃣ Repoyu klonlayın
```bash
git clone https://github.com/sengka/mindshire.git
cd mindshire
```

### 2️⃣ Bağımlılıkları yükleyin
```bash
npm install
```

### 3️⃣ Ortam değişkenlerini ayarlayın

Proje kök dizininde `.env` dosyası oluşturun ve aşağıdaki değişkenleri ekleyin:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_secret_key
```

### 4️⃣ Uygulamayı başlatın
```bash
npm start
```

veya geliştirme ortamı için:
```bash
npm run dev
```

### 5️⃣ Tarayıcıda açın
```
http://localhost:3000
```
Güvenlik için CSRF koruması uygulanmıştır.
Modüler yapı sayesinde yeni özellikler kolayca eklenebilir.
