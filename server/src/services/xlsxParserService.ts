import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';
import { ParsedTransaction } from './csvParserService';

export const parseXlsx = async (fileBuffer: Buffer): Promise<ParsedTransaction[]> => {
    return new Promise((resolve, reject) => {
        try {
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON with header detection
            const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (!jsonData || jsonData.length === 0) {
                reject(new Error("Le fichier XLSX est vide ou illisible."));
                return;
            }

            const transactions: ParsedTransaction[] = [];

            // Strategy: Find the header row
            // Look for row containing 'Date', 'Montant', 'Libellé'
            let headerRowIndex = -1;
            for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
                const row = jsonData[i].map(c => String(c).toLowerCase());
                if (row.some(c => c.includes('date')) && (row.some(c => c.includes('montant')) || row.some(c => c.includes('debit')) || row.some(c => c.includes('credit')))) {
                    headerRowIndex = i;
                    break;
                }
            }

            // Heuristic for columns if header not found or standard LCL/Bank export
            let dateCol = -1;
            let amountCol = -1;
            let descCol = -1;
            let debitCol = -1;
            let creditCol = -1;

            if (headerRowIndex !== -1) {
                const header = jsonData[headerRowIndex].map(c => String(c).toLowerCase());

                dateCol = header.findIndex(c => c.includes('date'));
                descCol = header.findIndex(c => c.includes('libell') || c.includes('description') || c.includes('opération'));

                // Check if separate Debit/Credit columns
                debitCol = header.findIndex(c => c.includes('débit') || c.includes('debit'));
                creditCol = header.findIndex(c => c.includes('crédit') || c.includes('credit'));

                if (debitCol === -1 && creditCol === -1) {
                    amountCol = header.findIndex(c => c.includes('montant') || c.includes('solde') === false); // Avoid Solde
                }
            } else {
                // No Header found, use column indices logic similar to CSV parser for LCL
                // Usually Col 0 = Date, Col 1 or 2 = Description, Col 3+ = Amount
                // Let's assume standard first few rows are metadata and data starts later
                // Fallback: Check types of first valid data row
                headerRowIndex = 0; // Assume data starts immediately if no header found? Or retry heuristics
                dateCol = 0;
                descCol = 2; // Guess
                amountCol = 1; // Guess
            }

            // Process Rows
            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                try {
                    // Date Parsing (Excel dates are numbers usually, or strings)
                    let date: Date | null = null;
                    const dateRaw = row[dateCol];

                    if (typeof dateRaw === 'number') {
                        // Excel serial date
                        date = new Date(Math.round((dateRaw - 25569) * 86400 * 1000));
                    } else if (typeof dateRaw === 'string') {
                        date = parseDateString(dateRaw);
                    } else {
                        // dateRaw might be Date object if parsed by xlsx option cellDates: true (not used here)
                        continue;
                    }

                    if (!date || isNaN(date.getTime())) continue;

                    // Amount Parsing
                    let amount = 0;
                    if (debitCol !== -1 && creditCol !== -1) {
                        const debit = parseAmount(row[debitCol]);
                        const credit = parseAmount(row[creditCol]);
                        if (credit > 0) amount = credit;
                        else if (debit > 0) amount = -debit; // Debit is usually positive number in column
                        else if (typeof row[debitCol] === 'number' && row[debitCol] < 0) amount = row[debitCol]; // If debit is negative
                    } else {
                        amount = parseAmount(row[amountCol]);
                    }

                    if (isNaN(amount) || amount === 0) continue;

                    // Description Parsing
                    let description = '';
                    if (descCol !== -1 && row[descCol]) {
                        description = String(row[descCol]).trim();
                    } else {
                        // Concatenate others?
                        description = row.filter((_, idx) => idx !== dateCol && idx !== amountCol && idx !== debitCol && idx !== creditCol).join(' ').trim();
                    }

                    if (!description) description = "Import XLSX";

                    const type = amount >= 0 ? 'INCOME' : 'EXPENSE';

                    transactions.push({
                        date,
                        description: description.replace(/\s+/g, ' ').trim(),
                        amount: new Prisma.Decimal(amount).toNumber(),
                        type
                    });

                } catch (err) {
                    console.warn(`Row ${i} skipped`, err);
                }
            }

            if (transactions.length === 0) {
                reject(new Error("Aucune transaction valide trouvée dans le fichier XLSX."));
            } else {
                resolve(transactions);
            }

        } catch (e) {
            reject(e);
        }
    });
};

function parseDateString(dateStr: string): Date | null {
    if (!dateStr) return null;
    // Common formats: DD/MM/YYYY
    if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        if (day && month && year) {
            return new Date(`${year.length === 2 ? '20' + year : year}-${month}-${day}`);
        }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

function parseAmount(val: any): number {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).replace(/\s/g, '').replace('€', '').replace(',', '.');
    return parseFloat(str);
}
