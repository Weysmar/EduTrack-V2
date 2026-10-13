import { describe, it, expect } from 'vitest'
import { parseMindmap, normalizeMindmapSource, countDescendants, nodeLabel } from './mindmapSource'

const SAMPLE = `mindmap
  root((Électricité))
    Lois
      Loi d'Ohm
      Kirchhoff
    Composants
      Résistance
      Condensateur
    Mesures`

describe('parseMindmap', () => {
    it('builds the tree from indentation', () => {
        const tree = parseMindmap(SAMPLE)!
        expect(tree.label).toBe('Électricité')
        expect(tree.children.map(c => c.label)).toEqual(['Lois', 'Composants', 'Mesures'])
        expect(tree.children[0].children.map(c => c.label)).toEqual(["Loi d'Ohm", 'Kirchhoff'])
        expect(countDescendants(tree)).toBe(7)
    })

    it('strips shapes, icons and quotes from labels', () => {
        expect(nodeLabel('root((Sujet))')).toBe('Sujet')
        expect(nodeLabel('id[Carré]')).toBe('Carré')
        expect(nodeLabel('(Arrondi)')).toBe('Arrondi')
        expect(nodeLabel('"Entre guillemets"')).toBe('Entre guillemets')
        const tree = parseMindmap('mindmap\n  root((A))\n    ::icon(fa fa-book)\n    B')!
        expect(tree.children.map(c => c.label)).toEqual(['B'])
    })

    it('returns null for empty content', () => {
        expect(parseMindmap('')).toBeNull()
        expect(parseMindmap('mindmap')).toBeNull()
    })
})

describe('normalizeMindmapSource', () => {
    it('removes shape characters from non-root labels so Mermaid can render them', () => {
        const fixed = normalizeMindmapSource('mindmap\n  root((Physique))\n    Loi d\'Ohm (U = RI)\n    Énergie [J]')
        expect(fixed).toBe("mindmap\n  root((Physique))\n    Loi d'Ohm U = RI\n    Énergie J")
    })

    it('drops markdown fences and text before the mindmap keyword', () => {
        const fixed = normalizeMindmapSource('Voici la carte :\n```mermaid\nmindmap\n  root((A))\n    B\n```')
        expect(fixed).toBe('mindmap\n  root((A))\n    B')
    })

    it('wraps a plain first node as the root', () => {
        expect(normalizeMindmapSource('mindmap\n  Sujet\n    Idée')).toBe('mindmap\n  root((Sujet))\n    Idée')
    })
})
