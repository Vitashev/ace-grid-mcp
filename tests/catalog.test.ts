import { describe, expect, it } from "vitest";

import {
  generateReactExample,
  getProp,
  licenseSetupGuide,
  listFeatureGroups,
  searchCatalog,
  validateGridConfig,
} from "../src/catalog.js";
import { PortalAuthError, PortalClient } from "../src/portalApi.js";
import { toolHandlers } from "../src/tools.js";

describe("Ace Grid catalog", () => {
  it("searches generated API metadata", () => {
    const results = searchCatalog("license app id", 5);

    expect(results.some((result) => result.path === "license.appId")).toBe(true);
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
