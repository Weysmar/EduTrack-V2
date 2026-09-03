import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import mammoth from 'mammoth';
const pdfParse = require('pdf-parse');

const execAsync = promisify(exec);

export class ExtractionService {
    /**
     * Extract text from PPTX files using Python's built-in zipfile & XML parser.
     * Fastest, most reliable method without LibreOffice overhead.
     */
    async extractPptxViaPython(filePath: string): Promise<string> {
        const pythonScript = `
import sys, zipfile, xml.etree.ElementTree as ET, re

def extract(path):
    text_parts = []
    try:
        with zipfile.ZipFile(path, 'r') as z:
            slide_files = [f for f in z.namelist() if f.startswith('ppt/slides/slide') and f.endswith('.xml')]
            slide_files.sort(key=lambda x: int(re.search(r'\\d+', x).group()) if re.search(r'\\d+', x) else 0)
            for idx, sf in enumerate(slide_files, 1):
                root = ET.fromstring(z.read(sf))
                slide_texts = []
                for elem in root.iter():
                    if elem.tag.endswith('}t') and elem.text:
                        t = elem.text.strip()
                        if t:
                            slide_texts.append(t)
                if slide_texts:
                    text_parts.append(f"--- Diapositive {idx} ---\\n" + "\\n".join(slide_texts))
    except Exception as e:
        sys.stderr.write(str(e))
        sys.exit(1)
    return "\\n\\n".join(text_parts)

if __name__ == '__main__':
    res = extract(sys.argv[1])
    sys.stdout.buffer.write(res.encode('utf-8'))
`;
        const tempScript = path.join(os.tmpdir(), `extract_pptx_${Date.now()}_${Math.random().toString(36).substring(7)}.py`);
        await fs.writeFile(tempScript, pythonScript, 'utf-8');

        try {
            // Try python3 first, fallback to python
            const command = process.platform === 'win32' 
                ? `python "${tempScript}" "${filePath}"` 
                : `python3 "${tempScript}" "${filePath}" || python "${tempScript}" "${filePath}"`;

            const { stdout } = await execAsync(command, {
                timeout: 30000,
                maxBuffer: 20 * 1024 * 1024
            });

            return stdout.toString().trim();
        } finally {
            await fs.unlink(tempScript).catch(() => {});
        }
    }

    /**
     * Extract text from PowerPoint files (PPT/PPTX) using LibreOffice to PDF + pdf-parse
     */
    async extractPptViaLibreOffice(filePath: string): Promise<string> {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ppt-extract-'));

        try {
            // Converting presentation to PDF preserves all text & formatting cleanly
            await execAsync(
                `libreoffice --headless --convert-to pdf --outdir "${tempDir}" "${filePath}"`,
                { timeout: 90000 }
            );

            const baseName = path.basename(filePath, path.extname(filePath));
            const pdfFile = path.join(tempDir, `${baseName}.pdf`);

            const pdfBuffer = await fs.readFile(pdfFile);
            const parsed = await pdfParse(pdfBuffer);

            return (parsed.text || '').trim();
        } catch (error) {
            console.error('LibreOffice PPT to PDF extraction error:', error);
            throw error;
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true }).catch(console.error);
        }
    }

    /**
     * Extract text from DOCX/DOC files
     */
    async extractDocxText(filePath: string): Promise<string> {
        // Method 1: Mammoth (Fast native JS extraction for DOCX)
        try {
            const result = await mammoth.extractRawText({ path: filePath });
            if (result.value && result.value.trim().length > 0) {
                return result.value.trim();
            }
        } catch (mammothErr) {
            console.warn('Mammoth extraction failed, falling back to LibreOffice:', mammothErr);
        }

        // Method 2: LibreOffice fallback
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docx-extract-'));
        try {
            await execAsync(
                `libreoffice --headless --convert-to txt:"Text" --outdir "${tempDir}" "${filePath}"`,
                { timeout: 60000 }
            );

            const txtFile = path.join(tempDir, path.basename(filePath, path.extname(filePath)) + '.txt');
            const text = await fs.readFile(txtFile, 'utf-8');
            return text.trim();
        } catch (error) {
            console.error('LibreOffice DOCX extraction error:', error);
            throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true }).catch(console.error);
        }
    }

    /**
     * Unified extraction method - detects file type and routes to best extractor with fallbacks
     */
    async extractText(filePath: string): Promise<{ text: string; stats: { words: number; chars: number } }> {
        const ext = path.extname(filePath).toLowerCase();
        let text = '';

        if (ext === '.pptx') {
            try {
                text = await this.extractPptxViaPython(filePath);
            } catch (pyErr) {
                console.warn('Python PPTX extraction failed, trying LibreOffice PDF conversion:', pyErr);
                text = await this.extractPptViaLibreOffice(filePath);
            }
        } else if (ext === '.ppt') {
            text = await this.extractPptViaLibreOffice(filePath);
        } else if (['.doc', '.docx'].includes(ext)) {
            text = await this.extractDocxText(filePath);
        } else {
            throw new Error(`Unsupported file type: ${ext}`);
        }

        const words = text.split(/\s+/).filter(w => w.length > 0).length;
        const chars = text.length;

        return {
            text,
            stats: { words, chars }
        };
    }
}

export const extractionService = new ExtractionService();
