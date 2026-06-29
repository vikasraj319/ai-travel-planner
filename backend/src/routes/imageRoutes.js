const express = require("express");

const {
  getBackgroundImage,
} = require("../controllers/imageController");

const router = express.Router();

router.get("/", getBackgroundImage);

module.exports = router;