import { Router } from 'express';
import { searchAll } from '../controllers/searchController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', searchAll);

export default router;
