import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useFinanceStore } from '../../store/financeStore';

export const ExpenseDistributionChart: React.FC = () => {
    const { getFilteredTransactions } = useFinanceStore();

    // Calculer la distribution par catégorie
    const data = React.useMemo(() => {
        const expenses = getFilteredTransactions().filter(t => t.type === 'EXPENSE');
        const distribution: Record<string, number> = {};

        expenses.forEach(t => {
            const cat = t.category?.name || 'Autre';
            distribution[cat] = (distribution[cat] || 0) + t.amount;
        });

        return Object.keys(distribution).map(key => ({
            name: key,
            value: distribution[key]
        }));
    }, [getFilteredTransactions]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (data.length === 0) {
        return <div className="h-full flex items-center justify-center text-slate-500">Pas de données</div>;
    }

    return (
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
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => `${value.toLocaleString('fr-FR')} €`}
                />
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};
