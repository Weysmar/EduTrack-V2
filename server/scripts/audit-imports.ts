
import * as fs from 'fs';
import * as path from 'path';
import { parseCsv } from '../src/services/csvParserService';
import { parseXlsx } from '../src/services/xlsxParserService';
import { parseOfx } from '../src/services/ofxParserService';

async function audit() {
    const files = [
        { name: 'CA20260124_102843.xlsx', type: 'xlsx', parser: parseXlsx },
        { name: 'CA20260124_102915.ofx', type: 'ofx', parser: parseOfx },
        { name: 'T_cpte_07126_000431R_du_25-10-2025_au_22-01-2026.csv', type: 'csv', parser: parseCsv }
    ];

    console.log("Starting Import Audit...");
    console.log("--------------------------------------------------");

    for (const file of files) {
        const filePath = path.join(__dirname, '../../', file.name);
        console.log(`\n📄 Testing File: ${file.name}`);

        if (!fs.existsSync(filePath)) {
            console.error(`❌ File NOT FOUND at ${filePath}`);
            continue;
        }

        try {
            const buffer = fs.readFileSync(filePath);
            const start = Date.now();
            const transactions = await file.parser(buffer);
            const duration = Date.now() - start;

            console.log(`✅ Success! Parsed in ${duration}ms`);
            console.log(`📊 Transactions found: ${transactions.length}`);
            if (transactions.length > 0) {
                const first = transactions[0];
                const last = transactions[transactions.length - 1];
                console.log(`   First: ${first.date.toISOString().split('T')[0]} - ${first.description.substring(0, 30)}... (${first.amount} ${first.type})`);
                console.log(`   Last:  ${last.date.toISOString().split('T')[0]} - ${last.description.substring(0, 30)}... (${last.amount} ${last.type})`);

                const total = transactions.reduce((acc, t) => acc + t.amount, 0);
                console.log(`   💰 Net Total Check: ${total.toFixed(2)}`);
            }

        } catch (e: any) {
            console.error(`❌ FAILED: ${e.message}`);
            // console.error(e);
        }
    }
    console.log("\n--------------------------------------------------");
    console.log("Audit Complete.");
}

audit();
