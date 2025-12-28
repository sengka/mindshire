const express = require('express');
const router = express.Router();

const todoController = require('../controllers/todoController');

// Sayfa
router.get('/todo', todoController.getTodoPage);

// Görev ekle
router.post('/todo', todoController.createTask);

// Tamamla / geri al
router.post('/todo/:id/toggle', todoController.toggleComplete);

// Sil
router.post('/todo/:id/delete', todoController.deleteTask);

module.exports = router;
