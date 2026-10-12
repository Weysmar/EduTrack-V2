import { extractText } from '@/lib/extractText'
import { extractTextFromHtml } from '@/lib/htmlToText'

/**
 * Single source of truth for the text sent to AI generation (summaries, flashcards, quizzes,
 * revision sheets...) for an item, shared by ItemView, CourseView and FolderView.
 */

const PAGE_MARKER = /---\s*Page\s+\d+[^-]*---/gi // also "--- Page 2 (OCR) ---"

// Single-entry memo: pages call this on every render (e.g. while a note is being typed)
let lastHtml: string | null = null
let lastText = ''
const htmlToTextMemo = (html: string): string => {
    if (html !== lastHtml) {
        lastHtml = html
        lastText = extractTextFromHtml(html)
    }
    return lastText
}
const MIN_MEANINGFUL_CHARS = 20

/**
 * True when the text holds actual content: PDF extraction adds "--- Page N ---" markers, so a
 * scanned PDF with no text layer used to produce a non-empty string that was cached and sent to the AI.
 */
export function hasMeaningfulText(text?: string | null): boolean {
    if (!text) return false
    return text.replace(PAGE_MARKER, '').replace(/\s+/g, '').length >= MIN_MEANINGFUL_CHARS
}

/**
 * Text to feed the AI for an item.
 * - Notes are stored as editor HTML (with pasted images inlined as base64): always convert them,
 *   never send the raw HTML, and ignore any stale extractedContent. `liveNoteHtml` lets the caller
 *   pass the draft being edited.
 * - Files use their cached extractedContent when it holds real text, else the (HTML) description.
 */
export function getItemSourceText(item: any, liveNoteHtml?: string): string {
    if (!item) return ''
    if (item.type === 'note') return htmlToTextMemo(liveNoteHtml ?? item.content ?? '')
    if (hasMeaningfulText(item.extractedContent)) return String(item.extractedContent).trim()
    return extractTextFromHtml(item.content || '')
}

/** Item types whose text lives in an uploaded file that may still need extraction */
export function needsFileExtraction(item: any): boolean {
    return !!item && item.type === 'resource' && !hasMeaningfulText(item.extractedContent)
}

const guessFileName = (item: any): string => {
    if (item.fileName) return item.fileName
    if (item.storageKey) {
        // Keys are "<uuid or timestamp>-<original name>"
        const fromKey = String(item.storageKey).split('-').slice(1).join('-')
        if (fromKey) return fromKey
    }
    const type = item.fileType || ''
    if (type.includes('presentation') || type.includes('powerpoint')) return 'presentation.pptx'
    if (type.includes('word') || type.includes('officedocument')) return 'document.docx'
    if (type.includes('pdf')) return 'document.pdf'
    return 'file.bin'
}

/**
 * Downloads an item's file and extracts its text. Throws on HTTP errors: the error body (e.g. a 401
 * JSON from an expired session) must never be extracted and cached as the document's text.
 */
export async function extractItemFileText(item: any, fileUrl: string): Promise<string> {
    const res = await fetch(fileUrl)
    if (!res.ok) throw new Error(`Téléchargement du fichier impossible (${res.status})`)
    const blob = await res.blob()
    const file = new File([blob], guessFileName(item), { type: blob.type || item.fileType || 'application/octet-stream' })
    const { text } = await extractText(file)
    return (text || '').trim()
}
