import React from 'react';
import type { Title } from '../types/catalog';

// The fallback when a poster is missing or fails to load (Notion "Replace
// the poster fallback art with something less generic", decision A ·
// Monogram): a solid field in the official poster's main colour, the title's
// initials in the display font, and the year. The same in dark and light,
// because the poster is art.

// The initials (up to three characters) from a title's main name, the part
// before ":":
//   - the first letter of each word; hyphens and joined capitals split
//     (Spider-Man → SM, WandaVision → WV); the, of, a, an, and, by and "Vol."
//     are skipped;
//   - a single-word main name adds the subtitle's first letter (Thor: The
//     Dark World → TD, Avengers: Doomsday → AD);
//   - a trailing number or season number is kept (Iron Man 2 → IM2, Loki:
//     Season 2 → L2), letters giving way to it within the three;
//   - punctuation is dropped (Thunderbolts* → T).
// Read from the English title, so a poster looks the same in every language.
const SKIP = new Set(['the', 'of', 'a', 'an', 'and', 'by', 'vol']);
function words(s: string): string[] {
  return s.replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/[\s-]+/)
    .flatMap((w) => w.split(/(?<=\p{Ll})(?=\p{Lu})/u)).filter(Boolean);
}
function monogram(name: string): string {
  let rest = name;
  let num = '';
  const season = rest.match(/\s*:?\s*Season\s+(\d+)\s*$/i);
  if (season) { num = season[1]; rest = rest.slice(0, season.index); }
  const colon = rest.indexOf(':');
  const main = colon === -1 ? rest : rest.slice(0, colon);
  const sub = colon === -1 ? '' : rest.slice(colon + 1);
  let ws = words(main).filter((w) => !SKIP.has(w.toLowerCase()));
  if (!num && ws.length && /^\d+$/.test(ws[ws.length - 1])) num = ws.pop() as string;
  let letters = ws.map((w) => w[0].toUpperCase());
  if (letters.length === 1) {
    const first = words(sub).find((w) => !SKIP.has(w.toLowerCase()) && !/^\d+$/.test(w));
    if (first) letters.push(first[0].toUpperCase());
  }
  letters = letters.slice(0, Math.max(1, 3 - num.length));
  return letters.join('') + num;
}

// The colour: the official poster's (tools/poster-colors.cjs), else the
// title's accent (a new title before the next media sync).
function posterColor(title: Title): string {
  const media = window.MEDIA;
  return (media && media.poster_color && media.poster_color[title.id]) || title.accent;
}

// The Monogram's colour (Andre, 2026-11-16: the posters' own colours were
// mostly navy, teal and maroon, so a row of fallbacks looked the same). Nine
// hues around the wheel (no yellow-green: it turns olive on the dark field),
// a fixed one per title from its place in release order, stepping four hues
// at a time so neighbours are always far apart.
// Fixed, not random: the same title looks the same on every visit and device.
// Muted, as the first version was (Andre, 2026-11-16: the saturated set was
// too loud). Dark: a deep field with light initials. Light: a near-white
// tile with coloured initials and a hairline edge in its hue (Andre's pick of
// three; pastel fields and the dark field both sat badly on the light page).
// The initials are toned down to about 3.4:1 (light) and 3.9:1 (dark) on
// their field in every hue: above the 3:1 for large text and graphics (they
// are artwork; the image is named after the title for screen readers).
// The poster's own colour stays the background while a real poster loads.
const MONO_HUES = [25, 60, 145, 185, 220, 255, 290, 325, 355];
function monoHue(title: Title): number {
  const i = window.TITLES ? window.TITLES.findIndex((t) => t.id === title.id) : -1;
  const n = i >= 0 ? i : [...title.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return MONO_HUES[(n * 4) % MONO_HUES.length];
}

function MonogramPoster({ title }: { title: Title }) {
  const text = monogram(title.title);
  return (
    // An image like the poster it stands in for, named the same way as that
    // poster's alt text; its letters and year are artwork, not text to read.
    // Sized from its own width (container units), so it reads the same from
    // a 32px thumbnail to the details. 2:3 when the box around it has no
    // height of its own. The centring sits on an inner layer, since the
    // thumbnail recipes set their first child's display.
    <div className="poster-mono @container relative size-full overflow-hidden bg-[oklch(0.955_0.018_var(--mh))] shadow-[inset_0_0_0_1px_oklch(0.85_0.04_var(--mh))] dark:bg-[oklch(0.33_0.06_var(--mh))] dark:shadow-none"
      role="img" aria-label={window.MCU_I18N.titleName(title)}
      style={{ '--mh': monoHue(title), aspectRatio: '2 / 3' } as React.CSSProperties}>
      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
        <span className="poster-mono-initials font-display leading-none tracking-[-0.02em] whitespace-nowrap text-[oklch(0.6_0.07_var(--mh))] dark:text-[oklch(0.66_0.06_var(--mh))]"
          // type-scale: art. The initials are drawn to the poster's width
          // (cqw), like the art they stand in for, not set as text.
          style={{ fontSize: text.length > 2 ? '40cqw' : '46cqw' }}>{text}</span>
      </span>
      <span aria-hidden="true" className="poster-mono-year absolute top-[max(6px,8.5cqw)] left-[max(6px,8.5cqw)] text-caption leading-none font-semibold text-black/45 tabular-nums dark:text-white/55 @max-[64px]:hidden">{title.year}</span>
    </div>
  );
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
// address, or the image fails) the Monogram above. The box takes the poster's
// colour while the image loads.
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
      <div className="poster-image-wrap" style={{width:'100%', height:'100%', position:'relative', background:`color-mix(in oklab, ${posterColor(title)} 35%, #121214)`}}>
        <img src={url} alt={window.MCU_I18N.titleName(title)} loading="lazy" onError={onError} style={{width:'100%', height:'100%', objectFit:'cover', display:'block'}}/>
      </div>
    );
  }
  return <MonogramPoster title={title}/>;
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
window.MCU_monogram = monogram;
window.Portrait = Portrait;
window.castPortrait = castPortrait;
window.performerPortrait = performerPortrait;

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { PosterArt, Portrait, castPortrait, performerPortrait, monogram };
