// In-memory storage (replace with database in production)
const activeSessions = new Map();
const scheduledReminders = new Map();

class SessionModel {
  static createSession(phoneNumber, sessionId) {
    activeSessions.set(phoneNumber, sessionId);
    console.log(`Created new session ${sessionId} for ${phoneNumber}`);
    return sessionId;
  }

  static getSession(phoneNumber) {
    return activeSessions.get(phoneNumber);
  }

  static deleteSession(phoneNumber) {
    return activeSessions.delete(phoneNumber);
  }

  static getAllSessions() {
    return activeSessions;
  }

  static getSessionCount() {
    return activeSessions.size;
  }
}

class ReminderModel {
  static createReminder(reminderId, phoneNumber, dateTime, message) {
    const reminder = {
      id: reminderId,
      phoneNumber,
      dateTime,
      message,
      sent: false,
      createdAt: new Date()
    };
    
    scheduledReminders.set(reminderId, reminder);
    console.log(`Scheduled reminder ${reminderId} for ${phoneNumber} at ${dateTime}`);
    return reminder;
  }

  static getReminder(reminderId) {
    return scheduledReminders.get(reminderId);
  }

  static getAllReminders() {
    return scheduledReminders;
  }

  static updateReminderStatus(reminderId, sent = true) {
    const reminder = scheduledReminders.get(reminderId);
    if (reminder) {
      reminder.sent = sent;
      reminder.sentAt = new Date();
    }
    return reminder;
  }

  static deleteReminder(reminderId) {
    return scheduledReminders.delete(reminderId);
  }

  static getDueReminders() {
    const now = new Date();
    const dueReminders = [];
    
    for (const [id, reminder] of scheduledReminders.entries()) {
      if (!reminder.sent && reminder.dateTime <= now) {
        dueReminders.push(reminder);
      }
    }
    
    return dueReminders;
  }

  static getReminderCount() {
    return scheduledReminders.size;
  }
}

module.exports = {
  SessionModel,
  ReminderModel,
  activeSessions,
  scheduledReminders
};