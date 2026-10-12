import { describe, it, expect } from 'vitest'
import { ankiFileName, buildAnkiExport, toAnkiField } from './ankiExport'

describe('anki export', () => {
    it('escapes HTML, tabs and newlines', () => {
        expect(toAnkiField('a <b> & "c"\tx\r\ny')).toBe('a &lt;b&gt; &amp; &quot;c&quot;    x<br>y')
    })

    it('builds a tab-separated file with headers', () => {
        const out = buildAnkiExport('Bio\nL1', [{ front: 'Q1', back: 'A1' }, { front: '', back: '' }, { front: 'Q2', back: 'line1\nline2' }])
        expect(out).toBe('#separator:tab\n#html:true\n#deck:Bio L1\nQ1\tA1\nQ2\tline1<br>line2\n')
    })

    it('makes a safe file name', () => {
        expect(ankiFileName('Révision: chap 1/2')).toBe('Revision-chap-12-anki.txt')
        expect(ankiFileName('')).toBe('flashcards-anki.txt')
    })
})
