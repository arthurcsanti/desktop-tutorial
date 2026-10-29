// Aba "Roteiro": cenas com narração, visual, plano e frame.
// Duas visualizações: tabela (como o modelo do Google Docs) e storyboard.

import { h, field, touch, app, state, toast, uid, move, keepFocus, pickFiles } from '../core.js';
import { LEGEND, PLANOS } from '../model.js';
import { img, saveImage } from '../files.js';

const MARKERS = /\b(OFF|SOBE SOM|BG|LETTERING)\s*:|\b[\p{Lu}][\p{Lu}\s.]*\(ON\)\s*:|\[[^\]]*\]/gu;
export function countWords(text) {
  return ((text || '').replace(MARKERS, ' ').match(/[\p{L}\p{N}]+/gu) || []).length;
}

export function roteiroStats(tab) {
  const words = tab.sections.reduce((n, sec) => n + sec.scenes.reduce((m, c) => m + countWords(c.narration), 0), 0);
  const scenes = tab.sections.reduce((n, sec) => n + sec.scenes.length, 0);
  const secs = Math.round((words / 150) * 60);
  return { words, scenes, secs, time: `${Math.floor(secs / 60)} min ${String(secs % 60).padStart(2, '0')} s` };
}

function insertAtCursor(text) {
  const el = state.lastField;
  if (!el || !el.isConnected) return toast('Toque antes no campo onde quer inserir.');
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const before = el.value.slice(0, start);
  const sep = before && !/\s$/.test(before) && !text.startsWith('[') ? '\n' : '';
  el.value = before + sep + text + el.value.slice(end);
  const pos = start + sep.length + text.length;
  el.focus();
  el.setSelectionRange(pos, pos);
  el.dispatchEvent(new Event('input'));
}

const mini = (label, title, onClick) =>
  h('button', { type: 'button', class: 'btn btn-ghost btn-mini', title, 'aria-label': title, onClick }, label);

async function setFrame(s, c) {
  const [f] = await pickFiles({ multiple: false });
  if (!f) return;
  c.image = await saveImage(f);
  touch(s);
  app.renderEditor();
}

function planoField(s, c) {
  return field('input', c.plano, (v) => { c.plano = v; touch(s, { list: false }); }, {
    class: 'plano', list: 'planos-list', placeholder: 'plano', 'aria-label': 'Plano / enquadramento',
  });
}

export function roteiroView(s, tab) {
  const stat = h('div', { class: 'stats' });
  const refresh = () => {
    const x = roteiroStats(tab);
    stat.textContent = `${x.scenes} cenas · ${x.words} palavras de narração · ≈ ${x.time} de fala`;
  };
  refresh();
  let n = 0;
  const storyboard = tab.view === 'storyboard';

  const sceneTools = (sec, ci, c) => h('div', { class: 'scene-tools' },
    mini('↑', 'Subir cena', () => { if (move(sec.scenes, ci, -1)) { touch(s); app.renderEditor(); } }),
    mini('↓', 'Descer cena', () => { if (move(sec.scenes, ci, 1)) { touch(s); app.renderEditor(); } }),
    mini('✕', 'Remover cena', () => {
      if ((c.narration || c.visual || c.image) && !confirm('Remover esta cena?')) return;
      sec.scenes.splice(ci, 1); touch(s); app.renderEditor();
    }));

  const frameBox = (c, big) => c.image
    ? h('div', { class: 'frame' + (big ? ' frame-big' : '') },
      img(c.image, { alt: 'Frame da cena' }),
      h('div', { class: 'frame-tools' },
        mini('Trocar', 'Trocar frame', () => setFrame(s, c)),
        mini('✕', 'Remover frame', () => { c.image = ''; touch(s); app.renderEditor(); })))
    : h('button', { type: 'button', class: 'frame frame-empty' + (big ? ' frame-big' : ''), onClick: () => setFrame(s, c) },
      h('span', null, big ? '+ frame / rascunho' : '+ frame'));

  const sceneRow = (sec, c, ci) => {
    n++;
    const num = String(n).padStart(2, '0');
    const narr = field('textarea', c.narration, (v) => { c.narration = v; touch(s); refresh(); }, { class: 'scene-text', placeholder: c.pn || 'OFF: ', 'aria-label': `Narração da cena ${num}` });
    const vis = field('textarea', c.visual, (v) => { c.visual = v; touch(s); }, { class: 'scene-visual', placeholder: c.pv || 'DESCREVA AS IMAGENS DA CENA', 'aria-label': `Visual da cena ${num}` });
    if (storyboard) {
      return h('div', { class: 'sb-card' },
        frameBox(c, true),
        h('div', { class: 'sb-meta' }, h('span', { class: 'sb-num' }, 'CENA ' + num), planoField(s, c), sceneTools(sec, ci, c)),
        vis,
        h('div', { class: 'sb-narr' }, narr));
    }
    return h('div', { class: 'scene' },
      h('div', { class: 'scene-num' }, num, sceneTools(sec, ci, c)),
      narr,
      h('div', { class: 'scene-vis' }, planoField(s, c), vis, frameBox(c, false)));
  };

  return h('div', { class: 'roteiro' + (storyboard ? ' is-storyboard' : '') },
    h('datalist', { id: 'planos-list' }, PLANOS.map((p) => h('option', { value: p }))),
    h('div', { class: 'view-bar' },
      h('div', { class: 'seg' },
        ['tabela', 'storyboard'].map((v) => h('button', {
          type: 'button', class: 'seg-btn' + ((tab.view || 'tabela') === v ? ' active' : ''),
          onClick: () => { tab.view = v; touch(s, { list: false }); app.renderEditor(); },
        }, v === 'tabela' ? 'Tabela' : 'Storyboard'))),
      stat),
    h('div', { class: 'legend-bar' },
      h('span', { class: 'muted small' }, 'Inserir:'),
      LEGEND.map((l) => keepFocus(h('button', { type: 'button', class: 'chip', title: l.desc, onClick: () => insertAtCursor(l.insert) }, l.code)))),
    h('details', { class: 'legend-details' },
      h('summary', null, 'Legenda'),
      h('dl', { class: 'legend-table' }, LEGEND.map((l) => [h('dt', null, l.code), h('dd', null, l.desc)]))),
    storyboard ? null : h('div', { class: 'script-head' }, h('span', null, 'Cena'), h('span', null, 'Narração'), h('span', null, 'Visual')),
    tab.sections.map((sec, si) => h('section', { class: 'sec' },
      h('div', { class: 'sec-head' },
        field('input', sec.name, (v) => { sec.name = v; touch(s, { list: false }); }, { class: 'sec-name', placeholder: 'NOME DA SEÇÃO' }),
        h('div', { class: 'sec-tools' },
          mini('↑', 'Subir seção', () => { if (move(tab.sections, si, -1)) { touch(s); app.renderEditor(); } }),
          mini('↓', 'Descer seção', () => { if (move(tab.sections, si, 1)) { touch(s); app.renderEditor(); } }),
          mini('✕', 'Remover seção', () => {
            const filled = sec.scenes.some((c) => c.narration || c.visual || c.image);
            if (filled && !confirm(`Remover a seção "${sec.name}" e todas as cenas dela?`)) return;
            tab.sections.splice(si, 1); touch(s); app.renderEditor();
          }))),
      field('textarea', sec.hint, (v) => { sec.hint = v; touch(s, { list: false }); }, { class: 'sec-hint', placeholder: 'Descrição da seção (opcional)' }),
      h('div', { class: storyboard ? 'sb-grid' : 'scenes' }, sec.scenes.map((c, ci) => sceneRow(sec, c, ci))),
      h('button', {
        type: 'button', class: 'btn btn-ghost btn-add',
        onClick: () => { sec.scenes.push({ id: uid(), narration: '', visual: '', plano: '', image: '' }); touch(s); app.renderEditor(); },
      }, '+ cena'))),
    h('button', {
      type: 'button', class: 'btn btn-add-sec',
      onClick: () => {
        tab.sections.push({ id: uid(), name: 'Nova seção', hint: '', scenes: [{ id: uid(), narration: '', visual: '', plano: '', image: '' }] });
        touch(s); app.renderEditor();
        const names = document.querySelectorAll('#editor .sec-name');
        names[names.length - 1]?.select();
      },
    }, '+ Nova seção'));
}

export function narrationText(tab) {
  return tab.sections
    .map((sec) => [sec.name.toUpperCase(), ...sec.scenes.map((c) => c.narration).filter(Boolean)].join('\n\n'))
    .join('\n\n\n');
}
