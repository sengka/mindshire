// seedAvatarsScript.js
// One-time script to seed avatars into database
require('dotenv').config();
const mongoose = require('mongoose');
const seedAvatars = require('./utils/seedAvatars');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mindshire';

async function run() {
    try {
        console.log('🔌 Veritabanına bağlanılıyor...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Veritabanı bağlantısı başarılı');

        console.log('🌱 Avatar seeding başlıyor...');
        const success = await seedAvatars();

        if (success) {
            console.log('✨ Tüm avatarlar başarıyla eklendi!');
        } else {
            console.log('❌ Avatar seeding başarısız');
        }

        await mongoose.connection.close();
        console.log('👋 Veritabanı bağlantısı kapatıldı');
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error);
        process.exit(1);
    }
}

run();
