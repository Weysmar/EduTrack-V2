import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { analyticsQueries } from '@/lib/api/queries';
import { useLanguage } from '@/components/language-provider';
import { Flame, Clock, Trophy } from 'lucide-react';

export function FocusAnalytics() {
    const { t } = useLanguage();

    // Fetch sessions
    const { data: sessions = [] } = useQuery({
        queryKey: ['focus-sessions'],
        queryFn: () => analyticsQueries.getSessions()
    });

    // Process Data for Weekly Chart
    const processWeeklyData = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(today.getDate() - (6 - i));
            return d;
        });

        return last7Days.map(date => {
            const daySessions = sessions.filter((s: any) => {
                const sDate = new Date(s.date);
                return sDate.getDate() === date.getDate() &&
                    sDate.getMonth() === date.getMonth() &&
                    sDate.getFullYear() === date.getFullYear();
            });

            const totalMinutes = daySessions.reduce((acc: number, curr: any) => acc + curr.durationMinutes, 0);

            return {
                day: days[date.getDay()], // Simplified day name
                date: date.toLocaleDateString(),
                minutes: totalMinutes
            };
        });
    };

    const weeklyData = processWeeklyData();

    // Calculate Stats
    const totalMinutesAllTime = sessions.reduce((acc: number, curr: any) => acc + curr.durationMinutes, 0);
    const totalHours = Math.floor(totalMinutesAllTime / 60);

    // Most productive hour (simple approximation)
    const getMostProductiveHour = () => {
        if (sessions.length === 0) return "--:--";
        const hours: Record<number, number> = {};
        sessions.forEach((s: any) => {
            const hour = new Date(s.startTime).getHours();
            hours[hour] = (hours[hour] || 0) + 1;
        });
        const bestHour = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
        return bestHour ? `${bestHour[0]}:00` : "--:--";
    };

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-500">
            <h3 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Vos Statistiques
            </h3>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-card border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <Clock className="w-6 h-6 text-primary mb-2 opacity-80" />
                    <div className="text-2xl font-bold">{totalHours}h</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Focus</div>
                </div>
                <div className="bg-card border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <Flame className="w-6 h-6 text-orange-500 mb-2 opacity-80" />
                    <div className="text-2xl font-bold">{sessions.length}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Sessions</div>
                </div>
                <div className="bg-card border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <div className="text-xl font-bold text-green-500 mb-1">{getMostProductiveHour()}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Meilleure Heure</div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <h4 className="text-sm font-semibold mb-6 flex items-center justify-between">
                    <span>Activité sur 7 jours</span>
                    <span className="text-xs font-normal text-muted-foreground">(en minutes)</span>
                </h4>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyData}>
                            <XAxis
                                dataKey="day"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: 'currentColor', opacity: 0.5 }}
                            />
                            <Tooltip
                                cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                                {weeklyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.minutes > 0 ? "var(--primary)" : "var(--muted)"} fillOpacity={entry.minutes > 0 ? 1 : 0.3} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
