document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
});

/**
 * Tab almashtirish logikasini boshqarish
 */
function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');

  navButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      // Faol klasslarni tozalash
      navButtons.forEach(btn => btn.classList.remove('active'));
      
      // Bosilgan tugmaga active klassini qo'shish
      button.classList.add('active');
      
      // data-tab orqali qaysi tab bosilganini aniqlash
      const tabName = button.getAttribute('data-tab');
      handleTabSwitch(tabName);
    });
  });
}

/**
 * Tab o'zgarganda bajariladigan funksiya (Kengaytirish uchun tayyor)
 * @param {string} tabName - 'garage' yoki 'winners'
 */
function handleTabSwitch(tabName) {
  console.log(`Tab switched to: ${tabName}`);
  // Bu yerga kelgusida sahifa kontentini yuklash kodini yozishingiz mumkin
}

/**
 * Dinamik ravishda badgelar sonini yangilash funksiyasi
 * @param {string} tab - 'garage' yoki 'winners'
 * @param {number|string} count - yangi qiymat
 */
function setBadge(tab, count) {
  const badge = document.getElementById(`badge-${tab}`);
  if (badge) {
    badge.textContent = count;
  }
}