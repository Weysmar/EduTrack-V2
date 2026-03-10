import { BankManager } from "@/components/finance/BankManager";
import { useLanguage } from "@/components/language-provider";

export function FinanceSettings() {
    const { t } = useLanguage();
    return (
        <div className="space-y-8 p-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-slate-100">{t('finance.settings.title')}</h1>
                <p className="text-slate-400 mt-2">{t('finance.settings.description')}</p>
            </div>

            <section>
                <BankManager />
            </section>
        </div>
    );
}
