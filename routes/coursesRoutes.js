// routes/courseRoutes.js
const express = require("express");
const router = express.Router();

const courseController = require("../controllers/courseController");

// Page
router.get("/courses", courseController.getCoursesPage);

// SEO-friendly slug route (must come before :id routes to avoid conflicts)
router.get("/courses/:slug", courseController.getCourseBySlug);

// Course CRUD
router.post("/courses", courseController.createCourse);
router.put("/courses/:id", courseController.updateCourse);
router.delete("/courses/:id", courseController.deleteCourse);

// Topic CRUD (nested)
router.post("/courses/:courseId/topics", courseController.createTopic);
router.put("/courses/:courseId/topics/:topicId", courseController.updateTopic);
router.delete("/courses/:courseId/topics/:topicId", courseController.deleteTopic);

// Topic toggle complete
router.post("/courses/:courseId/topics/:topicId/toggle", courseController.toggleTopic);

module.exports = router;
