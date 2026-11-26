// Lottie celebrations (Notion "Milestone confetti: try a Lottie version of the
// celebration burst"). Andre picked "A · Flutter" for the milestones and
// "C · Star pop" for small wins (2026-11-26). Both were made in LottieFiles
// Creator (document rt-confetti; the files are in the LottieFiles workspace)
// and live in ./celebrations:
// - milestone.json: one end of the toast's burst. The pieces rise, hang,
//   then flutter down. It plays twice, the left copy mirrored. (The toast
//   always sits at the bottom, so the burst always goes up.)
// - small-win.json: a star pop from the toast's icon. Nothing plays it yet;
//   the small-win tickets will.
//
// The player is never on the startup path (Andre, 2026-11-24: a player fetched
// beside the bundle cost about 0.3 s of mobile LCP). The player and the files
// are separate chunks, fetched only when a visitor is one title away from a
// milestone (celebrate.tsx), once the page has loaded and is idle. A milestone
// that lands before they arrive gets the canvas confetti instead.
import type { AnimationItem, LottiePlayer } from 'lottie-web';

export type CelebrationKind = 'milestone' | 'small-win';

interface LottieData { w: number; h: number }

const FILES: Record<CelebrationKind, () => Promise<{ default: unknown }>> = {
  milestone: () => import('./celebrations/milestone.json'),
  'small-win': () => import('./celebrations/small-win.json'),
};

// Where each burst starts, in its composition's pixels: the point that goes
// on the toast's end (or, for the star pop, on the icon's center).
const ORIGIN: Record<CelebrationKind, readonly [number, number]> = {
  milestone: [110, 560],
  'small-win': [200, 200],
};

// The eight colors the files were drawn with. Each is a slot: at play time,
// slot n takes palette[n % palette.length], so the pieces follow the theme's
// phase tokens (or a finished guide's greens) like the canvas confetti.
const SLOTS: readonly (readonly [number, number, number])[] =
  ['#d4a05a', '#4a8de8', '#e0525f', '#a05cd0', '#5fa856', '#e5677a', '#ffffff', '#f0c34a']
    .map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]);

let player: LottiePlayer | null = null;
let playerLoad: Promise<void> | null = null;
const files: Partial<Record<CelebrationKind, LottieData>> = {};
const fileLoad: Partial<Record<CelebrationKind, Promise<void>>> = {};

function load(kinds: readonly CelebrationKind[]): void {
  if (!playerLoad) {
    playerLoad = import('lottie-web/build/player/lottie_light').then(
      (m) => { player = m.default; },
      (err: unknown) => { playerLoad = null; console.warn('Celebrations: the Lottie player did not load; the canvas confetti stands in.', err); },
    );
  }
  for (const kind of kinds) {
    if (fileLoad[kind]) continue;
    fileLoad[kind] = FILES[kind]().then(
      (m) => { files[kind] = m.default as LottieData; },
      (err: unknown) => { delete fileLoad[kind]; console.warn('Celebrations: ' + kind + ' did not load.', err); },
    );
  }
}

// Fetch the player and these files once the page has loaded and the browser is
// idle, so a returning visitor who starts one title from a milestone never
// competes with the startup.
export function prefetchCelebrations(kinds: readonly CelebrationKind[]): void {
  if (playerLoad && kinds.every(k => fileLoad[k])) return;
  const go = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => load(kinds), { timeout: 3000 });
    else setTimeout(() => load(kinds), 1500);
  };
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
}

export const celebrationReady = (kind: CelebrationKind): boolean => !!player && !!files[kind];

// CSS colors (hex, oklch(), anything) to 0–1 sRGB, through a 1-pixel canvas.
let probe: CanvasRenderingContext2D | null = null;
function srgb(color: string): [number, number, number] {
  if (!probe) probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!probe) return [0.5, 0.5, 0.5];
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#808080';
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

// A copy of the animation with each slot color swapped for the palette's.
function recolor(data: LottieData, palette: readonly string[]): LottieData {
  const cols = palette.map(srgb);
  const copy = structuredClone(data);
  const swap = (k: number[]): number[] => {
    const s = SLOTS.findIndex(c => Math.abs(c[0] - k[0]) < 0.003 && Math.abs(c[1] - k[1]) < 0.003 && Math.abs(c[2] - k[2]) < 0.003);
    if (s < 0 || !cols.length) return k;
    const c = cols[s % cols.length];
    return [c[0], c[1], c[2], k[3] ?? 1];
  };
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (!o || typeof o !== 'object') return;
    const node = o as { ty?: unknown; c?: { k?: unknown } };
    if ((node.ty === 'fl' || node.ty === 'st') && node.c && Array.isArray(node.c.k) && typeof node.c.k[0] === 'number') {
      node.c.k = swap(node.c.k as number[]);
    }
    Object.values(o).forEach(walk);
  };
  walk(copy);
  return copy;
}

// Play one burst in `layer` (a positioned element) with its origin at (x, y),
// mirrored left-right when `mirror` is set. Resolves when it has finished and
// removed itself.
export function playCelebration(kind: CelebrationKind, layer: HTMLElement, x: number, y: number,
  mirror: boolean, palette: readonly string[]): Promise<void> {
  const data = files[kind];
  if (!player || !data) return Promise.resolve();
  const [ox, oy] = ORIGIN[kind];
  const box = document.createElement('div');
  // Inline, not classes: Tailwind doesn't scan this file (src/index.css lists
  // the files it reads with @source).
  Object.assign(box.style, {
    position: 'absolute', pointerEvents: 'none', left: (x - ox) + 'px', top: (y - oy) + 'px', width: data.w + 'px', height: data.h + 'px',
    transformOrigin: ox + 'px ' + oy + 'px', transform: mirror ? 'scaleX(-1)' : '',
  });
  layer.appendChild(box);
  const anim: AnimationItem = player.loadAnimation({
    container: box, renderer: 'svg', loop: false, autoplay: true, animationData: recolor(data, palette),
  });
  // Pieces fly past the composition's edges; the layer clips them instead.
  // The SVG renderer clips its root group to the composition, so drop that.
  const svg = box.querySelector('svg');
  if (svg) {
    svg.style.overflow = 'visible';
    svg.querySelector(':scope > g[clip-path]')?.removeAttribute('clip-path');
  }
  return new Promise((done) => {
    let over = false;
    const end = () => { if (over) return; over = true; anim.destroy(); box.remove(); done(); };
    anim.addEventListener('complete', end);
    // In case the browser stops painting (a background tab) before it ends.
    setTimeout(end, 4000);
  });
}
