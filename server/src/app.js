import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './auth.routes.js';
import leaderboardRoutes from './leaderboard.routes.js';
import { initDatabase } from './db.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);

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

initDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Backend running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Database init hatası:', error);
        process.exit(1);
    });

