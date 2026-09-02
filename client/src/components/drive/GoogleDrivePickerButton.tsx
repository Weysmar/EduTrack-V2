 import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/components/language-provider';
import { getGoogleDriveCredentials } from '@/lib/drive/config';
import { openGoogleDrivePicker, downloadDriveFileAsLocalFile } from '@/lib/drive/googleDriveService';

interface GoogleDrivePickerButtonProps {
    onFilesSelected: (files: File[]) => void;
    className?: string;
    disabled?: boolean;
}

export function GoogleDrivePickerButton({
    onFilesSelected,
    className = "",
    disabled = false
}: GoogleDrivePickerButtonProps) {
    const { language } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [progressText, setProgressText] = useState<string | null>(null);

    const handleClick = async () => {
        const { isConfigured } = getGoogleDriveCredentials();

        if (!isConfigured) {
            toast.error(
                language === 'fr'
                    ? "Google Drive non configuré"
                    : "Google Drive not configured",
                {
                    description: language === 'fr'
                        ? "Veuillez renseigner votre Client ID Google Drive dans les Paramètres de votre profil."
                        : "Please configure your Google Drive Client ID in your profile Settings."
                }
            );
            return;
        }

        setIsLoading(true);
        setProgressText(language === 'fr' ? "Sélection Drive..." : "Opening Drive...");

        try {
            const pickedFiles = await openGoogleDrivePicker();
            if (!pickedFiles || pickedFiles.length === 0) {
                setIsLoading(false);
                setProgressText(null);
                return;
            }

            const total = pickedFiles.length;
            const downloadedFiles: File[] = [];

            for (let i = 0; i < total; i++) {
                const picked = pickedFiles[i];
                setProgressText(
                    language === 'fr'
                        ? `Importation (${i + 1}/${total}) : ${picked.name.substring(0, 20)}...`
                        : `Importing (${i + 1}/${total}): ${picked.name.substring(0, 20)}...`
                );

                try {
                    const localFile = await downloadDriveFileAsLocalFile(picked);
                    downloadedFiles.push(localFile);
                } catch (downloadErr: any) {
                    console.error("Error downloading file from Drive:", downloadErr);
                    toast.error(`Erreur sur ${picked.name}`, {
                        description: downloadErr.message
                    });
                }
            }

            if (downloadedFiles.length > 0) {
                onFilesSelected(downloadedFiles);
                toast.success(
                    language === 'fr'
                        ? `${downloadedFiles.length} fichier(s) importé(s) depuis Google Drive`
                        : `${downloadedFiles.length} file(s) imported from Google Drive`
                );
            }
        } catch (error: any) {
            console.error("Google Drive Picker error:", error);
            toast.error(
                language === 'fr' ? "Erreur Google Drive" : "Google Drive error",
                {
                    description: error.message || "Impossible de se connecter à Google Drive."
                }
            );
        } finally {
            setIsLoading(false);
            setProgressText(null);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled || isLoading}
            className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border bg-background hover:bg-muted/80 text-foreground transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            title={language === 'fr' ? "Importer des fichiers depuis Google Drive" : "Import files from Google Drive"}
        >
            {isLoading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>{progressText || (language === 'fr' ? "Chargement..." : "Loading...")}</span>
                </>
            ) : (
                <>
                    <GoogleDriveIcon className="h-4 w-4 shrink-0" />
                    <span>Google Drive</span>
                </>
            )}
        </button>
    );
}

function GoogleDriveIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 87.3 78" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA"/>
            <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A8.93 8.93 0 000 53h27.5L43.65 25z" fill="#00AC47"/>
            <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.15 7.9 13.65z" fill="#EA4335"/>
            <path d="M43.65 25L57.4 1.2c-1.35-.8-2.9-1.2-4.45-1.2H34.35c-1.55 0-3.1.4-4.45 1.2L43.65 25z" fill="#00832D"/>
            <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.45 1.2h50.9c1.55 0 3.1-.4 4.45-1.2L59.8 53z" fill="#2684FC"/>
            <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5l-12.7-22z" fill="#FFBA00"/>
        </svg>
    );
}
