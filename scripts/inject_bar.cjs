const fs = require('fs');
const path = require('path');

const files = ['index.html', 'fuel.html', 'store.html', 'location.html', 'food.html'];

const announcementHtml = `
    <!-- Announcement Bar (Hidden by default) -->
    <div id="announcement-bar" class="hidden bg-orange-500 text-white px-4 py-2 text-center text-sm font-bold shadow-md relative z-50 reveal-on-scroll">
      <span data-bind="announcement"></span>
    </div>
`;

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Inject just after the body tag
  if (!content.includes('id="announcement-bar"')) {
    content = content.replace(/(<body[^>]*>)/i, `$1\n${announcementHtml}`);
    fs.writeFileSync(filePath, content);
    console.log(`Injected announcement bar in ${file}`);
  }
});
