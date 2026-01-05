const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

exports.mergeWordFiles = (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: '请选择要合并的Word文件' });
        }

        const files = req.files;
        // 验证文件类型
        const allowedExts = ['.doc', '.docx'];
        const invalidFiles = files.filter(file => {
            const ext = path.extname(file.originalname).toLowerCase();
            return !allowedExts.includes(ext);
        });

        if (invalidFiles.length > 0) {
            // 清理已上传的文件
            files.forEach(file => fs.unlinkSync(file.path));
            return res.status(400).json({ success: false, message: '只支持.doc和.docx格式的文件' });
        }

        // 创建临时目录用于存放合并列表
        const jobId = Date.now().toString();
        const outputDir = path.join(process.cwd(), 'uploads', 'merged');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputFilename = `merged_${jobId}.docx`;
        const outputPath = path.join(outputDir, outputFilename);

        // 创建文件列表JSON
        const fileList = files.map(f => f.path);
        const jsonListPath = path.join(path.dirname(files[0].path), `list_${jobId}.json`);
        fs.writeFileSync(jsonListPath, JSON.stringify(fileList));

        // 调用Python脚本
        // 注意：脚本已移动到 src/scripts/word_merge.py
        const scriptPath = path.join(__dirname, '../scripts/word_merge.py');
        // 使用 python3 以获得更好的兼容性 (macOS/Linux)
        // 在 Windows 上，通常 'python' 也是可用的
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const command = `${pythonCmd} "${scriptPath}" "${jsonListPath}" "${outputPath}"`;

        exec(command, (error, stdout, stderr) => {
            // 清理JSON文件
            try {
                if (fs.existsSync(jsonListPath)) fs.unlinkSync(jsonListPath);
                // 清理上传的源文件
                files.forEach(file => {
                    // 如果转换产生了新的docx文件(针对.doc)，也需要清理，但这里比较难追踪，暂时只清理上传的
                    // 实际生产中建议定期清理uploads目录
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                });
            } catch (cleanupErr) {
                console.error('清理临时文件失败:', cleanupErr);
            }

            if (error) {
                console.error(`执行出错: ${error}`);
                console.error(`stderr: ${stderr}`);
                return res.status(500).json({ success: false, message: `合并文件时发生错误: ${stderr || error.message}` });
            }

            // 返回下载链接
            // 为了让用户下载，我们需要提供一个静态访问路径或流式传输
            // 这里我们直接返回文件流
            res.download(outputPath, 'merged_document.docx', (err) => {
                if (err) {
                    console.error('下载文件失败:', err);
                }
                // 下载完成后删除合并后的文件
                try {
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                } catch (e) {
                    console.error('删除合并文件失败:', e);
                }
            });
        });

    } catch (error) {
        console.error('处理合并请求失败:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
};
