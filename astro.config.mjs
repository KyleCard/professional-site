// @ts-check
import { defineConfig } from "astro/config";

// Static site on the custom domain www.kylejcard.com (GitHub Pages).
// Custom domain serves at the root, so no `base` path is needed.
export default defineConfig({
  site: "https://www.kylejcard.com",
  build: { format: "directory" },
  image: {
    // allow large source research figures to be processed by sharp
    service: { entrypoint: "astro/assets/services/sharp" },
  },
});
