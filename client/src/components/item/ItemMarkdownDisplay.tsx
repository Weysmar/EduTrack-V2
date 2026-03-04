import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface ItemMarkdownDisplayProps {
    content: string;
    isSummary?: boolean;
    className?: string;
}

export function ItemMarkdownDisplay({ content, isSummary = false, className }: ItemMarkdownDisplayProps) {
    const defaultClasses = "w-full max-w-4xl bg-card p-8 rounded-lg prose dark:prose-invert max-w-none";

    const summaryComponents = {
        h1: ({ children }: any) => <h1 className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mb-6 border-b pb-4 mt-2">{children}</h1>,
        h2: ({ children }: any) => <h2 className="text-2xl font-bold text-blue-500 dark:text-blue-300 mt-10 mb-4">{children}</h2>,
        h3: ({ children }: any) => <h3 className="text-xl font-semibold text-blue-400 dark:text-blue-200 mt-8 mb-3">{children}</h3>,
        p: ({ children }: any) => <p className="text-lg leading-8 text-slate-700 dark:text-slate-300 mb-4">{children}</p>,
        ul: ({ children }: any) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
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
        li: ({ children }: any) => <li className="marker:text-primary">{children}</li>,
    };

    const formattedContent = typeof content === 'string'
        ? (isSummary ? content.replace(/•\s?/g, '\n- ') : content)
        : '';

    return (
        <div className={cn(defaultClasses, className)}>
            <ReactMarkdown components={isSummary ? summaryComponents : noteComponents}>
                {formattedContent}
            </ReactMarkdown>
        </div>
    );
}
