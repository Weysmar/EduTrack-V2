import { BankManager } from "@/components/finance/BankManager";
import { CategoryManager } from "@/components/finance/CategoryManager";
import { useLanguage } from "@/components/language-provider";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { Settings2, Wallet, Tags, Bell } from "lucide-react";

export function FinanceSettings() {
    const { t } = useLanguage();
    
    return (
        <div className="space-y-10 p-6 max-w-7xl mx-auto pb-20">
            <div>
                <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                    <Settings2 className="h-8 w-8 text-blue-500" />
                    {t('finance.settings.title')}
                </h1>
                <p className="text-slate-400 mt-2">{t('finance.settings.description')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Navigation / Context */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 sticky top-6">
                        <nav className="space-y-1">
                            <a href="#banks" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-blue-400 bg-blue-500/10 rounded-lg">
                                <Wallet className="h-4 w-4" />
                                Banques & Comptes
                            </a>
                            <a href="#categories" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
                                <Tags className="h-4 w-4" />
                                Catégories & Règles
                            </a>
                            <a href="#alerts" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
                                <Bell className="h-4 w-4" />
                                Alertes & Seuils
                            </a>
                        </nav>
                    </div>
                </div>

                {/* Right Column: Content */}
                <div className="lg:col-span-2 space-y-12">
                    <section id="banks">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-slate-200">Banques et Comptes</h2>
                            <p className="text-sm text-slate-500 mt-1">Gérez vos connexions bancaires et la visibilité de vos comptes.</p>
                        </div>
                        <BankManager />
                    </section>
                    
                    <hr className="border-slate-800" />

                    <section id="categories">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-slate-200">Catégories et Auto-catégorisation</h2>
                            <p className="text-sm text-slate-500 mt-1">Personnalisez vos catégories et définissez des mots-clés pour l'IA.</p>
                        </div>
                        <CategoryManager />
                    </section>

                    <hr className="border-slate-800" />

                    <section id="alerts">
                         <div className="mb-6">
                            <h2 className="text-xl font-semibold text-slate-200">Alertes et Seuils</h2>
                            <p className="text-sm text-slate-500 mt-1">Configurez les notifications de dépassement de budget et soldes bas.</p>
                        </div>
                        
                        <div className="space-y-6">
                            <Card className="bg-slate-900 border-slate-800">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h3 className="font-medium text-slate-200">Alerte de solde bas</h3>
                                            <p className="text-sm text-slate-500">Notifiez moi si un compte descend en dessous de ce montant.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                defaultValue={100}
                                                className="w-24 bg-slate-800 border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-slate-400 text-sm">€</span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h3 className="font-medium text-slate-200">Dépassement de budget</h3>
                                            <p className="text-sm text-slate-500">M'alerter quand un budget atteint 80% de sa limite.</p>
                                        </div>
                                        <div className="flex items-center h-6">
                                            <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <div className="flex justify-end">
                                <Button size="sm" onClick={() => toast.success("Paramètres enregistrés")}>
                                    Enregistrer les alertes
                                </Button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
