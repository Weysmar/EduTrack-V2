import { ZoomIn, ZoomOut, Maximize, RotateCcw, Share } from 'lucide-react';
import { useReactFlow, Panel } from 'reactflow';
import { useLanguage } from '@/components/language-provider';

export function ControlBar() {
    const { zoomIn, zoomOut, fitView, setViewport } = useReactFlow();
    const { t } = useLanguage();

    const handleReset = () => {
        // Reset zoom and pan to center
        fitView({ duration: 800 });
    };

    const handleHome = () => {
        // Reset view to fit all nodes (center on content)
        fitView({ padding: 0.2, duration: 800 });
    };

    return (
        <Panel position="top-right" className="flex flex-col gap-2 m-4">
            <div className="flex flex-col bg-white/90 backdrop-blur-sm border-2 border-[#8B5E3C] rounded-lg shadow-xl divide-y-2 divide-[#8B5E3C]">
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
                <button
                    className="p-3 hover:bg-[#D7CCC8] transition-colors text-[#5D4037] opacity-50 cursor-not-allowed"
                    title={t('action.export') || 'Export (Phase 4)'}
                >
                    <Share className="h-5 w-5" />
                </button>
            </div>
        </Panel>
    );
}
