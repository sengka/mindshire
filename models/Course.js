// models/Course.js
const mongoose = require("mongoose");

const ResourceSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: "" },
    url: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const TopicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    isCompleted: { type: Boolean, default: false },
    notes: { type: String, trim: true, default: "" },
    plannedMinutes: { type: Number, default: 30 },
    resources: { type: [ResourceSchema], default: [] }
  },
  { timestamps: true }
);

const CourseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: "" },      // örn: SWE302
    instructor: { type: String, trim: true, default: "" },// örn: Ömer Hoca
    term: { type: String, trim: true, default: "" },      // örn: 2025 Güz
    color: { type: String, trim: true, default: "#ffdb58" }, // UI rengi (gold default)

    slug: { type: String, unique: true, sparse: true, index: true }, // SEO-friendly URL slug

    topics: { type: [TopicSchema], default: [] }
  },
  { timestamps: true }
);

// Pre-save hook to generate slug from name if not exists
CourseSchema.pre('save', async function () {
  if (this.isModified('name') || !this.slug) {
    const { generateSlug, ensureUniqueSlug } = require('../utils/slugHelper');
    const baseSlug = generateSlug(this.name);
    this.slug = await ensureUniqueSlug(mongoose.model('Course'), baseSlug, this._id);
  }
});

module.exports = mongoose.model("Course", CourseSchema);
