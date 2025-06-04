const {userParamValidation, sendMessageValidation, sessionParamValidation} = require("../middlewares/validationMiddleware")
const {createSession, sendMessage, generateMedicalSummary, sendSummaryToDoctor, getChatHistory, listUserSessions} = require("../controllers/chatSessionsController")
const {protectRoute, validateRequest} = require("../middlewares/protectRoute")
const upload = require("../config/multer")
const { body, param, query } = require('express-validator');
const express = require("express")
const router = express.Router()

// Create new chat session
router.post('/sessions', protectRoute, createSession);

// Get user's chat sessions
router.get('/users/:userId/sessions', protectRoute, userParamValidation, validateRequest,
  listUserSessions
);

// Send text message
router.post('/messages', protectRoute, sendMessageValidation, validateRequest,
  sendMessage
);

// Send audio message
router.post('/messages/audio', upload.single('audio'), async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId || !req.file) {
      return res.status(400).json({ error: 'sessionId and audio file are required' });
    }

    // Validate session (assuming you have a ChatSession model)
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Save audio file
    const audioUrl = `/uploads/audio/${req.file.filename}`;
    const audioPath = path.join(__dirname, '..', audioUrl);

    // Transcribe audio
    const audioTranscript = await transcribeAudio(audioPath);

    // Save user message
    const userMessage = new Message({
      sessionId,
      sender: 'user',
      messageType: 'audio',
      content: { audioUrl, audioTranscript },
      timestamp: new Date(),
    });
    await userMessage.save();

    // Call chat-voice endpoint
    const voiceResponse = await axios.post(
      'https://smartdoc.zeabur.app/chat/chat-voice',
      {
        query: audioTranscript,
        sessionId,
        messageId: userMessage._id.toString(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const { result: aiResponse, audioUrl: aiAudioUrl } = voiceResponse.data;

    // Save AI message
    const aiMessage = new Message({
      sessionId,
      sender: 'ai',
      messageType: aiAudioUrl ? 'audio' : 'text',
      content: {
        audioUrl: aiAudioUrl,
        audioTranscript: aiAudioUrl ? aiResponse : null,
        text: aiAudioUrl ? null : aiResponse,
      },
      timestamp: new Date(),
    });
    await aiMessage.save();

    res.status(200).json({
      userMessage: {
        messageId: userMessage._id,
        sender: userMessage.sender,
        messageType: userMessage.messageType,
        content: userMessage.content,
        timestamp: userMessage.timestamp,
      },
      aiMessage: {
        messageId: aiMessage._id,
        sender: aiMessage.sender,
        messageType: aiMessage.messageType,
        content: aiMessage.content,
        timestamp: aiMessage.timestamp,
      },
    });
  } catch (error) {
    console.error('Audio message error:', error.message);
    res.status(500).json({ error: 'Failed to process audio message' });
  }
});

router.post('/messages/image', protectRoute, upload.single('image'),
  [body('sessionId').notEmpty().withMessage('Session ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Image file is required' });
      }

      req.body.messageType = 'image';
      req.body.content = { imageUrl: `/Uploads/images/${req.file.filename}` };

      await sendMessage(req, res);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Get chat history
router.get('/sessions/:sessionId/messages', protectRoute, sessionParamValidation,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],
  validateRequest,
  getChatHistory
);

// Generate medical summary
router.post('/summaries', protectRoute,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('sessionIds').isArray().notEmpty().withMessage('Session IDs array is required'),
    body('summaryType').isIn(['symptoms', 'medical_history', 'consultation_notes']).withMessage('Invalid summary type'),
  ],
  validateRequest,
  generateMedicalSummary
);

// Send summary to doctor
router.post('/summaries/:summaryId/send-to-doctor',
  protectRoute,
  [
    param('summaryId').notEmpty().withMessage('Summary ID is required'),
    body('doctorId').notEmpty().withMessage('Doctor ID is required'),
  ],
  validateRequest,
  sendSummaryToDoctor
);

// Get user's medical summaries
router.get('/users/:userId/summaries',
  protectRoute,
  userParamValidation,
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { status, summaryType } = req.query;
      
      const filter = { userId };
      if (status) filter.status = status;
      if (summaryType) filter.summaryType = summaryType;
      
      const summaries = await MedicalSummary.find(filter)
        .sort({ createdAt: -1 })
        .populate('doctorId', 'name email');
      
      res.json({
        success: true,
        summaries
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Delete chat session (soft delete)
router.delete('delete/sessions/:sessionId',
  protectRoute,
  sessionParamValidation,
  validateRequest,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      await ChatSession.findOneAndUpdate(
        { sessionId },
        { isActive: false, updatedAt: new Date() }
      );
      
      res.json({
        success: true,
        message: 'Chat session deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    error: error.message
  });
});

module.exports = router
