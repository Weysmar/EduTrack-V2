import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CategoryManager } from '@/components/finance/CategoryManager';
import { useLanguage } from '@/components/language-provider';

export default function FinanceCategoriesPage() {
    const { t } = useLanguage();
    const navigate = useNavigate();

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header / Navigation */}
            <div
                className="flex items-center gap-4 text-slate-400 hover:text-slate-200 transition-colors w-fit cursor-pointer"
                onClick={() => navigate('/finance/dashboard')}
            >
                <ArrowLeft size={20} />
                <span>{t('common.backToDashboard') || "Retour au tableau de bord"}</span>
            </div>

            <div className="bg-card rounded-xl border border-slate-800 overflow-hidden shadow-sm h-[80vh]">
                <CategoryManager />
            </div>
        </div>
    );
}
