import React, { useState, useEffect } from 'react';
import { 
    FileText, Printer, Copy, Check, CheckSquare, Square, AlertTriangle, 
    Lightbulb, Sparkles, BookOpen, Compass, ChevronDown, ChevronUp, Share2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RevisionSheetData } from '@/lib/revision/sheetGenerator';

interface RevisionSheetViewerProps {
    item: any;
    className?: string;
}

export function RevisionSheetViewer({ item, className }: RevisionSheetViewerProps) {
    const [copied, setCopied] = useState(false);
    const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

    // Parse data from item content
    const sheetData: RevisionSheetData | null = React.useMemo(() => {
        if (!item?.content) return null;
        try {
            return JSON.parse(item.content);
        } catch {
            return null;
        }
    }, [item?.content]);

    // Local storage key for checklist persistence
    const checklistStorageKey = `revision_checklist_${item?.id || 'default'}`;

    useEffect(() => {
        try {
            const saved = localStorage.getItem(checklistStorageKey);
            if (saved) setCheckedItems(JSON.parse(saved));
        } catch {
            // ignore
        }
    }, [checklistStorageKey]);

    const toggleCheckItem = (index: number) => {
        const next = { ...checkedItems, [index]: !checkedItems[index] };
        setCheckedItems(next);
        try {
            localStorage.setItem(checklistStorageKey, JSON.stringify(next));
        } catch {
            // ignore
        }
    };

    const handleCopyMarkdown = () => {
        if (!sheetData) return;
        const textToCopy = sheetData.markdown || JSON.stringify(sheetData, null, 2);
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        toast.success("Fiche copiée dans le presse-papier !");
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = () => {
        window.print();
    };

    if (!sheetData) {
        // Fallback to text/markdown if JSON parse failed
        return (
            <div className="max-w-4xl mx-auto p-6 bg-card border rounded-2xl shadow-xs">
                <h1 className="text-2xl font-bold mb-4">{item.title}</h1>
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                    {item.content}
                </div>
            </div>
        );
    }

    const completedChecks = Object.values(checkedItems).filter(Boolean).length;
    const totalChecks = sheetData.masteryChecklist?.length || 0;
    const progressPercent = totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;

    return (
        <div className={cn("max-w-5xl mx-auto pb-16 space-y-6 print:p-0 print:m-0 print:max-w-none", className)}>
            {/* Print Header ONLY visible when printing */}
            <div className="hidden print:block mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold text-black">{sheetData.title}</h1>
                <p className="text-xs text-gray-600 mt-1">Fiche de révision générée par EduTrack IA • {new Date().toLocaleDateString('fr-FR')}</p>
            </div>

            {/* Top Interactive Hero Bar (hidden in print) */}
            <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-sm">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Fiche de Révision IA</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{sheetData.title}</h1>
                    <p className="text-white/90 text-sm max-w-2xl leading-relaxed">
                        {sheetData.overview}
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-center flex-shrink-0">
                    <button
                        onClick={handleCopyMarkdown}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium backdrop-blur-sm transition-all flex items-center gap-1.5 border border-white/20"
                        title="Copier le format Markdown"
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copied ? 'Copié !' : 'Copier'}</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-white text-indigo-700 hover:bg-white/90 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                    >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Imprimer / PDF</span>
                    </button>
                </div>
            </div>

            {/* In Print mode: Overview block */}
            <div className="hidden print:block mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm italic">
                <strong>Synthèse :</strong> {sheetData.overview}
            </div>

            {/* Progress indicator (hidden in print) */}
            {totalChecks > 0 && (
                <div className="bg-card border rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <CheckSquare className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold">Progression de maîtrise</div>
                            <div className="text-xs text-muted-foreground">
                                {completedChecks} sur {totalChecks} notions validées ({progressPercent}%)
                            </div>
                        </div>
                    </div>
                    <div className="w-full sm:w-60 bg-muted rounded-full h-2.5 overflow-hidden">
                        <div 
                            className="bg-primary h-full rounded-full transition-all duration-300" 
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* GRID SECTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:block print:space-y-6">
                
                {/* 1. DÉFINITIONS & NOTIONS CLÉS */}
                {sheetData.keyConcepts && sheetData.keyConcepts.length > 0 && (
                    <div className="bg-card border rounded-2xl p-5 shadow-xs flex flex-col gap-4 print:border-gray-300 print:shadow-none">
                        <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 border-b pb-3">
                            <BookOpen className="h-5 w-5" />
                            <h2 className="text-base font-bold text-foreground">Définitions & Notions Clés</h2>
                        </div>
                        <div className="space-y-3.5">
                            {sheetData.keyConcepts.map((concept, idx) => (
                                <div key={idx} className="p-3 bg-muted/40 rounded-xl border border-border/50 hover:border-indigo-500/30 transition-colors">
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <span className="font-bold text-sm text-foreground">{concept.term}</span>
                                        <span className={cn(
                                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                            concept.importance === 'critical' 
                                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20" 
                                                : concept.importance === 'important'
                                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                        )}>
                                            {concept.importance === 'critical' ? 'Essentiel' : concept.importance === 'important' ? 'Important' : 'Bonus'}
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                        {concept.definition}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. RÈGLES FONDAMENTALES & FORMULES */}
                {sheetData.rulesAndFormulas && sheetData.rulesAndFormulas.length > 0 && (
                    <div className="bg-card border rounded-2xl p-5 shadow-xs flex flex-col gap-4 print:border-gray-300 print:shadow-none">
                        <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 border-b pb-3">
                            <Compass className="h-5 w-5" />
                            <h2 className="text-base font-bold text-foreground">Formules & Principes Clés</h2>
                        </div>
                        <div className="space-y-3.5">
                            {sheetData.rulesAndFormulas.map((item, idx) => (
                                <div key={idx} className="p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                                    <h3 className="font-bold text-xs sm:text-sm text-foreground mb-1.5">{item.label}</h3>
                                    <div className="px-3 py-1.5 bg-background font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-500/30 mb-2 overflow-x-auto">
                                        {item.ruleOrFormula}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {item.explanation}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. PIÈGES D'EXAMEN & ERREURS FRÉQUENTES */}
                {sheetData.examTraps && sheetData.examTraps.length > 0 && (
                    <div className="bg-card border rounded-2xl p-5 shadow-xs flex flex-col gap-4 print:border-gray-300 print:shadow-none">
                        <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 border-b pb-3">
                            <AlertTriangle className="h-5 w-5" />
                            <h2 className="text-base font-bold text-foreground">Pièges d'Examen Fréquents</h2>
                        </div>
                        <div className="space-y-3.5">
                            {sheetData.examTraps.map((trap, idx) => (
                                <div key={idx} className="p-3.5 bg-rose-500/5 rounded-xl border border-rose-500/20 space-y-1.5">
                                    <div className="flex items-start gap-2">
                                        <span className="text-rose-500 font-bold text-xs">⚠️ Piège :</span>
                                        <span className="text-xs sm:text-sm font-semibold text-foreground">{trap.trap}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground pl-5 italic">
                                        {trap.explanation}
                                    </div>
                                    <div className="text-xs text-emerald-700 dark:text-emerald-400 pl-5 font-medium flex items-center gap-1.5 pt-1">
                                        <span>👉 Bon réflexe :</span>
                                        <span>{trap.correctApproach}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. ASTUCES MÉMO & MNÉMOTECHNIQUES */}
                {sheetData.mnemonics && sheetData.mnemonics.length > 0 && (
                    <div className="bg-card border rounded-2xl p-5 shadow-xs flex flex-col gap-4 print:border-gray-300 print:shadow-none">
                        <div className="flex items-center gap-2.5 text-amber-500 dark:text-amber-400 border-b pb-3">
                            <Lightbulb className="h-5 w-5" />
                            <h2 className="text-base font-bold text-foreground">Astuces & Mémo</h2>
                        </div>
                        <div className="space-y-3.5">
                            {sheetData.mnemonics.map((m, idx) => (
                                <div key={idx} className="p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/20">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-xs sm:text-sm text-foreground">{m.title}</span>
                                    </div>
                                    <div className="font-semibold text-xs text-amber-800 dark:text-amber-300 py-1 px-2.5 bg-amber-500/10 rounded-md inline-block my-1">
                                        "{m.trick}"
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                                        {m.explanation}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* 5. CHECKLIST DE MAÎTRISE */}
            {sheetData.masteryChecklist && sheetData.masteryChecklist.length > 0 && (
                <div className="bg-card border rounded-2xl p-5 shadow-xs space-y-4 print:border-gray-300 print:shadow-none">
                    <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2.5 text-primary">
                            <CheckSquare className="h-5 w-5" />
                            <h2 className="text-base font-bold text-foreground">Objectifs de Maîtrise pour l'Épreuve</h2>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium print:hidden">
                            Cochez au fur et à mesure de vos révisions
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {sheetData.masteryChecklist.map((itemText, idx) => {
                            const isChecked = !!checkedItems[idx];
                            return (
                                <div
                                    key={idx}
                                    onClick={() => toggleCheckItem(idx)}
                                    className={cn(
                                        "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none",
                                        isChecked 
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-foreground" 
                                            : "bg-muted/30 border-border/60 hover:bg-muted/60 text-muted-foreground"
                                    )}
                                >
                                    <div className="mt-0.5 flex-shrink-0">
                                        {isChecked ? (
                                            <div className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center">
                                                <Check className="h-3.5 w-3.5" />
                                            </div>
                                        ) : (
                                            <div className="w-5 h-5 rounded-md border border-muted-foreground/40 hover:border-primary" />
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-xs sm:text-sm leading-relaxed",
                                        isChecked ? "font-medium text-foreground line-through opacity-80" : "text-foreground"
                                    )}>
                                        {itemText}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
