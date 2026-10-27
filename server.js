// server.js — serves the demo and lets the AI agent talk to Claude.
//
//   node server.js            then open http://localhost:4100
//
// The Claude API key stays on this computer: put it in a file named .env next
// to this one (ANTHROPIC_API_KEY=sk-ant-...) or set the environment variable.
// The browser never sees the key; it sends the conversation to /api/messages
// and this server adds the key and forwards it to Anthropic.
//
// Only reachable from this computer (127.0.0.1). No dependencies (Node 18+).
//
// Options (.env or environment):
//   ANTHROPIC_API_KEY   required for the AI agent
//   CLAUDE_MODEL        default claude-sonnet-5-5 (fast); claude-opus-5-5 is stronger but slower
//   PORT                default 4100

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

// Minimal .env loader.
const envFile = join(ROOT, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const PORT = Number(process.env.PORT) || 4100;
const UPSTREAM = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.md': 'text/plain; charset=utf-8' };

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readBody(req, limit = 2_000_000) {
  let size = 0; const parts = [];
  for await (const c of req) { size += c.length; if (size > limit) throw new Error('request too large'); parts.push(c); }
  return Buffer.concat(parts).toString('utf8');
}

async function proxyMessages(req, res) {
  if (!KEY) return send(res, 503, { error: 'No API key. Add ANTHROPIC_API_KEY to the .env file and restart the server.' });
  let body;
  try { body = JSON.parse(await readBody(req)); } catch (e) { return send(res, 400, { error: `Bad request: ${e.message}` }); }
  // Only pass through the fields the agent uses; the model is chosen here.
  const payload = { model: MODEL, max_tokens: Math.min(Number(body.max_tokens) || 1024, 4096), system: body.system, messages: body.messages, tools: body.tools };
  if (body.tool_choice) payload.tool_choice = body.tool_choice;
  try {
    const r = await fetch(`${UPSTREAM}/v1/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    res.writeHead(r.status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(text);
  } catch (e) {
    send(res, 502, { error: `Couldn't reach Anthropic: ${e.message}` });
  }
}

async function serveFile(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = normalize(join(ROOT, p));
  if (!file.startsWith(ROOT) || /(^|[\\/])\.(env|git)/.test(file.slice(ROOT.length))) return send(res, 404, 'Not found', 'text/plain');
  try {
    if (!(await stat(file)).isFile()) return send(res, 404, 'Not found', 'text/plain');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(await readFile(file));
  } catch { send(res, 404, 'Not found', 'text/plain'); }
}

createServer(async (req, res) => {
  if (req.url === '/api/status') return send(res, 200, { ai: !!KEY, model: MODEL });
  if (req.url === '/api/messages' && req.method === 'POST') return proxyMessages(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed' });
  return serveFile(req, res);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Demo running at http://localhost:${PORT}`);
  console.log(KEY ? `AI agent: on (model ${MODEL})` : 'AI agent: off (no ANTHROPIC_API_KEY in .env). The scripted agent still works.');
});
