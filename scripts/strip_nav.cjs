const fs = require('fs');
const path = require('path');

const files = ['index.html', 'pages/fuel.html', 'pages/store.html', 'pages/location.html', 'pages/food.html', 'pages/deals.html'];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file}, not found.`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Desktop Nav: Replace `text-orange-400` inside header nav with `text-slate-300` if missing, or just remove it.
  // Actually, wait, it's easier to just blindly strip "text-orange-400" from any <a> tag in the header.
  // But wait, the inactive links have `text-slate-300`. Active link has `text-orange-400` instead of `text-slate-300`.
  // Wait, let's look at a link: `class="text-slate-300 hover:text-white transition-colors font-semibold text-orange-400"`
  // Ah, the active link in my previous edit had BOTH text-slate-300 and text-orange-400, or just text-orange-400?
  // Let's just reset all header links to standard.
  content = content.replace(/<header[\s\S]*?<\/header>/gi, (header) => {
    return header.replace(/<a href="([^"]*)"([^>]*)class="([^"]*)"/gi, (match, href, beforeClass, classAttr) => {
      // Don't touch the "Get Directions" button which has bg-orange-600
      if (classAttr.includes('bg-orange-600') || classAttr.includes('button')) {
        return match;
      }
      
      // Clean up classes
      let classes = classAttr.split(/\s+/);
      classes = classes.filter(c => c !== 'text-orange-400' && c !== 'text-slate-300');
      // Add back the default inactive class
      classes.push('text-slate-300');
      
      return `<a href="${href}"${beforeClass}class="${classes.join(' ')}"`;
    });
  });

  // 2. Mobile Nav: Replace `text-orange-400` with `text-slate-500 dark:text-slate-400`
  content = content.replace(/<nav class="md:hidden[\s\S]*?<\/nav>/gi, (nav) => {
    return nav.replace(/<a href="([^"]*)"([^>]*)class="([^"]*)"/gi, (match, href, beforeClass, classAttr) => {
      if (classAttr.includes('data-action="route"')) return match; // skip route button

      let classes = classAttr.split(/\s+/);
      classes = classes.filter(c => c !== 'text-orange-400' && c !== 'text-slate-500' && c !== 'dark:text-slate-400');
      classes.push('text-slate-500');
      classes.push('dark:text-slate-400');
      
      return `<a href="${href}"${beforeClass}class="${classes.join(' ')}"`;
    });
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated navigation classes in ${file}`);
});
