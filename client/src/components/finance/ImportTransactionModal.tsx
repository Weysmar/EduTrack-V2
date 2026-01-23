import { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertCircle, Loader2, X } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImportTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (file: File) => Promise<void>; // Will be connected to store/API later
}

export function ImportTransactionModal({ isOpen, onClose, onImport }: ImportTransactionModalProps) {
    const { t } = useLanguage();
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setFile(null);
            setIsUploading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) validateAndSetFile(droppedFile);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) validateAndSetFile(selectedFile);
    };

    const validateAndSetFile = (f: File) => {
        const ext = f.name.split('.').pop()?.toLowerCase();
        if (['csv', 'ofx', 'qif'].includes(ext || '')) {
            setFile(f);
        } else {
            toast.error(t('import.error.format') || "Format non supporté. Utilisez CSV, OFX ou QIF.");
        }
    };

    const handleSubmit = async () => {
        if (!file) return;
        setIsUploading(true);
        try {
            await onImport(file);
            toast.success(t('import.success') || "Import réussi !");
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(t('import.error.generic') || "Erreur lors de l'import.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-card rounded-xl shadow-xl border animate-in zoom-in-95">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">{t('import.title') || "Importer des opérations"}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Drop Zone */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                            "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all gap-4",
                            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                            file ? "bg-muted/30 border-solid" : ""
                        )}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.ofx,.qif"
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        {file ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="p-3 bg-primary/10 rounded-full text-primary">
                                    <FileText className="h-8 w-8" />
                                </div>
                                <div>
                                    <p className="font-medium">{file.name}</p>
                                    <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                    className="text-xs text-red-500 hover:underline mt-2"
                                >
                                    Changer de fichier
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="p-3 bg-muted rounded-full">
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium">Cliquez ou glissez un fichier ici</p>
                                    <p className="text-xs text-muted-foreground">Supporte CSV (Point-virgule), OFX, QIF</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 hover:bg-muted rounded-md transition-colors text-sm"
                            disabled={isUploading}
                        >
                            {t('action.cancel')}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!file || isUploading}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t('action.import') || "Importer"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
