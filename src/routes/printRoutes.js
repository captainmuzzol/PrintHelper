const express = require('express');
const router = express.Router();
const printController = require('../controllers/printController');
const upload = require('../middleware/upload');

router.post('/print', upload.array('files'), printController.printFiles);
router.get('/queue-status', printController.getQueueStatus);

module.exports = router;
