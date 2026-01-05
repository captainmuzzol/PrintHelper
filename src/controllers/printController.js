const path = require('path');
const fs = require('fs');
const printQueueManager = require('../services/printQueue');

exports.printFiles = (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: '请选择要打印的文件' });
        }

        const { printerId, pageRange, copies } = req.body;
        if (!printerId) {
            return res.status(400).json({ success: false, message: '请选择打印机位置' });
        }

        // 检查文件类型
        const allowedTypes = ['.pdf'];
        const invalidFiles = req.files.filter(file => {
            const fileExt = path.extname(file.originalname).toLowerCase();
            return !allowedTypes.includes(fileExt);
        });

        if (invalidFiles.length > 0) {
            // 删除不支持的文件
            invalidFiles.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (e) {
                    console.error('删除不支持的文件失败:', e);
                }
            });
            return res.status(400).json({ success: false, message: '暂时只支持PDF文件格式' });
        }

        // 获取客户端IP
        const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // 设置cookie记住用户选择的打印机
        res.cookie('lastPrinter', printerId, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30天

        // 处理每个文件
        const printJobs = req.files.map((file) => {
            return {
                filename: file.filename,
                filePath: file.path,
                printer: printerId,
                pageRange: pageRange,
                copies: copies ? parseInt(copies) : 1,
                clientIp: clientIp,
                timestamp: new Date()
            };
        });

        // 添加到打印队列
        printJobs.forEach(job => {
            printQueueManager.addJob(job);
        });

        res.json({ success: true, message: '已发送打印指令！' });
    } catch (error) {
        console.error('打印错误:', error);
        res.status(500).json({ success: false, message: '打印过程中发生错误' });
    }
};

exports.getQueueStatus = (req, res) => {
    res.json(printQueueManager.getStatus());
};
