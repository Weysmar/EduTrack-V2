import csv from 'csv-parser';
import { Readable } from 'stream';
import { OfxData, OfxTransaction } from '../types/ofx';
import { parse } from 'date-fns';

export class CsvParserService {

    static async parseFile(fileBuffer: Buffer): Promise<OfxData> {
        const results: any[] = [];
        const content = fileBuffer.toString('utf-8'); // Auto-detect encoding later if needed?

        // Basic detection for separator
        const separator = content.includes(';') ? ';' : ',';

        return new Promise((resolve, reject) => {
            Readable.from(content)
                .pipe(csv({ separator }))
                .on('data', (data: any) => results.push(data))
                .on('end', () => {
                    try {
                        const transactions = this.mapToTransactions(results);
                        resolve({
                            accounts: [{
                                accountId: 'CSV_IMPORT', // Placeholder, we can't always know the account from CSV
                                currency: 'EUR',
                                balance: 0,
                                transactions
                            }]
                        });
                    } catch (err: any) {
                        reject(err);
                    }
                })
                .on('error', (err: any) => reject(err));
        });
    }

    private static mapToTransactions(rows: any[]): OfxTransaction[] {
        return rows.map(row => {
            // Flexible keys: Date, Date operation, Libellé, Description, Montant, Débit, Crédit
            const dateStr = row['Date'] || row['date'] || row['Date opération'];
            const label = row['Libellé'] || row['Description'] || row['description'] || row['Memo'];

            // Amount handling: could be "Montant" column, or "Débit"/"Crédit" columns
            let amount = 0;
            if (row['Montant'] || row['Amount']) {
                amount = this.parseNumber(row['Montant'] || row['Amount']);
            } else if (row['Débit'] || row['Debit'] || row['Crédit'] || row['Credit']) {
                const debit = this.parseNumber(row['Débit'] || row['Debit'] || '0');
                const credit = this.parseNumber(row['Crédit'] || row['Credit'] || '0');
                // Debit is usually positive in CSV but implies negative in accounting. 
                // Need to be careful. Usually logic is Amount = Credit - Debit.
                // Assuming "Debit" column contains positive numbers representing outflow.
                amount = credit - Math.abs(debit);
            }

            if (!dateStr || !label) return null; // Skip empty rows

            return {
                date: this.parseAppDate(dateStr),
                amount: amount,
                description: label,
                fitId: this.generateFitId(dateStr, label, amount), // Generate a pseudo-ID
                type: amount >= 0 ? 'CREDIT' : 'DEBIT'
            };
        }).filter(t => t !== null) as OfxTransaction[];
    }

    // Handle "12/05/2023" or "2023-05-12"
    private static parseAppDate(dateStr: string): Date {
        if (dateStr.includes('/')) {
            // Assume DD/MM/YYYY
            const [day, month, year] = dateStr.split('/');
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        return new Date(dateStr);
    }

    // Handle "1 200,50" -> 1200.50
    private static parseNumber(val: string): number {
        if (!val) return 0;
        let cleaned = val.replace(/\s/g, ''); // Remove spaces
        cleaned = cleaned.replace(',', '.');   // Replace comma with dot
        return parseFloat(cleaned);
    }

    private static generateFitId(date: string, desc: string, amount: number): string {
        // Simple hash to create a unique-ish ID for deduplication
        return Buffer.from(`${date}-${desc}-${amount}`).toString('base64');
    }
}
