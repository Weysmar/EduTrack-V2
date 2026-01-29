/**
 * Utility to mask sensitive IBAN data
 */
export function maskIban(iban?: string | null): string | undefined {
    if (!iban) return undefined;
    const clean = iban.replace(/\s/g, '');
    if (clean.length < 8) return iban;

    // Format: FR76 **** **** **** 1234
    return `${clean.slice(0, 4)} **** **** **** ${clean.slice(-4)}`;
}

/**
 * Mask account number (similar logic)
 */
export function maskAccountNumber(accountNumber?: string | null): string | undefined {
    if (!accountNumber) return undefined;
    if (accountNumber.length < 6) return accountNumber;

    return `****${accountNumber.slice(-4)}`;
}
