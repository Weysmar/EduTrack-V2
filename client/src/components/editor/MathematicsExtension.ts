import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/react';
import katex from 'katex';
import { decodeMathEntities } from '@/lib/renderMath';

interface MathMatch {
    from: number;
    to: number;
    formula: string;
    displayMode: boolean;
}

/**
 * Extracts math formulas ($$, \[, \(, $) from text.
 */
function findMathMatches(text: string, startPos: number): MathMatch[] {
    const matches: MathMatch[] = [];

    const isOverlapping = (from: number, to: number) => {
        return matches.some(m => Math.max(from, m.from) < Math.min(to, m.to));
    };

    // 1. Block math: $$ ... $$
    const blockRegex = /(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$/g;
    let match: RegExpExecArray | null;
    while ((match = blockRegex.exec(text)) !== null) {
        const from = startPos + match.index;
        const to = from + match[0].length;
        matches.push({
            from,
            to,
            formula: match[1].trim(),
            displayMode: true
        });
    }

    // 2. Bracket block math: \[ ... \]
    const bracketRegex = /(?<!\\)\\\[([\s\S]+?)(?<!\\)\\\]/g;
    while ((match = bracketRegex.exec(text)) !== null) {
        const from = startPos + match.index;
        const to = from + match[0].length;
        if (!isOverlapping(from, to)) {
            matches.push({
                from,
                to,
                formula: match[1].trim(),
                displayMode: true
            });
        }
    }

    // 3. Parenthesis inline math: \( ... \)
    const parenRegex = /(?<!\\)\\\(([\s\S]+?)(?<!\\)\\\)/g;
    while ((match = parenRegex.exec(text)) !== null) {
        const from = startPos + match.index;
        const to = from + match[0].length;
        if (!isOverlapping(from, to)) {
            matches.push({
                from,
                to,
                formula: match[1].trim(),
                displayMode: false
            });
        }
    }

    // 4. Inline math: $ ... $ (excluding currency like $100)
    const inlineRegex = /(?<!\\)\$(?!\s)([^$\r\n]+?)(?<!\s)\$(?!\d)/g;
    while ((match = inlineRegex.exec(text)) !== null) {
        const from = startPos + match.index;
        const to = from + match[0].length;
        const formula = match[1].trim();
        if (!isOverlapping(from, to) && !/^\s*\d+(?:[.,]\d+)?\s*$/.test(formula)) {
            matches.push({
                from,
                to,
                formula,
                displayMode: false
            });
        }
    }

    return matches.sort((a, b) => a.from - b.from);
}

export const mathematicsPluginKey = new PluginKey('hubtrack-mathematics');

function createMathematicsPlugin(editor: Editor) {
    return new Plugin({
        key: mathematicsPluginKey,
        state: {
            init(_, state) {
                return buildDecorations(state, editor);
            },
            apply(tr, oldDecos, _oldState, newState) {
                if (!tr.docChanged && !tr.selectionSet && oldDecos) {
                    return oldDecos;
                }
                return buildDecorations(newState, editor);
            }
        },
        props: {
            decorations(state) {
                return this.getState(state);
            }
        }
    });
}

function buildDecorations(state: any, editor: Editor): DecorationSet {
    const { doc, selection } = state;
    const isEditable = editor.isEditable;
    const decorations: Decoration[] = [];

    doc.descendants((node: any, pos: number) => {
        // Only inspect text nodes, avoid code blocks
        if (!node.isText || !node.text) return;

        // Skip if inside code or pre
        const parent = doc.resolve(pos).parent;
        if (parent && (parent.type.name === 'codeBlock' || parent.type.name === 'code')) {
            return;
        }

        const text = node.text;
        if (!text.includes('$') && !text.includes('\\[')) return;

        const matches = findMathMatches(text, pos);

        for (const m of matches) {
            const isEditing = isEditable && (
                (selection.from >= m.from && selection.to <= m.to) ||
                (selection.from <= m.to && selection.to >= m.from && !selection.empty)
            );

            if (isEditing) {
                // Keep raw text visible while typing with a subtle highlighted badge
                decorations.push(
                    Decoration.inline(m.from, m.to, {
                        class: 'tiptap-math-editing font-mono text-xs px-1.5 py-0.5 rounded bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs inline-block my-0.5'
                    })
                );
            } else {
                // Hide the raw LaTeX text
                decorations.push(
                    Decoration.inline(m.from, m.to, {
                        class: 'tiptap-math-hidden !hidden'
                    })
                );

                // Render KaTeX widget
                decorations.push(
                    Decoration.widget(m.from, () => {
                        const el = document.createElement(m.displayMode ? 'div' : 'span');
                        el.className = m.displayMode
                            ? 'tiptap-math-block katex-display-wrapper my-3 text-center overflow-x-auto overflow-y-hidden select-text transition-opacity hover:opacity-90'
                            : 'tiptap-math-inline inline-block align-middle select-text transition-opacity hover:opacity-90';

                        if (isEditable) {
                            el.title = 'Cliquer pour modifier la formule LaTeX';
                            el.style.cursor = 'pointer';
                            el.addEventListener('mousedown', (e) => {
                                e.preventDefault();
                                editor.commands.setTextSelection(m.from + (m.displayMode ? 2 : 1));
                                editor.commands.focus();
                            });
                        }

                        try {
                            katex.render(decodeMathEntities(m.formula), el, {
                                displayMode: m.displayMode,
                                throwOnError: false,
                                errorColor: '#ef4444',
                                strict: false,
                                trust: false
                            });
                        } catch {
                            el.textContent = m.formula;
                            el.classList.add('text-red-500', 'font-mono', 'text-xs');
                        }

                        return el;
                    }, {
                        side: -1
                    })
                );
            }
        }
    });

    return DecorationSet.create(doc, decorations);
}

export const MathematicsExtension = Extension.create({
    name: 'hubtrack-mathematics',

    addProseMirrorPlugins() {
        return [createMathematicsPlugin(this.editor as Editor)];
    }
});
