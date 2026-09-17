import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to track request performance and log slow queries.
 */
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime();

    // Hook into writeHead to inject response time header BEFORE headers are flushed
    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = function (this: Response, ...args: any[]) {
        if (!this.headersSent) {
            const diff = process.hrtime(start);
            const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
            try {
                this.setHeader('X-Response-Time', `${timeInMs}ms`);
            } catch {
                // Ignore any header error if already flushed
            }
        }
        return (originalWriteHead as any)(...args);
    };

    // Use 'finish' event solely to log slow queries without touching headers
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

        // Log if it exceeds our "Slow" threshold (500ms)
        const threshold = 500;
        if (parseFloat(timeInMs) > threshold) {
            console.warn(`[Performance] SLOW REQUEST: ${req.method} ${req.originalUrl} - ${timeInMs}ms`);
        }
    });

    next();
};
