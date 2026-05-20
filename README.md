# Ace Grid MCP

Local Model Context Protocol server for Ace Grid. It gives MCP-compatible tools access to bundled Ace Grid docs, API metadata, config validation, framework implementation generation, and optional account/license automation.

## Install

```bash
npm install -g @ace-grid/mcp
```

Use with Claude Desktop, Cursor, Codex, or any MCP client that can launch a stdio server:

```json
{
  "mcpServers": {
    "ace-grid": {
      "command": "npx",
      "args": ["@ace-grid/mcp"]
    }
  }
}
```

During local development from this repository:

```json
{
  "mcpServers": {
    "ace-grid": {
      "command": "node",
      "args": ["/absolute/path/to/ace-grid-mcp/dist/index.js"]
    }
  }
}
```

## Account Tools

Docs and validation tools are fully local. Account tools call the Ace Grid portal API only when `ACE_GRID_PORTAL_TOKEN` is set:

```bash
ACE_GRID_PORTAL_TOKEN=eyJ... ace-grid-mcp
```

Optional environment variables:

- `ACE_GRID_API_BASE_URL`: defaults to `https://api.ace-grid.com`.
- `ACE_GRID_PORTAL_TOKEN`: bearer token for account app/key operations.

## Tools

- `ace_grid_search_docs`: search bundled Ace Grid docs, guide text, API metadata, and feature groups.
- `ace_grid_search_api`: search only generated Ace Grid API metadata.
- `ace_grid_search_doc_pages`: search only written docs page content.
- `ace_grid_list_doc_pages`: list bundled docs pages.
- `ace_grid_get_doc_page`: return a docs page by slug or path.
- `ace_grid_list_feature_groups`: list feature groups and prop counts.
- `ace_grid_get_prop`: inspect a prop by path, for example `layout.height`.
- `ace_grid_validate_config`: report unknown and missing props in a config object.
- `ace_grid_plan_implementation`: infer framework packages, required tier, matched features, docs, and relevant props from a natural-language request.
- `ace_grid_generate_implementation`: generate React, Angular, Vue, Svelte, or Web Components starter code from a natural-language request.
- `ace_grid_generate_react_example`: generate a React starter snippet for Community, Pro, or Enterprise.
- `ace_grid_list_examples`: list bundled framework examples.
- `ace_grid_generate_framework_example`: generate a bundled framework example.
- `ace_grid_license_setup`: explain license config and public-key behavior.
- `ace_grid_account_status`: optional authenticated account overview.
- `ace_grid_list_apps`: optional authenticated app listing.
- `ace_grid_create_app`: optional authenticated app creation.
- `ace_grid_list_license_keys`: optional authenticated key listing.
- `ace_grid_create_license_key`: optional authenticated key creation.

## Development

```bash
npm install
npm test
npm run build
```

The bundled metadata in `data/` is generated from the Ace Grid portal snapshots. Refresh those files before publishing a new MCP version.
