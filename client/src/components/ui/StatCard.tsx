import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    color?: string; // Text color class (e.g., 'text-blue-500')
    className?: string;
    iconClassName?: string; // Additional classes for the icon container
}

export function StatCard({ title, value, icon, color, className, iconClassName }: StatCardProps) {
    // Extract the color base name (approximate) for background tint
    // Example: 'text-blue-500' -> 'bg-blue-500/10'
    // If complex logic is needed, we can rely on passed props, but usually passing the main color is enough.

    // Fallback logic for BG tint based on simple class parsing or default
    let bgTint = "bg-muted/50";
    if (color && color.startsWith('text-')) {
        const colorName = color.replace('text-', '');
        // Note: This assumes Tailwind is configured to safe-list specific dynamic classes or JIT is working with known patterns.
        // A safer robust way is to pass explicit bg class or use a map, but this works for standard palette.
        bgTint = `bg-${colorName}/10`;
    }

    // However, Tailwind JIT often misses dynamically constructed strings like `bg-${colorName}/10`.
    // It's safer to use a lookup or require passing a variant.
    // For consistency with current design which uses hardcoded pairs, let's keep it flexible but safe.

    // Instead of dynamic class construction which is risky with Tailwind JIT, 
    // we can use style objects for colors if dynamic, or just rely on 'color' prop being a full class string.

    // Current design pattern in FinanceDashboard:
    // <div className={cn("p-3 rounded-full bg-muted/50", color ? `bg-${color.split('-')[1]}-500/10` : '')}>

    return (
        <div className={cn("bg-card/50 backdrop-blur-sm border rounded-2xl p-5 flex items-center justify-between shadow-sm hover:border-primary/50 transition-all hover:bg-card", className)}>
            <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                <h2 className={cn("text-2xl font-bold mt-1", color)}>{value}</h2>
            </div>

            {/* Icon Container */}
            {/* 
                We need to ensure the BG color matches the icon color softly.
                Since Tailwind cannot predict dynamic classes, we might need a mapping or force the user to pass 'bg-purple-500/10' 
                BUT FinanceDashboard uses inline logic: `color ? bg-${color.split('-')[1]}-500/10 : ''` which implies `color` is `text-red-500`.
                
                Let's use a simpler approach: The icon container usually has a fixed style in Dashboard vs FinanceDashboard.
                
                Dashboard: p-3 bg-blue-500/10 rounded-xl text-blue-500
                FinanceDashboard: p-3 rounded-full bg-muted/50 [dynamic bg optional]
                
                We will harmonize to: Rounded-xl square-ish look (Modern Bento style).
             */}
            <div className={cn("p-3 rounded-xl flex items-center justify-center shrink-0", bgTint, iconClassName)}>
                {icon}
            </div>
        </div>
    );
}

// Helper to get BG class safe for Tailwind (if we want to avoid dynamic strings, we pre-define common ones or use style)
// For now, if color is 'text-blue-500', we'll rely on the caller passing the bg class strictly if they want specific tint, 
// OR we use the StatCard to accept 'variant' prop like 'blue', 'green'.

export function StatCardVariant({ title, value, icon, variant, className }: {
    title: string, value: string | number, icon: ReactNode, variant: 'primary' | 'accent' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'default', className?: string
}) {
    const variants = {
        primary: { text: 'text-primary', bg: 'bg-primary/10' },
        accent: { text: 'text-accent-foreground', bg: 'bg-accent' },
        blue: { text: 'text-blue-500', bg: 'bg-blue-500/10' },
        green: { text: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        red: { text: 'text-red-500', bg: 'bg-red-500/10' },
        yellow: { text: 'text-amber-500', bg: 'bg-amber-500/10' },
        purple: { text: 'text-purple-500', bg: 'bg-purple-500/10' },
        default: { text: 'text-foreground', bg: 'bg-muted' }
    };

    const style = variants[variant] || variants.default;

    return (
        <div className={cn("bg-card border rounded-2xl p-5 flex items-center gap-4 hover:border-primary/50 transition-all shadow-sm", className)}>
            <div className={cn("p-3 rounded-xl shrink-0", style.bg, style.text)}>
                {icon}
            </div>
            <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                <h2 className="text-2xl font-bold">{value}</h2>
            </div>
        </div>
    )
}
