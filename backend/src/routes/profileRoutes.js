const express = require('express');

const {
  createProfile
} = require('../controllers/profileController');

const {
  authenticateUser
} = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/profile',
  authenticateUser,
  createProfile
);

module.exports = router;
