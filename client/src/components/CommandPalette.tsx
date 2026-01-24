import { useEffect, useState, useMemo } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import {
    Search, Plus, Calendar, Settings, Moon, Sun, Monitor,
    BookOpen, FileText, Image as ImageIcon, Briefcase, LayoutDashboard, Map as MapIcon,
    Timer, MoveRight
} from 'lucide-react';
import { useCommandStore } from '@/store/commandStore';
import { useLanguage } from '@/components/language-provider';
import { useQuery } from '@tanstack/react-query';
import { courseQueries, itemQueries } from '@/lib/api/queries';
import { useProfileStore } from '@/store/profileStore';
import { cn } from '@/lib/utils';
import { useFocusStore } from '@/store/focusStore';

export function CommandPalette() {
    const navigate = useNavigate();
    const { isOpen, open, close, toggle } = useCommandStore();
    const { t, setLanguage } = useLanguage();
    const activeProfile = useProfileStore(state => state.activeProfile);

    // Focus Store actions
    const { start: startFocus, pause: pauseFocus, isActive: isFocusActive } = useFocusStore();

    // Toggle logic
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                toggle();
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [toggle]);

    // Data for Search
    const { data: courses } = useQuery({
        queryKey: ['courses'],
        queryFn: courseQueries.getAll,
        enabled: !!activeProfile
    });

    const { data: items } = useQuery({
        queryKey: ['items'],
        queryFn: itemQueries.getAll,
        enabled: !!activeProfile
    });

    const runCommand = (command: () => void) => {
        command();
        close();
    };

    // Theme toggling (Mock for now, assumes dark mode class on html)
    const toggleTheme = (theme: 'dark' | 'light' | 'system') => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }
        // Save to local storage logic usually
    };

    if (!isOpen) return null;

    return (
        <Command.Dialog
            open={isOpen}
            onOpenChange={(open) => !open && close()}
            label="Global Command Menu"
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm p-4 pt-[20vh] flex items-start justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
            <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
                    <Search className="w-5 h-5 text-zinc-500 mr-2" />
                    <Command.Input
                        placeholder={t('app.search') || "Search for courses, items, or commands..."}
                        className="flex-1 text-lg bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500"
                        autoFocus
                    />
                    <div className="flex gap-1">
                        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            <span className="text-xs">ESC</span>
                        </kbd>
                    </div>
                </div>

                <Command.List className="max-h-[60vh] overflow-y-auto overflow-x-hidden p-2 scroll-py-2">
                    <Command.Empty className="py-6 text-center text-sm text-zinc-500">
                        No results found.
                    </Command.Empty>

                    <Command.Group heading="Suggestions" className="text-xs font-medium text-zinc-500 px-2 py-1.5 mb-2">
                        <CommandItem icon={LayoutDashboard} onSelect={() => runCommand(() => navigate('/edu/dashboard'))}>
                            Dashboard
                        </CommandItem>
                        <CommandItem icon={MapIcon} onSelect={() => runCommand(() => navigate('/edu/board'))}>
                            Investigation Board 🕵️
                        </CommandItem>
                        <CommandItem icon={Calendar} onSelect={() => runCommand(() => navigate('/edu/calendar'))}>
                            Calendar
                        </CommandItem>
                        <CommandItem icon={Timer} onSelect={() => runCommand(() => isFocusActive ? pauseFocus() : startFocus())}>
                            {isFocusActive ? "Pause Focus Timer" : "Start Focus Timer"}
                        </CommandItem>
                    </Command.Group>

                    {courses && courses.length > 0 && (
                        <Command.Group heading="Courses" className="text-xs font-medium text-zinc-500 px-2 py-1.5 mb-2">
                            {courses.map((course: any) => (
                                <CommandItem
                                    key={course.id}
                                    icon={Briefcase}
                                    onSelect={() => runCommand(() => navigate(`/edu/course/${course.id}`))}
                                >
                                    {course.title}
                                </CommandItem>
                            ))}
                        </Command.Group>
                    )}

                    {items && items.length > 0 && (
                        <Command.Group heading="Items" className="text-xs font-medium text-zinc-500 px-2 py-1.5 mb-2">
                            {items.slice(0, 10).map((item: any) => ( // Limit to 10
                                <CommandItem
                                    key={item.id}
                                    icon={item.type === 'note' ? FileText : (item.type === 'resource' ? ImageIcon : BookOpen)}
                                    // Navigate to item view? Or Course view? 
                                    // Currently we don't have a direct item page, usually it's in a course.
                                    // I'll assume we navigate to the course.
                                    onSelect={() => runCommand(() => navigate(`/edu/course/${item.courseId}`))}
                                    shortcut="↵"
                                >
                                    <span className="truncate">{item.title}</span>
                                    <span className="ml-2 text-xs opacity-50 capitalize">in {courses?.find((c: any) => c.id === item.courseId)?.title || 'Unknown'}</span>
                                </CommandItem>
                            ))}
                        </Command.Group>
                    )}

                    <Command.Group heading="System" className="text-xs font-medium text-zinc-500 px-2 py-1.5 mb-2">
                        <CommandItem icon={Settings} onSelect={() => runCommand(() => navigate('/edu/settings'))}>
                            Settings
                        </CommandItem>
                        <CommandItem icon={Sun} onSelect={() => runCommand(() => toggleTheme('light'))}>
                            Light Theme
                        </CommandItem>
                        <CommandItem icon={Moon} onSelect={() => runCommand(() => toggleTheme('dark'))}>
                            Dark Theme
                        </CommandItem>
                    </Command.Group>
                </Command.List>
            </div>
        </Command.Dialog>
    );
}

function CommandItem({ children, icon: Icon, shortcut, onSelect }: any) {
    return (
        <Command.Item
            onSelect={onSelect}
            className="flex items-center gap-2 px-2 py-2.5 text-sm text-zinc-700 dark:text-zinc-200 rounded-md cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-primary aria-selected:text-primary-foreground group transition-colors"
        >
            <Icon className="w-4 h-4 opacity-70 group-aria-selected:opacity-100" />
            <span className="flex-1 flex items-center">{children}</span>
            {shortcut && (
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 group-aria-selected:text-primary-foreground/70 group-aria-selected:border-primary-foreground/30">
                    {shortcut}
                </kbd>
            )}
        </Command.Item>
    );
}
