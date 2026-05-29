// apps/web/lib/module-configs.ts
//
// Static mapping from module slug → ModuleConfig for the sidebar sub-items.
// Only modules that ship a full module.config.ts are listed here. "Coming
// soon" modules (e.g. CRM) have no ModuleConfig and therefore no navigation
// items — they remain in the registry for billing but not here.
//
// To add a new module: import its config and add an entry to MODULE_CONFIGS.
// Keep in sync with packages/api/src/modules/registry.ts.

import { salesAnalyticsConfig } from "@modulo/sales-analytics/config";
import type { ModuleConfig } from "@modulo/api/modules/types";

export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  // key = the slug used in enabledModules.moduleId (e.g. "sales-analytics")
  "sales-analytics": salesAnalyticsConfig,
};

/**
 * Look up the ModuleConfig for a given module id (e.g. "sales-analytics").
 * Returns undefined for modules that don't have a config registered here.
 */
export function getModuleConfig(moduleId: string): ModuleConfig | undefined {
  return MODULE_CONFIGS[moduleId];
}
