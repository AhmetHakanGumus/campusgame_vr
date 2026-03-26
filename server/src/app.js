import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './auth.routes.js';
import leaderboardRoutes from './leaderboard.routes.js';
import { initDatabase } from './db.js';
import { pathToFileURL } from 'url';

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

// Local development entrypoint (node server/src/app.js)
const isDirectRun = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isDirectRun) {
    const PORT = Number(process.env.PORT || 4000);
    ensureDatabaseReady()
        .then(() => {
            app.listen(PORT, () => {
                console.log(`Backend running on http://localhost:${PORT}`);
            });
        })
        .catch((error) => {
            console.error('Database init hatası:', error);
            process.exit(1);
        });
}

