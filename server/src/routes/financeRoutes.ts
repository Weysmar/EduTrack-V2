import { Router } from 'express';
import { getBanks, createBank, updateBank, deleteBank, archiveBank, unarchiveBank } from '../controllers/bankController';
import { getAccounts, getTransactions, createTransaction, updateTransaction, deleteTransaction, previewImport, confirmImport, categorizeTransactions, createAccount, updateAccount, deleteAccount, getImportLogs, exportData } from '../controllers/financeController';
import {
    getBudgets,
    createBudget,
    updateBudget,
    deleteBudget
} from '../controllers/budgetController';
import multer from 'multer';
import path from 'path';

const router = Router();

// Multer Config
const upload = multer({
    dest: 'uploads/temp/',
    limits: { fileSize: 10 * 1024 * 1024 }, // Boost to 10MB
    fileFilter: (_req: any, file: any, cb: any) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.ofx', '.qfx', '.csv', '.xlsx', '.xls'];
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('format non supporté. Utilisez OFX, CSV ou Excel.'));
        }
    }
});

// Banks Routes
router.get('/banks', getBanks);
router.post('/banks', createBank);
router.put('/banks/:id', updateBank);
router.delete('/banks/:id', deleteBank);
router.put('/banks/:id/archive', archiveBank);
router.put('/banks/:id/unarchive', unarchiveBank);

// Budget Routes
router.get('/budgets', getBudgets);
router.post('/budgets', createBudget);
router.put('/budgets/:id', updateBudget);
router.delete('/budgets/:id', deleteBudget);

// Accounts Routes
router.get('/accounts', getAccounts);
router.post('/accounts', createAccount);
router.put('/accounts/:id', updateAccount);
router.delete('/accounts/:id', deleteAccount);

// Transactions Routes
router.get('/transactions', getTransactions);
router.post('/transactions', createTransaction);
router.put('/transactions/:id', updateTransaction);
router.delete('/transactions/:id', deleteTransaction);
router.post('/transactions/categorize', categorizeTransactions);

// Import Routes
router.post('/import/preview', upload.single('file'), previewImport);
router.post('/import/confirm', confirmImport);
router.get('/imports', getImportLogs);

// Export Route
router.get('/export', exportData);

export default router;
