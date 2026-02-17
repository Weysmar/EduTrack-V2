import { Router } from 'express';
import { getCalendarProxy } from '../controllers/calendarController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Protect the proxy route so only logged-in users can use it to fetch calendars
// This prevents the server from being used as an open proxy
router.get('/proxy', authenticate, getCalendarProxy);

export default router;
