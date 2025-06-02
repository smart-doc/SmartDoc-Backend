const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const {Message, ChatSession, MedicalSummary} = require('../models/chatSessions'); 


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
    body: aiResponse.content,
  });

  return { sessionId, response: aiResponse.content };
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
        return message.content.audioTranscript || '[Audio message]';
    } else if (message.messageType === 'image') {
        return message.content.imageDescription || '[Image shared]';
    }
    return message.content || '[Unknown message type]';
    }

  async getAIResponse(sessionId, userMessage) {
  try {
    // Use the latest user message content as the query
    const query = this.extractMessageContent(userMessage);

    console.log('Sending to FastAPI:', { query });

    const aiResponse = await axios.post(process.env.FASTAPI_CHAT_ENDPOINT, {
      query,
    }, {
      timeout: 10000, // 10s timeout
    });

    if (!aiResponse.data?.result) {
      throw new Error('Empty or invalid FastAPI response');
    }

    const aiMessage = new Message({
      sessionId,
      messageId: uuidv4(),
      sender: 'ai',
      messageType: 'text',
      content: aiResponse.data.result, // Use 'result' field
    });

    await aiMessage.save();
    return aiMessage;
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

  async sendSummaryToDoctor({ summaryId, doctorId, userId }) {
    const summary = await MedicalSummary.findOne({ _id: summaryId, userId });
    if (!summary) {
      throw new Error('Summary not found or unauthorized');
    }

    const updatedSummary = await MedicalSummary.findByIdAndUpdate(
      summaryId,
      {
        doctorId,
        status: 'sent_to_doctor',
        updatedAt: new Date(),
      },
      { new: true }
    );

    // Notify doctor (placeholder)
    await this.notifyDoctor(doctorId, updatedSummary);

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

  async notifyDoctor(doctorId, summary) {
    // Placeholder: Implement doctor notification (e.g., WhatsApp via Twilio)
    console.log(`Notifying doctor ${doctorId} about summary ${summary._id}`);
  }
}

module.exports = new ChatService();