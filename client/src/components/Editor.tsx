import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import {
    Bold, Italic, List, ListOrdered, Mic, MicOff, Underline as UnderlineIcon,
    Strikethrough, Code, Quote, Heading1, Heading2, Heading3, Minus, Highlighter, Palette
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface EditorProps {
    content: string
    onChange: (content: string) => void
    editable?: boolean
    className?: string
}

export function Editor({ content, onChange, editable = true, className }: EditorProps) {
    const { language, t } = useLanguage()
    const isMinecraft = language === 'mc'
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showHighlightPicker, setShowHighlightPicker] = useState(false)

    // Determine dictation language based on app language
    const dictationLang = language === 'fr' ? 'fr-FR' : 'en-US';

    const { startListening, stopListening, isListening, isSupported, error: speechError } = useSpeechRecognition(dictationLang);

    useEffect(() => {
        if (speechError) {
            if (speechError === 'not-allowed' || speechError === 'permission-denied') {
                toast.error(t('stt.error.permission'), {
                    description: window.location.protocol === 'http:'
                        ? t('stt.error.https')
                        : t('stt.error.blocked')
                });
            } else {
                toast.error(t('stt.error.generic'));
            }
        }
    }, [speechError, t]);

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
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3]
                }
            }),
            Placeholder.configure({
                placeholder: 'Write your notes here...',
            }),
            Underline,
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true
            })
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
                    '[&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg',
                    '[&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-semibold',
                    '[&_h1]:mt-4 [&_h2]:mt-3 [&_h3]:mt-2',
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

    const textColors = ['#000000', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']
    const highlightColors = ['#FEF3C7', '#FEE2E2', '#DBEAFE', '#D1FAE5', '#E9D5FF', '#FCE7F3']

    return (
        <div className={cn(
            "border rounded-md overflow-hidden bg-background",
            isMinecraft && "border-4 border-stone-600 rounded-none bg-stone-900", // Cobblestone-ish container
            className
        )}>
            {editable && (
                <div className={cn(
                    "border-b bg-muted/40 p-1 flex flex-wrap gap-1",
                    isMinecraft && "bg-stone-800 border-stone-600"
                )}>
                    {/* Headings */}
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            editor.isActive('heading', { level: 1 }) && "bg-muted text-foreground",
                            isMinecraft && "rounded-none hover:bg-stone-700"
                        )}
                        type="button"
                        title="Heading 1"
                    >
                        <Heading1 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            editor.isActive('heading', { level: 2 }) && "bg-muted text-foreground",
                            isMinecraft && "rounded-none hover:bg-stone-700"
                        )}
                        type="button"
                        title="Heading 2"
                    >
                        <Heading2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            editor.isActive('heading', { level: 3 }) && "bg-muted text-foreground",
                            isMinecraft && "rounded-none hover:bg-stone-700"
                        )}
                        type="button"
                        title="Heading 3"
                    >
                        <Heading3 className="h-4 w-4" />
                    </button>

                    <div className="w-px h-6 bg-border mx-1 my-auto" />

                    {/* Text Styling */}
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            editor.isActive('bold') && "bg-muted text-foreground",
                            isMinecraft && "rounded-none hover:bg-stone-700"
                        )}
                        type="button"
                        title="Bold"
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
                        title="Italic"
                    >
                        <Italic className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            editor.isActive('underline') && "bg-muted text-foreground",
                            isMinecraft && "rounded-none hover:bg-stone-700"
                        )}
                        type="button"
                        title="Underline"
                    >
                        <UnderlineIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            editor.isActive('strike') && "bg-muted text-foreground",
                            isMinecraft && "rounded-none hover:bg-stone-700"
                        )}
                        type="button"
                        title="Strikethrough"
                    >
                        <Strikethrough className="h-4 w-4" />
                    </button>

                    <div className="w-px h-6 bg-border mx-1 my-auto" />

                    {/* Color & Highlight */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className={cn(
                                "p-2 rounded hover:bg-muted transition-colors relative",
                                isMinecraft && "rounded-none hover:bg-stone-700"
                            )}
                            type="button"
                            title="Text Color"
                        >
                            <Palette className="h-4 w-4" />
                        </button>
                        {showColorPicker && (
                            <div className="absolute top-full left-0 mt-1 bg-popover border shadow-md rounded-md p-2 flex gap-1 z-10">
                                {textColors.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => {
                                            editor.chain().focus().setColor(color).run()
                                            setShowColorPicker(false)
                                        }}
                                        className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color }}
                                        type="button"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                            className={cn(
                                "p-2 rounded hover:bg-muted transition-colors",
                                editor.isActive('highlight') && "bg-muted text-foreground",
                                isMinecraft && "rounded-none hover:bg-stone-700"
                            )}
                            type="button"
                            title="Highlight"
                        >
                            <Highlighter className="h-4 w-4" />
                        </button>
                        {showHighlightPicker && (
                            <div className="absolute top-full left-0 mt-1 bg-popover border shadow-md rounded-md p-2 flex gap-1 z-10">
                                {highlightColors.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => {
                                            editor.chain().focus().setHighlight({ color }).run()
                                            setShowHighlightPicker(false)
                                        }}
                                        className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color }}
                                        type="button"
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-6 bg-border mx-1 my-auto" />

                    {/* Lists */}
                    <button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            editor.isActive('bulletList') && "bg-muted text-foreground",
                            isMinecraft && "rounded-none hover:bg-stone-700"
                        )}
                        type="button"
                        title="Bullet List"
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
                        title="Ordered List"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </button>

                    <div className="w-px h-6 bg-border mx-1 my-auto" />

                    {/* Quote, Code, Separator */}
                    <button
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            editor.isActive('blockquote') && "bg-muted text-foreground",
                            isMinecraft && "rounded-none hover:bg-stone-700"
                        )}
                        type="button"
                        title="Quote"
                    >
                        <Quote className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            editor.isActive('code') && "bg-muted text-foreground",
                            isMinecraft && "rounded-none hover:bg-stone-700"
                        )}
                        type="button"
                        title="Inline Code"
                    >
                        <Code className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            isMinecraft && "rounded-none hover:bg-stone-700"
                        )}
                        type="button"
                        title="Horizontal Line"
                    >
                        <Minus className="h-4 w-4" />
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
