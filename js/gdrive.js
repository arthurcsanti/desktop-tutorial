// Backup do Lastro no Google Drive.
// O arquivo enviado é o mesmo backup cifrado (.lastro) do botão "Fazer backup":
// o Google guarda só dados embaralhados; para abrir é preciso o código do app
// ou a chave de recuperação. Os backups ficam em "Lastro/Backups" no Drive.
// O escopo drive.file só dá acesso aos arquivos que o próprio app criou.

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const KEEP = 15; // backups guardados; os mais antigos vão para a lixeira do Drive

let token = null;
let expires = 0;
let gis = null;
const folders = {};

const ls = {
  get: (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem storage */ } },
};

export const clientId = () => ls.get('lastro-drive-client');
export const setClientId = (id) => ls.set('lastro-drive-client', (id || '').trim());
export const lastBackup = () => ls.get('lastro-drive-last');
export const isConnected = () => !!token && Date.now() < expires;

// Reaproveita o ID do cliente do Máquina de Roteiro (mesmo endereço, mesmo projeto do Google).
export async function guessClientId() {
  if (clientId()) return clientId();
  try {
    const dbs = (await indexedDB.databases?.()) || [];
    if (!dbs.some((d) => d.name === 'maquina-de-roteiro')) return '';
    const db = await new Promise((res, rej) => { const r = indexedDB.open('maquina-de-roteiro'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    if (!db.objectStoreNames.contains('meta')) { db.close(); return ''; }
    const st = await new Promise((res) => { const r = db.transaction('meta').objectStore('meta').get('settings'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
    db.close();
    return st?.clientId || '';
  } catch { return ''; }
}

export function loadGoogle() {
  gis ||= new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { gis = null; reject(new Error('Não foi possível carregar o login do Google. Você está offline?')); };
    document.head.appendChild(s);
  });
  return gis;
}

// Precisa vir de um toque: o Google abre a janela de login.
export async function connect() {
  const id = clientId();
  if (!id) throw new Error('Cole o ID do cliente do Google primeiro.');
  await loadGoogle();
  await new Promise((resolve, reject) => {
    google.accounts.oauth2.initTokenClient({
      client_id: id,
      scope: SCOPE,
      callback: (r) => {
        if (r.error) return reject(new Error(r.error_description || r.error));
        token = r.access_token;
        expires = Date.now() + (Number(r.expires_in || 3600) - 60) * 1000;
        resolve();
      },
      error_callback: (e) => reject(new Error(e?.message || e?.type || 'Login cancelado.')),
    }).requestAccessToken({ prompt: 'select_account' });
  });
}

export function disconnect() {
  if (token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {});
  token = null;
  expires = 0;
}

async function api(url, opts = {}) {
  if (!isConnected()) throw new Error('Conexão com o Google expirou. Conecte de novo.');
  const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  if (res.status === 401) { token = null; throw new Error('Conexão com o Google expirou. Conecte de novo.'); }
  if (!res.ok) throw new Error(`Google Drive respondeu ${res.status}`);
  return res;
}

const q = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
async function folder(name, parent) {
  const key = `${parent || ''}/${name}`;
  if (folders[key]) return folders[key];
  const query = `name='${q(name)}' and mimeType='${FOLDER_MIME}' and trashed=false` + (parent ? ` and '${parent}' in parents` : '');
  const { files } = await (await api(`${API}/files?q=${encodeURIComponent(query)}&fields=files(id)`)).json();
  if (files.length) return (folders[key] = files[0].id);
  const res = await api(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: parent ? [parent] : undefined }),
  });
  return (folders[key] = (await res.json()).id);
}
const backupsFolder = async () => folder('Backups', await folder('Lastro'));

export async function listBackups() {
  const parent = await backupsFolder();
  const query = `'${parent}' in parents and trashed=false and mimeType!='${FOLDER_MIME}'`;
  const res = await api(`${API}/files?q=${encodeURIComponent(query)}&orderBy=createdTime desc&pageSize=100&fields=files(id,name,createdTime,size)`);
  return (await res.json()).files;
}

export async function backupNow(text) {
  const parent = await backupsFolder();
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const name = `lastro-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}h${p(d.getMinutes())}.lastro`;
  const boundary = 'lb' + Math.random().toString(36).slice(2);
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [parent], mimeType: 'application/json', appProperties: { lastro: 'backup' } })}\r\n`,
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n`, text, `\r\n--${boundary}--`,
  ]);
  await api(`${UPLOAD}/files?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
  // guarda só os mais recentes
  const all = await listBackups();
  for (const f of all.slice(KEEP)) {
    await api(`${API}/files/${f.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
  }
  ls.set('lastro-drive-last', d.toISOString());
  return { name, kept: Math.min(all.length, KEEP) };
}

export async function downloadBackup(id) {
  return (await api(`${API}/files/${id}?alt=media`)).text();
}
