import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

function getPoolConfig() {
    if (process.env.DATABASE_URL) {
        const ssl =
            process.env.PGSSLMODE === 'require'
                ? { rejectUnauthorized: false }
                : undefined;
        return { connectionString: process.env.DATABASE_URL, ssl };
    }

    return {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
        database: process.env.PGDATABASE || 'postgres'
    };
}

export const pool = new Pool(getPoolConfig());

export async function initDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(64) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS campus_scores (
            id SERIAL PRIMARY KEY,
            game VARCHAR(64) NOT NULL,
            player_name VARCHAR(64) NOT NULL,
            score INTEGER NOT NULL CHECK (score >= 0),
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);
}

