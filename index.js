#!/usr/bin/env node

const inquirer = require('inquirer');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs-extra');
const { scanQRCode } = require('./utils/qrScanner');
const { 
  generateFileName, 
  parseExpiry, 
  isQRExpired, 
  readQRData, 
  writeQRData,
  UPLOAD_DIR 
} = require('./controllers/qrController');

// Ensure uploads directory exists
fs.ensureDirSync(UPLOAD_DIR);

// CLI Menu
const mainMenu = async () => {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        'Generate QR Code',
        'Scan QR Code',
        'List All QR Codes',
        'Delete QR Code',
        'Exit'
      ]
    }
  ]);

  switch (answers.action) {
    case 'Generate QR Code':
      await generateQRCLI();
      break;
    case 'Scan QR Code':
      await scanQRCLI();
      break;
    case 'List All QR Codes':
      await listQRCLI();
      break;
    case 'Delete QR Code':
      await deleteQRCLI();
      break;
    case 'Exit':
      console.log('👋 Goodbye!');
      process.exit(0);
  }
};

// Generate QR Code CLI
const generateQRCLI = async () => {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'text',
        message: 'Enter text or URL to encode:',
        validate: (input) => input.length > 0 || 'Text is required'
      },
      {
        type: 'input',
        name: 'expiry',
        message: 'Enter expiry (e.g., 5m, 1h, 1d) or leave blank for no expiry:',
        default: ''
      },
      {
        type: 'input',
        name: 'color',
        message: 'Enter QR color (hex code, default: #000000):',
        default: '#000000'
      },
      {
        type: 'input',
        name: 'bgColor',
        message: 'Enter background color (hex code, default: #ffffff):',
        default: '#ffffff'
      }
    ]);

    // Parse expiry
    let expiryDate = null;
    if (answers.expiry) {
      try {
        expiryDate = parseExpiry(answers.expiry);
      } catch (error) {
        console.error('❌ Invalid expiry format:', error.message);
        return await mainMenu();
      }
    }

    // Generate QR Code
    const fileName = generateFileName('qr');
    const filePath = path.join(UPLOAD_DIR, fileName);

    await QRCode.toFile(filePath, answers.text, {
      errorCorrectionLevel: 'H',
      type: 'png',
      quality: 0.92,
      margin: 4,
      color: {
        dark: answers.color,
        light: answers.bgColor
      }
    });

    // Save metadata
    const qrData = readQRData();
    const newQR = {
      id: fileName,
      fileName,
      text: answers.text,
      createdAt: new Date().toISOString(),
      expiryDate,
      size: 300,
      color: answers.color,
      bgColor: answers.bgColor,
      filePath: `/uploads/${fileName}`
    };
    qrData.push(newQR);
    writeQRData(qrData);

    console.log('✅ QR Code generated successfully!');
    console.log(`📁 File: ${filePath}`);
    console.log(`📝 Text: ${answers.text}`);
    if (expiryDate) {
      console.log(`⏰ Expires: ${new Date(expiryDate).toLocaleString()}`);
    } else {
      console.log('⏰ No expiry set');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await mainMenu();
};

// Scan QR Code CLI
const scanQRCLI = async () => {
  try {
    // List available QR codes
    const qrData = readQRData();
    if (qrData.length === 0) {
      console.log('❌ No QR codes found. Generate one first.');
      return await mainMenu();
    }

    const choices = qrData.map(qr => ({
      name: `${qr.fileName} - ${qr.text.substring(0, 30)}${qr.text.length > 30 ? '...' : ''}`,
      value: qr.fileName
    }));

    const { fileName } = await inquirer.prompt([
      {
        type: 'list',
        name: 'fileName',
        message: 'Select a QR code to scan:',
        choices: [...choices, { name: 'Back to menu', value: 'back' }]
      }
    ]);

    if (fileName === 'back') {
      return await mainMenu();
    }

    const filePath = path.join(UPLOAD_DIR, fileName);
    
    if (!await fs.pathExists(filePath)) {
      console.log('❌ File not found!');
      return await mainMenu();
    }

    // Scan the QR code
    const result = await scanQRCode(filePath);
    
    // Check if expired
    const qrRecord = qrData.find(qr => qr.fileName === fileName);
    const isExpired = qrRecord ? isQRExpired(qrRecord.expiryDate) : false;

    console.log('🔍 QR Code Scan Result:');
    console.log(`📝 Decoded Text: ${result}`);
    console.log(`📄 File: ${fileName}`);
    console.log(`⏰ Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
    
    if (qrRecord && qrRecord.expiryDate) {
      console.log(`⏰ Expires: ${new Date(qrRecord.expiryDate).toLocaleString()}`);
    }

  } catch (error) {
    console.error('❌ Error scanning QR Code:', error.message);
  }

  await mainMenu();
};

// List QR Codes CLI
const listQRCLI = async () => {
  try {
    const qrData = readQRData();
    
    if (qrData.length === 0) {
      console.log('📭 No QR codes found.');
      return await mainMenu();
    }

    console.log(`\n📊 QR Codes (Total: ${qrData.length})`);
    console.log('─'.repeat(80));
    
    qrData.forEach((qr, index) => {
      const isExpired = isQRExpired(qr.expiryDate);
      const status = isExpired ? '❌ EXPIRED' : '✅ Valid';
      const expiry = qr.expiryDate ? new Date(qr.expiryDate).toLocaleString() : 'Never expires';
      
      console.log(`\n${index + 1}. ${qr.fileName}`);
      console.log(`   📝 Text: ${qr.text}`);
      console.log(`   📅 Created: ${new Date(qr.createdAt).toLocaleString()}`);
      console.log(`   ⏰ Expires: ${expiry}`);
      console.log(`   🟢 Status: ${status}`);
    });
    
    console.log('\n' + '─'.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await mainMenu();
};

// Delete QR Code CLI
const deleteQRCLI = async () => {
  try {
    const qrData = readQRData();
    
    if (qrData.length === 0) {
      console.log('📭 No QR codes to delete.');
      return await mainMenu();
    }

    const choices = qrData.map(qr => ({
      name: `${qr.fileName} - ${qr.text.substring(0, 30)}${qr.text.length > 30 ? '...' : ''}`,
      value: qr.fileName
    }));

    const { fileName } = await inquirer.prompt([
      {
        type: 'list',
        name: 'fileName',
        message: 'Select QR code to delete:',
        choices: [...choices, { name: 'Back to menu', value: 'back' }]
      },
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to delete this QR code?',
        default: false,
        when: (answers) => answers.fileName !== 'back'
      }
    ]);

    if (fileName === 'back' || !fileName) {
      return await mainMenu();
    }

    // Delete file
    const filePath = path.join(UPLOAD_DIR, fileName);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }

    // Remove from metadata
    const updatedData = qrData.filter(qr => qr.fileName !== fileName);
    writeQRData(updatedData);

    console.log(`✅ QR Code ${fileName} deleted successfully!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await mainMenu();
};

// Start CLI
console.log('🔄 QR Code Manager CLI');
console.log('─'.repeat(50));
mainMenu();