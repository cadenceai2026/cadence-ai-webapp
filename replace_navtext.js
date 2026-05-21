const fs = require('fs');
let html = fs.readFileSync('app.html', 'utf8');

// The nav text is typically the second span: <span class="font-label-caps text-label-caps uppercase tracking-wider">Command Center</span>
html = html.replace(/<span class="font-label-caps/g, '<span class="nav-text font-label-caps transition-opacity duration-300');

// Also update the UI toggle logic in js/main.js
let mainjs = fs.readFileSync('js/main.js', 'utf8');
const toggleLogic = `
  qs('#btn-toggle-sidebar')?.addEventListener('click', () => {
    const sidebar = qs('#app-sidebar');
    const main = qs('#app-main');
    const icon = qs('#btn-toggle-sidebar span');
    
    if (sidebar.classList.contains('collapsed')) {
      sidebar.classList.remove('collapsed');
      sidebar.style.width = '256px'; // w-64
      main.style.paddingLeft = '280px'; // md:pl-[280px]
      icon.textContent = 'menu_open';
    } else {
      sidebar.classList.add('collapsed');
      sidebar.style.width = '88px'; // w-22
      main.style.paddingLeft = '112px'; // pl-[112px]
      icon.textContent = 'menu';
    }
  });
`;

if (!mainjs.includes('btn-toggle-sidebar')) {
  mainjs = mainjs.replace('export function initGlobalHandlers() {', 'export function initGlobalHandlers() {' + toggleLogic);
  fs.writeFileSync('js/main.js', mainjs);
  console.log("main.js updated");
}

fs.writeFileSync('app.html', html);
console.log("app.html nav-text updated");
