const app = require('./src/app');
const printQueueManager = require('./src/services/printQueue');
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
    // 获取本机IP (简单实现，仅用于提示)
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`可通过局域网IP访问: http://${net.address}:${PORT}`);
            }
        }
    }
});

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('正在关闭服务器...');
    printQueueManager.shutdown();
    process.exit(0);
});
