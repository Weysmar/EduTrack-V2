import { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { financeApi } from '@/lib/api/financeApi';
import { ForecastDay } from '@/types/finance';
import { TrendingUp, Loader2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

export function CashflowChart() {
    const [forecast, setForecast] = useState<ForecastDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(90);
    const [error, setError] = useState<string | null>(null);
    const { t } = useLanguage();

    useEffect(() => {
        setLoading(true);
        setError(null);
        financeApi.getForecast(days)
            .then(setForecast)
            .catch((err) => setError(err.message || 'Erreur de chargement'))
            .finally(() => setLoading(false));
    }, [days]);

    const chartData = useMemo(() => forecast.map(day => ({
        date: day.date,
        balance: Math.round(day.projectedBalance),
        label: new Date(day.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    })), [forecast]);

    const minBalance = useMemo(() => Math.min(...chartData.map(d => d.balance), 0), [chartData]);
    const hasNegative = minBalance < 0;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const day = forecast.find(d => d.date === label);
        const balance = payload[0].value;
        return (
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-sm">
                <p className="font-semibold text-slate-200 mb-1">
                    {new Date(label).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
                </p>
                <p className={`font-bold text-lg ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(balance)}
                </p>
                {day && day.events.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-slate-700 pt-2">
                        {day.events.filter(e => e.type !== 'VARIABLE_ESTIMATE').map((event, i) => (
                            <div key={i} className="flex justify-between gap-4 text-xs">
                                <span className="text-slate-400 truncate max-w-[150px]">{event.description}</span>
                                <span className={event.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                    {event.amount >= 0 ? '+' : ''}{formatCurrency(event.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Calcul de la projection...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span>{error}</span>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-slate-200">Prévisionnel</h3>
                    {hasNegative && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Solde négatif prévu
                        </span>
                    )}
                </div>
                <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
                    {[30, 60, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                days === d
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            {d}j
                        </button>
                    ))}
                </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <defs>
                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="date"
                        tickFormatter={val => new Date(val).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={{ stroke: '#334155' }}
                        tickLine={false}
                        interval={Math.floor(chartData.length / 6)}
                    />
                    <YAxis
                        tickFormatter={val => `${(val / 1000).toFixed(0)}k€`}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={50}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {hasNegative && <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />}
                    <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#balanceGradient)"
                        strokeDasharray="6 3"
                        dot={false}
                        activeDot={{ r: 4, fill: '#3b82f6', stroke: '#1e3a5f', strokeWidth: 2 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
