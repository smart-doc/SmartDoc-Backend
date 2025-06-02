const { body, param, query } = require('express-validator');


const createSessionValidation = [
  body('userId').notEmpty().withMessage('User ID is required'),
];

const sendMessageValidation = [
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('messageType').isIn(['text', 'audio', 'image']).withMessage('Invalid message type'),
  body('content').notEmpty().withMessage('Message content is required'),
];

const sessionParamValidation = [
  param('sessionId').notEmpty().withMessage('Session ID is required'),
];

const userParamValidation = [
  param('userId').notEmpty().withMessage('User ID is required'),
];


module.exports = {createSessionValidation, sendMessageValidation, sessionParamValidation, userParamValidation}