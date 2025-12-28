const mongoose = require("mongoose");
const slugify = require("slugify");

const studyRoomSchema = new mongoose.Schema(
  {
    hostUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    // ✅ SLUG ALANI
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },

    themeKey: {
      type: String,
      default: "night-library",
      trim: true,
      maxlength: 40,
    },

    themeLabel: {
      type: String,
      default: "Gece Kütüphanesi",
      trim: true,
      maxlength: 60,
    },

    focusMinutes: { type: Number, default: 25, min: 5, max: 180 },
    sessionsCount: { type: Number, default: 4, min: 1, max: 24 },

    shortBreakMinutes: { type: Number, default: 5, min: 1, max: 60 },
    longBreakMinutes: { type: Number, default: 15, min: 1, max: 120 },

    isLocked: { type: Boolean, default: false },
    accessCode: {
      type: String,
      default: null,
      trim: true,
      maxlength: 20,
    },

    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
      index: true,
    },

    totalJoins: { type: Number, default: 0, min: 0 },
    totalVisits: { type: Number, default: 0, min: 0 },

    announcement: {
      text: { type: String, default: null, trim: true, maxlength: 500 },
      createdAt: { type: Date, default: null },
      reactions: [
        {
          emoji: { type: String, required: true },
          userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        },
      ],
    },
  },
  { timestamps: true }
);

// 🔍 Indexler
studyRoomSchema.index({ status: 1, updatedAt: -1 });
studyRoomSchema.index({ hostUserId: 1, status: 1 });

studyRoomSchema.pre("save", function () {
  if (!this.slug || this.isModified("title")) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      locale: "tr",
    });
  }
});


module.exports = mongoose.model("StudyRoom", studyRoomSchema);
