/**
 * 打印机配置工具
 * 用于管理打印机配置和测试打印机连接
 */

const fs = require('fs');
const path = require('path');
const { testConnection, sendTestPage } = require('./testPrinterConnection');

class PrinterConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, '../../config', 'printers.json');
        this.printers = [];
        this.loadConfig();
    }

    // 加载打印机配置
    loadConfig() {
        try {
            // 确保配置目录存在
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // 尝试读取配置文件
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                this.printers = JSON.parse(data);
                console.log(`已加载${this.printers.length}台打印机配置`);
            } else {
                // 如果配置文件不存在，使用默认配置
                this.printers = [
                    { id: '809', name: '809打印机', systemName: '809打印机', useSystemPrinting: true },
                    { id: '502', name: '502办公室打印机', systemName: '502办公室打印机', useSystemPrinting: true },
                    { id: '301', name: '301办公室打印机', systemName: '301办公室打印机', useSystemPrinting: true },
                    { id: '201', name: '201办公室打印机', systemName: '201办公室打印机', useSystemPrinting: true }
                ];
                this.saveConfig();
                console.log('已创建默认打印机配置');
            }
        } catch (error) {
            console.error('加载打印机配置失败:', error);
            // 使用默认配置
            this.printers = [
                { id: '809', name: '809打印机', systemName: '809打印机', useSystemPrinting: true },
                { id: '502', name: '502办公室打印机', systemName: '502办公室打印机', useSystemPrinting: true },
                { id: '301', name: '301办公室打印机', systemName: '301办公室打印机', useSystemPrinting: true },
                { id: '201', name: '201办公室打印机', systemName: '201办公室打印机', useSystemPrinting: true }
            ];
        }
    }

    // 保存打印机配置
    saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.printers, null, 2), 'utf8');
            console.log('打印机配置已保存');
            return true;
        } catch (error) {
            console.error('保存打印机配置失败:', error);
            return false;
        }
    }

    // 获取所有打印机
    getAllPrinters() {
        return this.printers;
    }

    // 获取单个打印机
    getPrinter(id) {
        return this.printers.find(p => p.id === id);
    }

    // 添加或更新打印机
    updatePrinter(printer) {
        const index = this.printers.findIndex(p => p.id === printer.id);
        if (index >= 0) {
            this.printers[index] = { ...this.printers[index], ...printer };
        } else {
            this.printers.push(printer);
        }
        return this.saveConfig();
    }

    // 删除打印机
    deletePrinter(id) {
        const index = this.printers.findIndex(p => p.id === id);
        if (index >= 0) {
            this.printers.splice(index, 1);
            return this.saveConfig();
        }
        return false;
    }

    // 测试打印机连接
    async testPrinterConnection(id) {
        const printer = this.getPrinter(id);
        if (!printer) {
            return { success: false, message: `找不到ID为${id}的打印机` };
        }

        // 对于系统打印机，假定连接成功
        if (printer.useSystemPrinting) {
            return {
                success: true,
                message: `打印机 ${printer.name} 已配置为使用系统打印，无需测试连接`
            };
        }

        // 兼容旧版配置，如果有IP地址，尝试测试连接
        if (printer.ip) {
            try {
                const connected = await testConnection(printer.ip, printer.port || 9100);
                return {
                    success: connected,
                    message: connected ?
                        `成功连接到打印机: ${printer.name} (${printer.ip}:${printer.port || 9100})` :
                        `无法连接到打印机: ${printer.name} (${printer.ip}:${printer.port || 9100})`
                };
            } catch (error) {
                return { success: false, message: `测试连接时发生错误: ${error.message}` };
            }
        } else {
            return { success: false, message: `打印机${printer.name}没有配置IP地址且未启用系统打印` };
        }
    }

    // 发送测试页
    async sendTestPage(id) {
        const printer = this.getPrinter(id);
        if (!printer) {
            return { success: false, message: `找不到ID为${id}的打印机` };
        }

        // 对于系统打印机，使用系统打印命令发送测试页
        if (printer.useSystemPrinting) {
            try {
                const os = require('os');
                const { exec } = require('child_process');
                const platform = os.platform();
                let command = '';

                if (platform === 'win32') {
                    // 创建一个简单的测试页文件
                    const fs = require('fs');
                    const testPagePath = path.join(os.tmpdir(), 'printer_test_page.txt');
                    fs.writeFileSync(testPagePath, '打印机测试页\n这是一个系统打印测试页\n' + new Date().toLocaleString());

                    // 使用Windows打印命令
                    command = `print /d:"${printer.systemName || printer.name}" "${testPagePath}"`;
                } else if (platform === 'darwin') {
                    // macOS使用lpr命令
                    const testPagePath = path.join(os.tmpdir(), 'printer_test_page.txt');
                    fs.writeFileSync(testPagePath, '打印机测试页\n这是一个系统打印测试页\n' + new Date().toLocaleString());
                    command = `lpr -P "${printer.systemName || printer.name}" "${testPagePath}"`;
                } else {
                    // Linux使用lp命令
                    const testPagePath = path.join(os.tmpdir(), 'printer_test_page.txt');
                    fs.writeFileSync(testPagePath, '打印机测试页\n这是一个系统打印测试页\n' + new Date().toLocaleString());
                    command = `lp -d "${printer.systemName || printer.name}" "${testPagePath}"`;
                }

                return new Promise((resolve) => {
                    exec(command, (error) => {
                        if (error) {
                            console.error(`发送测试页错误: ${error.message}`);
                            resolve({ success: false, message: `发送测试页失败: ${error.message}` });
                        } else {
                            resolve({ success: true, message: `成功发送测试页到打印机: ${printer.name}` });
                        }
                    });
                });
            } catch (error) {
                return { success: false, message: `发送测试页时发生错误: ${error.message}` };
            }
        } else if (printer.ip) {
            // 兼容旧版配置，如果有IP地址，使用TCP方式发送测试页
            try {
                const success = await sendTestPage(printer.ip, printer.port || 9100);
                return {
                    success,
                    message: success ?
                        `成功发送测试页到打印机: ${printer.name}` :
                        `发送测试页失败: ${printer.name}`
                };
            } catch (error) {
                return { success: false, message: `发送测试页时发生错误: ${error.message}` };
            }
        } else {
            return { success: false, message: `打印机${printer.name}没有配置IP地址且未启用系统打印` };
        }
    }

    // 测试所有打印机
    async testAllPrinters() {
        const results = [];

        for (const printer of this.printers) {
            // 对于系统打印机，直接标记为已连接
            if (printer.useSystemPrinting) {
                results.push({
                    id: printer.id,
                    name: printer.name,
                    connected: true,
                    message: '使用系统打印，无需测试连接'
                });
                continue;
            }

            // 对于传统IP打印机，检查IP配置
            if (!printer.ip) {
                results.push({
                    id: printer.id,
                    name: printer.name,
                    connected: false,
                    message: '未配置IP地址且未启用系统打印'
                });
                continue;
            }

            const result = await this.testPrinterConnection(printer.id);
            results.push({
                id: printer.id,
                name: printer.name,
                connected: result.success,
                message: result.message
            });
        }

        return results;
    }

    // 获取支持的打印协议
    getSupportedProtocols() {
        return [
            { id: 'system', name: '系统打印', description: '使用操作系统内置的打印功能' }
        ];
    }
}

// 创建单例实例
const printerConfigManager = new PrinterConfigManager();

module.exports = printerConfigManager;