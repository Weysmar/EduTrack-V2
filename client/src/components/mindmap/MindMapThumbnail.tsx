import { memo, useMemo } from 'react'
import { BrainCircuit } from 'lucide-react'
import { parseMindmap } from '@/lib/mindmap/mindmapSource'
import { cn } from '@/lib/utils'

// Branch colors shared with the full viewer (see MindMapViewer palette)
export const MINDMAP_BRANCH_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16']

const W = 320
const H = 180
const CX = W / 2
const CY = H / 2

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)

interface MindMapThumbnailProps {
    content: string
    className?: string
}

/**
 * Lightweight preview of a mind map: the real structure (root, main branches, sub-ideas) drawn as a
 * small radial SVG from the Mermaid source, without running Mermaid for every card.
 */
export const MindMapThumbnail = memo(function MindMapThumbnail({ content, className }: MindMapThumbnailProps) {
    const tree = useMemo(() => parseMindmap(content), [content])

    if (!tree) {
        return (
            <div className={cn('flex items-center justify-center bg-muted/40 text-muted-foreground', className)}>
                <BrainCircuit className="h-10 w-10 opacity-40" aria-hidden="true" />
            </div>
        )
    }

    const branches = tree.children.slice(0, 8)
    const count = branches.length

    return (
        <div className={cn('relative overflow-hidden bg-gradient-to-br from-muted/60 via-background to-muted/40', className)}>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" role="img" aria-label={tree.label}>
                {branches.map((branch, i) => {
                    // Spread branches on an ellipse, starting top-right and going clockwise
                    const angle = -Math.PI / 2 + (i + 0.5) * ((2 * Math.PI) / Math.max(count, 1))
                    const bx = CX + Math.cos(angle) * 96
                    const by = CY + Math.sin(angle) * 52
                    const color = MINDMAP_BRANCH_COLORS[i % MINDMAP_BRANCH_COLORS.length]
                    const label = truncate(branch.label, 13)
                    const pillW = Math.max(34, label.length * 5.6 + 14)
                    const leaves = branch.children.slice(0, 3)

                    return (
                        <g key={i}>
                            <path
                                d={`M ${CX} ${CY} Q ${(CX + bx) / 2} ${CY} ${bx} ${by}`}
                                fill="none"
                                stroke={color}
                                strokeOpacity={0.55}
                                strokeWidth={2}
                            />
                            {leaves.map((_, j) => {
                                // Start from the pill's edge in the branch direction, so sub-ideas never overlap its label
                                // exact ray/rectangle intersection: distance from the pill centre to its border along the branch direction
                                const edge = Math.min((pillW / 2) / Math.max(Math.abs(Math.cos(angle)), 1e-6), 9 / Math.max(Math.abs(Math.sin(angle)), 1e-6))
                                const sx = bx + Math.cos(angle) * edge
                                const sy = by + Math.sin(angle) * edge
                                const spread = (j - (leaves.length - 1) / 2) * 0.45
                                const lx = clamp(sx + Math.cos(angle + spread) * 14, 5, W - 5)
                                const ly = clamp(sy + Math.sin(angle + spread) * 14, 5, H - 5)
                                return (
                                    <g key={j}>
                                        <line x1={sx} y1={sy} x2={lx} y2={ly} stroke={color} strokeOpacity={0.35} strokeWidth={1.2} />
                                        <circle cx={lx} cy={ly} r={3} fill={color} fillOpacity={0.6} />
                                    </g>
                                )
                            })}
                            <rect
                                x={bx - pillW / 2}
                                y={by - 9}
                                width={pillW}
                                height={18}
                                rx={9}
                                fill={color}
                                fillOpacity={0.18}
                                stroke={color}
                                strokeWidth={1.2}
                            />
                            <text
                                x={bx}
                                y={by + 3.4}
                                textAnchor="middle"
                                fontSize={9.5}
                                fontWeight={500}
                                className="fill-foreground"
                            >
                                {label}
                            </text>
                        </g>
                    )
                })}
                <ellipse cx={CX} cy={CY} rx={50} ry={20} className="fill-primary" />
                <text
                    x={CX}
                    y={CY + 4}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    className="fill-primary-foreground"
                >
                    {truncate(tree.label, 16)}
                </text>
            </svg>
        </div>
    )
})
