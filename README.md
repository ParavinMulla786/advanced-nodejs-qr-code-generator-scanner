# 🚀 Advanced Node.js QR Code Generator & Scanner

A backend Node.js application to **generate, scan, manage, download, and expire QR Codes** using Express REST APIs.

---

## 🎯 Objective

Build an advanced QR Code system that allows users to:

- Generate QR Codes from string or URL
- Save QR images on server
- Scan QR Code images
- Manage QR files using APIs
- Handle QR expiry (5 min, 1 hr, 1 day, custom)

---

## ⚙️ Tech Stack

- Node.js
- Express.js
- qrcode
- jimp
- qrcode-reader
- fs-extra
- dotenv

---

## 🌐 REST API FEATURES

---

### 1️⃣ Generate QR Code
**POST** `/api/qr/generate`

Generate QR Code from text or URL and store it on server.

---

### 2️⃣ List All QR Codes
**GET** `/api/qr/list`

Returns all generated QR images from `/uploads`.

---

### 3️⃣ Scan QR Code
**POST** `/api/qr/scan`

Decode QR image and return original data.

---

### 4️⃣ Download QR Code
**GET** `/api/qr/download/:fileName`

Download QR image from server.

---

### 5️⃣ Delete QR Code
**DELETE** `/api/qr/delete/:fileName`

Remove QR image from server.

---

## ⏳ QR EXPIRY SYSTEM

Supports automatic expiry:

- 5 minutes
- 1 hour
- 1 day
- Custom expiry

Expired QR codes become invalid automatically.

---

## ⚠️ ERROR HANDLING

Handles:

- Missing input data
- Invalid file name
- File not found
- Server errors

---

## ▶️ RUN PROJECT

```bash id="xk9g7q"
npm install
npm run dev
