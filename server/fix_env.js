const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

try {
    // Read raw buffer to handle potential BOM or weird encoding
    const raw = fs.readFileSync(envPath);
    let content = raw.toString('utf8');

    // Check if it looks like there are null bytes (UTF-16 LE)
    if (content.indexOf('\u0000') !== -1) {
        console.log("Detected null bytes, attempting UTF-16LE decode...");
        content = raw.toString('utf16le');
    }

    // Clean up content: remove BOM, normalize line endings, trim
    let clean = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

    // Fix specific known corruption pattern if needed (e.g. broken lines)
    // Looking at previous logs, it seemed like one line was split. 
    // We will just Regex for DATABASE_URL to be sure.

    const dbUrlMatch = clean.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
    if (dbUrlMatch) {
        console.log("Found Database URL:", dbUrlMatch[1]);
        const newContent = `PORT=3000\nDATABASE_URL="${dbUrlMatch[1]}"\n`;
        fs.writeFileSync(envPath, newContent, 'utf8');
        console.log("Successfully rewrote .env with UTF-8");
    } else {
        console.error("Could not find DATABASE_URL in the file content:", clean);
    }

} catch (e) {
    console.error("Error fixing .env:", e);
}
