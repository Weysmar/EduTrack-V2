import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"
type ThemeColor = "default" | "nature" | "sunset"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    defaultThemeColor?: ThemeColor
    defaultMinecraftTheme?: boolean
    storageKey?: string
    storageKeyColor?: string
    storageKeyMinecraft?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
    themeColor: ThemeColor
    setThemeColor: (color: ThemeColor) => void
    minecraftTheme: boolean
    setMinecraftTheme: (enabled: boolean) => void
}

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
    themeColor: "default",
    setThemeColor: () => null,
    minecraftTheme: false,
    setMinecraftTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
    children,
    defaultTheme = "system",
    defaultThemeColor = "default",
    defaultMinecraftTheme = false,
    storageKey = "vite-ui-theme",
    storageKeyColor = "vite-ui-theme-color",
    storageKeyMinecraft = "vite-ui-minecraft-theme",
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    )

    const [themeColor, setThemeColor] = useState<ThemeColor>(
        () => (localStorage.getItem(storageKeyColor) as ThemeColor) || defaultThemeColor
    )

    const [minecraftTheme, setMinecraftThemeState] = useState<boolean>(() => {
        // Automatic migration if user previously selected 'mc' language
        if (typeof window !== 'undefined') {
            if (localStorage.getItem("vite-ui-language") === 'mc') {
                localStorage.setItem("vite-ui-language", "fr");
                localStorage.setItem(storageKeyMinecraft, "true");
                return true;
            }
            const stored = localStorage.getItem(storageKeyMinecraft);
            if (stored !== null) return stored === "true";
        }
        return defaultMinecraftTheme;
    })

    useEffect(() => {
        const root = window.document.documentElement

        // Reset Mode
        root.classList.remove("light", "dark")

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
                .matches
                ? "dark"
                : "light"

            root.classList.add(systemTheme)
        } else {
            root.classList.add(theme)
        }
    }, [theme])

    // Effect for Color Theme
    useEffect(() => {
        const root = window.document.documentElement

        // Remove existing theme classes
        root.classList.remove("theme-nature", "theme-sunset")

        // Add new class if not default
        if (themeColor !== "default") {
            root.classList.add(`theme-${themeColor}`)
        }
    }, [themeColor])

    // Effect for Minecraft Visual Theme
    useEffect(() => {
        if (minecraftTheme) {
            document.body.classList.add("minecraft-theme");
        } else {
            document.body.classList.remove("minecraft-theme");
        }
    }, [minecraftTheme])

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
        themeColor,
        setThemeColor: (color: ThemeColor) => {
            localStorage.setItem(storageKeyColor, color)
            setThemeColor(color)
        },
        minecraftTheme,
        setMinecraftTheme: (enabled: boolean) => {
            localStorage.setItem(storageKeyMinecraft, String(enabled));
            setMinecraftThemeState(enabled);
        }
    }

    return (
        <ThemeProviderContext.Provider value={value} {...props}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
