'use strict';

import { registerUser, loginUser } from './api.js';

export function setupAuthUI(onLoginSuccess) {
    const screen = document.getElementById('auth-screen');
    if (!screen) return;

    const tabLogin = document.getElementById('auth-tab-login');
    const tabRegister = document.getElementById('auth-tab-register');
    const loginForm = document.getElementById('auth-login-form');
    const registerForm = document.getElementById('auth-register-form');
    const msg = document.getElementById('auth-msg');

    const switchTab = (mode) => {
        const isLogin = mode === 'login';
        tabLogin.classList.toggle('active', isLogin);
        tabRegister.classList.toggle('active', !isLogin);
        loginForm.style.display = isLogin ? 'block' : 'none';
        registerForm.style.display = isLogin ? 'none' : 'block';
        msg.textContent = '';
        msg.className = 'auth-msg';
    };

    const setMessage = (text, ok = false) => {
        msg.textContent = text;
        msg.className = `auth-msg ${ok ? 'ok' : 'err'}`;
    };

    tabLogin.addEventListener('click', () => switchTab('login'));
    tabRegister.addEventListener('click', () => switchTab('register'));

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('auth-login-username').value.trim();
        const password = document.getElementById('auth-login-password').value;
        if (!username || !password) return setMessage('Lütfen tüm alanları doldur.');
        try {
            await loginUser(username, password);
            setMessage('Giriş başarılı. Yükleniyor...', true);
            screen.style.display = 'none';
            await onLoginSuccess();
        } catch (err) {
            setMessage(err.message || 'Giriş başarısız.');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('auth-register-username').value.trim();
        const password = document.getElementById('auth-register-password').value;
        if (!username || !password) return setMessage('Lütfen tüm alanları doldur.');
        try {
            await registerUser(username, password);
            setMessage('Kayıt başarılı. Şimdi giriş yapabilirsin.', true);
            switchTab('login');
            document.getElementById('auth-login-username').value = username;
        } catch (err) {
            setMessage(err.message || 'Kayıt başarısız.');
        }
    });

    switchTab('login');
}

