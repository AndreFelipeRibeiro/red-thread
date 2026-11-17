import { createCn } from 'cn/config';

// The type roles and art sizes (src/index.css, @theme: --text-*), so class
// merging knows `text-caption` is a font size and not a text color: without
// this, cn('text-caption', 'text-muted-foreground') kept only the color.
// qa/test-typescale.js checks this list against the stylesheet.
export const TEXT_SIZES = [
  'display', 'title', 'heading', 'body', 'label', 'caption',
  'card-title', 'card-title-lg', 'card-title-pop', 'card-title-ov', 'card-meta', 'card-meta-lg', 'card-meta-pop', 'card-micro',
  'tag', 'numeral', 'numeral-word',
];

export const cn = createCn({ extend: { classGroups: { 'font-size': [{ text: TEXT_SIZES }] } } });
