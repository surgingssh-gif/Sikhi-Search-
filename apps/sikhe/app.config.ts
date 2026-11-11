import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * app.json, plus where the website lives on its host. On GitHub Pages the
 * site is served from /<repo name>/, so EXPO_PUBLIC_BASE_URL is set to that
 * when the site is built; locally it's unset and the site is at the root.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL;
  return { ...config, experiments: { ...config.experiments, ...(baseUrl ? { baseUrl } : {}) } } as ExpoConfig;
};
