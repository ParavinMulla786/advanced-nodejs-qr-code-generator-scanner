const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra');
const qrRoutes = require('./routes/qrRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
fs.ensureDirSync(path.join(__dirname, 'uploads'));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/qr', qrRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'QR Code Manager is running',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'QR Code Manager',
    version: '1.0.0',
    endpoints: {
      'POST /api/qr/generate': 'Generate QR Code',
      'GET /api/qr/list': 'List all QR Codes',
      'POST /api/qr/scan': 'Scan QR Code (provide fileName)',
      'POST /api/qr/scan/upload': 'Upload and scan QR image',
      'DELETE /api/qr/:fileName': 'Delete QR Code',
      'GET /api/qr/:fileName/download': 'Download QR Code',
      'GET /api/qr/:fileName/info': 'Get QR Code info'
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`QR Code Manager Server running on http://localhost:${PORT}`);
  console.log(`Uploads directory: ${path.join(__dirname, 'uploads')}`);
  console.log(`QR Data file: ${path.join(__dirname, 'data', 'qrData.json')}`);
});