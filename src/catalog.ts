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
        path: entry.path,
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
