const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const {Message, ChatSession, MedicalSummary} = require('../models/chatSessions'); 
const admin = require('../config/firebase');
const Notification = require('../models/Notification');
const User = require('../models/User')

class ChatService {
      constructor() {
    this.fastApiBaseUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';
  }

  async handleWhatsAppMessage(from, body, userId, sessionId) {
  let content = body;
  let messageType = 'text';

  if (body.toLowerCase().includes('appointment')) {
    content = 'Please provide date and time (e.g., "2025-06-03 10:00").';
  } else if (body.toLowerCase().includes('faq')) {
    content = 'FAQs:\n1. Book appointment\n2. Clinic hours\nReply with number.';
  }

  if (!sessionId) {
    sessionId = uuidv4();
    const newSession = new ChatSession({
      userId,
      sessionId,
      title: 'WhatsApp Consultation',
    });
    await newSession.save();
  }

  const { userMessage, aiResponse } = await this.sendMessage({
    sessionId,
    messageType,
    content,
    userId,
  });

  await this.twilioClient.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: from,
    body: aiResponse.data.result,
  });

  return { sessionId, response: aiResponse.data.result };
}

  async processAudioMessage(message) {
    try {
      // Placeholder: Call audio transcription service
      const transcription = await this.transcribeAudio(message.content.audioUrl);
      await Message.findOneAndUpdate(
        { messageId: message.messageId },
        {
          'content.audioTranscript': transcription,
          'metadata.processingStatus': 'completed',
        }
      );
    } catch (error) {
      await Message.findOneAndUpdate(
        { messageId: message.messageId },
        { 'metadata.processingStatus': 'failed' }
      );
      throw new Error(`Audio processing failed: ${error.message}`);
    }
  }

  async processImageMessage(message) {
    try {
      // Placeholder: Call image analysis service
      const description = await this.analyzeImage(message.content.imageUrl);
      await Message.findOneAndUpdate(
        { messageId: message.messageId },
        {
          'content.imageDescription': description,
          'metadata.processingStatus': 'completed',
        }
      );
    } catch (error) {
      await Message.findOneAndUpdate(
        { messageId: message.messageId },
        { 'metadata.processingStatus': 'failed' }
      );
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

    extractMessageContent(message) {
    if (message.messageType === 'text') {
      return message.content.text || message.content || '[Text message]';
    } else if (message.messageType === 'audio') {
      return message.content.audioTranscript || '[Awaiting audio transcription]';
    } else if (message.messageType === 'image') {
      return message.content.imageDescription || '[Awaiting image analysis]';
    }
    return message.content.text || message.content || '[Unknown message type]';
  }

  async getAIResponse(sessionId, userMessage) {
    try {
      const query = this.extractMessageContent(userMessage);

      console.log('Sending to FastAPI:', { query });

      const aiResponse = await axios.post(process.env.FASTAPI_CHAT_ENDPOINT, {
        query,
      }, {
        timeout: 10000,
      });

      if (!aiResponse.data?.result) {
        throw new Error('Empty or invalid FastAPI response');
      }

      const aiMessage = new Message({
        sessionId,
        messageId: uuidv4(),
        sender: 'ai',
        messageType: 'text',
        content: { text: aiResponse.data.result }, // Set content.text
        metadata: { processingStatus: 'completed' },
      });

      await aiMessage.save();

      // Fetch saved message to ensure content is included
      const savedAiMessage = await Message.findById(aiMessage._id).lean();

      return savedAiMessage;
    } catch (error) {
      console.error('FastAPI error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
      });
      throw new Error(`AI response failed: ${error.message || 'Unknown error'}`);
    }
  }
    
  async sendMessage({ sessionId, messageType, content, userId }) {
    // Verify session exists and belongs to user
    const session = await ChatSession.findOne({ sessionId, userId });
    if (!session) {
      throw new Error('Session not found or unauthorized');
    }

    const messageId = uuidv4();

    // Save user message
    const userMessage = new Message({
      sessionId,
      messageId,
      sender: 'user',
      messageType,
      content,
      metadata: {
        processingStatus: messageType === 'text' ? 'completed' : 'pending',
      },
    });

    await userMessage.save();

    // Process non-text messages
    if (messageType === 'audio') {
      await this.processAudioMessage(userMessage);
    } else if (messageType === 'image') {
      await this.processImageMessage(userMessage);
    }

    // Get AI response
    const aiResponse = await this.getAIResponse(sessionId, userMessage);

    // Update session
    await ChatSession.findOneAndUpdate(
      { sessionId },
      {
        lastMessageAt: new Date(),
        updatedAt: new Date(),
        $inc: { messageCount: 2 },
      }
    );

    return { userMessage, aiResponse };
  }

  async getUserSessions(userId, page = 1, limit = 50) {
    const sessions = await ChatSession.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    return sessions;
  }

  async getChatHistory(sessionId, userId, page = 1, limit = 50) {
    const session = await ChatSession.findOne({ sessionId, userId });
    if (!session) {
      throw new Error('Session not found or unauthorized');
    }

    const messages = await Message.find({ sessionId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    return messages.reverse();
  }

  async generateMedicalSummary({ userId, sessionIds, summaryType }) {
    // Get all messages from specified sessions
    const messages = await Message.find({
      sessionId: { $in: sessionIds },
      isDeleted: false,
    }).sort({ createdAt: 1 });

    // Call AI service to generate summary
    const summaryData = await this.callSummarizationService(messages, summaryType);

    const medicalSummary = new MedicalSummary({
      userId,
      sessionIds,
      summaryType,
      summary: summaryData.summary,
      aiConfidence: summaryData.confidence,
    });

    await medicalSummary.save();
    return medicalSummary;
  }

  async sendSummaryToDoctor({ summaryId, userId, patientId }) {
  const summary = await MedicalSummary.findOne({ _id: summaryId, userId: patientId });
  if (!summary) {
    throw new Error('Summary not found or unauthorized');
  }

  // Verify recipient is a doctor
  const doctor = await User.findOne({
    _id: userId,
    $or: [{ type: 'Doctor' }, { 'role.name': 'Doctor' }],
  });
  if (!doctor) {
    throw new Error('Recipient is not a doctor');
  }

  const updatedSummary = await MedicalSummary.findByIdAndUpdate(
    summaryId,
    {
      doctorId: userId, // Store as doctorId for reference
      status: 'sent_to_doctor',
      updatedAt: new Date(),
    },
    { new: true }
  );

  await this.notifyDoctor(userId, updatedSummary);
  return updatedSummary;
}

  async transcribeAudio(audioUrl) {
    try {
      const audio = {
        content: require('fs').readFileSync(audioUrl.replace('/uploads/audio/', './uploads/audio/')).toString('base64'),
      };
      const config = {
        encoding: 'MP3', // Adjust based on file type
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      };
      const request = { audio, config };

      const [response] = await this.speechClient.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
      return transcription || '[No transcription available]';
    } catch (error) {
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  async analyzeImage(imageUrl) {
    try {
      const [result] = await this.visionClient.labelDetection(imageUrl.replace('/uploads/images/', './uploads/images/'));
      const labels = result.labelAnnotations.map(label => label.description).join(', ');
      return labels || '[No image description available]';
    } catch (error) {
      throw new Error(`Image analysis failed: ${error.message}`);
    }
  }

  async callSummarizationService(messages, summaryType) {
    // Placeholder: Call AI summarization service
    return {
      summary: 'Medical summary based on messages',
      confidence: 0.95,
    };
  }

  async notifyDoctor(userId, summary) {
    try {
      // Find doctor by user ID and type/role
      const doctor = await User.findOne({
        _id: userId,
        $or: [{ type: 'Doctor' }, { 'role.name': 'Doctor' }],
      });
      if (!doctor) {
        throw new Error('Doctor not found');
      }

      // Create in-app notification
      const notification = new Notification({
        recipientId: userId,
        type: 'summary_shared',
        title: 'New Patient Summary',
        message: `A medical summary has been shared for patient session(s): ${summary.sessionIds.join(', ')}`,
        data: { summaryId: summary._id.toString() },
      });
      await notification.save();

      // Send push notification if FCM token exists
      if (doctor.fcmToken) {
        const message = {
          notification: {
            title: 'New Patient Summary',
            body: `A medical summary has been shared for patient session(s): ${summary.sessionIds.join(', ')}`,
          },
          data: {
            summaryId: summary._id.toString(),
            click_action: 'OPEN_SUMMARY',
          },
          token: doctor.fcmToken,
        };

        await admin.messaging().send(message);
        console.log(`Push notification sent to doctor ${userId}`);
      } else {
        console.log(`No FCM token for doctor ${userId}`);
      }
    } catch (error) {
      console.error(`Failed to notify doctor ${userId}:`, error.message);
      throw new Error(`Notification failed: ${error.message}`);
    }
  }
}

module.exports = new ChatService();