import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { aiService } from '../services/aiService';
import { getApiKey, detectProvider } from '../services/apiKeyService';
import { contentExtractionService } from '../services/contentExtractionService';
import { storageService } from '../services/storageService';
import { incrementAIGeneration } from './profileController';
import { prisma } from '../lib/prisma';
import { htmlToText, hasMeaningfulText } from '../utils/htmlToText';
import { normalizeMindmapSource } from '../utils/mindmapSource';
import { DEFAULT_GEMINI_MODEL, isAIProvider, modelForProvider, AIProvider } from '../config/aiModels';

const MINDMAP_PROMPT = `You are a mind mapping expert. Create a hierarchical mind map from the provided content.
Output MUST be valid Mermaid mindmap syntax ONLY. Do not include explanations or markdown code blocks.

Format example:
mindmap
  root((Main Topic))
    Branch 1
      Subbranch 1.1
      Subbranch 1.2
    Branch 2
      Subbranch 2.1
      Subbranch 2.2

Requirements:
- Write every label in the SAME LANGUAGE as the content (French content => French labels)
- Use ((Main Topic)) for the root node, with a short title for the whole subject
- Create 4 to 7 main branches, ordered logically (definitions first, then concepts, methods, examples)
- Each branch has 2 to 5 subbranches; go one level deeper only for key details (max 3 levels below the root)
- Keep labels concise (max 6 words), informative, and never repeat the same idea twice
- Do NOT use parentheses, brackets, braces or quotes inside labels (they break the Mermaid syntax);
  write "Loi d'Ohm U = RI" rather than "Loi d'Ohm (U = RI)"
- Indent with 2 spaces per level, one node per line

Content to analyze:
{content}

Generate a comprehensive mind map now:`;

// Helper to extract text from a file buffer - DELEGATED TO contentExtractionService
// Kept for reference but no longer used directly
const _legacyExtractTextFromFile = async (buffer: Buffer, mimetype: string): Promise<string> => {
    throw new Error('Use contentExtractionService.extractTextFromBuffer instead');
};

export const generateMindMap = async (req: AuthRequest, res: Response) => {
    try {
        // Updated to support direct content, or noteIds/fileItemIds
        const { noteIds = [], fileItemIds = [], content, name, apiKey, model = DEFAULT_GEMINI_MODEL, provider: explicitProvider, courseId } = req.body;
        const profileId = req.user?.id;

        if (!profileId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Validate course access if provided
        if (courseId) {
            const course = await prisma.course.findFirst({
                where: { id: courseId, profileId }
            });
            if (!course) {
                return res.status(404).json({ error: 'Course not found' });
            }
        }

        // Resolve API Key using standardized service (supports explicit provider with robust registry detection fallback)
        const provider: AIProvider = isAIProvider(explicitProvider) ? explicitProvider : detectProvider(model);
        const apiConfig = await getApiKey(profileId, provider, {
            requestApiKey: apiKey,
            purpose: 'summaries'
        });
        const effectiveApiKey = apiConfig.apiKey;

        let combinedContent = '';
        const noteNames: string[] = [];
        const fileNames: string[] = [];

        if (typeof content === 'string' && content.trim()) {
            combinedContent = content.trim();
        } else {
            if (!noteIds.length && !fileItemIds.length) {
                return res.status(400).json({ error: 'Content or at least one note/file is required' });
            }

            // Extract content from notes
            if (noteIds.length > 0) {
                const notes = await prisma.item.findMany({
                    where: {
                        id: { in: noteIds },
                        profileId,
                        type: 'note'
                    }
                });

                for (const note of notes) {
                    // Notes are stored as editor HTML (with base64 images): send their text only
                    combinedContent += `\n\n=== ${note.title} ===\n${htmlToText(note.content || '')}`;
                    noteNames.push(note.title);
                }
            }

            // Extract content from existing file items (PDF, DOCX) using robust service
            if (fileItemIds.length > 0) {
                const fileItems = await prisma.item.findMany({
                    where: {
                        id: { in: fileItemIds },
                        profileId
                    }
                });

                const extractionResults: Array<{ filename: string; text: string; warnings: string[] }> = [];

                for (const item of fileItems) {
                    // Reuse the text already extracted for this file (client OCR, Word editor...) when it is real
                    if (hasMeaningfulText(item.extractedContent)) {
                        const filename = item.fileName || item.title || 'unknown';
                        const text = item.extractedContent!.substring(0, 20000);
                        combinedContent += `\n\n=== ${filename} ===\n${text}`;
                        fileNames.push(filename);
                        extractionResults.push({ filename, text, warnings: [] });
                        continue;
                    }

                    if (!item.storageKey) {
                        console.warn(`File item ${item.id} has no storageKey`);
                        continue;
                    }

                    try {
                        const buffer = await storageService.getFileContent(item.storageKey);
                        if (!buffer || buffer.length === 0) {
                            console.warn(`Empty buffer for file: ${item.fileName}`);
                            continue;
                        }

                        const filename = item.fileName || 'unknown';
                        
                        // Use robust content extraction service
                        const result = await contentExtractionService.extractTextFromBuffer(
                            buffer, 
                            filename,
                            { maxLength: 20000 } // Limit per file
                        );

                        console.log(`[MindMap] Extracted ${result.stats.words} words from ${filename}`);

                        combinedContent += `\n\n=== ${filename} ===\n${result.text}`;
                        fileNames.push(filename);
                        extractionResults.push({
                            filename,
                            text: result.text,
                            warnings: result.warnings
                        });

                        // Log any warnings
                        result.warnings.forEach(w => console.warn(`[MindMap] ${filename}: ${w}`));

                    } catch (error: any) {
                        console.error(`[MindMap] Failed to extract ${item.fileName}:`, error);
                        // Continue with other files, don't fail completely
                    }
                }

                if (fileItemIds.length > 0 && fileNames.length === 0) {
                    return res.status(400).json({ 
                        error: 'No content could be extracted from selected files',
                        details: 'All files failed to extract. Check file formats and try again.'
                    });
                }
            }
        }

        if (!combinedContent.trim()) {
            return res.status(400).json({ error: 'No content could be extracted from sources' });
        }

        // Generate mind map using AI
        const prompt = MINDMAP_PROMPT.replace('{content}', combinedContent.substring(0, 50000)); // Limit total context
        const mermaidContent = await aiService.generateText(prompt, '', modelForProvider(provider, model), effectiveApiKey, provider);

        // Clean up the response: fences/chatter removed and labels made renderable by Mermaid
        const cleanedContent = normalizeMindmapSource(mermaidContent);
        if (cleanedContent.split('\n').length < 3) {
            return res.status(502).json({
                error: 'The AI did not return a usable mind map',
                details: 'Empty or invalid mind map. Try again or pick another model.'
            });
        }

        // Save mind map
        const mindMap = await prisma.mindMap.create({
            data: {
                profileId,
                courseId,
                name: name || `Mind Map - ${new Date().toLocaleDateString()}`,
                content: cleanedContent.trim(),
                sources: {
                    noteIds,
                    noteNames,
                    fileNames
                }
            }
        });

        // Increment AI generation counter
        await incrementAIGeneration(profileId);

        res.json(mindMap);
    } catch (error: any) {
        console.error('Mind map generation error:', error);
        res.status(500).json({
            error: 'Failed to generate mind map',
            details: error.message
        });
    }
};

export const getMindMaps = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.query;
        const profileId = req.user?.id;

        if (!profileId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const where: any = { profileId };
        if (courseId) {
            where.courseId = String(courseId);
        }

        const mindMaps = await prisma.mindMap.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        res.json(mindMaps);
    } catch (error) {
        console.error('Get mind maps error:', error);
        res.status(500).json({ error: 'Failed to fetch mind maps' });
    }
};

export const getMindMap = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const profileId = req.user?.id;

        if (!profileId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const mindMap = await prisma.mindMap.findFirst({
            where: {
                id,
                profileId
            }
        });

        if (!mindMap) {
            return res.status(404).json({ error: 'Mind map not found' });
        }

        res.json(mindMap);
    } catch (error) {
        console.error('Get mind map error:', error);
        res.status(500).json({ error: 'Failed to fetch mind map' });
    }
};

export const deleteMindMap = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const profileId = req.user?.id;

        if (!profileId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const mindMap = await prisma.mindMap.findFirst({
            where: { id, profileId }
        });

        if (!mindMap) {
            return res.status(404).json({ error: 'Mind map not found' });
        }

        await prisma.mindMap.delete({ where: { id } });

        res.json({ message: 'Mind map deleted successfully' });
    } catch (error) {
        console.error('Delete mind map error:', error);
        res.status(500).json({ error: 'Failed to delete mind map' });
    }
};

export const updateMindMap = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, content } = req.body;
        const profileId = req.user?.id;

        if (!profileId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const mindMap = await prisma.mindMap.findFirst({
            where: { id, profileId }
        });

        if (!mindMap) {
            return res.status(404).json({ error: 'Mind map not found' });
        }

        const updated = await prisma.mindMap.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(content && { content })
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Update mind map error:', error);
        res.status(500).json({ error: 'Failed to update mind map' });
    }
};
