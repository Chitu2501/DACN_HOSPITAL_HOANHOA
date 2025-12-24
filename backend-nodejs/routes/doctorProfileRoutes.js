const express = require('express');
const router = express.Router();

// Try to load TypeScript routes
let doctorProfileController;
let doctorAuth;
let multerConfig;

try {
  // Register ts-node for TypeScript support with proper config
  const tsNode = require('ts-node');
  const path = require('path');
  
  tsNode.register({
    project: path.join(__dirname, '../tsconfig.json'),
    transpileOnly: true,
    compilerOptions: {
      module: 'commonjs',
      esModuleInterop: true,
      allowSyntheticDefaultImports: true
    }
  });
  
  // Load TypeScript modules
  doctorProfileController = require('../src/controllers/doctorProfile.controller');
  doctorAuth = require('../src/middlewares/doctorAuth');
  multerConfig = require('../src/config/multer.config');
  
  // All routes require authentication and doctor role
  router.use(doctorAuth.protect);
  router.use(doctorAuth.isDoctor);
  
  // GET /api/doctor/profile
  router.get('/profile', doctorProfileController.getDoctorProfile);
  
  // PUT /api/doctor/profile
  router.put('/profile', doctorProfileController.updateDoctorProfile);
  
  // POST /api/doctor/profile/avatar
  router.post('/profile/avatar', multerConfig.uploadAvatar.single('avatar'), doctorProfileController.uploadAvatar);
  
  console.log('✅ Doctor profile routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading doctor profile routes:', error.message);
  if (error.stack) {
    console.error('   Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
  }
  console.error('   Make sure ts-node and multer are installed:');
  console.error('   npm install ts-node typescript multer @types/multer');
  
  // Fallback: return routes with error message
  router.use((req, res, next) => {
    res.status(503).json({
      success: false,
      message: 'Doctor profile routes are not available. Please check server configuration.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  });
}

module.exports = router;

