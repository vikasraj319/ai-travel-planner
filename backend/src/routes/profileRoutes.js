const express = require('express');

const {
  createProfile
} = require('../controllers/profileController');

const {
  authenticateUser
} = require('../middleware/authenticateUser');

const router = express.Router();

router.post(
  '/profile',
  authenticateUser,
  createProfile
);

module.exports = router;