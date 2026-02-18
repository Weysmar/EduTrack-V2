import { Transaction } from '@/types/finance';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import { useMemo, useState } from 'react';
import { format, subMonths, subYears, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Infinity as InfinityIcon } from 'lucide-react';

interface Props {
    transactions?: Transaction[];
    hideInternalTransfers?: boolean;
}

type Period = 'all' | '3y' | '1y' | '6m' | '3m' | '1m';

const PERIOD_BUTTONS: { key: Period; label: string; isIcon?: boolean }[] = [
    { key: 'all', label: '∞' },
    { key: '3y', label: '3a' },
    { key: '1y', label: '1a' },
    { key: '6m', label: '6m' },
    { key: '3m', label: '3m' },
    { key: '1m', label: '1m' },
];

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

export function ExpenseChart({ transactions = [], hideInternalTransfers = false }: Props) {
    const [period, setPeriod] = useState<Period>('3m');
    const [yScale, setYScale] = useState(100); // 10–100, slider percentage

    const filtered = useMemo(() => {
        let txs = transactions;
        if (hideInternalTransfers) {
            txs = txs.filter(t =>
                t.classification !== 'INTERNAL_INTRA_BANK' &&
                t.classification !== 'INTERNAL_INTER_BANK'
            );
        }
        return txs;
    }, [transactions, hideInternalTransfers]);

    const chartData = useMemo(() => {
        if (filtered.length === 0) return [];

        const now = new Date();
        let startDate: Date;

        switch (period) {
            case '1m': startDate = subMonths(now, 1); break;
            case '3m': startDate = subMonths(now, 3); break;
            case '6m': startDate = subMonths(now, 6); break;
            case '1y': startDate = subYears(now, 1); break;
            case '3y': startDate = subYears(now, 3); break;
            default: {
                const dates = filtered.map(t => new Date(t.date).getTime());
                startDate = new Date(Math.min(...dates));
            }
        }

        // Choose granularity based on period
        const diffMonths = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        const useMonthly = diffMonths > 6;

        // Build buckets
        const buckets = new Map<string, { income: number; expenses: number }>();

        if (useMonthly) {
            const months = eachMonthOfInterval({ start: startOfMonth(startDate), end: startOfMonth(now) });
            months.forEach(m => {
                buckets.set(format(m, 'yyyy-MM'), { income: 0, expenses: 0 });
            });
        } else {
            const weeks = eachWeekOfInterval({ start: startOfDay(startDate), end: now });
            weeks.forEach(w => {
                buckets.set(format(w, 'yyyy-ww'), { income: 0, expenses: 0 });
            });
        }

        // Fill buckets
        filtered.forEach(t => {
            const date = new Date(t.date);
            if (date < startDate) return;
            const key = useMonthly ? format(date, 'yyyy-MM') : format(date, 'yyyy-ww');
            const bucket = buckets.get(key);
            if (!bucket) return;
            if (t.amount > 0) {
                bucket.income += t.amount;
            } else {
                bucket.expenses += Math.abs(t.amount);
            }
        });

        return Array.from(buckets.entries()).map(([key, val]) => {
            const label = useMonthly
                ? format(new Date(key + '-01'), 'MMM yy', { locale: fr })
                : `S${key.split('-')[1]}`;
            return { label, ...val };
        });
    }, [filtered, period]);

    // Compute Y domain max based on slider
    const yMax = useMemo(() => {
        if (chartData.length === 0) return 1000;
        const dataMax = Math.max(...chartData.map(d => Math.max(d.income, d.expenses)));
        // slider 10–100% → zoom in/out
        const factor = yScale / 100;
        return Math.ceil(dataMax / factor);
    }, [chartData, yScale]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl text-sm">
                <p className="text-slate-300 font-medium mb-2">{label}</p>
                {payload.map((p: any) => (
                    <div key={p.name} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-slate-400">{p.name}:</span>
                        <span className="font-bold" style={{ color: p.color }}>{formatCurrency(p.value)}</span>
                    </div>
                ))}
            </div>
        );
    };

    if (chartData.length === 0) {
        return (
            <div className="h-[320px] flex items-center justify-center text-slate-500 text-sm">
                Aucune donnée pour cette période
            </div>
        );
    }

    return (
        <div className="relative h-[320px] w-full flex gap-2">
            {/* Vertical Y-scale slider */}
            <div className="flex flex-col items-center justify-center gap-1 pr-1">
                <span className="text-[10px] text-slate-500 rotate-[-90deg] whitespace-nowrap mb-2">Échelle</span>
                <input
                    type="range"
                    min={10}
                    max={100}
                    value={yScale}
                    onChange={e => setYScale(Number(e.target.value))}
                    className="h-40 cursor-pointer accent-blue-500"
                    style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                />
            </div>

            {/* Chart + period buttons */}
            <div className="flex-1 flex flex-col">
                <ResponsiveContainer width="100%" height={270}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                            dataKey="label"
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            axisLine={{ stroke: '#334155' }}
                            tickLine={false}
                        />
                        <YAxis
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, yMax]}
                            width={45}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="top"
                            height={28}
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
                        />
                        <Area
                            type="monotone"
                            dataKey="income"
                            name="Revenus"
                            stroke="#34d399"
                            strokeWidth={2}
                            fill="url(#colorIncome)"
                            dot={false}
                            activeDot={{ r: 4, fill: '#34d399' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="expenses"
                            name="Dépenses"
                            stroke="#f87171"
                            strokeWidth={2}
                            fill="url(#colorExpenses)"
                            dot={false}
                            activeDot={{ r: 4, fill: '#f87171' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Period selector */}
                <div className="flex justify-end gap-1 mt-1">
                    {PERIOD_BUTTONS.map(btn => (
                        <button
                            key={btn.key}
                            onClick={() => setPeriod(btn.key)}
                            className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors ${period === btn.key
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
