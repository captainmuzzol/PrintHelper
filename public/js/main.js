import { loadPrinters, getSelectedPrinter } from './modules/printer.js';
import { setupPrint, hasFiles, resetFileSelection } from './modules/print.js';
import { setupMergeFeature } from './modules/merge.js';

document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const filesList = document.getElementById('filesList');
    const printerList = document.getElementById('printerList');
    const printBtn = document.getElementById('printBtn');
    const pageRange = document.getElementById('pageRange');
    const copies = document.getElementById('copies');

    function checkPrintButtonState() {
        if (hasFiles() && getSelectedPrinter()) {
            printBtn.disabled = false;
        } else {
            printBtn.disabled = true;
        }
    }

    loadPrinters(printerList, checkPrintButtonState);
    setupPrint(uploadArea, fileInput, filesList, printBtn, pageRange, copies, checkPrintButtonState);
    setupMergeFeature();

    document.addEventListener('print-success', () => {
        resetFileSelection(uploadArea, fileInput, filesList, printBtn);
    });
});
