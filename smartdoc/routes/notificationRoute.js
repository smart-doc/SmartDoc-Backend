const express = require('express');
const router = express.Router();
const { updateFcmToken } = require('../controllers/userProfileController');
const { protectRoute } = require('../middlewares/protectRoute');

router.post('/fcm-token', protectRoute, updateFcmToken);

module.exports = router;