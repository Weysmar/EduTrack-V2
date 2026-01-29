import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { useLanguage } from '@/components/language-provider';
import { Plus, X, Edit2, Trash2, Check, Palette, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TransactionCategory } from '@/types/finance';

const COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef',
    '#f43f5e', '#64748b'
];

interface CategoryManagerProps {
    onClose: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose }) => {
    const { t } = useLanguage();
    const { categories, fetchCategories, addCategory, updateCategory, deleteCategory } = useFinanceStore();

    const [isEditing, setIsEditing] = useState<string | null>(null); // ID of category being edited
    const [editForm, setEditForm] = useState<Partial<TransactionCategory>>({});

    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState(COLORS[6]); // Default blue

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleAdd = async () => {
        if (!newCategoryName.trim()) return;
        await addCategory({
            name: newCategoryName,
            color: newCategoryColor,
            icon: 'tag', // Default icon
            keywords: []
        });
        setNewCategoryName('');
        setNewCategoryColor(COLORS[6]);
    };

    const handleStartEdit = (category: any) => {
        setIsEditing(category.id);
        setEditForm({ ...category });
    };

    const handleSaveEdit = async () => {
        if (isEditing && editForm.name) {
            await updateCategory(isEditing, {
                name: editForm.name,
                color: editForm.color,
                icon: editForm.icon,
                keywords: editForm.keywords
            });
            setIsEditing(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('common.confirmDelete'))) {
            await deleteCategory(id);
        }
    };

    return (
        <div className="flex flex-col h-full max-h-[80vh] w-full max-w-2xl bg-card rounded-xl shadow-xl overflow-hidden border">
            <div className="p-4 border-b flex justify-between items-center bg-muted/20">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    {t('finance.categories.title') || 'Gestion des Catégories'}
                </h2>
                <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4 border-b bg-muted/10">
                <div className="flex gap-2">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder={t('finance.categories.placeholder') || "Nouvelle catégorie..."}
                            className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="dropdown relative group">
                            <button
                                className="w-10 h-10 rounded-md border flex items-center justify-center transition-colors hover:border-primary"
                                style={{ backgroundColor: newCategoryColor }}
                            >
                                <span className="sr-only">Color</span>
                            </button>
                            <div className="absolute top-full right-0 mt-2 p-2 bg-card border rounded-lg shadow-lg grid grid-cols-4 gap-1 w-32 hidden group-hover:grid z-10">
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        className="w-6 h-6 rounded-full hover:scale-110 transition-transform"
                                        style={{ backgroundColor: c }}
                                        onClick={() => setNewCategoryColor(c)}
                                    />
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleAdd}
                            disabled={!newCategoryName.trim()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 font-medium flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            {t('action.add')}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {categories.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground italic">
                        {t('common.noData') || 'Aucune catégorie définie.'}
                    </div>
                )}

                {categories.map(category => (
                    <div key={category.id} className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 bg-card transition-colors group">
                        {isEditing === category.id ? (
                            <div className="flex items-center gap-2 flex-1 animate-in fade-in">
                                <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: editForm.color }} />
                                {/* Simple color picker for edit could be added here similar to create */}
                                <input
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="flex-1 px-2 py-1 rounded border bg-background"
                                    autoFocus
                                />
                                <button onClick={handleSaveEdit} className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                                    <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setIsEditing(null)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                                        style={{ backgroundColor: category.color || '#64748b' }}
                                    >
                                        {category.icon ? <Tag className="w-4 h-4" /> : category.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="font-medium">{category.name}</span>
                                    {category.keywords && category.keywords.length > 0 && (
                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                            {category.keywords.length} mots-clés
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleStartEdit(category)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(category.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
