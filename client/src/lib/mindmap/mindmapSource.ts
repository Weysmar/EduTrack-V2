/**
 * Helpers around the Mermaid "mindmap" syntax stored in MindMap.content:
 * - parseMindmap: indentation-based tree, for thumbnails and the outline view
 * - normalizeMindmapSource: repairs AI output that Mermaid refuses to render
 */

export interface MindmapNode {
    label: string
    children: MindmapNode[]
}

// Mermaid node shapes: ((circle)), (rounded), [square], {{hexagon}}, ))bang((, )cloud(
const SHAPES: [RegExp, number][] = [
    [/^[\w-]*\(\((.*)\)\)$/, 1],
    [/^[\w-]*\)\)(.*)\(\($/, 1],
    [/^[\w-]*\{\{(.*)\}\}$/, 1],
    [/^[\w-]*\[(.*)\]$/, 1],
    [/^[\w-]*\((.*)\)$/, 1],
    [/^[\w-]*\)(.*)\($/, 1],
]

const stripQuotes = (label: string) => label.replace(/^["'`](.*)["'`]$/, '$1').trim()

/** Text shown for a node line, without Mermaid's shape delimiters, icons or classes */
export function nodeLabel(raw: string): string {
    const text = raw.replace(/:::.*$/, '').trim()
    for (const [pattern, group] of SHAPES) {
        const match = text.match(pattern)
        if (match) return stripQuotes(match[group])
    }
    return stripQuotes(text)
}

const isMetaLine = (text: string) => /^::icon\(/.test(text) || /^%%/.test(text)

const indentOf = (line: string) => line.match(/^\s*/)![0].replace(/\t/g, '    ').length

/** Parses Mermaid mindmap source into a tree (null if there is no node) */
export function parseMindmap(source: string): MindmapNode | null {
    const lines = (source || '').split(/\r?\n/)
    const start = lines.findIndex(l => l.trim().toLowerCase() === 'mindmap')
    const body = (start >= 0 ? lines.slice(start + 1) : lines)
        .filter(l => l.trim() && !isMetaLine(l.trim()))

    let root: MindmapNode | null = null
    const stack: { indent: number; node: MindmapNode }[] = []

    for (const line of body) {
        const indent = indentOf(line)
        const node: MindmapNode = { label: nodeLabel(line.trim()), children: [] }
        if (!node.label) continue

        if (!root) {
            root = node
            stack.push({ indent, node })
            continue
        }
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop()
        // Lines indented at (or above) the root level still belong under the root
        stack[stack.length - 1].node.children.push(node)
        stack.push({ indent, node })
    }
    return root
}

/** Number of nodes below the root */
export function countDescendants(node: MindmapNode | null): number {
    if (!node) return 0
    return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0)
}

/**
 * Makes AI-generated mindmap source renderable:
 * - drops markdown fences / chatter before the "mindmap" keyword
 * - keeps the root shape, but removes (), [], {} from other labels, which Mermaid reads as shape
 *   syntax ("Loi d'Ohm (U = RI)" made the whole map fail to render)
 */
export function normalizeMindmapSource(source: string): string {
    const lines = (source || '')
        .replace(/```(?:mermaid)?/gi, '')
        .split(/\r?\n/)
    const start = lines.findIndex(l => l.trim().toLowerCase() === 'mindmap')
    const body = (start >= 0 ? lines.slice(start + 1) : lines).filter(l => l.trim())
    if (body.length === 0) return 'mindmap'

    const out = ['mindmap']
    body.forEach((line, index) => {
        const indent = line.match(/^\s*/)![0]
        const text = line.trim()
        if (isMetaLine(text)) {
            out.push(line)
            return
        }
        if (index === 0) {
            out.push(`${indent}root((${nodeLabel(text).replace(/[()[\]{}]/g, ' ').replace(/\s+/g, ' ').trim()}))`)
            return
        }
        const label = nodeLabel(text).replace(/[()[\]{}]/g, ' ').replace(/\s+/g, ' ').trim()
        if (label) out.push(`${indent}${label}`)
    })
    return out.join('\n')
}
