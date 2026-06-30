const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const {
  generateQR,
  listQRs,
  scanQR,
  deleteQR,
  downloadQR,
  getQRInfo
} = require('../controllers/qrController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    await fs.ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `upload_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

// Routes
router.post('/generate', generateQR);
router.get('/list', listQRs);
router.post('/scan', scanQR);
router.delete('/:fileName', deleteQR);
router.get('/:fileName/download', downloadQR);
router.get('/:fileName/info', getQRInfo);

// Optional: Upload and scan a QR image
router.post('/scan/upload', upload.single('qrcode'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const { scanQRCode } = require('../utils/qrScanner');
    const result = await scanQRCode(req.file.path);
    
    res.json({
      success: true,
      decodedText: result,
      fileName: req.file.filename
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;