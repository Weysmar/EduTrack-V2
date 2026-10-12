import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useLanguage } from '@/components/language-provider';

interface QuizAttempt {
    id: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    createdAt: string;
}

interface QuizHistoryChartProps {
    attempts: QuizAttempt[];
}

export const QuizHistoryChart: React.FC<QuizHistoryChartProps> = ({ attempts }) => {
    const { t, language } = useLanguage();
    const locale = language === 'en' ? enUS : fr;
    const data = attempts.map(attempt => ({
        date: format(new Date(attempt.createdAt), language === 'en' ? 'MM/dd HH:mm' : 'dd/MM HH:mm', { locale }),
        score: attempt.score,
        fullDate: format(new Date(attempt.createdAt), 'PPpp', { locale })
    }));

    if (attempts.length === 0) {
        return (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded-xl px-4 text-center">
                {t('quiz.history.empty')}
            </div>
        );
    }

    return (
        <div className="w-full h-64 mt-6" role="img" aria-label={t('quiz.history.ariaLabel', { count: attempts.length })}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                    />
                    <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-popover border rounded-lg p-2 shadow-md text-xs font-medium">
                                        <p className="text-muted-foreground mb-1">{payload[0].payload.fullDate}</p>
                                        <p className="text-primary font-bold">{t('quiz.history.tooltipScore', { score: String(payload[0].value) })}</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorScore)"
                        animationDuration={1000}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
