/**
 * Utility to mask sensitive IBAN data
 */
export function maskIban(iban?: string | null): string | undefined {
    if (!iban) return undefined;
    if (iban.length < 8) return iban; // Too short to mask meaningfully

    // Format: FR**...1234
    return `${iban.slice(0, 4)}****${iban.slice(-4)}`;
}

/**
 * Mask account number (similar logic)
 */
export function maskAccountNumber(accountNumber?: string | null): string | undefined {
    if (!accountNumber) return undefined;
    if (accountNumber.length < 6) return accountNumber;

    return `****${accountNumber.slice(-4)}`;
}
