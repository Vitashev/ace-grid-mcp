import { describe, expect, it } from "vitest";

import {
  generateReactExample,
  generateImplementation,
  getDocsPage,
  getFrameworkExample,
  getProp,
  licenseSetupGuide,
  listDocsPages,
  listFeatureGroups,
  listFrameworkExamples,
  planImplementation,
  searchCatalog,
  searchDocs,
  searchEverything,
  validateGridConfig,
} from "../src/catalog.js";
import { PortalAuthError, PortalClient } from "../src/portalApi.js";
import { toolHandlers } from "../src/tools.js";

describe("Ace Grid catalog", () => {
  it("searches generated API metadata", () => {
    const results = searchCatalog("license app id", 5);

    expect(results.some((result) => result.path === "license.appId")).toBe(true);
  });

  it("searches bundled written docs pages", () => {
    const results = searchDocs("server row model pivot", 10);

    expect(results.some((result) => result.path.includes("serverRowModel"))).toBe(true);
  });

  it("searches API and docs together", () => {
    const results = searchEverything("license domain", 10);

    expect(results.some((result) => result.source === "api")).toBe(true);
    expect(results.some((result) => result.source === "docs")).toBe(true);
  });

  it("lists and returns docs pages", () => {
    expect(listDocsPages().length).toBeGreaterThan(30);
    expect(getDocsPage("license")).toMatchObject({
      path: "/docs/license",
      title: "License",
    });
    expect(getDocsPage("/docs/schema")).toMatchObject({
      category: "AI Suite",
    });
  });

  it("lists and returns framework examples", () => {
    expect(listFrameworkExamples().map((example) => example.framework)).toEqual([
      "react",
      "angular",
      "vue",
      "svelte",
      "web-components",
    ]);
    expect(getFrameworkExample("vue")?.codeSample).toContain("@ace-grid/vue");
  });

  it("lists feature groups from the bundled snapshot", () => {
    const groups = listFeatureGroups();

    expect(groups.length).toBeGreaterThan(10);
    expect(groups.some((group) => group.key === "license")).toBe(true);
    expect(groups.some((group) => group.key === "data")).toBe(true);
  });

  it("returns prop metadata by path", () => {
    expect(getProp("license.leaseSigningPublicKey")).toMatchObject({
      featureGroup: "license",
      optional: true,
      type: "string",
    });
  });

  it("validates known config and required props", () => {
    expect(
      validateGridConfig({
        data: {
          columns: [],
          rows: [],
        },
        layout: {
          height: 400,
        },
      }),
    ).toMatchObject({
      ok: true,
      unknownProps: [],
      missingRequiredProps: [],
    });

    expect(
      validateGridConfig({
        data: {
          rows: [],
        },
        wrong: true,
      }),
    ).toMatchObject({
      ok: false,
      missingRequiredProps: ["data.columns"],
      unknownProps: ["wrong"],
    });
  });

  it("generates tier-aware React snippets", () => {
    const snippet = generateReactExample({
      appId: "app_test",
      licenseKey: "ag_key_test",
      plan: "Pro",
    });

    expect(snippet).toContain('from "@ace-grid/pro"');
    expect(snippet).toContain('licenseKey: "ag_key_test"');
    expect(snippet).toContain('appId: "app_test"');
    expect(snippet).not.toContain("domain:");
  });

  it("plans implementations from natural-language requests", () => {
    const plan = planImplementation({
      framework: "angular",
      query: "Enterprise grid with server row model pivot and pagination",
    });

    expect(plan.framework).toBe("angular");
    expect(plan.requiredTier).toBe("Enterprise");
    expect(plan.installCommand).toContain("@ace-grid/angular");
    expect(plan.matchedFeatures.map((feature) => feature.key)).toContain("serverRowModel");
  });

  it("generates framework implementation code with validated config", () => {
    const generated = generateImplementation({
      appId: "app_demo",
      framework: "svelte",
      licenseKey: "ag_key_demo",
      query: "Pro validation grid with blocking validation",
      tier: "Pro",
    });

    expect(generated.plan.requiredTier).toBe("Pro");
    expect(generated.code).toContain("@ace-grid/svelte");
    expect(generated.code).toContain("ag_key_demo");
    expect(generated.code).toContain("validation");
    expect(generated.validation).toMatchObject({
      ok: true,
      unknownProps: [],
      missingRequiredProps: [],
    });
  });

  it("upgrades the required tier when the query asks for Enterprise features", () => {
    const generated = generateImplementation({
      framework: "react",
      query: "Pro chart and master detail grid",
      tier: "Pro",
    });

    expect(generated.plan.requiredTier).toBe("Enterprise");
    expect(generated.plan.warnings.join(" ")).toContain("Enterprise");
    expect(generated.code).toContain('@ace-grid/enterprise');
  });

  it("documents license public-key defaults", () => {
    const guide = licenseSetupGuide();

    expect(guide.defaultApiBaseUrl).toBe("https://api.ace-grid.com");
    expect(guide.notes.join(" ")).toContain("auto-fetch the public lease signing key");
  });
});

describe("tool handlers", () => {
  it("returns MCP text content", () => {
    const result = toolHandlers.getProp({ path: "layout.height" });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      ok: true,
      prop: {
        path: "layout.height",
      },
    });
  });

  it("returns docs pages and framework examples through MCP handlers", () => {
    expect(
      JSON.parse(toolHandlers.getDocsPage({ slugOrPath: "validation" }).content[0].text),
    ).toMatchObject({
      ok: true,
      page: {
        title: "Validation",
      },
    });
    expect(
      toolHandlers.generateFrameworkExample({
        framework: "svelte",
      }).content[0].text,
    ).toContain("@ace-grid/svelte");
  });

  it("returns implementation plans and generated code through MCP handlers", () => {
    expect(
      JSON.parse(
        toolHandlers.planImplementation({
          framework: "vue",
          query: "charts and pivot",
        }).content[0].text,
      ),
    ).toMatchObject({
      framework: "vue",
      requiredTier: "Enterprise",
    });

    const generated = JSON.parse(
      toolHandlers.generateImplementation({
        framework: "web-components",
        query: "license setup and validation",
        tier: "Pro",
      }).content[0].text,
    );
    expect(generated.code).toContain("@ace-grid/wc");
    expect(generated.code).toContain("@ace-grid/pro");
    expect(generated.validation.ok).toBe(true);
  });
});

describe("portal client", () => {
  it("requires explicit auth for account operations", async () => {
    const originalToken = process.env.ACE_GRID_PORTAL_TOKEN;
    delete process.env.ACE_GRID_PORTAL_TOKEN;

    await expect(new PortalClient().request("/portal/me")).rejects.toBeInstanceOf(
      PortalAuthError,
    );

    if (originalToken) {
      process.env.ACE_GRID_PORTAL_TOKEN = originalToken;
    }
  });
});
