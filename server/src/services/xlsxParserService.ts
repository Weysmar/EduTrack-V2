import * as XLSX from 'xlsx';
import { OfxData, OfxTransaction } from '../types/ofx';

export class XlsxParserService {

    static parseFile(fileBuffer: Buffer): OfxData {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON with header row 1
        const rows = XLSX.utils.sheet_to_json(sheet);

        const transactions = this.mapToTransactions(rows);

        return {
            accounts: [{
                accountId: 'XLSX_IMPORT',
                currency: 'EUR',
                balance: 0,
                transactions
            }]
        };
    }

    private static mapToTransactions(rows: any[]): OfxTransaction[] {
        return rows.map((row: any) => {
            // Keys depend on the Excel headers. We try common ones.
            // Keys in standard `sheet_to_json` are usually the header strings.

            // Normalize keys to simpler lowercase to find matches
            const normalizedRow: any = {};
            Object.keys(row).forEach(k => {
                normalizedRow[k.toLowerCase().trim()] = row[k];
            });

            const dateVal = normalizedRow['date'] || normalizedRow['date opération'] || normalizedRow['date operation'];
            const label = normalizedRow['libellé'] || normalizedRow['libelle'] || normalizedRow['description'] || normalizedRow['label'] || normalizedRow['memo'];

            let amount = 0;
            if (normalizedRow['montant'] !== undefined || normalizedRow['amount'] !== undefined) {
                amount = parseFloat(normalizedRow['montant'] || normalizedRow['amount']);
            } else {
                // Credit / Debit Strategy
                const credit = parseFloat(normalizedRow['crédit'] || normalizedRow['credit'] || '0');
                const debit = parseFloat(normalizedRow['débit'] || normalizedRow['debit'] || '0');
                amount = credit - Math.abs(debit);
            }

            if (!dateVal || !label) return null;

            // Date parsing in Excel can be:
            // 1. Serial number (e.g. 44505) -> XLSX helper needed usually, but sheet_to_json might parse it if raw false? 
            // By default `sheet_to_json` with raw: false (default is true?) tries to keep types?
            // Actually it's cleaner to handle JS Date if XLSX parsed it, or string.

            // Let's assume dateVal is likely a string "DD/MM/YYYY" or a JS Date object depends on options
            // If it's a number (serial), we need to convert.

            let finalDate: Date;
            if (typeof dateVal === 'number') {
                // Excel serial date
                // (n - 25569) * 86400 * 1000 ? 
                // Or use library helper if possible, but simpler to just try 'raw: false' which gives strings, 
                // OR assuming manual conversion.
                // JS Date: new Date(Math.round((excelDate - 25569)*86400*1000));
                finalDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
            } else {
                // Try parsing string
                finalDate = new Date(dateVal);
                if (isNaN(finalDate.getTime()) && typeof dateVal === 'string' && dateVal.includes('/')) {
                    // manual french parsing
                    const [d, m, y] = dateVal.split('/');
                    finalDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                }
            }

            return {
                date: finalDate,
                amount: amount,
                description: String(label),
                fitId: this.generateFitId(finalDate.toISOString(), label, amount),
                type: amount >= 0 ? 'CREDIT' : 'DEBIT'
            };
        }).filter(t => t !== null) as OfxTransaction[];
    }

    private static generateFitId(date: string, desc: string, amount: number): string {
        return Buffer.from(`${date}-${desc}-${amount}`).toString('base64');
    }
}
