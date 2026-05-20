import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";

import { toolHandlers } from "./tools.js";

type DemoModel = {
  id: string;
  label: string;
};

type ToolCall = {
  arguments?: Record<string, unknown>;
  name: string;
};

const port = Number(process.env.PORT ?? 4177);
const googleClient = process.env.GOOGLE_API_CLIENT ?? "gen-lang-client-0901195546";
const defaultApiKey = process.env.GOOGLE_API_KEY ?? "";

const models: DemoModel[] = [
  { id: "gemma-4-31b-it", label: "Gemma 4 31B" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
];

const testPrompts = [
  "Search Ace Grid docs for license setup and explain whether users need to pass leaseSigningPublicKey.",
  "Find the metadata for license.appId and license.domain.",
  "Open the validation docs page and summarize when to use it.",
  "Generate a Svelte Ace Grid example and explain the package imports.",
  "Generate a React Pro example using appId app_demo and license key ag_key_demo.",
  "Validate this config and explain what is wrong: {\"data\":{\"rows\":[]},\"layout\":{\"height\":400},\"badFeature\":true}",
  "Which Ace Grid feature groups are relevant for spreadsheet editing and validation?",
  "Create an Enterprise React example with domain app.example.com.",
  "Explain the difference between automatic browser domain detection and an explicit license domain.",
];

const localToolNames = [
  "ace_grid_search_docs",
  "ace_grid_search_api",
  "ace_grid_search_doc_pages",
  "ace_grid_list_doc_pages",
  "ace_grid_get_doc_page",
  "ace_grid_list_feature_groups",
  "ace_grid_get_prop",
  "ace_grid_validate_config",
  "ace_grid_generate_react_example",
  "ace_grid_list_examples",
  "ace_grid_generate_framework_example",
  "ace_grid_license_setup",
] as const;

type LocalToolName = (typeof localToolNames)[number];

const localToolDescriptions = {
  ace_grid_search_docs:
    "Search all bundled Ace Grid docs and API metadata. Arguments: { query: string, limit?: number }.",
  ace_grid_search_api:
    "Search only generated API metadata. Arguments: { query: string, limit?: number }.",
  ace_grid_search_doc_pages:
    "Search only written docs pages. Arguments: { query: string, limit?: number }.",
  ace_grid_list_doc_pages:
    "List bundled docs pages. Arguments: {}.",
  ace_grid_get_doc_page:
    "Get a docs page by slug or path. Arguments: { slugOrPath: string }.",
  ace_grid_list_feature_groups:
    "List feature groups and generated metadata status. Arguments: {}.",
  ace_grid_get_prop:
    "Get a property by path, for example license.appId. Arguments: { path: string }.",
  ace_grid_validate_config:
    "Validate an Ace Grid config object. Arguments: { config: object }.",
  ace_grid_generate_react_example:
    "Generate React example. Arguments: { plan?: 'Community'|'Pro'|'Enterprise', appId?: string, licenseKey?: string, domain?: string }.",
  ace_grid_list_examples:
    "List framework examples. Arguments: {}.",
  ace_grid_generate_framework_example:
    "Generate framework example. Arguments: { framework: 'react'|'angular'|'vue'|'svelte'|'web-components', includeActions?: boolean }.",
  ace_grid_license_setup:
    "Explain license setup, public key auto-fetch, and domain behavior. Arguments: {}.",
} satisfies Record<LocalToolName, string>;

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function text(response: ServerResponse, status: number, body: string, contentType: string) {
  response.writeHead(status, {
    "content-type": contentType,
  });
  response.end(body);
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function parseJsonBlock(value: string): unknown {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = fenced?.[1] ?? value;
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  const candidate = firstBrace >= 0 && lastBrace > firstBrace ? text.slice(firstBrace, lastBrace + 1) : text;

  return JSON.parse(candidate);
}

function googleEndpoint(model: string, apiKey: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

async function callGoogle(options: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const response = await fetch(googleEndpoint(options.model, options.apiKey), {
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: options.prompt }],
          role: "user",
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    }),
    headers: {
      "content-type": "application/json",
      "x-goog-api-client": googleClient,
    },
    method: "POST",
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof body === "object" && body && "error" in body
        ? JSON.stringify((body as { error?: unknown }).error)
        : "Google model request failed.";
    throw new Error(message);
  }

  const text = (body as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    .candidates?.[0]?.content?.parts?.map((part) => part.text ?? "")
    .join("\n")
    .trim();

  return text || JSON.stringify(body, null, 2);
}

async function executeToolCall(call: ToolCall) {
  if (!localToolNames.includes(call.name as LocalToolName)) {
    throw new Error(`Unsupported local demo tool: ${call.name}`);
  }

  const args = call.arguments ?? {};
  switch (call.name as LocalToolName) {
    case "ace_grid_search_docs":
      return toolHandlers.searchDocs({
        limit: typeof args.limit === "number" ? args.limit : 8,
        query: String(args.query ?? ""),
      });
    case "ace_grid_search_api":
      return toolHandlers.searchApi({
        limit: typeof args.limit === "number" ? args.limit : 8,
        query: String(args.query ?? ""),
      });
    case "ace_grid_search_doc_pages":
      return toolHandlers.searchDocsPages({
        limit: typeof args.limit === "number" ? args.limit : 8,
        query: String(args.query ?? ""),
      });
    case "ace_grid_list_doc_pages":
      return toolHandlers.listDocsPages();
    case "ace_grid_get_doc_page":
      return toolHandlers.getDocsPage({ slugOrPath: String(args.slugOrPath ?? "") });
    case "ace_grid_list_feature_groups":
      return toolHandlers.listFeatureGroups();
    case "ace_grid_get_prop":
      return toolHandlers.getProp({ path: String(args.path ?? "") });
    case "ace_grid_validate_config":
      return toolHandlers.validateConfig({ config: args.config });
    case "ace_grid_generate_react_example":
      return toolHandlers.generateReactExample({
        appId: typeof args.appId === "string" ? args.appId : undefined,
        domain: typeof args.domain === "string" ? args.domain : undefined,
        licenseKey: typeof args.licenseKey === "string" ? args.licenseKey : undefined,
        plan:
          args.plan === "Community" || args.plan === "Pro" || args.plan === "Enterprise"
            ? args.plan
            : undefined,
      });
    case "ace_grid_list_examples":
      return toolHandlers.listExamples();
    case "ace_grid_generate_framework_example":
      return toolHandlers.generateFrameworkExample({
        framework: String(args.framework ?? ""),
        includeActions: Boolean(args.includeActions),
      });
    case "ace_grid_license_setup":
      return toolHandlers.licenseSetup();
  }
}

async function runDemoAgent(input: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const plannerPrompt = [
    "You are testing the local Ace Grid MCP server.",
    "Choose zero to three useful local tool calls before answering.",
    "Return only JSON with this exact shape:",
    '{"toolCalls":[{"name":"ace_grid_search_docs","arguments":{"query":"license"}}],"notes":"why these tools help"}',
    "",
    "Available tools:",
    ...Object.entries(localToolDescriptions).map(([name, description]) => `- ${name}: ${description}`),
    "",
    `User prompt: ${input.prompt}`,
  ].join("\n");

  const plannerText = await callGoogle({
    apiKey: input.apiKey,
    model: input.model,
    prompt: plannerPrompt,
  });
  const parsed = parseJsonBlock(plannerText) as {
    notes?: string;
    toolCalls?: ToolCall[];
  };
  const toolCalls = Array.isArray(parsed.toolCalls) ? parsed.toolCalls.slice(0, 3) : [];
  const toolResults = [];

  for (const call of toolCalls) {
    const result = await executeToolCall(call);
    toolResults.push({
      call,
      result: result.content.map((item) => item.text).join("\n"),
    });
  }

  const finalPrompt = [
    "Answer the user's Ace Grid question using the MCP tool results.",
    "Be concrete. If code is useful, include code.",
    "",
    `User prompt: ${input.prompt}`,
    "",
    `Planner notes: ${parsed.notes ?? ""}`,
    "",
    "Tool results:",
    JSON.stringify(toolResults, null, 2),
  ].join("\n");
  const answer = await callGoogle({
    apiKey: input.apiKey,
    model: input.model,
    prompt: finalPrompt,
  });

  return {
    answer,
    model: input.model,
    planner: parsed,
    toolResults,
  };
}

function serveStatic(pathname: string, response: ServerResponse) {
  const file =
    pathname === "/"
      ? "../demo/index.html"
      : pathname === "/app.js"
        ? "../demo/app.js"
        : pathname === "/styles.css"
          ? "../demo/styles.css"
          : undefined;

  if (!file) {
    text(response, 404, "Not found", "text/plain; charset=utf-8");
    return;
  }

  const contentType = file.endsWith(".html")
    ? "text/html; charset=utf-8"
    : file.endsWith(".css")
      ? "text/css; charset=utf-8"
      : "text/javascript; charset=utf-8";
  text(response, 200, readFileSync(new URL(file, import.meta.url), "utf8"), contentType);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "GET" && url.pathname === "/api/config") {
      json(response, 200, {
        defaultApiKey,
        googleClient,
        models,
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/prompts") {
      json(response, 200, {
        prompts: testPrompts,
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/tools") {
      json(response, 200, {
        tools: localToolDescriptions,
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      const body = await readJsonBody<{
        apiKey?: string;
        model?: string;
        prompt?: string;
      }>(request);
      if (!body.apiKey) {
        json(response, 400, { error: "Google API key is required." });
        return;
      }
      if (!body.prompt) {
        json(response, 400, { error: "Prompt is required." });
        return;
      }

      json(
        response,
        200,
        await runDemoAgent({
          apiKey: body.apiKey,
          model: body.model || models[0].id,
          prompt: body.prompt,
        }),
      );
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/tool") {
      const body = await readJsonBody<ToolCall>(request);
      json(response, 200, await executeToolCall(body));
      return;
    }

    if (request.method === "GET") {
      serveStatic(url.pathname, response);
      return;
    }

    text(response, 405, "Method not allowed", "text/plain; charset=utf-8");
  } catch (error) {
    json(response, 500, {
      error: error instanceof Error ? error.message : "Unknown error.",
    });
  }
});

server.listen(port, () => {
  console.log(`Ace Grid MCP demo listening on http://localhost:${port}`);
});
