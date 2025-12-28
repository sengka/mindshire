// models/Avatar.js
const mongoose = require('mongoose');

const avatarSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['buyu', 'elf', 'peri', 'fark', 'default']
    }
}, {
    timestamps: true
});

const Avatar = mongoose.model('Avatar', avatarSchema);
module.exports = Avatar;
