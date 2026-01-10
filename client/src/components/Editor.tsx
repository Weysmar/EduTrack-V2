import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, ListOrdered, Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

interface EditorProps {
    content: string
    onChange: (content: string) => void
    editable?: boolean
}

export function Editor({ content, onChange, editable = true }: EditorProps) {
    const { language, t } = useLanguage()
    const isMinecraft = language === 'mc'

    // Determine dictation language based on app language
    const dictationLang = language === 'fr' ? 'fr-FR' : 'en-US';

    const { startListening, stopListening, isListening, isSupported } = useSpeechRecognition(dictationLang);

    const handleDictationToggle = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening((text, isFinal) => {
                if (isFinal && editor) {
                    // Start a new transaction to insert text
                    editor.chain().focus().insertContent(` ${text} `).run();
                }
            });
        }
    };

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Write your notes here...',
            }),
        ],
        content,
        editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[150px] px-3 py-2',
                    // Default styling adjustments
                    '[&_h1]:text-2xl [&_h2]:text-xl',
                    // Minecraft "Voxel Texture Pack" Styles
                    isMinecraft && [
                        "font-['Minecraftia'] text-lg", // Pixel font, slightly larger to be readable
                        // Redstone Block (Code)
                        "[&_pre]:bg-red-900 [&_pre]:border-2 [&_pre]:border-red-500 [&_pre]:text-red-100 [&_pre]:shadow-[0_0_15px_rgba(239,68,68,0.4)] [&_code]:bg-transparent",
                        // Oak Sign (Blockquote)
                        "[&_blockquote]:bg-amber-800 [&_blockquote]:border-l-[6px] [&_blockquote]:border-amber-600 [&_blockquote]:text-black [&_blockquote]:not-italic [&_blockquote]:font-bold [&_blockquote]:px-4 [&_blockquote]:py-2",
                        // General Text adjustments for better contrast in pixel mode
                        "[&_p]:my-2"
                    ]
                )
            }
        }
    })

    if (!editor) return null

    return (
        <div className={cn(
            "border rounded-md overflow-hidden bg-background",
            isMinecraft && "border-4 border-stone-600 rounded-none bg-stone-900" // Cobblestone-ish container
        )}>
            {editable && (
                <div className={cn(
                    "border-b bg-muted/40 p-1 flex gap-1",
                    isMinecraft && "bg-stone-800 border-stone-600"
                )}>
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            editor.isActive('bold') && "bg-muted text-foreground",
                            isMinecraft && "rounded-none hover:bg-stone-700"
                        )}
                        type="button"
                    >
                        <Bold className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            editor.isActive('italic') && "bg-muted text-foreground",
                            isMinecraft && "rounded-none hover:bg-stone-700"
                        )}
                        type="button"
                    >
                        <Italic className="h-4 w-4" />
                    </button>
                    <div className="w-px h-6 bg-border mx-1 my-auto" />
                    <button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            editor.isActive('bulletList') && "bg-muted text-foreground",
                            isMinecraft && "rounded-none hover:bg-stone-700"
                        )}
                        type="button"
                    >
                        <List className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            editor.isActive('orderedList') && "bg-muted text-foreground",
                            isMinecraft && "rounded-none hover:bg-stone-700"
                        )}
                        type="button"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </button>

                    {/* Speech to Text Button */}
                    {isSupported && (
                        <>
                            <div className="w-px h-6 bg-border mx-1 my-auto" />
                            <button
                                onClick={handleDictationToggle}
                                className={cn(
                                    "p-2 rounded hover:bg-muted transition-colors relative",
                                    isListening && "bg-red-100 text-red-600 animate-pulse",
                                    isMinecraft && "rounded-none hover:bg-stone-700"
                                )}
                                type="button"
                                title={isListening ? t('stt.stop') : t('stt.start')}
                            >
                                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                {isListening && (
                                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                )}
                            </button>
                        </>
                    )}
                </div>
            )}
            <EditorContent editor={editor} className="min-h-[150px]" />
        </div>
    )
}
