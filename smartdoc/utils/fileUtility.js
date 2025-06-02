const fs = require('fs').promises;
const path = require('path');

class FileUtility {
  static async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  static async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  static getFileExtension(filename) {
    return path.extname(filename).toLowerCase();
  }

  static generateUniqueFilename(originalName) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const extension = this.getFileExtension(originalName);
    return `${timestamp}-${random}${extension}`;
  }
}

module.exports = {FileUtility}