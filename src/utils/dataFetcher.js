import { fallbackData } from '../data/fallback.js';

// To connect your Google Sheet:
// 1. Create a Google Sheet with 2 columns: "Key" and "Value"
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR8bHmJoODN-pbhILPam22A13yAaf325A74K4XxPanCbWFfqAOPfVFCPPgLrjGwmIy1uLZvfjicumSz/pub?output=csv'; // For General Store Data

// Paste the published CSV link for your new Food Menu sheet here:
export const GOOGLE_SHEET_FOOD_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTGO64k_feo47mC1u-Tp94ZTnvZAjJZQTE69uNZQVc1M7Vs8oNYWe0wpc8BCx6nDZ2fcgP_EtCRVu2B/pub?output=csv';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result.map((s) => s.trim().replace(/^"|"$/g, ''));
}

export async function fetchFoodData() {
  const fallbackFood = [
    {
      title: 'Breakfast Sandwich Combo',
      desc: 'Fresh eggs, bacon or sausage on toasted biscuits. Served with a side of hash browns.',
      price: '$5.99',
    },
    {
      title: 'Hand-Tossed Crispy Chicken Tenders',
      desc: 'Double-battered white meat fried crisp to perfection. Includes your choice of dipping sauce.',
      price: '$8.49',
    },
    {
      title: 'Roadside Meal Basket',
      desc: 'Value combo including our signature burger, crispy golden fries, and a large fountain drink.',
      price: '$10.99',
    },
  ];

  if (!GOOGLE_SHEET_FOOD_CSV_URL) {
    console.log('No Google Sheet URL provided for Food. Using local fallback data.');
    return fallbackFood;
  }

  const normalizeHeader = (h) => String(h || '').trim().replace(/\s+/g, ' ').toLowerCase();

  const findHeaderIndex = (headers, candidates) => {
    for (const c of candidates) {
      const idx = headers.findIndex((h) => normalizeHeader(h) === c);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const coercePrice = (raw) => {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    if (s.startsWith('$')) return s;
    return `$${s}`;
  };

  try {
    const timestamp = new Date().getTime();
    const fetchUrl = `${GOOGLE_SHEET_FOOD_CSV_URL}&t=${timestamp}`;
    console.log('[FetchFoodData] Fetching from:', fetchUrl);

    // Some environments/users see intermittent failures from Google Sheets.
    // Add a short timeout + one retry to make fetch more reliable.
    const fetchWithTimeout = async (url, { timeoutMs = 8000 } = {}) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, { cache: 'no-store', signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
    };

    let response;
    try {
      response = await fetchWithTimeout(fetchUrl, { timeoutMs: 8000 });
    } catch (err) {
      console.warn('[FetchFoodData] First fetch attempt failed, retrying once...', err);
      response = await fetchWithTimeout(fetchUrl, { timeoutMs: 8000 });
    }

    if (!response.ok) throw new Error('Failed to fetch Food Google Sheet');

    const contentType = response.headers.get('content-type') || '';
    const csvText = await response.text();

    if (contentType.includes('text/html') || csvText.trim().startsWith('<')) {
      throw new Error(`Food Google Sheet did not return CSV (content-type: ${contentType})`);
    }

    const lines = csvText.split(/\r?\n/);
    const nonEmptyLines = lines.map((l) => l.trim()).filter(Boolean);

    if (nonEmptyLines.length === 0) {
      console.warn('[FetchFoodData] Food CSV had no rows. Using fallback.');
      return fallbackFood;
    }

    const headerParts = parseCSVLine(nonEmptyLines[0]);

    const looksLikeHeader = headerParts.some((h) => {
      const n = normalizeHeader(h);
      return ['title', 'food title', 'name', 'description', 'desc', 'price', 'cost', 'amount'].includes(n);
    });

    let titleIdx = 0;
    let descIdx = 1;
    let priceIdx = 2;

    if (looksLikeHeader) {
      console.log('[FetchFoodData] Detected header columns:', headerParts);

      titleIdx = findHeaderIndex(headerParts, ['title', 'food title', 'name']);
      descIdx = findHeaderIndex(headerParts, ['desc', 'description', 'details', 'detail']);
      priceIdx = findHeaderIndex(headerParts, ['price', 'cost', 'amount']);

      if (titleIdx === -1) titleIdx = 0;
      if (descIdx === -1) descIdx = titleIdx === 0 ? 1 : 0;
      if (priceIdx === -1) priceIdx = 2;
    } else {
      console.log('[FetchFoodData] First row did not look like headers; using positional parsing. First row parts:', headerParts);
    }

    const startingRowIndex = looksLikeHeader ? 1 : 0;
    const foodItems = [];

    for (let i = startingRowIndex; i < nonEmptyLines.length; i++) {
      const parts = parseCSVLine(nonEmptyLines[i]);
      if (!parts || parts.length === 0) continue;

      const title = String(parts[titleIdx] ?? '').trim();
      const desc = String(parts[descIdx] ?? '').trim();
      let price = String(parts[priceIdx] ?? '').trim();
      
      const imageUrl = parts.length > 3 && parts[3].trim() ? parts[3].trim() : null;
      const category = parts.length > 4 && parts[4].trim() ? parts[4].trim().toLowerCase() : 'all';

      if (!title) continue;

      const nTitle = title.toLowerCase();
      if (nTitle === 'title' || nTitle === 'food title' || nTitle === 'name') continue;
      
      if (price && !price.startsWith('$')) price = '$' + price;
      
      foodItems.push({ title, desc, price, imageUrl, category });
    }
    
    return foodItems.length > 0 ? foodItems : fallbackFood;
  } catch (error) {
    console.warn('Error fetching Food Google Sheet. Falling back to local data.', error);
    return fallbackFood;
  }
}

// Paste the published CSV link for your Deals sheet here:
export const GOOGLE_SHEET_DEALS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS6oLdJORjGZpUT2xWoF-ZOZ4YaDCCd1B2b6v6d0nao7CqvdxSZ_WwiqydfVHthCkUXyPiojkRDhLKE/pub?output=csv';

export async function fetchDealsData() {
  const fallbackDeals = [
    { title: "2 for $3 Roller Grill", desc: "Mix and match any two roller grill items. Includes hot dogs, taquitos, and sausages.", price: "$3.00", originalPrice: "$4.50", imageUrl: null },
    { title: "Free Coffee with Fill Up", desc: "Get a free medium coffee with any fuel purchase of 10 gallons or more.", price: "FREE", originalPrice: "$1.99", imageUrl: null }
  ];

  if (!GOOGLE_SHEET_DEALS_CSV_URL) return fallbackDeals;

  try {
    const timestamp = new Date().getTime();
    const fetchUrl = `${GOOGLE_SHEET_DEALS_CSV_URL}&t=${timestamp}`;
    const response = await fetch(fetchUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch Deals Google Sheet');
    
    const csvText = await response.text();
    const rows = csvText.split('\n');
    const deals = [];
    
    for (let i = 0; i < rows.length; i++) {
      const rowStr = rows[i].trim();
      if (!rowStr) continue;
      
      const parts = parseCSVLine(rowStr);
      if (parts.length < 4) continue;
      
      const title = parts[0];
      const desc = parts[1];
      let originalPrice = parts[2];
      let price = parts[3];
      const imageUrl = parts.length > 4 && parts[4].trim() ? parts[4].trim() : null;
      
      if (title.toLowerCase() === 'title' || title === '') continue;
      
      if (price.toLowerCase() !== 'free' && !price.startsWith('$')) price = '$' + price;
      if (originalPrice && originalPrice.toLowerCase() !== 'free' && !originalPrice.startsWith('$')) originalPrice = '$' + originalPrice;
      
      deals.push({ title, desc, originalPrice, price, imageUrl });
    }
    
    return deals.length > 0 ? deals : fallbackDeals;
  } catch (error) {
    console.warn('Error fetching Deals Google Sheet.', error);
    return fallbackDeals;
  }
}

export async function fetchStoreData() {
  if (!GOOGLE_SHEET_CSV_URL) {
    console.log('No Google Sheet URL provided. Using local fallback data.');
    return fallbackData;
  }

  try {
    const timestamp = new Date().getTime();
    const fetchUrl = `${GOOGLE_SHEET_CSV_URL}&t=${timestamp}`;
    console.log('[FetchStoreData] Fetching from:', fetchUrl);

    const response = await fetch(fetchUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch Google Sheet');

    const contentType = response.headers.get('content-type') || '';
    const csvText = await response.text();

    // Google sometimes returns HTML (not CSV) if the URL is wrong.
    if (contentType.includes('text/html') || csvText.trim().startsWith('<')) {
      throw new Error(`Google Sheet did not return CSV (content-type: ${contentType})`);
    }

    console.log('[FetchStoreData] Raw CSV received:', csvText.substring(0, 200));

    const parsedData = parseCSV(csvText);

    console.log('[FetchStoreData] Successfully fetched and parsed data from Google Sheet.');
    console.log('[FetchStoreData] Parsed data:', parsedData);
    return parsedData;
  } catch (error) {
    console.warn('[FetchStoreData] Error fetching Google Sheet. Falling back to local data.', error);
    console.log('[FetchStoreData] Using fallback data:', fallbackData);
    return fallbackData;
  }
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

// Simple CSV parser that reads Key-Value pairs and overrides the fallback data
function parseCSV(csvText) {
  // Start with a copy of the fallback data so missing fields are still populated
  const data = JSON.parse(JSON.stringify(fallbackData));

  // Split into rows and process
  const rows = csvText.split('\n');
  console.log('[ParseCSV] Total rows:', rows.length);

  let parsedCount = 0;
  for (let i = 0; i < rows.length; i++) {
    const trimmedRow = rows[i].trim();
    if (!trimmedRow) continue; // Skip empty rows

    const columns = rows[i].split(',');
    if (columns.length < 2) {
      console.log(`[ParseCSV] Row ${i} skipped (insufficient columns):`, trimmedRow);
      continue;
    }

    let key = columns[0].trim();
    const value = columns.slice(1).join(',').trim(); // Re-join in case value had commas

    // Automatically fix common typos like "fuel.premiun" -> "fuel.premium"
    if (key === 'fuel.premiun') key = 'fuel.premium';

    if (key && key.toLowerCase() !== 'key') {
      // Skip header row
      setNestedValue(data, key, value);
      console.log(`[ParseCSV] Row ${i}: ${key} = ${value}`);
      parsedCount++;
    }
  }

  console.log(`[ParseCSV] Successfully parsed ${parsedCount} key-value pairs`);
  return data;
}

export async function debugGoogleSheets() {
  console.log('=== DEBUGGING GOOGLE SHEETS ===');

  console.log('Store Sheet URL:', GOOGLE_SHEET_CSV_URL);
  console.log('Food Sheet URL:', GOOGLE_SHEET_FOOD_CSV_URL);

  try {
    console.log('\n[DEBUG] Fetching Store Sheet...');
    const storeRes = await fetch(`${GOOGLE_SHEET_CSV_URL}&t=${Date.now()}`, { cache: 'no-store' });
    console.log('Store Sheet Status:', storeRes.status, storeRes.statusText);

    if (storeRes.ok) {
      const storeCSV = await storeRes.text();
      console.log('Store Sheet Data (first 500 chars):', storeCSV.substring(0, 500));
    }
  } catch (error) {
    console.error('[DEBUG] Store Sheet Error:', error);
  }

  try {
    console.log('\n[DEBUG] Fetching Food Sheet...');
    const foodRes = await fetch(`${GOOGLE_SHEET_FOOD_CSV_URL}&t=${Date.now()}`, { cache: 'no-store' });
    console.log('Food Sheet Status:', foodRes.status, foodRes.statusText);

    if (foodRes.ok) {
      const foodCSV = await foodRes.text();
      console.log('Food Sheet Data (first 500 chars):', foodCSV.substring(0, 500));
    }
  } catch (error) {
    console.error('[DEBUG] Food Sheet Error:', error);
  }

  console.log('=== END DEBUG ===');
}

function getNestedValue(obj, path) {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current == null) return undefined;
    current = current[key];
  }
  return current;
}

export function populateDOM(data) {
  console.log('[PopulateDOM] Starting to populate with data:', data);

  const announcementBar = document.getElementById('announcement-bar');
  if (announcementBar) {
    if (data.announcement && data.announcement.trim() !== '') {
      announcementBar.classList.remove('hidden');
    } else {
      announcementBar.classList.add('hidden');
    }
  }

  const elements = document.querySelectorAll('[data-bind]');
  console.log(`[PopulateDOM] Found ${elements.length} elements with data-bind attribute`);

  elements.forEach((el) => {
    const bindKey = el.getAttribute('data-bind');

    if (bindKey === 'currentYear') {
      el.textContent = new Date().getFullYear();
      return;
    }

    const value = getNestedValue(data, bindKey);
    if (value !== undefined && value !== null) {
      if (el.tagName === 'A' && bindKey === 'phone') {
        el.textContent = value;
        el.href = `tel:${value.replace(/[^0-9]/g, '')}`;
      } else if (bindKey.startsWith('fuel.') || bindKey.endsWith('.price')) {
        // Automatically ensure currency format for prices
        el.textContent = value.startsWith('$') ? value : `$${value}`;
      } else {
        el.textContent = value;
      }
      console.log(`[PopulateDOM] Set ${bindKey} = ${value}`);
    } else {
      console.warn(`[PopulateDOM] No value found for binding key: ${bindKey}`);
    }
  });

  console.log('[PopulateDOM] DOM population complete');
}

