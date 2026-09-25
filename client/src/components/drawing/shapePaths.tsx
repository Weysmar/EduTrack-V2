import React from 'react'
import { ShapeType, ShapeCategory } from './types'

export interface ShapeDefinition {
    id: ShapeType
    name: string
    category: ShapeCategory
    section: number // Section row in Google Docs palette
    renderIcon: () => React.ReactNode
}

export const SHAPE_DEFINITIONS: ShapeDefinition[] = [
    // ==========================================
    // --- FORMES DE BASE ---
    // ==========================================

    // Section 1: Rectangles & Boxes
    {
        id: 'rect',
        name: 'Rectangle',
        category: 'basic',
        section: 1,
        renderIcon: () => (
            <rect x="3" y="5" width="18" height="14" rx="0" />
        )
    },
    {
        id: 'round-rect',
        name: 'Rectangle arrondi',
        category: 'basic',
        section: 1,
        renderIcon: () => (
            <rect x="3" y="5" width="18" height="14" rx="3.5" />
        )
    },
    {
        id: 'snip-rect' as unknown as ShapeType,
        name: 'Rectangle coin coupé',
        category: 'basic',
        section: 1,
        renderIcon: () => (
            <polygon points="3 8, 8 5, 21 5, 21 19, 3 19" />
        )
    },
    {
        id: 'frame' as unknown as ShapeType,
        name: 'Cadre',
        category: 'basic',
        section: 1,
        renderIcon: () => (
            <path d="M3 4h18v16H3V4zm3 3v10h12V7H6z" />
        )
    },
    {
        id: 'l-shape' as unknown as ShapeType,
        name: 'Forme en L',
        category: 'basic',
        section: 1,
        renderIcon: () => (
            <polygon points="4 4, 10 4, 10 14, 20 14, 20 20, 4 20" />
        )
    },

    // Section 2: Polygons & Circles
    {
        id: 'circle',
        name: 'Cercle / Ovale',
        category: 'basic',
        section: 2,
        renderIcon: () => (
            <ellipse cx="12" cy="12" rx="9" ry="9" />
        )
    },
    {
        id: 'triangle',
        name: 'Triangle isocèle',
        category: 'basic',
        section: 2,
        renderIcon: () => (
            <polygon points="12 4, 3 20, 21 20" />
        )
    },
    {
        id: 'right-triangle',
        name: 'Triangle rectangle',
        category: 'basic',
        section: 2,
        renderIcon: () => (
            <polygon points="4 4, 4 20, 20 20" />
        )
    },
    {
        id: 'parallelogram',
        name: 'Parallélogramme',
        category: 'basic',
        section: 2,
        renderIcon: () => (
            <polygon points="7 5, 21 5, 17 19, 3 19" />
        )
    },
    {
        id: 'trapezoid',
        name: 'Trapèze',
        category: 'basic',
        section: 2,
        renderIcon: () => (
            <polygon points="7 5, 17 5, 21 19, 3 19" />
        )
    },
    {
        id: 'diamond',
        name: 'Losange',
        category: 'basic',
        section: 2,
        renderIcon: () => (
            <polygon points="12 3, 21 12, 12 21, 3 12" />
        )
    },
    {
        id: 'pentagon',
        name: 'Pentagone',
        category: 'basic',
        section: 2,
        renderIcon: () => (
            <polygon points="12 3, 21 9.5, 17.5 20, 6.5 20, 3 9.5" />
        )
    },
    {
        id: 'hexagon',
        name: 'Hexagone',
        category: 'basic',
        section: 2,
        renderIcon: () => (
            <polygon points="6.5 3, 17.5 3, 22 12, 17.5 21, 6.5 21, 2 12" />
        )
    },
    {
        id: 'octagon',
        name: 'Octogone',
        category: 'basic',
        section: 2,
        renderIcon: () => (
            <polygon points="7.5 2, 16.5 2, 22 7.5, 22 16.5, 16.5 22, 7.5 22, 2 16.5, 2 7.5" />
        )
    },

    // Section 3: Curved, 3D & Symbols
    {
        id: 'cross',
        name: 'Croix',
        category: 'basic',
        section: 3,
        renderIcon: () => (
            <polygon points="9 3, 15 3, 15 9, 21 9, 21 15, 15 15, 15 21, 9 21, 9 15, 3 15, 3 9, 9 9" />
        )
    },
    {
        id: 'cylinder',
        name: 'Cylindre',
        category: 'basic',
        section: 3,
        renderIcon: () => (
            <g>
                <path d="M5 6c0-2.2 3.1-4 7-4s7 1.8 7 4v12c0 2.2-3.1 4-7 4s-7-1.8-7-4V6z" />
                <path d="M5 6c0 2.2 3.1 4 7 4s7-1.8 7-4" />
            </g>
        )
    },
    {
        id: 'cube',
        name: 'Cube 3D',
        category: 'basic',
        section: 3,
        renderIcon: () => (
            <g>
                <path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" />
                <path d="M12 12L3.5 7.2M12 12l8.5-4.8M12 12v9.5" />
            </g>
        )
    },
    {
        id: 'donut',
        name: 'Anneau',
        category: 'basic',
        section: 3,
        renderIcon: () => (
            <g>
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="4.5" />
            </g>
        )
    },
    {
        id: 'smiley',
        name: 'Émoticône souriant',
        category: 'basic',
        section: 3,
        renderIcon: () => (
            <g>
                <circle cx="12" cy="12" r="9" />
                <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="15" cy="10" r="1.2" fill="currentColor" stroke="none" />
                <path d="M8 14.5a4.5 4.5 0 0 0 8 0" strokeLinecap="round" />
            </g>
        )
    },
    {
        id: 'heart',
        name: 'Cœur',
        category: 'basic',
        section: 3,
        renderIcon: () => (
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        )
    },
    {
        id: 'lightning',
        name: 'Éclair',
        category: 'basic',
        section: 3,
        renderIcon: () => (
            <polygon points="13 2, 4 13, 11 13, 9 22, 20 10, 13 10" />
        )
    },
    {
        id: 'sun',
        name: 'Soleil',
        category: 'basic',
        section: 3,
        renderIcon: () => (
            <g>
                <circle cx="12" cy="12" r="4.5" />
                <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
            </g>
        )
    },
    {
        id: 'moon',
        name: 'Lune',
        category: 'basic',
        section: 3,
        renderIcon: () => (
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        )
    },
    {
        id: 'cloud',
        name: 'Nuage',
        category: 'basic',
        section: 3,
        renderIcon: () => (
            <path d="M19.4 10A7.5 7.5 0 0 0 12 4 9 9 0 0 0 5.4 8A6 6 0 0 0 0 14a6 6 0 0 0 6 6h13a5 5 0 0 0 5-5c0-2.6-2-4.8-4.6-5z" />
        )
    },

    // Section 4: Stars
    {
        id: 'star4',
        name: 'Étoile à 4 branches',
        category: 'basic',
        section: 4,
        renderIcon: () => (
            <polygon points="12 2, 14.5 9.5, 22 12, 14.5 14.5, 12 22, 9.5 14.5, 2 12, 9.5 9.5" />
        )
    },
    {
        id: 'star5',
        name: 'Étoile à 5 branches',
        category: 'basic',
        section: 4,
        renderIcon: () => (
            <polygon points="12 2, 15 8.5, 22 9.5, 17 14.5, 18.5 21.5, 12 18, 5.5 21.5, 7 14.5, 2 9.5, 9 8.5" />
        )
    },

    // ==========================================
    // --- FLÈCHES ---
    // ==========================================
    {
        id: 'arrow-right',
        name: 'Flèche droite',
        category: 'arrows',
        section: 1,
        renderIcon: () => (
            <polygon points="2 9, 13 9, 13 4, 22 12, 13 20, 13 15, 2 15" />
        )
    },
    {
        id: 'arrow-left',
        name: 'Flèche gauche',
        category: 'arrows',
        section: 1,
        renderIcon: () => (
            <polygon points="22 9, 11 9, 11 4, 2 12, 11 20, 11 15, 22 15" />
        )
    },
    {
        id: 'arrow-up',
        name: 'Flèche haut',
        category: 'arrows',
        section: 1,
        renderIcon: () => (
            <polygon points="9 22, 9 11, 4 11, 12 2, 20 11, 15 11, 15 22" />
        )
    },
    {
        id: 'arrow-down',
        name: 'Flèche bas',
        category: 'arrows',
        section: 1,
        renderIcon: () => (
            <polygon points="9 2, 9 13, 4 13, 12 22, 20 13, 15 13, 15 2" />
        )
    },
    {
        id: 'arrow-double-h',
        name: 'Double flèche horizontale',
        category: 'arrows',
        section: 1,
        renderIcon: () => (
            <polygon points="7 6, 1 12, 7 18, 7 14, 17 14, 17 18, 23 12, 17 6, 17 10, 7 10" />
        )
    },
    {
        id: 'arrow-double-v',
        name: 'Double flèche verticale',
        category: 'arrows',
        section: 1,
        renderIcon: () => (
            <polygon points="6 7, 12 1, 18 7, 14 7, 14 17, 18 17, 12 23, 6 17, 10 17, 10 7" />
        )
    },

    // ==========================================
    // --- LÉGENDES / BULLES ---
    // ==========================================
    {
        id: 'callout-rect',
        name: 'Bulle rectangulaire',
        category: 'callouts',
        section: 1,
        renderIcon: () => (
            <polygon points="2 3, 22 3, 22 16, 10 16, 5 21, 5 16, 2 16" />
        )
    },
    {
        id: 'callout-round',
        name: 'Bulle arrondie',
        category: 'callouts',
        section: 1,
        renderIcon: () => (
            <path d="M5 3h14a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-9l-5 4v-4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" />
        )
    },
    {
        id: 'callout-oval',
        name: 'Bulle ovale',
        category: 'callouts',
        section: 1,
        renderIcon: () => (
            <path d="M12 3C6.5 3 2 6.6 2 11c0 2.2 1.1 4.2 3 5.7L3 21l5.5-2.2c1.1.4 2.3.6 3.5.6 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
        )
    },
    {
        id: 'callout-cloud',
        name: 'Bulle de pensée',
        category: 'callouts',
        section: 1,
        renderIcon: () => (
            <g>
                <path d="M18 8a4 4 0 0 0-7.8-1.5A3.5 3.5 0 0 0 5 10a3 3 0 0 0 0 6h13a3.5 3.5 0 0 0 0-7z" />
                <circle cx="5" cy="18" r="1.2" />
                <circle cx="2" cy="20" r="0.8" />
            </g>
        )
    },

    // ==========================================
    // --- ÉQUATIONS ---
    // ==========================================
    {
        id: 'eq-plus',
        name: 'Signe Plus (+)',
        category: 'equations',
        section: 1,
        renderIcon: () => (
            <polygon points="10 3, 14 3, 14 9, 20 9, 20 13, 14 13, 14 19, 10 19, 10 13, 4 13, 4 9, 10 9" />
        )
    },
    {
        id: 'eq-minus',
        name: 'Signe Moins (-)',
        category: 'equations',
        section: 1,
        renderIcon: () => (
            <rect x="3" y="10" width="18" height="4" />
        )
    },
    {
        id: 'eq-multiply',
        name: 'Signe Multiplier (×)',
        category: 'equations',
        section: 1,
        renderIcon: () => (
            <polygon points="5 3, 12 10, 19 3, 21 5, 14 12, 21 19, 19 21, 12 14, 5 21, 3 19, 10 12, 3 5" />
        )
    },
    {
        id: 'eq-divide',
        name: 'Signe Diviser (÷)',
        category: 'equations',
        section: 1,
        renderIcon: () => (
            <g>
                <circle cx="12" cy="5" r="1.8" />
                <rect x="3" y="10.5" width="18" height="3" />
                <circle cx="12" cy="19" r="1.8" />
            </g>
        )
    },
    {
        id: 'eq-equal',
        name: 'Signe Égal (=)',
        category: 'equations',
        section: 1,
        renderIcon: () => (
            <g>
                <rect x="3" y="7" width="18" height="3" />
                <rect x="3" y="14" width="18" height="3" />
            </g>
        )
    },
]

/**
 * Generates an SVG path data string (`d`) for a given shape scaled to width and height.
 * Origin is at (0, 0).
 */
export function getShapePathData(shapeType: ShapeType, w: number, h: number): string {
    const minD = Math.min(w, h)

    switch (shapeType) {
        // --- Formes de base ---
        case 'rect':
            return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`

        case 'round-rect': {
            const r = Math.min(16, minD * 0.2)
            return `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`
        }

        case 'circle': {
            const rx = w / 2
            const ry = h / 2
            return `M ${w} ${ry} A ${rx} ${ry} 0 1 0 0 ${ry} A ${rx} ${ry} 0 1 0 ${w} ${ry} Z`
        }

        case 'triangle':
            return `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`

        case 'right-triangle':
            return `M 0 0 L 0 ${h} L ${w} ${h} Z`

        case 'diamond':
            return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`

        case 'parallelogram': {
            const offset = w * 0.2
            return `M ${offset} 0 L ${w} 0 L ${w - offset} ${h} L 0 ${h} Z`
        }

        case 'trapezoid': {
            const inset = w * 0.2
            return `M ${inset} 0 L ${w - inset} 0 L ${w} ${h} L 0 ${h} Z`
        }

        case 'pentagon': {
            const cx = w / 2, cy = h / 2
            const pts = []
            for (let i = 0; i < 5; i++) {
                const angle = (i * 72 - 90) * (Math.PI / 180)
                pts.push(`${cx + (w / 2) * Math.cos(angle)} ${cy + (h / 2) * Math.sin(angle)}`)
            }
            return `M ${pts.join(' L ')} Z`
        }

        case 'hexagon': {
            const cx = w / 2, cy = h / 2
            const pts = []
            for (let i = 0; i < 6; i++) {
                const angle = (i * 60) * (Math.PI / 180)
                pts.push(`${cx + (w / 2) * Math.cos(angle)} ${cy + (h / 2) * Math.sin(angle)}`)
            }
            return `M ${pts.join(' L ')} Z`
        }

        case 'octagon': {
            const cx = w / 2, cy = h / 2
            const pts = []
            for (let i = 0; i < 8; i++) {
                const angle = (i * 45 + 22.5) * (Math.PI / 180)
                pts.push(`${cx + (w / 2) * Math.cos(angle)} ${cy + (h / 2) * Math.sin(angle)}`)
            }
            return `M ${pts.join(' L ')} Z`
        }

        case 'star4': {
            const cx = w / 2, cy = h / 2
            const rOuterX = w / 2, rOuterY = h / 2
            const rInnerX = w * 0.2, rInnerY = h * 0.2
            const pts = []
            for (let i = 0; i < 8; i++) {
                const angle = (i * 45 - 90) * (Math.PI / 180)
                const rx = i % 2 === 0 ? rOuterX : rInnerX
                const ry = i % 2 === 0 ? rOuterY : rInnerY
                pts.push(`${cx + rx * Math.cos(angle)} ${cy + ry * Math.sin(angle)}`)
            }
            return `M ${pts.join(' L ')} Z`
        }

        case 'star5': {
            const cx = w / 2, cy = h / 2
            const rOuterX = w / 2, rOuterY = h / 2
            const rInnerX = w * 0.22, rInnerY = h * 0.22
            const pts = []
            for (let i = 0; i < 10; i++) {
                const angle = (i * 36 - 90) * (Math.PI / 180)
                const rx = i % 2 === 0 ? rOuterX : rInnerX
                const ry = i % 2 === 0 ? rOuterY : rInnerY
                pts.push(`${cx + rx * Math.cos(angle)} ${cy + ry * Math.sin(angle)}`)
            }
            return `M ${pts.join(' L ')} Z`
        }

        case 'heart': {
            return `M ${w * 0.5} ${h * 0.88} C ${w * 0.15} ${h * 0.62} 0 ${h * 0.44} 0 ${h * 0.27} C 0 ${h * 0.12} ${w * 0.12} 0 ${w * 0.28} 0 C ${w * 0.38} 0 ${w * 0.46} ${h * 0.08} ${w * 0.5} ${h * 0.18} C ${w * 0.54} ${h * 0.08} ${w * 0.62} 0 ${w * 0.72} 0 C ${w * 0.88} 0 ${w} ${h * 0.12} ${w} ${h * 0.27} C ${w} ${h * 0.44} ${w * 0.85} ${h * 0.62} ${w * 0.5} ${h * 0.88} Z`
        }

        case 'sun': {
            const cx = w / 2, cy = h / 2
            const r = minD * 0.25
            return `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} Z`
        }

        case 'cloud': {
            return `M ${w * 0.25} ${h * 0.75} C ${w * 0.1} ${h * 0.75} 0 ${h * 0.62} 0 ${h * 0.48} C 0 ${h * 0.34} ${w * 0.1} ${h * 0.22} ${w * 0.25} ${h * 0.22} C ${w * 0.28} ${h * 0.1} ${w * 0.39} 0 ${w * 0.52} 0 C ${w * 0.68} 0 ${w * 0.78} ${h * 0.1} ${w * 0.8} ${h * 0.24} C ${w * 0.92} ${h * 0.25} ${w} ${h * 0.36} ${w} ${h * 0.5} C ${w} ${h * 0.65} ${w * 0.89} ${h * 0.75} ${w * 0.75} ${h * 0.75} Z`
        }

        case 'moon': {
            return `M ${w * 0.8} 0 C ${w * 0.35} 0 0 ${h * 0.3} 0 ${h * 0.65} C 0 ${h * 0.85} ${w * 0.1} ${h} ${w * 0.25} ${h} C ${w * 0.7} ${h} ${w} ${h * 0.65} ${w} ${h * 0.25} C ${w * 0.9} ${h * 0.32} ${w * 0.8} ${h * 0.35} ${w * 0.7} ${h * 0.35} C ${w * 0.45} ${h * 0.35} ${w * 0.25} ${h * 0.18} ${w * 0.25} 0 C ${w * 0.45} 0 ${w * 0.65} 0 ${w * 0.8} 0 Z`
        }

        case 'cross': {
            const x1 = w * 0.35, x2 = w * 0.65
            const y1 = h * 0.35, y2 = h * 0.65
            return `M ${x1} 0 L ${x2} 0 L ${x2} ${y1} L ${w} ${y1} L ${w} ${y2} L ${x2} ${y2} L ${x2} ${h} L ${x1} ${h} L ${x1} ${y2} L 0 ${y2} L 0 ${y1} L ${x1} ${y1} Z`
        }

        case 'cylinder': {
            const ry = h * 0.15
            return `M 0 ${ry} A ${w / 2} ${ry} 0 0 1 ${w} ${ry} L ${w} ${h - ry} A ${w / 2} ${ry} 0 0 1 0 ${h - ry} Z M 0 ${ry} A ${w / 2} ${ry} 0 0 0 ${w} ${ry} A ${w / 2} ${ry} 0 0 0 0 ${ry} Z`
        }

        case 'cube': {
            const dx = w * 0.25
            const dy = h * 0.25
            return `M 0 ${dy} L ${w - dx} ${dy} L ${w - dx} ${h} L 0 ${h} Z M 0 ${dy} L ${dx} 0 L ${w} 0 L ${w - dx} ${dy} Z M ${w - dx} ${dy} L ${w} 0 L ${w} ${h - dy} L ${w - dx} ${h} Z`
        }

        case 'smiley': {
            const rx = w / 2, ry = h / 2
            return `M ${w} ${ry} A ${rx} ${ry} 0 1 0 0 ${ry} A ${rx} ${ry} 0 1 0 ${w} ${ry} Z`
        }

        case 'lightning': {
            return `M ${w * 0.55} 0 L ${w * 0.15} ${h * 0.55} L ${w * 0.48} ${h * 0.55} L ${w * 0.4} ${h} L ${w * 0.85} ${h * 0.42} L ${w * 0.52} ${h * 0.42} Z`
        }

        case 'donut': {
            const rx = w / 2, ry = h / 2
            const irx = w / 4, iry = h / 4
            return `M ${w} ${ry} A ${rx} ${ry} 0 1 0 0 ${ry} A ${rx} ${ry} 0 1 0 ${w} ${ry} Z M ${rx + irx} ${ry} A ${irx} ${iry} 0 1 1 ${rx - irx} ${ry} A ${irx} ${iry} 0 1 1 ${rx + irx} ${ry} Z`
        }

        // --- Flèches ---
        case 'arrow-right': {
            const hBar = h * 0.35
            const yBar = (h - hBar) / 2
            const wHead = w * 0.4
            return `M 0 ${yBar} L ${w - wHead} ${yBar} L ${w - wHead} 0 L ${w} ${h / 2} L ${w - wHead} ${h} L ${w - wHead} ${yBar + hBar} L 0 ${yBar + hBar} Z`
        }

        case 'arrow-left': {
            const hBar = h * 0.35
            const yBar = (h - hBar) / 2
            const wHead = w * 0.4
            return `M ${w} ${yBar} L ${wHead} ${yBar} L ${wHead} 0 L 0 ${h / 2} L ${wHead} ${h} L ${wHead} ${yBar + hBar} L ${w} ${yBar + hBar} Z`
        }

        case 'arrow-up': {
            const wBar = w * 0.35
            const xBar = (w - wBar) / 2
            const hHead = h * 0.4
            return `M ${xBar} ${h} L ${xBar} ${hHead} L 0 ${hHead} L ${w / 2} 0 L ${w} ${hHead} L ${xBar + wBar} ${hHead} L ${xBar + wBar} ${h} Z`
        }

        case 'arrow-down': {
            const wBar = w * 0.35
            const xBar = (w - wBar) / 2
            const hHead = h * 0.4
            return `M ${xBar} 0 L ${xBar} ${h - hHead} L 0 ${h - hHead} L ${w / 2} ${h} L ${w} ${h - hHead} L ${xBar + wBar} ${h - hHead} L ${xBar + wBar} 0 Z`
        }

        case 'arrow-double-h': {
            const hBar = h * 0.35
            const yBar = (h - hBar) / 2
            const wHead = w * 0.28
            return `M ${wHead} 0 L 0 ${h / 2} L ${wHead} ${h} L ${wHead} ${yBar + hBar} L ${w - wHead} ${yBar + hBar} L ${w - wHead} ${h} L ${w} ${h / 2} L ${w - wHead} 0 L ${w - wHead} ${yBar} L ${wHead} ${yBar} Z`
        }

        case 'arrow-double-v': {
            const wBar = w * 0.35
            const xBar = (w - wBar) / 2
            const hHead = h * 0.28
            return `M ${w / 2} 0 L 0 ${hHead} L ${xBar} ${hHead} L ${xBar} ${h - hHead} L 0 ${h - hHead} L ${w / 2} ${h} L ${w} ${h - hHead} L ${xBar + wBar} ${h - hHead} L ${xBar + wBar} ${hHead} L ${w} ${hHead} Z`
        }

        // --- Légendes / Bulles ---
        case 'callout-rect': {
            const tailH = Math.min(24, h * 0.25)
            const boxH = h - tailH
            return `M 0 0 L ${w} 0 L ${w} ${boxH} L ${w * 0.3} ${boxH} L ${w * 0.15} ${h} L ${w * 0.15} ${boxH} L 0 ${boxH} Z`
        }

        case 'callout-round': {
            const r = Math.min(16, minD * 0.15)
            const tailH = Math.min(24, h * 0.25)
            const boxH = h - tailH
            return `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${boxH - r} Q ${w} ${boxH} ${w - r} ${boxH} L ${w * 0.35} ${boxH} L ${w * 0.15} ${h} L ${w * 0.18} ${boxH} L ${r} ${boxH} Q 0 ${boxH} 0 ${boxH - r} L 0 ${r} Q 0 0 ${r} 0 Z`
        }

        case 'callout-oval': {
            const tailH = Math.min(24, h * 0.22)
            const boxH = h - tailH
            const rx = w / 2, ry = boxH / 2
            return `M ${w} ${ry} A ${rx} ${ry} 0 0 0 0 ${ry} A ${rx} ${ry} 0 0 0 ${w * 0.2} ${boxH * 0.9} L ${w * 0.05} ${h} L ${w * 0.35} ${boxH * 0.95} A ${rx} ${ry} 0 0 0 ${w} ${ry} Z`
        }

        case 'callout-cloud': {
            const tailH = Math.min(24, h * 0.22)
            const boxH = h - tailH
            return `M ${w * 0.25} ${boxH * 0.85} C ${w * 0.08} ${boxH * 0.85} 0 ${boxH * 0.68} 0 ${boxH * 0.5} C 0 ${boxH * 0.34} ${w * 0.1} ${boxH * 0.2} ${w * 0.25} ${boxH * 0.2} C ${w * 0.28} ${boxH * 0.08} ${w * 0.4} 0 ${w * 0.52} 0 C ${w * 0.68} 0 ${w * 0.78} ${boxH * 0.1} ${w * 0.8} ${boxH * 0.24} C ${w * 0.92} ${boxH * 0.25} ${w} ${boxH * 0.36} ${w} ${boxH * 0.5} C ${w} ${boxH * 0.65} ${w * 0.89} ${boxH * 0.85} ${w * 0.75} ${boxH * 0.85} Z`
        }

        // --- Équations ---
        case 'eq-plus': {
            const x1 = w * 0.36, x2 = w * 0.64
            const y1 = h * 0.36, y2 = h * 0.64
            return `M ${x1} 0 L ${x2} 0 L ${x2} ${y1} L ${w} ${y1} L ${w} ${y2} L ${x2} ${y2} L ${x2} ${h} L ${x1} ${h} L ${x1} ${y2} L 0 ${y2} L 0 ${y1} L ${x1} ${y1} Z`
        }

        case 'eq-minus': {
            const y1 = h * 0.36, y2 = h * 0.64
            return `M 0 ${y1} L ${w} ${y1} L ${w} ${y2} L 0 ${y2} Z`
        }

        case 'eq-multiply': {
            const cx = w / 2, cy = h / 2
            const d = minD * 0.18
            return `M ${cx - d} 0 L ${cx} ${cy - d} L ${cx + d} 0 L ${w} ${d} L ${cx + d} ${cy} L ${w} ${h - d} L ${cx + d} ${h} L ${cx} ${cy + d} L ${cx - d} ${h} L 0 ${h - d} L ${cx - d} ${cy} L 0 ${d} Z`
        }

        case 'eq-divide': {
            const r = minD * 0.12
            const y1 = h * 0.42, y2 = h * 0.58
            return `M 0 ${y1} L ${w} ${y1} L ${w} ${y2} L 0 ${y2} Z M ${w / 2 + r} ${h * 0.18} A ${r} ${r} 0 1 0 ${w / 2 - r} ${h * 0.18} A ${r} ${r} 0 1 0 ${w / 2 + r} ${h * 0.18} Z M ${w / 2 + r} ${h * 0.82} A ${r} ${r} 0 1 0 ${w / 2 - r} ${h * 0.82} A ${r} ${r} 0 1 0 ${w / 2 + r} ${h * 0.82} Z`
        }

        case 'eq-equal': {
            const hBar = h * 0.22
            return `M 0 ${h * 0.2} L ${w} ${h * 0.2} L ${w} ${h * 0.2 + hBar} L 0 ${h * 0.2 + hBar} Z M 0 ${h * 0.58} L ${w} ${h * 0.58} L ${w} ${h * 0.58 + hBar} L 0 ${h * 0.58 + hBar} Z`
        }

        default:
            return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`
    }
}
