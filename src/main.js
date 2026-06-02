import './style.css';
import { fetchStoreData, populateDOM, fetchFoodData, debugGoogleSheets } from './utils/dataFetcher.js';

// Theme Toggle Logic
function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle');
  const darkIcon = document.getElementById('theme-toggle-dark-icon');
  const lightIcon = document.getElementById('theme-toggle-light-icon');

  if (!toggleBtn || !darkIcon || !lightIcon) return;

  if (
    localStorage.getItem('color-theme') === 'dark' ||
    (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    document.documentElement.classList.add('dark');
    lightIcon.classList.remove('hidden');
  } else {
    document.documentElement.classList.remove('dark');
    darkIcon.classList.remove('hidden');
  }

  toggleBtn.addEventListener('click', function () {
    darkIcon.classList.toggle('hidden');
    lightIcon.classList.toggle('hidden');

    if (localStorage.getItem('color-theme')) {
      if (localStorage.getItem('color-theme') === 'light') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('color-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('color-theme', 'light');
      }
    } else {
      if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('color-theme', 'light');
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('color-theme', 'dark');
      }
    }
  });
}

function setupActionButtons(data) {
  const address = '14255 AL-69, Joppa, AL 35087';
  const phone = data?.phone || '';

  document.querySelectorAll('[data-action="route"]').forEach((btn) => {
    btn.href = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  });

  document.querySelectorAll('[data-action="call"]').forEach((btn) => {
    btn.href = `tel:${phone.replace(/[^0-9]/g, '')}`;
  });
}

// Food items section rendering
function renderFoodItems(foodItems) {
  const foodContainer = document.getElementById('food-container');
  if (!foodContainer) return;

  const images = ['/images/sandwich.png', '/images/tenders.png', '/images/burger.png'];
  foodContainer.innerHTML = '';

  foodItems.forEach((item, index) => {
    const imgSrc = images[index % images.length];
    const cardHtml = `
      <div class="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col transition-all transform hover:-translate-y-2 hover:shadow-2xl animate-fade-in-up" style="animation-delay: ${index * 0.1}s">
        <div class="h-56 overflow-hidden relative">
          <img src="${imgSrc}" alt="${item.title}" class="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
        </div>
        <div class="p-6 flex-grow flex flex-col">
          <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">${item.title}</h3>
          <p class="text-slate-600 dark:text-slate-300 mb-6 flex-grow leading-relaxed">${item.desc}</p>
          <div class="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <span class="font-extrabold text-3xl text-orange-600">${item.price}</span>
          </div>
        </div>
      </div>
    `;
    foodContainer.insertAdjacentHTML('beforeend', cardHtml);
  });
}

async function fetchWeather() {
  const tempEl = document.getElementById('weather-temp');
  const iconEl = document.getElementById('weather-icon');
  const descEl = document.getElementById('weather-desc');

  if (!tempEl || !iconEl || !descEl) return;

  try {
    const lat = 34.2981;
    const lon = -86.5592;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather fetch failed');

    const data = await res.json();
    const temp = Math.round(data.current_weather.temperature);
    const code = data.current_weather.weathercode;

    tempEl.innerHTML = `${temp}&deg;`;

    let icon = '☀️';
    let desc = 'Clear Skies';
    if (code > 0 && code <= 3) {
      icon = '⛅';
      desc = 'Partly Cloudy';
    } else if (code >= 45 && code <= 48) {
      icon = '🌫️';
      desc = 'Foggy';
    } else if (code >= 51 && code <= 67) {
      icon = '🌧️';
      desc = 'Rainy';
    } else if (code >= 71 && code <= 82) {
      icon = '❄️';
      desc = 'Snow';
    } else if (code >= 95) {
      icon = '⛈️';
      desc = 'Thunderstorms';
    }

    iconEl.textContent = icon;
    descEl.textContent = desc;
  } catch (error) {
    console.warn('Could not load weather', error);
    descEl.textContent = 'Weather unavailable';
  }
}

async function initApp() {
  console.log('[Main] Initializing application...');
  initTheme();

  // Make debug function available in console early
  window.debugApp = {
    testGoogleSheets: debugGoogleSheets,
    log: (msg) => console.log('[AppDebug]', msg)
  };
  console.log('[Main] App Debug Tools Available - Call window.debugApp.testGoogleSheets() to test Google Sheets');

  // Fetch + render store + food with very loud diagnostics.
  // This also ensures DOM population happens even if Google Sheets fails (fallback is handled in fetchers).
  try {
    console.log('[Main] Fetching Store data...');
    const storeData = await fetchStoreData();
    console.log('[Main] Store data fetched:', storeData);

    populateDOM(storeData);
    setupActionButtons(storeData);
  } catch (e) {
    console.error('[Main] Store data load threw an error (should have fallback inside fetchStoreData):', e);
  }

  // Food page
  try {
    const foodContainer = document.getElementById('food-container');
    if (foodContainer) {
      console.log('[Main] Fetching Food data...');
      const foodItems = await fetchFoodData();
      console.log('[Main] Food items fetched:', foodItems);
      // Replace the rendered list entirely to avoid showing stale DOM/cards.
      renderFoodItems(foodItems);
      // Extra safety: clear any previous cached reference.
      window.__foodItems = foodItems;

    } else {
      console.log('[Main] Food container not found on this page');
    }
  } catch (e) {
    console.error('[Main] Food data load threw an error (should have fallback inside fetchFoodData):', e);
  }

  // Weather widget (home page)
  fetchWeather();

  console.log('[Main] Application initialization complete');
}

document.addEventListener('DOMContentLoaded', initApp);

// Register Service Worker for background syncing
// Disabled by default because the project currently has no verified /src/serviceWorker.js
// and the previous error indicates the request returns HTML instead of JS.
// If you add src/serviceWorker.js, re-enable this block.
if ('serviceWorker' in navigator) {
  // no-op
}

