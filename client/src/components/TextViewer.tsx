import { useState, useEffect } from 'react'
import { Copy, Check, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { useLanguage } from './language-provider'

interface TextViewerProps {
    url: string
    fileName?: string
    isMarkdown?: boolean
    className?: string
}

export function TextViewer({ url, fileName, isMarkdown = false, className }: TextViewerProps) {
    const { t } = useLanguage()
    const [content, setContent] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true)
            setError(null)

            try {
                const response = await fetch(url)
                if (!response.ok) {
                    throw new Error(`Failed to fetch file: ${response.statusText}`)
                }
                const text = await response.text()
                setContent(text)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load file')
            } finally {
                setLoading(false)
            }
        }

        if (url) {
            fetchContent()
        }
    }, [url])

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    if (loading) {
        return (
            <div className={cn("w-full h-full min-h-[400px] flex items-center justify-center bg-muted/30", className)}>
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <FileText className="h-8 w-8 animate-pulse" />
                    <span className="text-sm">Loading...</span>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={cn("w-full h-full min-h-[400px] flex items-center justify-center bg-destructive/10", className)}>
                <div className="flex flex-col items-center gap-2 text-destructive">
                    <FileText className="h-8 w-8" />
                    <span className="text-sm font-medium">Error: {error}</span>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("relative w-full h-full bg-card border rounded-lg overflow-hidden", className)}>
            {/* Header with filename and copy button */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-muted/50 backdrop-blur-sm border-b">
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{fileName || 'Text File'}</span>
                    {isMarkdown && (
                        <span className="px-2 py-0.5 text-xs bg-purple-500/90 text-white rounded font-bold">MD</span>
                    )}
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md hover:bg-accent transition-colors"
                    title={t('action.copy')}
                >
                    {copied ? (
                        <>
                            <Check className="h-3 w-3" />
                            Copied!
                        </>
                    ) : (
                        <>
                            <Copy className="h-3 w-3" />
                            Copy
                        </>
                    )}
                </button>
            </div>

            {/* Content area */}
            <div className="p-6 overflow-auto max-h-[80vh]">
                {isMarkdown ? (
                    <div className="prose prose-sm sm:prose dark:prose-invert max-w-none">
                        <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                ) : (
                    <pre className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed text-foreground">
                        {content}
                    </pre>
                )}
            </div>
        </div>
    )
}
