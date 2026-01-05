const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads');
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

module.exports = upload;
