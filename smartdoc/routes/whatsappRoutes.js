const express = require('express');
const ApiController = require('../controllers/apiController');
const router = express.Router();
const apiController = new ApiController();

// Message endpoints
router.post('/send-message', apiController.sendMessage.bind(apiController));
router.post('/send-bulk', apiController.sendBulkMessages.bind(apiController));
router.post('/send-template', apiController.sendTemplateMessage.bind(apiController));

// Reminder endpoints
router.post('/schedule-reminder', apiController.scheduleReminder.bind(apiController));
router.delete('/reminder/:reminderId', apiController.cancelReminder.bind(apiController));
router.get('/reminders/:phoneNumber', apiController.getUserReminders.bind(apiController));

// System endpoints
router.get('/stats', apiController.getSystemStats.bind(apiController));

module.exports = router;