import os
import re

with open('src/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Lazy Loading
content = content.replace('<img src="\"', '<img src="" loading="lazy" decoding="async"')

# 2. Category Normalizer
def normalize_cat_logic():
    return """  // Dynamically generate filter buttons
  const items = window.latestFoodItems || [];
  const categories = new Set();
  
  const normalizeCategory = (cat) => cat.replace(/[^a-zA-Z0-9 ]/g, '').trim().toLowerCase();
  
  items.forEach(item => {
    if (item.category && item.category !== 'all') {
      categories.add(normalizeCategory(item.category));
    }
  });

  // Rebuild container
  let buttonsHtml = <button data-filter="all" class="px-6 py-2 rounded-full text-sm font-bold bg-orange-600 text-white shadow-md transition-all">All Items</button>;
  
  Array.from(categories).sort().forEach(cat => {
    if (!cat) return;
    const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1);
    buttonsHtml += <button data-filter="" class="px-6 py-2 rounded-full text-sm font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-500 hover:text-orange-500 transition-all"></button>;
  });"""

content = re.sub(r'  // Dynamically generate filter buttons.*?  \Array\.from\(categories\)\.sort\(\)\.forEach\(cat => \{.*?  \}\);', normalize_cat_logic(), content, flags=re.DOTALL)

# Update filter logic to normalize when checking
content = content.replace('if (filterCategory !== \'all\' && item.category !== filterCategory) return;', 
                          'if (filterCategory !== \'all\' && (!item.category || item.category.replace(/[^a-zA-Z0-9 ]/g, \'\').trim().toLowerCase() !== filterCategory)) return;')

# 3. Offline Banner & Dynamic Hero
additions = """
function showOfflineBanner(show) {
  let banner = document.getElementById('offline-banner');
  if (show) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'offline-banner';
      banner.className = 'bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-bold shadow-md relative z-[60] flex justify-between items-center';
      banner.innerHTML = 
        <span><span class="mr-2">??</span> You are currently offline. Showing cached menus.</span>
        <button onclick="this.parentElement.remove()" class="text-yellow-900 hover:text-yellow-700 ml-4 font-bold">?</button>
      ;
      document.body.insertBefore(banner, document.body.firstChild);
    }
  } else {
    if (banner) banner.remove();
  }
}

function initHero() {
  const heroImg = document.querySelector('.animate-slow-zoom');
  if (!heroImg) return;
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    heroImg.src = '/images/hero_morning.png';
  } else if (hour >= 12 && hour < 19) {
    heroImg.src = '/images/hero_afternoon.png';
  } else {
    heroImg.src = '/images/hero_night.png';
  }
}

"""

content = content.replace('async function initApp() {', additions + 'async function initApp() {\n  initHero();\n  window.addEventListener(\'offline\', () => showOfflineBanner(true));\n  window.addEventListener(\'online\', () => showOfflineBanner(false));\n  if (!navigator.onLine) showOfflineBanner(true);\n')

with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("main.js updated")
