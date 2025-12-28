const express = require("express");
const router = express.Router();
const pomodoroController = require("../controllers/pomodoroController");

router.post("/start", pomodoroController.startSession);
router.post("/stop", pomodoroController.stopSession);
router.get("/today", pomodoroController.getTodaySessions);

module.exports = router;
