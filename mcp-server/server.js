import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketServer } from 'ws';
import { z } from 'zod';
import { createHandlers } from './handlers.js';

// ============================================
// WebSocket bridge → Chrome Extension
// ============================================

const WS_PORT = parseInt(process.env.NAVAGENT_PORT, 10) || 61822;
let extSocket = null;
const pending = new Map();
let reqId = 0;

const wss = new WebSocketServer({ port: WS_PORT, host: '127.0.0.1' });

wss.on('connection', (socket) => {
  console.error('[NavAgent] Extension connected');
  extSocket = socket;

  socket.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.pong) return; // keepalive response, ignore
      const p = pending.get(msg.id);
      if (p) { pending.delete(msg.id); p.resolve(msg.result || msg); }
    } catch {}
  });

  // Periodic ping to detect dead connections
  const pingInterval = setInterval(() => {
    if (socket.readyState === 1) socket.send(JSON.stringify({ ping: true }));
  }, 20000);
  socket.on('close', () => clearInterval(pingInterval));

  socket.on('close', () => {
    console.error('[NavAgent] Extension disconnected');
    extSocket = null;
    for (const [, p] of pending) p.reject(new Error('Extension disconnected'));
    pending.clear();
  });
});

function send(command, params = {}, timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (!extSocket || extSocket.readyState !== 1) {
      reject(new Error('Extension not connected. Open Chrome with the NavAgent extension.'));
      return;
    }
    const id = ++reqId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout (${command})`)); }, timeout);
    pending.set(id, {
      resolve: (r) => { clearTimeout(timer); resolve(r); },
      reject:  (e) => { clearTimeout(timer); reject(e); }
    });
    extSocket.send(JSON.stringify({ id, command, params }));
  });
}

// ============================================
// MCP Server — 12 tools
// ============================================

const handlers = createHandlers(send);
const server = new McpServer({ name: 'navagent', version: '0.1.0' });

server.tool(
  'browse_scan',
  'Scan the current page. Returns a zone overview on complex pages (use browse_zone to drill in), or a flat element list on simple pages. NOTE: browse_click and browse_type already auto-rescan — do NOT call browse_scan after them.',
  {},
  handlers.browse_scan
);

server.tool(
  'browse_zone',
  'Drill into a zone to see its clickable elements. Use after browse_scan shows zones. After this, browse_click uses zone-local numbering.',
  { id: z.number().int().min(1).describe('Zone number from the scan (e.g. 3 for Z3)') },
  handlers.browse_zone
);

server.tool(
  'browse_click',
  'Click element by its number. When in a zone (after browse_zone), the number refers to the zone-local list. Returns the updated scan AND visible page content, so you can verify the effect immediately without extra calls.',
  { index: z.number().int().min(1).describe('Element number from the scan list') },
  handlers.browse_click
);

server.tool(
  'browse_type',
  'Type text into an [input] field and press Enter. Returns the updated page scan.',
  {
    index: z.number().int().min(1).describe('Input field number'),
    text: z.string().describe('Text to type'),
    submit: z.boolean().default(true).describe('Press Enter after typing')
  },
  handlers.browse_type
);

server.tool(
  'browse_more',
  'Show the next batch of clickable elements from the current page. Use when the scan says "N more → browse_more". No page interaction, just pagination.',
  {},
  handlers.browse_more
);

server.tool(
  'browse_scroll',
  'Physically scroll the page to trigger lazy-loading / infinite scroll (Twitter, Amazon results, etc.). Rescans the DOM after scrolling. Only needed when new content loads on scroll.',
  { direction: z.enum(['down', 'up']).default('down') },
  handlers.browse_scroll
);

server.tool(
  'browse_read',
  'Read the visible text content of the current page (max 2000 chars). Lightweight — use to quickly check page state or verify an action worked.',
  {},
  handlers.browse_read
);

server.tool(
  'browse_extract',
  'Extract the full page content as clean markdown (headings, links, lists, tables, code blocks). Supports pagination for long pages via offset parameter. Heavy operation — only use when you need full structured content (articles, documentation). For navigation, prefer browse_scan + browse_zone instead.',
  {
    max_length: z.number().int().min(100).max(50000).default(5000).describe('Max characters to return (default 5000)'),
    offset: z.number().int().min(0).default(0).describe('Character offset for pagination (default 0)')
  },
  handlers.browse_extract
);

server.tool(
  'browse_back',
  'Go back to the previous page. Returns the updated scan.',
  {},
  handlers.browse_back
);

server.tool(
  'browse_goto',
  'Navigate to a URL. Returns the page scan after loading.',
  { url: z.string().url().describe('URL to navigate to') },
  handlers.browse_goto
);

server.tool(
  'browse_list_tools',
  'List WebMCP tools declared by the current page (navigator.modelContext). Returns tool names, descriptions, and input schemas. Only works on pages that implement the WebMCP standard.',
  {},
  handlers.browse_list_tools
);

server.tool(
  'browse_call_tool',
  'Invoke a WebMCP tool declared by the current page. Use browse_list_tools first to discover available tools.',
  {
    name: z.string().describe('Tool name (from browse_list_tools)'),
    arguments: z.record(z.unknown()).default({}).describe('Arguments object for the tool')
  },
  handlers.browse_call_tool
);

// ============================================
// Start
// ============================================

async function main() {
  console.error(`[NavAgent] MCP server ready — ws://127.0.0.1:${WS_PORT}`);
  await server.connect(new StdioServerTransport());
}

main().catch((e) => { console.error('[NavAgent] Fatal:', e); process.exit(1); });
