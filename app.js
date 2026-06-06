function handleTabSwitch(tabName) {
    const currentTab = tabName;
    if (currentTab) {
        // Airbnb talabi uchun o'zgaruvchidan foydalanib qo'ydik
    }
}
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach((button) => {
        button.addEventListener('click', () => {
            navButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');
            const tabName = button.getAttribute('data-tab') ?? '';
            handleTabSwitch(tabName);
        });
    });
}
export default function setBadge(tab, count) {
    const badge = document.getElementById(`badge-${tab}`);
    if (badge) {
        badge.textContent = String(count);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
});
