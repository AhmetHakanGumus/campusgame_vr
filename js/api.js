'use strict';

function normalizeApiPath(path) {
    const clean = String(path || '').trim();
    if (clean.startsWith('/api/')) return clean;
    if (clean.startsWith('/')) return `/api${clean}`;
    return `/api/${clean}`;
}

async function jsonFetch(path, options = {}) {
    const res = await fetch(normalizeApiPath(path), {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message || `API error ${res.status}`);
    }
    return data;
}

export function registerUser(username, password) {
    return jsonFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
}

export function loginUser(username, password) {
    return jsonFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
}

export function getLeaderboard(game) {
    return jsonFetch(`/api/leaderboard/${encodeURIComponent(game)}`);
}

export function saveScore(game, player_name, score) {
    return jsonFetch('/api/leaderboard', {
        method: 'POST',
        body: JSON.stringify({ game, player_name, score })
    });
}

export function getRank(game, score) {
    return jsonFetch(
        `/api/leaderboard/${encodeURIComponent(game)}/rank?score=${encodeURIComponent(
            score
        )}`
    );
}

