import { useEffect, useState, useMemo } from 'react';
import { financeApi } from '@/lib/api/financeApi';
import { AutoCategorizeRule, RuleCondition, RuleField, RuleOperator } from '@/types/finance';
import { Wand2, Plus, Trash2, Power, PowerOff, TestTube2, Loader2, X, CheckCircle2, AlertCircle, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

const FIELD_LABELS: Record<RuleField, string> = {
    description: 'Description',
    amount: 'Montant',
    beneficiaryIban: 'IBAN bénéficiaire'
};

const OPERATOR_LABELS: Record<RuleOperator, string> = {
    contains: 'contient',
    startsWith: 'commence par',
    equals: 'est égal à',
    gt: '>',
    lt: '<',
    gte: '≥',
    lte: '≤'
};

const STRING_OPERATORS: RuleOperator[] = ['contains', 'startsWith', 'equals'];
const NUMBER_OPERATORS: RuleOperator[] = ['gt', 'lt', 'gte', 'lte', 'equals'];

export default function RulesPage() {
    const [rules, setRules] = useState<AutoCategorizeRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<AutoCategorizeRule | null>(null);
    const [testResult, setTestResult] = useState<{ ruleId?: string; matchCount: number; samples: any[] } | null>(null);
    const [testLoading, setTestLoading] = useState<string | null>(null);

    const fetchRules = async () => {
        try {
            const data = await financeApi.getRules();
            setRules(data);
        } catch { toast.error('Erreur lors du chargement des règles'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchRules(); }, []);

    const handleToggle = async (rule: AutoCategorizeRule) => {
        try {
            await financeApi.updateRule(rule.id, { isActive: !rule.isActive });
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
            toast.success(rule.isActive ? 'Règle désactivée' : 'Règle activée');
        } catch { toast.error('Erreur lors de la mise à jour'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cette règle ?')) return;
        try {
            await financeApi.deleteRule(id);
            setRules(prev => prev.filter(r => r.id !== id));
            toast.success('Règle supprimée');
        } catch { toast.error('Erreur lors de la suppression'); }
    };

    const handleTest = async (rule: AutoCategorizeRule) => {
        setTestLoading(rule.id);
        try {
            const result = await financeApi.testRule(rule.conditions);
            setTestResult({ ruleId: rule.id, ...result });
        } catch { toast.error('Erreur lors du test'); }
        finally { setTestLoading(null); }
    };

    const handleSave = async (data: { name: string; conditions: RuleCondition[]; categoryName: string; priority: number }) => {
        try {
            if (editingRule) {
                await financeApi.updateRule(editingRule.id, data);
                toast.success('Règle mise à jour');
            } else {
                await financeApi.createRule(data);
                toast.success('Règle créée');
            }
            setIsModalOpen(false);
            setEditingRule(null);
            fetchRules();
        } catch { toast.error('Erreur lors de la sauvegarde'); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                        <Wand2 className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Règles d'auto-catégorisation</h1>
                        <p className="text-sm text-slate-400">{rules.length} règle{rules.length !== 1 ? 's' : ''} configurée{rules.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <Button
                    onClick={() => { setEditingRule(null); setIsModalOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle règle
                </Button>
            </div>

            {/* Info Banner */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-sm text-purple-300">
                <p>Les règles s'appliquent automatiquement lors de chaque import. Elles s'exécutent <strong>avant</strong> la catégorisation par mots-clés, par ordre de priorité (plus bas = plus prioritaire).</p>
            </div>

            {/* Rules List */}
            {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Chargement...</span>
                </div>
            ) : rules.length === 0 ? (
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="py-12 text-center">
                        <Wand2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-300 mb-2">Aucune règle</h3>
                        <p className="text-sm text-slate-500 mb-4">Créez votre première règle pour catégoriser automatiquement vos transactions.</p>
                        <Button onClick={() => setIsModalOpen(true)} variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Créer une règle
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {rules.map(rule => (
                        <Card key={rule.id} className={`bg-slate-900 border-slate-800 transition-opacity ${!rule.isActive ? 'opacity-50' : ''}`}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <GripVertical className="h-4 w-4 text-slate-600" />
                                            <span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">#{rule.priority}</span>
                                            <h3 className="font-semibold text-slate-200 truncate">{rule.name}</h3>
                                            {!rule.isActive && (
                                                <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">Désactivée</span>
                                            )}
                                        </div>

                                        {/* Conditions Badges */}
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {rule.conditions.map((cond, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-md border border-slate-700">
                                                    <span className="text-blue-400">{FIELD_LABELS[cond.field]}</span>
                                                    <span className="text-slate-500">{OPERATOR_LABELS[cond.operator]}</span>
                                                    <span className="text-amber-400 font-mono">"{String(cond.value)}"</span>
                                                </span>
                                            ))}
                                            <span className="inline-flex items-center text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                                                → {rule.categoryName}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <span>{rule.matchCount} match{rule.matchCount !== 1 ? 'es' : ''}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleTest(rule)}
                                            disabled={testLoading === rule.id}
                                            title="Tester la règle"
                                            className="h-8 w-8"
                                        >
                                            {testLoading === rule.id
                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                : <TestTube2 className="h-4 w-4 text-blue-400" />
                                            }
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleToggle(rule)}
                                            title={rule.isActive ? 'Désactiver' : 'Activer'}
                                            className="h-8 w-8"
                                        >
                                            {rule.isActive
                                                ? <Power className="h-4 w-4 text-emerald-400" />
                                                : <PowerOff className="h-4 w-4 text-slate-500" />
                                            }
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => { setEditingRule(rule); setIsModalOpen(true); }}
                                            title="Modifier"
                                            className="h-8 w-8"
                                        >
                                            <Wand2 className="h-4 w-4 text-slate-400" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(rule.id)}
                                            title="Supprimer"
                                            className="h-8 w-8"
                                        >
                                            <Trash2 className="h-4 w-4 text-red-400" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Test Result */}
                                {testResult?.ruleId === rule.id && (
                                    <div className="mt-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                                        <div className="flex items-center gap-2 mb-2">
                                            {testResult.matchCount > 0
                                                ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                                : <AlertCircle className="h-4 w-4 text-amber-400" />
                                            }
                                            <span className="text-sm font-medium text-slate-200">
                                                {testResult.matchCount} transaction{testResult.matchCount !== 1 ? 's' : ''} correspondante{testResult.matchCount !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        {testResult.samples.length > 0 && (
                                            <div className="space-y-1">
                                                {testResult.samples.slice(0, 5).map((s, i) => (
                                                    <div key={i} className="flex justify-between text-xs text-slate-400">
                                                        <span className="truncate max-w-[250px]">{s.description}</span>
                                                        <span className={s.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(s.amount)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <RuleModal
                    rule={editingRule}
                    onSave={handleSave}
                    onClose={() => { setIsModalOpen(false); setEditingRule(null); }}
                />
            )}
        </div>
    );
}

// --- Rule Creation/Edit Modal ---

function RuleModal({
    rule,
    onSave,
    onClose
}: {
    rule: AutoCategorizeRule | null;
    onSave: (data: { name: string; conditions: RuleCondition[]; categoryName: string; priority: number }) => void;
    onClose: () => void;
}) {
    const [name, setName] = useState(rule?.name || '');
    const [categoryName, setCategoryName] = useState(rule?.categoryName || '');
    const [priority, setPriority] = useState(rule?.priority || 0);
    const [conditions, setConditions] = useState<RuleCondition[]>(
        rule?.conditions || [{ field: 'description', operator: 'contains', value: '' }]
    );

    const addCondition = () => {
        setConditions([...conditions, { field: 'description', operator: 'contains', value: '' }]);
    };

    const removeCondition = (index: number) => {
        setConditions(conditions.filter((_, i) => i !== index));
    };

    const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
        setConditions(conditions.map((c, i) => i === index ? { ...c, ...updates } : c));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !categoryName.trim() || conditions.some(c => !c.value && c.value !== 0)) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }
        onSave({ name, conditions, categoryName, priority });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-slate-900 rounded-xl shadow-2xl border border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-100">
                        {rule ? 'Modifier la règle' : 'Nouvelle règle'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nom de la règle</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ex: Carrefour → Alimentation"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>

                    {/* Conditions */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Conditions (toutes doivent être vraies)</label>
                        <div className="space-y-2">
                            {conditions.map((cond, i) => (
                                <div key={i} className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
                                    <select
                                        value={cond.field}
                                        onChange={e => {
                                            const field = e.target.value as RuleField;
                                            const defaultOp: RuleOperator = field === 'amount' ? 'gt' : 'contains';
                                            updateCondition(i, { field, operator: defaultOp, value: '' });
                                        }}
                                        className="bg-slate-700 text-sm text-slate-200 border-0 rounded px-2 py-1.5"
                                    >
                                        {Object.entries(FIELD_LABELS).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={cond.operator}
                                        onChange={e => updateCondition(i, { operator: e.target.value as RuleOperator })}
                                        className="bg-slate-700 text-sm text-slate-200 border-0 rounded px-2 py-1.5"
                                    >
                                        {(cond.field === 'amount' ? NUMBER_OPERATORS : STRING_OPERATORS).map(op => (
                                            <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                                        ))}
                                    </select>

                                    <input
                                        type={cond.field === 'amount' ? 'number' : 'text'}
                                        value={String(cond.value)}
                                        onChange={e => updateCondition(i, {
                                            value: cond.field === 'amount' ? Number(e.target.value) : e.target.value
                                        })}
                                        placeholder={cond.field === 'amount' ? '0' : 'Valeur...'}
                                        className="flex-1 bg-slate-700 border-0 rounded px-2 py-1.5 text-sm text-slate-200 min-w-0"
                                    />

                                    {conditions.length > 1 && (
                                        <button type="button" onClick={() => removeCondition(i)} className="text-red-400 hover:text-red-300 p-1">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addCondition}
                            className="mt-2 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                        >
                            <Plus className="h-3 w-3" />
                            Ajouter une condition
                        </button>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Catégorie cible</label>
                        <input
                            type="text"
                            value={categoryName}
                            onChange={e => setCategoryName(e.target.value)}
                            placeholder="Ex: Alimentation"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Priorité (0 = plus haute)</label>
                        <input
                            type="number"
                            value={priority}
                            onChange={e => setPriority(Number(e.target.value))}
                            min={0}
                            className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
                        <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                            {rule ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
