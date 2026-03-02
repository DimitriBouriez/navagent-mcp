# navagent-mcp

Ultra-light browser navigation MCP server. The AI sees a numbered list of clickable elements (**~80 tokens**) instead of screenshots (~2000+ tokens).

```
AI sees:                   AI does:
────────────               ─────────────
📍 amazon.com              browse_click(6)
1. My Account [link]
2. Cart (0) [link]
3. Search [input]
4. Computers [link]
5. Electronics [link]
6. Books [link]
```

## Quick Start

### 1. Install the Chrome extension

**Chrome Web Store** (recommended): *coming soon*

**Or sideload**:
1. Download/clone the repo
2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** → select the `chrome-extension/` folder

### 2. Configure the MCP server

#### Claude Desktop

Edit `claude_desktop_config.json`:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "navagent": {
      "command": "npx",
      "args": ["-y", "navagent-mcp"]
    }
  }
}
```

#### Claude Code

Add to `.mcp.json` (project or global `~/.claude.json`):

```json
{
  "mcpServers": {
    "navagent": {
      "command": "npx",
      "args": ["-y", "navagent-mcp"]
    }
  }
}
```

#### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "navagent": {
      "command": "npx",
      "args": ["-y", "navagent-mcp"]
    }
  }
}
```

## Available tools (12)

| Tool | Description |
|------|-------------|
| `browse_scan` | Scan the page → zones or flat list of clickable elements |
| `browse_zone` | Drill into a zone to see its elements |
| `browse_click` | Click an element by number + auto-rescan |
| `browse_type` | Type into an [input] field + Enter |
| `browse_more` | Pagination (next batch of elements/zones) |
| `browse_scroll` | Physical scroll for lazy-loading / infinite scroll |
| `browse_read` | Visible page text (max 2000 chars) |
| `browse_extract` | Full page content as structured markdown with pagination |
| `browse_goto` | Navigate to a URL + scan |
| `browse_back` | Go back to previous page + rescan |
| `browse_list_tools` | List WebMCP tools declared by the page (navigator.modelContext) |
| `browse_call_tool` | Invoke a WebMCP tool — the AI calls site APIs directly |

## Configuration

### WebSocket port

By default, the WebSocket bridge uses port `61822`. To change it:

1. Set an environment variable in the MCP config:
```json
{
  "mcpServers": {
    "navagent": {
      "command": "npx",
      "args": ["-y", "navagent-mcp"],
      "env": { "NAVAGENT_PORT": "61900" }
    }
  }
}
```

2. Set the same port in the Chrome extension options.

## Architecture

```
MCP Client (Claude, Cursor, etc.)
    ↓ stdio (Model Context Protocol)
navagent-mcp (this package)
    ↓ WebSocket localhost:61822
Chrome Extension NavAgent
    ↓ chrome.tabs.sendMessage
Content Script (DOM scanner)
```

The Chrome extension uses the user's own cookies and sessions — no cloud proxy, no anti-bot detection.

## Author

Dimitri Bouriez — [dimitri.bouriez.dev@gmail.com](mailto:dimitri.bouriez.dev@gmail.com)

## License

MIT
