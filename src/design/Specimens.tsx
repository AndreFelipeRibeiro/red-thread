// Every shadcn primitive the app uses, in each variant, size and state, one
// per `[data-spec]` box (Notion "Build the Red Thread component library in
// Figma"). tools/figma/capture-dom.js reads each box's first element into a
// spec, and tools/figma/build.js turns it into a variant of a Figma component
// set; the spec's name is "Component|Property=value, Property=value".
//
// Development only: tools/figma/specimens.html is not a build input, so the
// site never ships it. Primitives the app doesn't use (Card, Checkbox,
// Dialog, Dropdown menu, Scroll area, Sheet, Tabs, Toggle, Tooltip) are left
// out on purpose: the library mirrors what the app draws.
import React from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

const VARIANTS = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const;
const SIZES = ['xs', 'sm', 'default', 'lg'] as const;
const ICON_SIZES = ['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const;

function Spec({ name, children }: { name: string; children: React.ReactNode }) {
  return <div data-spec={name} className="inline-flex p-3">{children}</div>;
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-b border-border py-4">
      <h2 className="text-label font-semibold text-muted-foreground">{title}</h2>
      <div className="flex flex-wrap items-start gap-1">{children}</div>
    </section>
  );
}

export default function Specimens() {
  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <Row title="Button">
        {VARIANTS.map((v) => SIZES.map((s) => (
          <Spec key={v + s} name={`Button|Variant=${v}, Size=${s}`}><Button variant={v} size={s}>Button</Button></Spec>
        )))}
      </Row>
      <Row title="Button with icon">
        {VARIANTS.map((v) => (
          <Spec key={v} name={`Button|Variant=${v}, Size=default, Icon=start`}><Button variant={v}><PlusIcon aria-hidden="true" /> Button</Button></Spec>
        ))}
      </Row>
      <Row title="Icon button">
        {(['default', 'outline', 'secondary', 'ghost'] as const).map((v) => ICON_SIZES.map((s) => (
          <Spec key={v + s} name={`Icon button|Variant=${v}, Size=${s}`}><Button variant={v} size={s} aria-label="Add"><PlusIcon aria-hidden="true" /></Button></Spec>
        )))}
      </Row>
      <Row title="Badge">
        {VARIANTS.map((v) => <Spec key={v} name={`Badge|Variant=${v}`}><Badge variant={v}>Badge</Badge></Spec>)}
      </Row>
      <Row title="Input">
        <Spec name="Input|State=placeholder"><Input placeholder="Search titles" className="w-64" /></Spec>
        <Spec name="Input|State=filled"><Input defaultValue="Iron Man" className="w-64" /></Spec>
        <Spec name="Input|State=disabled"><Input placeholder="Search titles" disabled className="w-64" /></Spec>
        <Spec name="Input|State=invalid"><Input defaultValue="Iron Man" aria-invalid className="w-64" /></Spec>
      </Row>
      <Row title="Label">
        <Spec name="Label"><Label>Label</Label></Spec>
      </Row>
      <Row title="Switch">
        {(['default', 'sm'] as const).map((s) => [true, false].map((on) => (
          <Spec key={s + on} name={`Switch|Size=${s}, Checked=${on ? 'on' : 'off'}`}><Switch size={s} defaultChecked={on} aria-label="Switch" /></Spec>
        )))}
      </Row>
      <Row title="Radio">
        <RadioGroup defaultValue="a" className="flex gap-4" aria-label="Radio">
          <Spec name="Radio|Checked=on"><RadioGroupItem value="a" aria-label="On" /></Spec>
          <Spec name="Radio|Checked=off"><RadioGroupItem value="b" aria-label="Off" /></Spec>
        </RadioGroup>
      </Row>
      <Row title="Select">
        {(['default', 'sm'] as const).map((s) => (
          <Spec key={s} name={`Select trigger|Size=${s}`}>
            <Select defaultValue="en">
              <SelectTrigger size={s} aria-label="Language"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
              </SelectContent>
            </Select>
          </Spec>
        ))}
      </Row>
      <Row title="Select, open">
        <div data-spec-open="Select content" className="h-40">
          <Select defaultValue="en" defaultOpen>
            <SelectTrigger aria-label="Language open"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Row>
      <Row title="Popover, open">
        <div className="h-48">
          <Popover defaultOpen>
            <PopoverTrigger render={<Button variant="outline">Open</Button>} />
            <PopoverContent>
              <PopoverHeader>
                <PopoverTitle>Popover title</PopoverTitle>
                <PopoverDescription>A line of supporting text.</PopoverDescription>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
        </div>
      </Row>
      <Row title="Separator">
        <Spec name="Separator"><div className="w-64"><Separator /></div></Spec>
      </Row>
    </main>
  );
}
