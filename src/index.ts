#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { toolHandlers } from "./tools.js";

const server = new McpServer({
  name: "ace-grid-mcp",
  version: "0.1.0",
});

server.tool(
  "ace_grid_search_docs",
  "Search bundled Ace Grid docs pages, guide text, API metadata, and feature groups.",
  {
    limit: z.number().int().min(1).max(50).optional(),
    query: z.string().min(1),
  },
  async (input) => toolHandlers.searchDocs(input),
);

server.tool(
  "ace_grid_search_api",
  "Search only generated Ace Grid API metadata and feature groups.",
  {
    limit: z.number().int().min(1).max(50).optional(),
    query: z.string().min(1),
  },
  async (input) => toolHandlers.searchApi(input),
);

server.tool(
  "ace_grid_search_doc_pages",
  "Search only written Ace Grid docs page content and guide text.",
  {
    limit: z.number().int().min(1).max(50).optional(),
    query: z.string().min(1),
  },
  async (input) => toolHandlers.searchDocsPages(input),
);

server.tool(
  "ace_grid_list_doc_pages",
  "List bundled Ace Grid docs pages available to the MCP server.",
  {},
  async () => toolHandlers.listDocsPages(),
);

server.tool(
  "ace_grid_get_doc_page",
  "Return a bundled Ace Grid docs page by slug or path, including guide text and relevant props.",
  {
    slugOrPath: z.string().min(1),
  },
  async (input) => toolHandlers.getDocsPage(input),
);

server.tool(
  "ace_grid_list_feature_groups",
  "List Ace Grid feature groups, prop counts, and generated metadata status.",
  {},
  async () => toolHandlers.listFeatureGroups(),
);

server.tool(
  "ace_grid_get_prop",
  "Inspect an Ace Grid prop by path, for example layout.height or license.appId.",
  {
    path: z.string().min(1),
  },
  async (input) => toolHandlers.getProp(input),
);

server.tool(
  "ace_grid_validate_config",
  "Validate a JSON Ace Grid config object against bundled generated API metadata.",
  {
    config: z.unknown(),
  },
  async (input) => toolHandlers.validateConfig(input),
);

server.tool(
  "ace_grid_plan_implementation",
  "Plan an Ace Grid implementation from a natural-language request. Returns matched features, tier, packages, docs, and relevant props.",
  {
    framework: z.enum(["react", "angular", "vue", "svelte", "web-components"]).optional(),
    query: z.string().min(1),
    tier: z.enum(["Community", "Pro", "Enterprise"]).optional(),
  },
  async (input) => toolHandlers.planImplementation(input),
);

server.tool(
  "ace_grid_generate_implementation",
  "Generate framework-specific Ace Grid starter code from a natural-language request, using bundled docs and API metadata.",
  {
    appId: z.string().optional(),
    domain: z.string().optional(),
    framework: z.enum(["react", "angular", "vue", "svelte", "web-components"]).optional(),
    licenseKey: z.string().optional(),
    query: z.string().min(1),
    tier: z.enum(["Community", "Pro", "Enterprise"]).optional(),
  },
  async (input) => toolHandlers.generateImplementation(input),
);

server.tool(
  "ace_grid_generate_react_example",
  "Generate a small React Ace Grid example for Community, Pro, or Enterprise.",
  {
    appId: z.string().optional(),
    domain: z.string().optional(),
    licenseKey: z.string().optional(),
    plan: z.enum(["Community", "Pro", "Enterprise"]).optional(),
  },
  async (input) => toolHandlers.generateReactExample(input),
);

server.tool(
  "ace_grid_list_examples",
  "List bundled framework examples available to the MCP server.",
  {},
  async () => toolHandlers.listExamples(),
);

server.tool(
  "ace_grid_generate_framework_example",
  "Generate a bundled Ace Grid framework example for react, angular, vue, svelte, or web-components.",
  {
    framework: z.enum(["react", "angular", "vue", "svelte", "web-components"]),
    includeActions: z.boolean().optional(),
  },
  async (input) => toolHandlers.generateFrameworkExample(input),
);

server.tool(
  "ace_grid_license_setup",
  "Explain Ace Grid license config, domain auto-detection, and public signing-key behavior.",
  {},
  async () => toolHandlers.licenseSetup(),
);

server.tool(
  "ace_grid_account_status",
  "Fetch authenticated Ace Grid account, entitlement, and subscription status. Requires ACE_GRID_PORTAL_TOKEN or token input.",
  {
    token: z.string().optional(),
  },
  async (input) => toolHandlers.accountStatus(input),
);

server.tool(
  "ace_grid_list_apps",
  "List authenticated Ace Grid license apps. Requires ACE_GRID_PORTAL_TOKEN or token input.",
  {
    token: z.string().optional(),
  },
  async (input) => toolHandlers.listApps(input),
);

server.tool(
  "ace_grid_create_app",
  "Create an authenticated Ace Grid license app. Requires ACE_GRID_PORTAL_TOKEN or token input.",
  {
    allowedDomains: z.array(z.string()).optional(),
    name: z.string().min(1),
    token: z.string().optional(),
  },
  async (input) => toolHandlers.createApp(input),
);

server.tool(
  "ace_grid_list_license_keys",
  "List license keys for an authenticated Ace Grid app. Requires ACE_GRID_PORTAL_TOKEN or token input.",
  {
    appId: z.string().min(1),
    token: z.string().optional(),
  },
  async (input) => toolHandlers.listLicenseKeys(input),
);

server.tool(
  "ace_grid_create_license_key",
  "Create a license key for an authenticated Ace Grid app. Requires ACE_GRID_PORTAL_TOKEN or token input.",
  {
    appId: z.string().min(1),
    label: z.string().optional(),
    token: z.string().optional(),
  },
  async (input) => toolHandlers.createLicenseKey(input),
);

const transport = new StdioServerTransport();
await server.connect(transport);
