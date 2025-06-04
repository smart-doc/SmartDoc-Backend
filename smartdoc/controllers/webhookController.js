const MessageService = require('../services/messageService');

class WebhookController {
  constructor() {
    this.messageService = new MessageService();
  }

  async handleWhatsAppWebhook(req, res) {
    try {
      const { Body, From, MessageSid } = req.body;
      
      if (!Body || !From) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['Body', 'From']
        });
      }

      console.log(`Received message from ${From}: ${Body}`);
      
      // Process the message asynchronously
      this.messageService.processIncomingMessage(From, Body, MessageSid)
        .catch(error => {
          console.error('Error processing message:', error);
        });
      
      // Respond immediately to Twilio
      res.status(200).send('OK');
      
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  // Webhook verification for Twilio (optional)
  async verifyWebhook(req, res) {
    // Implement webhook verification if needed
    const signature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    
    // Add Twilio signature verification logic here if needed
    res.status(200).send('Webhook verified');
  }

  // Status endpoint for webhook health
  async getWebhookStatus(req, res) {
    try {
      res.json({
        status: 'active',
        timestamp: new Date().toISOString(),
        webhook: 'whatsapp',
        version: '1.0.0'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Unable to get webhook status',
        message: error.message
      });
    }
  }
}

module.exports = WebhookController;