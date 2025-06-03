// Using Mongoose (MongoDB) - adjust for your database choice

const mongoose = require('mongoose');

// Chat Session Schema
const chatSessionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sessionId: { 
    type: String, 
    unique: true, 
    required: true 
  },
  title: { 
    type: String, 
    default: 'New Chat' 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  lastMessageAt: Date,
  messageCount: { 
    type: Number, 
    default: 0 
  }
});

// Message Schema
const messageSchema = new mongoose.Schema({
  sessionId: { 
    type: String, 
    required: true 
  },
  messageId: { 
    type: String, 
    unique: true, 
    required: true 
  },
  sender: { 
    type: String, 
    enum: ['user', 'ai'], 
    required: true 
  },
  messageType: { 
    type: String, 
    enum: ['text', 'audio', 'image'], 
    required: true 
  },
  content: {
    type: {
      text: String,
      audioUrl: String,
      audioTranscript: String,
      imageUrl: String,
      imageDescription: String
    },
    required: true 
  },
  metadata: {
    audioFormat: String,
    audioDuration: Number,
    imageFormat: String,
    imageSize: Number,
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'completed'
    }
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  }
}, {
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.__v; // Remove __v
      return ret; // Preserve content
    }
  },
  toObject: { virtuals: true }
});

// Medical Summary Schema
const medicalSummarySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sessionIds: [String],
  summaryType: {
    type: String,
    enum: ['symptoms', 'medical_history', 'consultation_notes'],
    required: true
  },
  summary: {
    mainSymptoms: [String],
    duration: String,
    severity: String,
    associatedSymptoms: [String],
    medicalHistory: [String],
    medications: [String],
    allergies: [String],
    lifestyle: Object,
    keyQuotes: [String]
  },
  aiConfidence: {
    type: Number,
    min: 0,
    max: 1
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User.role.name.Doctor'
  },
  status: {
    type: String,
    enum: ['draft', 'sent_to_doctor', 'reviewed', 'Pending Response'],
    default: 'draft'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Export models
const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
const Message = mongoose.model('Message', messageSchema);
const MedicalSummary = mongoose.model('MedicalSummary', medicalSummarySchema);

module.exports = { ChatSession, Message, MedicalSummary };