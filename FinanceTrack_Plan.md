# FinanceTrack - Plan & Spécifications Techniques

Ce document détaille l'architecture et l'implémentation du module de gestion financière **FinanceTrack**. Ce projet est conçu pour s'intégrer visuellement à l'écosystème EduTrack tout en fonctionnant comme un module distinct.

## 1. Stack Technique

-   **Frontend**: React 18, TypeScript, Vite
-   **Styling**: Tailwind CSS (Palette Slate Dark Mode)
-   **State Management**: Zustand
-   **Visualisation**: Recharts
-   **Backend/ORM**: Prisma, Node.js

---

## 2. Modélisation de Données (Prisma Schema)

Ajoutes ces modèles à votre fichier `schema.prisma`. Ils sont liés à l'utilisateur existant.

```prisma
// FinanceTrack Models

model FinancialAccount {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String   // ex: "Compte Courant", "Livret A"
  type      String   // "CHECKING", "SAVINGS", "CASH"
  balance   Float    @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  transactions Transaction[]
}

model Transaction {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId   String?
  account     FinancialAccount? @relation(fields: [accountId], references: [id])
  
  amount      Float    // Positif pour revenu, Négatif pour dépense (ou gérer via 'type')
  type        String   // "INCOME", "EXPENSE"
  date        DateTime @default(now())
  description String?
  
  categoryId  String?
  category    TransactionCategory? @relation(fields: [categoryId], references: [id])
  
  isRecurring    Boolean @default(false)
  recurringRule  String? // Règle de récurrence (ex: "MONTHLY")

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model TransactionCategory {
  id        String   @id @default(uuid())
  name      String   // ex: "Alimentation", "Loyer", "Salaire"
  type      String   // "INCOME", "EXPENSE"
  icon      String?  // Nom de l'icône Lucide (ex: "ShoppingCart")
  color     String?  // Code couleur Tailwind ou Hex
  
  transactions Transaction[]
  budgets      Budget[]
}

model Budget {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId  String
  category    TransactionCategory @relation(fields: [categoryId], references: [id])
  
  amount      Float    // Montant limite mensuel
  period      String   @default("MONTHLY") // "MONTHLY", "WEEKLY"
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 3. Store Zustand (`financeStore.ts`)

Ce store gère l'état global, y compris la liste des transactions et les calculs de totaux.

```typescript
import { create } from 'zustand';
import { Transaction, TransactionCategory } from '@prisma/client'; // Supposons les types générés
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface FinanceState {
  transactions: Transaction[];
  categories: TransactionCategory[];
  currentDate: Date; // Pour filtrer par mois
  isLoading: boolean;

  // Actions
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  removeTransaction: (id: string) => void;
  setCurrentDate: (date: Date) => void;
  
  // Selectors (Getters calculés)
  getMonthlyStats: () => {
    income: number;
    expenses: number;
    balance: number;
  };
  getFilteredTransactions: () => Transaction[];
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  categories: [],
  currentDate: new Date(),
  isLoading: false,

  setTransactions: (transactions) => set({ transactions }),
  
  addTransaction: (transaction) => set((state) => ({ 
    transactions: [transaction, ...state.transactions] 
  })),

  removeTransaction: (id) => set((state) => ({
    transactions: state.transactions.filter(t => t.id !== id)
  })),

  setCurrentDate: (date) => set({ currentDate: date }),

  getFilteredTransactions: () => {
    const { transactions, currentDate } = get();
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    
    return transactions.filter(t => 
      isWithinInterval(new Date(t.date), { start, end })
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getMonthlyStats: () => {
    const filtered = get().getFilteredTransactions();
    
    const income = filtered
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0);
      
    const expenses = filtered
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + t.amount, 0);

    return {
      income,
      expenses,
      balance: income - expenses // Ou solde du compte si géré différemment
    };
  }
}));
```

---

## 4. Composants React

### A. `FinanceDashboard.tsx` (Vue Principale)

```tsx
import React from 'react';
import { useFinanceStore } from '../store/financeStore';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExpenseDistributionChart } from './ExpenseDistributionChart';
import { TransactionList } from './TransactionList';
import { AddTransactionModal } from './AddTransactionModal';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const FinanceDashboard: React.FC = () => {
  const { currentDate, setCurrentDate, getMonthlyStats } = useFinanceStore();
  const { income, expenses, balance } = getMonthlyStats();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Mock data pour le graphique d'évolution (à remplacer par data réelle)
  const chartData = [
    { name: 'Jan', solde: 1200 },
    { name: 'Fév', solde: 1900 },
    { name: 'Mar', solde: 1500 },
    { name: 'Avr', solde: 2100 },
    { name: 'Mai', solde: 2400 },
    { name: 'Juin', solde: balance }, // Mois actuel
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Header & Navigation Mois */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Finances
          </h1>
          <p className="text-slate-400 text-sm">Vue d'ensemble de votre patrimoine</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <span className="font-medium min-w-[120px] text-center capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </span>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" />
          <span>Transaction</span>
        </button>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Solde / Reste à vivre */}
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet className="w-24 h-24 text-blue-500" />
          </div>
          <div className="flex items-center gap-3 mb-2 text-slate-400">
            <Wallet className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium">Reste à vivre</span>
          </div>
          <div className="text-3xl font-bold tracking-tight">
            {balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </div>
          <div className="text-xs text-slate-500 mt-2">Solde actuel disponible</div>
        </div>

        {/* Revenus */}
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2 text-slate-400">
            <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">Entrées</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400/90">
            +{income.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Dépenses */}
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2 text-slate-400">
            <ArrowDownCircle className="w-5 h-5 text-rose-400" />
            <span className="text-sm font-medium">Sorties</span>
          </div>
          <div className="text-2xl font-bold text-rose-400/90">
            -{expenses.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-rose-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min((expenses / (income || 1)) * 100, 100)}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Charts & Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Evolution Chart */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 h-[300px]">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              Évolution du solde
            </h3>
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSolde" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}€`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="solde" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSolde)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Transactions List */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
            <TransactionList />
          </div>
        </div>

        {/* Right Column: Distribution & Budgets */}
        <div className="space-y-6">
          {/* Distribution Pie Chart */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 h-[350px]">
            <h3 className="text-lg font-semibold mb-4 text-center">Répartition</h3>
            <ExpenseDistributionChart />
          </div>

          {/* Budgets Progress */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-semibold mb-2">Budgets</h3>
            
            {/* Exemple Budget Item */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Alimentation</span>
                <span className="text-slate-400">320€ / 400€</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-yellow-500 h-full rounded-full" style={{ width: '80%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Loisirs</span>
                <span className="text-slate-400">50€ / 150€</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: '33%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Loyer</span>
                <span className="text-slate-400 text-rose-400">800€ / 800€</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
```

### B. `TransactionList.tsx`

```tsx
import React from 'react';
import { useFinanceStore } from '../store/financeStore';
import { ShoppingCart, Home, DollarSign, Coffee, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const TransactionList: React.FC = () => {
  const { getFilteredTransactions } = useFinanceStore();
  const transactions = getFilteredTransactions();

  if (transactions.length === 0) {
    return <div className="text-center text-slate-500 py-10">Aucune transaction ce mois-ci</div>;
  }

  // Helper pour icones (à dynamiser selon catégorie réelle)
  const getIcon = (type: string) => {
    switch (type) {
      case 'GROCERY': return <ShoppingCart className="w-5 h-5 text-yellow-500" />;
      case 'HOUSING': return <Home className="w-5 h-5 text-blue-500" />;
      case 'SALARY': return <TrendingUp className="w-5 h-5 text-emerald-500" />;
      default: return <DollarSign className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Transactions Récentes</h3>
        <button className="text-sm text-blue-400 hover:text-blue-300">Voir tout</button>
      </div>

      <div className="space-y-3">
        {transactions.map((t) => (
          <div 
            key={t.id} 
            className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-800 cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-slate-800 rounded-full border border-slate-700 group-hover:bg-slate-700 transition-colors">
                {getIcon(t.category?.name || '')}
              </div>
              <div>
                <div className="font-medium text-slate-200">{t.description || "Transaction"}</div>
                <div className="text-xs text-slate-500">
                  {format(new Date(t.date), 'dd MMM yyyy', { locale: fr })} • {t.category?.name || 'Autre'}
                </div>
              </div>
            </div>
            <div className={`font-bold ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-slate-200'}`}>
              {t.type === 'INCOME' ? '+' : '-'}{Math.abs(t.amount).toLocaleString('fr-FR')} €
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### C. `ExpenseDistributionChart.tsx` (PieChart)

```tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useFinanceStore } from '../store/financeStore';

export const ExpenseDistributionChart: React.FC = () => {
  const { getFilteredTransactions } = useFinanceStore();
  
  // Calculer la distribution par catégorie
  const data = React.useMemo(() => {
    const expenses = getFilteredTransactions().filter(t => t.type === 'EXPENSE');
    const distribution: Record<string, number> = {};
    
    expenses.forEach(t => {
      const cat = t.category?.name || 'Autre';
      distribution[cat] = (distribution[cat] || 0) + t.amount;
    });

    return Object.keys(distribution).map(key => ({
      name: key,
      value: distribution[key]
    }));
  }, [getFilteredTransactions]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (data.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-500">Pas de données</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
          itemStyle={{ color: '#fff' }}
          formatter={(value: number) => `${value.toLocaleString('fr-FR')} €`}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
```

### D. `AddTransactionModal.tsx`

```tsx
import React from 'react';
import { X } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose }) => {
  const addTransaction = useFinanceStore(s => s.addTransaction);
  
  // State simple pour le formulaire (à remplacer par react-hook-form pour prod)
  const [formData, setFormData] = React.useState({
    amount: '',
    description: '',
    type: 'EXPENSE',
    category: 'ALIMENTATION'
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTransaction({
      id: Math.random().toString(), // Temp ID
      amount: parseFloat(formData.amount),
      description: formData.description,
      type: formData.type,
      date: new Date(),
      categoryId: null,
      userId: 'user-1',
      // ... autres champs requis par le modèle
    } as any);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-100">Nouvelle Transaction</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Type Switcher */}
          <div className="flex gap-2 p-1 bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setFormData({...formData, type: 'EXPENSE'})}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                formData.type === 'EXPENSE' 
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dépense
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, type: 'INCOME'})}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                formData.type === 'INCOME' 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Revenu
            </button>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Montant</label>
            <div className="relative">
              <input 
                type="number" 
                required
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pl-10"
                placeholder="0.00"
              />
              <span className="absolute left-4 top-3 text-slate-500">€</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Description</label>
            <input 
              type="text" 
              required
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="Ex: Courses, Loyer..."
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all mt-4"
          >
            Ajouter la transaction
          </button>
        </form>
      </div>
    </div>
  );
};
```
