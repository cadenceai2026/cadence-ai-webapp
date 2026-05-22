const fs = require('fs');
let html = fs.readFileSync('app.html', 'utf8');

// Fix header background color to be solid dark so scrolled content doesn't look messy
html = html.replace(
  'bg-background/80 backdrop-blur-xl',
  'bg-surface-deep/95 backdrop-blur-md'
);

fs.writeFileSync('app.html', html);
console.log('Header background updated.');
