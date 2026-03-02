// ============================================
// MCP tool handlers — extracted for testability
// ============================================

export function ok(text)  { return { content: [{ type: 'text', text }] }; }
export function err(text) { return { content: [{ type: 'text', text: `Error: ${text}` }], isError: true }; }

export function createHandlers(send) {
  return {
    async browse_scan() {
      try { const r = await send('scan'); return ok(r.result || 'Empty page'); }
      catch (e) { return err(e.message); }
    },

    async browse_zone({ id }) {
      try {
        const r = await send('zone', { zoneId: id });
        if (r.error) return err(r.error);
        return ok(r.result || `Zone ${id} is empty`);
      } catch (e) { return err(e.message); }
    },

    async browse_click({ index }) {
      try { const r = await send('click', { index }, 15000); return ok(r.scan || r.result || `Clicked #${index}`); }
      catch (e) { return err(e.message); }
    },

    async browse_type({ index, text, submit }) {
      try { const r = await send('type', { index, text, submit }, 15000); return ok(r.scan || r.result || `Typed into #${index}`); }
      catch (e) { return err(e.message); }
    },

    async browse_more() {
      try { const r = await send('more'); return ok(r.result || 'No more elements'); }
      catch (e) { return err(e.message); }
    },

    async browse_scroll({ direction }) {
      try { const r = await send('scroll', { direction }); return ok(r.result || 'Scrolled'); }
      catch (e) { return err(e.message); }
    },

    async browse_read() {
      try { const r = await send('read'); return ok(r.result || 'No content'); }
      catch (e) { return err(e.message); }
    },

    async browse_extract({ max_length, offset }) {
      try { const r = await send('extract', { max_length, offset }); return ok(r.result || 'No content'); }
      catch (e) { return err(e.message); }
    },

    async browse_back() {
      try { const r = await send('back', {}, 10000); return ok(r.result || 'Went back'); }
      catch (e) { return err(e.message); }
    },

    async browse_goto({ url }) {
      try { const r = await send('goto', { url }, 20000); return ok(r.result || `Loaded ${url}`); }
      catch (e) { return err(e.message); }
    },

    async browse_list_tools() {
      try {
        const r = await send('listTools');
        if (r.error) return err(r.error);
        const tools = r.result || [];
        if (tools.length === 0) return ok('No WebMCP tools available on this page.');
        const lines = tools.map(t => `- **${t.name}**: ${t.description || '(no description)'}` + (t.inputSchema ? `\n  Schema: ${JSON.stringify(t.inputSchema)}` : ''));
        return ok(`WebMCP tools (${tools.length}):\n${lines.join('\n')}`);
      } catch (e) { return err(e.message); }
    },

    async browse_call_tool({ name, arguments: args }) {
      try {
        const r = await send('callTool', { name, arguments: args }, 15000);
        if (r.error) return err(r.error);
        const text = typeof r.result === 'string' ? r.result : JSON.stringify(r.result, null, 2);
        return ok(text || `Tool "${name}" returned no data.`);
      } catch (e) { return err(e.message); }
    },
  };
}
