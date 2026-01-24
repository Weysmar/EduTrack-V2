import { parse } from 'ofx-parser';
import { Prisma } from '@prisma/client';
import { ParsedTransaction } from './csvParserService';

export const parseOfx = async (fileBuffer: Buffer): Promise<ParsedTransaction[]> => {
    return new Promise((resolve, reject) => {
        try {
            let ofxString = fileBuffer.toString('utf-8');

            // Fix: Strip OFX Headers (everything before first <OFX> tag, case insensitive)
            const ofxIndex = ofxString.search(/<OFX>/i);
            if (ofxIndex !== -1) {
                ofxString = ofxString.substring(ofxIndex);
            }

            parse(ofxString).then((data: any) => {
                const transactions: ParsedTransaction[] = [];

                // Recursive search for transaction lists (STMTTRN)
                const stmtList = findTransactionNodes(data);

                if (!stmtList || stmtList.length === 0) {
                    console.error("OFX Structure Valid keys:", Object.keys(data));
                    reject(new Error("Aucune transaction trouvée (Structure incompatible)."));
                    return;
                }

                stmtList.forEach((stmt: any) => {
                    try {
                        const dateStr = stmt.DTPOSTED;
                        const date = parseOfxDate(dateStr);

                        const amount = parseFloat(stmt.TRNAMT);
                        const name = stmt.NAME || '';
                        const memo = stmt.MEMO || '';
                        const description = `${name} ${memo}`.trim();
                        const fitId = stmt.FITID;

                        if (date && !isNaN(amount)) {
                            transactions.push({
                                date,
                                description: description.replace(/\s+/g, ' ').trim(),
                                amount: new Prisma.Decimal(amount).toNumber(),
                                type: amount >= 0 ? 'INCOME' : 'EXPENSE',
                                importedId: fitId
                            });
                        }
                    } catch (err) {
                        console.warn("Skipping OFX row", err);
                    }
                });

                resolve(transactions);

            }).catch((err: any) => {
                console.error("OFX Parse Error:", err);
                reject(new Error("Erreur de parsing OFX: " + err.message));
            });

        } catch (e) {
            reject(e);
        }
    });
};

// Helper to recursively find STMTTRN nodes
function findTransactionNodes(obj: any): any[] {
    let results: any[] = [];

    if (!obj || typeof obj !== 'object') return results;

    // Check if current object represents a transaction list (BANKTRANLIST) containing STMTTRN
    if (obj.STMTTRN) {
        if (Array.isArray(obj.STMTTRN)) {
            results = results.concat(obj.STMTTRN);
        } else {
            results.push(obj.STMTTRN);
        }
    }

    // Recurse keys
    Object.keys(obj).forEach(key => {
        // Optimization: Don't recurse into strings/numbers
        if (typeof obj[key] === 'object') {
            const childResults = findTransactionNodes(obj[key]);
            results = results.concat(childResults);
        }
    });

    return results;
}

function parseOfxDate(dateStr: string): Date {
    if (!dateStr || dateStr.length < 8) return new Date();
    // YYYYMMDD...
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return new Date(`${year}-${month}-${day}`);
}
