import { useState, useEffect, useRef, memo } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { FileText, MonitorPlay, File as FileIcon, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import heic2any from 'heic2any';

// Configure PDF Worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;



interface FilePreviewProps {
    url?: string | null;
    fileName?: string;
    fileType?: string;
    className?: string;
    showThumbnails?: boolean;
}

export const FilePreview = memo(({ url, fileName, fileType, className, showThumbnails = true }: FilePreviewProps) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number | null>(null);

    // Determine file extension and type
    const ext = (fileName?.split('.').pop() || fileType?.split('/')[1] || '').toLowerCase();

    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(ext);
    const isHeic = ['heic', 'heif'].includes(ext);
    const isPDF = ext === 'pdf';
    const isWord = ['doc', 'docx'].includes(ext);
    const isPPT = ['ppt', 'pptx'].includes(ext);
    const isExcel = ['xls', 'xlsx', 'csv'].includes(ext);
    const isText = ext === 'txt';
    const isMarkdown = ext === 'md';

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
                if (isMounted) {
                    let finalUrl = url;
                    // Optimize images for thumbnails: request server-side resize
                    if (isImage && showThumbnails && url.includes('/storage/public/')) {
                        const separator = url.includes('?') ? '&' : '?';
                        finalUrl = `${url}${separator}width=400`; // 400px for retina support on 200px boxes
                    }
                    setPreviewUrl(finalUrl);
                }
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

    // Resize Observer for PDF width
    useEffect(() => {
        if (!isPDF || !containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentBoxSize) {
                    setContainerWidth(entry.contentBoxSize[0].inlineSize);
                } else {
                    setContainerWidth(entry.contentRect.width);
                }
            }
        });

        resizeObserver.observe(containerRef.current);

        // Initial set
        setContainerWidth(containerRef.current.clientWidth);

        return () => {
            resizeObserver.disconnect();
        };
    }, [isPDF]);


    // --- RENDERERS ---

    // 1. Image
    if ((isImage || isHeic) && showThumbnails) {
        if (loading && isHeic) return <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

        return (
            <div className={cn("w-full h-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative", className)}>
                {previewUrl ? (
                    <div className="w-[500%] h-[500%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.25] pointer-events-none select-none">
                        <img
                            src={previewUrl}
                            alt={fileName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400">
                        <ImageIcon className="h-8 w-8 mb-2" />
                        <span className="text-xs uppercase font-bold">{ext}</span>
                    </div>
                )}
            </div>
        );
    }

    // 2. PDF
    if (isPDF && url && showThumbnails) {
        return (
            <div
                ref={containerRef}
                className={cn("w-full h-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative group", className)}
            >
                {/* PDF Page Renders here. Centered and scaled to fit width */}
                <div className="absolute inset-0 flex items-start justify-center">
                    <Document
                        file={url}
                        loading={<div className="animate-pulse bg-muted w-full h-full" />}
                        error={
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <FileText className="h-8 w-8 mb-1" />
                                <span className="text-[10px] font-bold">PDF ERROR</span>
                            </div>
                        }
                        className="w-full flex justify-center"
                    >
                        <Page
                            pageNumber={1}
                            width={containerWidth || 300} // Dynamic width
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="shadow-md"
                        />
                    </Document>
                </div>
                {/* PDF Label Overlay */}
                <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-90 z-10">
                    PDF
                </div>
            </div>
        );
    }

    // 3. Office Live Thumbnails (PPTX, Excel, Word)
    // ENABLED: User requested thumbnails for all formats.
    // Note: This may cause console errors/warnings due to multiple Office Live iframes.
    if ((isWord || isPPT || isExcel) && url && showThumbnails) {
        // Construct absolute URL for external viewers
        const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;

        return (
            <div className={cn("w-full h-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative group", className)}>
                <div className="w-[500%] h-[500%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.25] pointer-events-none select-none">
                    <iframe
                        src={viewerUrl}
                        className="w-full h-full border-0 bg-white"
                        title="File Thumbnail"
                        scrolling="no"
                        loading="lazy"
                        tabIndex={-1}
                    />
                </div>
                <div className="absolute inset-0 z-10 bg-transparent" />
                <div className={cn("absolute top-2 left-2 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-90 z-20",
                    isWord ? "bg-blue-600" : isExcel ? "bg-green-600" : "bg-orange-600"
                )}>
                    {isWord ? "WORD" : isExcel ? "EXCEL" : "PPT"}
                </div>
            </div>
        );
    }

    // 3. Generic / Other Formats (Word, PPT, etc.)
    let bgColor = "bg-slate-100 dark:bg-slate-800";
    let textColor = "text-slate-500";
    let Icon = FileIcon;
    let label = ext.toUpperCase();

    if (isPDF) {
        bgColor = "bg-red-50 dark:bg-red-900/20";
        textColor = "text-red-600 dark:text-red-400";
        Icon = FileText;
        label = "PDF";
    } else if (isText) {
        bgColor = "bg-gray-50 dark:bg-gray-900/20";
        textColor = "text-gray-600 dark:text-gray-400";
        Icon = FileText;
        label = "TXT";
    } else if (isMarkdown) {
        bgColor = "bg-purple-50 dark:bg-purple-900/20";
        textColor = "text-purple-600 dark:text-purple-400";
        Icon = FileText;
        label = "MD";
    } else if (isWord) {
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
    } else if (isImage) {
        bgColor = "bg-yellow-50 dark:bg-yellow-900/20";
        textColor = "text-yellow-600 dark:text-yellow-400";
        Icon = ImageIcon;
        label = ext.toUpperCase();
    }

    return (
        <div className={cn("w-full h-full flex flex-col items-center justify-center relative transition-colors", bgColor, className)}>
            <Icon className={cn("h-6 w-6 sm:h-10 sm:w-10 mb-1 sm:mb-2 opacity-80", textColor)} />
            <span className={cn("text-[10px] sm:text-xs font-bold tracking-wider opacity-70", textColor)}>{label}</span>

            {/* Corner Fold Effect (CSS) */}
            <div className={cn("absolute top-0 right-0 w-8 h-8 bg-black/5 dark:bg-white/5 rounded-bl-xl")} />
        </div>
    );
});
FilePreview.displayName = "FilePreview";
