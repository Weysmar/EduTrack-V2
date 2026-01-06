import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import { useProfileStore } from '@/store/profileStore'
import { User, Loader2 } from 'lucide-react'

interface CreateProfileModalProps {
    isOpen: boolean
    onClose: () => void
}

export function CreateProfileModal({ isOpen, onClose }: CreateProfileModalProps) {
    const { createProfile, switchProfile } = useProfileStore()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsLoading(true)
        setError(null)
        try {
            const id = await createProfile({
                name,
                email,
                avatar: "🎓" // Default emoji for now, can improve
            })
            await switchProfile(id)
            onClose()
            setName('')
            setEmail('')
        } catch (err: any) {
            setError(err.message || 'Failed to create profile')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-card p-6 text-left align-middle shadow-xl transition-all border">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-foreground">
                                    Create New Profile
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Profile Name
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full p-2 rounded-md border bg-background"
                                            placeholder="e.g. Jean Dupont"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Email (Optional)
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full p-2 rounded-md border bg-background"
                                            placeholder="jean@example.com"
                                        />
                                    </div>

                                    {error && (
                                        <p className="text-sm text-destructive">{error}</p>
                                    )}

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 rounded-md flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                            Create Profile
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
