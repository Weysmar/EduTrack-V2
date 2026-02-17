import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { aiService } from '../services/aiService';
import { incrementAIGeneration } from './profileController';
import mammoth from 'mammoth';

const pdfParse = require('pdf-parse');

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

// Helper to extract text from a file buffer
const extractTextFromFile = async (buffer: Buffer, mimetype: string): Promise<string> => {
    try {
        if (mimetype === 'application/pdf') {
            const data = await pdfParse(buffer);
            console.log('PDF Parsed, length:', data.text?.length);
            return data.text;
        } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // docx
            const mammoth = require('mammoth');
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        } else if (mimetype === 'text/plain' || mimetype === 'text/markdown') {
            return buffer.toString('utf-8');
        }
        return '';
    } catch (error) {
        console.error('Error extracting text from file:', error);
        return '';
    }
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

        // Resolve usage context
        const isPerplexity = model.toLowerCase().includes('sonar') || model.toLowerCase().includes('pplx');
        const provider = isPerplexity ? 'perplexity' : 'google';

        // Resolve API Key: Request > Profile Settings > Environment (handled by service)
        let effectiveApiKey = apiKey;
        if (!effectiveApiKey) {
            const profile = await prisma.profile.findUnique({
                where: { id: profileId },
                select: { settings: true }
            });

            if (profile?.settings) {
                const settings = profile.settings as any;
                if (isPerplexity) {
                    effectiveApiKey = settings.perplexity_summaries || settings.perplexity_exercises;
                } else {
                    // Try summaries key first, then exercises, as fallback
                    effectiveApiKey = settings.google_gemini_summaries || settings.google_gemini_exercises;
                }
            }
        }

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

        // Extract content from existing file items (PDF, DOCX)
        if (fileItemIds.length > 0) {
            const fileItems = await prisma.item.findMany({
                where: {
                    id: { in: fileItemIds },
                    profileId
                }
            });

            const { storageService } = require('../services/storageService'); // Lazy import to avoid circular dep if any

            for (const item of fileItems) {
                if (item.storageKey) {
                    const buffer = await storageService.getFileContent(item.storageKey);
                    if (buffer) {
                        // Determine mimetype from ext if not stored (Item model doesn't strictly store mimetype but we can guess or it might be in metadata)
                        // Actually duplicate check: storageService.uploadFile saves mimetype? No.
                        // We can use item.type or guess from fileName
                        let mimetype = '';
                        if (item.fileName?.toLowerCase().endsWith('.pdf')) mimetype = 'application/pdf';
                        else if (item.fileName?.toLowerCase().endsWith('.docx')) mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                        else if (item.fileName?.toLowerCase().endsWith('.txt')) mimetype = 'text/plain';
                        else if (item.fileName?.toLowerCase().endsWith('.md')) mimetype = 'text/markdown';

                        console.log(`Processing file: ${item.fileName}, Mimetype: ${mimetype}, Buffer: ${buffer ? 'Found' : 'Missing'}`);


                        const text = await extractTextFromFile(buffer, mimetype);
                        if (text && text.trim().length > 0) {
                            combinedContent += `\n\n=== ${item.fileName} ===\n${text.substring(0, 20000)}`; // Limit content per file
                            fileNames.push(item.fileName || 'Untitled File');
                        } else {
                            console.warn(`No text extracted for file: ${item.fileName}`);
                        }
                    }
                }
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
