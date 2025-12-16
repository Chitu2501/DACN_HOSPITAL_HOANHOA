const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const { protect, authorize } = require('../middleware/auth.middleware');

// Apply authentication to all routes
router.use(protect);

// @route   GET /api/users/doctors
// @desc    Get all doctors
// @access  Private
router.get('/doctors', async (req, res) => {
  try {
    const { specialization, department } = req.query;

    let query = { role: 'doctor', isActive: true };

    if (specialization) {
      query.specialization = { $regex: specialization, $options: 'i' };
    }

    if (department) {
      query.department = { $regex: department, $options: 'i' };
    }

    const doctors = await User.find(query)
      .select('fullName email phone specialization department licenseNumber');

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching doctors',
      error: error.message
    });
  }
});

// @route   GET /api/users/nurses
// @desc    Get all nurses
// @access  Private
router.get('/nurses', async (req, res) => {
  try {
    const { department } = req.query;

    let query = { role: 'nurse', isActive: true };

    if (department) {
      query.department = { $regex: department, $options: 'i' };
    }

    const nurses = await User.find(query)
      .select('fullName email phone department licenseNumber');

    res.status(200).json({
      success: true,
      count: nurses.length,
      data: nurses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching nurses',
      error: error.message
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
});

module.exports = router;

