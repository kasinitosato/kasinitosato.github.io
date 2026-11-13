// Draws the 1200 x 630 link preview pictures (the image that shows up when you
// paste a link into LinkedIn, iMessage, Slack, an application form and so on).
// The text and photos for each page come from src/lib/og.ts.
//
// Each picture is a still of the site itself:
//   - Home: the Lanakila Express hero, with the name in the serif, like the home page
//   - Project, experience and skill pages: the page's photo under the same graphite shade
//   - Plain pages (Resume, Contact...): the grained paper page head
// Colors match src/styles/global.css. The fonts are fixed cuts of the site's fonts
// (Newsreader at its display size, Archivo, IBM Plex Mono), saved in src/assets/og-fonts/
// because the picture drawer can't read the variable font files the site uses.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import satori from 'satori';
import sharp from 'sharp';
import type { OgPage } from './og';

const W = 1200;
const H = 630;
const M = 64; // margin around the edge, like the site's page margin
const C = {
  ink: '#1a1918',
  charcoal: '#2f2d2a',
  steel: '#5e5a53',
  mist: '#d4ccbf',
  paper: '#f3efe7',
  graphite: '#151515',
  onDark: '#f3efe7',
  onDarkSoft: '#a8a59e',
};

const require = createRequire(import.meta.url);
const local = (file: string) => fs.readFileSync(path.resolve(process.cwd(), 'src/assets/og-fonts', file));
type Font = { name: string; data: Buffer; weight: 400 | 600 | 700; style: 'normal' };
let fonts: Font[] | undefined;
const loadFonts = () =>
  (fonts ??= [
    { name: 'Newsreader', data: local('newsreader-display-360.ttf'), weight: 400, style: 'normal' },
    { name: 'Archivo', data: local('archivo-400.ttf'), weight: 400, style: 'normal' },
    { name: 'Archivo', data: local('archivo-650.ttf'), weight: 600, style: 'normal' },
    { name: 'Archivo Wide', data: local('archivo-wide-700.ttf'), weight: 700, style: 'normal' },
    { name: 'Plex Mono', data: fs.readFileSync(require.resolve('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff')), weight: 400, style: 'normal' },
  ]);

// A tiny helper so the layouts below read like HTML
type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, ...children: (Node | string | false | undefined)[]): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children: children.filter(Boolean) },
});
const img = (src: string, width: number, height: number, style: Record<string, unknown> = {}): Node => ({
  type: 'img',
  props: { src, width, height, style: { width, height, ...style } },
});
const fill = { position: 'absolute', top: 0, left: 0, width: W, height: H };

// The original file behind an imported photo
const fileOf = (image: ImageMetadata) => {
  const p = (image as ImageMetadata & { fsPath?: string }).fsPath;
  if (p && fs.existsSync(p)) return p;
  const dev = image.src.match(/^\/@fs(\/[^?]+)/);
  if (dev && fs.existsSync(decodeURIComponent(dev[1]))) return decodeURIComponent(dev[1]);
  throw new Error(`Link preview: could not find the file for the photo ${image.src}`);
};

// Crop a photo to exactly w x h, keeping the part named by `position` ('50% 12%' = near the top)
async function photo(image: ImageMetadata, w: number, h: number, position = '50% 50%') {
  const { data, info } = await sharp(fileOf(image)).rotate().toBuffer({ resolveWithObject: true });
  const scale = Math.max(w / info.width, h / info.height);
  const rw = Math.max(w, Math.round(info.width * scale));
  const rh = Math.max(h, Math.round(info.height * scale));
  const [px, py] = position.split(/\s+/).map((v) => Math.min(1, Math.max(0, parseFloat(v) / 100)));
  const out = await sharp(data)
    .resize(rw, rh)
    .extract({ left: Math.round((rw - w) * (px ?? 0.5)), top: Math.round((rh - h) * (py ?? 0.5)), width: w, height: h })
    .jpeg({ quality: 86 })
    .toBuffer();
  return `data:image/jpeg;base64,${out.toString('base64')}`;
}

const sizeFor = (text: string, sizes: [number, number][]) => sizes.find(([max]) => text.length <= max)?.[1] ?? sizes[sizes.length - 1][1];

// The home hero's shade: dark at the bottom and left where the words sit, lighter through the middle
const heroShade = el('div', {
  ...fill,
  backgroundImage:
    'linear-gradient(0deg, rgba(21,21,21,0.92) 0%, rgba(21,21,21,0.55) 42%, rgba(21,21,21,0.15) 72%, rgba(21,21,21,0.4) 100%), ' +
    'linear-gradient(90deg, rgba(21,21,21,0.6) 0%, rgba(21,21,21,0) 62%)',
});

// The serif headline, set light and tight like the site's h1
const serif = (text: string, size: number, color: string, maxWidth = W - M * 2) =>
  el('div', { fontFamily: 'Newsreader', fontSize: size, lineHeight: 0.96, letterSpacing: size * -0.03, color, maxWidth }, text);
// The header's wide capital wordmark
const wordmark = (color: string) =>
  el('div', { fontFamily: 'Archivo Wide', fontWeight: 700, fontSize: 21, letterSpacing: 0.5, textTransform: 'uppercase', color }, 'Kasin Ito-Sato');
// Mono labels, the way the site prints captions and addresses
const mono = (text: string, color: string, size = 19) =>
  el('div', { fontFamily: 'Plex Mono', fontSize: size, letterSpacing: 0.4, color }, text);

// Home: the Lanakila Express hero, exactly as the home page opens
async function homeLayout(page: OgPage) {
  const bg = page.photos[0] ? await photo(page.photos[0].image, W, H, page.photos[0].position ?? '50% 62%') : undefined;
  return el(
    'div',
    { width: W, height: H, position: 'relative', background: C.graphite, fontFamily: 'Archivo' },
    bg && img(bg, W, H, { position: 'absolute', top: 0, left: 0 }),
    heroShade,
    el(
      'div',
      { position: 'absolute', left: M, right: M, bottom: 56, flexDirection: 'column' },
      serif('Kasin Ito-Sato', 136, C.onDark),
      el('div', { marginTop: 22, fontSize: 38, fontWeight: 600, color: C.onDark, lineHeight: 1.2 }, 'Mechanical Engineer'),
      el('div', { marginTop: 4, fontSize: 30, fontWeight: 400, color: C.onDark, lineHeight: 1.25 }, 'BS Mechanical Engineering, Loyola Marymount University · May 2027'),
    ),
    page.caption && el('div', { position: 'absolute', top: 48, left: M }, mono(page.caption, C.onDark)),
  );
}

// Plain pages (Projects, Resume, Contact...): the grained paper page head, with the header's wordmark
function plainLayout(page: OgPage) {
  return el(
    'div',
    { width: W, height: H, flexDirection: 'column', justifyContent: 'space-between', padding: `52px ${M}px 60px`, background: C.paper, fontFamily: 'Archivo' },
    el(
      'div',
      { alignItems: 'center', justifyContent: 'space-between', paddingBottom: 22, borderBottom: `1px solid ${C.mist}` },
      wordmark(C.ink),
      mono('Mechanical Engineer · LMU 2027', C.steel),
    ),
    el(
      'div',
      { flexDirection: 'column' },
      serif(page.title, sizeFor(page.title, [[10, 168], [16, 140], [26, 110]]), C.ink),
      page.label && el('div', { marginTop: 26, fontSize: 34, fontWeight: 400, color: C.charcoal, lineHeight: 1.3 }, page.label),
    ),
  );
}

// Skill filter pages: category name and intro over a project photo, under the graphite shade
async function categoryLayout(page: OgPage) {
  const bg = page.photos[0] ? await photo(page.photos[0].image, W, H, page.photos[0].position) : undefined;
  return el(
    'div',
    { width: W, height: H, position: 'relative', background: C.graphite, fontFamily: 'Archivo' },
    bg && img(bg, W, H, { position: 'absolute', top: 0, left: 0 }),
    el('div', {
      ...fill,
      backgroundImage: 'linear-gradient(90deg, rgba(21,21,21,0.94) 0%, rgba(21,21,21,0.84) 52%, rgba(21,21,21,0.5) 100%)',
    }),
    el('div', { position: 'absolute', top: 52, left: M, right: M, justifyContent: 'space-between', alignItems: 'center' }, wordmark(C.onDark), mono('Projects by skill', C.onDarkSoft)),
    el(
      'div',
      { position: 'absolute', left: M, right: M, bottom: 60, flexDirection: 'column' },
      serif(page.title, sizeFor(page.title, [[16, 112], [26, 92]]), C.onDark, 1000),
      el('div', { marginTop: 26, fontSize: 30, fontWeight: 400, color: C.onDark, lineHeight: 1.35, maxWidth: 920 }, page.intro ?? ''),
    ),
  );
}

// Project and experience pages: the cover photo under the hero's shade, title in the serif
async function projectLayout(page: OgPage) {
  const bg = page.photos[0] ? await photo(page.photos[0].image, W, H, page.photos[0].position) : undefined;
  const titleSize = sizeFor(page.title, [[22, 104], [34, 88], [52, 72], [80, 60]]);
  return el(
    'div',
    {
      width: W, height: H, position: 'relative', fontFamily: 'Archivo', backgroundColor: C.graphite,
      // No photo: a faint drawing-sheet grid on graphite
      ...(bg ? {} : {
        backgroundImage: 'linear-gradient(rgba(243,239,231,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(243,239,231,0.06) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }),
    },
    bg && img(bg, W, H, { position: 'absolute', top: 0, left: 0 }),
    bg && heroShade,
    el('div', { position: 'absolute', top: 52, left: M }, wordmark(C.onDark)),
    el(
      'div',
      { position: 'absolute', left: M, right: M, bottom: 56, flexDirection: 'column' },
      serif(page.title, titleSize, C.onDark),
      page.label && el('div', { marginTop: 22, fontSize: 32, fontWeight: 600, color: C.onDark, lineHeight: 1.2 }, page.label),
    ),
  );
}

// Fine paper grain, the same idea as the site's background: noise multiplied over the picture
let grain: Buffer | undefined;
async function paperGrain() {
  if (grain) return grain;
  const px = Buffer.alloc(W * H);
  let seed = 7;
  for (let i = 0; i < px.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    px[i] = 255 - ((seed >> 16) % 18); // 238 to 255: light speckle, so the paper only darkens a touch
  }
  return (grain = await sharp(px, { raw: { width: W, height: H, channels: 1 } }).blur(0.5).toColourspace('srgb').png().toBuffer());
}

export async function renderOgImage(page: OgPage) {
  const tree =
    page.kind === 'home' ? await homeLayout(page)
    : page.kind === 'category' ? await categoryLayout(page)
    : page.kind === 'project' ? await projectLayout(page)
    : plainLayout(page);
  const svg = await satori(tree as any, { width: W, height: H, fonts: loadFonts() });
  let out = sharp(Buffer.from(svg));
  if (page.kind === 'plain') out = sharp(await out.png().toBuffer()).composite([{ input: await paperGrain(), blend: 'multiply' }]);
  return out.jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}

// Keeps link preview descriptions short enough that apps don't cut them off mid-word
export function shortDescription(text: string, max = 155) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  // Longest run of whole sentences that fits (a period inside "5.5" doesn't count as a sentence end)
  let out = '';
  for (const m of clean.matchAll(/[.!?]["')\]]*(?=\s|$)/g)) {
    const upTo = m.index! + m[0].length;
    if (upTo > max) break;
    out = clean.slice(0, upTo);
  }
  if (out.trim().length >= 70) return out.trim();
  return clean.slice(0, max - 1).replace(/\s+\S*$/, '').replace(/[,;:]$/, '') + '…';
}
