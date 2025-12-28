// models/CalendarEvent.js
const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['exam', 'deadline', 'event', 'reminder'], default: 'event' },

    // Takvim günü için: normalize (00:00)
    date: { type: Date, required: true, index: true },

    // Opsiyonel saat (örn 10:30)
    time: { type: String, default: '' }, // "HH:MM" gibi

    location: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },

    color: { type: String, default: 'gold' } // ileride UI etiket rengi
  },
  { timestamps: true }
);

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
