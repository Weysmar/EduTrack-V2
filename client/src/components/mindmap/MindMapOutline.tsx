import { MindmapNode } from '@/lib/mindmap/mindmapSource'
import { MINDMAP_BRANCH_COLORS } from './MindMapThumbnail'

/** Plain-text outline ("- " bullets, 2 spaces per level), for copying into notes */
export function mindmapToText(node: MindmapNode, depth = 0): string {
    const line = depth === 0 ? node.label : `${'  '.repeat(depth - 1)}- ${node.label}`
    return [line, ...node.children.map(child => mindmapToText(child, depth + 1))].join('\n')
}

function OutlineList({ nodes, color }: { nodes: MindmapNode[]; color: string }) {
    if (nodes.length === 0) return null
    return (
        <ul className="mt-1.5 space-y-1 border-l-2 pl-4" style={{ borderColor: `${color}55` }}>
            {nodes.map((node, i) => (
                <li key={i} className="text-sm leading-relaxed">
                    <span className="inline-flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                        <span>{node.label}</span>
                    </span>
                    <OutlineList nodes={node.children} color={color} />
                </li>
            ))}
        </ul>
    )
}

/** Mind map as a readable, accessible outline: one card per main branch */
export function MindMapOutline({ tree }: { tree: MindmapNode }) {
    return (
        <div className="h-full overflow-y-auto p-4 sm:p-8">
            <div className="mx-auto max-w-3xl">
                <h2 className="mb-6 text-center text-2xl font-bold">{tree.label}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    {tree.children.map((branch, i) => {
                        const color = MINDMAP_BRANCH_COLORS[i % MINDMAP_BRANCH_COLORS.length]
                        return (
                            <section
                                key={i}
                                className="rounded-xl border bg-card p-4 shadow-sm"
                                style={{ borderTopColor: color, borderTopWidth: 4 }}
                            >
                                <h3 className="font-semibold">{branch.label}</h3>
                                <OutlineList nodes={branch.children} color={color} />
                            </section>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
