// models/BehaviorLog.js
const mongoose = require("mongoose");

const behaviorLogSchema = new mongoose.Schema(
  {
    // Time-series verilerinde zorunlu zaman alanı
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    
    // Time-series metaField alanı (gruplama ve filtreleme genelde kullanıcı bazlı olur)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Hangi tür bir davranış loglandığı
    eventType: {
      type: String,
      required: true,
      enum: ["pomodoro_completed", "task_completed", "session_ended"],
    },

    // Çalışma modu: "solo" (tekil) veya "room" (topluluk/oda)
    studyMode: {
      type: String,
      enum: ["solo", "room"],
      default: "solo",
    },

    // Oturum veya Pomodoro süresi (dakika)
    durationMinutes: {
      type: Number,
      default: 0,
    },

    // Pomodoro için hangi konuya/derse çalışıldığı
    topic: {
      type: String,
      default: null,
      trim: true,
    },

    // Task (Görev) için: başlama ile bitirme arasındaki süre (dakika)
    taskDeltaMinutes: {
      type: Number,
      default: 0,
    },
    
    // Procrastination (Erteleme) skoru: Görev deltasından veya diğer faktörlerden hesaplanır
    procrastinationScore: {
      type: Number,
      default: 0, 
    }
  },
  {
    // MongoDB Time-Series Koleksiyonunu Aktif Et
    timeseries: {
      timeField: "timestamp",
      metaField: "userId",
      granularity: "minutes" // Verilerin sıklığına göre 'seconds', 'minutes' veya 'hours'
    },
    // timestamps: true eklemiyoruz çünkü 'timestamp' alanımız zaten mevcut ve time-series için kullanılıyor.
  }
);

// NOT: Time-series koleksiyonlarında ikincil indeksler genellikle metaField ve timeField üzerinden MongoDB tarafından otomatik optimize edilir.
// Ancak belirli sorgular için eventType gibi alanlara ekstra indeks eklenebilir.
behaviorLogSchema.index({ userId: 1, eventType: 1, timestamp: -1 });

module.exports = mongoose.model("BehaviorLog", behaviorLogSchema);
