# 打印助手部署指南

本文档提供了如何在Windows服务器上部署打印助手Web应用的详细步骤。

## 前提条件

- Windows服务器（推荐Windows Server 2016或更高版本）
- Node.js 14.x或更高版本
- 所有网络打印机的驱动程序
- 网络连接到所有打印机

## 安装步骤

### 1. 安装Node.js

1. 从[Node.js官网](https://nodejs.org/)下载并安装最新的LTS版本
2. 安装完成后，打开命令提示符验证安装：
   ```
   node --version
   npm --version
   ```

### 2. 安装打印机驱动

确保在Windows服务器上安装了所有需要支持的打印机驱动程序，并且可以从服务器正常打印测试页。

### 3. 下载并配置应用

1. 下载打印助手应用代码
2. 解压到服务器上的目录，例如：`C:\PrintHelper`
3. 打开命令提示符，进入应用目录：
   ```
   cd C:\PrintHelper
   ```
4. 安装依赖：
   ```
   npm install
   ```
5. 复制环境变量示例文件并根据需要修改：
   ```
   copy .env.example .env
   ```
6. 编辑`.env`文件，配置端口和其他设置

### 4. 配置打印机列表

1. 打开`server.js`文件
2. 找到`printers`数组，根据实际情况修改打印机列表：
   ```javascript
   const printers = [
     { id: '801', name: '801办公室打印机' },
     { id: '502', name: '502办公室打印机' },
     // 添加更多打印机...
   ];
   ```

### 5. 启动应用

#### 开发模式

```
npm run dev
```

#### 生产模式

```
npm start
```

### 6. 设置为Windows服务（推荐）

为了确保应用在服务器重启后自动运行，建议将应用设置为Windows服务：

1. 安装PM2作为进程管理器：
   ```
   npm install -g pm2
   ```

2. 安装PM2-Windows-Startup：
   ```
   npm install -g pm2-windows-startup
   pm2-startup install
   ```

3. 使用PM2启动应用：
   ```
   pm2 start server.js --name "print-helper"
   pm2 save
   ```

## 访问应用

应用启动后，可以通过以下URL访问：

```
http://服务器IP地址:3000
```

如果配置了不同的端口，请相应地更改URL。

## 高并发优化

对于高并发环境，建议：

1. 增加服务器内存和CPU资源
2. 配置负载均衡器（如果有多台服务器）
3. 监控服务器性能，根据需要调整资源

## 故障排除

### 常见问题

1. **应用无法启动**
   - 检查Node.js是否正确安装
   - 确认所有依赖已安装：`npm install`
   - 检查端口是否被占用

2. **无法打印**
   - 确认打印机驱动已正确安装
   - 检查打印机网络连接
   - 查看服务器日志寻找错误信息

3. **文件上传失败**
   - 检查uploads目录权限
   - 确认文件大小未超过限制

## 技术支持

如有任何问题，请联系技术支持团队：

- 电话：123-4567-8901
- 邮箱：support@example.com