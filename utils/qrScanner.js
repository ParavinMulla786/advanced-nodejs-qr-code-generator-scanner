const { Jimp } = require('jimp');
const QRCodeReader = require('qrcode-reader');

const scanQRCode = async (imagePath) => {
  try {
    // Read the image using Jimp
    const image = await Jimp.read(imagePath);
    
    // Create QRCode reader instance
    const qrReader = new QRCodeReader();
    
    // Return a promise for the scan result
    return new Promise((resolve, reject) => {
      qrReader.callback = (err, value) => {
        if (err) {
          reject(new Error('Failed to scan QR Code: ' + err.message));
        } else {
          resolve(value.result);
        }
      };
      
      // Decode the QR code
      qrReader.decode(image.bitmap);
    });
  } catch (error) {
    throw new Error('Error processing image: ' + error.message);
  }
};

module.exports = { scanQRCode };