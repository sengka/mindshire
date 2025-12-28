// controllers/courseController.js
const User = require("../models/User");
const Course = require("../models/Course");

function safeUserView(userDoc) {
  const u = userDoc.toObject();
  u.stats = {
    level: u.level || 1,
    xp: u.xp || 0,
    xpMax: 1000
  };
  u.notifications = u.notifications || 0;
  return u;
}

function xpForTopic(topic) {
  // Basit ama etkili bir XP kuralı:
  // plannedMinutes 0-30 => 10xp, 31-60 => 20xp, 61+ => 30xp
  const m = Number(topic.plannedMinutes) || 0;
  if (m >= 61) return 30;
  if (m >= 31) return 20;
  return 10;
}

exports.getCoursesPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const user = await User.findById(userId);
    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const courses = await Course.find({ userId })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    // seçili ders: query param ?course=<id>
    const selectedId = (req.query.course || "").trim();
    const selected = selectedId
      ? courses.find(c => String(c._id) === String(selectedId))
      : courses[0] || null;

    // seçili dersin konularını “yapılacak/tamamlanan” ayırmak için
    let selectedTopics = { pending: [], done: [] };
    if (selected) {
      const topics = (selected.topics || []).slice().sort((a, b) => {
        // önce yapılacaklar, sonra tamamlananlar; yeni olan üstte
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      selectedTopics.pending = topics.filter(t => !t.isCompleted);
      selectedTopics.done = topics.filter(t => t.isCompleted);
    }

    res.render("pages/courses", {
      title: "Dersler | Mindshire",
      layout: "layouts/main",
      user: safeUserView(user),
      courses,
      selectedCourse: selected,
      selectedTopics
    });
  } catch (err) {
    console.error("Courses get error:", err);
    res.status(500).send("Bir hata oluştu: " + err.message);
  }
};

// ===== Get Course by Slug (SEO-friendly URL) =====
// ===== Get Course by Slug (SEO-friendly URL) =====
exports.getCourseBySlug = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const user = await User.findById(userId);
    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    const { slug } = req.params;

    // 1) Tüm dersleri çek (sidebar için şart)
    const courses = await Course.find({ userId })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    // 2) Seçili dersi slug ile bul (listeden bulmak daha hızlı ve tutarlı)
    let selected = courses.find(c => c.slug === slug) || null;

    // 3) Geriye dönük uyumluluk: eğer slug aslında ObjectId ise
    if (!selected && /^[0-9a-fA-F]{24}$/.test(slug)) {
      selected = courses.find(c => String(c._id) === String(slug)) || null;

      // Eğer ID ile bulundu ve slug varsa, canonical slug URL'ye 301 bas
      if (selected && selected.slug) {
        return res.redirect(301, `/courses/${selected.slug}`);
      }
    }

    // 4) Hâlâ yoksa courses sayfasına dön
    if (!selected) return res.redirect("/courses");

    // 5) Seçili dersin konularını pending/done ayır (EJS bunu istiyor)
    let selectedTopics = { pending: [], done: [] };
    const topics = (selected.topics || []).slice().sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    selectedTopics.pending = topics.filter(t => !t.isCompleted);
    selectedTopics.done = topics.filter(t => t.isCompleted);

    // 6) Aynı EJS'i, aynı datalarla render et
    return res.render("pages/courses", {
      title: "Dersler | Mindshire",
      layout: "layouts/main",
      user: safeUserView(user),
      courses,
      selectedCourse: selected,
      selectedTopics,
      // csrfToken büyük ihtimal middleware’den geliyor zaten,
      // ayrıca burada set etmene gerek yok.
    });

  } catch (err) {
    console.error("Course by slug error:", err);
    return res.status(500).send("Bir hata oluştu: " + err.message);
  }
};

// ===== Course CRUD =====
exports.createCourse = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const { name, code, instructor, term, color } = req.body;
    if (!name || !name.trim()) return res.redirect("/courses");

    const course = await Course.create({
      userId,
      name: name.trim(),
      code: (code || "").trim(),
      instructor: (instructor || "").trim(),
      term: (term || "").trim(),
      color: (color || "#ffdb58").trim()
    });

    return res.redirect(`/courses?course=${course._id}`);
  } catch (err) {
    console.error("Course create error:", err);
    res.status(500).send("Bir hata oluştu: " + err.message);
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const { id } = req.params;
    const { name, code, instructor, term, color } = req.body;

    const course = await Course.findOne({ _id: id, userId });
    if (!course) return res.redirect("/courses");

    if (name && name.trim()) course.name = name.trim();
    course.code = (code || "").trim();
    course.instructor = (instructor || "").trim();
    course.term = (term || "").trim();
    course.color = (color || course.color || "#ffdb58").trim();

    await course.save();
    return res.redirect(`/courses?course=${course._id}`);
  } catch (err) {
    console.error("Course update error:", err);
    res.status(500).send("Bir hata oluştu: " + err.message);
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const { id } = req.params;
    await Course.deleteOne({ _id: id, userId });

    return res.redirect("/courses");
  } catch (err) {
    console.error("Course delete error:", err);
    res.status(500).send("Bir hata oluştu: " + err.message);
  }
};

// ===== Topic CRUD =====
exports.createTopic = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const { courseId } = req.params;
    const { title, plannedMinutes, notes } = req.body;

    if (!title || !title.trim()) return res.redirect(`/courses?course=${courseId}`);

    const course = await Course.findOne({ _id: courseId, userId });
    if (!course) return res.redirect("/courses");

    course.topics.push({
      title: title.trim(),
      plannedMinutes: Number(plannedMinutes) || 30,
      notes: (notes || "").trim()
    });

    await course.save();
    return res.redirect(`/courses?course=${courseId}`);
  } catch (err) {
    console.error("Topic create error:", err);
    res.status(500).send("Bir hata oluştu: " + err.message);
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const { courseId, topicId } = req.params;
    const { title, plannedMinutes, notes } = req.body;

    const course = await Course.findOne({ _id: courseId, userId });
    if (!course) return res.redirect("/courses");

    const topic = course.topics.id(topicId);
    if (!topic) return res.redirect(`/courses?course=${courseId}`);

    if (title && title.trim()) topic.title = title.trim();
    topic.plannedMinutes = Number(plannedMinutes) || topic.plannedMinutes || 30;
    topic.notes = (notes || "").trim();

    await course.save();
    return res.redirect(`/courses?course=${courseId}`);
  } catch (err) {
    console.error("Topic update error:", err);
    res.status(500).send("Bir hata oluştu: " + err.message);
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const { courseId, topicId } = req.params;

    const course = await Course.findOne({ _id: courseId, userId });
    if (!course) return res.redirect("/courses");

    const topic = course.topics.id(topicId);
    if (topic) topic.deleteOne();

    await course.save();
    return res.redirect(`/courses?course=${courseId}`);
  } catch (err) {
    console.error("Topic delete error:", err);
    res.status(500).send("Bir hata oluştu: " + err.message);
  }
};

exports.toggleTopic = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const { courseId, topicId } = req.params;

    const course = await Course.findOne({ _id: courseId, userId });
    if (!course) return res.redirect("/courses");

    const topic = course.topics.id(topicId);
    if (!topic) return res.redirect(`/courses?course=${courseId}`);

    // XP ödülü: sadece "tamamlarken" verelim
    const goingToComplete = !topic.isCompleted;

    topic.isCompleted = goingToComplete;

    await course.save();

    if (goingToComplete) {
      // kullanıcı xp/level güncelle
      const user = await User.findById(userId);
      if (user) {
        const gained = xpForTopic(topic);
        const xpMax = 1000;

        user.xp = Number(user.xp) || 0;
        user.level = Number(user.level) || 1;

        user.xp += gained;
        while (user.xp >= xpMax) {
          user.xp -= xpMax;
          user.level += 1;
        }
        await user.save();
      }
    }

    return res.redirect(`/courses?course=${courseId}`);
  } catch (err) {
    console.error("Topic toggle error:", err);
    res.status(500).send("Bir hata oluştu: " + err.message);
  }
};
