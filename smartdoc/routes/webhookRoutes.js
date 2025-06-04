const express = require('express');
const WebhookController = require('../controllers/webhookController');

const router = express.Router();
const webhookController = new WebhookController();

// WhatsApp webhook endpoint
router.post('/whatsapp', webhookController.handleWhatsAppWebhook.bind(webhookController));

// Webhook verification endpoint (optional)
router.get('/whatsapp', webhookController.verifyWeb)

// Webhook status endpoint
router.get('/status', webhookController.getWebhookStatus.bind(webhookController));

module.exports = router;