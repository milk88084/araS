export default {
  "*.{ts,tsx}": ["pnpm exec eslint --fix", "pnpm exec prettier --write"],
  "*.{json,md,yml,yaml,css}": ["pnpm exec prettier --write"],
};
