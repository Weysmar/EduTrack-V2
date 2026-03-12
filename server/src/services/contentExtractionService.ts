import * as path from 'path';
import mammoth from 'mammoth';

const pdfParse = require('pdf-parse');

export interface ExtractionResult {
    text: string;
    stats: {
        words: number;
        chars: number;
    };
    warnings: string[];
}

export interface ExtractionOptions {
    maxLength?: number;
    preserveFormatting?: boolean;
}

/**
 * Detect MIME type from filename extension
 */
export const detectMimeType = (filename: string): string => {
    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.ppt': 'application/vnd.ms-powerpoint',
    };
    return mimeMap[ext] || 'application/octet-stream';
};

/**
 * Validate buffer before extraction
 */
const validateBuffer = (buffer: Buffer, filename: string): { valid: boolean; error?: string } => {
    if (!buffer || buffer.length === 0) {
        return { valid: false, error: `File buffer is empty for ${filename}` };
    }
    
    // Check for minimum file size (most files should be at least a few bytes)
    if (buffer.length < 10) {
        return { valid: false, error: `File ${filename} is too small (${buffer.length} bytes)` };
    }
    
    return { valid: true };
};

/**
 * Extract text from PDF buffer
 */
export const extractFromPDF = async (
    buffer: Buffer, 
    filename: string,
    options?: ExtractionOptions
): Promise<ExtractionResult> => {
    const warnings: string[] = [];
    
    const validation = validateBuffer(buffer, filename);
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    
    try {
        console.log(`[Extraction] Parsing PDF: ${filename} (${buffer.length} bytes)`);
        const data = await pdfParse(buffer);
        
        let text = data.text || '';
        
        if (!text || text.trim().length === 0) {
            throw new Error(`No text content found in PDF: ${filename}`);
        }
        
        // Warn if PDF appears to be scanned (no text layer)
        if (text.length < 100 && buffer.length > 50000) {
            warnings.push(`PDF may be scanned (no text layer extracted). Consider using OCR.`);
        }
        
        // Apply length limit if specified
        const maxLength = options?.maxLength || 50000;
        if (text.length > maxLength) {
            text = text.substring(0, maxLength);
            warnings.push(`Content truncated from ${data.text.length} to ${maxLength} characters`);
        }
        
        const words = text.split(/\s+/).filter((w: string) => w.length > 0).length;
        
        console.log(`[Extraction] PDF extracted: ${words} words, ${text.length} chars`);
        
        return {
            text: text.trim(),
            stats: { words, chars: text.length },
            warnings
        };
        
    } catch (error: any) {
        console.error(`[Extraction] PDF extraction failed for ${filename}:`, error);
        throw new Error(`Failed to extract text from PDF ${filename}: ${error.message}`);
    }
};

/**
 * Extract text from DOCX buffer
 */
export const extractFromDOCX = async (
    buffer: Buffer,
    filename: string,
    options?: ExtractionOptions
): Promise<ExtractionResult> => {
    const warnings: string[] = [];
    
    const validation = validateBuffer(buffer, filename);
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    
    try {
        console.log(`[Extraction] Parsing DOCX: ${filename} (${buffer.length} bytes)`);
        const result = await mammoth.extractRawText({ buffer });
        
        let text = result.value || '';
        
        if (!text || text.trim().length === 0) {
            if (result.messages && result.messages.length > 0) {
                warnings.push(`DOCX warnings: ${result.messages.join(', ')}`);
            }
            throw new Error(`No text content found in DOCX: ${filename}`);
        }
        
        // Apply length limit if specified
        const maxLength = options?.maxLength || 50000;
        if (text.length > maxLength) {
            text = text.substring(0, maxLength);
            warnings.push(`Content truncated from ${result.value.length} to ${maxLength} characters`);
        }
        
        const words = text.split(/\s+/).filter((w: string) => w.length > 0).length;
        
        console.log(`[Extraction] DOCX extracted: ${words} words, ${text.length} chars`);
        
        return {
            text: text.trim(),
            stats: { words, chars: text.length },
            warnings
        };
        
    } catch (error: any) {
        console.error(`[Extraction] DOCX extraction failed for ${filename}:`, error);
        throw new Error(`Failed to extract text from DOCX ${filename}: ${error.message}`);
    }
};

/**
 * Extract text from plain text buffer
 */
export const extractFromText = (
    buffer: Buffer,
    filename: string,
    options?: ExtractionOptions
): ExtractionResult => {
    const warnings: string[] = [];
    
    const validation = validateBuffer(buffer, filename);
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    
    try {
        let text = buffer.toString('utf-8');
        
        if (!text || text.trim().length === 0) {
            throw new Error(`Text file is empty: ${filename}`);
        }
        
        // Apply length limit if specified
        const maxLength = options?.maxLength || 50000;
        if (text.length > maxLength) {
            const originalLength = text.length;
            text = text.substring(0, maxLength);
            warnings.push(`Content truncated from ${originalLength} to ${maxLength} characters`);
        }
        
        const words = text.split(/\s+/).filter((w: string) => w.length > 0).length;
        
        return {
            text: text.trim(),
            stats: { words, chars: text.length },
            warnings
        };
        
    } catch (error: any) {
        console.error(`[Extraction] Text extraction failed for ${filename}:`, error);
        throw new Error(`Failed to extract text from ${filename}: ${error.message}`);
    }
};

/**
 * Unified extraction function - detects type and routes appropriately
 */
export const extractTextFromBuffer = async (
    buffer: Buffer,
    filename: string,
    options?: ExtractionOptions
): Promise<ExtractionResult> => {
    const mimetype = detectMimeType(filename);
    
    console.log(`[Extraction] Starting extraction: ${filename} (type: ${mimetype}, ${buffer.length} bytes)`);
    
    switch (mimetype) {
        case 'application/pdf':
            return extractFromPDF(buffer, filename, options);
            
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
            return extractFromDOCX(buffer, filename, options);
            
        case 'text/plain':
        case 'text/markdown':
            return extractFromText(buffer, filename, options);
            
        default:
            // Try text extraction as fallback for unknown types
            console.warn(`[Extraction] Unknown file type: ${mimetype}, attempting text extraction`);
            try {
                return extractFromText(buffer, filename, options);
            } catch {
                throw new Error(`Unsupported file type: ${mimetype} (${filename})`);
            }
    }
};

/**
 * Extract content from multiple files and combine them
 */
export const extractMultipleFiles = async (
    files: Array<{ buffer: Buffer; filename: string }>,
    options?: ExtractionOptions & { maxTotalLength?: number }
): Promise<{ 
    combinedText: string; 
    results: Array<{ filename: string; result: ExtractionResult }>;
    warnings: string[];
}> => {
    const results: Array<{ filename: string; result: ExtractionResult }> = [];
    const allWarnings: string[] = [];
    let combinedText = '';
    
    const maxTotalLength = options?.maxTotalLength || 100000;
    
    for (const file of files) {
        try {
            const result = await extractTextFromBuffer(file.buffer, file.filename, options);
            
            results.push({
                filename: file.filename,
                result
            });
            
            allWarnings.push(...result.warnings);
            
            // Add separator between files
            if (combinedText.length > 0) {
                combinedText += '\n\n';
            }
            combinedText += `=== ${file.filename} ===\n${result.text}`;
            
        } catch (error: any) {
            console.error(`[Extraction] Failed to extract ${file.filename}:`, error);
            allWarnings.push(`Failed to extract ${file.filename}: ${error.message}`);
        }
    }
    
    // Apply total length limit
    if (combinedText.length > maxTotalLength) {
        combinedText = combinedText.substring(0, maxTotalLength);
        allWarnings.push(`Combined content truncated to ${maxTotalLength} characters`);
    }
    
    if (results.length === 0) {
        throw new Error('No files could be extracted successfully');
    }
    
    return {
        combinedText,
        results,
        warnings: allWarnings
    };
};

/**
 * Content extraction service for use in controllers
 */
export const contentExtractionService = {
    extractTextFromBuffer,
    extractMultipleFiles,
    extractFromPDF,
    extractFromDOCX,
    extractFromText,
    detectMimeType
};
