import { Fragment, useState } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { User, Settings, LogOut, Plus, Users, Check } from 'lucide-react'
import { useProfileStore } from '@/store/profileStore'
import { useAuthStore } from '@/store/authStore'

import { cn } from '@/lib/utils'
import { CreateProfileModal } from './CreateProfileModal'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '@/components/language-provider'

export function ProfileDropdown() {
    const { activeProfile } = useProfileStore()
    const { logout: authLogout } = useAuthStore()
    const { t } = useLanguage()
    const navigate = useNavigate()

    const handleLogout = () => {
        authLogout() // Clears token and user state
        useProfileStore.getState().logout() // Clears profile state and keys
        navigate('/') // Redirect to home/login
    }

    return (
        <>
            <Menu as="div" className="relative">
                <Menu.Button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-accent/50 transition-colors border max-w-[200px]">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold overflow-hidden">
                        {activeProfile?.avatar ? (
                            activeProfile.avatar // Emoji or Image
                        ) : (
                            <User className="h-4 w-4" />
                        )}
                    </div>
                    <span className="text-sm font-medium truncate hidden md:block">
                        {activeProfile ? activeProfile.name : t("profiles.dropdown.select")}
                    </span>
                </Menu.Button>
                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                >
                    <Menu.Items className="absolute right-[-1rem] bottom-full mb-2 w-56 origin-bottom-right rounded-md bg-card shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 divide-y divide-border">
                        <div className="p-1">
                            {activeProfile && (
                                <Menu.Item>
                                    {({ active }) => (
                                        <Link
                                            to="/settings"
                                            className={cn(
                                                "group flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm",
                                                active ? "bg-accent" : ""
                                            )}
                                        >
                                            <Settings className="h-4 w-4 text-muted-foreground" />
                                            {t("nav.settings")}
                                        </Link>
                                    )}
                                </Menu.Item>
                            )}
                        </div>

                        {activeProfile && (
                            <div className="p-1">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={handleLogout}
                                            className={cn(
                                                "group flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-destructive",
                                                active ? "bg-destructive/10" : ""
                                            )}
                                        >
                                            <LogOut className="h-4 w-4" />
                                            {t("profiles.dropdown.logout")}
                                        </button>
                                    )}
                                </Menu.Item>
                            </div>
                        )}
                    </Menu.Items>
                </Transition>
            </Menu>
        </>
    )
}
