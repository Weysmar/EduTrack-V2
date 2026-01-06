// Simple encryption for local storage of API keys
// WARNING: This provides only obfuscation/at-rest protection against casual inspection.
// Since the key is derived from a static salt without a user password, 
// a sophisticated attacker with filesystem access could decrypt it.
// Ideally, we would ask the user for a password to derive the key.

const SALT = "EduTrack_Local_Salt_v1";

// Helper to check for secure context support
function isSecureContext() {
    return window.crypto && window.crypto.subtle;
}

async function getKey(): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(SALT),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode("fixed-salt"),
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

export async function encrypt(text: string): Promise<{ cipher: string; iv: string }> {
    // FALLBACK FOR INSECURE CONTEXTS (HTTP LAN)
    if (!isSecureContext()) {
        console.warn("EduTrack: Running in insecure context (HTTP). Using Base64 encoding for keys.");
        // Mock IV for compatibility
        return {
            cipher: window.btoa(text),
            iv: "insecure-context-iv"
        };
    }

    try {
        const key = await getKey();
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();

        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(text)
        );

        return {
            cipher: arrayBufferToBase64(encrypted),
            iv: arrayBufferToBase64(iv.buffer)
        };
    } catch (e) {
        console.error("Encryption failed:", e);
        throw e;
    }
}

export async function decrypt(cipher: string, iv: string): Promise<string> {
    // FALLBACK FOR INSECURE CONTEXTS
    if (iv === "insecure-context-iv" || !isSecureContext()) {
        try {
            return window.atob(cipher);
        } catch (e) {
            console.error("Simple decryption failed", e);
            return "";
        }
    }

    try {
        const key = await getKey();
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: base64ToArrayBuffer(iv) },
            key,
            base64ToArrayBuffer(cipher)
        );
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.error("Decryption failed:", e);
        return "";
    }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}
