import { parse } from 'ofx-parser';
import { Prisma } from '@prisma/client';
import { ParsedTransaction } from './csvParserService';

export const parseOfx = async (fileBuffer: Buffer): Promise<ParsedTransaction[]> => {
    return new Promise((resolve, reject) => {
        try {
            let ofxString = fileBuffer.toString('utf-8');

            // Fix: Strip OFX Headers (everything before first <OFX> tag, case insensitive)
            // OFX files often start with headers like OFXHEADER:100... which breaks XML parsers
            const ofxIndex = ofxString.search(/<OFX>/i);
            if (ofxIndex !== -1) {
                ofxString = ofxString.substring(ofxIndex);
            }

            parse(ofxString).then((data: any) => {
                const transactions: ParsedTransaction[] = [];

                // Navigate OFX Structure
                // OFX -> BANKMSGSRSV1 -> STMTTRNRS -> STMTRS -> BANKTRANLIST -> STMTTRN
                // Note: ofx-parser usually camelCases or keeps tags. Let's dump structure ideally, but we guess.

                // Handle version difference (1.0.2 vs 2.0)
                const bankMsgs = data.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN ||
                    data.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS?.BANKTRANLIST?.STMTTRN;

                if (!bankMsgs) {
                    console.error("OFX Structure Invalid (Keys found):", Object.keys(data?.OFX || {}));
                    reject(new Error("Structure OFX non reconnue ou pas de transactions."));
                    return;
                }

                // Ensure it's an array (single transaction might be object)
                const stmtList = Array.isArray(bankMsgs) ? bankMsgs : [bankMsgs];

                stmtList.forEach((stmt: any) => {
                    try {
                        // OFX Dates are YYYYMMDDHHMMSS usually
                        const dateStr = stmt.DTPOSTED;
                        const date = parseOfxDate(dateStr);

                        const amount = parseFloat(stmt.TRNAMT);
                        const name = stmt.NAME || '';
                        const memo = stmt.MEMO || '';
                        const description = `${name} ${memo}`.trim();
                        const fitId = stmt.FITID; // Could use as importedId

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

                if (transactions.length === 0) {
                    reject(new Error("Aucune transaction trouvée dans le fichier OFX."));
                } else {
                    resolve(transactions);
                }

            }).catch((err: any) => {
                console.error("OFX Parse Error:", err);
                reject(new Error("Erreur de parsing OFX: " + err.message));
            });

        } catch (e) {
            reject(e);
        }
    });
};

function parseOfxDate(dateStr: string): Date {
    if (!dateStr || dateStr.length < 8) return new Date(); // Fallback
    // YYYYMMDD...
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return new Date(`${year}-${month}-${day}`);
}
