export function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    if (!notification || !notificationText) return;

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
