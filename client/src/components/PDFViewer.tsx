interface PDFViewerProps {
    url: string;
    className?: string;
}

export function PDFViewer({ url, className = "" }: PDFViewerProps) {
    return (
        <div className={`w-full bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border shadow-sm relative ${className}`}>
            {/* Native Browser PDF Viewer */}
            <iframe
                src={`${url}#view=FitH`}
                title="PDF Document"
                className="w-full h-full border-0"
                allowFullScreen
            />
        </div>
    );
}
