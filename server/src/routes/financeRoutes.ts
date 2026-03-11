import { Router } from 'express';
import { getBanks, createBank, updateBank, deleteBank, archiveBank, unarchiveBank } from '../controllers/bankController';
import { getAccounts, getTransactions, createTransaction, updateTransaction, deleteTransaction, previewImport, confirmImport, categorizeTransactions, createAccount, updateAccount, deleteAccount, getImportLogs, exportData, reclassifyAllTransactions, audit, autoCategorizeTransactions } from '../controllers/financeController';
import {
    getBudgets,
    createBudget,
    updateBudget,
    deleteBudget
} from '../controllers/budgetController';
import { getRecurring, detectRecurring, updateRecurring, deleteRecurring } from '../controllers/recurringController';
import { getGoals, createGoal, updateGoal, deleteGoal, getGoalProjection, recalculateGoals, getSavingsRate } from '../controllers/savingsGoalController';
import { getForecast } from '../controllers/forecastController';
import { getRules, createRule, updateRule, deleteRule, testRule } from '../controllers/rulesController';
import { getAlerts, markAsRead, dismissAlert, checkAlerts, getUnreadCount } from '../controllers/alertController';
import { getHealthScore } from '../controllers/healthScoreController';
import { getMonthlyReport } from '../controllers/reportController';
import categoryRoutes from './categoryRoutes';
import multer from 'multer';
import path from 'path';

const router = Router();

// Multer Config
const upload = multer({
    dest: 'uploads/temp/',
    limits: { fileSize: 10 * 1024 * 1024 },
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
router.use('/categories', categoryRoutes);
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
router.post('/transactions/auto-categorize', autoCategorizeTransactions);

// Import Routes
router.post('/import/preview', upload.single('file'), previewImport);
router.post('/import/confirm', confirmImport);
router.get('/imports', getImportLogs);

// Export Route
router.get('/export', exportData);

// AI Audit
router.post('/audit', audit);

// Bulk Reclassification
router.post('/transactions/reclassify-all', reclassifyAllTransactions as any);

// Recurring Transactions Routes
router.get('/recurring', getRecurring);
router.post('/recurring/detect', detectRecurring);
router.put('/recurring/:id', updateRecurring);
router.delete('/recurring/:id', deleteRecurring);

// Savings Goals Routes
router.get('/goals', getGoals);
router.post('/goals', createGoal);
router.put('/goals/:id', updateGoal);
router.delete('/goals/:id', deleteGoal);
router.get('/goals/:id/projection', getGoalProjection);
router.post('/goals/recalculate', recalculateGoals);
router.get('/savings-rate', getSavingsRate);

// Cashflow Forecast
router.get('/forecast', getForecast);

// Auto-Categorization Rules
router.get('/rules', getRules);
router.post('/rules', createRule);
router.put('/rules/:id', updateRule);
router.delete('/rules/:id', deleteRule);
router.post('/rules/test', testRule);

// Finance Alerts
router.get('/alerts', getAlerts);
router.put('/alerts/:id/read', markAsRead);
router.put('/alerts/:id/dismiss', dismissAlert);
router.post('/alerts/check', checkAlerts);
router.get('/alerts/unread-count', getUnreadCount);

// Health Score
router.get('/health-score', getHealthScore);

// Monthly Reports
router.get('/reports/:year/:month', getMonthlyReport);

export default router;
