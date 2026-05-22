const fs = require('fs');

// Fix app.html
let appHtml = fs.readFileSync('app.html', 'utf8');
appHtml = appHtml.replace(
  `<body>`,
  `<body class="bg-surface-deep text-on-surface">`
);
appHtml = appHtml.replace(
  `body { background-color: theme('colors.surface-deep'); color: theme('colors.on-surface'); }`,
  `/* body bg moved to class */`
);

// Fix index.html
let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml.replace(
  `<body>`,
  `<body class="bg-surface-deep text-on-surface">`
);
indexHtml = indexHtml.replace(
  `body { background-color: theme('colors.surface-deep'); color: theme('colors.on-surface'); }`,
  `/* body bg moved to class */`
);

fs.writeFileSync('app.html', appHtml);
fs.writeFileSync('index.html', indexHtml);
console.log('Background classes added to body tags.');
