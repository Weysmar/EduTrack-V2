import { Router } from 'express';
import { register, login, getMe, getAllUsers, deleteUserByAdmin, updateUserByAdmin } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public route for login
router.post('/login', login);

// Authenticated routes
router.get('/me', authenticate, getMe);

// Admin / protected account creation & user management
router.post('/register', (req, res, next) => {
    // If request has Authorization header, authenticate it, otherwise pass through so controller handles first bootstrap user or rejection
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        return authenticate(req as any, res, next);
    }
    next();
}, register as any);

router.get('/users', authenticate, getAllUsers as any);
router.put('/users/:id', authenticate, updateUserByAdmin as any);
router.delete('/users/:id', authenticate, deleteUserByAdmin as any);

export default router;

