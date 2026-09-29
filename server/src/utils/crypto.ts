import crypto from 'crypto';

/**
 * Chiffrement au repos des clés API utilisateur (architecture BYOK).
 *
 * Les clés sont stockées dans Profile.settings (colonne JSON). Sans ce module,
 * elles y étaient en clair : quiconque a un accès lecture à la base de données
 * (dump, backup, accès admin compromis) pouvait lire directement les clés
 * Gemini/Perplexity de tous les utilisateurs.
 *
 * Format des valeurs chiffrées : "enc:v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>"
 * Le préfixe "enc:v1:" permet à decryptSecret() de distinguer une valeur
 * chiffrée d'une valeur historique encore en clair (rétrocompatibilité sans
 * migration bloquante : toute clé relue en clair est re-chiffrée à la
 * prochaine sauvegarde du profil).
 */

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';
const IV_LENGTH = 12;

/** Champs de Profile.settings contenant des secrets (clés API) à chiffrer au repos. */
export const SENSITIVE_SETTINGS_KEYS = [
    'google_gemini_summaries',
    'google_gemini_exercises',
    'google_gemini_categorization',
    'perplexity_summaries',
    'perplexity_exercises',
    'google_drive_api_key',
] as const;

let warnedMissingKey = false;
const warnOnce = (message: string) => {
    if (!warnedMissingKey) {
        console.warn(message);
        warnedMissingKey = true;
    }
};

const getKey = (): Buffer | null => {
    const raw = process.env.SETTINGS_ENCRYPTION_KEY;
    if (!raw) return null;
    // Accepte une clé hex 64 caractères (32 octets) telle quelle, sinon dérive 32 octets par SHA-256
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
    return crypto.createHash('sha256').update(raw).digest();
};

export const isEncryptionConfigured = (): boolean => !!getKey();

export const encryptSecret = (plainText?: string | null): string | null | undefined => {
    if (!plainText || typeof plainText !== 'string') return plainText;
    if (plainText.startsWith(PREFIX)) return plainText; // déjà chiffré

    const key = getKey();
    if (!key) {
        warnOnce(
            '[Crypto] SETTINGS_ENCRYPTION_KEY non défini : les clés API utilisateur sont stockées EN CLAIR en base. ' +
            'Définissez cette variable (32 octets, hex ou passphrase) en production.'
        );
        return plainText;
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
};

export const decryptSecret = (value?: string | null): string | null | undefined => {
    if (!value || typeof value !== 'string' || !value.startsWith(PREFIX)) {
        return value; // valeur héritée en clair, ou vide — passthrough
    }

    const key = getKey();
    if (!key) {
        console.error('[Crypto] Valeur chiffrée trouvée mais SETTINGS_ENCRYPTION_KEY est manquant : déchiffrement impossible.');
        return '';
    }

    try {
        const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(':');
        const iv = Buffer.from(ivB64, 'base64');
        const authTag = Buffer.from(tagB64, 'base64');
        const encrypted = Buffer.from(dataB64, 'base64');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (err) {
        console.error('[Crypto] Échec du déchiffrement d\'une clé API (valeur corrompue ou SETTINGS_ENCRYPTION_KEY modifié depuis le chiffrement).', err);
        return '';
    }
};

/** Chiffre les champs sensibles d'un objet Profile.settings avant écriture en base. */
export const encryptSensitiveSettings = (settings: Record<string, any>): Record<string, any> => {
    const result = { ...settings };
    for (const field of SENSITIVE_SETTINGS_KEYS) {
        if (typeof result[field] === 'string' && result[field]) {
            result[field] = encryptSecret(result[field]);
        }
    }
    return result;
};

/** Déchiffre les champs sensibles d'un objet Profile.settings après lecture en base. */
export const decryptSensitiveSettings = (settings: Record<string, any>): Record<string, any> => {
    const result = { ...settings };
    for (const field of SENSITIVE_SETTINGS_KEYS) {
        if (typeof result[field] === 'string' && result[field]) {
            result[field] = decryptSecret(result[field]);
        }
    }
    return result;
};
