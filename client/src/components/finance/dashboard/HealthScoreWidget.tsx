import { useEffect, useState, useMemo } from 'react';
import { financeApi } from '@/lib/api/financeApi';
import { HealthScoreResult } from '@/types/finance';
import { Loader2, Lightbulb } from 'lucide-react';

const GRADE_COLORS: Record<string, string> = {
    A: '#10b981',
    B: '#22c55e',
    C: '#eab308',
    D: '#f97316',
    F: '#ef4444'
};

const GRADE_LABELS: Record<string, string> = {
    A: 'Excellent',
    B: 'Très bien',
    C: 'Correct',
    D: 'À améliorer',
    F: 'Critique'
};

export function HealthScoreWidget() {
    const [data, setData] = useState<HealthScoreResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        financeApi.getHealthScore()
            .then(setData)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const gaugeAngle = useMemo(() => {
        if (!data) return 0;
        return (data.globalScore / 100) * 180;
    }, [data]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Calcul du score...</span>
            </div>
        );
    }

    if (!data) return null;

    if (data.hasEnoughData === false) {
        return (
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-semibold text-slate-200">Santé financière</h3>
                </div>
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-3 text-center px-4 rounded-xl border border-dashed border-slate-700 bg-slate-800/20">
                    <Lightbulb className="h-8 w-8 text-slate-500 mb-1" />
                    <p className="font-medium text-slate-300">Pas assez de données</p>
                    <p className="text-sm">Importez des transactions pour débloquer votre score de santé financière.</p>
                </div>
            </div>
        );
    }

    const color = GRADE_COLORS[data.grade] || '#94a3b8';
    const breakdownEntries = Object.values(data.breakdown);

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold text-slate-200">Santé financière</h3>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                    {GRADE_LABELS[data.grade]}
                </span>
            </div>

            {/* SVG Gauge */}
            <div className="flex justify-center mb-4">
                <svg width="200" height="120" viewBox="0 0 200 120">
                    {/* Background arc */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="#334155"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />
                    {/* Score arc */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke={color}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${(gaugeAngle / 180) * 251.2} 251.2`}
                        style={{ transition: 'stroke-dasharray 1.5s ease-out' }}
                    />
                    {/* Needle */}
                    <line
                        x1="100"
                        y1="100"
                        x2={100 + 60 * Math.cos(Math.PI - (gaugeAngle * Math.PI) / 180)}
                        y2={100 - 60 * Math.sin(Math.PI - (gaugeAngle * Math.PI) / 180)}
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{ transition: 'all 1.5s ease-out' }}
                    />
                    <circle cx="100" cy="100" r="4" fill={color} />
                    {/* Score text */}
                    <text x="100" y="85" textAnchor="middle" fill={color} fontSize="28" fontWeight="bold">
                        {data.globalScore}
                    </text>
                    <text x="100" y="100" textAnchor="middle" fill="#94a3b8" fontSize="10">
                        / 100
                    </text>
                    {/* Grade labels */}
                    <text x="15" y="115" fill="#64748b" fontSize="9">F</text>
                    <text x="185" y="115" fill="#64748b" fontSize="9">A</text>
                </svg>
            </div>

            {/* Breakdown Bars */}
            <div className="space-y-2.5 mb-4">
                {breakdownEntries.map((criteria) => (
                    <div key={criteria.label} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-32 truncate">{criteria.label}</span>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{
                                    width: `${criteria.score}%`,
                                    backgroundColor: criteria.score >= 80 ? '#10b981' : criteria.score >= 50 ? '#eab308' : '#ef4444'
                                }}
                            />
                        </div>
                        <span className="text-xs text-slate-500 w-10 text-right">{criteria.score}%</span>
                    </div>
                ))}
            </div>

            {/* Tips */}
            {data.tips.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-3 space-y-1.5">
                    {data.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>{tip}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
