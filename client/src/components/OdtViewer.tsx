import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import DOMPurify from 'dompurify';
import { Loader2, AlertCircle, Download, FileText, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OdtViewerProps {
    url: string;
    className?: string;
}

export function OdtViewer({ url, className = "" }: OdtViewerProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [zoom, setZoom] = useState(100);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        const loadOdt = async () => {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Impossible de charger le document ODT (${response.status})`);
                }
                const blob = await response.blob();
                if (!isMounted) return;

                const zip = await JSZip.loadAsync(blob);
                const contentFile = zip.file('content.xml');
                if (!contentFile) {
                    throw new Error("Structure ODT invalide (content.xml manquant)");
                }

                const contentXml = await contentFile.async('text');
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(contentXml, 'application/xml');

                // Extract embedded images from Pictures/
                const imageMap = new Map<string, string>();
                const imageFiles = Object.keys(zip.files).filter(k => k.startsWith('Pictures/'));
                for (const imgPath of imageFiles) {
                    try {
                        const imgBlob = await zip.file(imgPath)!.async('blob');
                        const imgUrl = URL.createObjectURL(imgBlob);
                        imageMap.set(imgPath, imgUrl);
                    } catch (_) {}
                }

                // Convert ODT XML structure to styled HTML
                let generatedHtml = '';

                // Helper to render inline text with styles
                const renderNodeContent = (node: Element): string => {
                    let text = '';
                    node.childNodes.forEach(child => {
                        if (child.nodeType === Node.TEXT_NODE) {
                            text += child.textContent || '';
                        } else if (child.nodeType === Node.ELEMENT_NODE) {
                            const el = child as Element;
                            const tagName = el.localName || el.nodeName.split(':').pop();
                            if (tagName === 'span') {
                                text += `<span>${renderNodeContent(el)}</span>`;
                            } else if (tagName === 'a') {
                                const href = el.getAttribute('xlink:href') || '#';
                                text += `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline">${renderNodeContent(el)}</a>`;
                            } else if (tagName === 's') {
                                text += ' ';
                            } else if (tagName === 'tab') {
                                text += '&emsp;';
                            } else if (tagName === 'line-break') {
                                text += '<br/>';
                            } else if (tagName === 'image') {
                                const href = el.getAttribute('xlink:href') || '';
                                const src = imageMap.get(href) || href;
                                if (src) {
                                    text += `<img src="${src}" alt="Image" class="max-w-full h-auto my-2 rounded shadow-sm inline-block" />`;
                                }
                            } else {
                                text += renderNodeContent(el);
                            }
                        }
                    });
                    return text;
                };

                // Traverse body elements
                const body = xmlDoc.getElementsByTagNameNS('*', 'body')[0] || xmlDoc.getElementsByTagName('office:body')[0];
                const textRoot = body ? (body.getElementsByTagNameNS('*', 'text')[0] || body) : xmlDoc.documentElement;

                Array.from(textRoot.children).forEach(child => {
                    const tag = child.localName || child.nodeName.split(':').pop();
                    
                    if (tag === 'h') {
                        const level = parseInt(child.getAttribute('text:outline-level') || '1', 10);
                        const content = renderNodeContent(child);
                        if (content.trim()) {
                            if (level === 1) {
                                generatedHtml += `<h1 class="text-2xl font-bold mt-6 mb-3 text-slate-900 dark:text-slate-100 border-b pb-1">${content}</h1>`;
                            } else if (level === 2) {
                                generatedHtml += `<h2 class="text-xl font-bold mt-5 mb-2 text-slate-800 dark:text-slate-200">${content}</h2>`;
                            } else {
                                generatedHtml += `<h3 class="text-lg font-semibold mt-4 mb-2 text-slate-800 dark:text-slate-200">${content}</h3>`;
                            }
                        }
                    } else if (tag === 'p') {
                        const content = renderNodeContent(child);
                        if (content.trim()) {
                            generatedHtml += `<p class="my-2.5 leading-relaxed text-slate-800 dark:text-slate-200">${content}</p>`;
                        } else {
                            generatedHtml += `<div class="h-3"></div>`;
                        }
                    } else if (tag === 'list') {
                        generatedHtml += `<ul class="list-disc list-inside my-3 space-y-1 text-slate-800 dark:text-slate-200">`;
                        Array.from(child.getElementsByTagNameNS('*', 'list-item')).forEach(item => {
                            generatedHtml += `<li>${renderNodeContent(item)}</li>`;
                        });
                        generatedHtml += `</ul>`;
                    } else if (tag === 'table') {
                        generatedHtml += `<div class="overflow-x-auto my-4"><table class="min-w-full border border-slate-300 dark:border-slate-700 divide-y divide-slate-300 dark:divide-slate-700 text-sm">`;
                        Array.from(child.getElementsByTagNameNS('*', 'table-row')).forEach((row, rowIdx) => {
                            const isHeader = rowIdx === 0;
                            generatedHtml += `<tr class="${isHeader ? 'bg-slate-100 dark:bg-slate-800 font-semibold' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}">`;
                            Array.from(row.getElementsByTagNameNS('*', 'table-cell')).forEach(cell => {
                                const CellTag = isHeader ? 'th' : 'td';
                                generatedHtml += `<${CellTag} class="px-3 py-2 border border-slate-200 dark:border-slate-800">${renderNodeContent(cell)}</${CellTag}>`;
                            });
                            generatedHtml += `</tr>`;
                        });
                        generatedHtml += `</table></div>`;
                    }
                });

                if (!isMounted) return;
                setHtmlContent(DOMPurify.sanitize(generatedHtml, { ADD_ATTR: ['target'] }));
                setLoading(false);
            } catch (err: any) {
                console.error("Error loading ODT:", err);
                if (isMounted) {
                    setError(err.message || "Erreur lors de la lecture du fichier ODT");
                    setLoading(false);
                }
            }
        };

        loadOdt();

        return () => {
            isMounted = false;
        };
    }, [url]);

    if (loading) {
        return (
            <div className={cn("flex flex-col items-center justify-center h-full min-h-[350px] bg-slate-50 dark:bg-slate-950 gap-3", className)}>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground font-medium animate-pulse">Chargement du document ODT...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("flex flex-col items-center justify-center h-full min-h-[350px] p-6 text-center bg-slate-50 dark:bg-slate-950", className)}>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-destructive rounded-full mb-3">
                    <AlertCircle className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-base mb-1">Impossible d'afficher le document ODT</h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-4">{error}</p>
                <a
                    href={url}
                    download
                    className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 flex items-center gap-1.5 shadow-sm"
                >
                    <Download className="h-4 w-4" />
                    <span>Télécharger le document</span>
                </a>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full bg-slate-200 dark:bg-slate-900 overflow-hidden select-text", className)}>
            {/* ODT Zoom controls bar */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-b text-xs select-none">
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Document OpenDocument (ODT)</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setZoom(prev => Math.max(50, prev - 15))}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Zoom arrière"
                    >
                        <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[11px] font-semibold min-w-[4ch] text-center">{zoom}%</span>
                    <button
                        onClick={() => setZoom(prev => Math.min(200, prev + 15))}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Zoom avant"
                    >
                        <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setZoom(100)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors ml-1"
                        title="Réinitialiser le zoom"
                    >
                        <RotateCcw className="h-3 w-3" />
                    </button>
                </div>
            </div>

            {/* Document Paper Container */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start bg-slate-200/70 dark:bg-slate-950/70">
                <div
                    className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg shadow-md p-8 sm:p-12 transition-all duration-150"
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
            </div>
        </div>
    );
}
