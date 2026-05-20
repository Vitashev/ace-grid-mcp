import { writeFileSync } from "node:fs";

import {
  apiFrameworkOptions,
  type ApiFramework,
} from "../../portal/src/content/siteData";
import {
  AI_SUITE_DOC_PAGES,
  AI_SUITE_DOC_ROUTE,
  AI_SUITE_DOC_TITLE,
} from "../../portal/src/data/aiSuiteData";
import {
  docsFeaturePages,
  type DocsFeaturePage,
} from "../../portal/src/data/docsFeatureData";

type DocsIndexEntry = {
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

type FrameworkExample = {
  actionsSample: string;
  actionsSummary: string;
  actionsTitle: string;
  codeSample: string;
  framework: ApiFramework;
  hostPackage: string;
  label: string;
  summary: string;
};

type DocsIndex = {
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

function flattenGuide(page: DocsFeaturePage) {
  return [
    page.guide.whatItMeans,
    ...page.guide.whenToUse,
    ...page.guide.howToTry,
    ...page.guide.implementationNotes,
  ];
}

function featureEntry(page: DocsFeaturePage): DocsIndexEntry {
  const contentParts = [
    page.title,
    page.navLabel,
    page.eyebrow,
    page.intro,
    page.summary,
    page.category.label,
    page.group.label,
    page.group.description,
    ...flattenGuide(page),
    ...page.relevantProps.flatMap((prop) => [
      prop.path,
      prop.name,
      prop.type,
      prop.description,
    ]),
  ];

  return {
    category: page.category.label,
    content: contentParts.filter(Boolean).join("\n"),
    guide: page.guide,
    key: `feature:${page.slug}`,
    path: `/docs/${page.slug}`,
    relevantProps: page.relevantProps.map((prop) => ({
      description: prop.description,
      path: prop.path,
      type: prop.type,
    })),
    slug: page.slug,
    summary: page.summary,
    title: page.title,
    type: "feature",
  };
}

const aiSuiteEntries: DocsIndexEntry[] = [
  {
    category: "AI Suite",
    content: [
      AI_SUITE_DOC_TITLE,
      "AI",
      "LLM",
      "assistant",
      "schema",
      "prompt actions",
      "AI output",
      ...AI_SUITE_DOC_PAGES.flatMap((page) => [
        page.label,
        page.title,
        page.summary,
      ]),
    ].join("\n"),
    guide: {
      howToTry: AI_SUITE_DOC_PAGES.map((page) => `Open ${page.route}.`),
      implementationNotes: [
        "AI Suite features are Enterprise-tier docs for schema, prompt actions, and output rendering.",
      ],
      whatItMeans:
        "AI Suite documents Ace Grid features that help AI systems inspect, command, and render grid output.",
      whenToUse: [
        "Use AI Schema when an assistant needs a structured view of grid state.",
        "Use Prompt Actions when natural language should produce safe grid commands.",
        "Use AI Output when assistant responses need to render table output.",
      ],
    },
    key: "ai-suite:overview",
    path: AI_SUITE_DOC_ROUTE,
    relevantProps: [],
    slug: "ai-suite",
    summary:
      "Docs for AI Schema, Prompt Actions, and AI Output features.",
    title: AI_SUITE_DOC_TITLE,
    type: "ai-suite",
  },
  ...AI_SUITE_DOC_PAGES.map((page) => ({
    category: "AI Suite",
    content: [page.label, page.title, page.summary, page.key].join("\n"),
    guide: {
      howToTry: [`Open ${page.route}.`],
      implementationNotes: [`${page.label} is an Enterprise-tier AI Suite page.`],
      whatItMeans: page.summary,
      whenToUse: [`Use ${page.label} when ${page.summary.toLowerCase()}`],
    },
    key: `ai-suite:${page.key}`,
    path: page.route,
    relevantProps: [],
    slug: page.route.replace("/docs/", ""),
    summary: page.summary,
    title: page.title,
    type: "ai-suite" as const,
  })),
];

const entries = [
  ...aiSuiteEntries,
  ...Object.values(docsFeaturePages).map(featureEntry),
].sort((left, right) => left.path.localeCompare(right.path));

const docsIndex: DocsIndex = {
  entries,
  examples: apiFrameworkOptions.map((option) => ({
    actionsSample: option.actionsSample,
    actionsSummary: option.actionsSummary,
    actionsTitle: option.actionsTitle,
    codeSample: option.codeSample,
    framework: option.value,
    hostPackage: option.hostPackage,
    label: option.label,
    summary: option.summary,
  })),
  generatedAt: new Date().toISOString(),
  pages: entries.map((entry) => ({
    category: entry.category,
    path: entry.path,
    slug: entry.slug,
    summary: entry.summary,
    title: entry.title,
    type: entry.type,
  })),
};

writeFileSync(
  new URL("../data/docsIndex.json", import.meta.url),
  `${JSON.stringify(docsIndex, null, 2)}\n`,
);
