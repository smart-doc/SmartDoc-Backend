const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    if (file.mimetype.startsWith('audio/')) {
      uploadPath = 'uploads/audio';
    } else if (file.mimetype.startsWith('image/')) {
      uploadPath = 'uploads/images';
    } else if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      uploadPath = 'uploads/documents';
    } else {
      return cb(new Error('Unsupported file type'));
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio, image, csv, and xlsx files
    const allowedTypes = [
      'audio/',
      'image/',
      'text/csv',
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