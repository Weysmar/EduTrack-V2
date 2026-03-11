import { useState, useEffect, useRef } from 'react';
import { Bell, X, AlertTriangle, AlertCircle, PartyPopper, Info, Check } from 'lucide-react';
import { financeApi } from '@/lib/api/financeApi';
import { FinanceAlert } from '@/types/finance';

const SEVERITY_CONFIG = {
    CRITICAL: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
    WARNING: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
    INFO: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
    CELEBRATION: { icon: PartyPopper, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' }
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
}

export function AlertBell() {
    const [alerts, setAlerts] = useState<FinanceAlert[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        financeApi.getUnreadAlertCount().then(r => setUnreadCount(r.count)).catch(() => {});
        // Poll every 60s
        const interval = setInterval(() => {
            financeApi.getUnreadAlertCount().then(r => setUnreadCount(r.count)).catch(() => {});
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isOpen) {
            financeApi.getAlerts().then(data => {
                setAlerts(data);
                // Mark all as read
                data.filter(a => !a.isRead).forEach(a => financeApi.markAlertRead(a.id).catch(() => {}));
                setUnreadCount(0);
            }).catch(() => {});
        }
    }, [isOpen]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const handleDismiss = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await financeApi.dismissAlert(id).catch(() => {});
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-accent rounded-md transition-colors"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 max-h-[500px] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50">
                    <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-3 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-200">Alertes</h3>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-200">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {alerts.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <Check className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                            <p>Aucune alerte</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {alerts.map(alert => {
                                const config = SEVERITY_CONFIG[alert.severity];
                                const Icon = config.icon;
                                return (
                                    <div
                                        key={alert.id}
                                        className={`p-3 hover:bg-slate-800/50 transition-colors ${!alert.isRead ? 'bg-slate-800/30' : ''}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-1.5 rounded-lg ${config.bg} ${config.border} border shrink-0 mt-0.5`}>
                                                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm font-medium text-slate-200 leading-tight">{alert.title}</p>
                                                    <button
                                                        onClick={(e) => handleDismiss(alert.id, e)}
                                                        className="text-slate-600 hover:text-slate-400 shrink-0"
                                                        title="Masquer"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{alert.message}</p>
                                                <p className="text-[10px] text-slate-600 mt-1">{timeAgo(alert.createdAt)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
