// routes/calendarRoutes.js
const express = require('express');
const router = express.Router();

const calendarController = require('../controllers/calendarController');

router.get('/calendar', calendarController.getCalendarPage);
router.post('/calendar/event', calendarController.createCalendarEvent);
router.put('/calendar/event/:id', calendarController.updateCalendarEvent);
router.delete('/calendar/event/:id', calendarController.deleteCalendarEvent);

module.exports = router;
