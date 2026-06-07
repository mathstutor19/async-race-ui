"use strict";
// ==========================================
// 2. CONFIGURATION & CONSTANTS
// ==========================================
const API_URL = 'http://localhost:3000';
const CARS_PER_PAGE = 7;
const WINNERS_PER_PAGE = 10;
const CAR_BRANDS = ['Tesla', 'BMW', 'Audi', 'Mercedes', 'Toyota', 'Ford', 'Chevrolet', 'Hyundai', 'Nissan', 'Porsche', 'Honda'];
const CAR_MODELS = ['Model S', 'M5', 'A6', 'C-Class', 'Camry', 'Mustang', 'Camaro', 'Sonata', 'Civic', '911 Carrera', 'GT-R'];
// State Management
let currentTab = 'garage';
let currentPage = 1;
let totalCars = 0;
let totalWinners = 0;
let selectedCarId = null;
let currentCarsList = [];
// Poyga holatlari
let isRaceOngoing = false;
let raceWinnerDefined = false;
let viewAbortController = null;
const animationFrames = {};
let sortField = 'id';
let sortOrder = 'ASC';
// ==========================================
// 3. DOM ELEMENTS
// ==========================================
const elements = {
    garageView: document.getElementById('garage-view'),
    winnersView: document.getElementById('winners-view'),
    garageTitle: document.getElementById('garage-title'),
    winnersTitle: document.getElementById('winners-title'),
    tracksContainer: document.getElementById('tracks-container'),
    winnersTableBody: document.getElementById('winners-table-body'),
    badgeGarage: document.getElementById('badge-garage'),
    badgeWinners: document.getElementById('badge-winners'),
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
    sortWins: document.getElementById('sort-wins'),
    sortTime: document.getElementById('sort-time'),
};
// ==========================================
// 4. CENTRALIZED API SERVICE LAYER
// ==========================================
const apiService = {
    async getCars(page, signal) {
        const res = await fetch(`${API_URL}/garage?_page=${page}&_limit=${CARS_PER_PAGE}`, { signal });
        if (!res.ok)
            throw new Error('Mashinalarni yuklab boʻlmadi');
        return {
            cars: (await res.json()),
            totalCount: Number(res.headers.get('X-Total-Count')) || 0,
        };
    },
    async getCar(id) {
        const res = await fetch(`${API_URL}/garage/${id}`);
        return res.ok ? (await res.json()) : { id, name: 'Unknown', color: '#000000' };
    },
    async createCar(name, color) {
        return fetch(`${API_URL}/garage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color }),
        });
    },
    async updateCar(id, name, color) {
        return fetch(`${API_URL}/garage/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color }),
        });
    },
    async deleteCar(id) {
        await fetch(`${API_URL}/winners/${id}`, { method: 'DELETE' }).catch(() => { });
        return fetch(`${API_URL}/garage/${id}`, { method: 'DELETE' });
    },
    async toggleEngine(id, status) {
        return fetch(`${API_URL}/engine?id=${id}&status=${status}`, { method: 'PATCH' });
    },
    async getWinners(page, sort = 'id', order = 'ASC', signal) {
        const res = await fetch(`${API_URL}/winners?_page=${page}&_limit=${WINNERS_PER_PAGE}&_sort=${sort}&_order=${order}`, { signal });
        if (!res.ok)
            throw new Error('Gʻoliblarni yuklab boʻlmadi');
        return {
            winners: (await res.json()),
            totalCount: Number(res.headers.get('X-Total-Count')) || 0,
        };
    },
    async saveWinner(id, time) {
        try {
            const res = await fetch(`${API_URL}/winners/${id}`);
            if (res.status === 200) {
                const currentWinner = (await res.json());
                const updatedWins = currentWinner.wins + 1;
                const updatedTime = time < currentWinner.time ? time : currentWinner.time;
                return await fetch(`${API_URL}/winners/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wins: updatedWins, time: updatedTime }),
                });
            }
            return await fetch(`${API_URL}/winners`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, wins: 1, time }),
            });
        }
        catch (error) {
            return fetch(`${API_URL}/winners`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, wins: 1, time }),
            });
        }
    },
};
// ==========================================
// 5. RENDERING & UI CORE
// ==========================================
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
function updateSortArrows() {
    if (elements.sortWins) {
        elements.sortWins.innerHTML = `Number of wins ${sortField === 'wins' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}`;
    }
    if (elements.sortTime) {
        elements.sortTime.innerHTML = `Best time (sec) ${sortField === 'time' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}`;
    }
}
function renderTracks() {
    if (!elements.tracksContainer)
        return;
    elements.tracksContainer.innerHTML = '';
    if (currentCarsList.length === 0) {
        elements.tracksContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#888;">🚗 No Cars Available.</div>';
        return;
    }
    currentCarsList.forEach((car) => {
        const trackRow = document.createElement('div');
        trackRow.className = 'track-row';
        trackRow.setAttribute('id', `track-row-${car.id}`);
        trackRow.innerHTML = `
      <div class="car-management">
        <button class="btn-select action-lockable" style="font-size:12px; background:#666; color:#fff;">Select</button>
        <button class="btn-delete action-lockable" style="font-size:12px; background:#dc3545; color:white;">Remove</button>
        <strong style="color: #00adb5; margin-left: 10px;">${car.name}</strong>
      </div>
      <div class="race-track">
        <button class="btn-start btn-green" id="start-engine-${car.id}" style="padding: 6px 12px; font-size: 12px;">Race</button>
        <button class="btn-stop btn-red" id="stop-engine-${car.id}" style="padding: 6px 12px; font-size: 12px;" disabled>Stop</button>
        <div class="track-line" id="line-${car.id}">
          <div class="car-container" id="car-${car.id}" style="width: 80px; height: 40px; position: absolute; left: 0; transform: translateX(0px);">
            ${getCarSVG(car.color)}
          </div>
          <div class="dots"></div>
          <span class="flag" style="position: absolute; right: 10px; font-size: 28px;">🏁</span>
        </div>
      </div>
    `;
        trackRow.querySelector('.btn-select')?.addEventListener('click', () => handleSelectCar(car));
        trackRow.querySelector('.btn-delete')?.addEventListener('click', () => void handleDeleteCar(car.id));
        trackRow.querySelector('.btn-start')?.addEventListener('click', () => void startSingleRace(car.id));
        trackRow.querySelector('.btn-stop')?.addEventListener('click', () => void stopSingleRace(car.id));
        elements.tracksContainer.appendChild(trackRow);
    });
    if (isRaceOngoing)
        setRaceActionsLock(true);
}
function updatePagination() {
    if (isRaceOngoing || !elements.pageInfo || !elements.btnPrev || !elements.btnNext)
        return;
    const limit = currentTab === 'garage' ? CARS_PER_PAGE : WINNERS_PER_PAGE;
    const total = currentTab === 'garage' ? totalCars : totalWinners;
    const totalPages = Math.ceil(total / limit) || 1;
    elements.pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
    elements.btnPrev.disabled = currentPage === 1;
    elements.btnNext.disabled = currentPage === totalPages || total === 0;
}
async function loadGarage(signal) {
    try {
        const { cars, totalCount } = await apiService.getCars(currentPage, signal);
        if (signal?.aborted)
            return;
        currentCarsList = Array.isArray(cars) ? cars : [];
        totalCars = totalCount;
        if (elements.garageTitle)
            elements.garageTitle.innerText = `Garage (${totalCars})`;
        if (elements.badgeGarage)
            elements.badgeGarage.innerText = String(totalCars);
        renderTracks();
        updatePagination();
    }
    catch (err) {
        if (err instanceof Error && err.name !== 'AbortError')
            console.error(err.message);
    }
}
async function loadWinners(signal) {
    try {
        if (!elements.winnersTableBody)
            return;
        const { winners, totalCount } = await apiService.getWinners(currentPage, sortField, sortOrder, signal);
        if (signal?.aborted)
            return;
        totalWinners = totalCount;
        if (elements.winnersTitle)
            elements.winnersTitle.innerText = `Winners (${totalWinners})`;
        if (elements.badgeWinners)
            elements.badgeWinners.innerText = String(totalWinners);
        elements.winnersTableBody.innerHTML = '';
        updateSortArrows();
        const winnersList = Array.isArray(winners) ? winners : [];
        for (let i = 0; i < winnersList.length; i++) {
            if (signal?.aborted)
                return;
            const winner = winnersList[i];
            const carData = await apiService.getCar(winner.id);
            const rowNumber = (currentPage - 1) * WINNERS_PER_PAGE + i + 1;
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${rowNumber}</td>
        <td style="width: 80px; height: 35px;">${getCarSVG(carData.color)}</td>
        <td>${carData.name}</td>
        <td>${winner.wins}</td>
        <td>${winner.time}s</td>
      `;
            elements.winnersTableBody.appendChild(tr);
        }
        updatePagination();
    }
    catch (err) {
        if (err instanceof Error && err.name !== 'AbortError')
            console.error(err.message);
    }
}
// ==========================================
// 6. ANIMATION ENGINE (Fluid & Dynamic)
// ==========================================
function animateCarRequest(id, duration) {
    const carElement = document.getElementById(`car-${id}`);
    const trackLine = document.getElementById(`line-${id}`);
    if (!carElement || !trackLine)
        return;
    const startTimestamp = performance.now();
    const maxDistance = trackLine.clientWidth - 110;
    function step(now) {
        if (!animationFrames[id])
            return;
        const elapsed = now - startTimestamp;
        const progress = Math.min(elapsed / duration, 1);
        const currentPosition = progress * maxDistance;
        carElement.style.transform = `translateX(${currentPosition}px)`;
        if (progress < 1) {
            animationFrames[id] = requestAnimationFrame(step);
        }
        else {
            animationFrames[id] = null;
        }
    }
    animationFrames[id] = requestAnimationFrame(step);
}
async function startSingleRace(id) {
    const btnStart = document.getElementById(`start-engine-${id}`);
    const btnStop = document.getElementById(`stop-engine-${id}`);
    if (!btnStart || !btnStop)
        return;
    btnStart.disabled = true;
    btnStop.disabled = false;
    try {
        const startRes = await apiService.toggleEngine(id, 'started');
        if (!startRes.ok) {
            btnStart.disabled = false;
            btnStop.disabled = true;
            return;
        }
        const { velocity, distance } = (await startRes.json());
        const duration = distance / velocity;
        const timeInSeconds = Number((duration / 1000).toFixed(2));
        animateCarRequest(id, duration);
        const drivePromise = apiService.toggleEngine(id, 'drive');
        await new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                if (isRaceOngoing && !raceWinnerDefined) {
                    raceWinnerDefined = true;
                    apiService.getCar(id).then(async (carData) => {
                        alert(`🏆 WINNER: ${carData.name} (${timeInSeconds}s)`);
                        await apiService.saveWinner(id, timeInSeconds);
                    }).catch(console.error);
                }
                resolve('finished');
            }, duration);
            drivePromise
                .then((driveRes) => {
                if (driveRes.status === 500) {
                    clearTimeout(timeoutId);
                    if (animationFrames[id])
                        cancelAnimationFrame(animationFrames[id]);
                    animationFrames[id] = null;
                    console.log(`Car [ID: ${id}] engine broke down!`);
                    resolve('broken');
                }
            })
                .catch(() => {
                clearTimeout(timeoutId);
                resolve('error');
            });
        });
    }
    catch (err) {
        console.error(err);
        btnStart.disabled = false;
        btnStop.disabled = true;
    }
}
async function stopSingleRace(id) {
    const btnStart = document.getElementById(`start-engine-${id}`);
    const btnStop = document.getElementById(`stop-engine-${id}`);
    const carElement = document.getElementById(`car-${id}`);
    if (animationFrames[id]) {
        cancelAnimationFrame(animationFrames[id]);
        animationFrames[id] = null;
    }
    try {
        await apiService.toggleEngine(id, 'stopped');
        if (carElement)
            carElement.style.transform = 'translateX(0px)';
        if (btnStart)
            btnStart.disabled = false;
        if (btnStop)
            btnStop.disabled = true;
    }
    catch (err) {
        console.error(err);
    }
}
// ==========================================
// 7. ACTIONS DURING THE RACE (Locking)
// ==========================================
function setRaceActionsLock(isLock) {
    const lockableElements = document.querySelectorAll('.action-lockable');
    lockableElements.forEach((el) => {
        el.disabled = isLock;
    });
    if (elements.createName)
        elements.createName.disabled = isLock;
    if (elements.btnCreate)
        elements.btnCreate.disabled = isLock;
    if (elements.btnGenerate)
        elements.btnGenerate.disabled = isLock;
    if (elements.btnPrev)
        elements.btnPrev.disabled = isLock;
    if (elements.btnNext)
        elements.btnNext.disabled = isLock;
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach((btn) => {
        btn.style.pointerEvents = isLock ? 'none' : 'auto';
    });
    if (!isLock)
        updatePagination();
}
// ==========================================
// 8. EVENT HANDLERS & TAB SWITCH
// ==========================================
function handleTabSwitch(tabName) {
    if (viewAbortController) {
        viewAbortController.abort();
    }
    viewAbortController = new AbortController();
    const { signal } = viewAbortController;
    currentTab = tabName;
    currentPage = 1;
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach((btn) => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
        else {
            btn.classList.remove('active');
        }
    });
    if (currentTab === 'garage') {
        if (elements.garageView)
            elements.garageView.style.display = 'block';
        if (elements.winnersView)
            elements.winnersView.style.display = 'none';
        void loadGarage(signal);
    }
    else {
        if (elements.garageView)
            elements.garageView.style.display = 'none';
        if (elements.winnersView)
            elements.winnersView.style.display = 'block';
        void loadWinners(signal);
    }
}
function toggleSort(field) {
    if (sortField === field) {
        sortOrder = sortOrder === 'ASC' ? 'DESC' : 'ASC';
    }
    else {
        sortField = field;
        sortOrder = 'ASC';
    }
    currentPage = 1;
    void loadWinners(viewAbortController?.signal);
}
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const tabName = (button.getAttribute('data-tab') ?? 'garage');
            handleTabSwitch(tabName);
        });
    });
    elements.sortWins?.addEventListener('click', () => toggleSort('wins'));
    elements.sortTime?.addEventListener('click', () => toggleSort('time'));
}
function handleSelectCar(car) {
    selectedCarId = car.id;
    if (elements.updateName) {
        elements.updateName.value = car.name;
        elements.updateName.disabled = false;
    }
    if (elements.updateColor) {
        elements.updateColor.value = car.color;
        elements.updateColor.disabled = false;
    }
    if (elements.btnUpdate)
        elements.btnUpdate.disabled = false;
}
async function handleDeleteCar(id) {
    if (animationFrames[id])
        cancelAnimationFrame(animationFrames[id]);
    await apiService.deleteCar(id);
    if (currentCarsList.length === 1 && currentPage > 1)
        currentPage--;
    void loadGarage(viewAbortController?.signal);
}
// Ommaviy Poyga boshlash
elements.btnRace?.addEventListener('click', async () => {
    if (currentCarsList.length === 0)
        return;
    isRaceOngoing = true;
    raceWinnerDefined = false;
    if (elements.btnRace)
        elements.btnRace.disabled = true;
    if (elements.btnReset)
        elements.btnReset.disabled = false;
    setRaceActionsLock(true);
    const racePromises = currentCarsList.map((car) => startSingleRace(car.id));
    await Promise.allSettled(racePromises);
    isRaceOngoing = false;
    setRaceActionsLock(false);
    if (elements.btnRace)
        elements.btnRace.disabled = false;
});
// Ommaviy Reset
elements.btnReset?.addEventListener('click', () => {
    isRaceOngoing = false;
    raceWinnerDefined = false;
    if (elements.btnRace)
        elements.btnRace.disabled = false;
    if (elements.btnReset)
        elements.btnReset.disabled = true;
    setRaceActionsLock(false);
    currentCarsList.forEach((car) => void stopSingleRace(car.id));
});
elements.btnCreate?.addEventListener('click', async () => {
    if (!elements.createName || !elements.createColor)
        return;
    const name = elements.createName.value.trim();
    const color = elements.createColor.value;
    if (!name || name.length > 25)
        return;
    await apiService.createCar(name, color);
    elements.createName.value = '';
    void loadGarage(viewAbortController?.signal);
});
elements.btnUpdate?.addEventListener('click', async () => {
    if (!selectedCarId || !elements.updateName || !elements.updateColor)
        return;
    const name = elements.updateName.value.trim();
    if (!name || name.length > 25)
        return;
    await apiService.updateCar(selectedCarId, name, elements.updateColor.value);
    elements.updateName.value = '';
    elements.updateName.disabled = true;
    elements.updateColor.disabled = true;
    if (elements.btnUpdate)
        elements.btnUpdate.disabled = true;
    selectedCarId = null;
    void loadGarage(viewAbortController?.signal);
});
elements.btnGenerate?.addEventListener('click', async () => {
    const promises = Array.from({ length: 100 }).map(() => {
        const brand = CAR_BRANDS[Math.floor(Math.random() * CAR_BRANDS.length)];
        const model = CAR_MODELS[Math.floor(Math.random() * CAR_MODELS.length)];
        const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        return apiService.createCar(`${brand} ${model}`, color);
    });
    await Promise.all(promises);
    void loadGarage(viewAbortController?.signal);
});
// ==========================================
// 9. PAGINATION HANDLERS
// ==========================================
elements.btnPrev?.addEventListener('click', () => {
    if (currentPage > 1 && !isRaceOngoing) {
        currentPage--;
        const signal = viewAbortController?.signal;
        if (currentTab === 'garage') {
            void loadGarage(signal);
        }
        else {
            void loadWinners(signal);
        }
    }
});
elements.btnNext?.addEventListener('click', () => {
    const limit = currentTab === 'garage' ? CARS_PER_PAGE : WINNERS_PER_PAGE;
    const total = currentTab === 'garage' ? totalCars : totalWinners;
    if (currentPage < Math.ceil(total / limit) && !isRaceOngoing) {
        currentPage++;
        const signal = viewAbortController?.signal;
        if (currentTab === 'garage') {
            void loadGarage(signal);
        }
        else {
            void loadWinners(signal);
        }
    }
});
// Dasturni ishga tushirish
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    viewAbortController = new AbortController();
    void loadGarage(viewAbortController.signal);
    apiService
        .getWinners(1, sortField, sortOrder, viewAbortController.signal)
        .then((res) => {
        if (elements.badgeWinners)
            elements.badgeWinners.innerText = String(res.totalCount);
    })
        .catch((err) => console.error(err));
});
