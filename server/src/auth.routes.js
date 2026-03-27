import express from 'express';
import { pool } from './db.js';
import { hashPassword, verifyPassword } from './security/password.js';
import { createLoginSession, isUsernameOnline } from './session.store.js';

const router = express.Router();

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

        const passwordHash = await hashPassword(String(password));

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
        if (isUsernameOnline(user.username)) {
            return res.status(409).json({ message: 'Bu hesap şu anda çevrimiçi. İkinci oturum açılamaz.' });
        }

        const isMatch = await verifyPassword(String(password), user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
        }

        const sessionToken = createLoginSession(user.username);
        return res.json({ message: 'success', username: user.username, sessionToken });
    } catch (error) {
        return res.status(500).json({ message: 'Giriş sırasında hata oluştu.' });
    }
});

export default router;

