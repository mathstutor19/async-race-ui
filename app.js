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

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const API_URL = 'http://localhost:3000';
const CARS_PER_PAGE = 7;

const CAR_BRANDS = ['Tesla', 'BMW', 'Audi', 'Mercedes', 'Toyota', 'Ford', 'Chevrolet', 'Hyundai'];
const CAR_MODELS = ['Model S', 'M5', 'A6', 'C-Class', 'Camry', 'Mustang', 'Camaro', 'Sonata'];

// State Management
let currentPage = 1;
let totalCars = 0;
let selectedCarId = null;
let currentCarsList = [];

// ==========================================
// DOM ELEMENTS
// ==========================================
const elements = {
  garageTitle: document.getElementById('garage-title'),
  tracksContainer: document.getElementById('tracks-container'),
  createName: document.getElementById('create-name'),
  createColor: document.getElementById('create-color'),
  btnCreate: document.getElementById('btn-create'),
  updateName: document.getElementById('update-name'),
  updateColor: document.getElementById('update-color'),
  btnUpdate: document.getElementById('btn-update'),
  btnRace: document.getElementById('btn-race'),
  btnReset: document.getElementById('btn-reset'),
  btnGenerate: document.getElementById('btn-generate'),
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  pageInfo: document.getElementById('page-info'),
};

// ==========================================
// API SERVICE LAYER
// ==========================================
const apiService = {
  async getCars(page) {
    const res = await fetch(`${API_URL}/garage?_page=${page}&_limit=${CARS_PER_PAGE}`);
    if (!res.ok) throw new Error('Mashinalarni yuklab boʻlmadi');
    return {
      cars: await res.json(),
      totalCount: Number(res.headers.get('X-Total-Count')) || 0
    };
  },
  async createCar(name, color) {
    return fetch(`${API_URL}/garage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color })
    });
  },
  async updateCar(id, name, color) {
    return fetch(`${API_URL}/garage/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color })
    });
  },
  async deleteCar(id) {
    return fetch(`${API_URL}/garage/${id}`, { method: 'DELETE' });
  },
  async toggleEngine(id, status) {
    const res = await fetch(`${API_URL}/engine?id=${id}&status=${status}`, { method: 'PATCH' });
    return res;
  }
};

// ==========================================
// CORE FUNCTIONS (LOGIC & RENDER)
// ==========================================
async function loadGarage() {
  try {
    const { cars, totalCount } = await apiService.getCars(currentPage);
    currentCarsList = cars;
    totalCars = totalCount;
    
    elements.garageTitle.innerText = `Garage (${totalCars})`;
    renderTracks();
    updatePagination();
  } catch (err) {
    console.error(err.message);
  }
}

function getCarSVG(color) {
  return `
    <svg viewBox="0 0 100 40" width="100%" height="100%">
      <path d="M10,25 L25,10 L70,10 L85,25 L95,25 L95,33 L5,33 L5,25 Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      <rect x="30" y="14" width="15" height="8" fill="#e0f7fa" />
      <rect x="50" y="14" width="15" height="8" fill="#e0f7fa" />
      <circle cx="25" cy="33" r="7" fill="#000" stroke="#fff" stroke-width="2"/>
      <circle cx="75" cy="33" r="7" fill="#000" stroke="#fff" stroke-width="2"/>
    </svg>
  `;
}

function renderTracks() {
  elements.tracksContainer.innerHTML = '';

  currentCarsList.forEach(car => {
    const trackRow = document.createElement('div');
    trackRow.className = 'track-row';

    trackRow.innerHTML = `
      <div class="car-management">
        <button class="btn-select" style="font-size:12px; background:#666; color:#fff;">Select</button>
        <button class="btn-delete" style="font-size:12px; background:#dc3545; color:white;">Remove</button>
        <strong style="color: #00adb5; margin-left: 10px;">${car.name}</strong>
      </div>
      <div class="race-track">
        <button class="btn-start btn-green" style="padding: 6px 12px; font-size: 12px;">Race</button>
        <button class="btn-stop btn-red" style="padding: 6px 12px; font-size: 12px;" disabled>Stop</button>
        <div class="track-line" id="line-${car.id}">
          <div class="car-container" id="car-${car.id}" style="width: 80px; height: 40px; position: absolute; left: 0;">
            ${getCarSVG(car.color)}
          </div>
          <div class="dots"></div>
          <span class="flag" style="position: absolute; right: 10px; font-size: 28px;">🏁</span>
        </div>
      </div>
    `;

    // Tugmalarga hodisalarni xavfsiz biriktirish (No window global pollution)
    trackRow.querySelector('.btn-select').addEventListener('click', () => handleSelectCar(car));
    trackRow.querySelector('.btn-delete').addEventListener('click', () => handleDeleteCar(car.id));
    trackRow.querySelector('.btn-start').addEventListener('click', () => startSingleRace(car.id));
    trackRow.querySelector('.btn-stop').addEventListener('click', () => stopSingleRace(car.id));

    elements.tracksContainer.appendChild(trackRow);
  });
}

// ==========================================
// POYGA SIMULYATSIYASI
// ==========================================
async function startSingleRace(id) {
  const btnStart = document.getElementById(`line-${id}`).closest('.race-track').querySelector('.btn-start');
  const btnStop = document.getElementById(`line-${id}`).closest('.race-track').querySelector('.btn-stop');
  
  btnStart.disabled = true;
  btnStop.disabled = false;

  try {
    const startRes = await apiService.toggleEngine(id, 'started');
    const { velocity, distance } = await startRes.json();
    const duration = distance / velocity;

    const carElement = document.getElementById(`car-${id}`);
    const trackLine = document.getElementById(`line-${id}`);
    const travelDistance = trackLine.clientWidth - 120; // 80px car + bufer

    carElement.style.transition = `transform ${duration}ms linear`;
    carElement.style.transform = `translateX(${travelDistance}px)`;

    // Drive holati tekshiruvi (Dvigatel buzilish xavfi)
    const driveRes = await apiService.toggleEngine(id, 'drive');
    if (driveRes.status === 500) {
      const computedStyle = window.getComputedStyle(carElement);
      const matrix = new WebKitCSSMatrix(computedStyle.transform);
      carElement.style.transition = 'none';
      carElement.style.transform = `translateX(${matrix.m41}px)`;
    }
  } catch (err) {
    console.error(err);
  }
}

async function stopSingleRace(id) {
  const btnStart = document.getElementById(`line-${id}`).closest('.race-track').querySelector('.btn-start');
  const btnStop = document.getElementById(`line-${id}`).closest('.race-track').querySelector('.btn-stop');
  
  btnStart.disabled = false;
  btnStop.disabled = true;

  try {
    await apiService.toggleEngine(id, 'stopped');
    const carElement = document.getElementById(`car-${id}`);
    carElement.style.transition = 'none';
    carElement.style.transform = 'translateX(0px)';
  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// EVENT HANDLERS & CRUD
// ==========================================
function handleSelectCar(car) {
  selectedCarId = car.id;
  elements.updateName.value = car.name;
  elements.updateColor.value = car.color;
  
  elements.updateName.disabled = false;
  elements.updateColor.disabled = false;
  elements.btnUpdate.disabled = false;
}

async function handleDeleteCar(id) {
  await apiService.deleteCar(id);
  loadGarage();
}

elements.btnCreate.addEventListener('click', async () => {
  const name = elements.createName.value.trim();
  const color = elements.createColor.value;
  if (!name) return;

  await apiService.createCar(name, color);
  elements.createName.value = '';
  loadGarage();
});

elements.btnUpdate.addEventListener('click', async () => {
  if (!selectedCarId) return;
  const name = elements.updateName.value.trim();
  const color = elements.updateColor.value;

  await apiService.updateCar(selectedCarId, name, color);
  
  elements.updateName.value = '';
  elements.updateName.disabled = true;
  elements.updateColor.disabled = true;
  elements.btnUpdate.disabled = true;
  selectedCarId = null;
  loadGarage();
});

elements.btnGenerate.addEventListener('click', async () => {
  const promises = Array.from({ length: 100 }).map(() => {
    const brand = CAR_BRANDS[Math.floor(Math.random() * CAR_BRANDS.length)];
    const model = CAR_MODELS[Math.floor(Math.random() * CAR_MODELS.length)];
    const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    return apiService.createCar(`${brand} ${model}`, color);
  });

  await Promise.all(promises);
  loadGarage();
});

// ==========================================
// GLOBAL CONTROLS & PAGINATION
// ==========================================
elements.btnRace.addEventListener('click', () => {
  currentCarsList.forEach(car => startSingleRace(car.id));
});

elements.btnReset.addEventListener('click', () => {
  currentCarsList.forEach(car => stopSingleRace(car.id));
});

function updatePagination() {
  const totalPages = Math.ceil(totalCars / CARS_PER_PAGE) || 1;
  elements.pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
  elements.btnPrev.disabled = currentPage === 1;
  elements.btnNext.disabled = currentPage === totalPages || totalCars === 0;
}

elements.btnPrev.addEventListener('click', () => {
  if (currentPage > 1) { currentPage--; loadGarage(); }
});

elements.btnNext.addEventListener('click', () => {
  if (currentPage < Math.ceil(totalCars / CARS_PER_PAGE)) { currentPage++; loadGarage(); }
});

// Start Dastur
loadGarage();