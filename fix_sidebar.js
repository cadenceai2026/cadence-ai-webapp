const fs = require('fs');
let mainjs = fs.readFileSync('js/main.js', 'utf8');

const buggyToggle = `    if (sidebar.classList.contains('collapsed')) {
      sidebar.classList.remove('collapsed');
      sidebar.style.width = '256px'; // w-64
      main.style.paddingLeft = '280px'; // md:pl-[280px]
      icon.textContent = 'menu_open';
    } else {
      sidebar.classList.add('collapsed');
      sidebar.style.width = '88px'; // w-22
      main.style.paddingLeft = '112px'; // pl-[112px]
      icon.textContent = 'menu';
    }`;

const fixedToggle = `    if (sidebar.classList.contains('collapsed')) {
      sidebar.classList.remove('collapsed');
      main.classList.remove('sidebar-collapsed');
      icon.textContent = 'menu_open';
    } else {
      sidebar.classList.add('collapsed');
      main.classList.add('sidebar-collapsed');
      icon.textContent = 'menu';
    }`;

mainjs = mainjs.replace(buggyToggle, fixedToggle);
fs.writeFileSync('js/main.js', mainjs);

// Update CSS to handle media queries correctly
let css = fs.readFileSync('index.css', 'utf8');
css = css.replace('nav.collapsed { width: 80px; }', '@media (min-width: 768px) { nav.collapsed { width: 88px !important; } }');
css = css.replace('main.sidebar-collapsed { padding-left: 80px !important; }', '@media (min-width: 768px) { main.sidebar-collapsed { padding-left: 112px !important; } }');
fs.writeFileSync('index.css', css);

console.log("Responsive sidebar toggle fixed");
