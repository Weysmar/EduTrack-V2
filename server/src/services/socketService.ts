import { Server, Socket } from 'socket.io';

class SocketService {
    private io: Server | null = null;

    init(io: Server) {
        this.io = io;
    }

    emitToProfile(profileId: string, event: string, data: any) {
        if (this.io) {
            this.io.to(`profile:${profileId}`).emit(event, data);
            console.log(`Socket Broadcast [${event}] to profile:${profileId}`);
        } else {
            console.warn('SocketService not initialized');
        }
    }
}

export const socketService = new SocketService();
