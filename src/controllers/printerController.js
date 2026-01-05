const printerConfigManager = require('../services/printerConfig');

exports.getAllPrinters = (req, res) => {
    res.json(printerConfigManager.getAllPrinters());
};

exports.getPrinterById = (req, res) => {
    const printer = printerConfigManager.getPrinter(req.params.id);
    if (printer) {
        res.json(printer);
    } else {
        res.status(404).json({ success: false, message: `找不到ID为${req.params.id}的打印机` });
    }
};

exports.updatePrinter = (req, res) => {
    try {
        const id = req.params.id;
        const printer = { id, ...req.body };
        const success = printerConfigManager.updatePrinter(printer);
        if (success) {
            res.json({ success: true, message: '打印机更新成功', printer });
        } else {
            res.status(500).json({ success: false, message: '打印机更新失败' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: `更新打印机时发生错误: ${error.message}` });
    }
};

exports.deletePrinter = (req, res) => {
    try {
        const id = req.params.id;
        const success = printerConfigManager.deletePrinter(id);
        if (success) {
            res.json({ success: true, message: '打印机删除成功' });
        } else {
            res.status(404).json({ success: false, message: '找不到指定ID的打印机' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: `删除打印机时发生错误: ${error.message}` });
    }
};

exports.testPrinterConnection = async (req, res) => {
    try {
        const result = await printerConfigManager.testPrinterConnection(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: `测试连接时发生错误: ${error.message}` });
    }
};

exports.sendTestPage = async (req, res) => {
    try {
        const result = await printerConfigManager.sendTestPage(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: `发送测试页时发生错误: ${error.message}` });
    }
};

exports.getSupportedProtocols = (req, res) => {
    res.json(printerConfigManager.getSupportedProtocols());
};
