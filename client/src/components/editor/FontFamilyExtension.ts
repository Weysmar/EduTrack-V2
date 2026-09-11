import { Extension } from '@tiptap/core'
import '@tiptap/extension-text-style'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontFamily: {
            setFontFamily: (fontFamily: string) => ReturnType
            unsetFontFamily: () => ReturnType
        }
    }
}

export const FontFamilyExtension = Extension.create({
    name: 'fontFamily',

    addOptions() {
        return {
            types: ['textStyle'],
        }
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontFamily: {
                        default: null,
                        parseHTML: element => element.style.fontFamily?.replace(/['"]/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.fontFamily) {
                                return {}
                            }
                            return {
                                style: `font-family: ${attributes.fontFamily}`,
                            }
                        },
                    },
                },
            },
        ]
    },

    addCommands() {
        return {
            setFontFamily:
                (fontFamily: string) =>
                ({ chain }) => {
                    return chain().setMark('textStyle', { fontFamily }).run()
                },
            unsetFontFamily:
                () =>
                ({ chain }) => {
                    return chain().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run()
                },
        }
    },
})

export interface FontOption {
    id: string
    name: string
    fontFamily: string
    category: 'sans' | 'serif' | 'mono' | 'handwriting' | 'display'
    categoryLabelFr: string
    categoryLabelEn: string
    descriptionFr?: string
    descriptionEn?: string
}

export const AVAILABLE_FONTS: FontOption[] = [
    // Sans-Serif
    {
        id: 'inter',
        name: 'Inter',
        fontFamily: 'Inter, sans-serif',
        category: 'sans',
        categoryLabelFr: 'Sans-Serif',
        categoryLabelEn: 'Sans-Serif',
        descriptionFr: 'Neutre, moderne & haute lisibilité'
    },
    {
        id: 'roboto',
        name: 'Roboto',
        fontFamily: 'Roboto, sans-serif',
        category: 'sans',
        categoryLabelFr: 'Sans-Serif',
        categoryLabelEn: 'Sans-Serif',
        descriptionFr: 'Clair, équilibré & standard'
    },
    {
        id: 'poppins',
        name: 'Poppins',
        fontFamily: 'Poppins, sans-serif',
        category: 'sans',
        categoryLabelFr: 'Sans-Serif',
        categoryLabelEn: 'Sans-Serif',
        descriptionFr: 'Géométrique & moderne'
    },
    {
        id: 'lexend',
        name: 'Lexend',
        fontFamily: 'Lexend, sans-serif',
        category: 'sans',
        categoryLabelFr: 'Sans-Serif',
        categoryLabelEn: 'Sans-Serif',
        descriptionFr: 'Optimisé pour le confort de lecture'
    },

    // Sérif
    {
        id: 'merriweather',
        name: 'Merriweather',
        fontFamily: 'Merriweather, serif',
        category: 'serif',
        categoryLabelFr: 'Sérif / Roman',
        categoryLabelEn: 'Serif',
        descriptionFr: 'Idéal pour les longs textes'
    },
    {
        id: 'playfair',
        name: 'Playfair Display',
        fontFamily: '"Playfair Display", serif',
        category: 'serif',
        categoryLabelFr: 'Sérif / Roman',
        categoryLabelEn: 'Serif',
        descriptionFr: 'Élégant, littéraire & titres nobles'
    },
    {
        id: 'lora',
        name: 'Lora',
        fontFamily: 'Lora, serif',
        category: 'serif',
        categoryLabelFr: 'Sérif / Roman',
        categoryLabelEn: 'Serif',
        descriptionFr: 'Courbes calligraphiques douces'
    },

    // Monospace / Code
    {
        id: 'jetbrains',
        name: 'JetBrains Mono',
        fontFamily: '"JetBrains Mono", monospace',
        category: 'mono',
        categoryLabelFr: 'Code & Maths',
        categoryLabelEn: 'Code & Math',
        descriptionFr: 'Code, mathématiques et algorithmes'
    },

    // Manuscrit / Notes
    {
        id: 'caveat',
        name: 'Caveat',
        fontFamily: 'Caveat, cursive',
        category: 'handwriting',
        categoryLabelFr: 'Manuscrit & Notes',
        categoryLabelEn: 'Handwriting',
        descriptionFr: 'Écriture manuscrite pour annotations'
    },
    {
        id: 'comic',
        name: 'Comic Neue',
        fontFamily: '"Comic Neue", cursive, sans-serif',
        category: 'display',
        categoryLabelFr: 'Manuscrit & Notes',
        categoryLabelEn: 'Handwriting',
        descriptionFr: 'Décontracté et convivial'
    },
]
