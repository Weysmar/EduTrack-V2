import { prisma } from '../lib/prisma';
import { aiService } from '../services/aiService';
import { generatePlan } from './planningController';

jest.mock('../lib/prisma', () => ({
    prisma: {
        course: { findFirst: jest.fn() },
        folder: { findFirst: jest.fn() },
    },
}));
jest.mock('../services/aiService', () => ({ aiService: { generateJSON: jest.fn() } }));
jest.mock('./profileController', () => ({ incrementAIGeneration: jest.fn() }));

const courseFindFirst = prisma.course.findFirst as unknown as jest.Mock;
const folderFindFirst = prisma.folder.findFirst as unknown as jest.Mock;
const generateJSON = aiService.generateJSON as unknown as jest.Mock;

const mockRes = () => {
    const res: any = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
};

const request = (body: Record<string, unknown>, userId: string | null = 'owner') => ({
    user: userId ? { id: userId } : undefined,
    headers: { 'x-ai-api-key': 'AIzaSyA-0123456789abcdefghijklmnopqrstu' },
    body: { examDate: '2026-12-01', provider: 'google', ...body },
}) as any;

describe('generatePlan — ownership checks', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("only looks up the connected user's course and refuses someone else's", async () => {
        courseFindFirst.mockResolvedValue(null); // the course belongs to another profile
        const res = mockRes();

        await generatePlan(request({ targetId: 'course-of-someone-else', targetType: 'course' }), res);

        expect(courseFindFirst).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'course-of-someone-else', profileId: 'owner' },
        }));
        expect(res.status).toHaveBeenCalledWith(404);
        expect(generateJSON).not.toHaveBeenCalled();
    });

    it('scopes folders and their courses to the connected user', async () => {
        folderFindFirst.mockResolvedValue(null);
        const res = mockRes();

        await generatePlan(request({ targetId: 'folder-1', targetType: 'folder' }), res);

        const query = folderFindFirst.mock.calls[0][0];
        expect(query.where).toEqual({ id: 'folder-1', profileId: 'owner' });
        expect(query.include.courses.where).toEqual({ profileId: 'owner' });
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('rejects unauthenticated requests and unknown target types', async () => {
        const unauthenticated = mockRes();
        await generatePlan(request({ targetId: 'c1', targetType: 'course' }, null), unauthenticated);
        expect(unauthenticated.status).toHaveBeenCalledWith(401);

        const invalid = mockRes();
        await generatePlan(request({ targetId: 'c1', targetType: 'profile' }), invalid);
        expect(invalid.status).toHaveBeenCalledWith(400);
        expect(courseFindFirst).not.toHaveBeenCalled();
    });

    it('generates the plan for an owned course', async () => {
        courseFindFirst.mockResolvedValue({ title: 'Physique', items: [{ id: 'i1', title: 'Optique', type: 'note' }] });
        generateJSON.mockResolvedValue({ program: { sessions: [] } });
        const res = mockRes();

        await generatePlan(request({ targetId: 'my-course', targetType: 'course' }), res);

        expect(generateJSON).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'gemini-3.8-flash', expect.any(String), 'google');
        expect(res.json).toHaveBeenCalledWith({ program: { sessions: [] } });
    });
});
