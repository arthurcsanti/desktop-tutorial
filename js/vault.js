// Cofre local: todos os dados ficam cifrados (AES-256-GCM) no IndexedDB do aparelho.
//
// Uma chave de dados aleatória (DEK) cifra o conteúdo. Ela é guardada "embrulhada" por até três chaves:
//   - código de 6 dígitos  → PBKDF2-SHA256
//   - Face ID              → WebAuthn PRF (iOS 18+) ou, sem PRF, uma chave do aparelho não exportável
//   - chave de recuperação → PBKDF2 sobre 100 bits aleatórios (20 caracteres)
// Nada sai do aparelho.

const DB_NAME = 'lastro';
const STORE = 'kv';
const PIN_ITER = 600000;
const REC_ITER = 100000;
const enc = new TextEncoder();
const dec = new TextDecoder();
const subtle = crypto.subtle;

/* ---------- IndexedDB ---------- */
function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function kvGet(key) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function kvSet(entries) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const s = tx.objectStore(STORE);
    for (const [k, v] of Object.entries(entries)) v === undefined ? s.delete(k) : s.put(v, k);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function kvClear() {
  const db = await idb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
  });
}

/* ---------- utilitários ---------- */
const rand = (n) => crypto.getRandomValues(new Uint8Array(n));
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pbkdf2(secret, salt, iterations) {
  const base = await subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function hkdf(bytes, salt) {
  const base = await subtle.importKey('raw', bytes, 'HKDF', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('lastro-faceid') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(key, bytes) {
  const iv = rand(12);
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  return { iv: b64(iv), ct: b64(ct) };
}
async function open(key, box) {
  return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct)));
}

// Chave de recuperação legível: 20 caracteres base32 sem caracteres ambíguos, grupos de 4.
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newRecoveryCode() {
  const bytes = rand(20);
  let out = '';
  for (const b of bytes) out += B32[b % 32];
  return out.match(/.{4}/g).join('-');
}
const normRecovery = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

/* ---------- estado em memória (só enquanto desbloqueado) ---------- */
let dekRaw = null;
let dek = null;
let meta = null;

async function useDek(raw) {
  dekRaw = raw;
  dek = await subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function exists() {
  return !!(await kvGet('meta'));
}
export async function getMeta() {
  meta = meta || (await kvGet('meta'));
  return meta;
}
export const isUnlocked = () => !!dek;

/** Cria o cofre. Retorna a chave de recuperação (mostrada uma única vez). */
export async function create(pin, data) {
  const raw = rand(32);
  const pinSalt = rand(16);
  const recSalt = rand(16);
  const recovery = newRecoveryCode();
  meta = {
    v: 1,
    pin: { salt: b64(pinSalt), iter: PIN_ITER, box: await seal(await pbkdf2(pin, pinSalt, PIN_ITER), raw) },
    rec: { salt: b64(recSalt), iter: REC_ITER, box: await seal(await pbkdf2(normRecovery(recovery), recSalt, REC_ITER), raw) },
    bio: null,
    created: new Date().toISOString(),
  };
  await useDek(raw);
  await kvSet({ meta });
  await save(data);
  return recovery;
}

export async function unlockWithPin(pin) {
  const m = await getMeta();
  try {
    const key = await pbkdf2(pin, unb64(m.pin.salt), m.pin.iter);
    await useDek(await open(key, m.pin.box));
    return true;
  } catch {
    return false;
  }
}

export async function unlockWithRecovery(code) {
  const m = await getMeta();
  try {
    const key = await pbkdf2(normRecovery(code), unb64(m.rec.salt), m.rec.iter);
    await useDek(await open(key, m.rec.box));
    return true;
  } catch {
    return false;
  }
}

export async function changePin(pin) {
  const m = await getMeta();
  const salt = rand(16);
  m.pin = { salt: b64(salt), iter: PIN_ITER, box: await seal(await pbkdf2(pin, salt, PIN_ITER), dekRaw) };
  await kvSet({ meta: m });
}

export async function newRecovery() {
  const m = await getMeta();
  const salt = rand(16);
  const code = newRecoveryCode();
  m.rec = { salt: b64(salt), iter: REC_ITER, box: await seal(await pbkdf2(normRecovery(code), salt, REC_ITER), dekRaw) };
  await kvSet({ meta: m });
  return code;
}

export async function load() {
  const box = await kvGet('data');
  if (!box) return null;
  return JSON.parse(dec.decode(await open(dek, box)));
}

export async function save(data) {
  await kvSet({ data: await seal(dek, enc.encode(JSON.stringify(data))) });
}

export function lock() {
  dek = null;
  dekRaw = null;
}

export async function wipe() {
  lock();
  meta = null;
  await kvClear();
}

/* ---------- Face ID (WebAuthn) ---------- */
export async function bioAvailable() {
  try {
    return !!(window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()));
  } catch {
    return false;
  }
}

async function prfAssert(credId, prfSalt) {
  const cred = await navigator.credentials.get({
    publicKey: {
      challenge: rand(32),
      allowCredentials: [{ type: 'public-key', id: unb64(credId) }],
      userVerification: 'required',
      timeout: 60000,
      extensions: { prf: { eval: { first: unb64(prfSalt) } } },
    },
  });
  return cred.getClientExtensionResults()?.prf?.results?.first || null;
}

/** Liga o Face ID. Precisa estar desbloqueado. Retorna 'prf' ou 'device'. */
export async function enableBio() {
  const m = await getMeta();
  const cred = await navigator.credentials.create({
    publicKey: {
      rp: { name: 'Lastro' },
      user: { id: rand(16), name: 'Lastro', displayName: 'Lastro' },
      challenge: rand(32),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000,
      extensions: { prf: {} },
    },
  });
  const credId = b64(cred.rawId);
  const prfSalt = b64(rand(32));
  let mode = 'device';
  let key;
  if (cred.getClientExtensionResults()?.prf?.enabled) {
    // A chave vem do próprio Face ID: sem ele, não há como derivá-la.
    const out = await prfAssert(credId, prfSalt);
    if (out) { key = await hkdf(out, unb64(prfSalt)); mode = 'prf'; }
  }
  if (!key) {
    // Sem PRF: chave AES não exportável guardada no aparelho, liberada só depois do Face ID.
    key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await kvSet({ devkey: key });
  }
  m.bio = { mode, credId, prfSalt, box: await seal(key, dekRaw) };
  await kvSet({ meta: m });
  return mode;
}

export async function disableBio() {
  const m = await getMeta();
  m.bio = null;
  await kvSet({ meta: m, devkey: undefined });
}

export async function unlockWithBio() {
  const m = await getMeta();
  if (!m.bio) return false;
  let key;
  if (m.bio.mode === 'prf') {
    const out = await prfAssert(m.bio.credId, m.bio.prfSalt);
    if (!out) return false;
    key = await hkdf(out, unb64(m.bio.prfSalt));
  } else {
    await navigator.credentials.get({
      publicKey: {
        challenge: rand(32),
        allowCredentials: [{ type: 'public-key', id: unb64(m.bio.credId) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    key = await kvGet('devkey');
  }
  try {
    await useDek(await open(key, m.bio.box));
    return true;
  } catch {
    return false;
  }
}

/* ---------- backup (continua cifrado) ---------- */
export async function exportBackup() {
  return JSON.stringify({ app: 'lastro', v: 1, meta: { ...(await getMeta()), bio: null }, data: await kvGet('data') });
}

export async function importBackup(text) {
  const b = JSON.parse(text);
  if (b.app !== 'lastro' || !b.meta || !b.data) throw new Error('Arquivo de backup inválido');
  lock();
  meta = b.meta;
  await kvSet({ meta: b.meta, data: b.data, devkey: undefined });
}

export async function persist() {
  try { return await navigator.storage?.persist?.(); } catch { return false; }
}
