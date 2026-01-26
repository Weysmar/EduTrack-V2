import { Transaction } from '@/types/finance';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';

interface Props {
    transactions?: Transaction[];
}

export function ExpenseChart({ transactions = [] }: Props) {

    const data = useMemo(() => {
        // Group by Classification
        // Only count negative amounts (Expenses) and exclude Internal transfers if desired (usually we analyze spending)

        const distribution = {
            'EXTERNAL': 0,
            'INTERNAL': 0, // Combine Intra/Inter
            'UNKNOWN': 0
        };

        transactions.forEach(t => {
            if (t.amount >= 0) return; // Skip income

            const absAmount = Math.abs(t.amount);

            if (t.classification.startsWith('INTERNAL')) {
                distribution['INTERNAL'] += absAmount;
            } else if (t.classification === 'EXTERNAL') {
                distribution['EXTERNAL'] += absAmount;
            } else {
                distribution['UNKNOWN'] += absAmount;
            }
        });

        return [
            { name: 'Paiements Externes', value: distribution['EXTERNAL'], color: '#3b82f6' }, // Blue
            { name: 'Virements Internes', value: distribution['INTERNAL'], color: '#8b5cf6' }, // Purple
            { name: 'Inconnu', value: distribution['UNKNOWN'], color: '#f59e0b' }, // Amber
        ].filter(d => d.value > 0);

    }, [transactions]);

    if (data.length === 0) {
        return <div className="h-[300px] flex items-center justify-center text-slate-500">Aucune donnée de dépenses</div>;
    }

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)}
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f1f5f9' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
