import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { useLanguage } from '@/components/language-provider'

export function ModeToggle() {
    const { theme, setTheme } = useTheme()
    const { t } = useLanguage()

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            title={t('theme.toggle')}
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" style={{ marginTop: "-1.2rem" }} />
            <span className="sr-only">Toggle theme</span>
        </button>
    )
}
