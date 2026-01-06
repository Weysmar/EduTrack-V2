import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import routes from './routes';
import { socketService } from './services/socketService';

dotenv.config();

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
    crossOriginEmbedderPolicy: false
}));
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        // Allow all origins dynamically (reflect request origin)
        // In production, you might want to restrict this to specific domains
        return callback(null, true);
    },
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

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
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
