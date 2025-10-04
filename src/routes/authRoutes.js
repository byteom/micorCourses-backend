const express = require('express');
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  applyForCreator
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { validateRegister, validateLogin } = require('../middlewares/validation');

const router = express.Router();

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/apply-creator', protect, applyForCreator);

module.exports = router;