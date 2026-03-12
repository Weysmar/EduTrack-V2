import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { aiService } from '../services/aiService';
import { getApiKey, detectProvider } from '../services/apiKeyService';
import { contentExtractionService } from '../services/contentExtractionService';
import { incrementAIGeneration } from './profileController';
import { prisma } from '../lib/prisma';

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
- Use ((Main Topic)) for the root node
- Create 3-5 main branches minimum
- Each branch should have 2-4 subbranches
- Keep labels concise (max 5 words)
- Organize information hierarchically by importance and theme

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
        // Updated to remove 'files' for direct upload
        const { noteIds = [], fileItemIds = [], name, apiKey, model = 'gemini-2.0-flash-exp', courseId } = req.body;
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

        // Resolve API Key using standardized service
        const provider = detectProvider(model);
        const apiConfig = await getApiKey(profileId, provider, {
            requestApiKey: apiKey,
            purpose: 'summaries'
        });
        const effectiveApiKey = apiConfig.apiKey;

        if (!noteIds.length && !fileItemIds.length) {
            return res.status(400).json({ error: 'At least one note or file is required' });
        }

        // Extract content from notes
        let combinedContent = '';
        const noteNames: string[] = [];

        if (noteIds.length > 0) {
            const notes = await prisma.item.findMany({
                where: {
                    id: { in: noteIds },
                    profileId,
                    type: 'note'
                }
            });

            for (const note of notes) {
                combinedContent += `\n\n=== ${note.title} ===\n${note.content || ''}`;
                noteNames.push(note.title);
            }
        }

        const fileNames: string[] = [];

        // Extract content from existing file items (PDF, DOCX) using robust service
        if (fileItemIds.length > 0) {
            const fileItems = await prisma.item.findMany({
                where: {
                    id: { in: fileItemIds },
                    profileId
                }
            });

            const { storageService } = require('../services/storageService');
            const extractionResults: Array<{ filename: string; text: string; warnings: string[] }> = [];

            for (const item of fileItems) {
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

        if (!combinedContent.trim()) {
            return res.status(400).json({ error: 'No content could be extracted from sources' });
        }

        // Generate mind map using AI
        const prompt = MINDMAP_PROMPT.replace('{content}', combinedContent.substring(0, 50000)); // Limit total context
        const mermaidContent = await aiService.generateText(prompt, '', model, effectiveApiKey, provider);

        // Clean up response (remove any markdown code blocks)
        let cleanedContent = mermaidContent.trim();
        if (cleanedContent.startsWith('```mermaid')) {
            cleanedContent = cleanedContent.replace(/```mermaid\n?/g, '').replace(/```\n?$/g, '');
        } else if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent.replace(/```\n?/g, '');
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
