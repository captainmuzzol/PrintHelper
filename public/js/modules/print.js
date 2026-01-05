import { showNotification } from './utils.js';
import { getSelectedPrinter } from './printer.js';

let selectedFiles = new Map();

export function setupPrint(uploadArea, fileInput, filesList, printBtn, pageRange, copies, checkPrintButtonState) {
    fileInput.setAttribute('accept', '.pdf');

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#2980b9';
        uploadArea.style.backgroundColor = '#ecf0f1';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#3498db';
        uploadArea.style.backgroundColor = '';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#3498db';
        uploadArea.style.backgroundColor = '';

        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files, filesList, uploadArea, checkPrintButtonState);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFiles(fileInput.files, filesList, uploadArea, checkPrintButtonState);
        }
    });

    printBtn.addEventListener('click', () => {
        const printerId = getSelectedPrinter();
        if (selectedFiles.size > 0 && printerId) {
            sendPrintJobs(printerId, printBtn, pageRange, copies);
        }
    });
}

function handleFiles(files, filesList, uploadArea, checkPrintButtonState) {
    const allowedTypes = ['.pdf'];

    for (let file of files) {
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();

        if (!allowedTypes.includes(fileExt)) {
            showNotification('暂时只支持PDF文件格式', true);
            continue;
        }

        const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        selectedFiles.set(fileId, { file: file });

        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-preview">
                <i class="bi bi-file-earmark-text"></i>
                <p>${file.name}</p>
            </div>
            <div class="file-options">
                <button class="btn-remove" data-file-id="${fileId}">
                    <i class="bi bi-x-circle"></i>
                </button>
            </div>
        `;

        const removeBtn = fileItem.querySelector('.btn-remove');
        removeBtn.addEventListener('click', function () {
            const fileId = this.dataset.fileId;
            selectedFiles.delete(fileId);
            fileItem.remove();
            
            if (selectedFiles.size === 0) {
                 uploadArea.style.display = 'block';
                 filesList.style.display = 'none';
            }
            checkPrintButtonState();
        });

        filesList.appendChild(fileItem);
    }

    if (selectedFiles.size > 0) {
        uploadArea.style.display = 'none';
        filesList.style.display = 'block';
    }

    checkPrintButtonState();
}

export function hasFiles() {
    return selectedFiles.size > 0;
}

export function resetFileSelection(uploadArea, fileInput, filesList, printBtn) {
    selectedFiles.clear();
    fileInput.value = '';
    filesList.innerHTML = '';
    uploadArea.style.display = 'block';
    filesList.style.display = 'none';
    printBtn.disabled = true;
    printBtn.innerHTML = '<i class="bi bi-printer-fill"></i> 发送打印';
}

function sendPrintJobs(printerId, printBtn, pageRange, copies) {
    const formData = new FormData();
    selectedFiles.forEach((fileData) => {
        formData.append('files', fileData.file);
    });

    formData.append('printerId', printerId);

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
                document.dispatchEvent(new CustomEvent('print-success'));
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
