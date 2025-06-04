const TwilioService = require('../services/twilioService');
const ReminderService = require('../services/reminderService');
const { SessionModel, ReminderModel } = require('../models/SessionModel');

class ApiController {
  constructor() {
    this.twilioService = new TwilioService();
    this.reminderService = new ReminderService();
  }

  async sendMessage(req, res) {
    try {
      const { to, message, templateData } = req.body;
      
      if (!to || !message) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['to', 'message']
        });
      }
      
      const formattedNumber = this.twilioService.formatWhatsAppNumber(to);
      const result = await this.twilioService.sendWhatsAppMessage(formattedNumber, message, templateData);
      
      res.json({
        success: true,
        messageId: result.sid,
        to: formattedNumber,
        status: result.status
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        error: 'Failed to send message',
        message: error.message
      });
    }
  }

  async sendBulkMessages(req, res) {
    try {
      const { recipients, message, templateData } = req.body;
      
      if (!recipients || !Array.isArray(recipients) || !message) {
        return res.status(400).json({
          error: 'Invalid request format',
          required: ['recipients (array)', 'message']
        });
      }
      
      if (recipients.length === 0) {
        return res.status(400).json({
          error: 'Recipients array cannot be empty'
        });
      }
      
      const results = await this.twilioService.sendBulkMessages(recipients, message, templateData);
      
      const summary = {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      };
      
      res.json({
        success: true,
        summary,
        results
      });
      
    } catch (error) {
      console.error('Error sending bulk messages:', error);
      res.status(500).json({
        error: 'Failed to send bulk messages',
        message: error.message
      });
    }
  }

  async sendTemplateMessage(req, res) {
    try {
      const { to, contentSid, variables = {} } = req.body;
      
      if (!to || !contentSid) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['to', 'contentSid']
        });
      }
      
      const result = await this.twilioService.sendTemplateMessage(to, contentSid, variables);
      
      res.json({
        success: true,
        messageId: result.sid,
        to: `whatsapp:${to}`,
        status: result.status
      });
      
    } catch (error) {
      console.error('Error sending template message:', error);
      res.status(500).json({
        error: 'Failed to send template message',
        message: error.message
      });
    }
  }

  async scheduleReminder(req, res) {
    try {
      const { phoneNumber, dateTime, message } = req.body;
      
      if (!phoneNumber || !dateTime || !message) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['phoneNumber', 'dateTime', 'message']
        });
      }
      
      const reminderDateTime = new Date(dateTime);
      
      if (isNaN(reminderDateTime.getTime())) {
        return res.status(400).json({
          error: 'Invalid dateTime format'
        });
      }
      
      if (reminderDateTime <= new Date()) {
        return res.status(400).json({
          error: 'Reminder time must be in the future'
        });
      }
      
      const reminder = await this.reminderService.scheduleReminder(
        phoneNumber,
        reminderDateTime,
        message
      );
      
      res.json({
        success: true,
        reminder: {
          id: reminder.id,
          phoneNumber: reminder.phoneNumber,
          dateTime: reminder.dateTime,
          message: reminder.message,
          createdAt: reminder.createdAt
        }
      });
      
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      res.status(500).json({
        error: 'Failed to schedule reminder',
        message: error.message
      });
    }
  }

  async cancelReminder(req, res) {
    try {
      const { reminderId } = req.params;
      
      if (!reminderId) {
        return res.status(400).json({
          error: 'Reminder ID is required'
        });
      }
      
      const result = await this.reminderService.cancelReminder(reminderId);
      
      if (result.error) {
        return res.status(404).json({
          error: result.error
        });
      }
      
      res.json({
        success: true,
        message: result.message
      });
      
    } catch (error) {
      console.error('Error cancelling reminder:', error);
      res.status(500).json({
        error: 'Failed to cancel reminder',
        message: error.message
      });
    }
  }

  async getUserReminders(req, res) {
    try {
      const { phoneNumber } = req.params;
      
      if (!phoneNumber) {
        return res.status(400).json({
          error: 'Phone number is required'
        });
      }
      
      const reminders = this.reminderService.getUserReminders(phoneNumber);
      
      res.json({
        success: true,
        phoneNumber,
        count: reminders.length,
        reminders
      });
      
    } catch (error) {
      console.error('Error getting user reminders:', error);
      res.status(500).json({
        error: 'Failed to get user reminders',
        message: error.message
      });
    }
  }

  async getSystemStats(req, res) {
    try {
      const stats = {
        activeSessions: SessionModel.getSessionCount(),
        scheduledReminders: ReminderModel.getReminderCount(),
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
      };
      
      res.json({
        success: true,
        stats
      });
      
    } catch (error) {
      console.error('Error getting system stats:', error);
      res.status(500).json({
        error: 'Failed to get system stats',
        message: error.message
      });
    }
  }
}

module.exports = ApiController;