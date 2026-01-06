
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
// Use local worker to avoid "Message port closed" and Mixed Content errors
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractText(file: File): Promise<string> {
    const fileType = file.type;

    if (fileType === 'application/pdf') {
        return extractPdfText(file);
    } else if (fileType.startsWith('image/')) {
        return extractImageText(file);
    }

    throw new Error(`Unsupported file type: ${fileType}`);
}

async function extractPdfText(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                // @ts-ignore
                .map((item) => item.str)
                .join(' ');

            fullText += `\n\n--- Page ${i} ---\n${pageText}`;
        }

        return fullText.trim();
    } catch (error: any) {
        console.error('PDF Extraction Error:', error);
        throw new Error(`Failed to extract text from PDF: ${error.message || 'Unknown error'}`);
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
