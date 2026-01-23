import Papa from 'papaparse';
import { Prisma } from '@prisma/client';

export interface ParsedTransaction {
    date: Date;
    description: string;
    amount: number; // Will be converted to Decimal later
    type: 'INCOME' | 'EXPENSE';
    importedId?: string; // Optional external ID
}

export const parseCsv = async (fileBuffer: Buffer): Promise<ParsedTransaction[]> => {
    const csvString = fileBuffer.toString('utf-8');

    return new Promise((resolve, reject) => {
        Papa.parse(csvString, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.toLowerCase().trim(),
            complete: (results) => {
                const transactions: ParsedTransaction[] = [];
                const errors: any[] = [];

                results.data.forEach((row: any) => {
                    try {
                        const tx = mapRowToTransaction(row);
                        if (tx) transactions.push(tx);
                    } catch (e) {
                        errors.push(e);
                    }
                });

                if (transactions.length === 0 && results.data.length > 0) {
                    // Fallback: try headerless detection or different logic?
                    // For now, strict mapping
                    reject(new Error("Aucune transaction valide trouvée. Vérifiez le format CSV (Date;Description;Montant)."));
                } else {
                    resolve(transactions);
                }
            },
            error: (err: any) => reject(err)
        });
    });
};

function mapRowToTransaction(row: any): ParsedTransaction | null {
    // Flexible mapping strategy
    // 1. Date
    const dateStr = row['date'] || row['date operation'] || row['dt'] || row['libelle date'];
    if (!dateStr) return null; // Skip invalid lines

    const date = parseDate(dateStr);

    // 2. Description
    const description = row['description'] || row['libelle'] || row['libellé'] || row['tiers'] || row['objet'] || 'Import';

    // 3. Amount
    let amountStr = row['amount'] || row['montant'] || row['credit'] || row['debit'] || row['valeur'];

    // Handle separate Credit/Debit columns (Common in French banks)
    let amount = 0;
    if (row['credit'] && row['credit'] !== '') {
        amount = parseFloat(row['credit'].replace(',', '.').replace(/[^\d.-]/g, ''));
    } else if (row['debit'] && row['debit'] !== '') {
        amount = -Math.abs(parseFloat(row['debit'].replace(',', '.').replace(/[^\d.-]/g, '')));
    } else if (amountStr) {
        amount = parseFloat(amountStr.replace(',', '.').replace(/[^\d.-]/g, ''));
    } else {
        return null; // No amount found
    }

    if (isNaN(amount)) return null;

    // Type logic
    const type = amount >= 0 ? 'INCOME' : 'EXPENSE';

    return {
        date,
        description: description.trim(),
        amount: new Prisma.Decimal(amount).toNumber(), // Helper to keep it numeric for now, Controller handles Decimal
        type
    };
}

function parseDate(dateStr: string): Date {
    // Handle DD/MM/YYYY or YYYY-MM-DD
    if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return new Date(`${year.length === 2 ? '20' + year : year}-${month}-${day}`);
    }
    return new Date(dateStr);
}
