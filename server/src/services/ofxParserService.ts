import { parse } from 'ofx-parser';
import { OfxData, OfxAccount, OfxTransaction } from '../types/ofx';

export class OfxParserService {

    static async parseFile(fileBuffer: Buffer): Promise<OfxData> {
        return new Promise((resolve, reject) => {
            try {
                let ofxString = fileBuffer.toString('utf-8');

                // Clean header junk if present before <OFX> tag
                const ofxIndex = ofxString.search(/<OFX>/i);
                if (ofxIndex !== -1) {
                    ofxString = ofxString.substring(ofxIndex);
                }

                parse(ofxString).then((data: any) => {
                    const extractedAccounts: OfxAccount[] = [];

                    // OFX structure can vary. We look for BANKMSGSRSV1 -> STMTTRNRS -> STMTRS
                    // Or CREDITCARDMSGSRSV1 -> CCSTMTTRNRS -> CCSTMTRS

                    // Helper to process a statement response block
                    const processStatement = (stmtrs: any, isCreditCard = false) => {
                        try {
                            const currency = stmtrs.CURDEF || 'EUR';
                            let accountId = '';
                            let bankId = '';

                            if (isCreditCard) {
                                accountId = stmtrs.CCACCTFROM?.ACCTID || '';
                            } else {
                                accountId = stmtrs.BANKACCTFROM?.ACCTID || '';
                                bankId = stmtrs.BANKACCTFROM?.BANKID || '';
                            }

                            // Balance
                            const ledgerBal = stmtrs.LEDGERBAL || {};
                            const balance = parseFloat(ledgerBal.BALAMT || '0');
                            const balanceDateStr = ledgerBal.DTASOF || '';
                            const balanceDate = balanceDateStr ? OfxParserService.parseOfxDate(balanceDateStr) : undefined;

                            // Transactions
                            const transactions: OfxTransaction[] = [];
                            const transList = stmtrs.BANKTRANLIST?.STMTTRN || [];

                            // Handle single transaction vs array
                            const transArray = Array.isArray(transList) ? transList : [transList];

                            transArray.forEach((trn: any) => {
                                if (!trn) return;

                                const amount = parseFloat(trn.TRNAMT);
                                if (isNaN(amount)) return;

                                const date = OfxParserService.parseOfxDate(trn.DTPOSTED);
                                const name = trn.NAME || '';
                                const memo = trn.MEMO || '';
                                const description = `${name} ${memo}`.trim();

                                transactions.push({
                                    date,
                                    amount,
                                    description,
                                    fitId: trn.fitId || trn.FITID || '', // Crucial for deduplication
                                    checkNumber: trn.CHECKNUM,
                                    type: amount >= 0 ? 'CREDIT' : 'DEBIT'
                                });
                            });

                            // Extract SWIFT/BIC if possible
                            const detectedSwift = OfxParserService.extractSwiftFromInstitutionId(bankId);

                            extractedAccounts.push({
                                accountId,
                                bankId,
                                currency,
                                balance,
                                balanceDate,
                                transactions,
                                swift: detectedSwift // Add the detected SWIFT code
                            });

                        } catch (err) {
                            console.error("Error processing OFX statement block", err);
                        }
                    };

                    // Look for Bank Statements
                    const bankMsgs = data.OFX?.BANKMSGSRSV1?.STMTTRNRS;
                    if (bankMsgs) {
                        const msgs = Array.isArray(bankMsgs) ? bankMsgs : [bankMsgs];
                        msgs.forEach((msg: any) => {
                            if (msg.STMTRS) processStatement(msg.STMTRS, false);
                        });
                    }

                    // Look for Credit Card Statements
                    const ccMsgs = data.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS;
                    if (ccMsgs) {
                        const msgs = Array.isArray(ccMsgs) ? ccMsgs : [ccMsgs];
                        msgs.forEach((msg: any) => {
                            if (msg.CCSTMTRS) processStatement(msg.CCSTMTRS, true);
                        });
                    }

                    if (extractedAccounts.length === 0) {
                        reject(new Error("Aucun compte ou transaction trouvé dans le fichier OFX."));
                        return;
                    }

                    resolve({ accounts: extractedAccounts });

                }).catch((err: any) => {
                    console.error("OFX Parser Error:", err);
                    reject(new Error("Erreur lors du parsing du fichier OFX."));
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    private static parseOfxDate(dateStr: string): Date {
        if (!dateStr || dateStr.length < 8) return new Date();

        // YYYYMMDDHHMMSS.....
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-indexed
        const day = parseInt(dateStr.substring(6, 8));

        // Handle time if present, otherwise default to noon to avoid timezone shift issues on pure dates
        let hours = 12;
        let minutes = 0;
        let seconds = 0;

        if (dateStr.length >= 14) {
            hours = parseInt(dateStr.substring(8, 10));
            minutes = parseInt(dateStr.substring(10, 12));
            seconds = parseInt(dateStr.substring(12, 14));
        }

        return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    }
    public static extractSwiftFromInstitutionId(institutionId: string): string | null {
        if (!institutionId) return null;

        // Some OFX files put the BIC directly in the FID/BankID
        if (/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(institutionId)) {
            return institutionId;
        }

        // Common French Bank codes mapping (approximate)
        const mapping: Record<string, string> = {
            '30003': 'SOGEFRPP', // SG
            '30004': 'BNPAFRPP', // BNP
            '30002': 'AGRIFRPP', // CA
            '30006': 'CCBPFRPP', // Banque Pop
            '10278': 'CMCIFRPP', // CCM
            '20041': 'PSSTFRPP', // La Banque Postale
            '18206': 'CEPAFRPP', // CE
            '30066': 'CICAFRPP', // CIC
            '14518': 'CRLYFRPP', // LCL
            '40618': 'BOUSFRPP', // Boursorama (old code)
            '44053': 'ARKEFRPP', // Fortuneo
        };

        return mapping[institutionId] || null;
    }
}
