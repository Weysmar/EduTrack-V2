import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import compression from 'compression';
import { Server } from 'socket.io';
import routes from './routes';
import { socketService } from './services/socketService';

dotenv.config();

// SEC-05: Validate critical environment variables at startup
if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        console.error('FATAL: JWT_SECRET must be defined and at least 32 characters long in production.');
        process.exit(1);
    }
    if (!process.env.DATABASE_URL) {
        console.error('FATAL: DATABASE_URL must be defined in production.');
        process.exit(1);
    }
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for PDF iFrame support (simplest fix for now)
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images to be loaded by other origins
    frameguard: false // Disable X-Frame-Options to allow embedding
}));
// SEC-03: CORS whitelist — use CORS_ORIGIN env var (comma-separated) in production
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        // In dev, allow all. In production, enforce the whitelist.
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(compression());

// Routes
app.use('/api', routes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Initialize the socket service singleton
    socketService.init(io);

    socket.on('join-profile', (profileId: string) => {
        socket.join(`profile:${profileId}`);
        console.log(`Socket ${socket.id} joined profile:${profileId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something broke!', error: err.message });
});

// Start server
// Global Error Handlers to prevent crash loops
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
    // Keep process alive if possible, or let supervisor restart it clearly
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
