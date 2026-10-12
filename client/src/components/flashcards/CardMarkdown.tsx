import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

// Helper to format flashcard content for clean spacing & lists
export const formatCardContent = (text?: string | null) => {
    if (!text) return ''
    return text
        // Ensure inline numbers like "1. **foo** 2. **bar**" break into clean list lines
        .replace(/([^\n])\s+(\d+\.\s+)/g, '$1\n\n$2')
        // Ensure paragraph breaks between ending bold tag and following sentence
        .replace(/(\*\*[^*]+\*\*)\s+([A-ZÀ-Ÿ][a-zà-ÿ])/g, '$1\n\n$2')
}

/** Rough markdown/LaTeX -> plain text, used for accessible labels. */
export const toPlainText = (text?: string | null) =>
    (text || '')
        .replace(/\$\$?([^$]*)\$\$?/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_`#>~]+/g, '')
        .replace(/\s+/g, ' ')
        .trim()

export function CardFrontMarkdown({ text }: { text?: string | null }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
                p: ({ children }) => <p className="mb-0 inline">{children}</p>,
                strong: ({ children }) => <strong className="font-extrabold text-amber-400 dark:text-amber-300">{children}</strong>,
                b: ({ children }) => <b className="font-extrabold text-amber-400 dark:text-amber-300">{children}</b>,
                em: ({ children }) => <em className="italic text-primary-400">{children}</em>,
                // Cards are rendered inside a <button>: no nested interactive elements.
                a: ({ children }) => <span className="underline">{children}</span>
            }}
        >
            {formatCardContent(text)}
        </ReactMarkdown>
    )
}

export function CardBackMarkdown({ text }: { text?: string | null }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
                p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-foreground">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-amber-400 dark:text-amber-300">{children}</strong>,
                b: ({ children }) => <b className="font-bold text-amber-400 dark:text-amber-300">{children}</b>,
                em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
                ul: ({ children }) => <ul className="list-disc pl-5 space-y-2 my-3 text-foreground">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2 my-3 text-foreground">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed text-foreground pl-1">{children}</li>,
                a: ({ children }) => <span className="underline">{children}</span>
            }}
        >
            {formatCardContent(text)}
        </ReactMarkdown>
    )
}
