import {
  formulaSnapshot,
  generateReactExample,
  getProp,
  gridSnapshot,
  licenseSetupGuide,
  listFeatureGroups,
  searchCatalog,
  validateGridConfig,
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
      generatedAt: gridSnapshot.generatedAt,
      results: searchCatalog(input.query, input.limit),
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

  generateReactExample(input: {
    appId?: string;
    domain?: string;
    licenseKey?: string;
    plan?: "Community" | "Pro" | "Enterprise";
  }) {
    return textResult(generateReactExample(input));
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
