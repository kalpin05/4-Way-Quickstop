import './style.css';
import { fetchStoreData, populateDOM, fetchFoodData, debugGoogleSheets } from './utils/dataFetcher.js';
import { initRouter } from './router.js';
import { registerSW } from 'virtual:pwa-register';

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
    toggleBtn.classList.add('is-dark');
  } else {
    document.documentElement.classList.remove('dark');
    toggleBtn.classList.remove('is-dark');
  }

  toggleBtn.addEventListener('click', function () {
    toggleBtn.classList.toggle('is-dark');

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

function parseStoreStatus(hoursStr) {
  if (!hoursStr) return null;
  const s = hoursStr.toLowerCase();
  if (s.includes('24 hour') || s.includes('24/7') || s.includes('open 24')) return true;

  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/ig;
  const matches = [...s.matchAll(timeRegex)];
  
  if (matches.length >= 2) {
    const parseTime = (match) => {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2] || '0', 10);
      const ampm = (match[3] || '').toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      return h * 60 + m;
    };
    
    const startMins = parseTime(matches[0]);
    const endMins = parseTime(matches[1]);
    
    try {
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: 'numeric', hour12: false });
      const parts = formatter.formatToParts(new Date());
      const currentH = parseInt(parts.find(p => p.type === 'hour').value, 10);
      const currentM = parseInt(parts.find(p => p.type === 'minute').value, 10);
      const currentMins = currentH * 60 + currentM;
      
      if (startMins < endMins) {
        return currentMins >= startMins && currentMins < endMins;
      } else {
        return currentMins >= startMins || currentMins < endMins;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

function updateStoreStatusBadge(hoursStr) {
  if (!hoursStr) return;
  const headerDiv = document.querySelector('header .flex.items-center.space-x-4');
  if (!headerDiv) return;
  
  let badge = document.getElementById('store-status-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'store-status-badge';
    headerDiv.insertBefore(badge, headerDiv.firstChild);
  }

  const isOpen = parseStoreStatus(hoursStr);
  if (isOpen === true) {
    badge.innerHTML = '<span class="flex items-center gap-1.5 bg-green-900/40 text-green-400 border border-green-500/30 px-3 py-1 rounded-full font-bold text-xs shadow-sm"><div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> OPEN</span>';
  } else if (isOpen === false) {
    badge.innerHTML = '<span class="flex items-center gap-1.5 bg-red-900/40 text-red-400 border border-red-500/30 px-3 py-1 rounded-full font-bold text-xs shadow-sm"><div class="w-2 h-2 rounded-full bg-red-500"></div> CLOSED</span>';
  } else {
    badge.innerHTML = `<span class="hidden md:inline-block text-xs text-slate-400 font-medium whitespace-nowrap">Hours: ${hoursStr}</span>`;
  }
}

function setupActionButtons(data) {
  const address = '14255 AL-69, Joppa, AL 35087';
  const phone = data?.phone || '';
  const hours = data?.hours || '';

  if (hours) updateStoreStatusBadge(hours);

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
    if (filterCategory !== 'all' && (!item.category || item.category.replace(/[^a-zA-Z0-9 ]/g, '').trim().toLowerCase() !== filterCategory)) return;
    if (query && !item.title.toLowerCase().includes(query) && !item.desc.toLowerCase().includes(query)) return;
    
    renderedCount++;

    let priceHtml = `<span class="font-extrabold text-3xl text-orange-400 drop-shadow-sm">${item.price}</span>`;
    
    if (item.options && item.options.length > 0) {
      let optionsHtml = item.options.map(opt => `<option value="${opt.price}">${opt.name}</option>`).join('');
      priceHtml = `
        <div class="flex items-center gap-3">
          <div class="relative custom-dropdown-container">
            <button 
              type="button" 
              class="custom-dropdown-btn flex items-center justify-between min-w-[120px] bg-white/20 text-white border border-white/20 rounded-lg px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer shadow-sm transition-colors backdrop-blur-md hover:bg-white/30"
            >
              <span class="dropdown-selected-text">${item.options[0].name}</span>
              <svg class="w-4 h-4 ml-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <div class="custom-dropdown-menu absolute z-50 mt-2 w-full bg-slate-800/95 border border-white/20 rounded-lg shadow-xl backdrop-blur-xl overflow-hidden hidden">
              ${item.options.map(opt => `<div class="dropdown-item px-3 py-2 text-sm font-semibold text-white hover:bg-orange-500 hover:text-white cursor-pointer transition-colors" data-price="${opt.price}" data-target="price-${index}">${opt.name}</div>`).join('')}
            </div>
          </div>
          <span id="price-${index}" class="font-extrabold text-3xl text-orange-400 drop-shadow-sm">${item.options[0].price}</span>
        </div>
      `;
    }

    const imgSrc = item.imageUrl ? item.imageUrl : images[index % images.length];
    const cardHtml = `
      <div class="bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg border border-white/20 flex flex-col transition-all duration-300 transform hover:-translate-y-2 hover:shadow-orange-500/30 hover:border-orange-500/50 group reveal-on-scroll" style="transition-delay: ${renderedCount * 0.05}s">
        <div class="h-56 overflow-hidden relative">
          <img src="${imgSrc}" alt="${item.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" onerror="this.src='/images/burger.png'" />
        </div>
        <div class="p-6 flex-grow flex flex-col">
          <h3 class="text-2xl font-bold text-white mb-2 tracking-tight drop-shadow-sm">${item.title}</h3>
          <p class="text-white/80 mb-6 flex-grow leading-relaxed">${item.desc}</p>
          <div class="mt-auto pt-4 border-t border-white/10 flex justify-between items-center">
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
  if (window.initScrollAnimations) window.initScrollAnimations();
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
  let buttonsHtml = `<button data-filter="all" class="px-6 py-2 rounded-full text-sm font-bold bg-orange-500 text-white border border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-all">All Items</button>`;
  
  Array.from(categories).sort().forEach(cat => {
    const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1);
    buttonsHtml += `<button data-filter="${cat}" class="px-6 py-2 rounded-full text-sm font-bold bg-white/10 backdrop-blur-md text-white/80 border border-white/20 hover:border-orange-500 hover:text-white hover:bg-orange-500/20 transition-all">${formattedCat}</button>`;
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
        b.className = 'px-6 py-2 rounded-full text-sm font-bold bg-white/10 backdrop-blur-md text-white/80 border border-white/20 hover:border-orange-500 hover:text-white hover:bg-orange-500/20 transition-all';
      });
      btn.className = 'px-6 py-2 rounded-full text-sm font-bold bg-orange-500 text-white border border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-all';
      
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
  if (isInitial) window.loaderStartTime = Date.now();
  // Store Data
  try {
    if (isInitial) console.log('[Main] Fetching Store data...');
    const storeData = await fetchStoreData();
    populateDOM(storeData);
    if (isInitial) setupActionButtons(storeData);
    
    // Dynamic Fuel Logic
    updateDynamicMarquee(storeData);
    const fuelContainer = document.getElementById('fuel-container');
    if (fuelContainer) {
      renderFuelItems(storeData);
    }
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

  if (isInitial) {
    const elapsed = Date.now() - window.loaderStartTime;
    const remaining = Math.max(0, 1000 - elapsed);
    setTimeout(() => {
      const loader = document.getElementById('global-loader');
      if (loader) {
        loader.classList.add('opacity-0');
        setTimeout(() => loader.remove(), 700);
      }
    }, remaining);
  }
}

function updateDynamicMarquee(storeData) {
  const marquee = document.getElementById('dynamic-marquee');
  if (!marquee || !storeData.fuelList || storeData.fuelList.length === 0) return;

  // We want to loop the content a few times so the marquee scrolls smoothly
  let contentHtml = '';
  
  for (let i = 0; i < 4; i++) {
    storeData.fuelList.forEach(fuel => {
      let icon = '⛽';
      if (fuel.id.toLowerCase() === 'premium') icon = '⚡';
      if (fuel.id.toLowerCase() === 'diesel') icon = '🚚';
      
      const statusText = fuel.status ? fuel.status.trim() : '';
      const isOutOfStock = statusText.toLowerCase().includes('out');
      const displayPrice = isOutOfStock ? '<span class="text-red-500 line-through">' + fuel.price + '</span> <span class="text-red-500 font-bold ml-1">OUT OF STOCK</span>' : fuel.price;

      contentHtml += `<span>${icon} ${fuel.id.toUpperCase()}: <span class="text-green-400">${displayPrice}</span></span>`;
    });
    contentHtml += `<span class="text-yellow-400">🎉 SNEAD LIQUOIR STORE (OPENING SOON)</span>`;
  }
  marquee.innerHTML = contentHtml;
}

function renderFuelItems(storeData) {
  const container = document.getElementById('fuel-container');
  if (!container) return;

  if (!storeData.fuelList || storeData.fuelList.length === 0) {
    container.innerHTML = '<p class="text-center text-slate-400 col-span-full">Loading fuel rates...</p>';
    return;
  }

  container.innerHTML = storeData.fuelList.map((fuel) => {
    let colorClass = 'text-green-600 dark:text-green-400';
    let label = '87 Octane';
    let extraHTML = '';
    let containerClasses = 'glass-panel rounded-2xl p-8 text-center transition-transform transform hover:-translate-y-2 hover:shadow-2xl relative';
    let titleColorClass = 'text-slate-800 dark:text-slate-300';
    let labelColorClass = 'text-slate-500 dark:text-slate-400';

    if (fuel.id.toLowerCase() === 'premium') {
      colorClass = 'text-orange-500';
      label = '93 Octane';
      containerClasses = 'bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-8 border border-orange-500/50 text-center shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-transform transform md:-translate-y-4 hover:-translate-y-6 hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] relative';
      extraHTML = `<div class="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-orange-600 text-white px-6 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest shadow-lg">Top Tier</div>`;
      titleColorClass = 'text-white mt-4';
      labelColorClass = 'text-slate-400';
    } else if (fuel.id.toLowerCase() === 'diesel') {
      colorClass = 'text-blue-600 dark:text-blue-400';
      label = 'Ultra-Low Sulfur';
    } else if (fuel.id.toLowerCase() === 'regular') {
      label = '87 Octane';
    } else {
      label = 'Premium Fuel';
    }

    const statusText = fuel.status ? fuel.status.trim() : '';
    const isOutOfStock = statusText.toLowerCase().includes('out');
    
    let stockBadgeHTML = '';
    if (isOutOfStock) {
      colorClass = 'text-slate-400 dark:text-slate-500 line-through';
      extraHTML += `<div class="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-10"><div class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center"><span class="text-3xl font-extrabold text-red-500 tracking-widest uppercase border-4 border-red-500 p-2 rounded-xl -rotate-12 bg-slate-900 shadow-2xl">Out of Stock</span></div></div>`;
    } else if (statusText) {
      const displayStatus = statusText.toLowerCase() === 'stock' ? 'In Stock' : statusText;
      stockBadgeHTML = `<div class="mt-4"><span class="inline-block bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-green-500/30">${displayStatus}</span></div>`;
    }

    return `
      <div class="${containerClasses}">
        ${extraHTML}
        <h3 class="text-2xl font-bold ${titleColorClass} uppercase tracking-wide mb-2">${fuel.id}</h3>
        <p class="text-sm ${labelColorClass} mb-6 uppercase tracking-widest font-semibold">${label}</p>
        <div class="text-6xl font-extrabold ${colorClass}">${fuel.price}</div>
        ${stockBadgeHTML}
      </div>
    `;
  }).join('');
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
      <div class="store-card bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col transition-all transform hover:-translate-y-2 hover:shadow-2xl reveal-on-scroll" style="transition-delay: ${index * 0.1}s;">
        <div class="h-64 overflow-hidden relative rounded-t-2xl">
          <img src="${imgSrc}" alt="${product.name}" class="w-full h-full object-cover transition-transform duration-700 hover:scale-110" onerror="this.src='/images/snacks.png'" />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-6">
            <h3 class="text-2xl font-bold text-white tracking-wide">${product.name}</h3>
          </div>
        </div>
        <div class="p-6 flex-grow flex flex-col justify-between relative z-10">
          <p class="text-slate-600 dark:text-slate-300 mb-4">Select your flavor:</p>
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div class="relative custom-dropdown-container w-full sm:w-auto">
              <button 
                type="button" 
                class="custom-dropdown-btn flex items-center justify-between w-full sm:min-w-[140px] bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer shadow-sm transition-colors backdrop-blur-md"
              >
                <span class="dropdown-selected-text">${product.flavours[0].name}</span>
                <svg class="w-4 h-4 ml-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
              <div class="custom-dropdown-menu absolute z-50 mt-2 w-full bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl backdrop-blur-xl overflow-hidden">
                ${product.flavours.map(opt => `<div class="dropdown-item px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-700 cursor-pointer transition-colors" data-price="${opt.price}" data-target="store-price-${index}">${opt.name}</div>`).join('')}
              </div>
            </div>
            <span id="store-price-${index}" class="font-extrabold text-2xl text-orange-600">${defaultPrice}</span>
          </div>
        </div>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', cardHtml);
  });
  if (window.initScrollAnimations) window.initScrollAnimations();
}


function showOfflineBanner(show) {
  let banner = document.getElementById('offline-banner');
  if (show) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'offline-banner';
      banner.className = 'bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-bold shadow-md relative z-[60] flex justify-between items-center';
      banner.innerHTML = `
        <span><span class="mr-2">⚠️</span> You are currently offline. Showing cached menus.</span>
        <button onclick="this.parentElement.remove()" class="text-yellow-900 hover:text-yellow-700 ml-4 font-bold">✕</button>
      `;
      document.body.insertBefore(banner, document.body.firstChild);
    }
  } else {
    if (banner) banner.remove();
  }
}

function getStoreTime() {
  return new Date(new Date().toLocaleString("en-US", {timeZone: "America/Chicago"}));
}

function initHero() {
  const heroImg = document.querySelector('.animate-slow-zoom');
  if (!heroImg) return;
  const hour = getStoreTime().getHours();
  if (hour >= 5 && hour < 12) {
    heroImg.src = '/images/hero_morning.png';
  } else if (hour >= 12 && hour < 19) {
    heroImg.src = '/images/hero_afternoon.png';
  } else {
    heroImg.src = '/images/hero_night.png';
  }
}

function startStoreClock() {
  const timeEl = document.getElementById('store-time');
  if (!timeEl) return;
  
  const updateTime = () => {
    const storeDate = getStoreTime();
    let h = storeDate.getHours();
    const m = storeDate.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    timeEl.textContent = `${h}:${m} ${ampm}`;
  };
  
  updateTime();
  setInterval(updateTime, 1000);
}

export async function initApp(isInitial = true) {
  initHero();
  startStoreClock();
  
  if (isInitial) {
    window.addEventListener('offline', () => showOfflineBanner(true));
    window.addEventListener('online', () => showOfflineBanner(false));
  }
  if (!navigator.onLine) showOfflineBanner(true);

  console.log('[Main] Initializing application...');
  initTheme();

  // Make debug function available in console early
  window.debugApp = {
    testGoogleSheets: debugGoogleSheets,
    log: (msg) => console.log('[AppDebug]', msg)
  };
  console.log('[Main] App Debug Tools Available - Call window.debugApp.testGoogleSheets() to test Google Sheets');

  // Load all data immediately
  await loadAllData(isInitial);

  // Weather widget (home page)
  fetchWeather();

  // Initialize interactive map if container exists (Location page)
  initLocationMap();

  // Update active navigation links
  updateActiveNavLinks();

  if (isInitial) {
    // Set up 5 minute polling
    setInterval(() => {
      console.log('[Main] Auto-refreshing data from Google Sheets (5m interval)...');
      loadAllData(false);
    }, 300000);
  }

  // Ensure scroll animations and buttons re-initialize
  window.initScrollAnimations();
  window.initMagneticButtons();

  console.log('[Main] Application initialization complete');
}

export function updateActiveNavLinks() {
  let currentPath = window.location.pathname;
  if (currentPath === '' || currentPath === '/index.html') currentPath = '/';
  
  // Header Desktop links
  document.querySelectorAll('header nav a').forEach(link => {
    let href = link.getAttribute('href');
    if (!href || href === '#') return;
    if (!href.startsWith('/')) href = '/' + href;
    
    if (href === currentPath) {
      link.classList.add('text-orange-400');
      link.classList.remove('text-slate-300');
    } else {
      link.classList.remove('text-orange-400');
      link.classList.add('text-slate-300');
    }
  });

  // Mobile Footer links
  document.querySelectorAll('nav.fixed.bottom-0 a').forEach(link => {
    let href = link.getAttribute('href');
    if (!href || href === '#') return;
    if (!href.startsWith('/')) href = '/' + href;
    
    if (href === currentPath) {
      link.classList.add('text-orange-400');
      link.classList.remove('text-slate-500', 'dark:text-slate-400');
    } else {
      link.classList.remove('text-orange-400');
      link.classList.add('text-slate-500', 'dark:text-slate-400');
    }
  });
}

function initLocationMap() {
  const mapContainer = document.getElementById('interactive-map');
  if (!mapContainer || typeof L === 'undefined') return;
  
  // Coordinates for Joppa, AL (example)
  const lat = 34.2982;
  const lng = -86.5583;
  
  const map = L.map('interactive-map', {
    zoomControl: false,
    scrollWheelZoom: false
  }).setView([lat, lng], 15);

  // Standard OpenStreetMap tiles for better rural visibility
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  // Custom marker
  const markerHtml = `
    <div style="background-color: #f97316; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(249, 115, 22, 0.8);"></div>
  `;
  const customIcon = L.divIcon({
    html: markerHtml,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  L.marker([lat, lng], {icon: customIcon}).addTo(map)
    .bindPopup('<b style="color: #f97316;">4-Way Quick Stop</b><br>Your express roadside stop.')
    .openPopup();
    
  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);
}

function renderDealsItems(deals) {
  const container = document.getElementById('deals-container');
  if (!container) return;
  container.innerHTML = '';
  
  deals.forEach((deal, index) => {
    const imgSrc = deal.imageUrl || '/images/tenders.png'; // Fallback
    const cardHtml = `
      <div class="bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg border border-white/20 flex flex-col transition-all duration-300 transform hover:-translate-y-2 hover:shadow-orange-500/30 hover:border-orange-500/50 group reveal-on-scroll" style="transition-delay: ${index * 0.1}s">
        <div class="h-56 overflow-hidden relative group">
          <img src="${imgSrc}" alt="${deal.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" onerror="this.src='/images/sandwich.png'" />
          <div class="absolute top-4 left-4 bg-orange-600 text-white px-3 py-1 rounded-full font-bold shadow-md animate-pulse">HOT DEAL</div>
        </div>
        <div class="p-6 flex-grow flex flex-col">
          <h3 class="text-2xl font-bold text-white mb-2 tracking-tight drop-shadow-sm">${deal.title}</h3>
          <p class="text-white/80 mb-6 flex-grow leading-relaxed">${deal.desc}</p>
          <div class="mt-auto pt-4 border-t border-white/10 flex justify-between items-center">
            <div>
              <span class="text-sm text-white/50 line-through mr-2">${deal.originalPrice}</span>
              <span class="font-extrabold text-3xl text-orange-400 drop-shadow-sm">${deal.price}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', cardHtml);
  });
  if (window.initScrollAnimations) window.initScrollAnimations();
}

window.initScrollAnimations = function() {
  if (!window.scrollObserver) {
    window.scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-active');
          window.scrollObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
  }

  document.querySelectorAll('.reveal-on-scroll:not(.reveal-active)').forEach(el => {
    window.scrollObserver.observe(el);
  });
};

window.initMagneticButtons = function() {
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0px, 0px)';
    });
  });
};

function initCustomDropdowns() {
  document.addEventListener('click', (e) => {
    // Handle dropdown toggle
    const btn = e.target.closest('.custom-dropdown-btn');
    if (btn) {
      const menu = btn.nextElementSibling;
      const isShowing = menu.classList.contains('show');
      
      // Close all others
      document.querySelectorAll('.custom-dropdown-menu').forEach(m => m.classList.remove('show'));
      
      if (!isShowing) {
        menu.classList.add('show');
      }
      return;
    }
    
    // Handle item selection
    const item = e.target.closest('.dropdown-item');
    if (item) {
      const price = item.getAttribute('data-price');
      const targetId = item.getAttribute('data-target');
      const container = item.closest('.custom-dropdown-container');
      const selectedText = container.querySelector('.dropdown-selected-text');
      const menu = container.querySelector('.custom-dropdown-menu');
      
      if (document.getElementById(targetId)) {
        document.getElementById(targetId).innerText = price;
      }
      selectedText.innerText = item.innerText;
      menu.classList.remove('show');
      return;
    }
    
    // Click outside
    document.querySelectorAll('.custom-dropdown-menu').forEach(m => m.classList.remove('show'));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initApp(true);
  initRouter(initApp);
  initCustomDropdowns();
});

// Register Vite PWA Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('[PWA] New content available, click on reload button to update.');
  },
  onOfflineReady() {
    console.log('[PWA] App is ready to work offline.');
  },
});

