import { Extension } from '@tiptap/core';

export interface TextAlignOptions {
    types: string[];
    alignments: string[];
    defaultAlignment: string;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        textAlign: {
            setTextAlign: (alignment: string) => ReturnType;
            unsetTextAlign: () => ReturnType;
        };
    }
}

export const TextAlignExtension = Extension.create<TextAlignOptions>({
    name: 'textAlign',

    addOptions() {
        return {
            types: ['heading', 'paragraph', 'blockquote'],
            alignments: ['left', 'center', 'right', 'justify'],
            defaultAlignment: 'left',
        };
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    textAlign: {
                        default: this.options.defaultAlignment,
                        parseHTML: element => {
                            let align = element.style?.textAlign || element.getAttribute?.('align');
                            if (!align && element.classList) {
                                if (element.classList.contains('text-center')) align = 'center';
                                else if (element.classList.contains('text-right')) align = 'right';
                                else if (element.classList.contains('text-justify')) align = 'justify';
                                else if (element.classList.contains('text-left')) align = 'left';
                            }
                            return align || this.options.defaultAlignment;
                        },
                        renderHTML: attributes => {
                            if (!attributes.textAlign || attributes.textAlign === this.options.defaultAlignment) {
                                return {};
                            }
                            return {
                                style: `text-align: ${attributes.textAlign}`,
                                class: `text-${attributes.textAlign === 'justify' ? 'justify' : attributes.textAlign}`
                            };
                        },
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            setTextAlign:
                (alignment: string) =>
                ({ commands }) => {
                    if (!this.options.alignments.includes(alignment)) {
                        return false;
                    }
                    return this.options.types
                        .map(type => commands.updateAttributes(type, { textAlign: alignment }))
                        .some(Boolean);
                },
            unsetTextAlign:
                () =>
                ({ commands }) => {
                    return this.options.types
                        .map(type => commands.resetAttributes(type, 'textAlign'))
                        .some(Boolean);
                },
        };
    },
});
