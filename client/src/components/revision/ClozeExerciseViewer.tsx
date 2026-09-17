import React, { useState, useMemo } from 'react';
import { 
    Check, X, Sparkles, Lightbulb, RotateCcw, ArrowRight, ArrowLeft, 
    Trophy, HelpCircle, Eye, EyeOff, Keyboard, MousePointerClick, Award 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ClozeExerciseData, ClozeItem } from '@/lib/revision/clozeGenerator';

interface ClozeExerciseViewerProps {
    item: any;
    className?: string;
}

export function ClozeExerciseViewer({ item, className }: ClozeExerciseViewerProps) {
    const clozeData: ClozeExerciseData | null = useMemo(() => {
        if (!item?.content) return null;
        try {
            return JSON.parse(item.content);
        } catch {
            return null;
        }
    }, [item?.content]);

    const exercises = clozeData?.exercises || [];
    const [currentIndex, setCurrentIndex] = useState(0);
    const [inputMode, setInputMode] = useState<'bank' | 'typing'>('bank');
    
    // State per exercise: { [blankIndex]: string }
    const [answers, setAnswers] = useState<Record<number, Record<number, string>>>({});
    // Active blank focused in bank mode
    const [activeBlankIndex, setActiveBlankIndex] = useState<number | null>(0);
    // Revealed hints per exercise: { [blankIndex]: boolean }
    const [revealedHints, setRevealedHints] = useState<Record<number, Record<number, boolean>>>({});
    // Checked status per exercise
    const [isSubmitted, setIsSubmitted] = useState<Record<number, boolean>>({});
    // Show solutions per exercise
    const [showSolutions, setShowSolutions] = useState<Record<number, boolean>>({});
    // Finished summary
    const [isFinished, setIsFinished] = useState(false);

    if (!clozeData || exercises.length === 0) {
        return (
            <div className="max-w-3xl mx-auto p-6 bg-card border rounded-2xl text-center">
                <p className="text-muted-foreground">Aucun exercice disponible pour ce document.</p>
            </div>
        );
    }

    const currentExercise: ClozeItem = exercises[currentIndex];
    const currentAnswers = answers[currentIndex] || {};
    const currentHints = revealedHints[currentIndex] || {};
    const currentIsSubmitted = !!isSubmitted[currentIndex];
    const currentShowSolutions = !!showSolutions[currentIndex];

    const blanks = currentExercise.blanks || [];

    const handleSelectWordFromBank = (word: string) => {
        if (currentIsSubmitted) return;
        
        let targetBlank = activeBlankIndex;
        // If no blank active or active blank already filled, find the first empty blank
        if (targetBlank === null || currentAnswers[targetBlank]) {
            const firstEmpty = blanks.find(b => !currentAnswers[b.index]);
            targetBlank = firstEmpty ? firstEmpty.index : blanks[0]?.index ?? 0;
        }

        setAnswers(prev => ({
            ...prev,
            [currentIndex]: {
                ...(prev[currentIndex] || {}),
                [targetBlank!]: word
            }
        }));

        // Move to the next unfilled blank
        const nextBlank = blanks.find(b => b.index > targetBlank! && !currentAnswers[b.index]);
        if (nextBlank) {
            setActiveBlankIndex(nextBlank.index);
        } else {
            setActiveBlankIndex(null);
        }
    };

    const handleTypeAnswer = (blankIdx: number, val: string) => {
        if (currentIsSubmitted) return;
        setAnswers(prev => ({
            ...prev,
            [currentIndex]: {
                ...(prev[currentIndex] || {}),
                [blankIdx]: val
            }
        }));
    };

    const handleClearBlank = (blankIdx: number) => {
        if (currentIsSubmitted) return;
        setAnswers(prev => {
            const updated = { ...(prev[currentIndex] || {}) };
            delete updated[blankIdx];
            return {
                ...prev,
                [currentIndex]: updated
            };
        });
        setActiveBlankIndex(blankIdx);
    };

    const toggleHint = (blankIdx: number) => {
        setRevealedHints(prev => ({
            ...prev,
            [currentIndex]: {
                ...(prev[currentIndex] || {}),
                [blankIdx]: !prev[currentIndex]?.[blankIdx]
            }
        }));
    };

    const normalizeString = (s: string) => 
        s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const isBlankCorrect = (blankIdx: number) => {
        const userAnswer = currentAnswers[blankIdx];
        if (!userAnswer) return false;

        const blankDef = blanks.find(b => b.index === blankIdx);
        if (!blankDef) return false;

        const normalizedUser = normalizeString(userAnswer);
        const normalizedCorrect = normalizeString(blankDef.answer);

        if (normalizedUser === normalizedCorrect) return true;

        if (blankDef.acceptableAlternatives && blankDef.acceptableAlternatives.length > 0) {
            return blankDef.acceptableAlternatives.some(alt => normalizeString(alt) === normalizedUser);
        }

        return false;
    };

    const handleSubmitExercise = () => {
        setIsSubmitted(prev => ({ ...prev, [currentIndex]: true }));
        const correctCount = blanks.filter(b => isBlankCorrect(b.index)).length;
        if (correctCount === blanks.length) {
            toast.success("Parfait ! Tout est correct ! 🎉");
        } else {
            toast.info(`${correctCount} sur ${blanks.length} réponses correctes.`);
        }
    };

    const handleResetExercise = () => {
        setIsSubmitted(prev => ({ ...prev, [currentIndex]: false }));
        setShowSolutions(prev => ({ ...prev, [currentIndex]: false }));
        setAnswers(prev => ({ ...prev, [currentIndex]: {} }));
        setActiveBlankIndex(0);
    };

    // Words currently used in this exercise
    const usedWords = Object.values(currentAnswers);

    // Calculate total score across all exercises
    const totalBlanksAcrossAll = exercises.reduce((acc, ex) => acc + (ex.blanks?.length || 0), 0);
    const totalCorrectAcrossAll = exercises.reduce((acc, ex, exIdx) => {
        const exAnswers = answers[exIdx] || {};
        return acc + (ex.blanks || []).filter(b => {
            const user = normalizeString(exAnswers[b.index] || '');
            const correct = normalizeString(b.answer);
            const matchesAlt = b.acceptableAlternatives?.some(a => normalizeString(a) === user);
            return user === correct || matchesAlt;
        }).length;
    }, 0);

    const scorePercentage = totalBlanksAcrossAll > 0 
        ? Math.round((totalCorrectAcrossAll / totalBlanksAcrossAll) * 100) 
        : 0;

    // Render the paragraph with interactive blanks
    const renderInteractiveText = () => {
        const rawText = currentExercise.textWithBlanks;
        // Split text by [blank:X] regex
        const parts = rawText.split(/(\[blank:\d+\])/g);

        return (
            <div className="text-base sm:text-lg leading-loose text-foreground font-normal">
                {parts.map((part, pIdx) => {
                    const match = part.match(/\[blank:(\d+)\]/);
                    if (!match) {
                        return <span key={pIdx}>{part}</span>;
                    }

                    const blankIdx = parseInt(match[1], 10);
                    const blankDef = blanks.find(b => b.index === blankIdx);
                    const currentVal = currentAnswers[blankIdx] || '';
                    const isCorrect = currentIsSubmitted && isBlankCorrect(blankIdx);
                    const isWrong = currentIsSubmitted && !isBlankCorrect(blankIdx);
                    const isFocused = activeBlankIndex === blankIdx;

                    if (inputMode === 'typing') {
                        return (
                            <span key={pIdx} className="inline-flex items-center mx-1 align-middle relative group">
                                <input
                                    type="text"
                                    value={currentShowSolutions ? (blankDef?.answer || '') : currentVal}
                                    onChange={(e) => handleTypeAnswer(blankIdx, e.target.value)}
                                    disabled={currentIsSubmitted || currentShowSolutions}
                                    placeholder={`... (${blankDef?.hint ? '💡' : ''})`}
                                    style={{ width: `${Math.max((blankDef?.answer.length || 8) + 2, 8)}ch` }}
                                    className={cn(
                                        "px-2.5 py-1 text-center font-semibold rounded-lg border-2 text-sm transition-all focus:outline-none",
                                        isCorrect && "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold",
                                        isWrong && "bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 font-bold",
                                        !currentIsSubmitted && "bg-background border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20",
                                        currentShowSolutions && "bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold"
                                    )}
                                />
                                {currentIsSubmitted && isWrong && !currentShowSolutions && (
                                    <span className="ml-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                        {blankDef?.answer}
                                    </span>
                                )}
                            </span>
                        );
                    }

                    // Bank mode (Clickable blanks)
                    return (
                        <button
                            key={pIdx}
                            type="button"
                            onClick={() => {
                                if (currentVal) {
                                    handleClearBlank(blankIdx);
                                } else {
                                    setActiveBlankIndex(blankIdx);
                                }
                            }}
                            disabled={currentIsSubmitted}
                            className={cn(
                                "inline-flex items-center gap-1.5 mx-1 px-3 py-1 rounded-xl text-sm font-semibold border-2 border-dashed transition-all align-middle min-w-[80px] justify-center",
                                isFocused && !currentVal && "border-primary bg-primary/10 ring-2 ring-primary/20 animate-pulse",
                                !currentVal && !isFocused && "border-muted-foreground/40 bg-muted/30 text-muted-foreground hover:border-primary",
                                currentVal && !currentIsSubmitted && "border-primary/80 bg-primary/15 text-primary border-solid shadow-xs",
                                isCorrect && "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-solid",
                                isWrong && "border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300 border-solid",
                                currentShowSolutions && "border-indigo-500 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-solid"
                            )}
                        >
                            {currentShowSolutions ? (
                                <span>{blankDef?.answer}</span>
                            ) : currentVal ? (
                                <>
                                    <span>{currentVal}</span>
                                    {!currentIsSubmitted && <X className="h-3 w-3 opacity-60 hover:opacity-100" />}
                                </>
                            ) : (
                                <span className="text-xs text-muted-foreground font-normal">
                                    trou #{blankIdx + 1}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    };

    if (isFinished) {
        return (
            <div className="max-w-2xl mx-auto p-8 bg-card border rounded-3xl shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-yellow-400 to-amber-500 text-white flex items-center justify-center shadow-lg">
                    <Trophy className="h-10 w-10" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-bold">Session terminée !</h2>
                    <p className="text-muted-foreground text-sm">
                        Vous avez complété l'ensemble des exercices à trous de ce cours.
                    </p>
                </div>

                <div className="p-6 bg-muted/30 rounded-2xl border flex items-center justify-around">
                    <div>
                        <div className="text-3xl font-extrabold text-primary">{scorePercentage}%</div>
                        <div className="text-xs text-muted-foreground font-medium uppercase mt-1">Score global</div>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div>
                        <div className="text-3xl font-extrabold text-foreground">{totalCorrectAcrossAll} / {totalBlanksAcrossAll}</div>
                        <div className="text-xs text-muted-foreground font-medium uppercase mt-1">Mots trouvés</div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                        onClick={() => {
                            setIsFinished(false);
                            setCurrentIndex(0);
                            setAnswers({});
                            setIsSubmitted({});
                            setShowSolutions({});
                        }}
                        className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
                    >
                        <RotateCcw className="h-4 w-4" />
                        <span>Recommencer la série</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("max-w-4xl mx-auto pb-16 space-y-6", className)}>
            {/* Header with Exercise Stepper and Mode Toggle */}
            <div className="bg-card border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
                        #{currentIndex + 1}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs uppercase font-bold text-teal-600 tracking-wider">
                                Exercice à trous ({currentIndex + 1} / {exercises.length})
                            </span>
                        </div>
                        <h2 className="font-bold text-base sm:text-lg text-foreground">
                            {currentExercise.title || clozeData.title}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Mode Selector */}
                    <div className="bg-muted p-1 rounded-xl flex items-center gap-1 border">
                        <button
                            onClick={() => setInputMode('bank')}
                            className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                                inputMode === 'bank' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Choisir les mots dans une banque"
                        >
                            <MousePointerClick className="h-3.5 w-3.5" />
                            <span>Banque</span>
                        </button>
                        <button
                            onClick={() => setInputMode('typing')}
                            className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                                inputMode === 'typing' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Taper les réponses au clavier"
                        >
                            <Keyboard className="h-3.5 w-3.5" />
                            <span>Saisie</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Instruction Banner */}
            <div className="px-1 text-xs text-muted-foreground italic flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" />
                <span>{currentExercise.instruction || "Complétez le texte en sélectionnant ou saisissant les termes manquants."}</span>
            </div>

            {/* Main Interactive Exercise Box */}
            <div className="bg-card border rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">
                {/* Text with Blanks */}
                <div className="p-4 sm:p-6 bg-muted/20 rounded-2xl border border-border/60">
                    {renderInteractiveText()}
                </div>

                {/* Word Bank (Only in 'bank' mode) */}
                {inputMode === 'bank' && !currentIsSubmitted && (
                    <div className="space-y-2.5 pt-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                            <span>Banque de mots disponibles :</span>
                            <span className="text-[11px] font-normal lowercase">cliquez pour insérer</span>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                            {currentExercise.wordBank?.map((word, wIdx) => {
                                const isUsed = usedWords.includes(word);
                                return (
                                    <button
                                        key={wIdx}
                                        type="button"
                                        onClick={() => handleSelectWordFromBank(word)}
                                        disabled={isUsed}
                                        className={cn(
                                            "px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border shadow-xs active:scale-95",
                                            isUsed 
                                                ? "bg-muted text-muted-foreground/40 border-border/40 cursor-not-allowed line-through" 
                                                : "bg-card hover:bg-primary hover:text-primary-foreground border-border hover:border-primary text-foreground"
                                        )}
                                    >
                                        {word}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Contextual Hints */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                    {blanks.map((b) => {
                        const isRevealed = !!currentHints[b.index];
                        if (!b.hint) return null;
                        return (
                            <button
                                key={b.index}
                                type="button"
                                onClick={() => toggleHint(b.index)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors border",
                                    isRevealed 
                                        ? "bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300 font-medium" 
                                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border"
                                )}
                            >
                                <Lightbulb className="h-3 w-3 text-amber-500" />
                                <span>Indice #{b.index + 1} : {isRevealed ? b.hint : "afficher"}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Explanation Card (After submit) */}
                {currentIsSubmitted && currentExercise.explanation && (
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-1 animate-in fade-in">
                        <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Explication pédagogique :</span>
                        </div>
                        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                            {currentExercise.explanation}
                        </p>
                    </div>
                )}

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
                    <div className="flex items-center gap-2">
                        {!currentIsSubmitted ? (
                            <button
                                onClick={handleSubmitExercise}
                                className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-1.5"
                            >
                                <Check className="h-4 w-4" />
                                <span>Vérifier mes réponses</span>
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleResetExercise}
                                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 border"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    <span>Réessayer</span>
                                </button>
                                <button
                                    onClick={() => setShowSolutions(prev => ({ ...prev, [currentIndex]: !prev[currentIndex] }))}
                                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 border"
                                >
                                    {currentShowSolutions ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    <span>{currentShowSolutions ? "Masquer la solution" : "Afficher la solution"}</span>
                                </button>
                            </>
                        )}
                    </div>

                    {/* Navigation between exercises */}
                    <div className="flex items-center gap-2">
                        {currentIndex > 0 && (
                            <button
                                onClick={() => {
                                    setCurrentIndex(prev => prev - 1);
                                    setActiveBlankIndex(0);
                                }}
                                className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground border"
                                title="Exercice précédent"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                        )}

                        {currentIndex < exercises.length - 1 ? (
                            <button
                                onClick={() => {
                                    setCurrentIndex(prev => prev + 1);
                                    setActiveBlankIndex(0);
                                }}
                                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
                            >
                                <span>Suivant</span>
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsFinished(true)}
                                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-1.5"
                            >
                                <Award className="h-4 w-4" />
                                <span>Terminer la série</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
