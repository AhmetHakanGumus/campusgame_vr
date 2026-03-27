import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import authRoutes from './auth.routes.js';
import leaderboardRoutes from './leaderboard.routes.js';
import { initDatabase } from './db.js';
import { pathToFileURL } from 'url';
import {
    getOnlineUsernames,
    getSessionByToken,
    markSessionOnline,
    markSocketOffline
} from './session.store.js';

dotenv.config();

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(
    cors(
        corsOrigin === '*'
            ? { origin: '*', credentials: false }
            : { origin: corsOrigin.split(',').map((v) => v.trim()), credentials: false }
    )
);

app.use(express.json());

app.get('/api/health', (_req, res) => {
    res.json({ message: 'API ayakta' });
});

app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

let _initPromise;
export function ensureDatabaseReady() {
    if (!_initPromise) {
        _initPromise = initDatabase().catch((error) => {
            // Allow retries on subsequent requests if first init fails.
            _initPromise = null;
            throw error;
        });
    }
    return _initPromise;
}

export default app;

function attachRealtimeServer(httpServer) {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((v) => v.trim()),
            methods: ['GET', 'POST']
        }
    });
    const ROOM_ID = 'campus-main';
    const players = new Map();

    const normalizeUsername = (value) =>
        String(value || '')
            .trim()
            .toLowerCase();
    const sanitizeNick = (value) => (String(value || 'Oyuncu').trim().slice(0, 24) || 'Oyuncu');
    const broadcastOnlineUsers = () => {
        io.to(ROOM_ID).emit('online-users', { users: getOnlineUsernames() });
    };

    io.on('connection', (socket) => {
        socket.on('join-campus', ({ nickname, username, sessionToken } = {}) => {
            if (players.has(socket.id)) {
                socket.emit('self-init', { id: socket.id, players: Array.from(players.values()) });
                return;
            }

            const session = getSessionByToken(sessionToken);
            const cleanUsername = String(username || '').trim();
            if (!session || normalizeUsername(session.username) !== normalizeUsername(cleanUsername)) {
                socket.emit('auth-error', { message: 'Geçersiz oturum. Lütfen tekrar giriş yap.' });
                return;
            }

            const marked = markSessionOnline({
                token: sessionToken,
                username: cleanUsername,
                socketId: socket.id
            });
            if (!marked) {
                socket.emit('auth-error', { message: 'Bu hesap zaten çevrimiçi.' });
                return;
            }

            const player = {
                id: socket.id,
                nickname: sanitizeNick(nickname),
                username: cleanUsername,
                x: 0,
                y: 0,
                z: 108,
                yaw: 0,
                running: false
            };
            players.set(socket.id, player);
            socket.join(ROOM_ID);
            socket.emit('self-init', { id: socket.id, players: Array.from(players.values()) });
            socket.to(ROOM_ID).emit('player-joined', player);
            broadcastOnlineUsers();
        });

        socket.on('player-move', (next = {}) => {
            const cur = players.get(socket.id);
            if (!cur) return;
            cur.x = Number(next.x) || 0;
            cur.y = Number(next.y) || 0;
            cur.z = Number(next.z) || 0;
            cur.yaw = Number(next.yaw) || 0;
            cur.running = Boolean(next.running);
            socket.to(ROOM_ID).emit('player-moved', { ...cur });
        });

        socket.on('disconnect', () => {
            const hadPlayer = players.has(socket.id);
            if (hadPlayer) {
                players.delete(socket.id);
                socket.to(ROOM_ID).emit('player-left', { id: socket.id });
            }
            const offlineUsername = markSocketOffline(socket.id);
            if (hadPlayer || offlineUsername) broadcastOnlineUsers();
        });
    });
}

// Local development entrypoint (node server/src/app.js)
const isDirectRun = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isDirectRun) {
    const PORT = Number(process.env.PORT || 4000);
    const httpServer = createServer(app);
    attachRealtimeServer(httpServer);
    ensureDatabaseReady()
        .then(() => {
            httpServer.listen(PORT, () => {
                console.log(`Backend running on http://localhost:${PORT}`);
            });
        })
        .catch((error) => {
            console.error('Database init hatası:', error);
            process.exit(1);
        });
}

