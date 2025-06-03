const { ChatSession, Message, MedicalSummary } = require('../models/chatSessions');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const ChatService = require ("../services/chatService")

const createSession = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const sessionId = require('uuid').v4();
    const newSession = new ChatSession({
      userId,
      sessionId,
      title: 'New Medical Consultation',
    });

    await newSession.save();

    res.status(201).json({
      success: true,
      session: newSession,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const listUserSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 50 } = req.query;

    const sessions = await ChatService.getUserSessions(userId, page, limit);

    res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { sessionId, messageType, content } = req.body;
    const userId = req.user._id;

    const { userMessage, aiResponse } = await ChatService.sendMessage({
      sessionId,
      messageType,
      content,
      userId,
    });

    // Ensure aiResponse includes content
    const aiMessage = aiResponse.toJSON ? aiResponse.toJSON() : aiResponse;

    res.json({
      success: true,
      userMessage,
      aiMessage,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;
    const { page = 1, limit = 50 } = req.query;

    const messages = await ChatService.getChatHistory(sessionId, userId, page, limit);

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const generateMedicalSummary = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { sessionIds, summaryType } = req.body;
    const userId = req.user._id;

    const summary = await ChatService.generateMedicalSummary({
      userId,
      sessionIds,
      summaryType,
    });

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const sendSummaryToDoctor = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { summaryId, userId } = req.body; // Changed doctorId to userId
    const patientId = req.user._id;

    const summary = await ChatService.sendSummaryToDoctor({
      summaryId,
      userId,
      patientId,
    });

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {createSession, listUserSessions, sendMessage, getChatHistory, generateMedicalSummary, sendSummaryToDoctor }

