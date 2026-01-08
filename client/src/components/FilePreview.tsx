import { useState, useEffect } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { FileText, MonitorPlay, File as FileIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import heic2any from 'heic2any';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface FilePreviewProps {
    url?: string | null;
    fileName?: string;
    fileType?: string;
    className?: string;
}

export function FilePreview({ url, fileName, fileType, className }: FilePreviewProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Determine file extension and type
    const ext = (fileName?.split('.').pop() || fileType?.split('/')[1] || '').toLowerCase();

    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
    const isHeic = ['heic', 'heif'].includes(ext);
    const isPDF = ext === 'pdf';
    const isWord = ['doc', 'docx'].includes(ext);
    const isPPT = ['ppt', 'pptx'].includes(ext);
    const isExcel = ['xls', 'xlsx', 'csv'].includes(ext);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        const preparePreview = async () => {
            if (!url) {
                setLoading(false);
                return;
            }

            if (isHeic) {
                try {
                    const res = await fetch(url);
                    const blob = await res.blob();
                    const converted = await heic2any({ blob, toType: "image/jpeg", quality: 0.5 });
                    if (isMounted) {
                        setPreviewUrl(URL.createObjectURL(Array.isArray(converted) ? converted[0] : converted));
                    }
                } catch (e) {
                    console.error("HEIC preview failed", e);
                }
            } else {
                if (isMounted) setPreviewUrl(url);
            }
            if (isMounted) setLoading(false);
        };

        preparePreview();

        return () => {
            isMounted = false;
            // Revoke if we created an object URL for HEIC (simplified check)
            if (previewUrl && previewUrl.startsWith('blob:') && previewUrl !== url) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [url, isHeic]);


    // --- RENDERERS ---

    // 1. Image
    if (isImage || isHeic) {
        if (loading && isHeic) return <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

        return (
            <div className={cn("w-full h-full bg-slate-900 overflow-hidden relative", className)}>
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt={fileName}
                        className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <FileIcon className="h-8 w-8 mb-2" />
                        <span className="text-xs uppercase font-bold">{ext}</span>
                    </div>
                )}
            </div>
        );
    }

    // 2. PDF
    if (isPDF && url) {
        return (
            <div className={cn("w-full h-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative group", className)}>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Document
                        file={url}
                        loading={<div className="animate-pulse bg-muted w-full h-full" />}
                        error={
                            <div className="flex flex-col items-center text-muted-foreground">
                                <FileText className="h-8 w-8 mb-1" />
                                <span className="text-[10px] font-bold">PDF</span>
                            </div>
                        }
                        className="w-full h-full flex items-center justify-center"
                    >
                        <Page
                            pageNumber={1}
                            width={250} // Fixed width approx for card size
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="shadow-md"
                        />
                    </Document>
                </div>
                {/* PDF Label Overlay */}
                <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-90 z-10">
                    PDF
                </div>
            </div>
        );
    }

    // 3. Generic / Other Formats (Word, PPT, etc.)
    let bgColor = "bg-slate-100 dark:bg-slate-800";
    let textColor = "text-slate-500";
    let Icon = FileIcon;
    let label = ext.toUpperCase();

    if (isWord) {
        bgColor = "bg-blue-50 dark:bg-blue-900/20";
        textColor = "text-blue-600 dark:text-blue-400";
        Icon = FileText;
        label = "WORD";
    } else if (isPPT) {
        bgColor = "bg-orange-50 dark:bg-orange-900/20";
        textColor = "text-orange-600 dark:text-orange-400";
        Icon = MonitorPlay;
        label = "PPT";
    } else if (isExcel) {
        bgColor = "bg-green-50 dark:bg-green-900/20";
        textColor = "text-green-600 dark:text-green-400";
        Icon = FileText;
        label = "EXCEL";
    }

    return (
        <div className={cn("w-full h-full flex flex-col items-center justify-center relative transition-colors", bgColor, className)}>
            <Icon className={cn("h-10 w-10 mb-2 opacity-80", textColor)} />
            <span className={cn("text-xs font-bold tracking-wider opacity-70", textColor)}>{label}</span>

            {/* Corner Fold Effect (CSS) */}
            <div className={cn("absolute top-0 right-0 w-8 h-8 bg-black/5 dark:bg-white/5 rounded-bl-xl")} />
        </div>
    );
}
