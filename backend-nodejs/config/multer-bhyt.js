const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads', 'bhyt');

// Create uploads directory if it doesn't exist
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created BHYT uploads directory:', uploadsDir);
  }
} catch (error) {
  console.error('❌ Error creating uploads directory:', error.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const username = req.user?.username || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    // Use fieldname to distinguish front/back: mat_truoc or mat_sau
    const fieldname = file.fieldname || 'bhyt';
    const filename = `bhyt_${username}_${fieldname}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only jpg, png, and webp are allowed.'));
  }
};

const uploadBHYT = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB per file
  },
  fileFilter
});

module.exports = { uploadBHYT };


