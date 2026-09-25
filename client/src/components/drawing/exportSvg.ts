import { DrawingElement, DrawingData } from './types'
import { getShapePathData } from './shapePaths'

/**
 * Escapes special XML characters
 */
function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;'
            case '>': return '&gt;'
            case '&': return '&amp;'
            case '\'': return '&apos;'
            case '"': return '&quot;'
            default: return c
        }
    })
}

/**
 * Computes tight bounding box around all elements with padding.
 */
export function computeBoundingBox(elements: DrawingElement[], padding = 20, minW = 200, minH = 150) {
    if (elements.length === 0) {
        return { x: 0, y: 0, width: minW, height: minH }
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const el of elements) {
        if (el.type === 'line') {
            const x1 = el.x
            const y1 = el.y
            const x2 = el.x2 ?? el.x + el.width
            const y2 = el.y2 ?? el.y + el.height
            minX = Math.min(minX, x1, x2)
            minY = Math.min(minY, y1, y2)
            maxX = Math.max(maxX, x1, x2)
            maxY = Math.max(maxY, y1, y2)
        } else if (el.type === 'freehand' && el.points && el.points.length > 0) {
            for (const pt of el.points) {
                minX = Math.min(minX, el.x + pt.x)
                minY = Math.min(minY, el.y + pt.y)
                maxX = Math.max(maxX, el.x + pt.x)
                maxY = Math.max(maxY, el.y + pt.y)
            }
        } else {
            minX = Math.min(minX, el.x)
            minY = Math.min(minY, el.y)
            maxX = Math.max(maxX, el.x + Math.max(el.width, 10))
            maxY = Math.max(maxY, el.y + Math.max(el.height, 10))
        }
    }

    const x = Math.max(0, Math.floor(minX - padding))
    const y = Math.max(0, Math.floor(minY - padding))
    const width = Math.max(minW, Math.ceil(maxX - minX + padding * 2))
    const height = Math.max(minH, Math.ceil(maxY - minY + padding * 2))

    return { x, y, width, height }
}

/**
 * Generates standalone SVG code for the drawing elements.
 */
export function generateSvgCode(
    elements: DrawingElement[],
    options: {
        width?: number
        height?: number
        viewBox?: { x: number; y: number; width: number; height: number }
        embedJson?: boolean
    } = {}
): string {
    const bbox = options.viewBox || computeBoundingBox(elements, 24)
    const w = options.width || bbox.width
    const h = options.height || bbox.height

    const drawingData: DrawingData = {
        version: 1,
        width: bbox.width,
        height: bbox.height,
        elements
    }

    const dataAttr = options.embedJson !== false
        ? ` data-drawing="${escapeXml(JSON.stringify(drawingData))}"`
        : ''

    let svgInner = `
    <defs>
        <!-- Arrowhead markers -->
        <marker id="arrow-end" markerWidth="10" markerHeight="10" refX="8" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
        </marker>
        <marker id="arrow-start" markerWidth="10" markerHeight="10" refX="2" refY="3.5" orient="auto">
            <polygon points="10 0, 0 3.5, 10 7" fill="currentColor" />
        </marker>
    </defs>
`

    for (const el of elements) {
        const strokeDash = el.strokeStyle === 'dashed' ? '8 6' : el.strokeStyle === 'dotted' ? '3 3' : 'none'
        const opacity = el.opacity !== undefined ? ` opacity="${el.opacity}"` : ''
        const transform = `transform="translate(${el.x}, ${el.y}) rotate(${el.rotation || 0}, ${el.width / 2}, ${el.height / 2})"`

        if (el.type === 'shape' && el.shapeType) {
            const d = getShapePathData(el.shapeType, el.width, el.height)
            svgInner += `
    <g ${transform}${opacity}>
        <path
            d="${d}"
            fill="${el.fillColor === 'transparent' ? 'none' : el.fillColor}"
            stroke="${el.strokeColor}"
            stroke-width="${el.strokeWidth}"
            stroke-dasharray="${strokeDash}"
            stroke-linejoin="round"
            stroke-linecap="round"
        />`

            // Shape label text if present
            if (el.text && el.text.trim()) {
                const fontSize = el.fontSize || 16
                const fontFamily = el.fontFamily || 'Inter, sans-serif'
                const textColor = el.textColor || '#0f172a'
                const fontWeight = el.fontWeight || 'normal'
                const fontStyle = el.fontStyle || 'normal'
                const lines = el.text.split('\n')
                const lineHeight = fontSize * 1.25
                const totalH = lines.length * lineHeight
                const align = el.textAlign || 'center'
                const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle'
                const posX = align === 'left' ? 12 : align === 'right' ? el.width - 12 : el.width / 2

                svgInner += `
        <text
            x="${posX}"
            y="${startY}"
            text-anchor="${anchor}"
            font-size="${fontSize}"
            font-family="${escapeXml(fontFamily)}"
            font-weight="${fontWeight}"
            font-style="${fontStyle}"
            fill="${textColor}"
            dominant-baseline="auto"
        >`
                lines.forEach((line, idx) => {
                    svgInner += `
            <tspan x="${posX}" dy="${idx === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
                })
                svgInner += `
        </text>`
            }

            svgInner += `
    </g>`

        } else if (el.type === 'text') {
            const fontSize = el.fontSize || 16
            const fontFamily = el.fontFamily || 'Inter, sans-serif'
            const textColor = el.textColor || '#0f172a'
            const fontWeight = el.fontWeight || 'normal'
            const fontStyle = el.fontStyle || 'normal'
            const lines = (el.text || 'Texte').split('\n')
            const lineHeight = fontSize * 1.3

            svgInner += `
    <g ${transform}${opacity}>`
            if (el.fillColor && el.fillColor !== 'transparent' && el.fillColor !== 'none') {
                svgInner += `
        <rect width="${el.width}" height="${el.height}" fill="${el.fillColor}" stroke="${el.strokeColor || 'none'}" stroke-width="${el.strokeWidth || 0}" rx="4" />`
            }

            const align = el.textAlign || 'left'
            const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'
            const posX = align === 'center' ? el.width / 2 : align === 'right' ? el.width - 4 : 4

            svgInner += `
        <text
            x="${posX}"
            y="${fontSize * 1.05}"
            text-anchor="${anchor}"
            font-size="${fontSize}"
            font-family="${escapeXml(fontFamily)}"
            font-weight="${fontWeight}"
            font-style="${fontStyle}"
            fill="${textColor}"
        >`
            lines.forEach((line, idx) => {
                svgInner += `
            <tspan x="${posX}" dy="${idx === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
            })
            svgInner += `
        </text>
    </g>`

        } else if (el.type === 'line') {
            const x1 = el.x
            const y1 = el.y
            const x2 = el.x2 ?? el.x + el.width
            const y2 = el.y2 ?? el.y + el.height
            const markerEnd = el.arrowEnd ? ' marker-end="url(#arrow-end)"' : ''
            const markerStart = el.arrowStart ? ' marker-start="url(#arrow-start)"' : ''

            svgInner += `
    <g color="${el.strokeColor}"${opacity}>
        <line
            x1="${x1}"
            y1="${y1}"
            x2="${x2}"
            y2="${y2}"
            stroke="${el.strokeColor}"
            stroke-width="${el.strokeWidth}"
            stroke-dasharray="${strokeDash}"
            stroke-linecap="round"
            ${markerStart}${markerEnd}
        />
    </g>`

        } else if (el.type === 'freehand' && el.points && el.points.length > 0) {
            let pathD = `M ${el.points[0].x} ${el.points[0].y}`
            for (let i = 1; i < el.points.length; i++) {
                pathD += ` L ${el.points[i].x} ${el.points[i].y}`
            }

            svgInner += `
    <g ${transform}${opacity}>
        <path
            d="${pathD}"
            fill="none"
            stroke="${el.strokeColor}"
            stroke-width="${el.strokeWidth}"
            stroke-dasharray="${strokeDash}"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
    </g>`

        } else if (el.type === 'image' && el.imageSrc) {
            svgInner += `
    <g ${transform}${opacity}>
        <image
            href="${escapeXml(el.imageSrc)}"
            width="${el.width}"
            height="${el.height}"
            preserveAspectRatio="none"
        />
    </g>`
        }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}" width="${w}" height="${h}"${dataAttr}>
${svgInner}
</svg>`
}

/**
 * Converts SVG code into an SVG Data URL suitable for img src
 */
export function svgToDataUrl(svgString: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`
}

/**
 * Renders SVG string to high-res PNG Data URL using an HTML5 Canvas.
 */
export async function renderSvgToPng(svgString: string, scale = 2): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'

        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = (img.naturalWidth || 800) * scale
            canvas.height = (img.naturalHeight || 600) * scale
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('Canvas 2D context not supported'))
                return
            }
            ctx.scale(scale, scale)
            ctx.drawImage(img, 0, 0)
            resolve(canvas.toDataURL('image/png'))
        }

        img.onerror = (e) => reject(e)
        img.src = svgToDataUrl(svgString)
    })
}
