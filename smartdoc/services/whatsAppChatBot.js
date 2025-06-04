// const express = require('express');
// const twilio = require('twilio');
// const axios = require('axios');
// const { v4: uuidv4 } = require('uuid');
// const cron = require('node-cron');

// const app = express();
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());

// // Twilio Configuration
// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const twilioClient = twilio(accountSid, authToken);
// const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; // e.g., 'whatsapp:+14155238886'

// // Your FastAPI endpoint
// const AI_API_ENDPOINT = process.env.AI_API_ENDPOINT || 'http://localhost:8000/chat';

// const activeSessions = new Map();
// const scheduledReminders = new Map();

// class WhatsAppChatBot {
//   constructor() {
//     this.setupWebhook();
//     this.setupReminderSystem();
//   }

//   setupWebhook() {
//     // Webhook endpoint for receiving WhatsApp messages
//     app.post('/webhook/whatsapp', async (req, res) => {
//       try {
//         const { Body, From, MessageSid } = req.body;
        
//         if (!Body || !From) {
//           return res.status(400).send('Missing required fields');
//         }

//         console.log(`Received message from ${From}: ${Body}`);
        
//         await this.handleIncomingMessage(From, Body, MessageSid);
//         res.status(200).send('OK');
//       } catch (error) {
//         console.error('Webhook error:', error);
//         res.status(500).send('Internal Server Error');
//       }
//     });
//   }

//   async handleIncomingMessage(from, body, messageId) {
//     try {
//       // Extract phone number from WhatsApp format
//       const phoneNumber = from.replace('whatsapp:', '');
      
//       // Get or create session
//       let sessionId = activeSessions.get(phoneNumber);
//       if (!sessionId) {
//         sessionId = uuidv4();
//         activeSessions.set(phoneNumber, sessionId);
//         console.log(`Created new session ${sessionId} for ${phoneNumber}`);
//       }

//       // Check for special commands
//       if (await this.handleSpecialCommands(from, body.toLowerCase())) {
//         return;
//       }

//       // Send message to your AI API
//       const aiResponse = await this.callAIAPI(body, sessionId, phoneNumber);
      
//       // Send AI response back to WhatsApp
//       await this.sendWhatsAppMessage(from, aiResponse);
      
//     } catch (error) {
//       console.error('Error handling message:', error);
//       await this.sendWhatsAppMessage(from, 'Sorry, I encountered an error. Please try again.');
//     }
//   }

//   async handleSpecialCommands(from, body) {
//     // Handle appointment booking
//     if (body.includes('book appointment') || body.includes('schedule')) {
//       await this.sendWhatsAppMessage(from, 
//         'To book an appointment, please provide:\n' +
//         '📅 Date (YYYY-MM-DD)\n' +
//         '⏰ Time (HH:MM)\n' +
//         '📝 Brief description\n\n' +
//         'Example: "2025-06-05 14:30 General consultation"'
//       );
//       return true;
//     }

//     // Handle reminder setup
//     if (body.includes('set reminder') || body.includes('remind me')) {
//       await this.sendWhatsAppMessage(from,
//         'To set a reminder, use format:\n' +
//         'REMIND [DATE] [TIME] [MESSAGE]\n\n' +
//         'Example: "REMIND 2025-06-05 09:00 Take medication"'
//       );
//       return true;
//     }

//     // Parse reminder command
//     if (body.startsWith('remind ')) {
//       await this.parseReminderCommand(from, body);
//       return true;
//     }

//     // Handle help
//     if (body.includes('help') || body.includes('menu')) {
//       await this.sendWhatsAppMessage(from, this.getHelpMessage());
//       return true;
//     }

//     return false;
//   }

//   async parseReminderCommand(from, command) {
//     try {
//       // Parse: "remind YYYY-MM-DD HH:MM message"
//       const parts = command.replace('remind ', '').split(' ');
//       if (parts.length < 3) {
//         await this.sendWhatsAppMessage(from, 'Invalid format. Use: REMIND YYYY-MM-DD HH:MM message');
//         return;
//       }

//       const date = parts[0];
//       const time = parts[1];
//       const message = parts.slice(2).join(' ');
      
//       const reminderDateTime = new Date(`${date}T${time}:00`);
//       if (reminderDateTime <= new Date()) {
//         await this.sendWhatsAppMessage(from, 'Reminder time must be in the future.');
//         return;
//       }

//       await this.scheduleReminder(from, reminderDateTime, message);
//       await this.sendWhatsAppMessage(from, 
//         `✅ Reminder set for ${reminderDateTime.toLocaleString()}\n` +
//         `Message: ${message}`
//       );
//     } catch (error) {
//       console.error('Error parsing reminder:', error);
//       await this.sendWhatsAppMessage(from, 'Error setting reminder. Please check the format.');
//     }
//   }

//   async callAIAPI(message, sessionId, userId) {
//     try {
//       const response = await axios.post(AI_API_ENDPOINT, {
//         message: message,
//         session_id: sessionId,
//         user_id: userId,
//         // Add any other parameters your API expects
//         max_tokens: 150,
//         temperature: 0.7
//       }, {
//         headers: {
//           'Content-Type': 'application/json',
//           // Add authentication headers if needed
//           // 'Authorization': `Bearer ${process.env.AI_API_KEY}`
//         },
//         timeout: 30000 // 30 second timeout
//       });

//       // Adjust based on your API response structure
//       return response.data.response || response.data.result || response.data.message || 'No response from AI';
//     } catch (error) {
//       console.error('AI API Error:', error.message);
//       throw new Error('Failed to get AI response');
//     }
//   }

//   async sendWhatsAppMessage(to, message, templateData = null) {
//     try {
//       const messageOptions = {
//         from: twilioPhoneNumber,
//         to: to,
//         body: message
//       };

//       // If using template with variables
//       if (templateData) {
//         messageOptions.contentSid = templateData.contentSid;
//         messageOptions.contentVariables = JSON.stringify(templateData.variables);
//         delete messageOptions.body; // Remove body when using template
//       }

//       const response = await twilioClient.messages.create(messageOptions);
//       console.log(`Message sent: ${response.sid}`);
//       return response;
//     } catch (error) {
//       console.error('Error sending WhatsApp message:', error);
//       throw error;
//     }
//   }

//   // Dynamic reminder system
//   setupReminderSystem() {
//     // Check for due reminders every minute
//     cron.schedule('* * * * *', () => {
//       this.checkDueReminders();
//     });
//   }

//   async scheduleReminder(phoneNumber, dateTime, message) {
//     const reminderId = uuidv4();
//     scheduledReminders.set(reminderId, {
//       id: reminderId,
//       phoneNumber,
//       dateTime,
//       message,
//       sent: false
//     });
    
//     console.log(`Scheduled reminder ${reminderId} for ${phoneNumber} at ${dateTime}`);
//     return reminderId;
//   }

//   async checkDueReminders() {
//     const now = new Date();
    
//     for (const [id, reminder] of scheduledReminders.entries()) {
//       if (!reminder.sent && reminder.dateTime <= now) {
//         try {
//           await this.sendWhatsAppMessage(
//             `whatsapp:${reminder.phoneNumber}`,
//             `🔔 Reminder: ${reminder.message}`
//           );
          
//           reminder.sent = true;
//           console.log(`Sent reminder ${id} to ${reminder.phoneNumber}`);
          
//           // Clean up sent reminders after 1 hour
//           setTimeout(() => {
//             scheduledReminders.delete(id);
//           }, 3600000);
          
//         } catch (error) {
//           console.error(`Failed to send reminder ${id}:`, error);
//         }
//       }
//     }
//   }

//   getHelpMessage() {
//     return `🤖 *WhatsApp AI Assistant*\n\n` +
//            `Available commands:\n` +
//            `📅 "book appointment" - Schedule an appointment\n` +
//            `⏰ "set reminder" - Set up reminders\n` +
//            `❓ "help" - Show this menu\n` +
//            `💬 Or just chat with me naturally!\n\n` +
//            `Example reminder: "REMIND 2025-06-05 09:00 Take medication"`;
//   }

//   // Method to send bulk messages (for marketing, notifications, etc.)
//   async sendBulkMessages(recipients, message, templateData = null) {
//     const results = [];
    
//     for (const recipient of recipients) {
//       try {
//         const result = await this.sendWhatsAppMessage(
//           `whatsapp:${recipient}`,
//           message,
//           templateData
//         );
//         results.push({ recipient, success: true, messageId: result.sid });
//       } catch (error) {
//         results.push({ recipient, success: false, error: error.message });
//       }
      
//       // Rate limiting - wait 1 second between messages
//       await new Promise(resolve => setTimeout(resolve, 1000));
//     }
    
//     return results;
//   }

//   // Template message sender (like your original code)
//   async sendTemplateMessage(to, contentSid, variables = {}) {
//     try {
//       const message = await twilioClient.messages.create({
//         from: twilioPhoneNumber,
//         contentSid: contentSid,
//         contentVariables: JSON.stringify(variables),
//         to: `whatsapp:${to}`
//       });
      
//       console.log(`Template message sent: ${message.sid}`);
//       return message;
//     } catch (error) {
//       console.error('Error sending template message:', error);
//       throw error;
//     }
//   }
// }

// // API Routes for external control
// app.post('/api/send-message', async (req, res) => {
//   try {
//     const { to, message, templateData } = req.body;
    
//     if (!to || !message) {
//       return res.status(400).json({ error: 'Missing required fields' });
//     }
    
//     const result = await chatBot.sendWhatsAppMessage(`whatsapp:${to}`, message, templateData);
//     res.json({ success: true, messageId: result.sid });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// app.post('/api/send-bulk', async (req, res) => {
//   try {
//     const { recipients, message, templateData } = req.body;
    
//     if (!recipients || !Array.isArray(recipients) || !message) {
//       return res.status(400).json({ error: 'Invalid request format' });
//     }
    
//     const results = await chatBot.sendBulkMessages(recipients, message, templateData);
//     res.json({ success: true, results });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// app.post('/api/schedule-reminder', async (req, res) => {
//   try {
//     const { phoneNumber, dateTime, message } = req.body;
    
//     if (!phoneNumber || !dateTime || !message) {
//       return res.status(400).json({ error: 'Missing required fields' });
//     }
    
//     const reminderId = await chatBot.scheduleReminder(
//       phoneNumber,
//       new Date(dateTime),
//       message
//     );
    
//     res.json({ success: true, reminderId });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Health check endpoint
// app.get('/health', (req, res) => {
//   res.json({ 
//     status: 'healthy', 
//     activeSessions: activeSessions.size,
//     scheduledReminders: scheduledReminders.size
//   });
// });

// const ChatBot = new WhatsAppChatBot()

// module.exports = { WhatsAppChatBot, app}


