import { MazeglowAudio } from "./audio.js";
import { MazeglowGame, W, H, COLS, ROWS, CELL, OX, OY } from "./game.js";

const audio = new MazeglowAudio();
const game = new MazeglowGame();
// Optional hook for local debugging / AI tinkering in Playgrounds
globalThis.__mazeglow = game;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const statusEl = document.getElementById("status");
const btnStart = document.getElementById("btn-start");
const btnMute = document.getElementById("btn-mute");
const btnReset = document.getElementById("btn-reset");

canvas.width = W;
canvas.height = H;

/** @type {Set<string>} */
const keys = new Set();
let lastTs = 0;
let running = true;
/** @type {{ x: number, y: number } | null} */
let swipeOrigin = null;

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

function setStatus(msg, tone = "") {
  statusEl.textContent = msg;
  statusEl.dataset.tone = tone;
}

function syncHud() {
  scoreEl.textContent = String(game.score);
  livesEl.textContent = String(game.lives);
  levelEl.textContent = String(game.level + 1);
  if (game.status === "ready") {
    btnStart.textContent = "出發";
    btnStart.disabled = false;
  } else if (game.status === "playing") {
    btnStart.textContent = "進行中";
    btnStart.disabled = true;
  } else if (game.status === "clear") {
    btnStart.textContent = "下一關";
    btnStart.disabled = false;
  } else {
    btnStart.textContent = "再來一局";
    btnStart.disabled = false;
  }
}

function applyKeyDirs() {
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) {
    game.queueDir({ x: -1, y: 0 });
  } else if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) {
    game.queueDir({ x: 1, y: 0 });
  } else if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) {
    game.queueDir({ x: 0, y: -1 });
  } else if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) {
    game.queueDir({ x: 0, y: 1 });
  }
}

function draw() {
  const bg = cssVar("--board", "#070b14");
  const wall = cssVar("--accent", "#2dd4bf");
  const pellet = cssVar("--neon", "#fbbf24");
  const ink = cssVar("--on-board", "#e8ecf1");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft floor
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(OX, OY, COLS * CELL, ROWS * CELL);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = game.grid[r][c];
      const x = OX + c * CELL;
      const y = OY + r * CELL;
      if (cell === 1) {
        ctx.fillStyle = wall;
        ctx.globalAlpha = 0.55;
        roundRect(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 4);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = wall;
        ctx.lineWidth = 1.5;
        roundRect(ctx, x + 3, y + 3, CELL - 6, CELL - 6, 3);
        ctx.stroke();
      } else if (cell === 0) {
        ctx.beginPath();
        ctx.fillStyle = pellet;
        ctx.arc(x + CELL / 2, y + CELL / 2, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (cell === 3) {
        const pulse = 4.5 + Math.sin(performance.now() / 180) * 1.2;
        ctx.beginPath();
        ctx.fillStyle = "#fde68a";
        ctx.arc(x + CELL / 2, y + CELL / 2, pulse, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Chasers — angular geometry (not ghost silhouettes)
  const flee = game.frightened > 0;
  game.chasers.forEach((ch, i) => {
    const hues = [330, 210, 40];
    ctx.fillStyle = flee
      ? `hsl(210 70% ${50 + Math.sin(performance.now() / 100) * 10}%)`
      : `hsl(${hues[i % hues.length]} 70% 58%)`;
    ctx.beginPath();
    if (i % 2 === 0) {
      // Diamond
      ctx.moveTo(ch.x, ch.y - 9);
      ctx.lineTo(ch.x + 8, ch.y);
      ctx.lineTo(ch.x, ch.y + 9);
      ctx.lineTo(ch.x - 8, ch.y);
    } else {
      // Triangle
      ctx.moveTo(ch.x, ch.y - 9);
      ctx.lineTo(ch.x + 9, ch.y + 8);
      ctx.lineTo(ch.x - 9, ch.y + 8);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = flee ? "#e0f2fe" : "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(ch.x - 2.5, ch.y - 1, 1.6, 0, Math.PI * 2);
    ctx.arc(ch.x + 2.5, ch.y - 1, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Player — rounded hex glow (not a chomp circle)
  const p = game.player;
  ctx.fillStyle = cssVar("--ship", "#5eead4");
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = p.x + Math.cos(a) * 9;
    const py = p.y + Math.sin(a) * 9;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.arc(p.x, p.y - 1, 3, 0, Math.PI * 2);
  ctx.fill();

  // Remaining dots hint
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.45;
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`光點 ${game.pelletsLeft}`, W / 2, OY + ROWS * CELL + 22);
  ctx.globalAlpha = 1;

  if (game.status === "ready") {
    banner("選擇方向 · 出發拾光");
  } else if (game.status === "clear") {
    banner(`第 ${game.level + 1} 關清除！`);
  } else if (game.status === "over") {
    banner("迴廊沉寂");
  } else if (flee) {
    ctx.fillStyle = cssVar("--neon", "#fbbf24");
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("強化中 · 可反制追逐者", W / 2, 36);
  }
}

function banner(msg) {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(36, H / 2 - 28, W - 72, 56);
  ctx.fillStyle = cssVar("--neon", "#fbbf24");
  ctx.font = "600 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(msg, W / 2, H / 2);
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function handleEvents(events) {
  for (const e of events) {
    if (e === "pellet") audio.pellet();
    else if (e === "power") {
      audio.power();
      setStatus("強化！抓住追逐者加分", "win");
    } else if (e === "eatChase") {
      audio.eatChase();
      setStatus(`反制成功 · ${game.score}`, "win");
    } else if (e === "hurt") {
      audio.hurt();
      setStatus(`被追上 · 剩 ${game.lives} 條命`, "warn");
    } else if (e === "clear") {
      audio.clear();
      setStatus(`關卡清除！分數 ${game.score}`, "win");
    } else if (e === "over") {
      audio.gameOver();
      setStatus(`結束 · 分數 ${game.score}`, "lose");
    }
  }
}

function frame(ts) {
  if (!running) return;
  const dt = Math.min(2, (ts - lastTs) / (1000 / 60) || 1);
  lastTs = ts;

  applyKeyDirs();
  const { events } = game.update(dt);
  if (events.length) handleEvents(events);

  draw();
  syncHud();
  requestAnimationFrame(frame);
}

async function tryStart() {
  await audio.unlock();
  if (game.status === "playing") return;
  game.start();
  audio.startBeep();
  setStatus(`第 ${game.level + 1} 關 · 拾光點！`);
  syncHud();
}

btnStart.addEventListener("click", () => {
  void tryStart();
});

btnReset.addEventListener("click", async () => {
  await audio.unlock();
  game.resetAll();
  setStatus("已重來 · 出發拾光");
  syncHud();
});

btnMute.addEventListener("click", async () => {
  await audio.unlock();
  audio.setEnabled(!audio.enabled);
  btnMute.textContent = audio.enabled ? "音效開" : "音效關";
  btnMute.setAttribute("aria-pressed", audio.enabled ? "true" : "false");
});

canvas.addEventListener("pointerdown", (e) => {
  swipeOrigin = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture?.(e.pointerId);
  if (game.status !== "playing") void tryStart();
});

canvas.addEventListener("pointerup", (e) => {
  if (!swipeOrigin) return;
  const dx = e.clientX - swipeOrigin.x;
  const dy = e.clientY - swipeOrigin.y;
  swipeOrigin = null;
  if (Math.hypot(dx, dy) < 18) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    game.queueDir({ x: dx > 0 ? 1 : -1, y: 0 });
  } else {
    game.queueDir({ x: 0, y: dy > 0 ? 1 : -1 });
  }
});

canvas.addEventListener("pointercancel", () => {
  swipeOrigin = null;
});

window.addEventListener("keydown", (e) => {
  keys.add(e.key);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key === " " || e.key === "Enter") {
    if (game.status !== "playing") void tryStart();
  }
  applyKeyDirs();
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key);
});

document.body.addEventListener(
  "pointerdown",
  () => {
    void audio.unlock();
  },
  { once: true },
);

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => draw());

setStatus("選擇方向 · 出發拾光");
syncHud();
requestAnimationFrame((ts) => {
  lastTs = ts;
  requestAnimationFrame(frame);
});
