# @ace-grid/mcp

Ace Grid MCP is a local Model Context Protocol server for Ace Grid documentation, API metadata, config validation, migration help, and framework example generation.

It is designed for MCP-compatible AI coding tools such as Claude Desktop, Cursor, Codex, and other clients that can launch a stdio MCP server.

## Install

```bash
npm install -g @ace-grid/mcp
```

You can also run it without a global install:

```bash
npx @ace-grid/mcp
```

## MCP client configuration

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

For local development from this repository:

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

## Local-first behavior

Documentation, API search, config validation, implementation planning, and example generation use bundled metadata and run locally. No Ace Grid account or Portal token is required.

## Tools

- `ace_grid_search_docs`: search bundled docs, guides, API metadata, and feature groups.
- `ace_grid_search_api`: search generated Ace Grid API metadata.
- `ace_grid_search_doc_pages`: search written docs page content.
- `ace_grid_list_doc_pages`: list bundled docs pages.
- `ace_grid_get_doc_page`: return a docs page by slug or path.
- `ace_grid_list_feature_groups`: list feature groups and prop counts.
- `ace_grid_get_prop`: inspect a prop path such as `layout.height`.
- `ace_grid_validate_config`: report unknown and missing props in a config object.
- `ace_grid_plan_implementation`: infer framework packages, required tier, matched features, docs, and props from a natural-language request.
- `ace_grid_generate_implementation`: generate React, Angular, Vue, Svelte, or Web Components starter code.
- `ace_grid_generate_react_example`: generate a React starter snippet for Core, Pro, or Enterprise.
- `ace_grid_list_examples`: list bundled framework examples.
- `ace_grid_generate_framework_example`: generate a bundled framework example.
- `ace_grid_license_setup`: explain license config and public-key behavior.

## Publishing checklist

Before publishing a new MCP version:

```bash
npm install
npm test
npm run build
```

Refresh bundled metadata in `data/` whenever Ace Grid docs, API snapshots, feature groups, examples, or portal-generated metadata change.

## License

MIT. See the package license for details.
