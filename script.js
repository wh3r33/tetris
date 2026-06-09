"use strict";

const CONFIG = {
  columns: 10,
  rows: 20,
  cellSize: 32,
  previewCellSize: 24,
  baseDropMs: 900,
  minimumDropMs: 90,
  lineClearAnimationMs: 220,
  leaderboardSize: 10,
  storageKeys: {
    leaderboard: "canvas-tetris-leaderboard",
    theme: "canvas-tetris-theme"
  }
};

const LINE_SCORES = [0, 100, 300, 500, 800];

const TETROMINOES = {
  I: { color: "#2C2C2C", matrix: [[1, 1, 1, 1]] },
  O: { color: "#2C2C2C", matrix: [[1, 1], [1, 1]] },
  T: { color: "#2C2C2C", matrix: [[0, 1, 0], [1, 1, 1]] },
  L: { color: "#2C2C2C", matrix: [[0, 0, 1], [1, 1, 1]] },
  J: { color: "#2C2C2C", matrix: [[1, 0, 0], [1, 1, 1]] },
  S: { color: "#2C2C2C", matrix: [[0, 1, 1], [1, 1, 0]] },
  Z: { color: "#2C2C2C", matrix: [[1, 1, 0], [0, 1, 1]] }
};

const THEME_COLORS = {
  modern: {
    board: "#EAE5D9",
    grid: "#2C2C2C",
    ghost: "#2C2C2C",
    flash: "#2C2C2C",
    pieces: Object.fromEntries(Object.keys(TETROMINOES).map((type) => [type, "#2C2C2C"]))
  },
  gameboy: {
    board: "#EAE5D9",
    grid: "#2C2C2C",
    ghost: "#2C2C2C",
    flash: "#2C2C2C",
    pieces: Object.fromEntries(Object.keys(TETROMINOES).map((type) => [type, "#2C2C2C"]))
  }
};

const dom = {
  gameCanvas: document.getElementById("gameCanvas"),
  nextCanvas: document.getElementById("nextCanvas"),
  holdCanvas: document.getElementById("holdCanvas"),
  score: document.getElementById("score"),
  level: document.getElementById("level"),
  lines: document.getElementById("lines"),
  overlay: document.getElementById("overlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlayText: document.getElementById("overlayText"),
  overlayRestart: document.getElementById("overlayRestart"),
  restartButton: document.getElementById("restartButton"),
  leaderboard: document.getElementById("leaderboard"),
  clearLeaderboard: document.getElementById("clearLeaderboard"),
  themeSelect: document.getElementById("themeSelect")
};

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function createBoard() {
  // Board cells are null for empty spaces or an object with type/color for settled blocks.
  return Array.from({ length: CONFIG.rows }, () => Array(CONFIG.columns).fill(null));
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function rotateClockwise(matrix) {
  // Transpose the matrix and reverse each row to rotate 90 degrees clockwise.
  return matrix[0].map((_, column) => matrix.map((row) => row[column]).reverse());
}

class BagRandomizer {
  constructor() {
    this.bag = [];
  }

  nextType() {
    if (this.bag.length === 0) {
      this.bag = shuffle(Object.keys(TETROMINOES));
    }
    return this.bag.pop();
  }
}

class AudioManager {
  constructor() {
    this.context = null;
  }

  ensureContext() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.context.state === "suspended") {
      this.context.resume();
    }
  }

  tone(frequency, duration, type = "square", volume = 0.08) {
    this.ensureContext();
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  rotate() {
    this.tone(520, 0.07, "triangle", 0.05);
  }

  hardDrop() {
    this.tone(130, 0.09, "sawtooth", 0.07);
  }

  lineClear(lines) {
    this.ensureContext();
    [420, 560, 720, 900].slice(0, Math.max(1, lines)).forEach((freq, index) => {
      setTimeout(() => this.tone(freq, 0.09, "square", 0.06), index * 45);
    });
  }

  gameOver() {
    this.ensureContext();
    [260, 190, 120].forEach((freq, index) => {
      setTimeout(() => this.tone(freq, 0.2, "triangle", 0.08), index * 130);
    });
  }
}

class StorageManager {
  getTheme() {
    const saved = localStorage.getItem(CONFIG.storageKeys.theme);
    return THEME_COLORS[saved] ? saved : "gameboy";
  }

  setTheme(theme) {
    localStorage.setItem(CONFIG.storageKeys.theme, theme);
  }

  getLeaderboard() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.storageKeys.leaderboard)) || [];
    } catch {
      return [];
    }
  }

  saveScore(score) {
    if (score <= 0) return;
    const initials = this.getInitials();
    const entry = {
      initials,
      score,
      date: new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    };
    const leaders = [...this.getLeaderboard(), entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, CONFIG.leaderboardSize);
    localStorage.setItem(CONFIG.storageKeys.leaderboard, JSON.stringify(leaders));
  }

  getInitials() {
    const value = window.prompt("New high score! Enter initials:", "AAA") || "AAA";
    return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3).padEnd(3, "A");
  }

  clearLeaderboard() {
    localStorage.removeItem(CONFIG.storageKeys.leaderboard);
  }
}

class TetrisGame {
  constructor(audio) {
    this.audio = audio;
    this.randomizer = new BagRandomizer();
    this.reset();
  }

  reset() {
    this.board = createBoard();
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.holdPiece = null;
    this.canHold = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.clearAnimation = null;
    this.nextPiece = this.createPiece(this.randomizer.nextType());
    this.activePiece = this.createPiece(this.randomizer.nextType());
    this.spawnActivePiece();
  }

  createPiece(type) {
    return {
      type,
      matrix: cloneMatrix(TETROMINOES[type].matrix),
      x: 0,
      y: 0,
      color: TETROMINOES[type].color
    };
  }

  spawnActivePiece() {
    this.activePiece.x = Math.floor((CONFIG.columns - this.activePiece.matrix[0].length) / 2);
    this.activePiece.y = 0;
    this.canHold = true;
    // Game over occurs when the newly spawned piece already overlaps settled cells.
    if (this.hasCollision(this.activePiece, 0, 0)) {
      this.isGameOver = true;
      this.audio.gameOver();
    }
  }

  getDropInterval() {
    return Math.max(CONFIG.minimumDropMs, CONFIG.baseDropMs - (this.level - 1) * 80);
  }

  hasCollision(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
    // Collision checks wall bounds, bottom boundary, and occupied cells in the settled playfield.
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) continue;
        const boardX = piece.x + x + offsetX;
        const boardY = piece.y + y + offsetY;

        if (boardX < 0 || boardX >= CONFIG.columns || boardY >= CONFIG.rows) {
          return true;
        }

        if (boardY >= 0 && this.board[boardY][boardX]) {
          return true;
        }
      }
    }
    return false;
  }

  move(dx, dy) {
    if (this.isPaused || this.isGameOver || this.clearAnimation) return false;
    if (!this.hasCollision(this.activePiece, dx, dy)) {
      this.activePiece.x += dx;
      this.activePiece.y += dy;
      return true;
    }
    if (dy > 0) {
      this.lockPiece();
    }
    return false;
  }

  rotate() {
    if (this.isPaused || this.isGameOver || this.clearAnimation) return;
    if (this.activePiece.type === "O") {
      this.audio.rotate();
      return;
    }

    const rotated = rotateClockwise(this.activePiece.matrix);
    // Simple wall kick: try the original position, then one cell right, then one cell left.
    for (const kickX of [0, 1, -1]) {
      if (!this.hasCollision(this.activePiece, kickX, 0, rotated)) {
        this.activePiece.matrix = rotated;
        this.activePiece.x += kickX;
        this.audio.rotate();
        return;
      }
    }
  }

  softDrop() {
    this.move(0, 1);
  }

  hardDrop() {
    if (this.isPaused || this.isGameOver || this.clearAnimation) return;
    while (!this.hasCollision(this.activePiece, 0, 1)) {
      this.activePiece.y += 1;
    }
    this.audio.hardDrop();
    this.lockPiece();
  }

  hold() {
    if (!this.canHold || this.isPaused || this.isGameOver || this.clearAnimation) return;
    const currentType = this.activePiece.type;
    if (!this.holdPiece) {
      this.holdPiece = this.createPiece(currentType);
      this.activePiece = this.nextPiece;
      this.nextPiece = this.createPiece(this.randomizer.nextType());
    } else {
      const heldType = this.holdPiece.type;
      this.holdPiece = this.createPiece(currentType);
      this.activePiece = this.createPiece(heldType);
    }
    this.canHold = false;
    this.spawnActivePiece();
  }

  lockPiece() {
    for (let y = 0; y < this.activePiece.matrix.length; y += 1) {
      for (let x = 0; x < this.activePiece.matrix[y].length; x += 1) {
        if (!this.activePiece.matrix[y][x]) continue;
        const boardY = this.activePiece.y + y;
        const boardX = this.activePiece.x + x;
        if (boardY >= 0) {
          this.board[boardY][boardX] = {
            type: this.activePiece.type,
            color: this.activePiece.color
          };
        }
      }
    }

    const completedRows = this.findCompletedRows();
    if (completedRows.length) {
      this.startLineClear(completedRows);
    } else {
      this.advancePiece();
    }
  }

  findCompletedRows() {
    return this.board
      .map((row, index) => (row.every(Boolean) ? index : -1))
      .filter((index) => index !== -1);
  }

  startLineClear(rows) {
    // Rows remain visible during a short flash; removal happens once the animation expires.
    this.clearAnimation = {
      rows,
      startedAt: performance.now()
    };
    this.audio.lineClear(rows.length);
  }

  finishLineClear() {
    const rowsToRemove = new Set(this.clearAnimation.rows);
    this.board = this.board.filter((_, index) => !rowsToRemove.has(index));
    while (this.board.length < CONFIG.rows) {
      this.board.unshift(Array(CONFIG.columns).fill(null));
    }

    const cleared = rowsToRemove.size;
    this.lines += cleared;
    this.score += LINE_SCORES[cleared] * this.level;
    this.level = Math.floor(this.lines / 10) + 1;
    this.clearAnimation = null;
    this.advancePiece();
  }

  advancePiece() {
    this.activePiece = this.nextPiece;
    this.nextPiece = this.createPiece(this.randomizer.nextType());
    this.spawnActivePiece();
  }

  update(now) {
    if (this.clearAnimation && now - this.clearAnimation.startedAt >= CONFIG.lineClearAnimationMs) {
      this.finishLineClear();
    }
  }

  togglePause() {
    if (this.isGameOver) return;
    this.isPaused = !this.isPaused;
  }

  getGhostPiece() {
    const ghost = {
      ...this.activePiece,
      matrix: this.activePiece.matrix
    };
    while (!this.hasCollision(ghost, 0, 1)) {
      ghost.y += 1;
    }
    return ghost;
  }
}

class Renderer {
  constructor(gameCanvas, nextCanvas, holdCanvas) {
    this.gameCanvas = gameCanvas;
    this.nextCanvas = nextCanvas;
    this.holdCanvas = holdCanvas;
    this.ctx = gameCanvas.getContext("2d");
    this.nextCtx = nextCanvas.getContext("2d");
    this.holdCtx = holdCanvas.getContext("2d");
    this.theme = "modern";
    this.resizeCanvases();
    window.addEventListener("resize", () => this.resizeCanvases());
  }

  setTheme(theme) {
    this.theme = theme;
  }

  resizeCanvases() {
    this.gameCanvas.width = CONFIG.columns * CONFIG.cellSize;
    this.gameCanvas.height = CONFIG.rows * CONFIG.cellSize;
    this.nextCanvas.width = 128;
    this.nextCanvas.height = 128;
    this.holdCanvas.width = 128;
    this.holdCanvas.height = 128;
  }

  colors() {
    return THEME_COLORS[this.theme] || THEME_COLORS.gameboy;
  }

  pieceColor(type, fallback) {
    return this.colors().pieces[type] || fallback;
  }

  render(game, now) {
    this.clearBoard();
    this.drawGrid();
    this.drawSettledBoard(game, now);
    if (!game.isGameOver && !game.clearAnimation) {
      this.drawPiece(game.getGhostPiece(), true);
      this.drawPiece(game.activePiece, false);
    }
    this.drawPreview(this.nextCtx, game.nextPiece);
    this.drawPreview(this.holdCtx, game.holdPiece);
  }

  clearBoard() {
    this.ctx.fillStyle = this.colors().board;
    this.ctx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
  }

  drawGrid() {
    this.ctx.strokeStyle = this.colors().grid;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([]);
    for (let x = 0; x <= CONFIG.columns; x += 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * CONFIG.cellSize + 0.5, 0);
      this.ctx.lineTo(x * CONFIG.cellSize + 0.5, this.gameCanvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= CONFIG.rows; y += 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * CONFIG.cellSize + 0.5);
      this.ctx.lineTo(this.gameCanvas.width, y * CONFIG.cellSize + 0.5);
      this.ctx.stroke();
    }
  }

  drawSettledBoard(game, now) {
    const animatedRows = game.clearAnimation ? new Set(game.clearAnimation.rows) : new Set();
    const flashProgress = game.clearAnimation
      ? (now - game.clearAnimation.startedAt) / CONFIG.lineClearAnimationMs
      : 1;

    for (let y = 0; y < CONFIG.rows; y += 1) {
      for (let x = 0; x < CONFIG.columns; x += 1) {
        const cell = game.board[y][x];
        if (!cell) continue;
        if (animatedRows.has(y)) {
          this.drawCell(x, y, this.colors().flash, Math.max(0.2, 1 - flashProgress * 0.7));
        } else {
          this.drawCell(x, y, this.pieceColor(cell.type, cell.color), 1);
        }
      }
    }
  }

  drawPiece(piece, isGhost) {
    const alpha = isGhost ? 0.35 : 1;
    const color = isGhost ? this.colors().ghost : this.pieceColor(piece.type, piece.color);
    for (let y = 0; y < piece.matrix.length; y += 1) {
      for (let x = 0; x < piece.matrix[y].length; x += 1) {
        if (!piece.matrix[y][x]) continue;
        this.drawCell(piece.x + x, piece.y + y, color, alpha, isGhost);
      }
    }
  }

  drawCell(x, y, color, alpha = 1, isGhost = false) {
    const size = CONFIG.cellSize;
    const px = x * size;
    const py = y * size;
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = isGhost ? 2 : 4;
    this.ctx.setLineDash(isGhost ? [5, 5] : []);
    this.ctx.strokeRect(px + 6, py + 6, size - 12, size - 12);
    this.ctx.setLineDash([]);
    if (!isGhost) {
      const dot = Math.max(4, Math.floor(size / 6));
      this.ctx.fillRect(px + (size - dot) / 2, py + (size - dot) / 2, dot, dot);
    }
    this.ctx.restore();
  }

  drawPreview(ctx, piece) {
    ctx.fillStyle = this.colors().board;
    ctx.fillRect(0, 0, 128, 128);
    this.drawPreviewGrid(ctx);
    if (!piece) return;

    const matrix = piece.matrix;
    const cell = CONFIG.previewCellSize;
    const offsetX = (128 - matrix[0].length * cell) / 2;
    const offsetY = (128 - matrix.length * cell) / 2;
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (!value) return;
        this.drawTile(
          ctx,
          offsetX + x * cell,
          offsetY + y * cell,
          cell,
          this.pieceColor(piece.type, piece.color)
        );
      });
    });
  }

  drawPreviewGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = this.colors().grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= 128; x += CONFIG.previewCellSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, 128);
      ctx.stroke();
    }
    for (let y = 0; y <= 128; y += CONFIG.previewCellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(128, y + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTile(ctx, x, y, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(2, Math.floor(size / 8));
    ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);
    const dot = Math.max(3, Math.floor(size / 6));
    ctx.fillRect(x + (size - dot) / 2, y + (size - dot) / 2, dot, dot);
    ctx.restore();
  }
}

class App {
  constructor() {
    this.audio = new AudioManager();
    this.storage = new StorageManager();
    this.game = new TetrisGame(this.audio);
    this.renderer = new Renderer(dom.gameCanvas, dom.nextCanvas, dom.holdCanvas);
    this.lastFrame = 0;
    this.dropAccumulator = 0;
    this.touchStart = null;
    this.scoreSaved = false;

    this.applyTheme(this.storage.getTheme());
    this.bindEvents();
    this.updateHud();
    this.renderLeaderboard();
    requestAnimationFrame((time) => this.loop(time));
  }

  bindEvents() {
    document.addEventListener("keydown", (event) => this.handleKey(event));
    dom.restartButton.addEventListener("click", () => this.restart());
    dom.overlayRestart.addEventListener("click", () => this.restart());
    dom.clearLeaderboard.addEventListener("click", () => {
      this.storage.clearLeaderboard();
      this.renderLeaderboard();
    });
    dom.themeSelect.addEventListener("change", () => this.applyTheme(dom.themeSelect.value));

    dom.gameCanvas.addEventListener("touchstart", (event) => this.handleTouchStart(event), { passive: false });
    dom.gameCanvas.addEventListener("touchend", (event) => this.handleTouchEnd(event), { passive: false });
  }

  handleKey(event) {
    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "Escape"].includes(event.key)) {
      event.preventDefault();
    }
    this.audio.ensureContext();

    switch (event.key) {
      case "ArrowLeft":
        this.game.move(-1, 0);
        break;
      case "ArrowRight":
        this.game.move(1, 0);
        break;
      case "ArrowDown":
        this.game.softDrop();
        this.dropAccumulator = 0;
        break;
      case "ArrowUp":
      case "x":
      case "X":
        this.game.rotate();
        break;
      case " ":
        this.game.hardDrop();
        this.dropAccumulator = 0;
        break;
      case "p":
      case "P":
      case "Escape":
        this.game.togglePause();
        break;
      case "c":
      case "C":
        this.game.hold();
        break;
      default:
        break;
    }
    this.updateHud();
  }

  handleTouchStart(event) {
    event.preventDefault();
    this.audio.ensureContext();
    const touch = event.changedTouches[0];
    this.touchStart = {
      x: touch.clientX,
      y: touch.clientY,
      time: performance.now()
    };
  }

  handleTouchEnd(event) {
    event.preventDefault();
    if (!this.touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - this.touchStart.x;
    const dy = touch.clientY - this.touchStart.y;
    const elapsed = performance.now() - this.touchStart.time;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absY > 85 && dy > 0) {
      if (dy > 150 || elapsed < 180) {
        this.game.hardDrop();
      } else {
        this.game.softDrop();
      }
    } else if (absX > 40 && absX > absY) {
      this.game.move(dx > 0 ? 1 : -1, 0);
    } else if (absX < 35 && absY < 35) {
      this.game.rotate();
    }
    this.touchStart = null;
    this.updateHud();
  }

  loop(now) {
    const delta = now - this.lastFrame || 0;
    this.lastFrame = now;

    if (!this.game.isPaused && !this.game.isGameOver && !this.game.clearAnimation) {
      this.dropAccumulator += delta;
      if (this.dropAccumulator >= this.game.getDropInterval()) {
        this.game.move(0, 1);
        this.dropAccumulator = 0;
      }
    }

    this.game.update(now);
    this.updateHud();
    this.updateOverlay();
    this.renderer.render(this.game, now);
    requestAnimationFrame((time) => this.loop(time));
  }

  updateHud() {
    dom.score.textContent = this.game.score.toLocaleString();
    dom.level.textContent = String(this.game.level);
    dom.lines.textContent = String(this.game.lines);
  }

  updateOverlay() {
    if (this.game.isGameOver) {
      if (!this.scoreSaved) {
        this.storage.saveScore(this.game.score);
        this.renderLeaderboard();
        this.scoreSaved = true;
      }
      dom.overlay.classList.remove("hidden");
      dom.overlayTitle.textContent = "Game Over";
      dom.overlayText.textContent = `Final score: ${this.game.score.toLocaleString()}`;
      return;
    }

    if (this.game.isPaused) {
      dom.overlay.classList.remove("hidden");
      dom.overlayTitle.textContent = "Paused";
      dom.overlayText.textContent = "Press P or Escape to resume.";
    } else {
      dom.overlay.classList.add("hidden");
    }
  }

  renderLeaderboard() {
    const leaders = this.storage.getLeaderboard();
    dom.leaderboard.innerHTML = "";
    if (leaders.length === 0) {
      const item = document.createElement("li");
      item.innerHTML = "<span>No scores yet</span>";
      dom.leaderboard.appendChild(item);
      return;
    }

    leaders.forEach((entry) => {
      const item = document.createElement("li");
      item.innerHTML = `
        <span><strong>${entry.initials}</strong> <span class="leader-meta">${entry.date}</span></span>
        <span class="leader-score">${Number(entry.score).toLocaleString()}</span>
      `;
      dom.leaderboard.appendChild(item);
    });
  }

  applyTheme(theme) {
    const selectedTheme = THEME_COLORS[theme] ? theme : "gameboy";
    document.body.classList.toggle("theme-gameboy", selectedTheme === "gameboy");
    dom.themeSelect.value = selectedTheme;
    this.renderer.setTheme(selectedTheme);
    this.storage.setTheme(selectedTheme);
  }

  restart() {
    this.game.reset();
    this.scoreSaved = false;
    this.dropAccumulator = 0;
    this.updateHud();
    this.updateOverlay();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new App();
});
