const express = require('express');
const router = express.Router();
const mergeController = require('../controllers/mergeController');
const upload = require('../middleware/upload');

router.post('/merge-word', upload.array('files', 30), mergeController.mergeWordFiles);

module.exports = router;
