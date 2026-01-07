import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export class ExtractionService {
    /**
     * Extract text from PowerPoint files using LibreOffice
     */
    async extractPptText(filePath: string): Promise<string> {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ppt-extract-'));
        const outputFile = path.join(tempDir, 'output.txt');

        try {
            // Convert PPT to text using LibreOffice headless
            await execAsync(
                `libreoffice --headless --convert-to txt:"Text" --outdir "${tempDir}" "${filePath}"`,
                { timeout: 60000 } // 60s timeout
            );

            // Read the converted text file
            const txtFile = path.join(tempDir, path.basename(filePath, path.extname(filePath)) + '.txt');
            const text = await fs.readFile(txtFile, 'utf-8');

            return text.trim();
        } catch (error) {
            console.error('LibreOffice extraction error:', error);
            throw new Error(`Failed to extract text from PPT: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            // Cleanup temp directory
            await fs.rm(tempDir, { recursive: true, force: true }).catch(console.error);
        }
    }

    /**
     * Extract text from DOCX files using LibreOffice (alternative to mammoth)
     */
    async extractDocxText(filePath: string): Promise<string> {
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
     * Unified extraction method - detects file type and routes to appropriate extractor
     */
    async extractText(filePath: string): Promise<{ text: string; stats: { words: number; chars: number } }> {
        const ext = path.extname(filePath).toLowerCase();
        let text = '';

        if (['.ppt', '.pptx'].includes(ext)) {
            text = await this.extractPptText(filePath);
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
