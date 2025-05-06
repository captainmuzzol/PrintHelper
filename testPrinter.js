/**
 * 打印机测试工具
 * 用于测试打印机连接和发送测试页
 */

const printerConfigManager = require('./utils/printerConfig');

// 解析命令行参数
const args = process.argv.slice(2);
const command = args[0];
const printerId = args[1];

// 初始化打印机配置管理器
printerConfigManager.loadConfig();

// 根据命令执行相应操作
async function executeCommand() {
    try {
        switch (command) {
            case 'list':
                // 列出所有打印机
                const printers = printerConfigManager.getAllPrinters();
                console.log('\n打印机列表:');
                printers.forEach(printer => {
                    console.log(`ID: ${printer.id}, 名称: ${printer.name}`);
                });
                break;

            case 'test':
                // 测试特定打印机连接
                if (!printerId) {
                    console.error('错误: 请指定打印机ID');
                    showUsage();
                    return;
                }

                console.log(`正在测试打印机 ${printerId} 的连接...`);
                const testResult = await printerConfigManager.testPrinterConnection(printerId);
                console.log(testResult.success ?
                    `✅ 连接成功: ${testResult.message}` :
                    `❌ 连接失败: ${testResult.message}`);
                break;

            case 'test-all':
                // 测试所有打印机连接
                console.log('正在测试所有打印机连接...');
                const allPrinters = printerConfigManager.getAllPrinters();
                for (const printer of allPrinters) {
                    const result = await printerConfigManager.testPrinterConnection(printer.id);
                    console.log(`${printer.name} (${printer.id}): ${result.success ? '✅ 连接成功' : '❌ 连接失败'} - ${result.message}`);
                }
                break;

            case 'print':
                // 发送测试页到特定打印机
                if (!printerId) {
                    console.error('错误: 请指定打印机ID');
                    showUsage();
                    return;
                }

                console.log(`正在发送测试页到打印机 ${printerId}...`);
                const printResult = await printerConfigManager.sendTestPage(printerId);
                console.log(printResult.success ?
                    `✅ 测试页发送成功: ${printResult.message}` :
                    `❌ 测试页发送失败: ${printResult.message}`);
                break;

            default:
                showUsage();
                break;
        }
    } catch (error) {
        console.error(`执行命令时发生错误: ${error.message}`);
    }
}

// 显示使用说明
function showUsage() {
    console.log(`
打印机测试工具使用说明:

  node testPrinter.js list              列出所有配置的打印机
  node testPrinter.js test <打印机ID>    测试特定打印机连接
  node testPrinter.js test-all          测试所有打印机连接
  node testPrinter.js print <打印机ID>   发送测试页到特定打印机
`);
}

// 执行命令
executeCommand();