import { reactConfig } from "./react.js";
import nextPlugin from "@next/eslint-plugin-next";

/** @type {import("typescript-eslint").ConfigArray} */
export const nextConfig = [
  ...reactConfig,
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
];

export default nextConfig;
