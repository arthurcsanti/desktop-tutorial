// Sincronização com o Google Drive.
// Cada roteiro vira um arquivo "<título>.roteiro.json" dentro da pasta
// "Máquina de Roteiro" no Drive do usuário. O escopo drive.file só dá acesso
// aos arquivos criados pelo próprio app; o resto do Drive fica intocado.

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Máquina de Roteiro';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

let token = null;
let tokenExpires = 0;
let folderId = null;
let gisPromise = null;

export function loadGoogle() {
  gisPromise ||= new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisPromise = null;
      reject(new Error('Não foi possível carregar o login do Google. Você está offline?'));
    };
    document.head.appendChild(s);
  });
  return gisPromise;
}

export const isConnected = () => !!token && Date.now() < tokenExpires;

export function disconnect() {
  if (token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {});
  token = null;
  tokenExpires = 0;
  folderId = null;
}

// Precisa ser chamada a partir de um clique: o Google abre uma janela de login.
export function connect(clientId) {
  if (!window.google?.accounts?.oauth2) {
    return Promise.reject(new Error('O login do Google ainda está carregando. Tente de novo em instantes.'));
  }
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) return reject(new Error(resp.error_description || resp.error));
        token = resp.access_token;
        tokenExpires = Date.now() + (Number(resp.expires_in || 3600) - 60) * 1000;
        resolve();
      },
      error_callback: (err) => reject(new Error(err?.message || err?.type || 'Login cancelado.')),
    });
    client.requestAccessToken({ prompt: 'select_account' });
  });
}

async function api(url, opts = {}) {
  if (!isConnected()) throw new Error('Sessão do Google expirada. Conecte de novo.');
  const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  if (res.status === 401) {
    token = null;
    throw new Error('Sessão do Google expirada. Conecte de novo.');
  }
  if (!res.ok) throw new Error(`Google Drive respondeu ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

const q = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function ensureFolder() {
  if (folderId) return folderId;
  const query = `name='${q(FOLDER_NAME)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await api(`${API}/files?q=${encodeURIComponent(query)}&fields=files(id)&spaces=drive`);
  const { files } = await res.json();
  if (files.length) return (folderId = files[0].id);
  const created = await api(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  });
  return (folderId = (await created.json()).id);
}

async function listRemote() {
  const parent = await ensureFolder();
  const query = `'${parent}' in parents and trashed=false`;
  const files = [];
  let pageToken = '';
  do {
    const res = await api(
      `${API}/files?q=${encodeURIComponent(query)}&pageSize=1000&fields=nextPageToken,files(id,name,appProperties)` +
        (pageToken ? `&pageToken=${pageToken}` : ''),
    );
    const data = await res.json();
    files.push(...data.files);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return files;
}

function fileName(script) {
  const base = (script.title || 'Sem título').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
  return `${base}.roteiro.json`;
}

async function upload(script, fileId) {
  const metadata = {
    name: fileName(script),
    mimeType: 'application/json',
    appProperties: { mrId: script.id, updatedAt: String(script.updatedAt) },
  };
  if (!fileId) metadata.parents = [await ensureFolder()];
  const boundary = 'mr' + Math.random().toString(36).slice(2);
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(script)}\r\n` +
    `--${boundary}--`;
  await api(`${UPLOAD}/files${fileId ? '/' + fileId : ''}?uploadType=multipart&fields=id`, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
}

async function download(fileId) {
  const res = await api(`${API}/files/${fileId}?alt=media`);
  return res.json();
}

// Envia o que é mais novo aqui, baixa o que é mais novo lá.
// Devolve os roteiros que vieram da nuvem para o app gravar localmente.
export async function sync(localScripts) {
  const remote = await listRemote();
  const byId = new Map();
  for (const f of remote) {
    const id = f.appProperties?.mrId;
    if (id) byId.set(id, f);
  }
  const pulled = [];
  let sent = 0;
  for (const s of localScripts) {
    const f = byId.get(s.id);
    byId.delete(s.id);
    const remoteUpdated = Number(f?.appProperties?.updatedAt || 0);
    if (!f) {
      await upload(s);
      sent++;
    } else if (s.updatedAt > remoteUpdated) {
      await upload(s, f.id);
      sent++;
    } else if (remoteUpdated > s.updatedAt) {
      pulled.push(await download(f.id));
    }
  }
  for (const f of byId.values()) pulled.push(await download(f.id));
  return { pulled: pulled.filter((x) => x && x.id), sent };
}
