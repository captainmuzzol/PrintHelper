import { showNotification } from './utils.js';

let selectedPrinter = null;

export function getSelectedPrinter() {
    return selectedPrinter;
}

export function loadPrinters(printerListElement, checkPrintButtonState) {
    fetch('/api/printers')
        .then(response => response.json())
        .then(printers => {
            printerListElement.innerHTML = '';

            printers.forEach(printer => {
                const printerElement = document.createElement('div');
                printerElement.className = 'printer-option';
                printerElement.dataset.printerId = printer.id;

                if (printer.disabled) {
                    printerElement.classList.add('disabled');
                    printerElement.innerHTML = `
                        <i class="bi bi-printer-x"></i>
                        <p>${printer.name}</p>
                        <p style="font-size: 0.8rem; color: #e74c3c;">(此打印机已禁用)</p>
                    `;
                } else {
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
                }

                printerListElement.appendChild(printerElement);
            });

            checkLastPrinter();
        })
        .catch(error => {
            console.error('加载打印机列表失败:', error);
            showNotification('加载打印机列表失败，请刷新页面重试', true);
        });
}

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
