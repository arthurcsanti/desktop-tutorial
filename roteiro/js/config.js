// Configurações do usuário: listas personalizáveis (status, plataformas,
// objetivos, tipos de referência, planos, legenda) e o som das teclas.
// Ficam no aparelho e vão para o Drive como "configuracoes.json", para
// valer em todos os aparelhos da mesma conta.

import { STATUSES, POST_STATUSES, OBJECTIVES, CAMPAIGN_STATUSES, REF_TYPES, PLANOS, PLATFORMS, LEGEND } from './model.js';
import { live, touch } from './core.js';

// As listas do model.js são alteradas no lugar: quem já importou vê a versão personalizada.
const TARGETS = {
  statuses: STATUSES,
  postStatuses: POST_STATUSES,
  objectives: OBJECTIVES,
  campaignStatuses: CAMPAIGN_STATUSES,
  refTypes: REF_TYPES,
  planos: PLANOS,
  platforms: PLATFORMS,
  legend: LEGEND,
};
const DEFAULTS = structuredClone(TARGETS);
const DEFAULT_SOUND = { mode: 'maquina', key: '', ret: '', volume: 0.7 };

export const config = { updatedAt: 0, sound: { ...DEFAULT_SOUND } };

export function applyConfig(c) {
  for (const [k, target] of Object.entries(TARGETS)) {
    const src = Array.isArray(c?.[k]) && c[k].length ? c[k] : DEFAULTS[k];
    target.splice(0, target.length, ...structuredClone(src));
  }
  config.sound = { ...DEFAULT_SOUND, ...(c?.sound || {}) };
  config.updatedAt = c?.updatedAt || 0;
}

export function snapshot() {
  const out = { app: 'maquina-de-roteiro', tipo: 'configuracoes', updatedAt: config.updatedAt, sound: { ...config.sound } };
  for (const [k, target] of Object.entries(TARGETS)) out[k] = structuredClone(target);
  return out;
}

export const defaults = (k) => structuredClone(DEFAULTS[k]);
export const listOf = (k) => TARGETS[k];

export function markChanged() {
  config.updatedAt = Math.max(Date.now(), config.updatedAt + 1);
}

export function resetList(k) {
  TARGETS[k].splice(0, TARGETS[k].length, ...defaults(k));
  markChanged();
}

// Renomear um item da lista renomeia também onde ele já foi usado.
export function renameEverywhere(k, from, to) {
  if (!from || from === to) return 0;
  let n = 0;
  for (const s of live()) {
    let changed = false;
    const isCamp = s.kind === 'campanha';
    if (k === 'statuses' && !isCamp && s.status === from) { s.status = to; changed = true; }
    if (k === 'campaignStatuses' && isCamp && s.status === from) { s.status = to; changed = true; }
    if (k === 'objectives' && isCamp && s.campaign?.objetivo === from) { s.campaign.objetivo = to; changed = true; }
    if (k === 'platforms' && isCamp && s.campaign?.plataformas?.includes(from)) {
      s.campaign.plataformas = s.campaign.plataformas.map((p) => (p === from ? to : p));
      changed = true;
    }
    for (const t of s.tabs || []) {
      if (k === 'postStatuses' && t.type === 'publicacoes') t.posts.forEach((p) => { if (p.status === from) { p.status = to; changed = true; } });
      if (k === 'platforms' && t.type === 'publicacoes') t.posts.forEach((p) => { if (p.platform === from) { p.platform = to; changed = true; } });
      if (k === 'refTypes' && t.type === 'referencias') t.items.forEach((r) => { if (r.tipo === from) { r.tipo = to; changed = true; } });
      if (k === 'planos' && t.type === 'roteiro') t.sections.forEach((sec) => sec.scenes.forEach((c) => { if (c.plano === from) { c.plano = to; changed = true; } }));
    }
    if (changed) { touch(s); n++; }
  }
  return n;
}

// Arquivos de som usados pela configuração (vão junto com as imagens para a pasta anexos do Drive).
export const configFiles = () => [config.sound.key, config.sound.ret].filter(Boolean);
