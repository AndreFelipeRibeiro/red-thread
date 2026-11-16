import React from 'react';
import type { Title } from '../types/catalog';

// Abstract original poster art — no Marvel imagery, just stylized geometric compositions
// Generates a deterministic SVG per title from its accent color and title hash

function hashCode(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function darken(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.floor(r * (1 - amt)));
  g = Math.max(0, Math.floor(g * (1 - amt)));
  b = Math.max(0, Math.floor(b * (1 - amt)));
  return `rgb(${r},${g},${b})`;
}

function lighten(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, Math.floor(r + (255 - r) * amt));
  g = Math.min(255, Math.floor(g + (255 - g) * amt));
  b = Math.min(255, Math.floor(b + (255 - b) * amt));
  return `rgb(${r},${g},${b})`;
}

// Image addresses that failed to load this session. Shared, so a card that
// scrolls away and back (or a remount) shows the fallback at once instead of
// trying the broken address again.
const failedImages = new Set<string>();
function useImageFallback(url: string | null | undefined) {
  const [failed, setFailed] = React.useState(() => !!url && failedImages.has(url));
  React.useEffect(() => { setFailed(!!url && failedImages.has(url)); }, [url]);
  const onError = React.useCallback(() => { if (url) failedImages.add(url); setFailed(true); }, [url]);
  // `as const` so callers get [boolean, handler] rather than a union array.
  return [failed, onError] as const;
}

// A real poster when media metadata has one and it loads; otherwise (no
// address, or the image fails) the generated art below.
function PosterArt({ title }: { title: Title }) {
  const media = window.MEDIA;
  const local = media && media.local_posters && media.local_posters[title.id];
  const path = media && media.posters && media.posters[title.id];
  const url = (local || path)
    ? (window.mediaURL ? window.mediaURL('p', title.id, local || (media.poster_base + path)) : (local || (media.poster_base + path)))
    : null;
  const [failed, onError] = useImageFallback(url);
  if (url && !failed) {
    return (
      <div className="poster-image-wrap" style={{width:'100%', height:'100%', position:'relative', background:'var(--muted)'}}>
        <img src={url} alt={window.MCU_I18N.titleName(title)} loading="lazy" onError={onError} style={{width:'100%', height:'100%', objectFit:'cover', display:'block'}}/>
      </div>
    );
  }
  return <GeneratedPoster title={title}/>;
}

// 6 abstract poster styles, picked deterministically per title
function GeneratedPoster({ title }: { title: Title }) {
  const h = hashCode(title.id);
  const variant = h % 6;
  const accent = title.accent;
  const dark = darken(accent, 0.55);
  const mid = darken(accent, 0.25);
  const light = lighten(accent, 0.3);
  const W = 200, H = 300; // 2:3, the poster box everywhere
  const gid = 'g_' + title.id.replace(/[^a-z0-9]/gi, '');

  const initial = title.title.split(/[: ]/)[0].slice(0, 1).toUpperCase();
  const phaseRoman = ['I','II','III','IV','V','VI'][title.phase - 1];

  let art;
  if (variant === 0) {
    // concentric rings
    art = (
      <g>
        {[0,1,2,3,4].map(i => (
          <circle key={i} cx={W/2} cy={H*0.42} r={20 + i*22} fill="none" stroke={accent} strokeWidth={1.2} opacity={0.18 + i*0.12}/>
        ))}
        <circle cx={W/2} cy={H*0.42} r={14} fill={light}/>
      </g>
    );
  } else if (variant === 1) {
    // diagonal beams
    art = (
      <g>
        {[0,1,2,3,4,5].map(i => (
          <polygon key={i} points={`0,${i*40} ${W},${i*40 - 60} ${W},${i*40 - 40} 0,${i*40 + 20}`} fill={accent} opacity={0.08 + (i%2)*0.1}/>
        ))}
        <circle cx={W*0.7} cy={H*0.35} r={42} fill={dark} stroke={light} strokeWidth={1.5}/>
      </g>
    );
  } else if (variant === 2) {
    // shattered grid
    art = (
      <g>
        {Array.from({length: 14}).map((_, i) => {
          const r = ((h + i*97) % 100) / 100;
          const x = (i % 5) * 40 + 4;
          const y = Math.floor(i / 5) * 50 + 20;
          return <rect key={i} x={x} y={y} width={36 + r*4} height={42} fill={accent} opacity={0.05 + r*0.25} transform={`rotate(${(r-0.5)*8} ${x+18} ${y+20})`}/>;
        })}
      </g>
    );
  } else if (variant === 3) {
    // city skyline silhouette
    art = (
      <g>
        <rect x="0" y="0" width={W} height={H*0.55} fill={`url(#${gid}_sky)`}/>
        <circle cx={W*0.75} cy={H*0.3} r={28} fill={light} opacity={0.85}/>
        {Array.from({length: 18}).map((_, i) => {
          const bh = 30 + ((h + i*47) % 80);
          return <rect key={i} x={i*12} y={H*0.55 - bh} width={11} height={bh + H*0.5} fill={dark}/>;
        })}
      </g>
    );
  } else if (variant === 4) {
    // radial burst
    art = (
      <g>
        {Array.from({length: 24}).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const x2 = W/2 + Math.cos(a) * 200;
          const y2 = H*0.42 + Math.sin(a) * 200;
          return <line key={i} x1={W/2} y1={H*0.42} x2={x2} y2={y2} stroke={accent} strokeWidth={1} opacity={0.15 + (i%3)*0.08}/>;
        })}
        <circle cx={W/2} cy={H*0.42} r={36} fill={dark} stroke={light} strokeWidth={2}/>
      </g>
    );
  } else {
    // stacked horizontal bands
    art = (
      <g>
        {[0,1,2,3,4,5,6,7].map(i => (
          <rect key={i} x="0" y={i*22 + 30} width={W} height={14} fill={accent} opacity={0.08 + ((h+i)%5)*0.06}/>
        ))}
        <polygon points={`${W/2},40 ${W*0.78},${H*0.38} ${W/2},${H*0.55} ${W*0.22},${H*0.38}`} fill={light} opacity="0.85"/>
      </g>
    );
  }

  return (
    // An image like the poster it stands in for, named the same way as that
    // poster's alt text; its letters are artwork, not text to read out.
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" width="100%" height="100%"
      role="img" aria-label={window.MCU_I18N.titleName(title)}>
      <defs>
        <linearGradient id={`${gid}_bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={dark}/>
          <stop offset="100%" stopColor="#0a0c14"/>
        </linearGradient>
        <linearGradient id={`${gid}_sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={mid}/>
          <stop offset="100%" stopColor={dark}/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill={`url(#${gid}_bg)`}/>
      {art}
      {/* big initial */}
      <text x={W/2} y={H*0.78} textAnchor="middle" fontFamily="'Bebas Neue', Impact, sans-serif" fontSize="120" fill={light} opacity="0.18" letterSpacing="-4" aria-hidden="true">{initial}</text>
      {/* phase roman numeral */}
      <text x={W - 10} y={H - 12} textAnchor="end" fontFamily="ui-monospace, monospace" fontSize="10" fill={light} opacity="0.55" letterSpacing="2" aria-hidden="true">PHASE {phaseRoman}</text>
      <rect x="0" y="0" width={W} height={H} fill="none" stroke={light} strokeOpacity="0.08" strokeWidth="1"/>
    </svg>
  );
}

// A cast portrait: the photo, or the character's initials if there is none
// or it fails to load. The surrounding row already names the character.
function Portrait({ url, alt, initials }: { url?: string | null; alt: string; initials: string }) {
  const [failed, onError] = useImageFallback(url);
  return url && !failed
    ? <img src={url} alt={alt} loading="lazy" onError={onError}/>
    : <span aria-hidden="true">{initials}</span>;
}

// Which face belongs beside a cast row. A character's portrait is the default
// performer's, so a part that changed hands must not reuse it: Iron Man credits
// Terrence Howard and must not show Don Cheadle's photo under his name. Where
// no portrait is known for the credited performer, this returns null and
// Portrait falls back to initials — a plain row that is right beats a face that
// is confidently wrong.
function castPortrait(title: Title, charId: string) {
  const media = window.MEDIA;
  if (!media) return null;
  const character = window.CHARACTERS && window.CHARACTERS[charId];
  const credited = window.MCU_credit ? window.MCU_credit(title, charId) : (character && character.actor);
  const isDefault = !character || credited === character.actor;
  const path = isDefault
    ? (media.actors && media.actors[charId])
    : (media.performers && media.performers[credited]);
  if (!path) return null;
  const url = media.profile_base + path;
  return window.mediaURL ? window.mediaURL('a', isDefault ? charId : credited, url) : url;
}

// The face for a pinned subject. When the representative character's default
// performer *is* this person, their own portrait already shows them — Jonathan
// Majors pinned as a performer still gets Kang's photo, which is his face.
// Otherwise it has to come from the performer map, or not at all.
function performerPortrait(name: string, repCharId: string) {
  const media = window.MEDIA;
  if (!media) return null;
  const character = window.CHARACTERS && window.CHARACTERS[repCharId];
  const own = character && character.actor === name;
  const path = own
    ? (media.actors && media.actors[repCharId])
    : (media.performers && media.performers[name]);
  if (!path) return null;
  const url = media.profile_base + path;
  return window.mediaURL ? window.mediaURL('a', own ? repCharId : name, url) : url;
}

window.PosterArt = PosterArt;
window.Portrait = Portrait;
window.castPortrait = castPortrait;
window.performerPortrait = performerPortrait;

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { PosterArt, Portrait, castPortrait, performerPortrait };
