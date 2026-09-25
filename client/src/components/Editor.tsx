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
    Image as ImageIcon, Sigma, Type, ChevronDown, Check, Table as TableIcon, Trash2,
    AlignLeft, AlignCenter, AlignRight, AlignJustify, Shapes
} from 'lucide-react'
import { NodeSelection } from '@tiptap/pm/state'
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
import { TextAlignExtension } from '@/components/editor/TextAlignExtension'
import { DrawingModal } from '@/components/drawing/DrawingModal'
import { DrawingData } from '@/components/drawing/types'

// Custom TipTap Image Node with Drawing metadata support
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
            dataDrawing: {
                default: null,
                parseHTML: element => element.getAttribute('data-drawing'),
                renderHTML: attributes => {
                    if (!attributes.dataDrawing) return {}
                    return { 'data-drawing': attributes.dataDrawing }
                }
            }
        }
    },

    parseHTML() {
        return [{ tag: 'img[src]' }]
    },

    renderHTML({ HTMLAttributes }) {
        const isDrawing = Boolean(HTMLAttributes['data-drawing'])
        return ['img', mergeAttributes(HTMLAttributes, {
            class: cn(
                'rounded-xl max-w-full h-auto my-4 shadow-sm border mx-auto block',
                isDrawing && 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all'
            )
        })]
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
    variant?: 'default' | 'document'
}

export function Editor({ content, onChange, editable = true, className, variant = 'default' }: EditorProps) {
    const { language, t } = useLanguage()
    const { minecraftTheme: isMinecraft } = useTheme()
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showHighlightPicker, setShowHighlightPicker] = useState(false)
    const [showFontPicker, setShowFontPicker] = useState(false)
    const [showTablePicker, setShowTablePicker] = useState(false)
    const [showDrawingModal, setShowDrawingModal] = useState(false)
    const [editingDrawingData, setEditingDrawingData] = useState<DrawingData | null>(null)
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

    const handleSaveDrawing = ({ dataUrl, drawingData }: { svg: string; dataUrl: string; drawingData: DrawingData }) => {
        if (!editor) return
        const drawingJson = JSON.stringify(drawingData)
        if (editingDrawingData && editor.isActive('image')) {
            editor.chain().focus().updateAttributes('image', {
                src: dataUrl,
                alt: 'Dessin',
                dataDrawing: drawingJson
            }).run()
        } else {
            editor.chain().focus().insertContent({
                type: 'image',
                attrs: {
                    src: dataUrl,
                    alt: 'Dessin',
                    dataDrawing: drawingJson
                }
            }).run()
        }
        setShowDrawingModal(false)
        setEditingDrawingData(null)
        toast.success(language === 'fr' ? 'Dessin inséré avec succès !' : 'Drawing inserted successfully!')
    }

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3]
                }
            }),
            TextAlignExtension,
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
            transformPastedHTML: (html) => {
                // Strip hardcoded dark/black inline styles from pasted web/Word content so it adapts seamlessly to dark/light theme
                return html
                    .replace(/(style="[^"]*?)color:\s*(?:#000000|#000|rgb\(0,\s*0,\s*0\)|black|windowtext|#0f172a|#111827|#1e293b|#18181b);?/gi, '$1')
                    .replace(/style="\s*"/gi, '')
            },
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
            handleDoubleClickOn: (view, pos, node) => {
                if (node.type.name === 'image' && node.attrs.dataDrawing) {
                    try {
                        const raw = node.attrs.dataDrawing
                        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
                        view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)))
                        setEditingDrawingData(parsed)
                        setShowDrawingModal(true)
                        return true
                    } catch (err) {
                        console.error('Failed to parse drawing data:', err)
                    }
                }
                return false
            },
            attributes: {
                class: cn(
                    variant === 'document'
                        ? 'prose prose-base text-slate-900 focus:outline-none max-w-none min-h-[25cm] [&_p]:text-slate-900 [&_h1]:text-slate-900 [&_h2]:text-slate-900 [&_h3]:text-slate-900 [&_li]:text-slate-900 [&_strong]:text-slate-950 [&_blockquote]:text-slate-900 [&_td]:text-slate-900 [&_th]:text-slate-950'
                        : 'prose prose-sm dark:prose-invert text-foreground focus:outline-none max-w-none min-h-[150px]',
                    editable ? (variant === 'document' ? 'px-0 py-2' : 'px-3 py-2') : 'px-4 md:px-8 py-6',
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
                    '[&_li>p]:my-0 [&_li>p]:inline',
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

    const textColors = [
        { color: '#FFFFFF', labelFr: 'Blanc', labelEn: 'White' },
        { color: '#000000', labelFr: 'Noir', labelEn: 'Black' },
        { color: '#64748B', labelFr: 'Gris ardoise', labelEn: 'Slate gray' },
        { color: '#EF4444', labelFr: 'Rouge', labelEn: 'Red' },
        { color: '#F97316', labelFr: 'Orange', labelEn: 'Orange' },
        { color: '#F59E0B', labelFr: 'Jaune ambre', labelEn: 'Amber yellow' },
        { color: '#10B981', labelFr: 'Vert émeraude', labelEn: 'Emerald green' },
        { color: '#06B6D4', labelFr: 'Cyan', labelEn: 'Cyan' },
        { color: '#3B82F6', labelFr: 'Bleu', labelEn: 'Blue' },
        { color: '#8B5CF6', labelFr: 'Violet', labelEn: 'Purple' },
        { color: '#EC4899', labelFr: 'Rose', labelEn: 'Pink' },
        { color: '#A855F7', labelFr: 'Pourpre', labelEn: 'Purple shade' },
    ]
    const highlightColors = [
        { color: '#FEF08A', labelFr: 'Jaune fluo', labelEn: 'Bright yellow' },
        { color: '#FED7AA', labelFr: 'Pêche', labelEn: 'Peach' },
        { color: '#FECDD3', labelFr: 'Rose doux', labelEn: 'Soft pink' },
        { color: '#BBF7D0', labelFr: 'Menthe', labelEn: 'Mint' },
        { color: '#BAE6FD', labelFr: 'Bleu ciel', labelEn: 'Sky blue' },
        { color: '#DDD6FE', labelFr: 'Lavande', labelEn: 'Lavender' },
    ]

    const mcBtn = isMinecraft
        ? "rounded-none text-[#4a3520] dark:text-stone-300 hover:bg-[#dfd0b5] hover:text-[#2c1d11] dark:hover:bg-stone-700 dark:hover:text-stone-100"
        : (variant === 'document' ? "text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700" : "text-foreground/80 hover:text-foreground")

    const mcActive = (isActive: boolean) => {
        if (!isActive) return ""
        if (isMinecraft) return "bg-[#c8b393] text-[#1e140a] dark:bg-stone-700 dark:text-stone-100 font-bold"
        if (variant === 'document') return "bg-primary/20 text-primary font-bold ring-1 ring-primary/40"
        return "bg-primary/15 text-primary font-semibold"
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
            variant === 'document'
                ? "bg-transparent text-slate-900 border-none shadow-none rounded-none w-full"
                : (editable ? "border border-t-0 rounded-b-xl bg-card text-card-foreground relative shadow-xs" : "bg-card text-card-foreground rounded-xl border shadow-sm"),
            isMinecraft && "border-4 rounded-none border-[#c8b393] bg-[#fbf7ed] text-[#2c1d11] dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 shadow-sm",
            className
        )}>
            {editable && (
                <div className={cn(
                    "sticky top-0 z-20 border-b p-1.5 flex flex-wrap items-center gap-1 shadow-xs transition-colors shrink-0",
                    variant === 'document'
                        ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 backdrop-blur-md"
                        : "bg-card/95 backdrop-blur-md text-foreground",
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
                            title={language === 'fr' ? "Couleur du texte" : "Text Color"}
                        >
                            <Palette className="h-4 w-4" />
                        </button>
                        {showColorPicker && (
                            <div className="absolute top-full left-0 mt-1 bg-popover text-popover-foreground border rounded-xl shadow-xl p-2.5 z-30 min-w-[220px] space-y-2 animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between border-b pb-1.5 px-0.5">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        {language === 'fr' ? 'Couleur texte' : 'Text color'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            editor.chain().focus().unsetColor().run()
                                            setShowColorPicker(false)
                                        }}
                                        className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                                        title={language === 'fr' ? "Rétablir la couleur automatique du thème" : "Reset to automatic theme color"}
                                    >
                                        {language === 'fr' ? 'Automatique' : 'Automatic'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-6 gap-1.5">
                                    {textColors.map(item => {
                                        const isSelected = editor.isActive('textStyle', { color: item.color })
                                        return (
                                            <button
                                                key={item.color}
                                                type="button"
                                                onClick={() => {
                                                    editor.chain().focus().setColor(item.color).run()
                                                    setShowColorPicker(false)
                                                }}
                                                className={cn(
                                                    "w-7 h-7 rounded-lg transition-transform relative flex items-center justify-center hover:scale-110 shadow-2xs cursor-pointer",
                                                    item.color === '#FFFFFF' ? "border-2 border-slate-300 dark:border-slate-600" : "border border-border/40",
                                                    isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                                )}
                                                style={{ backgroundColor: item.color }}
                                                title={language === 'fr' ? item.labelFr : item.labelEn}
                                            >
                                                {isSelected && (
                                                    <Check className={cn(
                                                        "h-3.5 w-3.5",
                                                        item.color === '#FFFFFF' || item.color === '#F59E0B' || item.color === '#FEF08A' ? "text-slate-900" : "text-white"
                                                    )} />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
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
                            title={language === 'fr' ? "Surligner" : "Highlight"}
                        >
                            <Highlighter className="h-4 w-4" />
                        </button>
                        {showHighlightPicker && (
                            <div className="absolute top-full left-0 mt-1 bg-popover text-popover-foreground border rounded-xl shadow-xl p-2.5 z-30 min-w-[200px] space-y-2 animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between border-b pb-1.5 px-0.5">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        {language === 'fr' ? 'Surlignage' : 'Highlight'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            editor.chain().focus().unsetHighlight().run()
                                            setShowHighlightPicker(false)
                                        }}
                                        className="text-[10px] text-destructive hover:underline font-medium cursor-pointer"
                                        title={language === 'fr' ? "Supprimer le surlignage" : "Remove highlight"}
                                    >
                                        {language === 'fr' ? 'Effacer' : 'Clear'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-6 gap-1.5">
                                    {highlightColors.map(item => {
                                        const isSelected = editor.isActive('highlight', { color: item.color })
                                        return (
                                            <button
                                                key={item.color}
                                                type="button"
                                                onClick={() => {
                                                    editor.chain().focus().setHighlight({ color: item.color }).run()
                                                    setShowHighlightPicker(false)
                                                }}
                                                className={cn(
                                                    "w-7 h-7 rounded-lg transition-transform relative flex items-center justify-center hover:scale-110 shadow-2xs border border-border/40 cursor-pointer",
                                                    isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                                )}
                                                style={{ backgroundColor: item.color }}
                                                title={language === 'fr' ? item.labelFr : item.labelEn}
                                            >
                                                {isSelected && (
                                                    <Check className="h-3.5 w-3.5 text-slate-900" />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
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

                    {/* Text Alignment */}
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={() => editor.chain().focus().setTextAlign('left').run()}
                            className={cn(
                                "p-2 rounded hover:bg-muted transition-colors",
                                mcActive(editor.isActive({ textAlign: 'left' })),
                                mcBtn
                            )}
                            type="button"
                            title={language === 'fr' ? "Aligner à gauche" : "Align Left"}
                        >
                            <AlignLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().setTextAlign('center').run()}
                            className={cn(
                                "p-2 rounded hover:bg-muted transition-colors",
                                mcActive(editor.isActive({ textAlign: 'center' })),
                                mcBtn
                            )}
                            type="button"
                            title={language === 'fr' ? "Centrer" : "Align Center"}
                        >
                            <AlignCenter className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().setTextAlign('right').run()}
                            className={cn(
                                "p-2 rounded hover:bg-muted transition-colors",
                                mcActive(editor.isActive({ textAlign: 'right' })),
                                mcBtn
                            )}
                            type="button"
                            title={language === 'fr' ? "Aligner à droite" : "Align Right"}
                        >
                            <AlignRight className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                            className={cn(
                                "p-2 rounded hover:bg-muted transition-colors",
                                mcActive(editor.isActive({ textAlign: 'justify' })),
                                mcBtn
                            )}
                            type="button"
                            title={language === 'fr' ? "Justifier" : "Justify"}
                        >
                            <AlignJustify className="h-4 w-4" />
                        </button>
                    </div>

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

                    {/* Insert Drawing Button (Google Docs style) */}
                    <button
                        onClick={() => {
                            setEditingDrawingData(null)
                            setShowDrawingModal(true)
                        }}
                        className={cn(
                            "p-2 rounded hover:bg-muted transition-colors text-blue-600 dark:text-blue-400",
                            mcBtn
                        )}
                        type="button"
                        title={t('editor.insertDrawing') || "Insérer un dessin (formes, flèches, textes...)"}
                    >
                        <Shapes className="h-4 w-4" />
                    </button>

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

            {/* Contextual Drawing Toolbar (Active when an image with dataDrawing is selected) */}
            {editable && editor.isActive('image') && Boolean(editor.getAttributes('image').dataDrawing) && (
                <div className={cn(
                    "px-3 py-1.5 bg-blue-50/90 dark:bg-blue-950/60 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs select-none animate-in fade-in duration-150"
                )}>
                    <span className="text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-1.5 text-xs">
                        <Shapes className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{language === 'fr' ? 'Dessin sélectionné' : 'Drawing selected'}</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            const raw = editor.getAttributes('image').dataDrawing
                            if (raw) {
                                try {
                                    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
                                    setEditingDrawingData(parsed)
                                } catch {
                                    setEditingDrawingData(null)
                                }
                            }
                            setShowDrawingModal(true)
                        }}
                        className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                        <span>{t('editor.editDrawing') || (language === 'fr' ? 'Modifier le dessin' : 'Edit drawing')}</span>
                    </button>
                </div>
            )}

            {variant === 'document' ? (
                <div className="w-full flex-1 flex justify-center p-4 sm:p-8 bg-slate-200/60 dark:bg-slate-950 overflow-y-auto scrollbar-thin">
                    <div className="w-full max-w-[21.5cm] min-h-[29.7cm] bg-white text-slate-900 shadow-2xl rounded-sm border border-slate-300 dark:border-slate-800 p-8 sm:p-14 my-2 sm:my-4 transition-all box-border overflow-hidden relative">
                        <EditorContent editor={editor} className="min-h-[25cm] w-full max-w-full focus:outline-none" />
                    </div>
                </div>
            ) : (
                <EditorContent editor={editor} className="min-h-[150px]" />
            )}

            {/* Drawing Modal */}
            {showDrawingModal && (
                <DrawingModal
                    open={showDrawingModal}
                    onClose={() => {
                        setShowDrawingModal(false)
                        setEditingDrawingData(null)
                    }}
                    initialData={editingDrawingData}
                    onSave={handleSaveDrawing}
                />
            )}
        </div>
    )
}
