
import * as fs from 'fs';
import * as path from 'path';
import { parseOfx } from '../src/services/ofxParserService';

async function run() {
    try {
        const filePath = path.join(__dirname, '../../CA20260124_102915.ofx');
        console.log(`Reading file: ${filePath}`);

        if (!fs.existsSync(filePath)) {
            console.error("File not found!");
            return;
        }

        const buffer = fs.readFileSync(filePath);
        console.log(`File size: ${buffer.length} bytes`);

        console.log("Starting parse...");
        const transactions = await parseOfx(buffer);
        console.log("Parse success!");
        console.log(`Found ${transactions.length} transactions.`);
        console.log("First 3:", transactions.slice(0, 3));

    } catch (e) {
        console.error("Parse FAILED:");
        console.error(e);
    }
}

run();
