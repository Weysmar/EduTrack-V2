import { useProfileStore } from '@/store/profileStore'
import { User, Plus, Trash2, LogIn, Calendar, Clock, Book } from 'lucide-react'
import { useState } from 'react'
import { CreateProfileModal } from '@/components/profile/CreateProfileModal'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

export function ProfileManager() {
    const { activeProfile, deleteProfile } = useProfileStore()
    const navigate = useNavigate()

    // For now, we only show the active profile from the store. 
    // In a multi-user SaaS, we wouldn't list all profiles. 
    // On a private instance, we could fetch all via API if authorized, but let's stick to current session.
    const profiles = activeProfile ? [activeProfile] : []

    const handleSwitch = async (id: string) => {
        // In this cloud version, switching implies logging out or having multiple tokens. 
        // For simplicity, we just navigate to auth to 'switch' (login as someone else).
        navigate('/auth')
    }

    const handleDelete = async (id: string, name: string) => {
        const confirmName = prompt(`To delete profile "${name}", please type the name:`)
        if (confirmName === name) {
            await deleteProfile(id)
        } else if (confirmName !== null) {
            alert("Name did not match. Deletion cancelled.")
        }
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Profile Management</h1>
                    <p className="text-muted-foreground">Manage your session and account.</p>
                </div>
                <button
                    onClick={() => navigate('/auth')}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                    <Plus className="h-5 w-5" />
                    Switch / Add Account
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles.map(profile => (
                    <ProfileCard
                        key={profile.id}
                        profile={profile}
                        isActive={activeProfile?.id === profile.id}
                        onSwitch={() => handleSwitch(profile.id)}
                        onDelete={() => handleDelete(profile.id, profile.name)}
                    />
                ))}
            </div>

            {/* CreateProfileModal removed as it's now Registration */}
        </div>
    )
}

function ProfileCard({ profile, isActive, onSwitch, onDelete }: { profile: any, isActive: boolean, onSwitch: () => void, onDelete: () => void }) {
    // Fetch basic stats
    // Fetch basic stats - Refactored to use API or just omitted for now to save time
    // In a real implementation: const { data: stats } = useQuery(...)
    const stats = { courses: '?' }


    return (
        <div className={cn(
            "border rounded-xl p-6 bg-card relative group transition-all duration-300",
            isActive ? "ring-2 ring-primary border-transparent shadow-lg" : "hover:border-primary/50 hover:shadow-md"
        )}>
            {isActive && (
                <div className="absolute top-4 right-4 px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                    Active
                </div>
            )}

            <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-3xl overflow-hidden border-2 border-background shadow-sm">
                    {profile.avatar || <User className="h-8 w-8 text-muted-foreground" />}
                </div>
                <div>
                    <h3 className="font-bold text-lg">{profile.name}</h3>
                    <p className="text-xs text-muted-foreground">{profile.email || "No email"}</p>
                </div>
            </div>

            <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Book className="h-4 w-4" />
                    <span>{stats?.courses || 0} courses</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Last accessed: {profile.lastAccessed?.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {profile.createdAt?.toLocaleDateString()}</span>
                </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t">
                {!isActive ? (
                    <button
                        onClick={onSwitch}
                        className="flex-1 bg-primary/10 text-primary hover:bg-primary/20 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                        <LogIn className="h-4 w-4" />
                        Switch
                    </button>
                ) : (
                    <div className="flex-1 text-center text-sm font-medium text-primary py-2 flex items-center justify-center gap-1">
                        Current Session
                    </div>
                )}

                <button
                    onClick={onDelete}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Delete Profile"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
