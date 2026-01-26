import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface ReportOptions {
    profileId: string;
    month: number; // 0-11
    year: number;
}

export const reportService = {
    async generateMonthlyReport(options: ReportOptions): Promise<Buffer> {
        const { profileId, month, year } = options;

        // 1. Fetch Data
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        const transactions = await prisma.transaction.findMany({
            where: {
                account: {
                    bank: {
                        profileId
                    }
                },
                date: { gte: startDate, lte: endDate }
            },
            // include: { category: true }, // Category is currently just a string or missing relation, removing for now
            orderBy: { date: 'desc' }
        });

        // Derive Type from Amount
        const incomeTransactions = transactions.filter(t => t.amount.toNumber() > 0);
        const expenseTransactions = transactions.filter(t => t.amount.toNumber() < 0);

        const totalIncome = incomeTransactions
            .reduce((sum, t) => sum + t.amount.toNumber(), 0);

        const totalExpense = expenseTransactions
            .reduce((sum, t) => sum + Math.abs(t.amount.toNumber()), 0);

        const savings = totalIncome - totalExpense;

        // Breakdown by Category (using classification or category string)
        const breakdown: Record<string, number> = {};
        expenseTransactions.forEach(t => {
            const cat = t.category || t.classification || 'Autres';
            breakdown[cat] = (breakdown[cat] || 0) + Math.abs(t.amount.toNumber());
        });

        // 2. Generate PDF
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const monthName = startDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

            // Header
            doc.fontSize(20).text(`Rapport Financier - ${monthName}`, { align: 'center' });
            doc.moveDown();

            doc.fontSize(12).fillColor('gray').text(`Généré par FinanceTrack le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
            doc.moveDown(2);

            // Summary Box
            const boxTop = doc.y;
            doc.rect(50, boxTop, 495, 80).fillAndStroke('#f3f4f6', '#e5e7eb');
            doc.fillColor('#000');

            doc.fontSize(14).text("Synthèse", 70, boxTop + 15);
            doc.fontSize(10)
                .text(`Revenus: ${totalIncome.toFixed(2)} €`, 70, boxTop + 40)
                .text(`Dépenses: ${totalExpense.toFixed(2)} €`, 230, boxTop + 40)
                .text(`Épargne: ${savings.toFixed(2)} €`, 390, boxTop + 40);

            doc.moveDown(6);

            // Category Breakdown
            doc.fontSize(14).text("Répartition des Dépenses");
            doc.moveDown();

            Object.entries(breakdown)
                .sort(([, a], [, b]) => b - a)
                .forEach(([cat, amount]) => {
                    const percent = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0';
                    doc.fontSize(10).text(`${cat}: ${amount.toFixed(2)} € (${percent}%)`);
                });

            doc.moveDown(2);

            // Transaction List (Top 20)
            doc.addPage();
            doc.fontSize(14).text("Détail des Opérations (Top 20)");
            doc.moveDown();

            const tableTop = doc.y;
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text("Date", 50, tableTop);
            doc.text("Description", 130, tableTop);
            doc.text("Catégorie", 350, tableTop);
            doc.text("Montant", 480, tableTop);
            doc.font('Helvetica');

            doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

            let y = tableTop + 25;
            transactions.slice(0, 20).forEach(t => {
                if (y > 750) {
                    doc.addPage();
                    y = 50;
                }
                const dateStr = new Date(t.date).toLocaleDateString('fr-FR');
                const amountVal = t.amount.toNumber();
                const amountStr = amountVal.toFixed(2) + ' €';
                const color = amountVal > 0 ? 'green' : 'red';
                const cat = t.category || t.classification || '-';

                doc.fillColor('black').text(dateStr, 50, y);
                doc.text(t.description.substring(0, 35), 130, y);
                doc.text(cat, 350, y);
                doc.fillColor(color).text(amountStr, 480, y);

                y += 20;
            });

            doc.end();
        });
    }
};
