import { prepare, layoutNextLineRange, materializeLineRange } from 'https://esm.sh/@chenglou/pretext@0.0.4';

// ── Text ────────────────────────────────────────────────────────────────────
const TEXT = `Call me Ishmael. Some years ago—never mind how long precisely—having little money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation. Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet; and especially whenever my hypos get such an upper hand of me, that it requires a strong moral principle to prevent me from deliberately stepping into the street, and methodically knocking people's hats off—then, I account it high time to get to sea as soon as I can. This is my substitute for pistol and ball. With a flourish Cato throws himself upon his sword; I quietly take to the ship. There is nothing surprising in this. If they only knew it, almost all men in their degree, some time or other, cherish very nearly the same feelings towards the ocean as I do.`;

const FONT_SIZE = 17;
const FONT_FACE = 'Georgia, "Times New Roman", serif';
const FONT_STR  = `${FONT_SIZE}px ${FONT_FACE}`;
const LINE_H    = FONT_SIZE * 1.7;
const PAD       = 40; // canvas-space pixels (logical)

// ── Obstacles ───────────────────────────────────────────────────────────────
// Each obstacle floats on a Lissajous path.
// rx/ry: amplitude as fraction of canvas half-size
// px/py: angular speed multipliers
// phase: starting phase offset (radians)
// r: base radius in logical pixels
const OBSTACLE_DEFS = [
  { rx: 0.28, ry: 0.32, r: 90, px: 0.7,  py: 1.1,  phase: 0.0, color: '#4ecdc4' },
  { rx: 0.32, ry: 0.24, r: 70, px: 1.3,  py: 0.6,  phase: 2.1, color: '#e94560' },
  { rx: 0.22, ry: 0.30, r: 80, px: 1.0,  py: 1.4,  phase: 4.3, color: '#ffd700' },
];

// ── Canvas setup ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
let W = 0, H = 0, dpr = 1;

function resize() {
  dpr = window.devicePixelRatio || 1;
  W   = canvas.clientWidth;
  H   = canvas.clientHeight;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
}

window.addEventListener('resize', resize);
resize();

// Prepare text once (expensive — canvas measureText internally)
const prepared = prepare(TEXT, FONT_STR);

// ── Pointer interaction ──────────────────────────────────────────────────────
// Obstacle index 0 follows the pointer when touched
let pointerActive = false;
let pointerX = 0, pointerY = 0;

canvas.addEventListener('pointerdown', e => {
  pointerActive = true;
  pointerX = e.clientX;
  pointerY = e.clientY;
});
canvas.addEventListener('pointermove', e => {
  if (!pointerActive) return;
  pointerX = e.clientX;
  pointerY = e.clientY;
});
canvas.addEventListener('pointerup',     () => { pointerActive = false; });
canvas.addEventListener('pointercancel', () => { pointerActive = false; });

// ── Animation loop ───────────────────────────────────────────────────────────
let startTime = null;

function frame(ts) {
  if (!startTime) startTime = ts;
  const t = (ts - startTime) / 1000; // seconds

  // Logical (CSS) dimensions
  const lW = W;
  const lH = H;

  // Compute obstacle positions in logical pixels
  const obs = OBSTACLE_DEFS.map((def, i) => {
    let cx, cy;
    if (i === 0 && pointerActive) {
      cx = pointerX;
      cy = pointerY;
    } else {
      cx = lW / 2 + lW * def.rx * Math.sin(t * def.px + def.phase);
      cy = lH / 2 + lH * def.ry * Math.cos(t * def.py + def.phase);
    }
    return { cx, cy, r: def.r, color: def.color };
  });

  // ── Draw ──────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, lW, lH);

  // Text layout — pretext variable-width routing
  ctx.font         = FONT_STR;
  ctx.fillStyle    = 'rgba(255, 245, 220, 0.88)';
  ctx.textBaseline = 'alphabetic';

  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  let y = PAD + FONT_SIZE; // first baseline

  while (y < lH + LINE_H) {
    // Compute the horizontal band available for this line
    let xStart = PAD;
    let xEnd   = lW - PAD;

    const midY = y - FONT_SIZE / 2; // approximate line center

    for (const o of obs) {
      const dy = midY - o.cy;
      if (Math.abs(dy) < o.r) {
        const halfChord = Math.sqrt(o.r * o.r - dy * dy);
        const left  = o.cx - halfChord;
        const right = o.cx + halfChord;
        // Decide which side to push the text
        if (o.cx < lW / 2) {
          // Obstacle on left half → push xStart right
          xStart = Math.max(xStart, right + 6);
        } else {
          // Obstacle on right half → push xEnd left
          xEnd = Math.min(xEnd, left - 6);
        }
      }
    }

    const maxW = xEnd - xStart;

    if (maxW < 60) {
      // Too narrow to fit anything — skip this line slot
      y += LINE_H;
      continue;
    }

    const lineRange = layoutNextLineRange(prepared, cursor, maxW);
    if (lineRange === null) break; // all text consumed

    const line = materializeLineRange(prepared, lineRange);
    ctx.fillText(line.text, xStart, y);

    cursor = lineRange.end;
    y += LINE_H;
  }

  // Draw obstacle circles on top (behind-text effect via semi-transparency)
  for (const o of obs) {
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.fillStyle   = o.color;

    // Soft glow with a radial gradient
    const grad = ctx.createRadialGradient(o.cx, o.cy, 0, o.cx, o.cy, o.r);
    grad.addColorStop(0, o.color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.arc(o.cx, o.cy, o.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
