import { Router } from 'express';
import { authenticate as auth } from '../middleware/auth';
import * as financeController from '../controllers/financeController';

const router = Router();

// Accounts (Protected)
router.get('/accounts', auth, financeController.getAccounts);
router.post('/accounts', auth, financeController.createAccount);
router.put('/accounts/:id', auth, financeController.updateAccount);
router.delete('/accounts/:id', auth, financeController.deleteAccount);

import { upload } from '../middleware/upload';

// Transactions
router.get('/transactions', auth, financeController.getTransactions);
router.post('/transactions/upload', auth, upload.single('file'), financeController.uploadTransactions);
router.post('/transactions', auth, financeController.createTransaction);
router.put('/transactions/:id', auth, financeController.updateTransaction);
router.delete('/transactions/:id', auth, financeController.deleteTransaction);
router.post('/transactions/bulk/delete', auth, financeController.bulkDeleteTransactions);

// Categories
router.get('/categories', auth, financeController.getCategories);
router.post('/categories', auth, financeController.createCategory);

// Budgets
router.get('/budgets', auth, financeController.getBudgets);
router.post('/budgets', auth, financeController.createBudget);
router.put('/budgets/:id', auth, financeController.updateBudget);

// AI Features
router.post('/transactions/:id/enrich', auth, financeController.enrichTransaction);
router.post('/audit', auth, financeController.generateAudit);
router.get('/report', auth, financeController.generateReport);

export default router;
