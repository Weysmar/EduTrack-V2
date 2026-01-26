import { BankManager } from "@/components/finance/BankManager";

export function FinanceSettings() {
    return (
        <div className="space-y-8 p-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-slate-100">Paramètres Finance</h1>
                <p className="text-slate-400 mt-2">Gérez vos banques, comptes et préférences.</p>
            </div>

            <section>
                <BankManager />
            </section>
        </div>
    );
}
