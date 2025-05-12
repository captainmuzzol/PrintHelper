const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression'); // 添加压缩中间件，提高性能

// 确保utils目录存在
const utilsDir = path.join(__dirname, 'utils');
if (!fs.existsSync(utilsDir)) {
    fs.mkdirSync(utilsDir, { recursive: true });
}

const printQueueManager = require('./utils/printQueue');
const printerConfigManager = require('./utils/printerConfig');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(compression()); // 启用压缩，减少传输数据量，提高加载速度
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(express.static('public', { maxAge: '1d' })); // 添加缓存控制，提高静态资源加载速度

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 使用Buffer.from和toString来正确处理中文文件名
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, Date.now() + '-' + originalName);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // 设置文件编码
        file.encoding = 'utf8';
        cb(null, true);
    }
});

// 打印机位置列表从配置管理器获取
const printers = printerConfigManager.getAllPrinters();

// 初始化打印队列管理器
printQueueManager.initialize();

// 路由 - 获取打印机列表
app.get('/api/printers', (req, res) => {
    res.json(printerConfigManager.getAllPrinters());
});

// 路由 - 测试打印机连接
app.get('/api/printers/:id/test', async (req, res) => {
    try {
        const result = await printerConfigManager.testPrinterConnection(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: `测试连接时发生错误: ${error.message}` });
    }
});

// 路由 - 发送测试页
app.get('/api/printers/:id/test-page', async (req, res) => {
    try {
        const result = await printerConfigManager.sendTestPage(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: `发送测试页时发生错误: ${error.message}` });
    }
});

// 路由 - 获取单个打印机
app.get('/api/printers/:id', (req, res) => {
    const printer = printerConfigManager.getPrinter(req.params.id);
    if (printer) {
        res.json(printer);
    } else {
        res.status(404).json({ success: false, message: `找不到ID为${req.params.id}的打印机` });
    }
});

// 路由 - 更新打印机
app.put('/api/printers/:id', express.json(), (req, res) => {
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
});

// 路由 - 获取支持的打印协议
app.get('/api/printer-protocols', (req, res) => {
    res.json(printerConfigManager.getSupportedProtocols());
});

// 路由 - 上传文件并打印
app.post('/api/print', upload.array('files'), (req, res) => {
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
        const printJobs = req.files.map((file, index) => {
            // 获取该文件的单双面设置
            console.log(`接收到的参数 duplex[${index}] 值: ${req.body[`duplex[${index}]`]}, 类型: ${typeof req.body[`duplex[${index}]`]}`);
            const fileDuplex = req.body[`duplex[${index}]`] === 'true';
            console.log(`文件 ${file.filename} 的双面打印设置: ${fileDuplex}`);

            return {
                filename: file.filename,
                filePath: file.path,
                printer: printerId,
                pageRange: pageRange,
                copies: copies ? parseInt(copies) : 1,
                clientIp: clientIp,
                timestamp: new Date(),
                duplex: fileDuplex
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
});

// 添加队列状态API
app.get('/api/queue-status', (req, res) => {
    res.json(printQueueManager.getStatus());
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
    console.log(`可通过局域网IP访问: http://<本机IP>:${PORT}`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('正在关闭服务器...');
    printQueueManager.shutdown();
    process.exit(0);
});