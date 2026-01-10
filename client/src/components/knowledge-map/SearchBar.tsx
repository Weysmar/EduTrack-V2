import { Search, X } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
    const { t } = useLanguage();

    return (
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#8D6E63] group-focus-within:text-[#5D4037]" />
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t('app.search') || 'Search...'}
                className="w-64 pl-10 pr-10 py-2 bg-[#EFEBE9] border-2 border-[#8D6E63] rounded-full text-[#3E2723] placeholder-[#A1887F] focus:outline-none focus:border-[#5D4037] focus:ring-2 focus:ring-[#8D6E63]/20 shadow-inner transition-all"
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8D6E63] hover:text-[#5D4037]"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
