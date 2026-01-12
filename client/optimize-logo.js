const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const logoPath = path.join(publicDir, 'logo.png');

async function optimizeLogo() {
    console.log('🖼️  Starting logo optimization...');

    try {
        const image = await loadImage(logoPath);

        // Generate 144x144 optimized logo
        const canvas144 = createCanvas(144, 144);
        const ctx144 = canvas144.getContext('2d');
        ctx144.drawImage(image, 0, 0, 144, 144);
        fs.writeFileSync(path.join(publicDir, 'logo-optimized.png'), canvas144.toBuffer('image/png', { compressionLevel: 9 }));
        console.log('✅ Created logo-optimized.png (144x144)');

        // Generate 192x192 PWA icon
        const canvas192 = createCanvas(192, 192);
        const ctx192 = canvas192.getContext('2d');
        ctx192.drawImage(image, 0, 0, 192, 192);
        fs.writeFileSync(path.join(publicDir, 'logo-192.png'), canvas192.toBuffer('image/png', { compressionLevel: 9 }));
        console.log('✅ Created logo-192.png (192x192)');

        // Generate 512x512 PWA icon
        const canvas512 = createCanvas(512, 512);
        const ctx512 = canvas512.getContext('2d');
        ctx512.drawImage(image, 0, 0, 512, 512);
        fs.writeFileSync(path.join(publicDir, 'logo-512.png'), canvas512.toBuffer('image/png', { compressionLevel: 9 }));
        console.log('✅ Created logo-512.png (512x512)');

        console.log('🎉 Logo optimization complete!');
        console.log('📦 Estimated savings: ~95-100 KB on page load');
    } catch (error) {
        console.error('❌ Error optimizing logo:', error);
        process.exit(1);
    }
}

optimizeLogo();
