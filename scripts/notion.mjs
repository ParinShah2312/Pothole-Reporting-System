import fs from 'fs';

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
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} on ${endpoint}: ${text}`);
  }
  return res.json();
}

export async function queryDatabase(dbId) {
  let rows = [];
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
