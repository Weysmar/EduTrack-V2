
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

async function debugXlsx() {
    const filePath = path.join(__dirname, '../../CA20260124_102843.xlsx');
    console.log(`Reading: ${filePath}`);

    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    console.log(`Sheet: ${sheetName}`);

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log("--- First 20 Rows (Raw) ---");
    jsonData.slice(0, 20).forEach((row, i) => {
        console.log(`[${i}]`, JSON.stringify(row));
    });
}

debugXlsx();
