// Imagens do roteiro (capa, frames, moodboard, páginas).
// Ficam no aparelho como arquivos em "anexos/" e vão para a pasta anexos do
// Google Drive. No .md aparecem como ![legenda](anexos/arquivo.jpg).

import * as db from './db.js';
import { h, shortId, state } from './core.js';

const urls = new Map();
const MAX_SIDE = 2000;

function extFor(type) {
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' }[type] || 'jpg';
}

async function shrink(file) {
  if (/gif|svg/.test(file.type) || file.size < 700 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function saveImage(file) {
  const blob = await shrink(file);
  const type = blob.type || file.type || 'image/jpeg';
  const path = `anexos/${shortId()}.${extFor(type)}`;
  await db.putFile({ path, blob, type, createdAt: Date.now(), synced: false });
  return path;
}

export async function putDownloaded(path, blob) {
  await db.putFile({ path, blob, type: blob.type, createdAt: Date.now(), synced: true });
}

export async function getBlob(path) {
  return (await db.getFile(path))?.blob || null;
}

export async function urlFor(src) {
  if (!src) return '';
  if (/^(https?:|data:|blob:)/.test(src)) return src;
  if (urls.has(src)) return urls.get(src);
  const blob = await getBlob(src);
  if (!blob) return '';
  const url = URL.createObjectURL(blob);
  urls.set(src, url);
  return url;
}

// <img> que carrega anexos locais sozinho. Mostra um aviso se a imagem não existe aqui.
export function img(src, attrs = {}) {
  const el = h('img', { alt: '', loading: 'lazy', decoding: 'async', ...attrs });
  urlFor(src).then((url) => {
    if (url) el.src = url;
    else el.classList.add('img-missing');
  });
  el.addEventListener('error', () => el.classList.add('img-missing'));
  return el;
}

export function youtubeId(url) {
  const m = (url || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : '';
}

// Miniatura de um link. Só busca a do YouTube se o usuário ligou a pré-visualização
// de links nos Ajustes (por padrão nada sai do aparelho).
export function thumbFor(url) {
  const yt = state.settings.linkPreview && youtubeId(url);
  if (yt) return `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
  if (/\.(jpe?g|png|gif|webp|avif)(\?.*)?$/i.test(url || '')) return url;
  return '';
}

export function guessRefType(url) {
  const u = (url || '').toLowerCase();
  if (/spotify\.com|music\.apple|deezer|soundcloud|bandcamp|music\.youtube|tidal\.com/.test(u)) return 'Música';
  if (/youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|instagram\.com\/(reel|p)\//.test(u)) return 'Vídeo';
  if (/imdb\.com|letterboxd|netflix|primevideo|filmow/.test(u)) return 'Filme / série';
  if (/\.(jpe?g|png|gif|webp|avif)(\?.*)?$|pinterest|unsplash|behance|dribbble/.test(u)) return 'Imagem';
  if (/podcast|anchor\.fm/.test(u)) return 'Podcast';
  if (/goodreads|amazon\..*\/dp\//.test(u)) return 'Livro';
  return u ? 'Artigo' : 'Outro';
}

// Busca título e autor de um link público (YouTube, Vimeo, Spotify, SoundCloud...).
export async function linkInfo(url) {
  if (!state.settings.linkPreview) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch('https://noembed.com/embed?url=' + encodeURIComponent(url), { signal: ctrl.signal });
    clearTimeout(timer);
    const data = await res.json();
    if (data.error) return null;
    return { title: data.title || '', author: data.author_name || '', thumb: data.thumbnail_url || '' };
  } catch {
    return null;
  }
}

// Extrai as cores dominantes de um conjunto de imagens (k-means simples).
export async function palette(srcs, k = 6) {
  const pixels = [];
  for (const src of srcs.slice(0, 24)) {
    try {
      const url = await urlFor(src);
      if (!url) continue;
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.src = url;
      await im.decode();
      const c = document.createElement('canvas');
      c.width = c.height = 48;
      const ctx = c.getContext('2d');
      ctx.drawImage(im, 0, 0, 48, 48);
      const d = ctx.getImageData(0, 0, 48, 48).data;
      for (let i = 0; i < d.length; i += 4 * 3) if (d[i + 3] > 200) pixels.push([d[i], d[i + 1], d[i + 2]]);
    } catch {
      // imagem externa sem permissão de leitura: ignora
    }
  }
  if (pixels.length < k) return [];
  let centers = Array.from({ length: k }, (_, i) => pixels[Math.floor((i + 0.5) * pixels.length / k)].slice());
  let groups;
  for (let iter = 0; iter < 10; iter++) {
    groups = centers.map(() => []);
    for (const p of pixels) {
      let best = 0, bd = Infinity;
      centers.forEach((c, j) => {
        const dd = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (dd < bd) { bd = dd; best = j; }
      });
      groups[best].push(p);
    }
    centers = groups.map((g, j) => (g.length ? [0, 1, 2].map((ch) => g.reduce((a, p) => a + p[ch], 0) / g.length) : centers[j]));
  }
  const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  return centers
    .map((c, j) => ({ c, n: groups[j].length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((x) => hex(x.c));
}
