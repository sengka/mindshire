//mongodb
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Bağlantı kurulumu
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // Mongoose 6+ sürümü için artık extra ayar gerekmiyor ama
            // eski sürümlerde useNewUrlParser vs. gerekebilirdi.
        });

        console.log(`🔮 Veritabanı Bağlantısı Başarılı: ${conn.connection.host}`);
    } catch (error) {
        console.error(`☠️ Veritabanı Bağlantı Hatası: ${error.message}`);
        process.exit(1); // Hata varsa uygulamayı durdur
    }
};

module.exports = connectDB;