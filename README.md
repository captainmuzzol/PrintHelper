# 温岭检察打印助手 (Wenling Procuratorate Print Helper)

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

网络打印助手是一个专门设计用于解决国产操作系统（如银河麒麟）下打印机兼容性问题的Web应用程序。它部署在Windows服务器上，通过Web界面提供统一的打印服务接口，让客户端无需安装驱动即可实现文件打印和文档处理功能。

## 🌟 核心功能

### 1. 跨平台打印服务
- **PDF打印**：支持单面/双面打印，自动调用服务器端打印机。
- **拖拽上传**：支持批量拖拽PDF文件进行打印。
- **打印机管理**：支持添加、编辑、删除和禁用打印机配置。
- **打印队列**：内置打印队列管理，确保任务有序执行。

### 2. WORD批量合并
- **格式转换**：自动将上传的 `.doc` 和 `.docx` 文件转换为统一格式。
- **文档合并**：按文件名顺序将多个Word文档合并为一个完整的 `.docx` 文件。
- **格式保留**：最大程度保留原文档的排版和格式。

### 3. 便捷工具
- **文件中转站**：集成内部文件传输链接，方便快速访问。
- **状态监控**：实时反馈打印任务状态和服务器连接情况。

## 🏗️ 技术架构

本项目采用前后端分离的模块化架构设计：

- **后端**：Node.js + Express
  - **MVC架构**：Controller/Service/Route 分层设计
  - **模块化**：`src/` 目录下包含所有核心逻辑
  - **Python集成**：使用 Python 脚本 (`src/scripts/word_merge.py`) 处理 Word 文档合并
  - **PDFtoPrinter**：调用 `PDFtoPrinter.exe` 实现物理打印

- **前端**：Native JavaScript (ES6 Modules)
  - **模块化**：`public/js/modules/` 下分模块管理 (printer, print, merge, utils)
  - **UI库**：Bootstrap Icons + 自定义 CSS

## 📂 项目结构

```
print-helper/
├── config/                 # 配置文件 (printers.json)
├── public/                 # 静态资源
│   ├── css/                # 样式文件
│   ├── js/                 # 前端脚本
│   │   ├── modules/        # ES6 功能模块
│   │   └── main.js         # 前端入口
│   └── index.html          # 主页
├── src/                    # 后端源码
│   ├── controllers/        # 控制器 (处理请求)
│   ├── middleware/         # 中间件 (文件上传等)
│   ├── routes/             # 路由定义
│   ├── services/           # 业务逻辑 (打印队列、配置管理)
│   ├── scripts/            # 外部脚本 (Python/Node)
│   └── app.js              # Express 应用实例
├── packages/               # 离线 Python 依赖包
├── server.js               # 服务器启动入口
├── PDFtoPrinter.exe        # 打印工具
├── install_deps_offline.bat # 离线依赖安装脚本
└── README.md               # 项目说明
```

## 🚀 部署指南

### 系统要求
- **操作系统**：Windows Server (推荐 2016+) / Windows 10/11
- **环境**：
  - Node.js 14.x 或更高版本
  - Python 3.x (需添加到 PATH)
  - Microsoft Office Word (用于 .doc 转 .docx，可选但推荐)

### 安装步骤

1. **克隆/下载项目**
   ```bash
   git clone [repository-url]
   cd print-helper
   ```

2. **安装 Node.js 依赖**
   ```bash
   npm install
   ```

3. **安装 Python 依赖**
   - **在线安装**：
     ```bash
     pip install -r requirements.txt
     ```
   - **离线安装** (使用 packages 目录)：
     双击运行 `install_deps_offline.bat`

4. **配置打印机**
   - 在 Windows 系统中安装好打印机驱动。
   - 访问 `http://localhost:3000/config.html` 或直接编辑 `config/printers.json` 配置打印机名称（必须与系统打印机名称一致）。

5. **启动服务**
   ```bash
   # 生产模式
   npm start
   
   # 开发模式
   npm run dev
   ```

## 📝 使用说明

1. **访问主页**：打开浏览器访问服务器 IP:端口 (默认 3000)。
2. **选择打印机**：在列表中选择目标打印机（支持查看禁用状态）。
3. **上传文件**：将 PDF 文件拖入虚线框，点击"发送打印"。
4. **Word合并**：点击右上角"WORD批量合并"，上传多个 Word 文档，等待合并完成后下载。

## 🔧 维护与配置

- **端口配置**：修改 `.env` 文件中的 `PORT` 变量。
- **打印机配置**：推荐使用网页端的配置页面进行管理，支持禁用特定打印机。
- **日志查看**：控制台会输出详细的打印日志和错误信息。

## 📄 License

Apache 2.0 License
