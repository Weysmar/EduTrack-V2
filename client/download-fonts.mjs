import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fontsDir = path.join(__dirname, 'public', 'fonts');

if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
}

const fonts = [
    // Inter (Variable) - using static backups for broader compatibility if variable fails, but variable is best for modern
    // Actually, let's grab specific weights to be safe and standard: 400, 500, 600, 700
    {
        name: 'Inter-Regular.woff2',
        url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEWuLy2AZ9hjp-Ek-_EeA.woff2'
    },
    {
        name: 'Inter-Medium.woff2',
        url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEWuI63AZ9hjp-Ek-_EeA.woff2'
    },
    {
        name: 'Inter-SemiBold.woff2',
        url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEWuJ55AZ9hjp-Ek-_EeA.woff2'
    },
    {
        name: 'Inter-Bold.woff2',
        url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEWuFu2AZ9hjp-Ek-_EeA.woff2'
    },
    // Caveat (400, 700)
    {
        name: 'Caveat-Regular.woff2',
        url: 'https://fonts.gstatic.com/s/caveat/v18/mnpSxlNq2OAl9JtQTI5V8w.woff2'
    },
    {
        name: 'Caveat-Bold.woff2',
        url: 'https://fonts.gstatic.com/s/caveat/v18/mnpPxlNq2OAl9JtQTDJz9yQ.woff2'
    },
    // Minecraftia (Regular) - CDNFonts doesn't have direct stable woff2 links easily scrapeable, 
    // but we can try to find a classic Minecraft font source or use a known one.
    // For now I'll use a reliable source or skip if too risky, but user has it blocking.
    // Let's rely on the CDNFonts one being downloaded manually if needed, or try a standard repo.
    // Actually, for this specific style, let's stick to the others first or try to fetch it if possible.
    // Update: Skipping Minecraftia automated download to avoid broken links, will handle manually or keep specific link if needed.
    // Let's try to remove it if unused? PageSpeed said it IS used/blocking. 
];

// Helper to download
const downloadFont = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`✅ Downloaded ${path.basename(dest)}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            console.error(`❌ Error downloading ${url}: ${err.message}`);
            reject(err);
        });
    });
};

async function main() {
    console.log('⬇️ Downloading fonts...');
    for (const font of fonts) {
        await downloadFont(font.url, path.join(fontsDir, font.name));
    }
    console.log('✨ All fonts downloaded!');
}

main();
