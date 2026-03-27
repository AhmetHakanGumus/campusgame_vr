'use strict';

import { Chess } from 'chess.js';
import { G } from '../runtime.js';

function cancelDragState(self) {
    self.dragging = false;
    self.dragFrom = null;
    self.dragPiece = null;
    self.selected = null;
    self.legalTargets = [];
}

export class ChessGame {
    constructor(canvas, W, H, done, opts = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.W = W;
        this.H = H;
        this.done = done;
        this.mode = opts.mode || 'ai'; // ai | pvp
        this.aiLevel = opts.aiLevel || 'normal'; // easy | normal | hard
        this.localPlayerId = opts.localPlayerId || null;
        this.mp = opts.multiplayer || null;
        this.chess = new Chess();
        this.selected = null;
        this.legalTargets = [];
        this.dragging = false;
        this.dragFrom = null;
        this.dragPiece = null;
        this.hoverSq = null;
        this.side = 'w';
        this.waitingOpponent = this.mode === 'pvp';
        this.gameOver = false;
        this.resultText = '';
        this.squareSize = Math.min(this.W, this.H) * 0.86 / 8;
        this.boardPx = this.squareSize * 8;
        this.offX = (this.W - this.boardPx) * 0.5;
        this.offY = (this.H - this.boardPx) * 0.5;
        this._mm = (e) => this.onPointerMove(e);
        this._md = (e) => this.onPointerDown(e);
        this._mu = (e) => this.onPointerUp(e);
        this._ts = (e) => this.onTouchStart(e);
        this._tm = (e) => this.onTouchMove(e);
        this._te = (e) => this.onTouchEnd(e);
    }

    start() {
        this.canvas.addEventListener('mousedown', this._md);
        this.canvas.addEventListener('mousemove', this._mm);
        document.addEventListener('mouseup', this._mu);
        this.canvas.addEventListener('touchstart', this._ts, { passive: false });
        this.canvas.addEventListener('touchmove', this._tm, { passive: false });
        this.canvas.addEventListener('touchend', this._te, { passive: false });

        if (this.mode === 'pvp' && this.mp?.joinChess) {
            this.mp.joinChess();
        }
        this.loop();
    }

    destroy() {
        this.canvas.removeEventListener('mousedown', this._md);
        this.canvas.removeEventListener('mousemove', this._mm);
        document.removeEventListener('mouseup', this._mu);
        this.canvas.removeEventListener('touchstart', this._ts);
        this.canvas.removeEventListener('touchmove', this._tm);
        this.canvas.removeEventListener('touchend', this._te);
    }

    onChessReady(payload) {
        if (!payload) return;
        this.waitingOpponent = false;
        this.side = payload.whiteId === this.localPlayerId ? 'w' : 'b';
    }

    onChessMove(payload) {
        if (!payload?.from || !payload?.to || this.gameOver) return;
        this.chess.move({ from: payload.from, to: payload.to, promotion: payload.promotion || 'q' });
        this.postMove();
    }

    onChessEnded() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.resultText = 'Rakip ayrildi';
        setTimeout(() => this.done(0), 1200);
    }

    loop() {
        G.gameRaf = requestAnimationFrame(() => this.loop());
        this.draw();
    }

    pointToSquare(x, y) {
        const file = Math.floor((x - this.offX) / this.squareSize);
        const rankFromTop = Math.floor((y - this.offY) / this.squareSize);
        if (file < 0 || file > 7 || rankFromTop < 0 || rankFromTop > 7) return null;
        const rank = 8 - rankFromTop;
        return `${'abcdefgh'[file]}${rank}`;
    }

    squareToCenter(sq) {
        const file = 'abcdefgh'.indexOf(sq[0]);
        const rank = Number(sq[1]);
        const x = this.offX + (file + 0.5) * this.squareSize;
        const y = this.offY + (8 - rank + 0.5) * this.squareSize;
        return { x, y };
    }

    getMovesFrom(square) {
        return this.chess.moves({ square, verbose: true }) || [];
    }

    canInteract() {
        if (this.gameOver) return false;
        if (this.mode === 'ai') return this.chess.turn() === 'w';
        if (this.waitingOpponent) return false;
        return this.chess.turn() === this.side;
    }

    beginDrag(square) {
        if (!this.canInteract()) return;
        const piece = this.chess.get(square);
        if (!piece) return;
        if (piece.color !== this.chess.turn()) return;
        this.selected = square;
        this.dragFrom = square;
        this.dragPiece = piece;
        this.dragging = true;
        const moves = this.getMovesFrom(square);
        this.legalTargets = moves.map((m) => m.to);
    }

    tryMove(toSquare) {
        if (!this.dragFrom) return false;
        // Tahta dışı bırakma veya aynı kare: hamle yok, sürüklemeyi iptal et
        if (!toSquare || toSquare === this.dragFrom) {
            cancelDragState(this);
            return false;
        }
        let move = null;
        try {
            move = this.chess.move({ from: this.dragFrom, to: toSquare, promotion: 'q' });
        } catch (e) {
            cancelDragState(this);
            return false;
        }
        cancelDragState(this);
        if (!move) return false;
        if (this.mode === 'pvp' && this.mp?.sendChessMove) {
            this.mp.sendChessMove({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
        }
        this.postMove();
        return true;
    }

    postMove() {
        if (this.chess.isGameOver()) {
            this.gameOver = true;
            let score = 0;
            if (this.chess.isCheckmate()) {
                const loser = this.chess.turn();
                const winner = loser === 'w' ? 'b' : 'w';
                const humanWon = this.mode === 'ai' ? winner === 'w' : winner === this.side;
                score = humanWon ? 50 : 0;
                this.resultText = humanWon ? 'Mat! +50 puan' : 'Mat oldun';
            } else {
                this.resultText = 'Berabere';
            }
            setTimeout(() => this.done(score), 1400);
            return;
        }
        if (this.mode === 'ai' && this.chess.turn() === 'b') {
            setTimeout(() => {
                if (this.gameOver) return;
                const moves = this.chess.moves({ verbose: true });
                if (!moves.length) return this.postMove();
                const mv = pickAiMove(this.chess, moves, this.aiLevel);
                this.chess.move({ from: mv.from, to: mv.to, promotion: mv.promotion || 'q' });
                this.postMove();
            }, 350);
        }
    }

    getPointerPos(e) {
        const r = this.canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    onPointerMove(e) {
        const p = this.getPointerPos(e);
        this.hoverSq = this.pointToSquare(p.x, p.y);
    }
    onPointerDown(e) {
        const p = this.getPointerPos(e);
        const sq = this.pointToSquare(p.x, p.y);
        this.beginDrag(sq);
    }
    onPointerUp(e) {
        if (!this.dragging) return;
        const p = this.getPointerPos(e);
        let sq = this.pointToSquare(p.x, p.y);
        // Fare tahta dışında bırakıldıysa son geçerli hover karesini dene (dar pencerede jitter)
        if (!sq && this.hoverSq && this.legalTargets.includes(this.hoverSq)) {
            sq = this.hoverSq;
        }
        this.tryMove(sq);
    }
    onTouchStart(e) {
        e.preventDefault();
        const t = e.touches[0];
        if (!t) return;
        this.onPointerDown(t);
    }
    onTouchMove(e) {
        e.preventDefault();
        const t = e.touches[0];
        if (!t) return;
        this.onPointerMove(t);
    }
    onTouchEnd(e) {
        e.preventDefault();
        const t = e.changedTouches[0];
        if (!t) return;
        this.onPointerUp(t);
    }

    draw() {
        const c = this.ctx;
        c.fillStyle = '#0f1724';
        c.fillRect(0, 0, this.W, this.H);

        for (let r = 0; r < 8; r++) {
            for (let f = 0; f < 8; f++) {
                const light = (r + f) % 2 === 0;
                c.fillStyle = light ? '#e8d9bd' : '#8b6b4a';
                c.fillRect(this.offX + f * this.squareSize, this.offY + r * this.squareSize, this.squareSize, this.squareSize);
            }
        }

        // hover square (VR'da hedef kare algısı için de kullanılabilir)
        if (this.hoverSq) {
            const p = this.squareToCenter(this.hoverSq);
            c.fillStyle = 'rgba(80,160,255,.25)';
            c.fillRect(
                p.x - this.squareSize * 0.5,
                p.y - this.squareSize * 0.5,
                this.squareSize,
                this.squareSize
            );
        }

        // legal target dots while holding
        if (this.dragging && this.legalTargets.length) {
            c.fillStyle = 'rgba(20, 30, 45, .5)';
            this.legalTargets.forEach((sq) => {
                const p = this.squareToCenter(sq);
                c.beginPath();
                c.arc(p.x, p.y, this.squareSize * 0.12, 0, Math.PI * 2);
                c.fill();
            });
        }

        const uni = {
            p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔'
        };
        const uniB = {
            p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚'
        };
        c.font = `${this.squareSize * 0.74}px serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        for (let rank = 1; rank <= 8; rank++) {
            for (let fi = 0; fi < 8; fi++) {
                const sq = `${'abcdefgh'[fi]}${rank}`;
                const piece = this.chess.get(sq);
                if (!piece) continue;
                const center = this.squareToCenter(sq);
                c.fillStyle = piece.color === 'w' ? '#fff' : '#0b0f16';
                c.strokeStyle = piece.color === 'w' ? '#111' : '#ddd';
                c.lineWidth = 1.2;
                const ch = piece.color === 'w' ? uni[piece.type] : uniB[piece.type];
                c.strokeText(ch, center.x, center.y + 1);
                c.fillText(ch, center.x, center.y);
            }
        }

        c.fillStyle = '#e8f0ff';
        c.font = `${Math.max(14, this.H * 0.042)}px Inter,Arial`;
        c.textAlign = 'left';
        c.fillText(
            this.mode === 'ai'
                ? `Sıra: ${this.chess.turn() === 'w' ? 'Sen' : 'Bilgisayar'}`
                : this.waitingOpponent
                    ? 'Rakip bekleniyor...'
                    : `Sıra: ${this.chess.turn() === this.side ? 'Sen' : 'Rakip'}`,
            12,
            24
        );
        if (this.resultText) {
            c.fillStyle = '#ffd86a';
            c.fillText(this.resultText, 12, 50);
        }
    }
}

function pickAiMove(chess, moves, level) {
    if (!moves?.length) return null;
    if (level === 'easy') return moves[Math.floor(Math.random() * moves.length)];

    const pieceValue = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
    let best = moves[0];
    let bestScore = -Infinity;

    for (const m of moves) {
        let score = 0;
        if (m.captured) score += pieceValue[m.captured] || 0;
        if (m.promotion) score += 8;

        if (level === 'hard') {
            const snap = new Chess(chess.fen());
            snap.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
            if (snap.isCheckmate()) score += 1000;
            if (snap.inCheck()) score += 2;
            const reply = snap.moves({ verbose: true });
            if (reply?.length) {
                // Opponent best capture potential (minimize this risk).
                let worst = 0;
                for (const r of reply) worst = Math.max(worst, pieceValue[r.captured] || 0);
                score -= worst * 0.8;
            }
        }

        if (score > bestScore || (score === bestScore && Math.random() > 0.5)) {
            bestScore = score;
            best = m;
        }
    }
    return best;
}

