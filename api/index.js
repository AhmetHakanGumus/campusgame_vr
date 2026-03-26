import app, { ensureDatabaseReady } from '../server/src/app.js';

export default async function handler(req, res) {
    try {
        await ensureDatabaseReady();
        return app(req, res);
    } catch (error) {
        console.error('Server init failed:', error);
        return res.status(500).json({
            message: `Server init failed: ${error?.message || 'unknown error'}`
        });
    }
}

