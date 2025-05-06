document.addEventListener('DOMContentLoaded', function () {
    // 获取DOM元素
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const changeFileBtn = document.getElementById('changeFile');
    const printerList = document.getElementById('printerList');
    const printBtn = document.getElementById('printBtn');
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    const pageRange = document.getElementById('pageRange');
    const copies = document.getElementById('copies');

    // 状态变量
    let selectedFile = null;
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
                        // 移除其他打印机的选中状态
                        document.querySelectorAll('.printer-option').forEach(el => {
                            el.classList.remove('selected');
                        });

                        // 选中当前打印机
                        this.classList.add('selected');
                        selectedPrinter = printer.id;

                        // 检查是否可以启用打印按钮
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
        // 限制文件类型
        fileInput.setAttribute('accept', '.pdf,.txt,.jpg,.jpeg,.png,.gif,.bmp');

        // 上传区域点击事件
        uploadArea.addEventListener('click', function () {
            fileInput.click();
        });

        // 文件拖拽事件
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
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        // 文件选择事件
        fileInput.addEventListener('change', function () {
            if (fileInput.files.length > 0) {
                handleFileSelect(fileInput.files[0]);
            }
        });

        // 更换文件按钮
        changeFileBtn.addEventListener('click', function () {
            fileInput.click();
        });

        // 打印按钮
        printBtn.addEventListener('click', function () {
            if (selectedFile && selectedPrinter) {
                sendPrintJob();
            }
        });
    }

    // 处理文件选择
    function handleFileSelect(file) {
        // 检查文件类型
        // const allowedTypes = ['.pdf', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.bmp'];
        const allowedTypes = ['.pdf'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();

        if (!allowedTypes.includes(fileExt)) {
            showNotification('暂时只支持PDF文件格式', true);
            return;
        }

        selectedFile = file;
        fileName.textContent = file.name;

        // 显示文件信息，隐藏上传区域
        uploadArea.style.display = 'none';
        fileInfo.style.display = 'flex';

        // 检查是否可以启用打印按钮
        checkPrintButtonState();
    }

    // 检查打印按钮状态
    function checkPrintButtonState() {
        if (selectedFile && selectedPrinter) {
            printBtn.disabled = false;
        } else {
            printBtn.disabled = true;
        }
    }

    // 发送打印任务
    function sendPrintJob() {
        // 创建FormData对象
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('printerId', selectedPrinter);

        // 添加页面范围和打印份数
        if (pageRange.value.trim()) {
            formData.append('pageRange', pageRange.value.trim());
        }

        if (copies.value > 1) {
            formData.append('copies', copies.value);
        }

        // 禁用打印按钮，防止重复提交
        printBtn.disabled = true;
        printBtn.textContent = '正在处理...';

        // 发送请求
        fetch('/api/print', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification(data.message);

                    // 重置文件选择
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
        selectedFile = null;
        fileInput.value = '';
        uploadArea.style.display = 'block';
        fileInfo.style.display = 'none';
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

        // 3秒后自动隐藏
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
            // 等待打印机列表加载完成后选中上次的打印机
            setTimeout(() => {
                const printerOption = document.querySelector(`.printer-option[data-printer-id="${lastPrinter}"]`);
                if (printerOption) {
                    printerOption.click();
                }
            }, 500);
        }
    }
});