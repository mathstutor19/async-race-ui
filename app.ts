function handleTabSwitch(tabName: string): void {
  const currentTab = tabName;
  if (currentTab) {
    // Airbnb talabi uchun o'zgaruvchidan foydalanib qo'ydik
  }
}

function initNavigation(): void {
  const navButtons = document.querySelectorAll<HTMLButtonElement>('.nav-btn');

  navButtons.forEach((button: HTMLButtonElement): void => {
    button.addEventListener('click', (): void => {
      navButtons.forEach((btn: HTMLButtonElement): void => btn.classList.remove('active'));

      button.classList.add('active');

      const tabName: string = button.getAttribute('data-tab') ?? '';
      handleTabSwitch(tabName);
    });
  });
}

export default function setBadge(tab: string, count: number | string): void {
  const badge = document.getElementById(`badge-${tab}`) as HTMLSpanElement | null;
  if (badge) {
    badge.textContent = String(count);
  }
}

document.addEventListener('DOMContentLoaded', (): void => {
  initNavigation();
});
