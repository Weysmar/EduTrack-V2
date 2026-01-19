import express from 'express';
import { authenticate } from '../middleware/auth';
import { getSummary, saveSummary, getSummaries } from '../controllers/summaryController';

const router = express.Router();

router.get('/', authenticate, (req, res, next) => {
    if (req.query.itemId) {
        return getSummary(req, res);
    }
    return getSummaries(req, res);
});
router.post('/', authenticate, saveSummary);

export default router;
