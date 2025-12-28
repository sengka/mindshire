// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true, // Aynı e-posta ile tekrar kayıt olunamaz
        lowercase: true
    },
    role: { 
        type: String, 
        enum: ['user', 'admin'], 
        default: 'user' 
    },
    xp: { 
        type: Number, 
        default: 0 
    },
    level: { 
        type: Number, 
        default: 1 
    },
    unlockedThemes: { 
        type: [String], 
        default: ['default'] // Başlangıç teması
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    avatar: {
        type: String,
        default: '/img/avatars/default.png' // Eğer seçmezse varsayılan
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);
module.exports = User;