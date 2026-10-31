// Aba "Publicações" de um roteiro: onde, quando e em qual campanha cada
// versão do vídeo vai ao ar (vídeo longo, Short, Reels, TikTok...) e os
// resultados depois de publicado.

import { h, field, touch, app, campaigns, addDays, isoDate, button } from '../core.js';
import { PLATFORMS, POST_STATUSES, METRICS, newPost, platformOf, withCurrent } from '../model.js';
import { nextFreeDate } from './planner.js';

export function platformSelect(p, onChange) {
  const sel = h('select', { class: 'pub-platform', 'aria-label': 'Plataforma e formato', onChange: () => {
    const [platform, format] = sel.value.split('|');
    p.platform = platform;
    p.format = format;
    onChange();
  } },
  PLATFORMS.map((pl) => h('optgroup', { label: pl.id }, pl.formats.map((f) => h('option', { value: `${pl.id}|${f}` }, `${pl.id} · ${f}`)))));
  if (!PLATFORMS.some((pl) => pl.id === p.platform && pl.formats.includes(p.format))) {
    sel.prepend(h('option', { value: `${p.platform}|${p.format}` }, `${p.platform} · ${p.format}`));
  }
  sel.value = `${p.platform}|${p.format}`;
  return sel;
}

export function stamp(platform) {
  const pl = platformOf(platform);
  return h('span', { class: 'pf-stamp', style: { '--pf': pl.color }, title: pl.id }, pl.abbr);
}

function select(options, value, onChange, attrs = {}) {
  const sel = h('select', { ...attrs, onChange: () => onChange(sel.value) }, options.map((o) => (typeof o === 'string' ? h('option', { value: o }, o) : h('option', { value: o.value }, o.label))));
  sel.value = value;
  return sel;
}

function postCard(s, tab, p, i) {
  const save = (opts) => touch(s, opts);
  const camps = campaigns();
  return h('article', { class: 'pub-card' + (p.status === 'Publicado' ? ' is-done' : ''), style: { '--pf': platformOf(p.platform).color } },
    h('div', { class: 'pub-row' },
      stamp(p.platform),
      platformSelect(p, () => { save(); app.renderEditor(); }),
      select(withCurrent(POST_STATUSES, p.status), p.status, (v) => { p.status = v; save(); app.renderEditor(); }, { class: 'pub-status', 'aria-label': 'Status' }),
      h('button', { type: 'button', class: 'btn btn-ghost btn-mini', title: 'Remover publicação', 'aria-label': 'Remover publicação', onClick: () => { tab.posts.splice(i, 1); save(); app.renderEditor(); } }, '✕')),
    h('div', { class: 'pub-row pub-when' },
      h('label', null, 'Data ', field('input', p.date, (v) => { p.date = v; save(); }, { type: 'date' })),
      h('label', null, 'Hora ', field('input', p.time, (v) => { p.time = v; save({ list: false }); }, { type: 'time' })),
      h('label', null, 'Campanha ', select([{ value: '', label: '—' }, ...camps.map((c) => ({ value: c.title, label: c.title || 'Sem título' }))], p.campaign, (v) => { p.campaign = v; save(); }, { 'aria-label': 'Campanha' }))),
    h('div', { class: 'pub-row' },
      field('input', p.link, (v) => { p.link = v.trim(); save({ list: false }); }, { type: 'url', placeholder: 'link depois de publicado', 'aria-label': 'Link da publicação' }),
      p.link ? h('a', { href: p.link, target: '_blank', rel: 'noopener', class: 'open-link' }, '↗') : null),
    p.status === 'Publicado' || METRICS.some(([k]) => p[k]) ? h('div', { class: 'pub-metrics' },
      METRICS.map(([k, label]) => h('label', null, h('span', null, label), field('input', p[k], (v) => { p[k] = v; save({ list: false }); }, { inputmode: 'numeric', placeholder: '—' })))) : null,
    field('textarea', p.note, (v) => { p.note = v; save({ list: false }); }, { class: 'pub-note', placeholder: 'nota: legenda, gancho do post, horário de pico…' }));
}

export function publicacoesView(s, tab) {
  const add = (extra) => { tab.posts.push(newPost(extra)); touch(s); app.renderEditor(); };
  const last = [...tab.posts].reverse().find((p) => p.date);
  return h('div', { class: 'pubs' },
    h('div', { class: 'view-bar' },
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn btn-stamp', onClick: () => add({ platform: last?.platform || 'YouTube', format: last?.format || 'Vídeo' }) }, '+ Publicação'),
        h('button', {
          type: 'button', class: 'btn',
          title: 'Cria um Short, um Reels e um TikTok em dias seguidos depois da última data',
          onClick: () => {
            const base = last?.date || isoDate();
            [['YouTube', 'Short'], ['Instagram', 'Reels'], ['TikTok', 'Vídeo']].forEach(([platform, format], k) => {
              tab.posts.push(newPost({ platform, format, date: addDays(base, k + 1), campaign: last?.campaign || '' }));
            });
            touch(s);
            app.renderEditor();
          },
        }, '+ Cortes (Short, Reels, TikTok)')),
      button('Ver no calendário', () => app.showPlanner('calendario', tab.posts.find((p) => p.date)?.date), { class: 'btn' })),
    tab.posts.length ? h('div', { class: 'pub-list' }, tab.posts.map((p, i) => postCard(s, tab, p, i)))
      : h('div', { class: 'empty-note' }, 'Nenhuma publicação planejada. Adicione onde e quando este roteiro vai ao ar.'),
    tab.posts.some((p) => !p.date) ? h('p', { class: 'muted small' },
      'Publicações sem data ficam na fila do Planejamento. ',
      h('button', {
        type: 'button', class: 'link-btn',
        onClick: () => { tab.posts.filter((p) => !p.date).forEach((p) => { p.date = nextFreeDate(p.platform); }); touch(s); app.renderEditor(); },
      }, 'Dar a próxima data livre a cada uma')) : null);
}
