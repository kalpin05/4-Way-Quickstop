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
function renderFoodItems(foodItems, filterCategory = 'all', searchQuery = '') {
  const foodContainer = document.getElementById('food-container');
  if (!foodContainer) return;

  const images = ['/images/sandwich.png', '/images/tenders.png', '/images/burger.png'];
  foodContainer.innerHTML = '';
  
  const query = searchQuery.toLowerCase();

  let renderedCount = 0;
  foodItems.forEach((item, index) => {
    // Apply filters
    if (filterCategory !== 'all' && item.category !== filterCategory) return;
    if (query && !item.title.toLowerCase().includes(query) && !item.desc.toLowerCase().includes(query)) return;
    
    renderedCount++;

    let priceHtml = `<span class="font-extrabold text-3xl text-orange-600">${item.price}</span>`;
    
    if (item.options && item.options.length > 0) {
      let optionsHtml = item.options.map(opt => `<option value="${opt.price}">${opt.name}</option>`).join('');
      priceHtml = `
        <div class="flex items-center gap-3">
          <select 
            onchange="document.getElementById('price-${index}').innerText = this.value"
            class="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1 text-sm font-semibold focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
          >
            ${optionsHtml}
          </select>
          <span id="price-${index}" class="font-extrabold text-3xl text-orange-600">${item.options[0].price}</span>
        </div>
      `;
    }

    const imgSrc = item.imageUrl ? item.imageUrl : images[index % images.length];
    const cardHtml = `
      <div class="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col transition-all transform hover:-translate-y-2 hover:shadow-2xl animate-fade-in-up" style="animation-delay: ${renderedCount * 0.05}s">
        <div class="h-56 overflow-hidden relative">
          <img src="${imgSrc}" alt="${item.title}" class="w-full h-full object-cover transition-transform duration-700 hover:scale-110" onerror="this.src='/images/burger.png'" />
        </div>
        <div class="p-6 flex-grow flex flex-col">
          <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">${item.title}</h3>
          <p class="text-slate-600 dark:text-slate-300 mb-6 flex-grow leading-relaxed">${item.desc}</p>
          <div class="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
            ${priceHtml}
          </div>
        </div>
      </div>
    `;
    foodContainer.insertAdjacentHTML('beforeend', cardHtml);
  });
  
  if (renderedCount === 0) {
    foodContainer.innerHTML = `<div class="col-span-full text-center py-12 text-slate-500 dark:text-slate-400 text-lg">No items found matching your search.</div>`;
  }
}

function setupFoodFilters() {
  const searchInput = document.getElementById('food-search');
  const filterContainer = document.getElementById('food-filters');
  
  if (!searchInput || !filterContainer) return;
  
  // Dynamically generate filter buttons
  const items = window.latestFoodItems || [];
  const categories = new Set();
  items.forEach(item => {
    if (item.category && item.category !== 'all') {
      categories.add(item.category);
    }
  });

  // Rebuild container
  let buttonsHtml = `<button data-filter="all" class="px-6 py-2 rounded-full text-sm font-bold bg-orange-600 text-white shadow-md transition-all">All Items</button>`;
  
  Array.from(categories).sort().forEach(cat => {
    const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1);
    buttonsHtml += `<button data-filter="${cat}" class="px-6 py-2 rounded-full text-sm font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-500 hover:text-orange-500 transition-all">${formattedCat}</button>`;
  });
  
  filterContainer.innerHTML = buttonsHtml;
  
  window.currentFoodCategory = 'all';
  window.currentFoodQuery = '';
  
  // Search Input listener
  searchInput.addEventListener('input', (e) => {
    window.currentFoodQuery = e.target.value;
    renderFoodItems(window.latestFoodItems || [], window.currentFoodCategory, window.currentFoodQuery);
  });
  
  // Category Buttons listener
  filterContainer.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      const btn = e.target;
      window.currentFoodCategory = btn.getAttribute('data-filter') || 'all';
      
      // Update active button styling
      filterContainer.querySelectorAll('button').forEach(b => {
        b.className = 'px-6 py-2 rounded-full text-sm font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-500 hover:text-orange-500 transition-all';
      });
      btn.className = 'px-6 py-2 rounded-full text-sm font-bold bg-orange-600 text-white shadow-md transition-all';
      
      renderFoodItems(window.latestFoodItems || [], window.currentFoodCategory, window.currentFoodQuery);
    }
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

async function loadAllData(isInitial = false) {
  // Store Data
  try {
    if (isInitial) console.log('[Main] Fetching Store data...');
    const storeData = await fetchStoreData();
    populateDOM(storeData);
    if (isInitial) setupActionButtons(storeData);
  } catch (e) {
    console.error('[Main] Store data load threw an error:', e);
  }

  // Food page
  try {
    const foodContainer = document.getElementById('food-container');
    if (foodContainer) {
      if (isInitial) console.log('[Main] Fetching Food data...');
      const foodItems = await fetchFoodData();
      window.latestFoodItems = foodItems;
      renderFoodItems(foodItems, window.currentFoodCategory || 'all', window.currentFoodQuery || '');
      
      if (isInitial) setupFoodFilters();
    }
  } catch (e) {
    console.error('[Main] Food data load threw an error:', e);
  }

  // Deals page
  try {
    const dealsContainer = document.getElementById('deals-container');
    if (dealsContainer) {
      import('./utils/dataFetcher.js').then(async (mod) => {
        if (mod.fetchDealsData) {
          if (isInitial) console.log('[Main] Fetching Deals data...');
          const deals = await mod.fetchDealsData();
          renderDealsItems(deals);
        }
      });
    }
  } catch(e) {
    console.error('[Main] Deals data load threw an error:', e);
  }

  // Store Products page
  try {
    const storeProductsContainer = document.getElementById('store-products-container');
    if (storeProductsContainer) {
      import('./utils/dataFetcher.js').then(async (mod) => {
        if (mod.fetchStoreProductsData) {
          if (isInitial) console.log('[Main] Fetching Store Products data...');
          const products = await mod.fetchStoreProductsData();
          renderStoreProducts(products);
        }
      });
    }
  } catch(e) {
    console.error('[Main] Store Products data load threw an error:', e);
  }
}

function renderStoreProducts(products) {
  const container = document.getElementById('store-products-container');
  if (!container) return;
  
  const defaultImages = ['/images/coffee.png', '/images/snacks.png', '/images/drinks.png'];
  container.innerHTML = '';
  
  if (!products || products.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-12 text-slate-500 dark:text-slate-400 text-lg">No products available at the moment.</div>`;
    return;
  }
  
  products.forEach((product, index) => {
    let optionsHtml = '';
    let defaultPrice = '';
    
    if (product.flavours && product.flavours.length > 0) {
      optionsHtml = product.flavours.map((opt, i) => `<option value="${opt.price}">${opt.name}</option>`).join('');
      defaultPrice = product.flavours[0].price;
    }
    
    const imgSrc = product.imageUrl ? product.imageUrl : defaultImages[index % defaultImages.length];
    
    const cardHtml = `
      <div class="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col transition-all transform hover:-translate-y-2 hover:shadow-2xl animate-fade-in-up" style="animation-delay: ${index * 0.1}s">
        <div class="h-64 overflow-hidden relative">
          <img src="${imgSrc}" alt="${product.name}" class="w-full h-full object-cover transition-transform duration-700 hover:scale-110" onerror="this.src='/images/snacks.png'" />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-6">
            <h3 class="text-2xl font-bold text-white tracking-wide">${product.name}</h3>
          </div>
        </div>
        <div class="p-6 flex-grow flex flex-col justify-between">
          <p class="text-slate-600 dark:text-slate-300 mb-4">Select your flavor:</p>
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <select 
              onchange="document.getElementById('store-price-${index}').innerText = this.value"
              class="w-full sm:w-auto bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
            >
              ${optionsHtml}
            </select>
            <span id="store-price-${index}" class="font-extrabold text-2xl text-orange-600">${defaultPrice}</span>
          </div>
        </div>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', cardHtml);
  });
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

  // Load all data immediately
  await loadAllData(true);

  // Weather widget (home page)
  fetchWeather();

  // Set up 30 second polling
  setInterval(() => {
    console.log('[Main] Auto-refreshing data from Google Sheets (30s interval)...');
    loadAllData(false);
  }, 30000);

  console.log('[Main] Application initialization complete');
}

function renderDealsItems(deals) {
  const container = document.getElementById('deals-container');
  if (!container) return;
  container.innerHTML = '';
  
  deals.forEach((deal, index) => {
    const imgSrc = deal.imageUrl || '/images/tenders.png'; // Fallback
    const cardHtml = `
      <div class="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col transition-all transform hover:-translate-y-2 hover:shadow-2xl animate-fade-in-up" style="animation-delay: ${index * 0.1}s">
        <div class="h-56 overflow-hidden relative group">
          <img src="${imgSrc}" alt="${deal.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" onerror="this.src='/images/sandwich.png'" />
          <div class="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full font-bold shadow-md animate-pulse">HOT DEAL</div>
        </div>
        <div class="p-6 flex-grow flex flex-col">
          <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">${deal.title}</h3>
          <p class="text-slate-600 dark:text-slate-300 mb-6 flex-grow leading-relaxed">${deal.desc}</p>
          <div class="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <div>
              <span class="text-sm text-slate-400 line-through mr-2">${deal.originalPrice}</span>
              <span class="font-extrabold text-3xl text-orange-600">${deal.price}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', cardHtml);
  });
}

document.addEventListener('DOMContentLoaded', initApp);

// Register Service Worker for background syncing
// Disabled by default because the project currently has no verified /src/serviceWorker.js
// and the previous error indicates the request returns HTML instead of JS.
// If you add src/serviceWorker.js, re-enable this block.
if ('serviceWorker' in navigator) {
  // no-op
}

