import { useState, useCallback, useEffect } from 'react';
import { useFinance, useFinanceImport } from '@/hooks/useFinance';
import { useLanguage } from '@/components/language-provider';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, ArrowRight, Table as TableIcon, FileSpreadsheet } from 'lucide-react';
import { ImportPreviewData } from '@/types/finance';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { format } from 'date-fns';
import { ClassificationBadge } from '@/components/finance/ClassificationBadge';
import { ImportHistory } from '@/components/finance/ImportHistory';

export default function ImportPage() {
    const { t } = useLanguage();
    const { banks, accounts, isLoadingBanks } = useFinance(); // Bank and Accounts
    const { previewImport, confirmImport, isPreviewing, isConfirming } = useFinanceImport();
    const navigate = useNavigate();

    const [selectedBankId, setSelectedBankId] = useState<string>('');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
    const [file, setFile] = useState<File | null>(null);

    // --- Steps Management ---
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Preview, 3: Success

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/x-ofx': ['.ofx', '.qfx'],
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        maxFiles: 1,
        disabled: step !== 1
    });

    const getFileIcon = (fileName: string) => {
        if (fileName.endsWith('.csv')) return <TableIcon className="w-12 h-12 text-green-400" />;
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return <FileSpreadsheet className="w-12 h-12 text-green-500" />;
        return <FileText className="w-12 h-12 text-blue-400" />;
    };

    const handlePreview = async () => {
        if (!file || !selectedBankId) {
            toast.error(t('finance.import.toast.error.noFile'));
            return;
        }

        try {
            const data = await previewImport({
                file,
                bankId: selectedBankId,
                accountId: selectedAccountId || undefined
            });
            setPreviewData(data);
            setStep(2);
        } catch (err) {
            console.error(err);
        }
    };

    // Auto-select bank if SWIFT is detected
    useEffect(() => {
        if ((previewData as any)?.accounts?.[0]?.swift) {
            const swift = (previewData as any).accounts[0].swift;
            const matchingBank = banks.find(b => b.swiftBic === swift);
            if (matchingBank) {
                setSelectedBankId(matchingBank.id);
                toast.success(t('finance.import.toast.detectingBank', { name: matchingBank.name }));
            }
        }
    }, [previewData, banks]);

    const handleConfirm = async () => {
        if (!previewData || !selectedBankId) return;
        try {
            await confirmImport({ bankId: selectedBankId, importData: previewData });
            setStep(3);
            toast.success(t('finance.import.toast.success'));
        } catch (err) {
            console.error(err);
        }
    };

    const reset = () => {
        setFile(null);
        setPreviewData(null);
        setStep(1);
    }

    if (isLoadingBanks) return <div className="p-8 text-center text-slate-400">{t('finance.import.loading')}</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-100">{t('finance.import.title')}</h1>
                <p className="text-slate-400 mt-2">{t('finance.import.description')}</p>
            </div>

            {/* Stepper Visual */}
            <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
                <span className={clsx(step === 1 && "text-blue-400")}>1. {t('finance.import.step.upload')}</span>
                <ArrowRight size={16} />
                <span className={clsx(step === 2 && "text-blue-400")}>2. {t('finance.import.step.preview')}</span>
                <ArrowRight size={16} />
                <span className={clsx(step === 3 && "text-green-400")}>3. {t('finance.import.step.result')}</span>
            </div>

            {/* --- STEP 1: UPLOAD --- */}
            {step === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">

                    {/* Import History Component */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <ImportHistory />
                    </div>

                    <div className="space-y-6">
                        {/* Bank Selector */}
                        <div className="space-y-2">
                            <label className="text-slate-300 font-medium">{t('finance.import.bank.target')}</label>
                            <select
                                value={selectedBankId}
                                onChange={(e) => setSelectedBankId(e.target.value)}
                                className="w-full md:w-1/2 p-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">{t('finance.import.bank.select')}</option>
                                {banks?.map(bank => (
                                    <option key={bank.id} value={bank.id}>{bank.name}</option>
                                ))}
                            </select>
                            {banks?.length === 0 && (
                                <p className="text-sm text-amber-500">
                                    {t('finance.import.bank.none')} <a href="/finance/settings" className="underline">{t('finance.import.bank.createFirst')}</a>
                                </p>
                            )}
                        </div>

                        {/* Account Selector (Optional but Recommended) */}
                        {selectedBankId && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-slate-300 font-medium">{t('finance.import.account.target')}</label>
                                <p className="text-xs text-slate-500">{t('finance.import.account.help')}</p>
                                <select
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    className="w-full md:w-1/2 p-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">{t('finance.import.account.auto')}</option>
                                    {accounts?.filter(a => a.bankId === selectedBankId).map(account => (
                                        <option key={account.id} value={account.id}>{account.name} ({account.currency})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Dropzone */}
                        <div
                            {...getRootProps()}
                            className={clsx(
                                "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors relative overflow-hidden",
                                isDragActive ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-slate-500 bg-slate-800/50",
                                file && "border-green-500/50 bg-green-500/5"
                            )}
                        >
                            <input {...getInputProps()} />
                            <div className="flex flex-col items-center gap-4 relative z-10">
                                {file ? (
                                    <>
                                        {getFileIcon(file.name)}
                                        <div>
                                            <p className="font-medium text-slate-200">{file.name}</p>
                                            <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                            className="text-xs text-red-400 hover:underline"
                                        >
                                            {t('finance.import.dropzone.change')}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-12 h-12 text-slate-500" />
                                        <div>
                                            <p className="font-medium text-slate-200">{t('finance.import.dropzone.placeholder')}</p>
                                            <p className="text-sm text-slate-500">{t('finance.import.dropzone.accepted')}</p>
                                        </div>
                                        <div className="flex gap-2 text-xs text-slate-600 mt-2">
                                            <span className="bg-slate-800 px-2 py-1 rounded">.ofx</span>
                                            <span className="bg-slate-800 px-2 py-1 rounded">.csv</span>
                                            <span className="bg-slate-800 px-2 py-1 rounded">.xlsx</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handlePreview}
                                disabled={!file || !selectedBankId || isPreviewing}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
                            >
                                {isPreviewing ? t('finance.import.action.analyzing') : t('finance.import.action.continue')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- STEP 2: PREVIEW --- */}
            {step === 2 && previewData && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <h3 className="text-slate-400 text-sm mb-1">{t('finance.import.summary.total')}</h3>
                            <p className="text-2xl font-bold text-slate-100">{previewData.summary.totalTransactions}</p>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <h3 className="text-slate-400 text-sm mb-1">{t('finance.import.summary.new')}</h3>
                            <p className="text-2xl font-bold text-green-400">{previewData.summary.newTransactions}</p>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <h3 className="text-slate-400 text-sm mb-1">{t('finance.import.summary.duplicates')}</h3>
                            <p className="text-2xl font-bold text-slate-500">{previewData.summary.duplicates}</p>
                        </div>
                    </div>

                    {/* Detected Accounts */}
                    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-700 font-medium text-slate-200">
                            {t('finance.import.accounts.detected')} ({previewData.accounts.length})
                        </div>
                        <div className="divide-y divide-slate-800">
                            {previewData.accounts.map((acc, i) => (
                                <div key={i} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={clsx("w-2 h-2 rounded-full flex-shrink-0", acc.isNew ? "bg-green-500" : "bg-blue-500")} />
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={acc.accountName}
                                                onChange={(e) => {
                                                    const newAccounts = [...previewData.accounts];
                                                    newAccounts[i].accountName = e.target.value;
                                                    setPreviewData({ ...previewData, accounts: newAccounts });
                                                }}
                                                className="font-medium text-slate-200 bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 focus:bg-slate-800/50 outline-none w-full transition-all px-1 -ml-1 rounded"
                                            />
                                            <p className="text-sm text-slate-500 font-mono">{acc.accountNumber}</p>
                                        </div>
                                        {acc.isNew && (
                                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded flex-shrink-0">{t('common.new') || "Nouveau"}</span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-200 font-medium">{new Intl.NumberFormat(t('common.locale') || 'fr-FR', { style: 'currency', currency: acc.currency }).format(acc.balance)}</p>
                                        <p className="text-sm text-slate-500">{t('finance.account.balance.current')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Transactions Preview */}
                    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-700 font-medium text-slate-200 flex justify-between items-center">
                            <span>{t('finance.import.step.preview')} ({previewData.transactions.length})</span>
                            <span className="text-sm text-slate-400">{t('finance.import.account.help')}</span>
                        </div>
                        <div className="overflow-x-auto max-h-[600px]">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-800 text-slate-400 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3">{t('finance.tx.date')}</th>
                                        <th className="p-3">{t('finance.tx.description')}</th>
                                        <th className="p-3 text-right">{t('finance.tx.amount')}</th>
                                        <th className="p-3 text-center">{t('finance.tx.category')}</th>
                                        <th className="p-3 text-center">{t('common.status') || "Statut"}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {previewData.transactions.map((tx, i) => (
                                        <tr key={i} className={clsx(tx.isDuplicate && "opacity-50")}>
                                            <td className="p-3 text-slate-300 whitespace-nowrap">
                                                {format(new Date(tx.date), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="p-3 text-slate-300 max-w-xs truncate" title={tx.description}>
                                                {tx.description}
                                            </td>
                                            <td className={clsx("p-3 text-right font-medium", tx.amount >= 0 ? "text-green-400" : "text-slate-200")}>
                                                {new Intl.NumberFormat(t('common.locale') || 'fr-FR', { style: 'currency', currency: 'EUR' }).format(tx.amount)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <ClassificationBadge classification={tx.classification} confidence={tx.confidence} />
                                            </td>
                                            <td className="p-3 text-center">
                                                {tx.isDuplicate ? (
                                                    <span className="text-xs bg-slate-800 text-slate-500 px-2 py-1 rounded">{t('finance.import.summary.duplicates')}</span>
                                                ) : (
                                                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">{t('common.new') || "Nouveau"}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <button
                            onClick={() => setStep(1)}
                            className="text-slate-400 hover:text-white px-4 py-2 transition-colors"
                        >
                            {t('common.back')}
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isConfirming || previewData.summary.newTransactions === 0}
                            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {isConfirming ? t('finance.import.action.confirming') : t('finance.import.action.confirmCount', { count: previewData.summary.newTransactions })}
                        </button >
                    </div >
                </div >
            )}

            {/* --- STEP 3: SUCCESS --- */}
            {
                step === 3 && (
                    <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-100 mb-2">{t('finance.import.success.title')}</h2>
                        <p className="text-slate-400 mb-8 max-w-md text-center">
                            {t('finance.import.success.description')}
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => navigate('/finance/dashboard')}
                                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg transition-colors"
                            >
                                {t('common.actions.cancel') || 'Dashboard'}
                            </button>
                            <button
                                onClick={reset}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                            >
                                {t('finance.hero.import.btn') || "Importer"}
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
