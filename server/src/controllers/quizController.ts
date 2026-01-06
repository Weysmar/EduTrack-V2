import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { socketService } from '../services/socketService';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
    user?: { id: string };
}

// GET /api/quizzes?courseId=xx
export const getQuizzes = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.query;
        const where: any = { profileId: req.user!.id };
        if (courseId) where.courseId = String(courseId);

        const quizzes = await prisma.quiz.findMany({
            where,
            include: { questions: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quizzes', error });
    }
};

// GET /api/quizzes/:id
export const getQuiz = async (req: AuthRequest, res: Response) => {
    try {
        const quiz = await prisma.quiz.findFirst({
            where: { id: req.params.id, profileId: req.user!.id },
            include: { questions: true }
        });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quiz', error });
    }
};

// POST /api/quizzes
export const createQuiz = async (req: AuthRequest, res: Response) => {
    try {
        const { name, courseId, difficulty, questions } = req.body;

        const quiz = await prisma.quiz.create({
            data: {
                profileId: req.user!.id,
                name,
                courseId,
                difficulty: difficulty || 'medium',
                questionCount: questions ? questions.length : 0,
                questions: questions ? {
                    create: questions.map((q: any) => ({
                        stem: q.stem,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        explanation: q.explanation || ''
                    }))
                } : undefined
            },
            include: { questions: true }
        });

        socketService.emitToProfile(req.user!.id, 'quiz:created', quiz);
        res.status(201).json(quiz);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating quiz', error });
    }
};

// DELETE /api/quizzes/:id
export const deleteQuiz = async (req: AuthRequest, res: Response) => {
    try {
        const quiz = await prisma.quiz.findFirst({
            where: { id: req.params.id, profileId: req.user!.id }
        });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        await prisma.quiz.delete({ where: { id: quiz.id } });

        socketService.emitToProfile(req.user!.id, 'quiz:deleted', { id: quiz.id, courseId: quiz.courseId });
        res.json({ message: 'Quiz deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting quiz', error });
    }
};

// POST /api/quizzes/:id/submit
export const submitQuizResult = async (req: AuthRequest, res: Response) => {
    try {
        const { score } = req.body;
        const quizId = req.params.id;

        const quiz = await prisma.quiz.findFirst({ where: { id: quizId, profileId: req.user!.id } });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Update best score if higher
        let updated = false;
        if (!quiz.bestScore || score > quiz.bestScore) {
            await prisma.quiz.update({
                where: { id: quizId },
                data: { bestScore: score }
            });
            updated = true;
        }

        // Ideally log attempt in a QuizAttempt table, but for now just update best score

        if (updated) {
            socketService.emitToProfile(req.user!.id, 'quiz:updated', { id: quizId });
        }
        res.json({ message: 'Score submitted', bestScore: updated ? score : quiz.bestScore });

    } catch (error) {
        res.status(500).json({ message: 'Error submitting result', error });
    }
};
