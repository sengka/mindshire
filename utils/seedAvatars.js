// utils/seedAvatars.js
const Avatar = require('../models/Avatar');

async function seedAvatars() {
    try {
        // Önce mevcut avatarları temizle
        await Avatar.deleteMany({});
        console.log('🗑️  Eski avatarlar temizlendi');

        const avatars = [
            // Default avatar
            { name: 'Varsayılan', imageUrl: '/img/avatars/default.png', category: 'default' },

            // Büyü kategorisi
            { name: 'Büyücü 1', imageUrl: '/img/avatars/buyu/buyu1.jpg', category: 'buyu' },
            { name: 'Büyücü 2', imageUrl: '/img/avatars/buyu/buyu2.jpg', category: 'buyu' },
            { name: 'Büyücü 3', imageUrl: '/img/avatars/buyu/buyu3.jpg', category: 'buyu' },
            { name: 'Büyücü 4', imageUrl: '/img/avatars/buyu/buyu4.jpg', category: 'buyu' },
            { name: 'Büyücü 5', imageUrl: '/img/avatars/buyu/buyu5.jpg', category: 'buyu' },
            { name: 'Büyücü 6', imageUrl: '/img/avatars/buyu/buyu6.jpg', category: 'buyu' },

            // Elf kategorisi
            { name: 'Elf 1', imageUrl: '/img/avatars/elf/elf1.jpg', category: 'elf' },
            { name: 'Elf 2', imageUrl: '/img/avatars/elf/elf2.jpg', category: 'elf' },
            { name: 'Elf 3', imageUrl: '/img/avatars/elf/elf3.jpg', category: 'elf' },
            { name: 'Elf 4', imageUrl: '/img/avatars/elf/elf4.jpg', category: 'elf' },
            { name: 'Elf 5', imageUrl: '/img/avatars/elf/elf5.jpg', category: 'elf' },
            { name: 'Elf 6', imageUrl: '/img/avatars/elf/elf6.jpg', category: 'elf' },

            // Peri kategorisi
            { name: 'Peri 1', imageUrl: '/img/avatars/peri/peri1.jpg', category: 'peri' },
            { name: 'Peri 2', imageUrl: '/img/avatars/peri/peri2.jpg', category: 'peri' },
            { name: 'Peri 3', imageUrl: '/img/avatars/peri/peri3.jpg', category: 'peri' },
            { name: 'Peri 4', imageUrl: '/img/avatars/peri/peri4.jpg', category: 'peri' },
            { name: 'Peri 5', imageUrl: '/img/avatars/peri/peri5.jpg', category: 'peri' },
            { name: 'Peri 6', imageUrl: '/img/avatars/peri/peri6.jpg', category: 'peri' },

            // Fark kategorisi
            { name: 'Karakter 1', imageUrl: '/img/avatars/fark/fark1.jpg', category: 'fark' },
            { name: 'Karakter 2', imageUrl: '/img/avatars/fark/fark2.jpg', category: 'fark' },
            { name: 'Karakter 3', imageUrl: '/img/avatars/fark/fark3.jpg', category: 'fark' },
            { name: 'Karakter 4', imageUrl: '/img/avatars/fark/fark4.jpg', category: 'fark' },
            { name: 'Karakter 5', imageUrl: '/img/avatars/fark/fark5.jpg', category: 'fark' },
            { name: 'Karakter 6', imageUrl: '/img/avatars/fark/fark6.jpg', category: 'fark' }
        ];

        await Avatar.insertMany(avatars);
        console.log(`✨ ${avatars.length} avatar başarıyla eklendi!`);

        return true;
    } catch (error) {
        console.error('❌ Avatar seeding hatası:', error);
        return false;
    }
}

module.exports = seedAvatars;
