import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        profileId?: string;
    };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    // 1. Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    // 2. Verify token
    jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        // 3. Attach user to request
        req.user = user;
        next();
    });
};
