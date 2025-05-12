document.addEventListener('DOMContentLoaded', function () {
    // 获取DOM元素
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const filesList = document.getElementById('filesList');
    const printerList = document.getElementById('printerList');
    const printBtn = document.getElementById('printBtn');
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    const pageRange = document.getElementById('pageRange');
    const copies = document.getElementById('copies');

    // 状态变量
    let selectedFiles = new Map(); // 使用Map存储文件及其打印设置
    let selectedPrinter = null;

    // 初始化
    init();

    // 初始化函数
    function init() {
        // 加载打印机列表
        loadPrinters();

        // 设置事件监听器
        setupEventListeners();

        // 检查Cookie中是否有上次选择的打印机
        checkLastPrinter();
    }

    // 加载打印机列表
    function loadPrinters() {
        fetch('/api/printers')
            .then(response => response.json())
            .then(printers => {
                printerList.innerHTML = '';

                printers.forEach(printer => {
                    const printerElement = document.createElement('div');
                    printerElement.className = 'printer-option';
                    printerElement.dataset.printerId = printer.id;
                    printerElement.innerHTML = `
            <i class="bi bi-printer"></i>
            <p>${printer.name}</p>
          `;

                    printerElement.addEventListener('click', function () {
                        document.querySelectorAll('.printer-option').forEach(el => {
                            el.classList.remove('selected');
                        });

                        this.classList.add('selected');
                        selectedPrinter = printer.id;

                        checkPrintButtonState();
                    });

                    printerList.appendChild(printerElement);
                });
            })
            .catch(error => {
                console.error('加载打印机列表失败:', error);
                showNotification('加载打印机列表失败，请刷新页面重试', true);
            });
    }

    // 设置事件监听器
    function setupEventListeners() {
        fileInput.setAttribute('accept', '.pdf');

        uploadArea.addEventListener('click', function () {
            fileInput.click();
        });

        uploadArea.addEventListener('dragover', function (e) {
            e.preventDefault();
            uploadArea.style.borderColor = '#2980b9';
            uploadArea.style.backgroundColor = '#ecf0f1';
        });

        uploadArea.addEventListener('dragleave', function () {
            uploadArea.style.borderColor = '#3498db';
            uploadArea.style.backgroundColor = '';
        });

        uploadArea.addEventListener('drop', function (e) {
            e.preventDefault();
            uploadArea.style.borderColor = '#3498db';
            uploadArea.style.backgroundColor = '';

            if (e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        });

        fileInput.addEventListener('change', function () {
            if (fileInput.files.length > 0) {
                handleFiles(fileInput.files);
            }
        });

        printBtn.addEventListener('click', function () {
            if (selectedFiles.size > 0 && selectedPrinter) {
                sendPrintJobs();
            }
        });
    }

    // 处理文件选择
    function handleFiles(files) {
        const allowedTypes = ['.pdf'];
        
        for (let file of files) {
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();

        if (!allowedTypes.includes(fileExt)) {
            showNotification('暂时只支持PDF文件格式', true);
                continue;
            }

            // 为每个文件生成唯一ID
            const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // 存储文件信息
            selectedFiles.set(fileId, {
                file: file,
                duplex: true // 默认双面打印
            });

            // 创建文件项UI
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-preview">
                    <i class="bi bi-file-earmark-text"></i>
                    <p>${file.name}</p>
                </div>
                <div class="file-options">
                    <label class="switch">
                        <input type="checkbox" class="duplex-toggle" data-file-id="${fileId}" checked>
                        <span class="slider round"></span>
                    </label>
                    <span class="duplex-label">双面打印</span>
                    <button class="btn-remove" data-file-id="${fileId}">
                        <i class="bi bi-x-circle"></i>
                    </button>
                </div>
            `;

            // 添加事件监听器
            const duplexToggle = fileItem.querySelector('.duplex-toggle');
            duplexToggle.addEventListener('change', function() {
                const fileId = this.dataset.fileId;
                const fileData = selectedFiles.get(fileId);
                fileData.duplex = this.checked;
                selectedFiles.set(fileId, fileData);
            });

            const removeBtn = fileItem.querySelector('.btn-remove');
            removeBtn.addEventListener('click', function() {
                const fileId = this.dataset.fileId;
                selectedFiles.delete(fileId);
                fileItem.remove();
                checkPrintButtonState();
            });

            filesList.appendChild(fileItem);
        }

        // 显示文件列表，隐藏上传区域
        uploadArea.style.display = 'none';
        filesList.style.display = 'block';

        checkPrintButtonState();
    }

    // 检查打印按钮状态
    function checkPrintButtonState() {
        if (selectedFiles.size > 0 && selectedPrinter) {
            printBtn.disabled = false;
        } else {
            printBtn.disabled = true;
        }
    }

    // 发送打印任务
    function sendPrintJobs() {
        const formData = new FormData();
        
        // 添加所有文件及其打印设置
        let index = 0;
        selectedFiles.forEach((fileData, fileId) => {
            console.log(`准备发送文件: ${fileData.file.name}, 双面打印: ${fileData.duplex}`);
            formData.append('files', fileData.file);
            formData.append(`duplex[${index}]`, fileData.duplex ? 'true' : 'false');
            index++;
        });

        formData.append('printerId', selectedPrinter);

        if (pageRange.value.trim()) {
            formData.append('pageRange', pageRange.value.trim());
        }

        if (copies.value > 1) {
            formData.append('copies', copies.value);
        }

        printBtn.disabled = true;
        printBtn.textContent = '正在处理...';

        fetch('/api/print', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(data.message);
                resetFileSelection();
            } else {
                showNotification(data.message, true);
                printBtn.disabled = false;
                printBtn.innerHTML = '<i class="bi bi-printer-fill"></i> 发送打印';
            }
        })
        .catch(error => {
            console.error('打印请求失败:', error);
            showNotification('打印请求失败，请重试', true);
            printBtn.disabled = false;
            printBtn.innerHTML = '<i class="bi bi-printer-fill"></i> 发送打印';
        });
    }

    // 重置文件选择
    function resetFileSelection() {
        selectedFiles.clear();
        fileInput.value = '';
        filesList.innerHTML = '';
        uploadArea.style.display = 'block';
        filesList.style.display = 'none';
        printBtn.disabled = true;
        printBtn.innerHTML = '<i class="bi bi-printer-fill"></i> 发送打印';
    }

    // 显示通知
    function showNotification(message, isError = false) {
        notificationText.textContent = message;
        notification.style.display = 'block';

        if (isError) {
            notification.classList.add('error');
        } else {
            notification.classList.remove('error');
        }

        setTimeout(function () {
            notification.style.display = 'none';
        }, 3000);
    }

    // 检查Cookie中是否有上次选择的打印机
    function checkLastPrinter() {
        const cookies = document.cookie.split(';');
        let lastPrinter = null;

        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith('lastPrinter=')) {
                lastPrinter = cookie.substring('lastPrinter='.length, cookie.length);
                break;
            }
        }

        if (lastPrinter) {
            setTimeout(() => {
                const printerOption = document.querySelector(`.printer-option[data-printer-id="${lastPrinter}"]`);
                if (printerOption) {
                    printerOption.click();
                }
            }, 500);
        }
    }
});