const { v4: uuidv4 } = require('uuid');
const { SessionModel } = require('../models/sessionModel');
const TwilioService = require('.twilioService');
const AIService = require('./aiService');
const ReminderService = require('./reminderService');

class MessageService {
  constructor() {
    this.twilioService = new TwilioService();
    this.aiService = new AIService();
    this.reminderService = new ReminderService();
  }

  async processIncomingMessage(from, body, messageId) {
    try {
      // Extract phone number from WhatsApp format
      const phoneNumber = this.twilioService.extractPhoneNumber(from);
      
      // Get or create session
      let sessionId = SessionModel.getSession(phoneNumber);
      if (!sessionId) {
        sessionId = uuidv4();
        SessionModel.createSession(phoneNumber, sessionId);
      }

      // Check for special commands
      if (await this.handleSpecialCommands(from, body.toLowerCase(), phoneNumber)) {
        return;
      }

      // Send message to AI API
      const aiResponse = await this.aiService.generateResponse(body, {
        sessionId,
        userId: phoneNumber
      });
      
      // Send AI response back to WhatsApp
      await this.twilioService.sendWhatsAppMessage(from, aiResponse);
      
    } catch (error) {
      console.error('Error processing message:', error);
      await this.twilioService.sendWhatsAppMessage(from, 'Sorry, I encountered an error. Please try again.');
    }
  }

  async handleSpecialCommands(from, body, phoneNumber) {
    // Handle appointment booking
    if (body.includes('book appointment') || body.includes('schedule')) {
      await this.twilioService.sendWhatsAppMessage(from, 
        'To book an appointment, please provide:\n' +
        '📅 Date (YYYY-MM-DD)\n' +
        '⏰ Time (HH:MM)\n' +
        '📝 Brief description\n\n' +
        'Example: "2025-06-05 14:30 General consultation"'
      );
      return true;
    }

    // Handle reminder setup
    if (body.includes('set reminder') || body.includes('remind me')) {
      await this.twilioService.sendWhatsAppMessage(from,
        'To set a reminder, use format:\n' +
        'REMIND [DATE] [TIME] [MESSAGE]\n\n' +
        'Example: "REMIND 2025-06-05 09:00 Take medication"'
      );
      return true;
    }

    // Parse reminder command
    if (body.startsWith('remind ')) {
      await this.parseAndSetReminder(from, body, phoneNumber);
      return true;
    }

    // List reminders
    if (body.includes('my reminders') || body.includes('list reminders')) {
      await this.listUserReminders(from, phoneNumber);
      return true;
    }

    // Handle help
    if (body.includes('help') || body.includes('menu')) {
      await this.twilioService.sendWhatsAppMessage(from, this.getHelpMessage());
      return true;
    }

    return false;
  }

  async parseAndSetReminder(from, command, phoneNumber) {
    const parseResult = this.reminderService.parseReminderCommand(command);
    
    if (parseResult.error) {
      await this.twilioService.sendWhatsAppMessage(from, parseResult.error);
      return;
    }

    try {
      const reminder = await this.reminderService.scheduleReminder(
        phoneNumber, 
        parseResult.dateTime, 
        parseResult.message
      );
      
      await this.twilioService.sendWhatsAppMessage(from, 
        `✅ Reminder set for ${parseResult.dateTime.toLocaleString()}\n` +
        `Message: ${parseResult.message}\n` +
        `ID: ${reminder.id}`
      );
    } catch (error) {
      console.error('Error setting reminder:', error);
      await this.twilioService.sendWhatsAppMessage(from, 'Error setting reminder. Please try again.');
    }
  }

  async listUserReminders(from, phoneNumber) {
    const userReminders = this.reminderService.getUserReminders(phoneNumber);
    
    if (userReminders.length === 0) {
      await this.twilioService.sendWhatsAppMessage(from, 'You have no active reminders.');
      return;
    }

    let message = '📋 *Your Reminders:*\n\n';
    userReminders.forEach((reminder, index) => {
      message += `${index + 1}. ${reminder.dateTime.toLocaleString()}\n`;
      message += `   ${reminder.message}\n`;
      message += `   ID: ${reminder.id}\n\n`;
    });

    await this.twilioService.sendWhatsAppMessage(from, message);
  }

  getHelpMessage() {
    return `🤖 *WhatsApp AI Assistant*\n\n` +
           `Available commands:\n` +
           `📅 "book appointment" - Schedule an appointment\n` +
           `⏰ "set reminder" - Set up reminders\n` +
           `📋 "my reminders" - List your reminders\n` +
           `❓ "help" - Show this menu\n` +
           `💬 Or just chat with me naturally!\n\n` +
           `Example reminder: "REMIND 2025-06-05 09:00 Take medication"`;
  }
}

module.exports = MessageService;