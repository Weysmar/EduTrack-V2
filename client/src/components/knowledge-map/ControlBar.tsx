import { ZoomIn, ZoomOut, Maximize, RotateCcw, Share, Eye, EyeOff } from 'lucide-react';
import { useReactFlow, Panel } from 'reactflow';
import { useLanguage } from '@/components/language-provider';

interface ControlBarProps {
    isZenMode: boolean;
    onToggleZen: () => void;
}

export function ControlBar({ isZenMode, onToggleZen }: ControlBarProps) {
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const { t } = useLanguage();

    const handleReset = () => {
        fitView({ duration: 800 });
    };

    const handleHome = () => {
        fitView({ padding: 0.2, duration: 800 });
    };

    if (isZenMode) return null; // Hide ControlBar in Zen Mode (or keep minimal?)
    // Let's keep it visible or provide a way to exit. 
    // Actually, user wants "Hide everything". So let's return a minimal "Exit Zen" button if isZenMode.

    if (isZenMode) {
        return (
            <Panel position="top-right" className="m-4">
                <button
                    onClick={onToggleZen}
                    className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border-2 border-[#8B5E3C] rounded-full px-4 py-2 shadow-xl hover:bg-[#D7CCC8] transition-all text-[#5D4037] font-bold animate-in fade-in slide-in-from-top-4"
                >
                    <Eye className="h-4 w-4" />
                    <span>{t('action.exitZen') || 'Exit Zen'}</span>
                </button>
            </Panel>
        );
    }

    return (
        <Panel position="top-right" className="flex flex-col gap-2 m-4">
            <div className="flex flex-col bg-white/90 backdrop-blur-sm border-2 border-[#8B5E3C] rounded-lg shadow-xl divide-y-2 divide-[#8B5E3C]">
                {/* Zen Toggle */}
                <button
                    onClick={onToggleZen}
                    className="p-3 hover:bg-[#D7CCC8] transition-colors text-[#5D4037]"
                    title={t('action.enterZen') || 'Zen Mode'}
                >
                    <EyeOff className="h-5 w-5" />
                </button>
                <div className="h-0.5 bg-[#8B5E3C] w-full my-0.5 opacity-50" />

                <button
                    onClick={() => zoomIn({ duration: 300 })}
                    className="p-3 hover:bg-[#D7CCC8] transition-colors text-[#5D4037]"
                    title={t('action.zoomIn') || 'Zoom In'}
                >
                    <ZoomIn className="h-5 w-5" />
                </button>
                <button
                    onClick={() => zoomOut({ duration: 300 })}
                    className="p-3 hover:bg-[#D7CCC8] transition-colors text-[#5D4037]"
                    title={t('action.zoomOut') || 'Zoom Out'}
                >
                    <ZoomOut className="h-5 w-5" />
                </button>
                <button
                    onClick={handleReset}
                    className="p-3 hover:bg-[#D7CCC8] transition-colors text-[#5D4037]"
                    title={t('action.fitView') || 'Fit View'}
                >
                    <Maximize className="h-5 w-5" />
                </button>
                <button
                    onClick={handleHome}
                    className="p-3 hover:bg-[#D7CCC8] transition-colors text-[#5D4037]"
                    title={t('action.resetLayout') || 'Reset View'}
                >
                    <RotateCcw className="h-5 w-5" />
                </button>
            </div>
        </Panel>
    );
}
