/**
 * 打印队列管理模块 - 处理高并发打印请求
 * 仅支持通过系统打印命令发送打印任务
 * 专注于Windows系统打印命令，提高兼容性
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const os = require('os');
const { execSync } = require('child_process');

class PrintQueueManager {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.maxConcurrent = 3; // 最大并发打印任务数
        this.activeJobs = 0;
        this.processInterval = null;
    }

    // 初始化打印队列管理器
    initialize() {
        // 每500毫秒检查一次队列
        this.processInterval = setInterval(() => this.processQueue(), 500);
        console.log('打印队列管理器已初始化');
    }

    // 添加打印任务到队列
    addJob(job) {
        this.queue.push({
            ...job,
            status: 'pending',
            addedAt: new Date(),
            attempts: 0
        });
        console.log(`添加打印任务: ${job.filename} 到打印机: ${job.printer}，队列长度: ${this.queue.length}`);
        return job;
    }

    // 处理打印队列
    processQueue() {
        // 如果没有等待的任务或已达到最大并发数，则返回
        if (this.queue.length === 0 || this.activeJobs >= this.maxConcurrent) {
            return;
        }

        // 获取下一个待处理的任务
        const pendingJobs = this.queue.filter(job => job.status === 'pending');
        if (pendingJobs.length === 0) return;

        const job = pendingJobs[0];
        job.status = 'processing';
        this.activeJobs++;

        console.log(`开始处理打印任务: ${job.filename} 到打印机: ${job.printer}`);

        // 查找打印机IP地址
        this.sendPrintJob(job);
    }

    // 发送打印任务到打印机
    sendPrintJob(job) {
        try {
            // 获取打印机配置
            const printerConfigManager = require('./printerConfig');
            const printers = printerConfigManager.getAllPrinters();

            // 查找对应的打印机
            const printer = printers.find(p => p.id === job.printer);

            if (!printer) {
                this.handlePrintError(job, new Error(`找不到ID为${job.printer}的打印机`));
                return;
            }

            console.log(`准备打印文件: ${job.filename} 到打印机: ${printer.name}`);

            // 检查文件是否存在
            if (!fs.existsSync(job.filePath)) {
                this.handlePrintError(job, new Error(`找不到文件: ${job.filePath}`));
                return;
            }

            // 根据操作系统选择打印方法
            const platform = os.platform();
            console.log(`当前操作系统: ${platform}`);

            if (platform === 'win32') {
                // Windows系统使用系统打印命令
                this.printWithWindowsCommand(job, printer);
            } else if (platform === 'darwin') {
                // macOS系统使用lpr命令
                this.printWithLpr(job, printer);
            } else if (platform === 'linux') {
                // Linux系统使用lp或lpr命令
                this.printWithLinuxCommand(job, printer);
            } else {
                // 其他系统尝试使用lpr命令
                this.printWithLpr(job, printer);
            }
        } catch (error) {
            this.handlePrintError(job, error);
        }
    }

    // Windows系统打印方法
    printWithWindowsCommand(job, printer) {
        console.log(`使用Windows打印命令打印文件: ${job.filename}`);

        // 使用PDFtoPrinter.exe打印，优先使用systemName（系统中配置的打印机名称）
        const printerName = printer.systemName || printer.name;

        // 检查文件扩展名
        const fileExt = path.extname(job.filePath).toLowerCase();

        // 支持的文件类型
        // const supportedExts = ['.pdf', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.bmp'];
        const supportedExts = ['.pdf'];

        if (!supportedExts.includes(fileExt)) {
            console.error(`不支持的文件类型: ${fileExt}`);
            this.handlePrintError(job, new Error(`不支持的文件类型: ${fileExt}`));
            return;
        }

        // 构建PDFtoPrinter命令
        let command = '';
        const pdfToPrinterPath = path.join(process.cwd(), 'PDFtoPrinter.exe');

        // 基本命令
        command = `"${pdfToPrinterPath}" "${job.filePath}" "${printerName}"`;

        // 添加页面范围参数
        if (job.pageRange) {
            command += ` pages=${job.pageRange}`;
        }

        // 添加打印份数参数
        if (job.copies && job.copies > 1) {
            command += ` copies=${job.copies}`;
        }

        console.log(`执行打印命令: ${command}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`打印错误: ${error.message}`);
                this.handlePrintError(job, error);
                return;
            }

            console.log(`文件 ${job.filename} 已成功发送到打印机 ${printerName}`);
            job.status = 'completed';
            job.completedAt = new Date();
            this.activeJobs--;
            this.cleanupCompletedJobs();
        });
    }

    // macOS系统打印方法
    printWithLpr(job, printer) {
        console.log(`使用lpr命令打印文件: ${job.filename}`);

        // 构建lpr命令
        let command = `lpr "${job.filePath}"`;

        // 优先使用systemName（系统中配置的打印机名称）
        const printerName = printer.systemName || printer.name;

        // 如果指定了打印机名称，添加-P参数
        if (printerName) {
            command = `lpr -P "${printerName}" "${job.filePath}"`;
        }

        console.log(`执行打印命令: ${command}`);
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`lpr打印错误: ${error.message}`);
                this.handlePrintError(job, error);
                return;
            }

            console.log(`文件 ${job.filename} 已成功发送到打印机 ${printerName}`);
            job.status = 'completed';
            job.completedAt = new Date();
            this.activeJobs--;
            this.cleanupCompletedJobs();
        });
    }

    // Linux系统打印方法
    printWithLinuxCommand(job, printer) {
        console.log(`使用Linux打印命令打印文件: ${job.filename}`);

        // 优先使用systemName（系统中配置的打印机名称）
        const printerName = printer.systemName || printer.name;

        // 尝试使用lp命令
        let command = `lp "${job.filePath}"`;

        // 如果指定了打印机名称，添加-d参数
        if (printerName) {
            command = `lp -d "${printerName}" "${job.filePath}"`;
        }

        console.log(`执行打印命令: ${command}`);
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`lp命令失败，尝试使用lpr命令...`);
                // 如果lp命令失败，尝试使用lpr命令
                this.printWithLpr(job, printer);
                return;
            }

            console.log(`文件 ${job.filename} 已成功发送到打印机 ${printerName}`);
            job.status = 'completed';
            job.completedAt = new Date();
            this.activeJobs--;
            this.cleanupCompletedJobs();
        });
    }

    // 处理打印错误
    handlePrintError(job, error) {
        console.error(`打印任务失败: ${job.filename}`, error);
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
        this.activeJobs--;

        // 如果失败次数小于3，则重试
        if (job.attempts < 3) {
            job.attempts += 1;
            job.status = 'pending';
            console.log(`安排重试打印任务: ${job.filename}，尝试次数: ${job.attempts}`);
        }
    }

    // 清理已完成的任务
    cleanupCompletedJobs() {
        // 保留最近30分钟内的已完成任务，删除更早的任务
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        // 找出需要清理的任务
        const jobsToCleanup = this.queue.filter(
            job => job.status === 'completed' && job.completedAt < thirtyMinutesAgo
        );

        // 从队列中移除这些任务
        if (jobsToCleanup.length > 0) {
            this.queue = this.queue.filter(job =>
                !(job.status === 'completed' && job.completedAt < thirtyMinutesAgo)
            );
            console.log(`清理了 ${jobsToCleanup.length} 个已完成的打印任务`);

            // 删除相关的临时文件
            jobsToCleanup.forEach(job => {
                if (job.filePath && fs.existsSync(job.filePath)) {
                    try {
                        fs.unlinkSync(job.filePath);
                        console.log(`删除了临时文件: ${job.filePath}`);
                    } catch (error) {
                        console.error(`删除临时文件失败: ${job.filePath}`, error);
                    }
                }
            });
        }
    }


    // 获取队列状态
    getStatus() {
        return {
            queueLength: this.queue.length,
            activeJobs: this.activeJobs,
            pendingJobs: this.queue.filter(job => job.status === 'pending').length,
            completedJobs: this.queue.filter(job => job.status === 'completed').length,
            failedJobs: this.queue.filter(job => job.status === 'failed').length,
            recentJobs: this.queue.slice(-10).map(job => ({
                filename: job.filename,
                printer: job.printer,
                status: job.status,
                error: job.error,
                attempts: job.attempts,
                addedAt: job.addedAt,
                completedAt: job.completedAt
            }))
        };
    }

    // 停止队列处理
    shutdown() {
        if (this.processInterval) {
            clearInterval(this.processInterval);
            console.log('打印队列管理器已关闭');
        }
    }
}

// 创建单例实例
const printQueueManager = new PrintQueueManager();

module.exports = printQueueManager;