// routes/studyRoomRoutes.js
const express = require("express");
const router = express.Router();

const studyRoomController = require("../controllers/studyRoomController");

// /study-room
router.get("/", studyRoomController.getStudyRoomIndex);

// /study-room/personal
router.get("/personal", studyRoomController.getPersonalRoom);

// /study-room/community  (LOBI)
router.get("/community", studyRoomController.getCommunityLobby);

// /study-room/community/:roomId (ODA)
router.get("/community/:roomId", studyRoomController.getCommunityRoomPage);

// oda kur (host)
router.post("/community/create", studyRoomController.createCommunityRoom);

// odayı bitir (host)
router.post("/community/:roomId/end", studyRoomController.endCommunityRoom);

// Pomodoro log sayfası
router.get("/log", studyRoomController.getPomodoroLogPage);

// Host oda ayarlarını günceller
router.post(
  "/community/:roomId/settings",
  studyRoomController.updateCommunityRoomSettings
);

// Announcement routes
router.post("/community/:roomId/announcement", studyRoomController.createOrUpdateAnnouncement);
router.delete("/community/:roomId/announcement", studyRoomController.deleteAnnouncement);
router.post("/community/:roomId/announcement/react", studyRoomController.toggleAnnouncementReaction);

module.exports = router;
