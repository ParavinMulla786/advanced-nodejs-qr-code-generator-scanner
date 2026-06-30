const QRCode = require('qrcode');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const { scanQRCode } = require('../utils/qrScanner');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');


const DATA_FILE = path.join(__dirname, '../data/qrData.json');
const UPLOAD_DIR = path.join(__dirname, '../uploads');


fs.ensureDirSync(UPLOAD_DIR);
fs.ensureDirSync(path.dirname(DATA_FILE));


if (!fs.existsSync(DATA_FILE)) {
  fs.writeJsonSync(DATA_FILE, []);
}

// Helper functions
const readQRData = () => {
  try {
    return fs.readJsonSync(DATA_FILE);
  } catch (error) {
    return [];
  }
};

const writeQRData = (data) => {
  fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
};

const generateFileName = (prefix = 'qr') => {
  const timestamp = Date.now();
  return `${prefix}_${timestamp}.png`;
};

const parseExpiry = (expiryStr) => {
  if (!expiryStr) return null;
  
  const unitMap = {
    'm': 'minutes',
    'h': 'hours',
    'd': 'days',
    'w': 'weeks'
  };
  
  const match = expiryStr.match(/^(\d+)([mhdw])$/);
  if (!match) {
    throw new ValidationError('Invalid expiry format. Use format like "5m", "1h", "1d"');
  }
  
  const value = parseInt(match[1]);
  const unit = unitMap[match[2]];
  
  if (!unit) {
    throw new ValidationError('Invalid expiry unit. Use m (minutes), h (hours), d (days), w (weeks)');
  }
  
  return moment().add(value, unit).toISOString();
};

const isQRExpired = (expiryDate) => {
  if (!expiryDate) return false;
  return moment().isAfter(moment(expiryDate));
};

// Controller functions
const generateQR = async (req, res, next) => {
  try {
    const { text, expiry, size = 300, color = '#000000', bgColor = '#ffffff' } = req.body;
    
    if (!text) {
      throw new ValidationError('Text/URL is required', { text: 'Text is required' });
    }
    
    // Parse expiry
    let expiryDate = null;
    if (expiry) {
      expiryDate = parseExpiry(expiry);
    }
    
    // Generate QR code
    const fileName = generateFileName('qr');
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    // QR code options
    const options = {
      errorCorrectionLevel: 'H',
      type: 'png',
      quality: 0.92,
      margin: 4,
      color: {
        dark: color,
        light: bgColor
      }
    };
    
    // Generate and save QR code
    await QRCode.toFile(filePath, text, options);
    
    // Save metadata
    const qrData = readQRData();
    const newQR = {
      id: fileName,
      fileName,
      text,
      createdAt: moment().toISOString(),
      expiryDate,
      size,
      color,
      bgColor,
      filePath: `/uploads/${fileName}`
    };
    
    qrData.push(newQR);
    writeQRData(qrData);
    
    res.status(201).json({
      success: true,
      message: 'QR Code generated successfully',
      data: newQR
    });
    
  } catch (error) {
    next(error);
  }
};

const listQRs = async (req, res, next) => {
  try {
    const qrData = readQRData();
    
    // Filter out expired QR codes if requested
    const { includeExpired = 'false' } = req.query;
    let filteredData = qrData;
    
    if (includeExpired === 'false') {
      filteredData = qrData.filter(qr => !isQRExpired(qr.expiryDate));
    }
    
    // Sort by creation date (newest first)
    filteredData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      total: filteredData.length,
      files: filteredData.map(qr => ({
        fileName: qr.fileName,
        text: qr.text,
        createdAt: qr.createdAt,
        expiryDate: qr.expiryDate,
        isExpired: isQRExpired(qr.expiryDate),
        filePath: qr.filePath
      }))
    });
    
  } catch (error) {
    next(error);
  }
};

const scanQR = async (req, res, next) => {
  try {
    const { fileName } = req.body;
    
    if (!fileName) {
      throw new ValidationError('fileName is required', { fileName: 'File name is required' });
    }
    
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      throw new NotFoundError(`File ${fileName} not found`);
    }
    
    // Scan the QR code
    const result = await scanQRCode(filePath);
    
    // Check if QR is expired
    const qrData = readQRData();
    const qrRecord = qrData.find(qr => qr.fileName === fileName);
    const isExpired = qrRecord ? isQRExpired(qrRecord.expiryDate) : false;
    
    res.json({
      success: true,
      decodedText: result,
      isExpired,
      fileName,
      ...(qrRecord && {
        createdAt: qrRecord.createdAt,
        expiryDate: qrRecord.expiryDate
      })
    });
    
  } catch (error) {
    next(error);
  }
};

const deleteQR = async (req, res, next) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName) {
      throw new ValidationError('fileName is required', { fileName: 'File name is required' });
    }
    
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      throw new NotFoundError(`File ${fileName} not found`);
    }
    
    // Delete file
    await fs.remove(filePath);
    
    // Remove from metadata
    const qrData = readQRData();
    const updatedData = qrData.filter(qr => qr.fileName !== fileName);
    writeQRData(updatedData);
    
    res.json({
      success: true,
      message: `QR Code ${fileName} deleted successfully`
    });
    
  } catch (error) {
    next(error);
  }
};

const downloadQR = async (req, res, next) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName) {
      throw new ValidationError('fileName is required', { fileName: 'File name is required' });
    }
    
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      throw new NotFoundError(`File ${fileName} not found`);
    }
    
    // Check expiry
    const qrData = readQRData();
    const qrRecord = qrData.find(qr => qr.fileName === fileName);
    
    if (qrRecord && isQRExpired(qrRecord.expiryDate)) {
      return res.status(410).json({
        success: false,
        message: 'QR Code has expired'
      });
    }
    
    res.download(filePath, fileName, (err) => {
      if (err) {
        next(err);
      }
    });
    
  } catch (error) {
    next(error);
  }
};

const getQRInfo = async (req, res, next) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName) {
      throw new ValidationError('fileName is required', { fileName: 'File name is required' });
    }
    
    const qrData = readQRData();
    const qrRecord = qrData.find(qr => qr.fileName === fileName);
    
    if (!qrRecord) {
      throw new NotFoundError(`QR Code ${fileName} not found`);
    }
    
    const isExpired = isQRExpired(qrRecord.expiryDate);
    
    res.json({
      success: true,
      data: {
        ...qrRecord,
        isExpired,
        expiresIn: qrRecord.expiryDate ? moment(qrRecord.expiryDate).fromNow() : 'Never expires'
      }
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateQR,
  listQRs,
  scanQR,
  deleteQR,
  downloadQR,
  getQRInfo,
  // Export for CLI
  generateFileName,
  parseExpiry,
  isQRExpired,
  readQRData,
  writeQRData,
  UPLOAD_DIR
};