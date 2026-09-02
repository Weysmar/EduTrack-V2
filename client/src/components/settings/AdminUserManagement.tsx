 import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useLanguage } from '@/components/language-provider';
import { Users, UserPlus, Trash2, ShieldCheck, Mail, Key, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ManagedUser {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    lastAccessed: string;
    isAdmin?: boolean;
    _count?: {
        courses: number;
        items: number;
    };
}

export function AdminUserManagement() {
    const { fetchUsers, register, deleteUser, user: currentUser } = useAuthStore();
    const { language } = useLanguage();

    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form state
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const data = await fetchUsers();
            setUsers(data);
        } catch (err: any) {
            toast.error(language === 'fr' ? "Erreur de chargement des utilisateurs" : "Failed to load users", {
                description: err.response?.data?.message || err.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFormSuccess(null);
        setIsCreating(true);

        try {
            await register(newName.trim(), newEmail.trim().toLowerCase(), newPassword);
            setFormSuccess(
                language === 'fr'
                    ? `Utilisateur "${newEmail}" créé avec succès.`
                    : `User "${newEmail}" created successfully.`
            );
            setNewName('');
            setNewEmail('');
            setNewPassword('');
            toast.success(language === 'fr' ? "Compte créé" : "Account created");
            await loadUsers();
        } catch (err: any) {
            setFormError(err.response?.data?.message || err.message || "Erreur de création");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteUser = async (targetUser: ManagedUser) => {
        if (targetUser.isAdmin) {
            toast.error(language === 'fr' ? "Action interdite" : "Action not allowed", {
                description: language === 'fr' ? "Impossible de supprimer l'administrateur." : "Cannot delete administrator."
            });
            return;
        }

        const confirmMsg = language === 'fr'
            ? `Êtes-vous sûr de vouloir supprimer définitivement le compte de ${targetUser.name} (${targetUser.email}) ? Tous ses cours et données seront effacés.`
            : `Are you sure you want to permanently delete ${targetUser.name} (${targetUser.email})? All their courses and data will be erased.`;

        if (!window.confirm(confirmMsg)) return;

        setDeletingId(targetUser.id);
        try {
            await deleteUser(targetUser.id);
            toast.success(language === 'fr' ? "Utilisateur supprimé" : "User deleted");
            setUsers(prev => prev.filter(u => u.id !== targetUser.id));
        } catch (err: any) {
            toast.error(language === 'fr' ? "Erreur de suppression" : "Deletion failed", {
                description: err.response?.data?.message || err.message
            });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header info */}
            <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                <div className="text-sm">
                    <p className="font-semibold text-foreground">
                        {language === 'fr' ? "Gestion Privée des Utilisateurs" : "Private User Management"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                        {language === 'fr'
                            ? "L'inscription publique est désactivée. Vous seul avez la permission de créer de nouveaux comptes pour vos utilisateurs."
                            : "Public registration is disabled. Only you have permission to create new accounts for your users."}
                    </p>
                </div>
            </div>

            {/* Create user form */}
            <div className="bg-muted/30 border rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 font-semibold text-base">
                    <UserPlus className="h-5 w-5 text-primary" />
                    <h3>{language === 'fr' ? "Créer un nouveau compte utilisateur" : "Create New User Account"}</h3>
                </div>

                {formError && (
                    <div className="p-3 rounded-lg text-xs bg-destructive/10 text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{formError}</span>
                    </div>
                )}

                {formSuccess && (
                    <div className="p-3 rounded-lg text-xs bg-green-500/10 text-green-600 dark:text-green-400 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{formSuccess}</span>
                    </div>
                )}

                <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium mb-1">
                            {language === 'fr' ? "Nom complet" : "Full Name"}
                        </label>
                        <input
                            type="text"
                            required
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="ex: Jean Dupont"
                            className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-1">
                            {language === 'fr' ? "Adresse email" : "Email Address"}
                        </label>
                        <input
                            type="email"
                            required
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            placeholder="ex: jean@gmail.com"
                            className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-1">
                            {language === 'fr' ? "Mot de passe provisoire" : "Temporary Password"}
                        </label>
                        <input
                            type="text"
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="min. 6 caractères"
                            className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-mono"
                        />
                    </div>

                    <div className="sm:col-span-3 flex justify-end">
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                            {language === 'fr' ? "Créer l'utilisateur" : "Create User"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Users list */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-base">
                        <Users className="h-5 w-5 text-primary" />
                        <h3>{language === 'fr' ? "Comptes enregistrés" : "Registered Accounts"} ({users.length})</h3>
                    </div>
                    <button
                        onClick={loadUsers}
                        disabled={isLoading}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                        {isLoading ? (language === 'fr' ? "Actualisation..." : "Refreshing...") : (language === 'fr' ? "Actualiser" : "Refresh")}
                    </button>
                </div>

                {isLoading ? (
                    <div className="py-12 flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : users.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        {language === 'fr' ? "Aucun utilisateur trouvé." : "No users found."}
                    </p>
                ) : (
                    <div className="border rounded-xl overflow-hidden divide-y bg-card shadow-xs">
                        {users.map(u => {
                            const isSelf = currentUser?.id === u.id;
                            return (
                                <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-foreground">{u.name}</span>
                                                {u.isAdmin && (
                                                    <span className="text-[10px] bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                        Admin
                                                    </span>
                                                )}
                                                {isSelf && (
                                                    <span className="text-[10px] bg-muted text-muted-foreground font-medium px-2 py-0.5 rounded-full">
                                                        {language === 'fr' ? "Vous" : "You"}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">{u.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 text-xs text-muted-foreground">
                                        <div>
                                            <span>{u._count?.courses || 0} {language === 'fr' ? "cours" : "courses"}</span>
                                        </div>
                                        <div>
                                            <span>
                                                {language === 'fr' ? "Créé le " : "Created "}
                                                {new Date(u.createdAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                                            </span>
                                        </div>
                                        {!u.isAdmin && (
                                            <button
                                                onClick={() => handleDeleteUser(u)}
                                                disabled={deletingId === u.id}
                                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                                                title={language === 'fr' ? "Supprimer cet utilisateur" : "Delete user"}
                                            >
                                                {deletingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
