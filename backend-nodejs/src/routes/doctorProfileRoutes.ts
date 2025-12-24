import express from 'express';
import { getDoctorProfile, updateDoctorProfile, uploadAvatar } from '../controllers/doctorProfile.controller';
import { protect, isDoctor } from '../middlewares/doctorAuth';
import { uploadAvatar: multerUpload } from '../config/multer.config';

const router = express.Router();

// All routes require authentication and doctor role
router.use(protect);
router.use(isDoctor);

// GET /api/doctor/profile
router.get('/profile', getDoctorProfile);

// PUT /api/doctor/profile
router.put('/profile', updateDoctorProfile);

// POST /api/doctor/profile/avatar
router.post('/profile/avatar', multerUpload.single('avatar'), uploadAvatar);

export default router;

