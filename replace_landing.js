const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Add model-viewer script to head
if (!html.includes('model-viewer')) {
  html = html.replace('</head>', `  <!-- 3D Model Viewer -->
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"></script>
</head>`);
}

// Add 3D shoe to hero
const heroSub = `  <p class="hero-sub">
    Connect Strava, choose Claude or ChatGPT, and get coached like an elite runner — personalized to your actual data.
  </p>`;

const heroSubWithShoe = `  <p class="hero-sub">
    Connect Strava, choose Claude or ChatGPT, and get coached like an elite runner — personalized to your actual data.
  </p>
  
  <div style="width:100%; max-width: 600px; height: 350px; margin: 2rem auto; position: relative; z-index: 10;">
    <model-viewer 
      src="https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Shoe/glTF-Binary/Shoe.glb" 
      camera-controls 
      auto-rotate 
      rotation-per-second="30deg"
      environment-image="neutral"
      exposure="1.2"
      shadow-intensity="1"
      style="width: 100%; height: 100%; background-color: transparent;"
      alt="A 3D model of a running shoe">
    </model-viewer>
  </div>`;

html = html.replace(heroSub, heroSubWithShoe);
fs.writeFileSync('index.html', html);
console.log("3D shoe added to landing page.");
