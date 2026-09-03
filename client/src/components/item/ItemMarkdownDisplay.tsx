import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface ItemMarkdownDisplayProps {
    content: string;
    isSummary?: boolean;
    className?: string;
}

export function ItemMarkdownDisplay({ content, isSummary = false, className }: ItemMarkdownDisplayProps) {
    const defaultClasses = "w-full max-w-4xl bg-card p-8 rounded-lg prose dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_ol]:space-y-1 [&_li]:my-1 [&_li>p]:my-0 [&_li>p]:inline-block";

    const summaryComponents = {
        h1: ({ children }: any) => <h1 className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mb-6 border-b pb-4 mt-2">{children}</h1>,
        h2: ({ children }: any) => <h2 className="text-2xl font-bold text-blue-500 dark:text-blue-300 mt-10 mb-4">{children}</h2>,
        h3: ({ children }: any) => <h3 className="text-xl font-semibold text-blue-400 dark:text-blue-200 mt-8 mb-3">{children}</h3>,
        p: ({ children }: any) => <p className="text-lg leading-8 text-slate-700 dark:text-slate-300 mb-4">{children}</p>,
        ul: ({ children }: any) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
        ol: ({ children }: any) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
        li: ({ children }: any) => <li className="text-lg text-slate-700 dark:text-slate-300">{children}</li>,
        strong: ({ children }: any) => <strong className="font-bold text-slate-900 dark:text-slate-100">{children}</strong>,
        input: (props: any) => {
            const isChecked = !!props.checked;
            return (
                <div className="flex items-center gap-2 my-1">
                    <input type="checkbox" checked={isChecked} readOnly className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-lg text-slate-700 dark:text-slate-300"></span>
                </div>
            )
        }
    };

    const noteComponents = {
        h1: ({ children }: any) => <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mb-6 border-b pb-4 mt-2">{children}</h1>,
        h2: ({ children }: any) => <h2 className="text-2xl font-bold text-blue-500 dark:text-blue-300 mt-10 mb-4">{children}</h2>,
        h3: ({ children }: any) => <h3 className="text-xl font-semibold text-blue-400 dark:text-blue-200 mt-8 mb-3">{children}</h3>,
        ul: ({ children }: any) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
        ol: ({ children }: any) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
        img: ({ src, alt }: any) => <img src={src} alt={alt || ''} className="rounded-xl max-w-full h-auto my-4 shadow-sm border mx-auto block" loading="lazy" />,
    };

    const rawContent = typeof content === 'string' ? content : '';
    const formattedContent = isSummary ? rawContent.replace(/•\s?/g, '\n- ') : rawContent;

    // Check if content contains HTML markup (typical from Tiptap editor: <p>, <h1>, <ul>, etc.)
    const isHtml = /<\/?(?:p|h[1-6]|ul|ol|li|div|span|strong|em|b|i|u|table|tr|td|th|pre|code|br|blockquote|mark|img)\b/i.test(formattedContent);

    if (isHtml) {
        // Replace empty paragraphs <p></p> with <p><br></p> so browsers do not collapse them
        const contentWithBreaks = formattedContent.replace(/<p>\s*<\/p>/gi, '<p><br></p>');
        const sanitizedHtml = DOMPurify.sanitize(contentWithBreaks, {
            ADD_TAGS: ['mark', 'img'],
            ADD_ATTR: ['target', 'src', 'alt', 'title', 'class', 'style', 'width', 'height']
        });

        return (
            <div
                className={cn(defaultClasses, "[&_p:empty]:min-h-[1.5em] [&_p:empty]:before:content-['\\00a0']", className)}
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
        );
    }

    return (
        <div className={cn(defaultClasses, className)}>
            <ReactMarkdown components={isSummary ? summaryComponents : noteComponents}>
                {formattedContent}
            </ReactMarkdown>
        </div>
    );
}
