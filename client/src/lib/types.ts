export interface Profile {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    createdAt?: Date;
    theme?: 'light' | 'dark' | 'system';
    language?: 'fr' | 'en';
}

export interface Folder {
    id: number | string; // Supporting both for migration
    profileId: string;
    name: string;
    parentId?: number | string;
    channelId?: string;
    createdAt: Date;
}

export interface Course {
    id: number | string;
    profileId: string;
    folderId?: number | string;
    title: string;
    description?: string;
    color: string;
    icon?: string;
    isFavorite?: boolean;
    channelId?: string;
    createdAt: Date;
}

export interface Item {
    id: number | string;
    courseId: number | string;
    type: 'note' | 'resource' | 'exercise';
    title: string;
    content?: string; // HTML for notes, Description for others

    // Resource specifics
    fileData?: Blob; // For local storage (Dexie) - API might return URL
    fileUrl?: string; // For API
    fileType?: string;
    fileName?: string;
    fileSize?: number;
    extractedContent?: string;

    // Exercise specifics
    status?: 'not-started' | 'in-progress' | 'completed';
    difficulty?: 'easy' | 'medium' | 'hard';

    createdAt: Date;
    updatedAt: Date;
}

export interface FlashcardSet {
    id: string; // UUID
    courseId: number | string;
    itemId?: number | string; // Linked source item
    profileId: string;
    name: string;
    description?: string;
    createdAt: Date;
    lastStudied?: Date;
    masteryLevel: number; // 0-100
}

export interface Flashcard {
    id?: string;
    setId: string;
    front: string;
    back: string;
    difficulty: 'easy' | 'normal' | 'hard';
    nextReview?: Date;
    interval?: number;
    easeFactor?: number;
    repetitions?: number;
}

export interface Quiz {
    id: string;
    courseId: number | string;
    itemId?: number | string;
    profileId: string;
    name: string;
    description?: string;
    createdAt: Date;
    completedAt?: Date;
    score?: number;
}

export interface QuizQuestion {
    id?: string;
    quizId: string;
    stem: string;
    options: string[];
    correctAnswer: number; // Index
    explanation?: string;
    userAnswer?: number;
    isCorrect?: boolean;
}

export interface StudyPlan {
    id?: number | string;
    courseId: number | string;
    title: string;
    goal: string;
    deadline: Date;
    hoursPerWeek: number;
    createdAt: Date;
    status: 'active' | 'completed' | 'archived';
    weeks?: StudyWeek[];
}

export interface StudyWeek {
    id?: string; // uuid
    planId: number | string;
    weekNumber: number;
    startDate: Date;
    endDate: Date;
    topics: string[];
    status: 'upcoming' | 'current' | 'completed';
    tasks?: StudyTask[];
}

export interface StudyTask {
    id?: string;
    weekId: string;
    planId: number | string;
    dayNumber: number; // 1-7 (relative to week)
    description: string;
    durationMinutes: number;
    type: 'reading' | 'practice' | 'quiz' | 'flashcards' | 'review';
    isCompleted: boolean;
}
