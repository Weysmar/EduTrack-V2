import { describe, it, expect } from 'vitest'
import { getItemSourceText, hasMeaningfulText, needsFileExtraction } from './itemSourceText'

const BASE64_IMG = `<img src="data:image/png;base64,${'A'.repeat(5000)}">`

describe('hasMeaningfulText', () => {
    it('ignores the page markers of a scanned PDF', () => {
        expect(hasMeaningfulText('--- Page 1 ---\n\n--- Page 2 ---\n ')).toBe(false)
        expect(hasMeaningfulText('--- Page 1 (OCR) ---\n\n--- Page 2 (OCR) ---')).toBe(false)
    })

    it('accepts real text', () => {
        expect(hasMeaningfulText('--- Page 1 ---\nLe théorème de Pythagore s’applique aux triangles rectangles.')).toBe(true)
    })

    it('rejects empty values', () => {
        expect(hasMeaningfulText('')).toBe(false)
        expect(hasMeaningfulText(null)).toBe(false)
    })
})

describe('getItemSourceText', () => {
    it('converts note HTML to text and drops base64 images', () => {
        const note = { type: 'note', content: `${BASE64_IMG}<h1>Titre</h1><p>Premier <strong>paragraphe</strong></p>` }
        const text = getItemSourceText(note)
        expect(text).toBe('Titre\nPremier paragraphe')
        expect(text).not.toContain('base64')
    })

    it('prefers the live draft for a note being edited and ignores stale extractedContent', () => {
        const note = { type: 'note', content: '<p>ancienne version</p>', extractedContent: 'texte obsolète du duplicata' }
        expect(getItemSourceText(note, '<p>nouvelle version</p>')).toBe('nouvelle version')
    })

    it('uses the extracted text of a file when it is meaningful', () => {
        const pdf = { type: 'resource', extractedContent: 'Contenu réel extrait du document PDF.', content: '<p>description</p>' }
        expect(getItemSourceText(pdf)).toBe('Contenu réel extrait du document PDF.')
        expect(needsFileExtraction(pdf)).toBe(false)
    })

    it('flags a file whose cached text is only page markers for re-extraction', () => {
        const scanned = { type: 'resource', extractedContent: '--- Page 1 ---', content: '' }
        expect(needsFileExtraction(scanned)).toBe(true)
        expect(getItemSourceText(scanned)).toBe('')
    })
})
