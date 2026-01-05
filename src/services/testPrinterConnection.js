/**
 * 打印机连接测试模块
 * 用于测试打印机连接和发送测试页
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

/**
 * 测试打印机连接
 * @param {Object} printer 打印机配置对象
 * @returns {Promise<Object>} 测试结果
 */
async function testConnection(printer) {
    return new Promise((resolve) => {
        if (!printer) {
            return resolve({ success: false, message: '打印机配置无效' });
        }

        // 如果使用系统打印，则假定连接成功
        if (printer.useSystemPrinting) {
            return resolve({ success: true, message: '系统打印机连接成功' });
        }

        // 否则尝试通过网络连接测试
        const client = new net.Socket();
        let timeout = setTimeout(() => {
            client.destroy();
            resolve({ success: false, message: '连接超时' });
        }, 5000);

        client.connect(9100, printer.ipAddress || 'localhost', () => {
            clearTimeout(timeout);
            client.destroy();
            resolve({ success: true, message: '打印机连接成功' });
        });

        client.on('error', (error) => {
            clearTimeout(timeout);
            client.destroy();
            resolve({ success: false, message: `连接错误: ${error.message}` });
        });
    });
}

/**
 * 发送测试页到打印机
 * @param {Object} printer 打印机配置对象
 * @returns {Promise<Object>} 发送结果
 */
async function sendTestPage(printer) {
    return new Promise((resolve) => {
        if (!printer) {
            return resolve({ success: false, message: '打印机配置无效' });
        }

        // 创建简单的测试页内容
        const testPageContent = `
打印测试页

打印机: ${printer.name}
时间: ${new Date().toLocaleString()}

如果您看到此页面，说明打印机连接正常。
`;

        // 创建临时文件
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `test_page_${Date.now()}.txt`);

        try {
            fs.writeFileSync(tempFile, testPageContent, 'utf8');

            // 根据操作系统和打印机配置选择打印方法
            const platform = os.platform();

            if (printer.useSystemPrinting) {
                // 使用系统打印命令
                if (platform === 'win32') {
                    // Windows
                    exec(`print /d:"${printer.systemName}" "${tempFile}"`, (error) => {
                        fs.unlinkSync(tempFile); // 删除临时文件
                        if (error) {
                            resolve({ success: false, message: `发送测试页失败: ${error.message}` });
                        } else {
                            resolve({ success: true, message: '测试页已发送' });
                        }
                    });
                } else if (platform === 'darwin') {
                    // macOS
                    exec(`lpr -P "${printer.systemName}" "${tempFile}"`, (error) => {
                        fs.unlinkSync(tempFile); // 删除临时文件
                        if (error) {
                            resolve({ success: false, message: `发送测试页失败: ${error.message}` });
                        } else {
                            resolve({ success: true, message: '测试页已发送' });
                        }
                    });
                } else {
                    // Linux或其他系统
                    exec(`lp -d "${printer.systemName}" "${tempFile}"`, (error) => {
                        fs.unlinkSync(tempFile); // 删除临时文件
                        if (error) {
                            resolve({ success: false, message: `发送测试页失败: ${error.message}` });
                        } else {
                            resolve({ success: true, message: '测试页已发送' });
                        }
                    });
                }
            } else {
                // 使用网络打印
                const client = new net.Socket();
                client.connect(9100, printer.ipAddress || 'localhost', () => {
                    client.write(testPageContent);
                    client.end();
                    fs.unlinkSync(tempFile); // 删除临时文件
                    resolve({ success: true, message: '测试页已发送' });
                });

                client.on('error', (error) => {
                    client.destroy();
                    fs.unlinkSync(tempFile); // 删除临时文件
                    resolve({ success: false, message: `发送测试页失败: ${error.message}` });
                });
            }
        } catch (error) {
            // 尝试删除临时文件
            try {
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
            } catch (e) {
                // 忽略删除临时文件的错误
            }
            resolve({ success: false, message: `创建测试页失败: ${error.message}` });
        }
    });
}

module.exports = {
    testConnection,
    sendTestPage
};