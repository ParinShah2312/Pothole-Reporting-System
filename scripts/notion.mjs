import fs from 'fs';
import path from 'path';

let TOKEN = process.env.NOTION_API_KEY;
if (!TOKEN && fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    if (line.startsWith('NOTION_API_KEY=')) {
      TOKEN = line.split('=')[1].trim();
      break;
    }
  }
}
if (!TOKEN) {
  throw new Error('NOTION_API_KEY is not defined in .env or environment.');
}

const NOTION_VERSION = '2022-06-28';

export async function notionRequest(endpoint, options = {}) {
  const url = `https://api.notion.com/v1${endpoint}`;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Notion-Version': NOTION_VERSION,
    ...options.headers,
  };
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} on ${endpoint}: ${text}`);
  }
  return res.json();
}

export async function queryDatabase(dbId) {
  const rows = [];
  let cursor;
  while (true) {
    const res = await notionRequest(`/databases/${dbId}/query`, {
      method: 'POST',
      body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
    });
    rows.push(...res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }
  return rows;
}

export async function updatePageProperties(pageId, properties) {
  return notionRequest(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  });
}

export async function createDatabasePage(databaseId, properties) {
  return notionRequest('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });
}

export async function listChildren(blockId) {
  const items = [];
  let cursor;
  while (true) {
    const qs = cursor ? `?page_size=100&start_cursor=${cursor}` : '?page_size=100';
    const res = await notionRequest(`/blocks/${blockId}/children${qs}`);
    items.push(...res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }
  return items;
}

export async function appendChildren(blockId, children) {
  for (let i = 0; i < children.length; i += 80) {
    await notionRequest(`/blocks/${blockId}/children`, {
      method: 'PATCH',
      body: JSON.stringify({ children: children.slice(i, i + 80) }),
    });
  }
}

/**
 * Safely clears non-child-page/database blocks on a documentation page and appends
 * updated blocks, preserving any nested child_page or child_database blocks.
 */
export async function replacePageContent(pageId, blocks) {
  const existing = await listChildren(pageId);
  for (const b of existing) {
    if (b.type === 'child_page' || b.type === 'child_database') continue;
    await notionRequest(`/blocks/${b.id}`, { method: 'DELETE' });
  }
  await appendChildren(pageId, blocks);
}

/**
 * Upload a local PNG/file using Notion's direct 2-step File Upload API.
 */
export async function uploadImage(filePath) {
  const filename = path.basename(filePath);
  const created = await notionRequest('/file_uploads', {
    method: 'POST',
    body: JSON.stringify({ filename, content_type: 'image/png' }),
  });
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(filePath)], { type: 'image/png' }), filename);
  const uploadUrl = created.upload_url || `https://api.notion.com/v1/file_uploads/${created.id}/send`;
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Notion-Version': NOTION_VERSION,
    },
    body: fd,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload failed for ${filename} (${res.status}): ${txt}`);
  }
  return created.id;
}
