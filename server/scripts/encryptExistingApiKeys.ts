/**
 * Migration ponctuelle : chiffre au repos les clés API (Gemini/Perplexity/Drive) déjà
 * stockées en clair dans Profile.settings.
 *
 * Sans ce script, une clé existante n'est re-chiffrée qu'à la prochaine sauvegarde de
 * profil par l'utilisateur (comportement transparent géré par profileController). Ce
 * script permet de chiffrer immédiatement tout ce qui est déjà en base, sans attendre.
 *
 * Idempotent : peut être relancé sans risque (les valeurs déjà chiffrées, préfixées
 * "enc:v1:", sont laissées telles quelles par encryptSensitiveSettings).
 *
 * Usage :
 *   npx ts-node scripts/encryptExistingApiKeys.ts            (exécute la migration)
 *   npx ts-node scripts/encryptExistingApiKeys.ts --dry-run   (prévisualise sans écrire)
 */
import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/lib/prisma';
import { encryptSensitiveSettings, isEncryptionConfigured, SENSITIVE_SETTINGS_KEYS } from '../src/utils/crypto';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
    if (!isEncryptionConfigured()) {
        console.error(
            '\n❌ SETTINGS_ENCRYPTION_KEY n\'est pas défini. ' +
            'Générez-en une avec `openssl rand -hex 32`, définissez-la dans l\'environnement du serveur, puis relancez ce script.\n'
        );
        process.exit(1);
    }

    console.log(isDryRun ? '🔍 Mode dry-run (aucune écriture en base)\n' : '🔐 Migration : chiffrement des clés API existantes\n');

    const profiles = await prisma.profile.findMany({
        select: { id: true, name: true, settings: true }
    });

    let updated = 0;
    let alreadyEncrypted = 0;
    let noKeys = 0;

    for (const profile of profiles) {
        const settings = (profile.settings as any) || {};

        const hadAnyKey = SENSITIVE_SETTINGS_KEYS.some(k => typeof settings[k] === 'string' && settings[k]);
        if (!hadAnyKey) {
            noKeys++;
            continue;
        }

        const wasAlreadyEncrypted = SENSITIVE_SETTINGS_KEYS.every(k => {
            const v = settings[k];
            return !v || (typeof v === 'string' && v.startsWith('enc:v1:'));
        });

        const encrypted = encryptSensitiveSettings(settings);
        const changed = JSON.stringify(encrypted) !== JSON.stringify(settings);

        if (!changed) {
            alreadyEncrypted++;
            continue;
        }

        console.log(`  → Profil ${profile.id} (${profile.name || 'sans nom'}) : ${wasAlreadyEncrypted ? 'déjà chiffré, re-vérifié' : 'clé(s) en clair chiffrée(s)'}`);

        if (!isDryRun) {
            await prisma.profile.update({
                where: { id: profile.id },
                data: { settings: encrypted }
            });
        }
        updated++;
    }

    console.log(`\n✅ Terminé. ${updated} profil(s) ${isDryRun ? 'à mettre à jour' : 'mis à jour'}, ${alreadyEncrypted} déjà à jour, ${noKeys} sans clé API configurée (total: ${profiles.length}).`);
}

main()
    .catch((err) => {
        console.error('❌ Erreur pendant la migration :', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
