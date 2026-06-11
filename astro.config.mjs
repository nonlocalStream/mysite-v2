import { defineConfig } from "astro/config";

const isGitHubPages = process.env.DEPLOY_TARGET === "github-pages";

export default defineConfig({
  site: isGitHubPages ? "https://nonlocalstream.github.io" : undefined,
  base: isGitHubPages ? "/mysite-v2" : undefined,
});
