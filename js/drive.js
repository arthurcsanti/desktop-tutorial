// Sincronização com o Google Drive.
// Pasta "Máquina de Roteiro" no Drive do usuário:
//   Título do roteiro.md   <- um arquivo Markdown por roteiro (abre no Obsidian)
//   anexos/abc123.jpg      <- imagens usadas nos roteiros
// O escopo drive.file só dá acesso aos arquivos criados pelo próprio app.

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Máquina de Roteiro';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

let token = null;
let tokenExpires = 0;
let folders = {};
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
  folders = {};
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

async function ensureFolder(name, parent) {
  const key = (parent || '') + '/' + name;
  if (folders[key]) return folders[key];
  const query = `name='${q(name)}' and mimeType='${FOLDER_MIME}' and trashed=false` + (parent ? ` and '${parent}' in parents` : '');
  const res = await api(`${API}/files?q=${encodeURIComponent(query)}&fields=files(id)&spaces=drive`);
  const { files } = await res.json();
  if (files.length) return (folders[key] = files[0].id);
  const created = await api(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: parent ? [parent] : undefined }),
  });
  return (folders[key] = (await created.json()).id);
}

async function listIn(parent) {
  const query = `'${parent}' in parents and trashed=false and mimeType!='${FOLDER_MIME}'`;
  const files = [];
  let pageToken = '';
  do {
    const res = await api(
      `${API}/files?q=${encodeURIComponent(query)}&pageSize=1000&fields=nextPageToken,files(id,name,modifiedTime,appProperties)` +
        (pageToken ? `&pageToken=${pageToken}` : ''),
    );
    const data = await res.json();
    files.push(...data.files);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return files;
}

async function upload({ fileId, name, parent, mimeType, appProperties, body }) {
  const metadata = { name, mimeType, appProperties };
  if (!fileId) metadata.parents = [parent];
  const boundary = 'mr' + Math.random().toString(36).slice(2);
  const multipart = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    body,
    `\r\n--${boundary}--`,
  ]);
  const res = await api(`${UPLOAD}/files${fileId ? '/' + fileId : ''}?uploadType=multipart&fields=id,modifiedTime`, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipart,
  });
  return res.json();
}

const downloadText = async (id) => (await api(`${API}/files/${id}?alt=media`)).text();
const downloadBlob = async (id) => (await api(`${API}/files/${id}?alt=media`)).blob();
const trashFile = (id) => api(`${API}/files/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ trashed: true }),
});

// Sincroniza roteiros e imagens. io traz as funções do app:
//   toMd(script) -> string, fromMd(text, {id, fallbackTitle}) -> script,
//   fileName(script), localFiles() -> [{path, blob}], needPaths -> [paths], saveBlob(path, blob)
// Devolve { save: [roteiros para gravar], remove: [ids para apagar] }.
export async function sync(scripts, io) {
  const root = await ensureFolder(FOLDER_NAME);
  const remote = await listIn(root);
  const byId = new Map();
  const unknown = [];
  for (const f of remote) {
    const id = f.appProperties?.mrId;
    if (id) byId.set(id, f);
    else if (/\.(md|markdown)$/i.test(f.name)) unknown.push(f);
  }
  const save = [];
  const remove = [];

  const pull = async (f, id) => {
    const r = io.fromMd(await downloadText(f.id), { id, fallbackTitle: f.name.replace(/\.(md|markdown)$/i, '') });
    // Editado fora do app (Obsidian, Drive): a data do arquivo vale mais.
    r.updatedAt = Math.max(r.updatedAt, Date.parse(f.modifiedTime) || 0);
    // "at" usa o relógio deste aparelho: edições daqui em diante contam como mudança local.
    r._sync = { fileId: f.id, at: Math.max(Date.now(), r.updatedAt), modified: f.modifiedTime };
    return r;
  };

  const push = async (s, fileId) => {
    const at = s.updatedAt;
    const res = await upload({
      fileId,
      name: io.fileName(s),
      parent: root,
      mimeType: 'text/markdown',
      appProperties: { mrId: s.id },
      body: io.toMd(s),
    });
    s._sync = { fileId: res.id, at, modified: res.modifiedTime };
    save.push(s);
  };

  for (const s of scripts) {
    const f = byId.get(s.id);
    byId.delete(s.id);
    const meta = s._sync || {};
    if (s.purged) {
      if (f) await trashFile(f.id);
      remove.push(s.id);
      continue;
    }
    if (!f) {
      if (meta.fileId && s.updatedAt <= meta.at) remove.push(s.id); // apagado em outro aparelho
      else await push(s);
      continue;
    }
    const remoteChanged = f.modifiedTime !== meta.modified;
    const localChanged = s.updatedAt > (meta.at || 0);
    if (localChanged && (!remoteChanged || s.updatedAt >= Date.parse(f.modifiedTime))) await push(s, f.id);
    else if (remoteChanged) save.push(await pull(f, s.id));
  }
  for (const f of byId.values()) save.push(await pull(f, f.appProperties.mrId));
  for (const f of unknown) {
    const r = await pull(f);
    await api(`${API}/files/${f.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appProperties: { mrId: r.id } }),
    });
    save.push(r);
  }

  // Imagens: envia as que faltam lá, baixa as que faltam aqui.
  const anexos = await ensureFolder('anexos', root);
  const remoteFiles = new Map((await listIn(anexos)).map((f) => [f.name, f]));
  const local = await io.localFiles();
  const localNames = new Set(local.map((f) => f.path.replace(/^anexos\//, '')));
  for (const f of local) {
    const name = f.path.replace(/^anexos\//, '');
    if (remoteFiles.has(name)) continue;
    await upload({ name, parent: anexos, mimeType: f.blob.type || 'application/octet-stream', body: f.blob });
  }
  const needed = io.needPaths([...scripts, ...save]);
  for (const path of needed) {
    const name = path.replace(/^anexos\//, '');
    const f = remoteFiles.get(name);
    if (f && !localNames.has(name)) await io.saveBlob(path, await downloadBlob(f.id));
  }
  return { save, remove };
}
