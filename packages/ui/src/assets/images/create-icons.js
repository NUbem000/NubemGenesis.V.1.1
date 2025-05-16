// Script para crear iconos PNG desde SVG
const fs = require('fs');
const sharp = require('sharp');

const svgContent = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Fondo circular -->
  <circle cx="256" cy="256" r="256" fill="#0a0a0a"/>
  
  <!-- Nube -->
  <g>
    <circle cx="160" cy="256" r="80" fill="#ffffff"/>
    <circle cx="256" cy="256" r="100" fill="#ffffff"/>
    <circle cx="352" cy="256" r="80" fill="#ffffff"/>
    <rect x="160" y="256" width="192" height="80" fill="#ffffff"/>
  </g>
  
  <!-- Estrella de génesis -->
  <path d="M256 140 L280 200 L340 200 L290 240 L310 300 L256 260 L202 300 L222 240 L172 200 L232 200 Z" fill="#4CAF50"/>
  
  <!-- Texto -->
  <text x="256" y="380" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ffffff" text-anchor="middle">NubemGenesis</text>
</svg>`;

// Crear iconos de diferentes tamaños
const sizes = [16, 32, 192, 512];

sizes.forEach(size => {
  sharp(Buffer.from(svgContent))
    .resize(size, size)
    .png()
    .toFile(`../../../public/nubemgenesis-${size}.png`)
    .then(() => console.log(`Created ${size}x${size} icon`))
    .catch(err => console.error(`Error creating ${size}x${size} icon:`, err));
});