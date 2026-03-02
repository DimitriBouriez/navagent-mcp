// Force all shadow roots to open mode so the content script can access them.
// Must run at document_start in the MAIN world, before page scripts execute.
(function() {
  const orig = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function(init) {
    return orig.call(this, { ...init, mode: 'open' });
  };
})();

// WebMCP bridge — exposes navigator.modelContext to the content script (ISOLATED world)
// via window.postMessage. Only this MAIN world script can access the page's modelContext.
window.addEventListener('message', async (e) => {
  if (e.source !== window || e.data?.channel !== 'navagent-webmcp') return;
  const { id, method, args } = e.data;
  try {
    if (!navigator.modelContext) {
      window.postMessage({ channel: 'navagent-webmcp-reply', id, error: 'WebMCP not available on this page' }, '*');
      return;
    }
    let result;
    if (method === 'listTools') {
      const tools = await navigator.modelContext.tools();
      result = (tools || []).slice(0, 50).map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
    } else if (method === 'callTool') {
      result = await navigator.modelContext.callTool(args.name, args.arguments || {});
    }
    window.postMessage({ channel: 'navagent-webmcp-reply', id, result }, '*');
  } catch (err) {
    window.postMessage({ channel: 'navagent-webmcp-reply', id, error: err.message }, '*');
  }
});
