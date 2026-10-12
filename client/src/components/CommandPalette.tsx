import { useEffect, useState, useMemo } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import {
    Search, Plus, Settings, Moon, Sun, Monitor, Languages, Clock,
    BookOpen, FileText, Image as ImageIcon, Link2, Dumbbell, Briefcase, Map as MapIcon, Timer,
    type LucideIcon
} from 'lucide-react';
import { useCommandStore } from '@/store/commandStore';
import { useLanguage } from '@/components/language-provider';
import { useTheme } from '@/components/theme-provider';
import { useQuery } from '@tanstack/react-query';
import { courseQueries, itemQueries } from '@/lib/api/queries';
import { useProfileStore } from '@/store/profileStore';
import { useFocusStore } from '@/store/focusStore';
import { useRecentItems } from '@/store/recentItemsStore';
import { CreateCourseModal } from '@/components/CreateCourseModal';
import { PRIMARY_NAV } from '@/components/layout/navItems';
import { useNavT } from '@/components/layout/navI18n';

const MAX_COURSES = 8;
const MAX_ITEMS = 25;
const MAX_RECENT = 5;

/** Lowercase + strip accents, so "theoreme" finds "Théorème". */
const normalize = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const itemIcon = (type?: string): LucideIcon => {
    switch (type) {
        case 'note': return FileText;
        case 'resource': return ImageIcon;
        case 'exercise': return Dumbbell;
        case 'link': return Link2;
        default: return BookOpen;
    }
};

interface PaletteCommand {
    id: string;
    label: string;
    icon: LucideIcon;
    keywords?: string;
    run: () => void;
}

interface CommandPaletteProps {
    /** Opens the knowledge map (only available inside EduLayout). */
    onOpenKnowledgeMap?: () => void;
}

export function CommandPalette({ onOpenKnowledgeMap }: CommandPaletteProps = {}) {
    const navigate = useNavigate();
    const isOpen = useCommandStore(state => state.isOpen);
    const close = useCommandStore(state => state.close);
    const toggle = useCommandStore(state => state.toggle);
    const { t, language, setLanguage } = useLanguage();
    const tr = useNavT();
    const { setTheme } = useTheme();
    const activeProfile = useProfileStore(state => state.activeProfile);
    const recentItems = useRecentItems();
    const [search, setSearch] = useState('');
    const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);

    // Focus store: selectors only (timeLeft changes every second).
    const isFocusActive = useFocusStore(state => state.isActive);
    const startFocus = useFocusStore(state => state.start);
    const pauseFocus = useFocusStore(state => state.pause);

    // Toggle logic
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
                e.preventDefault();
                toggle();
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [toggle]);

    useEffect(() => {
        if (!isOpen) setSearch('');
    }, [isOpen]);

    // Data for search: only fetched while the palette is open (shares the sidebar cache).
    const { data: coursesData } = useQuery({
        queryKey: ['courses'],
        queryFn: () => courseQueries.getAll(1, 1000),
        enabled: !!activeProfile && isOpen
    });

    const { data: itemsData, isLoading: itemsLoading } = useQuery({
        queryKey: ['items'],
        queryFn: () => itemQueries.getAll(1, 1000),
        enabled: !!activeProfile && isOpen
    });

    const courseIndex = useMemo(() => {
        const courses: any[] = coursesData?.courses || [];
        return courses.map(course => ({ course, haystack: normalize(course.title) }));
    }, [coursesData]);

    const courseTitleById = useMemo(() => {
        const map = new Map<string, string>();
        courseIndex.forEach(({ course }) => map.set(String(course.id), course.title));
        return map;
    }, [courseIndex]);

    const itemIndex = useMemo(() => {
        const items: any[] = itemsData?.items || [];
        return items.map(item => {
            const courseTitle = courseTitleById.get(String(item.courseId)) || '';
            return { item, courseTitle, haystack: normalize(`${item.title} ${courseTitle}`) };
        });
    }, [itemsData, courseTitleById]);

    const tokens = useMemo(() => normalize(search.trim()).split(/\s+/).filter(Boolean), [search]);
    const isSearching = tokens.length > 0;
    const matches = (haystack: string) => tokens.every(tok => haystack.includes(tok));

    const runCommand = (command: () => void) => {
        close();
        command();
    };

    const navigationCommands: PaletteCommand[] = [
        ...PRIMARY_NAV.map(item => ({
            id: `nav-${item.to}`,
            label: tr(item.labelKey),
            icon: item.icon,
            keywords: item.to === '/edu/dashboard'
                ? `dashboard ${t('nav.dashboard')}`
                : item.to.replace('/edu/', ''),
            run: () => navigate(item.to),
        })),
        ...(onOpenKnowledgeMap ? [{
            id: 'nav-knowledge-map',
            label: tr('nav.knowledgeMap'),
            icon: MapIcon,
            keywords: `${t('nav.board')} map carte`,
            run: onOpenKnowledgeMap,
        }] : []),
        {
            id: 'nav-settings',
            label: t('nav.settings'),
            icon: Settings,
            keywords: 'settings parametres',
            run: () => navigate('/edu/settings'),
        },
    ];

    const actionCommands: PaletteCommand[] = [
        ...(activeProfile ? [{
            id: 'action-new-course',
            label: t('nav.newCourse'),
            icon: Plus,
            keywords: 'create creer new nouveau',
            run: () => setIsCreateCourseOpen(true),
        }] : []),
        {
            id: 'action-focus',
            label: isFocusActive ? tr('cmd.focusPause') : tr('cmd.focusStart'),
            icon: Timer,
            keywords: 'pomodoro timer minuteur focus',
            run: () => (isFocusActive ? pauseFocus() : startFocus()),
        },
    ];

    const preferenceCommands: PaletteCommand[] = [
        { id: 'pref-light', label: tr('cmd.themeLight'), icon: Sun, keywords: 'theme light clair', run: () => setTheme('light') },
        { id: 'pref-dark', label: tr('cmd.themeDark'), icon: Moon, keywords: 'theme dark sombre', run: () => setTheme('dark') },
        { id: 'pref-system', label: tr('cmd.themeSystem'), icon: Monitor, keywords: 'theme system systeme', run: () => setTheme('system') },
        {
            id: 'pref-language',
            label: tr('cmd.switchLanguage'),
            icon: Languages,
            keywords: 'language langue english francais',
            run: () => setLanguage(language === 'fr' ? 'en' : 'fr'),
        },
    ];

    const filterCommands = (list: PaletteCommand[]) =>
        isSearching ? list.filter(c => matches(normalize(`${c.label} ${c.keywords || ''}`))) : list;

    const filteredNavigation = filterCommands(navigationCommands);
    const filteredActions = filterCommands(actionCommands);
    const filteredPreferences = filterCommands(preferenceCommands);

    const matchingCourses = isSearching ? courseIndex.filter(c => matches(c.haystack)) : [];
    const matchingItems = isSearching ? itemIndex.filter(i => matches(i.haystack)) : [];
    const hiddenResults =
        Math.max(0, matchingCourses.length - MAX_COURSES) + Math.max(0, matchingItems.length - MAX_ITEMS);

    const groupClass =
        "px-1 pb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground";

    const renderCommands = (list: PaletteCommand[]) =>
        list.map(cmd => (
            <CommandItem key={cmd.id} value={cmd.id} icon={cmd.icon} onSelect={() => runCommand(cmd.run)}>
                {cmd.label}
            </CommandItem>
        ));

    return (
        <>
            {isOpen && (
                <Command.Dialog
                    open={isOpen}
                    onOpenChange={(open) => !open && close()}
                    label={tr('cmd.label')}
                    shouldFilter={false}
                    loop
                    className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm p-4 pt-[10vh] sm:pt-[20vh] flex items-start justify-center"
                    onClick={(e) => { if (e.target === e.currentTarget) close() }}
                >
                    <div className="w-full max-w-2xl bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center border-b border-border px-4 py-3">
                            <Search className="w-5 h-5 text-muted-foreground mr-2 shrink-0" />
                            <Command.Input
                                value={search}
                                onValueChange={setSearch}
                                placeholder={tr('cmd.placeholder')}
                                className="flex-1 min-w-0 text-base sm:text-lg bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                                autoFocus
                            />
                            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                                ESC
                            </kbd>
                        </div>

                        <Command.List className="max-h-[60vh] overflow-y-auto overflow-x-hidden p-2 scroll-py-2">
                            {isSearching && itemsLoading && (
                                <Command.Loading>
                                    <div className="py-3 text-center text-sm text-muted-foreground">{t('common.loading')}</div>
                                </Command.Loading>
                            )}

                            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                                {tr('cmd.noResults')}
                            </Command.Empty>

                            {!isSearching && recentItems.length > 0 && (
                                <Command.Group heading={tr('cmd.group.recent')} className={groupClass}>
                                    {recentItems.slice(0, MAX_RECENT).map(recent => (
                                        <CommandItem
                                            key={`recent-${recent.itemId}`}
                                            value={`recent-${recent.itemId}`}
                                            icon={Clock}
                                            onSelect={() => runCommand(() => navigate(`/edu/course/${recent.courseId}/item/${recent.itemId}`))}
                                        >
                                            <span className="truncate">{recent.title}</span>
                                            {courseTitleById.get(recent.courseId) && (
                                                <span className="ml-2 text-xs opacity-60 truncate">
                                                    {t('common.in')} {courseTitleById.get(recent.courseId)}
                                                </span>
                                            )}
                                        </CommandItem>
                                    ))}
                                </Command.Group>
                            )}

                            {filteredNavigation.length > 0 && (
                                <Command.Group heading={tr('cmd.group.navigation')} className={groupClass}>
                                    {renderCommands(filteredNavigation)}
                                </Command.Group>
                            )}

                            {filteredActions.length > 0 && (
                                <Command.Group heading={tr('cmd.group.actions')} className={groupClass}>
                                    {renderCommands(filteredActions)}
                                </Command.Group>
                            )}

                            {matchingCourses.length > 0 && (
                                <Command.Group heading={t('common.courses')} className={groupClass}>
                                    {matchingCourses.slice(0, MAX_COURSES).map(({ course }) => (
                                        <CommandItem
                                            key={`course-${course.id}`}
                                            value={`course-${course.id}`}
                                            icon={Briefcase}
                                            onSelect={() => runCommand(() => navigate(`/edu/course/${course.id}`))}
                                        >
                                            <span className="truncate">{course.title}</span>
                                        </CommandItem>
                                    ))}
                                </Command.Group>
                            )}

                            {matchingItems.length > 0 && (
                                <Command.Group heading={t('common.documents')} className={groupClass}>
                                    {matchingItems.slice(0, MAX_ITEMS).map(({ item, courseTitle }) => (
                                        <CommandItem
                                            key={`item-${item.id}`}
                                            value={`item-${item.id}`}
                                            icon={itemIcon(item.type)}
                                            onSelect={() => runCommand(() => navigate(`/edu/course/${item.courseId}/item/${item.id}`))}
                                            shortcut="↵"
                                        >
                                            <span className="truncate">{item.title}</span>
                                            {courseTitle && (
                                                <span className="ml-2 text-xs opacity-60 truncate">{t('common.in')} {courseTitle}</span>
                                            )}
                                        </CommandItem>
                                    ))}
                                </Command.Group>
                            )}

                            {hiddenResults > 0 && (
                                <div className="px-3 py-2 text-xs text-muted-foreground">
                                    {tr('cmd.moreResults', { count: hiddenResults })}
                                </div>
                            )}

                            {filteredPreferences.length > 0 && (
                                <Command.Group heading={tr('cmd.group.preferences')} className={groupClass}>
                                    {renderCommands(filteredPreferences)}
                                </Command.Group>
                            )}
                        </Command.List>
                    </div>
                </Command.Dialog>
            )}

            {activeProfile && (
                <CreateCourseModal isOpen={isCreateCourseOpen} onClose={() => setIsCreateCourseOpen(false)} />
            )}
        </>
    );
}

interface CommandItemProps {
    children: React.ReactNode;
    icon: LucideIcon;
    value: string;
    shortcut?: string;
    onSelect: () => void;
}

function CommandItem({ children, icon: Icon, value, shortcut, onSelect }: CommandItemProps) {
    return (
        <Command.Item
            value={value}
            onSelect={onSelect}
            className="flex items-center gap-2 px-2 py-2.5 min-h-[44px] sm:min-h-0 text-sm text-foreground rounded-md cursor-pointer aria-selected:bg-primary aria-selected:text-primary-foreground group transition-colors"
        >
            <Icon className="w-4 h-4 shrink-0 opacity-70 group-aria-selected:opacity-100" />
            <span className="flex-1 flex items-center min-w-0">{children}</span>
            {shortcut && (
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground group-aria-selected:bg-transparent group-aria-selected:text-primary-foreground/70 group-aria-selected:border-primary-foreground/30">
                    {shortcut}
                </kbd>
            )}
        </Command.Item>
    );
}
