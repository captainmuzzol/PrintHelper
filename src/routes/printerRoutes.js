const express = require('express');
const router = express.Router();
const printerController = require('../controllers/printerController');

router.get('/printers', printerController.getAllPrinters);
router.get('/printers/:id', printerController.getPrinterById);
router.put('/printers/:id', printerController.updatePrinter);
router.delete('/printers/:id', printerController.deletePrinter);
router.get('/printers/:id/test', printerController.testPrinterConnection);
router.get('/printers/:id/test-page', printerController.sendTestPage);
router.get('/printer-protocols', printerController.getSupportedProtocols);

module.exports = router;
