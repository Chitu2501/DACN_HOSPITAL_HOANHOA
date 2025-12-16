import express, { Express, Request, Response } from 'express';
import cors from 'cors';

// Import routes
import patientAuthRoutes from './routes/patientAuthRoutes';
import patientProfileRoutes from './routes/patientProfileRoutes';
import patientMedicalRecordRoutes from './routes/patientMedicalRecordRoutes';
import patientAppointmentRoutes from './routes/patientAppointmentRoutes';
import patientBillingRoutes from './routes/patientBillingRoutes';
import patientInsuranceRoutes from './routes/patientInsuranceRoutes';

const app: Express = express();

// Middleware
app.use(cors()); // Cho phép CORS từ frontend
app.use(express.json()); // Parse JSON body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded body

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Patient Role Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/patient/auth', patientAuthRoutes);
app.use('/api/patient', patientProfileRoutes);
app.use('/api/patient', patientMedicalRecordRoutes);
app.use('/api/patient', patientAppointmentRoutes);
app.use('/api/patient', patientBillingRoutes); // Includes both authenticated and public routes
app.use('/api/patient', patientInsuranceRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;

