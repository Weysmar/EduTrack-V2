import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, 'public');
const logoPath = join(publicDir, 'logo.png');

async function optimizeLogo() {
    console.log('🖼️  Starting logo optimization...');

    try {
        // Generate optimized logo for favicon/header (72x72 for display, but we'll make 144x144 for retina)
        await sharp(logoPath)
            .resize(144, 144, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png({ quality: 90, compressionLevel: 9 })
            .toFile(join(publicDir, 'logo-optimized.png'));
        console.log('✅ Created logo-optimized.png (144x144)');

        // Generate PWA icons
        await sharp(logoPath)
            .resize(192, 192, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png({ quality: 90, compressionLevel: 9 })
            .toFile(join(publicDir, 'logo-192.png'));
        console.log('✅ Created logo-192.png (192x192)');

        await sharp(logoPath)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png({ quality: 90, compressionLevel: 9 })
            .toFile(join(publicDir, 'logo-512.png'));
        console.log('✅ Created logo-512.png (512x512)');

        // Generate WebP version for modern browsers (even smaller)
        await sharp(logoPath)
            .resize(144, 144, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({ quality: 85 })
            .toFile(join(publicDir, 'logo-optimized.webp'));
        console.log('✅ Created logo-optimized.webp (144x144, WebP format)');

        console.log('🎉 Logo optimization complete!');
        console.log('📦 Estimated savings: ~95-100 KB on page load');
    } catch (error) {
        console.error('❌ Error optimizing logo:', error);
        process.exit(1);
    }
}

optimizeLogo();
