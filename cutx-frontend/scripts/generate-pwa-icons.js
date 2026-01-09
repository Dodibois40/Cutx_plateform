/**
 * Script pour générer les icônes PWA placeholder
 * Exécuter avec : node scripts/generate-pwa-icons.js
 *
 * Nécessite : npm install canvas --save-dev
 */

const fs = require('fs');
const path = require('path');

// Essayer d'utiliser canvas, sinon créer des PNG minimaux
async function generateIcons() {
  const iconsDir = path.join(__dirname, '../public/icons');

  // Créer le dossier icons s'il n'existe pas
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  try {
    // Essayer avec canvas
    const { createCanvas } = require('canvas');

    const sizes = [
      { name: 'icon-192x192.png', size: 192, maskable: false },
      { name: 'icon-512x512.png', size: 512, maskable: false },
      { name: 'icon-maskable-192.png', size: 192, maskable: true },
      { name: 'icon-maskable-512.png', size: 512, maskable: true },
      { name: 'apple-touch-icon.png', size: 180, maskable: false },
    ];

    for (const { name, size, maskable } of sizes) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');

      // Background
      if (maskable) {
        // Maskable icons need safe zone (80% center)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, size, size);
      } else {
        // Rounded rectangle for standard icons
        ctx.fillStyle = '#1a1a1a';
        roundRect(ctx, 0, 0, size, size, size * 0.15);
        ctx.fill();
      }

      // Text "CutX" - "Cut" en blanc, "X" en amber/jaune
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const fontSize = maskable ? size * 0.25 : size * 0.3;
      ctx.font = `900 ${fontSize}px Arial, sans-serif`; // font-weight 900 = black

      // Mesurer les parties du texte
      const cutWidth = ctx.measureText('Cut').width;
      const xWidth = ctx.measureText('X').width;
      const totalWidth = cutWidth + xWidth;

      // Position de départ pour centrer
      const startX = (size - totalWidth) / 2;
      const centerY = size / 2;

      // Dessiner "Cut" en blanc
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText('Cut', startX, centerY);

      // Dessiner "X" en amber (#f59e0b)
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('X', startX + cutWidth, centerY);

      // Save
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(path.join(iconsDir, name), buffer);
      console.log(`✓ Created ${name}`);
    }

    console.log('\n✅ All PWA icons generated successfully!');
    console.log('📁 Location: public/icons/');
    console.log('\n💡 Tip: Replace these placeholders with your actual CutX logo.');

  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('Canvas module not found. Creating minimal PNG placeholders...');
      await createMinimalPNGs(iconsDir);
    } else {
      throw err;
    }
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Fallback: créer des PNG minimaux sans canvas
async function createMinimalPNGs(iconsDir) {
  // PNG minimal 1x1 gris carbone, qu'on étend
  // Format PNG minimal valide
  const createMinimalPNG = (size) => {
    // PNG header + IHDR + IDAT + IEND
    // C'est un PNG gris très basique
    const png = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR length
      0x49, 0x48, 0x44, 0x52, // IHDR
      ...intToBytes(size), // width
      ...intToBytes(size), // height
      0x08, 0x02, // bit depth, color type (RGB)
      0x00, 0x00, 0x00, // compression, filter, interlace
      0x00, 0x00, 0x00, 0x00, // CRC placeholder
      0x00, 0x00, 0x00, 0x00, // IDAT length placeholder
      0x49, 0x44, 0x41, 0x54, // IDAT
      // Minimal compressed data
      0x08, 0xD7, 0x63, 0x60, 0x60, 0x60, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x00, // CRC placeholder
      0x00, 0x00, 0x00, 0x00, // IEND length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82, // IEND CRC
    ]);
    return png;
  };

  const intToBytes = (n) => [
    (n >> 24) & 0xFF,
    (n >> 16) & 0xFF,
    (n >> 8) & 0xFF,
    n & 0xFF,
  ];

  // Créer des placeholders basiques
  const sizes = [
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
    { name: 'icon-maskable-192.png', size: 192 },
    { name: 'icon-maskable-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ];

  console.log('\n⚠️  Creating placeholder icons (install canvas for better icons):');
  console.log('   npm install canvas --save-dev');
  console.log('   node scripts/generate-pwa-icons.js\n');

  // Pour l'instant, copier le favicon existant comme placeholder
  const faviconPath = path.join(__dirname, '../src/app/favicon.ico');

  for (const { name } of sizes) {
    // Créer un fichier placeholder minimal
    const placeholderPath = path.join(iconsDir, name);
    if (fs.existsSync(faviconPath)) {
      fs.copyFileSync(faviconPath, placeholderPath);
      console.log(`✓ Created ${name} (from favicon)`);
    }
  }

  console.log('\n⚠️  Note: These are placeholder icons from favicon.');
  console.log('   For proper PWA icons, either:');
  console.log('   1. Run: npm install canvas && node scripts/generate-pwa-icons.js');
  console.log('   2. Or replace manually with your CutX logo PNGs');
}

generateIcons().catch(console.error);
