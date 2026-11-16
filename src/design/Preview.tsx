// The V4 design-system preview. Everything here is built from the shadcn
// components in src/components/ui and the tokens in src/index.css — no raw
// colours, so what you see is what the token file actually produces.
//
// The three app surfaces at the bottom are the "first proof" the design-system
// ticket asks for. They are static compositions, not wired interactions: the
// Escape ladder, the modeless drawer and the phone sheet's history entry are
// Phase 4 work, and faking them here would prove nothing.
import { Moon, Sun, Monitor, Check, Plus, Star, Clapperboard } from 'lucide-react';
import { useTheme, type ThemeChoice } from '@/theme';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from '@/components/ui/card';

const PHASES = [1, 2, 3, 4, 5, 6];

// Surfaces the design system actually paints text on. There is deliberately
// no destructive row: Vega has no --destructive-foreground, because it never
// fills a surface with --destructive — it uses it as text over a 10% tint of
// itself, which the Controls section below shows. Pairing it with a token
// that does not exist made the swatch inherit near-black text on red, at
// 2.5:1 (qa/test-contrast.js).
const SURFACE_TOKENS = [
  ['background', 'foreground'], ['card', 'card-foreground'],
  ['popover', 'popover-foreground'], ['primary', 'primary-foreground'],
  ['secondary', 'secondary-foreground'], ['muted', 'muted-foreground'],
  ['accent', 'accent-foreground'],
];

// Three buttons rather than a switch, because the mechanism has three states
// and "Auto" is the one every visitor starts in. This is the preview's own
// control for looking at both themes; what the app offers is the Dark/Light
// ticket's call.
const CHOICES: Array<[ThemeChoice, string, typeof Sun]> = [
  ['light', 'Light', Sun],
  ['dark', 'Dark', Moon],
  ['system', 'Auto', Monitor],
];

function ThemeControl() {
  const [choice, , setChoice] = useTheme();
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Theme">
      {CHOICES.map(([value, label, Icon]) => (
        <Button
          key={value}
          variant={choice === value ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setChoice(value)}
          aria-pressed={choice === value}
        >
          <Icon aria-hidden="true" />
          {label}
        </Button>
      ))}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-title font-semibold tracking-tight">{title}</h2>
        {hint && <p className="text-body text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// A Spatial card, rebuilt on the new components. V3 draws these at 170×270.
function SpatialCard({ phase = 1, seen = false }) {
  return (
    <Card className="w-[170px] overflow-hidden p-0 gap-0">
      <div
        className="h-[150px] bg-muted flex items-center justify-center border-b"
        style={{ borderBottomColor: `var(--phase-${phase})`, borderBottomWidth: 2 }}
      >
        <Clapperboard className="size-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="p-3 space-y-2">
        {/* The phase as the app shows it: a dot in its color beside plain
            text (phase colors are not text colors; Phase 4 on dark is
            4.21:1). */}
        <div className="flex items-center gap-1.5 font-mono text-caption uppercase tracking-wider text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: `var(--phase-${phase})` }} aria-hidden="true" />
          Phase {phase}
        </div>
        <div className="text-body font-medium leading-tight">Iron Man</div>
        <div className="font-mono text-label text-muted-foreground">2008 · Film</div>
        <div className="flex gap-1 pt-1">
          <Button size="xs" variant={seen ? 'default' : 'outline'} className="flex-1">
            <Check aria-hidden="true" /> Seen
          </Button>
          <Button size="icon-xs" variant="outline" aria-label="Add to watchlist">
            <Plus aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DetailsDrawer() {
  return (
    <Card className="w-full max-w-[380px]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            style={{ color: 'var(--phase-1)', borderColor: 'var(--phase-1)' }}
          >
            Phase 1
          </Badge>
          <Badge variant="secondary">Film</Badge>
        </div>
        <CardTitle className="text-title">Iron Man</CardTitle>
        <CardDescription>2008 · Directed by Jon Favreau</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-body text-muted-foreground">
          A weapons manufacturer builds an armoured suit and changes course.
          The film that starts the whole chronology.
        </p>
        <Separator />
        <div className="space-y-2">
          <div className="font-mono text-label uppercase tracking-wider text-muted-foreground">
            Cast
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['Tony Stark', 'Rhodey', 'Pepper Potts', 'Happy Hogan'].map((n) => (
              <Badge key={n} variant="secondary" className="font-normal">{n}</Badge>
            ))}
          </div>
        </div>
        <Separator />
        <div className="flex items-center gap-3 text-body">
          <span className="inline-flex items-center gap-1 font-mono">
            <Star className="size-3.5" aria-hidden="true" /> 7.9
          </span>
          <span className="text-muted-foreground">IMDb</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button className="flex-1"><Check aria-hidden="true" /> Mark as seen</Button>
        <Button variant="outline">Watchlist</Button>
      </CardFooter>
    </Card>
  );
}

function PhoneSheet() {
  return (
    <div className="w-[320px] rounded-xl border bg-popover p-1 shadow-lg">
      <div className="mx-auto my-2 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
      <div className="space-y-3 p-3">
        <div className="text-body font-semibold">Filters</div>
        <Separator />
        {['Released only', 'Hide seen', 'Group by phase'].map((label, i) => (
          <div key={label} className="flex items-center justify-between py-1">
            <span className="text-body">{label}</span>
            <Switch defaultChecked={i === 0} aria-label={label} />
          </div>
        ))}
        <Separator />
        <Button className="w-full">Show 64 titles</Button>
      </div>
    </div>
  );
}

export default function Preview() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
        {/* Wraps rather than squeezes: at 375px the title and the three theme
            buttons do not fit on one line, and a four-line heading beside a
            crowded control is worse than two rows. */}
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0 basis-full sm:basis-auto">
            <h1 className="text-heading font-semibold tracking-tight">
              Red Thread — V4 design system
            </h1>
            <p className="text-label text-muted-foreground">
              shadcn/ui on Base UI · Vega · Neutral
            </p>
          </div>
          <ThemeControl />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-10">
        <Section
          title="Surface tokens"
          hint="Straight from src/index.css. Both themes come from the same names."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SURFACE_TOKENS.map(([bg, fg]) => (
              <div key={bg} className="rounded-lg border overflow-hidden">
                <div
                  className="flex h-16 items-center justify-center text-label font-mono"
                  style={{ background: `var(--${bg})`, color: `var(--${fg})` }}
                >
                  Aa
                </div>
                <div className="px-2 py-1.5 font-mono text-caption text-muted-foreground">
                  --{bg}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Phase colours"
          hint="Now tokens rather than PHASE_COLORS in app.jsx. The light values are darkened so they hold WCAG AA on a light background; dark keeps V3's."
        >
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {PHASES.map((n) => (
              <div key={n} className="rounded-lg border overflow-hidden">
                <div className="h-12" style={{ background: `var(--phase-${n})` }} />
                <div className="px-2 py-1.5 font-mono text-caption text-muted-foreground">
                  --phase-{n}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Controls">
          <div className="flex flex-wrap items-center gap-2">
            {(['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const).map((v) => (
              <Button key={v} variant={v}>{v}</Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['default', 'secondary', 'outline', 'destructive'] as const).map((v) => (
              <Badge key={v} variant={v}>{v}</Badge>
            ))}
            <Switch defaultChecked aria-label="Example switch" />
          </div>
        </Section>

        <Section
          title="The three surfaces"
          hint="Static compositions, not wired interactions — the Escape ladder, the modeless drawer and the sheet's history entry are Phase 4 work."
        >
          <div className="flex flex-wrap items-start gap-8">
            <div className="space-y-2">
              <div className="font-mono text-label uppercase tracking-wider text-muted-foreground">
                Spatial card
              </div>
              <div className="flex gap-3">
                <SpatialCard phase={1} />
                <SpatialCard phase={4} seen />
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-mono text-label uppercase tracking-wider text-muted-foreground">
                Details drawer
              </div>
              <DetailsDrawer />
            </div>
            <div className="space-y-2">
              <div className="font-mono text-label uppercase tracking-wider text-muted-foreground">
                Phone sheet
              </div>
              <PhoneSheet />
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
