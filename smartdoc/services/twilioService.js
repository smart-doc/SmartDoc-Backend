const twilio = require('twilio');

class TwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioClient = twilio(this.accountSid, this.authToken);
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  async sendWhatsAppMessage(to, message, templateData = null) {
    try {
      const messageOptions = {
        from: this.twilioPhoneNumber,
        to: to,
        body: message
      };

      // If using template with variables
      if (templateData) {
        messageOptions.contentSid = templateData.contentSid;
        messageOptions.contentVariables = JSON.stringify(templateData.variables);
        delete messageOptions.body; // Remove body when using template
      }

      const response = await this.twilioClient.messages.create(messageOptions);
      console.log(`Message sent: ${response.sid}`);
      return response;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  async sendTemplateMessage(to, contentSid, variables = {}) {
    try {
      const message = await this.twilioClient.messages.create({
        from: this.twilioPhoneNumber,
        contentSid: contentSid,
        contentVariables: JSON.stringify(variables),
        to: `whatsapp:${to}`
      });
      
      console.log(`Template message sent: ${message.sid}`);
      return message;
    } catch (error) {
      console.error('Error sending template message:', error);
      throw error;
    }
  }

  async sendBulkMessages(recipients, message, templateData = null) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await this.sendWhatsAppMessage(
          `whatsapp:${recipient}`,
          message,
          templateData
        );
        results.push({ recipient, success: true, messageId: result.sid });
      } catch (error) {
        results.push({ recipient, success: false, error: error.message });
      }
      
      // Rate limiting - wait 1 second between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  formatWhatsAppNumber(phoneNumber) {
    return phoneNumber.startsWith('whatsapp:') ? phoneNumber : `whatsapp:${phoneNumber}`;
  }

  extractPhoneNumber(whatsappNumber) {
    return whatsappNumber.replace('whatsapp:', '');
  }
}

module.exports = TwilioService;