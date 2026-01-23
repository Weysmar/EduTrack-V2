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
    // Try to detect encoding or fallback to utf-8. 
    // Ideally we'd use iconv-lite but standard library only supports utf8/latin1 (binary)
    // For now assuming UTF-8 but stripping BOM if present
    let csvString = fileBuffer.toString('utf-8');
    if (csvString.charCodeAt(0) === 0xFEFF) {
        csvString = csvString.slice(1);
    }

    return new Promise((resolve, reject) => {
        Papa.parse(csvString, {
            header: true,
            skipEmptyLines: 'greedy', // Better than true
            delimiter: "", // Auto-detect
            transformHeader: (h) => h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), // Remove accents for safer matching

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
    // Helper to find value by fuzzy key match
    const getValue = (keywords: string[]): string | undefined => {
        const keys = Object.keys(row);
        for (const keyword of keywords) {
            // Exact match first
            if (row[keyword]) return row[keyword];
            // Fuzzy match (key contains keyword) - strict enough to avoid false positives
            const match = keys.find(k => k.includes(keyword));
            if (match) return row[match];
        }
        return undefined;
    };

    // 1. Date
    // Keywords: date, dt, op
    const dateStr = getValue(['date', 'dt', 'date operation', 'date val']);
    if (!dateStr) return null; // Skip invalid lines

    const date = parseDate(dateStr);
    if (!date || isNaN(date.getTime())) return null;

    // 2. Description
    // Keywords: libelle, description, objet, tiers, label
    const description = getValue(['libelle', 'libellé', 'description', 'objet', 'tiers', 'label']) || 'Import';

    // 3. Amount
    // Keywords: montant, amount, credit, debit, valeur, solde shouldn't be matched
    let amount = 0;

    // Explicit Credit/Debit check first (often separate columns)
    const creditStr = getValue(['credit', 'crédit']);
    const debitStr = getValue(['debit', 'débit']);

    if (creditStr && creditStr.trim() !== '') {
        amount = parseAmount(creditStr);
    } else if (debitStr && debitStr.trim() !== '') {
        amount = -Math.abs(parseAmount(debitStr));
    } else {
        // Single column check
        const amountStr = getValue(['montant', 'amount', 'valeur', 'solde']); // Care with solde being balance
        if (amountStr) {
            amount = parseAmount(amountStr);
        } else {
            return null;
        }
    }

    // Type logic
    const type = amount >= 0 ? 'INCOME' : 'EXPENSE';

    return {
        date,
        description: description.replace(/\s+/g, ' ').trim(), // Clean up spaces
        amount: new Prisma.Decimal(amount).toNumber(),
        type
    };
}

function parseAmount(str: string): number {
    // Handle "1 200,50" -> 1200.50 (French format)
    // Handle "1,200.50" -> 1200.50 (US format)

    // Remove spaces first
    let clean = str.replace(/\s/g, '');

    // If comma is decimal separator (last separator is comma)
    if (clean.includes(',') && !clean.includes('.')) {
        clean = clean.replace(',', '.');
    } else if (clean.includes(',') && clean.includes('.')) {
        // "1.200,50" or "1,200.50"
        if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
            // 1.200,50 -> Remove dots, replace comma
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            // 1,200.50 -> Remove commas
            clean = clean.replace(/,/g, '');
        }
    }

    return parseFloat(clean.replace(/[^\d.-]/g, ''));
}

function parseDate(dateStr: string): Date {
    // Handle DD/MM/YYYY or YYYY-MM-DD
    if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return new Date(`${year.length === 2 ? '20' + year : year}-${month}-${day}`);
    }
    return new Date(dateStr);
}
