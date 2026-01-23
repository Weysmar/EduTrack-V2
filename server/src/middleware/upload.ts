import multer from 'multer';

// Use memory storage for processing directly without saving to disk first
const storage = multer.memoryStorage();

export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});
