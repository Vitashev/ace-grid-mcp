import { readFileSync } from "node:fs";

export type AceGridProp = {
  description?: string;
  depth: number;
  name: string;
  optional: boolean;
  path: string;
  type: string;
};

export type AceGridFeatureGroup = {
  description: string;
  directPropCount: number;
  key: string;
  label: string;
  optional: boolean;
  propCount: number;
  props: AceGridProp[];
  typeName: string;
};

export type GridApiSnapshot = {
  featureGroupCount: number;
  featureGroups: AceGridFeatureGroup[];
  generatedAt: string;
  propCount: number;
  rootInterface: string;
  symbols?: Record<string, unknown>;
};

export type FormulaSnapshot = {
  categoryCount: number;
  exportedConstant: string;
  functionCount: number;
  generatedAt: string;
};

export type DocsIndexEntry = {
  category: string;
  content: string;
  guide: {
    howToTry: string[];
    implementationNotes: string[];
    whatItMeans: string;
    whenToUse: string[];
  };
  key: string;
  path: string;
  relevantProps: Array<{
    description?: string;
    path: string;
    type: string;
  }>;
  slug: string;
  summary: string;
  title: string;
  type: "feature" | "ai-suite";
};

export type FrameworkExample = {
  actionsSample: string;
  actionsSummary: string;
  actionsTitle: string;
  codeSample: string;
  framework: string;
  hostPackage: string;
  label: string;
  summary: string;
};

export type DocsIndex = {
  entries: DocsIndexEntry[];
  examples: FrameworkExample[];
  generatedAt: string;
  pages: Array<{
    category: string;
    path: string;
    slug: string;
    summary: string;
    title: string;
    type: "feature" | "ai-suite";
  }>;
};

export type SearchResult = {
  description: string;
  featureGroup: string;
  label: string;
  path?: string;
  score: number;
  type?: string;
};

export type AceGridFramework = "react" | "angular" | "vue" | "svelte" | "web-components";
export type AceGridTier = "Community" | "Pro" | "Enterprise";

export type ImplementationInput = {
  appId?: string;
  domain?: string;
  framework?: AceGridFramework;
  licenseKey?: string;
  query: string;
  tier?: AceGridTier;
};

export type ImplementationPlan = {
  docs: ReturnType<typeof searchDocs>;
  framework: AceGridFramework;
  installCommand: string;
  matchedFeatures: Array<{
    docsPath?: string;
    key: string;
    label: string;
    tier: AceGridTier;
  }>;
  notes: string[];
  requestedTier?: AceGridTier;
  requiredTier: AceGridTier;
  relevantProps: Array<{
    description?: string;
    path: string;
    type: string;
  }>;
  warnings: string[];
};

const TIER_RANK: Record<AceGridTier, number> = {
  Community: 0,
  Pro: 1,
  Enterprise: 2,
};

const PRO_FEATURE_KEYS = new Set([
  "formula",
  "rowGrouping",
  "spanning",
  "sparkline",
  "treeData",
  "validation",
]);

const ENTERPRISE_FEATURE_KEYS = new Set([
  "charts",
  "masterDetail",
  "pivot",
  "serverRowModel",
]);

const FEATURE_ALIASES: Record<string, string[]> = {
  charts: ["chart", "charts", "integrated chart", "visualization"],
  formula: ["formula", "formulas", "spreadsheet formula"],
  masterDetail: ["master detail", "master-detail", "detail panel", "expand row"],
  pivot: ["pivot", "pivoting", "cross tab", "crosstab"],
  rowGrouping: ["row grouping", "group rows", "grouping"],
  serverRowModel: ["server row model", "server-side", "ssrm", "lazy load", "remote rows"],
  spanning: ["cell spanning", "span", "merge cells", "merged cells"],
  sparkline: ["sparkline", "mini chart", "inline chart"],
  treeData: ["tree data", "hierarchy", "hierarchical", "nested rows"],
  validation: ["validation", "validate", "validator", "rules", "invalid cell"],
};

const FRAMEWORK_PACKAGES: Record<AceGridFramework, Record<AceGridTier, string[]>> = {
  angular: {
    Community: ["@ace-grid/angular", "ace-grid"],
    Enterprise: ["@ace-grid/angular", "@ace-grid/enterprise"],
    Pro: ["@ace-grid/angular", "@ace-grid/pro"],
  },
  react: {
    Community: ["ace-grid"],
    Enterprise: ["@ace-grid/enterprise"],
    Pro: ["@ace-grid/pro"],
  },
  svelte: {
    Community: ["@ace-grid/svelte", "ace-grid"],
    Enterprise: ["@ace-grid/svelte", "@ace-grid/enterprise"],
    Pro: ["@ace-grid/svelte", "@ace-grid/pro"],
  },
  vue: {
    Community: ["@ace-grid/vue", "ace-grid"],
    Enterprise: ["@ace-grid/vue", "@ace-grid/enterprise"],
    Pro: ["@ace-grid/vue", "@ace-grid/pro"],
  },
  "web-components": {
    Community: ["@ace-grid/wc", "ace-grid"],
    Enterprise: ["@ace-grid/wc", "@ace-grid/enterprise"],
    Pro: ["@ace-grid/wc", "@ace-grid/pro"],
  },
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(new URL(relativePath, import.meta.url), "utf8"),
  ) as T;
}

export const gridSnapshot = readJson<GridApiSnapshot>("../data/gridApiSnapshot.json");
export const formulaSnapshot = readJson<FormulaSnapshot>(
  "../data/formulaFunctionSnapshot.json",
);
export const docsIndex = readJson<DocsIndex>("../data/docsIndex.json");

const propEntries = gridSnapshot.featureGroups.flatMap((group) =>
  group.props.map((prop) => ({
    group,
    prop,
  })),
);

export const propsByPath = new Map(propEntries.map((entry) => [entry.prop.path, entry]));
export const groupsByKey = new Map(gridSnapshot.featureGroups.map((group) => [group.key, group]));
export const docsBySlug = new Map(docsIndex.entries.map((entry) => [entry.slug, entry]));
export const docsByPath = new Map(docsIndex.entries.map((entry) => [entry.path, entry]));
export const examplesByFramework = new Map(
  docsIndex.examples.map((example) => [example.framework, example]),
);

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim();
}

function scoreText(haystack: string, terms: string[]): number {
  return terms.reduce((score, term) => {
    if (haystack.includes(term)) {
      return score + (haystack.startsWith(term) ? 3 : 1);
    }

    return score;
  }, 0);
}

export function searchCatalog(query: string, limit = 10): SearchResult[] {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const groupResults = gridSnapshot.featureGroups.map((group) => {
    const text = normalizeSearchText(
      `${group.key} ${group.label} ${group.description} ${group.typeName}`,
    );
    return {
      description: group.description,
      featureGroup: group.key,
      label: group.label,
      score: scoreText(text, terms) + 1,
    };
  });

  const propResults = propEntries.map(({ group, prop }) => {
    const text = normalizeSearchText(
      `${prop.path} ${prop.name} ${prop.type} ${prop.description ?? ""} ${group.label}`,
    );
    return {
      description: prop.description ?? "",
      featureGroup: group.key,
      label: prop.path,
      path: prop.path,
      score: scoreText(text, terms) + (prop.path.toLowerCase() === query.toLowerCase() ? 8 : 0),
      type: prop.type,
    };
  });

  return [...groupResults, ...propResults]
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, Math.max(1, Math.min(limit, 50)));
}

export function searchDocs(query: string, limit = 10) {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  return docsIndex.entries
    .map((entry) => {
      const text = normalizeSearchText(
        `${entry.title} ${entry.summary} ${entry.category} ${entry.content}`,
      );
      const exactBoost =
        entry.slug.toLowerCase() === query.toLowerCase() ||
        entry.path.toLowerCase() === query.toLowerCase()
          ? 20
          : 0;
      const propBoost = entry.relevantProps.some((prop) =>
        prop.path.toLowerCase().includes(query.toLowerCase()),
      )
        ? 8
        : 0;

      return {
        category: entry.category,
        key: entry.key,
        path: entry.path,
        relevantProps: entry.relevantProps,
        score: scoreText(text, terms) + exactBoost + propBoost,
        slug: entry.slug,
        summary: entry.summary,
        title: entry.title,
        type: entry.type,
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, Math.max(1, Math.min(limit, 50)));
}

export function searchEverything(query: string, limit = 10) {
  const perSourceLimit = Math.max(1, Math.min(limit, 50));
  const apiResults = searchCatalog(query, perSourceLimit).map((result) => ({
    ...result,
    source: "api" as const,
  }));
  const docsResults = searchDocs(query, perSourceLimit).map((result) => ({
    ...result,
    source: "docs" as const,
  }));

  return [...docsResults, ...apiResults]
    .sort((a, b) => b.score - a.score || resultLabel(a).localeCompare(resultLabel(b)))
    .slice(0, perSourceLimit);
}

function resultLabel(
  result:
    | ReturnType<typeof searchCatalog>[number]
    | ReturnType<typeof searchDocs>[number],
) {
  return "label" in result ? result.label : result.title;
}

export function listDocsPages() {
  return docsIndex.pages;
}

export function getDocsPage(slugOrPath: string) {
  const normalizedPath = slugOrPath.startsWith("/") ? slugOrPath : `/docs/${slugOrPath}`;
  return docsBySlug.get(slugOrPath) ?? docsByPath.get(normalizedPath);
}

export function listFrameworkExamples() {
  return docsIndex.examples.map((example) => ({
    actionsTitle: example.actionsTitle,
    framework: example.framework,
    hostPackage: example.hostPackage,
    label: example.label,
    summary: example.summary,
  }));
}

export function getFrameworkExample(framework: string) {
  return examplesByFramework.get(framework);
}

export function listFeatureGroups() {
  return gridSnapshot.featureGroups.map((group) => ({
    description: group.description,
    key: group.key,
    label: group.label,
    optional: group.optional,
    propCount: group.propCount,
    typeName: group.typeName,
  }));
}

export function getProp(path: string) {
  const entry = propsByPath.get(path);
  if (!entry) {
    return undefined;
  }

  return {
    description: entry.prop.description ?? "",
    featureGroup: entry.group.key,
    optional: entry.prop.optional,
    path: entry.prop.path,
    type: entry.prop.type,
  };
}

function collectObjectPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  const paths: string[] = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      paths.push(path);
      paths.push(...collectObjectPaths(nested, path));
    } else {
      paths.push(path);
    }
  }

  return paths;
}

function valueAtPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[part];
  }, value);
}

export function validateGridConfig(config: unknown) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {
      ok: false,
      errors: ["Config must be a JSON object."],
      missingRequiredProps: [],
      unknownProps: [],
      warnings: [],
    };
  }

  const knownGroups = new Set(gridSnapshot.featureGroups.map((group) => group.key));
  const knownProps = new Set(propEntries.map((entry) => entry.prop.path));
  const allPaths = collectObjectPaths(config);
  const unknownProps = allPaths.filter((path) => {
    if (!path.includes(".")) return !knownGroups.has(path);
    return !knownProps.has(path);
  });
  const minimalRequiredProps = ["data.rows", "data.columns"];
  const missingRequiredProps = minimalRequiredProps.filter(
    (path) => valueAtPath(config, path) === undefined,
  );
  const warnings = gridSnapshot.featureGroups
    .filter((group) => group.key !== "license" && group.key !== "data" && valueAtPath(config, group.key))
    .filter((group) => group.optional && group.props.length === 0)
    .map((group) => `${group.key} is present but has no generated prop metadata.`);

  return {
    ok: unknownProps.length === 0 && missingRequiredProps.length === 0,
    errors: unknownProps.map((path) => `Unknown Ace Grid prop: ${path}`),
    missingRequiredProps,
    unknownProps,
    warnings,
  };
}

function normalizeFramework(value: string | undefined): AceGridFramework {
  const framework = value ?? "react";
  if (
    framework === "angular" ||
    framework === "vue" ||
    framework === "svelte" ||
    framework === "web-components"
  ) {
    return framework;
  }

  return "react";
}

function tierForFeature(key: string): AceGridTier {
  if (ENTERPRISE_FEATURE_KEYS.has(key)) return "Enterprise";
  if (PRO_FEATURE_KEYS.has(key)) return "Pro";
  return "Community";
}

function maxTier(a: AceGridTier, b: AceGridTier): AceGridTier {
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

function installCommand(framework: AceGridFramework, tier: AceGridTier) {
  return `npm install ${FRAMEWORK_PACKAGES[framework][tier].join(" ")}`;
}

function uniqueBy<T>(values: T[], getKey: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = getKey(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function queryMatchesFeature(query: string, key: string): boolean {
  const normalized = normalizeSearchText(query);
  const group = groupsByKey.get(key);
  const aliases = FEATURE_ALIASES[key] ?? [];
  const candidates = [key, group?.label ?? "", group?.description ?? "", ...aliases];

  return candidates.some((candidate) => {
    const term = normalizeSearchText(candidate);
    return term.length > 0 && normalized.includes(term);
  });
}

function matchedFeatureKeys(query: string, docsMatches: ReturnType<typeof searchDocs>) {
  const directKeys = gridSnapshot.featureGroups
    .filter((group) => queryMatchesFeature(query, group.key))
    .map((group) => group.key);
  const docKeys = docsMatches.map((entry) => entry.key).filter((key) => groupsByKey.has(key));
  const apiKeys = searchCatalog(query, 12).map((result) => result.featureGroup);

  return uniqueBy([...directKeys, ...docKeys, ...apiKeys], (key) => key).slice(0, 6);
}

function relevantPropsForFeatures(keys: string[], docsMatches: ReturnType<typeof searchDocs>) {
  return uniqueBy(
    [
      ...docsMatches.flatMap((entry) => entry.relevantProps),
      ...keys.flatMap((key) => groupsByKey.get(key)?.props.slice(0, 8) ?? []),
    ].map((prop) => ({
      description: prop.description,
      path: prop.path,
      type: prop.type,
    })),
    (prop) => prop.path,
  ).slice(0, 24);
}

function setNestedValue(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".");
  let current = target;
  for (const part of parts.slice(0, -1)) {
    const existing = current[part];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function serializableGridConfig(input: ImplementationInput, plan: ImplementationPlan) {
  const config: Record<string, unknown> = {
    data: {
      rows: [
        { id: "row-1", account: "Acme", status: "Active", revenue: 1200 },
        { id: "row-2", account: "Globex", status: "Trial", revenue: 860 },
        { id: "row-3", account: "Initech", status: "Active", revenue: 2140 },
      ],
      columns: [
        { key: "account", header: "Account" },
        { key: "status", header: "Status" },
        { key: "revenue", header: "Revenue", type: "number" },
      ],
    },
    layout: {
      height: 520,
    },
  };

  if (plan.requiredTier !== "Community") {
    config.license = {
      appId: input.appId ?? "app_...",
      apiBaseUrl: "https://api.ace-grid.com",
      licenseKey: input.licenseKey ?? "ag_key_...",
      ...(input.domain ? { domain: input.domain } : {}),
    };
  }

  for (const feature of plan.matchedFeatures) {
    const enabledPath = `${feature.key}.enabled`;
    if (propsByPath.has(enabledPath)) {
      setNestedValue(config, enabledPath, true);
    }
  }

  if (propsByPath.has("validation.mode") && "validation" in config) {
    setNestedValue(config, "validation.mode", "blocking");
  }
  if (propsByPath.has("validation.validateOn") && "validation" in config) {
    setNestedValue(config, "validation.validateOn", "change");
  }
  if (propsByPath.has("charts.defaultChartType") && "charts" in config) {
    setNestedValue(config, "charts.defaultChartType", "bar");
  }
  if (propsByPath.has("serverRowModel.blockSize") && "serverRowModel" in config) {
    setNestedValue(config, "serverRowModel.blockSize", 200);
  }
  if (propsByPath.has("pivot.pivotMode") && "pivot" in config) {
    setNestedValue(config, "pivot.pivotMode", true);
  }

  return config;
}

function serializeCode(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent);
  const nextPad = " ".repeat(indent + 2);
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "undefined";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((item) => `${nextPad}${serializeCode(item, indent + 2)}`).join(",\n")}\n${pad}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return `{\n${entries
      .map(([key, nested]) => `${nextPad}${/^[a-zA-Z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)}: ${serializeCode(nested, indent + 2)}`)
      .join(",\n")}\n${pad}}`;
  }

  return "undefined";
}

function frameworkImport(framework: AceGridFramework, tier: AceGridTier) {
  const packageName =
    tier === "Enterprise" ? "@ace-grid/enterprise" : tier === "Pro" ? "@ace-grid/pro" : "ace-grid";

  if (framework === "angular") return `import { AceGridAngular } from "@ace-grid/angular";`;
  if (framework === "vue") return `import { AceGrid } from "@ace-grid/vue";`;
  if (framework === "svelte") return `import AceGrid from "@ace-grid/svelte";`;
  if (framework === "web-components") {
    const suffix = tier === "Enterprise" ? "enterprise" : tier === "Pro" ? "pro" : "core";
    return `import "@ace-grid/wc/${suffix}";`;
  }

  return `import { Grid } from "${packageName}";`;
}

function implementationNotes(plan: ImplementationPlan) {
  const matched = plan.matchedFeatures
    .map((feature) => `${feature.label}${feature.docsPath ? ` (${feature.docsPath})` : ""}`)
    .join(", ");
  return matched ? `// Matched Ace Grid features: ${matched}\n` : "";
}

function generateCodeForFramework(input: ImplementationInput, plan: ImplementationPlan) {
  const gridConfig = serializableGridConfig(input, plan);
  const configCode = serializeCode(gridConfig);
  const notes = implementationNotes(plan);

  if (plan.framework === "angular") {
    return `${frameworkImport(plan.framework, plan.requiredTier)}\nimport { Component } from "@angular/core";\n\n${notes}@Component({\n  selector: "app-ace-grid",\n  standalone: true,\n  imports: [AceGridAngular],\n  template: '<ace-grid-angular [props]="gridProps"></ace-grid-angular>',\n})\nexport class AceGridExampleComponent {\n  gridProps = ${configCode};\n}\n`;
  }

  if (plan.framework === "vue") {
    return `<script setup lang="ts">\n${frameworkImport(plan.framework, plan.requiredTier)}\n\n${notes}const gridProps = ${configCode};\n</script>\n\n<template>\n  <AceGrid v-bind="gridProps" />\n</template>\n`;
  }

  if (plan.framework === "svelte") {
    return `<script lang="ts">\n  ${frameworkImport(plan.framework, plan.requiredTier)}\n\n${notes
      .split("\n")
      .filter(Boolean)
      .map((line) => `  ${line}`)
      .join("\n")}\n  const gridProps = ${configCode.replace(/\n/g, "\n  ")};\n</script>\n\n<AceGrid {...gridProps} />\n`;
  }

  if (plan.framework === "web-components") {
    return `${frameworkImport(plan.framework, plan.requiredTier)}\n\n${notes}const grid = document.querySelector("ace-grid");\nif (!grid) throw new Error("Missing <ace-grid> element.");\n\ngrid.props = ${configCode};\n\n// HTML:\n// <ace-grid></ace-grid>\n`;
  }

  return `${frameworkImport(plan.framework, plan.requiredTier)}\n\n${notes}const gridProps = ${configCode};\n\nexport function AceGridExample() {\n  return <Grid {...gridProps} />;\n}\n`;
}

export function planImplementation(input: ImplementationInput): ImplementationPlan {
  const framework = normalizeFramework(input.framework);
  const docs = searchDocs(input.query, 8);
  const keys = matchedFeatureKeys(input.query, docs);
  const matchedFeatures = keys.map((key) => {
    const group = groupsByKey.get(key);
    const doc = docs.find((entry) => entry.key === key) ?? docsBySlug.get(key);
    return {
      docsPath: doc?.path,
      key,
      label: group?.label ?? doc?.title ?? key,
      tier: tierForFeature(key),
    };
  });
  const requiredTier = matchedFeatures.reduce<AceGridTier>(
    (tier, feature) => maxTier(tier, feature.tier),
    input.tier ?? "Community",
  );
  const warnings =
    input.tier && TIER_RANK[input.tier] < TIER_RANK[requiredTier]
      ? [`Requested ${input.tier}, but matched features require ${requiredTier}.`]
      : [];
  const notes = [
    "Use this as a starting implementation and keep business-specific row loading, editing, and event handlers in app code.",
    requiredTier === "Community"
      ? "No license config is needed for Community usage."
      : "Paid tiers need licenseKey and appId. The browser domain is auto-detected when license.domain is omitted.",
  ];

  return {
    docs,
    framework,
    installCommand: installCommand(framework, requiredTier),
    matchedFeatures,
    notes,
    requestedTier: input.tier,
    requiredTier,
    relevantProps: relevantPropsForFeatures(keys, docs),
    warnings,
  };
}

export function generateImplementation(input: ImplementationInput) {
  const plan = planImplementation(input);
  const config = serializableGridConfig(input, plan);
  return {
    code: generateCodeForFramework(input, plan),
    config,
    plan,
    validation: validateGridConfig(config),
  };
}

export function generateReactExample(options: {
  appId?: string;
  domain?: string;
  licenseKey?: string;
  plan?: "Community" | "Pro" | "Enterprise";
}) {
  const plan = options.plan ?? "Community";
  const packageName =
    plan === "Enterprise" ? "@ace-grid/enterprise" : plan === "Pro" ? "@ace-grid/pro" : "ace-grid";
  const licenseBlock =
    plan === "Community"
      ? ""
      : `\n  license: {\n    licenseKey: "${options.licenseKey ?? "ag_key_..."}",\n    appId: "${options.appId ?? "app_..."}",\n    apiBaseUrl: "https://api.ace-grid.com",${
          options.domain ? `\n    domain: "${options.domain}",` : ""
        }\n  },`;

  return `import { Grid } from "${packageName}";\n\nconst rows = [\n  { id: "r1", product: "Starter", revenue: 1200 },\n  { id: "r2", product: "Pro", revenue: 4200 },\n];\n\nconst columns = [\n  { key: "product", header: "Product" },\n  { key: "revenue", header: "Revenue", type: "number" },\n];\n\nexport function RevenueGrid() {\n  return (\n    <Grid\n      data={{ rows, columns }}\n      layout={{ height: 520 }}${licenseBlock}\n    />\n  );\n}\n`;
}

export function licenseSetupGuide() {
  return {
    defaultApiBaseUrl: "https://api.ace-grid.com",
    notes: [
      "Users configure licenseKey and appId from the Ace Grid portal.",
      "The runtime automatically detects the browser hostname when license.domain is omitted.",
      "The runtime can auto-fetch the public lease signing key from /v1/license/public-key.",
      "Set license.leaseSigningPublicKey only when you need pinned/offline public-key verification.",
      "Signed license leases are cached locally and verified before reuse.",
    ],
    snippet: `const aceGridLicense = {\n  licenseKey: "ag_key_...",\n  appId: "app_...",\n  apiBaseUrl: "https://api.ace-grid.com"\n};`,
  };
}
