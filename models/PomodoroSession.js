// models/PomodoroSession.js
const mongoose = require("mongoose");

const pomodoroSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // personal | community
    roomType: { type: String, enum: ["personal", "community"], default: "personal", index: true },

    // Topluluk odası roomId ileride gelirse diye (şimdilik null kalabilir)
    roomId: { type: String, default: null, index: true },

    // work | short | long | custom
    mode: { type: String, default: "work", trim: true, maxlength: 20, index: true },

    // kullanıcı hangi süreyi seçti (dakika)
    plannedMinutes: { type: Number, required: true, min: 1, max: 180 },

    // fiilen geçen süre (saniye)
    actualSeconds: { type: Number, default: 0, min: 0, max: 60 * 60 * 6 },

    startedAt: { type: Date, required: true, index: true },
    endedAt: { type: Date, default: null, index: true },

    status: { type: String, enum: ["running", "completed", "stopped"], default: "running", index: true },
  },
  { timestamps: true }
);

pomodoroSessionSchema.index({ userId: 1, startedAt: -1 });
pomodoroSessionSchema.index({ userId: 1, status: 1, startedAt: -1 });

module.exports = mongoose.model("PomodoroSession", pomodoroSessionSchema);
