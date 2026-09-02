 import { getGoogleDriveCredentials, GOOGLE_DRIVE_SCOPES } from './config';

export interface DriveSelectedFile {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes?: number;
    url?: string;
    iconUrl?: string;
}

declare global {
    interface Window {
        gapi: any;
        google: any;
    }
}

let tokenClient: any = null;
let currentAccessToken: string | null = null;
let isGapiPickerLoaded = false;

/**
 * Loads the Google API Picker script dynamically if not already available
 */
export async function loadGooglePickerApi(): Promise<void> {
    if (isGapiPickerLoaded && window.gapi?.picker) {
        return;
    }

    return new Promise((resolve, reject) => {
        if (!window.gapi) {
            reject(new Error("Google API script (gapi) non chargé dans la page"));
            return;
        }

        window.gapi.load('picker', {
            callback: () => {
                isGapiPickerLoaded = true;
                resolve();
            },
            onerror: () => reject(new Error("Échec du chargement du module Google Picker"))
        });
    });
}

const DRIVE_TOKEN_STORAGE_KEY = 'edutrack_gdrive_token';
const DRIVE_TOKEN_EXPIRY_KEY = 'edutrack_gdrive_token_expiry';

/**
 * Retrieves cached active Google Drive token from memory or sessionStorage
 */
function getCachedAccessToken(): string | null {
    if (currentAccessToken) return currentAccessToken;
    const stored = sessionStorage.getItem(DRIVE_TOKEN_STORAGE_KEY);
    const expiry = sessionStorage.getItem(DRIVE_TOKEN_EXPIRY_KEY);
    if (stored && expiry && Date.now() < parseInt(expiry, 10)) {
        currentAccessToken = stored;
        return stored;
    }
    return null;
}

/**
 * Saves Google Drive token to cache & sessionStorage (with safety buffer)
 */
function setCachedAccessToken(token: string, expiresInSeconds: number = 3500) {
    currentAccessToken = token;
    sessionStorage.setItem(DRIVE_TOKEN_STORAGE_KEY, token);
    sessionStorage.setItem(DRIVE_TOKEN_EXPIRY_KEY, (Date.now() + expiresInSeconds * 1000).toString());
}

/**
 * Requests an OAuth 2.0 access token using Google Identity Services (GIS)
 */
export async function requestDriveAccessToken(forcePrompt = false): Promise<string> {
    const cached = getCachedAccessToken();
    if (cached && !forcePrompt) {
        return cached;
    }

    const { clientId } = getGoogleDriveCredentials();

    if (!clientId) {
        throw new Error("Client ID Google Drive non configuré. Renseignez-le dans les paramètres.");
    }

    if (!window.google?.accounts?.oauth2) {
        throw new Error("Google Identity Services non disponible. Vérifiez votre connexion internet.");
    }

    return new Promise((resolve, reject) => {
        try {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: GOOGLE_DRIVE_SCOPES,
                callback: (tokenResponse: any) => {
                    if (tokenResponse.error !== undefined) {
                        reject(new Error(tokenResponse.error_description || tokenResponse.error));
                        return;
                    }
                    const expiresIn = tokenResponse.expires_in ? parseInt(tokenResponse.expires_in, 10) : 3500;
                    setCachedAccessToken(tokenResponse.access_token, expiresIn);
                    resolve(tokenResponse.access_token);
                },
                error_callback: (err: any) => {
                    reject(new Error(err.message || "Erreur d'authentification Google"));
                }
            });

            // If we have had a session or not forcing prompt, request without asking consent again
            tokenClient.requestAccessToken({ prompt: '' });
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Opens Google Picker modal and returns the list of selected files
 */
export async function openGoogleDrivePicker(): Promise<DriveSelectedFile[]> {
    await loadGooglePickerApi();
    const token = await requestDriveAccessToken();
    const { apiKey } = getGoogleDriveCredentials();

    return new Promise((resolve, reject) => {
        try {
            const google = window.google;
            const pickerBuilder = new google.picker.PickerBuilder();

            // Set Views (All files, Docs, PDFs, Images)
            const docsView = new google.picker.DocsView()
                .setIncludeFolders(true)
                .setSelectFolderEnabled(false);

            pickerBuilder
                .addView(docsView)
                .setOAuthToken(token)
                .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
                .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
                .setCallback((data: any) => {
                    if (data.action === google.picker.Action.PICKED) {
                        const docs = data[google.picker.Response.DOCUMENTS] || [];
                        const selectedFiles: DriveSelectedFile[] = docs.map((doc: any) => ({
                            id: doc[google.picker.Document.ID],
                            name: doc[google.picker.Document.NAME],
                            mimeType: doc[google.picker.Document.MIME_TYPE],
                            sizeBytes: doc[google.picker.Document.SIZE_BYTES],
                            url: doc[google.picker.Document.URL],
                            iconUrl: doc[google.picker.Document.ICON_URL]
                        }));
                        resolve(selectedFiles);
                    } else if (data.action === google.picker.Action.CANCEL) {
                        resolve([]);
                    }
                });

            if (apiKey) {
                pickerBuilder.setDeveloperKey(apiKey);
            }

            const picker = pickerBuilder.build();
            picker.setVisible(true);
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Converts / exports or downloads a Drive file into a standard File instance for EduTrack
 */
export async function downloadDriveFileAsLocalFile(
    file: DriveSelectedFile,
    accessToken?: string
): Promise<File> {
    const token = accessToken || currentAccessToken || (await requestDriveAccessToken());

    // Map Google Workspace native formats to appropriate export MIME types & extensions
    const googleWorkspaceMimeMap: Record<string, { exportMime: string; extension: string }> = {
        'application/vnd.google-apps.document': {
            exportMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            extension: '.docx'
        },
        'application/vnd.google-apps.spreadsheet': {
            exportMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            extension: '.xlsx'
        },
        'application/vnd.google-apps.presentation': {
            exportMime: 'application/pdf',
            extension: '.pdf'
        },
        'application/vnd.google-apps.drawing': {
            exportMime: 'image/png',
            extension: '.png'
        }
    };

    const isGoogleWorkspace = !!googleWorkspaceMimeMap[file.mimeType];
    let downloadUrl: string;
    let targetMimeType = file.mimeType;
    let fileName = file.name;

    if (isGoogleWorkspace) {
        const mapping = googleWorkspaceMimeMap[file.mimeType];
        targetMimeType = mapping.exportMime;
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(mapping.exportMime)}`;
        
        // Ensure proper extension is appended if missing
        if (!fileName.toLowerCase().endsWith(mapping.extension)) {
            fileName = `${fileName}${mapping.extension}`;
        }
    } else {
        // Binary / standard files (PDF, images, archives, existing DOCX, etc.)
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
    }

    const response = await fetch(downloadUrl, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Échec du téléchargement de "${file.name}" depuis Google Drive (${response.statusText})`);
    }

    const blob = await response.blob();
    const resultFile = new File([blob], fileName, { type: targetMimeType });
    (resultFile as any).driveFileId = file.id;
    return resultFile;
}

/**
 * Downloads latest version of a Drive file by its driveFileId
 */
export async function downloadDriveFileById(
    driveFileId: string,
    fallbackName?: string,
    accessToken?: string
): Promise<File> {
    const token = accessToken || currentAccessToken || (await requestDriveAccessToken());

    // 1. Fetch file metadata
    const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=id,name,mimeType,size`,
        {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }
    );

    if (!metaRes.ok) {
        throw new Error(`Impossible de récupérer les métadonnées Drive (${metaRes.statusText})`);
    }

    const metadata = await metaRes.json();
    return downloadDriveFileAsLocalFile({
        id: metadata.id,
        name: metadata.name || fallbackName || 'document',
        mimeType: metadata.mimeType
    }, token);
}
