import { describe, it, expect, vi } from 'vitest';
import { createHandlers, ok, err } from '../handlers.js';

// ── Helpers ──────────────────────

function mockSend(response) {
  return vi.fn().mockResolvedValue(response);
}

function failingSend(message) {
  return vi.fn().mockRejectedValue(new Error(message));
}

// ── ok / err ──────────────────────

describe('ok()', () => {
  it('wraps text in MCP content format', () => {
    expect(ok('hello')).toEqual({ content: [{ type: 'text', text: 'hello' }] });
  });
});

describe('err()', () => {
  it('wraps text with Error prefix and isError flag', () => {
    expect(err('fail')).toEqual({
      content: [{ type: 'text', text: 'Error: fail' }],
      isError: true,
    });
  });
});

// ── Handler tests ──────────────────────

describe('browse_scan', () => {
  it('returns scan result', async () => {
    const send = mockSend({ result: '1. Home\n2. About' });
    const h = createHandlers(send);
    const res = await h.browse_scan();
    expect(send).toHaveBeenCalledWith('scan');
    expect(res.content[0].text).toBe('1. Home\n2. About');
  });

  it('returns "Empty page" when result is empty', async () => {
    const send = mockSend({});
    const h = createHandlers(send);
    const res = await h.browse_scan();
    expect(res.content[0].text).toBe('Empty page');
  });

  it('returns error when extension disconnected', async () => {
    const send = failingSend('Extension not connected');
    const h = createHandlers(send);
    const res = await h.browse_scan();
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('Extension not connected');
  });
});

describe('browse_zone', () => {
  it('returns zone content', async () => {
    const send = mockSend({ result: 'Zone Z1 — Header\n1. Logo' });
    const h = createHandlers(send);
    const res = await h.browse_zone({ id: 1 });
    expect(send).toHaveBeenCalledWith('zone', { zoneId: 1 });
    expect(res.content[0].text).toContain('Zone Z1');
  });

  it('returns error from response', async () => {
    const send = mockSend({ error: 'Zone Z99 not found' });
    const h = createHandlers(send);
    const res = await h.browse_zone({ id: 99 });
    expect(res.isError).toBe(true);
  });

  it('returns fallback when zone is empty', async () => {
    const send = mockSend({});
    const h = createHandlers(send);
    const res = await h.browse_zone({ id: 3 });
    expect(res.content[0].text).toBe('Zone 3 is empty');
  });
});

describe('browse_click', () => {
  it('returns scan after click', async () => {
    const send = mockSend({ scan: 'Updated scan' });
    const h = createHandlers(send);
    const res = await h.browse_click({ index: 3 });
    expect(send).toHaveBeenCalledWith('click', { index: 3 }, 15000);
    expect(res.content[0].text).toBe('Updated scan');
  });

  it('falls back to result field', async () => {
    const send = mockSend({ result: 'Clicked OK' });
    const h = createHandlers(send);
    const res = await h.browse_click({ index: 1 });
    expect(res.content[0].text).toBe('Clicked OK');
  });

  it('falls back to default message', async () => {
    const send = mockSend({});
    const h = createHandlers(send);
    const res = await h.browse_click({ index: 5 });
    expect(res.content[0].text).toBe('Clicked #5');
  });
});

describe('browse_type', () => {
  it('sends type with correct params and timeout', async () => {
    const send = mockSend({ scan: 'After type' });
    const h = createHandlers(send);
    const res = await h.browse_type({ index: 2, text: 'hello', submit: true });
    expect(send).toHaveBeenCalledWith('type', { index: 2, text: 'hello', submit: true }, 15000);
    expect(res.content[0].text).toBe('After type');
  });
});

describe('browse_more', () => {
  it('returns more elements', async () => {
    const send = mockSend({ result: '26. Item\n27. Item' });
    const h = createHandlers(send);
    const res = await h.browse_more();
    expect(send).toHaveBeenCalledWith('more');
    expect(res.content[0].text).toContain('26.');
  });

  it('returns fallback when no more', async () => {
    const send = mockSend({});
    const h = createHandlers(send);
    const res = await h.browse_more();
    expect(res.content[0].text).toBe('No more elements');
  });
});

describe('browse_scroll', () => {
  it('sends scroll direction', async () => {
    const send = mockSend({ result: 'Scrolled down' });
    const h = createHandlers(send);
    const res = await h.browse_scroll({ direction: 'down' });
    expect(send).toHaveBeenCalledWith('scroll', { direction: 'down' });
    expect(res.content[0].text).toBe('Scrolled down');
  });
});

describe('browse_read', () => {
  it('returns page text', async () => {
    const send = mockSend({ result: 'Page content here' });
    const h = createHandlers(send);
    const res = await h.browse_read();
    expect(send).toHaveBeenCalledWith('read');
    expect(res.content[0].text).toBe('Page content here');
  });
});

describe('browse_extract', () => {
  it('sends extract with params', async () => {
    const send = mockSend({ result: '# Title\nContent' });
    const h = createHandlers(send);
    const res = await h.browse_extract({ max_length: 3000, offset: 100 });
    expect(send).toHaveBeenCalledWith('extract', { max_length: 3000, offset: 100 });
    expect(res.content[0].text).toBe('# Title\nContent');
  });
});

describe('browse_back', () => {
  it('sends back with 10s timeout', async () => {
    const send = mockSend({ result: 'Previous page' });
    const h = createHandlers(send);
    const res = await h.browse_back();
    expect(send).toHaveBeenCalledWith('back', {}, 10000);
    expect(res.content[0].text).toBe('Previous page');
  });
});

describe('browse_goto', () => {
  it('sends goto with URL and 20s timeout', async () => {
    const send = mockSend({ result: 'Loaded' });
    const h = createHandlers(send);
    const res = await h.browse_goto({ url: 'https://example.com' });
    expect(send).toHaveBeenCalledWith('goto', { url: 'https://example.com' }, 20000);
    expect(res.content[0].text).toBe('Loaded');
  });

  it('returns fallback with URL', async () => {
    const send = mockSend({});
    const h = createHandlers(send);
    const res = await h.browse_goto({ url: 'https://test.dev' });
    expect(res.content[0].text).toBe('Loaded https://test.dev');
  });
});

// ── WebMCP tools ──────────────────────

describe('browse_list_tools', () => {
  it('formats tools list with names and descriptions', async () => {
    const send = mockSend({ result: [
      { name: 'search', description: 'Search products', inputSchema: { query: { type: 'string' } } },
      { name: 'add_to_cart', description: 'Add item to cart' },
    ]});
    const h = createHandlers(send);
    const res = await h.browse_list_tools();
    expect(send).toHaveBeenCalledWith('listTools');
    expect(res.content[0].text).toContain('WebMCP tools (2)');
    expect(res.content[0].text).toContain('**search**');
    expect(res.content[0].text).toContain('**add_to_cart**');
  });

  it('returns message when no tools available', async () => {
    const send = mockSend({ result: [] });
    const h = createHandlers(send);
    const res = await h.browse_list_tools();
    expect(res.content[0].text).toBe('No WebMCP tools available on this page.');
  });

  it('returns error when WebMCP not supported', async () => {
    const send = mockSend({ error: 'WebMCP not available on this page' });
    const h = createHandlers(send);
    const res = await h.browse_list_tools();
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('WebMCP not available');
  });

  it('returns error on send failure', async () => {
    const send = failingSend('Extension not connected');
    const h = createHandlers(send);
    const res = await h.browse_list_tools();
    expect(res.isError).toBe(true);
  });
});

describe('browse_call_tool', () => {
  it('returns string result directly', async () => {
    const send = mockSend({ result: 'Found 42 results' });
    const h = createHandlers(send);
    const res = await h.browse_call_tool({ name: 'search', arguments: { query: 'shoes' } });
    expect(send).toHaveBeenCalledWith('callTool', { name: 'search', arguments: { query: 'shoes' } }, 15000);
    expect(res.content[0].text).toBe('Found 42 results');
  });

  it('JSON-stringifies object result', async () => {
    const send = mockSend({ result: { items: [1, 2, 3] } });
    const h = createHandlers(send);
    const res = await h.browse_call_tool({ name: 'list', arguments: {} });
    expect(res.content[0].text).toContain('"items"');
  });

  it('returns error from response', async () => {
    const send = mockSend({ error: 'Tool not found' });
    const h = createHandlers(send);
    const res = await h.browse_call_tool({ name: 'nope', arguments: {} });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('Tool not found');
  });

  it('returns fallback when no data', async () => {
    const send = mockSend({});
    const h = createHandlers(send);
    const res = await h.browse_call_tool({ name: 'empty', arguments: {} });
    expect(res.content[0].text).toBe('Tool "empty" returned no data.');
  });
});
