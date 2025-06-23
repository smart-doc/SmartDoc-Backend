const multer = require('multer');
const path = require('path');
const { FileUtility } = require('../utils/fileUtility');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    let uploadPath;
    if (file.mimetype.startsWith('audio/')) {
      uploadPath = 'uploads/audio';
    } else if (file.mimetype.startsWith('image/')) {
      uploadPath = 'uploads/images';
    } else if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/csv' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      uploadPath = 'uploads/documents';
    } else {
      return cb(new Error('Unsupported file type'));
    }
    try {
      await FileUtility.ensureDirectoryExists(uploadPath);
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    cb(null, FileUtility.generateUniqueFilename(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/',
      'image/',
      'text/csv',
      'application/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowedTypes.some((type) => file.mimetype.startsWith(type) || file.mimetype === type)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio, image, .csv, and .xlsx files are allowed'));
    }
  },
});

module.exports = upload;