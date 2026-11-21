---
name: figma-tokens
description: 'Compare the Red Thread – Design System''s Figma variables, effect styles and text styles with the tokens in src/index.css and docs/design-tokens.md, and bring Figma''s changes into the code. Use when asked to "check tokens against Figma" (report only) or "sync tokens from Figma" (report, then update the code on a yes), at the Figma gate before a batch is pushed, and at the start of a build whose approved design changed a variable.'
---

# Figma ⇄ code check, part 1: tokens

Figma leads (docs/STANDARDS.md, "Figma"). This brings a variable changed in Figma
into the code without hand-copying values, and tells you when the two have
drifted. Two commands:

- **"check tokens against Figma"**: steps 1–3. Report only; change nothing.
- **"sync tokens from Figma"**: steps 1–5. Report, then update the code on
  the user's yes.

## 1. Read Figma

Needs the Figma MCP (`use_figma`; load the figma-use skill first). On the
**Red Thread – Design System** file, `P92ZRC9X0R6WoCmoB8MG8P`:

1. `create_session` with that file key (read-only description).
2. One `use_figma` call whose `code` is the **whole text** of
   `tools/figma/tokens-dump.js`, unchanged. It only reads.
3. Save the JSON it returns to a scratch file outside the repository (your
   scratchpad, or the system temp folder). It holds every variable per mode,
   the effect styles and the text styles.

## 2. Compare

```bash
node tools/figma/tokens-check.mjs <the saved file>
```

It parses `src/index.css` and works out every token per Figma mode (Light
is `:root`, Dark is `.dark`; Type's Phone mode is the 899px override; Size
steps' Large is the 84rem container step; the Grid modes are the min-width
queries), follows aliases, works out `color-mix()` and `calc()` the way a
browser does, and compares:

- **Values**: colors within 3/255 per channel; numbers within 0.01 (an
  opacity Figma holds as a percentage counts).
- **Aliases** by name: Figma `brand` → `red-55` must be `var(--red-55)` in
  the same block.
- **Missing on either side**: a variable whose code syntax names a token
  that doesn't exist; a code token with no variable.
- **Effect styles**: each `--elevation-*`, one style, or `Light/` and
  `Dark/` styles when the modes differ.
- **Text styles**: each `--text-*` role's size and line height.
- **docs/design-tokens.md**: every variable named there, alone or in a
  family (`neutral-*`, `` `spacing-0_5` … `spacing-16` ``).

It exits 0 with "No differences" when Figma and code agree, 1 otherwise.
Variables with no code syntax (the translucent tokens, the Typeface
weights) are Figma-only by design and only counted. Differences listed under
"Known, documented" are meant (the `KNOWN` list at the top of the script,
each with its reason); change that list only with Andre's OK.

## 3. Report

Give the user the report as it is: each difference with its Figma value,
its code value and the fix the script suggests. Say which side looks newer
when you can tell (a token added to code after the library was built is
code that's ahead; a value changed in Figma is Figma that's ahead). For
"check tokens against Figma", stop here.

## 4. Sync (after the user's yes)

Figma leads, so the code follows Figma:

- **Values and aliases**: edit `src/index.css` in the block the difference
  names (`:root` for Light, `.dark` for Dark, the media or container query
  for the other modes), keeping the file's format (an `oklch()` stays
  `oklch()`; the script's "fix in code" line gives the value). For a computed
  `color-mix()`, change its inputs, not the mix.
- **New variables**: add the token in the same place, with the same name
  (no `--` in Figma), and its row in `docs/design-tokens.md`.
- **Mixes go stale in Figma.** Figma stores a `color-mix()` token
  (`progress-track`, the `*-tint`, `*-border` and `*-text` roles) as a plain
  value, so a changed primitive leaves its mixes behind in Figma while the
  code follows by itself. Once the mix's inputs agree, the check prints the
  value Figma should hold; updating it is a write to the library (the
  user's OK, then Andre publishes).
- **Code ahead of Figma** (a token or style Figma doesn't have): don't
  delete it from the code. Ask whether Figma should get it (that's a write
  to the library, so it needs the user's OK and Andre publishes after).
- A renamed token is a rename in every file that uses it (search the tree),
  and in the QA checks.

## 5. Check the result

1. Run step 2 again: it must say "No differences" (or list only Known ones).
2. `bash qa/quick.sh test-contrast` (it also runs the checks `qa/checks.json`
   lists for `src/index.css`), and `bash qa/quick.sh test-typescale` if a
   type token changed.
3. Look at the change in the app, Light and Dark, desktop and phone, and
   say on the ticket what you checked.

## Limits

- `tailwind/shadow-*` effect styles are Tailwind's own values and aren't
  compared.
- Colors that Chrome can't paint exactly (out of sRGB) are clipped the same
  way the browser does; the 3/255 tolerance absorbs rounding.
- Only the Typeface collection's live mode (Live · Inter) is compared; the
  other modes are the Theme lab's candidates.
