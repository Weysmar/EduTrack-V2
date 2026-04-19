import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to track request performance and log slow queries.
 */
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime();

    // Use 'finish' event to capture when the response is fully sent
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
        
        // Add response time header
        res.setHeader('X-Response-Time', `${timeInMs}ms`);

        // Log if it exceeds our "Slow" threshold (500ms)
        const threshold = 500;
        if (parseFloat(timeInMs) > threshold) {
            console.warn(`[Performance] SLOW REQUEST: ${req.method} ${req.originalUrl} - ${timeInMs}ms`);
        }
    });

    next();
};
