import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from './db.js';

const router = express.Router();
const SALT_ROUNDS = 12;

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res.status(400).json({ message: 'username ve password zorunlu.' });
        }

        if (String(username).length < 3 || String(password).length < 6) {
            return res
                .status(400)
                .json({ message: 'username en az 3, password en az 6 karakter olmalı.' });
        }

        const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);

        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
            [String(username), passwordHash]
        );

        return res.status(201).json({
            message: 'Kayıt başarılı.',
            user: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Bu username zaten kullanılıyor.' });
        }
        return res.status(500).json({ message: 'Kayıt sırasında hata oluştu.' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res.status(400).json({ message: 'username ve password zorunlu.' });
        }

        const result = await pool.query(
            'SELECT id, username, password_hash FROM users WHERE username = $1',
            [String(username)]
        );

        if (result.rowCount === 0) {
            return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(String(password), user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
        }

        return res.json({ message: 'success' });
    } catch (error) {
        return res.status(500).json({ message: 'Giriş sırasında hata oluştu.' });
    }
});

export default router;

