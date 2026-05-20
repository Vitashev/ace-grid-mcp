import {
  formulaSnapshot,
  generateImplementation,
  generateReactExample,
  getDocsPage,
  getFrameworkExample,
  getProp,
  gridSnapshot,
  licenseSetupGuide,
  listDocsPages,
  listFeatureGroups,
  listFrameworkExamples,
  planImplementation,
  searchCatalog,
  searchDocs,
  searchEverything,
  validateGridConfig,
  type AceGridFramework,
  type AceGridTier,
} from "./catalog.js";
import { PortalClient } from "./portalApi.js";

export type ToolResult = {
  content: Array<{
    text: string;
    type: "text";
  }>;
};

function jsonResult(value: unknown): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function textResult(text: string): ToolResult {
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

export const toolHandlers = {
  searchDocs(input: { limit?: number; query: string }) {
    return jsonResult({
      apiGeneratedAt: gridSnapshot.generatedAt,
      docsGeneratedAt: undefined,
      results: searchEverything(input.query, input.limit),
    });
  },

  searchApi(input: { limit?: number; query: string }) {
    return jsonResult({
      generatedAt: gridSnapshot.generatedAt,
      results: searchCatalog(input.query, input.limit),
    });
  },

  searchDocsPages(input: { limit?: number; query: string }) {
    return jsonResult({
      results: searchDocs(input.query, input.limit),
    });
  },

  listFeatureGroups() {
    return jsonResult({
      featureGroupCount: gridSnapshot.featureGroupCount,
      formulaFunctionCount: formulaSnapshot.functionCount,
      groups: listFeatureGroups(),
      propCount: gridSnapshot.propCount,
    });
  },

  listDocsPages() {
    return jsonResult({
      pages: listDocsPages(),
    });
  },

  getDocsPage(input: { slugOrPath: string }) {
    const page = getDocsPage(input.slugOrPath);
    if (!page) {
      return jsonResult({
        ok: false,
        message: `No Ace Grid docs page found for ${input.slugOrPath}.`,
        suggestions: searchDocs(input.slugOrPath, 5),
      });
    }

    return jsonResult({
      ok: true,
      page,
    });
  },

  getProp(input: { path: string }) {
    const prop = getProp(input.path);
    if (!prop) {
      return jsonResult({
        ok: false,
        message: `No Ace Grid prop found at ${input.path}.`,
        suggestions: searchCatalog(input.path, 5),
      });
    }

    return jsonResult({
      ok: true,
      prop,
    });
  },

  validateConfig(input: { config: unknown }) {
    return jsonResult(validateGridConfig(input.config));
  },

  planImplementation(input: {
    framework?: AceGridFramework;
    query: string;
    tier?: AceGridTier;
  }) {
    return jsonResult(planImplementation(input));
  },

  generateImplementation(input: {
    appId?: string;
    domain?: string;
    framework?: AceGridFramework;
    licenseKey?: string;
    query: string;
    tier?: AceGridTier;
  }) {
    return jsonResult(generateImplementation(input));
  },

  generateReactExample(input: {
    appId?: string;
    domain?: string;
    licenseKey?: string;
    plan?: "Community" | "Pro" | "Enterprise";
  }) {
    return textResult(generateReactExample(input));
  },

  listExamples() {
    return jsonResult({
      examples: listFrameworkExamples(),
    });
  },

  generateFrameworkExample(input: {
    framework: string;
    includeActions?: boolean;
  }) {
    const example = getFrameworkExample(input.framework);
    if (!example) {
      return jsonResult({
        ok: false,
        message: `No Ace Grid example found for framework ${input.framework}.`,
        availableFrameworks: listFrameworkExamples().map((entry) => entry.framework),
      });
    }

    return textResult(input.includeActions ? example.actionsSample : example.codeSample);
  },

  licenseSetup() {
    return jsonResult(licenseSetupGuide());
  },

  async accountStatus(input: { token?: string } = {}) {
    const client = new PortalClient({ token: input.token });
    const [me, entitlements, subscriptions] = await Promise.all([
      client.request("/portal/me"),
      client.request("/portal/entitlements"),
      client.request("/portal/subscriptions"),
    ]);

    return jsonResult({
      me,
      entitlements,
      subscriptions,
    });
  },

  async listApps(input: { token?: string } = {}) {
    const client = new PortalClient({ token: input.token });
    return jsonResult(await client.request("/portal/apps"));
  },

  async createApp(input: { allowedDomains?: string[]; name: string; token?: string }) {
    const client = new PortalClient({ token: input.token });
    return jsonResult(
      await client.request("/portal/apps", {
        body: {
          allowedDomains: input.allowedDomains ?? [],
          name: input.name,
        },
        method: "POST",
      }),
    );
  },

  async listLicenseKeys(input: { appId: string; token?: string }) {
    const client = new PortalClient({ token: input.token });
    return jsonResult(
      await client.request(`/portal/apps/${encodeURIComponent(input.appId)}/keys`),
    );
  },

  async createLicenseKey(input: { appId: string; label?: string; token?: string }) {
    const client = new PortalClient({ token: input.token });
    return jsonResult(
      await client.request(`/portal/apps/${encodeURIComponent(input.appId)}/keys`, {
        body: {
          label: input.label,
        },
        method: "POST",
      }),
    );
  },
};
