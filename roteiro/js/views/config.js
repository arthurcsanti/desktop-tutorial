// Tela de Configurações: personalizar as listas do app e o som das teclas.
// Cada mudança é gravada no aparelho e enviada ao Drive (configuracoes.json).

import { h, fill, app, toast, move, pickFiles } from '../core.js';
import { config, listOf, resetList, renameEverywhere, markChanged } from '../config.js';
import { saveAudio } from '../files.js';

const LISTS = [
  { key: 'statuses', title: 'Status dos roteiros', desc: 'As etapas de um roteiro, da ideia até a publicação. Aparecem no arquivo, no quadro e em cada roteiro.' },
  { key: 'postStatuses', title: 'Status das publicações', desc: 'As etapas de cada publicação no calendário e na ordem de publicação.' },
  { key: 'objectives', title: 'Objetivos de campanha', desc: 'Opções do campo "Objetivo" das campanhas.' },
  { key: 'campaignStatuses', title: 'Status das campanhas', desc: '' },
  { key: 'refTypes', title: 'Tipos de referência', desc: 'Como as referências são agrupadas (Música, Vídeo, Filme…).' },
  { key: 'planos', title: 'Planos de câmera', desc: 'Sugestões do campo "plano" de cada cena.' },
];

let save = () => {};

function section(title, desc, body, onReset) {
  return h('section', { class: 'cfg-sec' },
    h('div', { class: 'cfg-head' },
      h('h2', { class: 'part' }, title),
      onReset ? h('button', { type: 'button', class: 'btn btn-ghost btn-mini', onClick: onReset }, 'Restaurar padrão') : null),
    desc ? h('p', { class: 'muted small' }, desc) : null,
    body);
}

const mini = (label, title, onClick, cls = '') =>
  h('button', { type: 'button', class: 'btn btn-ghost btn-mini ' + cls, title, 'aria-label': title, onClick }, label);

// Lista de textos: renomear (ao sair do campo), reordenar, remover e adicionar.
function listEditor({ key }) {
  const list = listOf(key);
  const wrap = h('div', { class: 'cfg-list' });
  const draw = () => fill(wrap,
    list.map((item, i) => {
      const input = h('input', { class: 'cfg-input', value: item, 'aria-label': 'Nome' });
      input.addEventListener('change', () => {
        const v = input.value.trim();
        if (!v) { input.value = item; return; }
        if (list.includes(v) && v !== item) { toast('Esse nome já existe na lista.'); input.value = item; return; }
        list[i] = v;
        const n = renameEverywhere(key, item, v);
        save();
        if (n) toast(`Atualizado também em ${n} documento(s).`);
        draw();
      });
      return h('div', { class: 'cfg-row' },
        h('span', { class: 'cfg-n' }, String(i + 1).padStart(2, '0')),
        input,
        mini('↑', 'Subir', () => { if (move(list, i, -1)) { save(); draw(); } }),
        mini('↓', 'Descer', () => { if (move(list, i, 1)) { save(); draw(); } }),
        mini('✕', 'Remover', () => {
          if (list.length <= 1) return toast('A lista precisa de pelo menos um item.');
          list.splice(i, 1); save(); draw();
        }, 'danger'));
    }),
    h('form', {
      class: 'cfg-add',
      onSubmit: (e) => {
        e.preventDefault();
        const inp = e.currentTarget.elements.novo;
        const v = inp.value.trim();
        if (!v) return;
        if (list.includes(v)) return toast('Esse nome já existe na lista.');
        list.push(v);
        save();
        draw();
        wrap.querySelector('.cfg-add input')?.focus();
      },
    }, h('input', { name: 'novo', class: 'cfg-input', placeholder: '+ adicionar item', 'aria-label': 'Novo item' }), h('button', { class: 'btn btn-mini' }, 'Adicionar')));
  draw();
  return wrap;
}

function platformsEditor() {
  const list = listOf('platforms');
  const wrap = h('div', { class: 'cfg-list' });
  const draw = () => fill(wrap,
    list.map((p, i) => {
      const color = h('input', { type: 'color', value: p.color, class: 'cfg-color', 'aria-label': 'Cor' });
      color.addEventListener('change', () => { p.color = color.value; save(); draw(); });
      const name = h('input', { class: 'cfg-input', value: p.id, 'aria-label': 'Nome da plataforma' });
      name.addEventListener('change', () => {
        const v = name.value.trim();
        if (!v || (v !== p.id && list.some((x) => x.id === v))) { name.value = p.id; return; }
        const old = p.id;
        p.id = v;
        const n = renameEverywhere('platforms', old, v);
        save();
        if (n) toast(`Atualizado também em ${n} documento(s).`);
      });
      const abbr = h('input', { class: 'cfg-input cfg-abbr', value: p.abbr, maxlength: 4, 'aria-label': 'Sigla' });
      abbr.addEventListener('change', () => { p.abbr = abbr.value.trim().toUpperCase() || p.abbr; save(); draw(); });
      const formats = h('input', { class: 'cfg-input', value: p.formats.join(', '), 'aria-label': 'Formatos, separados por vírgula' });
      formats.addEventListener('change', () => {
        const f = [...new Set(formats.value.split(',').map((x) => x.trim()).filter(Boolean))];
        p.formats = f.length ? f : ['Post'];
        save();
      });
      return h('div', { class: 'cfg-pf', style: { '--pf': p.color } },
        h('div', { class: 'cfg-pf-top' },
          color,
          h('span', { class: 'pf-stamp' }, p.abbr),
          name,
          abbr,
          mini('↑', 'Subir', () => { if (move(list, i, -1)) { save(); draw(); } }),
          mini('↓', 'Descer', () => { if (move(list, i, 1)) { save(); draw(); } }),
          mini('✕', 'Remover', () => {
            if (list.length <= 1) return toast('Deixe pelo menos uma plataforma.');
            if (!confirm(`Remover ${p.id}? As publicações já marcadas nela continuam como estão.`)) return;
            list.splice(i, 1); save(); draw();
          }, 'danger')),
        h('label', { class: 'cfg-sub' }, 'Formatos ', formats));
    }),
    h('button', {
      type: 'button', class: 'btn btn-mini',
      onClick: () => {
        let n = list.length + 1;
        while (list.some((x) => x.id === `Nova plataforma ${n}`)) n++;
        list.push({ id: `Nova plataforma ${n}`, abbr: 'NP', color: '#6b5d48', formats: ['Post', 'Vídeo'] });
        save();
        draw();
        wrap.querySelectorAll('.cfg-pf .cfg-input')[(list.length - 1) * 3]?.select();
      },
    }, '+ Plataforma'));
  draw();
  return wrap;
}

function legendEditor() {
  const list = listOf('legend');
  const wrap = h('div', { class: 'cfg-list' });
  const field = (item, k, label, cls = '') => {
    const inp = h('input', { class: 'cfg-input ' + cls, value: item[k], 'aria-label': label, placeholder: label });
    inp.addEventListener('change', () => { item[k] = inp.value; save(); });
    return inp;
  };
  const draw = () => fill(wrap,
    list.map((l, i) => h('div', { class: 'cfg-legend' },
      field(l, 'code', 'Botão', 'cfg-code'),
      field(l, 'insert', 'Texto inserido', 'cfg-insert'),
      field(l, 'desc', 'Descrição'),
      mini('↑', 'Subir', () => { if (move(list, i, -1)) { save(); draw(); } }),
      mini('✕', 'Remover', () => { list.splice(i, 1); save(); draw(); }, 'danger'))),
    h('button', { type: 'button', class: 'btn btn-mini', onClick: () => { list.push({ code: 'NOVO', insert: 'NOVO: ', desc: '' }); save(); draw(); } }, '+ Marcação'));
  draw();
  return wrap;
}

function soundEditor() {
  const s = config.sound;
  const wrap = h('div', { class: 'cfg-sound' });
  const pick = async (k) => {
    const [f] = await pickFiles({ accept: 'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.caf', multiple: false });
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) return toast('Use um som curto (até 3 MB).');
    s[k] = await saveAudio(f);
    s.mode = 'arquivo';
    save();
    app.reloadSounds?.();
    draw();
    toast('Som salvo. Ele vai junto para o Drive.');
  };
  const draw = () => {
    const radio = (mode, label, hint) => {
      const r = h('input', { type: 'radio', name: 'snd-mode', value: mode, checked: s.mode === mode });
      r.addEventListener('change', () => { s.mode = mode; save(); app.reloadSounds?.(); draw(); });
      return h('label', { class: 'cfg-radio' }, r, h('span', null, h('b', null, label), hint ? h('br') : null, hint ? h('span', { class: 'muted small' }, hint) : null));
    };
    const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s.volume, 'aria-label': 'Volume' });
    vol.addEventListener('change', () => { s.volume = +vol.value; save(); });
    fill(wrap,
      radio('maquina', 'Máquina de escrever', 'O som que já vem no app.'),
      radio('arquivo', 'Meu som', 'Um arquivo curto seu: uma tecla e, se quiser, o retorno do carro (Enter).'),
      s.mode === 'arquivo' ? h('div', { class: 'cfg-files' },
        h('div', { class: 'cfg-file' }, h('span', null, 'Tecla'), h('span', { class: 'muted small' }, s.key ? 'arquivo enviado' : 'nenhum'),
          h('button', { type: 'button', class: 'btn btn-mini', onClick: () => pick('key') }, s.key ? 'Trocar' : 'Enviar som'),
          s.key ? mini('▶', 'Ouvir', () => app.playKey?.('key', true)) : null),
        h('div', { class: 'cfg-file' }, h('span', null, 'Enter'), h('span', { class: 'muted small' }, s.ret ? 'arquivo enviado' : 'usa o som da tecla'),
          h('button', { type: 'button', class: 'btn btn-mini', onClick: () => pick('ret') }, s.ret ? 'Trocar' : 'Enviar som'),
          s.ret ? mini('✕', 'Remover', () => { s.ret = ''; save(); app.reloadSounds?.(); draw(); }, 'danger') : null)) : null,
      h('label', { class: 'cfg-file' }, h('span', null, 'Volume'), vol,
        h('button', { type: 'button', class: 'btn btn-mini', onClick: () => app.playKey?.('key', true) }, 'Testar')),
      h('p', { class: 'muted small' }, 'Para ligar ou desligar o som, use o botão "Som" no topo de um roteiro.'));
  };
  draw();
  return wrap;
}

export function configView() {
  save = () => { markChanged(); app.saveConfig(); };
  const synced = config.updatedAt ? 'Salvas neste aparelho' : 'Usando o padrão do app';
  return h('div', { class: 'planner config' },
    h('div', { class: 'lib-head' },
      h('h1', { class: 'lib-title' }, 'Configurações'),
      h('div', { class: 'lib-tools' }, h('span', { class: 'cfg-state' }, synced, app.driveConnected?.() ? ' · vão para o Drive' : ''))),
    h('div', { class: 'paper planner-paper cfg-paper' },
      h('p', { class: 'muted small cfg-intro' },
        'Personalize as listas do app do seu jeito. Renomear um item atualiza também os roteiros, publicações e campanhas que já usam esse nome. ',
        'Com o Google Drive conectado, as configurações vão no arquivo configuracoes.json e valem em todos os seus aparelhos.'),
      LISTS.map((l) => section(l.title, l.desc, listEditor(l), () => { if (confirm(`Voltar "${l.title}" ao padrão?`)) { resetList(l.key); app.saveConfig(); app.showConfig(); } })),
      section('Plataformas', 'Redes onde você publica: nome, sigla do carimbo, cor e formatos (separados por vírgula).', platformsEditor(),
        () => { if (confirm('Voltar as plataformas ao padrão?')) { resetList('platforms'); app.saveConfig(); app.showConfig(); } }),
      section('Legenda do roteiro', 'Os botões de marcação da aba Roteiro (OFF, [beat], LETTERING…): o texto que cada um insere e a explicação.', legendEditor(),
        () => { if (confirm('Voltar a legenda ao padrão?')) { resetList('legend'); app.saveConfig(); app.showConfig(); } }),
      section('Som das teclas', '', soundEditor())));
}
