const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const statisticsRoutes = require('./routes/statistics.routes');
const doctorHoSoRoutes = require('./routes/doctorHoSoRoutes');
const patientDoctorRoutes = require('./routes/patientDoctorRoutes');
const nurseRoutes = require('./routes/nurse.routes');
const medicineRoutes = require('./routes/medicine.routes');
const prescriptionRoutes = require('./routes/prescription.routes');
const aiRoutes = require('./routes/ai.routes');

// Import doctor profile routes (JavaScript wrapper that loads TypeScript)
let doctorProfileRoutes;
try {
  doctorProfileRoutes = require('./routes/doctorProfileRoutes');
} catch (e) {
  console.warn('⚠️ Doctor profile routes not found:', e.message);
}

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/doctor', doctorHoSoRoutes);
if (doctorProfileRoutes) {
  app.use('/api/doctor', doctorProfileRoutes.default || doctorProfileRoutes);
}
app.use('/api/patient', patientDoctorRoutes);
app.use('/api/nurse', nurseRoutes);
app.use('/api/admin/medicines', medicineRoutes);
app.use('/api/admin/prescriptions', prescriptionRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Hospital Management API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;

