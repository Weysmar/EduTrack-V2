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
    // UTF-8 with BOM Handling
    let csvString = fileBuffer.toString('utf-8');
    if (csvString.charCodeAt(0) === 0xFEFF) {
        csvString = csvString.slice(1);
    }

    return new Promise((resolve, reject) => {
        // First, detecting presence of header
        // Heuristic: Does the first row contain date/amount keywords?
        const firstLine = csvString.split('\n')[0].toLowerCase();
        const hasHeader = firstLine.includes('date') || firstLine.includes('montant') || firstLine.includes('libell');

        Papa.parse(csvString, {
            header: hasHeader,
            skipEmptyLines: 'greedy',
            delimiter: "", // Auto-detect
            transformHeader: hasHeader ? (h) => h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : undefined,

            complete: (results) => {
                const transactions: ParsedTransaction[] = [];
                const errors: any[] = [];

                results.data.forEach((row: any) => {
                    try {
                        const tx = hasHeader ? mapRowToTransaction(row) : mapIndexToTransaction(row as string[]);
                        if (tx) transactions.push(tx);
                    } catch (e) {
                        errors.push(e);
                    }
                });

                if (transactions.length === 0) {
                    reject(new Error("Aucune transaction valide trouvée. Vérifiez que le fichier est un CSV valide (LCL, Bourso, etc.)."));
                } else {
                    resolve(transactions);
                }
            },
            error: (err: any) => reject(err)
        });
    });
};

function mapIndexToTransaction(row: string[]): ParsedTransaction | null {
    // Strategy: Detect Date and Amount columns dynamically or use fixed LCL pattern
    if (!row || row.length < 2) return null;

    // LCL Export Format often like: 
    // 0: Date (DD/MM/YYYY)
    // 1: Amount (1234,56)
    // 2: Type (Virement, Carte...)
    // 3: Empty?
    // 4: Description 1 ? 
    // 5: Description 2 ?

    // 1. Find Date (Column 0 usually)
    const date = parseDate(row[0]);
    if (!date || isNaN(date.getTime())) return null;

    // 2. Find Amount (Column 1 usually)
    let amount = parseAmount(row[1]);
    if (isNaN(amount)) return null;

    // 3. Find Description
    // In the sample:
    // Row 3: ...;;COTISATION... (Col 4)
    // Row 4: ...;;;VIREMENT... (Col 5?)
    // Row 23: ...;;Revolut... (Col 4)
    // Let's concatenate meaningful columns for description
    // Avoid columns that are just Date/Amount/Type
    // Indices 4, 5, 6 seem to contain description parts in LCL sample
    const potentialDescIds = [2, 3, 4, 5, 6, 7];
    let description = potentialDescIds
        .map(i => row[i])
        .filter(s => s && s.trim().length > 0 && s !== row[1]) // Avoid repeating amount if accidentally matched
        .join(' ');

    if (!description || description.trim() === '') description = row[2] || "Import LCL"; // Fallback to Type

    const type = amount >= 0 ? 'INCOME' : 'EXPENSE';

    return {
        date,
        description: description.replace(/\s+/g, ' ').trim(),
        amount: new Prisma.Decimal(amount).toNumber(),
        type
    };
}

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
    if (!str) return 0;
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
    if (!dateStr) return new Date('Invalid');
    // Handle DD/MM/YYYY or YYYY-MM-DD
    if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return new Date(`${year.length === 2 ? '20' + year : year}-${month}-${day}`);
    }
    return new Date(dateStr);
}
