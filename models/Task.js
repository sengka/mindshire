const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true, maxlength: 120 },

    // dakika cinsinden
    duration: { type: Number, default: 25, min: 1, max: 600 },

    // Ders / Proje / Mola gibi
    category: { type: String, default: 'Genel', trim: true, maxlength: 40 },

    // görev tamamlayınca eklenecek XP
    xp: { type: Number, default: 10, min: 0, max: 1000 },

    // Görevin ait olduğu gün (takvim mantığı için kritik)
    // EJS tarafında YYYY-MM-DD string göndereceğiz.
    date: { type: Date, required: true, index: true },

    isCompleted: { type: Boolean, default: false, index: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, date: 1, isCompleted: 1 });

module.exports = mongoose.model('Task', taskSchema);
