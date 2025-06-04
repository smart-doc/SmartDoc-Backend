// const axios = require('axios');

// class AIService {
//   constructor() {
//     this.fastApiBaseUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';
//   }

//   async getChatResponse(conversationContext, sessionId) {
//     try {
//       const response = await axios.post(`${this.fastApiBaseUrl}/chat-text`, {
//         conversation: conversationContext,
//         session_id: sessionId,
//         max_tokens: 500,
//         temperature: 0.7
//       }, {
//         timeout: 30000,
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${process.env.FASTAPI_API_KEY}`
//         }
//       });
      
//       return response.data;
//     } catch (error) {
//       throw new Error(`AI service error: ${error.message}`);
//     }
//   }

//   async transcribeAudio(audioFilePath) {
//     try {
//       const FormData = require('form-data');
//       const fs = require('fs');
      
//       const formData = new FormData();
//       formData.append('audio', fs.createReadStream(audioFilePath));
      
//       const response = await axios.post(`${this.fastApiBaseUrl}/transcribe`, formData, {
//         headers: {
//           ...formData.getHeaders(),
//           'Authorization': `Bearer ${process.env.FASTAPI_API_KEY}`
//         },
//         timeout: 60000
//       });
      
//       return response.data.transcript;
//     } catch (error) {
//       throw new Error(`Transcription error: ${error.message}`);
//     }
//   }

//   async analyzeImage(imageFilePath) {
//     try {
//       const FormData = require('form-data');
//       const fs = require('fs');
      
//       const formData = new FormData();
//       formData.append('image', fs.createReadStream(imageFilePath));
      
//       const response = await axios.post(`${this.fastApiBaseUrl}/analyze-image`, formData, {
//         headers: {
//           ...formData.getHeaders(),
//           'Authorization': `Bearer ${process.env.FASTAPI_API_KEY}`
//         },
//         timeout: 60000
//       });
      
//       return response.data.description;
//     } catch (error) {
//       throw new Error(`Image analysis error: ${error.message}`);
//     }
//   }

//   async generateMedicalSummary(messages, summaryType) {
//     try {
//       const response = await axios.post(`${this.fastApiBaseUrl}/medical-summary`, {
//         messages: messages.map(msg => ({
//           sender: msg.sender,
//           content: msg.content,
//           timestamp: msg.timestamp
//         })),
//         summary_type: summaryType
//       }, {
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${process.env.FASTAPI_API_KEY}`
//         },
//         timeout: 60000
//       });
      
//       return response.data;
//     } catch (error) {
//       throw new Error(`Medical summary error: ${error.message}`);
//     }
//   }
// }

// module.exports = {
//   AIService: new AIService(),
//   NotificationService: new NotificationService(),
// };

const axios = require('axios');

class AIService {
  constructor() {
    this.AI_API_ENDPOINT = process.env.FASTAPI_CHAT_ENDPOINT || 'http://localhost:8000/chat';
    this.timeout = 30000; // 30 second timeout
  }

  async callAIAPI(message, sessionId, userId) {
    try {
      const response = await axios.post(this.FASTAPI_CHAT_ENDPOINT, {
        message: message,
        session_id: sessionId,
        user_id: userId,
        max_tokens: 150,
        temperature: 0.7
      }, {
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
          // 'Authorization': `Bearer ${process.env.AI_API_KEY}`
        },
        timeout: this.timeout
      });

      // Adjust based on your API response structure
      return response.data.response || response.data.result || response.data.message || 'No response from AI';
    } catch (error) {
      console.error('AI API Error:', error.message);
      throw new Error('Failed to get AI response');
    }
  }

  async generateResponse(userMessage, context = {}) {
    const { sessionId, userId, history = [] } = context;
    
    try {
      // You can add more sophisticated processing here
      const response = await this.callAIAPI(userMessage, sessionId, userId);
      return response;
    } catch (error) {
      console.error('Error generating AI response:', error);
      return 'Sorry, I encountered an error. Please try again.';
    }
  }
}

module.exports = AIService;