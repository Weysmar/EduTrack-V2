import { ShapeType, ShapeCategory } from './types'

export interface ShapeDefinition {
    id: ShapeType
    name: string
    category: ShapeCategory
    iconPath: string // Mini preview path for 24x24 icons
}

export const SHAPE_DEFINITIONS: ShapeDefinition[] = [
    // --- FORMES DE BASE ---
    { id: 'rect', name: 'Rectangle', category: 'basic', iconPath: 'M3 5h18v14H3z' },
    { id: 'round-rect', name: 'Rectangle arrondi', category: 'basic', iconPath: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z' },
    { id: 'circle', name: 'Cercle / Ovale', category: 'basic', iconPath: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z' },
    { id: 'triangle', name: 'Triangle isocèle', category: 'basic', iconPath: 'M12 3L2 21h20L12 3z' },
    { id: 'right-triangle', name: 'Triangle rectangle', category: 'basic', iconPath: 'M4 4v16h16L4 4z' },
    { id: 'diamond', name: 'Losange', category: 'basic', iconPath: 'M12 2l10 10-10 10L2 12 12 2z' },
    { id: 'parallelogram', name: 'Parallélogramme', category: 'basic', iconPath: 'M7 4h14l-4 16H3l4-16z' },
    { id: 'trapezoid', name: 'Trapèze', category: 'basic', iconPath: 'M6 4h12l4 16H2L6 4z' },
    { id: 'pentagon', name: 'Pentagone', category: 'basic', iconPath: 'M12 2l10 7.5-3.8 12.5H5.8L2 9.5 12 2z' },
    { id: 'hexagon', name: 'Hexagone', category: 'basic', iconPath: 'M6.5 3h11l5.5 9-5.5 9h-11L1 12l5.5-9z' },
    { id: 'octagon', name: 'Octogone', category: 'basic', iconPath: 'M7.5 2h9L22 7.5v9L16.5 22h-9L2 16.5v-9L7.5 2z' },
    { id: 'star4', name: 'Étoile à 4 branches', category: 'basic', iconPath: 'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z' },
    { id: 'star5', name: 'Étoile à 5 branches', category: 'basic', iconPath: 'M12 2l2.9 6.6 7.1.6-5.3 4.7 1.6 7.1L12 17.3l-6.3 3.7 1.6-7.1L2 9.2l7.1-.6L12 2z' },
    { id: 'heart', name: 'Cœur', category: 'basic', iconPath: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
    { id: 'sun', name: 'Soleil', category: 'basic', iconPath: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5v3m0 14v3m10-10h-3M5 12H2m15.07-7.07l-2.12 2.12M8.05 16.95l-2.12 2.12m13.14 0l-2.12-2.12M8.05 7.05L5.93 4.93' },
    { id: 'cloud', name: 'Nuage', category: 'basic', iconPath: 'M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z' },
    { id: 'moon', name: 'Lune', category: 'basic', iconPath: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' },
    { id: 'cross', name: 'Croix', category: 'basic', iconPath: 'M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z' },
    { id: 'cylinder', name: 'Cylindre', category: 'basic', iconPath: 'M5 6c0-2.2 3.1-4 7-4s7 1.8 7 4v12c0 2.2-3.1 4-7 4s-7-1.8-7-4V6z' },
    { id: 'cube', name: 'Cube 3D', category: 'basic', iconPath: 'M12 2l9 5v10l-9 5-9-5V7l9-5zm0 10L3.5 7.2M12 12l8.5-4.8M12 12v9.5' },
    { id: 'smiley', name: 'Émoticône souriant', category: 'basic', iconPath: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-3 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-6.7 6.5a6.5 6.5 0 0 0 7.4 0' },

    // --- FLÈCHES ---
    { id: 'arrow-right', name: 'Flèche droite', category: 'arrows', iconPath: 'M2 9h11V4l9 8-9 8v-5H2V9z' },
    { id: 'arrow-left', name: 'Flèche gauche', category: 'arrows', iconPath: 'M22 9H11V4L2 12l9 8v-5h11V9z' },
    { id: 'arrow-up', name: 'Flèche haut', category: 'arrows', iconPath: 'M9 22V11H4L12 2l8 9h-5v11H9z' },
    { id: 'arrow-down', name: 'Flèche bas', category: 'arrows', iconPath: 'M9 2v11H4l8 9 8-9h-5V2H9z' },
    { id: 'arrow-double-h', name: 'Double flèche horizontale', category: 'arrows', iconPath: 'M7 6L1 12l6 6v-4h10v4l6-6-6-6v4H7V6z' },
    { id: 'arrow-double-v', name: 'Double flèche verticale', category: 'arrows', iconPath: 'M6 7L12 1l6 6h-4v10h4l-6 6-6-6h4V7H6z' },

    // --- LÉGENDES / BULLES ---
    { id: 'callout-rect', name: 'Bulle rectangulaire', category: 'callouts', iconPath: 'M2 3h20v14H9l-5 5v-5H2V3z' },
    { id: 'callout-round', name: 'Bulle arrondie', category: 'callouts', iconPath: 'M5 3h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-5 4v-4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z' },
    { id: 'callout-oval', name: 'Bulle ovale', category: 'callouts', iconPath: 'M12 3C6.5 3 2 6.6 2 11c0 2.2 1.1 4.2 3 5.7L3 21l5.5-2.2c1.1.4 2.3.6 3.5.6 5.5 0 10-3.6 10-8s-4.5-8-10-8z' },
    { id: 'callout-cloud', name: 'Bulle de pensée', category: 'callouts', iconPath: 'M18 9a4.5 4.5 0 0 0-8.5-1.7A4 4 0 0 0 5 11.5 3.5 3.5 0 0 0 5 18h13a4 4 0 0 0 0-8zm-12 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-2 3a.7.7 0 1 1 0 1.4.7.7 0 0 1 0-1.4z' },

    // --- ÉQUATIONS ---
    { id: 'eq-plus', name: 'Signe Plus (+)', category: 'equations', iconPath: 'M10 3h4v6h6v4h-6v6h-4v-6H4V9h6V3z' },
    { id: 'eq-minus', name: 'Signe Moins (-)', category: 'equations', iconPath: 'M3 10h18v4H3v-4z' },
    { id: 'eq-multiply', name: 'Signe Multiplier (×)', category: 'equations', iconPath: 'M5 3l7 7 7-7 2 2-7 7 7 7-2 2-7-7-7 7-2-2 7-7-7-7 2-2z' },
    { id: 'eq-divide', name: 'Signe Diviser (÷)', category: 'equations', iconPath: 'M12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-9 7h18v2H3v-2zm9 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z' },
    { id: 'eq-equal', name: 'Signe Égal (=)', category: 'equations', iconPath: 'M3 7h18v3H3V7zm0 7h18v3H3v-3z' },
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
            return `M 0 ${ry} A ${rx} ${ry} 0 1 0 ${w} ${ry} A ${rx} ${ry} 0 1 0 0 ${ry} Z`
        }

        case 'triangle':
            return `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`

        case 'right-triangle':
            return `M 0 0 L 0 ${h} L ${w} ${h} Z`

        case 'diamond':
            return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`

        case 'parallelogram': {
            const skew = w * 0.22
            return `M ${skew} 0 L ${w} 0 L ${w - skew} ${h} L 0 ${h} Z`
        }

        case 'trapezoid': {
            const inset = w * 0.2
            return `M ${inset} 0 L ${w - inset} 0 L ${w} ${h} L 0 ${h} Z`
        }

        case 'pentagon': {
            const cx = w / 2, cy = h / 2
            const pts: [number, number][] = []
            for (let i = 0; i < 5; i++) {
                const angle = (i * 72 - 90) * (Math.PI / 180)
                pts.push([cx + (w / 2) * Math.cos(angle), cy + (h / 2) * Math.sin(angle)])
            }
            return `M ${pts[0][0]} ${pts[0][1]} ` + pts.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') + ' Z'
        }

        case 'hexagon': {
            const insetX = w * 0.25
            return `M ${insetX} 0 L ${w - insetX} 0 L ${w} ${h / 2} L ${w - insetX} ${h} L ${insetX} ${h} L 0 ${h / 2} Z`
        }

        case 'octagon': {
            const cutX = w * 0.29
            const cutY = h * 0.29
            return `M ${cutX} 0 L ${w - cutX} 0 L ${w} ${cutY} L ${w} ${h - cutY} L ${w - cutX} ${h} L ${cutX} ${h} L 0 ${h - cutY} L 0 ${cutY} Z`
        }

        case 'star4': {
            const cx = w / 2, cy = h / 2
            const rInX = w * 0.16, rInY = h * 0.16
            return `M ${cx} 0 L ${cx + rInX} ${cy - rInY} L ${w} ${cy} L ${cx + rInX} ${cy + rInY} L ${cx} ${h} L ${cx - rInX} ${cy + rInY} L 0 ${cy} L ${cx - rInX} ${cy - rInY} Z`
        }

        case 'star5': {
            const cx = w / 2, cy = h / 2
            const pts: string[] = []
            for (let i = 0; i < 10; i++) {
                const angle = (i * 36 - 90) * (Math.PI / 180)
                const rx = i % 2 === 0 ? w / 2 : w * 0.22
                const ry = i % 2 === 0 ? h / 2 : h * 0.22
                pts.push(`${cx + rx * Math.cos(angle)} ${cy + ry * Math.sin(angle)}`)
            }
            return `M ${pts[0]} ` + pts.slice(1).map(p => `L ${p}`).join(' ') + ' Z'
        }

        case 'heart': {
            const topY = h * 0.3
            return `M ${w / 2} ${h} ` +
                `C ${w * 0.1} ${h * 0.65} 0 ${h * 0.45} 0 ${topY} ` +
                `C 0 ${h * 0.1} ${w * 0.25} 0 ${w / 2} ${topY} ` +
                `C ${w * 0.75} 0 ${w} ${h * 0.1} ${w} ${topY} ` +
                `C ${w} ${h * 0.45} ${w * 0.9} ${h * 0.65} ${w / 2} ${h} Z`
        }

        case 'sun': {
            const cx = w / 2, cy = h / 2
            const rOutX = w / 2, rOutY = h / 2
            const rInX = w * 0.35, rInY = h * 0.35
            const pts: string[] = []
            const rays = 16
            for (let i = 0; i < rays; i++) {
                const angle = (i * (360 / rays)) * (Math.PI / 180)
                const rx = i % 2 === 0 ? rOutX : rInX
                const ry = i % 2 === 0 ? rOutY : rInY
                pts.push(`${cx + rx * Math.cos(angle)} ${cy + ry * Math.sin(angle)}`)
            }
            return `M ${pts[0]} ` + pts.slice(1).map(p => `L ${p}`).join(' ') + ' Z'
        }

        case 'cloud': {
            return `M ${w * 0.25} ${h * 0.75} ` +
                `C ${w * 0.05} ${h * 0.75} 0 ${h * 0.55} 0 ${h * 0.45} ` +
                `C 0 ${h * 0.3} ${w * 0.15} ${h * 0.2} ${w * 0.3} ${h * 0.25} ` +
                `C ${w * 0.35} ${h * 0.05} ${w * 0.65} ${h * 0.05} ${w * 0.7} ${h * 0.25} ` +
                `C ${w * 0.85} ${h * 0.2} ${w} ${h * 0.35} ${w} ${h * 0.5} ` +
                `C ${w} ${h * 0.7} ${w * 0.85} ${h * 0.75} ${w * 0.75} ${h * 0.75} ` +
                `Z`
        }

        case 'moon': {
            return `M ${w * 0.8} 0 ` +
                `A ${w * 0.5} ${h * 0.5} 0 1 0 ${w * 0.8} ${h} ` +
                `A ${w * 0.4} ${h * 0.48} 0 0 1 ${w * 0.8} 0 Z`
        }

        case 'cross': {
            const armX = w * 0.33, armY = h * 0.33
            return `M ${armX} 0 L ${w - armX} 0 L ${w - armX} ${armY} L ${w} ${armY} L ${w} ${h - armY} L ${w - armX} ${h - armY} L ${w - armX} ${h} L ${armX} ${h} L ${armX} ${h - armY} L 0 ${h - armY} L 0 ${armY} L ${armX} ${armY} Z`
        }

        case 'cylinder': {
            const ry = h * 0.15
            return `M 0 ${ry} A ${w / 2} ${ry} 0 0 1 ${w} ${ry} L ${w} ${h - ry} A ${w / 2} ${ry} 0 0 1 0 ${h - ry} Z ` +
                `M 0 ${ry} A ${w / 2} ${ry} 0 0 0 ${w} ${ry}`
        }

        case 'cube': {
            const dx = w * 0.5, dy = h * 0.28
            return `M ${dx} 0 L ${w} ${dy} L ${w} ${h - dy} L ${dx} ${h} L 0 ${h - dy} L 0 ${dy} Z ` +
                `M 0 ${dy} L ${dx} ${dy * 2} L ${w} ${dy} ` +
                `M ${dx} ${dy * 2} L ${dx} ${h}`
        }

        case 'smiley': {
            const rx = w / 2, ry = h / 2
            const eyeW = minD * 0.08
            const eyeH = minD * 0.12
            return `M 0 ${ry} A ${rx} ${ry} 0 1 0 ${w} ${ry} A ${rx} ${ry} 0 1 0 0 ${ry} Z ` +
                `M ${w * 0.35 - eyeW} ${h * 0.35} a ${eyeW} ${eyeH} 0 1 0 ${eyeW * 2} 0 a ${eyeW} ${eyeH} 0 1 0 -${eyeW * 2} 0 ` +
                `M ${w * 0.65 - eyeW} ${h * 0.35} a ${eyeW} ${eyeH} 0 1 0 ${eyeW * 2} 0 a ${eyeW} ${eyeH} 0 1 0 -${eyeW * 2} 0 ` +
                `M ${w * 0.25} ${h * 0.62} Q ${w * 0.5} ${h * 0.88} ${w * 0.75} ${h * 0.62}`
        }

        // --- Flèches ---
        case 'arrow-right': {
            const headX = w * 0.6
            const stemY1 = h * 0.25, stemY2 = h * 0.75
            return `M 0 ${stemY1} L ${headX} ${stemY1} L ${headX} 0 L ${w} ${h / 2} L ${headX} ${h} L ${headX} ${stemY2} L 0 ${stemY2} Z`
        }

        case 'arrow-left': {
            const headX = w * 0.4
            const stemY1 = h * 0.25, stemY2 = h * 0.75
            return `M ${w} ${stemY1} L ${headX} ${stemY1} L ${headX} 0 L 0 ${h / 2} L ${headX} ${h} L ${headX} ${stemY2} L ${w} ${stemY2} Z`
        }

        case 'arrow-up': {
            const headY = h * 0.4
            const stemX1 = w * 0.25, stemX2 = w * 0.75
            return `M ${stemX1} ${h} L ${stemX1} ${headY} L 0 ${headY} L ${w / 2} 0 L ${w} ${headY} L ${stemX2} ${headY} L ${stemX2} ${h} Z`
        }

        case 'arrow-down': {
            const headY = h * 0.6
            const stemX1 = w * 0.25, stemX2 = w * 0.75
            return `M ${stemX1} 0 L ${stemX2} 0 L ${stemX2} ${headY} L ${w} ${headY} L ${w / 2} ${h} L 0 ${headY} L ${stemX1} ${headY} Z`
        }

        case 'arrow-double-h': {
            const headW = w * 0.28
            const stemY1 = h * 0.25, stemY2 = h * 0.75
            return `M ${headW} ${stemY1} L ${w - headW} ${stemY1} L ${w - headW} 0 L ${w} ${h / 2} L ${w - headW} ${h} L ${w - headW} ${stemY2} L ${headW} ${stemY2} L ${headW} ${h} L 0 ${h / 2} L ${headW} 0 Z`
        }

        case 'arrow-double-v': {
            const headH = h * 0.28
            const stemX1 = w * 0.25, stemX2 = w * 0.75
            return `M ${stemX1} ${headH} L ${stemX1} ${h - headH} L 0 ${h - headH} L ${w / 2} ${h} L ${w} ${h - headH} L ${stemX2} ${h - headH} L ${stemX2} ${headH} L ${w} ${headH} L ${w / 2} 0 L 0 ${headH} Z`
        }

        // --- Légendes / Bulles ---
        case 'callout-rect': {
            const bodyH = h * 0.78
            const tailX1 = w * 0.2, tailX2 = w * 0.4
            return `M 0 0 L ${w} 0 L ${w} ${bodyH} L ${tailX2} ${bodyH} L ${w * 0.1} ${h} L ${tailX1} ${bodyH} L 0 ${bodyH} Z`
        }

        case 'callout-round': {
            const r = Math.min(14, minD * 0.18)
            const bodyH = h * 0.78
            const tailX1 = w * 0.2, tailX2 = w * 0.4
            return `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${bodyH - r} Q ${w} ${bodyH} ${w - r} ${bodyH} ` +
                `L ${tailX2} ${bodyH} L ${w * 0.1} ${h} L ${tailX1} ${bodyH} L ${r} ${bodyH} Q 0 ${bodyH} 0 ${bodyH - r} L 0 ${r} Q 0 0 ${r} 0 Z`
        }

        case 'callout-oval': {
            const bodyH = h * 0.78
            const rx = w / 2, ry = bodyH / 2
            return `M 0 ${ry} A ${rx} ${ry} 0 0 1 ${w} ${ry} A ${rx} ${ry} 0 0 1 ${w * 0.45} ${bodyH} L ${w * 0.1} ${h} L ${w * 0.25} ${bodyH * 0.95} A ${rx} ${ry} 0 0 1 0 ${ry} Z`
        }

        case 'callout-cloud': {
            const bodyH = h * 0.78
            return `M ${w * 0.25} ${bodyH * 0.95} ` +
                `C ${w * 0.05} ${bodyH * 0.95} 0 ${bodyH * 0.65} 0 ${bodyH * 0.5} ` +
                `C 0 ${bodyH * 0.3} ${w * 0.15} ${bodyH * 0.15} ${w * 0.35} ${bodyH * 0.2} ` +
                `C ${w * 0.4} 0 ${w * 0.7} 0 ${w * 0.75} ${bodyH * 0.2} ` +
                `C ${w * 0.9} ${bodyH * 0.15} ${w} ${bodyH * 0.35} ${w} ${bodyH * 0.55} ` +
                `C ${w} ${bodyH * 0.85} ${w * 0.85} ${bodyH * 0.95} ${w * 0.7} ${bodyH * 0.95} ` +
                `Z ` +
                `M ${w * 0.18} ${h * 0.88} a ${w * 0.05} ${h * 0.04} 0 1 0 0.1 0 Z ` +
                `M ${w * 0.1} ${h * 0.96} a ${w * 0.03} ${h * 0.025} 0 1 0 0.1 0 Z`
        }

        // --- Équations ---
        case 'eq-plus': {
            const arm = minD * 0.28
            const cx = w / 2, cy = h / 2
            return `M ${cx - arm / 2} 0 L ${cx + arm / 2} 0 L ${cx + arm / 2} ${cy - arm / 2} L ${w} ${cy - arm / 2} L ${w} ${cy + arm / 2} L ${cx + arm / 2} ${cy + arm / 2} L ${cx + arm / 2} ${h} L ${cx - arm / 2} ${h} L ${cx - arm / 2} ${cy + arm / 2} L 0 ${cy + arm / 2} L 0 ${cy - arm / 2} L ${cx - arm / 2} ${cy - arm / 2} Z`
        }

        case 'eq-minus': {
            const barH = h * 0.28
            const cy = (h - barH) / 2
            return `M 0 ${cy} L ${w} ${cy} L ${w} ${cy + barH} L 0 ${cy + barH} Z`
        }

        case 'eq-multiply': {
            const cx = w / 2, cy = h / 2
            const d = minD * 0.18
            return `M ${d} 0 L ${cx} ${cy - d} L ${w - d} 0 L ${w} ${d} L ${cx + d} ${cy} L ${w} ${h - d} L ${w - d} ${h} L ${cx} ${cy + d} L ${d} ${h} L 0 ${h - d} L ${cx - d} ${cy} L 0 ${d} Z`
        }

        case 'eq-divide': {
            const r = minD * 0.09
            const barH = h * 0.18
            const cy = (h - barH) / 2
            return `M 0 ${cy} L ${w} ${cy} L ${w} ${cy + barH} L 0 ${cy + barH} Z ` +
                `M ${w / 2} ${h * 0.2 - r} a ${r} ${r} 0 1 0 0.01 0 Z ` +
                `M ${w / 2} ${h * 0.8 - r} a ${r} ${r} 0 1 0 0.01 0 Z`
        }

        case 'eq-equal': {
            const barH = h * 0.22
            return `M 0 ${h * 0.2} L ${w} ${h * 0.2} L ${w} ${h * 0.2 + barH} L 0 ${h * 0.2 + barH} Z ` +
                `M 0 ${h * 0.58} L ${w} ${h * 0.58} L ${w} ${h * 0.58 + barH} L 0 ${h * 0.58 + barH} Z`
        }

        default:
            return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`
    }
}
