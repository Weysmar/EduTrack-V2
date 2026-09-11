import { useEditor, EditorContent } from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import {
    Bold, Italic, List, ListOrdered, Mic, MicOff, Underline as UnderlineIcon,
    Strikethrough, Code, Quote, Heading1, Heading2, Heading3, Minus, Highlighter, Palette,
    Image as ImageIcon, Sigma, Type, ChevronDown, Check, Table as TableIcon, Trash2
} from 'lucide-react'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { useTheme } from '@/components/theme-provider'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import imageCompression from 'browser-image-compression'
import { MathematicsExtension } from '@/components/editor/MathematicsExtension'
import { FontFamilyExtension, AVAILABLE_FONTS } from '@/components/editor/FontFamilyExtension'

// Custom TipTap Image Node
export const CustomImage = Node.create({
    name: 'image',
    group: 'block',
    selectable: true,
    draggable: true,
    atom: true,

    addAttributes() {
        return {
            src: { default: null },
            alt: { default: null },
            title: { default: null },
        }
    },

    parseHTML() {
        return [{ tag: 'img[src]' }]
    },

    renderHTML({ HTMLAttributes }) {
        return ['img', mergeAttributes(HTMLAttributes, { class: 'rounded-xl max-w-full h-auto my-4 shadow-sm border mx-auto block' })]
    },
})

// Compress and convert image to lightweight Data URL
export const processImageFile = async (file: File | Blob): Promise<string> => {
    try {
        const options = {
            maxSizeMB: 0.8,
            maxWidthOrHeight: 1600,
            useWebWorker: true,
            initialQuality: 0.85
        }
        const compressed = await imageCompression(file as File, options)
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.onerror = reject
            reader.readAsDataURL(compressed)
        })
    } catch {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }
}

interface EditorProps {
    content: string
    onChange?: (content: string) => void
    editable?: boolean
    className?: string
}

export function Editor({ content, onChange, editable = true, className }: EditorProps) {
    const { language, t } = useLanguage()
    const { minecraftTheme: isMinecraft } = useTheme()
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showHighlightPicker, setShowHighlightPicker] = useState(false)
    const [showFontPicker, setShowFontPicker] = useState(false)
    const [showTablePicker, setShowTablePicker] = useState(false)
    const [, setSelectionCount] = useState(0)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const fontPickerRef = useRef<HTMLDivElement>(null)
    const colorPickerRef = useRef<HTMLDivElement>(null)
    const highlightPickerRef = useRef<HTMLDivElement>(null)
    const tablePickerRef = useRef<HTMLDivElement>(null)

    // Close all popover pickers on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            if (fontPickerRef.current && !fontPickerRef.current.contains(target)) {
                setShowFontPicker(false)
            }
            if (colorPickerRef.current && !colorPickerRef.current.contains(target)) {
                setShowColorPicker(false)
            }
            if (highlightPickerRef.current && !highlightPickerRef.current.contains(target)) {
                setShowHighlightPicker(false)
            }
            if (tablePickerRef.current && !tablePickerRef.current.contains(target)) {
                setShowTablePicker(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !editor) return
        try {
            const base64 = await processImageFile(file)
            editor.chain().focus().insertContent({ type: 'image', attrs: { src: base64, alt: file.name } }).run()
            toast.success('Image insérée avec succès !')
        } catch {
            toast.error("Erreur lors de l'insertion de l'image")
        }
        if (e.target) e.target.value = ''
    }

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3]
                }
            }),
            Placeholder.configure({
                placeholder: 'Écrivez vos notes ici... (Collez vos images avec Ctrl+V)',
            }),
            Underline,
            TextStyle,
            FontFamilyExtension,
            Color,
            Highlight.configure({
                multicolor: true
            }),
            CustomImage,
            MathematicsExtension,
            Table.configure({
                resizable: true,
                renderWrapper: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content,
        editable,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML())
        },
        editorProps: {
            handlePaste: (view, event) => {
                const items = Array.from(event.clipboardData?.items || [])
                const imageItem = items.find(item => item.type.startsWith('image/'))
                if (imageItem) {
                    const file = imageItem.getAsFile()
                    if (file) {
                        event.preventDefault()
                        processImageFile(file).then((base64) => {
                            const { schema } = view.state
                            const node = schema.nodes.image.create({ src: base64, alt: file.name || 'image' })
                            const transaction = view.state.tr.replaceSelectionWith(node)
                            view.dispatch(transaction)
                            toast.success('Image collée avec succès !')
                        }).catch(() => {
                            toast.error("Erreur lors du collage de l'image")
                        })
                        return true
                    }
                }
                return false
            },
            handleDrop: (view, event, _slice, moved) => {
                if (!moved && event.dataTransfer?.files?.length) {
                    const file = event.dataTransfer.files[0]
                    if (file.type.startsWith('image/')) {
                        event.preventDefault()
                        const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
                        processImageFile(file).then((base64) => {
                            const { schema } = view.state
                            const node = schema.nodes.image.create({ src: base64, alt: file.name || 'image' })
                            const transaction = view.state.tr.insert(coordinates?.pos ?? view.state.selection.from, node)
                            view.dispatch(transaction)
                            toast.success('Image ajoutée !')
                        }).catch(() => {
                            toast.error("Erreur lors de l'ajout de l'image")
                        })
                        return true
                    }
                }
                return false
            },
            attributes: {
                class: cn(
                    'prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[150px]',
                    editable ? 'px-3 py-2' : 'px-4 md:px-8 py-6',
                    // Preserve empty paragraph line breaks
                    '[&_p:empty]:min-h-[1.5em] [&_p:empty]:before:content-["\\00a0"]',
                    // Default styling adjustments
                    '[&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg',
                    '[&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-semibold',
                    '[&_h1]:mt-4 [&_h2]:mt-3 [&_h3]:mt-2',
                    // List styling: explicit bullets and numbers with proper indentation
                    '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ul]:space-y-1',
                    '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_ol]:space-y-1',
                    '[&_li]:my-1 [&_li]:leading-relaxed',
                    '[&_li>p]:my-0 [&_li>p]:inline-block',
                    '[&_ul_ul]:list-circle [&_ul_ul]:pl-5 [&_ul_ul]:my-1',
                    '[&_ul_ul_ul]:list-square [&_ul_ul_ul]:pl-5 [&_ul_ul_ul]:my-1',
                    // Minecraft "Voxel Texture Pack" Styles
                    isMinecraft && [
                        "font-['Minecraftia'] text-lg", // Pixel font, slightly larger to be readable
                        // Text colors for maximum readability in both light & dark
                        "text-[#2c1d11] dark:text-stone-100",
                        "[&_p]:text-[#2c1d11] dark:[&_p]:text-stone-100",
                        "[&_h1]:text-[#1e140a] dark:[&_h1]:text-stone-100",
                        "[&_h2]:text-[#1e140a] dark:[&_h2]:text-stone-100",
                        "[&_h3]:text-[#1e140a] dark:[&_h3]:text-stone-100",
                        "[&_li]:text-[#2c1d11] dark:[&_li]:text-stone-100",
                        "[&_strong]:text-[#1e140a] dark:[&_strong]:text-white",
                        // Redstone Block (Code)
                        "[&_pre]:bg-red-900 [&_pre]:border-2 [&_pre]:border-red-500 [&_pre]:text-red-100 [&_pre]:shadow-[0_0_15px_rgba(239,68,68,0.4)] [&_code]:bg-transparent",
                        // Oak Sign (Blockquote)
                        "[&_blockquote]:bg-amber-100 dark:[&_blockquote]:bg-amber-900/60 [&_blockquote]:border-l-[6px] [&_blockquote]:border-amber-600 [&_blockquote]:text-[#2c1d11] dark:[&_blockquote]:text-amber-100 [&_blockquote]:not-italic [&_blockquote]:font-bold [&_blockquote]:px-4 [&_blockquote]:py-2",
                        // General Text adjustments for better contrast in pixel mode
                        "[&_p]:my-2"
                    ]
                )
            }
        }
    })

    // Keep editor content in sync with external content prop updates without disrupting active typing
    useEffect(() => {
        if (editor && !editor.isFocused && content !== editor.getHTML()) {
            editor.commands.setContent(content || '', false)
        }
    }, [content, editor])

    // Keep editor editable state in sync
    useEffect(() => {
        if (editor) {
            editor.setEditable(editable)
        }
    }, [editable, editor])

    // Re-render toolbar when selection moves (e.g., entering/leaving a table)
    useEffect(() => {
        if (!editor) return
        const onSelection = () => setSelectionCount(c => c + 1)
        editor.on('selectionUpdate', onSelection)
        return () => {
            editor.off('selectionUpdate', onSelection)
        }
    }, [editor])

    if (!editor) return null

    const textColors = ['#000000', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']
    const highlightColors = ['#FEF3C7', '#FEE2E2', '#DBEAFE', '#D1FAE5', '#E9D5FF', '#FCE7F3']

    const mcBtn = isMinecraft
        ? "rounded-none text-[#4a3520] dark:text-stone-300 hover:bg-[#dfd0b5] hover:text-[#2c1d11] dark:hover:bg-stone-700 dark:hover:text-stone-100"
        : ""
    const mcActive = (isActive: boolean) => {
        if (!isActive) return ""
        return isMinecraft
            ? "bg-[#c8b393] text-[#1e140a] dark:bg-stone-700 dark:text-stone-100 font-bold"
            : "bg-muted text-foreground"
    }

    const currentFontFamily = editor.getAttributes('textStyle').fontFamily || ''
    const activeFont = AVAILABLE_FONTS.find(f =>
        currentFontFamily && (
            f.fontFamily.toLowerCase().includes(currentFontFamily.toLowerCase()) ||
            currentFontFamily.toLowerCase().includes(f.name.toLowerCase()) ||
            currentFontFamily.toLowerCase().includes(f.id.toLowerCase())
        )
    ) || AVAILABLE_FONTS[0]

    return (
        <div className={cn(
            editable ? "border border-t-0 rounded-b-xl bg-card relative shadow-xs" : "bg-card rounded-xl border shadow-sm",
            isMinecraft && "border-4 rounded-none border-[#c8b393] bg-[#fbf7ed] text-[#2c1d11] dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 shadow-sm",
            className
        )}>
            {editable && (
                <div className={cn(
                    "sticky top-0 z-20 border-b bg-card/95 backdrop-blur-md p-1.5 flex flex-wrap items-center gap-1 shadow-xs",
                    isMinecraft && "bg-[#eee3ce]/95 border-b-2 border-[#c8b393] text-[#4a3520] dark:bg-stone-800/95 dark:border-stone-600 dark:text-stone-300"
                )}>
                    {/* Headings */}
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            mcActive(editor.isActive('heading', { level: 1 })),
                            mcBtn
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
                            mcActive(editor.isActive('heading', { level: 2 })),
                            mcBtn
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
                            mcActive(editor.isActive('heading', { level: 3 })),
                            mcBtn
                        )}
                        type="button"
                        title="Heading 3"
                    >
                        <Heading3 className="h-4 w-4" />
                    </button>

                    <div className={cn("w-px h-6 my-auto mx-1", isMinecraft ? "bg-[#c8b393] dark:bg-stone-600" : "bg-border")} />

                    {/* Font Family Dropdown */}
                    <div className="relative" ref={fontPickerRef}>
                        <button
                            type="button"
                            onClick={() => setShowFontPicker(!showFontPicker)}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/70 hover:bg-muted/80 text-xs font-medium transition-all shadow-2xs max-w-[150px]",
                                showFontPicker && "bg-muted border-primary/50 ring-1 ring-primary/20",
                                mcBtn
                            )}
                            title={language === 'fr' ? "Changer la police d'écriture" : "Change font family"}
                        >
                            <Type className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate flex-1 text-left" style={{ fontFamily: activeFont.fontFamily }}>
                                {activeFont.name}
                            </span>
                            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-70" />
                        </button>

                        {showFontPicker && (
                            <div className="absolute top-full left-0 mt-1.5 w-64 max-h-80 overflow-y-auto bg-popover text-popover-foreground border rounded-xl shadow-xl p-1.5 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b mb-1 flex items-center justify-between">
                                    <span>{language === 'fr' ? 'Polices locales' : 'Local fonts'}</span>
                                    <span className="text-[9px] font-normal lowercase opacity-70">100% hors-ligne</span>
                                </div>
                                {AVAILABLE_FONTS.map(font => {
                                    const isSelected = activeFont.id === font.id
                                    return (
                                        <button
                                            key={font.id}
                                            type="button"
                                            onClick={() => {
                                                if (font.id === 'inter') {
                                                    editor.chain().focus().unsetFontFamily().run()
                                                } else {
                                                    editor.chain().focus().setFontFamily(font.fontFamily).run()
                                                }
                                                setShowFontPicker(false)
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors group cursor-pointer",
                                                isSelected
                                                    ? "bg-primary/10 text-primary font-semibold"
                                                    : "hover:bg-muted text-foreground"
                                            )}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div
                                                    className="text-[13px] truncate leading-tight font-medium"
                                                    style={{ fontFamily: font.fontFamily }}
                                                >
                                                    {font.name}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                    <span className="px-1 py-0.2 rounded bg-muted/80 text-[9px] font-medium shrink-0">
                                                        {language === 'fr' ? font.categoryLabelFr : font.categoryLabelEn}
                                                    </span>
                                                    {font.descriptionFr && (
                                                        <span className="truncate opacity-80">
                                                            {language === 'fr' ? font.descriptionFr : font.descriptionEn}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1.5" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className={cn("w-px h-6 my-auto mx-1", isMinecraft ? "bg-[#c8b393] dark:bg-stone-600" : "bg-border")} />

                    {/* Text Styling */}
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            mcActive(editor.isActive('bold')),
                            mcBtn
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
                            mcActive(editor.isActive('italic')),
                            mcBtn
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
                            mcActive(editor.isActive('underline')),
                            mcBtn
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
                            mcActive(editor.isActive('strike')),
                            mcBtn
                        )}
                        type="button"
                        title="Strikethrough"
                    >
                        <Strikethrough className="h-4 w-4" />
                    </button>

                    <div className={cn("w-px h-6 my-auto mx-1", isMinecraft ? "bg-[#c8b393] dark:bg-stone-600" : "bg-border")} />

                    {/* Color & Highlight */}
                    <div className="relative" ref={colorPickerRef}>
                        <button
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className={cn(
                                "p-2 rounded hover:bg-muted transition-colors relative",
                                mcBtn
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
                    <div className="relative" ref={highlightPickerRef}>
                        <button
                            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                            className={cn(
                                "p-2 rounded hover:bg-muted transition-colors",
                                mcActive(editor.isActive('highlight')),
                                mcBtn
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

                    <div className={cn("w-px h-6 my-auto mx-1", isMinecraft ? "bg-[#c8b393] dark:bg-stone-600" : "bg-border")} />

                    {/* Lists */}
                    <button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            mcActive(editor.isActive('bulletList')),
                            mcBtn
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
                            mcActive(editor.isActive('orderedList')),
                            mcBtn
                        )}
                        type="button"
                        title="Ordered List"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </button>

                    <div className={cn("w-px h-6 my-auto mx-1", isMinecraft ? "bg-[#c8b393] dark:bg-stone-600" : "bg-border")} />

                    {/* Quote, Code, Separator */}
                    <button
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            mcActive(editor.isActive('blockquote')),
                            mcBtn
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
                            mcActive(editor.isActive('code')),
                            mcBtn
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
                            mcBtn
                        )}
                        type="button"
                        title="Horizontal Line"
                    >
                        <Minus className="h-4 w-4" />
                    </button>

                    {/* Insert Image Button */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            mcBtn
                        )}
                        type="button"
                        title={t('editor.insertImage') || "Insérer une image (ou glisser-déposer / Ctrl+V)"}
                    >
                        <ImageIcon className="h-4 w-4" />
                    </button>

                    {/* Insert Math Formula Button */}
                    <button
                        onClick={() => {
                            editor.chain().focus().insertContent(' $$ \\text{formule} $$ ').run();
                        }}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors",
                            mcBtn
                        )}
                        type="button"
                        title={t('editor.insertMath') || "Insérer une formule mathématique ($$...$$)"}
                    >
                        <Sigma className="h-4 w-4" />
                    </button>

                    {/* Insert Table Button */}
                    <div className="relative" ref={tablePickerRef}>
                        <button
                            onClick={() => setShowTablePicker(!showTablePicker)}
                            className={cn(
                                "p-2 rounded hover:bg-muted transition-colors relative",
                                (showTablePicker || editor.isActive('table')) && "bg-muted text-primary font-medium",
                                mcBtn
                            )}
                            type="button"
                            title={language === 'fr' ? "Insérer un tableau interactif" : "Insert interactive table"}
                        >
                            <TableIcon className="h-4 w-4" />
                        </button>
                        {showTablePicker && (
                            <div className="absolute top-full left-0 mt-1.5 w-52 bg-popover text-popover-foreground border rounded-xl shadow-xl p-2.5 z-30 animate-in fade-in zoom-in-95">
                                <div className="text-[11px] font-semibold text-foreground mb-2 flex items-center justify-between">
                                    <span>{language === 'fr' ? 'Insérer un tableau' : 'Insert table'}</span>
                                    <span className="text-[10px] text-muted-foreground font-normal">{language === 'fr' ? 'Grille' : 'Grid'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 mb-2">
                                    {[
                                        { r: 2, c: 2, label: '2 × 2' },
                                        { r: 3, c: 3, label: '3 × 3' },
                                        { r: 4, c: 3, label: '4 × 3' },
                                        { r: 5, c: 4, label: '5 × 4' },
                                    ].map(({ r, c, label }) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => {
                                                editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run()
                                                setShowTablePicker(false)
                                            }}
                                            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-border/80 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-xs font-medium transition-all cursor-pointer"
                                        >
                                            <TableIcon className="h-3 w-3 opacity-60" />
                                            <span>{label}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="text-[10px] text-muted-foreground border-t pt-1.5 text-center">
                                    {language === 'fr' ? 'Colonnes redimensionnables' : 'Resizable columns'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Speech to Text Button */}
                    {isSupported && (
                        <>
                            <div className={cn("w-px h-6 my-auto mx-1", isMinecraft ? "bg-[#c8b393] dark:bg-stone-600" : "bg-border")} />
                            <button
                                onClick={handleDictationToggle}
                                className={cn(
                                    "p-2 rounded hover:bg-muted transition-colors relative",
                                    isListening && "bg-red-100 text-red-600 animate-pulse",
                                    mcBtn
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

            {/* Contextual Table Toolbar (Active when cursor is inside a table) */}
            {editable && editor.isActive('table') && (
                <div className={cn(
                    "px-3 py-1.5 bg-muted/40 border-b flex flex-wrap items-center gap-1 text-xs select-none animate-in fade-in duration-150",
                    isMinecraft && "bg-[#dfd0b5] border-b-2 border-[#c8b393] text-[#2c1d11] dark:bg-stone-800 dark:border-stone-600 dark:text-stone-300"
                )}>
                    <span className="text-muted-foreground font-semibold flex items-center gap-1 mr-1 text-[11px]">
                        <TableIcon className="h-3.5 w-3.5 text-primary" />
                        <span>{language === 'fr' ? 'Tableau :' : 'Table:'}</span>
                    </span>

                    {/* Row controls */}
                    <div className="flex items-center gap-0.5 bg-background/80 dark:bg-card/80 p-0.5 rounded-md border shadow-2xs">
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().addRowBefore().run()}
                            className="px-1.5 py-0.5 hover:bg-muted rounded text-[11px] font-medium transition-colors"
                            title={language === 'fr' ? "Insérer une ligne au-dessus" : "Insert row above"}
                        >
                            + Ligne ↑
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().addRowAfter().run()}
                            className="px-1.5 py-0.5 hover:bg-muted rounded text-[11px] font-medium transition-colors"
                            title={language === 'fr' ? "Insérer une ligne en-dessous" : "Insert row below"}
                        >
                            + Ligne ↓
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().deleteRow().run()}
                            className="px-1.5 py-0.5 hover:bg-destructive/10 text-destructive rounded text-[11px] font-medium transition-colors"
                            title={language === 'fr' ? "Supprimer la ligne courante" : "Delete current row"}
                        >
                            - Ligne
                        </button>
                    </div>

                    <div className="w-px h-3.5 bg-border mx-1" />

                    {/* Column controls */}
                    <div className="flex items-center gap-0.5 bg-background/80 dark:bg-card/80 p-0.5 rounded-md border shadow-2xs">
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().addColumnBefore().run()}
                            className="px-1.5 py-0.5 hover:bg-muted rounded text-[11px] font-medium transition-colors"
                            title={language === 'fr' ? "Insérer une colonne à gauche" : "Insert column left"}
                        >
                            + Col ←
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().addColumnAfter().run()}
                            className="px-1.5 py-0.5 hover:bg-muted rounded text-[11px] font-medium transition-colors"
                            title={language === 'fr' ? "Insérer une colonne à droite" : "Insert column right"}
                        >
                            + Col →
                        </button>
                        <button
                            type="button"
                            onClick={() => editor.chain().focus().deleteColumn().run()}
                            className="px-1.5 py-0.5 hover:bg-destructive/10 text-destructive rounded text-[11px] font-medium transition-colors"
                            title={language === 'fr' ? "Supprimer la colonne courante" : "Delete current column"}
                        >
                            - Col
                        </button>
                    </div>

                    <div className="w-px h-3.5 bg-border mx-1" />

                    {/* Header toggle */}
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
                        className="px-2 py-0.5 bg-background/80 dark:bg-card/80 hover:bg-muted rounded border shadow-2xs text-[11px] font-medium transition-colors"
                        title={language === 'fr' ? "Activer/désactiver la ligne d'en-tête" : "Toggle header row"}
                    >
                        {language === 'fr' ? "Ligne d'en-tête" : "Header row"}
                    </button>

                    {/* Delete entire table */}
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().deleteTable().run()}
                        className="ml-auto px-2 py-0.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded border border-destructive/20 text-[11px] font-medium transition-colors flex items-center gap-1"
                        title={language === 'fr' ? "Supprimer l'intégralité du tableau" : "Delete table"}
                    >
                        <Trash2 className="h-3 w-3" />
                        <span>{language === 'fr' ? "Supprimer" : "Delete"}</span>
                    </button>
                </div>
            )}
            <EditorContent editor={editor} className="min-h-[150px]" />
        </div>
    )
}
