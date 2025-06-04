const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const { ReminderModel } = require('../models/SessionModel');
const TwilioService = require('./twilioService');

class ReminderService {
  constructor() {
    this.twilioService = new TwilioService();
    this.cronJob = null;
  }

  startReminderSystem() {
    // Check for due reminders every minute
    this.cronJob = cron.schedule('* * * * *', () => {
      this.checkDueReminders();
    });
    
    console.log('Reminder system started');
  }

  stopReminderSystem() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('Reminder system stopped');
    }
  }

  async scheduleReminder(phoneNumber, dateTime, message) {
    const reminderId = uuidv4();
    const reminder = ReminderModel.createReminder(reminderId, phoneNumber, dateTime, message);
    return reminder;
  }

  async checkDueReminders() {
    const dueReminders = ReminderModel.getDueReminders();
    
    for (const reminder of dueReminders) {
      try {
        await this.twilioService.sendWhatsAppMessage(
          this.twilioService.formatWhatsAppNumber(reminder.phoneNumber),
          `🔔 Reminder: ${reminder.message}`
        );
        
        ReminderModel.updateReminderStatus(reminder.id, true);
        console.log(`Sent reminder ${reminder.id} to ${reminder.phoneNumber}`);
        
        // Clean up sent reminders after 1 hour
        setTimeout(() => {
          ReminderModel.deleteReminder(reminder.id);
        }, 3600000);
        
      } catch (error) {
        console.error(`Failed to send reminder ${reminder.id}:`, error);
      }
    }
  }

  parseReminderCommand(command) {
    try {
      // Parse: "remind YYYY-MM-DD HH:MM message"
      const parts = command.replace('remind ', '').split(' ');
      if (parts.length < 3) {
        return { error: 'Invalid format. Use: REMIND YYYY-MM-DD HH:MM message' };
      }

      const date = parts[0];
      const time = parts[1];
      const message = parts.slice(2).join(' ');
      
      const reminderDateTime = new Date(`${date}T${time}:00`);
      
      if (isNaN(reminderDateTime.getTime())) {
        return { error: 'Invalid date/time format' };
      }
      
      if (reminderDateTime <= new Date()) {
        return { error: 'Reminder time must be in the future' };
      }

      return {
        success: true,
        dateTime: reminderDateTime,
        message: message
      };
    } catch (error) {
      return { error: 'Error parsing reminder command' };
    }
  }

  async cancelReminder(reminderId) {
    const reminder = ReminderModel.getReminder(reminderId);
    if (!reminder) {
      return { error: 'Reminder not found' };
    }

    if (reminder.sent) {
      return { error: 'Reminder already sent' };
    }

    ReminderModel.deleteReminder(reminderId);
    return { success: true, message: 'Reminder cancelled' };
  }

  getUserReminders(phoneNumber) {
    const allReminders = ReminderModel.getAllReminders();
    const userReminders = [];
    
    for (const [id, reminder] of allReminders) {
      if (reminder.phoneNumber === phoneNumber && !reminder.sent) {
        userReminders.push(reminder);
      }
    }
    
    return userReminders;
  }
}

module.exports = ReminderService;