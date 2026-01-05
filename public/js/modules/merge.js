import { showNotification } from './utils.js';

let mergeFiles = [];

export function setupMergeFeature() {
    const openMergeModalBtn = document.getElementById('openMergeModalBtn');
    const mergeModal = document.getElementById('mergeModal');
    const closeMergeModalBtn = mergeModal ? mergeModal.querySelector('.close-modal') : null;
    const mergeUploadArea = document.getElementById('mergeUploadArea');
    const mergeFileInput = document.getElementById('mergeFileInput');
    const mergeFilesList = document.getElementById('mergeFilesList');
    const startMergeBtn = document.getElementById('startMergeBtn');

    if (!openMergeModalBtn || !mergeModal) return;

    // 打开模态框
    openMergeModalBtn.addEventListener('click', () => {
        mergeModal.style.display = 'block';
    });

    // 关闭模态框
    if (closeMergeModalBtn) {
        closeMergeModalBtn.addEventListener('click', () => {
            mergeModal.style.display = 'none';
        });
    }

    // 点击外部关闭
    window.addEventListener('click', (e) => {
        if (e.target == mergeModal) {
            mergeModal.style.display = 'none';
        }
    });

    // 上传区域点击
    if (mergeUploadArea) {
        mergeUploadArea.addEventListener('click', () => {
            mergeFileInput.click();
        });

        // 拖拽事件
        mergeUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            mergeUploadArea.style.borderColor = '#2980b9';
            mergeUploadArea.style.backgroundColor = '#ecf0f1';
        });

        mergeUploadArea.addEventListener('dragleave', () => {
            mergeUploadArea.style.borderColor = '#3498db';
            mergeUploadArea.style.backgroundColor = '';
        });

        mergeUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            mergeUploadArea.style.borderColor = '#3498db';
            mergeUploadArea.style.backgroundColor = '';
            
            if (e.dataTransfer.files.length > 0) {
                handleMergeFiles(e.dataTransfer.files, mergeFilesList, startMergeBtn);
            }
        });
    }

    // 文件输入变更
    if (mergeFileInput) {
        mergeFileInput.addEventListener('change', () => {
            if (mergeFileInput.files.length > 0) {
                handleMergeFiles(mergeFileInput.files, mergeFilesList, startMergeBtn);
            }
        });
    }

    // 开始合并
    if (startMergeBtn) {
        startMergeBtn.addEventListener('click', () => startMerge(mergeModal, startMergeBtn, mergeFilesList));
    }
}

function handleMergeFiles(files, mergeFilesList, startMergeBtn) {
    const allowedTypes = ['.doc', '.docx'];
    const maxFiles = 30;

    // 转换为数组以便处理
    const newFiles = Array.from(files);

    // 过滤文件
    const validFiles = newFiles.filter(file => {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(ext)) {
            showNotification(`不支持的文件格式: ${file.name} (仅支持 .doc, .docx)`, true);
            return false;
        }
        return true;
    });

    if (validFiles.length === 0) return;

    if (mergeFiles.length + validFiles.length > maxFiles) {
        showNotification(`最多只能上传${maxFiles}个文件`, true);
        // 只添加能放得下的文件
        const remainingSlots = maxFiles - mergeFiles.length;
        if (remainingSlots > 0) {
            mergeFiles = [...mergeFiles, ...validFiles.slice(0, remainingSlots)];
            updateMergeFilesList(mergeFilesList, startMergeBtn);
        }
        return;
    }

    // 添加到列表
    mergeFiles = [...mergeFiles, ...validFiles];
    updateMergeFilesList(mergeFilesList, startMergeBtn);
}

function updateMergeFilesList(mergeFilesList, startMergeBtn) {
    if (!mergeFilesList) return;

    mergeFilesList.innerHTML = '';

    if (mergeFiles.length === 0) {
        startMergeBtn.disabled = true;
        return;
    }

    startMergeBtn.disabled = false;

    mergeFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-info'; // 复用existing style
        fileItem.innerHTML = `
            <div class="file-preview">
                <i class="bi bi-file-earmark-word"></i>
                <div style="margin-left: 10px;">
                    <p>${file.name}</p>
                    <small style="color: #999;">${(file.size / 1024).toFixed(1)} KB</small>
                </div>
            </div>
            <button class="btn-remove-merge" data-index="${index}" style="border:none; background:none; cursor:pointer; color:#e74c3c;">
                <i class="bi bi-trash-fill"></i>
            </button>
        `;
        mergeFilesList.appendChild(fileItem);
    });

    // 添加删除事件
    document.querySelectorAll('.btn-remove-merge').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 阻止冒泡
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            mergeFiles.splice(index, 1);
            updateMergeFilesList(mergeFilesList, startMergeBtn);
        });
    });
}

function startMerge(mergeModal, startMergeBtn, mergeFilesList) {
    if (mergeFiles.length === 0) return;

    const formData = new FormData();
    mergeFiles.forEach(file => {
        formData.append('files', file);
    });

    startMergeBtn.disabled = true;
    startMergeBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> 正在处理...';
    showNotification('正在上传并合并文件，请稍候...');

    fetch('/api/merge-word', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (response.ok) {
                return response.blob();
            } else {
                return response.json().then(data => {
                    throw new Error(data.message || '合并失败');
                });
            }
        })
        .then(blob => {
            // 创建下载链接
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `合并文档_${new Date().toISOString().slice(0, 10)}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showNotification('合并成功，已开始下载');

            // 重置
            mergeFiles = [];
            updateMergeFilesList(mergeFilesList, startMergeBtn);
            mergeModal.style.display = 'none';
        })
        .catch(error => {
            console.error('合并失败:', error);
            showNotification(error.message, true);
        })
        .finally(() => {
            if (startMergeBtn) {
                startMergeBtn.disabled = false;
                startMergeBtn.innerHTML = '<i class="bi bi-intersect"></i> 开始合并';
            }
        });
}
