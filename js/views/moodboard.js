// Aba "Moodboard": mural de cortiça com fotos presas com fita, fichas de
// anotação, amostras de cor e links. "Gerar" monta o mural a partir do
// próprio roteiro: frames, imagens das páginas, miniaturas das referências
// e a paleta de cores extraída dessas imagens.

import { h, field, touch, app, toast, uid, move, hashNum, ask, pickFiles, isUrl } from '../core.js';
import { img, saveImage, palette, thumbFor, linkInfo } from '../files.js';

const mini = (label, title, onClick) =>
  h('button', { type: 'button', class: 'btn btn-ghost btn-mini', title, 'aria-label': title, onClick }, label);

function imagesInScript(s) {
  const out = [];
  for (const t of s.tabs) {
    if (t.type === 'roteiro') t.sections.forEach((sec) => sec.scenes.forEach((c) => c.image && out.push({ src: c.image, caption: sec.name })));
    if (t.type === 'pagina') for (const m of (t.content || '').matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)) out.push({ src: m[2], caption: m[1] });
    if (t.type === 'referencias') t.items.forEach((r) => { const th = thumbFor(r.url); if (th) out.push({ src: th, caption: r.titulo || '' }); });
  }
  if (s.cover) out.unshift({ src: s.cover, caption: 'Capa' });
  return out;
}

async function addFiles(s, tab, files) {
  const imgs = files.filter((f) => f.type.startsWith('image/'));
  if (!imgs.length) return;
  for (const f of imgs) tab.items.push({ id: uid(), kind: 'image', src: await saveImage(f), caption: '' });
  touch(s);
  app.renderEditor();
}

async function generate(s, tab) {
  const found = imagesInScript(s);
  const have = new Set(tab.items.filter((i) => i.kind === 'image').map((i) => i.src));
  let added = 0;
  for (const f of found) {
    if (have.has(f.src)) continue;
    have.add(f.src);
    tab.items.push({ id: uid(), kind: 'image', src: f.src, caption: f.caption });
    added++;
  }
  const colors = await palette([...have]);
  const haveColors = new Set(tab.items.filter((i) => i.kind === 'color').map((i) => i.color.toLowerCase()));
  for (const c of colors) {
    if (haveColors.has(c)) continue;
    tab.items.push({ id: uid(), kind: 'color', color: c, caption: 'paleta' });
    added++;
  }
  touch(s);
  app.renderEditor();
  if (!found.length && !colors.length) toast('Ainda não há imagens no roteiro. Adicione frames, fotos nas páginas ou referências de vídeo.');
  else toast(added ? `${added} item(ns) adicionados ao mural.` : 'O mural já tem tudo o que existe no roteiro.');
}

function item(s, tab, it, i) {
  const rot = ((hashNum(it.id) % 7) - 3) * 0.6;
  const tools = h('div', { class: 'pin-tools' },
    mini('←', 'Mover para trás', () => { if (move(tab.items, i, -1)) { touch(s); app.renderEditor(); } }),
    mini('→', 'Mover para frente', () => { if (move(tab.items, i, 1)) { touch(s); app.renderEditor(); } }),
    it.kind === 'image' && !/^https?:/.test(it.src) ? mini('Capa', 'Usar como capa do roteiro', () => { s.cover = it.src; touch(s); app.renderEditor(); }) : null,
    mini('✕', 'Remover do mural', () => { tab.items.splice(i, 1); touch(s); app.renderEditor(); }));
  const caption = (ph) => field('input', it.caption, (v) => { it.caption = v; touch(s, { list: false }); }, { class: 'pin-caption', placeholder: ph });

  if (it.kind === 'image') {
    return h('figure', { class: 'pin pin-photo', style: { '--rot': rot + 'deg' } }, h('span', { class: 'tape' }), img(it.src), caption('legenda'), tools);
  }
  if (it.kind === 'color') {
    const picker = h('input', { type: 'color', value: it.color, 'aria-label': 'Cor' });
    picker.addEventListener('input', () => { it.color = picker.value; chip.style.background = picker.value; code.textContent = picker.value.toUpperCase(); touch(s, { list: false }); });
    const chip = h('label', { class: 'chip-swatch', style: { background: it.color } }, picker);
    const code = h('span', { class: 'chip-hex' }, it.color.toUpperCase());
    return h('div', { class: 'pin pin-color', style: { '--rot': rot / 2 + 'deg' } }, chip, code, caption('nome da cor'), tools);
  }
  if (it.kind === 'link') {
    const th = thumbFor(it.url);
    return h('div', { class: 'pin pin-link', style: { '--rot': rot / 2 + 'deg' } },
      th ? img(th) : null,
      h('a', { href: it.url, target: '_blank', rel: 'noopener', class: 'pin-link-title' }, it.title || it.url, ' ↗'),
      caption('por que isso está aqui?'),
      tools);
  }
  return h('div', { class: 'pin pin-note', style: { '--rot': rot + 'deg' } },
    field('textarea', it.text, (v) => { it.text = v; touch(s, { list: false }); }, { placeholder: 'anotação…', 'aria-label': 'Anotação' }),
    tools);
}

export function moodboardView(s, tab) {
  const board = h('div', { class: 'board' }, tab.items.map((it, i) => item(s, tab, it, i)));
  const wrap = h('div', { class: 'moodboard' },
    h('div', { class: 'view-bar' },
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn', onClick: async () => addFiles(s, tab, await pickFiles()) }, '+ Fotos'),
        h('button', {
          type: 'button', class: 'btn', onClick: async () => {
            const r = await ask('Imagem ou link', [{ name: 'url', label: 'Endereço (imagem, vídeo, música, site…)', placeholder: 'https://…' }, { name: 'caption', label: 'Legenda (opcional)' }], { ok: 'Adicionar' });
            if (!r?.url || !isUrl(r.url)) return;
            if (/\.(jpe?g|png|gif|webp|avif)(\?.*)?$/i.test(r.url)) tab.items.push({ id: uid(), kind: 'image', src: r.url, caption: r.caption });
            else {
              const info = await linkInfo(r.url);
              tab.items.push({ id: uid(), kind: 'link', url: r.url, title: info?.title || '', caption: r.caption });
            }
            touch(s); app.renderEditor();
          },
        }, '+ Link'),
        h('button', { type: 'button', class: 'btn', onClick: () => { tab.items.push({ id: uid(), kind: 'note', text: '' }); touch(s); app.renderEditor(); } }, '+ Nota'),
        h('button', { type: 'button', class: 'btn', onClick: () => { tab.items.push({ id: uid(), kind: 'color', color: '#8a2e1d', caption: '' }); touch(s); app.renderEditor(); } }, '+ Cor')),
      h('button', { type: 'button', class: 'btn btn-stamp', title: 'Junta frames, imagens e referências do roteiro e extrai a paleta de cores', onClick: () => generate(s, tab) }, 'Gerar do roteiro')),
    tab.items.length ? board : h('div', { class: 'board board-empty' },
      h('p', null, 'Mural vazio. Arraste fotos para cá, cole uma imagem (Ctrl+V) ou toque em "Gerar do roteiro" para montar com o que já existe nas cenas e referências.')));

  wrap.addEventListener('dragover', (e) => { e.preventDefault(); wrap.classList.add('drop'); });
  wrap.addEventListener('dragleave', () => wrap.classList.remove('drop'));
  wrap.addEventListener('drop', (e) => { e.preventDefault(); wrap.classList.remove('drop'); addFiles(s, tab, [...e.dataTransfer.files]); });
  wrap.addEventListener('paste', (e) => {
    if (e.target.matches('input, textarea')) return;
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) { e.preventDefault(); addFiles(s, tab, files); }
  });
  wrap.tabIndex = -1;
  return wrap;
}
