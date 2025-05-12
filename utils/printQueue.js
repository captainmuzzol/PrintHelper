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
const { PDFDocument } = require('pdf-lib');

class PrintQueueManager {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.maxConcurrent = 1; // 一次只处理一个任务
        this.activeJobs = 0;
        this.processInterval = null;
        this.tempDir = path.join(process.cwd(), 'temp');
        
        // 确保临时目录存在
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir);
        }
    }

    // 初始化打印队列管理器
    initialize() {
        // 每500毫秒检查一次队列
        this.processInterval = setInterval(() => this.processQueue(), 1000);
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
    async processQueue() {
        // 如果没有等待的任务或正在处理任务，则返回
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

        try {
            await this.sendPrintJob(job);
        } catch (error) {
            console.error(`处理打印任务失败: ${job.filename}`, error);
            this.handlePrintError(job, error);
        }
    }

    // 处理单面打印 - 通过在每一页后插入空白页来实现
    async handleSimplexPrinting(job) {
        try {
            // 创建临时文件路径
            const tempFilePath = path.join(this.tempDir, `simplex_${Date.now()}_${path.basename(job.filePath)}`);
            
            // 读取原始PDF文件
            const originalPdfBytes = await fs.promises.readFile(job.filePath);
            
            // 加载原始PDF
            const originalPdf = await PDFDocument.load(originalPdfBytes);
            
            // 创建新的PDF文档
            const newPdf = await PDFDocument.create();
            
            // 获取原始PDF的页数
            const pageCount = originalPdf.getPageCount();
            console.log(`单面打印 - 原PDF页数: ${pageCount}`);
            
            // 复制所有页面到新文档
            const copiedPages = await newPdf.copyPages(originalPdf, originalPdf.getPageIndices());
            
            // 处理每一页 - 在每一页后插入空白页
            for (let i = 0; i < copiedPages.length; i++) {
                // 添加原始页面
                newPdf.addPage(copiedPages[i]);
                
                // 如果不是最后一页，添加空白页
                if (i < copiedPages.length - 1) {
                    console.log(`在第 ${i+1} 页后添加空白页`);
                    newPdf.addPage();
                }
            }
            
            // 保存新PDF
            const newPdfBytes = await newPdf.save();
            await fs.promises.writeFile(tempFilePath, newPdfBytes);
            
            // 更新job的filePath为新的临时文件
            job.filePath = tempFilePath;
            
            // 在打印完成后删除临时文件
            const cleanup = () => {
                if (fs.existsSync(tempFilePath)) {
                    try {
                        fs.unlinkSync(tempFilePath);
                        console.log(`删除临时文件: ${tempFilePath}`);
                    } catch (err) {
                        console.error(`删除临时文件失败: ${tempFilePath}`, err);
                    }
                }
            };
            
            // 将清理函数添加到job对象
            job.cleanup = cleanup;
            
            return Promise.resolve();
        } catch (error) {
            console.error('处理单面打印失败:', error);
            return Promise.reject(error);
        }
    }

    // 发送打印任务到打印机
    async sendPrintJob(job) {
        try {
            // 获取打印机配置
            const printerConfigManager = require('./printerConfig');
            const printers = printerConfigManager.getAllPrinters();

            // 查找对应的打印机
            const printer = printers.find(p => p.id === job.printer);

            if (!printer) {
                throw new Error(`找不到ID为${job.printer}的打印机`);
            }

            console.log(`准备打印文件: ${job.filename} 到打印机: ${printer.name}，双面打印: ${job.duplex} (${typeof job.duplex})`);

            // 检查文件是否存在
            if (!fs.existsSync(job.filePath)) {
                throw new Error(`找不到文件: ${job.filePath}`);
            }

            // 如果是单面打印，先处理文件
            if (job.duplex === false) {
                console.log(`处理单面打印: ${job.filename}`);
                await this.handleSimplexPrinting(job);
            } else {
                console.log(`处理双面打印: ${job.filename}`);
                // 双面打印不需要特殊处理，直接使用PDFtoPrinter
            }

            // 根据操作系统选择打印方法
            const platform = os.platform();
            console.log(`当前操作系统: ${platform}`);

            // 使用Promise包装打印命令执行
            await new Promise((resolve, reject) => {
                let command = '';
                if (platform === 'win32') {
                    const printerName = printer.systemName || printer.name;
                    const pdfToPrinterPath = path.join(process.cwd(), 'PDFtoPrinter.exe');
                    
                    // 构建打印命令
                    command = `"${pdfToPrinterPath}" "${job.filePath}" "${printerName}"`;
                    
                    // 添加页面范围参数
                    if (job.pageRange) {
                        command += ` pages=${job.pageRange}`;
                    }
                    
                    // 添加打印份数参数
                    if (job.copies && job.copies > 1) {
                        command += ` copies=${job.copies}`;
                    }
                    
                } else if (platform === 'darwin') {
                    const printerName = printer.systemName || printer.name;
                    command = `lpr -P "${printerName}" "${job.filePath}"`;
                } else {
                    const printerName = printer.systemName || printer.name;
                    command = `lp -d "${printerName}" "${job.filePath}"`;
                }

                console.log(`执行打印命令: ${command}`);
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`打印命令执行失败: ${error.message}`);
                        reject(error);
                        return;
                    }
                    console.log(`打印命令执行成功`);
                    resolve();
                });
            });

            // 打印成功，更新状态
            job.status = 'completed';
            job.completedAt = new Date();
            this.activeJobs--;
            
            // 清理临时文件
            if (job.cleanup) {
                job.cleanup();
            }
            
            // 打印完成后延迟一段时间，确保打印机有足够时间处理任务
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 清理已完成的任务
            this.cleanupCompletedJobs();
            
        } catch (error) {
            throw error;
        }
    }

    // 处理打印错误
    handlePrintError(job, error) {
        console.error(`打印任务失败: ${job.filename}`, error);
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
        this.activeJobs--;

        // 清理临时文件
        if (job.cleanup) {
            job.cleanup();
        }

        // 如果失败次数小于3，则重试
        if (job.attempts < 3) {
            job.attempts += 1;
            job.status = 'pending';
            console.log(`安排重试打印任务: ${job.filename}，尝试次数: ${job.attempts}`);
        }
    }

    // 清理已完成的任务
    cleanupCompletedJobs() {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const jobsToCleanup = this.queue.filter(
            job => job.status === 'completed' && job.completedAt < thirtyMinutesAgo
        );

        // 清理临时文件
        jobsToCleanup.forEach(job => {
            if (job.cleanup) {
                job.cleanup();
            }
        });

        // 从队列中移除这些任务
        this.queue = this.queue.filter(
            job => !(job.status === 'completed' && job.completedAt < thirtyMinutesAgo)
        );

        if (jobsToCleanup.length > 0) {
            console.log(`清理了 ${jobsToCleanup.length} 个已完成的打印任务`);
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