
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import { apiClient } from '@/lib/api/client';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
// Note: Verbosity control not available in this pdfjs-dist version
// Warnings will still appear but are non-blocking

export interface ExtractionResult {
    text: string;
    stats: {
        words: number;
        pages?: number;
        timeMs: number;
        warnings?: string[];
        method: 'pdf' | 'docx' | 'ppt' | 'ocr' | 'image';
    };
}

export async function extractText(file: File): Promise<ExtractionResult> {
    const startTime = Date.now();
    console.log(`Starting extraction for file: ${file.name} (${file.type})`);

    // Fix: Prioritize extension over MIME type for DOCX/PPT
    // Some browsers/environments might report incorrect MIME types or generic 'application/pdf'
    let fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) {
        fileType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    }

    try {
        if ((fileType === 'application/pdf' || fileName.endsWith('.pdf')) && !fileName.endsWith('.docx')) {
            console.log('Detected PDF');
            const result = await extractPdfText(file);
            return {
                ...result,
                stats: { ...result.stats, timeMs: Date.now() - startTime }
            };
        } else if (fileType.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
            console.log('Detected Image');
            const text = await extractImageText(file);
            return {
                text,
                stats: {
                    words: countWords(text),
                    timeMs: Date.now() - startTime,
                    method: 'image'
                }
            };
        } else if (
            fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            fileName.endsWith('.docx')
        ) {
            console.log('Detected DOCX');
            const text = await extractDocxText(file);
            return {
                text,
                stats: {
                    words: countWords(text),
                    timeMs: Date.now() - startTime,
                    method: 'docx'
                }
            };
        } else if (
            /\.pptx?$/i.test(fileName) ||
            fileType.includes('presentation')
        ) {
            console.log('Detected PPT/PPTX - using backend extraction');
            const result = await extractViaBackend(file);
            return {
                ...result,
                stats: { ...result.stats, timeMs: Date.now() - startTime }
            };
        }
    } catch (e) {
        console.error("Extraction routing error:", e);
        throw e;
    }

    throw new Error(`Unsupported file type: ${fileType} / ${fileName}`);
}

function countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
}

async function extractDocxText(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        // mammoth might differ in import style depending on bundler, handling both
        // @ts-ignore
        const lib = mammoth.default || mammoth;
        const result = await lib.extractRawText({ arrayBuffer });

        if (!result.value) console.warn("Mammoth returned empty text");
        return result.value.trim();
    } catch (error) {
        console.error('DOCX Extraction Error:', error);
        throw new Error('Failed to extract text from DOCX.');
    }
}

async function extractPdfText(file: File): Promise<ExtractionResult> {
    const warnings: string[] = [];
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';

        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                // @ts-ignore
                .map((item) => item.str)
                .join(' ');

            fullText += `\n\n--- Page ${i} ---\n${pageText}`;
        }

        const extractedText = fullText.trim();

        // Detect if PDF is likely scanned (very little extractable text)
        const charCount = extractedText.replace(/\s+/g, '').length;
        const avgCharsPerPage = charCount / pdf.numPages;

        if (avgCharsPerPage < 50 && pdf.numPages > 2) {
            console.warn(`PDF appears to be scanned (${charCount} chars for ${pdf.numPages} pages)`);
            warnings.push(`PDF semble être un scan (${Math.round(avgCharsPerPage)} chars/page)`);

            // Ask user if they want OCR (UI will handle this via confirmation)
            const shouldOCR = confirm(
                `Ce PDF semble être un scan (${pdf.numPages} pages, très peu de texte détectable).\n\n` +
                `Voulez-vous lancer l'OCR ? Cela peut prendre quelques minutes pour les gros documents.`
            );

            if (shouldOCR) {
                console.log('User opted for OCR. Rendering pages as images...');
                return await extractPdfViaOCR(pdf);
            }
        }

        if (!extractedText) {
            throw new Error('Le PDF ne contient aucun texte extrait.');
        }

        return {
            text: extractedText,
            stats: {
                words: countWords(extractedText),
                pages: pdf.numPages,
                timeMs: 0, // Will be set by caller
                warnings: warnings.length > 0 ? warnings : undefined,
                method: 'pdf'
            }
        };
    } catch (error: any) {
        console.error('PDF Extraction Error:', error);
        throw new Error(`Failed to extract text from PDF: ${error.message || 'Unknown error'}`);
    }
}

/**
 * Extract text from PDF using OCR (for scanned documents)
 * Renders each page as canvas and uses Tesseract.js
 */
async function extractPdfViaOCR(pdf: pdfjsLib.PDFDocumentProxy): Promise<ExtractionResult> {
    const worker = await createWorker('eng+fra');
    let fullText = '';

    try {
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            console.log(`OCR Progress: Page ${pageNum}/${pdf.numPages}`);

            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR

            // Create canvas to render page
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvas, viewport }).promise;

            // Convert canvas to blob for Tesseract
            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((b) => resolve(b!), 'image/png');
            });

            // Run OCR on this page
            const { data } = await worker.recognize(blob);
            fullText += `\n\n--- Page ${pageNum} (OCR) ---\n${data.text}`;
        }

        const text = fullText.trim();
        return {
            text,
            stats: {
                words: countWords(text),
                pages: pdf.numPages,
                timeMs: 0, // Will be set by caller
                warnings: ['Extraction via OCR (scan détecté)'],
                method: 'ocr'
            }
        };
    } finally {
        await worker.terminate();
    }
}

async function extractImageText(file: File): Promise<string> {
    try {
        const worker = await createWorker('eng+fra'); // Load English and French
        const ret = await worker.recognize(file);
        await worker.terminate();
        return ret.data.text;
    } catch (error) {
        console.error('OCR Error:', error);
        throw new Error('Failed to extract text from Image.');
    }
}

/**
 * Extract text using backend API (for PPT and complex documents)
 */
async function extractViaBackend(file: File): Promise<ExtractionResult> {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await apiClient.post('/extract', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000 // 2min timeout for large files
        });

        if (!data.text) {
            throw new Error('Backend returned empty text');
        }

        console.log(`Backend extraction stats:`, data.stats);
        return {
            text: data.text,
            stats: {
                words: data.stats?.words || countWords(data.text),
                timeMs: 0, // Will be set by caller
                method: 'ppt'
            }
        };
    } catch (error: any) {
        console.error('Backend extraction error:', error);
        throw new Error(`Backend extraction failed: ${error.response?.data?.message || error.message}`);
    }
}
