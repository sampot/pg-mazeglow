/**
 * Maze collect-and-chase. Original layout & sprites — not a clone of any commercial title.
 */

export const W = 480;
export const H = 640;
/** Power / edible window in update-frames (~60fps). */
export const FRIGHTENED_MAX = 60 * 6;

export const COLS = 19;
export const ROWS = 21;
export const CELL = 22;
export const OX = Math.floor((W - COLS * CELL) / 2);
export const OY = 56;

// 1 wall · 0 pellet path · 2 empty path · 3 power · 9 spawn player · 8 spawn chase
const LEVELS = [
  [
    "1111111111111111111",
    "1000000001000000001",
    "1011110101010111101",
    "1300000000000000031",
    "1011011110111101101",
    "1001000001000001001",
    "1111011101110111011",
    "1000000100010000001",
    "1011110101010111101",
    "1000000008000000001",
    "1111011110111101111",
    "2000000000000000002",
    "1111011101110111011",
    "1000000100010000001",
    "1011110101010111101",
    "1301000009000001031",
    "1111011110111101111",
    "1000000001000000001",
    "1011111101011111101",
    "1000000000000000001",
    "1111111111111111111",
  ],
  [
    "1111111111111111111",
    "1000000000000000001",
    "1011110111110111101",
    "1300100001000001031",
    "1110101101011010111",
    "1000000100010000001",
    "1011110101010111101",
    "1000000008000000001",
    "1111011110111101111",
    "2000000000000000002",
    "1111011101110111011",
    "1001000100010001001",
    "1011011101011101101",
    "1000000009000000001",
    "1011110111110111101",
    "1300000001000000031",
    "1110111101011110111",
    "1000100000000010001",
    "1011101110111011101",
    "1000000000000000001",
    "1111111111111111111",
  ],
];

const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/**
 * @typedef {{ col: number, row: number, x: number, y: number, dir: {x:number,y:number}, next: {x:number,y:number}|null, speed: number }} Actor
 */

export class MazeglowGame {
  constructor() {
    this.resetAll();
  }

  resetAll() {
    this.level = 0;
    this.score = 0;
    this.lives = 3;
    this.status = "ready"; // ready | playing | clear | over
    this.frightened = 0;
    this.loadLevel(this.level);
  }

  loadLevel(idx) {
    const raw = LEVELS[idx % LEVELS.length];
    /** @type {number[][]} */
    this.grid = raw.map((row) =>
      [...row].map((ch) => {
        if (ch === "1") return 1;
        if (ch === "3") return 3;
        if (ch === "2" || ch === "8" || ch === "9") return 2;
        return 0;
      }),
    );

    let playerSpawn = { col: 9, row: 15 };
    /** @type {{ col: number, row: number }[]} */
    const chaseSpawns = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = raw[r][c];
        if (ch === "9") playerSpawn = { col: c, row: r };
        if (ch === "8") chaseSpawns.push({ col: c, row: r });
      }
    }
    if (chaseSpawns.length === 0) chaseSpawns.push({ col: 9, row: 9 });

    this.pelletsLeft = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c] === 0 || this.grid[r][c] === 3) this.pelletsLeft += 1;
      }
    }

    this.player = this.makeActor(playerSpawn.col, playerSpawn.row, 2.4);
    this.player.next = null;
    /** @type {Actor[]} */
    this.chasers = chaseSpawns.slice(0, 2 + (idx % 2)).map((s, i) => {
      const a = this.makeActor(s.col, s.row, 1.7 + i * 0.15 + idx * 0.1);
      a.dir = { x: i % 2 === 0 ? 1 : -1, y: 0 };
      return a;
    });
    // Extra chaser from corners on later levels
    if (idx >= 1) {
      const extra = this.makeActor(1, 1, 1.5 + idx * 0.1);
      extra.dir = { x: 0, y: 1 };
      this.chasers.push(extra);
    }
    this.frightened = 0;
  }

  makeActor(col, row, speed) {
    const x = OX + col * CELL + CELL / 2;
    const y = OY + row * CELL + CELL / 2;
    return {
      col,
      row,
      x,
      y,
      dir: { x: 0, y: 0 },
      next: null,
      speed,
    };
  }

  start() {
    if (this.status === "over") this.resetAll();
    if (this.status === "clear") {
      this.level += 1;
      this.loadLevel(this.level);
    }
    this.status = "playing";
    return true;
  }

  /** @param {{x:number,y:number}} dir */
  queueDir(dir) {
    if (!dir.x && !dir.y) return;
    this.player.next = { x: dir.x, y: dir.y };
    // Allow instant turnaround
    if (this.player.dir.x === -dir.x && this.player.dir.y === -dir.y) {
      this.player.dir = { x: dir.x, y: dir.y };
    }
    // If stopped, try immediately
    if (this.player.dir.x === 0 && this.player.dir.y === 0) {
      if (this.canEnter(this.player.col + dir.x, this.player.row + dir.y)) {
        this.player.dir = { x: dir.x, y: dir.y };
        this.player.next = null;
      }
    }
  }

  canEnter(col, row) {
    if (row < 0 || row >= ROWS) return false;
    // Horizontal tunnel: open edge cells may wrap
    if (col === -1 || col === COLS) {
      const edge = col === -1 ? 0 : COLS - 1;
      return this.grid[row][edge] !== 1;
    }
    if (col < 0 || col >= COLS) return false;
    return this.grid[row][col] !== 1;
  }

  atCenter(actor, tol = 0.9) {
    // tol must stay below one frame of movement or actors snap-lock in place
    const cx = OX + actor.col * CELL + CELL / 2;
    const cy = OY + actor.row * CELL + CELL / 2;
    return Math.abs(actor.x - cx) <= tol && Math.abs(actor.y - cy) <= tol;
  }

  snapCenter(actor) {
    actor.x = OX + actor.col * CELL + CELL / 2;
    actor.y = OY + actor.row * CELL + CELL / 2;
  }

  /**
   * @param {number} dt
   * @returns {{ events: string[] }}
   */
  update(dt) {
    /** @type {string[]} */
    const events = [];
    if (this.status !== "playing") return { events };

    if (this.frightened > 0) this.frightened -= dt;

    this.stepActor(this.player, dt, true);
    this.eatPellets(events);

    for (const c of this.chasers) {
      this.thinkChaser(c);
      this.stepActor(c, dt, false);
    }

    this.checkCollisions(events);
    return { events };
  }

  /**
   * @param {Actor} actor
   * @param {number} dt
   * @param {boolean} isPlayer
   */
  stepActor(actor, dt, isPlayer) {
    if (this.atCenter(actor)) {
      this.snapCenter(actor);
      if (isPlayer && actor.next) {
        if (this.canEnter(actor.col + actor.next.x, actor.row + actor.next.y)) {
          actor.dir = { x: actor.next.x, y: actor.next.y };
          actor.next = null;
        }
      }
      if (!this.canEnter(actor.col + actor.dir.x, actor.row + actor.dir.y)) {
        actor.dir = { x: 0, y: 0 };
      }
    }

    if (actor.dir.x || actor.dir.y) {
      actor.x += actor.dir.x * actor.speed * dt;
      actor.y += actor.dir.y * actor.speed * dt;

      // Tunnel wrap (open side corridors)
      if (actor.x < OX - CELL / 2) {
        actor.x = OX + (COLS - 0.5) * CELL;
        actor.col = COLS - 1;
      } else if (actor.x > OX + (COLS - 0.5) * CELL) {
        actor.x = OX + CELL / 2;
        actor.col = 0;
      }

      const newCol = Math.floor((actor.x - OX) / CELL);
      const newRow = Math.floor((actor.y - OY) / CELL);
      if (newCol >= 0 && newCol < COLS && newRow >= 0 && newRow < ROWS) {
        actor.col = newCol;
        actor.row = newRow;
      }
    }
  }

  /** @param {string[]} events */
  eatPellets(events) {
    const c = this.player.col;
    const r = this.player.row;
    const cell = this.grid[r][c];
    if (cell === 0) {
      this.grid[r][c] = 2;
      this.pelletsLeft -= 1;
      this.score += 10;
      events.push("pellet");
    } else if (cell === 3) {
      this.grid[r][c] = 2;
      this.pelletsLeft -= 1;
      this.score += 50;
      this.frightened = FRIGHTENED_MAX;
      events.push("power");
    }
    if (this.pelletsLeft <= 0) {
      this.status = "clear";
      events.push("clear");
    }
  }

  /** @param {Actor} c */
  thinkChaser(c) {
    if (!this.atCenter(c)) return;
    this.snapCenter(c);

    const options = DIRS.filter((d) => {
      // Prefer not reversing unless only option
      if (d.x === -c.dir.x && d.y === -c.dir.y) return false;
      return this.canEnter(c.col + d.x, c.row + d.y);
    });
    if (options.length === 0) {
      const reverse = DIRS.find(
        (d) =>
          d.x === -c.dir.x &&
          d.y === -c.dir.y &&
          this.canEnter(c.col + d.x, c.row + d.y),
      );
      c.dir = reverse ? { x: reverse.x, y: reverse.y } : { x: 0, y: 0 };
      return;
    }

    const flee = this.frightened > 0;
    const tx = this.player.col;
    const ty = this.player.row;
    let best = options[0];
    let bestScore = flee ? -Infinity : Infinity;
    for (const d of options) {
      const nx = c.col + d.x;
      const ny = c.row + d.y;
      const dist = Math.abs(nx - tx) + Math.abs(ny - ty);
      const score = flee ? dist + Math.random() * 0.3 : dist + Math.random() * 0.2;
      if (flee ? score > bestScore : score < bestScore) {
        bestScore = score;
        best = d;
      }
    }
    c.dir = { x: best.x, y: best.y };
  }

  /** @param {string[]} events */
  checkCollisions(events) {
    const pr = 9;
    for (const c of this.chasers) {
      const dx = c.x - this.player.x;
      const dy = c.y - this.player.y;
      if (dx * dx + dy * dy < pr * pr) {
        if (this.frightened > 0) {
          this.score += 200;
          // Respawn chaser at top center-ish
          c.col = 9;
          c.row = 9;
          this.snapCenter(c);
          c.dir = { x: 1, y: 0 };
          events.push("eatChase");
        } else {
          this.lives -= 1;
          events.push("hurt");
          if (this.lives <= 0) {
            this.status = "over";
            events.push("over");
          } else {
            this.respawnActors();
          }
        }
        break;
      }
    }
  }

  respawnActors() {
    // Reload positions from current level layout without resetting pellets
    const raw = LEVELS[this.level % LEVELS.length];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (raw[r][c] === "9") {
          this.player = this.makeActor(c, r, this.player.speed);
        }
      }
    }
    const chaseSpawns = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (raw[r][c] === "8") chaseSpawns.push({ col: c, row: r });
      }
    }
    this.chasers = this.chasers.map((old, i) => {
      const s = chaseSpawns[i % Math.max(1, chaseSpawns.length)] || {
        col: 9,
        row: 9,
      };
      const a = this.makeActor(s.col, s.row, old.speed);
      a.dir = { x: i % 2 === 0 ? 1 : -1, y: 0 };
      return a;
    });
    this.frightened = 0;
  }
}
