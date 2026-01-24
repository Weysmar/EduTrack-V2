import express from 'express';
import { getBanks, createBank, updateBank, deleteBank } from '../controllers/bankController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/', getBanks);
router.post('/', createBank);
router.put('/:id', updateBank);
router.delete('/:id', deleteBank);

export const bankRoutes = router;
