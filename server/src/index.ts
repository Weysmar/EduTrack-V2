import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import compression from 'compression';
import { Server } from 'socket.io';
import routes from './routes';
import { socketService } from './services/socketService';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
});

const PORT = process.env.PORT || 3000;

// Trust Proxy (essential for X-Forwarded-Proto behind Nginx/Traefik)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: false
}));
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        return callback(null, true);
    },
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(compression());

// Routes
app.use('/api', routes);

// Health Checks
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'edutrack-backend', version: '1.0.0' });
});

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
