import app, { ensureDatabaseReady } from '../server/src/app.js';

export default async function handler(req, res) {
    try {
        await ensureDatabaseReady();
        return app(req, res);
    } catch (error) {
        // Don't leak internals; keep it stable for Vercel logs.
        return res.status(500).json({ message: 'Server init failed.' });
    }
}

