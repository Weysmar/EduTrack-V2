import { useState, useRef, useEffect } from "react"
import { useLanguage, Language } from "@/components/language-provider"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export function LanguageToggle() {
    const { language, setLanguage } = useLanguage()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    const languages: { code: Language; label: string; icon: React.ReactNode }[] = [
        {
            code: "fr",
            label: "Français",
            icon: <img src="https://flagcdn.com/w40/fr.png" alt="FR" className="w-5 h-3.5 object-cover rounded-[1px]" />
        },
        {
            code: "en",
            label: "English",
            icon: <img src="https://flagcdn.com/w40/gb.png" alt="UK" className="w-5 h-3.5 object-cover rounded-[1px]" />
        },
        {
            code: "mc",
            label: "Minecraft",
            icon: <img src="/assets/minecraft_grass_block.webp" alt="MC" className="w-5 h-5 object-contain" />
        },
    ]

    const currentLang = languages.find(l => l.code === language) || languages[0]

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between gap-1 px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors border border-input bg-background shadow-sm"
                title={currentLang.label}
            >
                <div className="flex items-center justify-center w-6">
                    {currentLang.icon}
                </div>
                <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200 shrink-0", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-auto min-w-[50px] bg-popover text-popover-foreground rounded-md border shadow-md animate-in fade-in zoom-in-95 z-50 overflow-hidden">
                    <div className="p-1">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    setLanguage(lang.code)
                                    setIsOpen(false)
                                }}
                                className={cn(
                                    "w-full flex items-center justify-center p-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                                    language === lang.code && "bg-accent/50"
                                )}
                                title={lang.label}
                            >
                                <span className="flex items-center justify-center w-6">
                                    {lang.icon}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
