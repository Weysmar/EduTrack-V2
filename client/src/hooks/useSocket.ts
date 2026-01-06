import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { queryClient } from '@/lib/queryClient';

const SOCKET_URL = import.meta.env.VITE_API_URL || '';

export const useSocket = () => {
    const socketRef = useRef<Socket | null>(null);
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        if (!user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            return;
        }

        if (!socketRef.current) {
            socketRef.current = io(SOCKET_URL, {
                transports: ['websocket'],
            });

            socketRef.current.on('connect', () => {
                console.log('Socket connected');
                if (user.id) {
                    socketRef.current?.emit('join-profile', user.profileId || user.id);
                    // Note: user.id in store is profileId usually, or adjust based on AuthStore
                }
            });

            // Listen for invalidation events
            socketRef.current.on('course:created', () => queryClient.invalidateQueries({ queryKey: ['courses'] }));
            socketRef.current.on('course:updated', () => queryClient.invalidateQueries({ queryKey: ['courses'] }));
            socketRef.current.on('course:deleted', () => queryClient.invalidateQueries({ queryKey: ['courses'] }));

            socketRef.current.on('item:created', () => queryClient.invalidateQueries({ queryKey: ['items'] }));
            // Invalidate specific course items as well if needed, but 'items' global key works if we use composite keys like ['items', courseId]
            // Better strategy: Invalidate broad keys.

            socketRef.current.on('item:updated', () => queryClient.invalidateQueries({ queryKey: ['items'] }));
            socketRef.current.on('item:deleted', () => queryClient.invalidateQueries({ queryKey: ['items'] }));

            socketRef.current.on('disconnect', () => {
                console.log('Socket disconnected');
            });
        }

        return () => {
            // Don't disconnect on unmount unless logging out, to avoid reconnection loops on navigations if this hook is used in top component.
            // But since it's in AppLayout, it unmounts only on logout/close.
            // Actually keeping connection alive is fine.
        };
    }, [user]);

    return socketRef.current;
};
