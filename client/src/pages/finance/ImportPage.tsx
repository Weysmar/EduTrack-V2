import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertTriangle, ArrowRight, X, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { useFinanceStore } from '@/store/financeStore';
import { useNavigate } from 'react-router-dom';
import { cn, maskIban } from '@/lib/utils';
import { toast } from 'sonner';

// Types (Mocking Backend Response for UI Phase)
interface PreviewData {
    accounts: {
        isNew: boolean;
        accountName: string;
        accountNumber: string;
        balance: number;
        currency: string;
    }[];
    transactions: {
        date: string;
        amount: number;
        description: string;
        classification: 'EXTERNAL' | 'INTERNAL_INTRA' | 'INTERNAL_INTER' | 'UNKNOWN';
        confidence: number;
        isDuplicate: boolean;
    }[];
    summary: {
        total: number;
        new: number;
        duplicates: number;
    };
}

const ImportPage: React.FC = () => {
    const navigate = useNavigate();
    const { banks, fetchBanks } = useFinanceStore();

    // Workflow State
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [selectedBankId, setSelectedBankId] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);

    // Step 1: Upload Logic
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/ofx': ['.ofx', '.qif'], 'text/csv': ['.csv'] }, // allowing csv for now too
        maxFiles: 1
    });

    const handleAnalyze = async () => {
        if (!file || !selectedBankId) return;
        setStep(2); // Analysis

        // Mocking API delay and response (Backend Phase 2 logic)
        setTimeout(() => {
            // Mock Data matching the spec
            setPreviewData({
                accounts: [
                    { isNew: false, accountName: "Compte Chèques", accountNumber: "FR76...1234", balance: 1250.50, currency: "EUR" },
                    { isNew: true, accountName: "Livret A (Détecté)", accountNumber: "FR76...9999", balance: 10000.00, currency: "EUR" }
                ],
                transactions: [
                    { date: "2026-01-20", amount: -49.99, description: "AMAZON PAYMENT", classification: "EXTERNAL", confidence: 0.65, isDuplicate: false },
                    { date: "2026-01-19", amount: -500.00, description: "VIREMENT EPARGNE", classification: "INTERNAL_INTRA", confidence: 0.95, isDuplicate: false },
                    { date: "2026-01-18", amount: -200.00, description: "VIREMENT A MARC", classification: "UNKNOWN", confidence: 0.30, isDuplicate: false },
                    { date: "2026-01-15", amount: -15.00, description: "NETFLIX", classification: "EXTERNAL", confidence: 0.8, isDuplicate: true } // Duplicate example
                ],
                summary: { total: 4, new: 3, duplicates: 1 }
            });
            setStep(3); // Preview
        }, 2000);
    };

    const handleConfirmImport = async () => {
        setStep(2); // Processing (re-use loading)
        // Mock Commit
        setTimeout(() => {
            setStep(4); // Success
        }, 1000);
    };

    // --- RENDER STEPS ---

    // Step 1: Upload
    if (step === 1) {
        return (
            <div className="max-w-2xl mx-auto py-10 space-y-8">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Importer des transactions</h1>
                    <p className="text-slate-500">Chargez votre fichier OFX et associez-le à une banque.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>1. Fichier Source</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Dropzone */}
                        <div
                            {...getRootProps()}
                            className={cn(
                                "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
                                isDragActive ? "border-primary bg-primary/5" : "border-slate-200 dark:border-slate-800 hover:border-primary/50",
                                file && "border-green-500 bg-green-50 dark:bg-green-900/10"
                            )}
                        >
                            <input {...getInputProps()} />
                            {file ? (
                                <div className="flex flex-col items-center text-green-600">
                                    <FileText className="w-10 h-10 mb-2" />
                                    <p className="font-medium">{file.name}</p>
                                    <p className="text-xs opacity-70">{(file.size / 1024).toFixed(2)} KB</p>
                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="mt-2 text-slate-500">Changer</Button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-slate-500">
                                    <Upload className="w-10 h-10 mb-2" />
                                    <p className="font-medium">Glissez votre fichier OFX ici</p>
                                    <p className="text-sm">ou cliquez pour parcourir</p>
                                </div>
                            )}
                        </div>

                        {/* Bank Select */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Banque concernée</label>
                            <select
                                className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-background"
                                value={selectedBankId}
                                onChange={(e) => setSelectedBankId(e.target.value)}
                            >
                                <option value="" disabled>Sélectionnez une banque...</option>
                                {banks.filter(b => !b.isArchived).map(bank => (
                                    <option key={bank.id} value={bank.id}>{bank.name}</option>
                                ))}
                            </select>
                            {banks.length === 0 && (
                                <p className="text-xs text-amber-500">Aucune banque déclarée. Ajoutez-en une via le panneau de droite.</p>
                            )}
                        </div>

                        <Button
                            className="w-full"
                            disabled={!file || !selectedBankId}
                            onClick={handleAnalyze}
                        >
                            Analyser et Prévisualiser
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Step 2: Loading
    if (step === 2) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <h2 className="text-xl font-medium">Analyse en cours...</h2>
                <p className="text-slate-500">Nous détectons les comptes et classifions les transactions.</p>
            </div>
        );
    }

    // Step 3: Preview
    if (step === 3 && previewData) {
        return (
            <div className="max-w-4xl mx-auto py-6 space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" /> Retour</Button>
                    <h1 className="text-2xl font-bold">Prévisualisation de l'import</h1>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Accounts Detected */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Comptes Détectés ({previewData.accounts.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {previewData.accounts.map((acc, i) => (
                                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{acc.isNew ? "Nouveau Compte" : acc.accountName}</span>
                                            {acc.isNew && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">New</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 font-mono">{maskIban(acc.accountNumber)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">{acc.balance} {acc.currency}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Summary Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Résumé</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span>Transactions Totales</span>
                                <span className="font-bold">{previewData.summary.total}</span>
                            </div>
                            <div className="flex justify-between items-center text-green-600">
                                <span>Nouvelles</span>
                                <span>+{previewData.summary.new}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400">
                                <span>Doublons (ignorés)</span>
                                <span>{previewData.summary.duplicates}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Transactions Preview */}
                <Card>
                    <CardHeader>
                        <CardTitle>Aperçu des Transactions</CardTitle>
                        <CardDescription>Les transactions seront classifiées automatiquement.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {previewData.transactions.map((tx, i) => (
                                <div key={i} className={cn("flex items-center justify-between p-3 rounded hover:bg-slate-50 dark:hover:bg-slate-900 border-b last:border-0", tx.isDuplicate && "opacity-50 grayscale")}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{tx.description}</span>
                                            {tx.isDuplicate && <span className="text-[10px] border px-1 rounded">Doublon</span>}
                                        </div>
                                        <div className="flex gap-2 mt-1">
                                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                                                tx.classification === 'EXTERNAL' ? 'bg-slate-100 text-slate-600' :
                                                    tx.classification === 'INTERNAL_INTRA' ? 'bg-blue-100 text-blue-600' :
                                                        tx.classification === 'INTERNAL_INTER' ? 'bg-indigo-100 text-indigo-600' :
                                                            'bg-amber-100 text-amber-600'
                                            )}>
                                                {tx.classification}
                                            </span>
                                            <span className="text-xs text-slate-400 flex items-center">
                                                {Math.round(tx.confidence * 100)}% sureté
                                            </span>
                                        </div>
                                    </div>
                                    <div className={cn("font-medium", tx.amount > 0 ? "text-green-600" : "text-slate-900 dark:text-slate-100")}>
                                        {tx.amount} €
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setStep(1)}>Annuler</Button>
                    <Button onClick={handleConfirmImport} className="bg-green-600 hover:bg-green-700 text-white">
                        Confirmer l'import ({previewData.summary.new})
                    </Button>
                </div>
            </div>
        );
    }

    // Step 4: Success
    if (step === 4) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center space-y-6 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-green-700">Import Réussi !</h2>
                    <p className="text-slate-500 mt-2">
                        {previewData?.summary.new} transactions ajoutées.<br />
                        Les soldes de vos comptes ont été mis à jour.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep(1)}>Importer un autre fichier</Button>
                    <Button onClick={() => navigate('/finance/dashboard')}>Voir le Tableau de Bord</Button>
                </div>
            </div>
        );
    }

    return null;
};

export default ImportPage;
