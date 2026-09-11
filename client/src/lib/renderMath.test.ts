import { describe, it, expect } from 'vitest';
import { renderMathInText, renderMathInHtml, renderKatex } from './renderMath';

describe('renderMath', () => {
    it('renders block math with French accents correctly', () => {
        const input = '$$ \\text{PUE} = \\frac{\\text{Énergie Totale du Datacenter}}{\\text{Énergie Consommée par les Équipements IT}} $$';
        const result = renderKatex('\\text{PUE} = \\frac{\\text{Énergie Totale du Datacenter}}{\\text{Énergie Consommée par les Équipements IT}}', true);

        expect(result).toContain('katex-display');
        expect(result).toContain('PUE');
        expect(result).toContain('Datacenter');
    });

    it('renders inline math with $ ... $', () => {
        const input = 'La fameuse formule $E = mc^2$ d\'Einstein.';
        const result = renderMathInText(input);

        expect(result).toContain('katex');
        expect(result).toContain('mc');
        expect(result).not.toContain('$E = mc^2$');
    });

    it('renders bracket math \\[ ... \\]', () => {
        const input = 'Une équation \\[ a^2 + b^2 = c^2 \\] ici.';
        const result = renderMathInText(input);

        expect(result).toContain('katex-display-wrapper');
    });

    it('ignores simple currency signs like $50 and $100', () => {
        const input = 'Le prix est de $50 et non $100.';
        const result = renderMathInText(input);

        expect(result).toBe(input);
    });

    it('decodes HTML entities before passing to KaTeX', () => {
        const input = '$$ x &lt; y \\text{ et } A &amp; B $$';
        const result = renderMathInText(input);

        expect(result).toContain('katex-display');
        expect(result).not.toContain('katex-error');
    });

    it('renders equations in HTML text without touching code blocks', () => {
        const html = '<p>Indicateur :</p><p>$$ \\text{PUE} = 1.2 $$</p><pre><code>$VAR = 42</code></pre>';
        const result = renderMathInHtml(html);

        expect(result).toContain('katex-display');
        expect(result).toContain('<code>$VAR = 42</code>');
    });
});
