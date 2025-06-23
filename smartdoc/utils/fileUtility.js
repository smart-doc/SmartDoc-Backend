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
      await fs.access(filePath); // Check if file exists
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false; // File doesn't exist
      throw new Error(`Failed to delete file: ${error.message}`);
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