'use strict';

import { io } from 'socket.io-client';

export function createMultiplayerClient({ nickname, username, sessionToken }, handlers = {}) {
    const socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
        path: '/socket.io',
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        socket.emit('join-campus', { nickname, username, sessionToken });
    });

    socket.on('room-full', () => {
        handlers.onRoomFull?.();
    });
    socket.on('self-init', (payload) => {
        handlers.onSelfInit?.(payload);
    });
    socket.on('player-joined', (player) => {
        handlers.onPlayerJoined?.(player);
    });
    socket.on('player-moved', (player) => {
        handlers.onPlayerMoved?.(player);
    });
    socket.on('player-left', ({ id }) => {
        handlers.onPlayerLeft?.(id);
    });
    socket.on('online-users', ({ users }) => {
        handlers.onOnlineUsers?.(users || []);
    });
    socket.on('auth-error', ({ message }) => {
        handlers.onAuthError?.(message || 'Oturum hatası');
    });
    socket.on('chess-ready', (payload) => {
        handlers.onChessReady?.(payload);
    });
    socket.on('chess-move', (payload) => {
        handlers.onChessMove?.(payload);
    });
    socket.on('chess-ended', (payload) => {
        handlers.onChessEnded?.(payload);
    });

    return {
        sendMove(state) {
            socket.emit('player-move', state);
        },
        joinChess() {
            socket.emit('chess-join');
        },
        sendChessMove(move) {
            socket.emit('chess-move', move);
        },
        disconnect() {
            socket.disconnect();
        }
    };
}

