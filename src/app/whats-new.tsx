import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

// What's new (Notion "What's new: a changelog in the app, starting with V1 to
// V5"): what each major release brought, in plain words for visitors (not the
// repo's CHANGELOG.md, which is for us). Opened from About, in place of its
// content (Back, Escape or × step back to About, one layer per press). Newest
// first; a minor release can add a line under the current version.
//
// The copy is the ticket's draft from the git tags and CHANGELOG.md, for
// Andre to edit. Version 1 waits for his date and lines.

type Localized = { en: string; 'pt-BR': string };
export type Release = { version: number; month: string; items: Localized[] };

export const RELEASES: Release[] = [
  { version: 5, month: '2026-11', items: [
    { en: 'Three places to go: Connections, Titles and Guides, with a bottom bar on phones',
      'pt-BR': 'Três lugares para ir: Conexões, Títulos e Guias, com uma barra embaixo no celular' },
    { en: "26 guides to follow, from the Infinity Saga to before Secret Wars, with Up next from the guide you're following",
      'pt-BR': '26 guias para seguir, da Saga do Infinito até antes de Guerras Secretas, com o A seguir vindo do guia que você segue' },
    { en: "Title details redone: cast, connections, where to watch and the guides a title is in, plus following a character's trail",
      'pt-BR': 'Detalhes do título refeitos: elenco, conexões, onde assistir e os guias em que o título está, além de seguir a trilha de um personagem' },
    { en: 'How long every title runs, and how much of a guide is left',
      'pt-BR': 'A duração de cada título, e quanto falta de um guia' },
    { en: 'New sort and filters, swipe to mark a title seen on phones, and a light mode designed on purpose',
      'pt-BR': 'Nova ordenação e filtros, deslizar para marcar um título como visto no celular, e um modo claro pensado de propósito' },
  ] },
  { version: 4, month: '2026-11', items: [
    { en: 'A new name, Red Thread, and a new home at redthread.tv',
      'pt-BR': 'Um novo nome, Red Thread, e um novo endereço: redthread.tv' },
    { en: 'A new look, built on a proper design system',
      'pt-BR': 'Um visual novo, construído sobre um design system de verdade' },
    { en: 'Light, dark and automatic themes, and a text size setting',
      'pt-BR': 'Temas claro, escuro e automático, e um ajuste de tamanho do texto' },
    { en: 'Share a title, a character or a guide, with its own preview card',
      'pt-BR': 'Compartilhe um título, um personagem ou um guia, com um card de prévia próprio' },
    { en: 'The newly announced Avengers: Doomsday cast added to the catalog',
      'pt-BR': 'O elenco recém-anunciado de Vingadores: Doomsday no catálogo' },
  ] },
  { version: 3, month: '2026-10', items: [
    { en: 'Sign in with Google to keep your list on every device',
      'pt-BR': 'Entre com o Google para ter sua lista em todos os seus aparelhos' },
    { en: "Mark what you've seen, keep a Watchlist and see your progress by phase",
      'pt-BR': 'Marque o que já viu, monte sua lista para assistir e veja seu progresso por fase' },
    { en: 'Up next, curated watch guides and "What have you seen?"',
      'pt-BR': 'A seguir, guias para assistir e "O que você já viu?"' },
    { en: 'Where to watch, by country',
      'pt-BR': 'Onde assistir, por país' },
    { en: 'English and Portuguese, and story order alongside release order',
      'pt-BR': 'Inglês e português, e a ordem da história ao lado da ordem de lançamento' },
  ] },
  { version: 2, month: '2026-08', items: [
    { en: 'The connections canvas: every title as a card, linked by the characters they share',
      'pt-BR': 'O mapa de conexões: cada título é um card, ligado aos outros pelos personagens em comum' },
    { en: '64 titles with character variants and cast, posters and cast photos from TMDB',
      'pt-BR': '64 títulos com variantes de personagens e elenco, pôsteres e fotos do elenco do TMDB' },
    { en: 'Search by character or actor; Grid, List and Spatial views',
      'pt-BR': 'Busca por personagem ou ator; visualizações em grade, lista e espacial' },
  ] },
];

/** "November 2026", in the current language. */
export function releaseMonth(month: string, lang: string): string {
  const [y, m] = month.split('-').map(Number);
  const s = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function WhatsNew({ titleId, onBack }: { titleId?: string; onBack: () => void }) {
  const { tr, lang } = window.useI18n();
  const headRef = React.useRef<HTMLHeadingElement>(null);
  // Arriving here moves focus to the heading, so screen readers say where
  // they are and Tab carries on from the top.
  React.useEffect(() => { headRef.current?.focus(); }, []);
  const L = (x: Localized) => x[lang as keyof Localized] || x.en;
  return (
    <div className="about whats-new text-body text-foreground">
      <Button variant="ghost" size="sm" className="wn-back -ml-2 gap-1 px-2 text-muted-foreground" onClick={onBack}>
        <ChevronLeftIcon aria-hidden="true"/>{tr('about.title')}
      </Button>
      <h2 id={titleId} ref={headRef} tabIndex={-1} className="about-title mt-2 text-title leading-tight font-semibold tracking-tight outline-none in-[.about-dialog]:text-display-sm">{tr('news.title')}</h2>
      <ol className="wn-list mt-4 flex flex-col">
        {RELEASES.map((r, i) => (
          <li key={r.version} className={cn('wn-release py-4', i > 0 && 'border-t')}>
            <h3 className="wn-version flex flex-wrap items-baseline gap-x-2 text-heading font-semibold">
              {tr('news.version', { n: r.version })}
              <span className="text-label font-normal text-muted-foreground">{releaseMonth(r.month, lang)}</span>
              {i === 0 && <span className="wn-current rounded-full bg-(--brand)/10 px-2 py-0.5 text-caption font-semibold text-(--brand-text)">{tr('news.current')}</span>}
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5 text-body leading-snug text-muted-foreground">
              {r.items.map((it, j) => <li key={j} className="relative max-w-[60ch] pl-4 text-pretty before:absolute before:top-[.6em] before:left-1 before:size-[5px] before:rounded-full before:bg-muted-foreground/50 before:content-['']">{L(it)}</li>)}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
