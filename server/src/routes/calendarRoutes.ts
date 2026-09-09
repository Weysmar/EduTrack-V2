import { Router } from 'express';
import { 
    getCalendarProxy,
    exportCalendarFeed,
    getCalendarFeedInfo,
    regenerateCalendarFeed
} from '../controllers/calendarController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public subscription feed for Google Calendar / Apple Calendar (authenticated via unique secure token)
router.get('/feed/:token', exportCalendarFeed);

// Protected endpoints to fetch and manage the user's subscription link
router.get('/feed-info', authenticate, getCalendarFeedInfo);
router.post('/feed-info/regenerate', authenticate, regenerateCalendarFeed);

// Protect the proxy route so only logged-in users can use it to fetch external calendars
router.get('/proxy', authenticate, getCalendarProxy);

export default router;
