import { TransactionClassification } from '@/types/finance';
import clsx from 'clsx';
import { CreditCard, RefreshCw, ArrowRightLeft, HelpCircle } from 'lucide-react';

interface Props {
    classification: TransactionClassification;
    confidence?: number;
}

export function ClassificationBadge({ classification, confidence }: Props) {

    let config = {
        label: 'Inconnu',
        color: 'bg-slate-800 text-slate-400',
        icon: HelpCircle
    };

    switch (classification) {
        case 'EXTERNAL':
            config = {
                label: 'Paiement',
                color: 'bg-blue-500/20 text-blue-400',
                icon: CreditCard
            };
            break;
        case 'INTERNAL_INTRA_BANK':
        case 'INTERNAL_INTER_BANK':
            config = {
                label: 'Virement Interne',
                color: 'bg-purple-500/20 text-purple-400',
                icon: ArrowRightLeft
            };
            break;
        case 'UNKNOWN':
        default:
            config = {
                label: 'Inconnu',
                color: 'bg-orange-500/20 text-orange-400',
                icon: HelpCircle
            };
            break;
    }

    // Low confidence warning?
    const isLowConfidence = confidence !== undefined && confidence < 0.7 && classification !== 'UNKNOWN';

    return (
        <div className={clsx(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-transparent",
            config.color,
            isLowConfidence && "border-amber-500/50"
        )} title={isLowConfidence ? `Confiance faible (${(confidence! * 100).toFixed(0)}%)` : undefined}>
            <config.icon className="w-3.5 h-3.5" />
            <span>{config.label}</span>
            {isLowConfidence && <span className="text-amber-500 ml-1">?</span>}
        </div>
    );
}
